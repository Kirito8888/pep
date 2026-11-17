import { prisma } from "@/lib/prisma";
import { requireUser, route } from "@/lib/session";

/** Busca usuarios por nombre o email (mínimo 2 caracteres) e indica la relación actual. */
export const GET = route(async (req) => {
  const user = await requireUser();
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2) return [];
  const users = await prisma.user.findMany({
    where: { id: { not: user.id }, OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] },
    select: { id: true, name: true, specialty: true },
    orderBy: { name: "asc" },
    take: 15,
  });
  if (users.length === 0) return [];
  const ids = users.map((u) => u.id);
  const links = await prisma.friendship.findMany({
    where: { OR: [{ requesterId: user.id, addresseeId: { in: ids } }, { addresseeId: user.id, requesterId: { in: ids } }] },
  });
  return users.map((u) => {
    const link = links.find((l) => l.requesterId === u.id || l.addresseeId === u.id);
    let relation: "none" | "friends" | "sent" | "received" = "none";
    if (link?.status === "ACCEPTED") relation = "friends";
    else if (link?.status === "PENDING") relation = link.requesterId === user.id ? "sent" : "received";
    return { ...u, relation, friendshipId: link?.id ?? null };
  });
});
