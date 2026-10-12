import assert from 'node:assert/strict';
import test from 'node:test';
import {calculateStreamCampaignPricePence} from '../shared/campaign-commercial-model';
test('stream prices scale with places and duration',()=>{
  for (const [minutes,price] of [[30,1000],[60,1500],[120,2500]]) {
    assert.equal(calculateStreamCampaignPricePence(1,minutes),price);
    assert.equal(calculateStreamCampaignPricePence(3,minutes),price*3);
  }
  assert.equal(calculateStreamCampaignPricePence(2,60),3000);
});
test('invalid stream capacities and durations cannot be priced',()=>{
  for(const places of [0,-1,101,1.5]) assert.throws(()=>calculateStreamCampaignPricePence(places,30));
  for(const minutes of [0,45,90,180,240,241,NaN]) assert.throws(()=>calculateStreamCampaignPricePence(1,minutes));
});
