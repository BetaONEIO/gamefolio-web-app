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
import { getGbpRates, detectLocalCurrency } from '../services/currency-service';
import { captureRouteError } from "../sentry";

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
    const localCurrency = await detectLocalCurrency(req as any);

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
    captureRouteError(error);
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
    captureRouteError(error);
    console.error('Confirm pro subscription error:', error);
    return res.status(500).json({
      error: 'Failed to confirm pro subscription',
      message: error.message,
    });
  }
});

// ---------------------------------------------------------------------------
// Gift Pro — create a one-time hosted checkout so one user can give Pro to
// another. No Stripe subscription is created; the webhook grants a timed Pro
// period directly when payment succeeds.
// ---------------------------------------------------------------------------
export async function grantGiftPro(opts: {
  recipientId: number;
  plan: 'monthly' | 'yearly';
}): Promise<void> {
  const { recipientId, plan } = opts;

  await db.update(users).set({
    isPro: true,
    proSubscriptionType: plan,
    proSubscriptionStartDate: new Date(),
    proSubscriptionEndDate: plan === 'yearly'
      ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
  }).where(eq(users.id, recipientId));

  const [recipient] = await db.select().from(users).where(eq(users.id, recipientId));
  if (recipient?.email) {
    EmailService.sendProWelcomeEmail(
      recipient.email,
      recipient.username || recipient.displayName || 'Gamer',
      plan,
    ).catch(err => console.error('Failed to send Pro gift welcome email:', err));
  }
}

router.post('/api/pro/gift-checkout', hybridAuth, async (req: Request, res: Response) => {
  try {
    const gifterId = (req as any).user?.id;
    if (!gifterId) return res.status(401).json({ error: 'Authentication required' });

    const { recipientUsername, plan } = req.body;
    if (!['monthly', 'yearly'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan. Must be "monthly" or "yearly".' });
    }
    if (!recipientUsername) {
      return res.status(400).json({ error: 'recipientUsername is required' });
    }

    const recipient = await storage.getUserByUsername(recipientUsername);
    if (!recipient) return res.status(404).json({ error: 'User not found' });
    if (recipient.isPro) return res.status(409).json({ error: 'User already has Pro' });

    const amount = BASE_PRICE[plan as 'monthly' | 'yearly'];
    const stripe = await getUncachableStripeClient();

    const origin = (req.headers.origin as string) || 'https://app.gamefolio.com';
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: BASE_CURRENCY,
            unit_amount: amount,
            product_data: {
              name: `Gamefolio Pro Gift (${plan === 'yearly' ? '1 year' : '1 month'})`,
              description: `Gift a Pro subscription to @${recipientUsername}`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: 'gift_pro',
        gifter_user_id: String(gifterId),
        gift_for_user_id: String(recipient.id),
        gift_for_username: recipientUsername,
        plan,
      },
      success_url: `${origin}/profile/${recipientUsername}?gift_success=1`,
      cancel_url: `${origin}/profile/${recipientUsername}`,
    });

    return res.json({ url: session.url });
  } catch (error: any) {
    captureRouteError(error);
    console.error('Gift pro checkout error:', error);
    return res.status(500).json({ error: 'Failed to create gift checkout', message: error.message });
  }
});

export default router;
