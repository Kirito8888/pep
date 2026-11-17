import { prisma } from "@/lib/prisma";
import { requireUser, route } from "@/lib/session";

const person = { select: { id: true, name: true, email: true, specialty: true } } as const;

export const GET = route(async () => {
  const user = await requireUser();
  const rows = await prisma.friendship.findMany({
    where: { OR: [{ requesterId: user.id }, { addresseeId: user.id }], status: { in: ["PENDING", "ACCEPTED"] } },
    include: { requester: person, addressee: person },
    orderBy: { updatedAt: "desc" },
  });
  return {
    inviteCode: user.inviteCode,
    friends: rows.filter((r) => r.status === "ACCEPTED").map((r) => ({ friendshipId: r.id, user: r.requesterId === user.id ? r.addressee : r.requester })),
    incoming: rows.filter((r) => r.status === "PENDING" && r.addresseeId === user.id).map((r) => ({ friendshipId: r.id, user: r.requester })),
    outgoing: rows.filter((r) => r.status === "PENDING" && r.requesterId === user.id).map((r) => ({ friendshipId: r.id, user: r.addressee })),
  };
});
