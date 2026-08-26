import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { and, eq, inArray, like, ne } from "drizzle-orm";
import { clips, games, indieGameProfiles, screenshots, users } from "@shared/schema";
import { db } from "../db";
import { supabaseStorage } from "../supabase-storage";

const DEMO_PREFIX = "[Dashboard demo]";
const DEMO_DIRECTORY = "dashboard-demo";

function readUsername(): string {
  const flagIndex = process.argv.indexOf("--username");
  const username = flagIndex >= 0 ? process.argv[flagIndex + 1] : undefined;
  if (!username || !/^[a-zA-Z0-9_]{3,32}$/.test(username)) {
    throw new Error("Usage: tsx server/scripts/seed-indie-dashboard-demo-content.ts --username <username>");
  }
  return username;
}

async function createDemoImage(label: string, color: string): Promise<Buffer> {
  const svg = `
    <svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${color}" />
          <stop offset="100%" stop-color="#071014" />
        </linearGradient>
      </defs>
      <rect width="1280" height="720" fill="url(#bg)" />
      <rect x="54" y="54" width="1172" height="612" rx="30" fill="none" stroke="#b7ff18" stroke-opacity=".62" stroke-width="3" />
      <text x="96" y="326" fill="#ffffff" font-family="Arial, sans-serif" font-size="58" font-weight="700">${label}</text>
      <text x="96" y="390" fill="#b7ff18" font-family="Arial, sans-serif" font-size="28" letter-spacing="3">GAMEFOLIO DASHBOARD DEMO</text>
    </svg>
  `;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

function createDemoVideo(filePath: string, color: string): void {
  const result = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-f", "lavfi",
      "-i", `color=c=${color}:s=1280x720:d=2:r=30`,
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      filePath,
    ],
    { stdio: "pipe" },
  );
  if (result.status !== 0) {
    throw new Error(`Unable to generate demo video: ${result.stderr.toString()}`);
  }
}

