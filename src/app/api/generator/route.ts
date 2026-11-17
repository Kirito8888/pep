import { generatePlan } from "@/lib/generator";
import { parseBody, requireUser, route } from "@/lib/session";
import { generatorSchema } from "@/lib/validators";

/** Motor determinista local: no llama a ningún servicio externo. */
export const POST = route(async (req) => {
  await requireUser();
  const input = await parseBody(req, generatorSchema);
  return generatePlan(input);
});
