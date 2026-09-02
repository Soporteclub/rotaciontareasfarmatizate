import { generateAssignmentsSchema } from "@/backend/application/validators/schemas";

// FIX (BC-3): the generation schema must reject malformed dates and cap the
// range, instead of accepting `new Date("garbage")` (Invalid Date) which used
// to slip past the `<` refine.

describe("generateAssignmentsSchema (BC-3)", () => {
  const base = { groupId: "g1", startDate: "2026-01-01", endDate: "2026-01-07" };

  it("accepts a valid ISO range under 366 days", () => {
    expect(generateAssignmentsSchema.safeParse(base).success).toBe(true);
  });

  it("rejects a missing startDate", () => {
    expect(
      generateAssignmentsSchema.safeParse({ groupId: "g1", endDate: "2026-01-07" }).success,
    ).toBe(false);
  });

  it("rejects a non-ISO 'garbage' string (Invalid Date, NaN)", () => {
    // Previously new Date("garbage") => Invalid Date passed the `<` refine
    // because NaN < NaN === false.
    expect(generateAssignmentsSchema.safeParse({ ...base, startDate: "garbage" }).success).toBe(
      false,
    );
  });

  it("rejects an impossible calendar day (Feb 30)", () => {
    expect(generateAssignmentsSchema.safeParse({ ...base, startDate: "2026-02-30" }).success).toBe(
      false,
    );
  });

  it("rejects wrong-format date strings", () => {
    expect(
      generateAssignmentsSchema.safeParse({ ...base, startDate: "01/01/2026" }).success,
    ).toBe(false);
  });

  it("accepts a range of exactly 366 days (the cap boundary)", () => {
    expect(
      generateAssignmentsSchema.safeParse({
        groupId: "g1",
        startDate: "2026-01-01",
        endDate: "2027-01-02",
      }).success,
    ).toBe(true);
  });

  it("rejects ranges longer than 366 days", () => {
    expect(
      generateAssignmentsSchema.safeParse({
        groupId: "g1",
        startDate: "2026-01-01",
        endDate: "2027-01-03",
      }).success,
    ).toBe(false);
  });

  it("rejects start > end", () => {
    expect(
      generateAssignmentsSchema.safeParse({ ...base, startDate: "2026-01-08", endDate: "2026-01-07" })
        .success,
    ).toBe(false);
  });

  // FIX (BUG-08): a single-day range (start === end) must now be valid so the
  // user can regenerate only one day (e.g. the 31st) to correct it.
  it("accepts a single-day range (start === end)", () => {
    expect(
      generateAssignmentsSchema.safeParse({ ...base, startDate: "2026-01-07", endDate: "2026-01-07" })
        .success,
    ).toBe(true);
  });

  it("accepts a single-day range on the 31st", () => {
    expect(
      generateAssignmentsSchema.safeParse({
        groupId: "g1",
        startDate: "2026-08-31",
        endDate: "2026-08-31",
      }).success,
    ).toBe(true);
  });
});
