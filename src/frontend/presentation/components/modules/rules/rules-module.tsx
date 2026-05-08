"use client";

import { useState, useMemo, useCallback } from "react";
import {
  useRules,
  useGroups,
  useCreateRule,
  useDeleteRule,
  useGenerateAssignments,
} from "@/frontend/presentation/lib/query/hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  ClipboardList,
  RefreshCw,
  Loader2,
  Sparkles,
  Users,
  CalendarDays,
} from "lucide-react";
import { DAY_NAMES, TASK_LABELS } from "@/backend/domain/entities/types";
import type { DayOfWeek } from "@/backend/domain/entities/types";
import { toast } from "sonner";
import { TaskIcon, TaskBadge, getTaskColor } from "@/frontend/presentation/components/shared/task-icon";

// ─── Task Visual Config ────────────────────────────────────────
// Now using shared TaskIcon component. getTaskConfig kept for WeeklyStrip colors.
function getTaskConfig(taskLabel: string) {
  const color = getTaskColor(taskLabel);
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  const bgLight = `rgba(${r}, ${g}, ${b}, 0.06)`;
  const border = `rgba(${r}, ${g}, ${b}, 0.3)`;
  return { color, bgLight, border };
}

// ─── Day helpers ───────────────────────────────────────────────
const WEEKDAYS: DayOfWeek[] = [1, 2, 3, 4, 5]; // Mon-Fri
const ALL_DAYS: DayOfWeek[] = [0, 1, 2, 3, 4, 5, 6];

const DAY_ABBR: Record<number, string> = {
  0: "Dom",
  1: "Lun",
  2: "Mar",
  3: "Mié",
  4: "Jue",
  5: "Vie",
  6: "Sáb",
};

// ─── Templates ─────────────────────────────────────────────────
interface RuleTemplate {
  id: string;
  label: string;
  emoji: string;
  description: string;
  taskLabel: string;
  days: DayOfWeek[];
  applyToAllGroups: boolean;
}

const TEMPLATES: RuleTemplate[] = [
  {
    id: "basura",
    label: "Sacar Basura",
    emoji: "🗑",
    description: "Mar + Jue · cada piso independiente",
    taskLabel: "Sacar Basura",
    days: [2, 4],
    applyToAllGroups: false,
  },
  {
    id: "cafetera",
    label: "Lavar Cafetera",
    emoji: "☕",
    description: "Lun-Vie · cada piso independiente",
    taskLabel: "Lavar Cafetera",
    days: [1, 2, 3, 4, 5],
    applyToAllGroups: false,
  },
  {
    id: "aseo",
    label: "Aseo General",
    emoji: "✨",
    description: "Todos los grupos, día específico",
    taskLabel: "Aseo General",
    days: [5], // Friday default
    applyToAllGroups: true,
  },
  {
    id: "custom",
    label: "Personalizada",
    emoji: "✏️",
    description: "Configura tu propia regla",
    taskLabel: "",
    days: [],
    applyToAllGroups: false,
  },
];

