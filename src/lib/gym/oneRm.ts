/** Estimación de 1RM y tabla de porcentajes. */

export interface OneRmResult {
  epley: number;
  brzycki: number;
  lombardi: number;
  average: number;
}

export function epley(weight: number, reps: number): number {
  return reps <= 1 ? weight : weight * (1 + reps / 30);
}

export function brzycki(weight: number, reps: number): number {
  if (reps <= 1) return weight;
  if (reps >= 37) return NaN;
  return (weight * 36) / (37 - reps);
}

export function lombardi(weight: number, reps: number): number {
  return reps <= 1 ? weight : weight * Math.pow(reps, 0.1);
}

export function estimateOneRm(weight: number, reps: number): OneRmResult {
  const e = epley(weight, reps);
  const b = brzycki(weight, reps);
  const l = lombardi(weight, reps);
  const valid = [e, b, l].filter((v) => Number.isFinite(v));
  return { epley: e, brzycki: b, lombardi: l, average: valid.reduce((a, c) => a + c, 0) / valid.length };
}

/** Repeticiones máximas estimadas a un % del 1RM (inversa de Epley). */
export function repsAtPercent(pct: number): number {
  if (pct >= 100) return 1;
  return Math.max(1, Math.round(30 * (100 / pct - 1)));
}

export interface PercentRow {
  pct: number;
  weight: number;
  reps: number;
}

/** Tabla del 50 % al 100 % en pasos de 5 %. */
export function percentTable(oneRm: number, rounding = 0.5): PercentRow[] {
  const rows: PercentRow[] = [];
  for (let pct = 100; pct >= 50; pct -= 5) {
    const raw = (oneRm * pct) / 100;
    rows.push({ pct, weight: Math.round(raw / rounding) * rounding, reps: repsAtPercent(pct) });
  }
  return rows;
}

/** Escala RPE <-> RIR con % aproximado del 1RM para una serie de 1 a 10 repeticiones. */
export const RPE_SCALE: { rpe: number; rir: string; label: string; description: string }[] = [
  { rpe: 10, rir: "0", label: "Máximo", description: "No cabía ni una repetición más ni más carga." },
  { rpe: 9.5, rir: "0-1", label: "Casi máximo", description: "Quizá una repetición más; no más carga." },
  { rpe: 9, rir: "1", label: "Muy duro", description: "Quedaba 1 repetición en reserva." },
  { rpe: 8.5, rir: "1-2", label: "Duro +", description: "Seguro 1, quizá 2 repeticiones más." },
  { rpe: 8, rir: "2", label: "Duro", description: "Quedaban 2 repeticiones en reserva." },
  { rpe: 7.5, rir: "2-3", label: "Exigente", description: "Seguro 2, quizá 3 repeticiones más." },
  { rpe: 7, rir: "3", label: "Vigoroso", description: "Velocidad de barra alta; 3 en reserva." },
  { rpe: 6, rir: "4", label: "Moderado", description: "Trabajo de velocidad/técnica; 4 en reserva." },
  { rpe: 5, rir: "5+", label: "Ligero", description: "Calentamiento o recuperación activa." },
];

/** % del 1RM estimado para (repeticiones, RPE): se suma el RIR a las repeticiones (Epley). */
export function percentForRepsAtRpe(reps: number, rpe: number): number {
  const rir = 10 - rpe;
  const effectiveReps = reps + rir;
  return effectiveReps <= 1 ? 100 : 100 / (1 + effectiveReps / 30);
}
