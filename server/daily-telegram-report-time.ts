export const TELEGRAM_REPORT_TIME_ZONE = 'Europe/London';

export function londonDateAndHour(now: Date): { date: string; hour: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TELEGRAM_REPORT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';

  return {
    date: `${value('year')}-${value('month')}-${value('day')}`,
    hour: Number(value('hour')),
  };
}

export function previousLondonDate(now = new Date()): string {
  const { date } = londonDateAndHour(now);
  const [year, month, day] = date.split('-').map(Number);
  const previous = new Date(Date.UTC(year, month - 1, day - 1));
  return previous.toISOString().slice(0, 10);
}

export function telegramReportDate(now = new Date(), reportHour = 23): string {
  const { date, hour } = londonDateAndHour(now);
  return hour >= reportHour ? date : previousLondonDate(now);
}
