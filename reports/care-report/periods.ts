/**
 * Reporting months as YYYY-MM, and the date ranges Google's APIs expect.
 * Pure functions, covered by periods.test.ts.
 */

const PERIOD = /^(\d{4})-(\d{2})$/;

function periodParts(period: string): { year: number; month: number } {
  const match = PERIOD.exec(period);
  const month = match ? Number(match[2]) : 0;
  if (!match || month < 1 || month > 12) {
    throw new RangeError(`Expected a month as YYYY-MM, got "${period}"`);
  }
  return { year: Number(match[1]), month };
}

const pad = (n: number): string => String(n).padStart(2, "0");

/** GKR is a New York property, so a day is only over once it has ended there; the UTC day can still be running. */
const PROPERTY_TIME_ZONE = "America/New_York";
const propertyDateParts = new Intl.DateTimeFormat("en-US", {
  timeZone: PROPERTY_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** First and last day of the month, as YYYY-MM-DD. */
export function monthRange(period: string): { startDate: string; endDate: string } {
  const { year, month } = periodParts(period);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { startDate: `${year}-${pad(month)}-01`, endDate: `${year}-${pad(month)}-${pad(lastDay)}` };
}

export function previousPeriod(period: string): string {
  const { year, month } = periodParts(period);
  return month === 1 ? `${year - 1}-12` : `${year}-${pad(month - 1)}`;
}

/**
 * What a part month is compared with: the previous month from its 1st to the
 * same day number as `throughDate`, clamped to that month's last day.
 */
export function previousSpan(period: string, throughDate: string): { startDate: string; endDate: string } {
  if (!throughDate.startsWith(`${period}-`)) throw new RangeError(`Expected a date in ${period}, got "${throughDate}"`);
  const previous = monthRange(previousPeriod(period));
  const sameDay = `${previousPeriod(period)}-${throughDate.slice(8)}`;
  return { startDate: previous.startDate, endDate: sameDay < previous.endDate ? sameDay : previous.endDate };
}

export function nextPeriod(period: string): string {
  const { year, month } = periodParts(period);
  return month === 12 ? `${year + 1}-01` : `${year}-${pad(month + 1)}`;
}

/**
 * True once every day of the month has final data. Google's reporting lags
 * the live day: about three days for Search Console, two for GA4.
 */
export function isMonthComplete(period: string, now: Date, lagDays: number): boolean {
  const { year, month } = periodParts(period);
  const finalFrom = Date.UTC(year, month, lagDays); // day 0 of the next month is this month's last day
  return now.getTime() >= finalFrom;
}

/** The calendar date at the property when `instant` happened, as YYYY-MM-DD. */
export function propertyDate(instant: Date): string {
  const parts = Object.fromEntries(propertyDateParts.formatToParts(instant).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** The day before `now` at the property, as YYYY-MM-DD: the latest day with data when a month is still running. */
export function yesterday(now: Date): string {
  const [year, month, day] = propertyDate(now).split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day - 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
