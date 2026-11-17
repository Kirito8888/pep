import { prisma } from "@/lib/prisma";
import { ApiError, parseBody, requireUser, route, type IdParams } from "@/lib/session";
import { friendActionSchema } from "@/lib/validators";

/** Acepta o rechaza una solicitud recibida. */
export const PATCH = route<IdParams>(async (req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const { action } = await parseBody(req, friendActionSchema);
  const f = await prisma.friendship.findUnique({ where: { id } });
  if (!f || f.addresseeId !== user.id) throw new ApiError(404, "Solicitud no encontrada");
  if (f.status !== "PENDING") throw new ApiError(409, "La solicitud ya fue respondida");
  await prisma.friendship.update({ where: { id }, data: { status: action === "accept" ? "ACCEPTED" : "REJECTED" } });
  return { ok: true };
});

/** Cancela una solicitud enviada o elimina una amistad. Los planes asignados al examigo dejan de estarlo. */
export const DELETE = route<IdParams>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const f = await prisma.friendship.findUnique({ where: { id } });
  if (!f || (f.requesterId !== user.id && f.addresseeId !== user.id)) throw new ApiError(404, "Amistad no encontrada");
  const other = f.requesterId === user.id ? f.addresseeId : f.requesterId;
  await prisma.$transaction([
    prisma.friendship.delete({ where: { id } }),
    prisma.plan.updateMany({ where: { ownerId: user.id, assigneeId: other }, data: { assigneeId: null } }),
    prisma.plan.updateMany({ where: { ownerId: other, assigneeId: user.id }, data: { assigneeId: null } }),
  ]);
  return { ok: true };
});
