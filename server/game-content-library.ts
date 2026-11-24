import {approvedLibrarySubmission,bountyGamePageRights,libraryPublicationState} from '@shared/game-content-library';
import {db} from './db';
import {sql} from 'drizzle-orm';
import {ensureCampaignManagement,campaignRecords} from './campaign-management';
const rows=(r:any)=>r.rows??r;
let ready:Promise<void>|null=null;
export async function ensureGameLibrary(){if(!ready)ready=(async()=>{await ensureCampaignManagement();await db.execute(sql`CREATE TABLE IF NOT EXISTS game_content_library_settings (
 game_profile_id INTEGER NOT NULL REFERENCES indie_game_profiles(id), item_key TEXT NOT NULL,
 publication_status TEXT NOT NULL DEFAULT 'private', featured BOOLEAN NOT NULL DEFAULT false,
 collection TEXT, deleted_at TIMESTAMPTZ, updated_by INTEGER REFERENCES users(id),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 PRIMARY KEY(game_profile_id,item_key))`);await db.execute(sql`ALTER TABLE campaign_participants ADD COLUMN IF NOT EXISTS usage_rights_acceptance JSONB`);})().catch(e=>{ready=null;throw e;});await ready;}
export async function gameLibrary(ownerId:number,profileId?:number){
 await ensureGameLibrary();const [profile]=rows(await db.execute(sql`SELECT id,catalog_game_id,game_name FROM indie_game_profiles WHERE user_id=${ownerId} ${profileId?sql`AND id=${profileId}`:sql``} ORDER BY is_primary DESC,id DESC LIMIT 1`));if(!profile)throw Object.assign(new Error('Game not found'),{status:404});
 const settings=rows(await db.execute(sql`SELECT * FROM game_content_library_settings WHERE game_profile_id=${profile.id}`));
 const studio=rows(await db.execute(sql`SELECT 'clip-'||c.id AS key,c.id AS asset_id,c.title,c.description,c.video_type AS content_type,c.video_url,c.thumbnail_url,NULL::text AS image_url,c.duration,c.created_at,c.user_id AS creator_id,u.username,u.avatar_url FROM clips c JOIN users u ON u.id=c.user_id WHERE c.user_id=${ownerId} AND c.game_id=${profile.catalog_game_id} AND c.status='ready' AND NOT c.campaign_upload
 UNION ALL SELECT 'screenshot-'||s.id,s.id,s.title,s.description,'screenshot',NULL,s.thumbnail_url,s.image_url,NULL,s.created_at,s.user_id,u.username,u.avatar_url FROM screenshots s JOIN users u ON u.id=s.user_id WHERE s.user_id=${ownerId} AND s.game_id=${profile.catalog_game_id} AND NOT s.campaign_upload ORDER BY created_at DESC`));
 const campaigns=rows(await db.execute(sql`SELECT id FROM campaign_instances WHERE developer_user_id=${ownerId} AND game_id=${profile.catalog_game_id}`));const items:any[]=[];const campaignAssets=new Set<string>();
 for(const campaign of campaigns){const data=await campaignRecords(db,campaign.id);if(!data)continue;const reported=rows(await db.execute(sql`SELECT creator_id FROM campaign_submission_problems WHERE campaign_id=${campaign.id} AND status='pending'`));
  for(const s of data.submissions){if(s.clip_id||s.reel_id)campaignAssets.add(`clip-${s.clip_id??s.reel_id}`);if(s.screenshot_id)campaignAssets.add(`screenshot-${s.screenshot_id}`);
   if(!approvedLibrarySubmission(s,data.submissions,reported.map((r:any)=>Number(r.creator_id))))continue;
   const p=data.participants.find((p:any)=>Number(p.user_id)===Number(s.participant_id));if(!p)continue;items.push({...s,key:`submission-${s.id}`,source:'campaign',title:s.media_title??data.objectives.find((o:any)=>o.id===s.bounty_id)?.title??s.content_type,creator_id:s.participant_id,participation_id:p?.id,avatar_url:p?.avatar_url,campaign_id:campaign.id,campaign_title:data.campaign.campaign_title??data.campaign.template_name,approval_date:s.reviewed_at,approving_developer:s.reviewed_by_user_id,asset_id:s.clip_id??s.reel_id??s.screenshot_id,objective:data.objectives.find((o:any)=>o.id===s.bounty_id)?.title,rights:bountyGamePageRights(s.game_page_rights)??p?.usage_rights_acceptance??null,moderation_status:'clear'});
  }
 }
 items.push(...studio.filter((s:any)=>!campaignAssets.has(s.key)).map((s:any)=>({...s,source:'studio',status:'approved'})));
 return {profile,items:items.map(item=>{const state=settings.find((s:any)=>s.item_key===item.key);return {...item,...libraryPublicationState(item.source,state)};}).filter(item=>!item.deleted_at)};
}
/** Called in the transaction that approves the creator's submission. */
export async function publishApprovedBountyMedia(tx: Pick<typeof db, 'execute'>, campaignId: number, submissions: any[], reviewerId: number) {
 const approvedIds = submissions.filter(submission =>
   ['clip', 'reel', 'screenshot'].includes(submission.content_type) && bountyGamePageRights(submission.game_page_rights)
 ).map(submission => Number(submission.id));
 if (!approvedIds.length) return;

 await tx.execute(sql`
   INSERT INTO game_content_library_settings (game_profile_id, item_key, publication_status, updated_by)
   SELECT profile.id, 'submission-' || s.id, 'published', ${reviewerId}
   FROM campaign_bounty_submissions s
   JOIN campaign_instances ci ON ci.id = s.instance_id
   JOIN users creator ON creator.id = s.participant_id
   JOIN LATERAL (
     SELECT id FROM indie_game_profiles
     WHERE catalog_game_id = ci.game_id AND user_id = ci.developer_user_id
     ORDER BY is_primary DESC, id DESC LIMIT 1
   ) profile ON true
   WHERE s.instance_id = ${campaignId} AND s.id IN (${sql.join(approvedIds.map(id => sql`${id}`), sql`, `)})
     AND s.status = 'approved' AND creator.status = 'active' AND COALESCE(creator.is_private, false) = false
     AND (
       EXISTS (SELECT 1 FROM clips media WHERE media.id = COALESCE(s.clip_id, s.reel_id)
         AND media.user_id = s.participant_id AND media.game_id = ci.game_id
         AND COALESCE(media.video_type, 'clip') = s.content_type AND media.age_restricted = false)
       OR EXISTS (SELECT 1 FROM screenshots media WHERE s.content_type = 'screenshot' AND media.id = s.screenshot_id
         AND media.user_id = s.participant_id AND media.game_id = ci.game_id AND media.age_restricted = false)
     )
     AND NOT EXISTS (SELECT 1 FROM campaign_bounty_submissions newer WHERE newer.supersedes_submission_id = s.id)
     AND NOT EXISTS (
       SELECT 1 FROM campaign_submission_problems report
       WHERE report.campaign_id = s.instance_id AND report.creator_id = s.participant_id AND report.status = 'pending'
     )
   ON CONFLICT (game_profile_id, item_key) DO NOTHING
 `);
}

