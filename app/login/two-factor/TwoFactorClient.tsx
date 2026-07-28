"use client";

import { signIn } from "next-auth/react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

import { recordTotpLoginFailure } from "@/app/login/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

export function TwoFactorForm({ email }: Readonly<{ email: string }>) {
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
            Masukkan kode 6 digit dari aplikasi authenticator Anda.
          </p>
          <div>
            <Label htmlFor="verifyTotpCode">Kode authenticator</Label>
            <Input
              id="verifyTotpCode"
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
              autoFocus
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
              "Verify & Sign In"
            )}
          </Button>
        </CardBody>
      </Card>
    </form>
  );
}

export function TwoFactorShell({ email }: Readonly<{ email: string }>) {
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
          <h1 className="mt-3 text-lg font-semibold text-tda-navy">
            Two-Factor Authentication
          </h1>
          <p className="text-sm text-tda-navy-muted">{email}</p>
        </div>
        <TwoFactorForm email={email} />
      </div>
    </main>
  );
}
