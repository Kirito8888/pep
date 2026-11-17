import { collection } from "@/lib/collection";
import { prisma } from "@/lib/prisma";
import { liftSchema } from "@/lib/validators";

export const { GET, POST, DELETE } = collection(prisma.liftLog, { schema: liftSchema });
