import { acc, alternate, barOr, block, lift, need, plyo, prep, run, session, sprint, trackWarmup, type Ctx } from "../helpers";
import type { TemplateResult } from "../types";

export function jumps(ctx: Ctx, days: number): TemplateResult {
  const p = ctx.phase;
  const pit = ctx.has("JUMP_PIT");
  const c = (n: number) => Math.max(3, Math.round(n * p.plyo));

  const speedAndApproach = () =>
    session("Velocidad + talonamiento + saltos con carrera media", "high", [
      trackWarmup(),
      block("TECHNIQUE", "Velocidad y carrera de aproximación", "La velocidad controlable en la tabla es el factor nº 1.", [
        sprint("Aceleraciones desde parado", ctx.n(4, 2), 30, ctx.pct(p.sprintPct), 180),
        sprint("Lanzados (20 m de impulso)", ctx.n(3, 2), 30, ctx.pct(p.sprintPct), 240, "Frecuencia alta, cadera alta."),
        prep("Talonamiento completo sin saltar (comprobar marca y marca intermedia)", ctx.n(5, 3), 1, "Anota la desviación respecto a la tabla y el viento."),
      ]),
      block("JUMPS_THROWS", "Saltos técnicos", "Recuperación completa entre saltos.", [
        pit
          ? plyo("Saltos completos con carrera media (8–12 apoyos)", ctx.n(6, 3), 1, 180, "Penúltimo apoyo largo, último corto; batida activa.")
          : plyo("Batidas sobre cajón bajo / pasillo con carrera de 6 apoyos", ctx.n(6, 3), 1, 150),
        plyo("Batidas cortas (4–6 apoyos) con caída en carrera", ctx.n(4, 2), 2, 120),
      ]),
      block("STRENGTH", "Fuerza máxima", "", [
        barOr(ctx, lift(ctx, "Sentadilla", ctx.n(p.strengthSets, 2), p.strengthReps, ctx.pct(p.strengthPct), "Cuádriceps", { ref: "SQUAT" }), "Sentadilla búlgara con mancuernas", "Sentadilla a una pierna"),
        barOr(ctx, lift(ctx, "Hip thrust", ctx.n(3, 2), 5, ctx.pct(p.strengthPct - 5), "Glúteo", { ref: "DEADLIFT", factor: 0.9 }), "Hip thrust con mancuerna", "Puente a una pierna"),
        acc("Elevación de gemelo con pausa", 3, 8, 8, "Gemelo"),
      ]),
    ]);

  const plyoPower = () =>
    session("Pliometría + potencia", "high", [
      trackWarmup([prep("Pogos y reactividad de tobillo", 3, 10)]),
      block("TECHNIQUE", "Aceleración", "", [sprint("Salidas de 3 puntos", ctx.n(4, 2), 20, ctx.pct(p.sprintPct), 150)]),
      block("JUMPS_THROWS", "Pliometría", "Contactos de calidad: si el tiempo de contacto se alarga, se termina.", [
        need(ctx, "PLYO_BOXES", plyo("Drop jumps (caída desde 30–45 cm)", ctx.n(4, 2), c(5), 150, "Contacto mínimo, rebote máximo."), plyo("Saltos verticales reactivos consecutivos", ctx.n(4, 2), c(5), 120)),
        plyo("Multisaltos horizontales alternos (bounds)", ctx.n(4, 2), c(8), 180, "Sobre 20–30 m."),
        plyo("Saltos a la pata coja (hops) por pierna", ctx.n(3, 2), c(6), 150),
        need(ctx, "HURDLES", plyo("Saltos de vallas a pies juntos", ctx.n(3, 2), c(6), 120)),
      ]),
      block("STRENGTH", "Potencia", "", [
        barOr(ctx, lift(ctx, "Cargada de potencia", ctx.n(4, 2), p.powerReps, ctx.pct(p.powerPct), "Cuerpo completo", { ref: "CLEAN" }), "Cargada con mancuernas", "Salto vertical lastrado"),
        barOr(ctx, lift(ctx, "Sentadilla con salto", ctx.n(4, 2), 4, 30, "Cuádriceps", { ref: "SQUAT", notes: "Carga ligera (30 % 1RM), máxima altura." }), "Sentadilla con salto con mancuernas", "Sentadilla con salto"),
        acc("Curl nórdico de isquiosurales", 3, 5, 8, "Isquiosurales"),
      ]),
    ]);

  const specific = () =>
    session("Técnica específica con carrera completa", "high", [
      trackWarmup(),
      block("TECHNIQUE", "Velocidad máxima", "", [
        sprint("Lanzados", ctx.n(3, 2), 30, ctx.pct(p.sprintPct), 300),
        prep("Talonamiento completo con ajuste de viento", ctx.n(4, 2), 1),
      ]),
      block("JUMPS_THROWS", "Saltos de competición", "Modelo de competición: 6 intentos como máximo.", [
        pit
          ? plyo("Saltos con carrera completa", Math.min(6, ctx.n(6, 3)), 1, 300, "Registra distancia/altura, talonamiento y viento.")
          : plyo("Batidas con carrera completa sobre pasillo (sin caída)", Math.min(6, ctx.n(5, 3)), 1, 240),
      ]),
      block("STRENGTH", "Fuerza-velocidad", "", [
        barOr(ctx, lift(ctx, "Media sentadilla", ctx.n(3, 2), 3, ctx.pct(p.strengthPct + 5), "Cuádriceps", { ref: "SQUAT", factor: 1.15 }), "Step-up explosivo con mancuernas", "Step-up explosivo"),
        barOr(ctx, lift(ctx, "Arrancada de potencia", ctx.n(3, 2), p.powerReps, ctx.pct(p.powerPct - 3), "Cuerpo completo", { ref: "SNATCH" }), "Arrancada con mancuerna", "Lanzamiento de balón vertical"),
        acc("Core: elevaciones de piernas colgado", 3, 8, 7, "Core"),
      ]),
    ]);

  const tempo = () =>
    session("Tempo extensivo y core", "low", [
      trackWarmup(),
      block("METABOLIC", "Tempo", "65–75 %: recuperación y capacidad de trabajo.", [
        run("Tempo", Math.max(4, Math.round(8 * ctx.vol * p.metabolic)), 150, 5, 75),
        acc("Circuito de core", 3, 30, 6, "Core", "30 s por estación."),
      ]),
    ]);

  const drills = () =>
    session("Técnica analítica y fuerza auxiliar", "low", [
      trackWarmup(),
      block("TECHNIQUE", "Técnica analítica de baja intensidad", "", [
        prep("Ritmo de los 3 últimos apoyos andando y trotando", 6, 1),
        prep("Movilidad de vallas (pasos laterales y frontales)", 3, 8),
      ]),
      block("STRENGTH", "Fuerza auxiliar", "", [
        acc("Peso muerto rumano a una pierna", 3, 8, 7, "Isquiosurales"),
        acc("Copenhague (aductores)", 3, 8, 7, "Core"),
        acc("Tibial anterior y sóleo isométrico", 3, 12, 7, "Gemelo", "Protección del tendón de Aquiles."),
      ]),
    ]);

  const recovery = () =>
    session("Recuperación activa", "low", [
      trackWarmup(),
      block("METABOLIC", "Regenerativo", "", [run("Carrera continua suave en césped", 1, Math.round(2500 * p.metabolic), 4, null), acc("Estiramientos y movilidad", 1, 10, 3, "Core")]),
    ]);

  return {
    sessions: alternate([speedAndApproach, plyoPower, specific], [tempo, drills, recovery], days),
    notes: [
      "Los contactos pliométricos se concentran en un día y se separan 48–72 h de los saltos con carrera completa.",
      pit ? "Registra cada talonamiento en la suite de saltos para ajustar la marca según el viento." : "Sin foso: las batidas se hacen con caída en carrera para limitar el impacto.",
    ],
  };
}
