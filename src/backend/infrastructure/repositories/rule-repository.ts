// Rule Repository - Database access layer for AssignmentRule
// Rules are configurable (NOT hardcoded)

import { db } from "@/backend/infrastructure/database";
import type { Prisma } from "@prisma/client";

export interface FindRulesOptions {
  groupId?: string;
  includeInactive?: boolean;
}

export const ruleRepository = {
  async findAll(options: FindRulesOptions = {}) {
    const where: Prisma.AssignmentRuleWhereInput = {};
    if (!options.includeInactive) {
      where.isActive = true;
    }
    if (options.groupId) {
      where.groupId = options.groupId;
    }

    return db.assignmentRule.findMany({
      where,
      include: { group: true },
      orderBy: [{ dayOfWeek: "asc" }, { frequency: "asc" }],
    });
  },

  async findById(id: string) {
    return db.assignmentRule.findUnique({
      where: { id },
      include: { group: true },
    });
  },

  async findByGroup(groupId: string, includeInactive = false) {
    return db.assignmentRule.findMany({
      where: {
        groupId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: [{ dayOfWeek: "asc" }, { frequency: "asc" }],
    });
  },

  async create(data: Prisma.AssignmentRuleCreateInput) {
    return db.assignmentRule.create({ data });
  },

  async update(id: string, data: Prisma.AssignmentRuleUpdateInput) {
    return db.assignmentRule.update({ where: { id }, data });
  },

  async softDelete(id: string) {
    return db.assignmentRule.update({
      where: { id },
      data: { isActive: false },
    });
  },

  async hardDelete(id: string) {
    return db.assignmentRule.delete({
      where: { id },
    });
  },

  async findActiveByGroup(groupId: string) {
    return db.assignmentRule.findMany({
      where: {
        groupId,
        isActive: true,
      },
      orderBy: [{ dayOfWeek: "asc" }, { frequency: "asc" }],
    });
  },
};
