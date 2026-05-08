import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "./api-client";
import type { AuditLogResponse } from "./types";

export function useAuditLogs(options?: { entityType?: string; groupId?: string; limit?: number }) {
  const params = new URLSearchParams();
  if (options?.entityType) params.set("entityType", options.entityType);
  if (options?.groupId) params.set("groupId", options.groupId);
  if (options?.limit) params.set("limit", String(options.limit));

  return useQuery({
    queryKey: ["audit", options],
    queryFn: () =>
      apiFetch<{ items: AuditLogResponse[]; total: number }>(`/api/audit?${params.toString()}`),
  });
}
