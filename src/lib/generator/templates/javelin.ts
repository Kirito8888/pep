import { acc, alternate, barOr, block, lift, medballKg, need, plyo, prep, run, session, sprint, thr, throwerPrehab, throwOr, type Ctx } from "../helpers";
import type { TemplateResult } from "../types";

/** Implementos de jabalina según sexo. */
export function javelinImplements(sex: "M" | "F") {
  return sex === "M"
    ? { official: "Jabalina 800 g", heavy: "Jabalina 900 g", light: "Jabalina 700 g", nockHeavy: "Nockenball 800 g", nockLight: "Nockenball 600 g" }
    : { official: "Jabalina 600 g", heavy: "Jabalina 700 g", light: "Jabalina 500 g", nockHeavy: "Nockenball 600 g", nockLight: "Nockenball 400 g" };
}

export function javelin(ctx: Ctx, days: number): TemplateResult {
  const p = ctx.phase;
  const imp = javelinImplements(ctx.input.sex);
  const varied = ctx.has("VARIED_IMPLEMENTS");
  const cross = ctx.input.level === "BEGINNER" ? 3 : 5;
  const full = p.throwPct >= 88;

  const techAndThrows = () =>
    session("Técnica de carrera de impulso + lanzamientos", "high", [
      throwerPrehab(ctx),
      block("TECHNIQUE", "Velocidad y técnica de pasos cruzados", "Sistema nervioso fresco: calidad máxima, recuperaciones completas.", [
        sprint("Aceleraciones", ctx.n(4, 2), 30, ctx.pct(p.sprintPct), 150, "Salida de pie, progresiva."),
        prep(`Ritmo de pasos cruzados sin implemento (${cross} impulsos)`, 4, 1, "Cadera adelantada, hombros cerrados; acelera en los 2 últimos apoyos."),
        prep("Carrera de impulso completa con marca de referencia (check-mark)", ctx.n(5, 3), 1, "Comprueba que el pie cae en la marca al iniciar los cruzados; ajusta ±1 pie."),
        prep("Impulso final: penúltimo apoyo + bloqueo de la pierna adelantada, sin soltar", 3, 5, "Bloqueo firme, codo alto, pecho al frente."),
      ]),
      block("JUMPS_THROWS", "Lanzamientos", `Intensidad objetivo ${ctx.pct(p.throwPct)} %. Detén la serie si aparece dolor en codo u hombro.`, [
        varied ? throwOr(ctx, thr("Nockenball: parado y con 3 pasos", ctx.n(12, 6), 70, imp.nockHeavy, 45, "Calentamiento específico: látigo del brazo, codo por encima del hombro."), "Lanzamiento parado") : null,
        throwOr(ctx, thr(`Jabalina reglamentaria: 3 y ${cross} pasos cruzados`, ctx.n(14, 6), ctx.pct(p.throwPct - 6), imp.official, 75, "Punta alineada, tirar a través de la punta."), "Lanzamiento con 3 pasos"),
        full ? throwOr(ctx, thr("Jabalina reglamentaria: carrera completa", ctx.n(10, 4), ctx.pct(p.throwPct), imp.official, 120, "Modelo de competición: máximo 6 lanzamientos seguidos."), "Lanzamiento con carrera") : null,
      ]),
      block("STRENGTH", "Fuerza explosiva", "Movimientos rápidos; no llegar al fallo.", [
        barOr(ctx, lift(ctx, "Arrancada de potencia", ctx.n(4, 2), p.powerReps, ctx.pct(p.powerPct), "Cuerpo completo", { ref: "SNATCH" }), "Arrancada a una mano con mancuerna", "Salto con contramovimiento lastrado"),
        barOr(ctx, acc("Pullover explosivo con barra", ctx.n(4, 2), 5, 8, "Espalda", "Simula el arrastre del brazo: velocidad concéntrica máxima."), "Pullover explosivo con mancuerna", "Pullover con goma anclada"),
        barOr(ctx, lift(ctx, "Sentadilla", ctx.n(p.strengthSets, 2), p.strengthReps, ctx.pct(p.strengthPct), "Cuádriceps", { ref: "SQUAT" }), "Sentadilla búlgara con mancuernas", "Sentadilla a una pierna asistida"),
      ]),
    ]);

  const powerAndMedball = () =>
    session("Fuerza explosiva-elástica + balón medicinal", "high", [
      throwerPrehab(ctx),
      block("TECHNIQUE", "Velocidad", "Estímulo neural breve.", [
        sprint("Salidas desde parado", ctx.n(4, 2), 20, ctx.pct(p.sprintPct), 120),
        prep(`Cruzados veloces con jabalina (${cross} pasos, sin lanzar)`, 4, 1, "Mantén la jabalina pegada a la sien y la punta estable."),
      ]),
      block("JUMPS_THROWS", "Balón medicinal y pliometría de bloqueo", "Transferencia de la cadena posterior y del bloqueo al lanzamiento.", [
        need(ctx, "MEDBALL", thr("Balón medicinal overhead adelante (dos manos, de pie)", ctx.n(12, 6), 85, medballKg(ctx), 45, "Arco tenso y latigazo; suelta por encima de la cabeza.")),
        need(ctx, "MEDBALL", thr("Balón medicinal overhead con paso de bloqueo", ctx.n(10, 5), 85, medballKg(ctx), 60, "Clava la pierna de bloqueo y pasa el pecho por encima.")),
        plyo("Saltos unilaterales de bloqueo (caída y frenado sobre la pierna adelantada)", ctx.n(3, 2), Math.max(4, Math.round(6 * p.plyo)), 90, "Rodilla firme: no ceder en el contacto."),
        plyo("Multisaltos alternos (bounds)", ctx.n(3, 2), Math.max(5, Math.round(8 * p.plyo)), 120),
      ]),
      block("STRENGTH", "Potencia y fuerza", "", [
        barOr(ctx, lift(ctx, "Cargada de potencia", ctx.n(4, 2), p.powerReps, ctx.pct(p.powerPct), "Cuerpo completo", { ref: "CLEAN" }), "Cargada con mancuernas", "Salto vertical máximo"),
        barOr(ctx, lift(ctx, "Press banca", ctx.n(p.strengthSets, 2), p.strengthReps, ctx.pct(p.strengthPct - 3), "Pecho", { ref: "BENCH" }), "Press con mancuernas", "Flexiones pliométricas"),
        acc("Zancada con paso de bloqueo (énfasis en la pierna adelantada)", 3, 6, 7, "Glúteo", "Por lado."),
        acc(ctx.has("MACHINES") ? "Rotación de tronco en polea (leñador)" : "Rotación de tronco con goma / landmine", 3, 8, 7, "Core", "Disocia cadera y hombros."),
      ]),
    ]);

  const implementsDay = () => {
    const total = ctx.n(30, 12);
    const heavy = varied ? Math.round(total * p.heavyRatio) : 0;
    const light = varied ? Math.round(total * p.lightRatio) : 0;
    const official = Math.max(4, total - heavy - light);
    return session("Implementos pesados y ligeros", "high", [
      throwerPrehab(ctx),
      block("TECHNIQUE", "Ritmo de carrera", "", [
        sprint("Progresivos", ctx.n(3, 2), 40, ctx.pct(p.sprintPct - 5), 120),
        prep(`Carrera de impulso con jabalina: ${cross} pasos cruzados a ritmo de competición`, 5, 1, "Sin lanzar; acelera hasta el bloqueo."),
      ]),
      block("JUMPS_THROWS", "Lanzamientos por contraste de implemento", "Orden: pesado (fuerza específica) → reglamentario → ligero (velocidad de brazo).", [
        heavy > 0 ? throwOr(ctx, thr("Jabalina pesada: 3 pasos", heavy, ctx.pct(p.throwPct - 8), imp.heavy, 90, "No forzar el codo: empuja con piernas y tronco."), "Lanzamiento pesado") : null,
        throwOr(ctx, thr(`Jabalina reglamentaria: ${cross} pasos`, official, ctx.pct(p.throwPct - 3), imp.official, 90), "Lanzamiento reglamentario"),
        light > 0 ? throwOr(ctx, thr("Jabalina ligera: velocidad de brazo", light, ctx.pct(p.throwPct), imp.light, 120, "Máxima velocidad de liberación; pocas repeticiones y recuperación completa."), "Lanzamiento ligero") : null,
      ]),
      block("STRENGTH", "Fuerza específica", "", [
        barOr(ctx, acc("Pullover explosivo con barra", ctx.n(3, 2), 5, 8, "Espalda"), "Pullover explosivo con mancuerna", "Pullover con goma anclada"),
        barOr(ctx, lift(ctx, "Hip thrust", ctx.n(3, 2), 6, ctx.pct(p.strengthPct - 5), "Glúteo", { ref: "DEADLIFT", factor: 0.9 }), "Hip thrust a una pierna con mancuerna", "Puente de glúteo a una pierna"),
        acc("Core anti-rotación: press Pallof", 3, 10, 7, "Core"),
      ]),
    ]);
  };

  const generalDay = () =>
    session("Capacidad general y prehab ampliado", "low", [
      throwerPrehab(ctx, true),
      block("TECHNIQUE", "Patrón técnico sin carga", "Baja intensidad: fijar posiciones.", [
        prep(ctx.has("BANDS") ? "Imitaciones de lanzamiento con goma" : "Imitaciones de lanzamiento con toalla", 3, 10, "Secuencia: cadera → pecho → codo → mano."),
        prep("Pasos cruzados laterales en progresión", 4, 1, "20 m, ritmo creciente."),
      ]),
      block("METABOLIC", "Tempo extensivo", "Recuperación activa: no superar RPE 5–6.", [
        run("Tempo en césped", Math.max(4, Math.round(8 * ctx.vol * p.metabolic)), 100, 5, 60, "Vuelta andando."),
        acc("Circuito de core (plancha, lateral, hollow, bird-dog)", 3, 30, 6, "Core", "30 s por estación."),
      ]),
    ]);

  const lightTech = () =>
    session("Técnica ligera y fuerza auxiliar", "low", [
      throwerPrehab(ctx, true),
      block("TECHNIQUE", "Técnica de baja intensidad", "", [
        prep("Pasos cruzados con jabalina: 3 → 5 → 7 impulsos", 6, 1, "Controla el ritmo corto-largo del penúltimo paso."),
        throwOr(ctx, thr("Lanzamientos de precisión", ctx.n(10, 6), 60, varied ? imp.nockLight : imp.official, 45, "Precisión de actitud; sin buscar distancia."), "Lanzamiento de precisión"),
      ]),
      block("STRENGTH", "Fuerza auxiliar", "Trabajo estructural, lejos del fallo.", [
        acc("Curl nórdico de isquiosurales", 3, 5, 7, "Isquiosurales"),
        acc(ctx.has("DUMBBELLS") ? "Remo a una mano con mancuerna" : "Remo invertido", 3, 10, 7, "Espalda"),
        acc("Elevación de gemelo a una pierna", 3, 12, 7, "Gemelo"),
      ]),
    ]);

  const recovery = () =>
    session("Recuperación activa", "low", [
      throwerPrehab(ctx, true),
      block("METABOLIC", "Aeróbico regenerativo", "", [
        run("Carrera continua suave", 1, Math.round(3000 * p.metabolic), 4, null, "15–20 min conversacionales."),
        acc("Movilidad global y respiración", 1, 10, 3, "Core", "10 minutos."),
      ]),
    ]);

  return {
    sessions: alternate([techAndThrows, powerAndMedball, implementsDay], [generalDay, lightTech, recovery], days),
    notes: [
      "Prehab de hombro/codo obligatorio antes de cualquier sesión con lanzamientos.",
      varied ? "Proporción de implementos según fase: más pesado en GPP, más ligero y reglamentario hacia competición." : "Sin implementos variados: todo el volumen se hace con la jabalina reglamentaria.",
      "Entre sesiones de lanzamientos intensos se deja al menos un día de baja demanda para proteger el codo (LCC).",
    ],
  };
}
