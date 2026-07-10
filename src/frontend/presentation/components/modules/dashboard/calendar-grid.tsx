"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TaskIcon } from "@/frontend/presentation/components/shared/task-icon";
import {
  ChevronLeft, ChevronRight, Loader2, Lock, CalendarHeart, Info,
} from "lucide-react";
import {
  DAY_NAMES_SHORT, MONTH_NAMES, type CalendarDay, type ViewMode,
  formatFullDate, formatWeekRange, getWeekDays as getWeekDaysUtil,
} from "./calendar-utils";
import { getEventColor, getEventBgColor } from "./color-utils";
import { BRAND } from "@/frontend/presentation/lib/brand";

interface CalendarGridProps {
  calendarDays: CalendarDay[];
  isLoading: boolean;
  viewYear: number;
  viewMonth: number;
  viewDay: number;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  prevMonth: () => void;
  nextMonth: () => void;
  goToday: () => void;
  isViewingToday: boolean;
  availableTaskTypes: string[];
  // FIX (Tarea 1+2): per-task styles (color + icon) resolved from rules
  taskStyles: Map<string, { color: string | null; icon: string | null }>;
  onAssignmentClick?: (assignmentId: string) => void;
  isAdmin?: boolean;
  onAdminUnlockRequest?: () => void;
  // Optional callback to open the info modal (Tarea 3)
  onOpenInfo?: () => void;
}

/** Día individual del calendario (vista mes) — TEXTO GRANDE Y LEGIBLE */
function CalendarCell({ day, onAssignmentClick }: { day: CalendarDay; onAssignmentClick?: (assignmentId: string) => void }) {
  return (
    <div
      className={`min-h-[80px] sm:min-h-[110px] md:min-h-[130px] p-1 sm:p-1.5 transition-colors ${
        day.isCurrentMonth ? "bg-card" : "bg-muted/30"
      } ${day.isToday ? "ring-2 ring-primary ring-inset" : ""}`}
    >
      <div className={`text-sm sm:text-base font-semibold mb-1 ${
        day.isToday ? "text-primary" : day.isCurrentMonth ? "text-foreground" : "text-muted-foreground"
      }`}>
        {day.dayOfMonth}
      </div>
      <div className="space-y-0.5">
        {day.assignments.slice(0, 3).map((a) => {
          // FIX (Tarea 1): use the task's color (from the Rule), not the group color
          const eventColor = getEventColor(a.taskColor, a.taskName);
          const eventBg = getEventBgColor(a.taskColor, a.taskName);
          return (
            <div
              key={a.id}
              className={`text-xs sm:text-sm leading-snug px-1 sm:px-1.5 py-0.5 sm:py-1 rounded flex items-center gap-1 ${onAssignmentClick ? "cursor-pointer hover:opacity-80" : ""}`}
              style={{
                backgroundColor: eventBg,
                borderLeft: `3px solid ${eventColor}`,
              }}
              title={`${a.taskName} — ${a.employeeName} (${a.groupName})${a.isLocked ? " 🔒" : ""}`}
              onClick={() => onAssignmentClick?.(a.id)}
            >
              <TaskIcon taskType={a.taskName} iconName={a.taskIcon} color={a.taskColor} size="xs" showBg={false} />
              <span className="font-semibold truncate" style={{ color: eventColor }}>
                {a.employeeName}
              </span>
            </div>
          );
        })}
        {day.assignments.length > 3 && (
          <div className="text-xs sm:text-sm text-muted-foreground text-center font-medium">
            +{day.assignments.length - 3} más
          </div>
        )}
      </div>
    </div>
  );
}

