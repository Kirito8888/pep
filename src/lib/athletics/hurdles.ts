/** Especificaciones reglamentarias de vallas y ritmo entre vallas. */

export interface HurdleSpec {
  key: string;
  label: string;
  distance: number;
  hurdles: number;
  heightM: number;
  toFirst: number;
  spacing: number;
  runIn: number;
  /** Longitud habitual de la zancada de paso de valla (batida + caída), en metros. */
  clearance: number;
  stepsToFirst: number[];
  stepsBetween: number[];
}

const spec = (
  key: string,
  label: string,
  distance: number,
  hurdles: number,
  heightM: number,
  toFirst: number,
  spacing: number,
  clearance: number,
  stepsToFirst: number[],
  stepsBetween: number[],
): HurdleSpec => ({
  key,
  label,
  distance,
  hurdles,
  heightM,
  toFirst,
  spacing,
  runIn: Math.round((distance - toFirst - spacing * (hurdles - 1)) * 100) / 100,
  clearance,
  stepsToFirst,
  stepsBetween,
});

export const HURDLE_SPECS: HurdleSpec[] = [
  spec("60mH_M", "60 m vallas — hombres absoluto (1,067 m)", 60, 5, 1.067, 13.72, 9.14, 3.5, [7, 8], [3]),
  spec("60mH_M_U20", "60 m vallas — hombres sub-20 (0,991 m)", 60, 5, 0.991, 13.72, 9.14, 3.45, [7, 8], [3]),
  spec("60mH_M_U18", "60 m vallas — hombres sub-18 (0,914 m)", 60, 5, 0.914, 13.72, 9.14, 3.4, [7, 8], [3]),
  spec("60mH_F", "60 m vallas — mujeres absoluto (0,838 m)", 60, 5, 0.838, 13.0, 8.5, 3.0, [8], [3]),
  spec("60mH_F_U18", "60 m vallas — mujeres sub-18 (0,762 m)", 60, 5, 0.762, 13.0, 8.5, 2.95, [8], [3]),
  spec("100mH_F", "100 m vallas — mujeres absoluto (0,838 m)", 100, 10, 0.838, 13.0, 8.5, 3.0, [8], [3]),
  spec("100mH_F_U18", "100 m vallas — mujeres sub-18 (0,762 m)", 100, 10, 0.762, 13.0, 8.5, 2.95, [8], [3]),
  spec("110mH_M", "110 m vallas — hombres absoluto (1,067 m)", 110, 10, 1.067, 13.72, 9.14, 3.5, [7, 8], [3]),
  spec("110mH_M_U20", "110 m vallas — hombres sub-20 (0,991 m)", 110, 10, 0.991, 13.72, 9.14, 3.45, [7, 8], [3]),
  spec("110mH_M_U18", "110 m vallas — hombres sub-18 (0,914 m)", 110, 10, 0.914, 13.72, 9.14, 3.4, [7, 8], [3]),
  spec("400mH_M", "400 m vallas — hombres absoluto (0,914 m)", 400, 10, 0.914, 45, 35, 3.3, [20, 21, 22], [12, 13, 14, 15]),
  spec("400mH_M_U18", "400 m vallas — hombres sub-18 (0,838 m)", 400, 10, 0.838, 45, 35, 3.25, [21, 22, 23], [13, 14, 15, 16]),
  spec("400mH_F", "400 m vallas — mujeres (0,762 m)", 400, 10, 0.762, 45, 35, 3.0, [22, 23, 24], [14, 15, 16, 17]),
];

export function hurdlePositions(s: HurdleSpec): number[] {
  return Array.from({ length: s.hurdles }, (_, i) => Math.round((s.toFirst + i * s.spacing) * 100) / 100);
}

/** Zancada media necesaria para hacer `steps` pasos entre vallas. */
export function strideBetween(s: HurdleSpec, steps: number): number {
  return (s.spacing - s.clearance) / steps;
}

/** Zancada media de aproximación a la primera valla (descontando la batida ≈ 60 % del paso de valla). */
export function strideToFirst(s: HurdleSpec, steps: number): number {
  return (s.toFirst - s.clearance * 0.6) / steps;
}

export interface Touchdown {
  hurdle: number;
  position: number;
  time: number;
  interval: number;
}

export interface HurdleRhythm {
  touchdowns: Touchdown[];
  runInTime: number;
  avgInterval: number;
  /** Frecuencia media entre vallas (pasos/s) para el patrón elegido. */
  cadence: number;
}

/**
 * Tiempos de contacto tras cada valla (touchdowns) orientativos para un tiempo objetivo.
 * Vallas cortas: intervalos casi constantes. 400 mv: intervalos crecientes por fatiga.
 */
export function hurdleRhythm(s: HurdleSpec, goalTime: number, stepsBetween: number): HurdleRhythm {
  const isLong = s.distance === 400;
  const firstFrac = isLong ? 0.125 : s.distance === 60 ? 0.33 : s.distance === 100 ? 0.2 : 0.192;
  const runInFrac = isLong ? 0.108 : s.distance === 60 ? 0.165 : s.distance === 100 ? 0.085 : 0.108;
  const first = goalTime * firstFrac;
  const runInTime = goalTime * runInFrac;
  const between = goalTime - first - runInTime;
  const n = s.hurdles - 1;
  // Pesos: en 400 mv cada intervalo es ~2,2 % más lento que el anterior.
  const weights = Array.from({ length: n }, (_, i) => (isLong ? Math.pow(1.022, i) : i < 2 ? 1.02 : 1));
  const wSum = weights.reduce((a, c) => a + c, 0);
  const touchdowns: Touchdown[] = [{ hurdle: 1, position: s.toFirst, time: first, interval: first }];
  let t = first;
  for (let i = 0; i < n; i++) {
    const interval = (between * weights[i]) / wSum;
    t += interval;
    touchdowns.push({ hurdle: i + 2, position: s.toFirst + (i + 1) * s.spacing, time: t, interval });
  }
  const avgInterval = between / n;
  return { touchdowns, runInTime, avgInterval, cadence: (stepsBetween + 1) / avgInterval };
}

export const STEEPLE_INFO = [
  { key: "3000SC", label: "3.000 m obstáculos", barriers: 28, waterJumps: 7, laps: "7 vueltas completas + tramo inicial sin obstáculos" },
  { key: "2000SC", label: "2.000 m obstáculos", barriers: 18, waterJumps: 5, laps: "5 vueltas completas + tramo inicial" },
];
export const STEEPLE_HEIGHTS = { M: 0.914, F: 0.762 };
