// Task Eligibility Service - Business logic for task eligibility management
// Manages which tasks each employee can or cannot perform
// Syncs with assignments: when a task is disabled, future assignments are removed

import { db } from "@/backend/infrastructure/database";
import { assignmentService } from "./assignment-service";

export interface ToggleResult {
  eligibility: {
    id: string;
    employeeId: string;
    taskName: string;
    isEnabled: boolean;
  };
  deletedAssignments: number;
}

export const taskEligibilityService = {
  async getByEmployee(employeeId: string) {
    // Verify employee exists
    const employee = await db.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new Error("Empleado no encontrado");
    }

    const eligibility = await db.taskEligibility.findMany({
      where: { employeeId },
    });

    return eligibility;
  },

  /**
   * Toggle task eligibility for an employee
   * When disabling a task (isEnabled = false):
   *   - Automatically removes all unlocked future assignments for that employee+task
   *   - Returns the count of deleted assignments so the UI can inform the user
   * When enabling a task (isEnabled = true):
   *   - No assignment changes needed (next regeneration will include them)
   */
  async toggle(employeeId: string, taskName: string, isEnabled: boolean): Promise<ToggleResult> {
    // Verify employee exists
    const employee = await db.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new Error("Empleado no encontrado");
    }

    // 1. Update/create eligibility record
    const result = await db.taskEligibility.upsert({
      where: {
        employeeId_taskName: { employeeId, taskName },
      },
      update: { isEnabled },
      create: { employeeId, taskName, isEnabled },
    });

    // 2. Sync with assignments - remove future assignments if disabling
    const syncResult = await assignmentService.syncEligibilityChange(
      employeeId,
      taskName,
      isEnabled
    );

    return {
      eligibility: {
        id: result.id,
        employeeId: result.employeeId,
        taskName: result.taskName,
        isEnabled: result.isEnabled,
      },
      deletedAssignments: syncResult.deletedCount,
    };
  },
};
