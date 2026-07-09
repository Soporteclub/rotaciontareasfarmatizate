import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api-client";
import { useUIStore } from "@/frontend/presentation/hooks/use-ui-store";
import type { RuleResponse } from "./types";

export function useRules(groupId?: string, includeInactive = false) {
  const params = new URLSearchParams();
  if (groupId) params.set("groupId", groupId);
  if (includeInactive) params.set("includeInactive", "true");

  return useQuery({
    queryKey: ["rules", { groupId, includeInactive }],
    queryFn: () => apiFetch<RuleResponse[]>(`/api/rules?${params.toString()}`),
  });
}

export function useCreateRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch<RuleResponse>("/api/rules", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rules"] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      // FIX (FE-09): invalidate assignments + balance + audit so the UI reflects
      // the new rule on the calendar (previously the calendar stayed stale and
      // the admin thought the rule "didn't work", leading to duplicate creation).
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      queryClient.invalidateQueries({ queryKey: ["balance"] });
      queryClient.invalidateQueries({ queryKey: ["audit"] });
    },
  });
}

export function useUpdateRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Record<string, unknown> & { id: string }) =>
      apiFetch<RuleResponse>(`/api/rules/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rules"] });
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      queryClient.invalidateQueries({ queryKey: ["balance"] });
      queryClient.invalidateQueries({ queryKey: ["audit"] });
    },
  });
}

export function useDeleteRule() {
  const queryClient = useQueryClient();
  return useMutation({
    // FIX (API-13): DELETE now requires admin key (header x-admin-key)
    mutationFn: ({ id, permanent }: { id: string; permanent?: boolean }) => {
      const adminKey = useUIStore.getState().adminKey;
      if (!adminKey) {
        throw new Error("Se requiere clave de administrador. Desbloquea el panel admin primero.");
      }
      return apiFetch<RuleResponse>(
        `/api/rules/${id}${permanent ? "?permanent=true" : ""}`,
        { method: "DELETE", headers: { "x-admin-key": adminKey } }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rules"] });
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      queryClient.invalidateQueries({ queryKey: ["balance"] });
      queryClient.invalidateQueries({ queryKey: ["audit"] });
    },
  });
}
