"use client";

import {
  CalendarDays,
  Settings,
  Users,
  ClipboardList,
  ScrollText,
  Menu,
  X,
  Recycle,
  ChevronDown,
} from "lucide-react";
import { useUIStore } from "@/presentation/hooks/use-ui-store";
import { cn } from "@/lib/utils";
import { useState } from "react";

type NavItem = {
  id: "calendar" | "groups" | "employees" | "rules" | "audit";
  label: string;
  icon: React.ReactNode;
  section?: "main" | "config";
};

const mainItems: NavItem[] = [
  { id: "calendar", label: "Calendario", icon: <CalendarDays className="h-4 w-4" /> },
];

const configItems: NavItem[] = [
  { id: "groups", label: "Grupos", icon: <Users className="h-4 w-4" />, section: "config" },
  { id: "employees", label: "Empleados", icon: <Users className="h-4 w-4" />, section: "config" },
  { id: "rules", label: "Reglas", icon: <ClipboardList className="h-4 w-4" />, section: "config" },
];

const auditItems: NavItem[] = [
  { id: "audit", label: "Auditoría", icon: <ScrollText className="h-4 w-4" /> },
];

export function Sidebar() {
  const { activeView, setActiveView, sidebarOpen, setSidebarOpen } = useUIStore();
  const [configOpen, setConfigOpen] = useState(true);

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
        <div className="flex items-center gap-3 px-3 py-4 border-b border-border">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground shrink-0">
            <Recycle className="h-4 w-4" />
          </div>
          {sidebarOpen && (
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-sm truncate">Rotación</span>
              <span className="text-[10px] text-muted-foreground">Asignación justa</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
          {/* Main items */}
          {mainItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveView(item.id);
                if (window.innerWidth < 768) setSidebarOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                activeView === item.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {item.icon}
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}

          {/* Config section */}
          {sidebarOpen && (
            <button
              onClick={() => setConfigOpen(!configOpen)}
              className="w-full flex items-center justify-between px-3 pt-4 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
            >
              <span className="flex items-center gap-1.5">
                <Settings className="h-3 w-3" />
                Configuración
              </span>
              <ChevronDown className={cn("h-3 w-3 transition-transform", configOpen && "rotate-180")} />
            </button>
          )}

          {configOpen && configItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveView(item.id);
                if (window.innerWidth < 768) setSidebarOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                activeView === item.id
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {item.icon}
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}

          {/* Audit section */}
          <div className="pt-3 border-t border-border mt-3">
            {auditItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveView(item.id);
                  if (window.innerWidth < 768) setSidebarOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                  activeView === item.id
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                {item.icon}
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            ))}
          </div>
        </nav>

        {/* Footer */}
        {sidebarOpen && (
          <div className="px-3 py-2 border-t border-border">
            <p className="text-[10px] text-muted-foreground">v1.0 • Fairness Engine</p>
          </div>
        )}
      </aside>
    </>
  );
}
