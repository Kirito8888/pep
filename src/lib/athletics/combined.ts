/**
 * Puntuación oficial World Athletics para pruebas combinadas.
 *   Carreras:      P = ⌊A · (B − T)^C⌋   (T en segundos)
 *   Saltos:        P = ⌊A · (M − B)^C⌋   (M en centímetros)
 *   Lanzamientos:  P = ⌊A · (D − B)^C⌋   (D en metros)
 * Es decir, P = A · |B − M|^C con resultado 0 si la marca no supera el umbral B.
 */

export type EventKind = "track" | "jump" | "throw";

export interface CombinedEvent {
  key: string;
  name: string;
  kind: EventKind;
  A: number;
  B: number;
  C: number;
  /** La prueba requiere anemómetro (velocidad corta y saltos horizontales). */
  wind: boolean;
  day: 1 | 2;
}

export type CompetitionKey = "DECATHLON" | "HEPTATHLON" | "HEPTATHLON_INDOOR" | "PENTATHLON_INDOOR";

export interface Competition {
  key: CompetitionKey;
  name: string;
  sex: "M" | "F";
  indoor: boolean;
  events: CombinedEvent[];
}

const ev = (
  key: string,
  name: string,
  kind: EventKind,
  A: number,
  B: number,
  C: number,
  day: 1 | 2,
  wind = false,
): CombinedEvent => ({ key, name, kind, A, B, C, day, wind });

// Constantes masculinas
const M_LJ = [0.14354, 220, 1.4] as const;
const M_SP = [51.39, 1.5, 1.05] as const;
const M_HJ = [0.8465, 75, 1.42] as const;
const M_PV = [0.2797, 100, 1.35] as const;
// Constantes femeninas
const F_HJ = [1.84523, 75, 1.348] as const;
const F_SP = [56.0211, 1.5, 1.05] as const;
const F_LJ = [0.188807, 210, 1.41] as const;
const F_800 = [0.11193, 254, 1.88] as const;

export const COMPETITIONS: Record<CompetitionKey, Competition> = {
  DECATHLON: {
    key: "DECATHLON",
    name: "Decatlón (hombres, aire libre)",
    sex: "M",
    indoor: false,
    events: [
      ev("100m", "100 m", "track", 25.4347, 18, 1.81, 1, true),
      ev("LJ", "Longitud", "jump", ...M_LJ, 1, true),
      ev("SP", "Peso (7,26 kg)", "throw", ...M_SP, 1),
      ev("HJ", "Altura", "jump", ...M_HJ, 1),
      ev("400m", "400 m", "track", 1.53775, 82, 1.81, 1),
      ev("110mH", "110 m vallas", "track", 5.74352, 28.5, 1.92, 2, true),
      ev("DT", "Disco (2 kg)", "throw", 12.91, 4, 1.1, 2),
      ev("PV", "Pértiga", "jump", ...M_PV, 2),
      ev("JT", "Jabalina (800 g)", "throw", 10.14, 7, 1.08, 2),
      ev("1500m", "1.500 m", "track", 0.03768, 480, 1.85, 2),
    ],
  },
  HEPTATHLON: {
    key: "HEPTATHLON",
    name: "Heptatlón (mujeres, aire libre)",
    sex: "F",
    indoor: false,
    events: [
      ev("100mH", "100 m vallas", "track", 9.23076, 26.7, 1.835, 1, true),
      ev("HJ", "Altura", "jump", ...F_HJ, 1),
      ev("SP", "Peso (4 kg)", "throw", ...F_SP, 1),
      ev("200m", "200 m", "track", 4.99087, 42.5, 1.81, 1, true),
      ev("LJ", "Longitud", "jump", ...F_LJ, 2, true),
      ev("JT", "Jabalina (600 g)", "throw", 15.9803, 3.8, 1.04, 2),
      ev("800m", "800 m", "track", ...F_800, 2),
    ],
  },
  HEPTATHLON_INDOOR: {
    key: "HEPTATHLON_INDOOR",
    name: "Heptatlón (hombres, pista cubierta)",
    sex: "M",
    indoor: true,
    events: [
      ev("60m", "60 m", "track", 58.015, 11.5, 1.81, 1),
      ev("LJ", "Longitud", "jump", ...M_LJ, 1),
      ev("SP", "Peso (7,26 kg)", "throw", ...M_SP, 1),
      ev("HJ", "Altura", "jump", ...M_HJ, 1),
      ev("60mH", "60 m vallas", "track", 20.5173, 15.5, 1.92, 2),
      ev("PV", "Pértiga", "jump", ...M_PV, 2),
      ev("1000m", "1.000 m", "track", 0.08713, 305.5, 1.85, 2),
    ],
  },
  PENTATHLON_INDOOR: {
    key: "PENTATHLON_INDOOR",
    name: "Pentatlón (mujeres, pista cubierta)",
    sex: "F",
    indoor: true,
    events: [
      ev("60mH", "60 m vallas", "track", 20.0479, 17, 1.835, 1),
      ev("HJ", "Altura", "jump", ...F_HJ, 1),
      ev("SP", "Peso (4 kg)", "throw", ...F_SP, 1),
      ev("LJ", "Longitud", "jump", ...F_LJ, 1),
      ev("800m", "800 m", "track", ...F_800, 1),
    ],
  },
};

