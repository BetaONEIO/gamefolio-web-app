import test from 'node:test';
import assert from 'node:assert/strict';
import {campaignFileError} from '../client/src/components/bounties/CampaignFileDropzone';
import { bountyVideoDimensionError, videoDisplayDimensions } from '../shared/bounty-video-dimensions';
const file=(name:string,type:string,size=1024)=>({name,type,size});
test('media fields keep clips/reels and screenshots in their correct file families',()=>{
 assert.equal(campaignFileError(file('clip.mp4','video/mp4'),'clip',20),null);
 assert.equal(campaignFileError(file('reel.mov','video/quicktime'),'reel',20),null);
 assert.equal(campaignFileError(file('shot.webp','image/webp'),'screenshot',20),null);
 assert.match(campaignFileError(file('shot.jpg','image/jpeg'),'clip',20)!,/video/);
 assert.match(campaignFileError(file('clip.mp4','video/mp4'),'screenshot',20)!,/image/);
 assert.match(campaignFileError(file('fake.png','application/pdf'),'screenshot',20)!,/image/);
});
test('empty files, unknown formats and actual upload limits are rejected',()=>{
 assert.match(campaignFileError(file('clip.mp4','video/mp4',0),'clip',20)!,/empty/);
 assert.match(campaignFileError(file('clip.mp4','video/mp4',21*1024*1024),'clip',20)!,/20MB/);
 assert.equal(campaignFileError(file('clip.mp4','video/mp4',20*1024*1024),'clip',20),null);
 assert.equal(campaignFileError(file('shot.PNG',''),'screenshot',20),null);
 assert.match(campaignFileError(file('notes.txt',''),'clip')!,/video/);
 assert.match(campaignFileError(file('review.txt','text/plain'),'review')!,/does not accept/);
});

test('bounty clips accept horizontal video and reels accept vertical video', () => {
  assert.equal(bountyVideoDimensionError('clip', 1440, 1080), null);
  assert.equal(bountyVideoDimensionError('reel', 1080, 1350), null);
  assert.match(bountyVideoDimensionError('clip', 1080, 1920)!, /vertical \(1080 × 1920\).*use this one for a Reel/);
  assert.match(bountyVideoDimensionError('reel', 1920, 1080)!, /horizontal \(1920 × 1080\).*use this one for a Gameplay Clip/);
  assert.match(bountyVideoDimensionError('reel', 1080, 1080)!, /square/);
  assert.match(bountyVideoDimensionError('clip', 1080, 1080)!, /square/);
  assert.match(bountyVideoDimensionError('clip', 0, 0)!, /read the video dimensions/);
});

test('server validation uses display dimensions for rotated and non-square pixels', () => {
  assert.deepEqual(videoDisplayDimensions(1920, 1080, '1:1', -90), { width: 1080, height: 1920 });
  assert.deepEqual(videoDisplayDimensions(720, 576, '16:15', 180), { width: 768, height: 576 });
  assert.deepEqual(videoDisplayDimensions(1920, 1080, 'N/A'), { width: 1920, height: 1080 });
});
