'use client';

import { useState, useMemo } from 'react';
import { ExternalLink, Search, AlertCircle, RefreshCw } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Transaction, TxType, Chain } from '@/types';
import { formatNumber, formatDate, shortenAddress } from '@/lib/utils';
import { TxTypeBadge, ChainBadge } from '@/components/ui/Badge';
import { SkeletonTable } from '@/components/ui/SkeletonCard';
import { CHAIN_CONFIG } from '@/lib/chains';
import { Button } from '@/components/ui/Button';

const TX_TYPES: TxType[] = ['send', 'receive', 'swap', 'contract', 'topup'];

function TxRow({ tx }: { tx: Transaction }) {
  return (
    <div className={`grid grid-cols-[auto_auto_1fr_1fr_auto_auto] gap-3 px-5 py-3.5 items-center text-sm hover:bg-bg-tertiary/50 transition-colors ${tx.isError ? 'opacity-60' : ''}`}>
      {/* Type */}
      <TxTypeBadge type={tx.type} />

      {/* Chain */}
      <ChainBadge chain={tx.chain} />

      {/* Token + Amount */}
      <div className="min-w-0">
        <p className="font-medium text-white truncate">
          {tx.type === 'receive' ? '+' : tx.type === 'send' ? '-' : ''}
          {formatNumber(tx.amount)} {tx.tokenSymbol}
        </p>
        <p className="text-xs text-muted truncate">
          {tx.type === 'send' ? `To: ${shortenAddress(tx.to)}` : tx.type === 'receive' ? `From: ${shortenAddress(tx.from)}` : ''}
        </p>
      </div>

      {/* Wallet */}
      <div className="min-w-0 hidden sm:block">
        <p className="text-white truncate">{tx.walletName}</p>
        <p className="text-xs text-muted truncate">{shortenAddress(tx.walletAddress)}</p>
      </div>

      {/* Date */}
      <div className="text-right hidden md:block">
        <p className="text-muted text-xs">{formatDate(tx.timestamp)}</p>
        {tx.isError && (
          <span className="flex items-center gap-0.5 text-danger text-xs justify-end">
            <AlertCircle size={10} />
            Failed
          </span>
        )}
      </div>

      {/* Explorer link */}
      <a
        href={tx.explorerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-bg-tertiary transition-colors"
        title="View on explorer"
      >
        <ExternalLink size={14} />
      </a>
    </div>
  );
}

export function TransactionsSection() {
  const { transactions, loadingTx, wallets, refreshTransactions, selectedWalletId } = useApp();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TxType | 'all'>('all');
  const [chainFilter, setChainFilter] = useState<Chain | 'all'>('all');
  const [walletFilter, setWalletFilter] = useState<string | 'all'>('all');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 30;

  const filtered = useMemo(() => {
    let list = transactions;
    if (selectedWalletId) list = list.filter(t => t.walletId === selectedWalletId);
    if (walletFilter !== 'all') list = list.filter(t => t.walletId === walletFilter);
    if (typeFilter !== 'all') list = list.filter(t => t.type === typeFilter);
    if (chainFilter !== 'all') list = list.filter(t => t.chain === chainFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.tokenSymbol.toLowerCase().includes(q) ||
        t.hash.toLowerCase().includes(q) ||
        t.walletName.toLowerCase().includes(q)
      );
    }
    return list;
  }, [transactions, selectedWalletId, walletFilter, typeFilter, chainFilter, search]);

  const paginated = useMemo(() => filtered.slice(0, page * PAGE_SIZE), [filtered, page]);

  if (!wallets.length) return null;
  if (loadingTx && !transactions.length) return <SkeletonTable rows={8} cols={6} />;

  const availableChains = [...new Set(transactions.map(t => t.chain))] as Chain[];

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search by token, hash, wallet..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-white placeholder-muted focus:outline-none focus:border-accent transition-colors"
            />
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw size={14} className={loadingTx ? 'animate-spin' : ''} />}
            onClick={refreshTransactions}
            loading={loadingTx}
          >
            Refresh
          </Button>
        </div>

        {/* Type filters */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => { setTypeFilter('all'); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${typeFilter === 'all' ? 'bg-accent text-white' : 'bg-bg-secondary border border-border text-muted hover:text-white'}`}
          >
            All Types
          </button>
          {TX_TYPES.map(t => (
            <button
              key={t}
              onClick={() => { setTypeFilter(t); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${typeFilter === t ? 'bg-accent text-white' : 'bg-bg-secondary border border-border text-muted hover:text-white'}`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Chain + Wallet filters */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => { setChainFilter('all'); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${chainFilter === 'all' ? 'bg-bg-tertiary text-white' : 'text-muted hover:text-white'}`}
          >
            All Chains
          </button>
          {availableChains.map(chain => (
            <button
              key={chain}
              onClick={() => { setChainFilter(chain); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${chainFilter === chain ? 'bg-bg-tertiary text-white' : 'text-muted hover:text-white'}`}
            >
              {CHAIN_CONFIG[chain].name}
            </button>
          ))}
          <span className="w-px bg-border mx-1" />
          <button
            onClick={() => { setWalletFilter('all'); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${walletFilter === 'all' ? 'bg-bg-tertiary text-white' : 'text-muted hover:text-white'}`}
          >
            All Wallets
          </button>
          {wallets.map(w => (
            <button
              key={w.id}
              onClick={() => { setWalletFilter(w.id); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${walletFilter === w.id ? 'bg-bg-tertiary text-white' : 'text-muted hover:text-white'}`}
            >
              {w.name}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-bg-secondary border border-border overflow-hidden">
        <div className="grid grid-cols-[auto_auto_1fr_1fr_auto_auto] gap-3 px-5 py-3 border-b border-border text-xs text-muted font-medium">
          <span>Type</span>
          <span>Chain</span>
          <span>Amount</span>
          <span className="hidden sm:block">Wallet</span>
          <span className="hidden md:block">Date</span>
          <span>Link</span>
        </div>

        {paginated.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted text-sm">
            {transactions.length === 0 ? 'No transactions found' : 'No transactions match your filters'}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {paginated.map((tx, i) => (
              <TxRow key={`${tx.id}-${i}`} tx={tx} />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm">
        <p className="text-muted">{filtered.length} transaction{filtered.length !== 1 ? 's' : ''}</p>
        {paginated.length < filtered.length && (
          <Button variant="secondary" size="sm" onClick={() => setPage(p => p + 1)}>
            Load more ({filtered.length - paginated.length} remaining)
          </Button>
        )}
      </div>
    </div>
  );
}
