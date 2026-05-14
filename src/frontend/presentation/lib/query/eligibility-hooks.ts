import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api-client";
import type { TaskEligibilityResponse } from "./types";

export function useEligibility(employeeId: string | null) {
  return useQuery({
    queryKey: ["eligibility", employeeId],
    queryFn: () =>
      apiFetch<TaskEligibilityResponse[]>(
        `/api/eligibility?employeeId=${employeeId}`
      ),
    enabled: !!employeeId,
  });
}

export function useToggleEligibility() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      employeeId,
      taskName,
      isEnabled,
    }: {
      employeeId: string;
      taskName: string;
      isEnabled: boolean;
    }) =>
      apiFetch<TaskEligibilityResponse>("/api/eligibility", {
        method: "POST",
        body: JSON.stringify({ employeeId, taskName, isEnabled }),
      }),
    onSuccess: (_, variables) => {
      // Invalidate eligibility for this employee
      queryClient.invalidateQueries({
        queryKey: ["eligibility", variables.employeeId],
      });
      // Invalidate all assignment queries so the UI reflects removed assignments
      queryClient.invalidateQueries({
        queryKey: ["assignments"],
      });
      // Invalidate dashboard data which shows assignments
      queryClient.invalidateQueries({
        queryKey: ["dashboard"],
      });
    },
  });
}
