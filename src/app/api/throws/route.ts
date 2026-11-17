import { collection } from "@/lib/collection";
import { prisma } from "@/lib/prisma";
import { throwLogSchema } from "@/lib/validators";

export const { GET, POST, DELETE } = collection(prisma.throwLog, { schema: throwLogSchema });
