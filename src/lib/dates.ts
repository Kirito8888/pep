/** Utilidades de fecha en UTC (las sesiones se guardan a medianoche UTC). */

export const DAY_MS = 86_400_000;
export const DAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
export const DAY_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export function toUtcMidnight(d: Date | string): Date {
  const x = new Date(d);
  return new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate()));
}

/** Convierte "YYYY-MM-DD" (input type=date) a medianoche UTC. */
export function parseDateInput(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
}

export function toDateInput(d: Date | string): string {
  return new Date(d).toISOString().slice(0, 10);
}

export function todayInput(): string {
  const n = new Date();
  return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())).toISOString().slice(0, 10);
}

/** Lunes (UTC) de la semana que contiene la fecha. */
export function mondayOf(d: Date | string): Date {
  const x = toUtcMidnight(d);
  const dow = (x.getUTCDay() + 6) % 7; // 0 = lunes
  return new Date(x.getTime() - dow * DAY_MS);
}

export function addDays(d: Date | string, n: number): Date {
  return new Date(new Date(d).getTime() + n * DAY_MS);
}

/** Índice 0-6 (lunes-domingo) de una fecha. */
export function dayIndex(d: Date | string): number {
  return (new Date(d).getUTCDay() + 6) % 7;
}

export function diffDays(a: Date | string, b: Date | string): number {
  return Math.round((toUtcMidnight(a).getTime() - toUtcMidnight(b).getTime()) / DAY_MS);
}

export function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "short", timeZone: "UTC" });
}

export function formatDateLong(d: Date | string): string {
  return new Date(d).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}
