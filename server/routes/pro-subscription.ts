import { Router, Request, Response } from 'express';
import { getUncachableStripeClient, getStripePublishableKey } from '../stripeClient';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { hybridAuth } from '../middleware/hybrid-auth';
import { EmailService } from '../email-service';
import { storage } from '../storage';
import { notifyProPurchase } from '../telegram-notify';

const router = Router();

// ─── Currency / pricing table ──────────────────────────────────────────────
// All amounts are in minor units (pence / cents / etc.)

interface RegionalPrice {
  currency: string;
  monthly: number;  // minor units
  yearly: number;   // minor units
  symbol: string;   // display prefix
}

const CURRENCY_TABLE: Record<string, RegionalPrice> = {
  USD: { currency: 'usd', monthly: 399, yearly: 3999, symbol: '$' },
  EUR: { currency: 'eur', monthly: 349, yearly: 3499, symbol: '€' },
  GBP: { currency: 'gbp', monthly: 299, yearly: 2999, symbol: '£' },
  AUD: { currency: 'aud', monthly: 599, yearly: 5999, symbol: 'A$' },
  CAD: { currency: 'cad', monthly: 499, yearly: 4999, symbol: 'CA$' },
};

// ISO 3166-1 alpha-2 → currency key
// CA uses USD per regional pricing spec (US/CA share the same tier)
const COUNTRY_TO_CURRENCY: Record<string, keyof typeof CURRENCY_TABLE> = {
  US: 'USD', CA: 'USD',
  // Euro zone
  AT: 'EUR', BE: 'EUR', HR: 'EUR', CY: 'EUR', EE: 'EUR', FI: 'EUR',
  FR: 'EUR', DE: 'EUR', GR: 'EUR', IE: 'EUR', IT: 'EUR', LV: 'EUR',
  LT: 'EUR', LU: 'EUR', MT: 'EUR', NL: 'EUR', PT: 'EUR', SK: 'EUR',
  SI: 'EUR', ES: 'EUR',
  GB: 'GBP',
  AU: 'AUD',
};

function getPriceForCountry(countryCode: string | null): RegionalPrice & { country: string } {
  const key = countryCode ? COUNTRY_TO_CURRENCY[countryCode.toUpperCase()] ?? null : null;
  const price = key ? CURRENCY_TABLE[key] : CURRENCY_TABLE['GBP'];
  return { ...price, country: countryCode ?? 'unknown' };
}

function formatMinorUnits(minor: number, symbol: string): string {
  const formatted = (minor / 100).toFixed(2).replace(/\.00$/, '');
  return `${symbol}${formatted}`;
}

// ─── IP → country detection ───────────────────────────────────────────────
// Detection is performed entirely in-process using HTTP headers injected by
// the CDN / reverse-proxy layer.  No outbound network calls are made.
//
// Header precedence:
//   CF-IPCountry        — Cloudflare (all plans)
//   X-Vercel-IP-Country — Vercel Edge Network
//   CloudFront-Viewer-Country — AWS CloudFront
//   X-Country-Code      — generic CDN / load-balancer convention
//
// When none of these headers are present (local dev, bare Node server) the
// function returns null and callers fall back to the default currency (GBP).

function getCountryFromRequest(req: Request): string | null {
  const cdnCountry =
    (req.headers['cf-ipcountry'] as string) ||
    (req.headers['x-vercel-ip-country'] as string) ||
    (req.headers['cloudfront-viewer-country'] as string) ||
    (req.headers['x-country-code'] as string);

  // 'XX' is Cloudflare's sentinel for "country unknown"
  if (cdnCountry && cdnCountry !== 'XX') return cdnCountry.toUpperCase();
  return null;
}

// ─── Stripe price cache ───────────────────────────────────────────────────
// Key: "monthly|usd", "yearly|gbp", etc.
const cachedPriceIds = new Map<string, string>();

