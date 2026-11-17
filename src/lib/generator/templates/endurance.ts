import { acc, alternate, barOr, block, lift, plyo, prep, run, session, sprint, trackWarmup, type Ctx } from "../helpers";
import type { TemplateResult } from "../types";

export function endurance(ctx: Ctx, days: number): TemplateResult {
  const p = ctx.phase;
  // Volumen aeróbico: en fondo el nivel pesa más que la fase.
  const km = (base: number) => Math.max(2000, Math.round((base * ctx.vol * (0.6 + 0.4 * p.metabolic)) / 500) * 500);
  const reps = (base: number) => Math.max(3, Math.round(base * ctx.vol));
  const racePhase = p.sprintPct >= 97;

  const vo2 = () =>
    session("Series de VO2máx (Z4)", "high", [
      trackWarmup(),
      block("TECHNIQUE", "Activación", "", [sprint("Rectas progresivas", 4, 80, 85, 60, "Soltura y frecuencia.")]),
      block("METABOLIC", "Series largas en Z4", "Ritmo de 3.000–5.000 m; recuperación ≈ tiempo de trabajo.", [
        run("Series", reps(5), 1000, 9, 150, "Ritmo constante: la última igual que la primera."),
        run("Vuelta a la calma", 1, 1500, 3, null),
      ]),
    ]);

  const tempo = () =>
    session("Tempo / umbral (Z3)", "high", [
      trackWarmup(),
      block("METABOLIC", "Umbral de lactato", "Ritmo 'cómodamente duro' sostenible ~1 h.", [
        run("Rodaje de calentamiento", 1, 2000, 4, null),
        racePhase ? run("Tempo fraccionado", reps(3), 2000, 7, 90, "Ritmo de umbral.") : run("Tempo continuo", 1, km(6000), 7, null, "Ritmo de umbral, sin cambios."),
        run("Vuelta a la calma", 1, 1500, 3, null),
      ]),
    ]);

  const speedOrLong = () =>
    racePhase
      ? session("Ritmo de competición (Z5)", "high", [
          trackWarmup(),
          block("TECHNIQUE", "Velocidad", "", [sprint("Rectas", 4, 100, 90, 90)]),
          block("METABOLIC", "Repeticiones a ritmo de competición", "Recuperación amplia: calidad antes que cantidad.", [
            run("Repeticiones", reps(6), 400, 9, 120, "Ritmo objetivo de 1.500 m."),
            run("Repeticiones cortas", reps(4), 200, 9, 120, "Ritmo de 800 m."),
          ]),
        ])
      : session("Tirada larga (Z2)", "high", [
          trackWarmup(),
          block("METABOLIC", "Resistencia aeróbica", "Ritmo conversacional; los últimos 2 km algo más vivos.", [run("Tirada larga", 1, km(16000), 5, null)]),
        ]);

  const easyStrength = () =>
    session("Fuerza de mantenimiento + rodaje suave (Z2)", "low", [
      trackWarmup(),
      block("JUMPS_THROWS", "Reactividad", "Bajo volumen: economía de carrera.", [plyo("Pogos y saltos de tobillo", 3, 10, 60), plyo("Skipping con rebote / bounds cortos", 3, 8, 90)]),
      block("STRENGTH", "Fuerza máxima de bajo volumen", "Mejora la economía de carrera sin hipertrofia.", [
        barOr(ctx, lift(ctx, "Sentadilla", 3, Math.min(5, p.strengthReps + 1), ctx.pct(p.strengthPct - 5), "Cuádriceps", { ref: "SQUAT" }), "Sentadilla búlgara con mancuernas", "Sentadilla a una pierna"),
        acc("Peso muerto rumano a una pierna", 3, 6, 7, "Isquiosurales"),
        acc("Elevación de gemelo pesada (recta y sóleo)", 3, 8, 8, "Gemelo"),
      ]),
      block("METABOLIC", "Rodaje", "", [run("Rodaje suave", 1, km(8000), 4, null)]),
    ]);

  const easyStrides = () =>
    session("Rodaje + técnica y rectas", "low", [
      trackWarmup(),
      block("TECHNIQUE", "Técnica de carrera", "", [prep("Técnica: skipping, talones, multisaltos suaves", 4, 20), sprint("Rectas progresivas", 6, 80, 85, 60)]),
      block("METABOLIC", "Rodaje", "", [run("Rodaje aeróbico", 1, km(10000), 4, null)]),
    ]);

  const recovery = () =>
    session("Regenerativo (Z1)", "low", [
      trackWarmup(),
      block("METABOLIC", "Recuperación", "", [run("Rodaje muy suave o entrenamiento cruzado", 1, km(6000), 3, null), acc("Core y movilidad de cadera", 3, 30, 5, "Core", "30 s por estación.")]),
    ]);

  return {
    sessions: alternate([vo2, tempo, speedOrLong], [easyStrength, easyStrides, recovery], days),
    notes: [
      "Distribución polarizada: ~80 % del volumen en Z1–Z2 y el resto en calidad (Z3–Z5).",
      "Marcha: aplica los mismos bloques sustituyendo la carrera por marcha técnica y añade movilidad de cadera en cada calentamiento.",
      "Usa el ratio agudo:crónico (ACWR) de la suite de fondo para no subir el volumen semanal más de un 10 %.",
    ],
  };
}
