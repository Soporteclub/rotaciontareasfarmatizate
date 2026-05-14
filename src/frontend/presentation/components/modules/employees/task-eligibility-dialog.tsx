"use client";

import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, ToggleLeft, ToggleRight, Lock, AlertCircle, RotateCcw } from "lucide-react";
import {
  useEligibility,
  useToggleEligibility,
} from "@/frontend/presentation/lib/query/eligibility-hooks";
import { useRules } from "@/frontend/presentation/lib/query/hooks";
import type { EmployeeResponse, GroupResponse } from "@/frontend/presentation/lib/query/hooks";
import { toast } from "sonner";
import { useUIStore } from "@/frontend/presentation/hooks/use-ui-store";

interface TaskEligibilityDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  employee: EmployeeResponse | null;
  groups: GroupResponse[] | undefined;
}

export function TaskEligibilityDialog({
  open,
  onOpenChange,
  employee,
  groups,
}: TaskEligibilityDialogProps) {
  const isAdmin = useUIStore((s) => s.adminModules.employees === true);
  const requestAdminUnlock = useUIStore((s) => s.requestAdminUnlock);
  const { data: eligibility, isLoading: loadingEligibility } = useEligibility(
    employee?.id ?? null
  );

  // Get rules for the employee's group to find available tasks
  const { data: groupRules } = useRules(employee?.groupId, true);

  const toggleEligibility = useToggleEligibility();

  // Extract unique task labels from the group's rules
  const availableTasks = useMemo(() => {
    if (!groupRules) return [];
    const taskSet = new Set<string>();
    groupRules.forEach((r) => {
      if (r.taskLabel && r.isActive) taskSet.add(r.taskLabel);
    });
    return Array.from(taskSet).sort();
  }, [groupRules]);

  // Build a map of taskName -> isEnabled from eligibility data
  const eligibilityMap = useMemo(() => {
    const map = new Map<string, boolean>();
    if (eligibility) {
      eligibility.forEach((e) => {
        map.set(e.taskName, e.isEnabled);
      });
    }
    return map;
  }, [eligibility]);

  const groupName = groups?.find((g) => g.id === employee?.groupId)?.name ?? "";
  const groupColor =
    groups?.find((g) => g.id === employee?.groupId)?.color ?? "#6b7280";

  const handleToggle = (taskName: string, currentValue: boolean) => {
    if (!employee) return;
    if (!isAdmin) {
      requestAdminUnlock("employees");
      return;
    }
    const newValue = !currentValue;
    toggleEligibility.mutate(
      { employeeId: employee.id, taskName, isEnabled: newValue },
      {
        onSuccess: (data) => {
          const deletedCount = data?.deletedAssignments ?? 0;
          if (newValue) {
            toast.success(
              `${taskName} activada para ${employee.name}`,
              {
                description: "Esta actividad se incluirá en la próxima regeneración.",
                icon: <ToggleRight className="h-4 w-4 text-emerald-600" />,
              }
            );
          } else {
            // Task was disabled - show info about removed assignments
            const desc = deletedCount > 0
              ? `Se eliminaron ${deletedCount} asignación${deletedCount > 1 ? "es" : ""} futura${deletedCount > 1 ? "s" : ""}. Regenera para redistribuir.`
              : "No había asignaciones futuras que eliminar.";
            toast.success(
              `${taskName} desactivada para ${employee.name}`,
              {
                description: desc,
                icon: <AlertCircle className="h-4 w-4 text-amber-500" />,
                duration: 6000,
              }
            );
          }
        },
        onError: () => {
          toast.error("Error al actualizar actividad");
        },
      }
    );
  };

  // Count disabled tasks
  const disabledCount = availableTasks.filter((t) => {
    const val = eligibilityMap.has(t) ? eligibilityMap.get(t)! : true;
    return !val;
  }).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ToggleRight className="h-5 w-5" />
            Actividades de {employee?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Employee info badge */}
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ backgroundColor: groupColor }}
            >
              {employee?.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium">{employee?.name}</p>
              <p className="text-xs text-muted-foreground">{groupName}</p>
            </div>
          </div>

          <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg space-y-1">
            {isAdmin ? (
              <>
                <p>Activa o desactiva las actividades que este empleado puede realizar.</p>
                <p className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  Al desactivar, se eliminan las asignaciones futuras. Regenera para redistribuir.
                </p>
              </>
            ) : (
              <p>Solo lectura. Ingresa la clave admin para modificar las actividades.</p>
            )}
          </div>

          {/* Task toggles */}
          {loadingEligibility ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : availableTasks.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              No hay actividades configuradas para este grupo.
              <br />
              Crea reglas primero en el módulo de Reglas.
            </div>
          ) : (
            <div className="space-y-2">
              {availableTasks.map((taskName) => {
                // If no eligibility record exists, default to enabled (true)
                const isEnabled = eligibilityMap.has(taskName)
                  ? eligibilityMap.get(taskName)!
                  : true;

                return (
                  <div
                    key={taskName}
                    className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 transition-colors hover:bg-muted/50 ${
                      !isEnabled ? "border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/10" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ToggleLeft
                        className={`h-4 w-4 shrink-0 ${
                          isEnabled ? "text-emerald-600" : "text-amber-500"
                        }`}
                      />
                      <span
                        className={`text-sm font-medium truncate ${
                          !isEnabled ? "text-muted-foreground line-through" : ""
                        }`}
                      >
                        {taskName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant={isEnabled ? "default" : "outline"}
                        className={`text-[10px] px-1.5 py-0 ${
                          isEnabled
                            ? "bg-emerald-100 text-emerald-700 border-0"
                            : "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800"
                        }`}
                      >
                        {isEnabled ? "Activa" : "Inactiva"}
                      </Badge>
                      {isAdmin ? (
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={() => handleToggle(taskName, isEnabled)}
                          disabled={toggleEligibility.isPending}
                          className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-amber-500"
                        />
                      ) : (
                        <button
                          onClick={() => requestAdminUnlock("employees")}
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          title="Requiere clave admin para modificar"
                        >
                          <Lock className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Summary */}
          {availableTasks.length > 0 && (
            <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground pt-1">
              <span>
                {availableTasks.length - disabledCount} de {availableTasks.length} activas
              </span>
              {disabledCount > 0 && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <RotateCcw className="h-3 w-3" />
                    {disabledCount} inactiva{disabledCount > 1 ? "s" : ""} — regenera para redistribuir
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
