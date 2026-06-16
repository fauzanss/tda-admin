import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { AdminShell } from "@/app/admin/AdminShell";
import { authOptions } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const userRole = session.user.role;

  return <AdminShell userRole={userRole}>{children}</AdminShell>;
}