/** Publication is scoped to the game's page, not ownership of the original media. */
export async function visibleGameAssets<T extends { id: number; campaignUpload?: boolean }>(
 gameId: number, type: 'clip' | 'screenshot', assets: T[],
) {
 if (!assets.length) return [];
 await ensureGameLibrary();
 const settings = rows(await db.execute(sql`
   SELECT m.item_key,m.publication_status,m.featured,m.deleted_at
   FROM game_content_library_settings m JOIN indie_game_profiles p ON p.id=m.game_profile_id
   WHERE p.catalog_game_id=${gameId} AND m.item_key LIKE ${`${type}-%`}
 `));
 const submissions = rows(await db.execute(sql`
   SELECT s.id,s.status,${type === 'clip' ? sql`COALESCE(s.clip_id,s.reel_id)` : sql`s.screenshot_id`} AS asset_id,
     u.is_private,u.status AS creator_status,m.featured,
     m.publication_status='published' AND m.deleted_at IS NULL AS publicly_listed,
     EXISTS(SELECT 1 FROM campaign_submission_problems r
       WHERE r.campaign_id=s.instance_id AND r.creator_id=s.participant_id AND r.status='pending') AS reported,
     EXISTS(SELECT 1 FROM campaign_bounty_submissions n WHERE n.supersedes_submission_id=s.id) AS superseded
   FROM campaign_bounty_submissions s JOIN campaign_instances ci ON ci.id=s.instance_id
   JOIN users u ON u.id=s.participant_id
   LEFT JOIN LATERAL (
     SELECT settings.publication_status, settings.deleted_at, settings.featured
     FROM game_content_library_settings settings JOIN indie_game_profiles profile ON profile.id=settings.game_profile_id
     WHERE profile.catalog_game_id=ci.game_id AND profile.user_id=ci.developer_user_id AND settings.item_key='submission-' || s.id
     ORDER BY profile.is_primary DESC, profile.id DESC LIMIT 1
   ) m ON true
   WHERE ci.game_id=${gameId}
     AND ${type === 'clip' ? sql`COALESCE(s.clip_id,s.reel_id)` : sql`s.screenshot_id`}
       IN (${sql.join(assets.map(asset => sql`${asset.id}`), sql`, `)})
 `));
 const settingsByKey = new Map<string, any>(
   settings.map((setting: any) => [setting.item_key, setting]),
 );
 const attached = new Set<number>();
 const published = new Map<number, boolean>();
 for (const submission of submissions) {
   const assetId = Number(submission.asset_id);
   attached.add(assetId);
   if (submission.status === 'approved' && !submission.reported && !submission.superseded &&
       !submission.is_private && submission.creator_status === 'active' &&
       submission.publicly_listed) {
     published.set(assetId, published.get(assetId) || Boolean(submission.featured));
   }
 }
 return assets.flatMap(asset => {
   if (asset.campaignUpload || attached.has(asset.id)) {
     return published.has(asset.id) ? [{ ...asset, featured: Boolean(published.get(asset.id)) }] : [];
   }
   const setting = settingsByKey.get(`${type}-${asset.id}`);
   return !setting || (setting.publication_status === 'published' && !setting.deleted_at)
     ? [{ ...asset, featured: Boolean(setting?.featured) }] : [];
 }).sort((a,b)=>Number(b.featured)-Number(a.featured));
}