// ─── Weekly Calendar Strip ─────────────────────────────────────
function WeeklyStrip({
  activeDays,
  color,
}: {
  activeDays: DayOfWeek[];
  color: string;
}) {
  return (
    <div className="flex items-center gap-1">
      {ALL_DAYS.map((d) => {
        const isActive = activeDays.includes(d);
        const isWeekend = d === 0 || d === 6;
        return (
          <div
            key={d}
            className="flex flex-col items-center gap-0.5"
            title={DAY_NAMES[d as DayOfWeek]}
          >
            <span
              className={`text-[10px] font-medium ${
                isActive
                  ? ""
                  : isWeekend
                  ? "text-muted-foreground/40"
                  : "text-muted-foreground/60"
              }`}
            >
              {DAY_ABBR[d]}
            </span>
            <div
              className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold transition-all ${
                isActive
                  ? "text-white shadow-sm"
                  : isWeekend
                  ? "bg-muted/30 text-muted-foreground/30"
                  : "bg-muted/50 text-muted-foreground/40"
              }`}
              style={
                isActive
                  ? { backgroundColor: color }
                  : undefined
              }
            >
              {isActive ? "✓" : "·"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────
export function RulesModule() {
  const { data: groups, isLoading: loadingGroups } = useGroups();
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const { data: rules, isLoading: loadingRules } = useRules(
    selectedGroupId || undefined,
    true
  );
  const createRule = useCreateRule();
  const deleteRule = useDeleteRule();
  const generateAssignments = useGenerateAssignments();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // Form state
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [form, setForm] = useState({
    taskLabel: "",
    selectedDays: [] as DayOfWeek[],
    frequency: "1",
    groupId: "",
    applyToAllGroups: false,
  });

  const resetForm = () => {
    setForm({
      taskLabel: "",
      selectedDays: [],
      frequency: "1",
      groupId: "",
      applyToAllGroups: false,
    });
    setSelectedTemplate("");
  };

  // Apply template
  const applyTemplate = useCallback((templateId: string) => {
    const template = TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    setSelectedTemplate(templateId);
    setForm((f) => ({
      ...f,
      taskLabel: template.taskLabel,
      selectedDays: template.days,
      applyToAllGroups: template.applyToAllGroups,
    }));
  }, []);

  // Toggle day
  const toggleDay = useCallback((day: DayOfWeek) => {
    setForm((f) => ({
      ...f,
      selectedDays: f.selectedDays.includes(day)
        ? f.selectedDays.filter((d) => d !== day)
        : [...f.selectedDays, day].sort(),
    }));
  }, []);

  // Select weekdays shortcut
  const selectWeekdays = useCallback(() => {
    setForm((f) => ({ ...f, selectedDays: [...WEEKDAYS] }));
  }, []);

  // Clear days
  const clearDays = useCallback(() => {
    setForm((f) => ({ ...f, selectedDays: [] }));
  }, []);

  // Submit: create rules for each selected day, for each group
  const handleSubmit = async () => {
    try {
      const taskLabel = form.taskLabel.trim();
      if (!taskLabel) {
        toast.error("La etiqueta de tarea es requerida");
        return;
      }
      if (form.selectedDays.length === 0) {
        toast.error("Selecciona al menos un día");
        return;
      }

      const targetGroupIds = form.applyToAllGroups
        ? (groups?.map((g) => g.id) ?? [])
        : [form.groupId || selectedGroupId];

      if (targetGroupIds.length === 0 || (!form.applyToAllGroups && !targetGroupIds[0])) {
        toast.error("Selecciona un grupo");
        return;
      }

      // Create all rules in parallel
      const promises: Promise<unknown>[] = [];
      for (const groupId of targetGroupIds) {
        for (const day of form.selectedDays) {
          promises.push(
            createRule.mutateAsync({
              groupId,
              dayOfWeek: day,
              frequency: parseInt(form.frequency),
              taskLabel,
            })
          );
        }
      }

      await Promise.all(promises);

      const totalCreated = targetGroupIds.length * form.selectedDays.length;
      toast.success(
        `Se crearon ${totalCreated} regla${totalCreated !== 1 ? "s" : ""}${
          form.applyToAllGroups ? " para todos los grupos" : ""
        }`
      );
      setDialogOpen(false);
      resetForm();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al crear regla(s)"
      );
    }
  };

  // Delete handler
  const handleDelete = async (id: string) => {
    if (!confirm("¿Desactivar esta regla?")) return;
    try {
      await deleteRule.mutateAsync(id);
      toast.success("Regla desactivada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  };

  // Regenerate assignments for all groups
  const handleRegenerateAll = async () => {
    if (!groups || groups.length === 0) {
      toast.error("No hay grupos configurados");
      return;
    }
    setRegenerating(true);
    try {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 3, 0);
      const startStr = startDate.toISOString().split("T")[0];
      const endStr = endDate.toISOString().split("T")[0];

      let totalAssignments = 0;
      for (const group of groups) {
        const result = await generateAssignments.mutateAsync({
          groupId: group.id,
          startDate: startStr,
          endDate: endStr,
        });
        totalAssignments += result.assignments.length;
      }
      toast.success(
        `Regeneradas ${totalAssignments} asignaciones en ${groups.length} grupos`
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al regenerar"
      );
    } finally {
      setRegenerating(false);
    }
  };

  const isLoading = loadingGroups || loadingRules;

  // ─── Data processing ──────────────────────────────────────────
  const activeRules = rules?.filter((r) => r.isActive) ?? [];
  const inactiveRules = rules?.filter((r) => !r.isActive) ?? [];

  // Group active rules by taskLabel
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

  // Human-readable day summary
  const getDaySummary = useCallback((days: Set<DayOfWeek>): string => {
    const sorted = Array.from(days).sort();
    if (sorted.length === 0) return "Ningún día";
    if (sorted.length === 7) return "Todos los días";

    // Check for Mon-Fri range
    if (
      sorted.length === 5 &&
      WEEKDAYS.every((d) => sorted.includes(d))
    ) {
      return "Lunes a Viernes";
    }

    // Check for specific patterns
    if (
      sorted.length === 2 &&
      sorted.includes(2) &&
      sorted.includes(4)
    ) {
      return "Martes y Jueves";
    }

    if (
      sorted.length === 3 &&
      sorted.includes(1) &&
      sorted.includes(3) &&
      sorted.includes(5)
    ) {
      return "Lunes, Miércoles y Viernes";
    }

    // Default: list day names
    return sorted.map((d) => DAY_NAMES[d]).join(", ");
  }, []);

  // ─── Loading state ────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Reglas</h1>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Reglas de Rotación</h1>
          <p className="text-muted-foreground text-sm">
            Configura los días y frecuencias de rotación por tarea
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            onClick={handleRegenerateAll}
            disabled={regenerating}
          >
            {regenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">
              {regenerating ? "Regenerando..." : "Regenerar asignaciones"}
            </span>
            <span className="sm:hidden">
              {regenerating ? "..." : "Regenerar"}
            </span>
          </Button>
          <Button
            className="flex items-center gap-2"
            style={{ backgroundColor: "#f15a24" }}
            onClick={() => {
              resetForm();
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Nueva Regla
          </Button>
        </div>
      </div>

      {/* Group filter */}
      <div className="flex items-center gap-2">
        <Label className="text-sm whitespace-nowrap">Filtrar:</Label>
        <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Todos los grupos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos los grupos</SelectItem>
            {groups?.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Task-centric rule cards */}
      {rulesByTask.size > 0 || inactiveRules.length > 0 ? (
        <div className="space-y-4">
          {Array.from(rulesByTask.entries()).map(
            ([taskLabel, { rules: taskRules, days, groupIds, frequencies }]) => {
              const config = getTaskConfig(taskLabel);
              const sortedDays = Array.from(days).sort() as DayOfWeek[];
              const isAllGroups =
                groups &&
                groupIds.size === groups.length &&
                groups.every((g) => groupIds.has(g.id));
              const freqValue = Array.from(frequencies)[0] ?? 1;

              return (
                <Card
                  key={taskLabel}
                  className="overflow-hidden"
                  style={{ borderLeft: `4px solid ${config.color}` }}
                >
                  <CardContent className="p-4 sm:p-6">
                    {/* Task header */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <TaskIcon taskType={taskLabel} size="lg" />
                        <div>
                          <h3 className="font-semibold text-base">
                            {taskLabel}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Aplica {getDaySummary(days)}
                            {freqValue > 1 &&
                              ` · Cada ${freqValue} semanas`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Group badges */}
                        {isAllGroups ? (
                          <Badge
                            variant="secondary"
                            className="text-xs flex items-center gap-1"
                          >
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
                          {taskRules.length}{" "}
                          {taskRules.length === 1 ? "regla" : "reglas"}
                        </Badge>
                      </div>
                    </div>

                    {/* Weekly calendar strip */}
                    <div className="mb-4">
                      <WeeklyStrip activeDays={sortedDays} color={config.color} />
                    </div>

                    {/* Individual rules list */}
                    <div className="space-y-1.5">
                      {taskRules.map((rule) => {
                        const groupName =
                          groups?.find((g) => g.id === rule.groupId)?.name ??
                          "??";
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
                              {rule.frequency > 1 && (
                                <span className="text-muted-foreground text-xs">
                                  (cada {rule.frequency} sem.)
                                </span>
                              )}
                              <span className="text-muted-foreground text-xs">
                                · {groupName}
                              </span>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleDelete(rule.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            }
          )}

          {/* Inactive rules */}
          {inactiveRules.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <h3 className="text-sm font-medium text-muted-foreground">
                Inactivas ({inactiveRules.length})
              </h3>
              <div className="space-y-1.5">
                {inactiveRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center gap-3 py-1.5 px-3 opacity-50"
                  >
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm line-through">
                      {DAY_NAMES[rule.dayOfWeek as DayOfWeek]} —{" "}
                      {rule.taskLabel}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No hay reglas</h3>
            <p className="text-muted-foreground">
              Crea reglas para definir los días y tareas de rotación.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ─── Create Rule Dialog ───────────────────────────────── */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Nueva Regla de Asignación
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Step 1: Template selection */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                1. Elige una plantilla
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => applyTemplate(template.id)}
                    className={`flex items-center gap-2 p-3 rounded-lg border-2 text-left transition-all hover:shadow-sm ${
                      selectedTemplate === template.id
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <TaskIcon taskType={template.taskLabel || "custom"} size="md" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {template.label}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {template.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Task label */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                2. Nombre de la tarea
              </Label>
              {TASK_LABELS.includes(
                form.taskLabel as (typeof TASK_LABELS)[number]
              ) ? (
                <Select
                  value={form.taskLabel}
                  onValueChange={(v) => {
                    if (v === "_custom") {
                      setForm((f) => ({ ...f, taskLabel: "" }));
                    } else {
                      setForm((f) => ({ ...f, taskLabel: v }));
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tarea" />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_LABELS.map((t) => (
                      <SelectItem key={t} value={t}>
                        <div className="flex items-center gap-2">
                          <TaskIcon taskType={t} size="xs" showBg={false} />
                          {t}
                        </div>
                      </SelectItem>
                    ))}
                    <SelectItem value="_custom">
                      ✏️ Otra (escribir)...
                    </SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={form.taskLabel}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, taskLabel: e.target.value }))
                    }
                    placeholder="Escribe el nombre de la tarea..."
                    className="flex-1"
                    autoFocus
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setForm((f) => ({ ...f, taskLabel: TASK_LABELS[0] }))
                    }
                  >
                    ← Listado
                  </Button>
                </div>
              )}
            </div>

            {/* Step 3: Day selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">
                  3. Días de la semana
                </Label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={selectWeekdays}
                  >
                    Lun-Vie
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={clearDays}
                  >
                    Limpiar
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {ALL_DAYS.map((d) => {
                  const isChecked = form.selectedDays.includes(d);
                  const isWeekend = d === 0 || d === 6;
                  const config = getTaskConfig(form.taskLabel);
                  return (
                    <label
                      key={d}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 cursor-pointer transition-all select-none ${
                        isChecked
                          ? "border-primary bg-primary/5 shadow-sm"
                          : isWeekend
                          ? "border-border bg-muted/30 hover:border-primary/30"
                          : "border-border hover:border-primary/30"
                      }`}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggleDay(d)}
                        className={
                          isChecked
                            ? ""
                            : "data-[state=unchecked]:border-muted-foreground/40"
                        }
                        style={
                          isChecked
                            ? {
                                backgroundColor: config.color,
                                borderColor: config.color,
                              }
                            : undefined
                        }
                      />
                      <span
                        className={`text-sm font-medium ${
                          isChecked
                            ? ""
                            : isWeekend
                            ? "text-muted-foreground/60"
                            : "text-muted-foreground"
                        }`}
                      >
                        {DAY_ABBR[d]}
                      </span>
                    </label>
                  );
                })}
              </div>
              {form.selectedDays.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Seleccionados:{" "}
                  {form.selectedDays
                    .sort()
                    .map((d) => DAY_NAMES[d])
                    .join(", ")}
                </p>
              )}
            </div>

            {/* Step 4: Group selection */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">4. Grupo</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="all-groups"
                    checked={form.applyToAllGroups}
                    onCheckedChange={(checked) =>
                      setForm((f) => ({
                        ...f,
                        applyToAllGroups: checked === true,
                      }))
                    }
                  />
                  <label
                    htmlFor="all-groups"
                    className="text-sm font-medium cursor-pointer flex items-center gap-1.5"
                  >
                    <Users className="h-4 w-4" />
                    Aplicar a todos los grupos
                  </label>
                </div>
                {!form.applyToAllGroups && (
                  <Select
                    value={form.groupId || selectedGroupId}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, groupId: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar grupo" />
                    </SelectTrigger>
                    <SelectContent>
                      {groups?.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: g.color }}
                            />
                            {g.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {form.applyToAllGroups && (
                  <p className="text-xs text-muted-foreground bg-muted p-2 rounded-md">
                    Se creará la misma regla para cada grupo (
                    {groups?.map((g) => g.name).join(", ")})
                  </p>
                )}
              </div>
            </div>

            {/* Step 5: Frequency */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                5. Frecuencia (cada N semanas)
              </Label>
              <Select
                value={form.frequency}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, frequency: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Cada semana</SelectItem>
                  <SelectItem value="2">Cada 2 semanas</SelectItem>
                  <SelectItem value="3">Cada 3 semanas</SelectItem>
                  <SelectItem value="4">Cada 4 semanas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Summary */}
            {form.taskLabel && form.selectedDays.length > 0 && (
              <div
                className="p-3 rounded-lg border"
                style={{
                  backgroundColor: getTaskConfig(form.taskLabel).bgLight,
                  borderColor: getTaskConfig(form.taskLabel).border,
                }}
              >
                <p className="text-sm font-medium mb-1">Resumen</p>
                <p className="text-xs text-muted-foreground">
                  <TaskIcon taskType={form.taskLabel} size="xs" showBg={false} />{" "}
                  <strong>{form.taskLabel}</strong> ·{" "}
                  {form.selectedDays
                    .sort()
                    .map((d) => DAY_ABBR[d])
                    .join(", ")}{" "}
                  ·{" "}
                  {form.applyToAllGroups
                    ? "Todos los grupos"
                    : groups?.find(
                        (g) => g.id === (form.groupId || selectedGroupId)
                      )?.name ?? "Sin grupo"}{" "}
                  · Cada {form.frequency === "1" ? "" : `${form.frequency} `}
                  semana{form.frequency !== "1" ? "s" : ""}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Se crearán{" "}
                  <strong>
                    {(form.applyToAllGroups ? groups?.length ?? 0 : 1) *
                      form.selectedDays.length}
                  </strong>{" "}
                  regla
                  {(form.applyToAllGroups ? groups?.length ?? 0 : 1) *
                    form.selectedDays.length !==
                  1
                    ? "s"
                    : ""}
                </p>
              </div>
            )}

            <Button
              onClick={handleSubmit}
              className="w-full"
              style={{ backgroundColor: "#f15a24" }}
              disabled={createRule.isPending}
            >
              {createRule.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creando...
                </>
              ) : (
                "Crear Regla(s)"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
