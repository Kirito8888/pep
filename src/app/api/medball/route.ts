import { collection } from "@/lib/collection";
import { prisma } from "@/lib/prisma";
import { medballSchema } from "@/lib/validators";

export const { GET, POST, DELETE } = collection(prisma.medBallLog, { schema: medballSchema });
