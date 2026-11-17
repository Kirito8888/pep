import type { BlockTypeKey, LevelKey, PhaseKey, SpecialtyKey } from "@/lib/athletics/events";

export const EQUIPMENT = [
  { key: "BARBELL", label: "Barra olímpica, discos y rack" },
  { key: "DUMBBELLS", label: "Mancuernas / kettlebells" },
  { key: "MACHINES", label: "Máquinas y poleas" },
  { key: "BANDS", label: "Gomas elásticas" },
  { key: "TRACK", label: "Pista de atletismo" },
  { key: "HURDLES", label: "Vallas" },
  { key: "PLYO_BOXES", label: "Cajones pliométricos" },
  { key: "JUMP_PIT", label: "Foso / colchonetas de salto" },
  { key: "THROWING_AREA", label: "Zona de lanzamientos (círculo / pasillo)" },
  { key: "VARIED_IMPLEMENTS", label: "Implementos pesados y ligeros" },
  { key: "MEDBALL", label: "Balones medicinales" },
] as const;

export type Equipment = (typeof EQUIPMENT)[number]["key"];

export type LiftRef = "SQUAT" | "BENCH" | "DEADLIFT" | "CLEAN" | "SNATCH";

export const LIFT_REFS: { key: LiftRef; label: string; prExercise: string }[] = [
  { key: "SQUAT", label: "Sentadilla", prExercise: "Sentadilla" },
  { key: "BENCH", label: "Press banca", prExercise: "Press banca" },
  { key: "DEADLIFT", label: "Peso muerto", prExercise: "Peso muerto" },
  { key: "CLEAN", label: "Cargada", prExercise: "Cargada" },
  { key: "SNATCH", label: "Arrancada", prExercise: "Arrancada" },
];

export interface GeneratorInput {
  specialty: SpecialtyKey;
  phase: PhaseKey;
  level: LevelKey;
  daysPerWeek: number;
  equipment: Equipment[];
  /** Número de microciclos (semanas) a generar: 1–6. */
  weeks: number;
  sex: "M" | "F";
  /** 1RM de referencia (kg) para calcular cargas y tonelaje. */
  oneRm?: Partial<Record<LiftRef, number>>;
}

export interface ExerciseDraft {
  name: string;
  sets: number;
  reps: number;
  intensityType: "PCT" | "RPE" | "NONE";
  intensityValue: number | null;
  restSec: number | null;
  notes: string;
  implement: string | null;
  muscleGroup: string | null;
  loadKg: number | null;
  sprintMeters: number;
  hurdles: number;
  plyoContacts: number;
  throwsCount: number;
  distanceM: number;
}

export interface BlockDraft {
  type: BlockTypeKey;
  title: string;
  notes: string;
  exercises: ExerciseDraft[];
}

export interface SessionDraft {
  dayOffset: number;
  title: string;
  demand: "high" | "low";
  blocks: BlockDraft[];
}

export interface WeekDraft {
  weekNumber: number;
  focus: string;
  sessions: SessionDraft[];
}

export interface GeneratedPlan {
  title: string;
  description: string;
  specialty: SpecialtyKey;
  phase: PhaseKey;
  level: LevelKey;
  daysPerWeek: number;
  weeks: WeekDraft[];
  notes: string[];
}

/** Sesión sin día asignado, tal y como la devuelven las plantillas. */
export type SessionTemplate = Omit<SessionDraft, "dayOffset">;

export interface TemplateResult {
  sessions: SessionTemplate[];
  /** Días de la semana (0 = lunes). Si se omite se usa la distribución por defecto. */
  offsets?: number[];
  notes?: string[];
}
