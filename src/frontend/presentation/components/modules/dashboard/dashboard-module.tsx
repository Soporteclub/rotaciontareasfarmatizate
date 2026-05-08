"use client";

import { useState, useMemo, useCallback } from "react";
import {
  useGroups,
  useAssignments,
  useGenerateAssignments,
  useBalanceReport,
  useAutoInitialize,
  useRules,
  useEmployees,
} from "@/frontend/presentation/lib/query/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TaskIcon, TaskBadge, getTaskColor } from "@/frontend/presentation/components/shared/task-icon";
import {
  BarChart3, Lock, Unlock, Sparkles, Play, ChevronLeft, ChevronRight, Loader2,
  Trash2, Coffee, Building2, Users, Search, Filter, X, Info,
  CalendarHeart, Scale,
} from "lucide-react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const DAY_NAMES_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// ─── Color System ──────────────────────────────────────────────
// Each assignment gets a color derived from its GROUP (primary) with a 
// task-type-specific shade variation for visual distinction.
// Group color = which floor, Task icon = which task

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

// Generate a shade variant based on task type for additional distinction
function getEventColor(groupColor: string, taskType: string): string {
  const taskColors: Record<string, string> = {
    "Sacar Basura": "#ea580c",   // orange
    "Lavar Cafetera": "#0d9488", // teal
    "Aseo General": "#16a34a",   // emerald
  };
  const taskColor = taskColors[taskType];
  if (!taskColor) return groupColor;

  // Blend: 60% group color + 40% task color for a unique combination
  const g = hexToRgb(groupColor);
  const t = hexToRgb(taskColor);
  const r = Math.round(g.r * 0.6 + t.r * 0.4);
  const gr = Math.round(g.g * 0.6 + t.g * 0.4);
  const b = Math.round(g.b * 0.6 + t.b * 0.4);
  return `#${r.toString(16).padStart(2, "0")}${gr.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

// Lighter version for background
function getEventBgColor(groupColor: string, taskType: string): string {
  const color = getEventColor(groupColor, taskType);
  const rgb = hexToRgb(color);
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.10)`;
}

interface CalendarDay {
  date: Date;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  assignments: Array<{
    id: string;
    taskType: string;
    employeeName: string;
    groupName: string;
    groupId: string;
    isLocked: boolean;
    groupColor: string;
  }>;
}

function getCalendarDays(year: number, month: number): CalendarDay[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days: CalendarDay[] = [];

  for (let i = startPad - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push({
      date: d, dayOfMonth: d.getDate(), isCurrentMonth: false,
      isToday: d.getTime() === today.getTime(),
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
      assignments: [],
    });
  }

  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(year, month, d);
    days.push({
      date, dayOfMonth: d, isCurrentMonth: true,
      isToday: date.getTime() === today.getTime(),
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      assignments: [],
    });
  }

  const remaining = 42 - days.length;
  for (let d = 1; d <= remaining; d++) {
    const date = new Date(year, month + 1, d);
    days.push({
      date, dayOfMonth: d, isCurrentMonth: false,
      isToday: false,
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      assignments: [],
    });
  }

  return days;
}

