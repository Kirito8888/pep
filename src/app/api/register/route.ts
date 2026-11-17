import bcrypt from "bcryptjs";
import { randomInviteCode } from "@/lib/invite";
import { prisma } from "@/lib/prisma";
import { ApiError, parseBody, route } from "@/lib/session";
import { registerSchema } from "@/lib/validators";

export const POST = route(async (req) => {
  const data = await parseBody(req, registerSchema);
  const exists = await prisma.user.findUnique({ where: { email: data.email }, select: { id: true } });
  if (exists) throw new ApiError(409, "Ya existe una cuenta con ese email");
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash: await bcrypt.hash(data.password, 12),
      sex: data.sex,
      specialty: data.specialty,
      inviteCode: await randomInviteCode(),
    },
    select: { id: true, email: true, name: true },
  });
  return user;
});
