import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getInvoiceSubscriptionId,
  getSubscriptionPeriodEnd,
} from '../server/services/stripe-subscription-sync';

test('reads subscription id from the modern Stripe invoice parent shape', () => {
  assert.equal(getInvoiceSubscriptionId({
    parent: {
      subscription_details: {
        subscription: 'sub_modern',
      },
    },
  }), 'sub_modern');
});

test('continues to accept legacy and expanded invoice subscription shapes', () => {
  assert.equal(getInvoiceSubscriptionId({ subscription: 'sub_legacy' }), 'sub_legacy');
  assert.equal(getInvoiceSubscriptionId({ subscription: { id: 'sub_expanded' } }), 'sub_expanded');
  assert.equal(getInvoiceSubscriptionId({}), null);
});

test('uses the latest subscription item period end', () => {
  assert.deepEqual(getSubscriptionPeriodEnd({
    current_period_end: 100,
    items: { data: [{ current_period_end: 200 }, { current_period_end: 150 }] },
  }), new Date(200_000));
  assert.equal(getSubscriptionPeriodEnd({ items: { data: [] } }), null);
});
