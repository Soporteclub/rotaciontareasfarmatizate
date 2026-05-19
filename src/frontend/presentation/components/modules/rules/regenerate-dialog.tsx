"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Sparkles, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/frontend/lib/utils";
import { BRAND } from "@/frontend/presentation/lib/brand";
import type { GroupResponse } from "@/frontend/presentation/lib/query/hooks";

interface RegenerateDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  groups: GroupResponse[] | undefined;
  onRegenerate: (params: { groupId: string; startDate: string; endDate: string }) => Promise<void>;
  isPending: boolean;
}

export function RegenerateDialog({
  open,
  onOpenChange,
  groups,
  onRegenerate,
  isPending,
}: RegenerateDialogProps) {
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 3, 0);

  const [groupId, setGroupId] = useState<string>("_all");
  const [startDate, setStartDate] = useState<Date>(defaultStart);
  const [endDate, setEndDate] = useState<Date>(defaultEnd);
  const [startPickerOpen, setStartPickerOpen] = useState(false);
  const [endPickerOpen, setEndPickerOpen] = useState(false);

  const formatDateStr = (d: Date) => d.toISOString().split("T")[0];

  const handleRegenerate = async () => {
    const groupsToProcess =
      groupId === "_all" ? groups ?? [] : groups?.filter((g) => g.id === groupId) ?? [];

    if (groupsToProcess.length === 0) return;

    if (groupId === "_all") {
      // Regenerate for ALL groups
      for (const group of groupsToProcess) {
        await onRegenerate({
          groupId: group.id,
          startDate: formatDateStr(startDate),
          endDate: formatDateStr(endDate),
        });
      }
    } else {
      await onRegenerate({
        groupId,
        startDate: formatDateStr(startDate),
        endDate: formatDateStr(endDate),
      });
    }

    onOpenChange(false);
  };

  const formatDisplay = (d: Date) =>
    format(d, "d 'de' MMM, yyyy", { locale: es });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Regenerar Asignaciones
          </DialogTitle>
          <DialogDescription>
            Elige el grupo y el rango de fechas para regenerar las asignaciones.
            Las asignaciones pasadas están bloqueadas y no se modificarán.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Selector de grupo */}
          <div className="space-y-2">
            <Label>Grupo</Label>
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar grupo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Todos los grupos</SelectItem>
                {groups?.map((g) => (
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

          {/* Rango de fechas con Date Pickers */}
          <div className="grid grid-cols-2 gap-3">
            {/* Start Date */}
            <div className="space-y-2">
              <Label>Desde</Label>
              <Popover open={startPickerOpen} onOpenChange={setStartPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal text-sm",
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

            {/* End Date */}
            <div className="space-y-2">
              <Label>Hasta</Label>
              <Popover open={endPickerOpen} onOpenChange={setEndPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal text-sm",
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

          {/* Quick range buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={() => {
                const n = new Date();
                setStartDate(new Date(n.getFullYear(), n.getMonth(), 1));
                setEndDate(new Date(n.getFullYear(), n.getMonth() + 1, 0));
              }}
            >
              Este mes
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={() => {
                const n = new Date();
                setStartDate(new Date(n.getFullYear(), n.getMonth(), 1));
                setEndDate(new Date(n.getFullYear(), n.getMonth() + 3, 0));
              }}
            >
              3 meses
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={() => {
                const n = new Date();
                setStartDate(new Date(n.getFullYear(), 0, 1));
                setEndDate(new Date(n.getFullYear(), 11, 31));
              }}
            >
              Este año
            </Button>
          </div>

          {/* Nota informativa */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted p-3 rounded-lg">
            <Lock className="h-4 w-4 shrink-0" />
            <span>
              Las asignaciones pasadas (fechas anteriores a hoy) están bloqueadas y no se modificarán.
              Solo se regeneran las asignaciones futuras.
            </span>
          </div>

          {/* Botón de regenerar */}
          <Button
            onClick={handleRegenerate}
            className="w-full"
            style={{ backgroundColor: BRAND.PRIMARY }}
            disabled={isPending}
          >
            {isPending ? "Regenerando..." : "Regenerar Asignaciones"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
