import { useState, useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api-client";
import type { GroupResponse, AssignmentResponse, GenerateResult, AutoInitState } from "./types";

// ─── Pure helpers (no hooks, no setState) ──────────────────────

function formatLocalDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getGenerationDateRange(): { startStr: string; endStr: string } {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0);
  return {
    startStr: startDate.toISOString().split("T")[0],
    endStr: endDate.toISOString().split("T")[0],
  };
}

function getCurrentMonthRange(): { startStr: string; endStr: string } {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    startStr: formatLocalDate(monthStart),
    endStr: formatLocalDate(monthEnd),
  };
}

async function generateAssignmentsForGroups(
  groups: GroupResponse[],
  startDateStr: string,
  endDateStr: string,
): Promise<void> {
  for (const group of groups) {
    try {
      await apiFetch<GenerateResult>("/api/assignments/generate", {
        method: "POST",
        body: JSON.stringify({ groupId: group.id, startDate: startDateStr, endDate: endDateStr }),
      });
    } catch (err) {
      // Expected if seed already created assignments for this group
      console.warn("Auto-init: generation failed for group", group.id, err);
    }
  }
}

// ─── Hook ─────────────────────────────────────────────────────

/** On mount, checks if groups exist → seeds if needed → checks assignments → generates if needed.
 *  Ensures the calendar always shows data immediately on first load. */
export function useAutoInitialize() {
  const [state, setState] = useState<AutoInitState>({
    isInitializing: true,
    step: "idle",
    message: "",
  });

  const queryClient = useQueryClient();
  const hasRun = useRef(false);

  const initialize = useCallback(async () => {
    if (hasRun.current) return;
    hasRun.current = true;

    try {
      // Step 1: Check if groups exist
      setState({ isInitializing: true, step: "checking-groups", message: "Verificando datos..." });

      const groups = await queryClient.fetchQuery({
        queryKey: ["groups", { includeInactive: false }],
        queryFn: () => apiFetch<GroupResponse[]>("/api/groups?includeInactive=false"),
      });

      // Step 2: If no groups, seed the database
      if (groups.length === 0) {
        setState({ isInitializing: true, step: "seeding", message: "Inicializando datos base..." });
        await apiFetch<{ message: string }>("/api/seed", { method: "POST" });
        await queryClient.invalidateQueries({ queryKey: ["groups"] });

        const newGroups = await queryClient.fetchQuery({
          queryKey: ["groups", { includeInactive: false }],
          queryFn: () => apiFetch<GroupResponse[]>("/api/groups?includeInactive=false"),
        });

        if (newGroups.length === 0) {
          throw new Error("No se pudieron crear los grupos");
        }

        setState({ isInitializing: true, step: "generating", message: "Generando asignaciones..." });
        const { startStr, endStr } = getGenerationDateRange();
        await generateAssignmentsForGroups(newGroups, startStr, endStr);

        await queryClient.invalidateQueries({ queryKey: ["assignments"] });
        await queryClient.invalidateQueries({ queryKey: ["groups"] });
        setState({ isInitializing: false, step: "done", message: "" });
        return;
      }

      // Step 3: Groups exist — check if assignments exist for current month
      setState({ isInitializing: true, step: "checking-assignments", message: "Verificando asignaciones..." });

      const { startStr, endStr } = getCurrentMonthRange();

      const existingAssignments = await queryClient.fetchQuery({
        queryKey: ["assignments", { groupId: undefined, startDate: startStr, endDate: endStr }],
        queryFn: () => {
          const params = new URLSearchParams({ startDate: startStr, endDate: endStr });
          return apiFetch<AssignmentResponse[]>(`/api/assignments?${params.toString()}`);
        },
      });

      // Step 4: If no assignments for current month, auto-generate for all groups
      if (existingAssignments.length === 0) {
        setState({ isInitializing: true, step: "generating", message: "Generando asignaciones..." });
        const genRange = getGenerationDateRange();
        await generateAssignmentsForGroups(groups, genRange.startStr, genRange.endStr);
        await queryClient.invalidateQueries({ queryKey: ["assignments"] });
      }

      setState({ isInitializing: false, step: "done", message: "" });
    } catch (error) {
      console.error("Auto-initialize error:", error);
      setState({
        isInitializing: false,
        step: "error",
        message: error instanceof Error ? error.message : "Error de inicialización",
      });
    }
  }, [queryClient]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return state;
}
