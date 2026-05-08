"use client";

import { Providers } from "@/presentation/components/layout/providers";
import { Sidebar } from "@/presentation/components/layout/sidebar";
import { DashboardModule } from "@/presentation/components/modules/dashboard/dashboard-module";
import { GroupsModule } from "@/presentation/components/modules/groups/groups-module";
import { EmployeesModule } from "@/presentation/components/modules/employees/employees-module";
import { RulesModule } from "@/presentation/components/modules/rules/rules-module";
import { AuditModule } from "@/presentation/components/modules/audit/audit-module";
import { useUIStore } from "@/presentation/hooks/use-ui-store";

function AppContent() {
  const activeView = useUIStore((s) => s.activeView);

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-3 md:p-4 lg:p-6 overflow-y-auto">
          {activeView === "calendar" && <DashboardModule />}
          {activeView === "groups" && <GroupsModule />}
          {activeView === "employees" && <EmployeesModule />}
          {activeView === "rules" && <RulesModule />}
          {activeView === "audit" && <AuditModule />}
        </main>
      </div>
      <footer className="border-t border-border bg-card px-4 py-2 text-center text-[10px] text-muted-foreground">
        Sistema de Asignación Rotativa • Motor de Fairness v1.0
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
