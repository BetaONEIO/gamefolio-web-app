export const CONTENT_SECTIONS = [
  {id:'streams',title:'Streams',types:['stream','livestream'],empty:'No streams have been submitted yet.'},
  {id:'clips',title:'Clips & Reels',types:['clip','reel'],empty:'No clips or reels have been submitted yet.'},
  {id:'screenshots',title:'Screenshots',types:['screenshot'],empty:'No screenshots have been submitted yet.'},
  {id:'reviews',title:'Reviews & Feedback',types:['review','feedback','bug'],empty:'No reviews or feedback have been submitted yet.'},
];
export const submissionTypeLabel=(type:string)=>({clip:'Gameplay clip',reel:'Vertical reel',screenshot:'Screenshot',review:'Creator review',feedback:'Creator feedback',stream:'Livestream',livestream:'Livestream',bug:'Bug report'}[type]??type.replaceAll('_',' '));
export function submissionReviewStatus(status:string) {
  return ['pending','under_review','awaiting_review'].includes(status)?'awaiting_review':status;
}
export function currentCampaignSubmissions(submissions:any[]) {
  const superseded=new Set(submissions.map(s=>Number(s.supersedes_submission_id)).filter(Boolean));
  return submissions.filter(s=>!superseded.has(Number(s.id)));
}
export function campaignContentSections(objectives:any[],submissions:any[]) {
  const types=new Set([...objectives.filter(o=>Number(o.quantity)>0).map(o=>o.content_type??o.type),...submissions.map(s=>s.content_type)]);
  return CONTENT_SECTIONS.filter(section=>section.types.some(type=>types.has(type)));
}
export function filterCampaignContent(items:any[],status:string,creator:string,sort:string) {
  return items.filter(s=>(status==='all'||(status==='reported'?s.reported:submissionReviewStatus(s.status)===status))&&(creator==='all'||String(s.participant_id)===creator)).sort((a,b)=>{
    const date=(v:any)=>{const d=Date.parse(v??'');return Number.isFinite(d)?d:0;};
    return (date(b.submitted_at)-date(a.submitted_at)||Number(b.id)-Number(a.id))*(sort==='oldest'?-1:1);
  });
}
