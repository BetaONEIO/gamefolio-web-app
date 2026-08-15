import { Router, Request, Response } from 'express';
import { getUncachableStripeClient } from '../stripeClient';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { hybridAuth } from '../middleware/hybrid-auth';
import { getGbpRates, detectLocalCurrency } from '../services/currency-service';
import { captureRouteError } from '../sentry';

const router = Router();

// ---------------------------------------------------------------------------
// Gamefolio Indie Developer — web pricing. Same Adaptive Pricing / embedded
// Checkout Session approach as Gamefolio Pro (see pro-subscription.ts) — one
// base GBP price, Stripe converts + charges each customer in their own local
// currency at checkout. Amounts are in MINOR units (pence).
// ---------------------------------------------------------------------------
const BASE_CURRENCY = 'gbp';
const BASE_PRICE: Record<'monthly' | 'yearly', number> = {
  monthly: 499,  // £4.99 / month
  yearly: 4999,  // £49.99 / year
};

const cachedPriceIds: { monthly: string | null; yearly: string | null } = {
  monthly: null,
  yearly: null,
};

async function getOrCreatePriceId(
  stripe: any,
  plan: 'monthly' | 'yearly'
): Promise<string> {
  const hit = cachedPriceIds[plan];
  if (hit) return hit;

  const envPriceId = plan === 'monthly'
    ? process.env.STRIPE_INDIE_DEV_MONTHLY_PRICE_ID
    : process.env.STRIPE_INDIE_DEV_YEARLY_PRICE_ID;

  if (envPriceId) {
    try {
      await stripe.prices.retrieve(envPriceId);
      cachedPriceIds[plan] = envPriceId;
      return envPriceId;
    } catch {
      console.warn(`Configured price ID ${envPriceId} not found in Stripe. Auto-provisioning...`);
    }
  }

  const existingProducts = await stripe.products.list({ limit: 100 });
  let product = existingProducts.data.find((p: any) => p.name === 'Gamefolio Indie Developer' && p.active);

  if (!product) {
    product = await stripe.products.create({
      name: 'Gamefolio Indie Developer',
      description: 'Indie Developer subscription for Gamefolio — run more bounties at once, plus promotional perks',
      metadata: { app: 'gamefolio' },
    });
    console.log(`✅ Created Stripe product: ${product.id}`);
  }

  const existingPrices = await stripe.prices.list({ product: product.id, active: true, limit: 100 });

  const targetAmount = BASE_PRICE[plan];
  const targetInterval = plan === 'monthly' ? 'month' : 'year';

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
    console.log(`✅ Created Stripe price for indie-dev ${plan}/${BASE_CURRENCY}: ${price.id}`);
  }

  cachedPriceIds[plan] = price.id;
  return price.id;
}

// Shared, idempotent Indie Developer provisioning. Called by the client-side
// confirm endpoint and by the Stripe/RevenueCat webhooks as a backstop.
export async function provisionIndieDevSubscription(opts: {
  userId: number;
  plan: 'monthly' | 'yearly';
  customerId?: string;
  subscriptionId?: string;
}): Promise<void> {
  const { userId, plan, customerId, subscriptionId } = opts;

  const [before] = await db.select().from(users).where(eq(users.id, userId));

  await db.update(users).set({
    isIndieDevSubscriber: true,
    indieDevSubscriptionType: plan,
    indieDevSubscriptionStartDate: before?.indieDevSubscriptionStartDate ?? new Date(),
    indieDevSubscriptionEndDate: plan === 'yearly'
      ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    ...(customerId ? { stripeCustomerId: customerId } : {}),
    ...(subscriptionId ? { indieDevStripeSubscriptionId: subscriptionId } : {}),
    updatedAt: new Date(),
  }).where(eq(users.id, userId));
}

// Public pricing endpoint — same local-currency approximation as pro-pricing.
router.get('/api/stripe/indie-dev-pricing', async (req: Request, res: Response) => {
  const base = {
    currency: BASE_CURRENCY,
    monthly: BASE_PRICE.monthly / 100,
    yearly: BASE_PRICE.yearly / 100,
  };

  try {
    const localCurrency = await detectLocalCurrency(req as any);

    if (!localCurrency || localCurrency.toUpperCase() === 'GBP') {
      return res.json(base);
    }

    const rates = await getGbpRates();
    const rate = rates?.[localCurrency.toUpperCase()];
    if (!rate) return res.json(base);

    const localMonthly = Math.round(base.monthly * rate * 100) / 100;
    const localYearly  = Math.round(base.yearly  * rate * 100) / 100;

    return res.json({ ...base, localCurrency, localMonthly, localYearly });
  } catch (err) {
    console.warn('indie-dev-pricing localisation error:', err);
    return res.json(base);
  }
});

router.post('/api/stripe/create-indie-dev-subscription', hybridAuth, async (req: Request, res: Response) => {
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

    if (user.isIndieDevSubscriber && user.indieDevStripeSubscriptionId) {
      try {
        const existing = await stripe.subscriptions.retrieve(user.indieDevStripeSubscriptionId);
        if (existing.status === 'active' || existing.status === 'trialing') {
          console.warn(`⚠️ User ${userId} already has active Indie Dev subscription ${user.indieDevStripeSubscriptionId} — blocking new checkout`);
          return res.status(409).json({ error: 'You already have an active Indie Developer subscription.' });
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
        type: 'indie_dev_subscription',
      },
    });

    return res.json({
      clientSecret: session.client_secret,
      sessionId: session.id,
    });
  } catch (error: any) {
    captureRouteError(error);
    console.error('Create indie dev subscription error:', error);
    return res.status(500).json({
      error: 'Failed to create indie dev subscription',
      message: error.message,
    });
  }
});

router.post('/api/stripe/confirm-indie-dev-subscription', hybridAuth, async (req: Request, res: Response) => {
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

    const resolvedPlan: 'monthly' | 'yearly' =
      session.metadata?.plan === 'yearly' || session.metadata?.plan === 'monthly'
        ? session.metadata.plan
        : (plan === 'yearly' ? 'yearly' : 'monthly');

    await provisionIndieDevSubscription({
      userId,
      plan: resolvedPlan,
      customerId,
      subscriptionId,
    });

    return res.json({ success: true, isIndieDevSubscriber: true, subscriptionId });
  } catch (error: any) {
    captureRouteError(error);
    console.error('Confirm indie dev subscription error:', error);
    return res.status(500).json({
      error: 'Failed to confirm indie dev subscription',
      message: error.message,
    });
  }
});

export default router;
