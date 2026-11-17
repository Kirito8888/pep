import type { LevelKey, PhaseKey } from "@/lib/athletics/events";

export interface PhaseConfig {
  /** Multiplicador de volumen. */
  vol: number;
  /** % 1RM y repeticiones de la fuerza principal. */
  strengthPct: number;
  strengthReps: number;
  strengthSets: number;
  /** % 1RM de los derivados de halterofilia / potencia. */
  powerPct: number;
  powerReps: number;
  /** Intensidad de lanzamientos y de sprint (%). */
  throwPct: number;
  sprintPct: number;
  /** Proporción de implementos pesados y ligeros sobre el total de lanzamientos. */
  heavyRatio: number;
  lightRatio: number;
  /** Multiplicador de contactos pliométricos. */
  plyo: number;
  /** Multiplicador del volumen metabólico / aeróbico. */
  metabolic: number;
  focus: string;
}

export const PHASE_CONFIG: Record<PhaseKey, PhaseConfig> = {
  GPP: {
    vol: 1.0, strengthPct: 75, strengthReps: 6, strengthSets: 4, powerPct: 70, powerReps: 4,
    throwPct: 80, sprintPct: 90, heavyRatio: 0.5, lightRatio: 0.1, plyo: 1.0, metabolic: 1.0,
    focus: "Volumen, capacidad de trabajo, fuerza general e implementos pesados.",
  },
  SPP: {
    vol: 0.9, strengthPct: 85, strengthReps: 4, strengthSets: 4, powerPct: 80, powerReps: 3,
    throwPct: 88, sprintPct: 95, heavyRatio: 0.35, lightRatio: 0.2, plyo: 1.1, metabolic: 0.8,
    focus: "Fuerza máxima y potencia específica; transferencia a la técnica de competición.",
  },
  PRE_COMP: {
    vol: 0.75, strengthPct: 90, strengthReps: 3, strengthSets: 3, powerPct: 85, powerReps: 2,
    throwPct: 93, sprintPct: 97, heavyRatio: 0.2, lightRatio: 0.3, plyo: 0.9, metabolic: 0.6,
    focus: "Intensidad alta, volumen descendente, modelos de competición.",
  },
  COMP: {
    vol: 0.6, strengthPct: 87, strengthReps: 2, strengthSets: 3, powerPct: 80, powerReps: 2,
    throwPct: 96, sprintPct: 100, heavyRatio: 0.1, lightRatio: 0.3, plyo: 0.6, metabolic: 0.5,
    focus: "Mantener fuerza y velocidad con mínimo volumen; frescura para competir.",
  },
  TAPER: {
    vol: 0.4, strengthPct: 80, strengthReps: 2, strengthSets: 2, powerPct: 75, powerReps: 2,
    throwPct: 90, sprintPct: 95, heavyRatio: 0, lightRatio: 0.3, plyo: 0.4, metabolic: 0.4,
    focus: "Descarga: activación neural breve, sin fatiga residual.",
  },
};

export interface LevelConfig {
  vol: number;
  /** Puntos de % que se restan a las intensidades máximas. */
  intensityOffset: number;
}

export const LEVEL_CONFIG: Record<LevelKey, LevelConfig> = {
  BEGINNER: { vol: 0.75, intensityOffset: 5 },
  INTERMEDIATE: { vol: 1.0, intensityOffset: 0 },
  ADVANCED: { vol: 1.15, intensityOffset: 0 },
};

/** Ondulación de carga entre microciclos: progresión y descarga final (3:1). */
export function weekWave(index: number, total: number): { mult: number; focus: string } {
  if (total >= 3 && index === total - 1) return { mult: 0.7, focus: "Descarga (−30 % de volumen)" };
  const labels = ["Carga base", "Carga progresiva", "Carga de impacto", "Carga de impacto +", "Carga máxima"];
  return { mult: 1 + 0.07 * index, focus: labels[Math.min(index, labels.length - 1)] };
}

/** Días de la semana por defecto según días de entrenamiento (0 = lunes). */
export const DEFAULT_OFFSETS: Record<number, number[]> = {
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 5],
  5: [0, 1, 2, 4, 5],
  6: [0, 1, 2, 3, 4, 5],
};

/** Patrón alta (H) / baja (L) demanda neural asociado a DEFAULT_OFFSETS: nunca dos H seguidas. */
export const DEMAND_PATTERN: Record<number, ("H" | "L")[]> = {
  2: ["H", "H"],
  3: ["H", "H", "H"],
  4: ["H", "L", "H", "H"],
  5: ["H", "L", "H", "H", "L"],
  6: ["H", "L", "H", "L", "H", "L"],
};
