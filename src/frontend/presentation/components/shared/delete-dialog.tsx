"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/frontend/lib/utils";
import type { GroupResponse } from "@/frontend/presentation/lib/query/hooks";

interface DeleteDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  groups: GroupResponse[] | undefined;
  onDelete: (params: { groupId: string; startDate: string; endDate: string }) => Promise<void>;
  isPending: boolean;
}

export function DeleteDialog({
  open,
  onOpenChange,
  groups,
  onDelete,
  isPending,
}: DeleteDialogProps) {
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 3, 0);

  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(() => {
    const allIds = groups?.map((g) => g.id) ?? [];
    return new Set(allIds);
  });
  const [startDate, setStartDate] = useState<Date>(defaultStart);
  const [endDate, setEndDate] = useState<Date>(defaultEnd);
  const [startPickerOpen, setStartPickerOpen] = useState(false);
  const [endPickerOpen, setEndPickerOpen] = useState(false);

  const formatDateStr = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const activeGroups = useMemo(
    () => groups?.filter((g) => g.isActive) ?? [],
    [groups]
  );

  const allSelected = activeGroups.length > 0 && selectedGroupIds.size === activeGroups.length;
  const noneSelected = selectedGroupIds.size === 0;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedGroupIds(new Set());
    } else {
      setSelectedGroupIds(new Set(activeGroups.map((g) => g.id)));
    }
  };

  const toggleNone = () => {
    setSelectedGroupIds(new Set());
  };

  const toggleGroup = (id: string) => {
    setSelectedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleDelete = async () => {
    if (noneSelected) return;

    const groupsToProcess = activeGroups.filter((g) => selectedGroupIds.has(g.id));
    for (const group of groupsToProcess) {
      await onDelete({
        groupId: group.id,
        startDate: formatDateStr(startDate),
        endDate: formatDateStr(endDate),
      });
    }

    onOpenChange(false);
  };

  const formatDisplay = (d: Date) =>
    format(d, "dd/MM/yyyy", { locale: es });

  const getEmployeeCount = (group: GroupResponse) => {
    if (group._count?.employees !== undefined) return group._count.employees;
    if (group.employees) return group.employees.filter((e) => e.isActive).length;
    return 0;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-500" />
            Borrar Asignaciones
          </DialogTitle>
          <DialogDescription>
            Elimina las asignaciones de los grupos en el rango de fechas seleccionado.
            Luego ve a <strong>Reglas</strong> para generar nuevas asignaciones
            respetando las tareas activas de cada empleado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* ─── Grupos a procesar ─────────────────────────────── */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Grupos a procesar</Label>

            {/* Todos / Ninguno toggles */}
            <div className="flex gap-2">
              <Button
                variant={allSelected ? "default" : "outline"}
                size="sm"
                className="text-xs h-7"
                onClick={toggleAll}
                style={allSelected ? { backgroundColor: "#1545cb" } : undefined}
              >
                Todos
              </Button>
              <Button
                variant={noneSelected ? "default" : "outline"}
                size="sm"
                className="text-xs h-7"
                onClick={toggleNone}
                style={noneSelected ? { backgroundColor: "#1545cb" } : undefined}
              >
                Ninguno
              </Button>
            </div>

            {/* Group checkboxes */}
            <div className="space-y-2">
              {activeGroups.map((group) => {
                const checked = selectedGroupIds.has(group.id);
                const empCount = getEmployeeCount(group);
                return (
                  <label
                    key={group.id}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all",
                      checked
                        ? "border-red-300 bg-red-50 dark:bg-red-950/20"
                        : "border-border bg-card hover:bg-muted/50"
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleGroup(group.id)}
                    />
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: group.color }}
                    />
                    <span className="text-sm font-medium flex-1">{group.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {empCount} emp.
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* ─── Rango de fechas ───────────────────────────────── */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Rango de fechas</Label>

            <div className="grid grid-cols-2 gap-3">
              {/* Desde */}
              <div className="space-y-1.5">
                <span className="text-xs text-muted-foreground">Desde</span>
                <Popover open={startPickerOpen} onOpenChange={setStartPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal text-sm h-10",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? formatDisplay(startDate) : "Seleccionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(d) => {
                        if (d) {
                          setStartDate(d);
                          setStartPickerOpen(false);
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Hasta */}
              <div className="space-y-1.5">
                <span className="text-xs text-muted-foreground">Hasta</span>
                <Popover open={endPickerOpen} onOpenChange={setEndPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal text-sm h-10",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? formatDisplay(endDate) : "Seleccionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(d) => {
                        if (d) {
                          setEndDate(d);
                          setEndPickerOpen(false);
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Se eliminarán todas las asignaciones dentro de este rango
              (incluye bloqueadas).
            </p>
          </div>

          {/* ─── Pasos informativos ─────────────────────────────── */}
          <div className="space-y-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-xl p-3">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-wider">Instrucciones</span>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white bg-amber-500">
                1
              </div>
              <div className="text-sm text-amber-800 dark:text-amber-200">
                Borra las asignaciones del rango seleccionado <strong>(incluye bloqueadas)</strong>.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white bg-amber-500">
                2
              </div>
              <div className="text-sm text-amber-800 dark:text-amber-200">
                Ve a <strong>Reglas → Generar Asignaciones</strong> para crear nuevas
                respetando las tareas activas por empleado.
              </div>
            </div>
          </div>

          {/* ─── Botón de borrar ────────────────────────────────── */}
          <Button
            onClick={handleDelete}
            className="w-full gap-2"
            variant="outline"
            style={{ borderColor: "#ef4444", color: "#ef4444" }}
            disabled={isPending || noneSelected}
          >
            {isPending ? (
              <>
                <Trash2 className="h-4 w-4 animate-spin" />
                Borrando...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Borrar Asignaciones
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
