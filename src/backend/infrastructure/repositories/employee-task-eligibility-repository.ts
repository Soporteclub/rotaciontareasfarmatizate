// EmployeeTaskEligibility Repository - Database access layer for per-employee task activation
// Controls which tasks each employee is eligible for
// Uses the Prisma TaskEligibility model (task_eligibility table)

import { db } from "@/backend/infrastructure/database";
import type { Prisma } from "@prisma/client";

export interface FindEligibilityOptions {
  employeeId?: string;
  taskName?: string;
  isEnabled?: boolean;
}

export const employeeTaskEligibilityRepository = {
  /**
   * Find all eligibility records matching the given options
   */
  async findAll(options: FindEligibilityOptions = {}) {
    const where: Prisma.TaskEligibilityWhereInput = {};
    if (options.employeeId) where.employeeId = options.employeeId;
    if (options.taskName) where.taskName = options.taskName;
    if (options.isEnabled !== undefined) where.isEnabled = options.isEnabled;

    return db.taskEligibility.findMany({
      where,
      orderBy: [{ taskName: "asc" }],
    });
  },

  /**
   * Find eligibility records for a specific employee
   */
  async findByEmployee(employeeId: string) {
    return db.taskEligibility.findMany({
      where: { employeeId },
      orderBy: [{ taskName: "asc" }],
    });
  },

  /**
   * Find all employees who are INELIGIBLE (isEnabled=false) for a specific task
   * Returns a Set of employeeIds for fast lookup
   */
  async getIneligibleEmployeeIds(taskName: string, groupId?: string): Promise<Set<string>> {
    const where: Prisma.TaskEligibilityWhereInput = {
      taskName,
      isEnabled: false,
    };

    if (groupId) {
      where.employee = { groupId };
    }

    const records = await db.taskEligibility.findMany({
      where,
      select: { employeeId: true },
    });

    return new Set(records.map((r) => r.employeeId));
  },

  /**
   * Get a map of taskName -> Set<employeeId> for ineligible employees
   * Useful for the Fairness Engine to filter in bulk
   */
  async getIneligibilityMap(groupEmployeeIds: string[]): Promise<Map<string, Set<string>>> {
    if (groupEmployeeIds.length === 0) return new Map();

    const records = await db.taskEligibility.findMany({
      where: {
        employeeId: { in: groupEmployeeIds },
        isEnabled: false,
      },
      select: { employeeId: true, taskName: true },
    });

    const map = new Map<string, Set<string>>();
    for (const r of records) {
      if (!map.has(r.taskName)) {
        map.set(r.taskName, new Set());
      }
      map.get(r.taskName)!.add(r.employeeId);
    }

    return map;
  },

  /**
   * Get or create an eligibility record for an employee + taskName
   */
  async upsert(employeeId: string, taskName: string, isEnabled: boolean) {
    return db.taskEligibility.upsert({
      where: {
        employeeId_taskName: { employeeId, taskName },
      },
      update: { isEnabled },
      create: { employeeId, taskName, isEnabled },
    });
  },

  /**
   * Batch upsert: set eligibility for multiple taskNames for one employee
   */
  async batchUpsert(employeeId: string, settings: Array<{ taskLabel: string; isActive: boolean }>) {
    const results = await Promise.all(
      settings.map((s) =>
        db.taskEligibility.upsert({
          where: {
            employeeId_taskName: { employeeId, taskName: s.taskLabel },
          },
          update: { isEnabled: s.isActive },
          create: { employeeId, taskName: s.taskLabel, isEnabled: s.isActive },
        })
      )
    );
    return results;
  },

  /**
   * Delete an eligibility record (employee becomes eligible by default again)
   */
  async delete(employeeId: string, taskName: string) {
    return db.taskEligibility.deleteMany({
      where: { employeeId, taskName },
    });
  },

  /**
   * Delete all eligibility records for an employee
   */
  async deleteByEmployee(employeeId: string) {
    return db.taskEligibility.deleteMany({
      where: { employeeId },
    });
  },

  /**
   * Get distinct task names that exist in the eligibility table
   */
  async getDistinctTaskLabels(): Promise<string[]> {
    const results = await db.taskEligibility.findMany({
      distinct: ["taskName"],
      select: { taskName: true },
    });
    return results.map((r) => r.taskName);
  },
};
