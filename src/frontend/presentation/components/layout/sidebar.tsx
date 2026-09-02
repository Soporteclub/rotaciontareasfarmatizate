"use client";

import {
  CalendarHeart,
  CalendarCheck,
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
} from "lucide-react";
import { useUIStore } from "@/frontend/presentation/hooks/use-ui-store";
import { BRAND } from "@/frontend/presentation/lib/brand";
import { cn } from "@/frontend/lib/utils";
import { useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { toast } from "sonner";
type NavItem = {
  id: "calendar" | "groups" | "employees" | "rules" | "holidays" | "audit";
  label: string;
  icon: React.ReactNode;
  section?: "main" | "config";
  description?: string;
  adminOnly?: boolean;
};

const mainItems: NavItem[] = [
  {
    id: "calendar",
    label: "Calendario",
    icon: <CalendarHeart className="h-4 w-4" />,
    description: "Vista de asignaciones",
  },
];

const configItems: NavItem[] = [
  { id: "groups", label: "Grupos", icon: <Building2 className="h-4 w-4" />, section: "config", description: "Pisos / áreas", adminOnly: true },
  { id: "employees", label: "Empleados", icon: <UserCog className="h-4 w-4" />, section: "config", description: "Personal", adminOnly: true },
  { id: "rules", label: "Reglas", icon: <ClipboardCheck className="h-4 w-4" />, section: "config", description: "Rotación", adminOnly: true },
  { id: "holidays", label: "Festivos", icon: <CalendarCheck className="h-4 w-4" />, section: "config", description: "Días no laborables", adminOnly: true },
];

const auditItems: NavItem[] = [
  { id: "audit", label: "Auditoría", icon: <ScrollText className="h-4 w-4" />, description: "Historial", adminOnly: true },
];

export function Sidebar() {
  const { activeView, setActiveView, sidebarOpen, setSidebarOpen, isAdmin, requestAdminUnlock, lockAdmin } = useUIStore();
  const [configOpen, setConfigOpen] = useState(true);
  // FIX (hydration): `sidebarOpen` initial value differs between server (always
  // true) and client (mobile = false), which caused a hydration mismatch on the
  // mobile overlay/toggle. useSyncExternalStore returns false during
  // SSR/hydration (getServerSnapshot) and true after mount (getSnapshot), so
  // both sides render nothing first and the toggle/overlay appear on the client
  // without triggering react-hooks/set-state-in-effect.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  return (
    <>
      {/* Mobile overlay */}
      {mounted && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile toggle */}
      {mounted && (
        <button
          className="fixed top-3 left-3 z-50 md:hidden bg-card border border-border rounded-lg p-2 shadow-lg hover:bg-accent transition-colors"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed md:static inset-y-0 left-0 z-50 flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out",
          sidebarOpen ? "w-60 translate-x-0" : "-translate-x-full md:translate-x-0 md:w-16"
        )}
      >
        {/* ─── Logo header ─────────────────────────────────────── */}
        <div className={cn(
          "flex items-center border-b border-sidebar-border shrink-0",
          sidebarOpen ? "gap-3 px-4 py-4" : "justify-center px-2 py-4"
        )}>
          {sidebarOpen ? (
            <>
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary shrink-0 shadow-sm">
                <Image
                  src="/LogoFarmt.jpeg"
                  alt="Farmatízate"
                  width={22}
                  height={22}
                  className="shrink-0 rounded"
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-sm truncate text-sidebar-foreground tracking-tight">Farmatízate</span>
                <span className="text-[11px] text-muted-foreground font-medium leading-tight">Club del Droguiista</span>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary shadow-sm">
              <Image
                src="/LogoFarmt.jpeg"
                alt="Farmatízate"
                width={20}
                height={20}
                className="shrink-0 rounded"
              />
            </div>
          )}
        </div>

        {/* ─── Navigation ─────────────────────────────────────── */}
        <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
          {/* Main items (always visible) */}
          {mainItems.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              activeView={activeView}
              sidebarOpen={sidebarOpen}
              setActiveView={setActiveView}
              setSidebarOpen={setSidebarOpen}
            />
          ))}

          {/* Admin sections — only visible when unlocked */}
          {isAdmin && (
            <>
              {/* Config section header */}
              {sidebarOpen && (
                <button
                  onClick={() => setConfigOpen(!configOpen)}
                  className="w-full flex items-center justify-between px-3 pt-4 pb-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Settings2 className="h-3 w-3" />
                    Configuración
                  </span>
                  <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", configOpen && "rotate-180")} />
                </button>
              )}

              {!sidebarOpen && <div className="my-2 border-t border-sidebar-border" />}

              {configOpen && configItems.map((item) => (
                <NavButton
                  key={item.id}
                  item={item}
                  activeView={activeView}
                  sidebarOpen={sidebarOpen}
                  setActiveView={setActiveView}
                  setSidebarOpen={setSidebarOpen}
                />
              ))}

              {/* Audit section */}
              <div className="my-2 border-t border-sidebar-border" />
              {auditItems.map((item) => (
                <NavButton
                  key={item.id}
                  item={item}
                  activeView={activeView}
                  sidebarOpen={sidebarOpen}
                  setActiveView={setActiveView}
                  setSidebarOpen={setSidebarOpen}
                />
              ))}
            </>
          )}
        </nav>

        {/* ─── Footer ─────────────────────────────────────────── */}
        <SidebarFooter
          sidebarOpen={sidebarOpen}
          isAdmin={isAdmin}
          requestAdminUnlock={requestAdminUnlock}
          lockAdmin={lockAdmin}
        />
      </aside>
    </>
  );
}

