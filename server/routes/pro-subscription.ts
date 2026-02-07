import { Router, Request, Response } from 'express';
import { getUncachableStripeClient, getStripePublishableKey } from '../stripeClient';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { hybridAuth } from '../middleware/hybrid-auth';

const router = Router();

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

    const email = user.email;
    if (!email) {
      return res.status(400).json({ error: 'User must have an email address to subscribe' });
    }

    let customerId: string;
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

    const priceId = plan === 'monthly'
      ? process.env.STRIPE_PRO_MONTHLY_PRICE_ID
      : process.env.STRIPE_PRO_YEARLY_PRICE_ID;

    if (!priceId) {
      return res.status(500).json({ error: `Stripe price ID not configured for ${plan} plan` });
    }

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: { userId: String(userId), plan },
    });

    const clientSecret = (subscription.latest_invoice as any).payment_intent.client_secret;

    return res.json({
      subscriptionId: subscription.id,
      clientSecret,
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

    const { subscriptionId, plan } = req.body;
    if (!subscriptionId || !plan || !['monthly', 'yearly'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid request. Requires subscriptionId and plan ("monthly" or "yearly").' });
    }

    const stripe = await getUncachableStripeClient();

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    if (!['active', 'trialing'].includes(subscription.status)) {
      return res.status(400).json({ error: 'Subscription is not active', status: subscription.status });
    }

    if (subscription.metadata.userId !== String(userId)) {
      return res.status(403).json({ error: 'Subscription does not belong to this user' });
    }

    await db.update(users).set({
      isPro: true,
      proSubscriptionType: plan,
      proSubscriptionStartDate: new Date(),
      proSubscriptionEndDate: plan === 'yearly'
        ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    }).where(eq(users.id, userId));

    return res.json({ success: true, isPro: true });
  } catch (error: any) {
    console.error('Confirm pro subscription error:', error);
    return res.status(500).json({
      error: 'Failed to confirm pro subscription',
      message: error.message,
    });
  }
});

export default router;
