import { PHASE_LABEL, SPECIALTY_LABEL, type SpecialtyKey } from "@/lib/athletics/events";
import { makeCtx, mobilityCooldownNote, type Ctx } from "./helpers";
import { DEFAULT_OFFSETS, PHASE_CONFIG, weekWave } from "./phases";
import { combined } from "./templates/combined";
import { endurance } from "./templates/endurance";
import { hybrid, hypertrophy, maxStrength } from "./templates/gym";
import { javelin } from "./templates/javelin";
import { jumps } from "./templates/jumps";
import { sprints } from "./templates/sprints";
import { throwsTemplate } from "./templates/throws";
import type { GeneratedPlan, GeneratorInput, TemplateResult, WeekDraft } from "./types";

type Template = (ctx: Ctx, days: number) => TemplateResult;

const TEMPLATES: Record<SpecialtyKey, Template> = {
  JAVELIN: javelin,
  THROWS_ROTATIONAL: throwsTemplate("rotational"),
  THROWS_LINEAR: throwsTemplate("linear"),
  JUMPS: jumps,
  SPRINTS_HURDLES: sprints,
  ENDURANCE: endurance,
  COMBINED: combined,
  HYPERTROPHY: hypertrophy,
  MAX_STRENGTH: maxStrength,
  HYBRID: hybrid,
};

export function clampDays(specialty: SpecialtyKey, days: number): number {
  const d = Math.max(2, Math.min(6, Math.round(days)));
  // Combinadas necesita al menos 4 días para repartir todos los sectores.
  return specialty === "COMBINED" ? Math.max(4, d) : d;
}

/**
 * Motor determinista: la misma entrada produce siempre la misma planificación.
 * No usa aleatoriedad ni servicios externos.
 */
export function generatePlan(input: GeneratorInput): GeneratedPlan {
  const days = clampDays(input.specialty, input.daysPerWeek);
  const totalWeeks = Math.max(1, Math.min(6, Math.round(input.weeks)));
  const template = TEMPLATES[input.specialty];
  const notes = new Set<string>();
  const weeks: WeekDraft[] = [];

  for (let i = 0; i < totalWeeks; i++) {
    const wave = weekWave(i, totalWeeks);
    const ctx = makeCtx({ ...input, daysPerWeek: days }, wave.mult);
    const result = template(ctx, days);
    const offsets = result.offsets ?? DEFAULT_OFFSETS[days];
    result.notes?.forEach((n) => notes.add(n));
    weeks.push({
      weekNumber: i + 1,
      focus: wave.focus,
      sessions: result.sessions.map((s, idx) => ({ ...s, dayOffset: offsets[idx] ?? idx })),
    });
  }

  if (days !== input.daysPerWeek) notes.add(`Se han programado ${days} días/semana (mínimo necesario para esta especialidad).`);
  notes.add(mobilityCooldownNote());

  return {
    title: `${SPECIALTY_LABEL[input.specialty]} · ${PHASE_LABEL[input.phase]}`,
    description: `${PHASE_CONFIG[input.phase].focus} ${days} días/semana durante ${totalWeeks} semana(s).`,
    specialty: input.specialty,
    phase: input.phase,
    level: input.level,
    daysPerWeek: days,
    weeks,
    notes: [...notes],
  };
}

export * from "./types";
