'use client';

export function SkeletonLine({ width = 'w-full', height = 'h-4' }: { width?: string; height?: string }) {
  return (
    <div
      className={`${width} ${height} rounded bg-gradient-to-r from-bg-tertiary via-border-light to-bg-tertiary animate-shimmer`}
      style={{ backgroundSize: '200% 100%' }}
    />
  );
}

export function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <div className="rounded-xl bg-bg-secondary border border-border p-5 space-y-4">
      <SkeletonLine width="w-1/3" height="h-5" />
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonLine key={i} width={i % 2 === 0 ? 'w-full' : 'w-3/4'} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-xl bg-bg-secondary border border-border overflow-hidden">
      <div className="p-4 border-b border-border">
        <SkeletonLine width="w-1/4" height="h-5" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, ri) => (
          <div key={ri} className="flex items-center gap-4 px-4 py-3">
            {Array.from({ length: cols }).map((_, ci) => (
              <SkeletonLine
                key={ci}
                width={ci === 0 ? 'w-1/6' : ci === cols - 1 ? 'w-1/8' : 'w-1/5'}
                height="h-4"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonStats() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="rounded-xl bg-bg-secondary border border-border p-5 space-y-3">
          <SkeletonLine width="w-1/2" height="h-4" />
          <SkeletonLine width="w-3/4" height="h-8" />
          <SkeletonLine width="w-1/3" height="h-4" />
        </div>
      ))}
    </div>
  );
}
