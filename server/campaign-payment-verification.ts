import type Stripe from 'stripe';
export function isVerifiedCampaignPayment(session: Stripe.Checkout.Session, payment: any) {
  return session.payment_status === 'paid' && session.currency === 'gbp'
    && session.amount_subtotal === Number(payment.expected_pence)
    && Number(session.amount_total) >= Number(payment.expected_pence)
    && session.metadata?.type === 'campaign'
    && Number(session.metadata.campaignId) === Number(payment.campaign_id)
    && Number(session.metadata.developerId) === Number(payment.developer_id)
    && Number(session.metadata.expectedPence) === Number(payment.expected_pence)
    && session.id === payment.session_id;
}

export function isVerifiedCapacityPayment(session: Stripe.Checkout.Session, payment: any) {
  return session.payment_status === 'paid' && session.currency === 'gbp'
    && session.amount_subtotal === Number(payment.expected_pence)
    && Number(session.amount_total) >= Number(payment.expected_pence)
    && session.id === payment.session_id
    && session.metadata?.type === 'campaign_capacity'
    && session.metadata.capacityPaymentId === payment.id
    && session.metadata.campaignId === String(payment.campaign_id)
    && session.metadata.developerId === String(payment.developer_id);
}
