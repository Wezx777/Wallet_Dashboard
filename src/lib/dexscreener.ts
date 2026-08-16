export interface DexTokenData {
  name: string;
  symbol: string;
  priceUsd: number;
  change24h: number;
  logoUrl?: string;
}

const CHAIN_MAP: Record<string, string> = {
  ethereum:  'ethereum',
  bsc:       'bsc',
  base:      'base',
  solana:    'solana',
  polygon:   'polygon',
  arbitrum:  'arbitrum',
  optimism:  'optimism',
  avalanche: 'avalanche',
  tron:      'tron',
  robinhood: 'robinhood',
};

// Batch query DexScreener for token metadata + prices.
// Returns a map of lowercase address → token data.
export async function getDexTokens(
  addresses: string[],
  chain: string
): Promise<Map<string, DexTokenData>> {
  const result = new Map<string, DexTokenData>();
  if (!addresses.length) return result;

  const dexChain = CHAIN_MAP[chain] ?? chain;
  const BATCH = 30;

  for (let i = 0; i < addresses.length; i += BATCH) {
    const slice = addresses.slice(i, i + BATCH);
    try {
      const res = await fetch(
        `https://api.dexscreener.com/latest/dex/tokens/${slice.join(',')}`,
        { headers: { Accept: 'application/json' }, next: { revalidate: 60 } }
      );
      if (!res.ok) continue;
      const data = await res.json();

      for (const pair of (data.pairs ?? []) as Array<{
        chainId?: string;
        baseToken?: { address?: string; name?: string; symbol?: string };
        priceUsd?: string;
        priceChange?: { h24?: number };
        info?: { imageUrl?: string };
      }>) {
        if (pair.chainId !== dexChain) continue;
        const addr = pair.baseToken?.address?.toLowerCase();
        if (!addr || result.has(addr)) continue;
        result.set(addr, {
          name: pair.baseToken?.name ?? '',
          symbol: pair.baseToken?.symbol ?? '',
          priceUsd: parseFloat(pair.priceUsd ?? '0') || 0,
          change24h: pair.priceChange?.h24 ?? 0,
          logoUrl: pair.info?.imageUrl,
        });
      }
    } catch {
      // continue to next batch
    }
    if (i + BATCH < addresses.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }
  return result;
}
