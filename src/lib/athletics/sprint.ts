/**
 * Modelos de velocidad. La curva de aceleración usa el modelo mono-exponencial
 * v(t) = vmax · (1 − e^(−t/τ)); los parciales de 200 y 400 m usan distribuciones
 * de ritmo de referencia. Son estimaciones orientativas, no mediciones.
 */

export const REACTION_TIME = 0.15;

export function speedMs(distanceM: number, seconds: number): number {
  return seconds > 0 ? distanceM / seconds : 0;
}

export function msToKmh(ms: number): number {
  return ms * 3.6;
}

function positionAt(t: number, vmax: number, tau: number): number {
  return vmax * (t - tau * (1 - Math.exp(-t / tau)));
}

/** Ajusta vmax para que el modelo recorra `distance` en `time` (incluye tiempo de reacción). */
export function fitVmax(distance: number, time: number, tau = 1.3, reaction = REACTION_TIME): number {
  const run = time - reaction;
  if (run <= 0) return 0;
  return distance / (run - tau * (1 - Math.exp(-run / tau)));
}

/** Tiempo (con reacción) en el que el modelo alcanza `distance`. */
export function timeAtDistance(distance: number, vmax: number, tau = 1.3, reaction = REACTION_TIME): number {
  if (distance <= 0) return 0;
  let lo = 0;
  let hi = 120;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (positionAt(mid, vmax, tau) < distance) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2 + reaction;
}

export interface Split {
  from: number;
  to: number;
  /** Tiempo acumulado al final del tramo. */
  cumulative: number;
  segment: number;
  speedMs: number;
  speedKmh: number;
}

function toSplits(marks: number[], times: number[]): Split[] {
  return marks.map((to, i) => {
    const from = i === 0 ? 0 : marks[i - 1];
    const segment = times[i] - (i === 0 ? 0 : times[i - 1]);
    const v = (to - from) / segment;
    return { from, to, cumulative: times[i], segment, speedMs: v, speedKmh: v * 3.6 };
  });
}

/** Distribución de ritmo por tramos de 50 m (fracción del tiempo total). */
const PACE_200 = [0.29, 0.2275, 0.2325, 0.25];
const PACE_400 = [6.1, 5.0, 5.05, 5.15, 5.35, 5.55, 5.8, 6.0].map((s) => s / 44);

export type SprintDistance = 60 | 100 | 200 | 400;

export interface SprintModel {
  distance: SprintDistance;
  time: number;
  splits: Split[];
  /** Agregados cada 100 m para 200/400. */
  hundreds: Split[];
  vmaxMs: number;
  vmaxKmh: number;
  flying30: number;
  avgMs: number;
  avgKmh: number;
  note: string;
}

export function sprintModel(distance: SprintDistance, time: number, tau = 1.3): SprintModel {
  const avg = distance / time;
  if (distance <= 100) {
    const vmax = fitVmax(distance, time, tau);
    const marks: number[] = [];
    for (let d = 10; d <= distance; d += 10) marks.push(d);
    const times = marks.map((d) => timeAtDistance(d, vmax, tau));
    times[times.length - 1] = time;
    const splits = toSplits(marks, times);
    const top = Math.max(...splits.map((s) => s.speedMs));
    return {
      distance,
      time,
      splits,
      hundreds: [],
      vmaxMs: top,
      vmaxKmh: top * 3.6,
      flying30: 30 / top,
      avgMs: avg,
      avgKmh: avg * 3.6,
      note: "Parciales cada 10 m según el modelo de aceleración mono-exponencial (incluye 0,15 s de reacción).",
    };
  }
  const pace = distance === 200 ? PACE_200 : PACE_400;
  let acc = 0;
  const marks = pace.map((_, i) => (i + 1) * 50);
  const times = pace.map((p) => (acc += p * time));
  times[times.length - 1] = time;
  const splits = toSplits(marks, times);
  const hMarks = marks.filter((m) => m % 100 === 0);
  const hTimes = hMarks.map((m) => times[marks.indexOf(m)]);
  const top = Math.max(...splits.map((s) => s.speedMs));
  return {
    distance,
    time,
    splits,
    hundreds: toSplits(hMarks, hTimes),
    vmaxMs: top,
    vmaxKmh: top * 3.6,
    flying30: 30 / top,
    avgMs: avg,
    avgKmh: avg * 3.6,
    note:
      distance === 200
        ? "Parciales cada 50 m con distribución de referencia (curva más lenta por la salida; recta con ligera pérdida)."
        : "Parciales cada 50 m con distribución de referencia de 400 m (diferencial entre mitades ≈ 3 % del tiempo).",
  };
}

/** Análisis de parciales introducidos a mano (tiempos acumulados). */
export function analyzeSplits(marks: number[], cumulativeTimes: number[]): Split[] {
  const pairs = marks
    .map((m, i) => ({ m, t: cumulativeTimes[i] }))
    .filter((p) => Number.isFinite(p.t) && p.t > 0)
    .sort((a, b) => a.m - b.m);
  const valid = pairs.filter((p, i) => i === 0 || p.t > pairs[i - 1].t);
  return toSplits(
    valid.map((p) => p.m),
    valid.map((p) => p.t),
  );
}

export const SPLIT_MARKS: Record<SprintDistance, number[]> = {
  60: [10, 20, 30, 40, 50, 60],
  100: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
  200: [50, 100, 150, 200],
  400: [50, 100, 150, 200, 250, 300, 350, 400],
};
