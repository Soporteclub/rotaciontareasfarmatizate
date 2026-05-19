"use client";

import { useState, useMemo } from "react";
import {
  useGroups,
  useCreateGroup,
  useDeleteGroup,
  useUpdateGroup,
  useRules,
  useCreateRule,
  useDeleteRule,
} from "@/frontend/presentation/lib/query/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/frontend/presentation/components/shared/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Users, FolderPlus, LogOut } from "lucide-react";
import { AdminOnly } from "@/frontend/presentation/components/shared/admin-guard";
import { BRAND } from "@/frontend/presentation/lib/brand";
import { useUIStore } from "@/frontend/presentation/hooks/use-ui-store";
import { TASK_TYPES, TASK_LABELS } from "@/backend/domain/entities/types";
import { TaskIcon } from "@/frontend/presentation/components/shared/task-icon";
import { getTaskConfig } from "@/frontend/presentation/components/modules/rules/rules-constants";
import { DAY_ABBR } from "@/frontend/presentation/components/modules/rules/rules-constants";
import { toast } from "sonner";
import type { GroupResponse } from "@/frontend/presentation/lib/query/types";

const COLORS = [
  "#1545cb", "#066aab", "#f15a24", "#00cd98",
  "#425ae0", "#a253d8", "#fe79a2", "#0affc0",
];

// Default day assignments for each task label
const DEFAULT_TASK_DAYS: Record<string, number[]> = {
  "Sacar Basura": [2, 4],       // Mar, Jue
  "Lavar Cafetera": [1, 2, 3, 4, 5], // Lun-Vie
  "Aseo General": [5],          // Vie
  "Organizar Cocina": [1, 3, 5], // Lun, Mié, Vie
  "Recepción": [1, 2, 3, 4, 5], // Lun-Vie
  "Apertura": [1, 2, 3, 4, 5], // Lun-Vie
  "Cierre": [1, 2, 3, 4, 5],   // Lun-Vie
};

