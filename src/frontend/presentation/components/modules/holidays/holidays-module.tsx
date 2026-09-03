"use client";

import { useState, useMemo } from "react";
import {
  useHolidays,
  useAllHolidays,
  useCreateHoliday,
  useUpdateHoliday,
  useDeleteHoliday,
  useSeedHolidays,
} from "@/frontend/presentation/lib/query/holiday-hooks";
import { useAdmin } from "@/frontend/presentation/hooks/use-admin";
import { Button } from "@/components/ui/button";
import { CalendarCheck, Plus, Sprout, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { HolidayResponse } from "@/frontend/presentation/lib/query/types";
import { HolidaysTable } from "./holidays-table";
import { HolidayFormDialog } from "./holiday-form-dialog";

export function HolidaysModule() {
  const { isAdmin, requestAccess, AdminDialog } = useAdmin();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<HolidayResponse | null>(null);

  const now = new Date();
  const yearStart = `${now.getFullYear()}-01-01`;
  const yearEnd = `${now.getFullYear()}-12-31`;

  const { data: holidays, isLoading, error } = useHolidays(yearStart, yearEnd);
  const { data: allHolidays } = useAllHolidays();
  const createHoliday = useCreateHoliday();
  const updateHoliday = useUpdateHoliday();
  const deleteHoliday = useDeleteHoliday();
  const seedHolidays = useSeedHolidays();

  const sortedHolidays = useMemo(() => {
    if (!holidays) return [];
    return [...holidays].sort((a, b) => a.date.localeCompare(b.date));
  }, [holidays]);

  // Determine if holidays are already seeded for the full +10 year range
  const seedTargetYear = now.getFullYear() + 10;
  const maxHolidayYear = useMemo(() => {
    if (!allHolidays || allHolidays.length === 0) return 0;
    return Math.max(...allHolidays.map((h) => new Date(h.date).getFullYear()));
  }, [allHolidays]);
  const isSeeded = maxHolidayYear >= seedTargetYear;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-destructive">
        <AlertCircle className="h-5 w-5 mr-2" />
        Error al cargar festivos
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {AdminDialog}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CalendarCheck className="h-6 w-6" />
            Festivos
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Días no laborables. El motor no asigna tareas en estas fechas.
          </p>
        </div>
        {isAdmin && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Estado del semillado: muestra hasta qué año ya hay festivos y si está completo */}
            <div className="text-sm text-muted-foreground">
              Semillado hasta{" "}
              <span className="font-medium text-foreground">
                {maxHolidayYear > 0 ? maxHolidayYear : now.getFullYear()}
              </span>
              {isSeeded ? (
                <span className="text-green-600 dark:text-green-400 font-medium"> · completo ({seedTargetYear})</span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400 font-medium"> · pendiente ({seedTargetYear})</span>
              )}
            </div>

            {/* <Button
              variant="outline"
              onClick={() =>
                seedHolidays.mutate(
                  { startYear: now.getFullYear(), endYear: seedTargetYear },
                  {
                    onSuccess: (data) =>
                      toast.success(`Semillado ${data.count} festivos (${now.getFullYear()} → ${seedTargetYear})`),
                    onError: () => toast.error("Error al semillar"),
                  }
                )
              }
              disabled={seedHolidays.isPending}
              title={`Semillar festivos oficiales de ${now.getFullYear()} a ${seedTargetYear}. Elimina y recrea todos los festivos existentes.`}
            >
              {seedHolidays.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sprout className="h-4 w-4 mr-2" />
              )}
              Semillar {now.getFullYear()} → {seedTargetYear}
            </Button> */}

            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo
            </Button>
          </div>
        )}
      </div>

      <HolidaysTable
        holidays={sortedHolidays}
        isAdmin={isAdmin}
        onEdit={setEditingHoliday}
        onDelete={(id) => deleteHoliday.mutate(id, {
          onSuccess: () => toast.success("Festivo eliminado"),
          onError: () => toast.error("Error al eliminar"),
        })}
        isDeleting={deleteHoliday.isPending}
      />

      <HolidayFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={(data) => createHoliday.mutate(data, {
          onSuccess: () => { toast.success("Festivo creado"); setCreateOpen(false); },
          onError: () => toast.error("Error al crear festivo"),
        })}
        isSubmitting={createHoliday.isPending}
      />

      {editingHoliday && (
        <HolidayFormDialog
          open={!!editingHoliday}
          onOpenChange={(open) => !open && setEditingHoliday(null)}
          initialData={editingHoliday}
          onSubmit={(data) => updateHoliday.mutate(
            { id: editingHoliday.id, data },
            { onSuccess: () => { toast.success("Festivo actualizado"); setEditingHoliday(null); }, onError: () => toast.error("Error al actualizar") }
          )}
          isSubmitting={updateHoliday.isPending}
        />
      )}

      {!isAdmin && (
        <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          Solo administradores pueden gestionar festivos.
          <Button variant="link" className="p-0 h-auto" onClick={() => requestAccess()}>Desbloquear</Button>
        </div>
      )}
    </div>
  );
}
