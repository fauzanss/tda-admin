import type { UserRole } from "@/generated/prisma/client";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canWriteFiles, isAdminRole } from "@/lib/role-guards";

export { canWriteFiles, isAdminRole } from "@/lib/role-guards";

export function canViewFiles(_role: UserRole | string | undefined | null): boolean {
  return true;
}

export async function getSessionUserRole(): Promise<{
  userId: string;
  role: UserRole;
} | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return null;
  }
  const r = (session.user as { role?: UserRole }).role;
  if (r) {
    return { userId: session.user.id, role: r };
  }

  // Backward compatibility for old JWT/session payloads without role.
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  return { userId: session.user.id, role: dbUser?.role ?? "OFFICER" };
}

export async function requireFileEditor() {
  const s = await getSessionUserRole();
  if (!s) {
    throw new Error("Unauthorized");
  }
  if (!canWriteFiles(s.role)) {
    throw new Error("Forbidden");
  }
  return s.userId;
}

export async function requireAdmin() {
  const s = await getSessionUserRole();
  if (!s) {
    throw new Error("Unauthorized");
  }
  if (!isAdminRole(s.role)) {
    throw new Error("Forbidden");
  }
  return s.userId;
}
