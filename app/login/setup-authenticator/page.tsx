import { redirect } from "next/navigation";

import { getTotpSetupData, requirePending2FaOrRedirect } from "@/app/login/actions";
import { SetupAuthenticatorShell } from "@/app/login/setup-authenticator/SetupAuthenticatorClient";

export default async function SetupAuthenticatorPage() {
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
