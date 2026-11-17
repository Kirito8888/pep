import { acc, alternate, barOr, block, lift, medballKg, need, plyo, prep, run, session, sprint, thr, throwerPrehab, throwOr, type Ctx } from "../helpers";
import type { TemplateResult } from "../types";

function implementsFor(kind: "rotational" | "linear", sex: "M" | "F") {
  if (kind === "rotational") {
    return sex === "M"
      ? { noun: "Disco", official: "Disco 2 kg", heavy: "Disco 2,5 kg", light: "Disco 1,75 kg" }
      : { noun: "Disco", official: "Disco 1 kg", heavy: "Disco 1,5 kg", light: "Disco 0,75 kg" };
  }
  return sex === "M"
    ? { noun: "Peso", official: "Peso 7,26 kg", heavy: "Peso 8 kg", light: "Peso 6 kg" }
    : { noun: "Peso", official: "Peso 4 kg", heavy: "Peso 5 kg", light: "Peso 3 kg" };
}

/** Lanzamientos rotacionales (disco/martillo) y lineales (peso). */
export function throwsTemplate(kind: "rotational" | "linear") {
  return (ctx: Ctx, days: number): TemplateResult => {
    const p = ctx.phase;
    const imp = implementsFor(kind, ctx.input.sex);
    const varied = ctx.has("VARIED_IMPLEMENTS");
    const rot = kind === "rotational";
    const drill = rot ? "Giros completos sin implemento (eje sobre el pie izquierdo)" : "Deslizamientos / giros de peso sin implemento";
    const partial = rot ? "Lanzamiento parado y medio giro (South African)" : "Lanzamiento parado y con paso (posición de fuerza)";
    const fullThrow = rot ? "Lanzamiento completo con giro" : "Lanzamiento completo (deslizamiento o rotacional)";
    const medballMove = rot ? "Balón medicinal rotacional contra pared" : "Balón medicinal de pecho / tipo peso";

    const techAndMax = () =>
      session(`Técnica de ${imp.noun.toLowerCase()} + fuerza máxima`, "high", [
        throwerPrehab(ctx),
        block("TECHNIQUE", "Técnica y velocidad", "Ritmo: lento-rápido; equilibrio en el centro del círculo.", [
          sprint("Salidas explosivas", ctx.n(4, 2), 20, ctx.pct(p.sprintPct), 120),
          prep(drill, 4, 6, "Mantén el implemento retrasado respecto a la cadera."),
          prep("Posición de fuerza: bloqueo del lado izquierdo y final", 3, 6),
        ]),
        block("JUMPS_THROWS", "Lanzamientos", `Intensidad objetivo ${ctx.pct(p.throwPct)} %.`, [
          throwOr(ctx, thr(partial, ctx.n(12, 6), ctx.pct(p.throwPct - 8), imp.official, 60), partial),
          throwOr(ctx, thr(fullThrow, ctx.n(16, 6), ctx.pct(p.throwPct), imp.official, 90, "Modelo de competición: series de 6."), fullThrow),
        ]),
        block("STRENGTH", "Fuerza máxima", "Descansos completos (3–5 min) en los básicos.", [
          barOr(ctx, lift(ctx, "Sentadilla", ctx.n(p.strengthSets + 1, 2), p.strengthReps, ctx.pct(p.strengthPct), "Cuádriceps", { ref: "SQUAT" }), "Sentadilla goblet pesada", "Sentadilla a una pierna"),
          barOr(ctx, lift(ctx, "Press banca", ctx.n(p.strengthSets + 1, 2), p.strengthReps, ctx.pct(p.strengthPct), "Pecho", { ref: "BENCH" }), "Press con mancuernas", "Flexiones lastradas"),
          acc(ctx.has("MACHINES") ? "Remo en polea baja" : "Remo con barra / invertido", 3, 8, 8, "Espalda"),
        ]),
      ]);

    const power = () =>
      session("Potencia: halterofilia, balón medicinal y pliometría", "high", [
        throwerPrehab(ctx),
        block("TECHNIQUE", "Activación neural", "", [sprint("Aceleraciones", ctx.n(3, 2), 20, ctx.pct(p.sprintPct), 120), prep(drill, 3, 5)]),
        block("JUMPS_THROWS", "Potencia balística", "Máxima velocidad en cada repetición.", [
          need(ctx, "MEDBALL", thr(medballMove, ctx.n(14, 6), 85, medballKg(ctx, true), 45, rot ? "Rotación desde la cadera, brazos largos." : "Empuje explosivo desde la posición de fuerza.")),
          need(ctx, "MEDBALL", thr("Balón medicinal hacia atrás por encima de la cabeza", ctx.n(8, 4), 85, medballKg(ctx, true), 60, "Triple extensión.")),
          plyo("Saltos al cajón / verticales máximos", ctx.n(4, 2), Math.max(3, Math.round(5 * p.plyo)), 90),
          plyo("Saltos horizontales a pies juntos", ctx.n(3, 2), Math.max(3, Math.round(5 * p.plyo)), 120),
        ]),
        block("STRENGTH", "Derivados de halterofilia", "", [
          barOr(ctx, lift(ctx, "Cargada de potencia", ctx.n(5, 2), p.powerReps, ctx.pct(p.powerPct), "Cuerpo completo", { ref: "CLEAN" }), "Cargada con mancuernas", "Salto vertical lastrado"),
          barOr(ctx, lift(ctx, "Arrancada de potencia", ctx.n(4, 2), p.powerReps, ctx.pct(p.powerPct - 3), "Cuerpo completo", { ref: "SNATCH" }), "Arrancada con mancuerna", "Lanzamiento de balón vertical"),
          barOr(ctx, lift(ctx, "Push press", ctx.n(3, 2), 3, ctx.pct(p.powerPct), "Hombro", { ref: "BENCH", factor: 0.75 }), "Push press con mancuernas", "Flexiones pliométricas"),
        ]),
      ]);

    const implementsDay = () => {
      const total = ctx.n(36, 12);
      const heavy = varied ? Math.round(total * p.heavyRatio) : 0;
      const light = varied ? Math.round(total * p.lightRatio) : 0;
      return session("Implementos pesados y ligeros + potencia rotacional", "high", [
        throwerPrehab(ctx),
        block("TECHNIQUE", "Técnica", "", [prep(drill, 4, 5), prep("Entrada al círculo y ritmo de pies", 4, 4)]),
        block("JUMPS_THROWS", "Lanzamientos por contraste", "Pesado → reglamentario → ligero.", [
          heavy > 0 ? throwOr(ctx, thr(`${imp.noun} pesado: ${partial.toLowerCase()}`, heavy, ctx.pct(p.throwPct - 8), imp.heavy, 75, "Fuerza específica sin deformar la técnica."), partial) : null,
          throwOr(ctx, thr(fullThrow, Math.max(6, total - heavy - light), ctx.pct(p.throwPct - 2), imp.official, 90), fullThrow),
          light > 0 ? throwOr(ctx, thr(`${imp.noun} ligero: velocidad de liberación`, light, ctx.pct(p.throwPct), imp.light, 90), fullThrow) : null,
        ]),
        block("STRENGTH", "Fuerza y potencia rotacional", "", [
          barOr(ctx, lift(ctx, "Peso muerto", ctx.n(p.strengthSets, 2), p.strengthReps, ctx.pct(p.strengthPct - 3), "Cadena posterior", { ref: "DEADLIFT" }), "Peso muerto rumano con mancuernas", "Puente de glúteo a una pierna"),
          barOr(ctx, lift(ctx, "Press inclinado", ctx.n(3, 2), 5, ctx.pct(p.strengthPct - 8), "Pecho", { ref: "BENCH", factor: 0.85 }), "Press inclinado con mancuernas", "Flexiones declinadas"),
          acc(ctx.has("BARBELL") ? "Rotación landmine explosiva" : "Rotación de tronco con goma", 4, 6, 8, "Core", "Por lado; transfiere de cadera a hombros."),
        ]),
      ]);
    };

    const general = () =>
      session("Capacidad general y core", "low", [
        throwerPrehab(ctx, true),
        block("TECHNIQUE", "Técnica parcial sin carga", "", [prep(drill, 5, 5, "A cámara lenta: equilibrio y posiciones.")]),
        block("METABOLIC", "Acondicionamiento", "RPE ≤ 6.", [
          run("Tempo en césped", Math.max(4, Math.round(6 * ctx.vol * p.metabolic)), 100, 5, 60),
          acc("Circuito de core y trabajo de trineo/arrastres", 3, 30, 6, "Core", "30 s por estación."),
        ]),
      ]);

    const lightTech = () =>
      session("Técnica ligera y accesorios", "low", [
        throwerPrehab(ctx, true),
        block("TECHNIQUE", "Lanzamientos técnicos", "", [throwOr(ctx, thr(`${partial} (técnico)`, ctx.n(14, 8), 65, imp.official, 45, "Sin buscar distancia."), partial)]),
        block("STRENGTH", "Accesorios", "", [
          acc("Curl nórdico de isquiosurales", 3, 5, 7, "Isquiosurales"),
          acc(ctx.has("MACHINES") ? "Jalón al pecho" : "Dominadas", 3, 8, 7, "Espalda"),
          acc("Paseo del granjero", 3, 30, 7, "Core", "30 m por serie."),
        ]),
      ]);

    const recovery = () =>
      session("Recuperación activa", "low", [
        throwerPrehab(ctx, true),
        block("METABOLIC", "Aeróbico regenerativo", "", [run("Bicicleta o carrera suave", 1, Math.round(2500 * p.metabolic), 4, null, "15 min."), acc("Movilidad de cadera y torácica", 1, 10, 3, "Core")]),
      ]);

    return {
      sessions: alternate([techAndMax, power, implementsDay], [general, lightTech, recovery], days),
      notes: [
        rot ? "Rotacionales: la potencia nace de la disociación cadera-hombros; prioriza giros limpios antes que distancia." : "Lineales: la posición de fuerza y el bloqueo del lado izquierdo determinan la transferencia de la fuerza máxima.",
        "Fuerza máxima y derivados de halterofilia en días separados de los lanzamientos de mayor volumen.",
      ],
    };
  };
}
