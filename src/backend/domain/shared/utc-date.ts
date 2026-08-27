// Shared UTC date helpers
// Centraliza los accessores UTC que el backend usa para construir claves y
// fronteras de fecha, de modo que sean estables sin importar la TZ del servidor.
//
// FIX (BC-1, BC-2): antes varios módulos mezclaban accessores LOCALES
// (getFullYear/getMonth/getDate/setHours) con instantes guardados en UTC
// (00:00:00.000Z). En un servidor en America/Bogota (UTC-5) un instante
// 2026-01-01T00:00:00Z se renderizaba como 2025-12-31 con accessors locales,
// provocando desfases de un día en reportes y en el seed. Todos los cálculos
// que involucran fechas PERSISTIDAS deben usar los helpers de este archivo.

export const msPerDay = 86_400_000;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** YYYY-MM-DD calculado en UTC para un instante dado. */
export function formatDateKeyUTC(date: Date): string {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

/** YYYY-MM calculado en UTC (para la balanza mensual). */
export function formatMonthKeyUTC(date: Date): string {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}`;
}

/** Normaliza un instante a medianoche UTC (00:00:00.000Z) — forma canónica de almacenamiento. */
export function utcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Copia profunda en UTC de la medianoche del día indicado. */
export function utcMidnightFromYMD(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day));
}

/** Días enteros entre dos instantes (ignora componentes de tiempo). */
export function daysBetween(a: Date, b: Date): number {
  const aNorm = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const bNorm = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.round(Math.abs(bNorm - aNorm) / msPerDay);
}
