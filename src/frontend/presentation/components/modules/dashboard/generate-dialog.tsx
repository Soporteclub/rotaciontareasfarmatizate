"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Lock, Sparkles } from "lucide-react";
import { BRAND } from "@/frontend/presentation/lib/brand";
import type { GroupResponse } from "@/frontend/presentation/lib/query/hooks";

interface GenerateDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  groups: GroupResponse[] | undefined;
  generateGroupId: string;
  setGenerateGroupId: (v: string) => void;
  generateRange: { startDate: string; endDate: string };
  setGenerateRange: (v: { startDate: string; endDate: string }) => void;
  handleGenerate: () => void;
  isPending: boolean;
}

/** Diálogo para generar asignaciones */
export function GenerateDialog({
  open, onOpenChange, groups,
  generateGroupId, setGenerateGroupId,
  generateRange, setGenerateRange,
  handleGenerate, isPending,
}: GenerateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Generar Asignaciones
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            El motor de equidad distribuirá las tareas justamente dentro del grupo seleccionado.
            Las asignaciones pasadas <strong>NO</strong> se modificarán.
          </p>

          {/* Selector de grupo */}
          <div className="space-y-2">
            <Label>Grupo</Label>
            <Select value={generateGroupId} onValueChange={setGenerateGroupId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar grupo" /></SelectTrigger>
              <SelectContent>
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
          </div>

          {/* Rango de fechas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Desde</Label>
              <input
                type="date"
                className="w-full px-3 py-2 border rounded-md text-sm bg-background"
                value={generateRange.startDate}
                onChange={(e) => setGenerateRange({ ...generateRange, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Hasta</Label>
              <input
                type="date"
                className="w-full px-3 py-2 border rounded-md text-sm bg-background"
                value={generateRange.endDate}
                onChange={(e) => setGenerateRange({ ...generateRange, endDate: e.target.value })}
              />
            </div>
          </div>

          {/* Nota informativa */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted p-3 rounded-lg">
            <Lock className="h-4 w-4 shrink-0" />
            <span>Cada grupo rota de forma independiente. Las asignaciones pasadas están bloqueadas.</span>
          </div>

          {/* Botón de generar */}
          <Button
            onClick={handleGenerate}
            className="w-full"
            style={{ backgroundColor: BRAND.PRIMARY }}
            disabled={isPending || !generateGroupId}
          >
            {isPending ? "Generando..." : "Generar Asignaciones"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
