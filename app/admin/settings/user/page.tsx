import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { UserSettingsClient, type UserListRow } from "@/app/admin/settings/user/UserSettingsClient";
import { authOptions } from "@/lib/auth";
import { isAdminRole } from "@/lib/role-guards";
import { prisma } from "@/lib/prisma";

function mapUserForClient(u: {
  id: string;
  name: string | null;
  email: string;
  role: string;
  isActive: boolean;
  totpEnabled: boolean;
  createdAt: Date;
}): UserListRow {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    totpEnabled: u.totpEnabled,
    createdAt: u.createdAt.toISOString(),
  };
}

export default async function UserSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }
  if (!isAdminRole(session.user.role as string | undefined)) {
    redirect("/admin/dashboard");
  }
  const currentUserId = session.user.id;

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      totpEnabled: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return <UserSettingsClient currentUserId={currentUserId} initialUsers={users.map(mapUserForClient)} />;
}
