import { Router, Request, Response } from 'express';
import express from 'express';
import { db } from '../db';
import { gfOrders } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { getUncachableStripeClient, getStripeSecretKey } from '../stripeClient';
import { transferGfTokens } from '../gf-token-service';
import Stripe from 'stripe';

const router = Router();

async function getWebhookSecret(): Promise<string> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? 'depl ' + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken || !hostname) {
    throw new Error('Replit connector credentials not available');
  }

  const isProduction = process.env.REPLIT_DEPLOYMENT === '1';
  const targetEnvironment = isProduction ? 'production' : 'development';

  const url = new URL(`https://${hostname}/api/v2/connection`);
  url.searchParams.set('include_secrets', 'true');
  url.searchParams.set('connector_names', 'stripe');
  url.searchParams.set('environment', targetEnvironment);

  const response = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json',
      'X_REPLIT_TOKEN': xReplitToken
    }
  });

  const data = await response.json();
  const connectionSettings = data.items?.[0];
  
  if (!connectionSettings?.settings?.webhook_secret) {
    throw new Error('Stripe webhook secret not found');
  }

  return connectionSettings.settings.webhook_secret;
}

async function updateOrderStatus(
  orderId: string, 
  status: string, 
  updates: { txHash?: string; errorReason?: string; stripePaymentIntentId?: string } = {}
) {
  await db.update(gfOrders)
    .set({ 
      status, 
      updatedAt: new Date(),
      ...updates 
    })
    .where(eq(gfOrders.id, orderId));
}

async function processGfOrderDelivery(sessionId: string, paymentIntentId?: string): Promise<void> {
  console.log(`[GF Webhook] Processing order for session: ${sessionId}`);

  const [order] = await db.select()
    .from(gfOrders)
    .where(eq(gfOrders.stripeSessionId, sessionId));

  if (!order) {
    console.log(`[GF Webhook] No order found for session: ${sessionId}`);
    return;
  }

  console.log(`[GF Webhook] Found order ${order.id} with status: ${order.status}`);

  const terminalStatuses = ['delivered', 'delivering', 'paid'];
  if (terminalStatuses.includes(order.status)) {
    console.log(`[GF Webhook] Order ${order.id} already processed (status: ${order.status}), skipping`);
    return;
  }

  await updateOrderStatus(order.id, 'paid', { 
    stripePaymentIntentId: paymentIntentId || undefined 
  });
  console.log(`[GF Webhook] Order ${order.id} marked as paid`);

  if (!order.walletAddress) {
    await updateOrderStatus(order.id, 'failed', { 
      errorReason: 'No wallet address associated with order' 
    });
    console.error(`[GF Webhook] Order ${order.id} failed: No wallet address`);
    return;
  }

  await updateOrderStatus(order.id, 'delivering');
  console.log(`[GF Webhook] Order ${order.id} status set to delivering`);

  try {
    const result = await transferGfTokens(order.walletAddress, order.gfAmount);

    if (result.success && result.txHash) {
      await updateOrderStatus(order.id, 'delivered', { txHash: result.txHash });
      console.log(`[GF Webhook] Order ${order.id} delivered successfully. TxHash: ${result.txHash}`);
    } else {
      await updateOrderStatus(order.id, 'failed', { 
        errorReason: result.error || 'Token transfer failed',
        txHash: result.txHash 
      });
      console.error(`[GF Webhook] Order ${order.id} delivery failed: ${result.error}`);
    }
  } catch (error: any) {
    await updateOrderStatus(order.id, 'failed', { 
      errorReason: error.message || 'Unexpected error during token transfer' 
    });
    console.error(`[GF Webhook] Order ${order.id} delivery error:`, error);
  }
}

router.post('/api/stripe/webhook', 
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
    const signature = req.headers['stripe-signature'];

    if (!signature) {
      console.error('[GF Webhook] Missing stripe-signature header');
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    if (!Buffer.isBuffer(req.body)) {
      console.error('[GF Webhook] Request body is not a Buffer - ensure webhook route is before express.json()');
      return res.status(500).json({ error: 'Webhook processing error' });
    }

    let event: Stripe.Event;

    try {
      const stripe = await getUncachableStripeClient();
      const webhookSecret = await getWebhookSecret();
      const sig = Array.isArray(signature) ? signature[0] : signature;

      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (error: any) {
      console.error('[GF Webhook] Signature verification failed:', error.message);
      return res.status(400).json({ error: `Webhook signature verification failed: ${error.message}` });
    }

    console.log(`[GF Webhook] Received event: ${event.type}`);

    res.status(200).json({ received: true });

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      if (session.metadata?.gfAmount) {
        try {
          await processGfOrderDelivery(
            session.id, 
            typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id
          );
        } catch (error) {
          console.error('[GF Webhook] Error processing order delivery:', error);
        }
      }
    }

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      
      if (paymentIntent.metadata?.gfAmount) {
        try {
          await processGfOrderDelivery(
            paymentIntent.id,
            paymentIntent.id
          );
        } catch (error) {
          console.error('[GF Webhook] Error processing PaymentIntent order delivery:', error);
        }
      }
    }
  }
);

export default router;
