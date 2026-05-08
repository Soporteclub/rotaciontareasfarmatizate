import { DAY_NAMES } from "@/backend/domain/entities/types";
import type { DayOfWeek } from "@/backend/domain/entities/types";
import { getTaskColor } from "@/frontend/presentation/components/shared/task-icon";

// ─── Días de la semana ─────────────────────────────────────────
export const WEEKDAYS: DayOfWeek[] = [1, 2, 3, 4, 5];
export const ALL_DAYS: DayOfWeek[] = [0, 1, 2, 3, 4, 5, 6];

export const DAY_ABBR: Record<number, string> = {
  0: "Dom",
  1: "Lun",
  2: "Mar",
  3: "Mié",
  4: "Jue",
  5: "Vie",
  6: "Sáb",
};

// ─── Plantillas de reglas ───────────────────────────────────────
export interface RuleTemplate {
  id: string;
  label: string;
  emoji: string;
  description: string;
  taskLabel: string;
  days: DayOfWeek[];
  applyToAllGroups: boolean;
}

export const TEMPLATES: RuleTemplate[] = [
  {
    id: "basura",
    label: "Sacar Basura",
    emoji: "🗑",
    description: "Mar + Jue · cada piso independiente",
    taskLabel: "Sacar Basura",
    days: [2, 4],
    applyToAllGroups: false,
  },
  {
    id: "cafetera",
    label: "Lavar Cafetera",
    emoji: "☕",
    description: "Lun-Vie · cada piso independiente",
    taskLabel: "Lavar Cafetera",
    days: [1, 2, 3, 4, 5],
    applyToAllGroups: false,
  },
  {
    id: "aseo",
    label: "Aseo General",
    emoji: "✨",
    description: "Todos los grupos, día específico",
    taskLabel: "Aseo General",
    days: [5],
    applyToAllGroups: true,
  },
  {
    id: "custom",
    label: "Personalizada",
    emoji: "✏️",
    description: "Configura tu propia regla",
    taskLabel: "",
    days: [],
    applyToAllGroups: false,
  },
];

// ─── Helpers visuales ───────────────────────────────────────────
export function getTaskConfig(taskLabel: string) {
  const color = getTaskColor(taskLabel);
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  const bgLight = `rgba(${r}, ${g}, ${b}, 0.06)`;
  const border = `rgba(${r}, ${g}, ${b}, 0.3)`;
  return { color, bgLight, border };
}

export function getDaySummary(days: Set<DayOfWeek>): string {
  const sorted = Array.from(days).sort();
  if (sorted.length === 0) return "Ningún día";
  if (sorted.length === 7) return "Todos los días";

  if (
    sorted.length === 5 &&
    WEEKDAYS.every((d) => sorted.includes(d))
  ) {
    return "Lunes a Viernes";
  }

  if (
    sorted.length === 2 &&
    sorted.includes(2) &&
    sorted.includes(4)
  ) {
    return "Martes y Jueves";
  }

  if (
    sorted.length === 3 &&
    sorted.includes(1) &&
    sorted.includes(3) &&
    sorted.includes(5)
  ) {
    return "Lunes, Miércoles y Viernes";
  }

  return sorted.map((d) => DAY_NAMES[d]).join(", ");
}
