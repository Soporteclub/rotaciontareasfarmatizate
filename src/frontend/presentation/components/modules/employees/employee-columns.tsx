import type { GroupResponse } from "@/frontend/presentation/lib/query/hooks";

// Colores de marca Farmatizate
export const BRAND_PRIMARY = "#1545cb";
export const BRAND_ACCENT = "#00cd98";

// Tipo de filtro de estado
export type StatusFilter = "all" | "active" | "inactive";

// Definición de columnas de la tabla de empleados
export const EMPLOYEE_COLUMNS = [
  { key: "name", label: "Nombre", className: "w-[260px]" },
  { key: "email", label: "Email", className: "hidden sm:table-cell" },
  { key: "group", label: "Grupo", className: "" },
  { key: "status", label: "Estado", className: "hidden md:table-cell" },
  { key: "joinDate", label: "Ingreso", className: "hidden lg:table-cell" },
  { key: "actions", label: "Acciones", className: "w-[70px] text-right" },
] as const;

// Obtener nombre del grupo a partir de su ID
export function getGroupName(
  groups: GroupResponse[] | undefined,
  groupId: string
): string {
  return groups?.find((g) => g.id === groupId)?.name ?? "Sin grupo";
}

// Obtener color del grupo a partir de su ID
export function getGroupColor(
  groups: GroupResponse[] | undefined,
  groupId: string
): string {
  return groups?.find((g) => g.id === groupId)?.color ?? "#6b7280";
}

// Formatear fecha en español colombiano
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
