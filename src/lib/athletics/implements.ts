/** Artefactos reglamentarios e implementos de entrenamiento (pesos en gramos). */

export type ThrowEvent = "JAVELIN" | "SHOT" | "DISCUS" | "HAMMER";
export type Category = "SENIOR" | "U20" | "U18";

export const THROW_EVENTS: { key: ThrowEvent; label: string }[] = [
  { key: "JAVELIN", label: "Jabalina" },
  { key: "SHOT", label: "Peso" },
  { key: "DISCUS", label: "Disco" },
  { key: "HAMMER", label: "Martillo" },
];

export const CATEGORIES: { key: Category; label: string }[] = [
  { key: "SENIOR", label: "Absoluta / Sub-23" },
  { key: "U20", label: "Sub-20" },
  { key: "U18", label: "Sub-18" },
];

/** Peso oficial World Athletics por prueba, sexo y categoría. */
export const OFFICIAL_WEIGHTS: Record<ThrowEvent, Record<"M" | "F", Record<Category, number>>> = {
  JAVELIN: { M: { SENIOR: 800, U20: 800, U18: 700 }, F: { SENIOR: 600, U20: 600, U18: 500 } },
  SHOT: { M: { SENIOR: 7260, U20: 6000, U18: 5000 }, F: { SENIOR: 4000, U20: 4000, U18: 3000 } },
  DISCUS: { M: { SENIOR: 2000, U20: 1750, U18: 1500 }, F: { SENIOR: 1000, U20: 1000, U18: 1000 } },
  HAMMER: { M: { SENIOR: 7260, U20: 6000, U18: 5000 }, F: { SENIOR: 4000, U20: 4000, U18: 3000 } },
};

export function officialWeight(event: ThrowEvent, sex: "M" | "F", category: Category = "SENIOR"): number {
  return OFFICIAL_WEIGHTS[event][sex][category];
}

export type ImplementKind = "OFFICIAL" | "HEAVY" | "LIGHT" | "NOCKENBALL" | "MEDBALL";

export const IMPLEMENT_KINDS: { key: ImplementKind; label: string }[] = [
  { key: "OFFICIAL", label: "Reglamentario" },
  { key: "HEAVY", label: "Lastrado / pesado" },
  { key: "LIGHT", label: "Aligerado" },
  { key: "NOCKENBALL", label: "Nockenball / pelota lastrada" },
  { key: "MEDBALL", label: "Balón medicinal" },
];

export interface ImplementPreset {
  name: string;
  weightG: number;
  kind: ImplementKind;
}

/** Implementos habituales de entrenamiento por prueba. */
export const IMPLEMENT_PRESETS: Record<ThrowEvent, ImplementPreset[]> = {
  JAVELIN: [
    { name: "Jabalina 500 g", weightG: 500, kind: "LIGHT" },
    { name: "Jabalina 600 g", weightG: 600, kind: "LIGHT" },
    { name: "Jabalina 700 g", weightG: 700, kind: "LIGHT" },
    { name: "Jabalina 800 g", weightG: 800, kind: "OFFICIAL" },
    { name: "Jabalina 900 g", weightG: 900, kind: "HEAVY" },
    { name: "Jabalina 1000 g", weightG: 1000, kind: "HEAVY" },
    { name: "Nockenball 400 g", weightG: 400, kind: "NOCKENBALL" },
    { name: "Nockenball 600 g", weightG: 600, kind: "NOCKENBALL" },
    { name: "Nockenball 800 g", weightG: 800, kind: "NOCKENBALL" },
    { name: "Nockenball 1000 g", weightG: 1000, kind: "NOCKENBALL" },
  ],
  SHOT: [
    { name: "Peso 3 kg", weightG: 3000, kind: "LIGHT" },
    { name: "Peso 4 kg", weightG: 4000, kind: "OFFICIAL" },
    { name: "Peso 5 kg", weightG: 5000, kind: "LIGHT" },
    { name: "Peso 6 kg", weightG: 6000, kind: "LIGHT" },
    { name: "Peso 7,26 kg", weightG: 7260, kind: "OFFICIAL" },
    { name: "Peso 8 kg", weightG: 8000, kind: "HEAVY" },
    { name: "Peso 9 kg", weightG: 9000, kind: "HEAVY" },
  ],
  DISCUS: [
    { name: "Disco 0,75 kg", weightG: 750, kind: "LIGHT" },
    { name: "Disco 1 kg", weightG: 1000, kind: "OFFICIAL" },
    { name: "Disco 1,5 kg", weightG: 1500, kind: "LIGHT" },
    { name: "Disco 1,75 kg", weightG: 1750, kind: "LIGHT" },
    { name: "Disco 2 kg", weightG: 2000, kind: "OFFICIAL" },
    { name: "Disco 2,25 kg", weightG: 2250, kind: "HEAVY" },
    { name: "Disco 2,5 kg", weightG: 2500, kind: "HEAVY" },
  ],
  HAMMER: [
    { name: "Martillo 3 kg", weightG: 3000, kind: "LIGHT" },
    { name: "Martillo 4 kg", weightG: 4000, kind: "OFFICIAL" },
    { name: "Martillo 5 kg", weightG: 5000, kind: "LIGHT" },
    { name: "Martillo 6 kg", weightG: 6000, kind: "LIGHT" },
    { name: "Martillo 7,26 kg", weightG: 7260, kind: "OFFICIAL" },
    { name: "Martillo 8 kg", weightG: 8000, kind: "HEAVY" },
    { name: "Martillo 9 kg", weightG: 9000, kind: "HEAVY" },
  ],
};

