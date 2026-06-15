import { Router, Request, Response } from 'express';
import { getUncachableStripeClient } from '../stripeClient';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { hybridAuth } from '../middleware/hybrid-auth';
import { EmailService } from '../email-service';
import { storage } from '../storage';
import { notifyProPurchase } from '../telegram-notify';

const router = Router();

// ---------------------------------------------------------------------------
// Gamefolio Pro — web pricing.
//
// We maintain ONE base price, in GBP (our settlement currency). Stripe
// "Adaptive Pricing" converts and charges each customer in their own local
// currency at checkout, using live FX and locale-appropriate rounding. So a
// US buyer pays the USD equivalent of £2.99, an EU buyer the EUR equivalent,
// etc. — same value, converted.
//
// Adaptive Pricing is enabled in the Stripe Dashboard
// (Settings → Payments → Adaptive pricing). There is no API flag, and it only
// applies to Checkout Sessions / Payment Links — which is why this flow uses
// an embedded Checkout Session rather than a raw PaymentIntent.
//
// Amounts are in MINOR units (pence).
// ---------------------------------------------------------------------------
const BASE_CURRENCY = 'gbp';
const BASE_PRICE: Record<'monthly' | 'yearly', number> = {
  monthly: 299,  // £2.99 / month
  yearly: 3000,  // £30.00 / year
};

const cachedPriceIds: { monthly: string | null; yearly: string | null } = {
  monthly: null,
  yearly: null,
};

