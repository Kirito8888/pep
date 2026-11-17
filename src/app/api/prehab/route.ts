import { collection } from "@/lib/collection";
import { prisma } from "@/lib/prisma";
import { prehabSchema } from "@/lib/validators";

export const { GET, POST, DELETE } = collection(prisma.prehabLog, { schema: prehabSchema });
