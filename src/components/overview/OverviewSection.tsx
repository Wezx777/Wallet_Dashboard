'use client';

import { Plus, Wallet } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { StatsCards } from './StatsCards';
import { PortfolioChart } from './PortfolioChart';
import { ChainBalances } from './ChainBalances';
import { Button } from '@/components/ui/Button';
import { TokenRow } from '@/components/tokens/TokensSection';
import { SkeletonTable } from '@/components/ui/SkeletonCard';

interface Props {
  onAddWallet: () => void;
}

export function OverviewSection({ onAddWallet }: Props) {
  const { wallets, portfolio, loading, currency } = useApp();

  if (!wallets.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-fade-in">
        <div className="w-20 h-20 rounded-2xl bg-accent/15 flex items-center justify-center mb-6">
          <Wallet size={36} className="text-accent" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">No wallets added yet</h2>
        <p className="text-muted mb-8 max-w-sm">
          Add your first crypto wallet to start tracking your portfolio across Ethereum, Solana, BNB Chain and Base.
        </p>
        <Button onClick={onAddWallet} size="lg" icon={<Plus size={18} />}>
          Add Your First Wallet
        </Button>
      </div>
    );
  }

  const topTokens = portfolio?.tokens
    .filter(t => t.usdValue > 0.01)
    .slice(0, 5) ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      <StatsCards />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1">
          <PortfolioChart />
        </div>

        {/* Top tokens preview */}
        <div className="xl:col-span-2">
          {loading && !portfolio ? (
            <SkeletonTable rows={5} cols={5} />
          ) : topTokens.length > 0 ? (
            <div className="rounded-xl bg-bg-secondary border border-border overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="text-sm font-semibold text-white">Top Holdings</h3>
              </div>
              <div className="divide-y divide-border">
                {/* Header */}
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] px-5 py-2 text-xs text-muted font-medium">
                  <span>Token</span>
                  <span className="text-right">Price</span>
                  <span className="text-right">Balance</span>
                  <span className="text-right">Value</span>
                  <span className="text-right">24h</span>
                </div>
                {topTokens.map((token, i) => (
                  <TokenRow key={`${token.contractAddress}-${token.walletId}`} token={token} currency={currency} />
                ))}
              </div>
            </div>
          ) : portfolio ? (
            <div className="rounded-xl bg-bg-secondary border border-border flex items-center justify-center h-48 text-muted text-sm">
              No token holdings found
            </div>
          ) : null}
        </div>
      </div>

      <ChainBalances />
    </div>
  );
}
