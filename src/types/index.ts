export type Chain = 'ethereum' | 'solana' | 'bsc' | 'base' | 'polygon' | 'arbitrum' | 'optimism' | 'avalanche' | 'tron' | 'robinhood';
export type Currency = 'USD' | 'EUR';
export type Section = 'overview' | 'wallets' | 'tokens' | 'transactions';
export type TxType = 'send' | 'receive' | 'swap' | 'contract' | 'topup';
export type WalletCategory = 'cold' | 'hot' | 'exchange' | 'dex' | 'other';

export interface Wallet {
  id: string;
  address: string;
  name: string;
  chain: Chain;
  category?: WalletCategory;
  createdAt: number;
}

export interface NativeBalance {
  chain: Chain;
  walletId: string;
  walletAddress: string;
  walletName: string;
  balance: number;
  symbol: string;
  name: string;
  usdValue: number;
  eurValue: number;
  usdPrice: number;
  eurPrice: number;
  change24h: number;
}

export interface TokenHolding {
  chain: Chain;
  walletId: string;
  walletAddress: string;
  contractAddress: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: number;
  logoUrl?: string;
  usdPrice: number;
  eurPrice: number;
  usdValue: number;
  eurValue: number;
  change24h: number;
  portfolioPercent: number;
}

export interface Transaction {
  id: string;
  hash: string;
  chain: Chain;
  walletId: string;
  walletAddress: string;
  walletName: string;
  type: TxType;
  tokenSymbol: string;
  tokenName: string;
  amount: number;
  usdValueAtTime: number;
  timestamp: number;
  from: string;
  to: string;
  explorerUrl: string;
  isError: boolean;
}

export interface ChainSummary {
  chain: Chain;
  name: string;
  symbol: string;
  color: string;
  totalUsd: number;
  totalEur: number;
  nativeBalance: number;
  nativeUsdValue: number;
  change24h: number;
  tokenCount: number;
}

export interface PortfolioData {
  totalUsd: number;
  totalEur: number;
  change24h: number;
  nativeBalances: NativeBalance[];
  tokens: TokenHolding[];
  chains: ChainSummary[];
  lastUpdated: number;
}

export interface PriceData {
  usd: number;
  eur: number;
  usd_24h_change: number;
}
