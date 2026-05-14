"use client";

import { useState, useMemo } from "react";
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
  ChevronRight,
  Tag,
  CalendarClock,
  Users,
} from "lucide-react";
import { TASK_LABELS, DAY_NAMES } from "@/backend/domain/entities/types";
import type { DayOfWeek, FrequencyType } from "@/backend/domain/entities/types";
import { toast } from "sonner";
import {
  useUpdateRule,
  useGroups,
} from "@/frontend/presentation/lib/query/hooks";
import type { RuleResponse } from "@/frontend/presentation/lib/query/hooks";
import {
  TaskIcon,
  getTaskColor,
} from "@/frontend/presentation/components/shared/task-icon";
import {
  FREQUENCY_OPTIONS,
  ALL_DAYS,
  DAY_ABBR,
  getFrequencyTypeLabel,
  getTaskConfig,
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

// ─── Edit Form ────────────────────────────────────────────────
interface EditRuleFormProps {
  rule: RuleResponse;
  onOpenChange: (open: boolean) => void;
}

function EditRuleForm({ rule, onOpenChange }: EditRuleFormProps) {
  const updateRule = useUpdateRule();
  const { data: groups } = useGroups();

  const [taskLabel, setTaskLabel] = useState(rule.taskLabel);
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>(
    rule.dayOfWeek as DayOfWeek
  );
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

  // Check if form has changes
  const hasChanges = useMemo(() => {
    return (
      taskLabel !== rule.taskLabel ||
      dayOfWeek !== rule.dayOfWeek ||
      frequencyType !== ((rule.frequencyType as FrequencyType) || "weekly") ||
      isActive !== rule.isActive
    );
  }, [taskLabel, dayOfWeek, frequencyType, isActive, rule]);

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
        isActive,
      });

      toast.success("Regla actualizada correctamente");
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
    : [dayOfWeek];

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
                      : DAY_NAMES[dayOfWeek]}{" "}
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

        {/* ─── Day of week (only if not daily) ───────────────── */}
        {frequencyType !== "daily" && (
          <>
            <Separator />
            <FormSection
              icon={<CalendarClock className="h-4 w-4" />}
              title="Día de la semana"
            >
              <div className="grid grid-cols-7 gap-1.5">
                {ALL_DAYS.map((d) => {
                  const isSelected = dayOfWeek === d;
                  const isWeekend = d === 0 || d === 6;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDayOfWeek(d)}
                      className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 cursor-pointer transition-all select-none ${
                        isSelected
                          ? "shadow-sm"
                          : isWeekend
                          ? "border-transparent bg-muted/15 hover:bg-muted/30"
                          : "border-transparent bg-muted/25 hover:bg-muted/40"
                      }`}
                      style={
                        isSelected
                          ? {
                              borderColor: color,
                              backgroundColor: `${color}10`,
                            }
                          : undefined
                      }
                    >
                      <span
                        className={`text-[10px] font-semibold ${
                          isSelected
                            ? ""
                            : isWeekend
                            ? "text-muted-foreground/30"
                            : "text-muted-foreground/50"
                        }`}
                        style={isSelected ? { color } : undefined}
                      >
                        {DAY_ABBR[d]}
                      </span>
                      <div
                        className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold ${
                          isSelected ? "text-white" : "text-muted-foreground/20"
                        }`}
                        style={
                          isSelected
                            ? { backgroundColor: color }
                            : { backgroundColor: "var(--muted)" }
                        }
                      >
                        {isSelected ? "✓" : "·"}
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <ChevronRight className="h-3 w-3" style={{ color }} />
                Seleccionado:{" "}
                <strong style={{ color }}>{DAY_NAMES[dayOfWeek]}</strong>
              </p>
            </FormSection>
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
          style={{ backgroundColor: "#f15a24" }}
          disabled={updateRule.isPending || !hasChanges}
          className="flex-1 gap-2 h-10"
        >
          {updateRule.isPending ? (
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

      {!hasChanges && !updateRule.isPending && (
        <div className="px-6 pb-4 -mt-2">
          <p className="text-xs text-center text-muted-foreground">
            No hay cambios pendientes
          </p>
        </div>
      )}
    </div>
  );
}
