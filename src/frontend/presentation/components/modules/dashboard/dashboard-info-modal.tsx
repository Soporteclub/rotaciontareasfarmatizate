"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TaskIcon, getTaskColor } from "@/frontend/presentation/components/shared/task-icon";
import {
  BarChart3, Lock, Unlock, Sparkles, Building2, Scale, Users, TrendingUp,
  ThumbsUp, ThumbsDown, Equal, Info, ChevronDown,
} from "lucide-react";
import { BRAND } from "@/frontend/presentation/lib/brand";
import type {
  GroupResponse, EmployeeResponse, RuleResponse,
  BalanceReportResponse, AssignmentResponse,
} from "@/frontend/presentation/lib/query/hooks";

interface DashboardInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

/** Sección: Motor de Equidad */
function FairnessSection() {
  return (
    <div className="space-y-4 text-sm">
      <div className="rounded-lg border border-blue-200 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 p-3">
        <p className="font-semibold text-foreground text-sm mb-1" style={{ color: BRAND.PRIMARY }}>
          ¿Qué es el motor de equidad?
        </p>
        <p className="text-xs text-muted-foreground">
          Es el algoritmo que decide quién hace cada tarea. Su objetivo es que nadie tenga más asignaciones que otro,
          pero <strong>cada tarea se balancea por separado</strong>: la basura solo se reparte entre quienes pueden sacar basura;
          la cafetería, entre quienes pueden atender la cafetería. Si alguien no hace cafetería, no recibe más basura por compensación.
        </p>
      </div>

      <div>
        <p className="font-medium text-foreground mb-1">¿Cómo funciona?</p>
        <p className="text-xs text-muted-foreground">
          Cada vez que hay que asignar una tarea, el sistema le da un <strong>puntaje</strong> a cada persona
          <strong>elegible</strong> para esa tarea. Gana la persona con más puntaje.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div className="space-y-1.5 rounded-lg border p-3">
          <p className="font-medium text-foreground flex items-center gap-1 text-sm">
            <span style={{ color: "#00cd98" }}>✓</span> Aumentan el puntaje
          </p>
          <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-[11px] ml-2">
            <span className="font-medium" style={{ color: "#00cd98" }}>+5</span>
            <span>Tiene menos turnos de <strong>esta tarea</strong> que el promedio</span>
            <span className="font-medium" style={{ color: "#00cd98" }}>+3</span>
            <span>Tiene menos turnos de <strong>esta tarea</strong> este mes</span>
            <span className="font-medium" style={{ color: "#00cd98" }}>+0.5</span>
            <span>Nunca ha hecho <strong>esta tarea</strong></span>
          </div>
        </div>

        <div className="space-y-1.5 rounded-lg border p-3">
          <p className="font-medium text-foreground flex items-center gap-1 text-sm">
            <span style={{ color: "#f15a24" }}>✗</span> Reducen el puntaje
          </p>
          <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-[11px] ml-2">
            <span className="font-medium" style={{ color: "#f15a24" }}>−2</span>
            <span>Hizo turno hace <strong>menos de 7 días</strong></span>
            <span className="font-medium" style={{ color: "#f15a24" }}>−3</span>
            <span>Repitió la misma tarea <strong>varias semanas seguidas</strong></span>
            <span className="font-medium" style={{ color: "#f15a24" }}>−5</span>
            <span>Ya tiene <strong>otra tarea hoy</strong></span>
          </div>
        </div>
      </div>

      <div className="rounded-lg border p-3">
        <p className="font-medium text-foreground mb-1 text-sm">💡 Ejemplo con números</p>
        <p className="text-[11px] text-muted-foreground">
          Hoy lunes toca asignar <strong>Sacar Basura</strong>. Solo pueden hacerla <strong>Ana</strong> y <strong>Luis</strong>.
          <br /><br />
          • Ana tiene <strong>2 turnos</strong> de basura en el mes. Luis tiene <strong>5 turnos</strong>.
          <br />
          • El motor prioriza a Ana: +15 pts (3 turnos menos × 5). Luis obtiene 0 pts por este concepto.
          <br />
          • Resultado: <strong>Ana hace la basura hoy</strong>, porque necesita ponerse al día en ESA tarea específica.
          <br />
          <br />
          Esto se repite para cada tarea y cada día, sin mezclar puntajes entre tareas distintas.
        </p>
      </div>

      <div className="text-[11px] text-muted-foreground">
        Cada <strong>piso/grupo</strong> rota de forma <strong>independiente</strong> con su propio personal.
        Nadie de Piso 1 hace tareas de Piso 2, y viceversa.
      </div>
    </div>
  );
}

