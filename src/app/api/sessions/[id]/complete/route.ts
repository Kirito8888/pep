import { requireSessionAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { ApiError, parseBody, requireUser, route, type IdParams } from "@/lib/session";
import { sessionCompleteSchema } from "@/lib/validators";

/** Marca la sesión como completada (o no) y guarda sensaciones del atleta. */
export const POST = route<IdParams>(async (req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const { perms } = await requireSessionAccess(user.id, id);
  if (!perms.canComplete) throw new ApiError(403, "Solo el propietario o el atleta asignado pueden completar la sesión");
  const data = await parseBody(req, sessionCompleteSchema);
  await prisma.trainingSession.update({
    where: { id },
    data: {
      completed: data.completed,
      completedAt: data.completed ? new Date() : null,
      feeling: data.feeling ?? null,
      sessionRpe: data.sessionRpe ?? null,
      ...(data.athleteNotes !== undefined ? { athleteNotes: data.athleteNotes } : {}),
    },
  });
  return { ok: true };
});