export function GroupsModule() {
  const { data: groups, isLoading } = useGroups(true);
  const createGroup = useCreateGroup();
  const updateGroup = useUpdateGroup();
  const deleteGroup = useDeleteGroup();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteGroupTarget, setDeleteGroupTarget] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    taskType: "cleaning" as string,
    color: BRAND.PRIMARY,
  });

  // Task toggles: which task labels are enabled for this group
  const [enabledTasks, setEnabledTasks] = useState<Record<string, boolean>>({});
  const [rulesLoaded, setRulesLoaded] = useState(false);

  // When editing, load existing rules as toggles
  const { data: existingRules } = useRules(editingId ?? undefined, true);

  // Compute initial task state from existing rules (only when dialog opens for edit)
  const initialTaskState = useMemo(() => {
    if (!editingId || !existingRules) return null;
    const taskState: Record<string, boolean> = {};
    for (const label of TASK_LABELS) {
      taskState[label] = false;
    }
    for (const rule of existingRules) {
      if (rule.taskLabel && rule.isActive) {
        taskState[rule.taskLabel] = true;
      }
    }
    return taskState;
  }, [editingId, existingRules]);

  // Apply initial state once when rules are loaded for editing
  if (editingId && initialTaskState && !rulesLoaded) {
    setEnabledTasks(initialTaskState);
    setRulesLoaded(true);
  }
  if (!editingId && rulesLoaded) {
    setRulesLoaded(false);
  }

  const resetForm = () => {
    setForm({ name: "", description: "", taskType: "cleaning", color: BRAND.PRIMARY });
    setEnabledTasks({});
    setRulesLoaded(false);
    setEditingId(null);
  };

  const handleEdit = (group: GroupResponse) => {
    setForm({
      name: group.name,
      description: group.description ?? "",
      taskType: group.taskType,
      color: group.color,
    });
    setRulesLoaded(false);
    setEditingId(group.id);
    setDialogOpen(true);
  };

  const createRule = useCreateRule();
  const deleteRule = useDeleteRule();

  const handleSubmit = async () => {
    try {
      let groupId: string;

      if (editingId) {
        await updateGroup.mutateAsync({
          id: editingId,
          name: form.name,
          description: form.description || null,
          taskType: form.taskType,
          color: form.color,
        });
        groupId = editingId;
      } else {
        const newGroup = await createGroup.mutateAsync({
          name: form.name,
          description: form.description || null,
          taskType: form.taskType,
          color: form.color,
        });
        groupId = newGroup.id;
      }

      // Sync rules based on toggles
      await syncRules(groupId);

      toast.success(editingId ? "Grupo actualizado" : "Grupo creado");
      setDialogOpen(false);
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    }
  };

  const syncRules = async (groupId: string) => {
    if (!existingRules && editingId) return;

    const currentRules = existingRules ?? [];

    // Group existing rules by taskLabel
    const existingByTask = new Map<string, typeof currentRules>();
    for (const rule of currentRules) {
      if (!existingByTask.has(rule.taskLabel)) {
        existingByTask.set(rule.taskLabel, []);
      }
      existingByTask.get(rule.taskLabel)!.push(rule);
    }

    // For each task label, determine if we need to create or delete rules
    for (const taskLabel of TASK_LABELS) {
      const isEnabled = enabledTasks[taskLabel] === true;
      const existingRulesForTask = existingByTask.get(taskLabel) ?? [];
      const hasExistingRules = existingRulesForTask.length > 0;

      if (isEnabled && !hasExistingRules) {
        // Create rules for this task
        const days = DEFAULT_TASK_DAYS[taskLabel] ?? [1, 2, 3, 4, 5];
        for (const dayOfWeek of days) {
          try {
            await createRule.mutateAsync({
              groupId,
              dayOfWeek,
              frequencyType: "weekly",
              frequency: 1,
              taskLabel,
            });
          } catch {
            // Ignore duplicate rule errors (unique constraint)
          }
        }
      } else if (!isEnabled && hasExistingRules) {
        // Soft-delete all rules for this task in this group
        for (const rule of existingRulesForTask) {
          try {
            await deleteRule.mutateAsync({ id: rule.id });
          } catch {
            // Ignore errors
          }
        }
      }
    }
  };

  const handleDelete = (id: string) => {
    setDeleteGroupTarget(id);
  };

  const confirmDeleteGroup = async () => {
    if (!deleteGroupTarget) return;
    try {
      await deleteGroup.mutateAsync(deleteGroupTarget);
      toast.success("Grupo desactivado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setDeleteGroupTarget(null);
    }
  };

  const toggleTask = (taskLabel: string) => {
    setEnabledTasks((prev) => ({
      ...prev,
      [taskLabel]: !prev[taskLabel],
    }));
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
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Grupos</h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${BRAND.PRIMARY}15`, color: BRAND.PRIMARY }}>Farmatízate</span>
          </div>
          <p className="text-muted-foreground">Gestiona los grupos de tareas rotativas</p>
        </div>
        <div className="flex items-center gap-2">
          <AdminOnly fallback={null}>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2" style={{ backgroundColor: BRAND.PRIMARY }}>
              <FolderPlus className="h-4 w-4" />
              Nuevo Grupo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Grupo" : "Nuevo Grupo"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-5">
              {/* Nombre */}
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ej: Piso 2, Cocina, Recepción"
                />
              </div>

              {/* Descripción */}
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Descripción opcional del grupo"
                  rows={2}
                />
              </div>

              {/* Color */}
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

              {/* Tareas / Reglas — Toggle switches */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Tareas del Grupo</Label>
                <p className="text-xs text-muted-foreground">
                  Activa las tareas que este grupo debe rotar. Se crearán las reglas automáticamente.
                </p>
                <div className="space-y-2">
                  {TASK_LABELS.map((taskLabel) => {
                    const config = getTaskConfig(taskLabel);
                    const days = DEFAULT_TASK_DAYS[taskLabel] ?? [];
                    const dayStr = days.map((d) => DAY_ABBR[d]).join(", ");
                    const isEnabled = enabledTasks[taskLabel] === true;

                    return (
                      <div
                        key={taskLabel}
                        className="flex items-center gap-3 rounded-lg border p-3 transition-colors"
                        style={{
                          backgroundColor: isEnabled ? config.bgLight : "transparent",
                          borderColor: isEnabled ? config.border : "var(--border)",
                        }}
                      >
                        <TaskIcon taskType={taskLabel} size="md" showBg={true} />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{taskLabel}</div>
                          <div className="text-xs text-muted-foreground">
                            {dayStr} · Semanal
                          </div>
                        </div>
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={() => toggleTask(taskLabel)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <Button onClick={handleSubmit} className="w-full" disabled={createGroup.isPending || updateGroup.isPending}>
                {editingId ? "Actualizar Grupo" : "Crear Grupo"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </AdminOnly>
        <LockAdminButton />
        </div>
      </div>

      {groups && groups.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => {
            const empCount = group.employees?.filter((e) => e.isActive).length ?? 0;
            const ruleCount = group.rules?.length ?? 0;
            // Get unique task labels from rules
            const taskLabels = [...new Set(group.rules?.map((r) => r.taskLabel) ?? [])];

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
                  {/* Task badges */}
                  {taskLabels.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {taskLabels.map((label) => (
                        <span
                          key={label}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
                          style={(() => {
                            const cfg = getTaskConfig(label);
                            return {
                              backgroundColor: cfg.bgLight,
                              color: cfg.color,
                              border: `1px solid ${cfg.border}`,
                            };
                          })()}
                        >
                          <TaskIcon taskType={label} size="xs" showBg={false} />
                          {label}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {empCount}</span>
                    <span>{ruleCount} reglas</span>
                  </div>
                  <AdminOnly fallback={null}>
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
                  </AdminOnly>
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

      {/* Confirmación de eliminación de grupo */}
      <ConfirmDialog
        open={!!deleteGroupTarget}
        onOpenChange={(open) => { if (!open) setDeleteGroupTarget(null); }}
        title="Desactivar grupo"
        description="¿Desactivar este grupo? Los datos se mantendrán pero el grupo no estará activo."
        confirmLabel="Desactivar"
        variant="destructive"
        onConfirm={confirmDeleteGroup}
      />
    </div>
  );
}

// ─── Lock Admin Button (global admin lock) ──────────────────
function LockAdminButton() {
  const isAdmin = useUIStore((s) => s.isAdmin);
  const lockAdmin = useUIStore((s) => s.lockAdmin);

  if (!isAdmin) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5 text-xs"
      onClick={() => {
        lockAdmin();
        toast.success("Administrador bloqueado");
      }}
    >
      <LogOut className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Bloquear admin</span>
    </Button>
  );
}
