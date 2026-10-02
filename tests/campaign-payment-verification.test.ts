import test from 'node:test';
import assert from 'node:assert/strict';
import { isVerifiedCampaignPayment } from '../server/campaign-payment-verification';
const payment = { campaign_id: 12, developer_id: 7, expected_pence: 2500, session_id: 'cs_example' };
const session: any = { id: 'cs_example', payment_status: 'paid', currency: 'gbp', amount_subtotal: 2500, amount_total: 3000,
  metadata: { type: 'campaign', campaignId: '12', developerId: '7', expectedPence: '2500' } };
test('accepts trusted paid receipt including tax', () => assert.equal(isVerifiedCampaignPayment(session, payment), true));
test('rejects unpaid, wrong currency, wrong price and wrong checkout', () => {
  for (const patch of [{payment_status:'unpaid'}, {currency:'usd'}, {amount_subtotal:1}, {amount_total:2499}, {id:'another'}])
    assert.equal(isVerifiedCampaignPayment({...session, ...patch}, payment), false);
});
test('binds payment to campaign, developer and server-side amount', () => {
  for (const patch of [{campaignId:'13'}, {developerId:'8'}, {expectedPence:'1'}, {type:'gift_pro'}])
    assert.equal(isVerifiedCampaignPayment({...session, metadata:{...session.metadata,...patch}}, payment), false);
});