/** % de peso del implemento respecto al oficial. */
export function weightPercent(weightG: number, officialG: number): number {
  if (!officialG) return 0;
  return Math.round((weightG / officialG) * 1000) / 10;
}

/** Clasifica un implemento respecto al peso oficial del atleta. */
export function classifyImplement(weightG: number, officialG: number): "OFFICIAL" | "HEAVY" | "LIGHT" {
  if (weightG === officialG) return "OFFICIAL";
  return weightG > officialG ? "HEAVY" : "LIGHT";
}

export function describeLoad(weightG: number, officialG: number): string {
  const pct = weightPercent(weightG, officialG);
  const c = classifyImplement(weightG, officialG);
  if (c === "OFFICIAL") return "Reglamentario (100 %): transferencia técnica directa.";
  if (c === "HEAVY") {
    return pct > 125
      ? `Pesado (${pct} %): fuerza específica; limita el volumen, altera el ritmo técnico.`
      : `Pesado (${pct} %): fuerza específica manteniendo la estructura técnica.`;
  }
  return pct < 75
    ? `Ligero (${pct} %): velocidad de brazo/implemento; máximo estrés de frenado en codo y hombro.`
    : `Ligero (${pct} %): velocidad específica de liberación.`;
}

export const JAVELIN_THROW_TYPES = [
  { key: "STAND", label: "Parado" },
  { key: "STEP3", label: "3 pasos" },
  { key: "STEP5", label: "5 pasos" },
  { key: "FULL", label: "Carrera completa" },
] as const;

export const CROSS_STEP_OPTIONS = [3, 5, 7] as const;

export const WIND_TYPES = [
  { key: "NONE", label: "Sin viento" },
  { key: "HEAD", label: "En contra" },
  { key: "TAIL", label: "A favor" },
  { key: "CROSS", label: "Lateral" },
] as const;

export const ANGLE_OPTIONS = [
  { key: "LOW", label: "Bajo / plano (< 30°)" },
  { key: "OPTIMAL", label: "Óptimo (32–36°)" },
  { key: "HIGH", label: "Alto (> 38°)" },
  { key: "NOSE_UP", label: "Punta arriba (actitud abierta)" },
  { key: "NOSE_DOWN", label: "Punta abajo (actitud cerrada)" },
] as const;

/** Consejo técnico de ángulo según el viento. */
export function windAdvice(windType: string): string {
  switch (windType) {
    case "HEAD":
      return "Viento en contra: baja 2–3° el ángulo de salida y mantén la punta cerrada para evitar que la jabalina se frene y caiga de cola.";
    case "TAIL":
      return "Viento a favor: puedes abrir 1–2° el ángulo de salida; la jabalina tiende a picar antes, cuida la actitud.";
    case "CROSS":
      return "Viento lateral: alinea la jabalina con la dirección de lanzamiento y apunta ligeramente hacia el lado del que sopla.";
    default:
      return "Sin viento relevante: busca 32–36° con la punta alineada con la trayectoria.";
  }
}

