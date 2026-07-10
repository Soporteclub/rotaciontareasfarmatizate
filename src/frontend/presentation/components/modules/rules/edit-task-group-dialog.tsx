"use client";

import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Pencil,
  Check,
  Power,
  PowerOff,
  Tag,
  CalendarClock,
  Users,
  Building2,
  Plus,
  Minus,
  RefreshCw,
  Palette,
  Shapes,
} from "lucide-react";
import { TASK_LABELS, DAY_NAMES } from "@/backend/domain/entities/types";
import type { DayOfWeek, FrequencyType } from "@/backend/domain/entities/types";
import { toast } from "sonner";
import {
  useCreateRule,
  useUpdateRule,
  useDeleteRule,
  useGroups,
} from "@/frontend/presentation/lib/query/hooks";
import type { RuleResponse, GroupResponse } from "@/frontend/presentation/lib/query/hooks";
import {
  TaskIcon,
  getTaskColor,
  resolveIcon,
  TASK_COLOR_PALETTE,
  ICON_GALLERY_CATEGORIES,
} from "@/frontend/presentation/components/shared/task-icon";
import { BRAND } from "@/frontend/presentation/lib/brand";
import {
  FREQUENCY_OPTIONS,
  ALL_DAYS,
  WEEKDAYS,
  DAY_ABBR,
  getFrequencyTypeLabel,
  getTaskConfig,
  getDaySummary,
} from "./rules-constants";
import { WeeklyStrip } from "./weekly-strip";

// ─── Props ────────────────────────────────────────────────────
interface EditTaskGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskLabel: string;
  rules: RuleResponse[];
  groups: GroupResponse[] | undefined;
}

// ─── Form State ───────────────────────────────────────────────
interface FormState {
  taskLabel: string;
  selectedDays: DayOfWeek[];
  frequencyType: FrequencyType;
  isActive: boolean;
  // FIX (Tarea 1+2): per-task color and icon
  color: string;
  icon: string;
}

// ─── Diff types ───────────────────────────────────────────────
interface RuleDiff {
  toAdd: { groupId: string; day: DayOfWeek }[];
  toRemove: RuleResponse[];
  toUpdate: RuleResponse[];
}

// ─── Standalone diff calculation ──────────────────────────────
function calculateRuleDiff(
  form: FormState,
  rules: RuleResponse[],
  affectedGroupIds: string[],
): RuleDiff {
  const toAdd: { groupId: string; day: DayOfWeek }[] = [];
  const toRemove: RuleResponse[] = [];
  const toUpdate: RuleResponse[] = [];

  const effectiveDays =
    form.frequencyType === "daily"
      ? WEEKDAYS
      : form.selectedDays;
  const newDaysSet = new Set(effectiveDays);

  for (const groupId of affectedGroupIds) {
    const groupRules = rules.filter((r) => r.groupId === groupId);
    const existingDays = new Set(groupRules.map((r) => r.dayOfWeek as DayOfWeek));

    // New days to create
    for (const day of newDaysSet) {
      if (!existingDays.has(day)) {
        toAdd.push({ groupId, day });
      }
    }

    // Old days to delete or update
    for (const rule of groupRules) {
      if (!newDaysSet.has(rule.dayOfWeek as DayOfWeek)) {
        toRemove.push(rule);
      } else {
        const needsUpdate =
          rule.taskLabel !== form.taskLabel.trim() ||
          rule.frequencyType !== form.frequencyType ||
          rule.isActive !== form.isActive;
        if (needsUpdate) {
          toUpdate.push(rule);
        }
      }
    }
  }

  return { toAdd, toRemove, toUpdate };
}

// ─── Section Wrapper ──────────────────────────────────────────
function FormSection({
  icon,
  title,
  children,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-3">
        <div className="text-muted-foreground">{icon}</div>
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      </div>
      {children}
    </div>
  );
}

