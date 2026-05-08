// Rule Service - Business logic for AssignmentRule management
// Rules are configurable (NOT hardcoded days/times)

import { ruleRepository, groupRepository, auditLogRepository } from "@/infrastructure/repositories";
import type { CreateRuleInput, UpdateRuleInput } from "@/application/validators/schemas";
import { Prisma } from "@prisma/client";

export const ruleService = {
  async getAll(groupId?: string, includeInactive = false) {
    return ruleRepository.findAll({ groupId, includeInactive });
  },

  async getById(id: string) {
    const rule = await ruleRepository.findById(id);
    if (!rule) {
      throw new Error("Regla no encontrada");
    }
    return rule;
  },

  async create(input: CreateRuleInput) {
    // Validate group exists
    const group = await groupRepository.findById(input.groupId);
    if (!group) {
      throw new Error("El grupo especificado no existe");
    }

    // Check for duplicate rule (same group, same day, same frequency)
    const existingRules = await ruleRepository.findByGroup(input.groupId);
    const duplicate = existingRules.find(
      (r) => r.dayOfWeek === input.dayOfWeek && r.frequency === input.frequency
    );
    if (duplicate) {
      throw new Error("Ya existe una regla para este día y frecuencia en el grupo");
    }

    // Validate: group must have at least 1 active employee
    const { employeeRepository } = await import("@/infrastructure/repositories");
    const empCount = await employeeRepository.countByGroup(input.groupId);
    if (empCount === 0) {
      throw new Error("El grupo debe tener al menos un empleado activo antes de crear reglas");
    }

    const data: Prisma.AssignmentRuleCreateInput = {
      dayOfWeek: input.dayOfWeek,
      frequency: input.frequency,
      taskLabel: input.taskLabel,
      validFrom: input.validFrom ? new Date(input.validFrom) : new Date(),
      validTo: input.validTo ? new Date(input.validTo) : null,
      group: { connect: { id: input.groupId } },
    };

    const rule = await ruleRepository.create(data);

    await auditLogRepository.create({
      entityType: "rule",
      entityId: rule.id,
      action: "create",
      changes: input as Record<string, unknown>,
      groupId: input.groupId,
    });

    return rule;
  },

  async update(id: string, input: UpdateRuleInput) {
    const existing = await ruleRepository.findById(id);
    if (!existing) {
      throw new Error("Regla no encontrada");
    }

    const data: Prisma.AssignmentRuleUpdateInput = {};
    if (input.dayOfWeek !== undefined) data.dayOfWeek = input.dayOfWeek;
    if (input.frequency !== undefined) data.frequency = input.frequency;
    if (input.taskLabel !== undefined) data.taskLabel = input.taskLabel;
    if (input.validFrom !== undefined) data.validFrom = new Date(input.validFrom);
    if (input.validTo !== undefined) data.validTo = input.validTo ? new Date(input.validTo) : null;
    if (input.isActive !== undefined) data.isActive = input.isActive;

    const rule = await ruleRepository.update(id, data);

    await auditLogRepository.create({
      entityType: "rule",
      entityId: id,
      action: input.isActive === false ? "deactivate" : "update",
      changes: { before: existing, after: input },
      groupId: existing.groupId,
    });

    return rule;
  },

  async softDelete(id: string) {
    const existing = await ruleRepository.findById(id);
    if (!existing) {
      throw new Error("Regla no encontrada");
    }

    const rule = await ruleRepository.softDelete(id);

    await auditLogRepository.create({
      entityType: "rule",
      entityId: id,
      action: "deactivate",
      changes: { dayOfWeek: existing.dayOfWeek, frequency: existing.frequency },
      groupId: existing.groupId,
    });

    return rule;
  },
};
