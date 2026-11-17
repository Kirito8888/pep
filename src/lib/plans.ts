import type { Prisma } from "@prisma/client";
import { addDays, mondayOf, parseDateInput } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import type { PlanCreateInput } from "@/lib/validators";

type BlockInput = PlanCreateInput["mesocycles"][number]["weeks"][number]["sessions"][number]["blocks"][number];

/** Datos anidados de Prisma para crear los bloques de una sesión. */
export function blocksCreate(blocks: BlockInput[]): Prisma.SessionBlockCreateWithoutSessionInput[] {
  return blocks.map((b, bi) => ({
    type: b.type,
    order: bi,
    title: b.title,
    notes: b.notes ?? "",
    exercises: {
      create: (b.exercises ?? []).map((e, ei) => ({
        order: ei,
        name: e.name,
        sets: e.sets,
        reps: e.reps,
        intensityType: e.intensityType,
        intensityValue: e.intensityValue,
        restSec: e.restSec,
        notes: e.notes ?? "",
        implement: e.implement,
        muscleGroup: e.muscleGroup,
        loadKg: e.loadKg,
        sprintMeters: e.sprintMeters,
        hurdles: e.hurdles,
        plyoContacts: e.plyoContacts,
        throwsCount: e.throwsCount,
        distanceM: e.distanceM,
      })),
    },
  }));
}

/** Crea una planificación completa (mesociclos -> microciclos -> sesiones -> bloques -> ejercicios). */
export async function createPlanTree(ownerId: string, data: PlanCreateInput, clonedFromId: string | null = null): Promise<string> {
  const start = mondayOf(parseDateInput(data.startDate));
  return prisma.$transaction(
    async (tx) => {
      const plan = await tx.plan.create({
        data: {
          ownerId,
          assigneeId: data.assigneeId ?? null,
          title: data.title,
          description: data.description ?? "",
          specialty: data.specialty,
          level: data.level,
          startDate: start,
          clonedFromId,
        },
      });
      let week = 0;
      for (const [mi, meso] of data.mesocycles.entries()) {
        const m = await tx.mesocycle.create({ data: { planId: plan.id, name: meso.name, phase: meso.phase, order: mi } });
        for (const w of meso.weeks) {
          week += 1;
          const micro = await tx.microcycle.create({ data: { mesocycleId: m.id, weekNumber: week, focus: w.focus ?? "" } });
          for (const s of w.sessions ?? []) {
            await tx.trainingSession.create({
              data: {
                planId: plan.id,
                microcycleId: micro.id,
                date: addDays(start, (week - 1) * 7 + s.dayOffset),
                title: s.title,
                blocks: { create: blocksCreate(s.blocks ?? []) },
              },
            });
          }
        }
      }
      return plan.id;
    },
    { timeout: 60_000, maxWait: 15_000 },
  );
}

export const planTreeInclude = {
  owner: { select: { id: true, name: true } },
  assignee: { select: { id: true, name: true } },
  mesocycles: {
    orderBy: { order: "asc" },
    include: {
      microcycles: {
        orderBy: { weekNumber: "asc" },
        include: {
          sessions: {
            orderBy: { date: "asc" },
            include: {
              blocks: { orderBy: { order: "asc" }, include: { exercises: { orderBy: { order: "asc" } } } },
              _count: { select: { comments: true } },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.PlanInclude;

export type PlanTree = Prisma.PlanGetPayload<{ include: typeof planTreeInclude }>;

export function getPlanTree(planId: string): Promise<PlanTree | null> {
  return prisma.plan.findUnique({ where: { id: planId }, include: planTreeInclude });
}

/** Convierte un árbol existente en datos de creación (para clonar). */
export function treeToInput(tree: PlanTree, title: string, startDate: string): PlanCreateInput {
  const start = mondayOf(tree.startDate);
  return {
    title,
    description: tree.description,
    specialty: tree.specialty as PlanCreateInput["specialty"],
    level: tree.level as PlanCreateInput["level"],
    startDate,
    assigneeId: null,
    mesocycles: tree.mesocycles.map((m) => ({
      name: m.name,
      phase: m.phase,
      weeks: m.microcycles.map((w) => ({
        focus: w.focus,
        sessions: w.sessions.map((s) => ({
          dayOffset: Math.max(0, Math.min(6, Math.round((s.date.getTime() - start.getTime()) / 86_400_000) - (w.weekNumber - 1) * 7)),
          title: s.title,
          blocks: s.blocks.map((b) => ({
            type: b.type,
            title: b.title,
            notes: b.notes,
            exercises: b.exercises.map((e) => ({
              name: e.name,
              sets: e.sets,
              reps: e.reps,
              intensityType: e.intensityType as "PCT" | "RPE" | "NONE",
              intensityValue: e.intensityValue,
              restSec: e.restSec,
              notes: e.notes,
              implement: e.implement,
              muscleGroup: e.muscleGroup,
              loadKg: e.loadKg,
              sprintMeters: e.sprintMeters,
              hurdles: e.hurdles,
              plyoContacts: e.plyoContacts,
              throwsCount: e.throwsCount,
              distanceM: e.distanceM,
            })),
          })),
        })),
      })),
    })),
  };
}

export const planSummarySelect = {
  id: true,
  title: true,
  description: true,
  specialty: true,
  level: true,
  startDate: true,
  ownerId: true,
  assigneeId: true,
  updatedAt: true,
  owner: { select: { id: true, name: true } },
  assignee: { select: { id: true, name: true } },
  mesocycles: { orderBy: { order: "asc" }, select: { phase: true, name: true, _count: { select: { microcycles: true } } } },
  sessions: { select: { completed: true } },
} satisfies Prisma.PlanSelect;

type PlanSummaryRow = Prisma.PlanGetPayload<{ select: typeof planSummarySelect }>;

export function summarizePlan(p: PlanSummaryRow) {
  const { sessions, mesocycles, ...rest } = p;
  return {
    ...rest,
    phases: mesocycles.map((m) => ({ phase: m.phase, name: m.name, weeks: m._count.microcycles })),
    weeks: mesocycles.reduce((a, m) => a + m._count.microcycles, 0),
    totalSessions: sessions.length,
    completedSessions: sessions.filter((s) => s.completed).length,
  };
}

export type PlanSummary = ReturnType<typeof summarizePlan>;
