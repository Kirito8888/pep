/** Catálogo global de pruebas para el registro de marcas (PB/SB). */

export interface AthleticsEvent {
  key: string;
  label: string;
  sector: "Velocidad" | "Vallas" | "Relevos" | "Medio fondo y fondo" | "Obstáculos" | "Marcha" | "Saltos" | "Lanzamientos" | "Combinadas";
  /** "time": menor es mejor (segundos). "distance": mayor es mejor (metros). "points": mayor es mejor. */
  type: "time" | "distance" | "points";
  /** Requiere viento ≤ +2,0 m/s para ser reglamentaria. */
  wind: boolean;
}

const e = (key: string, label: string, sector: AthleticsEvent["sector"], type: AthleticsEvent["type"], wind = false): AthleticsEvent => ({
  key,
  label,
  sector,
  type,
  wind,
});

export const EVENTS: AthleticsEvent[] = [
  e("60m", "60 m", "Velocidad", "time"),
  e("100m", "100 m", "Velocidad", "time", true),
  e("200m", "200 m", "Velocidad", "time", true),
  e("400m", "400 m", "Velocidad", "time"),
  e("60mH", "60 m vallas", "Vallas", "time"),
  e("100mH", "100 m vallas", "Vallas", "time", true),
  e("110mH", "110 m vallas", "Vallas", "time", true),
  e("400mH", "400 m vallas", "Vallas", "time"),
  e("4x100", "4 × 100 m", "Relevos", "time"),
  e("4x200", "4 × 200 m", "Relevos", "time"),
  e("4x400", "4 × 400 m", "Relevos", "time"),
  e("800m", "800 m", "Medio fondo y fondo", "time"),
  e("1000m", "1.000 m", "Medio fondo y fondo", "time"),
  e("1500m", "1.500 m", "Medio fondo y fondo", "time"),
  e("MILE", "Milla", "Medio fondo y fondo", "time"),
  e("3000m", "3.000 m", "Medio fondo y fondo", "time"),
  e("5000m", "5.000 m", "Medio fondo y fondo", "time"),
  e("10000m", "10.000 m", "Medio fondo y fondo", "time"),
  e("2000SC", "2.000 m obstáculos", "Obstáculos", "time"),
  e("3000SC", "3.000 m obstáculos", "Obstáculos", "time"),
  e("3000W", "3.000 m marcha", "Marcha", "time"),
  e("5000W", "5.000 m marcha", "Marcha", "time"),
  e("10000W", "10.000 m marcha", "Marcha", "time"),
  e("20000W", "20 km marcha", "Marcha", "time"),
  e("LJ", "Longitud", "Saltos", "distance", true),
  e("TJ", "Triple salto", "Saltos", "distance", true),
  e("HJ", "Altura", "Saltos", "distance"),
  e("PV", "Pértiga", "Saltos", "distance"),
  e("JT", "Jabalina", "Lanzamientos", "distance"),
  e("SP", "Peso", "Lanzamientos", "distance"),
  e("DT", "Disco", "Lanzamientos", "distance"),
  e("HT", "Martillo", "Lanzamientos", "distance"),
  e("DECATHLON", "Decatlón", "Combinadas", "points"),
  e("HEPTATHLON", "Heptatlón", "Combinadas", "points"),
  e("HEPTATHLON_INDOOR", "Heptatlón pista cubierta", "Combinadas", "points"),
  e("PENTATHLON_INDOOR", "Pentatlón pista cubierta", "Combinadas", "points"),
];

export const EVENT_MAP: Record<string, AthleticsEvent> = Object.fromEntries(EVENTS.map((x) => [x.key, x]));

export function isBetter(event: AthleticsEvent, a: number, b: number): boolean {
  return event.type === "time" ? a < b : a > b;
}

export interface MarkLike {
  id: string;
  event: string;
  value: number;
  wind: number | null;
  date: Date | string;
}

export interface MarkSummary {
  event: AthleticsEvent;
  pb: MarkLike | null;
  sb: MarkLike | null;
  /** Mejor marca con viento ilegal si supera al PB reglamentario. */
  windAided: MarkLike | null;
  count: number;
}

