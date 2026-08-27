import {
  formatDateKeyUTC,
  formatMonthKeyUTC,
  utcMidnight,
  utcMidnightFromYMD,
  daysBetween,
} from "@/backend/domain/shared/utc-date";

// FIX (BC-1/BC-2): the shared UTC date helpers must be tz-independent so that a
// server running in any timezone produces the same calendar-day keys as the
// canonical 00:00:00Z instants stored in the database.

describe("formatDateKeyUTC", () => {
  it("formats a UTC midnight instant as YYYY-MM-DD", () => {
    const d = new Date(Date.UTC(2026, 0, 1)); // 2026-01-01T00:00:00.000Z
    expect(formatDateKeyUTC(d)).toBe("2026-01-01");
  });

  it("stays on the same day for a UTC-5 local midnight (05:00Z)", () => {
    const bogotaMidnight = new Date("2026-01-01T05:00:00.000Z");
    expect(formatDateKeyUTC(bogotaMidnight)).toBe("2026-01-01");
  });

    it("formats year boundaries in UTC", () => {
    const yearEnd = new Date(Date.UTC(2025, 11, 31));
    const yearStart = new Date(Date.UTC(2026, 0, 1)); // 2026-01-01T00:00:00Z
    expect(formatDateKeyUTC(yearEnd)).toBe("2025-12-31");
    expect(formatDateKeyUTC(yearStart)).toBe("2026-01-01");
  });
});

describe("formatMonthKeyUTC", () => {
    it("formats YYYY-MM in UTC", () => {
    const midFeb = new Date(Date.UTC(2026, 1, 15));
    expect(formatMonthKeyUTC(midFeb)).toBe("2026-02");
  });
});

describe("utcMidnight / utcMidnightFromYMD", () => {
    it("builds UTC midnight from Y/M/D", () => {
    const result = utcMidnightFromYMD(2026, 0, 1);
    expect(result.toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });

  it("normalizes any instant to UTC midnight", () => {
    const instant = new Date("2026-01-01T13:45:00.000Z");
    expect(utcMidnight(instant).toISOString()).toBe(
      "2026-01-01T00:00:00.000Z",
    );
  });
});

describe("daysBetween", () => {
    it("counts whole days between two dates", () => {
    const start = new Date(Date.UTC(2026, 0, 1));
    const end = new Date(Date.UTC(2026, 0, 4));
    expect(
      daysBetween(start, end),
    ).toBe(3);
  });
});
