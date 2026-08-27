"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Pencil, Lock, Loader2, User, Calendar, Tag, ShieldAlert, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { BRAND } from "@/frontend/presentation/lib/brand";
import { useUIStore } from "@/frontend/presentation/hooks/use-ui-store";
import {
  useUpdateAssignment,
  useEmployees,
} from "@/frontend/presentation/lib/query/hooks";
import type { AssignmentResponse, GroupResponse } from "@/frontend/presentation/lib/query/hooks";

interface AssignmentEditDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  assignment: AssignmentResponse | null;
  groups: GroupResponse[] | undefined;
}

function AssignmentEditDialogContent({
  assignment,
  groups,
  onOpenChange,
}: {
  assignment: AssignmentResponse;
  groups: GroupResponse[] | undefined;
  onOpenChange: (v: boolean) => void;
}) {
  const isAdmin = useUIStore((s) => s.isAdmin);
  const requestAdminUnlock = useUIStore((s) => s.requestAdminUnlock);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(assignment.employeeId);
  const [forceMode, setForceMode] = useState(false);
  const updateAssignment = useUpdateAssignment();

  // Get employees for the same group
  const { data: groupEmployees } = useEmployees(assignment.groupId, true);

  const group = groups?.find((g) => g.id === assignment.groupId);
  const isLocked = assignment.isLocked;
  const activeEmployees = groupEmployees?.filter((e) => e.isActive) ?? [];

  // FIX (FE-05): parse the date as a LOCAL date (year, month, day) so that
  // date-fns `format` shows the SAME day the calendar shows. The backend stores
  // dates at UTC midnight (e.g. "2026-07-15T00:00:00.000Z"); on a UTC-5 client,
  // `new Date(that)` -> 2026-07-14T19:00:00 LOCAL, and date-fns (which uses
  // LOCAL time) would display "martes 14 de julio" while the calendar cell
  // shows "miércoles 15". Extracting the YYYY-MM-DD substring and building a
  // local Date keeps both in sync.
  const dateStr = String(assignment.date).substring(0, 10);
  const [yyyy, mm, dd] = dateStr.split("-").map(Number);
  const dateObj = new Date(yyyy, (mm ?? 1) - 1, dd ?? 1);
  const dateDisplay = format(dateObj, "EEEE d 'de' MMMM, yyyy", { locale: es });

  // Determine if the assignment date is in the past (before today UTC)
  const today = new Date();
  const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const assignmentDate = new Date(assignment.date);
  const isPast = assignmentDate.getTime() < todayUTC.getTime();

  // Only admin can edit unlocked assignments, or past assignments with force override
  const canEdit = isAdmin && (!isLocked || forceMode);
  const canRequestUnlock = !isAdmin && !isLocked;

  const handleSave = async () => {
    if (selectedEmployeeId === assignment.employeeId) {
      onOpenChange(false);
      return;
    }

    const adminKey = useUIStore.getState().adminKey;
    if (!adminKey) {
      toast.error("Se requiere clave de administrador. Desbloquea desde la barra lateral.");
      onOpenChange(false);
      requestAdminUnlock();
      return;
    }

    try {
      await updateAssignment.mutateAsync({
        id: assignment.id,
        employeeId: selectedEmployeeId,
        adminKey,
        force: forceMode || undefined,
      });
      const newEmp = activeEmployees.find((e) => e.id === selectedEmployeeId);
      toast.success(`Asignación actualizada: ahora ${newEmp?.name ?? "otro empleado"}`);
      setForceMode(false);
      onOpenChange(false);
    } catch (err) {
      // FIX (FE-04): detect 403 (admin key invalid/expired) and force re-unlock.
      const msg = err instanceof Error ? err.message : "Error al actualizar";
      if (msg.includes("clave de administrador") || msg.includes("403")) {
        toast.error("Tu sesión de admin expiró o la clave cambió. Vuelve a ingresarla.");
        useUIStore.getState().lockAdmin(); // clears adminKey + opens modal
        onOpenChange(false);
      } else {
        toast.error(msg);
      }
    }
  };

  const handleEmergencyUnlock = () => {
    setForceMode(true);
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {canEdit ? (
            <>
              <Pencil className="h-5 w-5" />
              {forceMode ? "Editar histórico (emergencia)" : "Editar Asignación"}
            </>
          ) : (
            <>
              <Calendar className="h-5 w-5" />
              Detalle de Asignación
            </>
          )}
        </DialogTitle>
        <DialogDescription>
          {isLocked && !forceMode
            ? "Esta asignación está bloqueada porque es histórica y no se puede modificar."
            : isPast && !forceMode
              ? "Esta asignación corresponde a un día pasado. Solo se puede modificar con modo emergencia."
              : !isAdmin
                ? "Solo un administrador puede modificar asignaciones."
                : forceMode
                  ? "Modo emergencia activado: podés modificar esta asignación histórica."
                  : "Cambia el empleado asignado a esta tarea."}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        {/* Assignment details */}
        <div className="space-y-3 bg-muted/50 rounded-lg p-4">
          {/* Date */}
          <div className="flex items-center gap-3 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="capitalize font-medium">{dateDisplay}</span>
            {isPast && (
              <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Pasado
              </Badge>
            )}
          </div>

          {/* Task */}
          <div className="flex items-center gap-3 text-sm">
            <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-medium">{assignment.taskName}</span>
            {group && (
              <Badge
                variant="outline"
                className="text-[10px] ml-auto"
                style={{
                  borderColor: group.color,
                  color: group.color,
                }}
              >
                {group.name}
              </Badge>
            )}
          </div>

          {/* Status badges */}
          {isLocked && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" />
              <span>Bloqueada (histórica)</span>
            </div>
          )}
          {!isAdmin && !isLocked && !isPast && (
            <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
              <ShieldAlert className="h-3 w-3" />
              <span>Protegida — requiere clave de administrador</span>
            </div>
          )}
          {forceMode && (
            <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
              <AlertTriangle className="h-3 w-3" />
              <span>Modo emergencia activado — esta modificación quedará registrada en auditoría</span>
            </div>
          )}
        </div>

        {/* Employee selector or read-only display */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Empleado asignado
          </Label>
          {canEdit ? (
            <Select
              value={selectedEmployeeId}
              onValueChange={setSelectedEmployeeId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar empleado" />
              </SelectTrigger>
              <SelectContent>
                {activeEmployees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name}
                    {emp.position ? ` — ${emp.position}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="px-3 py-2 border rounded-md bg-muted/30 text-sm">
              {assignment.employee?.name ?? "Desconocido"}
            </div>
          )}
        </div>

        {/* Action buttons */}
        {canEdit && (
          <Button
            onClick={handleSave}
            className="w-full"
            style={{ backgroundColor: BRAND.PRIMARY }}
            disabled={
              updateAssignment.isPending ||
              selectedEmployeeId === assignment.employeeId
            }
          >
            {updateAssignment.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Guardando...
              </>
            ) : (
              "Guardar Cambio"
            )}
          </Button>
        )}

        {/* Emergency override button for past assignments */}
        {isAdmin && isPast && !isLocked && !forceMode && (
          <Button
            variant="destructive"
            className="w-full gap-2"
            onClick={handleEmergencyUnlock}
          >
            <AlertTriangle className="h-4 w-4" />
            Modificar histórico (emergencia)
          </Button>
        )}

        {/* Unlock button for non-admins */}
        {canRequestUnlock && (
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => {
              onOpenChange(false);
              requestAdminUnlock();
            }}
          >
            <Lock className="h-4 w-4" />
            Desbloquear como administrador
          </Button>
        )}
      </div>
    </DialogContent>
  );
}

export function AssignmentEditDialog({
  open,
  onOpenChange,
  assignment,
  groups,
}: AssignmentEditDialogProps) {
  if (!assignment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* key={assignment.id} forces re-mount when a different assignment is selected,
          so the internal selectedEmployeeId state resets correctly */}
      <AssignmentEditDialogContent
        key={assignment.id}
        assignment={assignment}
        groups={groups}
        onOpenChange={onOpenChange}
      />
    </Dialog>
  );
}
