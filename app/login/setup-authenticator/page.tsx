import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { getTotpSetupData, requirePending2FaOrRedirect } from "@/app/login/actions";
import { SetupAuthenticatorShell } from "@/app/login/setup-authenticator/SetupAuthenticatorClient";
import { authOptions } from "@/lib/auth";

export default async function SetupAuthenticatorPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.mfaVerified) {
    redirect("/admin/dashboard");
  }

  const pending = await requirePending2FaOrRedirect();
  if (pending.mode !== "setup") {
    redirect("/login/two-factor");
  }

  const setupData = await getTotpSetupData();
  if (!setupData) {
    redirect("/login");
  }

  return (
    <SetupAuthenticatorShell
      email={setupData.email}
      qrDataUrl={setupData.qrDataUrl}
      manualKey={setupData.manualKey}
    />
  );
}
