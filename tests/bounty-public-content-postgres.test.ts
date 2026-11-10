import test from 'node:test';
import assert from 'node:assert/strict';
import { sql } from 'drizzle-orm';
import { db, pool } from '../server/db';
import { publicBountyContent } from '../server/bounty-public-content';
import { hasRegularBountySubmission } from '../server/services/regular-bounty-submissions';

// Every table is shadowed by a transaction-local TEMP table. Rollback leaves all real data intact.
test('public bounty gallery scopes to the game/owner and excludes private, unapproved and non-public work', async () => {
  const rollback = new Error('ROLLBACK_TEST_FIXTURE');
  try {
    await db.transaction(async tx => {
      await tx.execute(sql.raw(`
        CREATE TEMP TABLE campaign_instances(id int,game_id int,developer_user_id int,confirmed_terms jsonb,status text,actual_start timestamp) ON COMMIT DROP;
        CREATE TEMP TABLE users(id int,username text,display_name text,is_private bool,status text) ON COMMIT DROP;
        CREATE TEMP TABLE clips(id int,user_id int,game_id int,title text,video_url text,thumbnail_url text,video_type text,status text,age_restricted bool,duration int DEFAULT 25,trim_start int DEFAULT 2,trim_end int DEFAULT 19,views int DEFAULT 3,description text,pinned_at timestamp,share_code text,created_at timestamp) ON COMMIT DROP;
        CREATE TEMP TABLE screenshots(id int,user_id int,game_id int,title text,image_url text,age_restricted bool,views int DEFAULT 1,description text,pinned_at timestamp,share_code text,created_at timestamp) ON COMMIT DROP;
        CREATE TEMP TABLE campaign_bounty_submissions(id int,instance_id int,participant_id int,content_type text,clip_id int,reel_id int,screenshot_id int,status text,submitted_at timestamp,supersedes_submission_id int) ON COMMIT DROP;
        INSERT INTO campaign_instances VALUES (39,4,7,'{"model":"discovery-v2"}','live',NULL),(40,4,7,'{"model":"discovery-v2"}','live',NULL),(50,4,8,'{"model":"discovery-v2"}','live',NULL),(51,5,7,'{"model":"discovery-v2"}','live',NULL),(52,4,7,'{}','live',NULL),(53,4,7,'{}','draft',NULL);
        INSERT INTO users VALUES (1,'creator','Creator',false,'active'),(2,'private','Private',true,'active'),(3,'banned','Banned',false,'banned');
        INSERT INTO clips SELECT n,1,4,'Clip '||n,'https://example.test/'||n||'.mp4','https://example.test/'||n||'.jpg','clip','ready',false FROM generate_series(1,20) n;
        INSERT INTO screenshots VALUES (100,1,4,'Screenshot','https://example.test/screen.jpg',false);
        INSERT INTO campaign_bounty_submissions SELECT n,CASE WHEN n%2=0 THEN 39 ELSE 40 END,1,'clip',n,NULL,NULL,'approved',NOW(),NULL FROM generate_series(1,14) n;
        INSERT INTO campaign_bounty_submissions VALUES
          (21,50,1,'clip',15,NULL,NULL,'approved',NOW(),NULL),
          (22,51,1,'clip',16,NULL,NULL,'approved',NOW(),NULL),
          (23,52,1,'clip',17,NULL,NULL,'approved',NOW(),NULL),
          (24,39,1,'clip',18,NULL,NULL,'staged',NOW(),NULL),
          (25,39,1,'clip',19,NULL,NULL,'under_review',NOW(),NULL),
          (26,39,1,'feedback',NULL,NULL,NULL,'approved',NOW(),NULL),
          (27,39,1,'screenshot',NULL,NULL,100,'approved',NOW(),NULL),
          (28,39,2,'clip',1,NULL,NULL,'approved',NOW(),NULL),
          (29,39,3,'clip',1,NULL,NULL,'approved',NOW(),NULL),
          (30,39,1,'clip',20,NULL,NULL,'approved',NOW(),NULL);
        UPDATE clips SET age_restricted=true WHERE id=20;
      `));
      const first = await publicBountyContent(tx,39);
      assert.ok(first); assert.equal(first.items.length,12); assert.equal(first.items[0].id,27);
      assert.ok(first.items.every(item => [27,...Array.from({length:14},(_,i)=>i+1)].includes(item.id)));
      assert.equal(first.items.some(item=>item.content_type==='feedback'),false);
      assert.ok(first.nextCursor);
      const second = await publicBountyContent(tx,39,first.nextCursor!);
      assert.ok(second); assert.equal(second.items.length,3); assert.equal(second.nextCursor,null);
      assert.equal(new Set([...first.items,...second.items].map(item=>item.id)).size,15);
      assert.deepEqual(Object.keys(first.items[0]).sort(),['id','content_type','media_id','title','media_url','thumbnail_url','submitted_at','username','display_name','user_id','duration','views','description','pinned_at','share_code','created_at'].sort());
      assert.deepEqual([first.items[0].duration, first.items[0].views], [null, 1]);
      const video = first.items.find(item=>item.content_type==='clip');
      assert.deepEqual([video?.duration, video?.views, video?.user_id], [17, 3, 1]);
      const paid = await publicBountyContent(tx,52);
      assert.deepEqual(paid?.items.map(item=>item.id),[23]);
      assert.equal(await publicBountyContent(tx,53),null);
      assert.equal(await publicBountyContent(tx,999),null);
      // A new discovery instance retains the cap across versions of the same
      // programme, while a different creator, type or programme gets its own slot.
      await tx.execute(sql.raw(`
        UPDATE campaign_instances SET confirmed_terms = confirmed_terms || '{"programmeId": 2}'::jsonb WHERE id IN (39, 40);
        INSERT INTO campaign_instances VALUES
          (80,4,7,'{"model":"discovery-v2","programmeId":2}','live',NULL),
          (81,4,7,'{"model":"discovery-v2","programmeId":3}','live',NULL);
      `));
      assert.equal(await hasRegularBountySubmission(tx, 80, 1, 'clip'), true);
      assert.equal(await hasRegularBountySubmission(tx, 80, 99, 'clip'), false);
      assert.equal(await hasRegularBountySubmission(tx, 80, 1, 'reel'), false);
      assert.equal(await hasRegularBountySubmission(tx, 81, 1, 'clip'), false);
      await tx.execute(sql.raw("UPDATE campaign_bounty_submissions SET status='changes_requested' WHERE id=27"));
      assert.equal(await hasRegularBountySubmission(tx, 39, 1, 'screenshot'), true);
      assert.equal(await hasRegularBountySubmission(tx, 39, 1, 'screenshot', true), false);
      assert.equal(await hasRegularBountySubmission(tx, 80, 1, 'screenshot', true), true);
      // Ownership and readiness checks are also applied to the underlying media, not only the submission.
      await tx.execute(sql.raw("UPDATE users SET is_private=true WHERE id=1"));
      assert.deepEqual((await publicBountyContent(tx,39))?.items,[]);
      throw rollback;
    });
  } catch (error) { if (error !== rollback) throw error; }
  finally { await pool.end(); }
});
