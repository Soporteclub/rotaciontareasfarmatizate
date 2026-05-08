"use client";

import { useState, useMemo, useCallback } from "react";
import {
  useGroups,
  useAssignments,
  useGenerateAssignments,
  useBalanceReport,
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
import { CalendarDays, Play, BarChart3, Lock, Unlock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";

export function DashboardModule() {
  const { data: groups, isLoading: loadingGroups } = useGroups();
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [generateRange, setGenerateRange] = useState({ startDate: "", endDate: "" });
  const generateAssignments = useGenerateAssignments();

  // Date range: current month ± 2 months
  const [calendarDates] = useState(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 4, 0);
    return {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    };
  });

  // Fetch ALL assignments (no groupId = all groups, _all = all groups)
  const effectiveGroupId = selectedGroupId && selectedGroupId !== "_all" ? selectedGroupId : undefined;
  const { data: assignments, isLoading: loadingAssignments } = useAssignments(
    effectiveGroupId,
    calendarDates.startDate,
    calendarDates.endDate
  );

  const { data: balanceReport } = useBalanceReport(effectiveGroupId);

  // Transform for FullCalendar
  const calendarEvents = useMemo(() => {
    if (!assignments || !groups) return [];
    return assignments.map((a) => {
      const group = groups.find((g) => g.id === a.groupId);
      const emp = a.employee;
      const groupName = group?.name ?? "";
      return {
        id: a.id,
        title: emp ? `${emp.name} (${groupName})` : "Sin asignar",
        start: new Date(a.date).toISOString().split("T")[0],
        backgroundColor: group?.color ?? "#6b7280",
        borderColor: group?.color ?? "#6b7280",
        textColor: "#ffffff",
        extendedProps: {
          employeeId: a.employeeId,
          groupId: a.groupId,
          isLocked: a.isLocked,
          taskType: a.taskType,
          groupName,
        },
      };
    });
  }, [assignments, groups]);

  const handleGenerate = async () => {
    if (!selectedGroupId || !generateRange.startDate || !generateRange.endDate) {
      toast.error("Completa todos los campos");
      return;
    }
    try {
      const result = await generateAssignments.mutateAsync({
        groupId: selectedGroupId,
        startDate: generateRange.startDate,
        endDate: generateRange.endDate,
      });
      toast.success(`Se generaron ${result.assignments.length} asignaciones`);
      setGenerateDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al generar");
    }
  };

  const openGenerateDialog = useCallback((groupId?: string) => {
    const gid = groupId || (selectedGroupId !== "_all" ? selectedGroupId : "");
    if (!gid) {
      toast.error("Selecciona un grupo primero");
      return;
    }
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 3, 0);
    setGenerateRange({
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    });
    if (groupId && groupId !== selectedGroupId) setSelectedGroupId(groupId);
    setGenerateDialogOpen(true);
  }, [selectedGroupId]);

  const renderEventContent = useCallback((eventInfo: { event: { extendedProps: { isLocked: boolean; taskType: string | null; groupName: string }; title: string } }) => {
    const isLocked = eventInfo.event.extendedProps.isLocked;
    return (
      <div className="flex items-center gap-1 px-1 py-0.5 text-[11px] leading-tight overflow-hidden">
        {isLocked && <Lock className="h-2.5 w-2.5 shrink-0 opacity-60" />}
        <span className="truncate">{eventInfo.event.title}</span>
      </div>
    );
  }, []);

  const isLoading = loadingGroups || loadingAssignments;

  return (
    <div className="space-y-4">
      {/* Top toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Todos los grupos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todos los grupos</SelectItem>
              {groups?.map((g) => (
                <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {balanceReport && balanceReport.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              <BarChart3 className="h-3 w-3" />
              {balanceReport.length} empleados
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {groups && groups.length > 0 && groups.map((g) => (
            <button
              key={g.id}
              onClick={() => openGenerateDialog(g.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border hover:shadow-sm transition-shadow"
              style={{ borderColor: g.color, color: g.color }}
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: g.color }} />
              Generar {g.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main layout: Calendar + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Calendar */}
        <div className="lg:col-span-4">
          {isLoading ? (
            <Card>
              <CardContent className="p-8">
                <div className="animate-pulse h-[500px] bg-muted rounded-lg" />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-2 sm:p-4">
                <FullCalendar
                  plugins={[dayGridPlugin, interactionPlugin]}
                  initialView="dayGridMonth"
                  events={calendarEvents}
                  headerToolbar={{
                    left: "prev,next today",
                    center: "title",
                    right: "dayGridMonth,dayGridWeek",
                  }}
                  height="auto"
                  locale="es"
                  buttonText={{
                    today: "Hoy",
                    month: "Mes",
                    week: "Semana",
                  }}
                  eventContent={renderEventContent}
                  eventDisplay="block"
                  dayMaxEvents={4}
                  editable={false}
                  selectable={false}
                  firstDay={1}
                  weekends={false}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right sidebar: Balance + Legend + Stats */}
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
                            style={{
                              width: `${Math.min(100, (item.totalAssignments / Math.max(...balanceReport.map((b) => b.totalAssignments), 1)) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {selectedGroupId && selectedGroupId !== "_all" ? "Sin datos" : "Selecciona un grupo"}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Legend */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Leyenda</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-1.5">
              {groups?.map((g) => (
                <div key={g.id} className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
                  <span className="truncate">{g.name}</span>
                </div>
              ))}
              <div className="border-t border-border pt-1.5 mt-1.5 space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  <span>Histórico (bloqueado)</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Unlock className="h-3 w-3" />
                  <span>Futuro (editable)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick stats */}
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
              El motor de fairness distribuirá las tareas justamente entre los empleados.
              Las asignaciones pasadas <strong>NO</strong> se modificarán.
            </p>
            <div className="space-y-2">
              <Label>Grupo</Label>
              <Select
                value={selectedGroupId}
                onValueChange={setSelectedGroupId}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {groups?.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Desde</Label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  value={generateRange.startDate}
                  onChange={(e) => setGenerateRange((r) => ({ ...r, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Hasta</Label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  value={generateRange.endDate}
                  onChange={(e) => setGenerateRange((r) => ({ ...r, endDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted p-3 rounded-lg">
              <Lock className="h-4 w-4 shrink-0" />
              <span>Las asignaciones pasadas están bloqueadas y nunca se modificarán.</span>
            </div>
            <Button
              onClick={handleGenerate}
              className="w-full"
              disabled={generateAssignments.isPending || !selectedGroupId}
            >
              {generateAssignments.isPending ? "Generando..." : "Generar Asignaciones"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
