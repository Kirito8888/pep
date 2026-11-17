import { collection } from "@/lib/collection";
import { prisma } from "@/lib/prisma";
import { prSchema } from "@/lib/validators";

export const { GET, POST, DELETE } = collection(prisma.personalRecord, { schema: prSchema });
