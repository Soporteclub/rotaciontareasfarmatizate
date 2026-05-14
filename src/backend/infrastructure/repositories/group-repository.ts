// Group Repository - Database access layer for Group
// No business logic here, only data access

import { db } from "@/backend/infrastructure/database";
import type { Prisma } from "@prisma/client";

export interface FindGroupsOptions {
  includeInactive?: boolean;
  includeEmployees?: boolean;
  includeRules?: boolean;
}

export const groupRepository = {
  async findAll(options: FindGroupsOptions = {}) {
    const where: Prisma.GroupWhereInput = {};
    if (!options.includeInactive) {
      where.isActive = true;
    }

    const include: Prisma.GroupInclude = {};
    if (options.includeEmployees) {
      include.employees = { where: { isActive: true }, orderBy: { name: "asc" } };
    }
    if (options.includeRules) {
      include.rules = { where: { isActive: true }, orderBy: { dayOfWeek: "asc" } };
    }

    return db.group.findMany({
      where,
      include: Object.keys(include).length > 0 ? include : undefined,
      orderBy: { name: "asc" },
    });
  },

  async findById(id: string, options: FindGroupsOptions = {}) {
    const include: Prisma.GroupInclude = {};
    if (options.includeEmployees) {
      include.employees = { orderBy: { name: "asc" } };
    }
    if (options.includeRules) {
      include.rules = { orderBy: { dayOfWeek: "asc" } };
    }

    return db.group.findUnique({
      where: { id },
      include: Object.keys(include).length > 0 ? include : undefined,
    });
  },

  async findByName(name: string) {
    return db.group.findUnique({ where: { name } });
  },

  async create(data: Prisma.GroupCreateInput) {
    return db.group.create({ data });
  },

  async update(id: string, data: Prisma.GroupUpdateInput) {
    return db.group.update({ where: { id }, data });
  },

  async softDelete(id: string) {
    return db.group.update({
      where: { id },
      data: { isActive: false },
    });
  },
};
