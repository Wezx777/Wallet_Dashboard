const BASE = 'https://api.coingecko.com/api/v3';
const cache = new Map<string, { data: unknown; ts: number }>();
const TTL = 60_000;

async function cgFetch<T>(path: string): Promise<T> {
  const cached = cache.get(path);
  if (cached && Date.now() - cached.ts < TTL) return cached.data as T;

  const res = await fetch(`${BASE}${path}`, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 60 },
  });

  if (res.status === 429) {
    await new Promise(r => setTimeout(r, 2000));
    return cgFetch<T>(path);
  }

  if (!res.ok) throw new Error(`CoinGecko ${res.status}: ${path}`);
  const data = await res.json();
  cache.set(path, { data, ts: Date.now() });
  return data as T;
}

export interface CgPrice {
  usd: number;
  eur: number;
  usd_24h_change: number;
}

export async function getCoinPrices(ids: string[]): Promise<Record<string, CgPrice>> {
  if (!ids.length) return {};
  const path = `/simple/price?ids=${ids.join(',')}&vs_currencies=usd,eur&include_24hr_change=true`;
  return cgFetch<Record<string, CgPrice>>(path);
}

export async function getTokenPricesByContract(
  platform: string,
  addresses: string[]
): Promise<Record<string, CgPrice>> {
  if (!addresses.length) return {};
  const addrs = addresses.map(a => a.toLowerCase()).join(',');
  const path = `/simple/token_price/${platform}?contract_addresses=${addrs}&vs_currencies=usd,eur&include_24hr_change=true`;
  try {
    return await cgFetch<Record<string, CgPrice>>(path);
  } catch {
    return {};
  }
}

export async function searchCoin(query: string): Promise<{ id: string; symbol: string; name: string }[]> {
  try {
    const data = await cgFetch<{ coins: { id: string; symbol: string; name: string }[] }>(`/search?query=${encodeURIComponent(query)}`);
    return data.coins.slice(0, 5);
  } catch {
    return [];
  }
}
