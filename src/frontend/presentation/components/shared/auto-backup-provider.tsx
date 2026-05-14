"use client";

import { useEffect, useRef } from "react";

const BACKUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * Periodically triggers auto-backup every 5 minutes.
 * Also triggers initial backup 30 seconds after mount.
 */
export function AutoBackupProvider({ children }: { children: React.ReactNode }) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Initial backup after 30 seconds (give app time to initialize)
    const initialTimeout = setTimeout(() => {
      fetch("/api/backup", { method: "POST" }).catch(() => {});
    }, 30_000);

    // Periodic backup every 5 minutes
    intervalRef.current = setInterval(() => {
      fetch("/api/backup", { method: "POST" }).catch(() => {});
    }, BACKUP_INTERVAL);

    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return <>{children}</>;
}
