"use client";

import { Providers } from "@/frontend/presentation/components/layout/providers";
import { Sidebar } from "@/frontend/presentation/components/layout/sidebar";
import { AdminKeyModal } from "@/frontend/presentation/components/layout/admin-key-modal";
import { DashboardModule } from "@/frontend/presentation/components/modules/dashboard/dashboard-module";
import { GroupsModule } from "@/frontend/presentation/components/modules/groups/groups-module";
import { EmployeesModule } from "@/frontend/presentation/components/modules/employees/employees-module";
import { RulesModule } from "@/frontend/presentation/components/modules/rules/rules-module";
import { AuditModule } from "@/frontend/presentation/components/modules/audit/audit-module";
import { useUIStore } from "@/frontend/presentation/hooks/use-ui-store";
import Image from "next/image";
import {
  CalendarHeart,
  Building2,
  UserCog,
  ClipboardCheck,
  ScrollText,
  ChevronRight,
} from "lucide-react";

const VIEW_META: Record<string, { label: string; icon: React.ReactNode; description: string }> = {
  calendar: { label: "Calendario", icon: <CalendarHeart className="h-5 w-5" />, description: "Vista de asignaciones y rotación" },
  groups: { label: "Grupos", icon: <Building2 className="h-5 w-5" />, description: "Pisos y áreas de trabajo" },
  employees: { label: "Empleados", icon: <UserCog className="h-5 w-5" />, description: "Gestión de personal" },
  rules: { label: "Reglas", icon: <ClipboardCheck className="h-5 w-5" />, description: "Configuración de rotación" },
  audit: { label: "Auditoría", icon: <ScrollText className="h-5 w-5" />, description: "Historial de cambios" },
};

function AppContent() {
  const activeView = useUIStore((s) => s.activeView);
  const isAdmin = useUIStore((s) => s.isAdmin);
  const viewMeta = VIEW_META[activeView] ?? VIEW_META.calendar;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        {/* ─── Main content area ──────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* ─── Page header ─────────────────────────────────── */}
          <header className="shrink-0 border-b border-border bg-card/50 backdrop-blur-sm">
            <div className="flex items-center gap-3 px-4 md:px-6 py-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary shrink-0">
                {viewMeta.icon}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <span>Farmatízate</span>
                  <ChevronRight className="h-3 w-3" />
                  <span className="text-foreground font-medium">{viewMeta.label}</span>
                </div>
                <p className="text-xs text-muted-foreground/70 truncate">{viewMeta.description}</p>
              </div>
            </div>
          </header>

          {/* ─── Page body ───────────────────────────────────── */}
          <main className="flex-1 p-4 md:p-6 overflow-y-auto">
            {activeView === "calendar" && <DashboardModule />}
            {/* Admin-only modules — only rendered when admin is unlocked */}
            {isAdmin && activeView === "groups" && <GroupsModule />}
            {isAdmin && activeView === "employees" && <EmployeesModule />}
            {isAdmin && activeView === "rules" && <RulesModule />}
            {isAdmin && activeView === "audit" && <AuditModule />}
          </main>
        </div>
      </div>

      {/* ─── Footer ──────────────────────────────────────────── */}
      <footer className="mt-auto border-t border-border bg-card shrink-0">
        <div className="flex items-center justify-center gap-2 px-4 py-2">
          <Image
            src="/LogoFarmt.jpeg"
            alt="Farmatízate"
            width={18}
            height={18}
            className="shrink-0 opacity-60 rounded"
          />
          <span className="text-[11px] text-muted-foreground font-medium tracking-wide">
            Farmatízate by Club del Droguista • Rotación v2.0
          </span>
        </div>
      </footer>
      <AdminKeyModal />
    </div>
  );
}

export default function Home() {
  return (
    <Providers>
      <AppContent />
    </Providers>
  );
}
