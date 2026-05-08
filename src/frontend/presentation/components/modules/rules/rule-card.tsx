"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Pencil, Users, CalendarDays } from "lucide-react";
import { DAY_NAMES } from "@/backend/domain/entities/types";
import type { DayOfWeek } from "@/backend/domain/entities/types";
import { TaskIcon } from "@/frontend/presentation/components/shared/task-icon";
import type { RuleResponse, GroupResponse } from "@/frontend/presentation/lib/query/hooks";
import { getTaskConfig, getDaySummary, getFrequencyLabel } from "./rules-constants";
import { WeeklyStrip } from "./weekly-strip";

interface TaskGroupCardProps {
  taskLabel: string;
  rules: RuleResponse[];
  days: Set<DayOfWeek>;
  groupIds: Set<string>;
  frequencies: Set<number>;
  groups: GroupResponse[] | undefined;
  onEdit: (rule: RuleResponse) => void;
  onDelete: (id: string) => void;
}

export function TaskGroupCard({
  taskLabel,
  rules: taskRules,
  days,
  groupIds,
  frequencies,
  groups,
  onEdit,
  onDelete,
}: TaskGroupCardProps) {
  const config = getTaskConfig(taskLabel);
  const sortedDays = Array.from(days).sort() as DayOfWeek[];
  const isAllGroups =
    groups &&
    groupIds.size === groups.length &&
    groups.every((g) => groupIds.has(g.id));
  const freqValue = Array.from(frequencies)[0] ?? 1;

  return (
    <Card className="overflow-hidden" style={{ borderLeft: `4px solid ${config.color}` }}>
      <CardContent className="p-4 sm:p-6">
        {/* Encabezado de tarea */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <TaskIcon taskType={taskLabel} size="lg" />
            <div>
              <h3 className="font-semibold text-base">{taskLabel}</h3>
              <p className="text-sm text-muted-foreground">
                Aplica {getDaySummary(days)}
                {freqValue > 1 && ` · ${getFrequencyLabel(freqValue)}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {isAllGroups ? (
              <Badge variant="secondary" className="text-xs flex items-center gap-1">
                <Users className="h-3 w-3" />
                Todos los grupos
              </Badge>
            ) : (
              Array.from(groupIds).map((gid) => {
                const group = groups?.find((g) => g.id === gid);
                return (
                  <Badge
                    key={gid}
                    variant="outline"
                    className="text-xs"
                    style={{
                      borderColor: group?.color,
                      color: group?.color,
                    }}
                  >
                    {group?.name ?? "Desconocido"}
                  </Badge>
                );
              })
            )}
            <Badge variant="secondary" className="text-xs">
              {taskRules.length} {taskRules.length === 1 ? "regla" : "reglas"}
            </Badge>
          </div>
        </div>

        {/* Strip semanal */}
        <div className="mb-4">
          <WeeklyStrip activeDays={sortedDays} color={config.color} />
        </div>

        {/* Lista de reglas individuales */}
        <div className="space-y-1.5">
          {taskRules.map((rule) => {
            const groupName =
              groups?.find((g) => g.id === rule.groupId)?.name ?? "??";
            return (
              <div
                key={rule.id}
                className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-center gap-2 text-sm">
                  <CalendarDays
                    className="h-3.5 w-3.5 shrink-0"
                    style={{ color: config.color }}
                  />
                  <span className="font-medium">
                    {DAY_NAMES[rule.dayOfWeek as DayOfWeek]}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    · {getFrequencyLabel(rule.frequency)}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    · {groupName}
                  </span>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => onEdit(rule)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive h-7 w-7 p-0"
                    onClick={() => onDelete(rule.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
