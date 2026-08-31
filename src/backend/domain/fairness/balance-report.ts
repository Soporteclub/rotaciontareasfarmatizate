// balance-report.ts — Single source of truth for per-employee equity reports
//
// FIX (DRY / equidad): previously the equity report was computed twice with two
// DIFFERENT formulas for `fairnessScore`:
//   - fairness-engine.ts   buildBalanceReports used a GLOBAL average
//     (fairnessScore = avgTotal - total across ALL tasks and ALL employees).
//   - assignment-service.ts getBalanceReport  used a SUM of PER-TASK deficits
//     (only among employees ELIGIBLE for each task).
// That meant the number shown by the balance endpoint could disagree with the
// per-task philosophy the engine actually used to assign people.
//
// The canonical rule (see fairness-engine.ts header) is: each task type is
// balanced INDEPENDENTLY among the employees eligible for it. This module is the
// only place that performs that math, so the generation report (engine) and the
// on-demand balance endpoint (assignment-service) can never diverge again.

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface BalanceRow {
  employeeId: string;
  employeeName: string;
  totalAssignments: number;
  monthlyBalance: Record<string, number>;
  fairnessScore: number;
  taskBreakdown: Record<string, number>;
  taskFairness: Record<string, number>;
}

export interface EquityReport {
  report: BalanceRow[];
  allTaskTypes: string[];
  taskAverages: Record<string, number>;
  eligibleEmployees: Record<string, string[]>;
  totalAssignments: number;
  employeeCount: number;
  averagePerEmployee: number;
}

export interface BalanceAssignmentLike {
  employeeId: string;
  taskName: string;
  date: Date;
}

interface EmployeeLike {
  id: string;
  name: string;
}

export function buildEquityReport(opts: {
  employees: EmployeeLike[];
  /** employeeId -> set of disabled task labels */
  disabledTasksByEmployee: Map<string, Set<string>>;
  assignments: BalanceAssignmentLike[];
}): EquityReport {
  const { employees, disabledTasksByEmployee, assignments } = opts;
  const totalAssignments = assignments.length;
  const employeeCount = employees.length;
  const averagePerEmployee = employeeCount > 0 ? round2(totalAssignments / employeeCount) : 0;

  // Index assignments ONCE (avoids re-scanning the array per employee / per task).
  const byEmployee = new Map<string, BalanceAssignmentLike[]>();
  const taskTotals: Record<string, number> = {};
  for (const a of assignments) {
    const list = byEmployee.get(a.employeeId);
    if (list) {
      list.push(a);
    } else {
      byEmployee.set(a.employeeId, [a]);
    }
    taskTotals[a.taskName] = (taskTotals[a.taskName] ?? 0) + 1;
  }

  const allTaskTypes = Object.keys(taskTotals).sort();

  // Per-task averages among ELIGIBLE employees only.
  const taskAverages: Record<string, number> = {};
  const eligibleEmployees: Record<string, string[]> = {};
  for (const t of allTaskTypes) {
    const eligible: EmployeeLike[] = [];
    for (const e of employees) {
      if (!(disabledTasksByEmployee.get(e.id)?.has(t))) eligible.push(e);
    }
    const denom = eligible.length;
    eligibleEmployees[t] = denom > 0 ? eligible.map((e) => e.id) : [];
    taskAverages[t] = denom > 0 ? round2(taskTotals[t] / denom) : 0;
  }

  const report: BalanceRow[] = employees.map((emp) => {
    const empAssignments = byEmployee.get(emp.id) ?? [];
    const taskBreakdown: Record<string, number> = {};
    const monthlyBalance: Record<string, number> = {};
    for (const a of empAssignments) {
      taskBreakdown[a.taskName] = (taskBreakdown[a.taskName] ?? 0) + 1;
      const d = a.date;
      const mk = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      monthlyBalance[mk] = (monthlyBalance[mk] ?? 0) + 1;
    }

    let fairnessScore = 0;
    const taskFairness: Record<string, number> = {};
    const empDisabled = disabledTasksByEmployee.get(emp.id) ?? new Set<string>();
    for (const t of allTaskTypes) {
      if (empDisabled.has(t)) continue; // Skip tasks this employee is ineligible for
      const empCount = taskBreakdown[t] ?? 0;
      const avg = taskAverages[t] ?? 0;
      const deficit = round2(avg - empCount);
      taskFairness[t] = deficit;
      fairnessScore += deficit;
    }
    fairnessScore = round2(fairnessScore);

    return {
      employeeId: emp.id,
      employeeName: emp.name,
      totalAssignments: empAssignments.length,
      monthlyBalance,
      fairnessScore,
      taskBreakdown,
      taskFairness,
    };
  });

  return {
    report,
    allTaskTypes,
    taskAverages,
    eligibleEmployees,
    totalAssignments,
    employeeCount,
    averagePerEmployee,
  };
}