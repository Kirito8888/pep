import { collection } from "@/lib/collection";
import { prisma } from "@/lib/prisma";
import { markSchema } from "@/lib/validators";

export const { GET, POST, DELETE } = collection(prisma.mark, { schema: markSchema });
