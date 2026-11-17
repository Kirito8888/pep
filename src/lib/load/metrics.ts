/** Métricas de carga de sesiones planificadas. */

export interface ExerciseLoad {
  name: string;
  sets: number;
  reps: number;
  intensityType: string;
  intensityValue: number | null;
  implement?: string | null;
  loadKg?: number | null;
  sprintMeters: number;
  hurdles: number;
  plyoContacts: number;
  throwsCount: number;
  distanceM: number;
}

export interface BlockLoad {
  type: string;
  exercises: ExerciseLoad[];
}

export interface SessionLoad {
  date: Date | string;
  title?: string;
  blocks: BlockLoad[];
}

export interface LoadMetrics {
  sprintMetersHigh: number;
  sprintMetersTotal: number;
  hurdles: number;
  plyoContacts: number;
  throwsTotal: number;
  throwsHigh: number;
  tonnageKg: number;
  heavySets: number;
  distanceM: number;
  throwsByImplement: Record<string, number>;
}

export const HIGH_SPRINT_PCT = 95;
export const HIGH_THROW_PCT = 90;
export const HEAVY_LIFT_PCT = 85;

/** Intensidad expresada en % (el RPE se convierte: RPE 10 = 100 %, cada punto = 5 %). */
export function intensityPct(ex: Pick<ExerciseLoad, "intensityType" | "intensityValue">): number | null {
  if (ex.intensityValue == null) return null;
  if (ex.intensityType === "PCT") return ex.intensityValue;
  if (ex.intensityType === "RPE") return 50 + ex.intensityValue * 5;
  return null;
}

export function emptyMetrics(): LoadMetrics {
  return {
    sprintMetersHigh: 0,
    sprintMetersTotal: 0,
    hurdles: 0,
    plyoContacts: 0,
    throwsTotal: 0,
    throwsHigh: 0,
    tonnageKg: 0,
    heavySets: 0,
    distanceM: 0,
    throwsByImplement: {},
  };
}

export function addExercise(m: LoadMetrics, ex: ExerciseLoad, blockType?: string): void {
  const pct = intensityPct(ex);
  m.sprintMetersTotal += ex.sprintMeters;
  if (ex.sprintMeters > 0 && pct != null && pct >= HIGH_SPRINT_PCT) m.sprintMetersHigh += ex.sprintMeters;
  m.hurdles += ex.hurdles;
  m.plyoContacts += ex.plyoContacts;
  m.throwsTotal += ex.throwsCount;
  if (ex.throwsCount > 0) {
    if (pct != null && pct >= HIGH_THROW_PCT) m.throwsHigh += ex.throwsCount;
    const key = ex.implement?.trim() || "Sin especificar";
    m.throwsByImplement[key] = (m.throwsByImplement[key] ?? 0) + ex.throwsCount;
  }
  m.distanceM += ex.distanceM;
  if (ex.loadKg && ex.loadKg > 0) {
    m.tonnageKg += ex.sets * ex.reps * ex.loadKg;
  }
  const isLift = blockType === "STRENGTH" && ex.throwsCount === 0 && ex.plyoContacts === 0 && ex.sprintMeters === 0;
  if (isLift && pct != null && pct >= HEAVY_LIFT_PCT) m.heavySets += ex.sets;
}

export function sessionMetrics(session: SessionLoad): LoadMetrics {
  const m = emptyMetrics();
  for (const b of session.blocks) for (const ex of b.exercises) addExercise(m, ex, b.type);
  m.tonnageKg = Math.round(m.tonnageKg);
  return m;
}

export function sumMetrics(list: LoadMetrics[]): LoadMetrics {
  const m = emptyMetrics();
  for (const x of list) {
    m.sprintMetersHigh += x.sprintMetersHigh;
    m.sprintMetersTotal += x.sprintMetersTotal;
    m.hurdles += x.hurdles;
    m.plyoContacts += x.plyoContacts;
    m.throwsTotal += x.throwsTotal;
    m.throwsHigh += x.throwsHigh;
    m.tonnageKg += x.tonnageKg;
    m.heavySets += x.heavySets;
    m.distanceM += x.distanceM;
    for (const [k, v] of Object.entries(x.throwsByImplement)) m.throwsByImplement[k] = (m.throwsByImplement[k] ?? 0) + v;
  }
  return m;
}
