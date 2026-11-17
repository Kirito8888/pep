import { NextResponse } from "next/server";
import { ZodError, type ZodTypeAny, type z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  sex: "M" | "F";
  specialty: string;
  inviteCode: string;
  restingHr: number | null;
  maxHr: number | null;
}

/** Usuario autenticado (comprobado contra la base de datos) o null. */
export async function getUser(): Promise<SessionUser | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, sex: true, specialty: true, inviteCode: true, restingHr: true, maxHr: true },
  });
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getUser();
  if (!user) throw new ApiError(401, "No autenticado");
  return user;
}

export async function parseBody<S extends ZodTypeAny>(req: Request, schema: S): Promise<z.infer<S>> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new ApiError(400, "Cuerpo JSON no válido");
  }
  return schema.parse(json);
}

type Handler<C> = (req: Request, ctx: C) => Promise<unknown>;

/** Envuelve un handler: serializa la respuesta y traduce errores a JSON. */
export function route<C = unknown>(handler: Handler<C>) {
  return async (req: Request, ctx: C): Promise<Response> => {
    try {
      const result = await handler(req, ctx);
      if (result instanceof Response) return result;
      return NextResponse.json(result ?? { ok: true });
    } catch (err) {
      if (err instanceof ApiError) return NextResponse.json({ error: err.message }, { status: err.status });
      if (err instanceof ZodError) {
        const first = err.issues[0];
        return NextResponse.json({ error: `Datos no válidos: ${first?.path.join(".") ?? ""} ${first?.message ?? ""}`.trim() }, { status: 400 });
      }
      console.error(err);
      return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
  };
}

export type IdParams = { params: Promise<{ id: string }> };
