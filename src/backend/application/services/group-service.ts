// Group Service - Business logic for Group management
// No framework dependencies, uses repositories for data access

import { groupRepository, auditLogRepository } from "@/backend/infrastructure/repositories";
import type { CreateGroupInput, UpdateGroupInput } from "@/backend/application/validators/schemas";
import { Prisma } from "@prisma/client";

export const groupService = {
  async getAll(includeInactive = false) {
    return groupRepository.findAll({
      includeInactive,
      includeEmployees: true,
      includeRules: true,
    });
  },

  async getById(id: string) {
    const group = await groupRepository.findById(id, {
      includeEmployees: true,
      includeRules: true,
    });

    if (!group) {
      throw new Error("Grupo no encontrado");
    }

    return group;
  },

  async create(input: CreateGroupInput) {
    // Check for duplicate name
    const existing = await groupRepository.findByName(input.name);
    if (existing) {
      throw new Error(`Ya existe un grupo con el nombre "${input.name}"`);
    }

    const group = await groupRepository.create({
      name: input.name,
      description: input.description,
      taskType: input.taskType,
      color: input.color,
    });

    await auditLogRepository.create({
      entityType: "group",
      entityId: group.id,
      action: "create",
      changes: input as Record<string, unknown>,
      groupId: group.id,
    });

    return group;
  },

  async update(id: string, input: UpdateGroupInput) {
    const existing = await groupRepository.findById(id);
    if (!existing) {
      throw new Error("Grupo no encontrado");
    }

    // Check duplicate name if name is being changed
    if (input.name && input.name !== existing.name) {
      const duplicate = await groupRepository.findByName(input.name);
      if (duplicate && duplicate.id !== id) {
        throw new Error(`Ya existe un grupo con el nombre "${input.name}"`);
      }
    }

    const data: Prisma.GroupUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.description !== undefined) data.description = input.description;
    if (input.taskType !== undefined) data.taskType = input.taskType;
    if (input.color !== undefined) data.color = input.color;
    if (input.isActive !== undefined) data.isActive = input.isActive;

    const group = await groupRepository.update(id, data);

    await auditLogRepository.create({
      entityType: "group",
      entityId: id,
      action: "update",
      changes: { before: existing, after: input },
      groupId: id,
    });

    return group;
  },

  async softDelete(id: string) {
    const existing = await groupRepository.findById(id);
    if (!existing) {
      throw new Error("Grupo no encontrado");
    }

    const group = await groupRepository.softDelete(id);

    await auditLogRepository.create({
      entityType: "group",
      entityId: id,
      action: "deactivate",
      changes: { name: existing.name },
      groupId: id,
    });

    return group;
  },
};
