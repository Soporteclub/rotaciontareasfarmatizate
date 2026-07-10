// Task Eligibility Repository - Per-employee task activation toggle
import { db } from "@/backend/infrastructure/database";
import type { Prisma } from "@prisma/client";

export interface FindEligibilityOptions {
  employeeId?: string;
  taskName?: string;
}

export const taskEligibilityRepository = {
  async findAll(options: FindEligibilityOptions = {}) {
    const where: Prisma.TaskEligibilityWhereInput = {};
    if (options.employeeId) where.employeeId = options.employeeId;
    if (options.taskName) where.taskName = options.taskName;
    return db.taskEligibility.findMany({ where, include: { employee: true } });
  },

  async findByEmployee(employeeId: string) {
    return db.taskEligibility.findMany({
      where: { employeeId },
      orderBy: { taskName: "asc" },
    });
  },

  async upsert(employeeId: string, taskName: string, isEnabled: boolean) {
    return db.taskEligibility.upsert({
      where: { employeeId_taskName: { employeeId, taskName } },
      update: { isEnabled },
      create: { employeeId, taskName, isEnabled },
    });
  },

  async bulkUpsert(entries: Array<{ employeeId: string; taskName: string; isEnabled: boolean }>) {
    const results: unknown[] = [];
    for (const entry of entries) {
      const result = await db.taskEligibility.upsert({
        where: { employeeId_taskName: { employeeId: entry.employeeId, taskName: entry.taskName } },
        update: { isEnabled: entry.isEnabled },
        create: { employeeId: entry.employeeId, taskName: entry.taskName, isEnabled: entry.isEnabled },
      });
      results.push(result);
    }
    return results;
  },

  async deleteByEmployee(employeeId: string) {
    return db.taskEligibility.deleteMany({ where: { employeeId } });
  },

  async getEnabledTasks(employeeId: string): Promise<string[]> {
    const eligibilities = await db.taskEligibility.findMany({
      where: { employeeId, isEnabled: true },
      select: { taskName: true },
    });
    return eligibilities.map((e) => e.taskName);
  },

  async getDisabledTasks(employeeId: string): Promise<string[]> {
    const eligibilities = await db.taskEligibility.findMany({
      where: { employeeId, isEnabled: false },
      select: { taskName: true },
    });
    return eligibilities.map((e) => e.taskName);
  },
};
