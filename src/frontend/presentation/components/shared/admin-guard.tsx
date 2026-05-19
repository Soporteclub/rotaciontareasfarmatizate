"use client";

import { useUIStore } from "@/frontend/presentation/hooks/use-ui-store";
import { Lock, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Wrapper that checks global admin access.
 * Since admin-only modules are hidden from non-admin users in the sidebar,
 * this serves as a safety net. If somehow a non-admin reaches an admin view,
 * they see a locked message.
 */
export function AdminGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAdmin = useUIStore((s) => s.isAdmin);
  const requestAdminUnlock = useUIStore((s) => s.requestAdminUnlock);

  if (isAdmin) return <>{children}</>;

  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-950/30">
        <Lock className="h-8 w-8 text-amber-500" />
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Sección bloqueada</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Esta sección requiere clave de administrador. Ingresa la clave para acceder a la configuración.
        </p>
      </div>
      <Button
        onClick={() => requestAdminUnlock()}
        className="gap-2"
      >
        <Lock className="h-4 w-4" />
        Desbloquear administrador
      </Button>
    </div>
  );
}

/**
 * Renders children only when user is admin.
 * Shows a lock icon otherwise.
 */
export function AdminOnly({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const isAdmin = useUIStore((s) => s.isAdmin);
  const requestAdminUnlock = useUIStore((s) => s.requestAdminUnlock);

  if (isAdmin) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  return (
    <button
      onClick={() => requestAdminUnlock()}
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      title="Requiere clave de administrador"
    >
      <Lock className="h-3 w-3" />
    </button>
  );
}
