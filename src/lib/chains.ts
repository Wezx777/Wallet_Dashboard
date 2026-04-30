import { Chain } from '@/types';

export const CHAIN_CONFIG = {
  ethereum: {
    name: 'Ethereum',
    symbol: 'ETH',
    chainId: 1,
    decimals: 18,
    explorer: 'https://etherscan.io',
    coingeckoId: 'ethereum',
    coingeckoPlatform: 'ethereum',
    color: '#627EEA',
    rpcLabel: 'Etherscan',
  },
  bsc: {
    name: 'BNB Chain',
    symbol: 'BNB',
    chainId: 56,
    decimals: 18,
    explorer: 'https://bscscan.com',
    coingeckoId: 'binancecoin',
    coingeckoPlatform: 'binance-smart-chain',
    color: '#F3BA2F',
    rpcLabel: 'Etherscan V2',
  },
  base: {
    name: 'Base',
    symbol: 'ETH',
    chainId: 8453,
    decimals: 18,
    explorer: 'https://basescan.org',
    coingeckoId: 'ethereum',
    coingeckoPlatform: 'base',
    color: '#0052FF',
    rpcLabel: 'Etherscan V2',
  },
  solana: {
    name: 'Solana',
    symbol: 'SOL',
    chainId: null,
    decimals: 9,
    explorer: 'https://solscan.io',
    coingeckoId: 'solana',
    coingeckoPlatform: 'solana',
    color: '#9945FF',
    rpcLabel: 'Alchemy',
  },
} as const satisfies Record<Chain, {
  name: string;
  symbol: string;
  chainId: number | null;
  decimals: number;
  explorer: string;
  coingeckoId: string;
  coingeckoPlatform: string;
  color: string;
  rpcLabel: string;
}>;

export function detectChain(address: string): Chain | null {
  if (/^0x[0-9a-fA-F]{40}$/.test(address)) return 'ethereum';
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) return 'solana';
  return null;
}

export function isEvmChain(chain: Chain): boolean {
  return chain !== 'solana';
}

export function getExplorerTxUrl(chain: Chain, hash: string): string {
  const cfg = CHAIN_CONFIG[chain];
  if (chain === 'solana') return `${cfg.explorer}/tx/${hash}`;
  return `${cfg.explorer}/tx/${hash}`;
}

export function getExplorerAddressUrl(chain: Chain, address: string): string {
  const cfg = CHAIN_CONFIG[chain];
  if (chain === 'solana') return `${cfg.explorer}/account/${address}`;
  return `${cfg.explorer}/address/${address}`;
}

export const ALL_CHAINS: Chain[] = ['ethereum', 'solana', 'bsc', 'base'];
export const EVM_CHAINS: Chain[] = ['ethereum', 'bsc', 'base'];
