import { redirect } from "next/navigation";

import { requirePending2FaOrRedirect } from "@/app/login/actions";
import { TwoFactorShell } from "@/app/login/two-factor/TwoFactorClient";

export default async function TwoFactorPage() {
  const pending = await requirePending2FaOrRedirect();
  if (pending.mode !== "verify") {
    redirect("/login/setup-authenticator");
  }

  return <TwoFactorShell email={pending.email} />;
}
