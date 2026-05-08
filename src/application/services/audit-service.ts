// Audit Service - Business logic for audit log queries
import { auditLogRepository } from "@/infrastructure/repositories";
import type { AuditQueryInput } from "@/application/validators/schemas";

export const auditService = {
  async query(input: AuditQueryInput) {
    return auditLogRepository.findMany({
      entityType: input.entityType,
      entityId: input.entityId,
      groupId: input.groupId,
      limit: input.limit,
      offset: input.offset,
    });
  },

  async getByGroup(groupId: string, limit = 50) {
    return auditLogRepository.findByGroup(groupId, limit);
  },
};
