// Utilidades de color para el calendario
// Cada asignación recibe un color derivado de su grupo con variación por tipo de tarea

/** Convierte un color hex (#rrggbb) a sus componentes RGB */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

/** Color principal del evento: mezcla 60% grupo + 40% tipo de tarea */
export function getEventColor(groupColor: string, taskType: string): string {
  const taskColors: Record<string, string> = {
    "Sacar Basura": "#f15a24",
    "Lavar Cafetera": "#00cd98",
    "Aseo General": "#1545cb",
  };
  const taskColor = taskColors[taskType];
  if (!taskColor) return groupColor;

  const g = hexToRgb(groupColor);
  const t = hexToRgb(taskColor);
  const r = Math.round(g.r * 0.6 + t.r * 0.4);
  const gr = Math.round(g.g * 0.6 + t.g * 0.4);
  const b = Math.round(g.b * 0.6 + t.b * 0.4);
  return `#${r.toString(16).padStart(2, "0")}${gr.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/** Versión clara para fondo de evento (10% opacidad) */
export function getEventBgColor(groupColor: string, taskType: string): string {
  const color = getEventColor(groupColor, taskType);
  const rgb = hexToRgb(color);
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.10)`;
}
