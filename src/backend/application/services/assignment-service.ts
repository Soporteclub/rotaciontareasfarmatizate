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
    const startDate = new Date(startStr);
    const endDate = new Date(endStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

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

    // Only create assignments from today onwards (past dates should be locked)
    const futureAssignments = newAssignmentData.filter((a) => new Date(a.date) >= today);
    const pastAssignments = newAssignmentData.filter((a) => new Date(a.date) < today);

    // Past assignments that don't exist yet should also be created but locked
    const lockedPastAssignments = pastAssignments.map((a) => ({
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);

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
    const today = new Date();
    today.setHours(0, 0, 0, 0);

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
   * Get fairness balance report for a group
   * Counts ALL assignments (locked + unlocked) for accurate balance display
   * Includes date range of the data
   * Optionally filters by startDate/endDate
   */
  async getBalanceReport(groupId: string, startDate?: string, endDate?: string) {
    const employees = await employeeRepository.findActiveByGroup(groupId);

    // When date range is provided, fetch only assignments within that range
    const assignments = (startDate && endDate)
      ? await assignmentRepository.findByGroupAndDateRange(
          groupId,
          new Date(startDate),
          new Date(endDate)
        )
      : await assignmentRepository.findAllByGroup(groupId);

    const totalAll = assignments.length;
    const avgAll = employees.length > 0 ? totalAll / employees.length : 0;

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
    }> = [];

    for (const emp of employees) {
      const empAssignments = assignments.filter((a) => a.employeeId === emp.id);
      const monthlyBalance: Record<string, number> = {};

      for (const a of empAssignments) {
        const d = new Date(a.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthlyBalance[key] = (monthlyBalance[key] ?? 0) + 1;
      }

      report.push({
        employeeId: emp.id,
        employeeName: emp.name,
        totalAssignments: empAssignments.length,
        monthlyBalance,
        fairnessScore: Math.round((avgAll - empAssignments.length) * 100) / 100,
      });
    }

    return { report, dateRange, totalAssignments: totalAll, employeeCount: employees.length, averagePerEmployee: Math.round(avgAll * 100) / 100 };
  },
};
