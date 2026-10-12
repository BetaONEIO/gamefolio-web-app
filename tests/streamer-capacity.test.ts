import test from 'node:test';
import assert from 'node:assert/strict';
import {STREAMER_PLACE_PRESETS,streamerCapacityError,streamPotentialOutput} from '../shared/streamer-capacity';
import {calculateStreamCampaignPricePence} from '../shared/campaign-commercial-model';
import {isVerifiedCapacityPayment} from '../server/campaign-payment-verification';
test('presets are bounded and every supported duration uses integer pricing',()=>{
  assert.deepEqual(STREAMER_PLACE_PRESETS,[1,3,5,10]);
  for(const n of STREAMER_PLACE_PRESETS){assert.equal(streamerCapacityError(n),null);for(const [minutes,pence] of [[30,1000],[60,1500],[120,2500]])assert.equal(calculateStreamCampaignPricePence(n,minutes),n*pence);}
});
test('modified state cannot exceed the cap; unchanged legacy capacity is grandfathered',()=>{
  for(const n of [0,-1,11,100,NaN,1.5,'10',null])assert.ok(streamerCapacityError(n));
  assert.equal(streamerCapacityError(25,25),null);
  assert.ok(streamerCapacityError(26,25));assert.ok(streamerCapacityError(24,25));assert.equal(streamerCapacityError(10,25),null);
});
test('potential coverage is capacity multiplied by duration, not an invented participation range',()=>{
  assert.deepEqual(streamPotentialOutput(5,30),{streams:5,coverageHours:2.5});
  assert.deepEqual(streamPotentialOutput(3,120),{streams:3,coverageHours:6});
});
const payment={id:'increase-1',campaign_id:12,developer_id:7,expected_pence:2000,session_id:'cs_increase'};
const session:any={id:'cs_increase',payment_status:'paid',currency:'gbp',amount_subtotal:2000,amount_total:2400,metadata:{type:'campaign_capacity',capacityPaymentId:'increase-1',campaignId:'12',developerId:'7'}};
test('capacity receipts are bound to the server quote, developer, campaign and session',()=>{
  assert.equal(isVerifiedCapacityPayment(session,payment),true);
  for(const patch of [{payment_status:'unpaid'},{currency:'usd'},{amount_subtotal:1},{amount_total:1999},{id:'other'}])assert.equal(isVerifiedCapacityPayment({...session,...patch},payment),false);
  for(const patch of [{type:'campaign'},{capacityPaymentId:'other'},{campaignId:'13'},{developerId:'8'}])assert.equal(isVerifiedCapacityPayment({...session,metadata:{...session.metadata,...patch}},payment),false);
  assert.equal(isVerifiedCapacityPayment({...session,presentment_details:{presentment_currency:'eur',presentment_amount:2900}},payment),true);
});
