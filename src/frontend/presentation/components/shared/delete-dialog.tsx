"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
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

  const [groupId, setGroupId] = useState<string>("");
  const [startDate, setStartDate] = useState<Date>(defaultStart);
  const [endDate, setEndDate] = useState<Date>(defaultEnd);
  const [startPickerOpen, setStartPickerOpen] = useState(false);
  const [endPickerOpen, setEndPickerOpen] = useState(false);

  const formatDateStr = (d: Date) => d.toISOString().split("T")[0];

  const handleDelete = async () => {
    if (!groupId) return;

    await onDelete({
      groupId,
      startDate: formatDateStr(startDate),
      endDate: formatDateStr(endDate),
    });

    onOpenChange(false);
  };

  const formatDisplay = (d: Date) =>
    format(d, "dd/MM/yyyy", { locale: es });

  const selectedGroup = groups?.find((g) => g.id === groupId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-500" />
            Borrar Asignaciones
          </DialogTitle>
          <DialogDescription>
            Elimina las asignaciones del grupo en el rango de fechas seleccionado.
            Luego ve a <strong>Reglas</strong> para generar nuevas asignaciones
            respetando las tareas activas de cada empleado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* ─── Grupo ─────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Grupo</Label>
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar grupo" />
              </SelectTrigger>
              <SelectContent>
                {groups?.filter((g) => g.isActive).map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: g.color }}
                      />
                      {g.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            disabled={isPending || !groupId}
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
