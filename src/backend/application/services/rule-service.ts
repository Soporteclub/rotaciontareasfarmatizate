// Rule Service - Business logic for Rule management
// Rules are configurable (NOT hardcoded days/times)

import { ruleRepository, groupRepository, auditLogRepository } from "@/backend/infrastructure/repositories";
import type { CreateRuleInput, UpdateRuleInput } from "@/backend/application/validators/schemas";
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

    // Check for duplicate rule (same group, same day, same taskLabel)
    // Multiple tasks can exist on the same day (e.g. "Sacar Basura" and "Lavar Cafetera" on Tuesday)
    const existingRules = await ruleRepository.findByGroup(input.groupId);
    const duplicate = existingRules.find(
      (r) => r.dayOfWeek === input.dayOfWeek && r.taskLabel === input.taskLabel && r.frequency === input.frequency
    );
    if (duplicate) {
      throw new Error("Ya existe una regla para este día y tarea en el grupo");
    }

    // Rules can be created before employees are added

    const data: Prisma.RuleCreateInput = {
      dayOfWeek: input.dayOfWeek,
      frequencyType: input.frequencyType ?? "weekly",
      frequency: input.frequency ?? 1,
      taskLabel: input.taskLabel,
      // FIX (Tarea 1+2): persist color and icon so they show up in the calendar
      color: input.color,
      icon: input.icon,
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

    const data: Prisma.RuleUpdateInput = {};
    if (input.dayOfWeek !== undefined) data.dayOfWeek = input.dayOfWeek;
    if (input.frequencyType !== undefined) data.frequencyType = input.frequencyType;
    if (input.frequency !== undefined) data.frequency = input.frequency;
    if (input.taskLabel !== undefined) data.taskLabel = input.taskLabel;
    // FIX (Tarea 1+2): persist color and icon updates. Previously these were
    // accepted by the Zod schema and sent by the frontend, but discarded here
    // so the DB never stored the new values — the UI showed "updated" but the
    // calendar kept rendering the old color/icon.
    if (input.color !== undefined) data.color = input.color;
    if (input.icon !== undefined) data.icon = input.icon;
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

  async hardDelete(id: string) {
    const existing = await ruleRepository.findById(id);
    if (!existing) {
      throw new Error("Regla no encontrada");
    }

    await ruleRepository.hardDelete(id);

    await auditLogRepository.create({
      entityType: "rule",
      entityId: id,
      action: "delete",
      changes: { dayOfWeek: existing.dayOfWeek, frequency: existing.frequency, taskLabel: existing.taskLabel },
      groupId: existing.groupId,
    });

    return { deleted: true };
  },
};
