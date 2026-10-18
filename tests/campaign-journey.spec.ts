import { expect, test, type BrowserContext, type Page } from "@playwright/test";

// Browser contract test: the real pages run in separate role contexts against an
// isolated, stateful API fixture. This does not replace the database-backed route
// tests; it catches client transitions, refetches, and payload regressions.
const CAMPAIGN = 920145;
// On Replit the system Chromium has its Nix libraries bundled, unlike the
// Playwright-downloaded build. CI can leave this unset and use its own browser.
test.use({
  launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE, args: ["--no-sandbox"] }
    : {},
});
test.setTimeout(120_000);
const CREATOR = 920146;
const PARTICIPANT = 920147;
const DEADLINE = "2030-01-01T00:00:00.000Z";
const objectives = [
  { id: 920148, title: "First impressions", content_type: "feedback", quantity: 1, completion_order: 1, mandatory: true },
  { id: 920149, title: "Two screenshots", content_type: "screenshot", quantity: 2, completion_order: 2, mandatory: true },
  { id: 920150, title: "Livestream", content_type: "stream", quantity: 1, completion_order: 3, mandatory: true },
];
const campaign = {
  id: CAMPAIGN, instance_id: CAMPAIGN, template_id: 920151,
  campaign_title: "Isolated Journey Campaign", template_name: "Isolated Journey Campaign",
  name: "Isolated Journey Campaign", game_name: "Fixture Game", game_id: 920152,
  status: "live", access_method: "demo_key", demo_keys_remaining: 1, max_places: 10, participant_count: 0,
  end_date: DEADLINE, creator_deadline_days: 10, bounty_xp_reward: 200,
  instance_bounty_xp_reward: 200, bounties: objectives,
};
type Submission = {
  id: number; bounty_id: number; slot_index: number; status: string;
  content_type: string; content_data?: { text: string }; content_url?: string;
  screenshot_id?: number; media_title?: string; review_notes?: string;
  submitted_at?: string; supersedes_submission_id?: number;
};

class CampaignFixture {
  joined = false;
  status = "joined";
  deadline = DEADLINE;
  joinCalls = 0;
  reservations = 0;
  awards = 0;
  reviews = 0;
  nextId = 1;
  drafts = new Map<string, string>();
  submissions: Submission[] = [];
  screenshots = [920160, 920161];
  reviewBodies: any[] = [];
  stageBodies: any[] = [];

