import { describe, expect, it } from "vitest";
import { isMonthComplete, monthRange, previousPeriod, yesterday } from "./periods.ts";

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
});
