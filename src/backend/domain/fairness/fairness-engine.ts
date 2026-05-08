// Fairness Engine - Independent, decoupled module
// Input: employees, rules, historical assignments
// Output: fair assignments
// Can be tested in isolation without any framework dependency
// Supports MULTIPLE tasks per day per group (e.g. "Sacar Basura" + "Lavar Cafetera" on same day)

import type { DayOfWeek } from "../entities/types";

// ─── Input Types ──────────────────────────────────────────────

export interface FairnessEmployee {
  id: string;
  name: string;
  groupId: string;
  isActive: boolean;
  joinDate: Date;
  leaveDate: Date | null;
}

export interface FairnessRule {
  id: string;
  groupId: string;
  dayOfWeek: DayOfWeek;
  frequency: number;
  taskLabel: string;
  validFrom: Date;
  validTo: Date | null;
  isActive: boolean;
}

export interface FairnessHistoricalAssignment {
  id: string;
  employeeId: string;
  groupId: string;
  date: Date;
  taskType: string;
  isLocked: boolean;
}

export interface FairnessEngineInput {
  employees: FairnessEmployee[];
  rules: FairnessRule[];
  historicalAssignments: FairnessHistoricalAssignment[];
  groupId: string;
  startDate: Date;
  endDate: Date;
  holidays?: Set<string>; // Set of "YYYY-MM-DD" strings for holidays to skip
}

// ─── Output Types ─────────────────────────────────────────────

export interface FairnessAssignment {
  employeeId: string;
  groupId: string;
  date: Date;
  ruleId: string;
  taskType: string;
  fairnessScore: number;
}

export interface FairnessReport {
  assignments: FairnessAssignment[];
  balanceReport: EmployeeBalanceReport[];
  generatedAt: Date;
  groupId: string;
  dateRange: { start: Date; end: Date };
}

export interface EmployeeBalanceReport {
  employeeId: string;
  employeeName: string;
  totalAssignments: number;
  monthlyBalance: Record<string, number>; // "YYYY-MM" -> count
  fairnessScore: number; // higher = more owed
  lastAssignmentDate: Date | null;
  consecutiveCount: number; // how many consecutive recent assignments
}

// ─── Configuration ────────────────────────────────────────────

export interface FairnessConfig {
  cooldownDays: number;       // minimum days between assignments for same person (default: 7)
  consecutivePenalty: number; // penalty weight for consecutive assignments (default: 3.0)
  recencyPenalty: number;     // penalty weight for recent assignments within cooldown (default: 2.0)
  balanceWeight: number;      // weight for overall balance in scoring (default: 1.0)
  monthlyBalanceWeight: number; // weight for monthly balance (default: 1.5)
  joinDateWeight: number;     // bonus weight for newer employees who haven't had turns (default: 0.5)
  sameDayPenalty: number;     // penalty for being assigned another task on the same day (default: 5.0)
}

const DEFAULT_CONFIG: FairnessConfig = {
  cooldownDays: 7,
  consecutivePenalty: 3.0,
  recencyPenalty: 2.0,
  balanceWeight: 1.0,
  monthlyBalanceWeight: 1.5,
  joinDateWeight: 0.5,
  sameDayPenalty: 5.0,
};

// ─── Fairness Engine ──────────────────────────────────────────

export class FairnessEngine {
  private config: FairnessConfig;

