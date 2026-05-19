"use client";

import { useState, useMemo, useCallback } from "react";
import {
  useRules,
  useGroups,
  useDeleteRule,
  useGenerateAssignments,
} from "@/frontend/presentation/lib/query/hooks";
import { Card, CardContent } from "@/components/ui/card";
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
  Plus,
  ClipboardList,
  RefreshCw,
  Loader2,
  CalendarDays,
  BarChart3,
  Layers,
  ArrowRight,
  PowerOff,
  Trash2,
} from "lucide-react";
import { DAY_NAMES } from "@/backend/domain/entities/types";
import type { DayOfWeek } from "@/backend/domain/entities/types";
import { toast } from "sonner";
import type { RuleResponse, GroupResponse } from "@/frontend/presentation/lib/query/hooks";
import { CreateRuleDialog } from "./create-rule-dialog";
import { EditTaskGroupDialog } from "./edit-task-group-dialog";
import { TaskGroupCard } from "./rule-card";
import { RegenerateDialog } from "./regenerate-dialog";
import { getTaskColor } from "@/frontend/presentation/components/shared/task-icon";
import { BRAND } from "@/frontend/presentation/lib/brand";
import { AdminOnly } from "@/frontend/presentation/components/shared/admin-guard";
import { ConfirmDialog } from "@/frontend/presentation/components/shared/confirm-dialog";

// ─── Stats Card ─────────────────────────────────────────────
function StatsCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 transition-shadow hover:shadow-sm">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${accent}12`, color: accent }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground truncate font-medium">{label}</p>
        <p className="text-xl font-bold leading-tight">{value}</p>
      </div>
    </div>
  );
}

