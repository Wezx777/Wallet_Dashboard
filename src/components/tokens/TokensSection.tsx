'use client';

import { useState, useMemo } from 'react';
import { Search, ArrowUpDown, ExternalLink } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { TokenHolding, Currency, Chain } from '@/types';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { PriceChange } from '@/components/ui/PriceChange';
import { SkeletonTable } from '@/components/ui/SkeletonCard';
import { CHAIN_CONFIG } from '@/lib/chains';

type SortKey = 'value' | 'balance' | 'price' | 'change24h' | 'portfolioPercent';

function TokenLogo({ symbol, logoUrl }: { symbol: string; logoUrl?: string }) {
  const [err, setErr] = useState(false);
  return (
    <div className="w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center text-xs font-bold text-accent flex-shrink-0 overflow-hidden">
      {logoUrl && !err ? (
        <img src={logoUrl} alt={symbol} className="w-8 h-8 object-cover" onError={() => setErr(true)} />
      ) : (
        symbol.replace('…', '').slice(0, 2).toUpperCase()
      )}
    </div>
  );
}

export function TokenRow({ token, currency }: { token: TokenHolding; currency: Currency }) {
  const value = currency === 'USD' ? token.usdValue : token.eurValue;
  const price = currency === 'USD' ? token.usdPrice : token.eurPrice;
  const cfg = CHAIN_CONFIG[token.chain];
  const explorerUrl = `${cfg.explorer}/token/${token.contractAddress}`;

  return (
    <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] px-5 py-3 hover:bg-bg-tertiary/50 transition-colors items-center text-sm group">
      {/* Token name */}
      <div className="flex items-center gap-2 min-w-0">
        <TokenLogo symbol={token.symbol} logoUrl={token.logoUrl} />
        <div className="min-w-0">
          <p className="font-medium text-white truncate">{token.symbol}</p>
          <p className="text-xs text-muted truncate">{token.name}</p>
        </div>
        <a href={explorerUrl} target="_blank" rel="noopener noreferrer"
          className="ml-1 text-muted hover:text-white flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <ExternalLink size={12} />
        </a>
      </div>

      {/* Price */}
      <div className="text-right">
        <p className="text-white">{price > 0 ? formatCurrency(price, currency) : '—'}</p>
      </div>

      {/* Balance */}
      <div className="text-right">
        <p className="text-white">{formatNumber(token.balance)}</p>
      </div>

      {/* Value */}
      <div className="text-right">
        <p className="font-medium text-white">{value > 0 ? formatCurrency(value, currency) : '—'}</p>
        <p className="text-xs text-muted">{token.portfolioPercent > 0 ? `${token.portfolioPercent.toFixed(1)}%` : ''}</p>
      </div>

      {/* 24h */}
      <div className="text-right">
        {token.change24h !== 0 ? (
          <PriceChange value={token.change24h} size="sm" showIcon={false} />
        ) : (
          <span className="text-muted text-xs">—</span>
        )}
      </div>
    </div>
  );
}

export function TokensSection() {
  const { portfolio, currency, loading, wallets, selectedWalletId } = useApp();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('value');
  const [sortAsc, setSortAsc] = useState(false);
  const [chainFilter, setChainFilter] = useState<Chain | 'all'>('all');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(false); }
  };

  const tokens = useMemo(() => {
    if (!portfolio) return [];
    let list = portfolio.tokens.filter(t => {
      const value = currency === 'USD' ? t.usdValue : t.eurValue;
      return value > 0.001 || t.balance > 0;
    });

    if (selectedWalletId) list = list.filter(t => t.walletId === selectedWalletId);
    if (chainFilter !== 'all') list = list.filter(t => t.chain === chainFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(t => t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q));
    }

    return list.sort((a, b) => {
      let av = 0, bv = 0;
      if (sortKey === 'value') { av = currency === 'USD' ? a.usdValue : a.eurValue; bv = currency === 'USD' ? b.usdValue : b.eurValue; }
      else if (sortKey === 'price') { av = currency === 'USD' ? a.usdPrice : a.eurPrice; bv = currency === 'USD' ? b.usdPrice : b.eurPrice; }
      else if (sortKey === 'balance') { av = a.balance; bv = b.balance; }
      else if (sortKey === 'change24h') { av = a.change24h; bv = b.change24h; }
      else if (sortKey === 'portfolioPercent') { av = a.portfolioPercent; bv = b.portfolioPercent; }
      return sortAsc ? av - bv : bv - av;
    });
  }, [portfolio, currency, selectedWalletId, chainFilter, search, sortKey, sortAsc]);

  const availableChains = useMemo(() =>
    [...new Set(portfolio?.tokens.map(t => t.chain) ?? [])],
    [portfolio]
  );

  if (!wallets.length) return null;
  if (loading && !portfolio) return <SkeletonTable rows={8} cols={5} />;

  const SortHeader = ({ label, sortId }: { label: string; sortId: SortKey }) => (
    <button
      onClick={() => handleSort(sortId)}
      className="flex items-center gap-1 text-xs text-muted hover:text-white transition-colors font-medium ml-auto"
    >
      {label}
      <ArrowUpDown size={10} className={sortKey === sortId ? 'text-accent' : ''} />
    </button>
  );

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search tokens..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-white placeholder-muted focus:outline-none focus:border-accent transition-colors"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setChainFilter('all')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${chainFilter === 'all' ? 'bg-accent text-white' : 'bg-bg-secondary border border-border text-muted hover:text-white'}`}
          >
            All Chains
          </button>
          {availableChains.map(chain => (
            <button
              key={chain}
              onClick={() => setChainFilter(chain)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${chainFilter === chain ? 'bg-accent text-white' : 'bg-bg-secondary border border-border text-muted hover:text-white'}`}
            >
              {CHAIN_CONFIG[chain].name}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-bg-secondary border border-border overflow-hidden">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] px-5 py-3 border-b border-border text-xs text-muted font-medium">
          <span>Token</span>
          <div className="flex justify-end"><SortHeader label="Price" sortId="price" /></div>
          <div className="flex justify-end"><SortHeader label="Balance" sortId="balance" /></div>
          <div className="flex justify-end"><SortHeader label="Value" sortId="value" /></div>
          <div className="flex justify-end"><SortHeader label="24h" sortId="change24h" /></div>
        </div>

        {tokens.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted text-sm">
            {search ? 'No tokens match your search' : 'No token holdings found'}
          </div>
        ) : (
          <div className="divide-y divide-border group">
            {tokens.map((token, i) => (
              <TokenRow
                key={`${token.contractAddress}-${token.walletId}-${i}`}
                token={token}
                currency={currency}
              />
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-muted text-center">
        {tokens.length} token{tokens.length !== 1 ? 's' : ''} · Real-time on-chain balances
      </p>
    </div>
  );
}