export const COMPETITION_LIST = Object.values(COMPETITIONS);

export const WIND_LIMIT = 2.0;

/**
 * Puntos de una marca. `performance` en segundos (carreras) o en metros (saltos y
 * lanzamientos; los saltos se convierten internamente a centímetros).
 */
export function scoreEvent(event: CombinedEvent, performance: number): number {
  if (!Number.isFinite(performance) || performance <= 0) return 0;
  // Se redondea la entrada para neutralizar errores de coma flotante (p. ej. 7.45 m -> 745 cm).
  const m = event.kind === "jump" ? Math.round(performance * 100) : Math.round(performance * 1000) / 1000;
  const diff = event.kind === "track" ? event.B - m : m - event.B;
  if (diff <= 0) return 0;
  return Math.floor(event.A * Math.pow(diff, event.C) + 1e-9);
}

/**
 * Marca mínima necesaria para alcanzar `points`. Devuelve segundos (carreras, a la
 * centésima) o metros (saltos y lanzamientos, al centímetro).
 */
export function performanceForPoints(event: CombinedEvent, points: number): number {
  if (points <= 0) return event.kind === "track" ? event.B : event.kind === "jump" ? event.B / 100 : event.B;
  const diff = Math.pow(points / event.A, 1 / event.C);
  if (event.kind === "track") {
    let t = Math.floor((event.B - diff) * 100) / 100;
    while (scoreEvent(event, t) < points && t > 0) t = Math.round((t - 0.01) * 100) / 100;
    while (scoreEvent(event, Math.round((t + 0.01) * 100) / 100) >= points) t = Math.round((t + 0.01) * 100) / 100;
    return t;
  }
  const raw = event.kind === "jump" ? (event.B + diff) / 100 : event.B + diff;
  let m = Math.ceil(raw * 100) / 100;
  while (scoreEvent(event, m) < points) m = Math.round((m + 0.01) * 100) / 100;
  while (m > 0.01 && scoreEvent(event, Math.round((m - 0.01) * 100) / 100) >= points) m = Math.round((m - 0.01) * 100) / 100;
  return m;
}

export interface PerformanceInput {
  /** Segundos o metros. */
  value: number | null;
  wind?: number | null;
}

export interface ScoredEvent {
  event: CombinedEvent;
  value: number | null;
  wind: number | null;
  points: number;
  windOverLimit: boolean;
}

export interface WindValidation {
  /** Media de los vientos medidos en las pruebas con anemómetro. */
  average: number | null;
  measured: number;
  required: number;
  eventsOverLimit: string[];
  /** Válido a efectos de récord: media ≤ +2,0 m/s y todos los vientos registrados. */
  recordLegal: boolean;
  message: string;
}

export interface CombinedScore {
  events: ScoredEvent[];
  total: number;
  day1: number;
  day2: number;
  wind: WindValidation;
}

export function scoreCompetition(
  competition: Competition,
  performances: Record<string, PerformanceInput | undefined>,
): CombinedScore {
  const events: ScoredEvent[] = competition.events.map((event) => {
    const p = performances[event.key];
    const value = p?.value ?? null;
    const wind = event.wind && p?.wind != null && Number.isFinite(p.wind) ? p.wind : null;
    return {
      event,
      value,
      wind,
      points: value != null ? scoreEvent(event, value) : 0,
      windOverLimit: wind != null && wind > WIND_LIMIT,
    };
  });
  const total = events.reduce((a, e) => a + e.points, 0);
  const day1 = events.filter((e) => e.event.day === 1).reduce((a, e) => a + e.points, 0);
  return { events, total, day1, day2: total - day1, wind: validateWind(events) };
}

export function validateWind(events: ScoredEvent[]): WindValidation {
  const windEvents = events.filter((e) => e.event.wind);
  const measured = windEvents.filter((e) => e.wind != null);
  const over = measured.filter((e) => e.windOverLimit).map((e) => e.event.name);
  const average = measured.length ? measured.reduce((a, e) => a + (e.wind ?? 0), 0) / measured.length : null;
  const required = windEvents.length;
  if (required === 0) {
    return { average: null, measured: 0, required: 0, eventsOverLimit: [], recordLegal: true, message: "Competición en pista cubierta: no se mide el viento." };
  }
  const allMeasured = measured.length === required;
  const recordLegal = allMeasured && average != null && average <= WIND_LIMIT;
  let message: string;
  if (!allMeasured) {
    message = `Faltan ${required - measured.length} lectura(s) de viento para validar la puntuación a efectos de récord.`;
  } else if (recordLegal && over.length === 0) {
    message = "Todos los vientos ≤ +2,0 m/s: puntuación plenamente reglamentaria.";
  } else if (recordLegal) {
    message = `Media de viento ${average!.toFixed(1)} m/s (≤ +2,0): válida para récord de combinadas, aunque ${over.join(", ")} no valdría como marca individual.`;
  } else {
    message = `Media de viento ${average!.toFixed(1)} m/s (> +2,0): la puntuación cuenta para la clasificación, pero NO es válida a efectos de récord.`;
  }
  return { average, measured: measured.length, required, eventsOverLimit: over, recordLegal, message };
}

/** Marca individual reglamentaria respecto al viento (≤ +2,0 m/s). */
export function isWindLegal(wind: number | null | undefined): boolean {
  return wind == null || wind <= WIND_LIMIT;
}
