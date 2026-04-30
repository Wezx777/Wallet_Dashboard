'use client';

import { Plus, Wallet } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { WalletCard } from './WalletCard';
import { Button } from '@/components/ui/Button';
import { SkeletonCard } from '@/components/ui/SkeletonCard';

interface Props {
  onAddWallet: () => void;
}

export function WalletsSection({ onAddWallet }: Props) {
  const { wallets, loading } = useApp();

  if (!wallets.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-accent/15 flex items-center justify-center mb-4">
          <Wallet size={28} className="text-accent" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">No wallets yet</h2>
        <p className="text-muted text-sm mb-6">Add wallets to start tracking your crypto portfolio.</p>
        <Button onClick={onAddWallet} icon={<Plus size={16} />}>Add Wallet</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">
          {wallets.length} Wallet{wallets.length !== 1 ? 's' : ''}
        </h2>
        <Button variant="secondary" size="sm" icon={<Plus size={14} />} onClick={onAddWallet}>
          Add Wallet
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading && !wallets.length
          ? [1, 2, 3].map(i => <SkeletonCard key={i} rows={4} />)
          : wallets.map(wallet => <WalletCard key={wallet.id} wallet={wallet} />)
        }
      </div>
    </div>
  );
}
