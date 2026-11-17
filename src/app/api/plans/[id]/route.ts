import { areFriends, requirePlanAccess } from "@/lib/permissions";
import { getPlanTree } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { ApiError, parseBody, requireUser, route, type IdParams } from "@/lib/session";
import { planPatchSchema } from "@/lib/validators";

export const GET = route<IdParams>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const { perms } = await requirePlanAccess(user.id, id);
  const plan = await getPlanTree(id);
  if (!plan) throw new ApiError(404, "Planificación no encontrada");
  return { plan, permissions: perms };
});

export const PATCH = route<IdParams>(async (req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const { perms } = await requirePlanAccess(user.id, id);
  if (!perms.canEdit) throw new ApiError(403, "Solo el propietario puede editar la planificación");
  const data = await parseBody(req, planPatchSchema);
  if (data.assigneeId && data.assigneeId !== user.id && !(await areFriends(user.id, data.assigneeId))) {
    throw new ApiError(403, "Solo puedes asignar planificaciones a amigos aceptados");
  }
  if (data.assigneeId === user.id) data.assigneeId = null;
  await prisma.plan.update({ where: { id }, data });
  return { ok: true };
});

export const DELETE = route<IdParams>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const { perms } = await requirePlanAccess(user.id, id);
  if (!perms.isOwner) throw new ApiError(403, "Solo el propietario puede eliminar la planificación");
  await prisma.plan.delete({ where: { id } });
  return { ok: true };
});
