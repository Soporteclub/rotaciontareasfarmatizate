import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "./api-client";
import { useUIStore } from "@/frontend/presentation/hooks/use-ui-store";
import type { AuditLogResponse } from "./types";

// FIX (API-15): GET /api/audit now requires admin key.
// FIX (FE-07): added offset support for pagination.

export function useAuditLogs(options?: {
  entityType?: string;
  groupId?: string;
  limit?: number;
  offset?: number;
}) {
  const params = new URLSearchParams();
  if (options?.entityType) params.set("entityType", options.entityType);
  if (options?.groupId) params.set("groupId", options.groupId);
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.offset) params.set("offset", String(options.offset));

  return useQuery({
    queryKey: ["audit", options],
    queryFn: () => {
      const adminKey = useUIStore.getState().adminKey;
      if (!adminKey) {
        throw new Error("Se requiere clave de administrador para ver auditoria.");
      }
      return apiFetch<{ items: AuditLogResponse[]; total: number }>(
        `/api/audit?${params.toString()}`,
        { headers: { "x-admin-key": adminKey } }
      );
    },
    enabled: !!useUIStore.getState().isAdmin,
  });
}
