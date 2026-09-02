// Assignment Repository - Database access layer for Assignment
// Historical assignments are LOCKED and immutable

import { db } from "@/backend/infrastructure/database";
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
      orderBy: { taskName: "asc" },
    });
  },

  async findLockedByGroup(groupId: string) {
    return db.assignment.findMany({
      where: { groupId, isLocked: true },
      orderBy: { date: "asc" },
    });
  },

  async findAllByGroup(groupId: string) {
    return db.assignment.findMany({
      where: { groupId },
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

  /**
   * Delete assignments for a group.
   *
   * FIX (BUG-04): By default ONLY deletes unlocked (future/editable) assignments,
   * preserving the locked historical record. Pass { preserveLocked: false } to
   * also delete locked assignments (force purge — should be gated by admin).
   */
  async deleteAllByGroup(groupId: string, opts: { preserveLocked?: boolean } = {}) {
    const preserveLocked = opts.preserveLocked !== false; // default true
    return db.assignment.deleteMany({
      where: preserveLocked
        ? { groupId, isLocked: false }
        : { groupId },
    });
  },

  /**
   * Delete assignments for a group within a date range.
   *
   * FIX (BUG-04): By default ONLY deletes unlocked (future/editable) assignments,
   * preserving the locked historical record. Pass { preserveLocked: false } to
   * also delete locked assignments (force purge — should be gated by admin).
   */
  async deleteByGroupAndDateRange(
    groupId: string,
    startDate: Date,
    endDate: Date,
    opts: { preserveLocked?: boolean } = {}
  ) {
    const preserveLocked = opts.preserveLocked !== false; // default true
    return db.assignment.deleteMany({
      where: preserveLocked
        ? { groupId, isLocked: false, date: { gte: startDate, lte: endDate } }
        : { groupId, date: { gte: startDate, lte: endDate } },
    });
  },

  /**
   * Delete unlocked future assignments for a specific employee+task combination
   * Used when an employee's task eligibility is toggled OFF
   */
  async deleteUnlockedByEmployeeAndTask(
    employeeId: string,
    taskName: string,
    startDate: Date
  ) {
    return db.assignment.deleteMany({
      where: {
        employeeId,
        taskName,
        isLocked: false,
        date: { gte: startDate },
      },
    });
  },

  /**
   * Delete ALL unlocked future assignments for a specific employee
   * Used when an employee is deactivated or moved to another group
   */
  async deleteUnlockedByEmployee(
    employeeId: string,
    startDate: Date
  ) {
    return db.assignment.deleteMany({
      where: {
        employeeId,
        isLocked: false,
        date: { gte: startDate },
      },
    });
  },

  /**
   * Delete unlocked future assignments for a specific employee in a specific group
   * Used when an employee is moved to another group (remove old group assignments)
   */
  async deleteUnlockedByEmployeeAndGroup(
    employeeId: string,
    groupId: string,
    startDate: Date
  ) {
    return db.assignment.deleteMany({
      where: {
        employeeId,
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

  /**
   * Update the employee assigned to an assignment
   * Only works for unlocked (future) assignments
   */
  async updateEmployee(id: string, employeeId: string) {
    return db.assignment.update({
      where: { id },
      data: { employeeId },
      include: { employee: true, group: true },
    });
  },

  async countByEmployee(employeeId: string) {
    return db.assignment.count({ where: { employeeId } });
  },

  async countFutureByEmployee(employeeId: string, fromDate: Date) {
    return db.assignment.count({
      where: {
        employeeId,
        date: { gte: fromDate },
      },
    });
  },

  /**
   * Delete assignments for a specific employee.
   * By default ONLY deletes unlocked (future/editable) assignments.
   */
  async deleteAllByEmployee(employeeId: string, opts: { preserveLocked?: boolean } = {}) {
    const preserveLocked = opts.preserveLocked !== false;
    return db.assignment.deleteMany({
      where: preserveLocked
        ? { employeeId, isLocked: false }
        : { employeeId },
    });
  },

  /**
   * Delete assignments for a specific employee within a date range.
   * By default ONLY deletes unlocked (future/editable) assignments.
   */
  async deleteByEmployeeAndDateRange(
    employeeId: string,
    startDate: Date,
    endDate: Date,
    opts: { preserveLocked?: boolean } = {}
  ) {
    const preserveLocked = opts.preserveLocked !== false;
    return db.assignment.deleteMany({
      where: preserveLocked
        ? { employeeId, isLocked: false, date: { gte: startDate, lte: endDate } }
        : { employeeId, date: { gte: startDate, lte: endDate } },
    });
  },

  /**
   * Transactional assignment regeneration:
   * 1. Lock any past assignments that are still unlocked (including today)
   * 2. Delete unlocked assignments only within the requested [startDate, endDate]
   * 3. Create only NEW assignments (skip those that already exist)
   * All in a single transaction
   *
   * Days outside the requested range are left untouched, so regenerating a
   * partial range (e.g. a single day) no longer wipes the rest of the future.
   */
  async transactionalRegenerate(
    groupId: string,
    today: Date,
    startDate: Date,
    endDate: Date,
    newAssignments: Array<{
      employeeId: string;
      groupId: string;
      date: Date;
      ruleId: string | null;
      taskName: string;
      isLocked: boolean;
    }>
  ) {
    return db.$transaction(async (tx) => {
      // 1. Lock past assignments (including today).
      // FIX (BUG-08): use `lte` instead of `lt`. With `lt`, the assignment for
      // the current day was NOT locked, but the delete step below used `gte`
      // (>= today), so today's assignment fell in the "unlocked yet deletable"
      // limbo and was silently removed on regeneration. Locking today too keeps
      // it immutable before regenerating the future range.
      await tx.assignment.updateMany({
        where: {
          groupId,
          isLocked: false,
          date: { lte: today },
        },
        data: { isLocked: true },
      });

      // 2. Delete assignments in the requested range that are still unlocked.
      // FIX (BUG-09): scope the delete to [startDate, endDate]. Previously it
      // used `date: { gte: today }`, which wiped EVERY future unlocked
      // assignment regardless of the requested range — so regenerating a single
      // day (e.g. the 31st) also erased the whole next month (they were only
      // recreated for the requested range). Now only the days being regenerated
      // are cleaned up; the rest of the future stays intact.
      await tx.assignment.deleteMany({
        where: {
          groupId,
          isLocked: false,
          date: { gte: startDate, lte: endDate },
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

      // FIX (BUG-02): Also dedupe WITHIN newAssignments. Previously, if two rules
      // produced the same (date, taskName) pair, both passed the existingKeys
      // check and the second `create` threw P2002 Unique constraint -> ROLLBACK
      // -> 0 assignments and a 500. Now we track seen keys in this run too.
      const seenKeys = new Set<string>();
      const toCreate: Array<{
        employeeId: string;
        groupId: string;
        date: Date;
        ruleId: string | null;
        taskName: string;
        isLocked: boolean;
      }> = [];
      for (const a of newAssignments) {
        const key = `${new Date(a.date).getTime()}:${a.taskName}`;
        if (existingKeys.has(key) || seenKeys.has(key)) {
          // Skip - assignment already exists (locked historical OR already in this batch)
          continue;
        }
        seenKeys.add(key);
        toCreate.push(a);
      }

      // FIX (TIMEOUT): Use createMany instead of sequential creates to avoid
      // transaction timeout for large date ranges (e.g. 1 year).
      if (toCreate.length > 0) {
        await tx.assignment.createMany({ data: toCreate });
      }

      return toCreate;
    }, { timeout: 30000 });
  },
};
