import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api-client";
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
    },
  });
}

export function useDeleteRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, permanent }: { id: string; permanent?: boolean }) =>
      apiFetch<RuleResponse>(
        `/api/rules/${id}${permanent ? "?permanent=true" : ""}`,
        { method: "DELETE" }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rules"] });
    },
  });
}
