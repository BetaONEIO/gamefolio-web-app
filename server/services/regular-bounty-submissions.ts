import { sql } from 'drizzle-orm';

/** Access changes replace discovery instances, but keep the same programme. */
export async function hasRegularBountySubmission(
  executor: { execute: (query: ReturnType<typeof sql>) => Promise<unknown> },
  instanceId: number,
  userId: number,
  contentType: string,
  allowRequestedChanges = false,
): Promise<boolean> {
  const result: any = await executor.execute(sql`
    SELECT 1 FROM campaign_bounty_submissions s
    JOIN campaign_instances origin ON origin.id = s.instance_id
    JOIN campaign_instances current_bounty ON current_bounty.id = ${instanceId}
    WHERE s.participant_id = ${userId} AND s.content_type = ${contentType}
      AND (s.instance_id = current_bounty.id OR (
        origin.confirmed_terms->>'model' = 'discovery-v2'
        AND origin.confirmed_terms->>'programmeId' = current_bounty.confirmed_terms->>'programmeId'
        AND COALESCE(origin.billing_period_start, date_trunc('month', s.submitted_at)) =
          COALESCE(current_bounty.billing_period_start, date_trunc('month', NOW() AT TIME ZONE 'UTC'))
      ))
      AND NOT (${allowRequestedChanges} AND EXISTS (
        SELECT 1 FROM campaign_bounty_submissions revision
        WHERE revision.instance_id = current_bounty.id AND revision.participant_id = s.participant_id
          AND revision.content_type = s.content_type AND revision.status = 'changes_requested'
          AND NOT EXISTS (SELECT 1 FROM campaign_bounty_submissions replacement WHERE replacement.supersedes_submission_id = revision.id)
      ))
    LIMIT 1
  `);
  return (result.rows ?? result).length > 0;
}
