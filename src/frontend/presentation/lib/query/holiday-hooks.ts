import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api-client";
import { useUIStore } from "@/frontend/presentation/hooks/use-ui-store";
import type { HolidayResponse, CreateHolidayInput, SeedHolidaysInput } from "./types";

export function useHolidays(startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);

  return useQuery({
    queryKey: ["holidays", { startDate, endDate }],
    queryFn: () => apiFetch<HolidayResponse[]>(`/api/holidays?${params.toString()}`),
  });
}

export function useAllHolidays() {
  return useQuery({
    queryKey: ["holidays", "all"],
    queryFn: () => apiFetch<HolidayResponse[]>("/api/holidays"),
  });
}

export function useCreateHoliday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateHolidayInput) => {
      const adminKey = useUIStore.getState().adminKey;
      if (!adminKey) {
        throw new Error("Se requiere clave de administrador. Desbloquea el panel admin primero.");
      }
      return apiFetch<HolidayResponse>("/api/holidays", {
        method: "POST",
        headers: { "x-admin-key": adminKey },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
    },
  });
}

export function useUpdateHoliday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateHolidayInput> }) => {
      const adminKey = useUIStore.getState().adminKey;
      if (!adminKey) {
        throw new Error("Se requiere clave de administrador. Desbloquea el panel admin primero.");
      }
      return apiFetch<HolidayResponse>(`/api/holidays/${id}`, {
        method: "PATCH",
        headers: { "x-admin-key": adminKey },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
    },
  });
}

export function useDeleteHoliday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      const adminKey = useUIStore.getState().adminKey;
      if (!adminKey) {
        throw new Error("Se requiere clave de administrador. Desbloquea el panel admin primero.");
      }
      return apiFetch<{ message: string }>(`/api/holidays/${id}`, {
        method: "DELETE",
        headers: { "x-admin-key": adminKey },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
    },
  });
}

export function useSeedHolidays() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data?: Omit<SeedHolidaysInput, "seed">) => {
      const adminKey = useUIStore.getState().adminKey;
      if (!adminKey) {
        throw new Error("Se requiere clave de administrador. Desbloquea el panel admin primero.");
      }
      return apiFetch<{ count: number; years: number; message: string }>("/api/holidays", {
        method: "POST",
        headers: { "x-admin-key": adminKey },
        body: JSON.stringify({ seed: true, ...data }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
    },
  });
}
