import { prisma } from "@/lib/prisma";
import { ApiError, parseBody, requireUser, route } from "@/lib/session";
import { inviteSchema } from "@/lib/validators";

/** Canjea el código de invitación de otro usuario: la amistad queda aceptada directamente. */
export const POST = route(async (req) => {
  const user = await requireUser();
  const { code } = await parseBody(req, inviteSchema);
  const owner = await prisma.user.findUnique({ where: { inviteCode: code }, select: { id: true, name: true } });
  if (!owner) throw new ApiError(404, "Código de invitación no válido");
  if (owner.id === user.id) throw new ApiError(400, "Ese es tu propio código");
  const existing = await prisma.friendship.findFirst({
    where: { OR: [{ requesterId: user.id, addresseeId: owner.id }, { requesterId: owner.id, addresseeId: user.id }] },
  });
  if (existing?.status === "ACCEPTED") throw new ApiError(409, `Ya eres amigo de ${owner.name}`);
  if (existing) await prisma.friendship.update({ where: { id: existing.id }, data: { status: "ACCEPTED" } });
  else await prisma.friendship.create({ data: { requesterId: owner.id, addresseeId: user.id, status: "ACCEPTED" } });
  return { friend: owner };
});