  active(bountyId: number) {
    return this.submissions.filter(s => s.bounty_id === bountyId &&
      ["staged", "approved", "under_review"].includes(s.status));
  }
  progress() {
    const bounties = objectives.map(b => {
      const submissions = this.submissions.filter(s => s.bounty_id === b.id);
      const count = (status: string) => submissions.filter(s => s.status === status).length;
      return {
        ...b, submissions, staged_count: count("staged"),
        submitted_count: count("under_review") + count("approved"),
        approved_count: count("approved"), under_review_count: count("under_review"),
        changes_requested_count: count("changes_requested"),
      };
    });
    return {
      ...campaign, bounties, participant_id: PARTICIPANT, participant_status: this.status,
      journey_status: this.status === "submitted_for_review" ? "under_review" : this.status,
      deadline: this.deadline, joined_at: "2026-09-01T00:00:00.000Z",
      required_objective_units: 4,
      submitted_objective_units: bounties.reduce((n, b) => n + b.submitted_count, 0),
      approved_objective_units: bounties.reduce((n, b) => n + b.approved_count, 0),
      access_key_reserved: this.reservations > 0,
    };
  }
  packages() {
    return this.submissions.length && this.submissions.some(s => s.status !== "staged")
      ? [{ participant_id: PARTICIPANT, user_id: CREATOR, username: "fixture_creator",
        participant_status: this.status, submission_count: this.submissions.length,
        approved_count: this.submissions.filter(s => s.status === "approved").length,
        submitted_at: "2026-09-01T00:00:00.000Z" }]
      : [];
  }
  detail() {
    const submissions = this.submissions.filter(s => s.status !== "staged");
    return {
      participant: { participant_id: PARTICIPANT, username: "fixture_creator", campaign_title: campaign.campaign_title },
      objectives: objectives.map(b => ({ ...b, submissions: submissions.filter(s => s.bounty_id === b.id) })),
      submissions,
    };
  }
  async attach(context: BrowserContext, role: "creator" | "owner") {
    await context.route("**/api/**", async route => {
      const request = route.request();
      const { pathname, searchParams } = new URL(request.url());
      const method = request.method();
      const body = request.postDataJSON?.() ?? {};
      const send = (value: unknown, status = 200) => route.fulfill({
        status, contentType: "application/json", body: JSON.stringify(value),
      });
      if (pathname === "/api/version") return send({ version: "fixture", buildTime: "fixture", buildHash: "campaign-journey-fixture" });
      if (pathname === "/api/user") return send(role === "creator"
        ? { id: CREATOR, username: "fixture_creator", displayName: "Fixture Creator", userType: "content_creator", role: "user" }
        : { id: 920153, username: "fixture_owner", displayName: "Fixture Owner", userType: "indie_developer", role: "user" });
      if (pathname === "/api/bounties" && method === "GET") return send([
        { ...campaign, participant_count: this.joined ? 1 : 0, is_joined: role === "creator" && this.joined },
      ]);
      if (pathname === `/api/bounties/${CAMPAIGN}` && method === "GET") return send(campaign);
      if (pathname === "/api/bounties/my/campaigns") return send(this.joined && role === "creator" ? [this.progress()] : []);
      if (pathname === `/api/bounties/${CAMPAIGN}/join` && method === "POST") {
        this.joinCalls++;
        if (role !== "creator") return send({ error: "Forbidden" }, 403);
        if (this.joined) return send({ error: "Already joined" }, 409);
        this.joined = true;
        this.reservations++;
        return send({ success: true, firstCampaign: true, status: this.status, deadline: this.deadline, accessKeyAvailable: true });
      }
      if (pathname === `/api/bounties/my/${CAMPAIGN}` && method === "GET") return send(this.progress());
      if (pathname === `/api/bounties/my/${CAMPAIGN}/feedback-drafts` && method === "GET") {
        return send([...this.drafts].map(([key, content]) => ({
          bounty_id: Number(key.split(":")[0]), slot_index: Number(key.split(":")[1]), content,
        })));
      }
      const draft = pathname.match(new RegExp(`^/api/bounties/my/${CAMPAIGN}/feedback-drafts/(\\d+)$`));
      if (draft && method === "POST") {
        if (this.status === "expired" || this.status === "submitted_for_review") return send({ error: "Locked" }, 409);
        this.drafts.set(`${draft[1]}:${body.slotIndex}`, body.content);
        return send({ saved: true });
      }
      if (pathname === "/api/bounties/my/content-picker") {
        return send({ items: searchParams.get("contentType") === "screenshot"
          ? this.screenshots.map((id, i) => ({ id, title: `Fixture image ${i + 1}`, thumbnailUrl: "", gameId: campaign.game_id }))
          : [] });
      }
      if (pathname === "/api/upload/limits") return send({ maxScreenshotSizeMB: 10, maxClipSizeMB: 100, maxClipDurationSeconds: 180 });
      const stage = pathname.match(new RegExp(`^/api/bounties/my/${CAMPAIGN}/stage/(\\d+)$`));
      if (stage && method === "POST") {
        if (role !== "creator" || this.status === "expired" || this.status === "submitted_for_review") return send({ error: "Locked" }, 409);
        this.stageBodies.push(body);
        const bounty = objectives.find(b => b.id === Number(stage[1]));
        if (!bounty || body.slotIndex >= bounty.quantity || body.contentType !== bounty.content_type) return send({ error: "Invalid slot" }, 400);
        if (bounty.content_type === "stream" && !/^https:\/\/(www\.)?(twitch\.tv|kick\.com|youtube\.com|rumble\.com)\//.test(body.contentUrl ?? "")) return send({ error: "Invalid livestream" }, 400);
        if (body.supersedesSubmissionId) {
          const previous = this.submissions.find(s => s.id === body.supersedesSubmissionId);
          if (!previous || previous.status !== "changes_requested") return send({ error: "Invalid replacement" }, 409);
          previous.status = "superseded";
        }
        const submission: Submission = {
          id: this.nextId++, bounty_id: bounty.id, slot_index: body.slotIndex,
          status: "staged", content_type: bounty.content_type,
          content_data: body.contentData, content_url: body.contentUrl,
          screenshot_id: body.screenshotId,
          media_title: body.screenshotId ? `Fixture image ${this.screenshots.indexOf(body.screenshotId) + 1}` : undefined,
          supersedes_submission_id: body.supersedesSubmissionId,
        };
        this.submissions.push(submission);
        this.drafts.delete(`${bounty.id}:${body.slotIndex}`);
        return send({ submission, staged: true }, 201);
      }
      if (pathname === `/api/bounties/my/${CAMPAIGN}/submit-package` && method === "POST") {
        if (this.status === "submitted_for_review" || this.status === "completed_and_verified") return send({ success: true, committed: true, counts: { committed: 0 } });
        if (this.status === "expired") return send({ error: "Expired" }, 400);
        if (objectives.some(b => this.active(b.id).length !== b.quantity)) return send({ error: "Missing content" }, 409);
        const staged = this.submissions.filter(s => s.status === "staged");
        if (!staged.length) return send({ error: "No changes" }, 409);
        staged.forEach(s => { s.status = "under_review"; s.submitted_at = new Date().toISOString(); });
        this.status = "submitted_for_review";
        return send({ success: true, committed: true, counts: { committed: staged.length } });
      }
      const packages = `/api/bounties/admin/instances/${CAMPAIGN}/packages`;
      if (pathname === packages && method === "GET") return send(role === "owner" ? this.packages() : { error: "Forbidden" }, role === "owner" ? 200 : 403);
      if (pathname === `${packages}/${PARTICIPANT}` && method === "GET") return send(role === "owner" ? this.detail() : { error: "Forbidden" }, role === "owner" ? 200 : 403);
      if (pathname === `${packages}/${PARTICIPANT}/review` && method === "POST") {
        if (role !== "owner") return send({ error: "Forbidden" }, 403);
        this.reviews++;
        this.reviewBodies.push(body);
        if (this.status === "completed_and_verified" && body.verdict === "approved") {
          return send({ success: true, verdict: "approved", packageComplete: true });
        }
        if (this.status !== "submitted_for_review") return send({ error: "Not submitted" }, 409);
        if (body.verdict === "changes_requested") {
          if (!body.notes || !body.submissionIds?.length) return send({ error: "Reason and selection required" }, 400);
          for (const s of this.submissions.filter(s => s.status === "under_review")) {
            s.status = body.submissionIds.includes(s.id) ? "changes_requested" : "approved";
            if (s.status === "changes_requested") s.review_notes = body.notes;
          }
          this.status = "changes_requested";
        } else if (body.verdict === "rejected") {
          if (!body.notes) return send({ error: "Reason required" }, 400);
          this.submissions.filter(s => s.status === "under_review").forEach(s => { s.status = "rejected"; s.review_notes = body.notes; });
          this.status = "rejected";
        } else {
          this.submissions.filter(s => s.status === "under_review").forEach(s => { s.status = "approved"; });
          this.status = "completed_and_verified";
          this.awards++;
        }
        return send({ success: true, verdict: body.verdict });
      }
      if (pathname.startsWith("/api/bounties/") || pathname.startsWith("/api/campaigns/")) {
        if (pathname === "/api/campaigns/instances") return send(role === "owner" ? [campaign] : []);
        return send({ error: `Unmocked campaign API: ${method} ${pathname}` }, 501);
      }
      // Other page widgets (notification counts, studio hero, etc.) aren't part
      // of this fixture. Keep all API traffic local: never touch the dev DB.
      return send([]);
    });
  }
}

async function openCreator(page: Page) {
  await page.goto(`/bounties?campaign=${CAMPAIGN}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Isolated Journey Campaign").first()).toBeVisible({ timeout: 35_000 });
}
async function openOwner(page: Page) {
  await page.goto("/game-dashboard?tab=campaigns&campaignSub=my", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Campaign Submissions", { exact: true })).toBeVisible({ timeout: 35_000 });
}

test("@e2e creator and owner can complete, revise and approve one campaign without losing staged work", async ({ browser }) => {
  const fixture = new CampaignFixture();
  const creatorContext = await browser.newContext();
  const ownerContext = await browser.newContext();
  try {
    await fixture.attach(creatorContext, "creator");
    await fixture.attach(ownerContext, "owner");
    const creator = await creatorContext.newPage();
    const owner = await ownerContext.newPage();
    await openCreator(creator);
    await creator.getByRole("button", { name: "Start Campaign" }).first().click();
    await expect(creator.getByText("You are joining a Gamefolio campaign")).toBeVisible();
    await creator.getByRole("button", { name: "Start Campaign" }).last().click();
    await expect(creator.getByRole("dialog", { name: "Campaign started!" })).toBeVisible({ timeout: 15_000 });
    await expect.poll(() => fixture.joinCalls).toBe(1);
    await expect.poll(() => fixture.reservations).toBe(1);
    await creator.getByRole("button", { name: "Start Creating" }).click();
    await expect(creator).toHaveURL(new RegExp(`campaign=${CAMPAIGN}`));
    await creator.reload({ waitUntil: "domcontentloaded" });
    await expect(creator.getByRole("heading", { name: "Complete Your Campaign" })).toBeVisible({ timeout: 35_000 });
    await expect(creator.getByRole("dialog")).toHaveCount(0);
    expect(fixture.joinCalls).toBe(1);
    expect(fixture.reservations).toBe(1);

    await expect(creator.getByRole("button", { name: "Upload Response" })).toBeEnabled({ timeout: 25_000 });
    await creator.getByRole("button", { name: "Upload Response" }).click();
    await creator.getByPlaceholder("Tell the developer what you thought…").fill("Draft survives refresh");
    await expect(creator.getByText("Draft saved across devices")).toBeVisible();
    expect(fixture.drafts.get(`${objectives[0].id}:0`)).toBe("Draft survives refresh");
    await creator.reload({ waitUntil: "domcontentloaded" });
    await creator.getByRole("button", { name: "Upload Response" }).click();
    await expect(creator.getByPlaceholder("Tell the developer what you thought…")).toHaveValue("Draft survives refresh");
    await creator.getByRole("button", { name: "Save Feedback" }).click();
    await expect.poll(() => fixture.active(objectives[0].id).length).toBe(1);
    expect(fixture.drafts.size).toBe(0);

    for (let slot = 1; slot <= 2; slot++) {
      await creator.getByRole("button", { name: "Upload Screenshot" }).first().click();
      await creator.getByRole("button", { name: `Fixture image ${slot}` }).click();
      await creator.getByRole("button", { name: "Add to campaign" }).click();
      await expect.poll(() => fixture.active(objectives[1].id).length).toBe(slot);
    }
    expect(fixture.stageBodies.filter(b => b.contentType === "screenshot").map(b => b.slotIndex)).toEqual([0, 1]);
    await creator.getByRole("button", { name: "Upload Clip" }).first().click();
    await creator.getByPlaceholder("https://twitch.tv/your-channel").fill("http://example.com/no");
    await expect(creator.getByRole("button", { name: "Add Livestream" })).toBeDisabled();
    await creator.getByPlaceholder("https://twitch.tv/your-channel").fill("https://twitch.tv/fixture_creator");
    await creator.getByRole("button", { name: "Add Livestream" }).click();
    await expect.poll(() => fixture.active(objectives[2].id).length).toBe(1);
    await creator.getByRole("button", { name: "Submit for Approval" }).click();
    await expect(creator.getByText("Ready to submit?")).toBeVisible();
    expect(fixture.status).toBe("joined");
    await creator.getByRole("button", { name: "Submit Campaign" }).click();
    await expect(creator.getByRole("heading", { name: "Awaiting Approval" })).toBeVisible({ timeout: 35_000 });
    await creator.reload();
    await expect(creator.getByRole("heading", { name: "Awaiting Approval" })).toBeVisible({ timeout: 35_000 });
    await expect(creator.getByText("The work you agreed to do")).toBeVisible();
    await openOwner(owner);
    await owner.getByRole("button", { name: "Review", exact: true }).click();
    await owner.getByRole("button", { name: "Mark submission for changes" }).first().click();
    await owner.getByPlaceholder("Feedback for the creator (required when requesting changes)").fill("Please expand the feedback");
    await owner.getByRole("button", { name: "Request Changes" }).click();
    await expect.poll(() => fixture.status).toBe("changes_requested");
    expect(fixture.reviewBodies[0]).toMatchObject({ verdict: "changes_requested", notes: "Please expand the feedback", submissionIds: [1] });
    expect(fixture.submissions.filter(s => s.status === "approved")).toHaveLength(3);
    await creator.reload({ waitUntil: "domcontentloaded" });
    await expect(creator.getByText("Changes Requested", { exact: true }).first()).toBeVisible();
    await creator.getByRole("button", { name: "Review content" }).first().click();
    await creator.getByRole("button", { name: "Replace" }).click();
    await expect(creator.getByPlaceholder("Tell the developer what you thought…")).toHaveValue("Draft survives refresh");
    await creator.getByPlaceholder("Tell the developer what you thought…").fill("Expanded feedback after review");
    await creator.getByRole("button", { name: "Save Feedback" }).click();
    await expect.poll(() => fixture.submissions.find(s => s.supersedes_submission_id === 1)?.status).toBe("staged");
    await creator.reload({ waitUntil: "domcontentloaded" });
    await expect(creator.getByText("Changes Requested", { exact: true }).first()).toBeVisible({ timeout: 35_000 });
    await creator.getByRole("button", { name: "Review content" }).first().click();
    await creator.getByRole("button", { name: "Replace" }).first().click();
    await expect(creator.getByPlaceholder("Tell the developer what you thought…")).toHaveValue("Expanded feedback after review");
    await creator.getByRole("button", { name: "Cancel" }).last().click();
    await creator.getByRole("button", { name: "Resubmit for Approval" }).click();
    await creator.getByRole("button", { name: "Submit Campaign" }).click();
    await expect.poll(() => fixture.status).toBe("submitted_for_review");
    await owner.reload();
    await owner.getByRole("button", { name: "Review", exact: true }).click();
    await owner.getByRole("button", { name: "Approve Campaign" }).click();
    await expect.poll(() => fixture.status).toBe("completed_and_verified");
    expect(fixture.awards).toBe(1);
    // Repeat the owner API call as a replay; it must not issue a second reward.
    const replay = await owner.evaluate(async ({ campaignId, participantId }) =>
      (await fetch(`/api/bounties/admin/instances/${campaignId}/packages/${participantId}/review`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ verdict: "approved" }),
      })).status, { campaignId: CAMPAIGN, participantId: PARTICIPANT });
    expect(replay).toBe(200);
    expect(fixture.awards).toBe(1);
    await creator.reload({ waitUntil: "domcontentloaded" });
    await expect(creator.getByText("Campaign Complete")).toBeVisible();
  } finally {
    await Promise.all([creatorContext.close(), ownerContext.close()]);
  }
});

test("@e2e expired drafts lock while submitted packages stay visible; owner rejection stays closed", async ({ browser }) => {
  const fixture = new CampaignFixture();
  fixture.joined = true;
  fixture.status = "expired";
  fixture.deadline = "2020-01-01T00:00:00.000Z";
  fixture.submissions.push({ id: 1, bounty_id: objectives[0].id, slot_index: 0, status: "staged", content_type: "feedback", content_data: { text: "Earlier work" } });
  const creatorContext = await browser.newContext();
  const ownerContext = await browser.newContext();
  try {
    await fixture.attach(creatorContext, "creator");
    await fixture.attach(ownerContext, "owner");
    const creator = await creatorContext.newPage();
    const owner = await ownerContext.newPage();
    await openCreator(creator);
    await expect(creator.getByRole("heading", { name: "Campaign Ended" })).toBeVisible();
    await expect(creator.getByRole("button", { name: "Replace" })).toHaveCount(0);
    await expect(creator.getByRole("button", { name: "Submit for Approval" })).toHaveCount(0);
    fixture.status = "submitted_for_review";
    fixture.submissions[0].status = "under_review";
    await creator.reload();
    await expect(creator.getByRole("heading", { name: "Awaiting Approval" })).toBeVisible({ timeout: 35_000 });
    await expect(creator.getByText("The work you agreed to do")).toBeVisible();
    expect(fixture.joinCalls).toBe(0);
    await openOwner(owner);
    await owner.getByRole("button", { name: "Review", exact: true }).click();
    await owner.getByPlaceholder("Feedback for the creator (required when requesting changes)").fill("Campaign closed after review");
    await owner.getByRole("button", { name: "Reject Campaign" }).click();
    await expect.poll(() => fixture.status).toBe("rejected");
    await creator.reload({ waitUntil: "domcontentloaded" });
    await expect(creator.getByRole("heading", { name: "Campaign Rejected" })).toBeVisible({ timeout: 35_000 });
    await expect(creator.getByRole("button", { name: "Submit for Approval" })).toHaveCount(0);
    expect(fixture.awards).toBe(0);
  } finally {
    await Promise.all([creatorContext.close(), ownerContext.close()]);
  }
});