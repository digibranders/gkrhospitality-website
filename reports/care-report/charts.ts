/**
 * Print charts for the report, as inline SVG and HTML strings.
 *
 * Static on purpose (the output is a PDF, so there is no hover layer), and
 * single-series throughout: one copper hue for data, text in the page's ink
 * tokens. Mark specs follow the data-visualisation guidance used for this
 * report: bars at most 24px thick with a rounded data end and a square base,
 * a 2px gap between touching bars, a hairline baseline, and only the peak
 * labelled. Pure functions, covered by charts.test.ts.
 */

/** Chart mark colour. Passes 3:1 against white; text never uses it. */
export const MARK = "#B07A55";
const AXIS = "#E3E0DA";
const LABEL = "#565D64";

const MAX_BAR = 24;
const GAP = 2;
const RADIUS = 2;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const escapeXml = (text: string): string =>
  text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

/** "2026-09-03" becomes "3 Sep". */
export function shortDate(iso: string): string {
  const [, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]}`;
}

/** Every day from start to end inclusive, with the value for that day or 0. */
export function fillDays(points: { date: string; value: number }[], start: string, end: string): { date: string; value: number }[] {
  const byDate = new Map(points.map((p) => [p.date, p.value]));
  const days: { date: string; value: number }[] = [];
  for (let t = Date.parse(`${start}T00:00:00Z`); t <= Date.parse(`${end}T00:00:00Z`); t += 86_400_000) {
    const date = new Date(t).toISOString().slice(0, 10);
    days.push({ date, value: byDate.get(date) ?? 0 });
  }
  return days;
}

/** A bar path with a rounded top and a square base. */
function barPath(x: number, y: number, w: number, h: number): string {
  if (h <= 0) return "";
  const r = Math.min(RADIUS, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

const round1 = (n: number): string => String(Math.round(n * 10) / 10);

/**
 * Daily column chart. `title` becomes the accessible name. The tallest day is
 * labelled with its value and date; the axis shows the first and last date.
 */
export function dailyColumns(
  days: { date: string; value: number }[],
  options: { width: number; height: number; title: string },
): string {
  const { width, height, title } = options;
  const top = 15; // room for the peak label
  const bottom = 17; // room for the date axis
  const plot = height - top - bottom;
  const slot = days.length > 0 ? width / days.length : width;
  const bar = Math.max(1, Math.min(MAX_BAR, slot - GAP));
  const max = Math.max(0, ...days.map((d) => d.value));
  const peakIndex = days.findIndex((d) => d.value === max && max > 0);

  const bars = days
    .map((d, i) => {
      const h = max > 0 ? (d.value / max) * plot : 0;
      const x = i * slot + (slot - bar) / 2;
      return barPath(Number(round1(x)), Number(round1(top + plot - h)), Number(round1(bar)), Number(round1(h)));
    })
    .filter(Boolean)
    .map((d) => `<path d="${d}" fill="${MARK}"/>`)
    .join("");

  const text = (x: number, y: number, anchor: string, content: string, weight = 400): string =>
    `<text x="${round1(x)}" y="${round1(y)}" text-anchor="${anchor}" font-size="10.5" font-weight="${weight}" fill="${LABEL}">${escapeXml(content)}</text>`;

  let peak = "";
  if (peakIndex >= 0) {
    const cx = peakIndex * slot + slot / 2;
    const anchor = cx < 30 ? "start" : cx > width - 30 ? "end" : "middle";
    const px = anchor === "start" ? cx - bar / 2 : anchor === "end" ? cx + bar / 2 : cx;
    peak = text(px, top - 4, anchor, `${max} on ${shortDate(days[peakIndex].date)}`, 600);
  }
  const axis = days.length
    ? text(0, height - 3, "start", shortDate(days[0].date)) + text(width, height - 3, "end", shortDate(days[days.length - 1].date))
    : "";
  const summary = `${title}. ${days.length} days, highest ${max}${peakIndex >= 0 ? ` on ${shortDate(days[peakIndex].date)}` : ""}.`;

  return [
    `<svg class="chart" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(summary)}">`,
    bars,
    `<line x1="0" y1="${top + plot + 0.5}" x2="${width}" y2="${top + plot + 0.5}" stroke="${AXIS}" stroke-width="1"/>`,
    peak,
    axis,
    "</svg>",
  ].join("");
}

/**
 * Horizontal bar list: label, a bar whose length is proportional to the
 * largest value, and the value at the bar's tip. No background track.
 */
export function barList(items: { label: string; value: number }[], formatValue: (n: number) => string): string {
  const max = Math.max(0, ...items.map((i) => i.value));
  const rows = items.map((item) => {
    const pct = max > 0 ? Math.max(1.5, (item.value / max) * 100) : 0;
    return [
      '<li class="barlist__row">',
      `<span class="barlist__label">${escapeXml(item.label)}</span>`,
      '<span class="barlist__track">',
      `<span class="barlist__bar" style="width:${round1(pct)}%"></span>`,
      `<span class="barlist__value">${escapeXml(formatValue(item.value))}</span>`,
      "</span>",
      "</li>",
    ].join("");
  });
  return `<ul class="barlist">${rows.join("")}</ul>`;
}
