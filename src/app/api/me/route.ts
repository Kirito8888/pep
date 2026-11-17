import { prisma } from "@/lib/prisma";
import { parseBody, requireUser, route } from "@/lib/session";
import { profileSchema } from "@/lib/validators";

export const GET = route(async () => requireUser());

export const PATCH = route(async (req) => {
  const user = await requireUser();
  const data = await parseBody(req, profileSchema);
  return prisma.user.update({
    where: { id: user.id },
    data,
    select: { id: true, email: true, name: true, sex: true, specialty: true, inviteCode: true, restingHr: true, maxHr: true },
  });
});
