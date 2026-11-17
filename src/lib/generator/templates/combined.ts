import { acc, alternate, barOr, block, hurdleRun, lift, medballKg, need, plyo, prep, run, session, sprint, thr, throwerPrehab, throwOr, trackWarmup, type Ctx } from "../helpers";
import type { TemplateResult } from "../types";

/** Pruebas combinadas: microciclo de 4 a 6 días sin interferencia neural. */
export function combined(ctx: Ctx, days: number): TemplateResult {
  const p = ctx.phase;
  const male = ctx.input.sex === "M";
  const shot = male ? "Peso 7,26 kg" : "Peso 4 kg";
  const jav = male ? "Jabalina 800 g" : "Jabalina 600 g";
  const disc = "Disco 2 kg";
  const hurdleName = male ? "110 mv" : "100 mv";
  const longRace = male ? "1.500 m" : "800 m";
  const pit = ctx.has("JUMP_PIT");
  const c = (n: number) => Math.max(3, Math.round(n * p.plyo));

  const day1Model = () =>
    session("Velocidad + longitud + peso (modelo día 1)", "high", [
      trackWarmup(),
      block("TECHNIQUE", "Velocidad", "Primero lo más rápido: sistema nervioso fresco.", [
        sprint("Salidas de tacos", ctx.n(4, 2), 30, ctx.pct(p.sprintPct), 240),
        sprint("Lanzados", ctx.n(2, 1), 30, ctx.pct(p.sprintPct), 300),
      ]),
      block("JUMPS_THROWS", "Longitud y peso", "Orden de competición: salto antes que lanzamiento.", [
        prep("Talonamiento de longitud (comprobar marca)", 3, 1),
        pit ? plyo("Longitud con carrera media (10–12 apoyos)", ctx.n(5, 3), 1, 180) : plyo("Batidas con carrera de 6 apoyos", ctx.n(5, 3), 1, 150),
        throwOr(ctx, thr("Peso: parado + completo", ctx.n(14, 6), ctx.pct(p.throwPct - 3), shot, 60), "Lanzamiento de peso"),
      ]),
      block("STRENGTH", "Fuerza máxima", "", [
        barOr(ctx, lift(ctx, "Sentadilla", ctx.n(p.strengthSets, 2), p.strengthReps, ctx.pct(p.strengthPct), "Cuádriceps", { ref: "SQUAT" }), "Sentadilla búlgara con mancuernas", "Sentadilla a una pierna"),
        barOr(ctx, lift(ctx, "Press banca", ctx.n(3, 2), p.strengthReps, ctx.pct(p.strengthPct - 3), "Pecho", { ref: "BENCH" }), "Press con mancuernas", "Flexiones lastradas"),
      ]),
    ]);

  const day2Model = () =>
    session(`Vallas + ${male ? "pértiga" : "altura"} + jabalina (modelo día 2)`, "high", [
      trackWarmup([prep("Movilidad de vallas", 3, 8)]),
      throwerPrehab(ctx),
      block("TECHNIQUE", `Vallas (${hurdleName})`, "", [
        need(ctx, "HURDLES", hurdleRun("Salida de tacos a ritmo de 3 pasos", ctx.n(5, 3), 3, ctx.pct(p.sprintPct), 240), sprint("Salidas con ritmo de vallas (marcas en el suelo)", ctx.n(4, 2), 40, ctx.pct(p.sprintPct), 240)),
        need(ctx, "HURDLES", hurdleRun("Ritmo de carrera", ctx.n(2, 1), 5, ctx.pct(p.sprintPct), 360)),
      ]),
      block("JUMPS_THROWS", `${male ? "Pértiga" : "Altura"} y jabalina`, "El salto vertical antes que la jabalina: brazo fresco para lanzar al final.", [
        pit
          ? plyo(male ? "Pértiga: carrera corta y media (presentación + péndulo)" : "Altura: carrera completa (curva y batida)", ctx.n(6, 3), 1, 180)
          : plyo(male ? "Pértiga: presentación y clavada en pasillo" : "Altura: batidas en curva con caída a pie", ctx.n(6, 3), 1, 150),
        throwOr(ctx, thr("Jabalina: 3 y 5 pasos cruzados", ctx.n(14, 6), ctx.pct(p.throwPct - 3), jav, 75, "Vigila codo y hombro; corta si baja la calidad."), "Lanzamiento de jabalina"),
      ]),
      block("STRENGTH", "Potencia", "", [
        barOr(ctx, lift(ctx, "Cargada de potencia", ctx.n(4, 2), p.powerReps, ctx.pct(p.powerPct), "Cuerpo completo", { ref: "CLEAN" }), "Cargada con mancuernas", "Salto vertical lastrado"),
        barOr(ctx, acc("Pullover explosivo con barra", 3, 5, 8, "Espalda"), "Pullover con mancuerna", "Pullover con goma"),
      ]),
    ]);

  const speedEndurance = () =>
    session(`Resistencia específica 400 m + ${male ? "disco" : "altura"}`, "high", [
      trackWarmup(),
      male ? throwerPrehab(ctx) : null,
      block("TECHNIQUE", "Velocidad", "", [sprint("Progresivos", ctx.n(3, 2), 60, ctx.pct(p.sprintPct - 3), 240)]),
      block("JUMPS_THROWS", male ? "Disco" : "Altura y reactividad", "", [
        male
          ? throwOr(ctx, thr("Disco: parado + giro completo", ctx.n(14, 6), ctx.pct(p.throwPct - 3), disc, 60), "Lanzamiento de disco")
          : plyo("Altura: carrera media", ctx.n(6, 3), 1, 150),
        need(ctx, "PLYO_BOXES", plyo("Drop jumps", ctx.n(3, 2), c(5), 120), plyo("Saltos verticales reactivos", ctx.n(3, 2), c(5), 120)),
      ]),
      block("STRENGTH", "Fuerza-potencia", "", [
        barOr(ctx, lift(ctx, "Arrancada de potencia", ctx.n(3, 2), p.powerReps, ctx.pct(p.powerPct - 3), "Cuerpo completo", { ref: "SNATCH" }), "Arrancada con mancuerna", "Salto con contramovimiento"),
        acc("Curl nórdico de isquiosurales", 3, 5, 8, "Isquiosurales"),
      ]),
      block("METABOLIC", "Resistencia a la velocidad (400 m)", "Al final de la sesión: no interfiere con el trabajo neural.", [
        sprint("Repeticiones", Math.max(2, Math.round(3 * ctx.vol)), 200, ctx.pct(p.sprintPct - 7), 480, "Ritmo de 400 m; recuperación 8 min."),
      ]),
    ]);

  const aerobic = () =>
    session(`Resistencia aeróbica (${longRace}) + técnica de lanzamiento ligera`, "low", [
      trackWarmup(),
      throwerPrehab(ctx, true),
      block("TECHNIQUE", "Técnica de lanzamientos a baja intensidad", "Sin carga neural: posiciones y ritmo.", [
        throwOr(ctx, thr(male ? "Disco: lanzamientos parados técnicos" : "Peso: lanzamientos parados técnicos", ctx.n(10, 6), 65, male ? disc : shot, 45), "Lanzamiento parado"),
      ]),
      block("METABOLIC", `Ritmo de ${longRace}`, "", [
        run("Series a ritmo de competición", Math.max(3, Math.round(5 * ctx.vol * p.metabolic)), male ? 400 : 300, 8, 120),
        run("Rodaje suave", 1, Math.round(2000 * p.metabolic), 4, null),
      ]),
    ]);

  const generalDay = () =>
    session("Capacidad general: tempo, core y balón medicinal", "low", [
      trackWarmup(),
      block("JUMPS_THROWS", "Balón medicinal general", "Intensidad submáxima.", [need(ctx, "MEDBALL", thr("Balón medicinal: overhead, rotacional y pecho", ctx.n(18, 9), 70, medballKg(ctx), 30))]),
      block("STRENGTH", "Fuerza auxiliar", "", [
        acc("Dominadas / remo", 3, 8, 7, "Espalda"),
        acc("Peso muerto rumano a una pierna", 3, 8, 7, "Isquiosurales"),
        acc("Circuito de core anti-rotación", 3, 10, 6, "Core"),
      ]),
      block("METABOLIC", "Tempo extensivo", "", [run("Tempo", Math.max(4, Math.round(6 * ctx.vol * p.metabolic)), 200, 5, 90)]),
    ]);

  const recovery = () =>
    session("Recuperación activa y técnica analítica", "low", [
      trackWarmup(),
      throwerPrehab(ctx, true),
      block("TECHNIQUE", "Técnica analítica", "", [prep("Vallas: técnica andando", 4, 6), prep("Jabalina: pasos cruzados sin lanzar", 4, 1)]),
      block("METABOLIC", "Regenerativo", "", [run("Rodaje suave", 1, Math.round(3000 * p.metabolic), 3, null)]),
    ]);

  return {
    sessions: alternate([day1Model, day2Model, speedEndurance], [aerobic, generalDay, recovery], days),
    notes: [
      "Combinadas requiere un mínimo de 4 días: con menos se pierde el equilibrio entre velocidad, saltos, lanzamientos y resistencia.",
      "Sin interferencia neural: velocidad/vallas, saltos y lanzamientos intensos van en días alternos; la resistencia va al final de la sesión o en días de baja demanda.",
      "Los días 'modelo' reproducen el orden real de la competición para entrenar las transiciones entre pruebas.",
    ],
  };
}
