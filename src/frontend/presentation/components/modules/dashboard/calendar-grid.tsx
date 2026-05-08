"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TaskIcon } from "@/frontend/presentation/components/shared/task-icon";
import {
  ChevronLeft, ChevronRight, Loader2, Lock, CalendarHeart,
} from "lucide-react";
import {
  DAY_NAMES_SHORT, MONTH_NAMES, type CalendarDay, type ViewMode,
  formatFullDate, formatWeekRange, getWeekDays as getWeekDaysUtil,
} from "./calendar-utils";
import { getEventColor, getEventBgColor } from "./color-utils";
import type { GroupResponse } from "@/frontend/presentation/lib/query/hooks";

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
  groups: GroupResponse[] | undefined;
  availableTaskTypes: string[];
}

/** Día individual del calendario (vista mes) */
function CalendarCell({ day }: { day: CalendarDay }) {
  return (
    <div
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
  );
}

/** Columna de día en la vista semanal */
function WeekDayColumn({ day }: { day: CalendarDay }) {
  return (
    <div
      className={`flex flex-col p-2 transition-colors ${
        day.isWeekend ? "bg-muted/20" : "bg-card"
      } ${day.isToday ? "ring-2 ring-primary ring-inset" : ""}`}
    >
      <div className="text-center mb-2">
        <div className="text-[10px] text-muted-foreground uppercase">
          {DAY_NAMES_SHORT[day.date.getDay()]}
        </div>
        <div className={`text-lg font-semibold ${
          day.isToday ? "text-primary" : "text-foreground"
        }`}>
          {day.dayOfMonth}
        </div>
      </div>
      <div className="flex-1 space-y-1">
        {day.assignments.length === 0 ? (
          <div className="text-[10px] text-muted-foreground text-center py-4">
            Sin asignaciones
          </div>
        ) : (
          day.assignments.map((a) => {
            const eventColor = getEventColor(a.groupColor, a.taskType);
            const eventBg = getEventBgColor(a.groupColor, a.taskType);
            return (
              <div
                key={a.id}
                className="text-xs leading-tight px-2 py-1.5 rounded flex items-center gap-1"
                style={{
                  backgroundColor: eventBg,
                  borderLeft: `3px solid ${eventColor}`,
                }}
              >
                <TaskIcon taskType={a.taskType} size="xs" showBg={false} />
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate" style={{ color: eventColor }}>
                    {a.employeeName}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {a.taskType} · {a.groupName}
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

/** Tarjeta de asignación en la vista de día */
function DayAssignmentCard({ a }: { a: CalendarDay["assignments"][number] }) {
  const eventColor = getEventColor(a.groupColor, a.taskType);
  const eventBg = getEventBgColor(a.groupColor, a.taskType);

  return (
    <div
      className="flex items-center gap-3 rounded-lg p-3 transition-colors"
      style={{
        backgroundColor: eventBg,
        borderLeft: `4px solid ${eventColor}`,
      }}
    >
      <TaskIcon taskType={a.taskType} size="sm" showBg={true} />
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-sm" style={{ color: eventColor }}>
          {a.employeeName}
        </div>
        <div className="text-xs text-muted-foreground">
          {a.taskType} · {a.groupName}
        </div>
      </div>
      {a.isLocked && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Lock className="h-3 w-3" />
          <span>Bloqueado</span>
        </div>
      )}
    </div>
  );
}

/** Leyenda de colores debajo del calendario */
function CalendarLegend({ groups, availableTaskTypes }: {
  groups: GroupResponse[] | undefined;
  availableTaskTypes: string[];
}) {
  return (
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
          className={`rounded-none h-8 px-3 text-xs font-medium ${
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
  viewMode, setViewMode, prevMonth, nextMonth, goToday,
  groups, availableTaskTypes,
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



  return (
    <Card>
      <CardContent className="p-4">
        {/* Navegación */}
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
            <CalendarHeart className="h-5 w-5" style={{ color: "#1545cb" }} />
            {headerTitle}
          </h2>
          <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
        </div>

        {/* ─── Vista Mes ──────────────────────────────────────── */}
        {viewMode === "month" && (
          <>
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
            {isLoading ? (
              <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-px bg-border rounded-b-lg overflow-hidden">
                {calendarDays.map((day, i) => (
                  <CalendarCell key={i} day={day} />
                ))}
              </div>
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
              <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden min-h-[420px]">
                {calendarDays.map((day, i) => (
                  <WeekDayColumn key={i} day={day} />
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
              <div className="space-y-2">
                {calendarDays.length > 0 && calendarDays[0].assignments.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <CalendarHeart className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">Sin asignaciones para este día</p>
                    {calendarDays[0].isWeekend && (
                      <p className="text-xs mt-1">Fin de semana</p>
                    )}
                  </div>
                ) : (
                  calendarDays.length > 0 && calendarDays[0].assignments.map((a) => (
                    <DayAssignmentCard key={a.id} a={a} />
                  ))
                )}
              </div>
            )}
          </>
        )}

        <CalendarLegend groups={groups} availableTaskTypes={availableTaskTypes} />
      </CardContent>
    </Card>
  );
}
