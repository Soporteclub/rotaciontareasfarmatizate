"use client";

import {
  CalendarHeart,
  Settings2,
  UserCog,
  ScrollText,
  Menu,
  X,
  Building2,
  ChevronDown,
  ClipboardCheck,
  Shield,
  Lock,
  Unlock,
  FileCode2,
  Database,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { useUIStore, type AdminModule } from "@/frontend/presentation/hooks/use-ui-store";
import { BRAND } from "@/frontend/presentation/lib/brand";
import { cn } from "@/frontend/lib/utils";
import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { useBackupStatus, useCreateBackup, useRestoreBackup } from "@/frontend/presentation/lib/query/backup-hooks";

type NavItem = {
  id: "calendar" | "groups" | "employees" | "rules" | "audit";
  label: string;
  icon: React.ReactNode;
  section?: "main" | "config";
  description?: string;
  adminModule?: AdminModule;
};

const mainItems: NavItem[] = [
  { 
    id: "calendar", 
    label: "Calendario", 
    icon: <CalendarHeart className="h-4 w-4" />,
    description: "Vista de asignaciones",
    adminModule: "calendar",
  },
];

const configItems: NavItem[] = [
  { id: "groups", label: "Grupos", icon: <Building2 className="h-4 w-4" />, section: "config", description: "Pisos / áreas", adminModule: "groups" },
  { id: "employees", label: "Empleados", icon: <UserCog className="h-4 w-4" />, section: "config", description: "Personal", adminModule: "employees" },
  { id: "rules", label: "Reglas", icon: <ClipboardCheck className="h-4 w-4" />, section: "config", description: "Rotación", adminModule: "rules" },
];

const auditItems: NavItem[] = [
  { id: "audit", label: "Auditoría", icon: <ScrollText className="h-4 w-4" />, description: "Historial", adminModule: "audit" },
];

export function Sidebar() {
  const { activeView, setActiveView, sidebarOpen, setSidebarOpen, adminModules, requestAdminUnlock, lockAllModules } = useUIStore();
  const [configOpen, setConfigOpen] = useState(true);

  // Count how many modules are unlocked
  const unlockedCount = Object.values(adminModules).filter(Boolean).length;

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile toggle */}
      <button
        className="fixed top-3 left-3 z-50 md:hidden bg-card border border-border rounded-lg p-2 shadow-sm"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed md:static inset-y-0 left-0 z-50 w-56 bg-card border-r border-border flex flex-col transition-all duration-200 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0 md:w-14"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-3 py-4 border-b border-border" style={{ backgroundColor: BRAND.PRIMARY }}>
          {sidebarOpen ? (
            <>
              <Image
                src="/logo-club.png"
                alt="Farmatízate"
                width={59}
                height={32}
                className="shrink-0"
              />
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-sm truncate text-white">Farmatízate</span>
                <span className="text-[10px] text-white/70">Rotación de Tareas</span>
              </div>
            </>
          ) : (
            <Image
              src="/logo-club.png"
              alt="Farmatízate"
              width={24}
              height={13}
              className="shrink-0 mx-auto"
            />
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
          {/* Main items */}
          {mainItems.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              activeView={activeView}
              sidebarOpen={sidebarOpen}
              setActiveView={setActiveView}
              setSidebarOpen={setSidebarOpen}
              adminModules={adminModules}
              requestAdminUnlock={requestAdminUnlock}
            />
          ))}

          {/* Config section */}
          {sidebarOpen && (
            <button
              onClick={() => setConfigOpen(!configOpen)}
              className="w-full flex items-center justify-between px-3 pt-4 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
            >
              <span className="flex items-center gap-1.5">
                <Settings2 className="h-3 w-3" />
                Configuración
              </span>
              <ChevronDown className={cn("h-3 w-3 transition-transform", configOpen && "rotate-180")} />
            </button>
          )}

          {!sidebarOpen && <div className="pt-3 border-t border-border" />}

          {configOpen && configItems.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              activeView={activeView}
              sidebarOpen={sidebarOpen}
              setActiveView={setActiveView}
              setSidebarOpen={setSidebarOpen}
              adminModules={adminModules}
              requestAdminUnlock={requestAdminUnlock}
            />
          ))}

          {/* Audit section */}
          <div className="pt-3 border-t border-border mt-3">
            {auditItems.map((item) => (
              <NavButton
                key={item.id}
                item={item}
                activeView={activeView}
                sidebarOpen={sidebarOpen}
                setActiveView={setActiveView}
                setSidebarOpen={setSidebarOpen}
                adminModules={adminModules}
                requestAdminUnlock={requestAdminUnlock}
              />
            ))}
          </div>
        </nav>

        {/* Footer - Module lock indicators */}
        <SidebarFooter
          sidebarOpen={sidebarOpen}
          unlockedCount={unlockedCount}
          adminModules={adminModules}
        />
      </aside>
    </>
  );
}

