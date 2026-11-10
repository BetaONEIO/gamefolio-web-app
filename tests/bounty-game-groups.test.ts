import test from 'node:test';
import assert from 'node:assert/strict';
import {discoveryGameKey,discoveryGameOpportunities,groupDiscoveryGames,bountyXpLabel,bountyInstanceId} from '../shared/bounty-game-groups';
const clip={id:39,game_id:4826,developer_user_id:318,included_discovery:true,game_name:'Skybound Drift',total_campaign_xp:1500,bounties:[{id:10,content_type:'clip',quantity:1}]};
const stream={...clip,id:44,total_campaign_xp:5500,bounties:[{id:11,content_type:'stream',quantity:1}]};
test('one game listing includes each offered type without merging reward or submission identities',()=>{
 const grouped=groupDiscoveryGames([clip,stream]);assert.equal(grouped.length,1);
 assert.equal(grouped[0].campaign_title,'Skybound Drift');
 assert.deepEqual(grouped[0].discovery_opportunities.map((c:any)=>c.id),[39,44]);
 assert.deepEqual(grouped[0].bounties.map((b:any)=>b.id),[10,11]);
 assert.equal(bountyXpLabel(grouped[0]),'1,500–5,500 XP per approved bounty');
 assert.equal(clip.total_campaign_xp,1500);assert.equal(stream.bounties[0].content_type,'stream');
});
test('paid campaigns, different developers, games and unowned records cannot be folded together',()=>{
 const paid={...clip,id:50,included_discovery:false};
 const otherOwner={...stream,id:60,developer_user_id:319};
 const otherGame={...stream,id:61,game_id:4827};
 const unknown={...stream,id:62,developer_user_id:undefined};
 assert.equal(groupDiscoveryGames([clip,stream,paid,otherOwner,otherGame,unknown]).length,5);
 assert.equal(discoveryGameKey(unknown),null);assert.equal(discoveryGameKey(paid),null);
 assert.equal(bountyXpLabel(clip),'1,500 Bounty XP Reward');
});
test('joined work and deep links resolve to the original instance with its saved terms',()=>{
 const joined={...clip,id:1000,instance_id:39,participant_status:'in_progress',deadline:'2026-11-11',bounties:[{id:10,content_type:'clip',quantity:1,staged_count:1}]};
 const previous={...stream,id:30,instance_id:30,participant_status:'completed'};
 const siblings=discoveryGameOpportunities([clip,stream,joined,previous],joined);
 assert.equal(siblings.length,3);
 assert.equal(bountyInstanceId(joined),39);
 const own=siblings.find(c=>bountyInstanceId(c)===39)!;
 assert.equal(own.deadline,'2026-11-11');assert.equal(own.bounties[0].staged_count,1);
 assert.equal(siblings.find(c=>c.id===44).bounties[0].content_type,'stream');
 assert.equal(discoveryGameOpportunities([clip,stream],{...clip,included_discovery:false}).length,1);
});
test('existing active participation stays scoped to the game and blocks only additional claims',async()=>{
 const {otherActiveGameOpportunity}=await import('../shared/bounty-game-groups');
 const joined={...clip,instance_id:39,participant_status:'submitted_for_review'};
 assert.equal(bountyInstanceId(otherActiveGameOpportunity([joined],stream)),39);
 assert.equal(otherActiveGameOpportunity([joined],clip),undefined);
 assert.equal(otherActiveGameOpportunity([{...joined,participant_status:'completed'}],stream),undefined);
 assert.equal(otherActiveGameOpportunity([{...joined,game_id:1}],stream),undefined);
});