/** Sección: Balance de asignaciones — con desglose por tarea */
function BalanceSection({
  balanceData, allEmployees, groups, effectiveGroupId, allRules,
}: {
  balanceData: BalanceReportResponse | undefined;
  allEmployees: EmployeeResponse[] | undefined;
  groups: GroupResponse[] | undefined;
  effectiveGroupId: string | undefined;
  allRules: RuleResponse[] | undefined;
}) {
  const [expandedEmp, setExpandedEmp] = useState<string | null>(null);
  const balanceReport = balanceData?.report;
  const hasData = balanceReport && balanceReport.length > 0;
  const maxAssignments = hasData
    ? Math.max(...balanceReport!.map((b) => b.totalAssignments), 1)
    : 1;

  const groupName = effectiveGroupId
    ? groups?.find((g) => g.id === effectiveGroupId)?.name ?? ""
    : "";

  // Build taskName → {color, icon} map for the per-task breakdown
  const taskStyleMap = new Map<string, { color: string | null; icon: string | null }>();
  if (allRules) {
    for (const r of allRules) {
      if (!taskStyleMap.has(r.taskLabel)) {
        taskStyleMap.set(r.taskLabel, { color: r.color, icon: r.icon });
      }
    }
  }

  return (
    <div className="space-y-3">
      {hasData && balanceData && (
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 rounded-lg border">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
              <Users className="h-3 w-3" />
              <span className="text-[10px]">Personas</span>
            </div>
            <span className="text-lg font-bold">{balanceData.employeeCount}</span>
          </div>
          <div className="text-center p-2 rounded-lg border">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
              <BarChart3 className="h-3 w-3" />
              <span className="text-[10px]">Turnos total</span>
            </div>
            <span className="text-lg font-bold">{balanceData.totalAssignments}</span>
          </div>
          <div className="text-center p-2 rounded-lg border">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
              <TrendingUp className="h-3 w-3" />
              <span className="text-[10px]">Turnos/persona</span>
            </div>
            <span className="text-lg font-bold">{balanceData.averagePerEmployee}</span>
          </div>
        </div>
      )}

      {groupName && (
        <p className="text-xs text-muted-foreground text-center">
          Mostrando: <span className="font-medium">{groupName}</span>
          {balanceData && (
            <span className="ml-2">
              · {formatDateShort(balanceData.dateRange.from)} — {formatDateShort(balanceData.dateRange.to)}
            </span>
          )}
        </p>
      )}

      {hasData ? (
        <div className="space-y-2 max-h-[28rem] overflow-y-auto">
          <p className="text-[11px] text-muted-foreground text-center">
            💡 Haz clic en una persona para ver el desglose por tarea
          </p>
          {[...balanceReport!]
            .sort((a, b) => b.totalAssignments - a.totalAssignments)
            .map((item) => {
              const emp = allEmployees?.find((e) => e.id === item.employeeId);
              const groupColor = groups?.find((g) => g.id === emp?.groupId)?.color ?? "#6b7280";
              const pct = Math.min(100, (item.totalAssignments / maxAssignments) * 100);
              const status = getBalanceStatus(item.fairnessScore ?? 0);
              const isExpanded = expandedEmp === item.employeeId;
              const taskEntries = Object.entries(item.taskBreakdown ?? {}).sort((a, b) => b[1] - a[1]);
              return (
                <div key={item.employeeId} className="rounded-lg border overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedEmp(isExpanded ? null : item.employeeId)}
                    className="w-full text-left px-3 py-2 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: groupColor }} />
                        <span className="font-medium truncate">{item.employeeName}</span>
                        {taskEntries.length > 0 && (
                          <span className="text-[10px] text-muted-foreground ml-1">
                            ({taskEntries.length} {taskEntries.length === 1 ? "tarea" : "tareas"})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5 ${status.color} ${status.bgColor}`} title={status.description}>
                          {status.icon}
                          {status.label}
                        </span>
                        <span className="text-muted-foreground tabular-nums font-bold text-xs">
                          {item.totalAssignments}
                        </span>
                        <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 mt-1.5">
                      <div
                        className="rounded-full h-1.5 transition-all"
                        style={{ width: `${pct}%`, backgroundColor: groupColor }}
                      />
                    </div>
                  </button>
                  {isExpanded && taskEntries.length > 0 && (
                    <div className="px-3 py-2 bg-muted/20 border-t space-y-1.5">
                      {taskEntries.map(([taskName, count]) => {
                        const style = taskStyleMap.get(taskName);
                        const taskColor = style?.color ?? getTaskColor(taskName);
                        const taskMax = Math.max(...balanceReport!.map((b) => b.taskBreakdown?.[taskName] ?? 0), 1);
                        const taskPct = Math.min(100, (count / taskMax) * 100);
                        return (
                          <div key={taskName} className="flex items-center gap-2">
                            <TaskIcon taskType={taskName} iconName={style?.icon} color={style?.color} size="xs" showBg={false} />
                            <span className="text-xs font-medium flex-1 truncate" style={{ color: taskColor }}>
                              {taskName}
                            </span>
                            <div className="w-20 bg-muted rounded-full h-1.5">
                              <div
                                className="rounded-full h-1.5"
                                style={{ width: `${taskPct}%`, backgroundColor: taskColor }}
                              />
                            </div>
                            <span className="text-xs tabular-nums font-bold w-6 text-right" style={{ color: taskColor }}>
                              {count}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {isExpanded && taskEntries.length === 0 && (
                    <div className="px-3 py-2 bg-muted/20 border-t text-xs text-muted-foreground text-center">
                      Sin tareas asignadas en el rango
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          {effectiveGroupId ? "Sin datos — genera asignaciones primero" : "Selecciona un grupo para ver balance"}
        </p>
      )}
    </div>
  );
}

/** Sección: Tareas — información por tarea en el rango visible */
function TaskLegendSection({
  taskLegend,
  allRules,
  filteredAssignments,
}: {
  taskLegend: string[];
  allRules: RuleResponse[] | undefined;
  filteredAssignments: AssignmentResponse[];
}) {
  // Build taskName → {color, icon, rule} map
  const taskStyleMap = new Map<string, { color: string | null; icon: string | null; rule?: RuleResponse }>();
  if (allRules) {
    for (const r of allRules) {
      if (!taskStyleMap.has(r.taskLabel)) {
        taskStyleMap.set(r.taskLabel, { color: r.color, icon: r.icon, rule: r });
      }
    }
  }

  // Compute per-task stats from filteredAssignments
  const taskStats = new Map<string, { count: number; employeeIds: Set<string> }>();
  for (const a of filteredAssignments) {
    const entry = taskStats.get(a.taskName) ?? { count: 0, employeeIds: new Set() };
    entry.count += 1;
    entry.employeeIds.add(a.employeeId);
    taskStats.set(a.taskName, entry);
  }

  return (
    <div className="space-y-3">
      {taskLegend.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Sin tareas en el rango actual
        </p>
      ) : (
        <div className="space-y-2">
          {taskLegend.map((task) => {
            const style = taskStyleMap.get(task);
            const stats = taskStats.get(task);
            const count = stats?.count ?? 0;
            const employeeCount = stats?.employeeIds.size ?? 0;
            const rule = style?.rule;
            return (
              <div key={task} className="p-2 rounded-md border space-y-1">
                <div className="flex items-center gap-2">
                  <TaskIcon taskType={task} iconName={style?.icon} color={style?.color} size="md" />
                  <span className="text-sm font-medium flex-1" style={{ color: style?.color ?? getTaskColor(task) }}>
                    {task}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {count} asignaciones
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground grid grid-cols-2 gap-1">
                  <span>• {employeeCount} empleado{employeeCount !== 1 ? "s" : ""}</span>
                  {rule && (
                    <span>
                      • Día {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"][rule.dayOfWeek] ?? rule.dayOfWeek}
                      {rule.frequencyType === "weekly" ? ` (cada ${rule.frequency} sem.)` : ""}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="border-t pt-3 space-y-1.5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Lock className="h-3 w-3" /><span>Histórico (bloqueado, no editable)</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Unlock className="h-3 w-3" /><span>Futuro (editable)</span>
        </div>
      </div>
    </div>
  );
}

/** Sección: Grupos — información en tiempo real */
function GroupsSection({
  groups, allEmployees, allRules, filteredAssignments,
}: {
  groups: GroupResponse[] | undefined;
  allEmployees: EmployeeResponse[] | undefined;
  allRules: RuleResponse[] | undefined;
  filteredAssignments: AssignmentResponse[];
}) {
  const lockedCount = filteredAssignments.filter((a) => a.isLocked).length;
  const unlockedCount = filteredAssignments.length - lockedCount;

  return (
    <div className="space-y-2">
      {groups?.map((g) => {
        const empCount = allEmployees?.filter((e) => e.groupId === g.id && e.isActive).length ?? 0;
        const ruleCount = allRules?.filter((r) => r.groupId === g.id && r.isActive).length ?? 0;
        const groupAssignments = filteredAssignments.filter((a) => a.groupId === g.id);
        const groupLocked = groupAssignments.filter((a) => a.isLocked).length;
        const groupUnlocked = groupAssignments.length - groupLocked;
        return (
          <div key={g.id} className="flex items-center gap-3 p-2 rounded-md border text-sm">
            <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
            <span className="font-medium flex-1">{g.name}</span>
            <span className="text-muted-foreground text-xs">
              <Users className="h-3 w-3 inline mr-1" />
              {empCount} emp. · {ruleCount} reglas
            </span>
            <span className="text-[10px] text-muted-foreground">
              {groupUnlocked} editables · {groupLocked} bloqueadas
            </span>
          </div>
        );
      })}
      <div className="border-t pt-2 text-[11px] text-muted-foreground space-y-1">
        <p>• <strong>{unlockedCount}</strong> asignaciones editables (futuras) en el rango visible.</p>
        <p>• <strong>{lockedCount}</strong> asignaciones bloqueadas (histórico) en el rango visible.</p>
        <p>El color del grupo se usa únicamente en el módulo de Empleados para identificar a qué grupo pertenece cada colaborador.
          En el calendario, los colores que se muestran son los de cada <strong>tarea</strong> (definidos en sus reglas).</p>
      </div>
    </div>
  );
}

/** Sección: Resumen estadístico en tiempo real */
function StatsSection({
  groups, filteredAssignments, availableTaskTypes, allEmployees,
}: {
  groups: GroupResponse[] | undefined;
  filteredAssignments: AssignmentResponse[];
  availableTaskTypes: string[];
  allEmployees: EmployeeResponse[] | undefined;
}) {
  const lockedCount = filteredAssignments.filter((a) => a.isLocked).length;
  const unlockedCount = filteredAssignments.length - lockedCount;

  const totalAssignments = filteredAssignments.length;
  const avgPerEmployee = allEmployees && allEmployees.length > 0
    ? (totalAssignments / allEmployees.length).toFixed(1)
    : "0";

  // Most frequent task
  const taskCounts = new Map<string, number>();
  for (const a of filteredAssignments) {
    taskCounts.set(a.taskName, (taskCounts.get(a.taskName) ?? 0) + 1);
  }
  const topTask = [...taskCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  // Group with most assignments
  const groupCounts = new Map<string, number>();
  for (const a of filteredAssignments) {
    groupCounts.set(a.groupId, (groupCounts.get(a.groupId) ?? 0) + 1);
  }
  const topGroupId = [...groupCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const topGroup = groups?.find((g) => g.id === topGroupId);

  // Employee with most/least assignments (among filtered)
  const empCounts = new Map<string, number>();
  for (const a of filteredAssignments) {
    empCounts.set(a.employeeId, (empCounts.get(a.employeeId) ?? 0) + 1);
  }
  const topEmpId = [...empCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const topEmp = allEmployees?.find((e) => e.id === topEmpId);
  const bottomEmpId = [...empCounts.entries()].sort((a, b) => a[1] - b[1])[0]?.[0];
  const bottomEmp = allEmployees?.find((e) => e.id === bottomEmpId);

  // Date range
  const dates = filteredAssignments.map((a) => new Date(a.date).getTime());
  const minDate = dates.length ? new Date(Math.min(...dates)) : null;
  const maxDate = dates.length ? new Date(Math.max(...dates)) : null;

  const stats = [
    { label: "Asignaciones totales", value: totalAssignments, icon: BarChart3, color: "#0891b2" },
    { label: "Editables (futuro)", value: unlockedCount, icon: Unlock, color: "#00cd98" },
    { label: "Bloqueadas (histórico)", value: lockedCount, icon: Lock, color: "#6b7280" },
    { label: "Promedio por persona", value: avgPerEmployee, icon: Users, color: BRAND.PRIMARY },
    { label: "Tarea más frecuente", value: topTask ? `${topTask[0]} (${topTask[1]})` : "—", icon: Sparkles, color: "#9333ea" },
    { label: "Grupo con más turnos", value: topGroup ? `${topGroup.name} (${groupCounts.get(topGroup.id) ?? 0})` : "—", icon: Building2, color: "#d97706" },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="p-3 rounded-lg border text-center">
              <Icon className="h-4 w-4 mx-auto mb-1" style={{ color: s.color }} />
              <div className="text-lg font-bold">{s.value}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{s.label}</div>
            </div>
          );
        })}
      </div>

      <div className="border-t pt-2 space-y-1 text-[11px] text-muted-foreground">
        {topEmp && (
          <p>• Empleado con más asignaciones: <span className="font-medium">{topEmp.name}</span> ({empCounts.get(topEmp.id) ?? 0})</p>
        )}
        {bottomEmp && (
          <p>• Empleado con menos asignaciones: <span className="font-medium">{bottomEmp.name}</span> ({empCounts.get(bottomEmp.id) ?? 0})</p>
        )}
        {minDate && maxDate && (
          <p>• Rango de fechas: {formatDateShort(minDate.toISOString())} — {formatDateShort(maxDate.toISOString())}</p>
        )}
      </div>
    </div>
  );
}

/** Modal informativo del Dashboard — reemplaza la columna derecha eliminada */
export function DashboardInfoModal({
  open, onOpenChange, groups, balanceData, allEmployees, allRules,
  filteredAssignments, availableTaskTypes, taskLegend, effectiveGroupId,
}: DashboardInfoModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" style={{ color: BRAND.PRIMARY }} />
            Información del Sistema
          </DialogTitle>
          <DialogDescription>
            Motor de equidad, balance, tareas, grupos y resumen estadístico.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="fairness" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="fairness" className="text-xs">Equidad</TabsTrigger>
            <TabsTrigger value="balance" className="text-xs">Balance</TabsTrigger>
            <TabsTrigger value="tasks" className="text-xs">Tareas</TabsTrigger>
            <TabsTrigger value="groups" className="text-xs">Grupos</TabsTrigger>
            <TabsTrigger value="stats" className="text-xs">Resumen</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-3 pr-1">
            <TabsContent value="fairness" className="mt-0">
              <FairnessSection />
            </TabsContent>

            <TabsContent value="balance" className="mt-0">
              <BalanceSection
                balanceData={balanceData}
                allEmployees={allEmployees}
                groups={groups}
                effectiveGroupId={effectiveGroupId}
                allRules={allRules}
              />
            </TabsContent>

            <TabsContent value="tasks" className="mt-0">
              <TaskLegendSection taskLegend={taskLegend} allRules={allRules} filteredAssignments={filteredAssignments} />
            </TabsContent>

            <TabsContent value="groups" className="mt-0">
              <GroupsSection groups={groups} allEmployees={allEmployees} allRules={allRules} filteredAssignments={filteredAssignments} />
            </TabsContent>

            <TabsContent value="stats" className="mt-0">
              <StatsSection
                groups={groups}
                filteredAssignments={filteredAssignments}
                availableTaskTypes={availableTaskTypes}
                allEmployees={allEmployees}
              />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