// ─── Module label lookup ──────────────────────────────────────
const MODULE_LABELS: Record<AdminModule, string> = {
  groups: "Grupos",
  employees: "Empl.",
  rules: "Reglas",
  calendar: "Cal.",
  audit: "Audit.",
};

const ALL_ADMIN_MODULES: AdminModule[] = ["groups", "employees", "rules", "calendar", "audit"];

// ─── Relative time helper (Spanish) ───────────────────────────
function formatRelativeTime(isoTimestamp: string): string {
  const now = Date.now();
  const then = new Date(isoTimestamp).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return "ahora";

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return "ahora";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} hora${hours !== 1 ? "s" : ""}`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `hace ${days} día${days !== 1 ? "s" : ""}`;

  const months = Math.floor(days / 30);
  return `hace ${months} mes${months !== 1 ? "es" : ""}`;
}

// ─── Sidebar Footer ───────────────────────────────────────────
function SidebarFooter({
  sidebarOpen,
  unlockedCount,
  adminModules,
}: {
  sidebarOpen: boolean;
  unlockedCount: number;
  adminModules: Partial<Record<AdminModule, boolean>>;
}) {
  const hasUnlocked = unlockedCount > 0;

  return (
    <div className="px-3 py-2 border-t border-border space-y-2">
      {hasUnlocked ? (
        <UnlockedStatus sidebarOpen={sidebarOpen} unlockedCount={unlockedCount} adminModules={adminModules} />
      ) : (
        <LockedStatus sidebarOpen={sidebarOpen} />
      )}
      <BackupSection sidebarOpen={sidebarOpen} />
      {sidebarOpen && (
        <div className="space-y-2">
          <a
            href="/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-emerald-600 transition-colors"
          >
            <FileCode2 className="h-3 w-3" />
            API Docs (Swagger)
          </a>
          <p className="text-[10px] text-muted-foreground/60">Farmatízate v2.0</p>
        </div>
      )}
      {!sidebarOpen && (
        <a
          href="/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="flex justify-center text-muted-foreground hover:text-emerald-600 transition-colors"
          title="API Docs (Swagger)"
        >
          <FileCode2 className="h-4 w-4" />
        </a>
      )}
    </div>
  );
}

function UnlockedStatus({
  sidebarOpen,
  unlockedCount,
  adminModules,
}: {
  sidebarOpen: boolean;
  unlockedCount: number;
  adminModules: Partial<Record<AdminModule, boolean>>;
}) {
  if (!sidebarOpen) {
    return (
      <div className="flex justify-center">
        <Shield className="h-4 w-4 text-emerald-600" title={`${unlockedCount} módulos desbloqueados`} />
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <Shield className="h-3 w-3 text-emerald-600" />
        <span>{unlockedCount} módulo{unlockedCount !== 1 ? "s" : ""} desbloqueado{unlockedCount !== 1 ? "s" : ""}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {ALL_ADMIN_MODULES.map((mod) => {
          const isUnlocked = adminModules[mod] === true;
          return (
            <span
              key={mod}
              className={cn(
                "text-[9px] px-1.5 py-0.5 rounded-full",
                isUnlocked
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-muted text-muted-foreground/50"
              )}
            >
              {isUnlocked ? "🔓 " : "🔒 "}{MODULE_LABELS[mod]}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function LockedStatus({ sidebarOpen }: { sidebarOpen: boolean }) {
  if (!sidebarOpen) {
    return (
      <div className="flex justify-center">
        <Lock className="h-4 w-4 text-muted-foreground" title="Todo bloqueado" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
      <Lock className="h-3 w-3" />
      <span>Todo bloqueado</span>
    </div>
  );
}

// ─── Backup Section ────────────────────────────────────────────
function BackupSection({ sidebarOpen }: { sidebarOpen: boolean }) {
  const { data: backupStatus, isLoading } = useBackupStatus();
  const createBackup = useCreateBackup();
  const restoreBackup = useRestoreBackup();
  const [confirmRestore, setConfirmRestore] = useState(false);

  const backupExists = backupStatus?.exists === true;
  const isMutating = createBackup.isPending || restoreBackup.isPending;

  // Collapsed sidebar: just a small database icon
  if (!sidebarOpen) {
    return (
      <button
        onClick={() => {
          if (!isMutating) {
            createBackup.mutate(undefined, {
              onSuccess: () => toast.success("Backup guardado"),
              onError: (err) => toast.error(err.message),
            });
          }
        }}
        disabled={isMutating}
        className={cn(
          "flex justify-center w-full py-0.5 transition-colors",
          isLoading ? "text-muted-foreground/40" :
          backupExists ? "text-emerald-500 hover:text-emerald-600" : "text-amber-500 hover:text-amber-600"
        )}
        title={backupExists ? "Backup existe — clic para guardar nuevo" : "Sin backup — clic para guardar"}
      >
        {isMutating ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Database className="h-3.5 w-3.5" />
        )}
      </button>
    );
  }

  // Expanded sidebar: status + action buttons
  return (
    <div className="space-y-1.5">
      {/* Status indicator */}
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        {isLoading ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Verificando backup…</span>
          </>
        ) : backupExists && backupStatus.timestamp ? (
          <>
            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
            <span>Backup: {formatRelativeTime(backupStatus.timestamp)}</span>
          </>
        ) : (
          <>
            <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
            <span>Sin backup</span>
          </>
        )}
      </div>

      {/* Action buttons or confirm prompt */}
      {confirmRestore ? (
        <div className="flex items-center gap-1 text-[10px]">
          <span className="text-amber-600 font-medium">¿Seguro?</span>
          <button
            onClick={() => {
              setConfirmRestore(false);
              restoreBackup.mutate(undefined, {
                onSuccess: () => toast.success("Base de datos restaurada"),
                onError: (err) => toast.error(err.message),
              });
            }}
            disabled={isMutating}
            className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors disabled:opacity-50"
          >
            {isMutating ? <Loader2 className="h-2.5 w-2.5 animate-spin inline" /> : "Sí"}
          </button>
          <button
            onClick={() => setConfirmRestore(false)}
            disabled={isMutating}
            className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors disabled:opacity-50"
          >
            No
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              createBackup.mutate(undefined, {
                onSuccess: () => toast.success("Backup guardado"),
                onError: (err) => toast.error(err.message),
              });
            }}
            disabled={isMutating}
            className={cn(
              "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors disabled:opacity-50",
              "text-white hover:opacity-90"
            )}
            style={{ backgroundColor: BRAND.PRIMARY }}
            title="Guardar backup"
          >
            {createBackup.isPending ? (
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
            ) : (
              <Database className="h-2.5 w-2.5" />
            )}
            Guardar
          </button>
          <button
            onClick={() => setConfirmRestore(true)}
            disabled={isMutating || !backupExists}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors disabled:opacity-50"
            title="Restaurar desde backup"
          >
            {restoreBackup.isPending ? (
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
            ) : (
              <RotateCcw className="h-2.5 w-2.5" />
            )}
            Restaurar
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Nav Button with per-module lock indicator ────────────────
function NavButton({
  item,
  activeView,
  sidebarOpen,
  setActiveView,
  setSidebarOpen,
  adminModules,
  requestAdminUnlock,
}: {
  item: NavItem;
  activeView: string;
  sidebarOpen: boolean;
  setActiveView: (view: NavItem["id"]) => void;
  setSidebarOpen: (open: boolean) => void;
  adminModules: Partial<Record<AdminModule, boolean>>;
  requestAdminUnlock: (module: AdminModule) => void;
}) {
  const isAdmin = item.adminModule ? adminModules[item.adminModule] === true : true;

  return (
    <div className="relative">
      <button
        onClick={() => {
          setActiveView(item.id);
          if (window.innerWidth < 768) setSidebarOpen(false);
        }}
        className={cn(
          "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
          activeView === item.id
            ? "text-white font-medium"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          activeView === item.id && { backgroundColor: BRAND.PRIMARY }
        )}
      >
        {item.icon}
        {sidebarOpen && (
          <div className="flex flex-col min-w-0 flex-1">
            <span className="truncate">{item.label}</span>
            {item.description && (
              <span className={cn(
                "text-[10px]",
                activeView === item.id ? "text-white/70" : "text-muted-foreground/60"
              )}>
                {item.description}
              </span>
            )}
          </div>
        )}
        {/* Lock indicator for config modules */}
        {sidebarOpen && item.adminModule && !isAdmin && (
          <span
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
                requestAdminUnlock(item.adminModule!);
              }
            }}
            onClick={(e) => {
              e.stopPropagation();
              requestAdminUnlock(item.adminModule!);
            }}
            className="shrink-0 p-0.5 rounded hover:bg-muted/50 transition-colors cursor-pointer"
            title={`Desbloquear ${item.label}`}
          >
            <Unlock className="h-3 w-3 text-amber-500" />
          </span>
        )}
      </button>
      {/* Mini lock badge on collapsed sidebar */}
      {!sidebarOpen && item.adminModule && !isAdmin && (
        <div className="absolute -top-0.5 -right-0.5">
          <div className="w-2 h-2 rounded-full bg-amber-400" title="Bloqueado" />
        </div>
      )}
    </div>
  );
}


