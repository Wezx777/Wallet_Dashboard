import { NextRequest, NextResponse } from 'next/server';
import { Chain, NativeBalance, TokenHolding, ChainSummary, PortfolioData, Wallet } from '@/types';
import { CHAIN_CONFIG, isEvmChain } from '@/lib/chains';
import { getNativeBalance, getERC20Balances } from '@/lib/etherscan';
import { getSolanaBalance, getSolanaTokenAccounts } from '@/lib/alchemy';
import { getBnbNativeBalance, getBscTokenBalances } from '@/lib/bsc';
import { getCoinPrices, getTokenPricesByContract, CgPrice } from '@/lib/coingecko';
import { getDexTokens } from '@/lib/dexscreener';
import { getJupiterTokenMap } from '@/lib/jupiterTokens';

function evmLogoUrl(chain: Chain, checksumAddress: string): string {
  const platform: Partial<Record<Chain, string>> = {
    ethereum: 'ethereum',
    base: 'base',
  };
  const p = platform[chain];
  return p ? `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${p}/assets/${checksumAddress}/logo.png` : '';
}

export async function POST(req: NextRequest) {
  try {
    const { wallets }: { wallets: Wallet[] } = await req.json();
    if (!wallets?.length) return NextResponse.json({ error: 'No wallets' }, { status: 400 });

    // ── 1. Native balances ───────────────────────────────────────────────────
    const nativeBalances = (
      await Promise.all(
        wallets.map(async (w): Promise<NativeBalance | null> => {
          try {
            const cfg = CHAIN_CONFIG[w.chain];
            let balance = 0;
            if (w.chain === 'bsc') {
              balance = await getBnbNativeBalance(w.address);
            } else if (isEvmChain(w.chain)) {
              const raw = await getNativeBalance(w.chain, w.address);
              balance = Number(raw) / Math.pow(10, cfg.decimals);
            } else {
              balance = await getSolanaBalance(w.address);
            }
            return {
              chain: w.chain, walletId: w.id, walletAddress: w.address,
              walletName: w.name, balance, symbol: cfg.symbol, name: cfg.name,
              usdValue: 0, eurValue: 0, usdPrice: 0, eurPrice: 0, change24h: 0,
            };
          } catch {
            return null;
          }
        })
      )
    ).filter(Boolean) as NativeBalance[];

    // ── 2. Token holdings ────────────────────────────────────────────────────
    // Jupiter for Solana token metadata (cached, best-effort — DexScreener used as fallback)
    const jupiterMap = await getJupiterTokenMap();

    const allTokens = (
      await Promise.all(
        wallets.map(async (w): Promise<TokenHolding[]> => {
          try {
            if (w.chain === 'bsc') {
              const tokens = await getBscTokenBalances(w.address);
              return tokens.map(t => ({
                chain: 'bsc' as Chain,
                walletId: w.id, walletAddress: w.address,
                contractAddress: t.contractAddress,
                symbol: t.symbol, name: t.name, decimals: t.decimals,
                balance: Number(t.balance) / Math.pow(10, t.decimals),
                logoUrl: '',
                usdPrice: 0, eurPrice: 0, usdValue: 0, eurValue: 0,
                change24h: 0, portfolioPercent: 0,
              }));
            }

            if (isEvmChain(w.chain)) {
              const tokens = await getERC20Balances(w.chain, w.address);
              return tokens.map(t => ({
                chain: w.chain as Chain,
                walletId: w.id, walletAddress: w.address,
                contractAddress: t.contractAddress,
                symbol: t.symbol, name: t.name, decimals: t.decimals,
                balance: Number(t.balance) / Math.pow(10, t.decimals),
                logoUrl: evmLogoUrl(w.chain, t.contractAddressOriginal),
                usdPrice: 0, eurPrice: 0, usdValue: 0, eurValue: 0,
                change24h: 0, portfolioPercent: 0,
              }));
            }

            // Solana — getSolanaTokenAccounts returns real on-chain balances
            const accounts = await getSolanaTokenAccounts(w.address);
            return accounts
              .map(acc => {
                const info = acc.account.data.parsed.info;
                const uiAmt = info.tokenAmount.uiAmount;
                if (!uiAmt || uiAmt <= 0) return null;
                const meta = jupiterMap.get(info.mint);
                return {
                  chain: 'solana' as Chain,
                  walletId: w.id, walletAddress: w.address,
                  contractAddress: info.mint,
                  symbol: meta?.symbol ?? info.mint.slice(0, 4) + '…',
                  name: meta?.name ?? 'Unknown SPL Token',
                  decimals: info.tokenAmount.decimals,
                  balance: uiAmt,
                  logoUrl: meta?.logoURI,
                  usdPrice: 0, eurPrice: 0, usdValue: 0, eurValue: 0,
                  change24h: 0, portfolioPercent: 0,
                } as TokenHolding;
              })
              .filter(Boolean) as TokenHolding[];
          } catch {
            return [];
          }
        })
      )
    ).flat();

    // ── 3. CoinGecko prices for native coins ─────────────────────────────────
    const uniqueNativeIds = [...new Set(wallets.map(w => CHAIN_CONFIG[w.chain].coingeckoId))];
    let nativePrices: Record<string, CgPrice> = {};
    try { nativePrices = await getCoinPrices(uniqueNativeIds); } catch { /* ignore */ }

    // Derive EUR/USD exchange rate from native coin prices
    let eurUsdRate = 0.92;
    for (const p of Object.values(nativePrices)) {
      if (p.usd > 0 && p.eur > 0) { eurUsdRate = p.eur / p.usd; break; }
    }

    // Apply to native balances
    for (const nb of nativeBalances) {
      const price = nativePrices[CHAIN_CONFIG[nb.chain].coingeckoId];
      if (price) {
        nb.usdPrice = price.usd || 0;
        nb.eurPrice = price.eur || 0;
        nb.usdValue = nb.balance * nb.usdPrice;
        nb.eurValue = nb.balance * nb.eurPrice;
        nb.change24h = price.usd_24h_change || 0;
      }
    }

    // ── 4. DexScreener prices for tokens (all chains) ────────────────────────
    // Run in parallel per chain — DexScreener handles metadata + price + 24h in one shot
    const chainGroups = new Map<string, TokenHolding[]>();
    for (const t of allTokens) {
      const list = chainGroups.get(t.chain) ?? [];
      list.push(t);
      chainGroups.set(t.chain, list);
    }

    const dexMaps = await Promise.all(
      Array.from(chainGroups.entries()).map(async ([chain, tokens]) => {
        const addrs = [...new Set(tokens.map(t => t.contractAddress))];
        const map = await getDexTokens(addrs, chain);
        return { chain, map };
      })
    );

    const dexByChain = new Map(dexMaps.map(({ chain, map }) => [chain, map]));

    // Apply DexScreener data to tokens
    for (const token of allTokens) {
      const dex = dexByChain.get(token.chain)?.get(token.contractAddress.toLowerCase());
      if (!dex) continue;
      // Fill metadata for unknown Solana tokens
      if (token.symbol.endsWith('…') || token.name === 'Unknown SPL Token') {
        if (dex.symbol) token.symbol = dex.symbol;
        if (dex.name) token.name = dex.name;
        if (dex.logoUrl) token.logoUrl = dex.logoUrl;
      }
      // Prices from DexScreener (USD + derived EUR + 24h)
      if (dex.priceUsd > 0) {
        token.usdPrice = dex.priceUsd;
        token.eurPrice = dex.priceUsd * eurUsdRate;
        token.usdValue = token.balance * token.usdPrice;
        token.eurValue = token.balance * token.eurPrice;
        token.change24h = dex.change24h;
        if (dex.logoUrl && !token.logoUrl) token.logoUrl = dex.logoUrl;
      }
    }

    // ── 5. CoinGecko token prices (supplement / override DexScreener) ────────
    // Better EUR accuracy and official 24h change for well-known tokens
    const evmChains: Chain[] = ['ethereum', 'base'];
    for (const chain of evmChains) {
      const addrs = allTokens.filter(t => t.chain === chain).map(t => t.contractAddress);
      if (!addrs.length) continue;
      try {
        const prices = await getTokenPricesByContract(CHAIN_CONFIG[chain].coingeckoPlatform, addrs);
        for (const token of allTokens.filter(t => t.chain === chain)) {
          const p = prices[token.contractAddress.toLowerCase()];
          if (!p) continue;
          token.usdPrice = p.usd || token.usdPrice;
          token.eurPrice = p.eur || token.eurPrice;
          token.usdValue = token.balance * token.usdPrice;
          token.eurValue = token.balance * token.eurPrice;
          token.change24h = p.usd_24h_change ?? token.change24h;
        }
      } catch { /* ignore */ }
    }

    // CoinGecko prices for BSC tokens (separate platform)
    const bscAddrs = allTokens.filter(t => t.chain === 'bsc').map(t => t.contractAddress);
    if (bscAddrs.length) {
      try {
        const prices = await getTokenPricesByContract('binance-smart-chain', bscAddrs);
        for (const token of allTokens.filter(t => t.chain === 'bsc')) {
          const p = prices[token.contractAddress.toLowerCase()];
          if (!p) continue;
          token.usdPrice = p.usd || token.usdPrice;
          token.eurPrice = p.eur || token.eurPrice;
          token.usdValue = token.balance * token.usdPrice;
          token.eurValue = token.balance * token.eurPrice;
          token.change24h = p.usd_24h_change ?? token.change24h;
        }
      } catch { /* ignore */ }
    }

    // CoinGecko prices for Solana tokens (override DexScreener where available)
    const solAddrs = allTokens.filter(t => t.chain === 'solana').map(t => t.contractAddress);
    if (solAddrs.length) {
      try {
        const prices = await getTokenPricesByContract('solana', solAddrs);
        for (const token of allTokens.filter(t => t.chain === 'solana')) {
          const p = prices[token.contractAddress.toLowerCase()];
          if (!p) continue;
          token.usdPrice = p.usd || token.usdPrice;
          token.eurPrice = p.eur || token.eurPrice;
          token.usdValue = token.balance * token.usdPrice;
          token.eurValue = token.balance * token.eurPrice;
          token.change24h = p.usd_24h_change ?? token.change24h;
        }
      } catch { /* ignore */ }
    }

    // ── 6. Portfolio totals ──────────────────────────────────────────────────
    const totalNativeUsd = nativeBalances.reduce((s, b) => s + b.usdValue, 0);
    const totalNativeEur = nativeBalances.reduce((s, b) => s + b.eurValue, 0);
    const totalTokenUsd = allTokens.reduce((s, t) => s + t.usdValue, 0);
    const totalTokenEur = allTokens.reduce((s, t) => s + t.eurValue, 0);
    const totalUsd = totalNativeUsd + totalTokenUsd;
    const totalEur = totalNativeEur + totalTokenEur;

    for (const token of allTokens) {
      token.portfolioPercent = totalUsd > 0 ? (token.usdValue / totalUsd) * 100 : 0;
    }

    let change24h = 0;
    if (totalUsd > 0) {
      const allItems = [
        ...nativeBalances.map(b => ({ usdValue: b.usdValue, change24h: b.change24h })),
        ...allTokens.map(t => ({ usdValue: t.usdValue, change24h: t.change24h })),
      ];
      change24h = allItems.reduce((s, i) => s + (i.usdValue / totalUsd) * i.change24h, 0);
    }

    // ── 7. Chain summaries ───────────────────────────────────────────────────
    const chainMap = new Map<Chain, ChainSummary>();
    for (const nb of nativeBalances) {
      chainMap.set(nb.chain, {
        chain: nb.chain, name: CHAIN_CONFIG[nb.chain].name,
        symbol: CHAIN_CONFIG[nb.chain].symbol, color: CHAIN_CONFIG[nb.chain].color,
        totalUsd: nb.usdValue, totalEur: nb.eurValue,
        nativeBalance: nb.balance, nativeUsdValue: nb.usdValue,
        change24h: nb.change24h, tokenCount: 0,
      });
    }
    for (const token of allTokens) {
      if (!chainMap.has(token.chain)) {
        chainMap.set(token.chain, {
          chain: token.chain, name: CHAIN_CONFIG[token.chain].name,
          symbol: CHAIN_CONFIG[token.chain].symbol, color: CHAIN_CONFIG[token.chain].color,
          totalUsd: 0, totalEur: 0, nativeBalance: 0, nativeUsdValue: 0,
          change24h: 0, tokenCount: 0,
        });
      }
      const cs = chainMap.get(token.chain)!;
      cs.totalUsd += token.usdValue;
      cs.totalEur += token.eurValue;
      cs.tokenCount++;
    }

    const portfolio: PortfolioData = {
      totalUsd, totalEur, change24h,
      nativeBalances,
      tokens: allTokens.sort((a, b) => b.usdValue - a.usdValue),
      chains: Array.from(chainMap.values()).sort((a, b) => b.totalUsd - a.totalUsd),
      lastUpdated: Math.floor(Date.now() / 1000),
    };

    return NextResponse.json(portfolio);
  } catch (err) {
    console.error('[portfolio]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
