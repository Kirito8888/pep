/**
 * Datos de demostración: dos amigos (un decatleta y un lanzador de jabalina/disco)
 * con marcas, registros y planificaciones generadas con el propio motor de AthlosPro.
 *
 * Es idempotente: si los usuarios de demostración ya existen no hace nada.
 * Se desactiva con SEED_DEMO_DATA=false.
 */
import bcrypt from "bcryptjs";
import { COMPETITIONS, scoreCompetition } from "@/lib/athletics/combined";
import { addDays, mondayOf, toDateInput } from "@/lib/dates";
import { generatePlan } from "@/lib/generator";
import { EQUIPMENT, type GeneratedPlan } from "@/lib/generator/types";
import { createPlanTree } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { PHASE_LABEL } from "@/lib/athletics/events";

// Contraseña pública de las cuentas de demostración (documentada en el README). No es un secreto.
const DEMO_PASSWORD = "Demo1234!";
const CARLOS = "carlos@athlospro.local";
const JAVIER = "javier@athlospro.local";

const ALL_EQUIPMENT = EQUIPMENT.map((e) => e.key);

function toPlanInput(plan: GeneratedPlan, title: string, startDate: string, assigneeId: string | null = null) {
  return {
    title,
    description: plan.description,
    specialty: plan.specialty,
    level: plan.level,
    startDate,
    assigneeId,
    mesocycles: [
      {
        name: PHASE_LABEL[plan.phase],
        phase: plan.phase,
        weeks: plan.weeks.map((w) => ({ focus: w.focus, sessions: w.sessions.map((s) => ({ dayOffset: s.dayOffset, title: s.title, blocks: s.blocks })) })),
      },
    ],
  };
}

