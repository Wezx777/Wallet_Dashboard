import { NextRequest, NextResponse } from 'next/server';
import { Chain, Transaction, TxType, Wallet } from '@/types';
import { CHAIN_CONFIG, getExplorerTxUrl, isEtherscanChain } from '@/lib/chains';
import { getTransactions, getERC20Transfers } from '@/lib/etherscan';
import { getSolanaSignatures, getSolanaTransactionsBatch } from '@/lib/alchemy';
import { getJupiterTokenMap } from '@/lib/jupiterTokens';

function detectEvmTxType(from: string, to: string, walletAddress: string, fnName: string): TxType {
  const wallet = walletAddress.toLowerCase();
  const isOut = from.toLowerCase() === wallet;
  const isIn = to.toLowerCase() === wallet;
  const fn = (fnName || '').toLowerCase();

  if (fn.includes('swap') || fn.includes('exchange')) return 'swap';
  if (isOut && isIn) return 'contract';
  if (isOut) return 'send';
  if (isIn) return 'receive';
  return 'contract';
}

async function fetchEvmTransactions(wallet: Wallet): Promise<Transaction[]> {
  const cfg = CHAIN_CONFIG[wallet.chain];
  const results: Transaction[] = [];

  const [txList, tokenTxList] = await Promise.all([
    getTransactions(wallet.chain, wallet.address, 1, 50),
    getERC20Transfers(wallet.chain, wallet.address, 1, 100),
  ]);

  // Native transactions
  for (const tx of txList) {
    const valueEth = Number(tx.value) / Math.pow(10, cfg.decimals);
    if (valueEth <= 0 && tx.input !== '0x') continue; // skip pure contract calls with no ETH
    const type = detectEvmTxType(tx.from, tx.to, wallet.address, tx.functionName);

    results.push({
      id: tx.hash,
      hash: tx.hash,
      chain: wallet.chain,
      walletId: wallet.id,
      walletAddress: wallet.address,
      walletName: wallet.name,
      type: valueEth > 0 ? type : 'contract',
      tokenSymbol: cfg.symbol,
      tokenName: cfg.name,
      amount: valueEth,
      usdValueAtTime: 0,
      timestamp: parseInt(tx.timeStamp, 10),
      from: tx.from,
      to: tx.to,
      explorerUrl: getExplorerTxUrl(wallet.chain, tx.hash),
      isError: tx.isError === '1',
    });
  }

  // ERC-20 transactions
  for (const tx of tokenTxList) {
    const decimals = parseInt(tx.tokenDecimal, 10) || 18;
    const amount = Number(tx.value) / Math.pow(10, decimals);
    const type = tx.to.toLowerCase() === wallet.address.toLowerCase() ? 'receive' : 'send';

    results.push({
      id: `${tx.hash}-${tx.contractAddress}`,
      hash: tx.hash,
      chain: wallet.chain,
      walletId: wallet.id,
      walletAddress: wallet.address,
      walletName: wallet.name,
      type,
      tokenSymbol: tx.tokenSymbol,
      tokenName: tx.tokenName,
      amount,
      usdValueAtTime: 0,
      timestamp: parseInt(tx.timeStamp, 10),
      from: tx.from,
      to: tx.to,
      explorerUrl: getExplorerTxUrl(wallet.chain, tx.hash),
      isError: false,
    });
  }

  return results.sort((a, b) => b.timestamp - a.timestamp);
}

async function fetchSolanaTransactions(wallet: Wallet): Promise<Transaction[]> {
  const [signatures, jupiterMap] = await Promise.all([
    getSolanaSignatures(wallet.address, 30),
    getJupiterTokenMap(),
  ]);
  if (!signatures.length) return [];

  const sigs = signatures.slice(0, 25).map(s => s.signature);
  const txDetails = await getSolanaTransactionsBatch(sigs);

  const results: Transaction[] = [];

  for (let i = 0; i < signatures.length && i < txDetails.length; i++) {
    const sig = signatures[i];
    const detail = txDetails[i];

    if (!detail) {
      results.push({
        id: sig.signature,
        hash: sig.signature,
        chain: 'solana',
        walletId: wallet.id,
        walletAddress: wallet.address,
        walletName: wallet.name,
        type: 'contract',
        tokenSymbol: 'SOL',
        tokenName: 'Solana',
        amount: 0,
        usdValueAtTime: 0,
        timestamp: sig.blockTime ?? 0,
        from: wallet.address,
        to: '',
        explorerUrl: getExplorerTxUrl('solana', sig.signature),
        isError: !!sig.err,
      });
      continue;
    }

    const accounts = detail.transaction.message.accountKeys;
    const walletIndex = accounts.findIndex(a => a.pubkey === wallet.address);

    let type: TxType = 'contract';
    let tokenSymbol = 'SOL';
    let tokenName = 'Solana';
    let amount = 0;
    let from = wallet.address;
    let to = '';

    if (walletIndex >= 0 && detail.meta) {
      const solDiff = (detail.meta.postBalances[walletIndex] - detail.meta.preBalances[walletIndex]) / 1e9;
      amount = Math.abs(solDiff);

      if (solDiff < -0.001) {
        type = 'send';
        const recipient = accounts.find((a, idx) => idx !== walletIndex && detail.meta!.postBalances[idx] > detail.meta!.preBalances[idx]);
        to = recipient?.pubkey ?? '';
      } else if (solDiff > 0.001) {
        type = 'receive';
        const sender = accounts.find((a, idx) => idx !== walletIndex && detail.meta!.postBalances[idx] < detail.meta!.preBalances[idx]);
        from = sender?.pubkey ?? '';
        to = wallet.address;
      }

      // Check for token transfers
      const preBals = detail.meta.preTokenBalances ?? [];
      const postBals = detail.meta.postTokenBalances ?? [];
      if (preBals.length || postBals.length) {
        type = 'swap';
        const tokenBal = postBals.find(b => accounts[b.accountIndex]?.pubkey === wallet.address) || postBals[0];
        if (tokenBal) {
          const meta = jupiterMap.get(tokenBal.mint);
          tokenSymbol = meta?.symbol ?? tokenBal.mint.slice(0, 4) + '…';
          tokenName = meta?.name ?? 'Unknown SPL Token';
          amount = tokenBal.uiTokenAmount.uiAmount ?? 0;
        }
      }
    }

    results.push({
      id: sig.signature,
      hash: sig.signature,
      chain: 'solana',
      walletId: wallet.id,
      walletAddress: wallet.address,
      walletName: wallet.name,
      type,
      tokenSymbol,
      tokenName,
      amount,
      usdValueAtTime: 0,
      timestamp: sig.blockTime ?? 0,
      from,
      to,
      explorerUrl: getExplorerTxUrl('solana', sig.signature),
      isError: !!sig.err,
    });
  }

  return results;
}

export async function POST(req: NextRequest) {
  try {
    const { wallets }: { wallets: Wallet[] } = await req.json();
    if (!wallets?.length) return NextResponse.json([], { status: 200 });

    const txPromises = wallets.map(w => {
      if (w.chain === 'solana') return fetchSolanaTransactions(w);
      if (isEtherscanChain(w.chain)) return fetchEvmTransactions(w);
      // Alchemy EVM chains and Tron: Etherscan V2 free tier doesn't cover them;
      // return empty — transaction history will be added when APIs are available.
      return Promise.resolve([] as Transaction[]);
    });

    const results = await Promise.all(txPromises);
    const all = results.flat().sort((a, b) => b.timestamp - a.timestamp);

    return NextResponse.json(all);
  } catch (err) {
    console.error('[transactions]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
