import test from 'node:test';
import assert from 'node:assert/strict';
import {currentCampaignSubmissions,campaignContentSections,filterCampaignContent,submissionReviewStatus} from '../shared/campaign-content-view';
const objectives=[{content_type:'clip',quantity:2},{content_type:'reel',quantity:1},{content_type:'screenshot',quantity:1},{content_type:'feedback',quantity:1}];
test('standard campaign shows required sections even before submissions arrive',()=>{
 assert.deepEqual(campaignContentSections(objectives,[]).map(s=>s.title),['Clips & Reels','Screenshots','Reviews & Feedback']);
 assert.equal(campaignContentSections([{content_type:'review',quantity:0}],[]).length,0);
});
test('stream objectives lead mixed campaigns without hiding other deliverables',()=>{
 assert.deepEqual(campaignContentSections([...objectives,{content_type:'stream',quantity:1}],[]).map(s=>s.title),['Streams','Clips & Reels','Screenshots','Reviews & Feedback']);
 assert.deepEqual(campaignContentSections([{type:'livestream',quantity:1}],[]).map(s=>s.title),['Streams']);
});
test('latest revisions count once; old submissions remain available separately for history',()=>{
 const original=[{id:1},{id:2,supersedes_submission_id:1},{id:3,supersedes_submission_id:2},{id:4}];
 assert.deepEqual(currentCampaignSubmissions(original).map(s=>s.id),[3,4]);assert.equal(original.length,4);
});
test('status aliases, creator filtering, reports and stable date sorting use recorded data',()=>{
 const submissions=[{id:1,participant_id:7,status:'pending',submitted_at:'2026-10-01'}, {id:2,participant_id:8,status:'approved',reported:true,submitted_at:'2026-10-02'}, {id:3,participant_id:7,status:'under_review',submitted_at:'2026-10-03'}];
 assert.deepEqual(filterCampaignContent(submissions,'awaiting_review','7','newest').map(s=>s.id),[3,1]);
 assert.deepEqual(filterCampaignContent(submissions,'all','all','oldest').map(s=>s.id),[1,2,3]);
 assert.deepEqual(filterCampaignContent(submissions,'reported','all','newest').map(s=>s.id),[2]);
 assert.equal(submissionReviewStatus('changes_requested'),'changes_requested');assert.equal(submissionReviewStatus('approved'),'approved');
 assert.deepEqual(submissions.map(s=>s.id),[1,2,3]);
});
