interface JupiterToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

let tokenCache: Map<string, JupiterToken> | null = null;
let cacheTime = 0;
const TTL = 3_600_000;

export async function getJupiterTokenMap(): Promise<Map<string, JupiterToken>> {
  if (tokenCache && Date.now() - cacheTime < TTL) return tokenCache;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch('https://token.jup.ag/strict', {
      headers: { Accept: 'application/json' },
      next: { revalidate: 3600 },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return tokenCache ?? new Map();
    const list: JupiterToken[] = await res.json();
    tokenCache = new Map(list.map(t => [t.address, t]));
    cacheTime = Date.now();
    return tokenCache;
  } catch {
    // Network unavailable or timeout — return whatever we have cached
    return tokenCache ?? new Map();
  }
}
