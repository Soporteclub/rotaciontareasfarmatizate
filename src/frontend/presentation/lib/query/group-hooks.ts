import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api-client";
import type { GroupResponse } from "./types";

export function useGroups(includeInactive = false) {
  return useQuery({
    queryKey: ["groups", { includeInactive }],
    queryFn: () => apiFetch<GroupResponse[]>(`/api/groups?includeInactive=${includeInactive}`),
  });
}

export function useGroup(id: string | null) {
  return useQuery({
    queryKey: ["groups", id],
    queryFn: () => apiFetch<GroupResponse>(`/api/groups/${id}`),
    enabled: !!id,
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch<GroupResponse>("/api/groups", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

export function useUpdateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Record<string, unknown> & { id: string }) =>
      apiFetch<GroupResponse>(`/api/groups/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

export function useDeleteGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<GroupResponse>(`/api/groups/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}
