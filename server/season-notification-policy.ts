import { SEASON_DEFS } from "../shared/season-definitions.ts";

interface Season {
  num: number;
  name: string;
  months: readonly string[];
}

export interface SeasonNotificationEvent {
  key: string;
  seasonNumber: number;
  stage: "started" | "ending_week" | "ending_day" | "ended";
  title: string;
  message: string;
  dueAt: Date;
  expiresAt: Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Each event has a bounded delivery window: restarts can catch up, but a
// deployment mid-season never announces an old start or queues stale reminders.
export function getDueSeasonNotifications(
  now: Date,
  seasons: readonly Season[] = SEASON_DEFS,
): SeasonNotificationEvent[] {
  const events: SeasonNotificationEvent[] = [];
  for (const season of seasons) {
    if (!season.months.length) continue;
    const [startYear, startMonth] = season.months[0].split("-").map(Number);
    const [endYear, endMonth] = season.months[season.months.length - 1].split("-").map(Number);
    const start = Date.UTC(startYear, startMonth - 1, 1);
    const end = Date.UTC(endYear, endMonth, 1);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;

    const stages = [
      {
        stage: "started" as const, due: start,
        title: `${season.name} is live!`,
        message: "A new ranked season has begun. Earn XP and climb the leaderboard!",
      },
      {
        stage: "ending_week" as const, due: end - 7 * DAY_MS,
        title: `${season.name}: final week`,
        message: "It's the final week of the season. Earn XP and make your move on the leaderboard!",
      },
      {
        stage: "ending_day" as const, due: end - DAY_MS,
        title: `${season.name}: final day`,
        message: "The season ends within 24 hours. Earn your final XP before the rankings close!",
      },
      {
        stage: "ended" as const, due: end,
        title: `${season.name} has ended`,
        message: "The season is over. Thanks for taking part — view the season leaderboard.",
      },
    ];

    for (const { stage, due, title, message } of stages) {
      if (now.getTime() < due || now.getTime() >= due + DAY_MS) continue;
      events.push({
        key: `season:${season.num}:${stage}`,
        seasonNumber: season.num,
        stage, title, message,
        dueAt: new Date(due),
        expiresAt: new Date(due + DAY_MS),
      });
    }
  }
  return events;
}
