'use client';

import { ExternalLink } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { PriceChange } from '@/components/ui/PriceChange';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { CHAIN_CONFIG } from '@/lib/chains';
import { Chain } from '@/types';

const CHAIN_EMOJIS: Record<Chain, string> = {
  ethereum: '◆',
  bsc: '●',
  base: '■',
  solana: '◉',
};

export function ChainBalances() {
  const { portfolio, currency, loading, wallets } = useApp();

  if (loading && !portfolio) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <SkeletonCard key={i} rows={3} />)}
      </div>
    );
  }

  if (!portfolio?.chains.length) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-white mb-3">Balances by Chain</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {portfolio.chains.map(chain => {
          const cfg = CHAIN_CONFIG[chain.chain];
          const totalValue = currency === 'USD' ? chain.totalUsd : chain.totalEur;
          const nativeValue = currency === 'USD' ? chain.nativeUsdValue : chain.nativeUsdValue * (portfolio.totalEur / (portfolio.totalUsd || 1));

          // Find native balances for this chain
          const nativeBals = portfolio.nativeBalances.filter(nb => nb.chain === chain.chain);
          const totalNative = nativeBals.reduce((s, nb) => s + nb.balance, 0);

          const explorerUrl = wallets
            .filter(w => w.chain === chain.chain)
            .map(w => `${cfg.explorer}/address/${w.address}`)
            .find(Boolean);

          return (
            <div key={chain.chain} className="rounded-xl bg-bg-secondary border border-border p-5 hover:border-border-light transition-colors">
              {/* Chain header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-base font-bold"
                    style={{ backgroundColor: `${chain.color}20`, color: chain.color }}
                  >
                    {CHAIN_EMOJIS[chain.chain]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{chain.name}</p>
                    <p className="text-xs text-muted">{chain.tokenCount} token{chain.tokenCount !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                {explorerUrl && (
                  <a
                    href={explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-bg-tertiary transition-colors"
                  >
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>

              {/* Native balance */}
              <div className="mb-3">
                <p className="text-xs text-muted mb-0.5">Native Balance</p>
                <p className="text-lg font-bold text-white">
                  {formatNumber(totalNative, 4)} {chain.symbol}
                </p>
                <p className="text-sm text-muted">{formatCurrency(nativeValue, currency)}</p>
              </div>

              {/* Total value */}
              <div className="pt-3 border-t border-border flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted mb-0.5">Total Value</p>
                  <p className="font-bold text-white">{formatCurrency(totalValue, currency)}</p>
                </div>
                <PriceChange value={chain.change24h} size="sm" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
