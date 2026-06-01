// Fairness Engine - Independent, decoupled module
// Input: employees, rules, historical assignments
// Output: fair assignments
// Supports MULTIPLE tasks per day per group and frequencyType (daily/weekly/monthly)
//
// KEY PRINCIPLE: Each task type is balanced INDEPENDENTLY.
// Employees ineligible for a task (e.g., "cafetera") are NOT penalized in other tasks (e.g., "basura").
// The engine tracks per-task-type counts so that "basura" is distributed fairly among
// those eligible for it, regardless of how many "cafetera" turns someone has.

import type { DayOfWeek, FrequencyType } from "../entities/types";

// ─── Input Types ──────────────────────────────────────────────

export interface FairnessEmployee {
  id: string;
  name: string;
  groupId: string;
  isActive: boolean;
  joinDate: Date;
  leaveDate: Date | null;
  disabledTasks?: string[]; // Task labels this employee should NOT be assigned
}

export interface FairnessRule {
  id: string;
  groupId: string;
  dayOfWeek: DayOfWeek;
  frequencyType: FrequencyType;
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
  holidays?: Set<string>;
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
  monthlyBalance: Record<string, number>;
  fairnessScore: number;
  lastAssignmentDate: Date | null;
  consecutiveCount: number;
  /** Per-task-type breakdown: how many times this employee has done each task */
  taskBreakdown: Record<string, number>;
}

// ─── Configuration ────────────────────────────────────────────

export interface FairnessConfig {
  cooldownDays: number;
  consecutivePenalty: number;
  recencyPenalty: number;
  balanceWeight: number;
  monthlyBalanceWeight: number;
  joinDateWeight: number;
  sameDayPenalty: number;
  maxImbalance: number; // maximum allowed difference between employees FOR A SINGLE TASK
}

const DEFAULT_CONFIG: FairnessConfig = {
  cooldownDays: 7,
  consecutivePenalty: 3.0,
  recencyPenalty: 2.0,
  balanceWeight: 5.0,
  monthlyBalanceWeight: 3.0,
  joinDateWeight: 0.5,
  sameDayPenalty: 5.0,
  maxImbalance: 1,
};

// ─── Internal Balance Entry ──────────────────────────────────

interface BalanceEntry {
  /** Total assignments across ALL tasks (used for same-day penalty, cooldown) */
  total: number;
  /** Per-task-type total: taskLabel → count */
  taskTotals: Record<string, number>;
  /** Per-month overall: "YYYY-MM" → count (used for cooldown, consecutive) */
  monthly: Record<string, number>;
  /** Per-task per-month: taskLabel → "YYYY-MM" → count */
  taskMonthly: Record<string, Record<string, number>>;
  /** Last date this employee was assigned any task */
  lastDate: Date | null;
  /** Consecutive weekly assignments */
  consecutive: number;
}

// ─── Fairness Engine ──────────────────────────────────────────

export class FairnessEngine {
  private config: FairnessConfig;
  /** Map of employeeId → set of disabled task labels (built from input) */
  private disabledTasksMap: Map<string, Set<string>> = new Map();

