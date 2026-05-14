"use client";

import { useUIStore, type AdminModule } from "@/frontend/presentation/hooks/use-ui-store";
import { Lock, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Wrapper that shows a read-only banner when user is not admin for this module.
 * Each module has its own independent unlock state.
 * Content is still interactive for reading/scrolling, but action buttons
 * inside each module check isAdmin individually.
 */
export function AdminGuard({
  module,
  children,
}: {
  module: AdminModule;
  children: React.ReactNode;
}) {
  const isModuleAdmin = useUIStore((s) => s.adminModules[module] === true);
  const requestAdminUnlock = useUIStore((s) => s.requestAdminUnlock);

  if (isModuleAdmin) return <>{children}</>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 dark:border-amber-800 dark:bg-amber-950/30">
        <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
          <Lock className="h-4 w-4 shrink-0" />
          <span>Solo lectura — ingresa la clave para configurar {moduleLabel(module)}</span>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 text-xs h-7 border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-400"
          onClick={() => requestAdminUnlock(module)}
        >
          Desbloquear
        </Button>
      </div>
      {children}
    </div>
  );
}

/**
 * Renders children only when user is admin for the given module.
 * Shows a lock icon + tooltip otherwise.
 */
export function AdminOnly({
  module,
  children,
  fallback,
}: {
  module: AdminModule;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const isModuleAdmin = useUIStore((s) => s.adminModules[module] === true);
  const requestAdminUnlock = useUIStore((s) => s.requestAdminUnlock);

  if (isModuleAdmin) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  return (
    <button
      onClick={() => requestAdminUnlock(module)}
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      title={`Requiere clave admin para ${moduleLabel(module)}`}
    >
      <Lock className="h-3 w-3" />
    </button>
  );
}

/**
 * Badge showing admin status for a module (for sidebar indicators)
 */
export function ModuleAdminBadge({ module }: { module: AdminModule }) {
  const isModuleAdmin = useUIStore((s) => s.adminModules[module] === true);
  const requestAdminUnlock = useUIStore((s) => s.requestAdminUnlock);

  return (
    <button
      onClick={() => {
        if (!isModuleAdmin) requestAdminUnlock(module);
      }}
      className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full transition-colors ${
        isModuleAdmin
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
          : "bg-muted text-muted-foreground hover:bg-amber-100 hover:text-amber-700"
      }`}
      title={isModuleAdmin ? `${moduleLabel(module)} desbloqueado` : `Desbloquear ${moduleLabel(module)}`}
    >
      {isModuleAdmin ? (
        <Shield className="h-2.5 w-2.5" />
      ) : (
        <Lock className="h-2.5 w-2.5" />
      )}
      {isModuleAdmin ? "Admin" : "Bloqueado"}
    </button>
  );
}

function moduleLabel(module: AdminModule): string {
  const labels: Record<AdminModule, string> = {
    groups: "grupos",
    employees: "empleados",
    rules: "reglas",
    calendar: "calendario",
    audit: "auditoría",
  };
  return labels[module] ?? module;
}