  constructor(config?: Partial<FairnessConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Main entry point: Generate fair assignments for a date range
   * Supports multiple tasks per day per group
   */
  generateAssignments(input: FairnessEngineInput): FairnessReport {
    const { employees, rules, historicalAssignments, groupId, startDate, endDate, holidays } = input;

    // Filter active employees in this group
    const activeEmployees = employees.filter(
      (e) => e.isActive && e.groupId === groupId && (!e.leaveDate || e.leaveDate >= startDate)
    );

    if (activeEmployees.length === 0) {
      return {
        assignments: [],
        balanceReport: [],
        generatedAt: new Date(),
        groupId,
        dateRange: { start: startDate, end: endDate },
      };
    }

    // Filter active rules for this group
    const activeRules = rules.filter(
      (r) => r.groupId === groupId && r.isActive && this.isRuleActive(r, startDate, endDate)
    );

    if (activeRules.length === 0) {
      return {
        assignments: [],
        balanceReport: this.buildBalanceReports(activeEmployees, historicalAssignments, groupId),
        generatedAt: new Date(),
        groupId,
        dateRange: { start: startDate, end: endDate },
      };
    }

    // Generate the dates that need assignments (one per rule per matching date)
    const datesNeedingAssignment = this.generateAssignmentDates(activeRules, startDate, endDate, holidays);

    // Build existing assignments map for quick lookup
    // Key: groupId:date:taskType -> allows multiple tasks per day
    const existingMap = this.buildExistingAssignmentsMap(historicalAssignments);

    // Calculate base balance from historical data
    const balanceMap = this.calculateBalanceFromHistory(activeEmployees, historicalAssignments, groupId);

    // Generate assignments date by date using weighted scoring
    const assignments: FairnessAssignment[] = [];

    for (const { date, rule } of datesNeedingAssignment) {
      const dateKey = this.dateToKey(date);
      const taskKey = `${groupId}:${dateKey}:${rule.taskLabel}`;

      // Skip if already has a locked assignment for this specific task on this date
      if (existingMap.has(taskKey)) {
        continue;
      }

      // Find who is already assigned on this date for this group (same-day penalty)
      const alreadyAssignedToday = this.getEmployeesAssignedOnDate(
        date, groupId, historicalAssignments, assignments
      );

      // Score each employee for this date
      const scored = activeEmployees
        .filter((e) => this.isEmployeeAvailableOnDate(e, date))
        .map((employee) => {
          const score = this.calculateScore(
            employee,
            date,
            rule.taskLabel,
            balanceMap,
            assignments,
            historicalAssignments,
            alreadyAssignedToday
          );
          return { employee, score };
        })
        .sort((a, b) => b.score - a.score);

      if (scored.length > 0) {
        const best = scored[0];
        const monthKey = this.dateToMonthKey(date);

        // Update running balance
        const currentBalance = balanceMap.get(best.employee.id) ?? {
          total: 0,
          monthly: {},
          lastDate: null,
          consecutive: 0,
        };
        currentBalance.total += 1;
        currentBalance.monthly[monthKey] = (currentBalance.monthly[monthKey] ?? 0) + 1;
        currentBalance.lastDate = date;
        currentBalance.consecutive = this.calculateConsecutive(
          best.employee.id,
          date,
          historicalAssignments,
          assignments
        );
        balanceMap.set(best.employee.id, currentBalance);

        assignments.push({
          employeeId: best.employee.id,
          groupId,
          date,
          ruleId: rule.id,
          taskType: rule.taskLabel,
          fairnessScore: best.score,
        });
      }
    }

    return {
      assignments,
      balanceReport: this.buildBalanceReports(activeEmployees, historicalAssignments, groupId, assignments),
      generatedAt: new Date(),
      groupId,
      dateRange: { start: startDate, end: endDate },
    };
  }

  // ─── Scoring Algorithm ────────────────────────────────────────

  /**
   * Calculate fairness score for an employee on a given date for a given task.
   * Higher score = more deserving of assignment.
   */
  private calculateScore(
    employee: FairnessEmployee,
    date: Date,
    taskType: string,
    balanceMap: Map<string, BalanceEntry>,
    plannedAssignments: FairnessAssignment[],
    historicalAssignments: FairnessHistoricalAssignment[],
    alreadyAssignedToday: Set<string>
  ): number {
    let score = 0;

    // 1. Balance score: employees with fewer assignments get higher score
    const balance = balanceMap.get(employee.id) ?? {
      total: 0,
      monthly: {},
      lastDate: null,
      consecutive: 0,
    };

    const totalAssignments = balance.total + this.countPlannedAssignments(employee.id, plannedAssignments);
    const avgAssignments = this.getAverageAssignments(balanceMap, plannedAssignments);
    const deficit = Math.max(0, avgAssignments - totalAssignments);
    score += deficit * this.config.balanceWeight;

    // 2. Monthly balance: prefer employees with fewer assignments this month
    const monthKey = this.dateToMonthKey(date);
    const monthlyCount = (balance.monthly[monthKey] ?? 0) + this.countPlannedMonthly(employee.id, monthKey, plannedAssignments);
    const avgMonthly = this.getAverageMonthly(balanceMap, monthKey, plannedAssignments);
    const monthlyDeficit = Math.max(0, avgMonthly - monthlyCount);
    score += monthlyDeficit * this.config.monthlyBalanceWeight;

    // 3. Cooldown penalty: penalize if assigned recently
    const lastAssigned = this.getLastAssignmentDate(employee.id, date, historicalAssignments, plannedAssignments);
    if (lastAssigned) {
      const daysSinceLast = this.daysBetween(lastAssigned, date);
      if (daysSinceLast < this.config.cooldownDays) {
        const cooldownRatio = 1 - daysSinceLast / this.config.cooldownDays;
        score -= cooldownRatio * this.config.recencyPenalty;
      }
    }

    // 4. Consecutive assignment penalty
    const consecutive = this.calculateConsecutive(employee.id, date, historicalAssignments, plannedAssignments);
    if (consecutive > 0) {
      score -= consecutive * this.config.consecutivePenalty;
    }

    // 5. Join date bonus: newer employees who haven't had turns get a bonus
    if (totalAssignments === 0) {
      score += this.config.joinDateWeight;
    }

    // 6. Same-day penalty: strongly penalize if already assigned another task on this date
    if (alreadyAssignedToday.has(employee.id)) {
      score -= this.config.sameDayPenalty;
    }

    return score;
  }

  // ─── Helper Methods ───────────────────────────────────────────

  private isEmployeeAvailableOnDate(employee: FairnessEmployee, date: Date): boolean {
    if (!employee.isActive) return false;
    if (employee.joinDate > date) return false;
    if (employee.leaveDate && employee.leaveDate < date) return false;
    return true;
  }

  private isRuleActive(rule: FairnessRule, startDate: Date, endDate: Date): boolean {
    if (!rule.isActive) return false;
    if (rule.validFrom > endDate) return false;
    if (rule.validTo && rule.validTo < startDate) return false;
    return true;
  }

  private generateAssignmentDates(
    rules: FairnessRule[],
    startDate: Date,
    endDate: Date,
    holidays?: Set<string>
  ): Array<{ date: Date; rule: FairnessRule }> {
    const dates: Array<{ date: Date; rule: FairnessRule }> = [];
    const current = new Date(startDate);
    current.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    while (current <= end) {
      const dayOfWeek = current.getDay() as DayOfWeek;
      const dateKey = this.dateToKey(current);

      // Skip holidays - no assignments on Colombian festivos
      if (holidays && holidays.has(dateKey)) {
        current.setDate(current.getDate() + 1);
        continue;
      }

      for (const rule of rules) {
        if (rule.dayOfWeek !== dayOfWeek) continue;

        // Check frequency: count how many weeks since validFrom
        if (rule.frequency > 1) {
          const weeksSinceStart = Math.floor(
            this.daysBetween(rule.validFrom, current) / 7
          );
          if (weeksSinceStart % rule.frequency !== 0) continue;
        }

        dates.push({ date: new Date(current), rule });
      }

      current.setDate(current.getDate() + 1);
    }

    return dates;
  }

  /**
   * Build map of existing LOCKED assignments
   * Key: groupId:date:taskType -> allows multiple tasks per day
   */
  private buildExistingAssignmentsMap(
    assignments: FairnessHistoricalAssignment[]
  ): Map<string, boolean> {
    const map = new Map<string, boolean>();
    for (const a of assignments) {
      if (a.isLocked) {
        const key = `${a.groupId}:${this.dateToKey(a.date)}:${a.taskType}`;
        map.set(key, true);
      }
    }
    return map;
  }

  /**
   * Get set of employee IDs already assigned on a specific date for a group
   * Used to apply same-day penalty (avoid assigning same person multiple tasks on same day)
   */
  private getEmployeesAssignedOnDate(
    date: Date,
    groupId: string,
    historical: FairnessHistoricalAssignment[],
    planned: FairnessAssignment[]
  ): Set<string> {
    const dateKey = this.dateToKey(date);
    const employees = new Set<string>();

    for (const a of historical) {
      if (a.groupId === groupId && this.dateToKey(a.date) === dateKey && a.isLocked) {
        employees.add(a.employeeId);
      }
    }

    for (const a of planned) {
      if (a.groupId === groupId && this.dateToKey(a.date) === dateKey) {
        employees.add(a.employeeId);
      }
    }

    return employees;
  }

  private calculateBalanceFromHistory(
    employees: FairnessEmployee[],
    historicalAssignments: FairnessHistoricalAssignment[],
    groupId: string
  ): Map<string, BalanceEntry> {
    const map = new Map<string, BalanceEntry>();

    // Initialize all employees
    for (const e of employees) {
      map.set(e.id, { total: 0, monthly: {}, lastDate: null, consecutive: 0 });
    }

    // Count from history
    const groupAssignments = historicalAssignments.filter(
      (a) => a.groupId === groupId && a.isLocked
    );

    for (const a of groupAssignments) {
      const entry = map.get(a.employeeId);
      if (entry) {
        entry.total += 1;
        const monthKey = this.dateToMonthKey(a.date);
        entry.monthly[monthKey] = (entry.monthly[monthKey] ?? 0) + 1;
        if (!entry.lastDate || a.date > entry.lastDate) {
          entry.lastDate = a.date;
        }
      }
    }

    return map;
  }

  private countPlannedAssignments(
    employeeId: string,
    planned: FairnessAssignment[]
  ): number {
    return planned.filter((a) => a.employeeId === employeeId).length;
  }

  private countPlannedMonthly(
    employeeId: string,
    monthKey: string,
    planned: FairnessAssignment[]
  ): number {
    return planned.filter(
      (a) => a.employeeId === employeeId && this.dateToMonthKey(a.date) === monthKey
    ).length;
  }

  private getAverageAssignments(
    balanceMap: Map<string, BalanceEntry>,
    planned: FairnessAssignment[]
  ): number {
    if (balanceMap.size === 0) return 0;
    let total = 0;
    for (const [, entry] of balanceMap) {
      total += entry.total;
    }
    // Add planned
    total += planned.length;
    return total / balanceMap.size;
  }

  private getAverageMonthly(
    balanceMap: Map<string, BalanceEntry>,
    monthKey: string,
    planned: FairnessAssignment[]
  ): number {
    if (balanceMap.size === 0) return 0;
    let total = 0;
    for (const [, entry] of balanceMap) {
      total += entry.monthly[monthKey] ?? 0;
    }
    // Add planned for this month
    total += planned.filter((a) => this.dateToMonthKey(a.date) === monthKey).length;
    return total / balanceMap.size;
  }

  private getLastAssignmentDate(
    employeeId: string,
    beforeDate: Date,
    historical: FairnessHistoricalAssignment[],
    planned: FairnessAssignment[]
  ): Date | null {
    let lastDate: Date | null = null;

    for (const a of historical) {
      if (a.employeeId === employeeId && a.date < beforeDate) {
        if (!lastDate || a.date > lastDate) {
          lastDate = a.date;
        }
      }
    }

    for (const a of planned) {
      if (a.employeeId === employeeId && a.date < beforeDate) {
        if (!lastDate || a.date > lastDate) {
          lastDate = a.date;
        }
      }
    }

    return lastDate;
  }

  private calculateConsecutive(
    employeeId: string,
    date: Date,
    historical: FairnessHistoricalAssignment[],
    planned: FairnessAssignment[]
  ): number {
    let count = 0;
    let checkDate = new Date(date);
    checkDate.setDate(checkDate.getDate() - 7); // check weekly

    // Look back up to 4 periods
    for (let i = 0; i < 4; i++) {
      const dateKey = this.dateToKey(checkDate);
      const found = [
        ...historical.filter((a) => a.employeeId === employeeId),
        ...planned.filter((a) => a.employeeId === employeeId),
      ].some((a) => this.dateToKey(a.date) === dateKey);

      if (found) {
        count++;
        checkDate.setDate(checkDate.getDate() - 7);
      } else {
        break;
      }
    }

    return count;
  }

  private buildBalanceReports(
    employees: FairnessEmployee[],
    historicalAssignments: FairnessHistoricalAssignment[],
    groupId: string,
    plannedAssignments: FairnessAssignment[] = []
  ): EmployeeBalanceReport[] {
    const groupHistorical = historicalAssignments.filter((a) => a.groupId === groupId);

    return employees.map((emp) => {
      const histCount = groupHistorical.filter((a) => a.employeeId === emp.id).length;
      const plannedCount = plannedAssignments.filter((a) => a.employeeId === emp.id).length;
      const total = histCount + plannedCount;

      const monthlyBalance: Record<string, number> = {};
      for (const a of groupHistorical.filter((a) => a.employeeId === emp.id)) {
        const mk = this.dateToMonthKey(a.date);
        monthlyBalance[mk] = (monthlyBalance[mk] ?? 0) + 1;
      }
      for (const a of plannedAssignments.filter((a) => a.employeeId === emp.id)) {
        const mk = this.dateToMonthKey(a.date);
        monthlyBalance[mk] = (monthlyBalance[mk] ?? 0) + 1;
      }

      const allDates = [
        ...groupHistorical.filter((a) => a.employeeId === emp.id).map((a) => a.date),
        ...plannedAssignments.filter((a) => a.employeeId === emp.id).map((a) => a.date),
      ];

      const lastDate = allDates.length > 0
        ? allDates.reduce((latest, d) => (d > latest ? d : latest), allDates[0])
        : null;

      // Fairness score: how many more assignments they're owed compared to ideal
      const avgTotal = employees.length > 0
        ? (groupHistorical.length + plannedAssignments.length) / employees.length
        : 0;
      const fairnessScore = avgTotal - total; // positive = owed, negative = over-assigned

      return {
        employeeId: emp.id,
        employeeName: emp.name,
        totalAssignments: total,
        monthlyBalance,
        fairnessScore,
        lastAssignmentDate: lastDate,
        consecutiveCount: 0,
      };
    });
  }

  // ─── Date Utilities ───────────────────────────────────────────

  private dateToKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  private dateToMonthKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }

  private daysBetween(a: Date, b: Date): number {
    const msPerDay = 86400000;
    const aNorm = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
    const bNorm = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
    return Math.round(Math.abs(bNorm - aNorm) / msPerDay);
  }
}

// Internal type for balance tracking
interface BalanceEntry {
  total: number;
  monthly: Record<string, number>;
  lastDate: Date | null;
  consecutive: number;
}
