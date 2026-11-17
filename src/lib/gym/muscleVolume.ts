/** Volumen semanal por grupo muscular. */

export const MUSCLE_GROUPS = [
  "Cuádriceps",
  "Isquiosurales",
  "Glúteo",
  "Gemelo",
  "Pecho",
  "Espalda",
  "Hombro",
  "Bíceps",
  "Tríceps",
  "Core",
  "Cadena posterior",
  "Cuerpo completo",
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

/** Series semanales orientativas (mínimo eficaz y máximo recuperable habituales). */
export const VOLUME_RANGE = { min: 8, optimalMax: 20 };

export interface LiftEntry {
  muscleGroup: string;
  sets: number;
  reps: number;
  weightKg: number;
}

export interface MuscleVolume {
  group: string;
  sets: number;
  tonnage: number;
  status: "bajo" | "óptimo" | "alto";
}

export function volumeByMuscle(entries: LiftEntry[]): MuscleVolume[] {
  const map = new Map<string, { sets: number; tonnage: number }>();
  for (const e of entries) {
    const cur = map.get(e.muscleGroup) ?? { sets: 0, tonnage: 0 };
    cur.sets += e.sets;
    cur.tonnage += e.sets * e.reps * e.weightKg;
    map.set(e.muscleGroup, cur);
  }
  return [...map.entries()]
    .map(([group, v]) => ({
      group,
      sets: v.sets,
      tonnage: Math.round(v.tonnage),
      status:
        v.sets < VOLUME_RANGE.min ? ("bajo" as const) : v.sets > VOLUME_RANGE.optimalMax ? ("alto" as const) : ("óptimo" as const),
    }))
    .sort((a, b) => b.sets - a.sets);
}

export function totalTonnage(entries: LiftEntry[]): number {
  return Math.round(entries.reduce((a, e) => a + e.sets * e.reps * e.weightKg, 0));
}

export const PR_CATEGORIES = [
  { key: "STRENGTH", label: "Fuerza máxima" },
  { key: "OLYMPIC", label: "Halterofilia y derivados" },
  { key: "BALLISTIC", label: "Balístico / potencia" },
] as const;

export const PR_EXERCISES: Record<string, string[]> = {
  STRENGTH: ["Sentadilla", "Sentadilla frontal", "Press banca", "Peso muerto", "Press militar", "Dominada lastrada", "Hip thrust"],
  OLYMPIC: ["Arrancada", "Cargada", "Envión (dos tiempos)", "Arrancada de potencia", "Cargada de potencia", "Push press", "Jerk"],
  BALLISTIC: ["Salto con contramovimiento (CMJ)", "Squat jump lastrado", "Salto horizontal", "Lanzamiento balón medicinal overhead", "Press banca lanzado", "Triple salto a pies juntos"],
};
