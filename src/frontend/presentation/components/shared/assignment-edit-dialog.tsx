"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Pencil, Lock, Loader2, User, Calendar, Tag } from "lucide-react";
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
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(assignment.employeeId);
  const updateAssignment = useUpdateAssignment();

  // Get employees for the same group
  const { data: groupEmployees } = useEmployees(assignment.groupId, true);

  const group = groups?.find((g) => g.id === assignment.groupId);
  const isLocked = assignment.isLocked;
  const activeEmployees = groupEmployees?.filter((e) => e.isActive) ?? [];

  const dateObj = new Date(assignment.date);
  const dateDisplay = format(dateObj, "EEEE d 'de' MMMM, yyyy", { locale: es });

  const handleSave = async () => {
    if (selectedEmployeeId === assignment.employeeId) {
      onOpenChange(false);
      return;
    }

    try {
      await updateAssignment.mutateAsync({
        id: assignment.id,
        employeeId: selectedEmployeeId,
      });
      const newEmp = activeEmployees.find((e) => e.id === selectedEmployeeId);
      toast.success(`Asignación actualizada: ahora ${newEmp?.name ?? "otro empleado"}`);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar");
    }
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Pencil className="h-5 w-5" />
          {isLocked ? "Detalle de Asignación" : "Editar Asignación"}
        </DialogTitle>
        <DialogDescription>
          {isLocked
            ? "Esta asignación está bloqueada porque es histórica y no se puede modificar."
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

          {/* Status */}
          {isLocked && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" />
              <span>Bloqueada (histórica)</span>
            </div>
          )}
        </div>

        {/* Employee selector */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Empleado asignado
          </Label>
          {isLocked ? (
            <div className="px-3 py-2 border rounded-md bg-muted/30 text-sm">
              {assignment.employee?.name ?? "Desconocido"}
            </div>
          ) : (
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
          )}
        </div>

        {/* Save button */}
        {!isLocked && (
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
