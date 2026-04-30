'use client';

import { TxType, Chain } from '@/types';
import { CHAIN_CONFIG } from '@/lib/chains';

const TX_TYPE_STYLES: Record<TxType, { label: string; className: string }> = {
  send: { label: 'Send', className: 'bg-danger/15 text-danger' },
  receive: { label: 'Receive', className: 'bg-success/15 text-success' },
  swap: { label: 'Swap', className: 'bg-accent/15 text-accent' },
  contract: { label: 'Contract', className: 'bg-warning/15 text-warning' },
  topup: { label: 'Top-up', className: 'bg-blue-500/15 text-blue-400' },
};

export function TxTypeBadge({ type }: { type: TxType }) {
  const style = TX_TYPE_STYLES[type] ?? TX_TYPE_STYLES.contract;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${style.className}`}>
      {style.label}
    </span>
  );
}

export function ChainBadge({ chain }: { chain: Chain }) {
  const cfg = CHAIN_CONFIG[chain];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: `${cfg.color}20`, color: cfg.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.color }} />
      {cfg.name}
    </span>
  );
}