async function main() {
  const username = readUsername();
  const [developer] = await db.select({
    id: users.id,
    username: users.username,
  }).from(users).where(eq(users.username, username)).limit(1);
  if (!developer) throw new Error(`No user found for ${username}`);

  const profiles = await db.select({
    catalogGameId: indieGameProfiles.catalogGameId,
  }).from(indieGameProfiles)
    .where(eq(indieGameProfiles.userId, developer.id));
  const ownedGameIds = profiles
    .map((profile) => profile.catalogGameId)
    .filter((gameId): gameId is number => typeof gameId === "number");
  if (ownedGameIds.length === 0) {
    throw new Error(`${username} has no catalogue-linked Indie game profile.`);
  }

  const ownedGames = await db.select({
    id: games.id,
    name: games.name,
    imageUrl: games.imageUrl,
  }).from(games).where(inArray(games.id, ownedGameIds));
  const [primaryGame] = ownedGames;
  const otherGames = await db.select({
    id: games.id,
    name: games.name,
    imageUrl: games.imageUrl,
  }).from(games)
    .where(and(eq(games.isApproved, true), ne(games.id, primaryGame.id)))
    .orderBy(games.id)
    .limit(2);
  if (otherGames.length < 2) {
    throw new Error("At least two approved catalogue games are required for the other-games fixtures.");
  }

  const tempDir = mkdtempSync(path.join(os.tmpdir(), "gamefolio-dashboard-demo-"));
  try {
    const ownedVideoPath = path.join(tempDir, "owned-game.mp4");
    const otherVideoPath = path.join(tempDir, "other-game.mp4");
    createDemoVideo(ownedVideoPath, "#245c7a");
    createDemoVideo(otherVideoPath, "#7a3b24");

    const [ownedVideoUrl, otherVideoUrl, ownedImageUrl, otherImageUrl] = await Promise.all([
      supabaseStorage.uploadBufferToFixedPath(
        readFileSync(ownedVideoPath),
        `users/${developer.id}/${DEMO_DIRECTORY}/owned-game.mp4`,
        "video/mp4",
      ),
      supabaseStorage.uploadBufferToFixedPath(
        readFileSync(otherVideoPath),
        `users/${developer.id}/${DEMO_DIRECTORY}/other-game.mp4`,
        "video/mp4",
      ),
      supabaseStorage.uploadBufferToFixedPath(
        await createDemoImage("Owned game screenshot", "#245c7a"),
        `users/${developer.id}/${DEMO_DIRECTORY}/owned-game.png`,
        "image/png",
      ),
      supabaseStorage.uploadBufferToFixedPath(
        await createDemoImage("Other games screenshot", "#7a3b24"),
        `users/${developer.id}/${DEMO_DIRECTORY}/other-games.png`,
        "image/png",
      ),
    ]);

    await db.transaction(async (tx) => {
      const shareCode = (label: string) => `demo-${label}-${randomBytes(5).toString("hex")}`;
      await tx.delete(clips).where(and(
        eq(clips.userId, developer.id),
        like(clips.title, `${DEMO_PREFIX}%`),
      ));
      await tx.delete(screenshots).where(and(
        eq(screenshots.userId, developer.id),
        like(screenshots.title, `${DEMO_PREFIX}%`),
      ));

      await tx.insert(clips).values([
        {
          userId: developer.id,
          gameId: primaryGame.id,
          gameName: primaryGame.name,
          gameImageUrl: primaryGame.imageUrl,
          title: `${DEMO_PREFIX} ${primaryGame.name} clip`,
          description: "Demo fixture for the Developer Dashboard owned-game section.",
          videoUrl: ownedVideoUrl.url,
          thumbnailUrl: ownedImageUrl.url,
          duration: 2,
          videoType: "clip",
          status: "ready",
          shareCode: shareCode("owned-clip"),
        },
        {
          userId: developer.id,
          gameId: primaryGame.id,
          gameName: primaryGame.name,
          gameImageUrl: primaryGame.imageUrl,
          title: `${DEMO_PREFIX} ${primaryGame.name} reel`,
          description: "Demo reel fixture for the Developer Dashboard owned-game section.",
          videoUrl: ownedVideoUrl.url,
          thumbnailUrl: ownedImageUrl.url,
          duration: 2,
          videoType: "reel",
          status: "ready",
          shareCode: shareCode("owned-reel"),
        },
        {
          userId: developer.id,
          gameId: otherGames[0].id,
          gameName: otherGames[0].name,
          gameImageUrl: otherGames[0].imageUrl,
          title: `${DEMO_PREFIX} ${otherGames[0].name} clip`,
          description: "Demo fixture for the Developer Dashboard other-games section.",
          videoUrl: otherVideoUrl.url,
          thumbnailUrl: otherImageUrl.url,
          duration: 2,
          videoType: "clip",
          status: "ready",
          shareCode: shareCode("other-clip"),
        },
        {
          userId: developer.id,
          gameId: otherGames[1].id,
          gameName: otherGames[1].name,
          gameImageUrl: otherGames[1].imageUrl,
          title: `${DEMO_PREFIX} ${otherGames[1].name} reel`,
          description: "Demo reel fixture for the Developer Dashboard other-games section.",
          videoUrl: otherVideoUrl.url,
          thumbnailUrl: otherImageUrl.url,
          duration: 2,
          videoType: "reel",
          status: "ready",
          shareCode: shareCode("other-reel"),
        },
      ]);

      await tx.insert(screenshots).values([
        {
          userId: developer.id,
          gameId: primaryGame.id,
          title: `${DEMO_PREFIX} ${primaryGame.name} screenshot`,
          description: "Demo fixture for the Developer Dashboard owned-game section.",
          imageUrl: ownedImageUrl.url,
          thumbnailUrl: ownedImageUrl.url,
          shareCode: shareCode("owned-shot"),
        },
        {
          userId: developer.id,
          gameId: otherGames[0].id,
          title: `${DEMO_PREFIX} ${otherGames[0].name} screenshot`,
          description: "Demo fixture for the Developer Dashboard other-games section.",
          imageUrl: otherImageUrl.url,
          thumbnailUrl: otherImageUrl.url,
          shareCode: shareCode("other-shot"),
        },
      ]);
    });

    console.log(`Seeded 6 dashboard demo items for @${developer.username}.`);
    console.log(`Owned game: ${primaryGame.name}; other games: ${otherGames.map((game) => game.name).join(", ")}.`);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});