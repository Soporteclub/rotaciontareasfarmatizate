"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TaskIcon } from "@/frontend/presentation/components/shared/task-icon";
import {
  ChevronLeft, ChevronRight, Loader2, Lock, CalendarHeart,
} from "lucide-react";
import { DAY_NAMES_SHORT, MONTH_NAMES, type CalendarDay } from "./calendar-utils";
import { getEventColor, getEventBgColor } from "./color-utils";
import type { GroupResponse } from "@/frontend/presentation/lib/query/hooks";

interface CalendarGridProps {
  calendarDays: CalendarDay[];
  isLoading: boolean;
  viewYear: number;
  viewMonth: number;
  prevMonth: () => void;
  nextMonth: () => void;
  goToday: () => void;
  groups: GroupResponse[] | undefined;
  availableTaskTypes: string[];
}

/** Día individual del calendario */
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

/** Grilla completa del calendario con navegación de mes */
export function CalendarGrid({
  calendarDays, isLoading, viewYear, viewMonth,
  prevMonth, nextMonth, goToday, groups, availableTaskTypes,
}: CalendarGridProps) {
  return (
    <Card>
      <CardContent className="p-4">
        {/* Navegación de mes */}
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
            {MONTH_NAMES[viewMonth]} {viewYear}
          </h2>
        </div>

        {/* Encabezados de día */}
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

        {/* Grilla de días */}
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

        <CalendarLegend groups={groups} availableTaskTypes={availableTaskTypes} />
      </CardContent>
    </Card>
  );
}
