"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskIcon, getTaskColor } from "@/frontend/presentation/components/shared/task-icon";
import {
  BarChart3, Lock, Unlock, Sparkles, Building2, Scale,
} from "lucide-react";
import type {
  GroupResponse, EmployeeResponse, RuleResponse,
  BalanceReportItem, AssignmentResponse,
} from "@/frontend/presentation/lib/query/hooks";

interface DashboardSidebarProps {
  groups: GroupResponse[] | undefined;
  balanceReport: BalanceReportItem[] | undefined;
  allEmployees: EmployeeResponse[] | undefined;
  allRules: RuleResponse[] | undefined;
  filteredAssignments: AssignmentResponse[];
  availableTaskTypes: string[];
  taskLegend: string[];
  effectiveGroupId: string | undefined;
}

/** Tarjeta: Motor de Equidad */
function FairnessCard() {
  return (
    <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900/40 dark:bg-blue-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2" style={{ color: "#1545cb" }}>
          <Scale className="h-4 w-4" style={{ color: "#1545cb" }} />
          Motor de Equidad
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-2 text-xs text-muted-foreground">
        <p>
          Cada <strong>piso/grupo</strong> rota de forma <strong>independiente</strong>
          con su propio personal. Piso 1 y Piso 2 cada uno asigna a su persona
          para cada tarea en cada día correspondiente.
        </p>
        <p>
          El algoritmo elige al empleado con <strong>mayor puntaje de equidad</strong>:
          quien menos tareas ha tenido, con más días de descanso, y sin asignaciones
          consecutivas recientes.
        </p>
        <div className="pt-1 border-t space-y-1">
          <p className="font-medium text-foreground">Factores del puntaje:</p>
          <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[10px]">
            <span className="font-medium" style={{ color: "#00cd98" }}>+ Balance</span>
            <span>Menos tareas = más puntaje</span>
            <span className="font-medium" style={{ color: "#00cd98" }}>+ Mensual</span>
            <span>Equilibrio por mes</span>
            <span className="font-medium" style={{ color: "#f15a24" }}>− Enfriamiento</span>
            <span>Penaliza si fue reciente</span>
            <span className="font-medium" style={{ color: "#f15a24" }}>− Consecutivas</span>
            <span>Penaliza rachas</span>
            <span className="font-medium" style={{ color: "#f15a24" }}>− Mismo día</span>
            <span>Evita doble tarea</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Tarjeta: Balance de asignaciones */
function BalanceCard({
  balanceReport, allEmployees, groups, effectiveGroupId,
}: {
  balanceReport: BalanceReportItem[] | undefined;
  allEmployees: EmployeeResponse[] | undefined;
  groups: GroupResponse[] | undefined;
  effectiveGroupId: string | undefined;
}) {
  const hasData = balanceReport && balanceReport.length > 0;
  const maxAssignments = hasData
    ? Math.max(...balanceReport!.map((b) => b.totalAssignments), 1)
    : 1;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Balance
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {hasData ? (
          <div className="space-y-2.5 max-h-72 overflow-y-auto">
            {[...balanceReport!]
              .sort((a, b) => b.totalAssignments - a.totalAssignments)
              .map((item) => {
                const emp = allEmployees?.find((e) => e.id === item.employeeId);
                const groupColor = groups?.find((g) => g.id === emp?.groupId)?.color ?? "#6b7280";
                const pct = Math.min(100, (item.totalAssignments / maxAssignments) * 100);
                return (
                  <div key={item.employeeId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: groupColor }} />
                        <span className="font-medium truncate">{item.employeeName}</span>
                      </div>
                      <span className="text-muted-foreground tabular-nums shrink-0 ml-2">
                        {item.totalAssignments}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div
                        className="rounded-full h-1.5 transition-all"
                        style={{ width: `${pct}%`, backgroundColor: groupColor }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            {effectiveGroupId ? "Sin datos" : "Selecciona un grupo para ver balance"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/** Tarjeta: Leyenda de tareas */
function TaskLegendCard({ taskLegend }: { taskLegend: string[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Tareas</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-2">
        {taskLegend.map((task) => (
          <div key={task} className="flex items-center gap-2">
            <TaskIcon taskType={task} size="sm" />
            <span className="text-xs font-medium truncate" style={{ color: getTaskColor(task) }}>
              {task}
            </span>
          </div>
        ))}
        <div className="border-t pt-2 mt-2 space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" /><span>Histórico (bloqueado)</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Unlock className="h-3 w-3" /><span>Futuro (editable)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Tarjeta: Grupos independientes */
function GroupsCard({
  groups, allEmployees, allRules,
}: {
  groups: GroupResponse[] | undefined;
  allEmployees: EmployeeResponse[] | undefined;
  allRules: RuleResponse[] | undefined;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Grupos (independientes)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-2">
        {groups?.map((g) => {
          const empCount = allEmployees?.filter((e) => e.groupId === g.id && e.isActive).length ?? 0;
          const ruleCount = allRules?.filter((r) => r.groupId === g.id && r.isActive).length ?? 0;
          return (
            <div key={g.id} className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
              <span className="font-medium">{g.name}</span>
              <span className="text-muted-foreground">— {empCount} emp. · {ruleCount} reglas</span>
            </div>
          );
        })}
        <p className="text-[10px] text-muted-foreground mt-1">
          Cada piso rota independientemente con su propio personal.
        </p>
      </CardContent>
    </Card>
  );
}

/** Tarjeta: Resumen estadístico */
function StatsCard({
  groups, filteredAssignments, availableTaskTypes,
}: {
  groups: GroupResponse[] | undefined;
  filteredAssignments: AssignmentResponse[];
  availableTaskTypes: string[];
}) {
  const lockedCount = filteredAssignments.filter((a) => a.isLocked).length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Resumen
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Grupos</span>
          <span className="font-medium">{groups?.length ?? 0}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Asignaciones visibles</span>
          <span className="font-medium">{filteredAssignments.length}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Bloqueadas</span>
          <span className="font-medium">{lockedCount}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Tipos de tarea</span>
          <span className="font-medium">{availableTaskTypes.length}</span>
        </div>
      </CardContent>
    </Card>
  );
}

/** Barra lateral del dashboard con todas las tarjetas informativas */
export function DashboardSidebar({
  groups, balanceReport, allEmployees, allRules,
  filteredAssignments, availableTaskTypes, taskLegend, effectiveGroupId,
}: DashboardSidebarProps) {
  return (
    <div className="space-y-4">
      <FairnessCard />
      <BalanceCard
        balanceReport={balanceReport}
        allEmployees={allEmployees}
        groups={groups}
        effectiveGroupId={effectiveGroupId}
      />
      <TaskLegendCard taskLegend={taskLegend} />
      <GroupsCard groups={groups} allEmployees={allEmployees} allRules={allRules} />
      <StatsCard
        groups={groups}
        filteredAssignments={filteredAssignments}
        availableTaskTypes={availableTaskTypes}
      />
    </div>
  );
}
