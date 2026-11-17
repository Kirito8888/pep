import { COMPETITIONS, scoreCompetition } from "@/lib/athletics/combined";
import { collection } from "@/lib/collection";
import { prisma } from "@/lib/prisma";
import { combinedResultSchema } from "@/lib/validators";

/** El total de puntos se recalcula siempre en el servidor con las tablas oficiales. */
export const { GET, POST, DELETE } = collection(prisma.combinedResult, {
  schema: combinedResultSchema,
  transform: (data) => ({
    ...data,
    totalPoints: scoreCompetition(COMPETITIONS[data.competition], data.performances).total,
  }),
});
