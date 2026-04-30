'use client';

import { LayoutDashboard, Wallet, Coins, ArrowLeftRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Section } from '@/types';

const NAV_ITEMS: { id: Section; label: string; Icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', Icon: LayoutDashboard },
  { id: 'wallets', label: 'Wallets', Icon: Wallet },
  { id: 'tokens', label: 'Tokens', Icon: Coins },
  { id: 'transactions', label: 'Transactions', Icon: ArrowLeftRight },
];

export function Sidebar() {
  const { activeSection, setSection, wallets } = useApp();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={clsx(
        'hidden md:flex flex-col bg-bg-secondary border-r border-border transition-all duration-300 relative',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className={clsx('flex items-center gap-3 px-4 h-16 border-b border-border overflow-hidden', collapsed && 'justify-center px-0')}>
        <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
          <Wallet size={16} className="text-white" />
        </div>
        {!collapsed && (
          <div>
            <p className="text-white font-bold text-sm leading-tight">Crypto</p>
            <p className="text-muted text-xs">Dashboard</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {NAV_ITEMS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setSection(id)}
            title={collapsed ? label : undefined}
            className={clsx(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
              collapsed && 'justify-center',
              activeSection === id
                ? 'bg-accent/15 text-accent'
                : 'text-muted hover:text-white hover:bg-bg-tertiary'
            )}
          >
            <Icon size={18} className="flex-shrink-0" />
            {!collapsed && label}
            {!collapsed && id === 'wallets' && wallets.length > 0 && (
              <span className="ml-auto bg-accent/20 text-accent text-xs rounded-full px-2 py-0.5">
                {wallets.length}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-bg-tertiary border border-border flex items-center justify-center text-muted hover:text-white transition-colors z-10"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  );
}

// Mobile bottom navigation
export function MobileNav() {
  const { activeSection, setSection } = useApp();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-bg-secondary border-t border-border z-40 flex">
      {NAV_ITEMS.map(({ id, label, Icon }) => (
        <button
          key={id}
          onClick={() => setSection(id)}
          className={clsx(
            'flex-1 flex flex-col items-center justify-center py-2 text-xs gap-1 transition-colors',
            activeSection === id ? 'text-accent' : 'text-muted'
          )}
        >
          <Icon size={20} />
          {label}
        </button>
      ))}
    </nav>
  );
}
