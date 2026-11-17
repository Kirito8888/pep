import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Código de invitación único de 8 caracteres sin símbolos ambiguos (0/O, 1/I). */
export async function randomInviteCode(): Promise<string> {
  for (;;) {
    const bytes = randomBytes(8);
    const code = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
    const exists = await prisma.user.findUnique({ where: { inviteCode: code }, select: { id: true } });
    if (!exists) return code;
  }
}
