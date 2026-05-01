'use client';

import { RefreshCw, DollarSign, Euro, Plus, Wifi, LogOut, User } from 'lucide-react';
import { clsx } from 'clsx';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { formatRelativeTime, shortenAddress } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

interface HeaderProps {
  onAddWallet: () => void;
}

export function Header({ onAddWallet }: HeaderProps) {
  const { loading, currency, setCurrency, refreshPortfolio, refreshTransactions, lastUpdated, wallets } = useApp();
  const { user } = useAuth();
  const router = useRouter();

  const handleRefresh = () => {
    refreshPortfolio();
    refreshTransactions();
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const displayName = (() => {
    if (!user) return null;
    const walletAddress = user.user_metadata?.wallet_address as string | undefined;
    if (walletAddress) return shortenAddress(walletAddress);
    return user.email ?? null;
  })();

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

        {/* User menu */}
        {displayName && (
          <div className="hidden sm:flex items-center gap-1.5 pl-2 border-l border-border">
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <User size={13} />
              <span className="max-w-[120px] truncate">{displayName}</span>
            </span>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          title="Logout"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition-colors text-xs font-medium"
        >
          <LogOut size={14} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
