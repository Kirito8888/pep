import { collection } from "@/lib/collection";
import { prisma } from "@/lib/prisma";
import { plyoSchema } from "@/lib/validators";

export const { GET, POST, DELETE } = collection(prisma.plyoLog, { schema: plyoSchema });
