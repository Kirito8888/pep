import { collection } from "@/lib/collection";
import { prisma } from "@/lib/prisma";
import { approachSchema } from "@/lib/validators";

export const { GET, POST, DELETE } = collection(prisma.approachRun, { schema: approachSchema });