async function main() {
  if ((process.env.SEED_DEMO_DATA ?? "true").toLowerCase() === "false") {
    console.log("[seed] SEED_DEMO_DATA=false: no se cargan datos de demostración.");
    return;
  }
  const existing = await prisma.user.findFirst({ where: { email: { in: [CARLOS, JAVIER] } }, select: { id: true } });
  if (existing) {
    console.log("[seed] Los datos de demostración ya existen: no se modifica nada.");
    return;
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const today = new Date();
  const monday = mondayOf(today);
  const day = (offset: number) => addDays(monday, offset);

  const carlos = await prisma.user.create({
    data: { email: CARLOS, name: "Carlos Méndez", passwordHash, sex: "M", specialty: "COMBINED", inviteCode: "DECA2345", restingHr: 48, maxHr: 194 },
  });
  const javier = await prisma.user.create({
    data: { email: JAVIER, name: "Javier Ortega", passwordHash, sex: "M", specialty: "JAVELIN", inviteCode: "JABA6789", restingHr: 54, maxHr: 190 },
  });
  await prisma.friendship.create({ data: { requesterId: carlos.id, addresseeId: javier.id, status: "ACCEPTED" } });

  // ── Carlos: decatleta ──────────────────────────────────────────────────────
  const dec = COMPETITIONS.DECATHLON;
  const decathlons = [
    { offset: -330, label: "Campeonato autonómico", p: { "100m": 11.32, LJ: 6.78, SP: 12.6, HJ: 1.89, "400m": 51.2, "110mH": 15.62, DT: 37.9, PV: 4.2, JT: 51.3, "1500m": 287.4 }, w: { "100m": 0.8, LJ: 1.2, "110mH": -0.4 } },
    { offset: -150, label: "Reunión de combinadas", p: { "100m": 11.18, LJ: 6.95, SP: 13.15, HJ: 1.92, "400m": 50.45, "110mH": 15.21, DT: 39.8, PV: 4.4, JT: 54.1, "1500m": 282.9 }, w: { "100m": 1.5, LJ: 0.3, "110mH": 1.1 } },
    { offset: -45, label: "Campeonato de España", p: { "100m": 11.05, LJ: 7.1, SP: 13.6, HJ: 1.95, "400m": 49.8, "110mH": 14.9, DT: 41.5, PV: 4.6, JT: 56.0, "1500m": 278.0 }, w: { "100m": 1.9, LJ: 2.4, "110mH": 0.6 } },
  ];
  for (const d of decathlons) {
    const performances = Object.fromEntries(Object.entries(d.p).map(([k, v]) => [k, { value: v, wind: (d.w as Record<string, number>)[k] ?? null }]));
    const total = scoreCompetition(dec, performances).total;
    await prisma.combinedResult.create({ data: { userId: carlos.id, competition: "DECATHLON", label: d.label, date: day(d.offset), performances, totalPoints: total } });
    await prisma.mark.create({ data: { userId: carlos.id, event: "DECATHLON", value: total, date: day(d.offset), competition: d.label } });
    for (const [event, value] of Object.entries(d.p)) {
      await prisma.mark.create({ data: { userId: carlos.id, event, value, wind: (d.w as Record<string, number>)[event] ?? null, date: day(d.offset), competition: d.label } });
    }
  }
  await prisma.personalRecord.createMany({
    data: [
      { userId: carlos.id, exercise: "Sentadilla", category: "STRENGTH", value: 165, unit: "kg", date: day(-60) },
      { userId: carlos.id, exercise: "Press banca", category: "STRENGTH", value: 110, unit: "kg", date: day(-52) },
      { userId: carlos.id, exercise: "Peso muerto", category: "STRENGTH", value: 190, unit: "kg", date: day(-40) },
      { userId: carlos.id, exercise: "Cargada", category: "OLYMPIC", value: 105, unit: "kg", date: day(-33) },
      { userId: carlos.id, exercise: "Cargada", category: "OLYMPIC", value: 100, unit: "kg", date: day(-120) },
      { userId: carlos.id, exercise: "Arrancada", category: "OLYMPIC", value: 78, unit: "kg", date: day(-26) },
      { userId: carlos.id, exercise: "Salto con contramovimiento (CMJ)", category: "BALLISTIC", value: 58, unit: "cm", date: day(-20) },
    ],
  });
  await prisma.approachRun.createMany({
    data: [
      { userId: carlos.id, date: day(-9), event: "LJ", name: "Longitud · carrera completa", distanceM: 38.4, strides: 18, midMarkM: 12.6, midMarkStride: 6, wind: 1.2, adjustmentCm: 11, notes: "Tabla clavada con viento a favor." },
      { userId: carlos.id, date: day(-9), event: "HJ", name: "Altura · 9 apoyos (5 en curva)", distanceM: 17.2, strides: 9, midMarkM: 9.8, midMarkStride: 5, notes: "Entrada por la izquierda." },
      { userId: carlos.id, date: day(-6), event: "PV", name: "Pértiga · 16 apoyos", distanceM: 34.9, strides: 16, midMarkM: 15.1, midMarkStride: 6, notes: "" },
    ],
  });
  await prisma.poleConfig.createMany({
    data: [
      { userId: carlos.id, name: "Competición", lengthM: 4.6, flexLbs: 175, gripHeightM: 4.4, standardsCm: 60, approachStrides: 16, notes: "Para viento a favor o neutro." },
      { userId: carlos.id, name: "Carrera corta", lengthM: 4.3, flexLbs: 165, gripHeightM: 4.1, standardsCm: 55, approachStrides: 10, notes: "Técnica." },
    ],
  });
  for (let w = -5; w <= 0; w++) {
    const base = w * 7;
    await prisma.plyoLog.createMany({
      data: [
        { userId: carlos.id, date: day(base + 1), type: "DROP_JUMP", contacts: 24 + (w + 5) * 2, intensity: "HIGH" },
        { userId: carlos.id, date: day(base + 1), type: "HORIZONTAL", contacts: 40 + (w + 5) * 4, intensity: "HIGH" },
        { userId: carlos.id, date: day(base + 3), type: "HURDLE_HOPS", contacts: 36, intensity: "MEDIUM" },
      ],
    });
    await prisma.enduranceLog.createMany({
      data: [
        { userId: carlos.id, date: day(base + 2), type: "TEMPO", distanceKm: 4 + (w + 5) * 0.3, durationMin: 22 + (w + 5), rpe: 6 },
        { userId: carlos.id, date: day(base + 5), type: "INTERVAL", distanceKm: 3.2, durationMin: 28, rpe: 8, notes: "6 × 400 m ritmo de 1.500." },
      ],
    });
    await prisma.liftLog.createMany({
      data: [
        { userId: carlos.id, date: day(base), exercise: "Sentadilla", muscleGroup: "Cuádriceps", sets: 4, reps: 4, weightKg: 130 + (w + 5) * 2.5, rpe: 8 },
        { userId: carlos.id, date: day(base), exercise: "Press banca", muscleGroup: "Pecho", sets: 3, reps: 4, weightKg: 90 + (w + 5), rpe: 8 },
        { userId: carlos.id, date: day(base + 3), exercise: "Cargada de potencia", muscleGroup: "Cuerpo completo", sets: 4, reps: 3, weightKg: 80 + (w + 5), rpe: 8 },
        { userId: carlos.id, date: day(base + 3), exercise: "Curl nórdico", muscleGroup: "Isquiosurales", sets: 3, reps: 5, weightKg: 0, rpe: 8 },
      ],
    });
    await prisma.throwLog.createMany({
      data: [
        { userId: carlos.id, date: day(base), event: "SHOT", implementName: "Peso 7,26 kg", weightG: 7260, officialWeightG: 7260, count: 14, intensityPct: 88, bestDistance: 13.2 + (w + 5) * 0.05 },
        { userId: carlos.id, date: day(base + 3), event: "JAVELIN", implementName: "Jabalina 800 g", weightG: 800, officialWeightG: 800, count: 14, intensityPct: 85, bestDistance: 53.5 + (w + 5) * 0.3, throwType: "STEP5", crossSteps: 5, approachMeters: 24.5, approachSteps: 12, checkMark: 10.8, anglePerceived: "OPTIMAL", windType: "NONE" },
      ],
    });
  }

  // ── Javier: jabalina y disco ───────────────────────────────────────────────
  await prisma.mark.createMany({
    data: [
      { userId: javier.id, event: "JT", value: 68.4, date: day(-400), competition: "Campeonato autonómico" },
      { userId: javier.id, event: "JT", value: 70.15, date: day(-300), competition: "Copa de clubes" },
      { userId: javier.id, event: "JT", value: 71.9, date: day(-120), competition: "Lanzamientos largos de invierno" },
      { userId: javier.id, event: "JT", value: 73.42, date: day(-38), competition: "Campeonato de España" },
      { userId: javier.id, event: "DT", value: 46.8, date: day(-290), competition: "Liga de clubes" },
      { userId: javier.id, event: "DT", value: 48.95, date: day(-52), competition: "Control federativo" },
      { userId: javier.id, event: "SP", value: 14.6, date: day(-52), competition: "Control federativo" },
    ],
  });
  await prisma.personalRecord.createMany({
    data: [
      { userId: javier.id, exercise: "Sentadilla", category: "STRENGTH", value: 185, unit: "kg", date: day(-70) },
      { userId: javier.id, exercise: "Press banca", category: "STRENGTH", value: 135, unit: "kg", date: day(-64) },
      { userId: javier.id, exercise: "Peso muerto", category: "STRENGTH", value: 215, unit: "kg", date: day(-50) },
      { userId: javier.id, exercise: "Arrancada", category: "OLYMPIC", value: 95, unit: "kg", date: day(-180) },
      { userId: javier.id, exercise: "Arrancada", category: "OLYMPIC", value: 102.5, unit: "kg", date: day(-30) },
      { userId: javier.id, exercise: "Cargada", category: "OLYMPIC", value: 130, unit: "kg", date: day(-44) },
      { userId: javier.id, exercise: "Envión (dos tiempos)", category: "OLYMPIC", value: 122.5, unit: "kg", date: day(-44) },
      { userId: javier.id, exercise: "Lanzamiento balón medicinal overhead", category: "BALLISTIC", value: 17.8, unit: "m", date: day(-16), notes: "Balón de 4 kg." },
    ],
  });
  await prisma.implement.createMany({
    data: [
      { userId: javier.id, event: "JAVELIN", name: "Jabalina 800 g", kind: "OFFICIAL", weightG: 800, officialWeightG: 800 },
      { userId: javier.id, event: "JAVELIN", name: "Jabalina 900 g", kind: "HEAVY", weightG: 900, officialWeightG: 800 },
      { userId: javier.id, event: "JAVELIN", name: "Jabalina 1000 g", kind: "HEAVY", weightG: 1000, officialWeightG: 800 },
      { userId: javier.id, event: "JAVELIN", name: "Jabalina 700 g", kind: "LIGHT", weightG: 700, officialWeightG: 800 },
      { userId: javier.id, event: "JAVELIN", name: "Jabalina 600 g", kind: "LIGHT", weightG: 600, officialWeightG: 800 },
      { userId: javier.id, event: "JAVELIN", name: "Nockenball 800 g", kind: "NOCKENBALL", weightG: 800, officialWeightG: 800 },
      { userId: javier.id, event: "JAVELIN", name: "Nockenball 600 g", kind: "NOCKENBALL", weightG: 600, officialWeightG: 800 },
      { userId: javier.id, event: "DISCUS", name: "Disco 2 kg", kind: "OFFICIAL", weightG: 2000, officialWeightG: 2000 },
      { userId: javier.id, event: "DISCUS", name: "Disco 2,5 kg", kind: "HEAVY", weightG: 2500, officialWeightG: 2000 },
      { userId: javier.id, event: "DISCUS", name: "Disco 1,75 kg", kind: "LIGHT", weightG: 1750, officialWeightG: 2000 },
    ],
  });
  for (let w = -7; w <= 0; w++) {
    const base = w * 7;
    const k = w + 7;
    const jav = { userId: javier.id, event: "JAVELIN", officialWeightG: 800 };
    await prisma.throwLog.createMany({
      data: [
        { ...jav, date: day(base), implementName: "Nockenball 800 g", weightG: 800, count: 12, intensityPct: 70, throwType: "STAND", windType: "NONE", notes: "Calentamiento específico." },
        { ...jav, date: day(base), implementName: "Jabalina 800 g", weightG: 800, count: 14 + (k % 3), intensityPct: 84, bestDistance: 62 + k * 0.4, throwType: "STEP5", crossSteps: 5, approachMeters: 22.4, approachSteps: 11, checkMark: 11.3, anglePerceived: "OPTIMAL", windType: "NONE" },
        { ...jav, date: day(base), implementName: "Jabalina 800 g", weightG: 800, count: 8 + (k % 2) * 2, intensityPct: 93, bestDistance: 67.5 + k * 0.5, throwType: "FULL", crossSteps: 5, approachMeters: 29.8, approachSteps: 15, checkMark: 11.3, anglePerceived: k % 3 === 0 ? "HIGH" : "OPTIMAL", windType: k % 2 ? "HEAD" : "TAIL", windSpeed: 1.5 + (k % 3) * 0.6, notes: "Carrera completa." },
        { ...jav, date: day(base + 4), implementName: "Jabalina 900 g", weightG: 900, count: 10, intensityPct: 82, bestDistance: 58 + k * 0.3, throwType: "STEP3", crossSteps: 3, anglePerceived: "LOW", windType: "NONE" },
        { ...jav, date: day(base + 4), implementName: "Jabalina 700 g", weightG: 700, count: 6 + (k % 2) * 2, intensityPct: 95, bestDistance: 71 + k * 0.4, throwType: "STEP5", crossSteps: 5, approachMeters: 22.4, approachSteps: 11, checkMark: 11.3, anglePerceived: "OPTIMAL", windType: "CROSS", windSpeed: 1.0, notes: "Velocidad de brazo." },
        { userId: javier.id, event: "DISCUS", officialWeightG: 2000, date: day(base + 2), implementName: "Disco 2 kg", weightG: 2000, count: 18, intensityPct: 86, bestDistance: 46 + k * 0.25 },
      ],
    });
    await prisma.prehabLog.createMany({
      data: [
        { userId: javier.id, date: day(base), items: ["ext_rot", "scap", "thoracic", "anti_ext", "forearm"], notes: "" },
        { userId: javier.id, date: day(base + 4), items: ["ext_rot", "scap", "thoracic", "anti_rot", "forearm", "post_cuff"], notes: k === 5 ? "Ligera carga en el codo tras la jabalina de 700 g." : "" },
      ],
    });
    await prisma.medBallLog.createMany({
      data: [
        { userId: javier.id, date: day(base + 2), type: "OVERHEAD", weightKg: 4, throws: 16, bestDistance: 16.4 + k * 0.15 },
        { userId: javier.id, date: day(base + 2), type: "ROTATIONAL", weightKg: 5, throws: 12 },
        { userId: javier.id, date: day(base + 5), type: "CHEST", weightKg: 5, throws: 10, bestDistance: 11.2 },
      ],
    });
    await prisma.liftLog.createMany({
      data: [
        { userId: javier.id, date: day(base), exercise: "Arrancada de potencia", muscleGroup: "Cuerpo completo", sets: 4, reps: 3, weightKg: 72.5 + k * 1.25, rpe: 8 },
        { userId: javier.id, date: day(base), exercise: "Sentadilla", muscleGroup: "Cuádriceps", sets: 4, reps: 4, weightKg: 145 + k * 2.5, rpe: 8.5 },
        { userId: javier.id, date: day(base + 2), exercise: "Press banca", muscleGroup: "Pecho", sets: 4, reps: 4, weightKg: 105 + k * 1.25, rpe: 8 },
        { userId: javier.id, date: day(base + 2), exercise: "Pullover explosivo", muscleGroup: "Espalda", sets: 4, reps: 5, weightKg: 40 + k, rpe: 8 },
        { userId: javier.id, date: day(base + 4), exercise: "Cargada de potencia", muscleGroup: "Cuerpo completo", sets: 4, reps: 3, weightKg: 95 + k * 1.25, rpe: 8 },
        { userId: javier.id, date: day(base + 4), exercise: "Hip thrust", muscleGroup: "Glúteo", sets: 3, reps: 6, weightKg: 150 + k * 2.5, rpe: 8 },
      ],
    });
    await prisma.plyoLog.create({ data: { userId: javier.id, date: day(base + 2), type: "HORIZONTAL", contacts: 30 + k * 2, intensity: "HIGH", notes: "Bounds y saltos de bloqueo." } });
  }

  // ── Planificaciones generadas con el motor de AthlosPro ───────────────────
  // Empiezan la semana pasada para que la semana actual sea el microciclo 2.
  const start = toDateInput(addDays(monday, -7));
  const carlosPlan = generatePlan({
    specialty: "COMBINED", phase: "SPP", level: "ADVANCED", daysPerWeek: 5, equipment: ALL_EQUIPMENT, weeks: 4, sex: "M",
    oneRm: { SQUAT: 165, BENCH: 110, DEADLIFT: 190, CLEAN: 105, SNATCH: 78 },
  });
  const javierPlan = generatePlan({
    specialty: "JAVELIN", phase: "SPP", level: "ADVANCED", daysPerWeek: 5, equipment: ALL_EQUIPMENT, weeks: 4, sex: "M",
    oneRm: { SQUAT: 185, BENCH: 135, DEADLIFT: 215, CLEAN: 130, SNATCH: 102.5 },
  });
  const coachPlan = generatePlan({
    specialty: "JAVELIN", phase: "SPP", level: "INTERMEDIATE", daysPerWeek: 2, equipment: ALL_EQUIPMENT, weeks: 2, sex: "M",
    oneRm: { SQUAT: 165, BENCH: 110, DEADLIFT: 190, CLEAN: 105, SNATCH: 78 },
  });
  const carlosPlanId = await createPlanTree(carlos.id, toPlanInput(carlosPlan, "Decatlón · Preparación específica", start));
  const javierPlanId = await createPlanTree(javier.id, toPlanInput(javierPlan, "Jabalina · Preparación específica", start));
  // Javier, como especialista, prepara un bloque de jabalina para su amigo decatleta.
  const coachPlanId = await createPlanTree(javier.id, toPlanInput(coachPlan, "Bloque técnico de jabalina para Carlos", toDateInput(monday), carlos.id));

  // La primera semana ya está entrenada: sesiones completadas con sensaciones.
  for (const [planId, feeling] of [[carlosPlanId, 4], [javierPlanId, 4]] as const) {
    const sessions = await prisma.trainingSession.findMany({ where: { planId, date: { lt: monday } }, orderBy: { date: "asc" }, select: { id: true, date: true } });
    for (const [i, s] of sessions.entries()) {
      await prisma.trainingSession.update({
        where: { id: s.id },
        data: { completed: true, completedAt: addDays(s.date, 0.8), feeling: i % 3 === 2 ? 3 : feeling, sessionRpe: 6 + (i % 3), athleteNotes: i === 0 ? "Buenas sensaciones; técnica fluida." : "" },
      });
    }
  }
  const firstJavelin = await prisma.trainingSession.findFirst({ where: { planId: javierPlanId }, orderBy: { date: "asc" }, select: { id: true } });
  if (firstJavelin) {
    await prisma.sessionComment.createMany({
      data: [
        { sessionId: firstJavelin.id, authorId: carlos.id, text: "¿Cuántos lanzamientos de carrera completa haces antes de notar que baja la velocidad de brazo?" },
        { sessionId: firstJavelin.id, authorId: javier.id, text: "Nunca más de 6 seguidos. A partir del séptimo el codo se cae y deja de ser técnica de competición." },
      ],
    });
  }
  const firstCoach = await prisma.trainingSession.findFirst({ where: { planId: coachPlanId }, orderBy: { date: "asc" }, select: { id: true } });
  if (firstCoach) {
    await prisma.sessionComment.create({ data: { sessionId: firstCoach.id, authorId: javier.id, text: "Carlos: céntrate en mantener la punta cerrada durante los cruzados. La distancia no importa en este bloque." } });
  }

  console.log("[seed] Datos de demostración creados:");
  console.log(`[seed]   ${CARLOS} (decatleta) y ${JAVIER} (jabalina/disco) · contraseña: ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error("[seed] Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
