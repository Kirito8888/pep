import { areFriends, friendIds } from "@/lib/permissions";
import { createPlanTree, planSummarySelect, summarizePlan } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { ApiError, parseBody, requireUser, route } from "@/lib/session";
import { planCreateSchema } from "@/lib/validators";

/** Lista: mis planes (propios o asignados a mí) y los compartidos por mis amigos. */
export const GET = route(async () => {
  const user = await requireUser();
  const friends = await friendIds(user.id);
  const [mine, shared] = await Promise.all([
    prisma.plan.findMany({
      where: { OR: [{ ownerId: user.id }, { assigneeId: user.id }] },
      select: planSummarySelect,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.plan.findMany({
      where: {
        ownerId: { not: user.id },
        NOT: { assigneeId: user.id },
        OR: [{ ownerId: { in: friends } }, { assigneeId: { in: friends } }],
      },
      select: planSummarySelect,
      orderBy: { updatedAt: "desc" },
    }),
  ]);
  return { mine: mine.map(summarizePlan), shared: shared.map(summarizePlan) };
});

export const POST = route(async (req) => {
  const user = await requireUser();
  const data = await parseBody(req, planCreateSchema);
  if (data.assigneeId && data.assigneeId !== user.id) {
    if (!(await areFriends(user.id, data.assigneeId))) throw new ApiError(403, "Solo puedes asignar planificaciones a amigos aceptados");
  }
  if (data.assigneeId === user.id) data.assigneeId = null;
  const id = await createPlanTree(user.id, data);
  return { id };
});
