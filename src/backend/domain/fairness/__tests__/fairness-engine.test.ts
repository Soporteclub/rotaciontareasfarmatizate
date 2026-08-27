import { FairnessEngine } from "@/backend/domain/fairness/fairness-engine";
import type {
  FairnessEngineInput,
  FairnessEmployee,
  FairnessRule,
} from "@/backend/domain/fairness/fairness-engine";
import { formatDateKeyUTC } from "@/backend/domain/shared/utc-date";

// Deterministic scenario: 4 employees, 2 weekly rules (Mon=1, Wed=3),
// full January 2026 range, with a holiday on Monday Jan 12.
// Used to assert the Fairness Engine's documented invariants.
const GROUP_ID = "g1";
const employees: FairnessEmployee[] = Array.from({ length: 4 }, (_, i) => ({
  id: `e${i + 1}`,
  name: `Empleado ${i + 1}`,
  groupId: GROUP_ID,
  isActive: true,
  joinDate: new Date(Date.UTC(2025, 11, 1)),
  leaveDate: null,
  disabledTasks: [],
}));

const rules: FairnessRule[] = [
  {
    id: "r1",
    groupId: GROUP_ID,
    dayOfWeek: 1,
    frequencyType: "weekly",
    frequency: 1,
    taskLabel: "Sacar Basura",
    validFrom: new Date(Date.UTC(2025, 11, 1)),
    validTo: null,
    isActive: true,
  },
  {
    id: "r2",
    groupId: GROUP_ID,
    dayOfWeek: 3,
    frequencyType: "weekly",
    frequency: 1,
    taskLabel: "Lavar Cafetera",
    validFrom: new Date(Date.UTC(2025, 11, 1)),
    validTo: null,
    isActive: true,
  },
];

const ruleDays = new Set(rules.map((r) => r.dayOfWeek));

function run(holidayKey?: string) {
  const input: FairnessEngineInput = {
    employees,
    rules,
    historicalAssignments: [],
    groupId: GROUP_ID,
    startDate: new Date(Date.UTC(2026, 0, 4)), // dom 04-ene-2026
    endDate: new Date(Date.UTC(2026, 0, 31)), // sáb 31-ene-2026
    holidays: holidayKey ? new Set([holidayKey]) : new Set(),
  };
  return new FairnessEngine().generateAssignments(input);
}

describe("FairnessEngine (invariants)", () => {
  it("generateAssignments returns a non-empty, well-formed report", () => {
    const report = run();
    expect(report.groupId).toBe(GROUP_ID);
    expect(report.assignments.length).toBeGreaterThan(0);
    expect(report.dateRange.start).toBeInstanceOf(Date);
    expect(report.dateRange.end).toBeInstanceOf(Date);
  });

  it("only assigns on the weekdays configured by the rules", () => {
    const report = run();
    for (const a of report.assignments) {
      expect(ruleDays.has(a.date.getUTCDay())).toBe(true);
    }
  });

  it("skips assignments on holidays", () => {
    // 2026-01-12 is a Monday (rule day for 'Sacar Basura'); a holiday must skip it.
    const report = run("2026-01-12");
    expect(
      report.assignments.filter((a) => formatDateKeyUTC(a.date) === "2026-01-12").length,
    ).toBe(0);
  });

  it("keeps per-task imbalance within maxImbalance (1)", () => {
    const report = run();
    const byTask: Record<string, Record<string, number>> = {};
    for (const a of report.assignments) {
      const t = (byTask[a.taskType] ||= {});
      t[a.employeeId] = (t[a.employeeId] ?? 0) + 1;
    }
    for (const task of Object.keys(byTask)) {
      const counts = Object.values(byTask[task]!);
      expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
    }
  });

  it("keeps global imbalance within 1 between any two employees", () => {
    const report = run();
    const totals: Record<string, number> = {};
    for (const a of report.assignments) {
      totals[a.employeeId] = (totals[a.employeeId] ?? 0) + 1;
    }
    const vals = Object.values(totals);
    expect(Math.max(...vals) - Math.min(...vals)).toBeLessThanOrEqual(1);
  });
});
