"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { BRAND_PRIMARY } from "./employee-columns";

export interface EmployeeFormData {
  name: string;
  email: string;
  groupId: string;
  joinDate: string;
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
      <DialogTrigger asChild>
        <Button
          className="flex items-center gap-2 text-white"
          style={{ backgroundColor: BRAND_PRIMARY }}
        >
          <UserPlus className="h-4 w-4" />
          Nuevo Empleado
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar Empleado" : "Nuevo Empleado"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
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
          <div className="space-y-2">
            <Label>Email (opcional)</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) =>
                onFormChange((f) => ({ ...f, email: e.target.value }))
              }
              placeholder="correo@ejemplo.com"
            />
          </div>
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
          {!isEdit && (
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
          )}
          <Button
            onClick={onSubmit}
            className="w-full text-white"
            style={{ backgroundColor: BRAND_PRIMARY }}
            disabled={isPending}
          >
            {isEdit ? "Actualizar" : "Crear Empleado"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
