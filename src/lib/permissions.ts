import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/session";

/** ¿Existe una amistad aceptada entre los dos usuarios? */
export async function areFriends(a: string, b: string): Promise<boolean> {
  if (a === b) return false;
  const f = await prisma.friendship.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [
        { requesterId: a, addresseeId: b },
        { requesterId: b, addresseeId: a },
      ],
    },
    select: { id: true },
  });
  return f !== null;
}

/** Ids de los amigos aceptados de un usuario. */
export async function friendIds(userId: string): Promise<string[]> {
  const rows = await prisma.friendship.findMany({
    where: { status: "ACCEPTED", OR: [{ requesterId: userId }, { addresseeId: userId }] },
    select: { requesterId: true, addresseeId: true },
  });
  return rows.map((r) => (r.requesterId === userId ? r.addresseeId : r.requesterId));
}

export interface PlanPermissions {
  isOwner: boolean;
  isAssignee: boolean;
  /** Puede modificar la estructura (mesociclos, sesiones, bloques). */
  canEdit: boolean;
  /** Puede marcar sesiones como completadas y registrar sensaciones. */
  canComplete: boolean;
  /** Puede comentar y clonar. */
  canComment: boolean;
}

interface PlanRef {
  ownerId: string;
  assigneeId: string | null;
}

/**
 * Reglas de acceso a una planificación:
 *  - Dueño: control total.
 *  - Atleta asignado: ver, completar sesiones, registrar sensaciones y comentar.
 *  - Amigo aceptado del dueño o del atleta asignado: ver, comentar y clonar.
 *  - Resto: sin acceso.
 */
export async function planPermissions(userId: string, plan: PlanRef): Promise<PlanPermissions | null> {
  const isOwner = plan.ownerId === userId;
  const isAssignee = plan.assigneeId === userId;
  if (isOwner || isAssignee) {
    return { isOwner, isAssignee, canEdit: isOwner, canComplete: true, canComment: true };
  }
  const friend = (await areFriends(userId, plan.ownerId)) || (plan.assigneeId ? await areFriends(userId, plan.assigneeId) : false);
  if (!friend) return null;
  return { isOwner: false, isAssignee: false, canEdit: false, canComplete: false, canComment: true };
}

/** Carga los permisos de un plan o lanza 404 (no se revela si existe). */
export async function requirePlanAccess(userId: string, planId: string): Promise<{ plan: PlanRef & { id: string }; perms: PlanPermissions }> {
  const plan = await prisma.plan.findUnique({ where: { id: planId }, select: { id: true, ownerId: true, assigneeId: true } });
  if (!plan) throw new ApiError(404, "Planificación no encontrada");
  const perms = await planPermissions(userId, plan);
  if (!perms) throw new ApiError(404, "Planificación no encontrada");
  return { plan, perms };
}

export async function requireSessionAccess(userId: string, sessionId: string) {
  const session = await prisma.trainingSession.findUnique({
    where: { id: sessionId },
    select: { id: true, planId: true, microcycleId: true, plan: { select: { id: true, ownerId: true, assigneeId: true, startDate: true } } },
  });
  if (!session) throw new ApiError(404, "Sesión no encontrada");
  const perms = await planPermissions(userId, session.plan);
  if (!perms) throw new ApiError(404, "Sesión no encontrada");
  return { session, perms };
}
