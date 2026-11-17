import { requireSessionAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { parseBody, requireUser, route, type IdParams } from "@/lib/session";
import { commentSchema } from "@/lib/validators";

export const GET = route<IdParams>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  await requireSessionAccess(user.id, id);
  return prisma.sessionComment.findMany({
    where: { sessionId: id },
    orderBy: { createdAt: "asc" },
    select: { id: true, text: true, createdAt: true, author: { select: { id: true, name: true } } },
  });
});

export const POST = route<IdParams>(async (req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  await requireSessionAccess(user.id, id);
  const data = await parseBody(req, commentSchema);
  return prisma.sessionComment.create({
    data: { sessionId: id, authorId: user.id, text: data.text },
    select: { id: true, text: true, createdAt: true, author: { select: { id: true, name: true } } },
  });
});
