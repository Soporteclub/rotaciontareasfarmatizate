"use client";

import { Providers } from "@/presentation/components/layout/providers";
import { Sidebar } from "@/presentation/components/layout/sidebar";
import { DashboardModule } from "@/presentation/components/modules/dashboard/dashboard-module";
import { GroupsModule } from "@/presentation/components/modules/groups/groups-module";
import { EmployeesModule } from "@/presentation/components/modules/employees/employees-module";
import { RulesModule } from "@/presentation/components/modules/rules/rules-module";
import { CalendarModule } from "@/presentation/components/modules/calendar/calendar-module";
import { AuditModule } from "@/presentation/components/modules/audit/audit-module";
import { useUIStore } from "@/presentation/hooks/use-ui-store";

function AppContent() {
  const activeView = useUIStore((s) => s.activeView);

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
          {activeView === "dashboard" && <DashboardModule />}
          {activeView === "groups" && <GroupsModule />}
          {activeView === "employees" && <EmployeesModule />}
          {activeView === "rules" && <RulesModule />}
          {activeView === "calendar" && <CalendarModule />}
          {activeView === "audit" && <AuditModule />}
        </main>
      </div>
      <footer className="border-t border-border bg-card px-4 py-3 text-center text-xs text-muted-foreground">
        Sistema de Asignación Rotativa • Motor de Fairness v1.0 • Arquitectura Limpia
      </footer>
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