async function getOrCreatePriceId(
  stripe: any,
  plan: 'monthly' | 'yearly',
  currency: string
): Promise<string> {
  const cacheKey = `${plan}|${currency}`;
  const hit = cachedPriceIds.get(cacheKey);
  if (hit) return hit;

  // Check env vars (legacy GBP-only path)
  if (currency === 'gbp') {
    const envPriceId = plan === 'monthly'
      ? process.env.STRIPE_PRO_MONTHLY_PRICE_ID
      : process.env.STRIPE_PRO_YEARLY_PRICE_ID;

    if (envPriceId) {
      try {
        await stripe.prices.retrieve(envPriceId);
        cachedPriceIds.set(cacheKey, envPriceId);
        return envPriceId;
      } catch {
        console.warn(`Configured price ID ${envPriceId} not found in Stripe. Auto-provisioning...`);
      }
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

  const regionalPrice = Object.values(CURRENCY_TABLE).find(p => p.currency === currency);
  const targetAmount = plan === 'monthly'
    ? (regionalPrice?.monthly ?? CURRENCY_TABLE.GBP.monthly)
    : (regionalPrice?.yearly ?? CURRENCY_TABLE.GBP.yearly);
  const targetInterval = plan === 'monthly' ? 'month' : 'year';

  const existingPrices = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
  let price = existingPrices.data.find((p: any) =>
    p.unit_amount === targetAmount &&
    p.currency === currency &&
    p.recurring?.interval === targetInterval
  );

  if (!price) {
    price = await stripe.prices.create({
      product: product.id,
      unit_amount: targetAmount,
      currency,
      recurring: { interval: targetInterval },
      metadata: { plan, app: 'gamefolio', currency },
    });
    console.log(`✅ Created Stripe price for ${plan}/${currency}: ${price.id}`);
  }

  cachedPriceIds.set(cacheKey, price.id);
  console.log(`📌 Using Stripe price for ${plan}/${currency}: ${price.id}`);
  return price.id;
}

// ─── Allowed currencies (server-side validation) ──────────────────────────
const ALLOWED_CURRENCIES = new Set(Object.values(CURRENCY_TABLE).map(p => p.currency));

// ─── Routes ───────────────────────────────────────────────────────────────

/**
 * GET /api/stripe/pricing
 * Public — returns localized price info based on caller's IP / CDN headers.
 */
router.get('/api/stripe/pricing', (req: Request, res: Response) => {
  try {
    const country = getCountryFromRequest(req);
    const regional = getPriceForCountry(country);

    return res.json({
      currency: regional.currency,
      monthly: regional.monthly,
      yearly: regional.yearly,
      formattedMonthly: formatMinorUnits(regional.monthly, regional.symbol),
      formattedYearly: formatMinorUnits(regional.yearly, regional.symbol),
      country: regional.country,
    });
  } catch (error: any) {
    console.error('Pricing endpoint error:', error);
    const fallback = CURRENCY_TABLE.GBP;
    return res.json({
      currency: fallback.currency,
      monthly: fallback.monthly,
      yearly: fallback.yearly,
      formattedMonthly: formatMinorUnits(fallback.monthly, fallback.symbol),
      formattedYearly: formatMinorUnits(fallback.yearly, fallback.symbol),
      country: 'unknown',
    });
  }
});

router.post('/api/stripe/create-pro-subscription', hybridAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { plan, currency: requestedCurrency } = req.body;
    if (!plan || !['monthly', 'yearly'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan. Must be "monthly" or "yearly".' });
    }

    // Validate currency; fall back to gbp if not in the allowed set
    const currency = requestedCurrency && ALLOWED_CURRENCIES.has(requestedCurrency)
      ? requestedCurrency
      : 'gbp';

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Guard: block a new PaymentIntent if the user already has an active subscription
    if (user.isPro && user.stripeSubscriptionId) {
      const stripe = await getUncachableStripeClient();
      try {
        const existing = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        if (existing.status === 'active' || existing.status === 'trialing') {
          console.warn(`⚠️ User ${userId} already has active subscription ${user.stripeSubscriptionId} — blocking new PaymentIntent`);
          return res.status(409).json({ error: 'You already have an active Pro subscription.' });
        }
      } catch {
        // Subscription not found in Stripe — allow proceeding
      }
    }

    const stripe = await getUncachableStripeClient();

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

    const priceId = await getOrCreatePriceId(stripe, plan, currency);

    const regionalPrice = Object.values(CURRENCY_TABLE).find(p => p.currency === currency) ?? CURRENCY_TABLE.GBP;
    const amount = plan === 'monthly' ? regionalPrice.monthly : regionalPrice.yearly;

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      customer: customerId,
      setup_future_usage: 'off_session',
      automatic_payment_methods: { enabled: true },
      metadata: {
        userId: String(userId),
        plan,
        priceId,
        type: 'pro_subscription',
      },
    });

    return res.json({
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
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

    const { paymentIntentId, plan } = req.body;
    if (!paymentIntentId || !plan || !['monthly', 'yearly'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid request. Requires paymentIntentId and plan ("monthly" or "yearly").' });
    }

    const stripe = await getUncachableStripeClient();

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ error: 'Payment has not been completed', status: paymentIntent.status });
    }

    if (paymentIntent.metadata.userId !== String(userId)) {
      return res.status(403).json({ error: 'Payment does not belong to this user' });
    }

    // Idempotency guard: if this user already has a subscription tied to this exact PaymentIntent,
    // return success without creating a duplicate
    const [currentUser] = await db.select().from(users).where(eq(users.id, userId));
    if (currentUser?.stripeSubscriptionId) {
      try {
        const existingSub = await stripe.subscriptions.retrieve(currentUser.stripeSubscriptionId);
        if (existingSub.status === 'active' || existingSub.status === 'trialing') {
          console.log(`ℹ️ confirm-pro-subscription: user ${userId} already has active sub ${currentUser.stripeSubscriptionId}`);
          return res.json({ success: true, isPro: true, subscriptionId: currentUser.stripeSubscriptionId });
        }
      } catch {
        // Subscription not found in Stripe — proceed to create a new one
      }
    }

    // Also check Stripe directly to catch race conditions
    const customerId = paymentIntent.customer as string;
    const existingSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 10,
    });
    const alreadyLinked = existingSubscriptions.data.find(
      (s: any) => s.metadata?.paymentIntentId === paymentIntentId
    );
    if (alreadyLinked) {
      console.log(`ℹ️ confirm-pro-subscription: found existing sub ${alreadyLinked.id} linked to PI ${paymentIntentId}`);
      await db.update(users).set({
        isPro: true,
        stripeCustomerId: customerId,
        stripeSubscriptionId: alreadyLinked.id,
        updatedAt: new Date(),
      }).where(eq(users.id, userId));
      return res.json({ success: true, isPro: true, subscriptionId: alreadyLinked.id });
    }

    const paymentMethodId = paymentIntent.payment_method as string;
    const priceId = paymentIntent.metadata.priceId;

    await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId }).catch(() => {});

    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      default_payment_method: paymentMethodId,
      metadata: { userId: String(userId), plan, paymentIntentId },
    });

    const activeStatuses = ['active', 'trialing'];
    if (!activeStatuses.includes(subscription.status)) {
      console.warn(`⚠️ Subscription ${subscription.id} created with non-active status: ${subscription.status}`);
      return res.status(402).json({
        error: 'Subscription is not active',
        status: subscription.status,
        message: 'Your payment did not complete successfully. Please try again.',
      });
    }

    await db.update(users).set({
      isPro: true,
      proSubscriptionType: plan,
      proSubscriptionStartDate: new Date(),
      proSubscriptionEndDate: plan === 'yearly'
        ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      updatedAt: new Date(),
    }).where(eq(users.id, userId));

    const [updatedUser] = await db.select().from(users).where(eq(users.id, userId));
    if (updatedUser?.email) {
      EmailService.sendProWelcomeEmail(
        updatedUser.email,
        updatedUser.username || updatedUser.displayName || 'Gamer',
        plan as 'monthly' | 'yearly'
      ).catch(err => console.error('Failed to send Pro welcome email:', err));
    }

    if (updatedUser) {
      notifyProPurchase(updatedUser, { kind: 'new', plan, source: 'Stripe' });
    }

    let lootboxReward = null;
    try {
      const initialGrant = await storage.grantProLootbox(userId, 'initial');
      if (initialGrant) {
        lootboxReward = { reward: initialGrant.reward, isDuplicate: initialGrant.isDuplicate };
        console.log(`🎁 Initial Pro lootbox granted on subscription confirm: ${initialGrant.reward.name}`);
      }
    } catch (lootboxErr) {
      console.error('Failed to grant initial pro lootbox:', lootboxErr);
    }

    return res.json({ success: true, isPro: true, subscriptionId: subscription.id, lootboxReward });
  } catch (error: any) {
    console.error('Confirm pro subscription error:', error);
    return res.status(500).json({
      error: 'Failed to confirm pro subscription',
      message: error.message,
    });
  }
});

export default router;
