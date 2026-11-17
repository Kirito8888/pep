/** Formato y parseo de tiempos deportivos. */

/** Segundos -> "m:ss.cc" o "s.cc" (o "h:mm:ss" si supera la hora). */
export function formatTime(totalSeconds: number, decimals = 2): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "—";
  const factor = 10 ** decimals;
  const rounded = Math.round(totalSeconds * factor) / factor;
  const h = Math.floor(rounded / 3600);
  const m = Math.floor((rounded % 3600) / 60);
  const s = rounded - h * 3600 - m * 60;
  const sStr = decimals > 0 ? s.toFixed(decimals) : String(Math.round(s));
  const pad = (v: string) => (parseFloat(v) < 10 ? `0${v}` : v);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${pad(sStr)}`;
  if (m > 0) return `${m}:${pad(sStr)}`;
  return sStr;
}

/** "1:52.3", "13.45", "2:05:10" -> segundos. Devuelve NaN si no es válido. */
export function parseTime(input: string): number {
  const clean = input.trim().replace(",", ".");
  if (!clean) return NaN;
  const parts = clean.split(":").map((p) => Number(p));
  if (parts.some((p) => !Number.isFinite(p) || p < 0)) return NaN;
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return NaN;
}

export function round(value: number, decimals = 2): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}
