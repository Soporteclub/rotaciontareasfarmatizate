import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api-client";
import type { EmployeeTaskEligibilityResponse, TaskEligibilitySetting } from "./types";

/**
 * Get task eligibility for a specific employee
 */
export function useEmployeeTaskEligibility(employeeId: string | undefined) {
  return useQuery({
    queryKey: ["taskEligibility", { employeeId }],
    queryFn: () =>
      apiFetch<EmployeeTaskEligibilityResponse>(
        `/api/employees/${employeeId}/task-eligibility`
      ),
    enabled: !!employeeId,
  });
}

/**
 * Get task eligibility for all employees in a group
 */
export function useGroupTaskEligibility(groupId: string | undefined) {
  return useQuery({
    queryKey: ["taskEligibility", { groupId }],
    queryFn: () =>
      apiFetch<EmployeeTaskEligibilityResponse[]>(
        `/api/task-eligibility?groupId=${groupId}`
      ),
    enabled: !!groupId,
  });
}

/**
 * Update all task eligibility settings for an employee
 */
export function useUpdateEmployeeTaskEligibility() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      employeeId,
      settings,
    }: {
      employeeId: string;
      settings: TaskEligibilitySetting[];
    }) =>
      apiFetch(`/api/employees/${employeeId}/task-eligibility`, {
        method: "PUT",
        body: JSON.stringify({ settings }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taskEligibility"] });
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
    },
  });
}

/**
 * Toggle a single task eligibility for an employee
 */
export function useToggleEmployeeTaskEligibility() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      employeeId,
      taskLabel,
      isActive,
    }: {
      employeeId: string;
      taskLabel: string;
      isActive: boolean;
    }) =>
      apiFetch(`/api/employees/${employeeId}/task-eligibility`, {
        method: "PATCH",
        body: JSON.stringify({ taskLabel, isActive }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taskEligibility"] });
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
    },
  });
}
