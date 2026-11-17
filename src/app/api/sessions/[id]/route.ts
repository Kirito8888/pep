import { diffDays, mondayOf, parseDateInput } from "@/lib/dates";
import { requireSessionAccess } from "@/lib/permissions";
import { blocksCreate } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { ApiError, parseBody, requireUser, route, type IdParams } from "@/lib/session";
import { sessionMoveSchema, sessionPutSchema } from "@/lib/validators";

/** Sustituye el contenido completo de la sesión (título, bloques y ejercicios). */
export const PUT = route<IdParams>(async (req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const { perms } = await requireSessionAccess(user.id, id);
  if (!perms.canEdit) throw new ApiError(403, "Solo el propietario puede editar la sesión");
  const data = await parseBody(req, sessionPutSchema);
  await prisma.$transaction([
    prisma.sessionBlock.deleteMany({ where: { sessionId: id } }),
    prisma.trainingSession.update({ where: { id }, data: { title: data.title, blocks: { create: blocksCreate(data.blocks) } } }),
  ]);
  return { ok: true };
});

/** Mueve la sesión a otra fecha (arrastrar en el calendario). */
export const PATCH = route<IdParams>(async (req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const { session, perms } = await requireSessionAccess(user.id, id);
  if (!perms.canEdit) throw new ApiError(403, "Solo el propietario puede mover la sesión");
  const data = await parseBody(req, sessionMoveSchema);
  const date = parseDateInput(data.date);
  const offset = diffDays(date, mondayOf(session.plan.startDate));
  if (offset < 0) throw new ApiError(400, "La fecha es anterior al inicio de la planificación");
  const weekNumber = Math.floor(offset / 7) + 1;
  const micro = await prisma.microcycle.findFirst({ where: { weekNumber, mesocycle: { planId: session.planId } }, select: { id: true } });
  if (!micro) throw new ApiError(400, "La fecha queda fuera de los microciclos de la planificación");
  await prisma.trainingSession.update({ where: { id }, data: { date, microcycleId: micro.id } });
  return { ok: true };
});

export const DELETE = route<IdParams>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const { perms } = await requireSessionAccess(user.id, id);
  if (!perms.canEdit) throw new ApiError(403, "Solo el propietario puede eliminar la sesión");
  await prisma.trainingSession.delete({ where: { id } });
  return { ok: true };
});
