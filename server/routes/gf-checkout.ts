import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { gfOrders, users } from '@shared/schema';
import { eq, desc, and } from 'drizzle-orm';
import { getUncachableStripeClient } from '../stripeClient';
import { hybridAuth } from '../middleware/hybrid-auth';

const SKALE_NEBULA_TESTNET_CHAIN_ID = 37084624;

const router = Router();

const ALLOWED_GBP_AMOUNTS = [5, 10, 25, 50, 100] as const;
const GF_PRICE_GBP = 0.01; // Fixed price: 1 GF = £0.01

const checkoutSchema = z.object({
  gbpAmount: z.number().refine(
    (val) => ALLOWED_GBP_AMOUNTS.includes(val as any),
    { message: `gbpAmount must be one of: ${ALLOWED_GBP_AMOUNTS.join(', ')}` }
  ),
});

router.post('/api/gf/checkout', hybridAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const validation = checkoutSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Invalid request', 
        details: validation.error.errors 
      });
    }

    const { gbpAmount } = validation.data;

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const walletAddress = user.walletAddress || null;
    const gfAmount = gbpAmount / GF_PRICE_GBP;

    const stripe = await getUncachableStripeClient();

    const getBaseUrl = (req: Request): string => {
      if (process.env.REPLIT_DOMAINS) {
        return `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`;
      }
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
      const host = req.get('host') || 'localhost:5000';
      return `${protocol}://${host}`;
    };
    
    const baseUrl = getBaseUrl(req);
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'gbp',
          unit_amount: Math.round(gbpAmount * 100),
          product_data: {
            name: `${gfAmount.toLocaleString()} GF Tokens`,
            description: `Purchase of ${gfAmount.toLocaleString()} GF tokens at £${GF_PRICE_GBP} each`,
          },
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${baseUrl}/gf/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/gf/cancel`,
      metadata: {
        userId: userId.toString(),
        gbpAmount: gbpAmount.toString(),
        gfAmount: gfAmount.toString(),
        priceUsed: GF_PRICE_GBP.toString(),
        walletAddress: walletAddress || '',
      },
    });

    const [order] = await db.insert(gfOrders).values({
      userId,
      walletAddress,
      gbpAmount,
      gfAmount,
      priceUsed: GF_PRICE_GBP,
      status: 'created',
      stripeSessionId: session.id,
    }).returning();

    return res.json({
      orderId: order.id,
      checkoutUrl: session.url,
    });
  } catch (error: any) {
    console.error('GF Checkout error:', error);
    return res.status(500).json({ 
      error: 'Failed to create checkout session',
      message: error.message 
    });
  }
});

router.get('/api/me/wallet', hybridAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const [user] = await db.select({
      walletAddress: users.walletAddress,
      walletChain: users.walletChain,
    }).from(users).where(eq(users.id, userId));

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      walletAddress: user.walletAddress || null,
      chainId: user.walletAddress ? SKALE_NEBULA_TESTNET_CHAIN_ID : null,
    });
  } catch (error: any) {
    console.error('Get wallet error:', error);
    return res.status(500).json({ error: 'Failed to get wallet info' });
  }
});

router.get('/api/gf/orders', hybridAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const orders = await db.select({
      id: gfOrders.id,
      gbpAmount: gfOrders.gbpAmount,
      gfAmount: gfOrders.gfAmount,
      status: gfOrders.status,
      txHash: gfOrders.txHash,
      createdAt: gfOrders.createdAt,
    })
    .from(gfOrders)
    .where(eq(gfOrders.userId, userId))
    .orderBy(desc(gfOrders.createdAt))
    .limit(20);

    return res.json(orders);
  } catch (error: any) {
    console.error('Get orders error:', error);
    return res.status(500).json({ error: 'Failed to get orders' });
  }
});

router.get('/api/gf/orders/:id', hybridAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;

    const [order] = await db.select({
      id: gfOrders.id,
      gbpAmount: gfOrders.gbpAmount,
      gfAmount: gfOrders.gfAmount,
      status: gfOrders.status,
      txHash: gfOrders.txHash,
      createdAt: gfOrders.createdAt,
    })
    .from(gfOrders)
    .where(and(eq(gfOrders.id, id), eq(gfOrders.userId, userId)));

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    return res.json(order);
  } catch (error: any) {
    console.error('Get order error:', error);
    return res.status(500).json({ error: 'Failed to get order' });
  }
});

export default router;
