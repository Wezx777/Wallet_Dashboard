'use client';

import { useState } from 'react';
import { AppProvider, useApp } from '@/context/AppContext';
import { Sidebar, MobileNav } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { OverviewSection } from '@/components/overview/OverviewSection';
import { WalletsSection } from '@/components/wallets/WalletsSection';
import { TokensSection } from '@/components/tokens/TokensSection';
import { TransactionsSection } from '@/components/transactions/TransactionsSection';
import { AddWalletModal } from '@/components/wallets/AddWalletModal';

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-xl font-bold text-white">{title}</h1>
      {subtitle && <p className="text-sm text-muted mt-0.5">{subtitle}</p>}
    </div>
  );
}

function AppShell() {
  const { activeSection, wallets, selectedWalletId, setSelectedWallet, setSection } = useApp();
  const [addWalletOpen, setAddWalletOpen] = useState(false);

  const selectedWallet = wallets.find(w => w.id === selectedWalletId);

  const getSectionContent = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <>
            <SectionTitle
              title="Portfolio Overview"
              subtitle={wallets.length ? `Tracking ${wallets.length} wallet${wallets.length > 1 ? 's' : ''}` : undefined}
            />
            <OverviewSection onAddWallet={() => setAddWalletOpen(true)} />
          </>
        );
      case 'wallets':
        return (
          <>
            <SectionTitle title="Wallets" subtitle="Manage your tracked wallets" />
            <WalletsSection onAddWallet={() => setAddWalletOpen(true)} />
          </>
        );
      case 'tokens':
        return (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div>
                <h1 className="text-xl font-bold text-white">
                  {selectedWallet ? `${selectedWallet.name} — Tokens` : 'All Tokens'}
                </h1>
                {selectedWallet && (
                  <button
                    onClick={() => { setSelectedWallet(null); }}
                    className="text-xs text-accent hover:underline mt-0.5"
                  >
                    ← Show all wallets
                  </button>
                )}
              </div>
            </div>
            <TokensSection />
          </>
        );
      case 'transactions':
        return (
          <>
            <div className="mb-6">
              <h1 className="text-xl font-bold text-white">
                {selectedWallet ? `${selectedWallet.name} — Transactions` : 'Transaction History'}
              </h1>
              {selectedWallet && (
                <button
                  onClick={() => { setSelectedWallet(null); }}
                  className="text-xs text-accent hover:underline mt-0.5"
                >
                  ← Show all wallets
                </button>
              )}
            </div>
            <TransactionsSection />
          </>
        );
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-bg-primary">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onAddWallet={() => setAddWalletOpen(true)} />

        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
            {getSectionContent()}
          </div>
        </main>
      </div>

      <MobileNav />
      <AddWalletModal open={addWalletOpen} onClose={() => setAddWalletOpen(false)} />
    </div>
  );
}

export default function Home() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