export function DashboardModule() {
  const { isInitializing, message: initMessage } = useAutoInitialize();

  const { data: groups, isLoading: loadingGroups } = useGroups();
  const { data: allEmployees } = useEmployees(undefined, true);
  const { data: allRules } = useRules(undefined, true);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("_all");
  const [selectedTaskType, setSelectedTaskType] = useState<string>("_all");
  const [searchName, setSearchName] = useState("");
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [generateRange, setGenerateRange] = useState({ startDate: "", endDate: "" });
  const [generateGroupId, setGenerateGroupId] = useState<string>("");
  const generateAssignments = useGenerateAssignments();

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const calendarDates = useMemo(() => {
    const start = new Date(viewYear, viewMonth - 1, 1);
    const end = new Date(viewYear, viewMonth + 2, 0);
    return {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    };
  }, [viewYear, viewMonth]);

  const effectiveGroupId = selectedGroupId && selectedGroupId !== "_all" ? selectedGroupId : undefined;
  const { data: assignments, isLoading: loadingAssignments } = useAssignments(
    effectiveGroupId,
    calendarDates.startDate,
    calendarDates.endDate
  );

  const { data: balanceReport } = useBalanceReport(effectiveGroupId);

  // ─── Filters ──────────────────────────────────────────────────
  const availableTaskTypes = useMemo(() => {
    if (!assignments) return [];
    const types = new Set<string>();
    assignments.forEach((a) => { if (a.taskType) types.add(a.taskType); });
    return Array.from(types).sort();
  }, [assignments]);

  const hasActiveFilters = selectedGroupId !== "_all" || selectedTaskType !== "_all" || searchName.trim() !== "";

  const clearFilters = useCallback(() => {
    setSelectedGroupId("_all");
    setSelectedTaskType("_all");
    setSearchName("");
  }, []);

  // Apply all filters to assignments
  const filteredAssignments = useMemo(() => {
    if (!assignments) return [];
    let filtered = assignments;

    // Filter by task type
    if (selectedTaskType && selectedTaskType !== "_all") {
      filtered = filtered.filter((a) => a.taskType === selectedTaskType);
    }

    // Filter by employee name search
    if (searchName.trim()) {
      const q = searchName.toLowerCase().trim();
      filtered = filtered.filter((a) => {
        const empName = a.employee?.name?.toLowerCase() ?? "";
        return empName.includes(q);
      });
    }

    return filtered;
  }, [assignments, selectedTaskType, searchName]);

  const calendarDays = useMemo(() => {
    const days = getCalendarDays(viewYear, viewMonth);
    if (!filteredAssignments || !groups) return days;

    const dateMap = new Map<string, Array<{
      id: string; taskType: string; employeeName: string;
      groupName: string; groupId: string; isLocked: boolean; groupColor: string;
    }>>();

    for (const a of filteredAssignments) {
      const dateKey = new Date(a.date).toISOString().split("T")[0];
      if (!dateMap.has(dateKey)) dateMap.set(dateKey, []);
      const group = groups.find((g) => g.id === a.groupId);
      dateMap.get(dateKey)!.push({
        id: a.id, taskType: a.taskType ?? "",
        employeeName: a.employee?.name ?? "",
        groupName: group?.name ?? "", groupId: a.groupId,
        isLocked: a.isLocked, groupColor: group?.color ?? "#6b7280",
      });
    }

    for (const day of days) {
      const key = day.date.toISOString().split("T")[0];
      day.assignments = dateMap.get(key) ?? [];
    }

    return days;
  }, [viewYear, viewMonth, filteredAssignments, groups]);

  const taskLegend = useMemo(() => {
    if (!filteredAssignments) return [];
    const taskTypes = new Set<string>();
    filteredAssignments.forEach((a) => { if (a.taskType) taskTypes.add(a.taskType); });
    return Array.from(taskTypes).sort();
  }, [filteredAssignments]);

  const handleGenerate = async () => {
    if (!generateGroupId || !generateRange.startDate || !generateRange.endDate) {
      toast.error("Completa todos los campos");
      return;
    }
    try {
      const result = await generateAssignments.mutateAsync({
        groupId: generateGroupId,
        startDate: generateRange.startDate,
        endDate: generateRange.endDate,
      });
      toast.success(`Se generaron ${result.assignments.length} asignaciones`);
      setGenerateDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al generar");
    }
  };

  const openGenerateDialog = useCallback((groupId: string) => {
    if (!groupId || groupId === "_all") {
      toast.error("Selecciona un grupo específico");
      return;
    }
    setGenerateGroupId(groupId);
    const n = new Date();
    const start = new Date(n.getFullYear(), n.getMonth(), 1);
    const end = new Date(n.getFullYear(), n.getMonth() + 3, 0);
    setGenerateRange({
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    });
    setGenerateDialogOpen(true);
  }, []);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };
  const goToday = () => { setViewYear(now.getFullYear()); setViewMonth(now.getMonth()); };

  const isLoading = isInitializing || loadingGroups || loadingAssignments;

  // ─── Fairness explanation for the info tooltip
  const fairnessInfo = (
    <div className="space-y-2 text-xs max-w-xs">
      <p className="font-semibold">Cómo funciona la asignación justa:</p>
      <ol className="list-decimal pl-4 space-y-1">
        <li>Cada <strong>piso/grupo</strong> rota de forma <strong>independiente</strong> con su propio personal.</li>
        <li>El motor evalúa cada empleado con un puntaje de equidad basado en:
          <ul className="list-disc pl-4 mt-0.5 space-y-0.5">
            <li>Balance total de asignaciones</li>
            <li>Balance mensual</li>
            <li>Enfriamiento (días desde última tarea)</li>
            <li>Penalización por consecutivas</li>
            <li>Penalización por doble tarea el mismo día</li>
          </ul>
        </li>
        <li>El empleado con <strong>mayor puntaje</strong> (más &quot;merecido&quot;) es asignado.</li>
        <li>Asignaciones pasadas están <strong>bloqueadas</strong> y no se modifican.</li>
      </ol>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Auto-init banner */}
      {isInitializing && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/60 text-sm text-muted-foreground animate-pulse">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{initMessage || "Inicializando..."}</span>
        </div>
      )}

      {/* Toolbar with Filters */}
      <div className="space-y-3">
        {/* Row 1: Group filter + Generate buttons */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Todos los grupos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">
                  <div className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5" />
                    Todos los grupos
                  </div>
                </SelectItem>
                {groups?.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: g.color }} />
                      {g.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Fairness info tooltip */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-sm">
                  {fairnessInfo}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center gap-2">
            {groups && groups.length > 0 && groups.map((g) => (
              <button
                key={g.id}
                onClick={() => openGenerateDialog(g.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border hover:shadow-sm transition-shadow"
                style={{ borderColor: g.color, color: g.color }}
              >
                <Play className="h-3 w-3" />
                Generar {g.name}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Advanced filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder="Buscar por nombre..."
              className="pl-8 h-8 text-sm"
            />
            {searchName && (
              <button
                onClick={() => setSearchName("")}
                className="absolute right-2 top-1/2 -translate-y-1/2"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>

          <Select value={selectedTaskType} onValueChange={setSelectedTaskType}>
            <SelectTrigger className="w-48 h-8 text-sm">
              <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Todas las tareas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todas las tareas</SelectItem>
              {availableTaskTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  <div className="flex items-center gap-2">
                    <TaskIcon taskType={t} size="xs" showBg={false} />
                    {t}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={clearFilters}>
              <X className="h-3 w-3 mr-1" />
              Limpiar filtros
            </Button>
          )}

          {filteredAssignments && (
            <span className="text-xs text-muted-foreground ml-auto">
              {filteredAssignments.length} asignación{filteredAssignments.length !== 1 ? "es" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Calendar + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Calendar */}
        <div className="lg:col-span-4">
          <Card>
            <CardContent className="p-4">
              {/* Month navigation */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={prevMonth} className="h-8 w-8">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={goToday}>
                    Hoy
                  </Button>
                  <Button variant="outline" size="icon" onClick={nextMonth} className="h-8 w-8">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <CalendarHeart className="h-5 w-5 text-primary" />
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </h2>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 gap-px bg-border rounded-t-lg overflow-hidden">
                {DAY_NAMES_SHORT.map((d, i) => (
                  <div
                    key={d}
                    className={`text-center text-xs font-medium py-2 ${i === 0 || i === 6 ? "bg-muted text-muted-foreground" : "bg-card"}`}
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              {isLoading ? (
                <div className="flex items-center justify-center h-96">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-px bg-border rounded-b-lg overflow-hidden">
                  {calendarDays.map((day, i) => (
                    <div
                      key={i}
                      className={`min-h-[90px] sm:min-h-[110px] p-1 transition-colors ${
                        day.isCurrentMonth ? "bg-card" : "bg-muted/30"
                      } ${day.isToday ? "ring-2 ring-primary ring-inset" : ""}`}
                    >
                      <div className={`text-xs font-medium mb-1 ${
                        day.isToday ? "text-primary" : day.isCurrentMonth ? "text-foreground" : "text-muted-foreground"
                      }`}>
                        {day.dayOfMonth}
                      </div>
                      <div className="space-y-0.5">
                        {day.assignments.slice(0, 3).map((a) => {
                          const eventColor = getEventColor(a.groupColor, a.taskType);
                          const eventBg = getEventBgColor(a.groupColor, a.taskType);
                          return (
                            <div
                              key={a.id}
                              className="text-[10px] leading-tight px-1 py-0.5 rounded flex items-center gap-0.5"
                              style={{
                                backgroundColor: eventBg,
                                borderLeft: `3px solid ${eventColor}`,
                              }}
                              title={`${a.taskType} — ${a.employeeName} (${a.groupName})${a.isLocked ? " 🔒" : ""}`}
                            >
                              <TaskIcon taskType={a.taskType} size="xs" showBg={false} />
                              <span className="font-medium truncate" style={{ color: eventColor }}>
                                {a.employeeName}
                              </span>
                              {a.isLocked && <Lock className="h-2 w-2 ml-auto shrink-0 opacity-50" />}
                            </div>
                          );
                        })}
                        {day.assignments.length > 3 && (
                          <div className="text-[10px] text-muted-foreground text-center">
                            +{day.assignments.length - 3} más
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Color legend below calendar */}
              <div className="mt-3 flex items-center gap-4 flex-wrap text-xs">
                {groups?.map((g) => (
                  <div key={g.id} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color }} />
                    <span className="font-medium">{g.name}</span>
                  </div>
                ))}
                <div className="border-l pl-4 flex items-center gap-3">
                  {availableTaskTypes.map((t) => (
                    <div key={t} className="flex items-center gap-1">
                      <TaskIcon taskType={t} size="xs" showBg={false} />
                      <span className="text-muted-foreground">{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Fairness Engine Explanation */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Scale className="h-4 w-4 text-primary" />
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
                  <span className="font-medium text-emerald-600">+ Balance</span>
                  <span>Menos tareas = más puntaje</span>
                  <span className="font-medium text-emerald-600">+ Mensual</span>
                  <span>Equilibrio por mes</span>
                  <span className="font-medium text-red-500">− Enfriamiento</span>
                  <span>Penaliza si fue reciente</span>
                  <span className="font-medium text-red-500">− Consecutivas</span>
                  <span>Penaliza rachas</span>
                  <span className="font-medium text-red-500">− Mismo día</span>
                  <span>Evita doble tarea</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Balance */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Balance
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {balanceReport && balanceReport.length > 0 ? (
                <div className="space-y-2.5 max-h-72 overflow-y-auto">
                  {balanceReport
                    .sort((a, b) => b.totalAssignments - a.totalAssignments)
                    .map((item) => {
                      const emp = allEmployees?.find((e) => e.id === item.employeeId);
                      const groupColor = groups?.find((g) => g.id === emp?.groupId)?.color ?? "#6b7280";
                      return (
                        <div key={item.employeeId} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <div
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: groupColor }}
                              />
                              <span className="font-medium truncate">{item.employeeName}</span>
                            </div>
                            <span className="text-muted-foreground tabular-nums shrink-0 ml-2">
                              {item.totalAssignments}
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-1.5">
                            <div
                              className="rounded-full h-1.5 transition-all"
                              style={{
                                width: `${Math.min(100, (item.totalAssignments / Math.max(...balanceReport.map((b) => b.totalAssignments), 1)) * 100)}%`,
                                backgroundColor: groupColor,
                              }}
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

          {/* Task Legend with detailed icons */}
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

          {/* Groups — each floor is independent */}
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

          {/* Stats */}
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
                <span className="font-medium">{filteredAssignments?.length ?? 0}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Bloqueadas</span>
                <span className="font-medium">{filteredAssignments?.filter((a) => a.isLocked).length ?? 0}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Tipos de tarea</span>
                <span className="font-medium">{availableTaskTypes.length}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Generate Dialog */}
      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Generar Asignaciones
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              El motor de equidad distribuirá las tareas justamente dentro del grupo seleccionado.
              Las asignaciones pasadas <strong>NO</strong> se modificarán.
            </p>
            <div className="space-y-2">
              <Label>Grupo</Label>
              <Select value={generateGroupId} onValueChange={setGenerateGroupId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar grupo" /></SelectTrigger>
                <SelectContent>
                  {groups?.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: g.color }} />
                        {g.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Desde</Label>
                <input type="date" className="w-full px-3 py-2 border rounded-md text-sm bg-background"
                  value={generateRange.startDate}
                  onChange={(e) => setGenerateRange((r) => ({ ...r, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Hasta</Label>
                <input type="date" className="w-full px-3 py-2 border rounded-md text-sm bg-background"
                  value={generateRange.endDate}
                  onChange={(e) => setGenerateRange((r) => ({ ...r, endDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted p-3 rounded-lg">
              <Lock className="h-4 w-4 shrink-0" />
              <span>Cada grupo rota de forma independiente. Las asignaciones pasadas están bloqueadas.</span>
            </div>
            <Button onClick={handleGenerate} className="w-full" disabled={generateAssignments.isPending || !generateGroupId}>
              {generateAssignments.isPending ? "Generando..." : "Generar Asignaciones"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