// ─── Day Selector Component ───────────────────────────────────
function DaySelector({
  selectedDays,
  color,
  onToggleDay,
  onSelectWeekdays,
  onClearDays,
}: {
  selectedDays: DayOfWeek[];
  color: string;
  onToggleDay: (day: DayOfWeek) => void;
  onSelectWeekdays: () => void;
  onClearDays: () => void;
}) {
  return (
    <>
      <div className="flex items-center gap-1.5 mb-2.5">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-[11px] px-2.5 gap-1"
          onClick={onSelectWeekdays}
        >
          <RefreshCw className="h-3 w-3" />
          Lun-Vie
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-[11px] px-2.5 gap-1"
          onClick={onClearDays}
        >
          <Minus className="h-3 w-3" />
          Limpiar
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {ALL_DAYS.map((d) => {
          const isChecked = selectedDays.includes(d);
          const isWeekend = d === 0 || d === 6;
          return (
            <button
              key={d}
              type="button"
              onClick={() => onToggleDay(d)}
              className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 cursor-pointer transition-all select-none ${
                isChecked
                  ? "shadow-sm"
                  : isWeekend
                  ? "border-transparent bg-muted/15 hover:bg-muted/30"
                  : "border-transparent bg-muted/25 hover:bg-muted/40"
              }`}
              style={
                isChecked
                  ? { borderColor: color, backgroundColor: `${color}10` }
                  : undefined
              }
            >
              <span
                className={`text-[10px] font-semibold ${
                  isChecked ? "" : isWeekend ? "text-muted-foreground/30" : "text-muted-foreground/50"
                }`}
                style={isChecked ? { color } : undefined}
              >
                {DAY_ABBR[d]}
              </span>
              <div
                className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold ${
                  isChecked ? "text-white" : "text-muted-foreground/20"
                }`}
                style={
                  isChecked
                    ? { backgroundColor: color }
                    : { backgroundColor: "var(--muted)" }
                }
              >
                {isChecked ? "✓" : "·"}
              </div>
            </button>
          );
        })}
      </div>
      {selectedDays.length > 0 && (
        <p className="text-xs text-muted-foreground mt-2">
          Seleccionados:{" "}
          <strong style={{ color }}>
            {selectedDays.sort().map((d) => DAY_ABBR[d]).join(", ")}
          </strong>
        </p>
      )}
    </>
  );
}

