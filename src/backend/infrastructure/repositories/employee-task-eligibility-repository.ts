// EmployeeTaskEligibility Repository - Database access layer for per-employee task activation
// Controls which tasks each employee is eligible for

import { db } from "@/backend/infrastructure/database";
import type { Prisma } from "@prisma/client";

export interface FindEligibilityOptions {
  employeeId?: string;
  taskLabel?: string;
  isActive?: boolean;
}

export const employeeTaskEligibilityRepository = {
  /**
   * Find all eligibility records matching the given options
   */
  async findAll(options: FindEligibilityOptions = {}) {
    const where: Prisma.EmployeeTaskEligibilityWhereInput = {};
    if (options.employeeId) where.employeeId = options.employeeId;
    if (options.taskLabel) where.taskLabel = options.taskLabel;
    if (options.isActive !== undefined) where.isActive = options.isActive;

    return db.employeeTaskEligibility.findMany({
      where,
      orderBy: [{ taskLabel: "asc" }],
    });
  },

  /**
   * Find eligibility records for a specific employee
   */
  async findByEmployee(employeeId: string) {
    return db.employeeTaskEligibility.findMany({
      where: { employeeId },
      orderBy: [{ taskLabel: "asc" }],
    });
  },

  /**
   * Find all employees who are INELIGIBLE (isActive=false) for a specific task
   * Returns a Set of employeeIds for fast lookup
   */
  async getIneligibleEmployeeIds(taskLabel: string, groupId?: string): Promise<Set<string>> {
    const where: Prisma.EmployeeTaskEligibilityWhereInput = {
      taskLabel,
      isActive: false,
    };

    if (groupId) {
      where.employee = { groupId };
    }

    const records = await db.employeeTaskEligibility.findMany({
      where,
      select: { employeeId: true },
    });

    return new Set(records.map((r) => r.employeeId));
  },

  /**
   * Get a map of taskLabel -> Set<employeeId> for ineligible employees
   * Useful for the Fairness Engine to filter in bulk
   */
  async getIneligibilityMap(groupEmployeeIds: string[]): Promise<Map<string, Set<string>>> {
    if (groupEmployeeIds.length === 0) return new Map();

    const records = await db.employeeTaskEligibility.findMany({
      where: {
        employeeId: { in: groupEmployeeIds },
        isActive: false,
      },
      select: { employeeId: true, taskLabel: true },
    });

    const map = new Map<string, Set<string>>();
    for (const r of records) {
      if (!map.has(r.taskLabel)) {
        map.set(r.taskLabel, new Set());
      }
      map.get(r.taskLabel)!.add(r.employeeId);
    }

    return map;
  },

  /**
   * Get or create an eligibility record for an employee + taskLabel
   */
  async upsert(employeeId: string, taskLabel: string, isActive: boolean) {
    return db.employeeTaskEligibility.upsert({
      where: {
        employeeId_taskLabel: { employeeId, taskLabel },
      },
      update: { isActive },
      create: { employeeId, taskLabel, isActive },
    });
  },

  /**
   * Batch upsert: set eligibility for multiple taskLabels for one employee
   */
  async batchUpsert(employeeId: string, settings: Array<{ taskLabel: string; isActive: boolean }>) {
    const results = await Promise.all(
      settings.map((s) =>
        db.employeeTaskEligibility.upsert({
          where: {
            employeeId_taskLabel: { employeeId, taskLabel: s.taskLabel },
          },
          update: { isActive: s.isActive },
          create: { employeeId, taskLabel: s.taskLabel, isActive: s.isActive },
        })
      )
    );
    return results;
  },

  /**
   * Delete an eligibility record (employee becomes eligible by default again)
   */
  async delete(employeeId: string, taskLabel: string) {
    return db.employeeTaskEligibility.deleteMany({
      where: { employeeId, taskLabel },
    });
  },

  /**
   * Delete all eligibility records for an employee
   */
  async deleteByEmployee(employeeId: string) {
    return db.employeeTaskEligibility.deleteMany({
      where: { employeeId },
    });
  },

  /**
   * Get distinct task labels that exist in the eligibility table
   */
  async getDistinctTaskLabels(): Promise<string[]> {
    const results = await db.employeeTaskEligibility.findMany({
      distinct: ["taskLabel"],
      select: { taskLabel: true },
    });
    return results.map((r) => r.taskLabel);
  },
};
