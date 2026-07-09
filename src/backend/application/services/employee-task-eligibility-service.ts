// Employee Task Eligibility Service - Business logic for per-employee task activation
// Controls which tasks each employee is eligible for
//
// FIX (BUG-03): update() and toggle() now call assignmentService.syncEligibilityChange
// for every task that is being DISABLED, so future assignments for that task are
// removed. Previously, disabling a task via PATCH /api/employees/[id]/task-eligibility
// left "ghost assignments" in the calendar that the admin could not explain.

import { employeeTaskEligibilityRepository, employeeRepository, ruleRepository, auditLogRepository } from "@/backend/infrastructure/repositories";
import { assignmentService } from "./assignment-service";

export interface TaskEligibilitySetting {
  taskLabel: string;
  isActive: boolean;
}

export interface EmployeeTaskEligibilityResponse {
  employeeId: string;
  employeeName: string;
  groupId: string;
  settings: TaskEligibilitySetting[];
}

export const employeeTaskEligibilityService = {
  /**
   * Get task eligibility settings for an employee
   * Combines existing records with all available taskLabels from the group's rules
   * Missing records = eligible by default (isActive: true)
   */
  async getByEmployee(employeeId: string): Promise<EmployeeTaskEligibilityResponse> {
    const employee = await employeeRepository.findById(employeeId);
    if (!employee) {
      throw new Error("Empleado no encontrado");
    }

    // Get all distinct taskLabels from the group's active rules
    const rules = await ruleRepository.findActiveByGroup(employee.groupId);
    const allTaskLabels = [...new Set(rules.map((r) => r.taskLabel))].sort();

    // Get existing eligibility records for this employee
    const existingRecords = await employeeTaskEligibilityRepository.findByEmployee(employeeId);
    const existingMap = new Map(existingRecords.map((r) => [r.taskName, r.isEnabled]));

    // Combine: if no record exists, employee is eligible (default true)
    const settings: TaskEligibilitySetting[] = allTaskLabels.map((taskLabel) => ({
      taskLabel,
      isActive: existingMap.has(taskLabel) ? existingMap.get(taskLabel)! : true,
    }));

    return {
      employeeId: employee.id,
      employeeName: employee.name,
      groupId: employee.groupId,
      settings,
    };
  },

  /**
   * Get task eligibility for all employees in a group
   */
  async getByGroup(groupId: string): Promise<EmployeeTaskEligibilityResponse[]> {
    const employees = await employeeRepository.findActiveByGroup(groupId);
    const results = await Promise.all(
      employees.map((e) => this.getByEmployee(e.id))
    );
    return results;
  },

  /**
   * Update task eligibility for an employee
   * Creates or updates records.
   *
   * FIX (BUG-03): for every task being DISABLED, calls assignmentService.syncEligibilityChange
   * so future unlocked assignments for that task are removed (no more "ghost assignments").
   */
  async update(employeeId: string, settings: TaskEligibilitySetting[]) {
    const employee = await employeeRepository.findById(employeeId);
    if (!employee) {
      throw new Error("Empleado no encontrado");
    }

    // Upsert all settings
    const results = await employeeTaskEligibilityRepository.batchUpsert(
      employeeId,
      settings.map((s) => ({
        taskLabel: s.taskLabel,
        isActive: s.isActive,
      }))
    );

    // FIX (BUG-03): sync assignments for every task being DISABLED.
    // This removes future unlocked assignments so the employee disappears from
    // the calendar for that task immediately (instead of waiting for the next
    // manual regeneration).
    let totalDeleted = 0;
    for (const s of settings) {
      if (!s.isActive) {
        const sync = await assignmentService.syncEligibilityChange(employeeId, s.taskLabel, false);
        totalDeleted += sync.deletedCount;
      }
    }

    // Audit log
    await auditLogRepository.create({
      entityType: "employee",
      entityId: employeeId,
      action: "update",
      changes: {
        type: "task_eligibility",
        settings: settings.map((s) => `${s.taskLabel}: ${s.isActive ? "activo" : "inactivo"}`).join(", "),
        deletedFutureAssignments: totalDeleted,
      },
      groupId: employee.groupId,
    });

    return results;
  },

  /**
   * Toggle a single task eligibility for an employee.
   *
   * FIX (BUG-03): syncs assignments when disabling (same as update()).
   */
  async toggle(employeeId: string, taskLabel: string, isActive: boolean) {
    const employee = await employeeRepository.findById(employeeId);
    if (!employee) {
      throw new Error("Empleado no encontrado");
    }

    const result = await employeeTaskEligibilityRepository.upsert(employeeId, taskLabel, isActive);

    // FIX (BUG-03): sync assignments when disabling
    let deletedAssignments = 0;
    if (!isActive) {
      const sync = await assignmentService.syncEligibilityChange(employeeId, taskLabel, false);
      deletedAssignments = sync.deletedCount;
    }

    // Audit log
    await auditLogRepository.create({
      entityType: "employee",
      entityId: employeeId,
      action: "update",
      changes: {
        type: "task_eligibility_toggle",
        taskLabel,
        isActive,
        deletedFutureAssignments: deletedAssignments,
      },
      groupId: employee.groupId,
    });

    return result;
  },

  /**
   * Reset task eligibility for an employee (remove all records = all eligible)
   */
  async reset(employeeId: string) {
    const employee = await employeeRepository.findById(employeeId);
    if (!employee) {
      throw new Error("Empleado no encontrado");
    }

    await employeeTaskEligibilityRepository.deleteByEmployee(employeeId);

    // Audit log
    await auditLogRepository.create({
      entityType: "employee",
      entityId: employeeId,
      action: "update",
      changes: { type: "task_eligibility_reset" },
      groupId: employee.groupId,
    });

    return { success: true };
  },
};
