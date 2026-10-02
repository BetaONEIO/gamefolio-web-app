import Stripe from 'stripe';
import { getPgSslConfig, normalizePgConnectionString } from './database-tls';

function getCredentials() {
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!publishableKey || !secretKey) {
    throw new Error('STRIPE_PUBLISHABLE_KEY and STRIPE_SECRET_KEY must be set in environment variables');
  }

  return { publishableKey, secretKey };
}

export async function getUncachableStripeClient() {
  const { secretKey } = getCredentials();

  return new Stripe(secretKey, {
    apiVersion: '2025-11-17.clover',
  });
}

export async function getStripePublishableKey() {
  const { publishableKey } = getCredentials();
  return publishableKey;
}

export async function getStripeSecretKey() {
  const { secretKey } = getCredentials();
  return secretKey;
}

let stripeSync: any = null;

export async function getStripeSync() {
  if (!stripeSync) {
    const { StripeSync } = await import('stripe-replit-sync');
    const secretKey = await getStripeSecretKey();

    stripeSync = new StripeSync({
      poolConfig: {
        connectionString: normalizePgConnectionString(process.env.DATABASE_URL!),
        ssl: getPgSslConfig(process.env.DATABASE_URL!),
        // Stripe synchronization is serialized; one connection is enough and
        // preserves headroom in Supabase's session pooler.
        max: 1,
      },
      stripeSecretKey: secretKey,
    });
  }
  return stripeSync;
}
