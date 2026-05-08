"use client";

import { useState, useMemo, useCallback } from "react";
import {
  useGroups,
  useAssignments,
  useGenerateAssignments,
  useBalanceReport,
  useAutoInitialize,
} from "@/presentation/lib/query/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { TaskIcon, TaskBadge, getTaskColor } from "@/presentation/components/shared/task-icon";
import {
  BarChart3, Lock, Unlock, Sparkles, Play, ChevronLeft, ChevronRight, Loader2,
  Trash2, Coffee, Building2, Users,
} from "lucide-react";
import { toast } from "sonner";

const DAY_NAMES_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

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
  const [selectedGroupId, setSelectedGroupId] = useState<string>("_all");
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

  const calendarDays = useMemo(() => {
    const days = getCalendarDays(viewYear, viewMonth);
    if (!assignments || !groups) return days;

    const dateMap = new Map<string, Array<{
      id: string; taskType: string; employeeName: string;
      groupName: string; groupId: string; isLocked: boolean; groupColor: string;
    }>>();

    for (const a of assignments) {
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
  }, [viewYear, viewMonth, assignments, groups]);

  const taskLegend = useMemo(() => {
    if (!assignments) return [];
    const taskTypes = new Set<string>();
    assignments.forEach((a) => { if (a.taskType) taskTypes.add(a.taskType); });
    return Array.from(taskTypes).sort();
  }, [assignments]);

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

  return (
    <div className="space-y-4">
      {/* Auto-init banner */}
      {isInitializing && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/60 text-sm text-muted-foreground animate-pulse">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{initMessage || "Inicializando..."}</span>
        </div>
      )}

      {/* Toolbar */}
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
                <h2 className="text-lg font-semibold">
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
                          const taskColor = getTaskColor(a.taskType) ?? a.groupColor;
                          return (
                            <div
                              key={a.id}
                              className="text-[10px] leading-tight px-1 py-0.5 rounded flex items-center gap-0.5"
                              style={{
                                backgroundColor: `${taskColor}10`,
                                borderLeft: `3px solid ${taskColor}`,
                              }}
                              title={`${a.taskType} — ${a.employeeName} (${a.groupName})${a.isLocked ? " 🔒" : ""}`}
                            >
                              <TaskIcon taskType={a.taskType} size="xs" showBg={false} />
                              <span className="font-medium truncate" style={{ color: taskColor }}>
                                {a.employeeName}
                              </span>
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
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
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
                    .map((item) => (
                      <div key={item.employeeId} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium truncate">{item.employeeName}</span>
                          <span className="text-muted-foreground tabular-nums">{item.totalAssignments}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5">
                          <div
                            className="bg-primary rounded-full h-1.5 transition-all"
                            style={{ width: `${Math.min(100, (item.totalAssignments / Math.max(...balanceReport.map((b) => b.totalAssignments), 1)) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {effectiveGroupId ? "Sin datos" : "Selecciona un grupo"}
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
              {groups?.map((g) => (
                <div key={g.id} className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
                  <span className="font-medium">{g.name}</span>
                  <span className="text-muted-foreground">— rotación propia</span>
                </div>
              ))}
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
                <span className="text-muted-foreground">Asignaciones</span>
                <span className="font-medium">{assignments?.length ?? 0}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Bloqueadas</span>
                <span className="font-medium">{assignments?.filter((a) => a.isLocked).length ?? 0}</span>
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
              El motor de fairness distribuirá las tareas justamente dentro del grupo seleccionado.
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
