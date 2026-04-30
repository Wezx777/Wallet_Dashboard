'use client';

import { RefreshCw, DollarSign, Euro, Plus, Wifi, WifiOff } from 'lucide-react';
import { clsx } from 'clsx';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import { formatRelativeTime } from '@/lib/utils';

interface HeaderProps {
  onAddWallet: () => void;
}

export function Header({ onAddWallet }: HeaderProps) {
  const { loading, currency, setCurrency, refreshPortfolio, refreshTransactions, lastUpdated, wallets } = useApp();

  const handleRefresh = () => {
    refreshPortfolio();
    refreshTransactions();
  };

  return (
    <header className="h-16 border-b border-border bg-bg-primary/80 backdrop-blur-sm sticky top-0 z-30 flex items-center justify-between px-4 md:px-6 gap-4">
      {/* Left: status */}
      <div className="flex items-center gap-2 min-w-0">
        {wallets.length > 0 && (
          <>
            {loading ? (
              <span className="flex items-center gap-1.5 text-xs text-warning">
                <Wifi size={12} className="animate-pulse" />
                Updating...
              </span>
            ) : lastUpdated ? (
              <span className="flex items-center gap-1.5 text-xs text-muted">
                <Wifi size={12} className="text-success" />
                Updated {formatRelativeTime(lastUpdated / 1000)}
              </span>
            ) : null}
          </>
        )}
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        {/* Currency toggle */}
        <div className="flex items-center rounded-lg border border-border bg-bg-secondary overflow-hidden">
          <button
            onClick={() => setCurrency('USD')}
            className={clsx(
              'flex items-center gap-1 px-3 py-1.5 text-sm font-medium transition-colors',
              currency === 'USD' ? 'bg-accent text-white' : 'text-muted hover:text-white'
            )}
          >
            <DollarSign size={14} />
            USD
          </button>
          <button
            onClick={() => setCurrency('EUR')}
            className={clsx(
              'flex items-center gap-1 px-3 py-1.5 text-sm font-medium transition-colors',
              currency === 'EUR' ? 'bg-accent text-white' : 'text-muted hover:text-white'
            )}
          >
            <Euro size={14} />
            EUR
          </button>
        </div>

        {/* Refresh */}
        <Button
          variant="ghost"
          size="sm"
          icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
          onClick={handleRefresh}
          disabled={loading || !wallets.length}
        >
          <span className="hidden sm:inline">Refresh</span>
        </Button>

        {/* Add wallet */}
        <Button
          variant="primary"
          size="sm"
          icon={<Plus size={14} />}
          onClick={onAddWallet}
        >
          <span className="hidden sm:inline">Add Wallet</span>
        </Button>
      </div>
    </header>
  );
}
