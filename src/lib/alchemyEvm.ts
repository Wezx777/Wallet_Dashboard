// Generic Alchemy EVM support for chains not on the Etherscan V2 free tier:
// BNB Chain, Polygon, Arbitrum, Optimism, Avalanche.

import { Chain } from '@/types';

const KEY = process.env.ALCHEMY_API_KEY || '';

const ALCHEMY_RPCS: Partial<Record<Chain, string>> = {
  bsc:       `https://bnb-mainnet.g.alchemy.com/v2/${KEY}`,
  polygon:   `https://polygon-mainnet.g.alchemy.com/v2/${KEY}`,
  arbitrum:  `https://arb-mainnet.g.alchemy.com/v2/${KEY}`,
  optimism:  `https://opt-mainnet.g.alchemy.com/v2/${KEY}`,
  avalanche: `https://avax-mainnet.g.alchemy.com/v2/${KEY}`,
};

// Public RPC fallback for native balance when Alchemy is unavailable
const PUBLIC_RPCS: Partial<Record<Chain, string>> = {
  bsc:       'https://bsc-dataseed.binance.org/',
  polygon:   'https://polygon-rpc.com/',
  avalanche: 'https://api.avax.network/ext/bc/C/rpc',
};

// Top BEP-20 tokens checked on BSC when Alchemy is unavailable
const BSC_TOP_TOKENS = [
  { address: '0x55d398326f99059fF775485246999027B3197955', symbol: 'USDT',  name: 'Tether USD',           decimals: 18 },
  { address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', symbol: 'USDC',  name: 'USD Coin',             decimals: 18 },
  { address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', symbol: 'BUSD',  name: 'BUSD',                 decimals: 18 },
  { address: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', symbol: 'CAKE',  name: 'PancakeSwap Token',    decimals: 18 },
  { address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', symbol: 'WBNB',  name: 'Wrapped BNB',          decimals: 18 },
  { address: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', symbol: 'BTCB',  name: 'BTCB Token',           decimals: 18 },
  { address: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', symbol: 'ETH',   name: 'Ethereum Token',        decimals: 18 },
  { address: '0xbA2aE424d960c26247Dd6c32edC70B295c744C43', symbol: 'DOGE',  name: 'Dogecoin',             decimals: 8  },
  { address: '0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE', symbol: 'XRP',   name: 'XRP Token',            decimals: 18 },
  { address: '0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47', symbol: 'ADA',   name: 'Cardano Token',        decimals: 18 },
];

const BALANCE_OF = '0x70a08231';

async function rpcCall(url: string, method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }),
    next: { revalidate: 60 },
  });
  const data = await res.json();
  return data.result;
}

export async function getAlchemyNativeBalance(chain: Chain, address: string): Promise<number> {
  const alchemyUrl = ALCHEMY_RPCS[chain];
  if (KEY && alchemyUrl) {
    try {
      const hex = await rpcCall(alchemyUrl, 'eth_getBalance', [address, 'latest']) as string;
      return parseInt(hex, 16) / 1e18;
    } catch {}
  }
  const publicUrl = PUBLIC_RPCS[chain];
  if (publicUrl) {
    try {
      const hex = await rpcCall(publicUrl, 'eth_getBalance', [address, 'latest']) as string;
      return parseInt(hex, 16) / 1e18;
    } catch {}
  }
  return 0;
}

export interface AlchemyTokenBalance {
  contractAddress: string;
  contractAddressOriginal: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: bigint;
}

export async function getAlchemyTokenBalances(chain: Chain, walletAddress: string): Promise<AlchemyTokenBalance[]> {
  const alchemyUrl = ALCHEMY_RPCS[chain];
  if (!KEY || !alchemyUrl) return chain === 'bsc' ? getBscFallbackTokens(walletAddress) : [];

  try {
    const res = await rpcCall(alchemyUrl, 'alchemy_getTokenBalances', [walletAddress]) as {
      tokenBalances: Array<{ contractAddress: string; tokenBalance: string }>;
    };
    if (!res?.tokenBalances?.length) return [];

    const nonZero = res.tokenBalances.filter(
      t => t.tokenBalance && t.tokenBalance !== '0x0000000000000000000000000000000000000000000000000000000000000000'
    );
    if (!nonZero.length) return [];

    const results: AlchemyTokenBalance[] = [];
    const CHUNK = 5;
    for (let i = 0; i < nonZero.length; i += CHUNK) {
      const chunk = nonZero.slice(i, i + CHUNK);
      const metas = await Promise.all(
        chunk.map(async t => {
          try {
            const meta = await rpcCall(alchemyUrl, 'alchemy_getTokenMetadata', [t.contractAddress]) as {
              decimals: number; name: string; symbol: string;
            };
            const balance = BigInt(t.tokenBalance);
            if (balance <= 0n) return null;
            return {
              contractAddress: t.contractAddress.toLowerCase(),
              contractAddressOriginal: t.contractAddress,
              symbol: meta?.symbol ?? t.contractAddress.slice(0, 6),
              name: meta?.name ?? 'Unknown Token',
              decimals: meta?.decimals ?? 18,
              balance,
            } satisfies AlchemyTokenBalance;
          } catch { return null; }
        })
      );
      results.push(...(metas.filter(Boolean) as AlchemyTokenBalance[]));
      if (i + CHUNK < nonZero.length) await new Promise(r => setTimeout(r, 100));
    }
    return results;
  } catch {
    return chain === 'bsc' ? getBscFallbackTokens(walletAddress) : [];
  }
}

async function getBscFallbackTokens(walletAddress: string): Promise<AlchemyTokenBalance[]> {
  const results: AlchemyTokenBalance[] = [];
  const CHUNK = 5;
  for (let i = 0; i < BSC_TOP_TOKENS.length; i += CHUNK) {
    const chunk = BSC_TOP_TOKENS.slice(i, i + CHUNK);
    const bals = await Promise.all(chunk.map(async t => {
      try {
        const calldata = BALANCE_OF + walletAddress.replace('0x', '').toLowerCase().padStart(64, '0');
        const result = await rpcCall('https://bsc-dataseed.binance.org/', 'eth_call', [{ to: t.address, data: calldata }, 'latest']) as string;
        const balance = result && result !== '0x' ? BigInt(result) : 0n;
        if (balance <= 0n) return null;
        return {
          contractAddress: t.address.toLowerCase(),
          contractAddressOriginal: t.address,
          symbol: t.symbol, name: t.name, decimals: t.decimals, balance,
        } satisfies AlchemyTokenBalance;
      } catch { return null; }
    }));
    results.push(...(bals.filter(Boolean) as AlchemyTokenBalance[]));
    if (i + CHUNK < BSC_TOP_TOKENS.length) await new Promise(r => setTimeout(r, 100));
  }
  return results;
}
