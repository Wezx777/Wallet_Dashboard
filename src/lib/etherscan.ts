import { Chain } from '@/types';

const API_KEY = process.env.ETHERSCAN_API_KEY!;
const BASE_URL = 'https://api.etherscan.io/v2/api';

const CHAIN_IDS: Partial<Record<Chain, number>> = {
  ethereum: 1,
  bsc: 56,
  base: 8453,
};

async function request(chain: Chain, params: Record<string, string>, retries = 2): Promise<unknown> {
  const chainId = CHAIN_IDS[chain];
  if (!chainId) throw new Error(`Chain ${chain} not supported by Etherscan`);

  const url = new URL(BASE_URL);
  url.searchParams.set('chainid', String(chainId));
  url.searchParams.set('apikey', API_KEY);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), {
    next: { revalidate: 60 },
    headers: { 'Accept': 'application/json' },
  });

  if (!res.ok) throw new Error(`Etherscan HTTP error: ${res.status}`);
  const data = await res.json();

  if (data.status === '0' && data.message === 'NOTOK') {
    if (retries > 0 && String(data.result).toLowerCase().includes('rate limit')) {
      await new Promise(r => setTimeout(r, 1000 * (3 - retries)));
      return request(chain, params, retries - 1);
    }
    throw new Error(`Etherscan API error: ${data.result}`);
  }

  return Array.isArray(data.result) ? data.result : data.result ?? null;
}

export async function getNativeBalance(chain: Chain, address: string): Promise<string> {
  return request(chain, {
    module: 'account',
    action: 'balance',
    address,
    tag: 'latest',
  }) as Promise<string>;
}

export interface EtherscanTokenTx {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  from: string;
  contractAddress: string;
  to: string;
  value: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
  isError?: string;
}

export async function getERC20Transfers(
  chain: Chain,
  address: string,
  page = 1,
  offset = 1000
): Promise<EtherscanTokenTx[]> {
  try {
    const result = await request(chain, {
      module: 'account',
      action: 'tokentx',
      address,
      startblock: '0',
      endblock: '99999999',
      page: String(page),
      offset: String(offset),
      sort: 'desc',
    });
    return Array.isArray(result) ? result as EtherscanTokenTx[] : [];
  } catch {
    return [];
  }
}

export async function getTokenBalance(
  chain: Chain,
  address: string,
  contractAddress: string
): Promise<bigint> {
  try {
    const result = await request(chain, {
      module: 'account',
      action: 'tokenbalance',
      contractaddress: contractAddress,
      address,
      tag: 'latest',
    });
    return BigInt(String(result ?? '0'));
  } catch {
    return 0n;
  }
}

export interface TokenBalanceResult {
  contractAddress: string;
  contractAddressOriginal: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: bigint;
}

export async function getERC20Balances(
  chain: Chain,
  address: string
): Promise<TokenBalanceResult[]> {
  const transfers = await getERC20Transfers(chain, address, 1, 1000);
  if (!transfers.length) return [];

  // Collect unique token metadata, preserving original address case for logo URLs
  const tokenMeta = new Map<string, { contractAddressOriginal: string; symbol: string; name: string; decimals: number }>();
  for (const tx of transfers) {
    const addr = tx.contractAddress.toLowerCase();
    if (!tokenMeta.has(addr)) {
      tokenMeta.set(addr, {
        contractAddressOriginal: tx.contractAddress,
        symbol: tx.tokenSymbol,
        name: tx.tokenName,
        decimals: parseInt(tx.tokenDecimal, 10) || 18,
      });
    }
  }

  const contracts = Array.from(tokenMeta.entries());
  const results: TokenBalanceResult[] = [];
  const CHUNK = 5;

  for (let i = 0; i < contracts.length; i += CHUNK) {
    const chunk = contracts.slice(i, i + CHUNK);
    const balances = await Promise.all(
      chunk.map(async ([addr, meta]) => ({
        contractAddress: addr,
        contractAddressOriginal: meta.contractAddressOriginal,
        symbol: meta.symbol,
        name: meta.name,
        decimals: meta.decimals,
        balance: await getTokenBalance(chain, address, addr),
      }))
    );
    results.push(...balances.filter(b => b.balance > 0n));
    if (i + CHUNK < contracts.length) {
      await new Promise(r => setTimeout(r, 250));
    }
  }

  return results;
}

export interface EtherscanTx {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  isError: string;
  functionName: string;
  input: string;
}

export async function getTransactions(
  chain: Chain,
  address: string,
  page = 1,
  offset = 100
): Promise<EtherscanTx[]> {
  try {
    const result = await request(chain, {
      module: 'account',
      action: 'txlist',
      address,
      startblock: '0',
      endblock: '99999999',
      page: String(page),
      offset: String(offset),
      sort: 'desc',
    });
    return Array.isArray(result) ? result as EtherscanTx[] : [];
  } catch {
    return [];
  }
}

export function computeTokenBalances(
  transfers: EtherscanTokenTx[],
  walletAddress: string
): Array<{
  contractAddress: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: bigint;
}> {
  const wallet = walletAddress.toLowerCase();
  const balances = new Map<string, {
    contractAddress: string;
    symbol: string;
    name: string;
    decimals: number;
    balance: bigint;
  }>();

  for (const tx of transfers) {
    const addr = tx.contractAddress.toLowerCase();
    if (!balances.has(addr)) {
      balances.set(addr, {
        contractAddress: tx.contractAddress,
        symbol: tx.tokenSymbol,
        name: tx.tokenName,
        decimals: parseInt(tx.tokenDecimal, 10) || 18,
        balance: 0n,
      });
    }
    const entry = balances.get(addr)!;
    const val = BigInt(tx.value);
    if (tx.to.toLowerCase() === wallet) entry.balance += val;
    else if (tx.from.toLowerCase() === wallet) entry.balance -= val;
  }

  return Array.from(balances.values()).filter(b => b.balance > 0n);
}
