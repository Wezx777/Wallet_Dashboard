'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatPercent } from '@/lib/utils';

interface Props {
  value: number;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function PriceChange({ value, showIcon = true, size = 'md' }: Props) {
  const isPos = value > 0.005;
  const isNeg = value < -0.005;

  const color = isPos ? 'text-success' : isNeg ? 'text-danger' : 'text-muted';
  const bgColor = isPos ? 'bg-success/10' : isNeg ? 'bg-danger/10' : 'bg-white/5';
  const sizeClass = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm';
  const iconSize = size === 'sm' ? 10 : size === 'lg' ? 16 : 12;

  const Icon = isPos ? TrendingUp : isNeg ? TrendingDown : Minus;

  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-medium ${color} ${bgColor} ${sizeClass}`}>
      {showIcon && <Icon size={iconSize} />}
      {formatPercent(value)}
    </span>
  );
}
