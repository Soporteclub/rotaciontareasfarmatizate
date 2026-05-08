// Group Repository - Database access layer for AssignmentGroup
// No business logic here, only data access

import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export interface FindGroupsOptions {
  includeInactive?: boolean;
  includeEmployees?: boolean;
  includeRules?: boolean;
}

export const groupRepository = {
  async findAll(options: FindGroupsOptions = {}) {
    const where: Prisma.AssignmentGroupWhereInput = {};
    if (!options.includeInactive) {
      where.isActive = true;
    }

    const include: Prisma.AssignmentGroupInclude = {};
    if (options.includeEmployees) {
      include.employees = { where: { isActive: true }, orderBy: { name: "asc" } };
    }
    if (options.includeRules) {
      include.rules = { where: { isActive: true }, orderBy: { dayOfWeek: "asc" } };
    }

    return db.assignmentGroup.findMany({
      where,
      include: Object.keys(include).length > 0 ? include : undefined,
      orderBy: { name: "asc" },
    });
  },

  async findById(id: string, options: FindGroupsOptions = {}) {
    const include: Prisma.AssignmentGroupInclude = {};
    if (options.includeEmployees) {
      include.employees = { orderBy: { name: "asc" } };
    }
    if (options.includeRules) {
      include.rules = { orderBy: { dayOfWeek: "asc" } };
    }

    return db.assignmentGroup.findUnique({
      where: { id },
      include: Object.keys(include).length > 0 ? include : undefined,
    });
  },

  async findByName(name: string) {
    return db.assignmentGroup.findUnique({ where: { name } });
  },

  async create(data: Prisma.AssignmentGroupCreateInput) {
    return db.assignmentGroup.create({ data });
  },

  async update(id: string, data: Prisma.AssignmentGroupUpdateInput) {
    return db.assignmentGroup.update({ where: { id }, data });
  },

  async softDelete(id: string) {
    return db.assignmentGroup.update({
      where: { id },
      data: { isActive: false },
    });
  },
};
