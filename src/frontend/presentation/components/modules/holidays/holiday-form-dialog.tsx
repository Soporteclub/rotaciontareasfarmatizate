import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { HolidayResponse } from "@/frontend/presentation/lib/query/types";

const HOLIDAY_TYPES = [
  { value: "fixed", label: "Fijo" },
  { value: "emiliani", label: "Ley Emiliani" },
  { value: "easter", label: "Basado en Pascua" },
] as const;

export function HolidayFormDialog({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: HolidayResponse;
  onSubmit: (data: { date: string; name: string; type: "fixed" | "emiliani" | "easter" }) => void;
  isSubmitting: boolean;
}) {
  const [date, setDate] = useState(initialData?.date ?? "");
  const [name, setName] = useState(initialData?.name ?? "");
  const [type, setType] = useState<"fixed" | "emiliani" | "easter">(initialData?.type ?? "fixed");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !name) return;
    onSubmit({ date, name, type });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? "Editar Festivo" : "Nuevo Festivo"}</DialogTitle>
          <DialogDescription>
            {initialData ? "Modifica los datos del festivo." : "Agrega un nuevo día festivo."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="holiday-date">Fecha</Label>
            <Input id="holiday-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="holiday-name">Nombre</Label>
            <Input
              id="holiday-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Día de la Independencia"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="holiday-type">Tipo</Label>
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger id="holiday-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HOLIDAY_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !date || !name}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {initialData ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
