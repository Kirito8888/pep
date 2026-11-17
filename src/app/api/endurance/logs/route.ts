import { collection } from "@/lib/collection";
import { prisma } from "@/lib/prisma";
import { enduranceLogSchema } from "@/lib/validators";

export const { GET, POST, DELETE } = collection(prisma.enduranceLog, { schema: enduranceLogSchema });
