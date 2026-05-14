import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api-client";
import type { AssignmentResponse, GenerateResult, BalanceReportItem, BalanceReportResponse } from "./types";

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

export function useGenerateAssignments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { groupId: string; startDate: string; endDate: string }) =>
      apiFetch<GenerateResult>("/api/assignments/generate", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      queryClient.invalidateQueries({ queryKey: ["balance"] });
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
