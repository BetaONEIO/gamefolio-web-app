import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateCampaignThanks,canEditCampaignThanks,THANKS_EDIT_WINDOW_MS} from '../shared/campaign-thanks';
test('private thanks reject empty, non-string and oversized messages',()=>{
 assert.equal(validateCampaignThanks(' Thanks! '),'Thanks!');
 assert.equal(validateCampaignThanks('a'.repeat(300)).length,300);
 for(const value of ['', '  ',null,{},'a'.repeat(301)])assert.throws(()=>validateCampaignThanks(value));
});
test('editing expires exactly 15 minutes after original creation',()=>{
 const created=Date.parse('2026-10-04T12:00:00Z');
 assert.equal(canEditCampaignThanks(new Date(created),created+THANKS_EDIT_WINDOW_MS-1),true);
 assert.equal(canEditCampaignThanks(new Date(created),created+THANKS_EDIT_WINDOW_MS),false);
 assert.equal(canEditCampaignThanks('invalid',created),false);
 assert.equal(canEditCampaignThanks(new Date(created),created-1),false);
});
