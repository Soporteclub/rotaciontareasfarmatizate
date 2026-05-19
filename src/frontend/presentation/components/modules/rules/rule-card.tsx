"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Trash2,
  Pencil,
  Users,
  Clock,
  Building2,
} from "lucide-react";
import { AdminOnly } from "@/frontend/presentation/components/shared/admin-guard";
import { DAY_NAMES } from "@/backend/domain/entities/types";
import type { DayOfWeek } from "@/backend/domain/entities/types";
import { TaskIcon, getTaskColor } from "@/frontend/presentation/components/shared/task-icon";
import type { RuleResponse, GroupResponse } from "@/frontend/presentation/lib/query/hooks";
import {
  getTaskConfig,
  getDaySummary,
  getFrequencyTypeLabel,
} from "./rules-constants";
import { WeeklyStrip } from "./weekly-strip";

// ─── Frequency Badge ──────────────────────────────────────────
function FrequencyBadge({ type }: { type: string }) {
  const label = getFrequencyTypeLabel(type);
  const colors: Record<string, { bg: string; text: string }> = {
    daily: { bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-400" },
    weekly: { bg: "bg-sky-50 dark:bg-sky-950/40", text: "text-sky-700 dark:text-sky-400" },
    monthly: { bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-700 dark:text-amber-400" },
  };
  const c = colors[type] ?? colors.weekly;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${c.bg} ${c.text}`}>
      <Clock className="h-3 w-3" />
      {label}
    </span>
  );
}

// ─── Group Dot ────────────────────────────────────────────────
function GroupDot({ name, color }: { name: string; color: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 cursor-default"
            style={{ backgroundColor: color }}
          >
            {name.charAt(0).toUpperCase()}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {name}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ─── Task Group Card ──────────────────────────────────────────
interface TaskGroupCardProps {
  taskLabel: string;
  rules: RuleResponse[];
  days: Set<DayOfWeek>;
  groupIds: Set<string>;
  frequencies: Set<number>;
  groups: GroupResponse[] | undefined;
  onEditGroup: (taskLabel: string, rules: RuleResponse[]) => void;
  onDeleteRule: (id: string) => void;
}

export function TaskGroupCard({
  taskLabel,
  rules: taskRules,
  days,
  groupIds,
  frequencies: _frequencies,
  groups,
  onEditGroup,
  onDeleteRule,
}: TaskGroupCardProps) {
  const config = getTaskConfig(taskLabel);
  const color = getTaskColor(taskLabel);
  const sortedDays = Array.from(days).sort() as DayOfWeek[];
  const isAllGroups =
    groups &&
    groupIds.size === groups.length &&
    groups.every((g) => groupIds.has(g.id));
  const firstRule = taskRules[0];
  const isDaily = firstRule?.frequencyType === "daily";
  const displayDays = isDaily ? ([1, 2, 3, 4, 5] as DayOfWeek[]) : sortedDays;

  // Get unique frequency types
  const freqTypes = new Set(taskRules.map((r) => r.frequencyType || "weekly"));

  // Group rules by groupId for compact display
  const rulesByGroup = new Map<string, RuleResponse[]>();
  for (const rule of taskRules) {
    const existing = rulesByGroup.get(rule.groupId) ?? [];
    existing.push(rule);
    rulesByGroup.set(rule.groupId, existing);
  }

  return (
    <Card
      className="overflow-hidden transition-shadow hover:shadow-md"
      style={{ borderLeft: `4px solid ${color}` }}
    >
      <CardContent className="p-0">
        {/* ─── Card Header ─────────────────────────────────────── */}
        <div
          className="px-4 sm:px-5 py-4"
          style={{ backgroundColor: config.bgLight }}
        >
          <div className="flex items-start justify-between gap-3">
            {/* Left: Task info */}
            <div className="flex items-center gap-3">
              <TaskIcon taskType={taskLabel} size="lg" />
              <div>
                <h3 className="font-bold text-base leading-tight">{taskLabel}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {isDaily
                    ? "Todos los días hábiles (Lun-Vie)"
                    : getDaySummary(days)}
                </p>
              </div>
            </div>

            {/* Right: Meta badges + Edit button */}
            <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
              {Array.from(freqTypes).map((ft) => (
                <FrequencyBadge key={ft} type={ft} />
              ))}
              {isAllGroups ? (
                <Badge variant="secondary" className="text-xs gap-1">
                  <Users className="h-3 w-3" />
                  Todos
                </Badge>
              ) : (
                <div className="flex items-center gap-0.5">
                  {Array.from(groupIds).map((gid) => {
                    const group = groups?.find((g) => g.id === gid);
                    if (!group) return null;
                    return <GroupDot key={gid} name={group.name} color={group.color} />;
                  })}
                </div>
              )}
              <AdminOnly fallback={null}>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 gap-1 text-[11px] px-2 ml-1"
                        onClick={() => onEditGroup(taskLabel, taskRules)}
                      >
                        <Pencil className="h-3 w-3" />
                        <span className="hidden sm:inline">Editar</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      Editar tarea completa
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </AdminOnly>
            </div>
          </div>

          {/* Weekly strip */}
          <div className="mt-3">
            <WeeklyStrip activeDays={displayDays} color={color} />
          </div>
        </div>

        {/* ─── Compact Rules by Group ──────────────────────────── */}
        <div className="px-4 sm:px-5 py-3">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Reglas por grupo
            </span>
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
              {taskRules.length}
            </Badge>
          </div>

          <div className="space-y-1.5">
            {Array.from(rulesByGroup.entries()).map(([groupId, groupRules]) => {
              const group = groups?.find((g) => g.id === groupId);
              const groupName = group?.name ?? "??";
              const groupColor = group?.color ?? "#888";
              const groupDayLabels = groupRules
                .map((r) =>
                  r.frequencyType === "daily"
                    ? "Lun-Vie"
                    : DAY_NAMES[r.dayOfWeek as DayOfWeek]
                )
                .sort()
                .join(", ");

              return (
                <div
                  key={groupId}
                  className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-muted/40 transition-colors group border border-transparent hover:border-border/60"
                >
                  <div className="flex items-center gap-3 text-sm min-w-0">
                    {/* Group color indicator */}
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 border"
                      style={{
                        backgroundColor: `${groupColor}12`,
                        color: groupColor,
                        borderColor: `${groupColor}25`,
                      }}
                    >
                      <Building2 className="h-4 w-4" />
                    </div>

                    {/* Info */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium">{groupName}</span>
                        <Badge
                          variant="outline"
                          className="text-[10px] h-4 px-1.5 shrink-0"
                          style={{ borderColor: `${groupColor}40`, color: groupColor }}
                        >
                          {groupRules.length} regla{groupRules.length !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {groupDayLabels}
                      </p>
                    </div>
                  </div>

                  {/* Per-rule delete actions */}
                  <AdminOnly
                    fallback={null}
                  >
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      {groupRules.map((rule) => (
                        <TooltipProvider key={rule.id}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive/70 hover:text-destructive hover:bg-destructive/10 h-7 w-7 p-0"
                                onClick={() => onDeleteRule(rule.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="text-xs">
                              Eliminar {DAY_NAMES[rule.dayOfWeek as DayOfWeek]}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                    </div>
                  </AdminOnly>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
