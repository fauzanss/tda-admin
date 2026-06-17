import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { requirePending2FaOrRedirect } from "@/app/login/actions";
import { TwoFactorShell } from "@/app/login/two-factor/TwoFactorClient";
import { authOptions } from "@/lib/auth";

export default async function TwoFactorPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.mfaVerified) {
    redirect("/admin/dashboard");
  }

  const pending = await requirePending2FaOrRedirect();
  if (pending.mode !== "verify") {
    redirect("/login/setup-authenticator");
  }

  return <TwoFactorShell email={pending.email} />;
}
