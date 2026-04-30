'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/lib/utils';
import { CHAIN_CONFIG } from '@/lib/chains';
import { Chain } from '@/types';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { useState } from 'react';

const COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#14B8A6', '#F97316', '#A78BFA'];

type ChartMode = 'token' | 'chain';

interface ChartEntry {
  name: string;
  value: number;
  color: string;
}

export function PortfolioChart() {
  const { portfolio, currency, loading } = useApp();
  const [mode, setMode] = useState<ChartMode>('token');

  if (loading && !portfolio) return <SkeletonCard rows={6} />;
  if (!portfolio) return null;

  const total = currency === 'USD' ? portfolio.totalUsd : portfolio.totalEur;

  let data: ChartEntry[] = [];
  if (mode === 'chain') {
    data = portfolio.chains.map((c, i) => ({
      name: c.name,
      value: currency === 'USD' ? c.totalUsd : c.totalEur,
      color: c.color,
    })).filter(d => d.value > 0);
  } else {
    // Top tokens by value
    const topTokens = [...portfolio.tokens]
      .sort((a, b) => (currency === 'USD' ? b.usdValue - a.usdValue : b.eurValue - a.eurValue))
      .slice(0, 8);

    const topValue = topTokens.reduce((s, t) => s + (currency === 'USD' ? t.usdValue : t.eurValue), 0);

    // Add native balances at top level
    const nativeBySymbol = new Map<string, number>();
    for (const nb of portfolio.nativeBalances) {
      const v = currency === 'USD' ? nb.usdValue : nb.eurValue;
      nativeBySymbol.set(nb.symbol, (nativeBySymbol.get(nb.symbol) ?? 0) + v);
    }

    data = Array.from(nativeBySymbol.entries()).map(([sym, val], i) => ({
      name: sym,
      value: val,
      color: COLORS[i % COLORS.length],
    }));

    topTokens.forEach((t, i) => {
      data.push({
        name: t.symbol,
        value: currency === 'USD' ? t.usdValue : t.eurValue,
        color: COLORS[(data.length + i) % COLORS.length],
      });
    });

    const rest = total - data.reduce((s, d) => s + d.value, 0);
    if (rest > 0.01) data.push({ name: 'Other', value: rest, color: '#374151' });

    data = data.filter(d => d.value > 0).sort((a, b) => b.value - a.value);
  }

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: ChartEntry }[] }) => {
    if (!active || !payload?.length) return null;
    const item = payload[0];
    const pct = total > 0 ? (item.value / total) * 100 : 0;
    return (
      <div className="bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm shadow-xl">
        <p className="font-semibold text-white">{item.name}</p>
        <p className="text-accent">{formatCurrency(item.value, currency)}</p>
        <p className="text-muted">{pct.toFixed(1)}%</p>
      </div>
    );
  };

  return (
    <div className="rounded-xl bg-bg-secondary border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Portfolio Allocation</h3>
        <div className="flex rounded-lg border border-border overflow-hidden text-xs">
          <button
            onClick={() => setMode('token')}
            className={`px-3 py-1.5 font-medium transition-colors ${mode === 'token' ? 'bg-accent text-white' : 'text-muted hover:text-white'}`}
          >
            By Token
          </button>
          <button
            onClick={() => setMode('chain')}
            className={`px-3 py-1.5 font-medium transition-colors ${mode === 'chain' ? 'bg-accent text-white' : 'text-muted hover:text-white'}`}
          >
            By Chain
          </button>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-muted text-sm">No data</div>
      ) : (
        <div className="relative">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={110}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((entry, index) => (
                  <Cell key={`${entry.name}-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p className="text-xs text-muted">Total</p>
            <p className="text-lg font-bold text-white">{formatCurrency(total, currency)}</p>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-3 space-y-1.5 max-h-32 overflow-y-auto">
        {data.slice(0, 6).map((entry, i) => {
          const pct = total > 0 ? (entry.value / total) * 100 : 0;
          return (
            <div key={i} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                <span className="text-muted truncate">{entry.name}</span>
              </div>
              <span className="text-white font-medium ml-2">{pct.toFixed(1)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
