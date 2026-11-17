import { toDateInput, mondayOf } from "@/lib/dates";
import { requirePlanAccess } from "@/lib/permissions";
import { createPlanTree, getPlanTree, treeToInput } from "@/lib/plans";
import { ApiError, requireUser, route, type IdParams } from "@/lib/session";

/** Clona una planificación visible (propia o de un amigo) a la cuenta del usuario. */
export const POST = route<IdParams>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  await requirePlanAccess(user.id, id);
  const tree = await getPlanTree(id);
  if (!tree) throw new ApiError(404, "Planificación no encontrada");
  // La copia empieza el lunes de la semana actual, sin estado de completado ni comentarios.
  const input = treeToInput(tree, `${tree.title} (copia)`, toDateInput(mondayOf(new Date())));
  const newId = await createPlanTree(user.id, input, tree.id);
  return { id: newId };
});
