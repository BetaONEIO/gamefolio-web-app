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
