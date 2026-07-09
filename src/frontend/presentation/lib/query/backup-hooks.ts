import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api-client";
import { useUIStore } from "@/frontend/presentation/hooks/use-ui-store";

// ─── Types ────────────────────────────────────────────────────

export interface BackupStatus {
  exists: boolean;
  timestamp?: string;
  version?: number;
  counts?: {
    settings: number;
    groups: number;
    employees: number;
    rules: number;
    taskEligibility: number;
    holidays: number;
    assignments: number;
    auditLogs: number;
  };
}

interface BackupResponse {
  message: string;
  timestamp: string;
  counts: BackupStatus["counts"];
}

interface RestoreResponse {
  message: string;
  timestamp: string;
  version: number;
  restored: BackupStatus["counts"];
}

// ─── Helper: get admin key header ─────────────────────────────
// FIX (API-03, API-04): backup/restore now require admin key.

function adminHeaders(): Record<string, string> {
  const adminKey = useUIStore.getState().adminKey;
  if (!adminKey) {
    throw new Error("Se requiere clave de administrador. Desbloquea el panel admin primero.");
  }
  return { "x-admin-key": adminKey };
}

// ─── Hooks ────────────────────────────────────────────────────

export function useBackupStatus() {
  return useQuery({
    queryKey: ["backup-status"],
    queryFn: () => {
      // FIX (API-29): requires admin key
      const headers = adminHeaders();
      return apiFetch<BackupStatus>("/api/backup/status", { headers });
    },
    // FIX: only refetch when admin is unlocked
    enabled: !!useUIStore.getState().isAdmin,
    staleTime: 30_000, // 30 seconds
    refetchInterval: 60_000, // auto-refresh every minute
  });
}

export function useCreateBackup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => {
      const headers = adminHeaders();
      return apiFetch<BackupResponse>("/api/backup", { method: "POST", headers });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backup-status"] });
    },
  });
}

export function useRestoreBackup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => {
      const headers = adminHeaders();
      return apiFetch<RestoreResponse>("/api/restore", { method: "POST", headers });
    },
    onSuccess: () => {
      // Invalidate all data queries since restore replaces everything
      queryClient.invalidateQueries();
    },
  });
}

// ─── Auto-backup utility (debounced) ─────────────────────────
// FIX (FE-03): triggerAutoBackup is now a no-op unless the admin is unlocked.
// Previously it fired POST /api/backup for every visitor. Now the backup
// endpoint itself requires admin key, and we also gate the trigger here.

let backupTimeout: ReturnType<typeof setTimeout> | null = null;

/** Triggers a debounced auto-backup (5s delay, deduped). No-op if not admin. */
export function triggerAutoBackup() {
  // Only trigger if admin is unlocked
  if (!useUIStore.getState().isAdmin) return;

  if (backupTimeout) clearTimeout(backupTimeout);
  backupTimeout = setTimeout(async () => {
    try {
      const adminKey = useUIStore.getState().adminKey;
      if (!adminKey) return;
      await fetch("/api/backup", {
        method: "POST",
        headers: { "x-admin-key": adminKey },
      });
    } catch (err) {
      console.warn("Auto-backup failed:", err);
    }
  }, 5000);
}
