"use client";

import { signIn } from "next-auth/react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

import { confirmTotpSetup, recordTotpLoginFailure } from "@/app/login/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

export function SetupAuthenticatorForm({
  email,
  qrDataUrl,
  manualKey,
}: Readonly<{
  email: string;
  qrDataUrl: string;
  manualKey: string;
}>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/admin/dashboard";

  const [totpCode, setTotpCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.set("totpCode", totpCode.trim());

    const setupResult = await confirmTotpSetup(formData);
    if (!setupResult.ok) {
      setLoading(false);
      setError(setupResult.error);
      return;
    }

    const result = await signIn("credentials", {
      email,
      totpCode: totpCode.trim(),
      callbackUrl,
      redirect: false,
    });

    setLoading(false);

    if (!result || result.error) {
      await recordTotpLoginFailure();
      setError("Invalid code.");
      return;
    }

    router.push(result.url ?? callbackUrl);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit}>
      <Card>
        <CardBody className="space-y-4 p-6">
          <p className="text-sm text-tda-navy-muted">
            Scan QR code di Google Authenticator / Authy, lalu masukkan kode 6 digit untuk konfirmasi.
          </p>
          <div className="text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="QR code authenticator" width={200} height={200} />
          </div>
          <div>
            <Label className="text-tda-navy-muted">Manual key</Label>
            <code className="mt-1 block select-all text-xs text-slate-700">{manualKey}</code>
          </div>
          <div>
            <Label htmlFor="setupTotpCode">Kode authenticator</Label>
            <Input
              id="setupTotpCode"
              value={totpCode}
              onChange={(event) => setTotpCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              required
              className="text-center text-lg tracking-widest"
              autoComplete="one-time-code"
              placeholder="000000"
            />
          </div>
          {error && <Alert variant="danger">{error}</Alert>}
          <Button
            type="submit"
            disabled={loading || totpCode.length !== 6}
            className="w-full"
          >
            {loading ? (
              <>
                <Spinner size={16} className="text-current" />
                Processing...
              </>
            ) : (
              "Aktifkan & masuk"
            )}
          </Button>
        </CardBody>
      </Card>
    </form>
  );
}

export function SetupAuthenticatorShell({
  email,
  qrDataUrl,
  manualKey,
}: Readonly<{
  email: string;
  qrDataUrl: string;
  manualKey: string;
}>) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-3">
      <div className="w-full max-w-[460px]">
        <div className="mb-6 text-center">
          <Image
            src="/tda-logo-transparent.png"
            alt="PT. Transformasi Digital Abadi"
            className="login-tda-logo mx-auto"
            width={200}
            height={75}
            priority
          />
          <h1 className="mt-3 text-lg font-semibold text-tda-navy">Setup Authenticator</h1>
          <p className="text-sm text-tda-navy-muted">{email}</p>
        </div>
        <SetupAuthenticatorForm email={email} qrDataUrl={qrDataUrl} manualKey={manualKey} />
      </div>
    </main>
  );
}
