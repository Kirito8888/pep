import { addDays } from "@/lib/dates";
import { requirePlanAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { ApiError, parseBody, requireUser, route, type IdParams } from "@/lib/session";
import { mesocycleCreateSchema, mesocyclePatchSchema, microcyclePatchSchema } from "@/lib/validators";

async function editable(planId: string) {
  const user = await requireUser();
  const { perms } = await requirePlanAccess(user.id, planId);
  if (!perms.canEdit) throw new ApiError(403, "Solo el propietario puede editar la planificación");
}

/** Añade un mesociclo al final con sus microciclos vacíos. */
export const POST = route<IdParams>(async (req, { params }) => {
  const { id } = await params;
  await editable(id);
  const data = await parseBody(req, mesocycleCreateSchema);
  const [lastMeso, lastWeek] = await Promise.all([
    prisma.mesocycle.findFirst({ where: { planId: id }, orderBy: { order: "desc" }, select: { order: true } }),
    prisma.microcycle.findFirst({ where: { mesocycle: { planId: id } }, orderBy: { weekNumber: "desc" }, select: { weekNumber: true } }),
  ]);
  const base = lastWeek?.weekNumber ?? 0;
  await prisma.mesocycle.create({
    data: {
      planId: id,
      name: data.name,
      phase: data.phase,
      order: (lastMeso?.order ?? -1) + 1,
      microcycles: { create: Array.from({ length: data.weeks }, (_, i) => ({ weekNumber: base + i + 1 })) },
    },
  });
  return { ok: true };
});

/** Edita un mesociclo (nombre/fase) o el foco de un microciclo. */
export const PATCH = route<IdParams>(async (req, { params }) => {
  const { id } = await params;
  await editable(id);
  const body: unknown = await req.clone().json().catch(() => ({}));
  if (body && typeof body === "object" && "microcycleId" in body) {
    const data = await parseBody(req, microcyclePatchSchema);
    const res = await prisma.microcycle.updateMany({ where: { id: data.microcycleId, mesocycle: { planId: id } }, data: { focus: data.focus } });
    if (res.count === 0) throw new ApiError(404, "Microciclo no encontrado");
    return { ok: true };
  }
  const data = await parseBody(req, mesocyclePatchSchema);
  const res = await prisma.mesocycle.updateMany({ where: { id: data.mesocycleId, planId: id }, data: { name: data.name, phase: data.phase } });
  if (res.count === 0) throw new ApiError(404, "Mesociclo no encontrado");
  return { ok: true };
});

/** Elimina un mesociclo y recoloca las semanas posteriores para no dejar huecos. */
export const DELETE = route<IdParams>(async (req, { params }) => {
  const { id } = await params;
  await editable(id);
  const mesocycleId = new URL(req.url).searchParams.get("mesocycleId");
  if (!mesocycleId) throw new ApiError(400, "Falta mesocycleId");
  const meso = await prisma.mesocycle.findFirst({ where: { id: mesocycleId, planId: id }, include: { microcycles: { select: { weekNumber: true } } } });
  if (!meso) throw new ApiError(404, "Mesociclo no encontrado");
  const count = await prisma.mesocycle.count({ where: { planId: id } });
  if (count <= 1) throw new ApiError(400, "La planificación debe conservar al menos un mesociclo");
  const removed = meso.microcycles.length;
  const maxWeek = Math.max(0, ...meso.microcycles.map((m) => m.weekNumber));
  await prisma.$transaction(async (tx) => {
    await tx.mesocycle.delete({ where: { id: mesocycleId } });
    if (removed > 0) {
      const later = await tx.microcycle.findMany({
        where: { mesocycle: { planId: id }, weekNumber: { gt: maxWeek } },
        include: { sessions: { select: { id: true, date: true } } },
      });
      for (const micro of later) {
        await tx.microcycle.update({ where: { id: micro.id }, data: { weekNumber: micro.weekNumber - removed } });
        for (const s of micro.sessions) {
          await tx.trainingSession.update({ where: { id: s.id }, data: { date: addDays(s.date, -7 * removed) } });
        }
      }
    }
    await tx.mesocycle.updateMany({ where: { planId: id, order: { gt: meso.order } }, data: { order: { decrement: 1 } } });
  });
  return { ok: true };
});
