"use client";

import { useState } from "react";
import {
  useEmployees,
  useGroups,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
} from "@/presentation/lib/query/hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Pencil, Trash2, UserCircle, UserPlus, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";

export function EmployeesModule() {
  const { data: groups, isLoading: loadingGroups } = useGroups();
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const { data: employees, isLoading: loadingEmployees } = useEmployees(
    selectedGroupId || undefined,
    true
  );
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    groupId: "",
    joinDate: new Date().toISOString().split("T")[0],
  });

  const resetForm = () => {
    setForm({ name: "", email: "", groupId: "", joinDate: new Date().toISOString().split("T")[0] });
    setEditingId(null);
  };

  const handleEdit = (emp: Record<string, unknown>) => {
    const e = emp as { id: string; name: string; email: string | null; groupId: string; joinDate: string };
    setForm({
      name: e.name,
      email: e.email ?? "",
      groupId: e.groupId,
      joinDate: e.joinDate.split("T")[0],
    });
    setEditingId(e.id);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingId) {
        await updateEmployee.mutateAsync({
          id: editingId,
          name: form.name,
          email: form.email || null,
          groupId: form.groupId || undefined,
        });
        toast.success("Empleado actualizado");
      } else {
        if (!form.groupId && !selectedGroupId) {
          toast.error("Selecciona un grupo");
          return;
        }
        await createEmployee.mutateAsync({
          name: form.name,
          email: form.email || null,
          groupId: form.groupId || selectedGroupId,
          joinDate: form.joinDate,
        });
        toast.success("Empleado creado");
      }
      setDialogOpen(false);
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    }
  };

  const handleToggleActive = async (emp: Record<string, unknown>) => {
    const e = emp as { id: string; isActive: boolean; name: string };
    try {
      await updateEmployee.mutateAsync({
        id: e.id,
        isActive: !e.isActive,
        leaveDate: e.isActive ? new Date().toISOString() : null,
      });
      toast.success(e.isActive ? `${e.name} desactivado` : `${e.name} reactivado`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  };

  const isLoading = loadingGroups || loadingEmployees;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Empleados</h1>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const activeEmployees = employees?.filter((e) => e.isActive) ?? [];
  const inactiveEmployees = employees?.filter((e) => !e.isActive) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Empleados</h1>
          <p className="text-muted-foreground">Gestiona el personal de los grupos</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Nuevo Empleado
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Empleado" : "Nuevo Empleado"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Nombre completo"
                />
              </div>
              <div className="space-y-2">
                <Label>Email (opcional)</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="correo@ejemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Grupo</Label>
                <Select
                  value={form.groupId || selectedGroupId}
                  onValueChange={(v) => setForm((f) => ({ ...f, groupId: v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Seleccionar grupo" /></SelectTrigger>
                  <SelectContent>
                    {groups?.map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!editingId && (
                <div className="space-y-2">
                  <Label>Fecha de Ingreso</Label>
                  <Input
                    type="date"
                    value={form.joinDate}
                    onChange={(e) => setForm((f) => ({ ...f, joinDate: e.target.value }))}
                  />
                </div>
              )}
              <Button onClick={handleSubmit} className="w-full" disabled={createEmployee.isPending || updateEmployee.isPending}>
                {editingId ? "Actualizar" : "Crear Empleado"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Group filter */}
      <div className="flex items-center gap-2">
        <Label className="text-sm">Filtrar por grupo:</Label>
        <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Todos los grupos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos los grupos</SelectItem>
            {groups?.map((g) => (
              <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Employee list */}
      {employees && employees.length > 0 ? (
        <div className="space-y-3">
          {/* Active employees */}
          {activeEmployees.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Activos ({activeEmployees.length})
              </h3>
              {activeEmployees.map((emp) => (
                <Card key={emp.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <UserCircle className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{emp.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {emp.email ?? "Sin email"} • Ingresó: {new Date(emp.joinDate).toLocaleDateString("es")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {groups?.find((g) => g.id === emp.groupId)?.name ?? "Sin grupo"}
                      </Badge>
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(emp as unknown as Record<string, unknown>)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleToggleActive(emp as unknown as Record<string, unknown>)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Inactive employees */}
          {inactiveEmployees.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Inactivos ({inactiveEmployees.length})
              </h3>
              {inactiveEmployees.map((emp) => (
                <Card key={emp.id} className="opacity-60">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                        <UserCircle className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-sm line-through">{emp.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Salida: {emp.leaveDate ? new Date(emp.leaveDate).toLocaleDateString("es") : "N/A"}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => handleToggleActive(emp as unknown as Record<string, unknown>)}>
                      Reactivar
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <UserCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No hay empleados</h3>
            <p className="text-muted-foreground">Agrega empleados a los grupos para comenzar.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
