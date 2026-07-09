import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api-client";
import { useUIStore } from "@/frontend/presentation/hooks/use-ui-store";
import type { EmployeeResponse } from "./types";

// FIX (FE-07): signature now accepts an options object so callers can pass
// includeInactive without confusing it with groupId.

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
      queryClient.invalidateQueries({ queryKey: ["balance"] });
      // FIX (FE-09): also invalidate assignments so new employee appears in future gen
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      queryClient.invalidateQueries({ queryKey: ["audit"] });
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
      queryClient.invalidateQueries({ queryKey: ["balance"] });
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["audit"] });
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    // FIX (API-13): DELETE now requires admin key (header x-admin-key)
    mutationFn: (id: string) => {
      const adminKey = useUIStore.getState().adminKey;
      if (!adminKey) {
        throw new Error("Se requiere clave de administrador. Desbloquea el panel admin primero.");
      }
      return apiFetch<EmployeeResponse>(`/api/employees/${id}`, {
        method: "DELETE",
        headers: { "x-admin-key": adminKey },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["balance"] });
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["audit"] });
    },
  });
}
