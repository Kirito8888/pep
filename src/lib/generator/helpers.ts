import type { BlockTypeKey } from "@/lib/athletics/events";
import { DEMAND_PATTERN, LEVEL_CONFIG, PHASE_CONFIG, type PhaseConfig } from "./phases";
import type { BlockDraft, Equipment, ExerciseDraft, GeneratorInput, LiftRef, SessionTemplate } from "./types";

export interface Ctx {
  input: GeneratorInput;
  phase: PhaseConfig;
  /** Volumen final (fase × nivel × onda semanal). */
  vol: number;
  has: (eq: Equipment) => boolean;
  /** Escala una cantidad por el volumen (mínimo 1). */
  n: (base: number, min?: number) => number;
  /** Limita una intensidad en % según el nivel. */
  pct: (base: number) => number;
  /** Carga en kg para un % del 1RM de referencia (redondeada a 2,5 kg) o null si no hay referencia. */
  load: (ref: LiftRef | undefined, pct: number, factor?: number) => number | null;
}

export function makeCtx(input: GeneratorInput, waveMult: number): Ctx {
  const phase = PHASE_CONFIG[input.phase];
  const level = LEVEL_CONFIG[input.level];
  const vol = phase.vol * level.vol * waveMult;
  const eq = new Set(input.equipment);
  return {
    input,
    phase,
    vol,
    has: (e) => eq.has(e),
    n: (base, min = 1) => Math.max(min, Math.round(base * vol)),
    pct: (base) => Math.max(40, Math.min(100, Math.round(base - level.intensityOffset))),
    load: (ref, pct, factor = 1) => {
      const rm = ref ? input.oneRm?.[ref] : undefined;
      if (!rm || rm <= 0) return null;
      return Math.max(2.5, Math.round((rm * factor * pct) / 100 / 2.5) * 2.5);
    },
  };
}

const base = (name: string, over: Partial<ExerciseDraft>): ExerciseDraft => ({
  name,
  sets: 1,
  reps: 1,
  intensityType: "NONE",
  intensityValue: null,
  restSec: null,
  notes: "",
  implement: null,
  muscleGroup: null,
  loadKg: null,
  sprintMeters: 0,
  hurdles: 0,
  plyoContacts: 0,
  throwsCount: 0,
  distanceM: 0,
  ...over,
});

/** Movilidad / prehab / técnica sin carga. */
export const prep = (name: string, sets: number, reps: number, notes = ""): ExerciseDraft =>
  base(name, { sets, reps, restSec: 30, notes });

/** Sprint o carrera técnica: `meters` por repetición. */
export const sprint = (name: string, sets: number, meters: number, pct: number, restSec: number, notes = ""): ExerciseDraft =>
  base(`${name} ${meters} m`, { sets, reps: 1, intensityType: "PCT", intensityValue: pct, restSec, notes, sprintMeters: sets * meters });

/** Pasadas de vallas: `hurdlesPerRep` vallas por repetición. */
export const hurdleRun = (name: string, sets: number, hurdlesPerRep: number, pct: number, restSec: number, notes = ""): ExerciseDraft =>
  base(`${name} (${hurdlesPerRep} vallas)`, { sets, reps: 1, intensityType: "PCT", intensityValue: pct, restSec, notes, hurdles: sets * hurdlesPerRep });

/** Pliometría: `contacts` contactos por serie. */
export const plyo = (name: string, sets: number, contacts: number, restSec: number, notes = ""): ExerciseDraft =>
  base(name, { sets, reps: contacts, intensityType: "RPE", intensityValue: 8, restSec, notes, plyoContacts: sets * contacts });

/** Lanzamientos: `count` lanzamientos totales con un implemento. */
export const thr = (name: string, count: number, pct: number, implement: string, restSec = 60, notes = ""): ExerciseDraft => {
  const total = Math.max(1, Math.round(count));
  const sets = Math.max(1, Math.ceil(total / 6));
  const reps = Math.max(1, Math.round(total / sets));
  return base(name, { sets, reps, intensityType: "PCT", intensityValue: pct, restSec, notes, implement, throwsCount: sets * reps });
};

/** Fuerza con barra: % del 1RM de referencia. */
export const lift = (
  ctx: Ctx,
  name: string,
  sets: number,
  reps: number,
  pct: number,
  muscleGroup: string,
  opts: { ref?: LiftRef; factor?: number; restSec?: number; notes?: string } = {},
): ExerciseDraft =>
  base(name, {
    sets,
    reps,
    intensityType: "PCT",
    intensityValue: pct,
    restSec: opts.restSec ?? (pct >= 85 ? 240 : pct >= 75 ? 180 : 120),
    notes: opts.notes ?? "",
    muscleGroup,
    loadKg: ctx.load(opts.ref, pct, opts.factor),
  });

/** Accesorio regulado por RPE. */
export const acc = (name: string, sets: number, reps: number, rpe: number, muscleGroup: string, notes = "", restSec = 90): ExerciseDraft =>
  base(name, { sets, reps, intensityType: "RPE", intensityValue: rpe, restSec, notes, muscleGroup });

/** Carrera continua o interválica: `meters` por repetición, intensidad en RPE. */
export const run = (name: string, sets: number, meters: number, rpe: number, restSec: number | null, notes = ""): ExerciseDraft =>
  base(name, { sets, reps: 1, intensityType: "RPE", intensityValue: rpe, restSec, notes, distanceM: sets * meters });

