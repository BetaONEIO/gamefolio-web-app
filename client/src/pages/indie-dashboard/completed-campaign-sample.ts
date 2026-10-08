import { campaignMetrics } from '@shared/campaign-management';
export const COMPLETED_SAMPLE_ID = 2147483647;
export function completedCampaignSample(profileGameId?:number) {
  const campaign = {id:COMPLETED_SAMPLE_ID,profile_game_id:profileGameId,campaign_title:'Completed Content Boost · Sample',game_name:'Sample indie game',template_name:'Content Boost',template_slug:'content-boost',status:'completed',completed_at:'2026-09-15T12:00:00Z',max_places:2,actual_start:'2026-09-01T12:00:00Z',end_date:'2026-09-15T12:00:00Z',creator_deadline_days:14,application_period_days:14,access_method:'free_to_play',requires_access_key:false,bounty_xp_reward:3000,amount_paid:2500,budget_pence:2500,commercial_type:'paid',payment_status:'fulfilled',payment_reference:'local-sample-only',description:'Local testing fixture. All creators, content and results are sample data.'};
  const objectives = [{id:9101,title:'Gameplay clip',content_type:'clip',quantity:1},{id:9102,title:'Screenshot',content_type:'screenshot',quantity:1},{id:9103,title:'Creator feedback',content_type:'feedback',quantity:1}];
  const participants = ['PixelPilot','IndieExplorer'].map((username,i)=>({id:9201+i,user_id:9301+i,username,sample_profile_username:['xxtowerdogxx','gothicskullmum'][i],status:'completed_and_verified',completed_at:'2026-09-09T12:00:00Z',joined_at:'2026-09-02T12:00:00Z'}));
  const submissions = participants.flatMap((p,i)=>objectives.map((o,j)=>({id:9400+i*3+j,participant_id:p.user_id,bounty_id:o.id,content_type:o.content_type,status:'approved',slot_index:0,submitted_at:'2026-09-08T12:00:00Z',reviewed_at:'2026-09-09T12:00:00Z',review_notes:'Sample approval: requirements met.',media_title:`${p.username} · Sample ${o.title}`,video_url:o.content_type==='clip'?'/attached_assets/gamer.mp4':null,image_url:o.content_type==='screenshot'?'/assets/campaign-test-screenshot.svg':null,content_data:o.content_type==='feedback'?{text:i?'Enjoyed the core loop. The tutorial could explain the controls more clearly.':'Strong atmosphere and responsive movement. More difficulty options would help accessibility.'}:null,views:o.content_type==='clip'?120+i*85:0})));
  const rewards = participants.map(p=>({id:p.id,participant_id:p.id,reward_type:'completion',status:'awarded',amount:3000,updated_at:'2026-09-09T12:00:00Z'}));
  return {campaign,participants,objectives,submissions,rewards,keys:[],can_cancel:false,metrics:campaignMetrics(campaign,participants,submissions,[],rewards,objectives),timeline:[{type:'campaign_created',at:campaign.actual_start,detail:'Sample campaign created'},{type:'content_approved',at:'2026-09-09T12:00:00Z',detail:'Six sample submissions approved'},{type:'campaign_completed',at:campaign.end_date,detail:'All creator requirements completed'}]};
}

/** Development fixtures only: callers must gate these behind import.meta.env.DEV. */
export function campaignSamples(profileGameId?: number) {
  const completed = completedCampaignSample(profileGameId);
  const scenarios = [
    {title:'Scheduled launch', status:'scheduled', stage:'scheduled'},
    {title:'Recruiting creators', status:'live', stage:'recruiting'},
    {title:'Creators working', status:'live', stage:'working'},
    {title:'Content awaiting approval', status:'under_review', stage:'review'},
    {title:'Changes requested', status:'live', stage:'changes'},
    {title:'Rewards processing', status:'under_review', stage:'rewards'},
    {title:'Cancelled launch', status:'cancelled', stage:'cancelled'},
  ];
  return [completed, ...scenarios.map((scenario, index) => {
    const data = structuredClone(completed) as any;
    const campaign = data.campaign;
    campaign.id = COMPLETED_SAMPLE_ID - index - 1;
    campaign.campaign_title = `${scenario.title} · Sample`;
    campaign.status = scenario.status;
    campaign.completed_at = null;
    campaign.actual_start = scenario.stage === 'scheduled' ? '2026-10-15T12:00:00Z' : '2026-10-01T12:00:00Z';
    campaign.end_date = '2026-10-29T12:00:00Z';
    campaign.max_places = 5;
    data.can_cancel = false;
    data.timeline = [{type:'campaign_created', at:'2026-10-01T12:00:00Z', detail:'Fictional campaign for local testing'}];
    if (['scheduled','recruiting'].includes(scenario.stage)) {
      data.participants = []; data.submissions = []; data.rewards = [];
    } else if (scenario.stage === 'working') {
      data.participants.forEach((p:any) => {p.status='in_progress'; p.completed_at=null;});
      data.submissions = []; data.rewards = [];
    } else if (['review','changes'].includes(scenario.stage)) {
      data.participants.forEach((p:any) => {p.status=scenario.stage==='review'?'submitted_for_review':'changes_requested'; p.completed_at=null;});
      data.submissions.forEach((s:any, i:number) => {
        s.submitted_at='2026-10-03T12:00:00Z';
        s.status=scenario.stage==='review'?'under_review':i%3===0?'rejected':'approved';
        s.reviewed_at=s.status==='under_review'?null:'2026-10-04T12:00:00Z';
        s.review_notes=s.status==='rejected'?'Please include a longer gameplay segment showing the required objective.':null;
      });
      data.rewards=[];
    } else if (scenario.stage === 'rewards') {
      data.participants.forEach((p:any) => {p.completed_at='2026-10-04T12:00:00Z';});
      data.rewards.forEach((r:any) => {r.status='pending';});
    } else if (scenario.stage === 'cancelled') {
      campaign.cancelled_at='2026-10-04T12:00:00Z';
      campaign.cancellation_reason='Sample launch postponed by the developer.';
      data.participants.forEach((p:any) => {p.status='cancelled';p.completed_at=null;});
      data.submissions=[]; data.rewards=[];
      data.timeline.push({type:'campaign_cancelled',at:campaign.cancelled_at,detail:campaign.cancellation_reason});
    }
    data.metrics=campaignMetrics(campaign,data.participants,data.submissions,data.keys,data.rewards,data.objectives);
    return data;
  })];
}
export function isSampleCampaignId(id:number) {
  return Number.isInteger(id) && id <= COMPLETED_SAMPLE_ID && id >= COMPLETED_SAMPLE_ID - 7;
}
export function sampleCampaignById(id:number) {
  return campaignSamples().find(data=>data.campaign.id===id);
}
