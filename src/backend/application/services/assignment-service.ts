// Assignment Service - Business logic for assignment generation and management
// Uses the Fairness Engine for fair distribution
// Historical assignments are IMMUTABLE, only future can be regenerated

import { assignmentRepository, employeeRepository, ruleRepository, auditLogRepository, holidayRepository, taskEligibilityRepository } from "@/backend/infrastructure/repositories";
import { FairnessEngine } from "@/backend/domain/fairness";
import type { FairnessEngineInput } from "@/backend/domain/fairness";
import type { GenerateAssignmentsInput } from "@/backend/application/validators/schemas";

const fairnessEngine = new FairnessEngine();

export const assignmentService = {
  /**
   * Get assignments for a group within a date range
   */
  async getByGroupAndDateRange(groupId: string, startDate: Date, endDate: Date) {
    return assignmentRepository.findByGroupAndDateRange(groupId, startDate, endDate);
  },

  /**
   * Get all assignments for display (calendar view)
   */
  async getAllForCalendar(startDate?: Date, endDate?: Date) {
    return assignmentRepository.findAll({
      startDate,
      endDate,
    });
  },

  /**
   * Generate fair assignments using the Fairness Engine
   * - Locks past assignments first
   * - Deletes only UNLOCKED (future) assignments
   * - Creates new assignments via transaction
   * - NEVER modifies locked (historical) assignments
   */
  async generate(input: GenerateAssignmentsInput) {
    const { groupId, startDate: startStr, endDate: endStr } = input;
    // FIX (BUG-01): Use UTC explicitly. `new Date("2026-07-01")` parses as UTC
    // midnight, but `today.setHours(0,0,0,0)` uses LOCAL time. On a server in
    // America/Bogota (UTC-5) the two references diverged by 5 hours, causing
    // assignments for "today" to be misclassified as future/past and silently
    // deleted on regeneration. Now everything is UTC.
    const startDate = new Date(`${startStr}T00:00:00.000Z`);
    const endDate = new Date(`${endStr}T23:59:59.999Z`);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // 1. Get active employees in the group
    const employees = await employeeRepository.findActiveByGroup(groupId);
    if (employees.length === 0) {
      throw new Error("No hay empleados activos en el grupo para generar asignaciones");
    }

    // 2. Get active rules for the group
    const rules = await ruleRepository.findActiveByGroup(groupId);
    if (rules.length === 0) {
      throw new Error("No hay reglas activas para el grupo");
    }

    // 2.5. Load task eligibility data for each employee (disabled tasks)
    const employeeDisabledTasks = new Map<string, string[]>();
    for (const emp of employees) {
      const disabled = await taskEligibilityRepository.getDisabledTasks(emp.id);
      if (disabled.length > 0) {
        employeeDisabledTasks.set(emp.id, disabled);
      }
    }

    // 3. Get all historical assignments (locked ones)
    const allAssignments = await assignmentRepository.findByGroupAndDateRange(
      groupId,
      new Date("2020-01-01"), // get everything from the beginning
      new Date("2030-12-31")  // far future
    );

    // 4. Get holidays for the date range
    const holidaySet = await holidayRepository.getHolidayDateSet(
      new Date("2020-01-01"),
      new Date("2030-12-31")
    );

    // 5. Prepare fairness engine input
    const fairnessInput: FairnessEngineInput = {
      employees: employees.map((e) => ({
        id: e.id,
        name: e.name,
        groupId: e.groupId,
        isActive: e.isActive,
        joinDate: e.joinDate,
        leaveDate: e.leaveDate,
        disabledTasks: employeeDisabledTasks.get(e.id) ?? [],
      })),
      rules: rules.map((r) => ({
        id: r.id,
        groupId: r.groupId,
        dayOfWeek: r.dayOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6,
        frequencyType: (r.frequencyType as "daily" | "weekly" | "monthly") || "weekly",
        taskLabel: r.taskLabel,
        validFrom: r.validFrom,
        validTo: r.validTo,
        isActive: r.isActive,
      })),
      historicalAssignments: allAssignments.map((a) => ({
        id: a.id,
        employeeId: a.employeeId,
        groupId: a.groupId,
        date: a.date,
        taskType: a.taskName,
        isLocked: a.isLocked,
      })),
      groupId,
      startDate,
      endDate,
      holidays: holidaySet,
    };

    // 6. Run fairness engine
    const report = fairnessEngine.generateAssignments(fairnessInput);

    // 7. Transactional regeneration (safe, atomic)
    const newAssignmentData = report.assignments.map((a) => ({
      employeeId: a.employeeId,
      groupId: a.groupId,
      date: a.date,
      ruleId: a.ruleId,
      taskName: a.taskType,
      isLocked: false, // new assignments are unlocked until they become past
    }));

    // Separate future and past assignments
    const futureAssignments = newAssignmentData.filter((a) => new Date(a.date) >= today);
    const pastAssignments = newAssignmentData.filter((a) => new Date(a.date) < today);

    // For past assignments: only include those that don't already exist as locked records
    // Build a set of existing locked assignments (groupId + date + taskName) to filter duplicates
    const existingLockedSet = new Set(
      allAssignments
        .filter((a) => a.isLocked)
        .map((a) => `${new Date(a.date).getTime()}:${a.taskName}`)
    );

    const lockedPastAssignments = pastAssignments
      .filter((a) => {
        const key = `${new Date(a.date).getTime()}:${a.taskName}`;
        return !existingLockedSet.has(key); // Only include if NOT already locked in DB
      })
      .map((a) => ({
        ...a,
        isLocked: true,
      }));

    const created = await assignmentRepository.transactionalRegenerate(
      groupId,
      today,
      [...lockedPastAssignments, ...futureAssignments]
    );

    // 8. Audit log
    await auditLogRepository.create({
      entityType: "assignment",
      entityId: "batch",
      action: "regenerate",
      changes: {
        groupId,
        startDate: startStr,
        endDate: endStr,
        assignmentsGenerated: created.length,
        fairnessReport: {
          balanceReport: report.balanceReport.map((b) => ({
            employeeId: b.employeeId,
            name: b.employeeName,
            totalAssignments: b.totalAssignments,
            fairnessScore: b.fairnessScore,
          })),
        },
      },
      groupId,
    });

    return {
      assignments: created,
      balanceReport: report.balanceReport,
      generatedAt: report.generatedAt,
    };
  },

  /**
   * Lock all past assignments that are still unlocked
   */
  async lockPastAssignments(groupId: string) {
    // FIX (BUG-01): UTC explicit
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const result = await assignmentRepository.lockPastAssignments(groupId, today);

    await auditLogRepository.create({
      entityType: "assignment",
      entityId: "batch",
      action: "lock",
      changes: { groupId, lockedCount: result.count },
      groupId,
    });

    return result;
  },

  /**
   * Sync eligibility change with assignments
   * When an employee's task is toggled OFF, remove all unlocked future assignments
   * for that employee+task combination so they don't appear in future schedules.
   * When toggled ON, no action needed (next regeneration will include them).
   */
  async syncEligibilityChange(employeeId: string, taskName: string, isEnabled: boolean) {
    if (isEnabled) {
      // Enabling a task - no need to remove assignments, next regeneration will include them
      return { deletedCount: 0 };
    }

    // Disabling a task - remove all unlocked future assignments for this employee+task
    // FIX (BUG-01): UTC explicit
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const result = await assignmentRepository.deleteUnlockedByEmployeeAndTask(
      employeeId,
      taskName,
      today
    );

    // Audit log
    await auditLogRepository.create({
      entityType: "assignment",
      entityId: "eligibility-sync",
      action: "syncEligibility",
      changes: {
        employeeId,
        taskName,
        isEnabled,
        deletedAssignments: result.count,
      },
    });

    return { deletedCount: result.count };
  },

  /**
   * Delete assignments for a group.
   *
   * FIX (BUG-04): By default ONLY deletes unlocked (future/editable) assignments,
   * preserving the locked historical record. Pass { preserveLocked: false } to
   * also delete locked assignments (force purge).
   */
  async deleteAllByGroup(groupId: string, opts: { preserveLocked?: boolean } = {}) {
    const result = await assignmentRepository.deleteAllByGroup(groupId, opts);

    await auditLogRepository.create({
      entityType: "assignment",
      entityId: "batch",
      action: "deleteRange",
      changes: {
        groupId,
        deletedCount: result.count,
        preserveLocked: opts.preserveLocked !== false,
        description: opts.preserveLocked !== false
          ? "Eliminacion de asignaciones futuras (desbloqueadas) del grupo"
          : "Eliminacion COMPLETA de asignaciones del grupo (incluye historico bloqueado)",
      },
      groupId,
    });

    return { deletedCount: result.count };
  },

  /**
   * Delete assignments for a group within a date range.
   *
   * FIX (BUG-04): By default ONLY deletes unlocked (future/editable) assignments,
   * preserving the locked historical record. Pass { preserveLocked: false } to
   * also delete locked assignments (force purge).
   */
  async deleteByGroupAndDateRange(
    groupId: string,
    startDate: string,
    endDate: string,
    opts: { preserveLocked?: boolean } = {}
  ) {
    // FIX (BUG-01): Use UTC date parsing to avoid timezone shifts.
    // "2026-07-31" -> start of day UTC to end of day UTC
    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${endDate}T23:59:59.999Z`);

    const result = await assignmentRepository.deleteByGroupAndDateRange(groupId, start, end, opts);

    await auditLogRepository.create({
      entityType: "assignment",
      entityId: "batch",
      action: "deleteRange",
      changes: {
        groupId,
        startDate,
        endDate,
        deletedCount: result.count,
        preserveLocked: opts.preserveLocked !== false,
        description: opts.preserveLocked !== false
          ? "Eliminacion de asignaciones futuras (desbloqueadas) por rango de fechas"
          : "Eliminacion COMPLETA por rango de fechas (incluye historico bloqueado)",
      },
      groupId,
    });

    return { deletedCount: result.count };
  },

  /**
   * Get fairness balance report for a group
   * Counts ALL assignments (locked + unlocked) for accurate balance display
   * Includes date range of the data
   * Optionally filters by startDate/endDate
   */
  async getBalanceReport(groupId: string, startDate?: string, endDate?: string) {
    const employees = await employeeRepository.findActiveByGroup(groupId);

    // Load disabled tasks for each employee
    const disabledTasksMap = new Map<string, Set<string>>();
    for (const emp of employees) {
      const disabled = await taskEligibilityRepository.getDisabledTasks(emp.id);
      disabledTasksMap.set(emp.id, new Set(disabled));
    }

    // When date range is provided, fetch only assignments within that range.
    // FIX (BUG-07): normalize endDate to end-of-day UTC. Previously
    // `new Date("2026-07-31")` = 2026-07-31T00:00:00Z excluded any assignment
    // on the 31st stored at 00:00 LOCAL (05:00Z). Now we use T23:59:59.999Z.
    const assignments = (startDate && endDate)
      ? await assignmentRepository.findByGroupAndDateRange(
          groupId,
          new Date(`${startDate}T00:00:00.000Z`),
          new Date(`${endDate}T23:59:59.999Z`)
        )
      : await assignmentRepository.findAllByGroup(groupId);

    const totalAll = assignments.length;
    const avgAll = employees.length > 0 ? totalAll / employees.length : 0;

    // Get all unique task types
    const allTaskTypes = [...new Set(assignments.map((a) => a.taskName))].sort();

    // Calculate per-task averages among ELIGIBLE employees only
    const taskAverages: Record<string, number> = {};
    for (const taskType of allTaskTypes) {
      const eligibleForTask = employees.filter(
        (e) => !(disabledTasksMap.get(e.id)?.has(taskType))
      );
      const taskAssignments = assignments.filter((a) => a.taskName === taskType);
      taskAverages[taskType] = eligibleForTask.length > 0
        ? taskAssignments.length / eligibleForTask.length
        : 0;
    }

    // Calculate date range from assignments
    let dateRange: { from: string | null; to: string | null } = { from: null, to: null };
    if (assignments.length > 0) {
      const dates = assignments.map((a) => new Date(a.date).getTime());
      const minDate = new Date(Math.min(...dates));
      const maxDate = new Date(Math.max(...dates));
      const pad = (n: number) => String(n).padStart(2, "0");
      dateRange = {
        from: `${minDate.getFullYear()}-${pad(minDate.getMonth() + 1)}-${pad(minDate.getDate())}`,
        to: `${maxDate.getFullYear()}-${pad(maxDate.getMonth() + 1)}-${pad(maxDate.getDate())}`,
      };
    }

    const report: Array<{
      employeeId: string;
      employeeName: string;
      totalAssignments: number;
      monthlyBalance: Record<string, number>;
      fairnessScore: number;
      taskBreakdown: Record<string, number>;
    }> = [];

    for (const emp of employees) {
      const empAssignments = assignments.filter((a) => a.employeeId === emp.id);
      const monthlyBalance: Record<string, number> = {};

      // Per-task breakdown
      const taskBreakdown: Record<string, number> = {};
      for (const a of empAssignments) {
        taskBreakdown[a.taskName] = (taskBreakdown[a.taskName] ?? 0) + 1;

        const d = new Date(a.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthlyBalance[key] = (monthlyBalance[key] ?? 0) + 1;
      }

      // Calculate per-task fairness score (sum of deficits across eligible tasks)
      // Positive = employee has fewer turns than average for their eligible tasks (owes them)
      // Negative = employee has more turns than average for their eligible tasks (is owed rest)
      let fairnessScore = 0;
      const empDisabled = disabledTasksMap.get(emp.id) ?? new Set();
      for (const taskType of allTaskTypes) {
        if (empDisabled.has(taskType)) continue; // Skip tasks this employee is ineligible for
        const empTaskCount = taskBreakdown[taskType] ?? 0;
        const avgForTask = taskAverages[taskType] ?? 0;
        fairnessScore += avgForTask - empTaskCount;
      }
      fairnessScore = Math.round(fairnessScore * 100) / 100;

      report.push({
        employeeId: emp.id,
        employeeName: emp.name,
        totalAssignments: empAssignments.length,
        monthlyBalance,
        fairnessScore,
        taskBreakdown,
      });
    }

    return { report, dateRange, totalAssignments: totalAll, employeeCount: employees.length, averagePerEmployee: Math.round(avgAll * 100) / 100 };
  },
};
