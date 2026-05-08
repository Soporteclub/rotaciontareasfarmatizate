// Audit Log Repository - Complete audit trail
// Every modification must be recorded

import { db } from "@/backend/infrastructure/database";
import type { Prisma } from "@prisma/client";
import type { EntityType, AuditAction } from "@/backend/domain/entities/types";

export interface CreateAuditLogInput {
  entityType: EntityType;
  entityId: string;
  action: AuditAction;
  changedBy?: string;
  changes?: Record<string, unknown>;
  groupId?: string;
}

export interface QueryAuditLogOptions {
  entityType?: EntityType;
  entityId?: string;
  groupId?: string;
  limit?: number;
  offset?: number;
}

export const auditLogRepository = {
  async create(input: CreateAuditLogInput) {
    return db.auditLog.create({
      data: {
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        changedBy: input.changedBy ?? "system",
        changes: input.changes ? JSON.stringify(input.changes) : null,
        groupId: input.groupId,
      },
    });
  },

  async findMany(options: QueryAuditLogOptions = {}) {
    const where: Prisma.AuditLogWhereInput = {};
    if (options.entityType) where.entityType = options.entityType;
    if (options.entityId) where.entityId = options.entityId;
    if (options.groupId) where.groupId = options.groupId;

    const [items, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: options.limit ?? 50,
        skip: options.offset ?? 0,
      }),
      db.auditLog.count({ where }),
    ]);

    return { items, total };
  },

  async findByEntity(entityType: EntityType, entityId: string) {
    return db.auditLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: "desc" },
    });
  },

  async findByGroup(groupId: string, limit = 50) {
    return db.auditLog.findMany({
      where: { groupId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  },
};
