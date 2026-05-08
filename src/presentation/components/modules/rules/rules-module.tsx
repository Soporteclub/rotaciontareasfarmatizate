"use client";

import { useState } from "react";
import {
  useRules,
  useGroups,
  useCreateRule,
  useDeleteRule,
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
import { Plus, Trash2, ClipboardList, CalendarDays, Tag } from "lucide-react";
import { DAY_NAMES, TASK_LABELS } from "@/domain/entities/types";
import { toast } from "sonner";

export function RulesModule() {
  const { data: groups, isLoading: loadingGroups } = useGroups();
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const { data: rules, isLoading: loadingRules } = useRules(
    selectedGroupId || undefined,
    true
  );
  const createRule = useCreateRule();
  const deleteRule = useDeleteRule();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    groupId: "",
    dayOfWeek: "2", // Tuesday default
    frequency: "1",
    taskLabel: "",
  });

  const resetForm = () => {
    setForm({ groupId: "", dayOfWeek: "2", frequency: "1", taskLabel: "" });
  };

  const handleSubmit = async () => {
    try {
      const groupId = form.groupId || selectedGroupId;
      if (!groupId) {
        toast.error("Selecciona un grupo");
        return;
      }
      if (!form.taskLabel.trim()) {
        toast.error("La etiqueta de tarea es requerida");
        return;
      }
      await createRule.mutateAsync({
        groupId,
        dayOfWeek: parseInt(form.dayOfWeek),
        frequency: parseInt(form.frequency),
        taskLabel: form.taskLabel.trim(),
      });
      toast.success("Regla creada");
      setDialogOpen(false);
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear regla");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Desactivar esta regla?")) return;
    try {
      await deleteRule.mutateAsync(id);
      toast.success("Regla desactivada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  };

  const isLoading = loadingGroups || loadingRules;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Reglas</h1>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const activeRules = rules?.filter((r) => r.isActive) ?? [];
  const inactiveRules = rules?.filter((r) => !r.isActive) ?? [];

  // Group rules by taskLabel for cleaner display
  const rulesByTask = activeRules.reduce<Record<string, typeof activeRules>>((acc, rule) => {
    const key = rule.taskLabel || "Sin etiqueta";
    if (!acc[key]) acc[key] = [];
    acc[key].push(rule);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reglas</h1>
          <p className="text-muted-foreground">Configura los días y frecuencias de rotación por tarea</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nueva Regla
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva Regla de Asignación</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
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
              <div className="space-y-2">
                <Label>Tarea (etiqueta)</Label>
                <Select
                  value={TASK_LABELS.includes(form.taskLabel as typeof TASK_LABELS[number]) ? form.taskLabel : "_custom"}
                  onValueChange={(v) => {
                    if (v === "_custom") {
                      setForm((f) => ({ ...f, taskLabel: "" }));
                    } else {
                      setForm((f) => ({ ...f, taskLabel: v }));
                    }
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Seleccionar tarea" /></SelectTrigger>
                  <SelectContent>
                    {TASK_LABELS.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                    <SelectItem value="_custom">Otra (escribir)...</SelectItem>
                  </SelectContent>
                </Select>
                {!TASK_LABELS.includes(form.taskLabel as typeof TASK_LABELS[number]) && (
                  <Input
                    value={form.taskLabel}
                    onChange={(e) => setForm((f) => ({ ...f, taskLabel: e.target.value }))}
                    placeholder="Nombre de la tarea"
                    className="mt-2"
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label>Día de la Semana</Label>
                <Select
                  value={form.dayOfWeek}
                  onValueChange={(v) => setForm((f) => ({ ...f, dayOfWeek: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {([0, 1, 2, 3, 4, 5, 6] as const).map((d) => (
                      <SelectItem key={d} value={String(d)}>{DAY_NAMES[d]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Frecuencia (cada N semanas)</Label>
                <Select
                  value={form.frequency}
                  onValueChange={(v) => setForm((f) => ({ ...f, frequency: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Cada semana</SelectItem>
                    <SelectItem value="2">Cada 2 semanas</SelectItem>
                    <SelectItem value="3">Cada 3 semanas</SelectItem>
                    <SelectItem value="4">Cada 4 semanas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSubmit} className="w-full" disabled={createRule.isPending}>
                Crear Regla
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

      {/* Rules grouped by task */}
      {activeRules.length > 0 || inactiveRules.length > 0 ? (
        <div className="space-y-4">
          {Object.entries(rulesByTask).map(([taskLabel, taskRules]) => (
            <div key={taskLabel} className="space-y-2">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">{taskLabel}</h3>
                <Badge variant="secondary" className="text-xs">
                  {taskRules.length} {taskRules.length === 1 ? "regla" : "reglas"}
                </Badge>
              </div>
              <div className="space-y-1.5 pl-6">
                {taskRules.map((rule) => {
                  const groupName = groups?.find((g) => g.id === rule.groupId)?.name ?? "??";
                  return (
                    <Card key={rule.id}>
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <CalendarDays className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {DAY_NAMES[rule.dayOfWeek as keyof typeof DAY_NAMES]}
                              {rule.frequency > 1 && ` (cada ${rule.frequency} semanas)`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Desde: {new Date(rule.validFrom).toLocaleDateString("es")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{groupName}</Badge>
                          <Button size="sm" variant="ghost" className="text-destructive h-7 w-7 p-0" onClick={() => handleDelete(rule.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}

          {inactiveRules.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <h3 className="text-sm font-medium text-muted-foreground">
                Inactivas ({inactiveRules.length})
              </h3>
              {inactiveRules.map((rule) => (
                <Card key={rule.id} className="opacity-50">
                  <CardContent className="p-3 flex items-center gap-3">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm line-through">
                      {DAY_NAMES[rule.dayOfWeek as keyof typeof DAY_NAMES]} — {rule.taskLabel}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No hay reglas</h3>
            <p className="text-muted-foreground">Crea reglas para definir los días y tareas de rotación.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
