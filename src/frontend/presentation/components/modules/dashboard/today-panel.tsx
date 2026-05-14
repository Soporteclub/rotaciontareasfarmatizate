"use client";

import { useMemo } from "react";
import { CalendarHeart, Coffee, PartyPopper } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAssignments } from "@/frontend/presentation/lib/query/hooks";
import type { GroupResponse, AssignmentResponse } from "@/frontend/presentation/lib/query/types";
import { TaskIcon } from "@/frontend/presentation/components/shared/task-icon";
import { DAY_NAMES_FULL, MONTH_NAMES, formatFullDate } from "./calendar-utils";
import {
  generateColombianHolidays,
  formatDateKey,
} from "@/backend/domain/holidays/colombian-holidays";

// ─── Types ─────────────────────────────────────────────────────

interface TodayPanelProps {
  groups: GroupResponse[] | undefined;
}

interface GroupedAssignments {
  groupId: string;
  groupName: string;
  groupColor: string;
  assignments: AssignmentResponse[];
}

// ─── Helpers ───────────────────────────────────────────────────

/** Obtener string de fecha local en formato YYYY-MM-DD (sin offset de zona horaria) */
function getLocalTodayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** Verificar si hoy es fin de semana */
function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/** Buscar festivo colombiano para hoy */
function getColombianHoliday(date: Date): string | null {
  const holidays = generateColombianHolidays(date.getFullYear());
  const key = formatDateKey(date);
  const holiday = holidays.find((h) => formatDateKey(h.date) === key);
  return holiday?.name ?? null;
}

/** Agrupar asignaciones por grupo */
function groupAssignmentsByGroup(
  assignments: AssignmentResponse[],
  groups: GroupResponse[] | undefined,
): GroupedAssignments[] {
  const groupMap = new Map<string, GroupedAssignments>();

  for (const a of assignments) {
    if (!groupMap.has(a.groupId)) {
      const group = groups?.find((g) => g.id === a.groupId);
      groupMap.set(a.groupId, {
        groupId: a.groupId,
        groupName: group?.name ?? a.groupId,
        groupColor: group?.color ?? "#6b7280",
        assignments: [],
      });
    }
    groupMap.get(a.groupId)!.assignments.push(a);
  }

  return Array.from(groupMap.values());
}

// ─── Sub-componentes ──────────────────────────────────────────

function TodayPanelSkeleton() {
  return (
    <Card className="border-primary/20 shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ isWeekendDay, holidayName }: { isWeekendDay: boolean; holidayName: string | null }) {
  let icon = <Coffee className="h-10 w-10 text-amber-500" />;
  let title = "Sin asignaciones para hoy";
  let description = "No hay tareas programadas para el día de hoy.";

  if (isWeekendDay) {
    icon = <PartyPopper className="h-10 w-10 text-purple-500" />;
    title = "¡Fin de semana!";
    description = "Hoy no hay asignaciones — disfruta el descanso.";
  }

  if (holidayName) {
    icon = <CalendarHeart className="h-10 w-10 text-rose-500" />;
    title = `¡Festivo: ${holidayName}!`;
    description = "Hoy es festivo en Colombia — no hay asignaciones programadas.";
  }

  return (
    <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
      <div className="p-4 rounded-full bg-muted/60">{icon}</div>
      <p className="text-lg font-semibold text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground max-w-xs">{description}</p>
    </div>
  );
}

function AssignmentRow({
  assignment,
  groupColor,
}: {
  assignment: AssignmentResponse;
  groupColor: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/40 transition-colors">
      <TaskIcon taskType={assignment.taskName} size="md" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{assignment.taskName}</p>
        <p className="text-sm text-muted-foreground truncate">
          {assignment.employee?.name ?? "Sin asignar"}
        </p>
      </div>
      <div
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={{ backgroundColor: groupColor }}
        title={assignment.group?.name ?? ""}
      />
    </div>
  );
}

function GroupColumn({ group }: { group: GroupedAssignments }) {
  return (
    <div
      className="rounded-xl border p-4 space-y-1"
      style={{ borderColor: `${group.groupColor}40` }}
    >
      {/* Encabezado del grupo */}
      <div className="flex items-center gap-2 pb-2 mb-2 border-b" style={{ borderColor: `${group.groupColor}30` }}>
        <div
          className="w-3.5 h-3.5 rounded-full shrink-0"
          style={{ backgroundColor: group.groupColor }}
        />
        <h4 className="text-base font-bold">{group.groupName}</h4>
        <span className="text-sm text-muted-foreground ml-auto">
          {group.assignments.length} {group.assignments.length === 1 ? "tarea" : "tareas"}
        </span>
      </div>

      {/* Lista de asignaciones */}
      <div className="space-y-0.5 max-h-64 overflow-y-auto">
        {group.assignments.map((a) => (
          <AssignmentRow key={a.id} assignment={a} groupColor={group.groupColor} />
        ))}
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────

export function TodayPanel({ groups }: TodayPanelProps) {
  const todayStr = getLocalTodayStr();
  const now = new Date();

  // Fetch de asignaciones para hoy
  const { data: assignments, isLoading } = useAssignments(undefined, todayStr, todayStr);

  // Agrupar asignaciones por grupo
  const groupedAssignments = useMemo(() => {
    if (!assignments) return [];
    return groupAssignmentsByGroup(assignments, groups);
  }, [assignments, groups]);

  // Total de asignaciones
  const totalCount = assignments?.length ?? 0;

  // Verificar fin de semana y festivos
  const isWeekendDay = isWeekend(now);
  const holidayName = getColombianHoliday(now);

  // ─── Loading ──────────────────────────────────────────────
  if (isLoading) {
    return <TodayPanelSkeleton />;
  }

  // ─── Render ──────────────────────────────────────────────
  return (
    <Card className="border-primary/20 shadow-md overflow-hidden">
      {/* Barra decorativa superior con color de marca */}
      <div className="h-1.5 bg-gradient-to-r from-primary/80 to-primary/40" />

      <CardHeader className="pb-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10">
            <CalendarHeart className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold">Asignaciones de Hoy</CardTitle>
            <CardDescription className="text-sm">
              {formatFullDate(now)}
            </CardDescription>
          </div>
          {/* Badge con conteo total */}
          {totalCount > 0 && (
            <div className="ml-auto flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-base font-bold">
              <span>{totalCount}</span>
              <span className="text-sm font-normal">{totalCount === 1 ? "tarea" : "tareas"}</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {totalCount === 0 ? (
          <EmptyState isWeekendDay={isWeekendDay} holidayName={holidayName} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groupedAssignments.map((group) => (
              <GroupColumn key={group.groupId} group={group} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
