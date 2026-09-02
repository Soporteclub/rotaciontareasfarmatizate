// Colombian Public Holidays Generator
// Generates all 18 official holidays for any given year
// Based on Colombian law (Código Sustantivo del Trabajo)
// Fixed holidays, Easter-based holidays, and Ley Emiliani (moved to Monday)

export interface ColombianHoliday {
  date: Date;
  name: string;
  type: "fixed" | "easter" | "emiliani"; // fixed=date never changes, easter=based on Easter, emiliani=moved to Monday
}

/**
 * Calculate Easter Sunday for a given year using the Anonymous Gregorian algorithm
 */
function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Apply Ley Emiliani: move a holiday to the next Monday if it doesn't fall on Monday
 * If it's Monday, keep it. If Tuesday-Sunday, move to next Monday.
 */
function applyLeyEmiliani(date: Date): Date {
  const dayOfWeek = date.getUTCDay();
  if (dayOfWeek === 1) return date; // Already Monday
  const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
  const moved = new Date(date);
  moved.setUTCDate(moved.getUTCDate() + daysUntilMonday);
  return moved;
}

/**
 * Generate all 18 Colombian official holidays for a given year
 */
export function generateColombianHolidays(year: number): ColombianHoliday[] {
  const holidays: ColombianHoliday[] = [];
  const easter = getEasterSunday(year);

  // Helper: add days to a date
  const addDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setUTCDate(result.getUTCDate() + days);
    return result;
  };

  // 1. Año Nuevo - January 1 (FIXED)
  holidays.push({ date: new Date(Date.UTC(year, 0, 1)), name: "Año Nuevo", type: "fixed" });

  // 2. Día de los Reyes Magos - January 6 (EMILIANI - moved to Monday)
  holidays.push({ date: applyLeyEmiliani(new Date(Date.UTC(year, 0, 6))), name: "Día de los Reyes Magos", type: "emiliani" });

  // 3. Día de San José - March 19 (EMILIANI - moved to Monday)
  holidays.push({ date: applyLeyEmiliani(new Date(Date.UTC(year, 2, 19))), name: "Día de San José", type: "emiliani" });

  // 4. Jueves Santo - Easter - 3 days (EASTER-BASED, exact date)
  holidays.push({ date: addDays(easter, -3), name: "Jueves Santo", type: "easter" });

  // 5. Viernes Santo - Easter - 2 days (EASTER-BASED, exact date)
  holidays.push({ date: addDays(easter, -2), name: "Viernes Santo", type: "easter" });

  // 6. Día del Trabajo - May 1 (FIXED)
  holidays.push({ date: new Date(Date.UTC(year, 4, 1)), name: "Día del Trabajo", type: "fixed" });

  // 7. Día de la Ascensión - Easter + 39 days (EMILIANI)
  holidays.push({ date: applyLeyEmiliani(addDays(easter, 39)), name: "Día de la Ascensión", type: "emiliani" });

  // 8. Corpus Christi - Easter + 60 days (EMILIANI)
  holidays.push({ date: applyLeyEmiliani(addDays(easter, 60)), name: "Corpus Christi", type: "emiliani" });

  // 9. Sagrado Corazón de Jesús - Easter + 68 days (EMILIANI)
  holidays.push({ date: applyLeyEmiliani(addDays(easter, 68)), name: "Sagrado Corazón de Jesús", type: "emiliani" });

  // 10. San Pedro y San Pablo - June 29 (EMILIANI)
  holidays.push({ date: applyLeyEmiliani(new Date(Date.UTC(year, 5, 29))), name: "San Pedro y San Pablo", type: "emiliani" });

  // 11. Día de la Independencia - July 20 (FIXED)
  holidays.push({ date: new Date(Date.UTC(year, 6, 20)), name: "Día de la Independencia", type: "fixed" });

  // 12. Batalla de Boyacá - August 7 (FIXED)
  holidays.push({ date: new Date(Date.UTC(year, 7, 7)), name: "Batalla de Boyacá", type: "fixed" });

  // 13. Asunción de la Virgen - August 15 (EMILIANI)
  holidays.push({ date: applyLeyEmiliani(new Date(Date.UTC(year, 7, 15))), name: "Asunción de la Virgen", type: "emiliani" });

  // 14. Día de la Raza - October 12 (EMILIANI)
  holidays.push({ date: applyLeyEmiliani(new Date(Date.UTC(year, 9, 12))), name: "Día de la Raza", type: "emiliani" });

  // 15. Todos los Santos - November 1 (EMILIANI)
  holidays.push({ date: applyLeyEmiliani(new Date(Date.UTC(year, 10, 1))), name: "Todos los Santos", type: "emiliani" });

  // 16. Independencia de Cartagena - November 11 (EMILIANI)
  holidays.push({ date: applyLeyEmiliani(new Date(Date.UTC(year, 10, 11))), name: "Independencia de Cartagena", type: "emiliani" });

  // 17. Inmaculada Concepción - December 8 (FIXED)
  holidays.push({ date: new Date(Date.UTC(year, 11, 8)), name: "Inmaculada Concepción", type: "fixed" });

  // 18. Navidad - December 25 (FIXED)
  holidays.push({ date: new Date(Date.UTC(year, 11, 25)), name: "Navidad", type: "fixed" });

  return holidays.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Generate Colombian holidays for a range of years
 */
export function generateColombianHolidaysForRange(startYear: number, endYear: number): ColombianHoliday[] {
  const all: ColombianHoliday[] = [];
  for (let year = startYear; year <= endYear; year++) {
    all.push(...generateColombianHolidays(year));
  }
  return all;
}

/**
 * Format a date as YYYY-MM-DD string
 */
export function formatDateKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
