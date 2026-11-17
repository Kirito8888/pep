import { collection } from "@/lib/collection";
import { prisma } from "@/lib/prisma";
import { poleSchema } from "@/lib/validators";

export const { GET, POST, DELETE } = collection(prisma.poleConfig, { schema: poleSchema, orderBy: "lengthM" });
