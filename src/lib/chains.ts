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
    icon: '◆',
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
    icon: '◉',
    rpcLabel: 'Alchemy',
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
    icon: '■',
    rpcLabel: 'Etherscan V2',
  },
  polygon: {
    name: 'Polygon',
    symbol: 'POL',
    chainId: 137,
    decimals: 18,
    explorer: 'https://polygonscan.com',
    coingeckoId: 'matic-network',
    coingeckoPlatform: 'polygon-pos',
    color: '#8247E5',
    icon: '▲',
    rpcLabel: 'Alchemy',
  },
  arbitrum: {
    name: 'Arbitrum',
    symbol: 'ETH',
    chainId: 42161,
    decimals: 18,
    explorer: 'https://arbiscan.io',
    coingeckoId: 'ethereum',
    coingeckoPlatform: 'arbitrum-one',
    color: '#12AAFF',
    icon: '⬡',
    rpcLabel: 'Alchemy',
  },
  optimism: {
    name: 'Optimism',
    symbol: 'ETH',
    chainId: 10,
    decimals: 18,
    explorer: 'https://optimistic.etherscan.io',
    coingeckoId: 'ethereum',
    coingeckoPlatform: 'optimistic-ethereum',
    color: '#FF0420',
    icon: '○',
    rpcLabel: 'Alchemy',
  },
  avalanche: {
    name: 'Avalanche',
    symbol: 'AVAX',
    chainId: 43114,
    decimals: 18,
    explorer: 'https://snowtrace.io',
    coingeckoId: 'avalanche-2',
    coingeckoPlatform: 'avalanche',
    color: '#E84142',
    icon: '◈',
    rpcLabel: 'Alchemy',
  },
  tron: {
    name: 'Tron',
    symbol: 'TRX',
    chainId: null,
    decimals: 6,
    explorer: 'https://tronscan.org',
    coingeckoId: 'tron',
    coingeckoPlatform: 'tron',
    color: '#EF0027',
    icon: '◎',
    rpcLabel: 'TronGrid',
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
    icon: '◐',
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
  icon: string;
  rpcLabel: string;
}>;

// Address type detection (broader than Chain — EVM covers multiple chains)
export type AddressType = 'evm' | 'solana' | 'tron';

export function detectAddressType(address: string): AddressType | null {
  if (/^0x[0-9a-fA-F]{40}$/.test(address)) return 'evm';
  // Tron: starts with T, exactly 34 base58 chars
  if (/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address)) return 'tron';
  // Solana: 32-44 base58 chars (check after Tron to avoid collision)
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) return 'solana';
  return null;
}

// Kept for backward compatibility — returns 'ethereum' for EVM, Chain for others
export function detectChain(address: string): Chain | null {
  const type = detectAddressType(address);
  if (!type) return null;
  if (type === 'evm') return 'ethereum';
  return type as Chain;
}

// Chains using Alchemy EVM RPC (not covered by free Etherscan V2)
export const ALCHEMY_EVM_CHAINS: Chain[] = ['bsc', 'polygon', 'arbitrum', 'optimism', 'avalanche'];

export function isEvmChain(chain: Chain): boolean {
  return chain !== 'solana' && chain !== 'tron';
}

export function isAlchemyEvmChain(chain: Chain): boolean {
  return ALCHEMY_EVM_CHAINS.includes(chain);
}

export function isEtherscanChain(chain: Chain): boolean {
  return chain === 'ethereum' || chain === 'base';
}

export function getExplorerTxUrl(chain: Chain, hash: string): string {
  const cfg = CHAIN_CONFIG[chain];
  if (chain === 'solana') return `${cfg.explorer}/tx/${hash}`;
  if (chain === 'tron') return `${cfg.explorer}/#/transaction/${hash}`;
  return `${cfg.explorer}/tx/${hash}`;
}

export function getExplorerAddressUrl(chain: Chain, address: string): string {
  const cfg = CHAIN_CONFIG[chain];
  if (chain === 'solana') return `${cfg.explorer}/account/${address}`;
  if (chain === 'tron') return `${cfg.explorer}/#/address/${address}`;
  return `${cfg.explorer}/address/${address}`;
}

export const ALL_CHAINS: Chain[] = ['ethereum', 'bsc', 'base', 'polygon', 'arbitrum', 'optimism', 'avalanche', 'tron', 'solana'];
export const EVM_CHAINS: Chain[] = ['ethereum', 'bsc', 'base', 'polygon', 'arbitrum', 'optimism', 'avalanche'];
