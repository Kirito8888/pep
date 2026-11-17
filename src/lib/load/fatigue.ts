import { BLOCK_LABEL, BLOCK_RANK } from "@/lib/athletics/events";
import { dayIndex, DAY_NAMES } from "@/lib/dates";
import { emptyMetrics, sessionMetrics, sumMetrics, type BlockLoad, type LoadMetrics, type SessionLoad } from "./metrics";

/**
 * Semáforo de fatiga neural (SNC) y estrés articular.
 *
 * Los umbrales son heurísticas de entrenador (no constantes fisiológicas): están
 * reunidos aquí para poder ajustarlos al atleta y a su nivel.
 */
export const FATIGUE_CONFIG = {
  /** Unidades que equivalen a 1 punto de carga neural diaria. */
  neuralUnits: { sprintMetersHigh: 40, hurdles: 8, plyoContacts: 20, throwsHigh: 5, heavySets: 2 },
  /** Unidades que equivalen a 1 punto de estrés articular diario. */
  jointUnits: { throwsTotal: 15, throwsHigh: 8, plyoContacts: 40, hurdles: 20, tonnageKg: 5000 },
  /** Puntuación diaria a partir de la cual el día es de demanda moderada / alta. */
  dayModerate: 3,
  dayHigh: 6,
  /** Umbrales semanales [ámbar, rojo]. */
  weekly: {
    sprintMetersHigh: [600, 900],
    hurdles: [120, 200],
    plyoContacts: [320, 450],
    throwsTotal: [180, 260],
    throwsHigh: [60, 90],
    tonnageKg: [25000, 40000],
  },
  /** Máximo de días de alta demanda neural por semana antes de avisar. */
  maxHighDaysPerWeek: 3,
} as const;

export type Light = "green" | "amber" | "red";
export type DayLevel = "rest" | "low" | "moderate" | "high";

const worst = (a: Light, b: Light): Light => (a === "red" || b === "red" ? "red" : a === "amber" || b === "amber" ? "amber" : "green");

export function neuralScore(m: LoadMetrics): number {
  const u = FATIGUE_CONFIG.neuralUnits;
  return (
    m.sprintMetersHigh / u.sprintMetersHigh +
    m.hurdles / u.hurdles +
    m.plyoContacts / u.plyoContacts +
    m.throwsHigh / u.throwsHigh +
    m.heavySets / u.heavySets
  );
}

export function jointScore(m: LoadMetrics): number {
  const u = FATIGUE_CONFIG.jointUnits;
  return (
    m.throwsTotal / u.throwsTotal +
    m.throwsHigh / u.throwsHigh +
    m.plyoContacts / u.plyoContacts +
    m.hurdles / u.hurdles +
    m.tonnageKg / u.tonnageKg
  );
}

function level(score: number, hasSession: boolean): DayLevel {
  if (!hasSession) return "rest";
  if (score >= FATIGUE_CONFIG.dayHigh) return "high";
  if (score >= FATIGUE_CONFIG.dayModerate) return "moderate";
  return "low";
}

export interface DayFatigue {
  day: number;
  label: string;
  sessions: number;
  metrics: LoadMetrics;
  neural: number;
  joint: number;
  neuralLevel: DayLevel;
  jointLevel: DayLevel;
}

export interface FatigueAlert {
  severity: "amber" | "red";
  kind: "neural" | "joint" | "volume" | "order";
  message: string;
}

export interface WeekFatigue {
  days: DayFatigue[];
  totals: LoadMetrics;
  indicators: { key: keyof typeof FATIGUE_CONFIG.weekly; label: string; value: number; amber: number; red: number; light: Light; unit: string }[];
  alerts: FatigueAlert[];
  neuralLight: Light;
  jointLight: Light;
  overall: Light;
}

const INDICATOR_LABELS: Record<keyof typeof FATIGUE_CONFIG.weekly, { label: string; unit: string }> = {
  sprintMetersHigh: { label: "Sprint > 95 %", unit: "m" },
  hurdles: { label: "Vallas pasadas", unit: "" },
  plyoContacts: { label: "Contactos pliométricos", unit: "" },
  throwsTotal: { label: "Lanzamientos totales", unit: "" },
  throwsHigh: { label: "Lanzamientos > 90 %", unit: "" },
  tonnageKg: { label: "Tonelaje de gimnasio", unit: "kg" },
};

/** Racha más larga de días consecutivos que cumplen la condición. */
function longestRun(days: DayFatigue[], pred: (d: DayFatigue) => boolean): { length: number; start: number } {
  let best = { length: 0, start: 0 };
  let cur = 0;
  days.forEach((d, i) => {
    cur = pred(d) ? cur + 1 : 0;
    if (cur > best.length) best = { length: cur, start: i - cur + 1 };
  });
  return best;
}

const rangeLabel = (start: number, length: number) => `${DAY_NAMES[start]}–${DAY_NAMES[start + length - 1]}`;

