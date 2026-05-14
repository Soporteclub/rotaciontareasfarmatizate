// Admin Guard Hook - Used across all modules to check admin access
// Provides: isAdmin flag, requestAccess (opens dialog), AdminGuard wrapper

import { useState, useCallback } from "react";
import { useAdminStore } from "@/frontend/presentation/hooks/use-admin-store";
import { AdminLockDialog } from "@/frontend/presentation/components/shared/admin-lock-dialog";

/**
 * Hook to check admin access and prompt for credentials.
 * Usage:
 *   const { isAdmin, requestAccess, AdminDialog } = useAdmin();
 *   // Check: if (!isAdmin) return readOnlyView;
 *   // Prompt: requestAccess();
 *   // Render: <AdminDialog />
 */
export function useAdmin() {
  const isAdmin = useAdminStore((s) => s.isAdmin);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const requestAccess = useCallback((onSuccess?: () => void) => {
    if (isAdmin) {
      onSuccess?.();
      return;
    }
    setPendingAction(() => onSuccess ?? null);
    setDialogOpen(true);
  }, [isAdmin]);

  const handleSuccess = useCallback(() => {
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  }, [pendingAction]);

  return {
    isAdmin,
    requestAccess,
    AdminDialog: (
      <AdminLockDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleSuccess}
      />
    ),
  };
}
