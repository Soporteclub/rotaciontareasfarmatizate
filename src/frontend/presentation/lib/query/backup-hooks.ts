import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { rawFetch } from "./api-client";

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

// ─── Hooks ────────────────────────────────────────────────────

export function useBackupStatus() {
  return useQuery({
    queryKey: ["backup-status"],
    queryFn: () => rawFetch<BackupStatus>("/api/backup/status"),
    staleTime: 30_000, // 30 seconds
    refetchInterval: 60_000, // auto-refresh every minute
  });
}

export function useCreateBackup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      rawFetch<BackupResponse>("/api/backup", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backup-status"] });
    },
  });
}

export function useRestoreBackup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      rawFetch<RestoreResponse>("/api/restore", { method: "POST" }),
    onSuccess: () => {
      // Invalidate all data queries since restore replaces everything
      queryClient.invalidateQueries();
    },
  });
}

// ─── Auto-backup utility (debounced) ─────────────────────────

let backupTimeout: ReturnType<typeof setTimeout> | null = null;

/** Triggers a debounced auto-backup (5s delay, deduped) */
export function triggerAutoBackup() {
  if (backupTimeout) clearTimeout(backupTimeout);
  backupTimeout = setTimeout(async () => {
    try {
      await fetch("/api/backup", { method: "POST" });
    } catch (err) {
      console.warn("Auto-backup failed:", err);
    }
  }, 5000);
}
