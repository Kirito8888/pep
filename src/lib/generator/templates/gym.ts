import { acc, barOr, block, lift, prep, run, session, sprint, type Ctx } from "../helpers";
import type { BlockDraft, SessionTemplate, TemplateResult } from "../types";

const warm = (focus: string): BlockDraft | null =>
  block("MOBILITY", "Calentamiento y movilidad", "", [
    prep("Cardio suave", 1, 5, "5 minutos."),
    prep(`Movilidad específica: ${focus}`, 2, 10),
    prep("Series de aproximación del primer ejercicio", 3, 5, "Carga ascendente."),
  ]);

const mach = (ctx: Ctx, machine: string, free: string) => (ctx.has("MACHINES") ? machine : free);

/** Hipertrofia: volumen por grupo muscular, 6–12 repeticiones, RIR 1–3. */
export function hypertrophy(ctx: Ctx, days: number): TemplateResult {
  const s = (base: number) => Math.max(2, Math.round(base * Math.min(1.25, ctx.vol + 0.15)));
  const pctMain = ctx.pct(72);

  const push = (): SessionTemplate =>
    session("Empuje (pecho, hombro, tríceps)", "high", [
      warm("hombro y torácica"),
      block("STRENGTH", "Empuje", "RIR 1–3; última serie cerca del fallo técnico.", [
        barOr(ctx, lift(ctx, "Press banca", s(4), 8, pctMain, "Pecho", { ref: "BENCH", restSec: 150 }), "Press con mancuernas", "Flexiones lastradas"),
        acc(ctx.has("DUMBBELLS") ? "Press inclinado con mancuernas" : "Flexiones con pies elevados", s(3), 10, 8, "Pecho"),
        acc(ctx.has("DUMBBELLS") ? "Press militar con mancuernas" : "Flexiones en pica", s(3), 10, 8, "Hombro"),
        acc("Elevaciones laterales", s(3), 15, 9, "Hombro", "", 60),
        acc(mach(ctx, "Extensión de tríceps en polea", "Fondos / extensión tras nuca"), s(3), 12, 9, "Tríceps", "", 60),
      ]),
    ]);

  const pull = (): SessionTemplate =>
    session("Tirón (espalda, bíceps)", "high", [
      warm("escápulas y dorsal"),
      block("STRENGTH", "Tirón", "", [
        acc(mach(ctx, "Jalón al pecho", "Dominadas"), s(4), 8, 8, "Espalda", "", 120),
        barOr(ctx, lift(ctx, "Remo con barra", s(4), 10, ctx.pct(65), "Espalda", { ref: "BENCH", factor: 0.9, restSec: 120 }), "Remo con mancuerna", "Remo invertido"),
        acc(mach(ctx, "Remo en polea baja", "Remo con goma / invertido agarre neutro"), s(3), 12, 8, "Espalda"),
        acc("Face pull / pájaros", s(3), 15, 8, "Hombro", "Salud escapular.", 60),
        acc("Curl de bíceps", s(3), 12, 9, "Bíceps", "", 60),
      ]),
    ]);

  const legs = (variant: "A" | "B"): SessionTemplate =>
    session(variant === "A" ? "Pierna (énfasis cuádriceps)" : "Pierna (énfasis cadena posterior)", "high", [
      warm("cadera y tobillo"),
      block("STRENGTH", "Pierna", "", [
        variant === "A"
          ? barOr(ctx, lift(ctx, "Sentadilla", s(4), 8, pctMain, "Cuádriceps", { ref: "SQUAT", restSec: 180 }), "Sentadilla goblet", "Sentadilla búlgara")
          : barOr(ctx, lift(ctx, "Peso muerto rumano", s(4), 8, ctx.pct(65), "Isquiosurales", { ref: "DEADLIFT", restSec: 150 }), "Peso muerto rumano con mancuernas", "Peso muerto a una pierna"),
        acc(variant === "A" ? mach(ctx, "Prensa de piernas", "Sentadilla búlgara") : "Hip thrust", s(3), 10, 8, variant === "A" ? "Cuádriceps" : "Glúteo", "", 120),
        acc(variant === "A" ? mach(ctx, "Extensión de cuádriceps", "Sissy squat asistida") : mach(ctx, "Curl femoral", "Curl nórdico"), s(3), 12, 9, variant === "A" ? "Cuádriceps" : "Isquiosurales", "", 75),
        acc("Zancadas caminando", s(3), 12, 8, "Glúteo"),
        acc("Elevación de gemelo", s(4), 12, 9, "Gemelo", "", 60),
        acc("Core: plancha + elevaciones de piernas", 3, 12, 8, "Core", "", 60),
      ]),
    ]);

  const upper = (): SessionTemplate =>
    session("Torso (empuje + tirón)", "high", [
      warm("hombro y torácica"),
      block("STRENGTH", "Torso", "Alterna empuje y tirón.", [
        barOr(ctx, lift(ctx, "Press banca", s(4), 8, pctMain, "Pecho", { ref: "BENCH", restSec: 150 }), "Press con mancuernas", "Flexiones lastradas"),
        acc(mach(ctx, "Jalón al pecho", "Dominadas"), s(4), 8, 8, "Espalda", "", 120),
        acc(ctx.has("DUMBBELLS") ? "Press militar con mancuernas" : "Flexiones en pica", s(3), 10, 8, "Hombro"),
        acc(ctx.has("DUMBBELLS") ? "Remo con mancuerna" : "Remo invertido", s(3), 10, 8, "Espalda"),
        acc("Curl de bíceps + extensión de tríceps (superserie)", s(3), 12, 9, "Bíceps", "", 60),
      ]),
    ]);

  const full = (i: number): SessionTemplate =>
    session(`Cuerpo completo ${"ABC"[i]}`, "high", [
      warm("global"),
      block("STRENGTH", "Cuerpo completo", "", [
        i === 1
          ? barOr(ctx, lift(ctx, "Peso muerto rumano", s(3), 8, ctx.pct(65), "Isquiosurales", { ref: "DEADLIFT" }), "Peso muerto rumano con mancuernas", "Peso muerto a una pierna")
          : barOr(ctx, lift(ctx, "Sentadilla", s(3), 8, pctMain, "Cuádriceps", { ref: "SQUAT" }), "Sentadilla goblet", "Sentadilla búlgara"),
        i === 2 ? acc(ctx.has("DUMBBELLS") ? "Press inclinado con mancuernas" : "Flexiones", s(3), 10, 8, "Pecho") : barOr(ctx, lift(ctx, "Press banca", s(3), 8, pctMain, "Pecho", { ref: "BENCH" }), "Press con mancuernas", "Flexiones lastradas"),
        acc(i === 1 ? mach(ctx, "Jalón al pecho", "Dominadas") : ctx.has("DUMBBELLS") ? "Remo con mancuerna" : "Remo invertido", s(3), 10, 8, "Espalda"),
        acc("Elevaciones laterales", s(2), 15, 9, "Hombro", "", 60),
        acc("Core: plancha y anti-rotación", 3, 12, 7, "Core", "", 60),
      ]),
    ]);

  const table: Record<number, { sessions: SessionTemplate[]; offsets: number[] }> = {
    2: { sessions: [full(0), full(1)], offsets: [0, 3] },
    3: { sessions: [full(0), full(1), full(2)], offsets: [0, 2, 4] },
    4: { sessions: [upper(), legs("A"), upper(), legs("B")], offsets: [0, 1, 3, 4] },
    5: { sessions: [push(), pull(), legs("A"), upper(), legs("B")], offsets: [0, 1, 2, 4, 5] },
    6: { sessions: [push(), pull(), legs("A"), push(), pull(), legs("B")], offsets: [0, 1, 2, 3, 4, 5] },
  };
  return {
    ...(table[days] ?? table[3]),
    notes: ["Objetivo: 10–20 series semanales por grupo muscular; revisa el monitor de volumen del gimnasio.", "Progresión doble: sube repeticiones dentro del rango y después la carga."],
  };
}

