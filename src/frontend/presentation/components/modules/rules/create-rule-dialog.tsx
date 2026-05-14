"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
import { Loader2, Sparkles, Users, Check, ArrowRight } from "lucide-react";
import { TASK_LABELS } from "@/backend/domain/entities/types";
import type { DayOfWeek, FrequencyType } from "@/backend/domain/entities/types";
import { toast } from "sonner";
import { TaskIcon, getTaskColor } from "@/frontend/presentation/components/shared/task-icon";
import { BRAND } from "@/frontend/presentation/lib/brand";
import { useCreateRule } from "@/frontend/presentation/lib/query/hooks";
import type { GroupResponse } from "@/frontend/presentation/lib/query/hooks";
import {
  TEMPLATES,
  ALL_DAYS,
  WEEKDAYS,
  DAY_ABBR,
  FREQUENCY_OPTIONS,
  getTaskConfig,
  getFrequencyTypeLabel,
} from "./rules-constants";

interface CreateRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: GroupResponse[] | undefined;
  selectedGroupId: string;
}

interface FormState {
  taskLabel: string;
  selectedDays: DayOfWeek[];
  frequencyType: FrequencyType;
  groupId: string;
  applyToAllGroups: boolean;
}

const INITIAL_FORM: FormState = {
  taskLabel: "",
  selectedDays: [],
  frequencyType: "weekly",
  groupId: "",
  applyToAllGroups: false,
};

// ─── Step Indicator ──────────────────────────────────────────
function StepIndicator({
  number,
  label,
  isComplete,
}: {
  number: number;
  label: string;
  isComplete: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
          isComplete
            ? "bg-emerald-500 text-white"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {isComplete ? <Check className="h-3 w-3" /> : number}
      </div>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </div>
  );
}

