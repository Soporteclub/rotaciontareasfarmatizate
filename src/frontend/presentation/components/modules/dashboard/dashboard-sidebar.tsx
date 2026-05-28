"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TaskIcon, getTaskColor } from "@/frontend/presentation/components/shared/task-icon";
import {
  BarChart3, Lock, Unlock, Sparkles, Building2, Scale, Calendar, Users, TrendingUp,
  ThumbsUp, ThumbsDown, Equal,
} from "lucide-react";
import { BRAND } from "@/frontend/presentation/lib/brand";
import type {
  GroupResponse, EmployeeResponse, RuleResponse,
  BalanceReportItem, BalanceReportResponse, AssignmentResponse,
} from "@/frontend/presentation/lib/query/hooks";

interface DashboardSidebarProps {
  groups: GroupResponse[] | undefined;
  balanceData: BalanceReportResponse | undefined;
  allEmployees: EmployeeResponse[] | undefined;
  allRules: RuleResponse[] | undefined;
  filteredAssignments: AssignmentResponse[];
  availableTaskTypes: string[];
  taskLegend: string[];
  effectiveGroupId: string | undefined;
}

/** Format a date string "2026-05-13" to "13 May 2026" */
function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/** Tarjeta: Motor de Equidad */
function FairnessCard() {
  return (
    <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900/40 dark:bg-blue-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2" style={{ color: BRAND.PRIMARY }}>
          <Scale className="h-4 w-4" style={{ color: BRAND.PRIMARY }} />
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

/** Get human-readable status label for fairness score */
function getBalanceStatus(fairnessScore: number): {
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  description: string;
} {
  if (fairnessScore > 0.5) {
    return {
      label: "Le debe turnos",
      icon: <ThumbsUp className="h-3 w-3" />,
      color: "text-amber-700 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-950/30",
      description: "Le faltan turnos comparado con el promedio",
    };
  }
  if (fairnessScore < -0.5) {
    return {
      label: "Le deben descanso",
      icon: <ThumbsDown className="h-3 w-3" />,
      color: "text-emerald-700 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
      description: "Ha hecho más turnos que el promedio",
    };
  }
  return {
    label: "Equilibrado",
    icon: <Equal className="h-3 w-3" />,
    color: "text-blue-700 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    description: "Tiene la cantidad justa de turnos",
  };
}

/** Tarjeta: Balance de asignaciones — SIMPLIFICADO */
function BalanceCard({
  balanceData, allEmployees, groups, effectiveGroupId,
}: {
  balanceData: BalanceReportResponse | undefined;
  allEmployees: EmployeeResponse[] | undefined;
  groups: GroupResponse[] | undefined;
  effectiveGroupId: string | undefined;
}) {
  const balanceReport = balanceData?.report;
  const hasData = balanceReport && balanceReport.length > 0;
  const maxAssignments = hasData
    ? Math.max(...balanceReport!.map((b) => b.totalAssignments), 1)
    : 1;

  const groupName = effectiveGroupId
    ? groups?.find((g) => g.id === effectiveGroupId)?.name ?? ""
    : "";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Balance
          {groupName && (
            <span className="text-xs font-normal text-muted-foreground">
              — {groupName}
            </span>
          )}
        </CardTitle>
        {hasData && balanceData && (
          <CardDescription className="text-xs flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDateShort(balanceData.dateRange.from)} — {formatDateShort(balanceData.dateRange.to)}
            </span>
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {/* Stats row — simplified labels */}
        {hasData && balanceData && (
          <div className="grid grid-cols-3 gap-2 mb-3 pb-3 border-b">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
                <Users className="h-3 w-3" />
                <span className="text-[10px]">Personas</span>
              </div>
              <span className="text-sm font-bold">{balanceData.employeeCount}</span>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
                <BarChart3 className="h-3 w-3" />
                <span className="text-[10px]">Turnos total</span>
              </div>
              <span className="text-sm font-bold">{balanceData.totalAssignments}</span>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
                <TrendingUp className="h-3 w-3" />
                <span className="text-[10px]">Turnos/persona</span>
              </div>
              <span className="text-sm font-bold">{balanceData.averagePerEmployee}</span>
            </div>
          </div>
        )}

        {/* Employee bars — simplified with status labels */}
        {hasData ? (
          <div className="space-y-2.5 max-h-80 overflow-y-auto">
            {[...balanceReport!]
              .sort((a, b) => b.totalAssignments - a.totalAssignments)
              .map((item) => {
                const emp = allEmployees?.find((e) => e.id === item.employeeId);
                const groupColor = groups?.find((g) => g.id === emp?.groupId)?.color ?? "#6b7280";
                const pct = Math.min(100, (item.totalAssignments / maxAssignments) * 100);
                const status = getBalanceStatus(item.fairnessScore ?? 0);
                return (
                  <div key={item.employeeId} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: groupColor }} />
                        <span className="font-medium truncate">{item.employeeName}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5 ${status.color} ${status.bgColor}`} title={status.description}>
                          {status.icon}
                          {status.label}
                        </span>
                        <span className="text-muted-foreground tabular-nums font-bold text-xs">
                          {item.totalAssignments} turnos
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="rounded-full h-2 transition-all"
                        style={{ width: `${pct}%`, backgroundColor: groupColor }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {effectiveGroupId ? "Sin datos — genera asignaciones primero" : "Selecciona un grupo para ver balance"}
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
            <span className="text-sm font-medium truncate" style={{ color: getTaskColor(task) }}>
              {task}
            </span>
          </div>
        ))}
        <div className="border-t pt-2 mt-2 space-y-1.5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="h-3 w-3" /><span>Histórico (bloqueado)</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
            <div key={g.id} className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
              <span className="font-medium">{g.name}</span>
              <span className="text-muted-foreground">— {empCount} emp. · {ruleCount} reglas</span>
            </div>
          );
        })}
        <p className="text-xs text-muted-foreground mt-1">
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
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Grupos</span>
          <span className="font-medium">{groups?.length ?? 0}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Asignaciones visibles</span>
          <span className="font-medium">{filteredAssignments.length}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Bloqueadas</span>
          <span className="font-medium">{lockedCount}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Tipos de tarea</span>
          <span className="font-medium">{availableTaskTypes.length}</span>
        </div>
      </CardContent>
    </Card>
  );
}

/** Barra lateral del dashboard con todas las tarjetas informativas */
export function DashboardSidebar({
  groups, balanceData, allEmployees, allRules,
  filteredAssignments, availableTaskTypes, taskLegend, effectiveGroupId,
}: DashboardSidebarProps) {
  return (
    <div className="space-y-4">
      <FairnessCard />
      <BalanceCard
        balanceData={balanceData}
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
