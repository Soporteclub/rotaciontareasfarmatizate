"use client";

import { useState, useMemo } from "react";
import {
  useGroups,
  useAssignments,
  useGenerateAssignments,
  useBalanceReport,
} from "@/frontend/presentation/lib/query/hooks";
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
import { CalendarDays, Play, BarChart3, Lock, Unlock } from "lucide-react";
import { toast } from "sonner";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { TASK_TYPES } from "@/backend/domain/entities/types";

export function CalendarModule() {
  const { data: groups, isLoading: loadingGroups } = useGroups();
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [generateRange, setGenerateRange] = useState({ startDate: "", endDate: "" });
  const generateAssignments = useGenerateAssignments();

  // Date range for calendar view (current month ± 1 month)
  const [calendarDates, setCalendarDates] = useState(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    return {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    };
  });

  const { data: assignments, isLoading: loadingAssignments } = useAssignments(
    selectedGroupId || undefined,
    calendarDates.startDate,
    calendarDates.endDate
  );

  const { data: balanceReport } = useBalanceReport(selectedGroupId || undefined);

  // Transform assignments for FullCalendar
  const calendarEvents = useMemo(() => {
    if (!assignments || !groups) return [];
    return assignments.map((a) => {
      const group = groups.find((g) => g.id === a.groupId);
      const emp = a.employee;
      return {
        id: a.id,
        title: emp ? `${emp.name}${a.taskType ? ` - ${a.taskType}` : ""}` : "Sin asignar",
        start: new Date(a.date).toISOString().split("T")[0],
        backgroundColor: a.isLocked ? group?.color ?? "#6b7280" : `${group?.color ?? "#6b7280"}88`,
        borderColor: group?.color ?? "#6b7280",
        extendedProps: {
          employeeId: a.employeeId,
          groupId: a.groupId,
          isLocked: a.isLocked,
          taskType: a.taskType,
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

  const handleDateClick = (info: { dateStr: string }) => {
    setGenerateRange((prev) => ({
      ...prev,
      startDate: prev.startDate || info.dateStr,
      endDate: prev.startDate ? info.dateStr : prev.endDate,
    }));
  };

  const isLoading = loadingGroups || loadingAssignments;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Calendario</h1>
        <div className="animate-pulse h-96 bg-muted rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Calendario</h1>
          <p className="text-muted-foreground">Visualiza y genera asignaciones</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Seleccionar grupo" />
            </SelectTrigger>
            <SelectContent>
              {groups?.map((g) => (
                <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => {
              if (!selectedGroupId) {
                toast.error("Selecciona un grupo primero");
                return;
              }
              // Default: generate for next 3 months
              const now = new Date();
              const start = new Date(now.getFullYear(), now.getMonth(), 1);
              const end = new Date(now.getFullYear(), now.getMonth() + 3, 0);
              setGenerateRange({
                startDate: start.toISOString().split("T")[0],
                endDate: end.toISOString().split("T")[0],
              });
              setGenerateDialogOpen(true);
            }}
            className="flex items-center gap-2"
            disabled={!selectedGroupId}
          >
            <Play className="h-4 w-4" />
            Generar
          </Button>
        </div>
      </div>

      {/* Calendar + Balance side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-4">
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
                dateClick={handleDateClick}
                eventDisplay="block"
                dayMaxEvents={3}
                editable={false}
                selectable={false}
              />
            </CardContent>
          </Card>
        </div>

        {/* Balance sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Balance de Fairness
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {balanceReport && balanceReport.length > 0 ? (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {balanceReport
                    .sort((a, b) => b.totalAssignments - a.totalAssignments)
                    .map((item) => (
                      <div key={item.employeeId} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium truncate">{item.employeeName}</span>
                          <span className="text-muted-foreground">{item.totalAssignments}</span>
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
                <p className="text-sm text-muted-foreground">
                  {selectedGroupId ? "Sin datos aún" : "Selecciona un grupo"}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Legend */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Leyenda</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Bloqueado (histórico)</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Unlock className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Desbloqueado (futuro)</span>
              </div>
              {groups?.map((g) => (
                <div key={g.id} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color }} />
                  <span>{g.name}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Generate Dialog */}
      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generar Asignaciones</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Se generarán asignaciones justas usando el motor de fairness.
              Las asignaciones pasadas NO se modificarán.
            </p>
            <div className="space-y-2">
              <Label>Fecha Inicio</Label>
              <input
                type="date"
                className="w-full px-3 py-2 border rounded-md text-sm"
                value={generateRange.startDate}
                onChange={(e) => setGenerateRange((r) => ({ ...r, startDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha Fin</Label>
              <input
                type="date"
                className="w-full px-3 py-2 border rounded-md text-sm"
                value={generateRange.endDate}
                onChange={(e) => setGenerateRange((r) => ({ ...r, endDate: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted p-3 rounded-lg">
              <Lock className="h-4 w-4" />
              <span>Las asignaciones históricas (pasadas) están bloqueadas y no se modificarán.</span>
            </div>
            <Button
              onClick={handleGenerate}
              className="w-full"
              disabled={generateAssignments.isPending}
            >
              {generateAssignments.isPending ? "Generando..." : "Generar Asignaciones"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
