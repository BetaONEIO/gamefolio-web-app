import assert from 'node:assert/strict';
import test from 'node:test';
import {calculateStreamCampaignPricePence} from '../shared/campaign-commercial-model';
test('stream prices scale with places and duration',()=>{
  for (const [minutes,price] of [[30,500],[60,1000],[90,1500],[120,2000],[180,3000],[240,4000]]) {
    assert.equal(calculateStreamCampaignPricePence(1,minutes),price);
    assert.equal(calculateStreamCampaignPricePence(3,minutes),price*3);
  }
  assert.equal(calculateStreamCampaignPricePence(1,45),750);
});
test('invalid stream capacities and durations cannot be priced',()=>{
  for(const places of [0,-1,101,1.5]) assert.throws(()=>calculateStreamCampaignPricePence(places,30));
  for(const minutes of [0,241,NaN]) assert.throws(()=>calculateStreamCampaignPricePence(1,minutes));
});
