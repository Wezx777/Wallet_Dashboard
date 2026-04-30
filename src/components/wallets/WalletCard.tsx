'use client';

import { useState } from 'react';
import { Copy, ExternalLink, Trash2, CheckCheck, Eye } from 'lucide-react';
import { Wallet, WalletCategory } from '@/types';
import { useApp } from '@/context/AppContext';
import { formatCurrency, formatNumber, shortenAddress } from '@/lib/utils';
import { CHAIN_CONFIG, getExplorerAddressUrl } from '@/lib/chains';
import { PriceChange } from '@/components/ui/PriceChange';

const CATEGORY_BADGE: Record<WalletCategory, { icon: string; label: string; cls: string }> = {
  cold:     { icon: '🔒', label: 'Cold Wallet', cls: 'bg-blue-500/10 text-blue-400' },
  hot:      { icon: '📱', label: 'Hot Wallet',  cls: 'bg-orange-500/10 text-orange-400' },
  exchange: { icon: '🏦', label: 'Exchange',    cls: 'bg-yellow-500/10 text-yellow-400' },
  dex:      { icon: '🔄', label: 'DEX / DeFi', cls: 'bg-purple-500/10 text-purple-400' },
  other:    { icon: '📁', label: 'Outro',       cls: 'bg-zinc-500/10 text-zinc-400' },
};

interface Props {
  wallet: Wallet;
}

export function WalletCard({ wallet }: Props) {
  const { portfolio, currency, removeWallet, setSection, setSelectedWallet } = useApp();
  const [copied, setCopied] = useState(false);

  const cfg = CHAIN_CONFIG[wallet.chain];

  const nativeBalance = portfolio?.nativeBalances.find(nb => nb.walletId === wallet.id);
  const walletTokens = portfolio?.tokens.filter(t => t.walletId === wallet.id) ?? [];
  const walletTotalUsd = (nativeBalance?.usdValue ?? 0) + walletTokens.reduce((s, t) => s + t.usdValue, 0);
  const walletTotalEur = (nativeBalance?.eurValue ?? 0) + walletTokens.reduce((s, t) => s + t.eurValue, 0);
  const walletTotal = currency === 'USD' ? walletTotalUsd : walletTotalEur;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleViewDetails = () => {
    setSelectedWallet(wallet.id);
    setSection('tokens');
  };

  return (
    <div className="rounded-xl bg-bg-secondary border border-border p-5 hover:border-border-light transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg"
            style={{ backgroundColor: `${cfg.color}20`, color: cfg.color }}
          >
            {wallet.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-white">{wallet.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span
                className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: `${cfg.color}20`, color: cfg.color }}
              >
                {cfg.name}
              </span>
              {wallet.category && CATEGORY_BADGE[wallet.category] && (() => {
                const badge = CATEGORY_BADGE[wallet.category!]!;
                return (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${badge.cls}`}>
                    {badge.icon} {badge.label}
                  </span>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleViewDetails}
            title="View details"
            className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-bg-tertiary transition-colors"
          >
            <Eye size={15} />
          </button>
          <a
            href={getExplorerAddressUrl(wallet.chain, wallet.address)}
            target="_blank"
            rel="noopener noreferrer"
            title="View on explorer"
            className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-bg-tertiary transition-colors"
          >
            <ExternalLink size={15} />
          </a>
          <button
            onClick={() => removeWallet(wallet.id)}
            title="Remove wallet"
            className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition-colors"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Address */}
      <button
        onClick={handleCopy}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-bg-tertiary rounded-lg mb-4 hover:bg-border-light transition-colors group"
      >
        <span className="text-xs font-mono text-muted truncate">{shortenAddress(wallet.address, 8)}</span>
        {copied
          ? <CheckCheck size={14} className="text-success flex-shrink-0" />
          : <Copy size={14} className="text-muted flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        }
      </button>

      {/* Balances */}
      <div className="space-y-2">
        {nativeBalance ? (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">{cfg.symbol} Balance</span>
            <div className="text-right">
              <span className="text-white font-medium">{formatNumber(nativeBalance.balance, 4)} {cfg.symbol}</span>
              <span className="text-muted ml-2 text-xs">{formatCurrency(currency === 'USD' ? nativeBalance.usdValue : nativeBalance.eurValue, currency)}</span>
            </div>
          </div>
        ) : portfolio ? (
          <div className="text-sm text-muted">0 {cfg.symbol}</div>
        ) : (
          <div className="text-sm text-muted animate-pulse">Loading…</div>
        )}

        {walletTokens.filter(t => (currency === 'USD' ? t.usdValue : t.eurValue) > 0.01).slice(0, 3).map(t => (
          <div key={t.contractAddress} className="flex items-center justify-between text-sm">
            <span className="text-muted">{t.symbol}</span>
            <span className="text-white">{formatCurrency(currency === 'USD' ? t.usdValue : t.eurValue, currency)}</span>
          </div>
        ))}

        {walletTokens.filter(t => (currency === 'USD' ? t.usdValue : t.eurValue) > 0.01).length > 3 && (
          <p className="text-xs text-muted text-right">
            +{walletTokens.filter(t => (currency === 'USD' ? t.usdValue : t.eurValue) > 0.01).length - 3} more tokens
          </p>
        )}
      </div>

      {/* Total */}
      <div className="pt-4 mt-4 border-t border-border flex items-center justify-between">
        <div>
          <p className="text-xs text-muted mb-0.5">Total Value</p>
          <p className="text-lg font-bold text-white">{formatCurrency(walletTotal, currency)}</p>
        </div>
        {nativeBalance && <PriceChange value={nativeBalance.change24h} size="sm" />}
      </div>
    </div>
  );
}
