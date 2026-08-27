"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { TaskIcon } from "@/frontend/presentation/components/shared/task-icon";
import { AdminOnly } from "@/frontend/presentation/components/shared/admin-guard";
import { DeleteDialog } from "@/frontend/presentation/components/shared/delete-dialog";
import { useDeleteAssignments } from "@/frontend/presentation/lib/query/hooks";
import { Users, Search, Filter, X, Info, Trash2, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import type { GroupResponse, RuleResponse } from "@/frontend/presentation/lib/query/hooks";

interface DashboardFiltersProps {
  selectedGroupId: string;
  setSelectedGroupId: (v: string) => void;
  selectedTaskType: string;
  setSelectedTaskType: (v: string) => void;
  searchName: string;
  setSearchName: (v: string) => void;
  groups: GroupResponse[] | undefined;
  availableTaskTypes: string[];
  // FIX (Tarea-iconos): rules so the task filter shows each task's icon/color
  allRules: RuleResponse[] | undefined;
  filteredCount: number;
  hasActiveFilters: boolean;
  clearFilters: () => void;
}

/** Tooltip explicativo del motor de equidad */
function FairnessTooltip() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Info className="h-4 w-4 text-muted-foreground" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-sm">
          <div className="space-y-2 text-xs max-w-xs">
            <p className="font-semibold">Cómo funciona la asignación justa:</p>
            <ol className="list-decimal pl-4 space-y-1">
              <li>Cada <strong>piso/grupo</strong> rota de forma <strong>independiente</strong> con su propio personal.</li>
              <li>El motor evalúa cada empleado con un puntaje de equidad basado en:
                <ul className="list-disc pl-4 mt-0.5 space-y-0.5">
                  <li>Balance total de asignaciones</li>
                  <li>Balance mensual</li>
                  <li>Enfriamiento (días desde última tarea)</li>
                  <li>Penalización por consecutivas</li>
                  <li>Restricción dura: nadie recibe dos tareas el mismo día (salvo que no quede otra alternativa o el admin lo reasigne)</li>
                </ul>
              </li>
              <li>El empleado con <strong>mayor puntaje</strong> (más &quot;merecido&quot;) es asignado.</li>
              <li>Asignaciones pasadas están <strong>bloqueadas</strong> y no se modifican.</li>
            </ol>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** Barra de filtros del dashboard */
export function DashboardFilters({
  selectedGroupId, setSelectedGroupId,
  selectedTaskType, setSelectedTaskType,
  searchName, setSearchName,
  groups, availableTaskTypes, allRules,
  filteredCount, hasActiveFilters, clearFilters,
}: DashboardFiltersProps) {
  const deleteAssignments = useDeleteAssignments();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // FIX (Tarea-iconos): resolve per-task color/icon from the rules so the
  // filter dropdown shows the same icon/color as the rules module.
  const styleByTask = useMemo(() => {
    const map = new Map<string, { color: string | null; icon: string | null }>();
    if (allRules) {
      for (const r of allRules) {
        if (!map.has(r.taskLabel)) {
          map.set(r.taskLabel, { color: r.color, icon: r.icon });
        }
      }
    }
    return map;
  }, [allRules]);

  const handleDelete = async (params: { groupId: string; startDate: string; endDate: string }) => {
    try {
      const result = await deleteAssignments.mutateAsync(params);
      const groupName = groups?.find((g) => g.id === params.groupId)?.name ?? "Grupo";
      toast.success(`Se eliminaron ${result.deletedCount} asignaciones de ${groupName}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar");
    }
  };

  return (
    <div className="space-y-3">
      {/* Fila 1: Filtro de grupo + botón de borrar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
            <SelectTrigger className="w-full sm:w-48 h-9 text-sm">
              <SelectValue placeholder="Todos los grupos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">
                <div className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5" />
                  Todos los grupos
                </div>
              </SelectItem>
              {groups?.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: g.color }} />
                    {g.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FairnessTooltip />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <AdminOnly fallback={
            <span className="text-xs text-muted-foreground italic flex items-center gap-1">
              <Lock className="h-3 w-3" />
              Eliminar requiere admin
            </span>
          }>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-red-500 border-red-300 hover:bg-red-50 hover:text-red-600"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={deleteAssignments.isPending}
            >
              {deleteAssignments.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              Borrar Asignaciones
            </Button>
          </AdminOnly>
        </div>
      </div>

      {/* Fila 2: Filtros avanzados */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            placeholder="Buscar por nombre..."
            className="pl-8 h-8 text-sm"
          />
          {searchName && (
            <button
              onClick={() => setSearchName("")}
              className="absolute right-2 top-1/2 -translate-y-1/2"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        <Select value={selectedTaskType} onValueChange={setSelectedTaskType}>
          <SelectTrigger className="w-48 h-8 text-sm">
            <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Todas las tareas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todas las tareas</SelectItem>
            {availableTaskTypes.map((t) => {
              const style = styleByTask.get(t);
              return (
                <SelectItem key={t} value={t}>
                  <div className="flex items-center gap-2">
                    <TaskIcon taskType={t} iconName={style?.icon ?? null} color={style?.color ?? null} size="xs" showBg={false} />
                    {t}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={clearFilters}>
            <X className="h-3 w-3 mr-1" />
            Limpiar filtros
          </Button>
        )}

        {filteredCount > 0 && (
          <span className="text-xs text-muted-foreground ml-auto">
            {filteredCount} asignación{filteredCount !== 1 ? "es" : ""}
          </span>
        )}
      </div>

      {/* Diálogo de borrado */}
      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        groups={groups}
        onDelete={handleDelete}
        isPending={deleteAssignments.isPending}
      />
    </div>
  );
}