/** Columna de día en la vista semanal — TEXTO GRANDE */
function WeekDayColumn({ day, onAssignmentClick }: { day: CalendarDay; onAssignmentClick?: (assignmentId: string) => void }) {
  return (
    <div
      className={`flex flex-col p-2 sm:p-3 transition-colors ${
        day.isWeekend ? "bg-muted/20" : "bg-card"
      } ${day.isToday ? "ring-2 ring-primary ring-inset" : ""}`}
    >
      <div className="text-center mb-3">
        <div className="text-xs sm:text-sm text-muted-foreground uppercase font-medium">
          {DAY_NAMES_SHORT[day.date.getDay()]}
        </div>
        <div className={`text-xl sm:text-2xl font-bold ${
          day.isToday ? "text-primary" : "text-foreground"
        }`}>
          {day.dayOfMonth}
        </div>
      </div>
      <div className="flex-1 space-y-1.5">
        {day.assignments.length === 0 ? (
          <div className="text-xs sm:text-sm text-muted-foreground text-center py-6">
            Sin asignaciones
          </div>
        ) : (
          day.assignments.map((a) => {
            // FIX (Tarea 1): use the task's color (from the Rule), not the group color
            const eventColor = getEventColor(a.taskColor, a.taskName);
            const eventBg = getEventBgColor(a.taskColor, a.taskName);
            return (
              <div
                key={a.id}
                className={`text-sm sm:text-base leading-snug px-2 sm:px-3 py-1.5 sm:py-2 rounded flex items-center gap-1.5 ${onAssignmentClick ? "cursor-pointer hover:opacity-80" : ""}`}
                style={{
                  backgroundColor: eventBg,
                  borderLeft: `4px solid ${eventColor}`,
                }}
                onClick={() => onAssignmentClick?.(a.id)}
              >
                <TaskIcon taskType={a.taskName} iconName={a.taskIcon} color={a.taskColor} size="sm" showBg={false} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate" style={{ color: eventColor }}>
                    {a.employeeName}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {a.taskName} · {a.groupName}
                  </div>
                </div>
                {a.isLocked && <Lock className="h-3 w-3 ml-auto shrink-0 opacity-50" />}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/** Tarjeta de asignación en la vista de día — TEXTO GRANDE */
function DayAssignmentCard({ a, onAssignmentClick }: { a: CalendarDay["assignments"][number]; onAssignmentClick?: (assignmentId: string) => void }) {
  // FIX (Tarea 1): use the task's color (from the Rule), not the group color
  const eventColor = getEventColor(a.taskColor, a.taskName);
  const eventBg = getEventBgColor(a.taskColor, a.taskName);

  return (
    <div
      className={`flex items-center gap-4 rounded-lg p-4 transition-colors ${onAssignmentClick ? "cursor-pointer hover:opacity-80" : ""}`}
      style={{
        backgroundColor: eventBg,
        borderLeft: `5px solid ${eventColor}`,
      }}
      onClick={() => onAssignmentClick?.(a.id)}
    >
      <TaskIcon taskType={a.taskName} iconName={a.taskIcon} color={a.taskColor} size="md" showBg={true} />
      <div className="min-w-0 flex-1">
        <div className="font-bold text-base" style={{ color: eventColor }}>
          {a.employeeName}
        </div>
        <div className="text-sm text-muted-foreground">
          {a.taskName} · {a.groupName}
        </div>
      </div>
      {a.isLocked && (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Lock className="h-4 w-4" />
          <span>Bloqueado</span>
        </div>
      )}
    </div>
  );
}

/** Leyenda de colores debajo del calendario — muestra TAREAS (no grupos) */
function CalendarLegend({
  availableTaskTypes,
  taskStyles,
}: {
  availableTaskTypes: string[];
  taskStyles: Map<string, { color: string | null; icon: string | null }>;
}) {
  if (availableTaskTypes.length === 0) return null;
  return (
    <div className="mt-4 flex items-center gap-3 flex-wrap text-sm">
      {availableTaskTypes.map((t) => {
        const style = taskStyles.get(t);
        return (
          <div key={t} className="flex items-center gap-1.5">
            <TaskIcon taskType={t} iconName={style?.icon} color={style?.color} size="sm" showBg={false} />
            <span className="text-muted-foreground">{t}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Botones de selección de vista (Día / Semana / Mes) */
function ViewModeToggle({ viewMode, setViewMode }: {
  viewMode: ViewMode;
  setViewMode: (m: ViewMode) => void;
}) {
  const modes: { key: ViewMode; label: string }[] = [
    { key: "day", label: "Día" },
    { key: "week", label: "Semana" },
    { key: "month", label: "Mes" },
  ];

  return (
    <div className="flex rounded-md border overflow-hidden">
      {modes.map((m) => (
        <Button
          key={m.key}
          variant="ghost"
          size="sm"
          className={`rounded-none h-9 px-4 text-sm font-medium ${
            viewMode === m.key
              ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
              : "hover:bg-muted"
          }`}
          onClick={() => setViewMode(m.key)}
        >
          {m.label}
        </Button>
      ))}
    </div>
  );
}

/** Grilla completa del calendario con navegación y vistas */
export function CalendarGrid({
  calendarDays, isLoading, viewYear, viewMonth, viewDay,
  viewMode, setViewMode, prevMonth, nextMonth, goToday, isViewingToday,
  availableTaskTypes, taskStyles, onAssignmentClick, isAdmin, onAdminUnlockRequest,
  onOpenInfo,
}: CalendarGridProps) {
  // Título según la vista
  const headerTitle = (() => {
    if (viewMode === "month") {
      return `${MONTH_NAMES[viewMonth]} ${viewYear}`;
    }
    if (viewMode === "week") {
      const weekDays = getWeekDaysUtil(viewYear, viewMonth, viewDay);
      return formatWeekRange(weekDays);
    }
    // day
    const d = new Date(viewYear, viewMonth, viewDay);
    return formatFullDate(d);
  })();

  // Handler for "Hoy" — navigate to today AND switch to day view for clarity
  const handleGoToday = () => {
    goToday();
  };

  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        {/* Navegación */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-5 gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={prevMonth} className="h-9 w-9">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2 min-w-[200px]">
              <CalendarHeart className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: BRAND.PRIMARY }} />
              {headerTitle}
            </h2>
            <Button variant="outline" size="icon" onClick={nextMonth} className="h-9 w-9">
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between">
            {!isAdmin && (
              <button
                onClick={() => onAdminUnlockRequest?.()}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer mr-1"
                title="Clic para desbloquear edición (solo admin)"
              >
                <Lock className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Solo lectura</span>
              </button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleGoToday}
              disabled={isViewingToday}
              className={`text-sm font-semibold px-4 h-9 transition-all ${
                isViewingToday
                  ? "opacity-40 cursor-not-allowed text-muted-foreground"
                  : "hover:bg-primary hover:text-primary-foreground"
              }`}
            >
              Hoy
            </Button>
            <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
            {onOpenInfo && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onOpenInfo}
                className="h-9 w-9 text-muted-foreground hover:text-foreground"
                title="Información del sistema (motor de equidad, balance, grupos, resumen)"
              >
                <Info className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* ─── Vista Mes ──────────────────────────────────────── */}
        {viewMode === "month" && (
          <>
            <div className="grid grid-cols-7 gap-px bg-border rounded-t-lg overflow-hidden">
              {DAY_NAMES_SHORT.map((d, i) => (
                <div
                  key={d}
                  className={`text-center text-sm font-semibold py-2 ${i === 0 || i === 6 ? "bg-muted text-muted-foreground" : "bg-card"}`}
                >
                  <span className="hidden sm:inline">{d}</span>
                  <span className="sm:hidden">{d.charAt(0)}</span>
                </div>
              ))}
            </div>
            {isLoading ? (
              <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-7 gap-px bg-border rounded-b-lg overflow-hidden">
                  {calendarDays.map((day, i) => (
                    <CalendarCell key={i} day={day} onAssignmentClick={onAssignmentClick} />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground text-center mt-2 sm:hidden">
                  Usa vista Día o Semana para mejor experiencia en móvil
                </p>
              </>
            )}
          </>
        )}

        {/* ─── Vista Semana ────────────────────────────────────── */}
        {viewMode === "week" && (
          <>
            {isLoading ? (
              <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-px bg-border rounded-lg overflow-hidden min-h-[360px] sm:min-h-[480px]">
                {calendarDays.map((day, i) => (
                  <WeekDayColumn key={i} day={day} onAssignmentClick={onAssignmentClick} />
                ))}
              </div>
            )}
          </>
        )}

        {/* ─── Vista Día ───────────────────────────────────────── */}
        {viewMode === "day" && (
          <>
            {isLoading ? (
              <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-3">
                {calendarDays.length > 0 && calendarDays[0].assignments.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <CalendarHeart className="h-16 w-16 mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-medium">Sin asignaciones para este día</p>
                    {calendarDays[0].isWeekend && (
                      <p className="text-sm mt-2">Fin de semana</p>
                    )}
                  </div>
                ) : (
                  calendarDays.length > 0 && calendarDays[0].assignments.map((a) => (
                    <DayAssignmentCard key={a.id} a={a} onAssignmentClick={onAssignmentClick} />
                  ))
                )}
              </div>
            )}
          </>
        )}

        <CalendarLegend availableTaskTypes={availableTaskTypes} taskStyles={taskStyles} />
      </CardContent>
    </Card>
  );
}