/** Fuerza máxima: básicos pesados, 1–5 repeticiones, descansos largos. */
export function maxStrength(ctx: Ctx, days: number): TemplateResult {
  const p = ctx.phase;
  const sets = ctx.n(p.strengthSets + 1, 2);
  const main = (name: string, ref: "SQUAT" | "BENCH" | "DEADLIFT", group: string, db: string, bw: string, offset = 0) =>
    barOr(ctx, lift(ctx, name, sets, p.strengthReps, ctx.pct(p.strengthPct + offset), group, { ref, restSec: 300, notes: "Series de trabajo tras aproximación; deja 1 repetición en reserva." }), db, bw);
  const back = (name: string, ref: "SQUAT" | "BENCH" | "DEADLIFT", group: string, factor: number) =>
    ctx.has("BARBELL") ? lift(ctx, name, ctx.n(3, 2), p.strengthReps + 2, ctx.pct(p.strengthPct - 12), group, { ref, factor }) : acc(name, 3, 8, 8, group);

  const squatDay = (): SessionTemplate =>
    session("Sentadilla pesada", "high", [
      warm("cadera, tobillo y torácica"),
      block("STRENGTH", "Sentadilla", "Descansos de 4–5 min en el básico.", [
        main("Sentadilla", "SQUAT", "Cuádriceps", "Sentadilla búlgara pesada", "Sentadilla a una pierna (pistol)"),
        back("Sentadilla con pausa", "SQUAT", "Cuádriceps", 0.9),
        acc("Peso muerto rumano", 3, 6, 8, "Isquiosurales"),
        acc("Core: rueda abdominal", 3, 8, 8, "Core"),
      ]),
    ]);
  const benchDay = (): SessionTemplate =>
    session("Press banca pesado", "high", [
      warm("hombro y escápulas"),
      block("STRENGTH", "Press banca", "", [
        main("Press banca", "BENCH", "Pecho", "Press con mancuernas pesado", "Flexiones lastradas"),
        back("Press banca agarre cerrado", "BENCH", "Tríceps", 0.9),
        acc("Remo con barra / mancuerna", 4, 6, 8, "Espalda"),
        acc("Face pull", 3, 15, 7, "Hombro", "", 60),
      ]),
    ]);
  const deadliftDay = (): SessionTemplate =>
    session("Peso muerto pesado", "high", [
      warm("cadera e isquiosurales"),
      block("STRENGTH", "Peso muerto", "", [
        main("Peso muerto", "DEADLIFT", "Cadena posterior", "Peso muerto con mancuernas pesado", "Puente de glúteo a una pierna", -2),
        back("Sentadilla frontal", "SQUAT", "Cuádriceps", 0.85),
        acc("Dominadas lastradas", 4, 5, 8, "Espalda"),
        acc("Paseo del granjero", 3, 30, 8, "Core", "30 m."),
      ]),
    ]);
  const pressDay = (): SessionTemplate =>
    session("Press militar + accesorios", "low", [
      warm("hombro y torácica"),
      block("STRENGTH", "Empuje vertical y accesorios", "", [
        barOr(ctx, lift(ctx, "Press militar", ctx.n(4, 2), p.strengthReps + 1, ctx.pct(p.strengthPct - 5), "Hombro", { ref: "BENCH", factor: 0.65 }), "Press militar con mancuernas", "Flexiones en pica"),
        acc("Fondos lastrados", 3, 6, 8, "Tríceps"),
        acc("Remo en polea / invertido", 3, 10, 7, "Espalda"),
        acc("Curl de bíceps", 3, 10, 8, "Bíceps", "", 60),
      ]),
    ]);
  const speedDay = (): SessionTemplate =>
    session("Técnica y velocidad de barra", "low", [
      warm("global"),
      block("STRENGTH", "Trabajo de velocidad (60–70 %)", "Máxima intención de velocidad; nada de fatiga.", [
        barOr(ctx, lift(ctx, "Sentadilla (dinámica)", 6, 2, ctx.pct(65), "Cuádriceps", { ref: "SQUAT", restSec: 90 }), "Sentadilla con salto con mancuernas", "Sentadilla con salto"),
        barOr(ctx, lift(ctx, "Press banca (dinámico)", 6, 3, ctx.pct(62), "Pecho", { ref: "BENCH", restSec: 90 }), "Press explosivo con mancuernas", "Flexiones pliométricas"),
        acc("Hiperextensiones", 3, 12, 7, "Cadena posterior"),
      ]),
    ]);
  const gppDay = (): SessionTemplate =>
    session("Acondicionamiento general", "low", [
      warm("global"),
      block("STRENGTH", "Accesorios y prevención", "", [acc("Zancadas", 3, 10, 7, "Glúteo"), acc("Remo a una mano", 3, 10, 7, "Espalda"), acc("Core anti-rotación", 3, 10, 7, "Core")]),
      block("METABOLIC", "Aeróbico suave", "Mejora la recuperación entre series pesadas.", [run("Caminata rápida, trineo o bicicleta", 1, 3000, 4, null, "20 min.")]),
    ]);

  const both = (): SessionTemplate[] => [
    session("Sentadilla + press banca", "high", [warm("global"), ...squatDay().blocks.slice(1).map((b) => ({ ...b, exercises: b.exercises.slice(0, 2) })), ...benchDay().blocks.slice(1).map((b) => ({ ...b, title: "Press banca", exercises: b.exercises.slice(0, 3) }))]),
    session("Peso muerto + press militar", "high", [warm("global"), ...deadliftDay().blocks.slice(1).map((b) => ({ ...b, exercises: b.exercises.slice(0, 2) })), ...pressDay().blocks.slice(1).map((b) => ({ ...b, title: "Press militar", exercises: b.exercises.slice(0, 3) }))]),
  ];

  const table: Record<number, { sessions: SessionTemplate[]; offsets: number[] }> = {
    2: { sessions: both(), offsets: [0, 3] },
    3: { sessions: [squatDay(), benchDay(), deadliftDay()], offsets: [0, 2, 4] },
    4: { sessions: [squatDay(), benchDay(), deadliftDay(), pressDay()], offsets: [0, 1, 3, 4] },
    5: { sessions: [squatDay(), benchDay(), gppDay(), deadliftDay(), pressDay()], offsets: [0, 1, 2, 4, 5] },
    6: { sessions: [squatDay(), benchDay(), gppDay(), deadliftDay(), pressDay(), speedDay()], offsets: [0, 1, 2, 3, 4, 5] },
  };
  return {
    ...(table[days] ?? table[3]),
    notes: ["Los tres básicos pesados nunca caen en días consecutivos del mismo patrón (sentadilla y peso muerto separados ≥ 48 h).", "Introduce tus 1RM para que el plan calcule las cargas en kg y el tonelaje."],
  };
}

