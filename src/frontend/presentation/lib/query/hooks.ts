// TanStack Query hooks for API data fetching
// Centralized data access layer for the frontend

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback, useRef } from "react";

// ─── API Helper ───────────────────────────────────────────────

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Error de conexión" }));
    throw new Error(error.error || `Error ${res.status}`);
  }

  const data = await res.json();
  return data.data as T;
}

// Raw fetch that returns the full JSON response (for endpoints that don't wrap in { data })
async function rawFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Error de conexión" }));
    throw new Error(error.error || `Error ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ─── Types ────────────────────────────────────────────────────

export interface GroupResponse {
  id: string;
  name: string;
  description: string | null;
  taskType: string;
  color: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  employees?: EmployeeResponse[];
  rules?: RuleResponse[];
  _count?: { employees: number; rules: number; assignments: number };
}

export interface EmployeeResponse {
  id: string;
  name: string;
  email: string | null;
  groupId: string;
  isActive: boolean;
  joinDate: string;
  leaveDate: string | null;
  createdAt: string;
  updatedAt: string;
  group?: GroupResponse;
}

export interface RuleResponse {
  id: string;
  groupId: string;
  dayOfWeek: number;
  frequency: number;
  taskLabel: string; // REQUIRED: defines the specific task
  validFrom: string;
  validTo: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  group?: GroupResponse;
}

export interface AssignmentResponse {
  id: string;
  groupId: string;
  employeeId: string;
  ruleId: string | null;
  date: string;
  taskType: string; // REQUIRED: the specific task (e.g. "Sacar Basura", "Lavar Cafetera")
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
  employee?: EmployeeResponse;
  group?: GroupResponse;
}

export interface AuditLogResponse {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  changedBy: string | null;
  changes: string | null;
  groupId: string | null;
  createdAt: string;
}

export interface BalanceReportItem {
  employeeId: string;
  employeeName: string;
  totalAssignments: number;
  monthlyBalance: Record<string, number>;
  fairnessScore?: number;
}

export interface GenerateResult {
  assignments: AssignmentResponse[];
  balanceReport: BalanceReportItem[];
  generatedAt: string;
}

// ─── Group Hooks ──────────────────────────────────────────────

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

// ─── Employee Hooks ───────────────────────────────────────────

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

// ─── Rule Hooks ───────────────────────────────────────────────

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
    mutationFn: (id: string) =>
      apiFetch<RuleResponse>(`/api/rules/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rules"] });
    },
  });
}

// ─── Assignment Hooks ─────────────────────────────────────────

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
    },
  });
}

export function useBalanceReport(groupId?: string) {
  return useQuery({
    queryKey: ["balance", groupId],
    queryFn: () => apiFetch<BalanceReportItem[]>(`/api/assignments/balance?groupId=${groupId}`),
    enabled: !!groupId,
  });
}

// ─── Audit Hooks ──────────────────────────────────────────────

export function useAuditLogs(options?: { entityType?: string; groupId?: string; limit?: number }) {
  const params = new URLSearchParams();
  if (options?.entityType) params.set("entityType", options.entityType);
  if (options?.groupId) params.set("groupId", options.groupId);
  if (options?.limit) params.set("limit", String(options.limit));

  return useQuery({
    queryKey: ["audit", options],
    queryFn: () =>
      apiFetch<{ items: AuditLogResponse[]; total: number }>(`/api/audit?${params.toString()}`),
  });
}

// ─── Auto-Initialize Hook ──────────────────────────────────────
// On mount, checks if groups exist → seeds if needed → checks assignments → generates if needed
// Ensures the calendar always shows data immediately on first load

interface AutoInitState {
  isInitializing: boolean;
  step: "idle" | "checking-groups" | "seeding" | "checking-assignments" | "generating" | "done" | "error";
  message: string;
}

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

      const groupsRes = await fetch("/api/groups?includeInactive=false");
      if (!groupsRes.ok) throw new Error("Error al verificar grupos");
      const groupsJson = await groupsRes.json();
      const groups: GroupResponse[] = groupsJson.data ?? [];

      // Step 2: If no groups, seed the database
      if (groups.length === 0) {
        setState({ isInitializing: true, step: "seeding", message: "Inicializando datos base..." });
        await rawFetch<{ message: string }>("/api/seed", { method: "POST" });

        // Invalidate groups cache after seeding
        await queryClient.invalidateQueries({ queryKey: ["groups"] });

        // Re-fetch groups after seeding
        const newGroupsRes = await fetch("/api/groups?includeInactive=false");
        const newGroupsJson = await newGroupsRes.json();
        const newGroups: GroupResponse[] = newGroupsJson.data ?? [];

        if (newGroups.length === 0) {
          throw new Error("No se pudieron crear los grupos");
        }

        // After seeding, historical assignments are already created by the seed endpoint.
        // But we still need to generate future assignments for current month ±1.
        setState({ isInitializing: true, step: "generating", message: "Generando asignaciones..." });

        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0);
        const startStr = startDate.toISOString().split("T")[0];
        const endStr = endDate.toISOString().split("T")[0];

        for (const group of newGroups) {
          try {
            await apiFetch<GenerateResult>("/api/assignments/generate", {
              method: "POST",
              body: JSON.stringify({ groupId: group.id, startDate: startStr, endDate: endStr }),
            });
          } catch {
            // Generation might fail if assignments already exist from seed, that's okay
          }
        }

        await queryClient.invalidateQueries({ queryKey: ["assignments"] });
        await queryClient.invalidateQueries({ queryKey: ["groups"] });
        setState({ isInitializing: false, step: "done", message: "" });
        return;
      }

      // Step 3: Groups exist — check if assignments exist for current month
      setState({ isInitializing: true, step: "checking-assignments", message: "Verificando asignaciones..." });

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const startStr = monthStart.toISOString().split("T")[0];
      const endStr = monthEnd.toISOString().split("T")[0];

      const assignmentsParams = new URLSearchParams({ startDate: startStr, endDate: endStr });
      const assignmentsRes = await fetch(`/api/assignments?${assignmentsParams.toString()}`);
      if (!assignmentsRes.ok) throw new Error("Error al verificar asignaciones");
      const assignmentsJson = await assignmentsRes.json();
      const existingAssignments: AssignmentResponse[] = assignmentsJson.data ?? [];

      // Step 4: If no assignments for current month, auto-generate for all groups (current month ±1)
      if (existingAssignments.length === 0) {
        setState({ isInitializing: true, step: "generating", message: "Generando asignaciones..." });

        const genStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const genEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);
        const genStartStr = genStart.toISOString().split("T")[0];
        const genEndStr = genEnd.toISOString().split("T")[0];

        for (const group of groups) {
          try {
            await apiFetch<GenerateResult>("/api/assignments/generate", {
              method: "POST",
              body: JSON.stringify({ groupId: group.id, startDate: genStartStr, endDate: genEndStr }),
            });
          } catch {
            // Silently handle — manual generate buttons are still available
          }
        }

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
