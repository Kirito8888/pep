import { addDays, mondayOf } from "@/lib/dates";
import { planPermissions } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { ApiError, parseBody, requireUser, route } from "@/lib/session";
import { sessionCreateSchema } from "@/lib/validators";

export const POST = route(async (req) => {
  const user = await requireUser();
  const data = await parseBody(req, sessionCreateSchema);
  const micro = await prisma.microcycle.findUnique({
    where: { id: data.microcycleId },
    select: { id: true, weekNumber: true, mesocycle: { select: { plan: { select: { id: true, ownerId: true, assigneeId: true, startDate: true } } } } },
  });
  if (!micro) throw new ApiError(404, "Microciclo no encontrado");
  const plan = micro.mesocycle.plan;
  const perms = await planPermissions(user.id, plan);
  if (!perms) throw new ApiError(404, "Microciclo no encontrado");
  if (!perms.canEdit) throw new ApiError(403, "Solo el propietario puede añadir sesiones");
  const created = await prisma.trainingSession.create({
    data: {
      planId: plan.id,
      microcycleId: micro.id,
      title: data.title,
      date: addDays(mondayOf(plan.startDate), (micro.weekNumber - 1) * 7 + data.dayOffset),
    },
    select: { id: true },
  });
  return created;
});
