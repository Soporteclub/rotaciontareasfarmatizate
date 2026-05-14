"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus } from "lucide-react";
import type { GroupResponse } from "@/frontend/presentation/lib/query/hooks";
import { BRAND } from "@/frontend/presentation/lib/brand";
import { AdminOnly } from "@/frontend/presentation/components/shared/admin-guard";

export interface EmployeeFormData {
  name: string;
  position: string;
  area: string;
  groupId: string;
  joinDate: string;
  isActive: boolean;
  leaveDate: string; // empty string when active, ISO date string when inactive
}

export type FormUpdater = (prev: EmployeeFormData) => EmployeeFormData;

interface EmployeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: EmployeeFormData;
  onFormChange: (updater: FormUpdater) => void;
  isEdit: boolean;
  groups: GroupResponse[] | undefined;
  defaultGroupId: string;
  onSubmit: () => Promise<void>;
  isPending: boolean;
}

export function EmployeeFormDialog({
  open,
  onOpenChange,
  form,
  onFormChange,
  isEdit,
  groups,
  defaultGroupId,
  onSubmit,
  isPending,
}: EmployeeFormDialogProps) {
  const resolvedGroupId =
    form.groupId || (defaultGroupId !== "_all" ? defaultGroupId : "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AdminOnly module="employees" fallback={null}>
      <DialogTrigger asChild>
        <Button
          className="flex items-center gap-2 text-white"
          style={{ backgroundColor: BRAND.PRIMARY }}
        >
          <UserPlus className="h-4 w-4" />
          Nuevo Empleado
        </Button>
      </DialogTrigger>
      </AdminOnly>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar Empleado" : "Crear Nuevo Empleado"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Nombre */}
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input
              value={form.name}
              onChange={(e) =>
                onFormChange((f) => ({ ...f, name: e.target.value }))
              }
              placeholder="Nombre completo"
            />
          </div>

          {/* Cargo */}
          <div className="space-y-2">
            <Label>Cargo (opcional)</Label>
            <Input
              value={form.position}
              onChange={(e) =>
                onFormChange((f) => ({ ...f, position: e.target.value }))
              }
              placeholder="Ej: Auxiliar, Administrador..."
            />
          </div>

          {/* Área */}
          <div className="space-y-2">
            <Label>Área (opcional)</Label>
            <Input
              value={form.area}
              onChange={(e) =>
                onFormChange((f) => ({ ...f, area: e.target.value }))
              }
              placeholder="Ej: Farmacia, Bodega, Oficina..."
            />
          </div>

          {/* Grupo */}
          <div className="space-y-2">
            <Label>Grupo</Label>
            <Select
              value={resolvedGroupId}
              onValueChange={(v) => onFormChange((f) => ({ ...f, groupId: v }))}
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
          </div>

          {/* Fecha de Ingreso */}
          <div className="space-y-2">
            <Label>Fecha de Ingreso</Label>
            <Input
              type="date"
              value={form.joinDate}
              onChange={(e) =>
                onFormChange((f) => ({ ...f, joinDate: e.target.value }))
              }
            />
          </div>

          {/* Estado activo — shown in both create and edit modes */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="text-sm font-medium">Empleado Activo</Label>
              <p className="text-xs text-muted-foreground">
                Desactiva para retirar al empleado sin eliminar su historial
              </p>
            </div>
            <Switch
              checked={form.isActive}
              onCheckedChange={(checked) =>
                onFormChange((f) => ({
                  ...f,
                  isActive: checked,
                  // When reactivating, clear leaveDate; when deactivating, default to today
                  leaveDate: checked ? "" : new Date().toISOString().split("T")[0],
                }))
              }
            />
          </div>

          {/* Fecha de Salida — only visible when inactive */}
          {!form.isActive && (
            <div className="space-y-2">
              <Label>Fecha de Salida</Label>
              <Input
                type="date"
                value={form.leaveDate}
                onChange={(e) =>
                  onFormChange((f) => ({ ...f, leaveDate: e.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Fecha en la que el empleado dejó de estar activo
              </p>
            </div>
          )}

          <Button
            onClick={onSubmit}
            className="w-full text-white"
            style={{ backgroundColor: BRAND.PRIMARY }}
            disabled={isPending}
          >
            {isEdit ? "Guardar Cambios" : "Crear Empleado"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