// ─── Sidebar Footer ───────────────────────────────────────────
function SidebarFooter({
  sidebarOpen,
  isAdmin,
  requestAdminUnlock,
  lockAdmin,
}: {
  sidebarOpen: boolean;
  isAdmin: boolean;
  requestAdminUnlock: () => void;
  lockAdmin: (silent?: boolean) => void;
}) {
  return (
    <div className="px-2 py-3 border-t border-sidebar-border space-y-2">
      {isAdmin ? (
        <UnlockedStatus sidebarOpen={sidebarOpen} lockAdmin={lockAdmin} />
  ) : (
    <LockedStatus sidebarOpen={sidebarOpen} requestAdminUnlock={requestAdminUnlock} />
  )}
  {isAdmin && sidebarOpen && (
    <div className="space-y-1 pt-1">
      <a
        href="/docs"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-primary transition-colors"
      >
        <FileCode2 className="h-3 w-3" />
        API Docs
      </a>
      <p className="text-[10px] text-muted-foreground/50 font-medium">v2.0</p>
    </div>
  )}
  {isAdmin && !sidebarOpen && (
    <a
      href="/docs"
      target="_blank"
      rel="noopener noreferrer"
      className="flex justify-center text-muted-foreground hover:text-primary transition-colors py-1"
      title="API Docs"
    >
      <FileCode2 className="h-3.5 w-3.5" />
    </a>
  )}
</div>
  );
}

function UnlockedStatus({
  sidebarOpen,
  lockAdmin,
}: {
  sidebarOpen: boolean;
  lockAdmin: (silent?: boolean) => void;
}) {
  if (!sidebarOpen) {
    return (
      <button onClick={() => lockAdmin(true)} className="flex justify-center w-full py-0.5" title="Admin activo — clic para bloquear">
        <Shield className="h-4 w-4 text-brand-success" />
      </button>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Shield className="h-3 w-3 text-brand-success" />
        <span className="font-medium">Admin activo</span>
        <button
          onClick={() => lockAdmin(true)}
          className="ml-auto p-0.5 rounded hover:bg-muted transition-colors"
          title="Bloquear todo"
        >
          <Lock className="h-3 w-3 text-muted-foreground hover:text-destructive" />
        </button>
      </div>
      <div className="flex flex-wrap gap-1">
        {(["Grupos", "Empl.", "Reglas", "Audit."] as const).map((label) => (
          <span
            key={label}
            className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-brand-success/15 text-brand-success"
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

function LockedStatus({
  sidebarOpen,
  requestAdminUnlock,
}: {
  sidebarOpen: boolean;
  requestAdminUnlock: () => void;
}) {
  if (!sidebarOpen) {
    return (
      <button
        onClick={requestAdminUnlock}
        className="flex justify-center w-full py-0.5"
        title="Clic para desbloquear admin"
      >
        <Lock className="h-4 w-4 text-muted-foreground/50" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <Lock className="h-3 w-3" />
      <span className="font-medium">Solo calendario</span>
      <button
        onClick={requestAdminUnlock}
        className="ml-auto p-0.5 rounded hover:bg-muted transition-colors cursor-pointer"
        title="Desbloquear admin"
      >
        <Unlock className="h-3 w-3 text-amber-500" />
      </button>
    </div>
  );
}

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

// ─── Nav Button ────────────────────────────────────────────────
function NavButton({
  item,
  activeView,
  sidebarOpen,
  setActiveView,
  setSidebarOpen,
}: {
  item: NavItem;
  activeView: string;
  sidebarOpen: boolean;
  setActiveView: (view: NavItem["id"]) => void;
  setSidebarOpen: (open: boolean) => void;
}) {
  const isActive = activeView === item.id;

  return (
    <button
      onClick={() => {
        setActiveView(item.id);
        if (window.innerWidth < 768) setSidebarOpen(false);
      }}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 group",
        isActive
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      )}
    >
      <span className={cn(
        "shrink-0 transition-colors",
        isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-sidebar-accent-foreground"
      )}>
        {item.icon}
      </span>
      {sidebarOpen && (
        <div className="flex flex-col min-w-0 flex-1 text-left">
          <span className={cn("truncate text-sm", isActive && "font-medium")}>{item.label}</span>
          {item.description && (
            <span className={cn(
              "text-[11px] leading-tight",
              isActive ? "text-primary-foreground/65" : "text-muted-foreground/60"
            )}>
              {item.description}
            </span>
          )}
        </div>
      )}
    </button>
  );
}
