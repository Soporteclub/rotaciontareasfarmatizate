"use client";

import { useState } from "react";
import { useGroups, useCreateGroup, useDeleteGroup, useUpdateGroup } from "@/presentation/lib/query/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Users, Check, X } from "lucide-react";
import { TASK_TYPES } from "@/domain/entities/types";
import { toast } from "sonner";

const COLORS = [
  "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#84cc16", "#f97316",
];

export function GroupsModule() {
  const { data: groups, isLoading } = useGroups(true);
  const createGroup = useCreateGroup();
  const updateGroup = useUpdateGroup();
  const deleteGroup = useDeleteGroup();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    taskType: "cleaning" as string,
    color: "#10b981",
  });

  const resetForm = () => {
    setForm({ name: "", description: "", taskType: "cleaning", color: "#10b981" });
    setEditingId(null);
  };

  const handleEdit = (group: Record<string, unknown>) => {
    const g = group as { id: string; name: string; description: string | null; taskType: string; color: string };
    setForm({
      name: g.name,
      description: g.description ?? "",
      taskType: g.taskType,
      color: g.color,
    });
    setEditingId(g.id);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingId) {
        await updateGroup.mutateAsync({
          id: editingId,
          name: form.name,
          description: form.description || null,
          taskType: form.taskType,
          color: form.color,
        });
        toast.success("Grupo actualizado");
      } else {
        await createGroup.mutateAsync({
          name: form.name,
          description: form.description || null,
          taskType: form.taskType,
          color: form.color,
        });
        toast.success("Grupo creado");
      }
      setDialogOpen(false);
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Desactivar este grupo?")) return;
    try {
      await deleteGroup.mutateAsync(id);
      toast.success("Grupo desactivado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Grupos</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6"><div className="h-20 bg-muted rounded" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Grupos</h1>
          <p className="text-muted-foreground">Gestiona los grupos de tareas rotativas</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Grupo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Grupo" : "Nuevo Grupo"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ej: Piso 2, Cocina, Recepción"
                />
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Descripción opcional del grupo"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Tarea</Label>
                <Select value={form.taskType} onValueChange={(v) => setForm((f) => ({ ...f, taskType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TASK_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      className={`w-8 h-8 rounded-full border-2 transition-transform ${form.color === c ? "border-foreground scale-110" : "border-transparent"}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setForm((f) => ({ ...f, color: c }))}
                    />
                  ))}
                </div>
              </div>
              <Button onClick={handleSubmit} className="w-full" disabled={createGroup.isPending || updateGroup.isPending}>
                {editingId ? "Actualizar" : "Crear Grupo"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {groups && groups.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => {
            const g = group as Record<string, unknown>;
            const empCount = (g.employees as unknown[] | undefined)?.filter((e) => (e as Record<string, unknown>).isActive).length ?? 0;
            const ruleCount = (g.rules as unknown[] | undefined)?.length ?? 0;
            return (
              <Card key={group.id} className={!group.isActive ? "opacity-60" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: group.color }} />
                      <CardTitle className="text-base">{group.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant={group.isActive ? "default" : "secondary"}>
                        {group.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 pt-2">
                  <p className="text-sm text-muted-foreground mb-2">
                    {group.description ?? TASK_TYPES.find((t) => t.value === group.taskType)?.label ?? group.taskType}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {empCount}</span>
                    <span>{ruleCount} reglas</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(group)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {group.isActive && (
                      <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleDelete(group.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No hay grupos</h3>
            <p className="text-muted-foreground">Crea tu primer grupo para comenzar.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
