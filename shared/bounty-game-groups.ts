/** Group only always-on opportunities belonging to the same developer and game.
 * Saved instances remain separate so requirements, approval, keys and XP keep their identity. */
export function discoveryGameKey(campaign:any):string|null {
  const game=Number(campaign?.game_id),owner=Number(campaign?.developer_user_id);
  return campaign?.included_discovery&&Number.isSafeInteger(game)&&game>0&&Number.isSafeInteger(owner)&&owner>0?`${owner}:${game}`:null;
}
export function bountyInstanceId(campaign:any):number {return Number(campaign?.instance_id??campaign?.id);}
export function discoveryGameOpportunities(campaigns:any[],selected:any):any[] {
  const key=discoveryGameKey(selected);
  if(!key)return [selected];
  const byId=new Map<number,any>();
  for(const campaign of [...campaigns,selected])if(discoveryGameKey(campaign)===key&&bountyInstanceId(campaign)>0){
    const id=bountyInstanceId(campaign),old=byId.get(id);
    byId.set(id,{...old,...campaign,id,instance_id:id,bounties:campaign.bounties??old?.bounties??[]});
  }
  return Array.from(byId.values()).sort((a,b)=>bountyInstanceId(a)-bountyInstanceId(b));
}
export function groupDiscoveryGames(campaigns:any[]):any[] {
  const groups=new Map<string,any[]>();
  for(const campaign of campaigns){const key=discoveryGameKey(campaign);if(key)groups.set(key,[...(groups.get(key)??[]),campaign]);}
  const emitted=new Set<string>();
  return campaigns.flatMap(campaign=>{
    const key=discoveryGameKey(campaign);if(!key)return [campaign];
    if(emitted.has(key))return [];emitted.add(key);
    const opportunities=groups.get(key)!;
    return [{...campaign,discovery_opportunities:opportunities,campaign_title:campaign.catalog_game_name??campaign.game_profile_name??campaign.game_name,bounties:opportunities.flatMap(c=>c.bounties??[]),total_campaign_xp:Math.max(0,...opportunities.map(c=>Number(c.total_campaign_xp??0))),participant_count:Math.max(0,...opportunities.map(c=>Number(c.participant_count??0)))}];
  });
}
export function bountyXpLabel(campaign:any):string {
  const opportunities=campaign.discovery_opportunities;
  if(!opportunities)return `${Number(campaign.total_campaign_xp??0).toLocaleString()} Bounty XP Reward`;
  const xp=opportunities.map((c:any)=>Number(c.total_campaign_xp??0)).filter((n:number)=>Number.isFinite(n)&&n>0);
  if(!xp.length)return 'Rewards shown for each content type';
  const low=Math.min(...xp),high=Math.max(...xp);
  return `${low.toLocaleString()}${low===high?'':`–${high.toLocaleString()}`} XP per approved bounty`;
}
export function otherActiveGameOpportunity(joined:any[],selected:any):any|undefined {
  const key=discoveryGameKey(selected);
  if(!key)return undefined;
  const terminal=['expired','cancelled','rejected','withdrawn','removed','completed','completed_and_verified','full_game_awarded'];
  return joined.find(c=>discoveryGameKey(c)===key&&bountyInstanceId(c)!==bountyInstanceId(selected)&&c.participant_status&&!terminal.includes(c.participant_status));
}
