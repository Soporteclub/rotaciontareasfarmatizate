// TanStack Query hooks for API data fetching
// Centralized data access layer for the frontend

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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
  taskLabel: string | null;
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
  taskType: string | null;
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
    enabled: !!groupId && !!startDate && !!endDate,
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
