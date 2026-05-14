// Employee Service - Business logic for Employee management
// Supports high rotation: enter, exit, group change, deactivate

import { employeeRepository, groupRepository, auditLogRepository } from "@/backend/infrastructure/repositories";
import type { CreateEmployeeInput, UpdateEmployeeInput } from "@/backend/application/validators/schemas";
import { Prisma } from "@prisma/client";

export const employeeService = {
  async getAll(groupId?: string, includeInactive = false) {
    return employeeRepository.findAll({
      groupId,
      includeInactive,
    });
  },

  async getById(id: string) {
    const employee = await employeeRepository.findById(id);
    if (!employee) {
      throw new Error("Empleado no encontrado");
    }
    return employee;
  },

  async create(input: CreateEmployeeInput) {
    // Validate group exists
    const group = await groupRepository.findById(input.groupId);
    if (!group) {
      throw new Error("El grupo especificado no existe");
    }

    // Check for duplicate name in group
    const existing = await employeeRepository.findByGroup(input.groupId);
    const duplicate = existing.find(
      (e) => e.name.toLowerCase() === input.name.toLowerCase()
    );
    if (duplicate) {
      throw new Error(`Ya existe un empleado llamado "${input.name}" en este grupo`);
    }

    const data: Prisma.EmployeeCreateInput = {
      name: input.name,
      position: input.position,
      area: input.area,
      joinDate: input.joinDate ? new Date(input.joinDate) : new Date(),
      group: { connect: { id: input.groupId } },
    };

    const employee = await employeeRepository.create(data);

    await auditLogRepository.create({
      entityType: "employee",
      entityId: employee.id,
      action: "create",
      changes: input as Record<string, unknown>,
      groupId: input.groupId,
    });

    return employee;
  },

  async update(id: string, input: UpdateEmployeeInput) {
    const existing = await employeeRepository.findById(id);
    if (!existing) {
      throw new Error("Empleado no encontrado");
    }

    // Validate new group if changing
    if (input.groupId && input.groupId !== existing.groupId) {
      const group = await groupRepository.findById(input.groupId);
      if (!group) {
        throw new Error("El grupo destino no existe");
      }
    }

    const data: Prisma.EmployeeUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.position !== undefined) data.position = input.position;
    if (input.area !== undefined) data.area = input.area;
    if (input.groupId !== undefined) data.group = { connect: { id: input.groupId } };
    if (input.joinDate !== undefined) data.joinDate = new Date(input.joinDate);
    if (input.isActive === false) data.leaveDate = new Date();
    if (input.leaveDate !== undefined) data.leaveDate = input.leaveDate ? new Date(input.leaveDate) : null;
    if (input.isActive !== undefined) data.isActive = input.isActive;

    const employee = await employeeRepository.update(id, data);

    await auditLogRepository.create({
      entityType: "employee",
      entityId: id,
      action: input.isActive === false ? "deactivate" : input.isActive === true ? "reactivate" : "update",
      changes: { before: existing, after: input },
      groupId: employee.groupId,
    });

    return employee;
  },

  async softDelete(id: string) {
    const existing = await employeeRepository.findById(id);
    if (!existing) {
      throw new Error("Empleado no encontrado");
    }

    const employee = await employeeRepository.softDelete(id);

    await auditLogRepository.create({
      entityType: "employee",
      entityId: id,
      action: "deactivate",
      changes: { name: existing.name, leaveDate: new Date().toISOString() },
      groupId: existing.groupId,
    });

    return employee;
  },

  async reactivate(id: string) {
    const existing = await employeeRepository.findById(id);
    if (!existing) {
      throw new Error("Empleado no encontrado");
    }

    const employee = await employeeRepository.reactivate(id);

    await auditLogRepository.create({
      entityType: "employee",
      entityId: id,
      action: "reactivate",
      changes: { name: existing.name },
      groupId: existing.groupId,
    });

    return employee;
  },
};