// ─── Main Dialog ──────────────────────────────────────────────
export function EditTaskGroupDialog({
  open,
  onOpenChange,
  taskLabel: initialTaskLabel,
  rules,
  groups,
}: EditTaskGroupDialogProps) {
  const createRule = useCreateRule();
  const updateRule = useUpdateRule();
  const deleteRule = useDeleteRule();
  const isSaving = createRule.isPending || updateRule.isPending || deleteRule.isPending;

  // Derive initial form state from rules
  const firstRule = rules[0];
  const isInitiallyDaily = firstRule?.frequencyType === "daily";
  const initialDays = isInitiallyDaily
    ? [...WEEKDAYS]
    : [...new Set(rules.map((r) => r.dayOfWeek as DayOfWeek))].sort();

  const [form, setForm] = useState<FormState>({
    taskLabel: initialTaskLabel,
    selectedDays: initialDays,
    frequencyType: (firstRule?.frequencyType as FrequencyType) || "weekly",
    isActive: rules.length > 0 ? rules.every((r) => r.isActive) : true,
    // FIX (Tarea 1+2): initialize color/icon from the first rule
    color: firstRule?.color ?? getTaskColor(initialTaskLabel),
    icon: firstRule?.icon ?? "clipboard-list",
  });

  // FIX (Tarea 1+2): use the task color from the form (which reflects the rule's color)
  const color = getTaskColor(form.taskLabel, form.color);
  const config = getTaskConfig(form.taskLabel);
  const isPresetLabel = TASK_LABELS.includes(
    form.taskLabel as (typeof TASK_LABELS)[number]
  );

  // Get affected group IDs
  const affectedGroupIds = [...new Set(rules.map((r) => r.groupId))];
  const affectedGroups = groups?.filter((g) => affectedGroupIds.includes(g.id)) ?? [];

  // Day helpers
  const toggleDay = useCallback((day: DayOfWeek) => {
    setForm((f) => ({
      ...f,
      selectedDays: f.selectedDays.includes(day)
        ? f.selectedDays.filter((d) => d !== day)
        : [...f.selectedDays, day].sort(),
    }));
  }, []);

  const selectWeekdays = useCallback(() => {
    setForm((f) => ({ ...f, selectedDays: [...WEEKDAYS] }));
  }, []);

  const clearDays = useCallback(() => {
    setForm((f) => ({ ...f, selectedDays: [] }));
  }, []);

  // Diff calculation for the summary
  const diff = useMemo(
    () => calculateRuleDiff(form, rules, affectedGroupIds),
    [form, rules, affectedGroupIds],
  );

  // FIX (Tarea 1+2): also detect color/icon changes against the first rule
  const colorChanged = form.color !== (firstRule?.color ?? getTaskColor(initialTaskLabel));
  const iconChanged = form.icon !== (firstRule?.icon ?? "clipboard-list");

  const hasChanges =
    diff.toAdd.length > 0 ||
    diff.toRemove.length > 0 ||
    diff.toUpdate.length > 0 ||
    colorChanged ||
    iconChanged;

  // Save handler
  const handleSubmit = async () => {
    try {
      const trimmedLabel = form.taskLabel.trim();
      if (!trimmedLabel) {
        toast.error("El nombre de la tarea es requerido");
        return;
      }

      if (form.frequencyType !== "daily" && form.selectedDays.length === 0) {
        toast.error("Selecciona al menos un día");
        return;
      }

      if (!hasChanges) {
        toast.info("No hay cambios pendientes");
        return;
      }

      const promises: Promise<unknown>[] = [];

      // Create new rules
      for (const { groupId, day } of diff.toAdd) {
        promises.push(
          createRule.mutateAsync({
            groupId,
            dayOfWeek: day,
            frequencyType: form.frequencyType,
            taskLabel: trimmedLabel,
            color: form.color,
            icon: form.icon,
          })
        );
      }

      // Delete removed rules
      for (const rule of diff.toRemove) {
        promises.push(
          deleteRule.mutateAsync({ id: rule.id, permanent: true })
        );
      }

      // Update changed rules — include ALL existing rules if color/icon changed
      // FIX (Tarea 1+2): when only color/icon changes, diff.toUpdate may be
      // empty, so we need to update all existing rules to propagate the new
      // color/icon to every rule with this taskLabel.
      const rulesToUpdate = colorChanged || iconChanged
        ? rules // update ALL existing rules
        : diff.toUpdate; // only the ones that actually changed
      for (const rule of rulesToUpdate) {
        promises.push(
          updateRule.mutateAsync({
            id: rule.id,
            taskLabel: trimmedLabel,
            dayOfWeek: rule.dayOfWeek,
            frequencyType: form.frequencyType,
            isActive: form.isActive,
            color: form.color,
            icon: form.icon,
          })
        );
      }

      await Promise.all(promises);

      // Summary message
      const parts: string[] = [];
      if (diff.toAdd.length > 0)
        parts.push(`${diff.toAdd.length} creada${diff.toAdd.length !== 1 ? "s" : ""}`);
      if (diff.toRemove.length > 0)
        parts.push(`${diff.toRemove.length} eliminada${diff.toRemove.length !== 1 ? "s" : ""}`);
      if (diff.toUpdate.length > 0)
        parts.push(`${diff.toUpdate.length} actualizada${diff.toUpdate.length !== 1 ? "s" : ""}`);

      toast.success(`Regla "${trimmedLabel}": ${parts.join(", ")}`);
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al guardar cambios"
      );
    }
  };

  const isDaily = form.frequencyType === "daily";
  const displayDays = isDaily ? ([1, 2, 3, 4, 5] as DayOfWeek[]) : form.selectedDays;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto p-0 gap-0">
        {/* ─── Header ──────────────────────────────────────────── */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/20">
          <DialogTitle className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center border"
              style={{
                backgroundColor: `${color}12`,
                borderColor: `${color}30`,
                color: color,
              }}
            >
              <Pencil className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg">Editar: {initialTaskLabel}</span>
              <p className="text-sm font-normal text-muted-foreground mt-0.5">
                Modifica los días y la configuración de esta tarea
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* ─── Live Preview ────────────────────────────────────── */}
        <div className="px-6 py-4 border-b bg-muted/10">
          <div
            className="rounded-xl border-2 overflow-hidden transition-all"
            style={{
              borderColor: form.isActive ? color : "var(--border)",
              opacity: form.isActive ? 1 : 0.6,
            }}
          >
            <div className="px-4 py-3" style={{ backgroundColor: config.bgLight }}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <TaskIcon taskType={form.taskLabel} size="lg" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{form.taskLabel}</span>
                      <Badge
                        variant="secondary"
                        className="text-[10px] h-4 px-1.5 gap-0.5"
                        style={{
                          backgroundColor: form.isActive ? `${color}15` : "var(--muted)",
                          color: form.isActive ? color : "var(--muted-foreground)",
                        }}
                      >
                        <CalendarClock className="h-2.5 w-2.5" />
                        {getFrequencyTypeLabel(form.frequencyType)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isDaily
                        ? "Todos los días hábiles"
                        : form.selectedDays.length > 0
                        ? getDaySummary(new Set(form.selectedDays))
                        : "Sin días seleccionados"}
                      {" · "}
                      {affectedGroups.length === (groups?.length ?? 0)
                        ? "Todos los grupos"
                        : affectedGroups.map((g) => g.name).join(", ")}
                    </p>
                  </div>
                </div>
                <Badge
                  className={`text-[10px] gap-1 border-0 ${
                    form.isActive
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {form.isActive ? (
                    <><Power className="h-2.5 w-2.5" /> Activa</>
                  ) : (
                    <><PowerOff className="h-2.5 w-2.5" /> Inactiva</>
                  )}
                </Badge>
              </div>
              <div className="mt-2.5">
                <WeeklyStrip activeDays={displayDays} color={form.isActive ? color : "#9ca3af"} />
              </div>
            </div>
          </div>
        </div>

        {/* ─── Form Body ───────────────────────────────────────── */}
        <div className="px-6 py-5 space-y-6">
          {/* Active Toggle */}
          <FormSection
            icon={<Power className="h-4 w-4" />}
            title="Estado de la regla"
          >
            <div
              className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3.5 transition-colors ${
                form.isActive
                  ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20"
                  : "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    form.isActive
                      ? "bg-emerald-100 dark:bg-emerald-950/40"
                      : "bg-red-100 dark:bg-red-950/40"
                  }`}
                >
                  {form.isActive ? (
                    <Power className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <PowerOff className="h-5 w-5 text-red-500" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold">
                    {form.isActive ? "Regla activa" : "Regla inactiva"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {form.isActive
                      ? "Genera asignaciones automáticamente"
                      : "No genera asignaciones"}
                  </p>
                </div>
              </div>
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
                className="data-[state=checked]:bg-emerald-600"
              />
            </div>
          </FormSection>

          <Separator />

          {/* Task Name */}
          <FormSection
            icon={<Tag className="h-4 w-4" />}
            title="Nombre de la tarea"
          >
            {isPresetLabel ? (
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
                <SelectTrigger className="h-10">
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
                  <SelectItem value="_custom">✏️ Otra (escribir)...</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={form.taskLabel}
                  onChange={(e) => setForm((f) => ({ ...f, taskLabel: e.target.value }))}
                  placeholder="Escribe el nombre de la tarea..."
                  className="flex-1 h-10"
                  autoFocus
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setForm((f) => ({ ...f, taskLabel: TASK_LABELS[0] }))}
                  className="h-10"
                >
                  ← Listado
                </Button>
              </div>
            )}
          </FormSection>

          <Separator />

          {/* ─── FIX (Tarea 1+2): Color & Icon Selector ────────── */}
          <FormSection
            icon={<Palette className="h-4 w-4" />}
            title="Color e ícono de la tarea"
          >
            {/* Live preview */}
            <div className="flex items-center gap-2 mb-3 p-2 rounded-md bg-muted/40">
              <TaskIcon
                taskType={form.taskLabel || "Tarea"}
                iconName={form.icon}
                color={form.color}
                size="md"
                showBg={true}
              />
              <span className="text-sm font-medium" style={{ color: form.color }}>
                {form.taskLabel || "Nombre de la tarea"}
              </span>
            </div>

            {/* Color palette */}
            <div className="space-y-1.5 mb-3">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Palette className="h-3 w-3" /> Color
              </span>
              <div className="flex flex-wrap gap-1.5">
                {TASK_COLOR_PALETTE.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, color: c.value }))}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${
                      form.color === c.value
                        ? "ring-2 ring-offset-2 ring-offset-background scale-110"
                        : "hover:scale-105"
                    }`}
                    style={{ backgroundColor: c.value, borderColor: form.color === c.value ? c.value : "transparent" }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            {/* Icon gallery */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Shapes className="h-3 w-3" /> Ícono
              </span>
              <div className="max-h-40 overflow-y-auto rounded-md border bg-background p-2 space-y-2">
                {ICON_GALLERY_CATEGORIES.map((cat) => (
                  <div key={cat.label} className="space-y-1">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">{cat.label}</span>
                    <div className="grid grid-cols-10 sm:grid-cols-12 gap-1">
                      {cat.icons.map((iconName) => {
                        const Icon = resolveIcon(iconName);
                        const isSelected = form.icon === iconName;
                        return (
                          <button
                            key={iconName}
                            type="button"
                            onClick={() => setForm((f) => ({ ...f, icon: iconName }))}
                            className={`aspect-square rounded-md flex items-center justify-center transition-all border ${
                              isSelected
                                ? "border-foreground bg-foreground/5 scale-105"
                                : "border-transparent hover:bg-muted hover:scale-105"
                            }`}
                            style={isSelected ? { color: form.color } : undefined}
                            title={iconName}
                          >
                            <Icon className="h-4 w-4" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FormSection>

          <Separator />

          {/* Frequency */}
          <FormSection
            icon={<CalendarClock className="h-4 w-4" />}
            title="Frecuencia de rotación"
          >
            <div className="grid grid-cols-3 gap-2.5">
              {FREQUENCY_OPTIONS.map((opt) => {
                const isSelected = form.frequencyType === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, frequencyType: opt.value as FrequencyType }))}
                    className={`relative flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border-2 cursor-pointer transition-all text-center ${
                      isSelected
                        ? "shadow-sm"
                        : "border-transparent bg-muted/30 hover:bg-muted/50"
                    }`}
                    style={
                      isSelected
                        ? { borderColor: color, backgroundColor: `${color}08` }
                        : undefined
                    }
                  >
                    {isSelected && (
                      <div
                        className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: color }}
                      >
                        <Check className="h-2.5 w-2.5 text-white" />
                      </div>
                    )}
                    <CalendarClock
                      className="h-4 w-4"
                      style={{ color: isSelected ? color : "var(--muted-foreground)" }}
                    />
                    <span
                      className="text-xs font-semibold"
                      style={{ color: isSelected ? color : "var(--muted-foreground)" }}
                    >
                      {opt.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground leading-tight">
                      {opt.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </FormSection>

          {/* Days (only for non-daily) */}
          {form.frequencyType !== "daily" && (
            <>
              <Separator />
              <FormSection
                icon={<CalendarClock className="h-4 w-4" />}
                title="Días de la semana"
              >
                <DaySelector
                  selectedDays={form.selectedDays}
                  color={color}
                  onToggleDay={toggleDay}
                  onSelectWeekdays={selectWeekdays}
                  onClearDays={clearDays}
                />
              </FormSection>
            </>
          )}

          <Separator />

          {/* Affected Groups */}
          <FormSection
            icon={<Users className="h-4 w-4" />}
            title="Grupos afectados"
          >
            <div className="space-y-1.5">
              {affectedGroups.map((g) => {
                const groupRules = rules.filter((r) => r.groupId === g.id);
                const currentDays = new Set(groupRules.map((r) => r.dayOfWeek as DayOfWeek));
                return (
                  <div
                    key={g.id}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border bg-muted/15"
                    style={{ borderLeftWidth: "4px", borderLeftColor: g.color }}
                  >
                    <Building2 className="h-4 w-4 shrink-0" style={{ color: g.color }} />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{g.name}</span>
                      <p className="text-[11px] text-muted-foreground">
                        {groupRules.length} regla{groupRules.length !== 1 ? "s" : ""} actual{groupRules.length !== 1 ? "es" : ""}
                        {" · "}
                        {isDaily
                          ? "Diaria"
                          : [...currentDays].sort().map((d) => DAY_ABBR[d]).join(", ")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </FormSection>

          {/* Change Summary */}
          {hasChanges && (
            <>
              <Separator />
              <div
                className="p-4 rounded-xl border space-y-2"
                style={{
                  backgroundColor: `${color}06`,
                  borderColor: `${color}25`,
                }}
              >
                <p className="text-sm font-semibold flex items-center gap-2">
                  <RefreshCw className="h-3.5 w-3.5" style={{ color }} />
                  Resumen de cambios
                </p>
                <div className="space-y-1.5 text-xs">
                  {diff.toAdd.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px] gap-0.5">
                        <Plus className="h-2.5 w-2.5" />
                        {diff.toAdd.length}
                      </Badge>
                      <span className="text-muted-foreground">
                        regla{diff.toAdd.length !== 1 ? "s" : ""} nueva{diff.toAdd.length !== 1 ? "s" : ""} (
                        {diff.toAdd.map(({ day }) => DAY_ABBR[day]).join(", ")})
                      </span>
                    </div>
                  )}
                  {diff.toRemove.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Badge className="bg-red-100 text-red-700 border-0 text-[10px] gap-0.5">
                        <Minus className="h-2.5 w-2.5" />
                        {diff.toRemove.length}
                      </Badge>
                      <span className="text-muted-foreground">
                        regla{diff.toRemove.length !== 1 ? "s" : ""} eliminada{diff.toRemove.length !== 1 ? "s" : ""} (
                        {diff.toRemove.map((r) => DAY_ABBR[r.dayOfWeek]).join(", ")})
                      </span>
                    </div>
                  )}
                  {diff.toUpdate.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px] gap-0.5">
                        <RefreshCw className="h-2.5 w-2.5" />
                        {diff.toUpdate.length}
                      </Badge>
                      <span className="text-muted-foreground">
                        regla{diff.toUpdate.length !== 1 ? "s" : ""} actualizada{diff.toUpdate.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* ─── Sticky Footer ──────────────────────────────────── */}
        <div className="sticky bottom-0 border-t bg-background px-6 py-4 flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 h-10"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            style={{ backgroundColor: BRAND.PRIMARY }}
            disabled={isSaving || !hasChanges}
            className="flex-1 gap-2 h-10"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Guardar Cambios
              </>
            )}
          </Button>
        </div>

        {!hasChanges && !isSaving && (
          <div className="px-6 pb-4 -mt-2">
            <p className="text-xs text-center text-muted-foreground">
              No hay cambios pendientes
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
