"use client";

import { useState, useMemo } from "react";
import {
  useGroups,
  useAssignments,
  useDeleteAssignments,
  useBalanceReport,
} from "@/frontend/presentation/lib/query/hooks";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, BarChart3, Lock, Unlock, Calendar, TrendingUp, Users, Filter, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { BRAND } from "@/frontend/presentation/lib/brand";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { AdminOnly } from "@/frontend/presentation/components/shared/admin-guard";
import { ConfirmDialog } from "@/frontend/presentation/components/shared/confirm-dialog";


/** Format a date string "2026-05-13" to "13 May 2026" */
function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function CalendarModule() {
  const { data: groups, isLoading: loadingGroups } = useGroups();
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const deleteAssignments = useDeleteAssignments();

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Balance date range filter — defaults to current month
  const [balanceDateRange, setBalanceDateRange] = useState(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    };
  });

  // Date range for calendar view — updates dynamically when navigating
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

  // Update fetch range when calendar navigates to a different date range
  const handleDatesSet = (info: { start: Date; end: Date }) => {
    // Add padding of ±7 days to ensure surrounding events are visible
    const paddedStart = new Date(info.start);
    paddedStart.setDate(paddedStart.getDate() - 7);
    const paddedEnd = new Date(info.end);
    paddedEnd.setDate(paddedEnd.getDate() + 7);
    setCalendarDates({
      startDate: paddedStart.toISOString().split("T")[0],
      endDate: paddedEnd.toISOString().split("T")[0],
    });
  };

  const { data: balanceReport } = useBalanceReport(
    selectedGroupId || undefined,
    balanceDateRange.startDate,
    balanceDateRange.endDate
  );

  // Transform assignments for FullCalendar
  const calendarEvents = useMemo(() => {
    if (!assignments || !groups) return [];
    return assignments.map((a) => {
      const group = groups.find((g) => g.id === a.groupId);
      const emp = a.employee;
      return {
        id: a.id,
        title: emp ? `${emp.name}${a.taskName ? ` - ${a.taskName}` : ""}` : "Sin asignar",
        start: typeof a.date === "string" ? a.date.split("T")[0] : new Date(a.date).toISOString().split("T")[0],
        backgroundColor: a.isLocked ? group?.color ?? "#6b7280" : `${group?.color ?? "#6b7280"}88`,
        borderColor: group?.color ?? "#6b7280",
        extendedProps: {
          employeeId: a.employeeId,
          groupId: a.groupId,
          isLocked: a.isLocked,
          taskType: a.taskName,
        },
      };
    });
  }, [assignments, groups]);

  const handleDeleteGroup = () => {
    if (!selectedGroupId) {
      toast.error("Selecciona un grupo primero");
      return;
    }
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteGroup = async () => {
    if (!selectedGroupId) return;
    const group = groups?.find((g) => g.id === selectedGroupId);
    try {
      const result = await deleteAssignments.mutateAsync({ groupId: selectedGroupId });
      toast.success(`Se eliminaron ${result.deletedCount} asignaciones de ${group?.name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setDeleteConfirmOpen(false);
    }
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
      {/* ─── FullCalendar legibility overrides ─── */}
      <style>{`
        /* ── Base calendar typography ── */
        .fc {
          font-size: 14px;
        }

        /* ── Toolbar (nav buttons, title) ── */
        .fc .fc-toolbar-title {
          font-size: 1.25rem !important;
          font-weight: 700;
        }
        .fc .fc-button {
          font-size: 0.8125rem !important;
          padding: 0.375rem 0.75rem !important;
        }

        /* ── Column headers (Mon, Tue, …) ── */
        .fc .fc-col-header-cell-cushion {
          font-size: 0.8125rem !important;
          font-weight: 600;
          padding: 6px 0 !important;
        }

        /* ── Day number in month cells ── */
        .fc .fc-daygrid-day-number {
          font-size: 0.8125rem !important;
          font-weight: 500;
          padding: 4px 8px !important;
        }

        /* ── Events in MONTH view ── */
        .fc .fc-daygrid-event {
          font-size: 12px !important;
          line-height: 1.4 !important;
          padding: 2px 6px !important;
          border-radius: 4px !important;
          margin: 1px 2px !important;
        }
        .fc .fc-daygrid-event .fc-event-title {
          font-size: 12px !important;
          font-weight: 500;
        }
        .fc .fc-daygrid-event .fc-event-time {
          font-size: 11px !important;
          font-weight: 600;
        }

        /* ── Ensure high contrast for event text ── */
        .fc .fc-event {
          color: #fff !important;
          text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        }

        /* ── "more" link ── */
        .fc .fc-daygrid-more-link {
          font-size: 12px !important;
          font-weight: 600;
        }

        /* ── Events in WEEK / DAY view ── */
        .fc .fc-timegrid-event {
          font-size: 12px !important;
          line-height: 1.4 !important;
          padding: 2px 4px !important;
          border-radius: 4px !important;
        }
        .fc .fc-timegrid-event .fc-event-main {
          padding: 2px 4px !important;
        }
        .fc .fc-timegrid-event .fc-event-title {
          font-size: 12px !important;
          font-weight: 500;
        }
        .fc .fc-timegrid-event .fc-event-time {
          font-size: 11px !important;
          font-weight: 600;
        }

        /* ── Time axis labels (week/day view) ── */
        .fc .fc-timegrid-slot-label-cushion {
          font-size: 12px !important;
        }

        /* ── Today highlight ── */
        .fc .fc-day-today {
          background: rgba(59, 130, 246, 0.06) !important;
        }

        /* ── Grid lines ── */
        .fc td, .fc th {
          border-color: var(--border) !important;
        }
        .fc .fc-scrollgrid {
          border-color: var(--border) !important;
        }

        /* ── Mobile responsiveness ── */
        @media (max-width: 640px) {
          .fc {
            font-size: 12px;
          }
          .fc .fc-toolbar-title {
            font-size: 1rem !important;
          }
          .fc .fc-button {
            font-size: 0.75rem !important;
            padding: 0.25rem 0.5rem !important;
          }
          .fc .fc-col-header-cell-cushion {
            font-size: 0.6875rem !important;
            padding: 4px 0 !important;
          }
          .fc .fc-daygrid-day-number {
            font-size: 0.6875rem !important;
            padding: 2px 4px !important;
          }
          .fc .fc-daygrid-event {
            font-size: 10px !important;
            padding: 1px 4px !important;
          }
          .fc .fc-daygrid-event .fc-event-title {
            font-size: 10px !important;
          }
          .fc .fc-timegrid-event {
            font-size: 10px !important;
          }
          .fc .fc-timegrid-event .fc-event-title {
            font-size: 10px !important;
          }
          /* Stack toolbar on small screens */
          .fc .fc-toolbar {
            flex-direction: column;
            gap: 0.5rem;
          }
          .fc .fc-toolbar-chunk {
            display: flex;
            justify-content: center;
          }
        }
      `}</style>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Calendario</h1>
          <p className="text-muted-foreground">Visualiza y elimina asignaciones</p>
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
          <AdminOnly>
            <Button
              onClick={handleDeleteGroup}
              variant="outline"
              className="flex items-center gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
              disabled={!selectedGroupId || deleteAssignments.isPending}
            >
              {deleteAssignments.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Eliminar
            </Button>
          </AdminOnly>
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
                  left: "prev,next",
                  center: "title",
                  right: "dayGridDay,dayGridWeek,dayGridMonth",
                }}
                height="auto"
                locale="es"
                buttonText={{
                  day: "Día",
                  week: "Semana",
                  month: "Mes",
                }}
                datesSet={handleDatesSet}
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
              {/* Date range display */}
              {balanceReport?.report && balanceReport.report.length > 0 && (
                <CardDescription className="text-xs flex items-center gap-1.5 mt-1">
                  <Calendar className="h-3 w-3" />
                  {formatDateShort(balanceReport.dateRange.from)} — {formatDateShort(balanceReport.dateRange.to)}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {/* Date range filter inputs */}
              {selectedGroupId && (
                <div className="mb-3 pb-3 border-b space-y-2">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Filter className="h-3 w-3" />
                    <span className="text-[10px] font-medium uppercase tracking-wide">Filtro de fechas</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Desde</Label>
                      <input
                        type="date"
                        className="w-full px-2 py-1 border rounded text-xs bg-background"
                        value={balanceDateRange.startDate}
                        onChange={(e) =>
                          setBalanceDateRange((r) => ({ ...r, startDate: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Hasta</Label>
                      <input
                        type="date"
                        className="w-full px-2 py-1 border rounded text-xs bg-background"
                        value={balanceDateRange.endDate}
                        onChange={(e) =>
                          setBalanceDateRange((r) => ({ ...r, endDate: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  {/* Quick range buttons */}
                  <div className="flex gap-1 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] px-2"
                      onClick={() => {
                        const now = new Date();
                        const start = new Date(now.getFullYear(), now.getMonth(), 1);
                        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                        setBalanceDateRange({
                          startDate: start.toISOString().split("T")[0],
                          endDate: end.toISOString().split("T")[0],
                        });
                      }}
                    >
                      Este mes
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] px-2"
                      onClick={() => {
                        const now = new Date();
                        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                        const end = new Date(now.getFullYear(), now.getMonth(), 0);
                        setBalanceDateRange({
                          startDate: start.toISOString().split("T")[0],
                          endDate: end.toISOString().split("T")[0],
                        });
                      }}
                    >
                      Mes pasado
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] px-2"
                      onClick={() => {
                        const now = new Date();
                        const start = new Date(now.getFullYear(), 0, 1);
                        const end = new Date(now.getFullYear(), 11, 31);
                        setBalanceDateRange({
                          startDate: start.toISOString().split("T")[0],
                          endDate: end.toISOString().split("T")[0],
                        });
                      }}
                    >
                      Este año
                    </Button>
                  </div>
                </div>
              )}
              {/* Stats row */}
              {balanceReport?.report && balanceReport.report.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-3 pb-3 border-b">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
                      <Users className="h-3 w-3" />
                      <span className="text-[10px]">Empleados</span>
                    </div>
                    <span className="text-sm font-bold">{balanceReport.employeeCount}</span>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
                      <BarChart3 className="h-3 w-3" />
                      <span className="text-[10px]">Total</span>
                    </div>
                    <span className="text-sm font-bold">{balanceReport.totalAssignments}</span>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
                      <TrendingUp className="h-3 w-3" />
                      <span className="text-[10px]">Promedio</span>
                    </div>
                    <span className="text-sm font-bold">{balanceReport.averagePerEmployee}</span>
                  </div>
                </div>
              )}

              {/* Employee bars */}
              {balanceReport?.report && balanceReport.report.length > 0 ? (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {[...balanceReport.report]
                    .sort((a, b) => b.totalAssignments - a.totalAssignments)
                    .map((item) => {
                      const emp = item;
                      const groupColor = groups?.find((g) => g.id === emp.employeeId)?.color ?? "#6b7280";
                      return (
                        <div key={item.employeeId} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium truncate">{item.employeeName}</span>
                            <span className="text-muted-foreground ml-2 shrink-0 tabular-nums font-bold">
                              {item.totalAssignments}
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className="rounded-full h-2 transition-all"
                              style={{
                                width: `${Math.min(100, (item.totalAssignments / Math.max(...balanceReport.report.map((b) => b.totalAssignments), 1)) * 100)}%`,
                                backgroundColor: groups?.find((g) =>
                                  assignments?.find((a) => a.employeeId === item.employeeId)?.groupId === g.id
                                )?.color ?? "hsl(var(--primary))",
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
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

      {/* Confirmación de eliminación */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={`Eliminar asignaciones de ${groups?.find((g) => g.id === selectedGroupId)?.name ?? ""}`}
        description="¿Eliminar TODAS las asignaciones de este grupo? Esta acción no se puede deshacer. Usa Reglas → Regenerar para crear nuevas asignaciones."
        confirmLabel="Eliminar todo"
        variant="destructive"
        onConfirm={confirmDeleteGroup}
      />
    </div>
  );
}