/** PB y SB por prueba. Las marcas con viento > +2,0 m/s no cuentan como PB/SB. */
export function summarizeMarks(marks: MarkLike[], year: number = new Date().getUTCFullYear()): MarkSummary[] {
  const byEvent = new Map<string, MarkLike[]>();
  for (const m of marks) byEvent.set(m.event, [...(byEvent.get(m.event) ?? []), m]);
  const out: MarkSummary[] = [];
  for (const [key, list] of byEvent) {
    const event = EVENT_MAP[key];
    if (!event) continue;
    const legal = (m: MarkLike) => !event.wind || m.wind == null || m.wind <= 2.0;
    const best = (arr: MarkLike[]) => arr.reduce<MarkLike | null>((acc, m) => (!acc || isBetter(event, m.value, acc.value) ? m : acc), null);
    const pb = best(list.filter(legal));
    const sb = best(list.filter((m) => legal(m) && new Date(m.date).getUTCFullYear() === year));
    const aided = best(list.filter((m) => !legal(m)));
    out.push({
      event,
      pb,
      sb,
      windAided: aided && (!pb || isBetter(event, aided.value, pb.value)) ? aided : null,
      count: list.length,
    });
  }
  return out.sort((a, b) => EVENTS.indexOf(a.event) - EVENTS.indexOf(b.event));
}

export const SPECIALTIES = [
  { key: "JAVELIN", label: "Jabalina" },
  { key: "THROWS_ROTATIONAL", label: "Lanzamientos rotacionales (disco / martillo)" },
  { key: "THROWS_LINEAR", label: "Lanzamientos lineales (peso)" },
  { key: "JUMPS", label: "Saltos" },
  { key: "SPRINTS_HURDLES", label: "Velocidad / Vallas" },
  { key: "ENDURANCE", label: "Medio fondo / Fondo / Marcha" },
  { key: "COMBINED", label: "Pruebas combinadas" },
  { key: "HYPERTROPHY", label: "Hipertrofia" },
  { key: "MAX_STRENGTH", label: "Fuerza máxima" },
  { key: "HYBRID", label: "Entrenamiento híbrido" },
] as const;

export type SpecialtyKey = (typeof SPECIALTIES)[number]["key"];

export const SPECIALTY_LABEL: Record<string, string> = Object.fromEntries(SPECIALTIES.map((s) => [s.key, s.label]));

export const PHASES = [
  { key: "GPP", label: "Preparación General (GPP)", color: "#2563eb" },
  { key: "SPP", label: "Preparación Específica (SPP)", color: "#7c3aed" },
  { key: "PRE_COMP", label: "Pre-competitivo", color: "#ea580c" },
  { key: "COMP", label: "Competitivo", color: "#dc2626" },
  { key: "TAPER", label: "Tapering / Descarga", color: "#16a34a" },
] as const;

export type PhaseKey = (typeof PHASES)[number]["key"];

export const PHASE_LABEL: Record<string, string> = Object.fromEntries(PHASES.map((p) => [p.key, p.label]));
export const PHASE_COLOR: Record<string, string> = Object.fromEntries(PHASES.map((p) => [p.key, p.color]));

export const LEVELS = [
  { key: "BEGINNER", label: "Iniciación" },
  { key: "INTERMEDIATE", label: "Intermedio" },
  { key: "ADVANCED", label: "Avanzado" },
] as const;

export type LevelKey = (typeof LEVELS)[number]["key"];

export const BLOCK_TYPES = [
  { key: "MOBILITY", label: "Movilidad / Prehab", rank: 0, color: "#0d9488" },
  { key: "TECHNIQUE", label: "Velocidad / Técnica neural", rank: 1, color: "#2563eb" },
  { key: "JUMPS_THROWS", label: "Saltos / Lanzamientos", rank: 2, color: "#7c3aed" },
  { key: "STRENGTH", label: "Fuerza / Potencia", rank: 3, color: "#ea580c" },
  { key: "METABOLIC", label: "Capacidad metabólica", rank: 4, color: "#dc2626" },
] as const;

export type BlockTypeKey = (typeof BLOCK_TYPES)[number]["key"];

export const BLOCK_LABEL: Record<string, string> = Object.fromEntries(BLOCK_TYPES.map((b) => [b.key, b.label]));
export const BLOCK_RANK: Record<string, number> = Object.fromEntries(BLOCK_TYPES.map((b) => [b.key, b.rank]));
export const BLOCK_COLOR: Record<string, string> = Object.fromEntries(BLOCK_TYPES.map((b) => [b.key, b.color]));