// ─── Empty State with Quick Start ────────────────────────────
function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <Card className="border-dashed">
      <CardContent className="p-8 sm:p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center mx-auto mb-5">
          <ClipboardList className="h-8 w-8" style={{ color: BRAND.PRIMARY }} />
        </div>
        <h3 className="text-xl font-bold mb-2">No hay reglas de rotación</h3>
        <p className="text-muted-foreground max-w-md mx-auto mb-6">
          Las reglas definen <strong>qué tarea</strong> se rota, <strong>qué día</strong> aplica y
          <strong> cada cuánto</strong> se rota. Sin reglas no se pueden generar asignaciones.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-xs font-bold" style={{ color: BRAND.PRIMARY }}>1</div>
            <span>Define la tarea</span>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground/40 hidden sm:block" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center text-xs font-bold" style={{ color: "#00cd98" }}>2</div>
            <span>Elige los días</span>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground/40 hidden sm:block" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-xs font-bold" style={{ color: BRAND.PRIMARY }}>3</div>
            <span>Selecciona el grupo</span>
          </div>
        </div>

        <Button
          onClick={onCreate}
          className="gap-2"
          style={{ backgroundColor: BRAND.PRIMARY }}
          size="lg"
        >
          <Plus className="h-5 w-5" />
          Crear Primera Regla
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ──────────────────────────────────────────
export function RulesModule() {
  const { data: groups, isLoading: loadingGroups } = useGroups();
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const { data: rules, isLoading: loadingRules } = useRules(
    selectedGroupId || undefined,
    true
  );
  const deleteRule = useDeleteRule();
  const generateAssignments = useGenerateAssignments();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editGroupDialogOpen, setEditGroupDialogOpen] = useState(false);
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false);
  const [editingTaskLabel, setEditingTaskLabel] = useState("");
  const [editingTaskRules, setEditingTaskRules] = useState<RuleResponse[]>([]);
  const [regenerating, setRegenerating] = useState(false);
  const [deleteRuleTarget, setDeleteRuleTarget] = useState<string | null>(null);

  // Open the group edit dialog with all rules for a task
  const handleEditGroup = useCallback((taskLabel: string, taskRules: RuleResponse[]) => {
    setEditingTaskLabel(taskLabel);
    setEditingTaskRules(taskRules);
    setEditGroupDialogOpen(true);
  }, []);

  const handleDeleteRule = useCallback(
    (id: string) => {
      setDeleteRuleTarget(id);
    },
    []
  );

  const confirmDeleteRule = useCallback(
    async () => {
      if (!deleteRuleTarget) return;
      try {
        await deleteRule.mutateAsync({ id: deleteRuleTarget, permanent: true });
        toast.success("Regla eliminada");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error");
      } finally {
        setDeleteRuleTarget(null);
      }
    },
    [deleteRule, deleteRuleTarget]
  );

  const handleRegenerate = useCallback(async (params: { groupId: string; startDate: string; endDate: string }) => {
    setRegenerating(true);
    try {
      const result = await generateAssignments.mutateAsync(params);
      toast.success(`Regeneradas ${result.assignments.length} asignaciones`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al regenerar");
    } finally {
      setRegenerating(false);
    }
  }, [generateAssignments]);

  const isLoading = loadingGroups || loadingRules;

  // ─── Data processing ────────────────────────────────────────
  const activeRules = rules?.filter((r) => r.isActive) ?? [];
  const inactiveRules = rules?.filter((r) => !r.isActive) ?? [];

  const rulesByTask = useMemo(() => {
    const map = new Map<
      string,
      {
        rules: typeof activeRules;
        days: Set<DayOfWeek>;
        groupIds: Set<string>;
        frequencies: Set<number>;
      }
    >();

    for (const rule of activeRules) {
      const key = rule.taskLabel || "Sin etiqueta";
      if (!map.has(key)) {
        map.set(key, {
          rules: [],
          days: new Set(),
          groupIds: new Set(),
          frequencies: new Set(),
        });
      }
      const entry = map.get(key)!;
      entry.rules.push(rule);
      entry.days.add(rule.dayOfWeek as DayOfWeek);
      entry.groupIds.add(rule.groupId);
      entry.frequencies.add(rule.frequency);
    }

    return map;
  }, [activeRules]);

  // Also group inactive rules by task for editing
  const inactiveRulesByTask = useMemo(() => {
    const map = new Map<string, RuleResponse[]>();
    for (const rule of inactiveRules) {
      const key = rule.taskLabel || "Sin etiqueta";
      const existing = map.get(key) ?? [];
      existing.push(rule);
      map.set(key, existing);
    }
    return map;
  }, [inactiveRules]);

  // Stats
  const uniqueTaskCount = rulesByTask.size;
  const activeRuleCount = activeRules.length;
  const groupsWithRules = new Set(activeRules.map((r) => r.groupId)).size;

  // ─── Loading ────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-48 bg-muted rounded animate-pulse" />
            <div className="h-4 w-64 bg-muted rounded animate-pulse mt-2" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
        {[1, 2].map((i) => (
          <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ─── Header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Reglas de Rotación
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Define qué tareas se rotan, qué días aplican y cada cuánto
          </p>
        </div>
        <AdminOnly fallback={null}>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setRegenerateDialogOpen(true)}
            disabled={regenerating}
          >
            {regenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">
              {regenerating ? "Regenerando..." : "Regenerar Asignaciones"}
            </span>
            <span className="sm:hidden">
              {regenerating ? "..." : "Regenerar"}
            </span>
          </Button>
          <Button
            className="gap-2"
            style={{ backgroundColor: BRAND.PRIMARY }}
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nueva Regla</span>
            <span className="sm:hidden">Nueva</span>
          </Button>
        </div>
        </AdminOnly>
      </div>

      {/* ─── Stats Bar ───────────────────────────────────────── */}
      {activeRuleCount > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatsCard
            icon={<Layers className="h-5 w-5" />}
            label="Tareas configuradas"
            value={uniqueTaskCount}
            accent={BRAND.PRIMARY}
          />
          <StatsCard
            icon={<CalendarDays className="h-5 w-5" />}
            label="Reglas activas"
            value={activeRuleCount}
            accent="#00cd98"
          />
          <StatsCard
            icon={<BarChart3 className="h-5 w-5" />}
            label="Grupos con reglas"
            value={`${groupsWithRules}/${groups?.length ?? 0}`}
            accent={BRAND.PRIMARY}
          />
        </div>
      )}

      {/* ─── Filter Bar ──────────────────────────────────────── */}
      {activeRuleCount > 0 && (
        <div className="flex items-center gap-3 bg-muted/30 rounded-xl px-4 py-2.5 border border-border/50">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
            Filtrar grupo
          </Label>
          <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
            <SelectTrigger className="w-52 h-8 text-sm">
              <SelectValue placeholder="Todos los grupos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todos los grupos</SelectItem>
              {groups?.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: g.color }}
                    />
                    {g.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedGroupId && selectedGroupId !== "_all" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setSelectedGroupId("")}
            >
              Limpiar filtro
            </Button>
          )}
        </div>
      )}

      {/* ─── Content ─────────────────────────────────────────── */}
      {activeRuleCount > 0 ? (
        <div className="space-y-4">
          {Array.from(rulesByTask.entries()).map(
            ([taskLabel, { rules: taskRules, days, groupIds, frequencies }]) => (
              <TaskGroupCard
                key={taskLabel}
                taskLabel={taskLabel}
                rules={taskRules}
                days={days}
                groupIds={groupIds}
                frequencies={frequencies}
                groups={groups}
                onEditGroup={handleEditGroup}
                onDeleteRule={handleDeleteRule}
              />
            )
          )}

          {/* Inactive rules */}
          {inactiveRules.length > 0 && (
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center gap-2">
                <PowerOff className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-muted-foreground">
                  Reglas inactivas
                </span>
                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                  {inactiveRules.length}
                </Badge>
              </div>
              <div className="space-y-1.5">
                {Array.from(inactiveRulesByTask.entries()).map(([taskLabel, taskRules]) => {
                  const color = getTaskColor(taskLabel);
                  return (
                    <div
                      key={taskLabel}
                      className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-muted/30 transition-colors group opacity-50 hover:opacity-75 border border-transparent hover:border-border/50"
                    >
                      <div className="flex items-center gap-3 text-sm min-w-0">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 border"
                          style={{
                            backgroundColor: `${color}10`,
                            color: color,
                            borderColor: `${color}20`,
                          }}
                        >
                          {taskRules[0]?.frequencyType === "daily"
                            ? "D"
                            : DAY_NAMES[taskRules[0]?.dayOfWeek as DayOfWeek]?.substring(0, 3) ?? "?"}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium line-through">{taskLabel}</span>
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                              {taskRules.length} regla{taskRules.length !== 1 ? "s" : ""}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {taskRules
                              .map((r) =>
                                r.frequencyType === "daily"
                                  ? "Lun-Vie"
                                  : DAY_NAMES[r.dayOfWeek as DayOfWeek]
                              )
                              .join(", ")}
                          </p>
                        </div>
                      </div>

                      {/* Edit group + delete per rule */}
                      <AdminOnly fallback={null}>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs hover:bg-primary/10 hover:text-primary gap-1"
                            onClick={() => handleEditGroup(taskLabel, taskRules)}
                          >
                            <RefreshCw className="h-3 w-3" />
                            Editar
                          </Button>
                          {taskRules.map((rule) => (
                            <Button
                              key={rule.id}
                              size="sm"
                              variant="ghost"
                              className="text-destructive/70 hover:text-destructive h-7 w-7 p-0"
                              onClick={() => handleDeleteRule(rule.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          ))}
                        </div>
                      </AdminOnly>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <EmptyState onCreate={() => setDialogOpen(true)} />
      )}

      {/* ─── Dialogs ─────────────────────────────────────────── */}
      <CreateRuleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        groups={groups}
        selectedGroupId={selectedGroupId}
      />

      <EditTaskGroupDialog
        key={editingTaskLabel}
        open={editGroupDialogOpen}
        onOpenChange={setEditGroupDialogOpen}
        taskLabel={editingTaskLabel}
        rules={editingTaskRules}
        groups={groups}
      />

      {/* Confirmación de eliminación de regla */}
      <ConfirmDialog
        open={!!deleteRuleTarget}
        onOpenChange={(open) => { if (!open) setDeleteRuleTarget(null); }}
        title="Eliminar regla"
        description="¿Eliminar esta regla permanentemente? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={confirmDeleteRule}
      />

      {/* Diálogo de regeneración */}
      <RegenerateDialog
        open={regenerateDialogOpen}
        onOpenChange={setRegenerateDialogOpen}
        groups={groups}
        onRegenerate={handleRegenerate}
        isPending={regenerating}
      />
    </div>
  );
}