/** Restrict signing for campaign originals and studio media marked private. Other public media keeps its existing policy. */
export async function canReadGameLibraryMedia(url:string,userId?:number){
 const {supabaseStorage}=await import('./supabase-storage');const info=supabaseStorage.extractStorageInfo(url);if(!info)return true;await ensureGameLibrary();const suffix=`/${info.bucket}/${info.path}`;
 const match=(column:any)=>sql`RIGHT(SPLIT_PART(${column},'?',1),${suffix.length})=${suffix}`;
 const assets=rows(await db.execute(sql`SELECT id,user_id,game_id,campaign_upload,'clip' AS kind FROM clips WHERE ${match(sql`video_url`)} OR ${match(sql`thumbnail_url`)} UNION ALL SELECT id,user_id,game_id,campaign_upload,'screenshot' AS kind FROM screenshots WHERE ${match(sql`image_url`)} OR ${match(sql`thumbnail_url`)}`));
 for(const asset of assets){if(Number(asset.user_id)===Number(userId))continue;
  const submissions=rows(await db.execute(sql`SELECT s.id,s.status,s.participant_id,s.supersedes_submission_id,ci.developer_user_id,ci.game_id,u.is_private,u.status AS creator_status,EXISTS(SELECT 1 FROM campaign_bounty_submissions n WHERE n.supersedes_submission_id=s.id) AS superseded,EXISTS(SELECT 1 FROM campaign_submission_problems r WHERE r.campaign_id=s.instance_id AND r.creator_id=s.participant_id AND r.status='pending') AS reported FROM campaign_bounty_submissions s JOIN campaign_instances ci ON ci.id=s.instance_id JOIN users u ON u.id=s.participant_id WHERE ${asset.kind==='clip'?sql`COALESCE(s.clip_id,s.reel_id)=${asset.id}`:sql`s.screenshot_id=${asset.id}`}`));
  if(submissions.length){if(submissions.some((s:any)=>Number(s.developer_user_id)===Number(userId)||Number(s.participant_id)===Number(userId)))continue;const ids=submissions.filter((s:any)=>s.status==='approved'&&!s.superseded&&!s.reported&&!s.is_private&&s.creator_status==='active').map((s:any)=>`submission-${s.id}`);if(!ids.length)return false;const [published]=rows(await db.execute(sql`SELECT 1 FROM game_content_library_settings m JOIN indie_game_profiles p ON p.id=m.game_profile_id WHERE p.catalog_game_id=${asset.game_id} AND m.item_key=ANY(ARRAY[${sql.join(ids.map((id:string)=>sql`${id}`),sql`, `)}]::text[]) AND m.publication_status='published' AND m.deleted_at IS NULL`));if(!published)return false;}
  else if(asset.campaign_upload)return false;
  else {const [privateItem]=rows(await db.execute(sql`SELECT 1 FROM game_content_library_settings m JOIN indie_game_profiles p ON p.id=m.game_profile_id WHERE p.catalog_game_id=${asset.game_id} AND m.item_key=${`${asset.kind}-${asset.id}`} AND (m.publication_status='private' OR m.deleted_at IS NOT NULL)`));if(privateItem)return false;}
 }
 return true;
}