export const PREHAB_ITEMS = [
  { key: "ext_rot", label: "Rotadores externos (banda / polea)", area: "Manguito rotador" },
  { key: "scap", label: "Estabilidad escapular (Y-T-W, serrato)", area: "Hombro" },
  { key: "thoracic", label: "Movilidad torácica (extensión y rotación)", area: "Columna torácica" },
  { key: "anti_ext", label: "Core anti-extensión (rueda abdominal, dead bug)", area: "Zona lumbar" },
  { key: "anti_rot", label: "Core anti-rotación (press Pallof)", area: "Zona lumbar" },
  { key: "forearm", label: "Flexo-pronadores del antebrazo (protección LCC)", area: "Codo" },
  { key: "post_cuff", label: "Estiramiento cápsula posterior (sleeper suave)", area: "Hombro" },
  { key: "hips", label: "Movilidad de cadera (rotación interna pierna de bloqueo)", area: "Cadera" },
] as const;

export const MEDBALL_TYPES = [
  { key: "OVERHEAD", label: "Overhead (por encima de la cabeza)" },
  { key: "ROTATIONAL", label: "Rotacional" },
  { key: "CHEST", label: "Pecho" },
  { key: "SHOT", label: "Tipo peso (una mano)" },
] as const;

/** Umbrales semanales orientativos de lanzamientos por prueba (totales y de alta intensidad ≥ 90 %). */
export const WEEKLY_THROW_LIMITS: Record<ThrowEvent, { total: [number, number]; high: [number, number] }> = {
  JAVELIN: { total: [150, 220], high: [45, 70] },
  SHOT: { total: [220, 320], high: [70, 110] },
  DISCUS: { total: [220, 320], high: [70, 110] },
  HAMMER: { total: [200, 300], high: [60, 100] },
};

export type Light = "green" | "amber" | "red";

export function lightFor(value: number, [amber, red]: [number, number]): Light {
  if (value >= red) return "red";
  if (value >= amber) return "amber";
  return "green";
}

export interface ThrowEntry {
  event: string;
  count: number;
  intensityPct: number;
  weightG: number;
  officialWeightG: number;
}

export interface JointLoad {
  total: number;
  low: number;
  medium: number;
  high: number;
  lightImplementHigh: number;
  heavyImplement: number;
  elbow: Light;
  shoulder: Light;
  lumbar: Light;
  messages: string[];
}

/** Carga articular semanal del lanzador a partir de sus registros de lanzamientos. */
export function jointLoad(entries: ThrowEntry[], event: ThrowEvent = "JAVELIN"): JointLoad {
  let low = 0;
  let medium = 0;
  let high = 0;
  let lightHigh = 0;
  let heavy = 0;
  for (const e of entries) {
    if (e.intensityPct >= 90) high += e.count;
    else if (e.intensityPct >= 75) medium += e.count;
    else low += e.count;
    if (e.weightG < e.officialWeightG && e.intensityPct >= 90) lightHigh += e.count;
    if (e.weightG > e.officialWeightG) heavy += e.count;
  }
  const total = low + medium + high;
  const limits = WEEKLY_THROW_LIMITS[event];
  // Codo (LCC): lo castigan los lanzamientos de alta intensidad y, sobre todo, los implementos ligeros a máxima velocidad.
  const elbow = lightFor(high + lightHigh * 0.5, limits.high);
  // Hombro (manguito): volumen total + alta intensidad.
  const shoulder = lightFor(total + high * 0.5, [limits.total[0] * 1.1, limits.total[1] * 1.1]);
  // Lumbar: volumen total con peso extra por implementos pesados.
  const lumbar = lightFor(total + heavy * 0.75, [limits.total[0] * 1.15, limits.total[1] * 1.15]);
  const messages: string[] = [];
  if (elbow !== "green") messages.push(`Codo (LCC): ${high} lanzamientos ≥ 90 % esta semana${lightHigh ? `, ${lightHigh} con implemento ligero` : ""}. Reduce la intensidad y refuerza flexo-pronadores.`);
  if (shoulder !== "green") messages.push(`Hombro: ${total} lanzamientos totales. Prioriza rotadores externos y estabilidad escapular antes de volver a lanzar.`);
  if (lumbar !== "green") messages.push(`Zona lumbar: volumen alto${heavy ? ` con ${heavy} lanzamientos de implemento pesado` : ""}. Añade core anti-extensión/rotación y descarga.`);
  if (!messages.length) messages.push("Volumen articular dentro de márgenes seguros.");
  return { total, low, medium, high, lightImplementHigh: lightHigh, heavyImplement: heavy, elbow, shoulder, lumbar, messages };
}
