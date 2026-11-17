import { acc, alternate, barOr, block, hurdleRun, lift, need, plyo, prep, run, session, sprint, trackWarmup, type Ctx } from "../helpers";
import type { TemplateResult } from "../types";

export function sprints(ctx: Ctx, days: number): TemplateResult {
  const p = ctx.phase;
  const hurdles = ctx.has("HURDLES");
  const c = (n: number) => Math.max(3, Math.round(n * p.plyo));

  const acceleration = () =>
    session("Aceleración + fuerza máxima", "high", [
      trackWarmup(),
      block("TECHNIQUE", "Aceleración (sistema ATP-PC)", "1 min de recuperación por cada 10 m recorridos.", [
        sprint("Salidas de tacos", ctx.n(4, 2), 10, ctx.pct(p.sprintPct), 90, "Empuje horizontal, ángulos de tibia."),
        sprint("Salidas de tacos", ctx.n(4, 2), 20, ctx.pct(p.sprintPct), 150),
        sprint("Salidas de tacos", ctx.n(3, 2), 30, ctx.pct(p.sprintPct), 240),
        need(ctx, "BANDS", prep("Arrastres / salidas resistidas con goma", 3, 1, "15 m, máxima proyección.")),
      ]),
      block("JUMPS_THROWS", "Pliometría horizontal", "", [plyo("Saltos horizontales a pies juntos + triple", ctx.n(4, 2), c(4), 120)]),
      block("STRENGTH", "Fuerza máxima", "", [
        barOr(ctx, lift(ctx, "Sentadilla", ctx.n(p.strengthSets, 2), p.strengthReps, ctx.pct(p.strengthPct), "Cuádriceps", { ref: "SQUAT" }), "Sentadilla búlgara con mancuernas", "Sentadilla a una pierna"),
        barOr(ctx, lift(ctx, "Cargada de potencia", ctx.n(4, 2), p.powerReps, ctx.pct(p.powerPct), "Cuerpo completo", { ref: "CLEAN" }), "Cargada con mancuernas", "Salto vertical lastrado"),
        acc("Curl nórdico de isquiosurales", 3, 5, 8, "Isquiosurales"),
      ]),
    ]);

  const maxVelocity = () =>
    session("Velocidad máxima + potencia reactiva", "high", [
      trackWarmup([prep("Wickets / minivallas de frecuencia", 4, 1, "Postura alta, contacto bajo la cadera.")]),
      block("TECHNIQUE", "Velocidad máxima", "Recuperación completa: 6–8 min entre repeticiones largas.", [
        sprint("Lanzados (30 m de impulso)", ctx.n(4, 2), 30, ctx.pct(p.sprintPct), 360, "Relajación a máxima velocidad."),
        sprint("Sprint completo", ctx.n(2, 1), 60, ctx.pct(p.sprintPct), 480),
      ]),
      block("JUMPS_THROWS", "Pliometría reactiva", "", [
        need(ctx, "PLYO_BOXES", plyo("Drop jumps", ctx.n(3, 2), c(5), 120), plyo("Saltos verticales reactivos", ctx.n(3, 2), c(5), 120)),
        plyo("Bounds de velocidad", ctx.n(3, 2), c(8), 150, "30 m."),
      ]),
      block("STRENGTH", "Potencia", "", [
        barOr(ctx, lift(ctx, "Arrancada de potencia", ctx.n(4, 2), p.powerReps, ctx.pct(p.powerPct - 3), "Cuerpo completo", { ref: "SNATCH" }), "Arrancada con mancuerna", "Salto con contramovimiento"),
        barOr(ctx, lift(ctx, "Hip thrust", ctx.n(3, 2), 5, ctx.pct(p.strengthPct - 5), "Glúteo", { ref: "DEADLIFT", factor: 0.9 }), "Hip thrust a una pierna", "Puente a una pierna"),
        acc("Press banca o press con mancuernas", 3, 5, 8, "Pecho"),
      ]),
    ]);

  const hurdlesOrSpeedEndurance = () =>
    session(hurdles ? "Ritmo de vallas + resistencia a la velocidad" : "Resistencia a la velocidad", "high", [
      trackWarmup(hurdles ? [prep("Movilidad de vallas y pierna de ataque/recobro", 3, 8)] : []),
      block("TECHNIQUE", hurdles ? "Ritmo de vallas" : "Velocidad específica", "", [
        hurdles ? hurdleRun("Salida de tacos a ritmo de 3 pasos", ctx.n(5, 3), 3, ctx.pct(p.sprintPct), 240, "Ataca la valla, no la saltes.") : sprint("Sprint en curva", ctx.n(3, 2), 60, ctx.pct(p.sprintPct), 360),
        hurdles ? hurdleRun("Ritmo de carrera", ctx.n(3, 2), 5, ctx.pct(p.sprintPct), 360, "Vallas a distancia reducida 30 cm si no se mantiene el ritmo.") : null,
      ]),
      block("METABOLIC", "Resistencia a la velocidad (glucolítico)", "Mantener la mecánica bajo fatiga.", [
        sprint("Repeticiones", Math.max(2, Math.round(3 * ctx.vol)), 150, ctx.pct(p.sprintPct - 5), 600, "Recuperación 8–10 min."),
      ]),
    ]);

  const tempo = () =>
    session("Tempo extensivo y core", "low", [
      trackWarmup(),
      block("METABOLIC", "Tempo extensivo (aeróbico)", "65–75 %: favorece la recuperación entre días neurales.", [
        run("Tempo", Math.max(5, Math.round(8 * ctx.vol * p.metabolic)), 200, 5, 90),
        acc("Circuito de core", 3, 30, 6, "Core", "30 s por estación."),
      ]),
    ]);

  const general = () =>
    session("Técnica analítica y fuerza auxiliar", "low", [
      trackWarmup(),
      block("TECHNIQUE", "Técnica de baja intensidad", "", [
        prep("Técnica de carrera en progresión (A-skip → carrera)", 6, 1, "40 m."),
        need(ctx, "HURDLES", prep("Técnica de vallas andando y con 1 paso (vallas bajas)", 4, 6)),
      ]),
      block("STRENGTH", "Fuerza auxiliar", "", [
        acc("Peso muerto rumano", 3, 8, 7, "Isquiosurales"),
        acc("Dominadas o jalón", 3, 8, 7, "Espalda"),
        acc("Copenhague + gemelo excéntrico", 3, 10, 7, "Core"),
      ]),
    ]);

  const recovery = () =>
    session("Recuperación activa", "low", [
      trackWarmup(),
      block("METABOLIC", "Regenerativo", "", [run("Carrera continua suave", 1, Math.round(2500 * p.metabolic), 4, null), acc("Movilidad y estiramientos", 1, 10, 3, "Core")]),
    ]);

  return {
    sessions: alternate([acceleration, maxVelocity, hurdlesOrSpeedEndurance], [tempo, general, recovery], days),
    notes: [
      "Modelo alta/baja: los días de velocidad (≥ 95 %) nunca son consecutivos; entre ellos, tempo extensivo.",
      "El volumen de sprint máximo se mide en metros; por encima de 600 m semanales a > 95 % salta el semáforo neural.",
    ],
  };
}
