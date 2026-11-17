/** Medio fondo, fondo, obstáculos y marcha: ritmos, predicción, zonas y ACWR. */

export const MILE_M = 1609.344;

export interface EnduranceEvent {
  key: string;
  label: string;
  meters: number;
  group: "Medio fondo" | "Fondo" | "Obstáculos" | "Marcha" | "Ruta";
}

export const ENDURANCE_EVENTS: EnduranceEvent[] = [
  { key: "800m", label: "800 m", meters: 800, group: "Medio fondo" },
  { key: "1500m", label: "1.500 m", meters: 1500, group: "Medio fondo" },
  { key: "MILE", label: "Milla", meters: MILE_M, group: "Medio fondo" },
  { key: "3000m", label: "3.000 m", meters: 3000, group: "Fondo" },
  { key: "5000m", label: "5.000 m", meters: 5000, group: "Fondo" },
  { key: "10000m", label: "10.000 m", meters: 10000, group: "Fondo" },
  { key: "2000SC", label: "2.000 m obstáculos", meters: 2000, group: "Obstáculos" },
  { key: "3000SC", label: "3.000 m obstáculos", meters: 3000, group: "Obstáculos" },
  { key: "3000W", label: "3.000 m marcha", meters: 3000, group: "Marcha" },
  { key: "5000W", label: "5.000 m marcha", meters: 5000, group: "Marcha" },
  { key: "10000W", label: "10.000 m marcha", meters: 10000, group: "Marcha" },
  { key: "20000W", label: "20.000 m / 20 km marcha", meters: 20000, group: "Marcha" },
  { key: "10K", label: "10 km ruta", meters: 10000, group: "Ruta" },
  { key: "HM", label: "Media maratón", meters: 21097.5, group: "Ruta" },
  { key: "MAR", label: "Maratón", meters: 42195, group: "Ruta" },
];

export interface Pace {
  secPerKm: number;
  secPerMile: number;
  lap400: number;
  speedMs: number;
  speedKmh: number;
}

export function pace(meters: number, seconds: number): Pace {
  const v = meters / seconds;
  return { secPerKm: 1000 / v, secPerMile: MILE_M / v, lap400: 400 / v, speedMs: v, speedKmh: v * 3.6 };
}

/** Tiempos de paso acumulados cada `every` metros a ritmo constante. */
export function lapSplits(meters: number, seconds: number, every = 400): { distance: number; time: number }[] {
  const out: { distance: number; time: number }[] = [];
  for (let d = every; d < meters - 0.5; d += every) out.push({ distance: d, time: (seconds * d) / meters });
  out.push({ distance: meters, time: seconds });
  return out;
}

/** Riegel: T2 = T1 · (D2 / D1)^1,06 */
export function riegel(t1: number, d1: number, d2: number, exponent = 1.06): number {
  return t1 * Math.pow(d2 / d1, exponent);
}

/** Coste de oxígeno (ml/kg/min) a velocidad v en m/min (Daniels y Gilbert). */
function vo2AtVelocity(v: number): number {
  return -4.6 + 0.182258 * v + 0.000104 * v * v;
}

/** Fracción del VO2máx sostenible durante t minutos (Daniels y Gilbert). */
function fractionAtDuration(tMin: number): number {
  return 0.8 + 0.1894393 * Math.exp(-0.012778 * tMin) + 0.2989558 * Math.exp(-0.1932605 * tMin);
}

export function vdot(meters: number, seconds: number): number {
  const tMin = seconds / 60;
  return vo2AtVelocity(meters / tMin) / fractionAtDuration(tMin);
}

