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

async function getOrCreatePriceId(stripe: any, plan: 'monthly' | 'yearly'): Promise<string> {
  if (plan === 'monthly' && cachedPriceIds.monthly) return cachedPriceIds.monthly;
  if (plan === 'yearly' && cachedPriceIds.yearly) return cachedPriceIds.yearly;

  const envPriceId = plan === 'monthly'
    ? process.env.STRIPE_PRO_MONTHLY_PRICE_ID
    : process.env.STRIPE_PRO_YEARLY_PRICE_ID;

  if (envPriceId) {
    try {
      await stripe.prices.retrieve(envPriceId);
      if (plan === 'monthly') cachedPriceIds.monthly = envPriceId;
      else cachedPriceIds.yearly = envPriceId;
      return envPriceId;
    } catch (e: any) {
      console.warn(`Configured price ID ${envPriceId} not found in connected Stripe account. Auto-provisioning...`);
    }
  }

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
      metadata: { plan, app: 'gamefolio' },
    });
    console.log(`✅ Created Stripe price for ${plan}: ${price.id} (£${targetAmount / 100}/${targetInterval})`);
  }

  if (plan === 'monthly') cachedPriceIds.monthly = price.id;
  else cachedPriceIds.yearly = price.id;

  console.log(`📌 Using Stripe price for ${plan}: ${price.id}`);
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

// Public pricing endpoint — lets the paywall show the base (GBP) price before
// checkout. The exact local converted amount is shown inside Stripe's checkout
// (Adaptive Pricing has no pre-checkout preview API).
router.get('/api/stripe/pro-pricing', (_req: Request, res: Response) => {
  res.json({
    currency: BASE_CURRENCY,
    monthly: BASE_PRICE.monthly / 100,
    yearly: BASE_PRICE.yearly / 100,
  });
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
