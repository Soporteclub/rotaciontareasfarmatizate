import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2, Edit } from "lucide-react";
import type { HolidayResponse } from "@/frontend/presentation/lib/query/types";

interface HolidaysTableProps {
  holidays: HolidayResponse[];
  isAdmin: boolean;
  onEdit: (holiday: HolidayResponse) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

export function HolidaysTable({ holidays, isAdmin, onEdit, onDelete, isDeleting }: HolidaysTableProps) {
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Tipo</TableHead>
            {isAdmin && <TableHead className="w-24">Acciones</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {holidays.length === 0 ? (
            <TableRow>
              <TableCell colSpan={isAdmin ? 4 : 3} className="text-center text-muted-foreground py-8">
                No hay festivos para este año.
              </TableCell>
            </TableRow>
          ) : (
            holidays.map((h) => {
              // FIX: el API devuelve ISO 8601 completo (ej. "2024-01-01T00:00:00.000Z").
              // Extraer la porción date-only para comparaciones y formatear en UTC para
              // evitar "Invalid Date" (concatenar "T12:00:00" a un ISO produce un string
              // malformado) y desplazamientos por zona horaria.
              const holidayDateKey = h.date.split("T")[0];
              return (
              <TableRow key={h.id} className={holidayDateKey === today ? "bg-accent/50" : undefined}>
                <TableCell className="font-mono">
                  {new Date(h.date).toLocaleDateString("es-CO", { day: "numeric", month: "long", timeZone: "UTC" })}
                  {holidayDateKey === today && (
                    <span className="ml-2 text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded">Hoy</span>
                  )}
                </TableCell>
                <TableCell className={holidayDateKey < today ? "text-muted-foreground" : ""}>{h.name}</TableCell>
                <TableCell>
                  <span className="text-xs px-2 py-1 rounded-full bg-secondary">{h.type}</span>
                </TableCell>
                {isAdmin && (
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => onEdit(h)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onDelete(h.id)} disabled={isDeleting}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
