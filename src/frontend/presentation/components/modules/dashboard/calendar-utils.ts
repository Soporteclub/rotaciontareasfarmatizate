// Utilidades de calendario: interfaz de día, generación de grilla y constantes

export const DAY_NAMES_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export const DAY_NAMES_FULL = [
  "Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado",
];

export const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export type ViewMode = "month" | "week" | "day";

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

/**
 * Genera los 7 días de la semana que contiene la fecha dada (Lun-Dom).
 * weekOffset desplaza semanas desde la fecha de referencia.
 */
export function getWeekDays(refYear: number, refMonth: number, refDay: number, weekOffset: number = 0): CalendarDay[] {
  const ref = new Date(refYear, refMonth, refDay);
  ref.setDate(ref.getDate() + weekOffset * 7);

  // Ir al lunes de esa semana
  const dayOfWeek = ref.getDay(); // 0=Dom, 1=Lun...
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(ref);
  monday.setDate(ref.getDate() + mondayOffset);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days: CalendarDay[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push({
      date: d,
      dayOfMonth: d.getDate(),
      isCurrentMonth: d.getMonth() === refMonth,
      isToday: d.getTime() === today.getTime(),
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
      assignments: [],
    });
  }
  return days;
}

/** Genera un solo CalendarDay con detalles completos para la vista de día */
export function getDayView(year: number, month: number, day: number): CalendarDay {
  const date = new Date(year, month, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return {
    date,
    dayOfMonth: day,
    isCurrentMonth: true,
    isToday: date.getTime() === today.getTime(),
    isWeekend: date.getDay() === 0 || date.getDay() === 6,
    assignments: [],
  };
}

/** Formatea una fecha como "Jueves, 8 de Mayo de 2026" */
export function formatFullDate(date: Date): string {
  const dayName = DAY_NAMES_FULL[date.getDay()];
  const dayNum = date.getDate();
  const monthName = MONTH_NAMES[date.getMonth()];
  const year = date.getFullYear();
  return `${dayName}, ${dayNum} de ${monthName} de ${year}`;
}

/** Formatea el rango de una semana: "5 - 11 de Mayo de 2026" */
export function formatWeekRange(weekDays: CalendarDay[]): string {
  if (weekDays.length === 0) return "";
  const first = weekDays[0];
  const last = weekDays[weekDays.length - 1];
  const firstDay = first.date.getDate();
  const lastDay = last.date.getDate();
  const firstMonth = MONTH_NAMES[first.date.getMonth()];
  const lastMonth = MONTH_NAMES[last.date.getMonth()];
  const year = last.date.getFullYear();

  if (first.date.getMonth() === last.date.getMonth()) {
    return `${firstDay} - ${lastDay} de ${firstMonth} de ${year}`;
  }
  return `${firstDay} de ${firstMonth} - ${lastDay} de ${lastMonth} de ${year}`;
}
