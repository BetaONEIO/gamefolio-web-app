import test from 'node:test';
import assert from 'node:assert/strict';
import {creatorJourneyGuidance as guidance} from '../shared/campaign-journey-guidance';
const base={status:'in_progress',expired:false,accessRequired:false,ready:false,staged:false,remaining:2};
test('submitted and approved work stay valid after the upload deadline',()=>{
 assert.equal(guidance({...base,status:'under_review',expired:true}).title,'Awaiting developer review');
 assert.equal(guidance({...base,status:'completed',expired:true}).title,'All required work approved');
});
test('drafts and submitted work have different next actions',()=>{
 assert.equal(guidance({...base,ready:true,staged:true}).title,'Submit your work for approval');
 assert.equal(guidance({...base,ready:true,staged:false}).title,'Your required work is submitted');
});
test('access and requested changes take priority over new content',()=>{
 assert.equal(guidance({...base,accessRequired:true,nextObjective:'Stream for one hour'}).title,'Get your game access');
 assert.equal(guidance({...base,status:'changes_requested',ready:true,accessRequired:true}).title,'Update the requested items');
});
test('remaining objective and expired deadline guidance',()=>{
 assert.equal(guidance({...base,nextObjective:'Upload your VOD'}).title,'Next: Upload your VOD');
 assert.equal(guidance({...base,expired:true}).title,'Your submission deadline has passed');
});