/** Analiza las sesiones de una semana (lunes a domingo). */
export function analyzeWeek(sessions: SessionLoad[]): WeekFatigue {
  const days: DayFatigue[] = DAY_NAMES.map((label, day) => {
    const list = sessions.filter((s) => dayIndex(s.date) === day);
    const metrics = list.length ? sumMetrics(list.map(sessionMetrics)) : emptyMetrics();
    const neural = neuralScore(metrics);
    const joint = jointScore(metrics);
    return {
      day,
      label,
      sessions: list.length,
      metrics,
      neural: Math.round(neural * 10) / 10,
      joint: Math.round(joint * 10) / 10,
      neuralLevel: level(neural, list.length > 0),
      jointLevel: level(joint, list.length > 0),
    };
  });
  const totals = sumMetrics(days.map((d) => d.metrics));
  const alerts: FatigueAlert[] = [];
  let neuralLight: Light = "green";
  let jointLight: Light = "green";

  const indicators = (Object.keys(FATIGUE_CONFIG.weekly) as (keyof typeof FATIGUE_CONFIG.weekly)[]).map((key) => {
    const [amber, red] = FATIGUE_CONFIG.weekly[key];
    const value = Math.round(totals[key]);
    const light: Light = value >= red ? "red" : value >= amber ? "amber" : "green";
    const { label, unit } = INDICATOR_LABELS[key];
    if (light !== "green") {
      alerts.push({
        severity: light,
        kind: "volume",
        message: `${label}: ${value}${unit ? ` ${unit}` : ""} esta semana (umbral ${light === "red" ? red : amber}${unit ? ` ${unit}` : ""}).`,
      });
      if (key === "sprintMetersHigh" || key === "hurdles") neuralLight = worst(neuralLight, light);
      else if (key === "plyoContacts") {
        neuralLight = worst(neuralLight, light);
        jointLight = worst(jointLight, light);
      } else jointLight = worst(jointLight, light);
    }
    return { key, label, value, amber, red, light, unit };
  });

  // Días consecutivos de alta demanda neural.
  const neuralRun = longestRun(days, (d) => d.neuralLevel === "high");
  if (neuralRun.length >= 2) {
    const sev = neuralRun.length >= 3 ? "red" : "amber";
    neuralLight = worst(neuralLight, sev);
    alerts.push({
      severity: sev,
      kind: "neural",
      message: `${neuralRun.length} días seguidos de alta demanda neural (${rangeLabel(neuralRun.start, neuralRun.length)}): el SNC necesita 48 h entre estímulos máximos. Intercala un día de baja intensidad.`,
    });
  }
  const highDays = days.filter((d) => d.neuralLevel === "high").length;
  if (highDays > FATIGUE_CONFIG.maxHighDaysPerWeek) {
    neuralLight = worst(neuralLight, "amber");
    alerts.push({ severity: "amber", kind: "neural", message: `${highDays} días de alta demanda neural en la semana (máximo recomendado: ${FATIGUE_CONFIG.maxHighDaysPerWeek}).` });
  }
  // Días consecutivos de alto estrés articular.
  const jointRun = longestRun(days, (d) => d.jointLevel === "high");
  if (jointRun.length >= 2) {
    const sev = jointRun.length >= 3 ? "red" : "amber";
    jointLight = worst(jointLight, sev);
    alerts.push({
      severity: sev,
      kind: "joint",
      message: `${jointRun.length} días seguidos de alto estrés articular (${rangeLabel(jointRun.start, jointRun.length)}): separa lanzamientos, pliometría y cargas pesadas.`,
    });
  }
  // Lanzamientos intensos en días consecutivos (codo / hombro).
  const throwRun = longestRun(days, (d) => d.metrics.throwsHigh >= 15);
  if (throwRun.length >= 2) {
    jointLight = worst(jointLight, throwRun.length >= 3 ? "red" : "amber");
    alerts.push({
      severity: throwRun.length >= 3 ? "red" : "amber",
      kind: "joint",
      message: `Lanzamientos > 90 % en días consecutivos (${rangeLabel(throwRun.start, throwRun.length)}): riesgo para codo (LCC) y manguito rotador.`,
    });
  }
  // Pliometría intensa en días consecutivos (tendón rotuliano / aquíleo).
  const plyoRun = longestRun(days, (d) => d.metrics.plyoContacts >= 80);
  if (plyoRun.length >= 2) {
    jointLight = worst(jointLight, "amber");
    alerts.push({
      severity: "amber",
      kind: "joint",
      message: `Más de 80 contactos pliométricos en días consecutivos (${rangeLabel(plyoRun.start, plyoRun.length)}): sobrecarga de tendón rotuliano y aquíleo.`,
    });
  }
  // Orden fisiológico dentro de cada sesión.
  for (const s of sessions) {
    for (const w of validateBlockOrder(s.blocks)) {
      alerts.push({ severity: "amber", kind: "order", message: `${s.title ?? "Sesión"} (${DAY_NAMES[dayIndex(s.date)]}): ${w}` });
    }
  }
  return { days, totals, indicators, alerts, neuralLight, jointLight, overall: worst(neuralLight, jointLight) };
}

/**
 * Comprueba el orden fisiológico de los bloques:
 * Movilidad/Prehab -> Velocidad/Técnica -> Saltos/Lanzamientos -> Fuerza/Potencia -> Metabólico.
 */
export function validateBlockOrder(blocks: Pick<BlockLoad, "type">[]): string[] {
  const warnings: string[] = [];
  for (let i = 1; i < blocks.length; i++) {
    const prev = blocks[i - 1].type;
    const cur = blocks[i].type;
    if ((BLOCK_RANK[cur] ?? 0) < (BLOCK_RANK[prev] ?? 0)) {
      warnings.push(`"${BLOCK_LABEL[cur]}" está después de "${BLOCK_LABEL[prev]}": el trabajo de mayor exigencia neural debe ir antes.`);
    }
  }
  return warnings;
}

export const LIGHT_LABEL: Record<Light, string> = { green: "Verde", amber: "Ámbar", red: "Rojo" };