/** Híbrido: fuerza + resistencia minimizando la interferencia. */
export function hybrid(ctx: Ctx, days: number): TemplateResult {
  const p = ctx.phase;
  const m = (base: number) => Math.max(1500, Math.round((base * ctx.vol * p.metabolic) / 500) * 500);

  const lower = (): SessionTemplate =>
    session("Fuerza de tren inferior + sprints cortos", "high", [
      warm("cadera y tobillo"),
      block("TECHNIQUE", "Velocidad", "", [sprint("Aceleraciones", ctx.n(4, 2), 30, ctx.pct(p.sprintPct - 3), 150)]),
      block("STRENGTH", "Tren inferior", "", [
        barOr(ctx, lift(ctx, "Sentadilla", ctx.n(p.strengthSets, 2), p.strengthReps + 1, ctx.pct(p.strengthPct - 3), "Cuádriceps", { ref: "SQUAT" }), "Sentadilla búlgara con mancuernas", "Sentadilla a una pierna"),
        barOr(ctx, lift(ctx, "Peso muerto rumano", ctx.n(3, 2), 6, ctx.pct(65), "Isquiosurales", { ref: "DEADLIFT" }), "Peso muerto rumano con mancuernas", "Peso muerto a una pierna"),
        acc("Zancadas + gemelo", 3, 10, 8, "Glúteo"),
      ]),
    ]);
  const upperIntervals = (): SessionTemplate =>
    session("Fuerza de tren superior + intervalos", "high", [
      warm("hombro y torácica"),
      block("STRENGTH", "Tren superior", "", [
        barOr(ctx, lift(ctx, "Press banca", ctx.n(p.strengthSets, 2), p.strengthReps + 1, ctx.pct(p.strengthPct - 3), "Pecho", { ref: "BENCH" }), "Press con mancuernas", "Flexiones lastradas"),
        acc("Dominadas", 4, 6, 8, "Espalda"),
        acc("Press militar + remo (superserie)", 3, 8, 8, "Hombro"),
      ]),
      block("METABOLIC", "Intervalos de alta intensidad", "Después de la fuerza: la calidad de la fuerza es prioritaria.", [run("Intervalos", Math.max(4, Math.round(6 * ctx.vol)), 400, 9, 90, "Ritmo de 3–5 km.")]),
    ]);
  const fullPower = (): SessionTemplate =>
    session("Potencia global + tempo", "high", [
      warm("global"),
      block("STRENGTH", "Potencia", "", [
        barOr(ctx, lift(ctx, "Cargada de potencia", ctx.n(4, 2), p.powerReps, ctx.pct(p.powerPct), "Cuerpo completo", { ref: "CLEAN" }), "Cargada con mancuernas", "Salto vertical lastrado"),
        barOr(ctx, lift(ctx, "Peso muerto", ctx.n(3, 2), p.strengthReps, ctx.pct(p.strengthPct - 5), "Cadena posterior", { ref: "DEADLIFT" }), "Swing con kettlebell pesado", "Puente a una pierna"),
        acc("Push press / flexiones explosivas", 3, 5, 8, "Hombro"),
      ]),
      block("METABOLIC", "Tempo", "", [run("Tempo continuo", 1, m(5000), 7, null, "Ritmo de umbral.")]),
    ]);
  const z2 = (): SessionTemplate =>
    session("Aeróbico Z2", "low", [warm("tobillo y cadera"), block("METABOLIC", "Base aeróbica", "Conversacional.", [run("Rodaje Z2", 1, m(8000), 4, null)])]);
  const mobilityCore = (): SessionTemplate =>
    session("Movilidad, core y aeróbico suave", "low", [
      warm("global"),
      block("STRENGTH", "Core y estabilidad", "", [acc("Plancha, lateral y Pallof", 3, 12, 6, "Core"), acc("Trabajo unilateral ligero", 3, 10, 6, "Glúteo")]),
      block("METABOLIC", "Regenerativo", "", [run("Rodaje suave o bicicleta", 1, m(5000), 3, null)]),
    ]);
  const long = (): SessionTemplate =>
    session("Tirada larga", "low", [warm("tobillo y cadera"), block("METABOLIC", "Resistencia", "", [run("Tirada larga Z2", 1, m(12000), 5, null)])]);

  const high = [lower, upperIntervals, fullPower];
  const low = [z2, mobilityCore, long];
  const pattern: Record<number, ("H" | "L")[]> = { 2: ["H", "H"], 3: ["H", "H", "H"], 4: ["H", "L", "H", "H"], 5: ["H", "L", "H", "H", "L"], 6: ["H", "L", "H", "L", "H", "L"] };
  let h = 0;
  let l = 0;
  return {
    sessions: (pattern[days] ?? pattern[3]).map((x) => (x === "H" ? high[h++ % 3]() : low[l++ % 3]())),
    notes: ["Para reducir la interferencia, la fuerza va antes que la resistencia en la misma sesión y el trabajo aeróbico largo en días separados.", "Si el objetivo principal es la resistencia, intercambia el orden en los días de baja demanda."],
  };
}
