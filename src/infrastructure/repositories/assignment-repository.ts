// Assignment Repository - Database access layer for Assignment
// Historical assignments are LOCKED and immutable

import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export interface FindAssignmentsOptions {
  groupId?: string;
  employeeId?: string;
  startDate?: Date;
  endDate?: Date;
  includeLocked?: boolean;
  includeUnlocked?: boolean;
}

export const assignmentRepository = {
  async findAll(options: FindAssignmentsOptions = {}) {
    const where: Prisma.AssignmentWhereInput = {};

    if (options.groupId) where.groupId = options.groupId;
    if (options.employeeId) where.employeeId = options.employeeId;

    if (options.startDate || options.endDate) {
      where.date = {};
      if (options.startDate) where.date.gte = options.startDate;
      if (options.endDate) where.date.lte = options.endDate;
    }

    if (options.includeLocked && !options.includeUnlocked) {
      where.isLocked = true;
    } else if (!options.includeLocked && options.includeUnlocked) {
      where.isLocked = false;
    }

    return db.assignment.findMany({
      where,
      include: {
        employee: true,
        group: true,
      },
      orderBy: { date: "asc" },
    });
  },

  async findById(id: string) {
    return db.assignment.findUnique({
      where: { id },
      include: { employee: true, group: true },
    });
  },

  async findByGroupAndDateRange(groupId: string, startDate: Date, endDate: Date) {
    return db.assignment.findMany({
      where: {
        groupId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: { employee: true },
      orderBy: { date: "asc" },
    });
  },

  async findByGroupAndDate(groupId: string, date: Date) {
    return db.assignment.findMany({
      where: {
        groupId,
        date,
      },
      include: { employee: true },
      orderBy: { taskType: "asc" },
    });
  },

  async findLockedByGroup(groupId: string) {
    return db.assignment.findMany({
      where: { groupId, isLocked: true },
      orderBy: { date: "asc" },
    });
  },

  async findUnlockedByGroup(groupId: string) {
    return db.assignment.findMany({
      where: { groupId, isLocked: false },
      orderBy: { date: "asc" },
    });
  },

  async create(data: Prisma.AssignmentCreateInput) {
    return db.assignment.create({ data });
  },

  async createMany(assignments: Prisma.AssignmentCreateManyInput[]) {
    return db.assignment.createMany({ data: assignments });
  },

  async deleteUnlockedByGroup(groupId: string, startDate: Date) {
    return db.assignment.deleteMany({
      where: {
        groupId,
        isLocked: false,
        date: { gte: startDate },
      },
    });
  },

  async lockPastAssignments(groupId: string, beforeDate: Date) {
    return db.assignment.updateMany({
      where: {
        groupId,
        isLocked: false,
        date: { lt: beforeDate },
      },
      data: { isLocked: true },
    });
  },

  async countByEmployee(employeeId: string) {
    return db.assignment.count({ where: { employeeId } });
  },

  async countByGroup(groupId: string) {
    return db.assignment.count({ where: { groupId } });
  },

  /**
   * Transactional assignment regeneration:
   * 1. Lock any past assignments that are still unlocked
   * 2. Delete all unlocked future assignments for the group
   * 3. Create only NEW assignments (skip those that already exist)
   * All in a single transaction
   */
  async transactionalRegenerate(
    groupId: string,
    today: Date,
    newAssignments: Array<{
      employeeId: string;
      groupId: string;
      date: Date;
      ruleId: string | null;
      taskType: string;
      isLocked: boolean;
    }>
  ) {
    return db.$transaction(async (tx) => {
      // 1. Lock past assignments
      await tx.assignment.updateMany({
        where: {
          groupId,
          isLocked: false,
          date: { lt: today },
        },
        data: { isLocked: true },
      });

      // 2. Delete unlocked future assignments
      await tx.assignment.deleteMany({
        where: {
          groupId,
          isLocked: false,
          date: { gte: today },
        },
      });

      // 3. Get all existing assignments for the group to avoid unique constraint violations
      const existingAssignments = await tx.assignment.findMany({
        where: { groupId },
        select: { date: true, taskName: true },
      });
      const existingKeys = new Set(
        existingAssignments.map((a) => `${a.date.getTime()}:${a.taskName}`)
      );

      // 4. Create only assignments that don't already exist
      const created = [];
      for (const a of newAssignments) {
        const key = `${new Date(a.date).getTime()}:${a.taskType}`;
        if (existingKeys.has(key)) {
          // Skip - assignment already exists (locked historical)
          continue;
        }
        const assignment = await tx.assignment.create({ data: a });
        created.push(assignment);
      }

      return created;
    });
  },
};
