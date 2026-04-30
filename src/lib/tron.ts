// Tron chain support via TronGrid (native TRX + TRC-20 token discovery).
// Uses TronScan as primary for rich metadata; TronGrid as fallback.

const TRONGRID = 'https://api.trongrid.io';
const TRONSCAN = 'https://apilist.tronscanapi.com';

export async function getTronNativeBalance(address: string): Promise<number> {
  try {
    const res = await fetch(`${TRONGRID}/v1/accounts/${address}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 60 },
    });
    if (!res.ok) return 0;
    const data = await res.json();
    return ((data?.data?.[0]?.balance ?? 0) as number) / 1_000_000;
  } catch {
    return 0;
  }
}

export interface TronTokenBalance {
  contractAddress: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: number;
}

export async function getTronTokenBalances(address: string): Promise<TronTokenBalance[]> {
  // Primary: TronScan account/tokens — returns name + symbol + balance + decimals in one call
  try {
    const res = await fetch(
      `${TRONSCAN}/api/account/tokens?address=${address}&start=0&limit=200&show=0&sortType=1&sortBy=1`,
      { headers: { Accept: 'application/json' }, next: { revalidate: 60 } }
    );
    if (res.ok) {
      const data = await res.json();
      const tokens = (data?.data ?? []) as Array<{
        tokenId: string;
        balance: string;
        tokenName: string;
        tokenAbbr: string;
        tokenDecimal: number;
        tokenType: string;
      }>;
      const trc20 = tokens.filter(t => t.tokenType === 'trc20');
      if (trc20.length > 0) {
        return trc20
          .map(t => {
            const decimals = t.tokenDecimal ?? 6;
            const raw = parseFloat(t.balance) || 0;
            const balance = raw / Math.pow(10, decimals);
            if (balance <= 0) return null;
            return {
              contractAddress: t.tokenId.toLowerCase(),
              symbol: t.tokenAbbr || t.tokenId.slice(0, 8),
              name: t.tokenName || 'Unknown Token',
              decimals,
              balance,
            };
          })
          .filter(Boolean) as TronTokenBalance[];
      }
    }
  } catch {}

  // Fallback: TronGrid account endpoint (contract + raw balance, no metadata)
  try {
    const res = await fetch(`${TRONGRID}/v1/accounts/${address}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const trc20: Record<string, string>[] = data?.data?.[0]?.trc20 ?? [];
    if (!trc20.length) return [];

    return trc20
      .flatMap(tokenMap =>
        Object.entries(tokenMap).map(([contractAddr, balStr]) => {
          const decimals = 6;
          const balance = parseFloat(balStr) / Math.pow(10, decimals);
          if (balance <= 0) return null;
          return {
            contractAddress: contractAddr.toLowerCase(),
            symbol: contractAddr.slice(0, 6),
            name: 'Unknown Token',
            decimals,
            balance,
          };
        })
      )
      .filter(Boolean) as TronTokenBalance[];
  } catch {
    return [];
  }
}
