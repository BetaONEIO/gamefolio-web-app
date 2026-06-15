export const COUNTRY_CURRENCY: Record<string, string> = {
  // Americas
  US: 'USD', CA: 'CAD', BR: 'BRL', MX: 'MXN', AR: 'ARS', CL: 'CLP',
  CO: 'COP', PE: 'PEN', UY: 'UYU', VE: 'VES',
  // Europe – Eurozone
  DE: 'EUR', FR: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR', BE: 'EUR',
  PT: 'EUR', AT: 'EUR', IE: 'EUR', FI: 'EUR', GR: 'EUR', LU: 'EUR',
  SK: 'EUR', SI: 'EUR', EE: 'EUR', LV: 'EUR', LT: 'EUR', CY: 'EUR', MT: 'EUR',
  // Europe – non-EUR
  CH: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK', PL: 'PLN', CZ: 'CZK',
  HU: 'HUF', RO: 'RON', BG: 'BGN', HR: 'EUR', RS: 'RSD', UA: 'UAH',
  TR: 'TRY', IS: 'ISK',
  // Asia-Pacific
  AU: 'AUD', NZ: 'NZD', JP: 'JPY', CN: 'CNY', KR: 'KRW', IN: 'INR',
  SG: 'SGD', HK: 'HKD', TW: 'TWD', TH: 'THB', MY: 'MYR', ID: 'IDR',
  PH: 'PHP', VN: 'VND', PK: 'PKR', BD: 'BDT', LK: 'LKR',
  // Middle East & Africa
  AE: 'AED', SA: 'SAR', IL: 'ILS', QA: 'QAR', KW: 'KWD', BH: 'BHD',
  OM: 'OMR', JO: 'JOD', EG: 'EGP', NG: 'NGN', KE: 'KES', ZA: 'ZAR',
  GH: 'GHS', MA: 'MAD', TZ: 'TZS', ET: 'ETB',
  // Other
  RU: 'RUB', MK: 'MKD',
};

let ratesCache: { rates: Record<string, number>; fetchedAt: number } | null = null;
const RATES_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function getGbpRates(): Promise<Record<string, number> | null> {
  const now = Date.now();
  if (ratesCache && now - ratesCache.fetchedAt < RATES_TTL_MS) {
    return ratesCache.rates;
  }
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/GBP');
    const data: any = await res.json();
    if (data?.result === 'success' && data.rates) {
      ratesCache = { rates: data.rates, fetchedAt: now };
      return data.rates;
    }
  } catch (err) {
    console.warn('Exchange-rate fetch failed:', err);
  }
  return ratesCache?.rates ?? null;
}

const ipCurrencyCache = new Map<string, { currency: string; cachedAt: number }>();
const IP_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function getCurrencyFromIp(ip: string): Promise<string | null> {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('10.') || ip.startsWith('192.168.')) {
    return null;
  }
  const cached = ipCurrencyCache.get(ip);
  if (cached && Date.now() - cached.cachedAt < IP_CACHE_TTL_MS) {
    return cached.currency;
  }
  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`, {
      headers: { 'User-Agent': 'gamefolio-app/1.0' },
    });
    const data: any = await res.json();
    const currency: string = data?.currency;
    if (currency && /^[A-Z]{3}$/.test(currency)) {
      ipCurrencyCache.set(ip, { currency, cachedAt: Date.now() });
      return currency;
    }
  } catch (err) {
    console.warn('IP currency lookup failed:', err);
  }
  return null;
}

export async function detectLocalCurrency(req: { headers: Record<string, string | string[] | undefined>; ip?: string }): Promise<string | null> {
  const cfCountry = (req.headers['cf-ipcountry'] as string | undefined)?.toUpperCase().trim();

  if (cfCountry && cfCountry !== 'GB' && cfCountry !== 'T1' && cfCountry !== 'XX') {
    return COUNTRY_CURRENCY[cfCountry] ?? null;
  }

  if (!cfCountry) {
    const clientIp =
      (req.headers['cf-connecting-ip'] as string) ||
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      '';
    return getCurrencyFromIp(clientIp);
  }

  return null;
}
