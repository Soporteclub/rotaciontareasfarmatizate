// Utilidades de color para el calendario
// FIX (Tarea 1): el calendario ahora usa el color de la TAREA (definido en la
// regla), NO el color del grupo. El color del grupo se reserva para el módulo
// de Empleados.

/** Convierte un color hex (#rrggbb) a sus componentes RGB */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

// Fallback de colores por nombre de tarea (legacy). Se usa solo cuando la regla
// NO tiene un color explícito definido. Esto mantiene compatibilidad con reglas
// existentes creadas antes de la Tarea 1.
const LEGACY_TASK_COLORS: Record<string, string> = {
  "Sacar Basura": "#f15a24",
  "Lavar Cafetera": "#00cd98",
  "Aseo General": "#1545cb",
  "Organizar Cocina": "#425ae0",
  "Recepción": "#066aab",
  "Apertura": "#ca8a04",
  "Cierre": "#9333ea",
  "Inventarios": "#066aab",
};

const DEFAULT_TASK_COLOR = "#6b7280"; // gray-500

/**
 * Resuelve el color final de una tarea.
 * Prioridad:
 *   1. taskColor explícito (de la regla, pasado por el caller)
 *   2. LEGACY_TASK_COLORS por nombre de tarea
 *   3. DEFAULT_TASK_COLOR
 *
 * FIX (Tarea 1): ya NO se mezcla con groupColor. El color del grupo se usa
 * únicamente en el módulo de Empleados.
 */
export function getEventColor(taskColor: string | null | undefined, taskName: string): string {
  if (taskColor && /^#[0-9a-fA-F]{6}$/.test(taskColor)) return taskColor;
  if (LEGACY_TASK_COLORS[taskName]) return LEGACY_TASK_COLORS[taskName];
  return DEFAULT_TASK_COLOR;
}

/** Versión clara para fondo de evento (10% opacidad) */
export function getEventBgColor(taskColor: string | null | undefined, taskName: string): string {
  const color = getEventColor(taskColor, taskName);
  const rgb = hexToRgb(color);
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12)`;
}
