import { Router, Request, Response } from 'express';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { hybridAuth } from '../middleware/hybrid-auth';
import { EmailService } from '../email-service';
import { storage } from '../storage';
import { notifyProPurchase } from '../telegram-notify';

const router = Router();

const REVENUECAT_API_BASE = 'https://api.revenuecat.com/v1';
export const PRO_ENTITLEMENT_ID = 'pro';

// The GET /subscribers endpoint returns platform-agnostic entitlements, but
// RevenueCat still expects an X-Platform header. Pass the buyer's real platform
// so Android purchases aren't recorded against iOS.
export async function fetchRevenueCatSubscriber(appUserId: string, platform: string = 'ios'): Promise<any> {
  const apiKey = process.env.REVENUECAT_API_KEY;
  if (!apiKey) {
    throw new Error('REVENUECAT_API_KEY is not configured');
  }

  const xPlatform = platform === 'android' ? 'android' : platform === 'web' ? 'web' : 'ios';
  const response = await fetch(`${REVENUECAT_API_BASE}/subscribers/${encodeURIComponent(appUserId)}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Platform': xPlatform,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`RevenueCat API error ${response.status}: ${text}`);
  }

  return response.json();
}

export function isEntitlementActive(entitlement: any): boolean {
  if (!entitlement) return false;
  if (!entitlement.expires_date) return true;
  return new Date(entitlement.expires_date) > new Date();
}

export function parsePlanFromEntitlement(entitlement: any): 'monthly' | 'yearly' {
  const productId: string = entitlement?.product_identifier || '';
  if (productId.includes('annual') || productId.includes('yearly') || productId.includes('year')) {
    return 'yearly';
  }
  return 'monthly';
}

// Derive plan duration from a webhook product id. NB: RevenueCat's `period_type`
// is TRIAL/INTRO/NORMAL (not the billing duration), so it must NOT be used here.
function parsePlanFromProductId(productId: unknown): 'monthly' | 'yearly' {
  const id = typeof productId === 'string' ? productId.toLowerCase() : '';
  if (id.includes('annual') || id.includes('yearly') || id.includes('year')) {
    return 'yearly';
  }
  return 'monthly';
}

export function getEndDateFromEntitlement(entitlement: any): Date {
  if (entitlement?.expires_date) {
    return new Date(entitlement.expires_date);
  }
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
}

router.post('/api/pro/activate', hybridAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { appUserId, platform } = req.body;
    if (!appUserId || typeof appUserId !== 'string') {
      return res.status(400).json({ error: 'appUserId is required' });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let rcData: any;
    try {
      rcData = await fetchRevenueCatSubscriber(appUserId, typeof platform === 'string' ? platform : 'ios');
    } catch (err: any) {
      console.error('[RevenueCat] Failed to fetch subscriber:', err.message);
      return res.status(502).json({ error: 'Failed to verify subscription with RevenueCat', message: err.message });
    }

    const subscriber = rcData.subscriber;
    const entitlement = subscriber?.entitlements?.[PRO_ENTITLEMENT_ID];

    if (!isEntitlementActive(entitlement)) {
      return res.status(403).json({ error: 'No active Pro entitlement found' });
    }

    const plan = parsePlanFromEntitlement(entitlement);
    const endDate = getEndDateFromEntitlement(entitlement);

    await db.update(users).set({
      isPro: true,
      proSubscriptionType: plan,
      proSubscriptionStartDate: user.proSubscriptionStartDate || new Date(),
      proSubscriptionEndDate: endDate,
      revenuecatUserId: appUserId,
      updatedAt: new Date(),
    }).where(eq(users.id, userId));

    let lootboxReward = null;
    if (!user.isPro) {
      try {
        const initialGrant = await storage.grantProLootbox(userId, 'initial');
        if (initialGrant) {
          lootboxReward = { reward: initialGrant.reward, isDuplicate: initialGrant.isDuplicate };
          console.log(`[RevenueCat] Initial Pro lootbox granted for user ${userId}: ${initialGrant.reward.name}`);
        }
      } catch (lootboxErr) {
        console.error('[RevenueCat] Failed to grant initial pro lootbox:', lootboxErr);
      }

      if (user.email) {
        EmailService.sendProWelcomeEmail(
          user.email,
          user.username || user.displayName || 'Gamer',
          plan
        ).catch(err => console.error('[RevenueCat] Failed to send Pro welcome email:', err));
      }
    }

    console.log(`[RevenueCat] User ${userId} activated Pro via RevenueCat (appUserId: ${appUserId}, plan: ${plan})`);

    return res.json({ success: true, isPro: true, plan, endDate, lootboxReward });
  } catch (error: any) {
    console.error('[RevenueCat] activate error:', error);
    return res.status(500).json({ error: 'Failed to activate Pro', message: error.message });
  }
});

router.post('/api/revenuecat/webhook', async (req: Request, res: Response) => {
  try {
    const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET;
    if (webhookSecret) {
      const authHeader = req.headers['authorization'];
      if (!authHeader || authHeader !== webhookSecret) {
        console.warn('[RevenueCat Webhook] Invalid or missing Authorization header');
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }

    const event = req.body?.event;
    if (!event) {
      return res.status(400).json({ error: 'Missing event payload' });
    }

    const { type, app_user_id, expiration_at_ms, product_id, environment } = event;
    const isSandbox = environment === 'SANDBOX';
    console.log(`[RevenueCat Webhook] Received event type: ${type}, app_user_id: ${app_user_id}, environment: ${environment}`);

    if (!app_user_id) {
      return res.status(200).json({ received: true });
    }

    // Resolve the user. The client configures RevenueCat with a deterministic
    // appUserID of `gamefolio_<userId>` (users.id is a serial int), so we can
    // resolve straight from the event — this works even when the client never
    // hit /api/pro/activate to persist the revenuecatUserId mapping (otherwise
    // every RENEWAL/CANCELLATION/EXPIRATION would be silently dropped and Pro
    // would never be revoked). Fall back to the stored mapping for safety.
    let user;
    if (typeof app_user_id === 'string' && app_user_id.startsWith('gamefolio_')) {
      const derivedId = Number(app_user_id.slice('gamefolio_'.length));
      if (Number.isInteger(derivedId) && derivedId > 0) {
        [user] = await db.select().from(users).where(eq(users.id, derivedId));
      }
    }
    if (!user) {
      [user] = await db.select().from(users).where(eq(users.revenuecatUserId, app_user_id));
    }
    if (!user) {
      console.log(`[RevenueCat Webhook] No user found for app_user_id: ${app_user_id}`);
      return res.status(200).json({ received: true });
    }

    const activatingEvents = ['INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE', 'UNCANCELLATION'];
    const deactivatingEvents = ['CANCELLATION', 'EXPIRATION', 'BILLING_ISSUE', 'SUBSCRIBER_ALIAS'];

    if (activatingEvents.includes(type)) {
      const endDate = expiration_at_ms ? new Date(expiration_at_ms) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const plan: 'monthly' | 'yearly' = parsePlanFromProductId(product_id);

      await db.update(users).set({
        isPro: true,
        proSubscriptionType: plan,
        proSubscriptionStartDate: user.proSubscriptionStartDate || new Date(),
        proSubscriptionEndDate: endDate,
        // Persist the mapping so subsequent REST lookups (and the activate path)
        // stay consistent for this subscriber.
        revenuecatUserId: app_user_id,
        updatedAt: new Date(),
      }).where(eq(users.id, user.id));

      if (type === 'INITIAL_PURCHASE' && !user.isPro) {
        try {
          await storage.grantProLootbox(user.id, 'initial');
        } catch (err) {
          console.error('[RevenueCat Webhook] Failed to grant initial pro lootbox:', err);
        }

        if (user.email) {
          EmailService.sendProWelcomeEmail(
            user.email,
            user.username || user.displayName || 'Gamer',
            plan
          ).catch(err => console.error('[RevenueCat Webhook] Failed to send Pro welcome email:', err));
        }

        if (!isSandbox) {
          notifyProPurchase(user, { kind: 'new', plan, source: 'RevenueCat' });
        }
      }

      if (type === 'RENEWAL') {
        try {
          await storage.grantProLootbox(user.id, 'monthly');
        } catch (err) {
          console.error('[RevenueCat Webhook] Failed to grant renewal pro lootbox:', err);
        }

        if (!isSandbox) {
          notifyProPurchase(user, { kind: 'renewal', plan, source: 'RevenueCat' });
        }
      }

      console.log(`[RevenueCat Webhook] User ${user.id} Pro activated/renewed (type: ${type}, plan: ${plan}, until: ${endDate}, sandbox: ${isSandbox})`);
    } else if (deactivatingEvents.includes(type)) {
      await db.update(users).set({
        isPro: false,
        updatedAt: new Date(),
      }).where(eq(users.id, user.id));

      console.log(`[RevenueCat Webhook] User ${user.id} Pro deactivated (type: ${type})`);
    } else {
      console.log(`[RevenueCat Webhook] Unhandled event type: ${type} — ignoring`);
    }

    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('[RevenueCat Webhook] Error processing event:', error);
    return res.status(200).json({ received: true });
  }
});

export default router;
