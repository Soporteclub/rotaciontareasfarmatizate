"use client";

import { useGroups, useEmployees, useAssignments } from "@/presentation/lib/query/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCircle, CalendarDays, ClipboardList, TrendingUp, AlertCircle } from "lucide-react";
import { useUIStore } from "@/presentation/hooks/use-ui-store";

export function DashboardModule() {
  const { data: groups, isLoading: loadingGroups } = useGroups(true);
  const { data: employees, isLoading: loadingEmployees } = useEmployees(undefined, true);
  const setActiveView = useUIStore((s) => s.setActiveView);
  const setSelectedGroupId = useUIStore((s) => s.setSelectedGroupId);

  const activeGroups = groups?.filter((g) => g.isActive) ?? [];
  const activeEmployees = employees?.filter((e) => e.isActive) ?? [];
  const inactiveEmployees = employees?.filter((e) => !e.isActive) ?? [];

  // Count total rules
  const totalRules = activeGroups.reduce((acc, g) => acc + (g.rules?.length ?? 0), 0);

  // Group stats for cards
  const groupStats = activeGroups.map((g) => {
    const empCount = g.employees?.filter((e) => e.isActive).length ?? 0;
    const ruleCount = g.rules?.length ?? 0;
    return { ...g, empCount, ruleCount };
  });

  if (loadingGroups || loadingEmployees) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Panel de Control</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Panel de Control</h1>
        <p className="text-muted-foreground">Resumen del sistema de asignación rotativa</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveView("groups")}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Grupos Activos</p>
                <p className="text-3xl font-bold">{activeGroups.length}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveView("employees")}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Empleados Activos</p>
                <p className="text-3xl font-bold">{activeEmployees.length}</p>
              </div>
              <UserCircle className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveView("rules")}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Reglas Activas</p>
                <p className="text-3xl font-bold">{totalRules}</p>
              </div>
              <ClipboardList className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inactivos</p>
                <p className="text-3xl font-bold">{inactiveEmployees.length}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Group details */}
      {activeGroups.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No hay grupos</h3>
            <p className="text-muted-foreground mb-4">
              Crea tu primer grupo para comenzar a gestionar las asignaciones rotativas.
            </p>
            <button
              onClick={() => setActiveView("groups")}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Users className="h-4 w-4" />
              Crear Grupo
            </button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groupStats.map((group) => (
            <Card
              key={group.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => {
                setSelectedGroupId(group.id);
                setActiveView("calendar");
              }}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: group.color }}
                  />
                  <CardTitle className="text-base">{group.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <p className="text-sm text-muted-foreground mb-3">
                  {group.description ?? `Tipo: ${group.taskType}`}
                </p>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <UserCircle className="h-3.5 w-3.5" />
                    <span>{group.empCount} empleados</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span>{group.ruleCount} reglas</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Quick tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Guía Rápida
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="space-y-1">
              <p className="font-medium">1. Crear Grupo</p>
              <p className="text-muted-foreground">Define un grupo con tipo de tarea (aseo, cocina, etc.)</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium">2. Agregar Empleados y Reglas</p>
              <p className="text-muted-foreground">Añade personal y define los días de rotación</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium">3. Generar Asignaciones</p>
              <p className="text-muted-foreground">El motor de fairness distribuye las tareas justamente</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
