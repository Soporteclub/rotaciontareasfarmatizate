// Utilidades de calendario: interfaz de día, generación de grilla y constantes

export const DAY_NAMES_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export interface CalendarDay {
  date: Date;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  assignments: Array<{
    id: string;
    taskType: string;
    employeeName: string;
    groupName: string;
    groupId: string;
    isLocked: boolean;
    groupColor: string;
  }>;
}

/** Genera los 42 días de la grilla del calendario para un mes dado */
export function getCalendarDays(year: number, month: number): CalendarDay[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days: CalendarDay[] = [];

  // Días del mes anterior (relleno inicial)
  for (let i = startPad - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push({
      date: d, dayOfMonth: d.getDate(), isCurrentMonth: false,
      isToday: d.getTime() === today.getTime(),
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
      assignments: [],
    });
  }

  // Días del mes actual
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(year, month, d);
    days.push({
      date, dayOfMonth: d, isCurrentMonth: true,
      isToday: date.getTime() === today.getTime(),
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      assignments: [],
    });
  }

  // Días del mes siguiente (relleno final hasta 42)
  const remaining = 42 - days.length;
  for (let d = 1; d <= remaining; d++) {
    const date = new Date(year, month + 1, d);
    days.push({
      date, dayOfMonth: d, isCurrentMonth: false,
      isToday: false,
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      assignments: [],
    });
  }

  return days;
}
