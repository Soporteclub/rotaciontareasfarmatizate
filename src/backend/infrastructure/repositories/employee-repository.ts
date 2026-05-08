// Employee Repository - Database access layer for Employee
// Supports high rotation: active/inactive, join/leave dates

import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export interface FindEmployeesOptions {
  groupId?: string;
  includeInactive?: boolean;
  includeAssignments?: boolean;
}

export const employeeRepository = {
  async findAll(options: FindEmployeesOptions = {}) {
    const where: Prisma.EmployeeWhereInput = {};
    if (!options.includeInactive) {
      where.isActive = true;
    }
    if (options.groupId) {
      where.groupId = options.groupId;
    }

    return db.employee.findMany({
      where,
      include: options.includeAssignments
        ? { assignments: { orderBy: { date: "desc" } } }
        : undefined,
      orderBy: { name: "asc" },
    });
  },

  async findById(id: string) {
    return db.employee.findUnique({
      where: { id },
      include: { group: true },
    });
  },

  async findByGroup(groupId: string, includeInactive = false) {
    return db.employee.findMany({
      where: {
        groupId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: { name: "asc" },
    });
  },

  async findActiveByGroup(groupId: string) {
    return db.employee.findMany({
      where: {
        groupId,
        isActive: true,
      },
      orderBy: { name: "asc" },
    });
  },

  async create(data: Prisma.EmployeeCreateInput) {
    return db.employee.create({ data });
  },

  async update(id: string, data: Prisma.EmployeeUpdateInput) {
    return db.employee.update({ where: { id }, data });
  },

  async softDelete(id: string) {
    return db.employee.update({
      where: { id },
      data: {
        isActive: false,
        leaveDate: new Date(),
      },
    });
  },

  async reactivate(id: string) {
    return db.employee.update({
      where: { id },
      data: {
        isActive: true,
        leaveDate: null,
      },
    });
  },

  async transferGroup(id: string, newGroupId: string) {
    return db.employee.update({
      where: { id },
      data: { groupId: newGroupId },
    });
  },

  async countByGroup(groupId: string) {
    return db.employee.count({
      where: { groupId, isActive: true },
    });
  },
};