export function CreateRuleDialog({
  open,
  onOpenChange,
  groups,
  selectedGroupId,
}: CreateRuleDialogProps) {
  const createRule = useCreateRule();
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  const resetForm = useCallback(() => {
    setForm(INITIAL_FORM);
    setSelectedTemplate("");
  }, []);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      onOpenChange(open);
      if (!open) resetForm();
    },
    [onOpenChange, resetForm]
  );

  const applyTemplate = useCallback((templateId: string) => {
    const template = TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    setSelectedTemplate(templateId);
    setForm((f) => ({
      ...f,
      taskLabel: template.taskLabel,
      selectedDays: template.days,
      applyToAllGroups: template.applyToAllGroups,
      frequencyType: template.frequencyType,
    }));
  }, []);

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

  const handleSubmit = async () => {
    try {
      const taskLabel = form.taskLabel.trim();
      if (!taskLabel) {
        toast.error("El nombre de la tarea es requerido");
        return;
      }

      if (form.frequencyType !== "daily" && form.selectedDays.length === 0) {
        toast.error("Selecciona al menos un día");
        return;
      }

      const targetGroupIds = form.applyToAllGroups
        ? (groups?.map((g) => g.id) ?? [])
        : [form.groupId || selectedGroupId];

      if (
        targetGroupIds.length === 0 ||
        (!form.applyToAllGroups && !targetGroupIds[0])
      ) {
        toast.error("Selecciona un grupo");
        return;
      }

      const promises: Promise<unknown>[] = [];

      for (const groupId of targetGroupIds) {
        if (form.frequencyType === "daily") {
          promises.push(
            createRule.mutateAsync({
              groupId,
              dayOfWeek: 1,
              frequencyType: form.frequencyType,
              taskLabel,
            })
          );
        } else {
          for (const day of form.selectedDays) {
            promises.push(
              createRule.mutateAsync({
                groupId,
                dayOfWeek: day,
                frequencyType: form.frequencyType,
                taskLabel,
              })
            );
          }
        }
      }

      await Promise.all(promises);

      const totalCreated = promises.length;
      toast.success(
        `Se crearon ${totalCreated} regla${totalCreated !== 1 ? "s" : ""}${
          form.applyToAllGroups ? " para todos los grupos" : ""
        }`
      );
      onOpenChange(false);
      resetForm();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al crear regla(s)"
      );
    }
  };

  const taskConfig = getTaskConfig(form.taskLabel);
  const taskColor = form.taskLabel ? getTaskColor(form.taskLabel) : "#888";

  // Step completion
  const step1Complete = form.taskLabel.trim().length > 0;
  const step2Complete =
    form.frequencyType === "daily" || form.selectedDays.length > 0;
  const step3Complete =
    form.applyToAllGroups ||
    form.groupId ||
    selectedGroupId;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: BRAND.PRIMARY_LIGHT, color: BRAND.PRIMARY }}
            >
              <Sparkles className="h-4 w-4" />
            </div>
            Nueva Regla de Asignación
          </DialogTitle>
          <DialogDescription>
            Configura qué tarea se rota, en qué días y para qué grupo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* ─── Quick Templates ──────────────────────────────── */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Plantillas rápidas
              </Label>
              {selectedTemplate && (
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <Check className="h-2.5 w-2.5" />
                  Aplicada
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.map((template) => {
                const templateColor = getTaskColor(template.taskLabel || "custom");
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => applyTemplate(template.id)}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border-2 text-left transition-all ${
                      selectedTemplate === template.id
                        ? "shadow-sm"
                        : "hover:shadow-sm"
                    }`}
                    style={
                      selectedTemplate === template.id
                        ? {
                            borderColor: templateColor,
                            backgroundColor: `${templateColor}08`,
                          }
                        : { borderColor: "transparent" }
                    }
                  >
                    <TaskIcon
                      taskType={template.taskLabel || "custom"}
                      size="md"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {template.label}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {template.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* ─── Task Name ────────────────────────────────────── */}
          <div className="space-y-2">
            <StepIndicator
              number={1}
              label="Nombre de la tarea"
              isComplete={step1Complete}
            />
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
                  <SelectItem value="_custom">✏️ Otra (escribir)...</SelectItem>
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

          {/* ─── Frequency ────────────────────────────────────── */}
          <div className="space-y-2">
            <StepIndicator
              number={2}
              label="Frecuencia"
              isComplete={step2Complete}
            />
            <Select
              value={form.frequencyType}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, frequencyType: v as FrequencyType }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{opt.label}</span>
                      <span className="text-muted-foreground text-xs">
                        — {opt.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ─── Days (only for non-daily) ────────────────────── */}
          {form.frequencyType !== "daily" && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Días de la semana
                </Label>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[11px] px-2"
                    onClick={selectWeekdays}
                  >
                    Lun-Vie
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[11px] px-2"
                    onClick={clearDays}
                  >
                    Limpiar
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                {ALL_DAYS.map((d) => {
                  const isChecked = form.selectedDays.includes(d);
                  const isWeekend = d === 0 || d === 6;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDay(d)}
                      className={`flex flex-col items-center gap-0.5 px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-lg border-2 cursor-pointer transition-all select-none ${
                        isChecked
                          ? "shadow-sm"
                          : isWeekend
                          ? "border-transparent bg-muted/20 hover:bg-muted/40"
                          : "border-transparent bg-muted/30 hover:bg-muted/50"
                      }`}
                      style={
                        isChecked
                          ? {
                              borderColor: taskColor,
                              backgroundColor: `${taskColor}10`,
                            }
                          : undefined
                      }
                    >
                      <span
                        className={`text-[10px] font-semibold ${
                          isChecked ? "" : isWeekend ? "text-muted-foreground/30" : "text-muted-foreground/50"
                        }`}
                        style={isChecked ? { color: taskColor } : undefined}
                      >
                        {DAY_ABBR[d]}
                      </span>
                      <div
                        className={`w-5 h-5 sm:w-6 sm:h-6 rounded flex items-center justify-center text-[10px] sm:text-xs font-bold ${
                          isChecked
                            ? "text-white"
                            : "text-muted-foreground/20"
                        }`}
                        style={
                          isChecked
                            ? { backgroundColor: taskColor }
                            : { backgroundColor: "var(--muted)" }
                        }
                      >
                        {isChecked ? "✓" : "·"}
                      </div>
                    </button>
                  );
                })}
              </div>
              {form.selectedDays.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Seleccionados:{" "}
                  <strong>
                    {form.selectedDays
                      .sort()
                      .map((d) => DAY_ABBR[d])
                      .join(", ")}
                  </strong>
                </p>
              )}
            </div>
          )}

          {/* ─── Group ────────────────────────────────────────── */}
          <div className="space-y-2">
            <StepIndicator
              number={form.frequencyType !== "daily" ? 3 : 3}
              label="Grupo"
              isComplete={step3Complete}
            />
            <div className="space-y-2.5">
              <label
                htmlFor="all-groups"
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
              >
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
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  Aplicar a todos los grupos
                </span>
              </label>
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
                            className="w-2.5 h-2.5 rounded-full shrink-0"
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
                <div className="flex items-center gap-2 flex-wrap px-1">
                  {groups?.map((g) => (
                    <Badge
                      key={g.id}
                      variant="outline"
                      className="text-xs gap-1"
                      style={{ borderColor: g.color, color: g.color }}
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: g.color }}
                      />
                      {g.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* ─── Summary ──────────────────────────────────────── */}
          {form.taskLabel &&
            (form.frequencyType === "daily" || form.selectedDays.length > 0) && (
              <div
                className="p-4 rounded-xl border"
                style={{
                  backgroundColor: taskConfig.bgLight,
                  borderColor: taskConfig.border,
                }}
              >
                <p className="text-sm font-semibold mb-2">Resumen</p>
                <div className="flex items-center gap-2 mb-1.5">
                  <TaskIcon
                    taskType={form.taskLabel}
                    size="sm"
                    showBg={false}
                  />
                  <span className="font-medium">{form.taskLabel}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>Días:</span>
                  <span className="font-medium text-foreground">
                    {form.frequencyType === "daily"
                      ? "Lun-Vie (todos los hábiles)"
                      : form.selectedDays
                          .sort()
                          .map((d) => DAY_ABBR[d])
                          .join(", ")}
                  </span>
                  <span>Frecuencia:</span>
                  <span className="font-medium text-foreground">
                    {getFrequencyTypeLabel(form.frequencyType)}
                  </span>
                  <span>Grupo:</span>
                  <span className="font-medium text-foreground">
                    {form.applyToAllGroups
                      ? "Todos los grupos"
                      : groups?.find(
                          (g) =>
                            g.id === (form.groupId || selectedGroupId)
                        )?.name ?? "Sin grupo"}
                  </span>
                  <span>Reglas a crear:</span>
                  <span className="font-bold text-foreground">
                    {form.frequencyType === "daily"
                      ? form.applyToAllGroups
                        ? groups?.length ?? 0
                        : 1
                      : (form.applyToAllGroups
                          ? groups?.length ?? 0
                          : 1) * form.selectedDays.length}
                  </span>
                </div>
              </div>
            )}

          {/* ─── Submit ───────────────────────────────────────── */}
          <Button
            onClick={handleSubmit}
            className="w-full gap-2"
            style={{ backgroundColor: BRAND.PRIMARY }}
            disabled={createRule.isPending}
            size="lg"
          >
            {createRule.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creando reglas...
              </>
            ) : (
              <>
                Crear Regla(s)
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