// ---------------------------------------------------------------------------
// Local-currency approximation for the paywall.
// We use the Cloudflare `cf-ipcountry` header (available in production) to
// detect the visitor's country, map it to a currency, then apply a live GBP
// exchange rate fetched from open.er-api.com (free, no key required).
// Rates are cached for 1 hour to avoid hammering the external API.
// All failures fall back silently to the raw GBP price.
// ---------------------------------------------------------------------------
const COUNTRY_CURRENCY: Record<string, string> = {
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

async function getGbpRates(): Promise<Record<string, number> | null> {
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
  return ratesCache?.rates ?? null; // serve stale if fresh fetch fails
}

// Fallback IP-to-currency lookup used when cf-ipcountry is absent (dev/staging).
// Results are cached per-IP for 24 hours to stay well within ipapi.co's free tier.
const ipCurrencyCache = new Map<string, { currency: string; cachedAt: number }>();
const IP_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

async function getCurrencyFromIp(ip: string): Promise<string | null> {
  // Skip private / loopback addresses
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

async function getOrCreatePriceId(
  stripe: any,
  plan: 'monthly' | 'yearly'
): Promise<string> {
  const hit = cachedPriceIds[plan];
  if (hit) return hit;

  // Check env vars (legacy path)
  const envPriceId = plan === 'monthly'
    ? process.env.STRIPE_PRO_MONTHLY_PRICE_ID
    : process.env.STRIPE_PRO_YEARLY_PRICE_ID;

  if (envPriceId) {
    try {
      await stripe.prices.retrieve(envPriceId);
      cachedPriceIds[plan] = envPriceId;
      return envPriceId;
    } catch {
      console.warn(`Configured price ID ${envPriceId} not found in Stripe. Auto-provisioning...`);
    }
  }

  // Find or create the Gamefolio Pro product
  const existingProducts = await stripe.products.list({ limit: 100 });
  let product = existingProducts.data.find((p: any) => p.name === 'Gamefolio Pro' && p.active);

  if (!product) {
    product = await stripe.products.create({
      name: 'Gamefolio Pro',
      description: 'Premium subscription for Gamefolio - unlock all Pro features',
      metadata: { app: 'gamefolio' },
    });
    console.log(`✅ Created Stripe product: ${product.id}`);
  }

  const existingPrices = await stripe.prices.list({ product: product.id, active: true, limit: 100 });

  const targetAmount = BASE_PRICE[plan];
  const targetInterval = plan === 'monthly' ? 'month' : 'year';

  // Adaptive Pricing will not convert to a currency that the price already
  // pins via `currency_options`, so we deliberately keep a single-currency
  // (GBP) price with no currency_options.
  let price = existingPrices.data.find((p: any) =>
    p.unit_amount === targetAmount &&
    p.currency === BASE_CURRENCY &&
    p.recurring?.interval === targetInterval &&
    (!p.currency_options || Object.keys(p.currency_options).length === 0)
  );

  if (!price) {
    price = await stripe.prices.create({
      product: product.id,
      unit_amount: targetAmount,
      currency: BASE_CURRENCY,
      recurring: { interval: targetInterval },
      metadata: { plan, app: 'gamefolio', currency: BASE_CURRENCY },
    });
    console.log(`✅ Created Stripe price for ${plan}/${BASE_CURRENCY}: ${price.id}`);
  }

  cachedPriceIds[plan] = price.id;
  console.log(`📌 Using Stripe price for ${plan}/${BASE_CURRENCY}: ${price.id}`);
  return price.id;
}

// Shared, idempotent Pro provisioning. Called by the client-side confirm
// endpoint (so the success screen + lootbox appear immediately) and by the
// Stripe webhook (`checkout.session.completed`) as a backstop in case the
// client never reports completion. Welcome email / Telegram notify fire only
// the first time; the lootbox grant is itself idempotent.
export async function provisionProSubscription(opts: {
  userId: number;
  plan: 'monthly' | 'yearly';
  customerId: string;
  subscriptionId: string;
}): Promise<{ lootboxReward: { reward: any; isDuplicate: boolean } | null }> {
  const { userId, plan, customerId, subscriptionId } = opts;

  const [before] = await db.select().from(users).where(eq(users.id, userId));
  const alreadyProvisioned = !!before?.isPro && before?.stripeSubscriptionId === subscriptionId;

  await db.update(users).set({
    isPro: true,
    proSubscriptionType: plan,
    proSubscriptionStartDate: before?.proSubscriptionStartDate ?? new Date(),
    proSubscriptionEndDate: plan === 'yearly'
      ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    updatedAt: new Date(),
  }).where(eq(users.id, userId));

  if (!alreadyProvisioned) {
    const [updatedUser] = await db.select().from(users).where(eq(users.id, userId));
    if (updatedUser?.email) {
      EmailService.sendProWelcomeEmail(
        updatedUser.email,
        updatedUser.username || updatedUser.displayName || 'Gamer',
        plan,
      ).catch(err => console.error('Failed to send Pro welcome email:', err));
    }
    if (updatedUser) {
      notifyProPurchase(updatedUser, { kind: 'new', plan, source: 'Stripe' });
    }
  }

  let lootboxReward: { reward: any; isDuplicate: boolean } | null = null;
  try {
    const initialGrant = await storage.grantProLootbox(userId, 'initial');
    if (initialGrant) {
      lootboxReward = { reward: initialGrant.reward, isDuplicate: initialGrant.isDuplicate };
      console.log(`🎁 Initial Pro lootbox granted: ${initialGrant.reward.name}`);
    }
  } catch (lootboxErr) {
    console.error('Failed to grant initial pro lootbox:', lootboxErr);
  }

  return { lootboxReward };
}

// Public pricing endpoint — returns the base GBP price plus an approximate
// local-currency conversion when we can detect the visitor's country.
// Detection: (1) Cloudflare cf-ipcountry header (production), or
//            (2) ipapi.co IP lookup (dev/staging fallback, per-IP 24-hr cache).
// Falls back silently to plain GBP on any failure or unknown country.
router.get('/api/stripe/pro-pricing', async (req: Request, res: Response) => {
  const base = {
    currency: BASE_CURRENCY,
    monthly: BASE_PRICE.monthly / 100,
    yearly: BASE_PRICE.yearly / 100,
  };

  try {
    // ── 1. Detect country ────────────────────────────────────────────────────
    // Primary: Cloudflare injects cf-ipcountry on the production deployment.
    // Fallback: direct IP lookup via ipapi.co for dev/staging environments
    //           where the Cloudflare header is not present.

    let localCurrency: string | null = null;

    const cfCountry = (req.headers['cf-ipcountry'] as string | undefined)
      ?.toUpperCase().trim();

    if (cfCountry && cfCountry !== 'GB' && cfCountry !== 'T1' && cfCountry !== 'XX') {
      localCurrency = COUNTRY_CURRENCY[cfCountry] ?? null;
    } else if (!cfCountry) {
      // No Cloudflare header — dev/staging path. Derive currency directly
      // from ipapi.co using the real client IP.
      const clientIp =
        (req.headers['cf-connecting-ip'] as string) ||
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.ip ||
        '';
      localCurrency = await getCurrencyFromIp(clientIp);
      // ipapi.co already maps country→currency; skip the COUNTRY_CURRENCY table
    }

    if (!localCurrency || localCurrency.toUpperCase() === 'GBP') {
      return res.json(base);
    }

    // ── 2. Apply exchange rate ───────────────────────────────────────────────
    const rates = await getGbpRates();
    const rate = rates?.[localCurrency.toUpperCase()];
    if (!rate) return res.json(base);

    const localMonthly = Math.round(base.monthly * rate * 100) / 100;
    const localYearly  = Math.round(base.yearly  * rate * 100) / 100;

    return res.json({ ...base, localCurrency, localMonthly, localYearly });
  } catch (err) {
    console.warn('pro-pricing localisation error:', err);
    return res.json(base);
  }
});

router.post('/api/stripe/create-pro-subscription', hybridAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { plan } = req.body;
    if (!plan || !['monthly', 'yearly'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan. Must be "monthly" or "yearly".' });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const stripe = await getUncachableStripeClient();

    // Guard: block starting a new checkout if there's already an active sub.
    if (user.isPro && user.stripeSubscriptionId) {
      try {
        const existing = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        if (existing.status === 'active' || existing.status === 'trialing') {
          console.warn(`⚠️ User ${userId} already has active subscription ${user.stripeSubscriptionId} — blocking new checkout`);
          return res.status(409).json({ error: 'You already have an active Pro subscription.' });
        }
      } catch {
        // Subscription not found in Stripe — allow proceeding
      }
    }

    const email = user.email;
    if (!email) {
      return res.status(400).json({ error: 'User must have an email address to subscribe' });
    }

    let customerId: string;
    if (user.stripeCustomerId) {
      customerId = user.stripeCustomerId;
    } else {
      const existingCustomers = await stripe.customers.list({ email, limit: 1 });
      if (existingCustomers.data.length > 0) {
        customerId = existingCustomers.data[0].id;
      } else {
        const newCustomer = await stripe.customers.create({
          email,
          metadata: { userId: String(userId) },
        });
        customerId = newCustomer.id;
      }
    }

    const priceId = await getOrCreatePriceId(stripe, plan);

    // Embedded Checkout Session (subscription mode). Adaptive Pricing (enabled
    // in the Dashboard) localises the displayed + charged amount. We keep the
    // user in-app via redirect_on_completion: 'never' + an onComplete handler.
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      ui_mode: 'embedded',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      redirect_on_completion: 'never',
      subscription_data: {
        metadata: { userId: String(userId), plan },
      },
      metadata: {
        userId: String(userId),
        plan,
        type: 'pro_subscription',
      },
    });

    return res.json({
      clientSecret: session.client_secret,
      sessionId: session.id,
    });
  } catch (error: any) {
    console.error('Create pro subscription error:', error);
    return res.status(500).json({
      error: 'Failed to create pro subscription',
      message: error.message,
    });
  }
});

