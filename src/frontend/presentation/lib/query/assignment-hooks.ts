import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api-client";
import { useUIStore } from "@/frontend/presentation/hooks/use-ui-store";
import type { AssignmentResponse, GenerateResult, BalanceReportResponse } from "./types";

export function useAssignments(groupId?: string, startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (groupId) params.set("groupId", groupId);
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);

  return useQuery({
    queryKey: ["assignments", { groupId, startDate, endDate }],
    queryFn: () => apiFetch<AssignmentResponse[]>(`/api/assignments?${params.toString()}`),
    enabled: !!startDate && !!endDate,
  });
}

/**
 * FIX (API-06, FE-02): Generation now requires admin key.
 * The admin key is read from the UI store and sent in the x-admin-key header.
 */
export function useGenerateAssignments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { groupId: string; startDate: string; endDate: string }) => {
      const adminKey = useUIStore.getState().adminKey;
      if (!adminKey) {
        throw new Error("Se requiere clave de administrador. Desbloquea el panel admin primero.");
      }
      return apiFetch<GenerateResult>("/api/assignments/generate", {
        method: "POST",
        headers: { "x-admin-key": adminKey },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      queryClient.invalidateQueries({ queryKey: ["balance"] });
      // FIX (FE-09): also invalidate audit so the new "generate" log appears
      queryClient.invalidateQueries({ queryKey: ["audit"] });
    },
  });
}

/**
 * FIX (API-05): Deletion now requires admin key (header x-admin-key).
 * FIX (BUG-04): By default only unlocked (future) assignments are deleted.
 *               Pass { force: true } to also delete locked (historical).
 */
export function useDeleteAssignments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { groupId: string; startDate?: string; endDate?: string; force?: boolean }) => {
      const adminKey = useUIStore.getState().adminKey;
      if (!adminKey) {
        throw new Error("Se requiere clave de administrador. Desbloquea el panel admin primero.");
      }
      return apiFetch<{ deletedCount: number; message: string }>("/api/assignments/delete", {
        method: "POST",
        headers: { "x-admin-key": adminKey },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      queryClient.invalidateQueries({ queryKey: ["balance"] });
      queryClient.invalidateQueries({ queryKey: ["audit"] });
    },
  });
}

export function useUpdateAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { id: string; employeeId: string; adminKey: string; force?: boolean }) =>
      apiFetch<AssignmentResponse>(`/api/assignments/${data.id}`, {
        method: "PATCH",
        body: JSON.stringify({ employeeId: data.employeeId, adminKey: data.adminKey, force: data.force }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      queryClient.invalidateQueries({ queryKey: ["balance"] });
      queryClient.invalidateQueries({ queryKey: ["audit"] });
    },
  });
}

export function useBalanceReport(groupId?: string, startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (groupId) params.set("groupId", groupId);
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);

  return useQuery({
    queryKey: ["balance", groupId, startDate, endDate],
    queryFn: () => apiFetch<BalanceReportResponse>(`/api/assignments/balance?${params.toString()}`),
    enabled: !!groupId,
  });
}
