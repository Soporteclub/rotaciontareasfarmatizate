// Assignment Service - Business logic for assignment generation and management
// Uses the Fairness Engine for fair distribution
// Historical assignments are IMMUTABLE, only future can be regenerated

import { assignmentRepository, employeeRepository, ruleRepository, auditLogRepository } from "@/backend/infrastructure/repositories";
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

    // 3. Get all historical assignments (locked ones)
    const allAssignments = await assignmentRepository.findByGroupAndDateRange(
      groupId,
      new Date("2020-01-01"), // get everything from the beginning
      new Date("2030-12-31")  // far future
    );

    // 4. Prepare fairness engine input
    const fairnessInput: FairnessEngineInput = {
      employees: employees.map((e) => ({
        id: e.id,
        name: e.name,
        groupId: e.groupId,
        isActive: e.isActive,
        joinDate: e.joinDate,
        leaveDate: e.leaveDate,
      })),
      rules: rules.map((r) => ({
        id: r.id,
        groupId: r.groupId,
        dayOfWeek: r.dayOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6,
        frequency: r.frequency,
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
        taskType: a.taskType,
        isLocked: a.isLocked,
      })),
      groupId,
      startDate,
      endDate,
    };

    // 5. Run fairness engine
    const report = fairnessEngine.generateAssignments(fairnessInput);

    // 6. Transactional regeneration (safe, atomic)
    const newAssignmentData = report.assignments.map((a) => ({
      employeeId: a.employeeId,
      groupId: a.groupId,
      date: a.date,
      ruleId: a.ruleId,
      taskType: a.taskType,
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

    // 7. Audit log
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
   * Get fairness balance report for a group
   */
  async getBalanceReport(groupId: string) {
    const employees = await employeeRepository.findActiveByGroup(groupId);
    const assignments = await assignmentRepository.findLockedByGroup(groupId);

    const report: Array<{
      employeeId: string;
      employeeName: string;
      totalAssignments: number;
      monthlyBalance: Record<string, number>;
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
      });
    }

    return report;
  },
};
