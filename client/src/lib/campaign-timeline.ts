/** Campaign dates are instants; formatting is always done in the viewer's timezone. */
export function formatCampaignMoment(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const dateLabel = new Intl.DateTimeFormat("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  }).format(date);
  const timeLabel = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZoneName: "short",
  }).format(date);
  return { dateLabel, timeLabel };
}

/** Reject rolled-over dates and nonexistent wall times rather than previewing a false launch. */
export function parseLocalCampaignLaunch(day: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const [year, month, date] = day.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const instant = new Date(year, month - 1, date, hour, minute);
  return instant.getFullYear() === year && instant.getMonth() === month - 1 &&
    instant.getDate() === date && instant.getHours() === hour && instant.getMinutes() === minute
    ? instant : null;
}