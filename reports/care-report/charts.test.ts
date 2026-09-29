import { describe, expect, it } from "vitest";
import { MARK, barList, dailyColumns, fillDays, shortDate } from "./charts.ts";

describe("charts", () => {
  it("fills every day in the range, with 0 for days that have no data", () => {
    expect(fillDays([{ date: "2026-09-02", value: 4 }], "2026-09-01", "2026-09-03")).toEqual([
      { date: "2026-09-01", value: 0 },
      { date: "2026-09-02", value: 4 },
      { date: "2026-09-03", value: 0 },
    ]);
  });

  it("formats short dates", () => {
    expect(shortDate("2026-09-03")).toBe("3 Sep");
  });

  it("draws one bar per non-zero day, labels the peak and the date range, and describes itself", () => {
    const days = fillDays(
      [
        { date: "2026-09-03", value: 26 },
        { date: "2026-09-04", value: 10 },
      ],
      "2026-09-03",
      "2026-09-06",
    );
    const svg = dailyColumns(days, { width: 200, height: 60, title: "Visits per day" });
    expect(svg.match(/<path /g)).toHaveLength(2);
    expect(svg).toContain(`fill="${MARK}"`);
    expect(svg).toContain(">26 on 3 Sep<");
    expect(svg).toContain(">3 Sep<");
    expect(svg).toContain(">6 Sep<");
    expect(svg).toContain('aria-label="Visits per day. 4 days, highest 26 on 3 Sep."');
  });

  it("caps bar thickness at 24px even with few days", () => {
    const svg = dailyColumns([{ date: "2026-09-01", value: 5 }], { width: 300, height: 60, title: "One day" });
    const width = /H([\d.]+)/.exec(svg);
    expect(width).not.toBeNull();
    // The rounded top runs from x+r to x+w-r, so the bar is at most 24px wide.
    const path = /d="M([\d.]+),[\d.]+V[\d.]+Q[\d.]+,[\d.]+ ([\d.]+),[\d.]+H([\d.]+)/.exec(svg);
    expect(path).not.toBeNull();
    if (path) expect(Number(path[3]) - Number(path[2]) + 4).toBeLessThanOrEqual(24);
  });

  it("draws nothing but the baseline when every day is zero", () => {
    const svg = dailyColumns(fillDays([], "2026-09-01", "2026-09-03"), { width: 100, height: 40, title: "Clicks" });
    expect(svg).not.toContain("<path");
    expect(svg).toContain("<line");
  });

  it("sizes list bars against the largest value and escapes labels", () => {
    const html = barList(
      [
        { label: "Direct", value: 134 },
        { label: "Search <engines>", value: 67 },
      ],
      (n) => String(n),
    );
    expect(html).toContain('style="width:100%"');
    expect(html).toContain('style="width:50%"');
    expect(html).toContain("Search &lt;engines&gt;");
  });
});
