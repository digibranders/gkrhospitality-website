import { describe, expect, it } from "vitest";
import { isMonthComplete, monthRange, previousPeriod, previousSpan, propertyDate, yesterday } from "./periods.ts";

describe("reporting periods", () => {
  it("covers the whole calendar month", () => {
    expect(monthRange("2026-08")).toEqual({ startDate: "2026-08-01", endDate: "2026-08-31" });
    expect(monthRange("2028-02")).toEqual({ startDate: "2028-02-01", endDate: "2028-02-29" });
  });

  it("finds the previous month across a year boundary", () => {
    expect(previousPeriod("2026-08")).toBe("2026-07");
    expect(previousPeriod("2027-01")).toBe("2026-12");
  });

  it("treats a month as complete once the reporting lag after it has passed", () => {
    expect(isMonthComplete("2026-08", new Date("2026-09-02T12:00:00Z"), 3)).toBe(false);
    expect(isMonthComplete("2026-08", new Date("2026-09-03T12:00:00Z"), 3)).toBe(true);
    expect(isMonthComplete("2026-08", new Date("2026-09-02T12:00:00Z"), 2)).toBe(true);
  });

  it("rejects malformed periods", () => {
    expect(() => monthRange("2026-13")).toThrow(RangeError);
    expect(() => previousPeriod("September")).toThrow(RangeError);
  });

  it("finds yesterday, across month boundaries", () => {
    expect(yesterday(new Date("2026-09-29T10:00:00Z"))).toBe("2026-09-28");
    expect(yesterday(new Date("2026-10-01T10:00:00Z"))).toBe("2026-09-30");
  });

  it("counts days in New York, where the UTC day can already be the next one", () => {
    expect(propertyDate(new Date("2026-10-01T03:00:00Z"))).toBe("2026-09-30");
    expect(propertyDate(new Date("2026-12-01T04:30:00Z"))).toBe("2026-11-30");
    expect(propertyDate(new Date("2026-10-01T04:30:00Z"))).toBe("2026-10-01");
    expect(yesterday(new Date("2026-10-01T03:00:00Z"))).toBe("2026-09-29");
    expect(yesterday(new Date("2027-01-01T12:00:00Z"))).toBe("2026-12-31");
  });

  it("spans the previous month up to the same day number", () => {
    expect(previousSpan("2026-10", "2026-10-14")).toEqual({ startDate: "2026-09-01", endDate: "2026-09-14" });
    expect(previousSpan("2027-01", "2027-01-09")).toEqual({ startDate: "2026-12-01", endDate: "2026-12-09" });
  });

  it("clamps the span to the last day of a shorter previous month", () => {
    expect(previousSpan("2026-03", "2026-03-30")).toEqual({ startDate: "2026-02-01", endDate: "2026-02-28" });
    expect(previousSpan("2026-10", "2026-10-31")).toEqual({ startDate: "2026-09-01", endDate: "2026-09-30" });
  });

  it("refuses a through date outside the month", () => {
    expect(() => previousSpan("2026-10", "2026-11-01")).toThrow(RangeError);
  });
});