  constructor(config?: Partial<FairnessConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  generateAssignments(input: FairnessEngineInput): FairnessReport {
    const { employees, rules, historicalAssignments, groupId, startDate, endDate, holidays } = input;

    const activeEmployees = employees.filter(
      (e) => e.isActive && e.groupId === groupId && (!e.leaveDate || e.leaveDate >= startDate)
    );

    // Build disabled-tasks map from employee data
    this.disabledTasksMap = new Map();
    for (const emp of activeEmployees) {
      this.disabledTasksMap.set(emp.id, new Set(emp.disabledTasks ?? []));
    }

    if (activeEmployees.length === 0) {
      return this.emptyReport(groupId, startDate, endDate);
    }

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

    const datesNeedingAssignment = this.generateAssignmentDates(activeRules, startDate, endDate, holidays);
    const existingMap = this.buildExistingAssignmentsMap(historicalAssignments);
    const balanceMap = this.calculateBalanceFromHistory(activeEmployees, historicalAssignments, groupId);

    const assignments: FairnessAssignment[] = [];

    for (const { date, rule } of datesNeedingAssignment) {
      const dateKey = this.dateToKey(date);
      const taskKey = `${groupId}:${dateKey}:${rule.taskLabel}`;

      if (existingMap.has(taskKey)) continue;

      const alreadyAssignedToday = this.getEmployeesAssignedOnDate(
        date, groupId, historicalAssignments, assignments
      );

      const best = this.selectBestEmployee(
        activeEmployees, date, rule.taskLabel, balanceMap,
        assignments, historicalAssignments, alreadyAssignedToday
      );

      if (!best) continue;

      this.updateBalanceEntry(balanceMap, best.employee.id, date, rule.taskLabel, historicalAssignments, assignments);

      assignments.push({
        employeeId: best.employee.id,
        groupId,
        date,
        ruleId: rule.id,
        taskType: rule.taskLabel,
        fairnessScore: best.score,
      });
    }

    return {
      assignments,
      balanceReport: this.buildBalanceReports(activeEmployees, historicalAssignments, groupId, assignments),
      generatedAt: new Date(),
      groupId,
      dateRange: { start: startDate, end: endDate },
    };
  }

  // ─── Employee Selection with Per-Task Equity Constraint ────────

  private selectBestEmployee(
    employees: FairnessEmployee[],
    date: Date,
    taskType: string,
    balanceMap: Map<string, BalanceEntry>,
    planned: FairnessAssignment[],
    historical: FairnessHistoricalAssignment[],
    alreadyAssignedToday: Set<string>
  ): { employee: FairnessEmployee; score: number } | null {
    // Filter to employees eligible for THIS task
    const available = employees
      .filter((e) => this.isEmployeeAvailableOnDate(e, date))
      .filter((e) => !this.isTaskDisabled(e, taskType))
      .map((employee) => ({
        employee,
        score: this.calculateScore(
          employee, date, taskType, balanceMap, planned, historical, alreadyAssignedToday
        ),
      }))
      .sort((a, b) => b.score - a.score);

    if (available.length === 0) return null;

    // Per-task equity constraint: never assign someone who has maxImbalance+ more
    // assignments FOR THIS SPECIFIC TASK than the least-assigned eligible employee
    const taskTotals = available.map((a) =>
      this.getRunningTaskTotal(a.employee.id, taskType, balanceMap, planned)
    );
    const minTaskTotal = Math.min(...taskTotals);
    const maxAllowed = minTaskTotal + this.config.maxImbalance;

    const equitable = available.filter(
      (a) => this.getRunningTaskTotal(a.employee.id, taskType, balanceMap, planned) <= maxAllowed
    );

    // If all candidates exceed the limit, fall back to the full list
    const candidates = equitable.length > 0 ? equitable : available;

    return candidates[0];
  }

  /**
   * Get the running total for a SPECIFIC TASK (history + planned).
   * This is the key difference from the old engine: balance is per-task, not global.
   */
  private getRunningTaskTotal(
    employeeId: string,
    taskType: string,
    balanceMap: Map<string, BalanceEntry>,
    planned: FairnessAssignment[]
  ): number {
    const entry = balanceMap.get(employeeId);
    const historicalTaskCount = entry?.taskTotals[taskType] ?? 0;
    const plannedTaskCount = planned.filter(
      (a) => a.employeeId === employeeId && a.taskType === taskType
    ).length;
    return historicalTaskCount + plannedTaskCount;
  }

  /**
   * Get overall running total (all tasks combined) — used only for same-day penalty.
   */
  private getRunningTotal(
    employeeId: string,
    balanceMap: Map<string, BalanceEntry>,
    planned: FairnessAssignment[]
  ): number {
    const entry = balanceMap.get(employeeId);
    const historicalTotal = entry?.total ?? 0;
    const plannedTotal = planned.filter((a) => a.employeeId === employeeId).length;
    return historicalTotal + plannedTotal;
  }

  // ─── Scoring Algorithm (Per-Task Independent) ──────────────────

  private calculateScore(
    employee: FairnessEmployee,
    date: Date,
    taskType: string,
    balanceMap: Map<string, BalanceEntry>,
    plannedAssignments: FairnessAssignment[],
    historicalAssignments: FairnessHistoricalAssignment[],
    alreadyAssignedToday: Set<string>
  ): number {
    const balance = balanceMap.get(employee.id) ?? {
      total: 0, taskTotals: {}, monthly: {}, taskMonthly: {},
      lastDate: null, consecutive: 0,
    };

    // Per-task total (this is what we balance independently)
    const taskTotal = balance.taskTotals[taskType] ?? 0;
    const plannedTaskTotal = plannedAssignments.filter(
      (a) => a.employeeId === employee.id && a.taskType === taskType
    ).length;
    const totalForThisTask = taskTotal + plannedTaskTotal;

    let score = 0;

    // 1. PER-TASK balance deficit: who has done LESS of this specific task?
    score += this.taskBalanceDeficitScore(totalForThisTask, taskType, balanceMap, plannedAssignments, employee.disabledTasks ?? []);

    // 2. PER-TASK monthly deficit: who has done less of this task this month?
    score += this.taskMonthlyDeficitScore(employee.id, date, taskType, balanceMap, balance, plannedAssignments, employee.disabledTasks ?? []);

    // 3. Cooldown (still based on ANY task — you just worked, rest a bit)
    score += this.cooldownScore(employee.id, date, balance, historicalAssignments, plannedAssignments);

    // 4. Consecutive weeks penalty (still based on any task)
    score += this.consecutiveScore(employee.id, date, historicalAssignments, plannedAssignments);

    // 5. New employee bonus (only if they have zero assignments for THIS task)
    score += this.newEmployeeTaskBonus(totalForThisTask);

    // 6. Same-day penalty (already assigned today to ANY task)
    score += this.sameDayPenalty(employee.id, alreadyAssignedToday);

    return score;
  }

  /**
   * PER-TASK balance deficit score.
   * Compares this employee's count for a specific task against the average
   * among only those who are ELIGIBLE for this task.
   */
  private taskBalanceDeficitScore(
    employeeTaskTotal: number,
    taskType: string,
    balanceMap: Map<string, BalanceEntry>,
    planned: FairnessAssignment[],
    disabledTasks: string[],
  ): number {
    const avg = this.getAverageTaskAssignments(taskType, balanceMap, planned, disabledTasks);
    const deficit = Math.max(0, avg - employeeTaskTotal);
    return deficit * this.config.balanceWeight;
  }

  /**
   * PER-TASK monthly deficit score.
   * Compares this employee's monthly count for a specific task against the monthly average
   * among only those who are ELIGIBLE for this task.
   */
  private taskMonthlyDeficitScore(
    employeeId: string,
    date: Date,
    taskType: string,
    balanceMap: Map<string, BalanceEntry>,
    balance: BalanceEntry,
    planned: FairnessAssignment[],
    disabledTasks: string[],
  ): number {
    const monthKey = this.dateToMonthKey(date);
    const taskMonthlyCount = (balance.taskMonthly[taskType]?.[monthKey] ?? 0) +
      planned.filter((a) => a.employeeId === employeeId && a.taskType === taskType && this.dateToMonthKey(a.date) === monthKey).length;

    const avgMonthly = this.getAverageTaskMonthly(taskType, monthKey, balanceMap, planned, disabledTasks);
    const monthlyDeficit = Math.max(0, avgMonthly - taskMonthlyCount);
    return monthlyDeficit * this.config.monthlyBalanceWeight;
  }

  private cooldownScore(
    employeeId: string,
    date: Date,
    balance: BalanceEntry,
    historical: FairnessHistoricalAssignment[],
    planned: FairnessAssignment[],
  ): number {
    const lastAssigned = this.getLastAssignmentDate(employeeId, date, historical, planned);
    if (!lastAssigned) return 0;

    const daysSinceLast = this.daysBetween(lastAssigned, date);
    if (daysSinceLast >= this.config.cooldownDays) return 0;

    const cooldownRatio = 1 - daysSinceLast / this.config.cooldownDays;
    return -(cooldownRatio * this.config.recencyPenalty);
  }

  private consecutiveScore(
    employeeId: string,
    date: Date,
    historical: FairnessHistoricalAssignment[],
    planned: FairnessAssignment[],
  ): number {
    const consecutive = this.calculateConsecutive(employeeId, date, historical, planned);
    if (consecutive <= 0) return 0;
    return -(consecutive * this.config.consecutivePenalty);
  }

  /**
   * New employee bonus for a specific task.
   * Only gives bonus if the employee has NEVER been assigned this task before.
   */
  private newEmployeeTaskBonus(taskTotal: number): number {
    return taskTotal === 0 ? this.config.joinDateWeight : 0;
  }

  private sameDayPenalty(employeeId: string, alreadyAssignedToday: Set<string>): number {
    return alreadyAssignedToday.has(employeeId) ? -this.config.sameDayPenalty : 0;
  }

  // ─── Per-Task Average Calculations ─────────────────────────────

  /**
   * Calculate the average number of assignments for a SPECIFIC TASK
   * among only those employees who are ELIGIBLE for it.
   * This is the core of the independent-task balancing.
   */
  private getAverageTaskAssignments(
    taskType: string,
    balanceMap: Map<string, BalanceEntry>,
    planned: FairnessAssignment[],
    _disabledTasks: string[],
  ): number {
    let total = 0;
    let eligibleCount = 0;

    for (const [empId, entry] of balanceMap) {
      // Skip employees who are NOT eligible for this task
      const empDisabled = this.disabledTasksMap.get(empId);
      if (empDisabled?.has(taskType)) continue;

      const taskCount = entry.taskTotals[taskType] ?? 0;
      total += taskCount;
      eligibleCount++;
    }

    // Add planned assignments for this task (only from eligible employees)
    for (const a of planned) {
      if (a.taskType !== taskType) continue;
      const empDisabled = this.disabledTasksMap.get(a.employeeId);
      if (empDisabled?.has(taskType)) continue;
      total += 1;
    }

    return eligibleCount > 0 ? total / eligibleCount : 0;
  }

  /**
   * Calculate the average monthly count for a SPECIFIC TASK
   * among eligible employees.
   */
  private getAverageTaskMonthly(
    taskType: string,
    monthKey: string,
    balanceMap: Map<string, BalanceEntry>,
    planned: FairnessAssignment[],
    _disabledTasks: string[],
  ): number {
    let total = 0;
    let eligibleCount = 0;

    for (const [empId, entry] of balanceMap) {
      // Skip employees who are NOT eligible for this task
      const empDisabled = this.disabledTasksMap.get(empId);
      if (empDisabled?.has(taskType)) continue;

      const taskMonthCount = entry.taskMonthly[taskType]?.[monthKey] ?? 0;
      total += taskMonthCount;
      eligibleCount++;
    }

    // Add planned for this task/month (only from eligible employees)
    for (const a of planned) {
      if (a.taskType !== taskType || this.dateToMonthKey(a.date) !== monthKey) continue;
      const empDisabled = this.disabledTasksMap.get(a.employeeId);
      if (empDisabled?.has(taskType)) continue;
      total += 1;
    }

    return eligibleCount > 0 ? total / eligibleCount : 0;
  }

  // ─── Balance Update (Per-Task) ──────────────────────────────────

  private updateBalanceEntry(
    balanceMap: Map<string, BalanceEntry>,
    employeeId: string,
    date: Date,
    taskType: string,
    historical: FairnessHistoricalAssignment[],
    planned: FairnessAssignment[],
  ): void {
    const monthKey = this.dateToMonthKey(date);
    const entry = balanceMap.get(employeeId) ?? {
      total: 0, taskTotals: {}, monthly: {}, taskMonthly: {},
      lastDate: null, consecutive: 0,
    };

    // Update overall totals
    entry.total += 1;
    entry.monthly[monthKey] = (entry.monthly[monthKey] ?? 0) + 1;

    // Update per-task totals
    entry.taskTotals[taskType] = (entry.taskTotals[taskType] ?? 0) + 1;

    // Update per-task monthly
    if (!entry.taskMonthly[taskType]) entry.taskMonthly[taskType] = {};
    entry.taskMonthly[taskType][monthKey] = (entry.taskMonthly[taskType][monthKey] ?? 0) + 1;

    entry.lastDate = date;
    entry.consecutive = this.calculateConsecutive(employeeId, date, historical, planned);
    balanceMap.set(employeeId, entry);
  }

  // ─── Helpers ───────────────────────────────────────────────────

  private emptyReport(groupId: string, startDate: Date, endDate: Date): FairnessReport {
    return {
      assignments: [],
      balanceReport: [],
      generatedAt: new Date(),
      groupId,
      dateRange: { start: startDate, end: endDate },
    };
  }

  private isEmployeeAvailableOnDate(employee: FairnessEmployee, date: Date): boolean {
    if (!employee.isActive) return false;
    const joinDateOnly = new Date(employee.joinDate);
    joinDateOnly.setUTCHours(0, 0, 0, 0);
    if (joinDateOnly > date) return false;
    if (employee.leaveDate) {
      const leaveDateOnly = new Date(employee.leaveDate);
      leaveDateOnly.setUTCHours(0, 0, 0, 0);
      if (leaveDateOnly < date) return false;
    }
    return true;
  }

  private isTaskDisabled(employee: FairnessEmployee, taskType: string): boolean {
    return employee.disabledTasks?.includes(taskType) ?? false;
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

    // Track monthly rules: only first occurrence per month
    const monthlyTracker = new Map<string, string>();

    while (current <= end) {
      const dayOfWeek = current.getDay() as DayOfWeek;
      const dateKey = this.dateToKey(current);

      if (!this.isHoliday(dateKey, holidays)) {
        for (const rule of rules) {
          if (this.shouldRuleApplyOnDate(rule, dayOfWeek, current, monthlyTracker)) {
            dates.push({ date: new Date(current), rule });
          }
        }
      }

      current.setDate(current.getDate() + 1);
    }

    return dates;
  }

  private isHoliday(dateKey: string, holidays?: Set<string>): boolean {
    return holidays?.has(dateKey) ?? false;
  }

  private shouldRuleApplyOnDate(
    rule: FairnessRule,
    dayOfWeek: DayOfWeek,
    current: Date,
    monthlyTracker: Map<string, string>,
  ): boolean {
    if (rule.frequencyType === "daily") {
      return dayOfWeek >= 1 && dayOfWeek <= 5;
    }

    if (rule.frequencyType === "monthly") {
      const monthKey = `${this.dateToMonthKey(current)}:${rule.id}`;
      if (rule.dayOfWeek === dayOfWeek && !monthlyTracker.has(monthKey)) {
        monthlyTracker.set(monthKey, this.dateToKey(current));
        return true;
      }
      return false;
    }

    // Weekly: applies on the specified dayOfWeek
    return rule.dayOfWeek === dayOfWeek;
  }

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

  /**
   * Build balance map from history, now tracking PER-TASK totals.
   */
  private calculateBalanceFromHistory(
    employees: FairnessEmployee[],
    historicalAssignments: FairnessHistoricalAssignment[],
    groupId: string
  ): Map<string, BalanceEntry> {
    const map = new Map<string, BalanceEntry>();

    for (const e of employees) {
      map.set(e.id, {
        total: 0, taskTotals: {}, monthly: {}, taskMonthly: {},
        lastDate: null, consecutive: 0,
      });
    }

    const groupAssignments = historicalAssignments.filter(
      (a) => a.groupId === groupId && a.isLocked
    );

    for (const a of groupAssignments) {
      const entry = map.get(a.employeeId);
      if (entry) {
        // Overall totals
        entry.total += 1;
        const monthKey = this.dateToMonthKey(a.date);
        entry.monthly[monthKey] = (entry.monthly[monthKey] ?? 0) + 1;

        // Per-task totals
        entry.taskTotals[a.taskType] = (entry.taskTotals[a.taskType] ?? 0) + 1;

        // Per-task monthly
        if (!entry.taskMonthly[a.taskType]) entry.taskMonthly[a.taskType] = {};
        entry.taskMonthly[a.taskType][monthKey] = (entry.taskMonthly[a.taskType][monthKey] ?? 0) + 1;

        if (!entry.lastDate || a.date > entry.lastDate) {
          entry.lastDate = a.date;
        }
      }
    }

    return map;
  }

  private countPlannedAssignments(employeeId: string, planned: FairnessAssignment[]): number {
    return planned.filter((a) => a.employeeId === employeeId).length;
  }

  private countPlannedMonthly(employeeId: string, monthKey: string, planned: FairnessAssignment[]): number {
    return planned.filter(
      (a) => a.employeeId === employeeId && this.dateToMonthKey(a.date) === monthKey
    ).length;
  }

  private getLastAssignmentDate(
    employeeId: string,
    beforeDate: Date,
    historical: FairnessHistoricalAssignment[],
    planned: FairnessAssignment[],
  ): Date | null {
    const allDates = [
      ...historical.filter((a) => a.employeeId === employeeId && a.date < beforeDate).map((a) => a.date),
      ...planned.filter((a) => a.employeeId === employeeId && a.date < beforeDate).map((a) => a.date),
    ];
    return allDates.length > 0
      ? allDates.reduce((latest, d) => (d > latest ? d : latest), allDates[0])
      : null;
  }

  private calculateConsecutive(
    employeeId: string,
    date: Date,
    historical: FairnessHistoricalAssignment[],
    planned: FairnessAssignment[]
  ): number {
    let count = 0;
    let checkDate = new Date(date);
    checkDate.setDate(checkDate.getDate() - 7);

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
    plannedAssignments: FairnessAssignment[] = [],
  ): EmployeeBalanceReport[] {
    const groupHistorical = historicalAssignments.filter((a) => a.groupId === groupId);
    const totalAssignmentsCount = groupHistorical.length + plannedAssignments.length;
    const avgTotal = employees.length > 0 ? totalAssignmentsCount / employees.length : 0;

    return employees.map((emp) => this.buildEmployeeBalanceReport(
      emp, groupHistorical, plannedAssignments, avgTotal
    ));
  }

  private buildEmployeeBalanceReport(
    emp: FairnessEmployee,
    groupHistorical: FairnessHistoricalAssignment[],
    plannedAssignments: FairnessAssignment[],
    avgTotal: number,
  ): EmployeeBalanceReport {
    const empHistorical = groupHistorical.filter((a) => a.employeeId === emp.id);
    const empPlanned = plannedAssignments.filter((a) => a.employeeId === emp.id);
    const total = empHistorical.length + empPlanned.length;

    const monthlyBalance = this.buildMonthlyBalance(empHistorical, empPlanned);

    // Build per-task breakdown
    const taskBreakdown: Record<string, number> = {};
    for (const a of empHistorical) {
      taskBreakdown[a.taskType] = (taskBreakdown[a.taskType] ?? 0) + 1;
    }
    for (const a of empPlanned) {
      taskBreakdown[a.taskType] = (taskBreakdown[a.taskType] ?? 0) + 1;
    }

    const allDates = [
      ...empHistorical.map((a) => a.date),
      ...empPlanned.map((a) => a.date),
    ];
    const lastDate = allDates.length > 0
      ? allDates.reduce((latest, d) => (d > latest ? d : latest), allDates[0])
      : null;

    return {
      employeeId: emp.id,
      employeeName: emp.name,
      totalAssignments: total,
      monthlyBalance,
      fairnessScore: avgTotal - total,
      lastAssignmentDate: lastDate,
      consecutiveCount: 0,
      taskBreakdown,
    };
  }

  private buildMonthlyBalance(
    historical: FairnessHistoricalAssignment[],
    planned: FairnessAssignment[],
  ): Record<string, number> {
    const monthly: Record<string, number> = {};
    for (const a of historical) {
      const mk = this.dateToMonthKey(a.date);
      monthly[mk] = (monthly[mk] ?? 0) + 1;
    }
    for (const a of planned) {
      const mk = this.dateToMonthKey(a.date);
      monthly[mk] = (monthly[mk] ?? 0) + 1;
    }
    return monthly;
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