router.post('/api/stripe/confirm-pro-subscription', hybridAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { sessionId, plan } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: 'Invalid request. Requires sessionId.' });
    }

    const stripe = await getUncachableStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['subscription'] });

    if (!session) {
      return res.status(404).json({ error: 'Checkout session not found' });
    }
    if (session.metadata?.userId !== String(userId)) {
      return res.status(403).json({ error: 'Checkout session does not belong to this user' });
    }
    if (session.status !== 'complete') {
      return res.status(400).json({ error: 'Checkout has not been completed', status: session.status });
    }

    const subscriptionId = typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id;
    const customerId = typeof session.customer === 'string'
      ? session.customer
      : session.customer?.id;

    if (!subscriptionId || !customerId) {
      return res.status(400).json({ error: 'Subscription is not ready yet. Please try again shortly.' });
    }

    // Trust the session metadata for the plan; fall back to the request body.
    const resolvedPlan: 'monthly' | 'yearly' =
      session.metadata?.plan === 'yearly' || session.metadata?.plan === 'monthly'
        ? session.metadata.plan
        : (plan === 'yearly' ? 'yearly' : 'monthly');

    const { lootboxReward } = await provisionProSubscription({
      userId,
      plan: resolvedPlan,
      customerId,
      subscriptionId,
    });

    return res.json({ success: true, isPro: true, subscriptionId, lootboxReward });
  } catch (error: any) {
    console.error('Confirm pro subscription error:', error);
    return res.status(500).json({
      error: 'Failed to confirm pro subscription',
      message: error.message,
    });
  }
});

export default router;
