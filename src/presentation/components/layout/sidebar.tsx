"use client";

import {
  LayoutDashboard,
  Users,
  UserCircle,
  CalendarDays,
  ClipboardList,
  ScrollText,
  Menu,
  X,
  Recycle,
} from "lucide-react";
import { useUIStore } from "@/presentation/hooks/use-ui-store";
import { cn } from "@/lib/utils";

type NavItem = {
  id: "dashboard" | "groups" | "employees" | "rules" | "calendar" | "audit";
  label: string;
  icon: React.ReactNode;
};

const navItems: NavItem[] = [
  { id: "dashboard", label: "Panel", icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: "groups", label: "Grupos", icon: <Users className="h-4 w-4" /> },
  { id: "employees", label: "Empleados", icon: <UserCircle className="h-4 w-4" /> },
  { id: "rules", label: "Reglas", icon: <ClipboardList className="h-4 w-4" /> },
  { id: "calendar", label: "Calendario", icon: <CalendarDays className="h-4 w-4" /> },
  { id: "audit", label: "Auditoría", icon: <ScrollText className="h-4 w-4" /> },
];

export function Sidebar() {
  const { activeView, setActiveView, sidebarOpen, setSidebarOpen } = useUIStore();

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
          "fixed md:static inset-y-0 left-0 z-50 w-64 bg-card border-r border-border flex flex-col transition-transform duration-200 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0 md:w-16"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-border">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
            <Recycle className="h-4 w-4" />
          </div>
          {sidebarOpen && (
            <div className="flex flex-col">
              <span className="font-semibold text-sm">Rotación Tareas</span>
              <span className="text-xs text-muted-foreground">Sistema de asignación justa</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveView(item.id);
                if (window.innerWidth < 768) setSidebarOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                activeView === item.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {item.icon}
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Footer */}
        {sidebarOpen && (
          <div className="px-4 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              v1.0 • Arquitectura Limpia
            </p>
          </div>
        )}
      </aside>
    </>
  );
}
