'use client';

import { TrendingUp, TrendingDown, Wallet, Coins } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { SkeletonStats } from '@/components/ui/SkeletonCard';

export function StatsCards() {
  const { portfolio, currency, loading, wallets } = useApp();

  if (loading && !portfolio) return <SkeletonStats />;
  if (!portfolio && !wallets.length) return null;

  const totalValue = portfolio ? (currency === 'USD' ? portfolio.totalUsd : portfolio.totalEur) : 0;
  const change24h = portfolio?.change24h ?? 0;
  const change24hAbs = portfolio ? totalValue * (change24h / 100) : 0;
  const isPos = change24h >= 0;

  const totalTokens = portfolio ? portfolio.tokens.filter(t => t.usdValue > 0.01).length : 0;
  const activeChains = portfolio ? portfolio.chains.length : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* Total value */}
      <div className="sm:col-span-1 rounded-xl bg-bg-secondary border border-border p-5">
        <p className="text-xs text-muted font-medium uppercase tracking-wide mb-2">Portfolio Value</p>
        <p className="text-3xl font-bold text-white mb-1">
          {portfolio ? formatCurrency(totalValue, currency) : '—'}
        </p>
        {portfolio && (
          <div className={`flex items-center gap-1 text-sm font-medium ${isPos ? 'text-success' : 'text-danger'}`}>
            {isPos ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>{formatCurrency(Math.abs(change24hAbs), currency)}</span>
            <span className="text-muted">({formatPercent(change24h)}) 24h</span>
          </div>
        )}
      </div>

      {/* Wallets + Chains */}
      <div className="rounded-xl bg-bg-secondary border border-border p-5">
        <p className="text-xs text-muted font-medium uppercase tracking-wide mb-2">Wallets</p>
        <div className="flex items-end gap-2">
          <p className="text-3xl font-bold text-white">{wallets.length}</p>
          <p className="text-muted text-sm pb-1">
            across {activeChains} chain{activeChains !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="mt-1 flex items-center gap-1 text-sm text-muted">
          <Wallet size={14} />
          {wallets.map(w => w.name).slice(0, 2).join(', ')}
          {wallets.length > 2 && ` +${wallets.length - 2} more`}
        </div>
      </div>

      {/* Tokens */}
      <div className="rounded-xl bg-bg-secondary border border-border p-5">
        <p className="text-xs text-muted font-medium uppercase tracking-wide mb-2">Tokens</p>
        <p className="text-3xl font-bold text-white">{totalTokens}</p>
        <div className="mt-1 flex items-center gap-1 text-sm text-muted">
          <Coins size={14} />
          {portfolio ? `${portfolio.tokens.filter(t => t.usdValue > 1).length} with value` : 'No data yet'}
        </div>
      </div>
    </div>
  );
}
