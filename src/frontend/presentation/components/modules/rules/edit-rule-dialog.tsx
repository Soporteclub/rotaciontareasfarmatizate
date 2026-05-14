"use client";

import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Building2,
  Clock,
  Power,
  PowerOff,
  Tag,
  CalendarClock,
  Users,
  Plus,
  RefreshCw,
  Minus,
  Info,
} from "lucide-react";
import { TASK_LABELS, DAY_NAMES } from "@/backend/domain/entities/types";
import type { DayOfWeek, FrequencyType } from "@/backend/domain/entities/types";
import { toast } from "sonner";
import {
  useUpdateRule,
  useCreateRule,
  useGroups,
} from "@/frontend/presentation/lib/query/hooks";
import type { RuleResponse } from "@/frontend/presentation/lib/query/hooks";
import {
  TaskIcon,
  getTaskColor,
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

// ─── Main Dialog ──────────────────────────────────────────────
interface EditRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: RuleResponse | null;
}

export function EditRuleDialog({
  open,
  onOpenChange,
  rule,
}: EditRuleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/20">
          <DialogTitle className="flex items-center gap-3">
            {rule && (
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center border"
                style={{
                  backgroundColor: `${getTaskColor(rule.taskLabel)}12`,
                  borderColor: `${getTaskColor(rule.taskLabel)}30`,
                  color: getTaskColor(rule.taskLabel),
                }}
              >
                <Pencil className="h-5 w-5" />
              </div>
            )}
            <div>
              <span className="text-lg">Editar Regla</span>
              {rule && (
                <p className="text-sm font-normal text-muted-foreground mt-0.5">
                  Modifica los campos de esta regla de asignación
                </p>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>
        {rule && (
          <EditRuleForm key={rule.id} rule={rule} onOpenChange={onOpenChange} />
        )}
      </DialogContent>
    </Dialog>
  );
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
  originalDay,
  onToggleDay,
  onSelectWeekdays,
  onClearDays,
}: {
  selectedDays: DayOfWeek[];
  color: string;
  originalDay: DayOfWeek;
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
          const isOriginal = d === originalDay;
          const isWeekend = d === 0 || d === 6;
          return (
            <button
              key={d}
              type="button"
              onClick={() => onToggleDay(d)}
              className={`relative flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 cursor-pointer transition-all select-none ${
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
              {isOriginal && isChecked && (
                <div
                  className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center z-10"
                  style={{ backgroundColor: color }}
                >
                  <span className="text-[7px] text-white font-bold">✓</span>
                </div>
              )}
              <span
                className={`text-[10px] font-semibold ${
                  isChecked
                    ? ""
                    : isWeekend
                    ? "text-muted-foreground/30"
                    : "text-muted-foreground/50"
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
            {getDaySummary(new Set(selectedDays))}
          </strong>
        </p>
      )}
    </>
  );
}

// ─── Edit Form ────────────────────────────────────────────────
interface EditRuleFormProps {
  rule: RuleResponse;
  onOpenChange: (open: boolean) => void;
}

function EditRuleForm({ rule, onOpenChange }: EditRuleFormProps) {
  const updateRule = useUpdateRule();
  const createRule = useCreateRule();
  const { data: groups } = useGroups();
  const isSaving = updateRule.isPending || createRule.isPending;

  const originalDay = rule.dayOfWeek as DayOfWeek;

  const [taskLabel, setTaskLabel] = useState(rule.taskLabel);
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>([originalDay]);
  const [frequencyType, setFrequencyType] = useState<FrequencyType>(
    (rule.frequencyType as FrequencyType) || "weekly"
  );
  const [isActive, setIsActive] = useState(rule.isActive);

  const color = getTaskColor(taskLabel);
  const config = getTaskConfig(taskLabel);

  // Resolve group info
  const group = groups?.find((g) => g.id === rule.groupId);
  const groupName = group?.name ?? "Sin grupo";
  const groupColor = group?.color ?? "#9ca3af";

  const isPresetLabel = TASK_LABELS.includes(
    taskLabel as (typeof TASK_LABELS)[number]
  );

  // Day helpers
  const toggleDay = useCallback((day: DayOfWeek) => {
    setSelectedDays((prev) =>
      prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day].sort()
    );
  }, []);

  const selectWeekdays = useCallback(() => {
    setSelectedDays([...WEEKDAYS]);
  }, []);

  const clearDays = useCallback(() => {
    setSelectedDays([]);
  }, []);

  // Compute extra days (days that need new rules created)
  const extraDays = useMemo(
    () => selectedDays.filter((d) => d !== originalDay),
    [selectedDays, originalDay]
  );

  const removedOriginalDay = useMemo(
    () => !selectedDays.includes(originalDay),
    [selectedDays, originalDay]
  );

  // Check if form has changes
  const hasChanges = useMemo(() => {
    const labelChanged = taskLabel.trim() !== rule.taskLabel;
    const daysChanged =
      selectedDays.length !== 1 || selectedDays[0] !== originalDay;
    const freqChanged =
      frequencyType !== ((rule.frequencyType as FrequencyType) || "weekly");
    const activeChanged = isActive !== rule.isActive;

    return labelChanged || daysChanged || freqChanged || activeChanged;
  }, [taskLabel, selectedDays, frequencyType, isActive, rule, originalDay]);

  const handleSubmit = async () => {
    try {
      const trimmedLabel = taskLabel.trim();
      if (!trimmedLabel) {
        toast.error("La etiqueta de tarea es requerida");
        return;
      }

      if (frequencyType !== "daily" && selectedDays.length === 0) {
        toast.error("Selecciona al menos un día");
        return;
      }

      const promises: Promise<unknown>[] = [];

      if (removedOriginalDay) {
        // Original day was deselected — still update the rule to the first selected day
        // (or if no days selected and frequency is daily, just update)
        if (frequencyType !== "daily" && selectedDays.length > 0) {
          // Move the original rule to the first selected day
          promises.push(
            updateRule.mutateAsync({
              id: rule.id,
              taskLabel: trimmedLabel,
              dayOfWeek: selectedDays[0],
              frequencyType,
              isActive,
            })
          );
          // Create rules for remaining days
          const remainingDays = selectedDays.slice(1);
          for (const day of remainingDays) {
            promises.push(
              createRule.mutateAsync({
                groupId: rule.groupId,
                dayOfWeek: day,
                frequencyType,
                taskLabel: trimmedLabel,
              })
            );
          }
        } else if (frequencyType === "daily") {
          promises.push(
            updateRule.mutateAsync({
              id: rule.id,
              taskLabel: trimmedLabel,
              dayOfWeek: 1,
              frequencyType,
              isActive,
            })
          );
        }
      } else {
        // Original day is still selected — update the existing rule
        promises.push(
          updateRule.mutateAsync({
            id: rule.id,
            taskLabel: trimmedLabel,
            dayOfWeek: originalDay,
            frequencyType,
            isActive,
          })
        );

        // Create additional rules for extra days
        for (const day of extraDays) {
          promises.push(
            createRule.mutateAsync({
              groupId: rule.groupId,
              dayOfWeek: day,
              frequencyType,
              taskLabel: trimmedLabel,
            })
          );
        }
      }

      await Promise.all(promises);

      // Build summary message
      const parts: string[] = [];
      const updatedCount = promises.length - extraDays.length - (removedOriginalDay ? 0 : 0);
      const createdCount = removedOriginalDay
        ? Math.max(0, selectedDays.length - 1)
        : extraDays.length;

      if (updatedCount > 0) parts.push("regla actualizada");
      if (createdCount > 0)
        parts.push(`${createdCount} regla${createdCount !== 1 ? "s" : ""} creada${createdCount !== 1 ? "s" : ""}`);

      toast.success(parts.length > 0 ? parts.join(", ") : "Regla actualizada correctamente");
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al actualizar regla"
      );
    }
  };

  const isDaily = frequencyType === "daily";
  const displayDays = isDaily
    ? ([1, 2, 3, 4, 5] as DayOfWeek[])
    : selectedDays;

  return (
    <div>
      {/* ─── Live Preview Card ──────────────────────────────── */}
      <div className="px-6 py-4 border-b bg-muted/10">
        <div
          className="rounded-xl border-2 overflow-hidden transition-all"
          style={{
            borderColor: isActive ? color : "var(--border)",
            opacity: isActive ? 1 : 0.6,
          }}
        >
          <div className="px-4 py-3" style={{ backgroundColor: config.bgLight }}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <TaskIcon taskType={taskLabel} size="lg" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{taskLabel}</span>
                    <Badge
                      variant="secondary"
                      className="text-[10px] h-4 px-1.5 gap-0.5"
                      style={{
                        backgroundColor: isActive ? `${color}15` : "var(--muted)",
                        color: isActive ? color : "var(--muted-foreground)",
                        borderColor: isActive ? `${color}30` : "transparent",
                      }}
                    >
                      <Clock className="h-2.5 w-2.5" />
                      {getFrequencyTypeLabel(frequencyType)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isDaily
                      ? "Lunes a Viernes"
                      : selectedDays.length > 0
                      ? getDaySummary(new Set(selectedDays))
                      : "Sin días seleccionados"}{" "}
                    ·{" "}
                    <span
                      className="font-medium"
                      style={{ color: isActive ? groupColor : undefined }}
                    >
                      {groupName}
                    </span>
                  </p>
                </div>
              </div>
              <Badge
                className={`text-[10px] gap-1 border-0 ${
                  isActive
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {isActive ? (
                  <>
                    <Power className="h-2.5 w-2.5" /> Activa
                  </>
                ) : (
                  <>
                    <PowerOff className="h-2.5 w-2.5" /> Inactiva
                  </>
                )}
              </Badge>
            </div>
            <div className="mt-2.5">
              <WeeklyStrip activeDays={displayDays} color={isActive ? color : "#9ca3af"} />
            </div>
          </div>
        </div>
      </div>

      {/* ─── Form Body ──────────────────────────────────────── */}
      <div className="px-6 py-5 space-y-6">
        {/* ─── Active Toggle ─────────────────────────────────── */}
        <FormSection
          icon={<Power className="h-4 w-4" />}
          title="Estado de la regla"
        >
          <div
            className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3.5 transition-colors ${
              isActive
                ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20"
                : "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isActive
                    ? "bg-emerald-100 dark:bg-emerald-950/40"
                    : "bg-red-100 dark:bg-red-950/40"
                }`}
              >
                {isActive ? (
                  <Power className="h-5 w-5 text-emerald-600" />
                ) : (
                  <PowerOff className="h-5 w-5 text-red-500" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {isActive ? "Regla activa" : "Regla inactiva"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isActive
                    ? "Esta regla genera asignaciones automáticamente"
                    : "Esta regla no genera asignaciones"}
                </p>
              </div>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
              className="data-[state=checked]:bg-emerald-600"
            />
          </div>
        </FormSection>

        <Separator />

        {/* ─── Task Name ─────────────────────────────────────── */}
        <FormSection
          icon={<Tag className="h-4 w-4" />}
          title="Nombre de la tarea"
        >
          {isPresetLabel ? (
            <Select
              value={taskLabel}
              onValueChange={(v) => {
                if (v === "_custom") {
                  setTaskLabel("");
                } else {
                  setTaskLabel(v);
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
                value={taskLabel}
                onChange={(e) => setTaskLabel(e.target.value)}
                placeholder="Escribe el nombre de la tarea..."
                className="flex-1 h-10"
                autoFocus
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTaskLabel(TASK_LABELS[0])}
                className="h-10"
              >
                ← Listado
              </Button>
            </div>
          )}
        </FormSection>

        <Separator />

        {/* ─── Frequency ─────────────────────────────────────── */}
        <FormSection
          icon={<CalendarClock className="h-4 w-4" />}
          title="Frecuencia de rotación"
        >
          <div className="grid grid-cols-3 gap-2.5">
            {FREQUENCY_OPTIONS.map((opt) => {
              const isSelected = frequencyType === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFrequencyType(opt.value as FrequencyType)}
                  className={`relative flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border-2 cursor-pointer transition-all text-center group ${
                    isSelected
                      ? "shadow-sm"
                      : "border-transparent bg-muted/30 hover:bg-muted/50"
                  }`}
                  style={
                    isSelected
                      ? {
                          borderColor: color,
                          backgroundColor: `${color}08`,
                        }
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
                  <Clock
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

        {/* ─── Days of week (multi-select, only if not daily) ── */}
        {frequencyType !== "daily" && (
          <>
            <Separator />
            <FormSection
              icon={<CalendarClock className="h-4 w-4" />}
              title="Días de la semana"
            >
              <DaySelector
                selectedDays={selectedDays}
                color={color}
                originalDay={originalDay}
                onToggleDay={toggleDay}
                onSelectWeekdays={selectWeekdays}
                onClearDays={clearDays}
              />
            </FormSection>

            {/* ─── Multi-day info / summary ───────────────────── */}
            {selectedDays.length > 1 && (
              <div
                className="p-4 rounded-xl border space-y-2"
                style={{
                  backgroundColor: `${color}06`,
                  borderColor: `${color}25`,
                }}
              >
                <p className="text-sm font-semibold flex items-center gap-2">
                  <Info className="h-3.5 w-3.5" style={{ color }} />
                  Resumen de cambios
                </p>
                <div className="space-y-1.5 text-xs">
                  {/* Original rule update */}
                  {!removedOriginalDay && (
                    <div className="flex items-center gap-2">
                      <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px] gap-0.5">
                        <RefreshCw className="h-2.5 w-2.5" />
                        1
                      </Badge>
                      <span className="text-muted-foreground">
                        regla actualizada ({DAY_ABBR[originalDay]})
                      </span>
                    </div>
                  )}
                  {removedOriginalDay && selectedDays.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px] gap-0.5">
                        <RefreshCw className="h-2.5 w-2.5" />
                        1
                      </Badge>
                      <span className="text-muted-foreground">
                        regla movida a {DAY_ABBR[selectedDays[0]]}
                      </span>
                    </div>
                  )}
                  {/* New rules to create */}
                  {(removedOriginalDay ? selectedDays.length - 1 : extraDays.length) > 0 && (
                    <div className="flex items-center gap-2">
                      <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px] gap-0.5">
                        <Plus className="h-2.5 w-2.5" />
                        {removedOriginalDay ? selectedDays.length - 1 : extraDays.length}
                      </Badge>
                      <span className="text-muted-foreground">
                        regla{extraDays.length !== 1 ? "s" : ""} nueva{extraDays.length !== 1 ? "s" : ""} (
                        {(removedOriginalDay ? selectedDays.slice(1) : extraDays)
                          .map((d) => DAY_ABBR[d])
                          .join(", ")}
                        )
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Se crearán reglas adicionales para los días extra con el mismo grupo y configuración.
                </p>
              </div>
            )}

            {/* Info when original day is deselected */}
            {removedOriginalDay && selectedDays.length <= 1 && (
              <div
                className="p-3 rounded-xl border flex items-start gap-2"
                style={{
                  backgroundColor: "rgba(234, 179, 8, 0.06)",
                  borderColor: "rgba(234, 179, 8, 0.25)",
                }}
              >
                <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  Desleccionaste el día original ({DAY_ABBR[originalDay]}).
                  {selectedDays.length > 0
                    ? ` La regla se moverá a ${DAY_ABBR[selectedDays[0]]}.`
                    : " Selecciona al menos un día."}
                </p>
              </div>
            )}
          </>
        )}

        <Separator />

        {/* ─── Group (read-only info) ────────────────────────── */}
        <FormSection
          icon={<Users className="h-4 w-4" />}
          title="Grupo asignado"
        >
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-muted/20"
            style={{ borderLeftWidth: "4px", borderLeftColor: groupColor }}
          >
            <Building2
              className="h-5 w-5 shrink-0"
              style={{ color: groupColor }}
            />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold">{groupName}</span>
              <p className="text-[11px] text-muted-foreground">
                El grupo no se puede cambiar después de crear la regla
              </p>
            </div>
            <Badge variant="outline" className="text-[10px] shrink-0">
              Solo lectura
            </Badge>
          </div>
        </FormSection>
      </div>

      {/* ─── Sticky Footer ─────────────────────────────────── */}
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
    </div>
  );
}
