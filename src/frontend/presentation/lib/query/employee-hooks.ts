import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api-client";
import type { EmployeeResponse } from "./types";

export function useEmployees(groupId?: string, includeInactive = false) {
  const params = new URLSearchParams();
  if (groupId) params.set("groupId", groupId);
  if (includeInactive) params.set("includeInactive", "true");

  return useQuery({
    queryKey: ["employees", { groupId, includeInactive }],
    queryFn: () => apiFetch<EmployeeResponse[]>(`/api/employees?${params.toString()}`),
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch<EmployeeResponse>("/api/employees", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Record<string, unknown> & { id: string }) =>
      apiFetch<EmployeeResponse>(`/api/employees/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<EmployeeResponse>(`/api/employees/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}