/** Tiempo previsto (s) en `meters` para un VDOT dado. */
export function timeForVdot(v: number, meters: number): number {
  let lo = meters / 12; // más rápido que cualquier récord
  let hi = meters / 0.8;
  for (let i = 0; i < 70; i++) {
    const mid = (lo + hi) / 2;
    // A menor tiempo, mayor VDOT necesario.
    if (vdot(meters, mid) > v) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Velocidad (m/min) que corresponde a una fracción del VDOT. */
function velocityAtFraction(v: number, fraction: number): number {
  const target = v * fraction;
  const a = 0.000104;
  const b = 0.182258;
  const c = -4.6 - target;
  return (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
}

export interface PaceZone {
  zone: string;
  name: string;
  purpose: string;
  /** Ritmo lento y rápido del intervalo (s/km). */
  slow: number;
  fast: number;
}

const ZONE_DEFS: { zone: string; name: string; purpose: string; lo: number; hi: number }[] = [
  { zone: "Z1", name: "Regenerativo", purpose: "Recuperación activa y calentamiento.", lo: 0.59, hi: 0.65 },
  { zone: "Z2", name: "Aeróbico extensivo", purpose: "Base aeróbica, rodajes largos.", lo: 0.65, hi: 0.74 },
  { zone: "Z3", name: "Umbral / tempo", purpose: "Umbral de lactato: tempo de 20–40 min o series largas.", lo: 0.83, hi: 0.88 },
  { zone: "Z4", name: "VO2máx", purpose: "Series de 2–5 min con recuperación ≈ tiempo de trabajo.", lo: 0.95, hi: 1.0 },
  { zone: "Z5", name: "Anaeróbico / ritmo de 800-1500", purpose: "Repeticiones cortas con recuperación amplia; economía y velocidad.", lo: 1.05, hi: 1.12 },
];

export function paceZones(v: number): PaceZone[] {
  return ZONE_DEFS.map((z) => ({
    zone: z.zone,
    name: z.name,
    purpose: z.purpose,
    slow: 60000 / velocityAtFraction(v, z.lo),
    fast: 60000 / velocityAtFraction(v, z.hi),
  }));
}

export interface HrZone {
  zone: string;
  name: string;
  pctLo: number;
  pctHi: number;
  maxLo: number;
  maxHi: number;
  karvonenLo: number | null;
  karvonenHi: number | null;
}

const HR_DEFS = [
  { zone: "Z1", name: "Regenerativo", lo: 0.5, hi: 0.6 },
  { zone: "Z2", name: "Aeróbico extensivo", lo: 0.6, hi: 0.7 },
  { zone: "Z3", name: "Aeróbico intensivo / tempo", lo: 0.7, hi: 0.8 },
  { zone: "Z4", name: "Umbral anaeróbico", lo: 0.8, hi: 0.9 },
  { zone: "Z5", name: "VO2máx / máximo", lo: 0.9, hi: 1.0 },
];

/** FCmáx estimada (Tanaka): 208 − 0,7 · edad. */
export function estimateMaxHr(age: number): number {
  return Math.round(208 - 0.7 * age);
}

/** Zonas por %FCmáx y por Karvonen: FC = FCreposo + %·(FCmáx − FCreposo). */
export function hrZones(maxHr: number, restingHr: number | null): HrZone[] {
  return HR_DEFS.map((z) => ({
    zone: z.zone,
    name: z.name,
    pctLo: z.lo * 100,
    pctHi: z.hi * 100,
    maxLo: Math.round(maxHr * z.lo),
    maxHi: Math.round(maxHr * z.hi),
    karvonenLo: restingHr != null ? Math.round(restingHr + z.lo * (maxHr - restingHr)) : null,
    karvonenHi: restingHr != null ? Math.round(restingHr + z.hi * (maxHr - restingHr)) : null,
  }));
}

export interface IntervalRep {
  reps: number;
  distanceM: number;
  /** Ritmo objetivo en s/km. */
  paceSecKm: number;
  recoverySec: number;
  /** Metros de trote durante la recuperación (0 = parado/andando). */
  recoveryJogM: number;
}

export interface IntervalSummary {
  workMeters: number;
  recoveryMeters: number;
  totalMeters: number;
  workSeconds: number;
  totalSeconds: number;
  density: number;
  rows: { label: string; repTime: number; lap400: number }[];
}

export function summarizeIntervals(sets: IntervalRep[]): IntervalSummary {
  let workMeters = 0;
  let recoveryMeters = 0;
  let workSeconds = 0;
  let recSeconds = 0;
  const rows: IntervalSummary["rows"] = [];
  for (const s of sets) {
    const repTime = (s.distanceM / 1000) * s.paceSecKm;
    workMeters += s.reps * s.distanceM;
    workSeconds += s.reps * repTime;
    recoveryMeters += s.reps * s.recoveryJogM;
    recSeconds += s.reps * s.recoverySec;
    rows.push({ label: `${s.reps} × ${s.distanceM} m`, repTime, lap400: (400 / 1000) * s.paceSecKm });
  }
  return {
    workMeters,
    recoveryMeters,
    totalMeters: workMeters + recoveryMeters,
    workSeconds,
    totalSeconds: workSeconds + recSeconds,
    density: recSeconds > 0 ? workSeconds / recSeconds : 0,
    rows,
  };
}

export interface FartlekSegment {
  reps: number;
  fastSec: number;
  fastPaceSecKm: number;
  slowSec: number;
  slowPaceSecKm: number;
}

export function summarizeFartlek(segments: FartlekSegment[]): { totalSeconds: number; totalMeters: number; fastMeters: number; avgPaceSecKm: number } {
  let totalSeconds = 0;
  let fastMeters = 0;
  let slowMeters = 0;
  for (const s of segments) {
    totalSeconds += s.reps * (s.fastSec + s.slowSec);
    fastMeters += s.fastPaceSecKm > 0 ? (s.reps * s.fastSec * 1000) / s.fastPaceSecKm : 0;
    slowMeters += s.slowPaceSecKm > 0 ? (s.reps * s.slowSec * 1000) / s.slowPaceSecKm : 0;
  }
  const totalMeters = fastMeters + slowMeters;
  return { totalSeconds, totalMeters, fastMeters, avgPaceSecKm: totalMeters > 0 ? totalSeconds / (totalMeters / 1000) : 0 };
}

export interface LoadEntry {
  date: Date | string;
  /** Carga de la sesión (sRPE = minutos × RPE). */
  load: number;
}

export interface Acwr {
  acute: number;
  chronic: number;
  ratio: number | null;
  status: "sin datos" | "infracarga" | "óptimo" | "precaución" | "riesgo alto";
  message: string;
}

/** Ratio de carga aguda:crónica (7 días frente a la media semanal de 28 días). */
export function acwr(entries: LoadEntry[], reference: Date = new Date()): Acwr {
  const ref = reference.getTime();
  const day = 86_400_000;
  let acute = 0;
  let last28 = 0;
  for (const e of entries) {
    const age = (ref - new Date(e.date).getTime()) / day;
    if (age < 0 || age >= 28) continue;
    last28 += e.load;
    if (age < 7) acute += e.load;
  }
  const chronic = last28 / 4;
  if (chronic <= 0) return { acute, chronic, ratio: null, status: "sin datos", message: "Registra al menos 3–4 semanas de entrenamiento para calcular el ratio." };
  const ratio = acute / chronic;
  if (ratio < 0.8) return { acute, chronic, ratio, status: "infracarga", message: "Carga por debajo de lo habitual: riesgo de desentrenamiento si se mantiene." };
  if (ratio <= 1.3) return { acute, chronic, ratio, status: "óptimo", message: "Zona óptima (0,8–1,3): progresión sostenible." };
  if (ratio <= 1.5) return { acute, chronic, ratio, status: "precaución", message: "Pico de carga (1,3–1,5): vigila sensaciones y no sumes más volumen." };
  return { acute, chronic, ratio, status: "riesgo alto", message: "Ratio > 1,5: aumento brusco de carga; reduce volumen e intensidad esta semana." };
}

export const ENDURANCE_TYPES = [
  { key: "EASY", label: "Rodaje suave" },
  { key: "LONG", label: "Tirada larga" },
  { key: "TEMPO", label: "Tempo / umbral" },
  { key: "INTERVAL", label: "Series" },
  { key: "FARTLEK", label: "Fartlek" },
  { key: "WALK", label: "Marcha" },
  { key: "RACE", label: "Competición" },
] as const;
