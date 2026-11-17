import type { ZodTypeAny, z } from "zod";
import { parseDateInput } from "@/lib/dates";
import { ApiError, parseBody, requireUser, route } from "@/lib/session";

/** Subconjunto de un delegado de Prisma que necesita una colección de registros por usuario. */
interface Delegate {
  findMany(args: { where: { userId: string }; orderBy: Record<string, "asc" | "desc">[]; take: number }): Promise<unknown[]>;
  create(args: { data: Record<string, unknown> }): Promise<unknown>;
  deleteMany(args: { where: { id: string; userId: string } }): Promise<{ count: number }>;
}

interface Options<S extends ZodTypeAny> {
  schema: S;
  /** Campo por el que se ordena (descendente). */
  orderBy?: string;
  /** Transformación adicional de los datos validados antes de guardar. */
  transform?: (data: z.infer<S>, userId: string) => Record<string, unknown> | Promise<Record<string, unknown>>;
}

/**
 * Genera GET (listar), POST (crear) y DELETE (?id=) para un modelo de registros
 * propiedad del usuario autenticado. Cada usuario solo ve y borra lo suyo.
 */
export function collection<S extends ZodTypeAny>(delegate: unknown, opts: Options<S>) {
  const model = delegate as Delegate;
  const order = opts.orderBy ?? "date";
  return {
    GET: route(async () => {
      const user = await requireUser();
      return model.findMany({ where: { userId: user.id }, orderBy: [{ [order]: "desc" }, { id: "desc" }], take: 500 });
    }),
    POST: route(async (req) => {
      const user = await requireUser();
      const parsed = await parseBody(req, opts.schema);
      const data: Record<string, unknown> = opts.transform ? await opts.transform(parsed, user.id) : { ...(parsed as Record<string, unknown>) };
      if (typeof data.date === "string") data.date = parseDateInput(data.date);
      return model.create({ data: { ...data, userId: user.id } });
    }),
    DELETE: route(async (req) => {
      const user = await requireUser();
      const id = new URL(req.url).searchParams.get("id");
      if (!id) throw new ApiError(400, "Falta el parámetro id");
      const res = await model.deleteMany({ where: { id, userId: user.id } });
      if (res.count === 0) throw new ApiError(404, "Registro no encontrado");
      return { ok: true };
    }),
  };
}
