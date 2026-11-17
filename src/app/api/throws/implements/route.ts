import { collection } from "@/lib/collection";
import { prisma } from "@/lib/prisma";
import { implementSchema } from "@/lib/validators";

export const { GET, POST, DELETE } = collection(prisma.implement, { schema: implementSchema, orderBy: "weightG" });
