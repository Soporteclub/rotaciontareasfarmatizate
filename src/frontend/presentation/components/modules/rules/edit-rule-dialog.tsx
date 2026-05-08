"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Pencil } from "lucide-react";
import { TASK_LABELS } from "@/backend/domain/entities/types";
import type { DayOfWeek, FrequencyType } from "@/backend/domain/entities/types";
import { toast } from "sonner";
import { useUpdateRule } from "@/frontend/presentation/lib/query/hooks";
import type { RuleResponse } from "@/frontend/presentation/lib/query/hooks";
import { FREQUENCY_OPTIONS, ALL_DAYS, DAY_ABBR, getFrequencyTypeLabel } from "./rules-constants";

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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Editar Regla
          </DialogTitle>
          <DialogDescription>
            Modifica los campos de esta regla de asignación.
          </DialogDescription>
        </DialogHeader>
        {rule && (
          <EditRuleForm
            key={rule.id}
            rule={rule}
            onOpenChange={onOpenChange}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface EditRuleFormProps {
  rule: RuleResponse;
  onOpenChange: (open: boolean) => void;
}

function EditRuleForm({ rule, onOpenChange }: EditRuleFormProps) {
  const updateRule = useUpdateRule();
  const [taskLabel, setTaskLabel] = useState(rule.taskLabel);
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>(rule.dayOfWeek as DayOfWeek);
  const [frequencyType, setFrequencyType] = useState<FrequencyType>(
    (rule.frequencyType as FrequencyType) || "weekly"
  );

  const handleSubmit = async () => {
    try {
      const trimmedLabel = taskLabel.trim();
      if (!trimmedLabel) {
        toast.error("La etiqueta de tarea es requerida");
        return;
      }

      await updateRule.mutateAsync({
        id: rule.id,
        taskLabel: trimmedLabel,
        dayOfWeek,
        frequencyType,
      });

      toast.success("Regla actualizada");
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al actualizar regla"
      );
    }
  };

  const isPresetLabel = TASK_LABELS.includes(
    taskLabel as (typeof TASK_LABELS)[number]
  );

  return (
    <>
      <div className="space-y-4">
        {/* Nombre de tarea */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Nombre de la tarea</Label>
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
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tarea" />
              </SelectTrigger>
              <SelectContent>
                {TASK_LABELS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
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
                className="flex-1"
                autoFocus
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTaskLabel(TASK_LABELS[0])}
              >
                ← Listado
              </Button>
            </div>
          )}
        </div>

        {/* Frecuencia */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Frecuencia</Label>
          <Select
            value={frequencyType}
            onValueChange={(v) => setFrequencyType(v as FrequencyType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FREQUENCY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label} — {opt.description}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Día de la semana (solo si no es diaria) */}
        {frequencyType !== "daily" && (
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Día de la semana</Label>
            <Select
              value={String(dayOfWeek)}
              onValueChange={(v) =>
                setDayOfWeek(parseInt(v) as DayOfWeek)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_DAYS.map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    {DAY_ABBR[d]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          style={{ backgroundColor: "#f15a24" }}
          disabled={updateRule.isPending}
        >
          {updateRule.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Guardando...
            </>
          ) : (
            "Guardar Cambios"
          )}
        </Button>
      </DialogFooter>
    </>
  );
}
