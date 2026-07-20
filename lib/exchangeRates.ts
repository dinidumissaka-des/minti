const CACHE_PREFIX = "minti_rates_";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

type RatesCache = {
  base: string;
  rates: Record<string, number>;
  fetchedAt: number;
};

async function fetchRates(base: string): Promise<RatesCache> {
  const res = await fetch(`https://open.er-api.com/v6/latest/${base}`);
  if (!res.ok) throw new Error("Failed to fetch exchange rates");
  const data = await res.json();
  if (data.result !== "success") throw new Error("Exchange rate provider error");
  return { base, rates: data.rates as Record<string, number>, fetchedAt: Date.now() };
}

async function getRatesForBase(base: string): Promise<RatesCache> {
  const cacheKey = CACHE_PREFIX + base;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    const parsed: RatesCache = JSON.parse(cached);
    if (Date.now() - parsed.fetchedAt < CACHE_TTL_MS) return parsed;
  }

  try {
    const fresh = await fetchRates(base);
    localStorage.setItem(cacheKey, JSON.stringify(fresh));
    return fresh;
  } catch (err) {
    if (cached) return JSON.parse(cached) as RatesCache;
    throw err;
  }
}

export async function getExchangeRate(from: string, to: string): Promise<number> {
  if (from === to) return 1;
  const { rates } = await getRatesForBase(from);
  const rate = rates[to];
  if (rate === undefined) throw new Error(`No rate available for ${to}`);
  return rate;
}

export async function convertAmount(amount: number, from: string, to: string): Promise<number> {
  const rate = await getExchangeRate(from, to);
  return amount * rate;
}

export function getCachedRateAge(base: string): number | null {
  const cached = localStorage.getItem(CACHE_PREFIX + base);
  if (!cached) return null;
  const parsed: RatesCache = JSON.parse(cached);
  return Date.now() - parsed.fetchedAt;
}
