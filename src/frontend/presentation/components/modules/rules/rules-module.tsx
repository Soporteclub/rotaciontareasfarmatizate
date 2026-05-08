"use client";

import { useState, useMemo, useCallback } from "react";
import {
  useRules,
  useGroups,
  useDeleteRule,
  useGenerateAssignments,
} from "@/frontend/presentation/lib/query/hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  ClipboardList,
  RefreshCw,
  Loader2,
  CalendarDays,
} from "lucide-react";
import { DAY_NAMES } from "@/backend/domain/entities/types";
import type { DayOfWeek } from "@/backend/domain/entities/types";
import { toast } from "sonner";
import type { RuleResponse } from "@/frontend/presentation/lib/query/hooks";
import { CreateRuleDialog } from "./create-rule-dialog";
import { EditRuleDialog } from "./edit-rule-dialog";
import { TaskGroupCard } from "./rule-card";

export function RulesModule() {
  const { data: groups, isLoading: loadingGroups } = useGroups();
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const { data: rules, isLoading: loadingRules } = useRules(
    selectedGroupId || undefined,
    true
  );
  const deleteRule = useDeleteRule();
  const generateAssignments = useGenerateAssignments();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RuleResponse | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  // Editar regla
  const handleEdit = useCallback((rule: RuleResponse) => {
    setEditingRule(rule);
    setEditDialogOpen(true);
  }, []);

  // Eliminar regla permanentemente
  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("¿Eliminar esta regla permanentemente? Esta acción no se puede deshacer.")) return;
    try {
      await deleteRule.mutateAsync({ id, permanent: true });
      toast.success("Regla eliminada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  }, [deleteRule]);

  // Regenerar asignaciones para todos los grupos
  const handleRegenerateAll = useCallback(async () => {
    if (!groups || groups.length === 0) {
      toast.error("No hay grupos configurados");
      return;
    }
    setRegenerating(true);
    try {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 3, 0);
      const startStr = startDate.toISOString().split("T")[0];
      const endStr = endDate.toISOString().split("T")[0];

      let totalAssignments = 0;
      for (const group of groups) {
        const result = await generateAssignments.mutateAsync({
          groupId: group.id,
          startDate: startStr,
          endDate: endStr,
        });
        totalAssignments += result.assignments.length;
      }
      toast.success(
        `Regeneradas ${totalAssignments} asignaciones en ${groups.length} grupos`
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al regenerar"
      );
    } finally {
      setRegenerating(false);
    }
  }, [groups, generateAssignments]);

  const isLoading = loadingGroups || loadingRules;

  // Agrupar reglas activas por taskLabel
  const activeRules = rules?.filter((r) => r.isActive) ?? [];
  const inactiveRules = rules?.filter((r) => !r.isActive) ?? [];

  const rulesByTask = useMemo(() => {
    const map = new Map<
      string,
      {
        rules: typeof activeRules;
        days: Set<DayOfWeek>;
        groupIds: Set<string>;
        frequencies: Set<number>;
      }
    >();

    for (const rule of activeRules) {
      const key = rule.taskLabel || "Sin etiqueta";
      if (!map.has(key)) {
        map.set(key, {
          rules: [],
          days: new Set(),
          groupIds: new Set(),
          frequencies: new Set(),
        });
      }
      const entry = map.get(key)!;
      entry.rules.push(rule);
      entry.days.add(rule.dayOfWeek as DayOfWeek);
      entry.groupIds.add(rule.groupId);
      entry.frequencies.add(rule.frequency);
    }

    return map;
  }, [activeRules]);

  // ─── Cargando ────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Reglas</h1>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Reglas de Rotación</h1>
          <p className="text-muted-foreground text-sm">
            Configura los días y frecuencias de rotación por tarea
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            onClick={handleRegenerateAll}
            disabled={regenerating}
          >
            {regenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">
              {regenerating ? "Regenerando..." : "Regenerar asignaciones"}
            </span>
            <span className="sm:hidden">
              {regenerating ? "..." : "Regenerar"}
            </span>
          </Button>
          <Button
            className="flex items-center gap-2"
            style={{ backgroundColor: "#f15a24" }}
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Nueva Regla
          </Button>
        </div>
      </div>

      {/* Filtro de grupo */}
      <div className="flex items-center gap-2">
        <Label className="text-sm whitespace-nowrap">Filtrar:</Label>
        <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Todos los grupos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos los grupos</SelectItem>
            {groups?.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tarjetas de reglas agrupadas por tarea */}
      {rulesByTask.size > 0 || inactiveRules.length > 0 ? (
        <div className="space-y-4">
          {Array.from(rulesByTask.entries()).map(
            ([taskLabel, { rules: taskRules, days, groupIds, frequencies }]) => (
              <TaskGroupCard
                key={taskLabel}
                taskLabel={taskLabel}
                rules={taskRules}
                days={days}
                groupIds={groupIds}
                frequencies={frequencies}
                groups={groups}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            )
          )}

          {/* Reglas inactivas */}
          {inactiveRules.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <h3 className="text-sm font-medium text-muted-foreground">
                Inactivas ({inactiveRules.length})
              </h3>
              <div className="space-y-1.5">
                {inactiveRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center gap-3 py-1.5 px-3 opacity-50"
                  >
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm line-through">
                      {DAY_NAMES[rule.dayOfWeek as DayOfWeek]} —{" "}
                      {rule.taskLabel}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No hay reglas</h3>
            <p className="text-muted-foreground">
              Crea reglas para definir los días y tareas de rotación.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Diálogo de creación */}
      <CreateRuleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        groups={groups}
        selectedGroupId={selectedGroupId}
      />

      {/* Diálogo de edición */}
      <EditRuleDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        rule={editingRule}
      />
    </div>
  );
}
