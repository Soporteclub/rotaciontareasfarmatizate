import { useState, useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api-client";
import { triggerAutoBackup } from "./backup-hooks";
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

      // Step 2: If no groups, seed the base data.
      // FIX (BC-04): the old code tried POST /api/restore WITHOUT an admin key
      // first. That endpoint requires admin auth and always returned 401 for an
      // anonymous auto-init, so it only "worked" by falling through silently to
      // seed — and it would hang forever once /api/seed is properly protected.
      // Restore is a manual, admin-only action (see sidebar "Restaurar"); an
      // anonymous first-load cannot and should not restore a backup. Go straight
      // to seed.
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
        triggerAutoBackup();
        return;
      }

      // Step 3: Groups exist — check if assignments exist for current month.
      // We only CHECK here; we no longer auto-generate (see FIX FE-02 below).
      setState({ isInitializing: true, step: "checking-assignments", message: "Verificando asignaciones..." });

      const { startStr, endStr } = getCurrentMonthRange();

      const existingAssignments = await queryClient.fetchQuery({
        queryKey: ["assignments", { groupId: undefined, startDate: startStr, endDate: endStr }],
        queryFn: () => {
          const params = new URLSearchParams({ startDate: startStr, endDate: endStr });
          return apiFetch<AssignmentResponse[]>(`/api/assignments?${params.toString()}`);
        },
      });

      // FIX (FE-02): REMOVED the auto-generation step.
      // Previously, if there were no assignments for the current month, ANY
      // visitor (anonymous, not admin) would trigger POST /api/assignments/generate
      // for ALL groups — which destroyed any future assignments the admin had
      // edited manually. Errors were silently swallowed with console.warn.
      //
      // Generation is now an EXPLICIT admin action via the "Generar" button,
      // which sends the admin key in the x-admin-key header (API-06).
      //
      // If no assignments exist, the calendar will simply show an empty month
      // and the admin can click "Generar" to populate it.
      if (existingAssignments.length === 0) {
        // No-op: leave the calendar empty. The admin will generate manually.
      }

      setState({ isInitializing: false, step: "done", message: "" });
      triggerAutoBackup();
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
    // FIX (LINT): initialize() hace setState en su primer tick (antes del primer
    // await), lo cual dispara react-hooks/set-state-in-effect si se invoca
    // directamente en el cuerpo del effect. Se difiere con un timeout; el guard
    // hasRun ya protege contra ejecuciones dobles.
    const timer = window.setTimeout(initialize, 0);
    return () => window.clearTimeout(timer);
  }, [initialize]);

  return state;
}
