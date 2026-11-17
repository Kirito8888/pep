import { prisma } from "@/lib/prisma";
import { ApiError, parseBody, requireUser, route } from "@/lib/session";
import { friendRequestSchema } from "@/lib/validators";

/** Envía una solicitud de amistad. Si la otra persona ya te la había enviado, se acepta. */
export const POST = route(async (req) => {
  const user = await requireUser();
  const { userId } = await parseBody(req, friendRequestSchema);
  if (userId === user.id) throw new ApiError(400, "No puedes enviarte una solicitud a ti mismo");
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!target) throw new ApiError(404, "Usuario no encontrado");

  const reverse = await prisma.friendship.findUnique({ where: { requesterId_addresseeId: { requesterId: userId, addresseeId: user.id } } });
  if (reverse) {
    if (reverse.status === "ACCEPTED") throw new ApiError(409, "Ya sois amigos");
    await prisma.friendship.update({ where: { id: reverse.id }, data: { status: "ACCEPTED" } });
    return { status: "ACCEPTED" };
  }
  const existing = await prisma.friendship.findUnique({ where: { requesterId_addresseeId: { requesterId: user.id, addresseeId: userId } } });
  if (existing) {
    if (existing.status === "ACCEPTED") throw new ApiError(409, "Ya sois amigos");
    if (existing.status === "PENDING") throw new ApiError(409, "Ya has enviado una solicitud a este usuario");
    await prisma.friendship.update({ where: { id: existing.id }, data: { status: "PENDING" } });
    return { status: "PENDING" };
  }
  await prisma.friendship.create({ data: { requesterId: user.id, addresseeId: userId } });
  return { status: "PENDING" };
});
