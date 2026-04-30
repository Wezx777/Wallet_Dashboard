// BSC support via Alchemy BNB RPC (native balance + BEP-20 discovery).
// Falls back to checking top BEP-20 tokens via eth_call if Alchemy is unavailable.

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY || '';
const BSC_ALCHEMY_RPC = `https://bnb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`;
const BSC_PUBLIC_RPC = 'https://bsc-dataseed.binance.org/';

// Top BEP-20 tokens checked as fallback when Alchemy is unavailable.
const TOP_BEP20 = [
  { address: '0x55d398326f99059fF775485246999027B3197955', symbol: 'USDT', name: 'Tether USD', decimals: 18 },
  { address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', symbol: 'USDC', name: 'USD Coin', decimals: 18 },
  { address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', symbol: 'BUSD', name: 'BUSD', decimals: 18 },
  { address: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', symbol: 'CAKE', name: 'PancakeSwap Token', decimals: 18 },
  { address: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', symbol: 'ETH', name: 'Ethereum Token', decimals: 18 },
  { address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', symbol: 'WBNB', name: 'Wrapped BNB', decimals: 18 },
  { address: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', symbol: 'BTCB', name: 'BTCB Token', decimals: 18 },
  { address: '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3', symbol: 'DAI', name: 'Dai Token', decimals: 18 },
  { address: '0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD', symbol: 'LINK', name: 'ChainLink Token', decimals: 18 },
  { address: '0xbA2aE424d960c26247Dd6c32edC70B295c744C43', symbol: 'DOGE', name: 'Dogecoin', decimals: 8 },
  { address: '0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47', symbol: 'ADA', name: 'Cardano Token', decimals: 18 },
  { address: '0x4338665CBB7B2485A8855A139b75D5e34AB0DB94', symbol: 'LTC', name: 'Litecoin Token', decimals: 18 },
  { address: '0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE', symbol: 'XRP', name: 'XRP Token', decimals: 18 },
  { address: '0x715D400F88C167884bbCc41C5FeA407ed4D2f8A0', symbol: 'AXS', name: 'Axie Infinity Shard', decimals: 18 },
  { address: '0x23CE9e926048273eF83be0A3A8Ba9Cb6D45cd978', symbol: 'FLOKI', name: 'FLOKI', decimals: 9 },
  { address: '0x85EAC5Ac2F758618dFa09bDbe0cf174e7d574D5B', symbol: 'TRX', name: 'TRON', decimals: 6 },
  { address: '0xa2B726B1145A4773F68593CF171187d8EBe4d495', symbol: 'INJ', name: 'Injective Protocol', decimals: 18 },
  { address: '0xCC42724C6683B7E57334c4E856f4c9965ED682bD', symbol: 'MATIC', name: 'Matic Token', decimals: 18 },
  { address: '0x8fF795a6F4D97E7887C79beA79aba5cc76444aDf', symbol: 'BCH', name: 'Bitcoin Cash Token', decimals: 18 },
  { address: '0x3d6545b08693daE087E957cb1180ee38B9e3c25E', symbol: 'ETC', name: 'Ethereum Classic', decimals: 18 },
];

async function bscRpc(method: string, params: unknown[], useAlchemy = false): Promise<unknown> {
  const rpc = useAlchemy && ALCHEMY_KEY ? BSC_ALCHEMY_RPC : BSC_PUBLIC_RPC;
  const res = await fetch(rpc, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }),
    next: { revalidate: 60 },
  });
  const data = await res.json();
  return data.result;
}

export async function getBnbNativeBalance(address: string): Promise<number> {
  try {
    const hex = await bscRpc('eth_getBalance', [address, 'latest']) as string;
    return parseInt(hex, 16) / 1e18;
  } catch {
    return 0;
  }
}

const BALANCE_OF_SELECTOR = '0x70a08231';

async function getBep20Balance(wallet: string, token: string): Promise<bigint> {
  try {
    const calldata = BALANCE_OF_SELECTOR + wallet.replace('0x', '').toLowerCase().padStart(64, '0');
    const result = await bscRpc('eth_call', [{ to: token, data: calldata }, 'latest']) as string;
    return result && result !== '0x' ? BigInt(result) : 0n;
  } catch {
    return 0n;
  }
}

export interface BscTokenBalance {
  contractAddress: string;
  contractAddressOriginal: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: bigint;
}

// Alchemy: discover all BEP-20 tokens held by the wallet (no top-N list needed).
async function tryAlchemy(walletAddress: string): Promise<BscTokenBalance[]> {
  if (!ALCHEMY_KEY) return [];
  try {
    const balancesRes = await bscRpc('alchemy_getTokenBalances', [walletAddress], true) as {
      address: string;
      tokenBalances: Array<{ contractAddress: string; tokenBalance: string }>;
    };
    if (!balancesRes?.tokenBalances?.length) return [];

    const nonZero = balancesRes.tokenBalances.filter(
      t => t.tokenBalance && t.tokenBalance !== '0x0000000000000000000000000000000000000000000000000000000000000000'
    );
    if (!nonZero.length) return [];

    // Fetch metadata in batches of 5
    const results: BscTokenBalance[] = [];
    const CHUNK = 5;
    for (let i = 0; i < nonZero.length; i += CHUNK) {
      const chunk = nonZero.slice(i, i + CHUNK);
      const metas = await Promise.all(
        chunk.map(async t => {
          try {
            const meta = await bscRpc('alchemy_getTokenMetadata', [t.contractAddress], true) as {
              decimals: number; name: string; symbol: string; logo: string | null;
            };
            const balance = BigInt(t.tokenBalance);
            if (balance <= 0n) return null;
            return {
              contractAddress: t.contractAddress.toLowerCase(),
              contractAddressOriginal: t.contractAddress,
              symbol: meta?.symbol ?? t.contractAddress.slice(0, 6),
              name: meta?.name ?? 'Unknown Token',
              decimals: meta?.decimals ?? 18,
              balance,
            } satisfies BscTokenBalance;
          } catch {
            return null;
          }
        })
      );
      results.push(...(metas.filter(Boolean) as BscTokenBalance[]));
      if (i + CHUNK < nonZero.length) await new Promise(r => setTimeout(r, 100));
    }
    return results;
  } catch {
    return [];
  }
}

export async function getBscTokenBalances(walletAddress: string): Promise<BscTokenBalance[]> {
  // Try Alchemy BNB RPC first (discovers ALL tokens, no hardcoded list needed)
  if (ALCHEMY_KEY) {
    const fromAlchemy = await tryAlchemy(walletAddress);
    if (fromAlchemy.length > 0) return fromAlchemy;
  }

  // Fallback: check top BEP-20 tokens via public BSC RPC
  const results: BscTokenBalance[] = [];
  const CHUNK = 5;
  for (let i = 0; i < TOP_BEP20.length; i += CHUNK) {
    const chunk = TOP_BEP20.slice(i, i + CHUNK);
    const bals = await Promise.all(
      chunk.map(async t => ({
        ...t,
        balance: await getBep20Balance(walletAddress, t.address),
      }))
    );
    for (const b of bals) {
      if (b.balance > 0n) {
        results.push({
          contractAddress: b.address.toLowerCase(),
          contractAddressOriginal: b.address,
          symbol: b.symbol,
          name: b.name,
          decimals: b.decimals,
          balance: b.balance,
        });
      }
    }
    if (i + CHUNK < TOP_BEP20.length) {
      await new Promise(r => setTimeout(r, 100));
    }
  }
  return results;
}