/** Devuelve `primary` si hay equipamiento; si no, la alternativa (o nada). */
export function need(ctx: Ctx, eq: Equipment | Equipment[], primary: ExerciseDraft, alt: ExerciseDraft | null = null): ExerciseDraft | null {
  const list = Array.isArray(eq) ? eq : [eq];
  return list.every((e) => ctx.has(e)) ? primary : alt;
}

/** Crea un bloque descartando ejercicios nulos; devuelve null si queda vacío. */
export function block(type: BlockTypeKey, title: string, notes: string, exercises: (ExerciseDraft | null | false | undefined)[]): BlockDraft | null {
  const list = exercises.filter((e): e is ExerciseDraft => Boolean(e));
  return list.length ? { type, title, notes, exercises: list } : null;
}

export function session(title: string, demand: "high" | "low", blocks: (BlockDraft | null)[]): SessionTemplate {
  return { title, demand, blocks: blocks.filter((b): b is BlockDraft => b !== null) };
}

/** Alterna sesiones de alta y baja demanda según el patrón de días (nunca dos altas seguidas). */
export function alternate(high: (() => SessionTemplate)[], low: (() => SessionTemplate)[], days: number): SessionTemplate[] {
  const pattern = DEMAND_PATTERN[days] ?? DEMAND_PATTERN[3];
  let h = 0;
  let l = 0;
  return pattern.map((p) => (p === "H" ? high[h++ % high.length]() : low[l++ % low.length]()));
}

/** Rutina preventiva obligatoria del lanzador (hombro, codo, columna). */
export function throwerPrehab(ctx: Ctx, extended = false): BlockDraft | null {
  const band = ctx.has("BANDS");
  return block("MOBILITY", "Movilidad y prehab de lanzador", "Obligatorio antes de lanzar: activa manguito rotador, escápula y core.", [
    prep("Movilidad torácica (extensión sobre foam roller + rotaciones en cuadrupedia)", 2, 10),
    prep(band ? "Rotación externa de hombro con goma (0° y 90° de abducción)" : "Rotación externa de hombro tumbado lateral con peso ligero", 2, 15, "Ritmo controlado, sin dolor."),
    prep(band ? "Estabilidad escapular: Y-T-W con goma + face pull" : "Estabilidad escapular: Y-T-W en banco inclinado", 2, 12),
    prep("Flexo-pronadores del antebrazo (flexión de muñeca y pronación)", 2, 15, "Protección del ligamento colateral cubital del codo."),
    prep("Core anti-extensión: dead bug / rueda abdominal", 2, 10),
    extended ? prep("Core anti-rotación: press Pallof", 3, 10, "Mantén pelvis y costillas alineadas.") : null,
    extended ? prep("Movilidad de cadera: 90/90 y rotación interna de la pierna de bloqueo", 2, 8) : null,
  ]);
}

/** Calentamiento general de pista. */
export function trackWarmup(extra: (ExerciseDraft | null)[] = []): BlockDraft | null {
  return block("MOBILITY", "Calentamiento y movilidad", "Elevar temperatura y activar sin fatigar.", [
    prep("Carrera suave + movilidad dinámica (cadera, tobillo, isquios)", 1, 10, "8–10 minutos."),
    prep("Técnica de carrera: skipping A/B, talones, zancada rusa", 3, 20, "Sobre 20–30 m."),
    prep("Activación de glúteo y core (puente, plancha lateral)", 2, 12),
    ...extra,
  ]);
}

export function mobilityCooldownNote(): string {
  return "Termina con 5–10 min de vuelta a la calma y estiramientos suaves (fuera de los bloques de carga).";
}

/** Ejercicio con barra; si no hay barra usa mancuernas y, si tampoco, peso corporal. */
export function barOr(ctx: Ctx, primary: ExerciseDraft, dumbbellName: string, bodyweightName: string): ExerciseDraft {
  if (ctx.has("BARBELL")) return primary;
  const name = ctx.has("DUMBBELLS") ? dumbbellName : bodyweightName;
  return acc(name, primary.sets, Math.max(primary.reps, 6), 8, primary.muscleGroup ?? "Cuerpo completo", "Sustituye al ejercicio con barra: busca máxima intención de velocidad.", 120);
}

/** Lanzamiento real; sin zona de lanzamientos se sustituye por balón medicinal o imitaciones. */
export function throwOr(ctx: Ctx, primary: ExerciseDraft, imitation: string): ExerciseDraft {
  if (ctx.has("THROWING_AREA")) return primary;
  if (ctx.has("MEDBALL")) {
    return thr(`${imitation} con balón medicinal contra pared/red`, Math.round(primary.throwsCount * 0.7), Math.min(primary.intensityValue ?? 80, 85), "Balón medicinal 2 kg", 45, "Sin zona de lanzamientos: reproduce el gesto final.");
  }
  return prep(`${imitation}: imitaciones técnicas con goma o toalla`, 3, 10, "Sin zona de lanzamientos ni balón: trabajo de patrón.");
}

/** Peso del balón medicinal según sexo y nivel. */
export function medballKg(ctx: Ctx, heavy = false): string {
  const baseKg = ctx.input.sex === "M" ? 3 : 2;
  return `Balón medicinal ${baseKg + (heavy ? 2 : 0) + (ctx.input.level === "ADVANCED" ? 1 : 0)} kg`;
}
