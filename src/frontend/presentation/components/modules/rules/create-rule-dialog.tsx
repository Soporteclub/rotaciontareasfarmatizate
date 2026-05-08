"use client";

import { useState, useCallback } from "react";
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
import { Loader2, Sparkles, Users } from "lucide-react";
import { TASK_LABELS } from "@/backend/domain/entities/types";
import type { DayOfWeek } from "@/backend/domain/entities/types";
import { toast } from "sonner";
import { TaskIcon } from "@/frontend/presentation/components/shared/task-icon";
import { useCreateRule } from "@/frontend/presentation/lib/query/hooks";
import type { GroupResponse } from "@/frontend/presentation/lib/query/hooks";
import {
  TEMPLATES,
  ALL_DAYS,
  WEEKDAYS,
  DAY_ABBR,
  getTaskConfig,
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
  frequency: string;
  groupId: string;
  applyToAllGroups: boolean;
}

const INITIAL_FORM: FormState = {
  taskLabel: "",
  selectedDays: [],
  frequency: "1",
  groupId: "",
  applyToAllGroups: false,
};

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
      onOpenChange(false);
      resetForm();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al crear regla(s)"
      );
    }
  };

  const taskConfig = getTaskConfig(form.taskLabel);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Nueva Regla de Asignación
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Paso 1: Plantilla */}
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

          {/* Paso 2: Nombre de tarea */}
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

          {/* Paso 3: Días de la semana */}
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
                  .map((d) => DAY_ABBR[d])
                  .join(", ")}
              </p>
            )}
          </div>

          {/* Paso 4: Grupo */}
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

          {/* Paso 5: Frecuencia */}
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

          {/* Resumen */}
          {form.taskLabel && form.selectedDays.length > 0 && (
            <div
              className="p-3 rounded-lg border"
              style={{
                backgroundColor: taskConfig.bgLight,
                borderColor: taskConfig.border,
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
  );
}
