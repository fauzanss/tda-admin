"use client";

import { signIn } from "next-auth/react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

import { recordTotpLoginFailure } from "@/app/login/actions";

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
    <form onSubmit={onSubmit} className="card shadow-sm">
      <div className="card-body p-4">
        <p className="small text-muted mb-3">
          Masukkan kode 6 digit dari aplikasi authenticator Anda.
        </p>
        <div className="mb-3">
          <label className="form-label" htmlFor="verifyTotpCode">
            Kode authenticator
          </label>
          <input
            id="verifyTotpCode"
            value={totpCode}
            onChange={(event) => setTotpCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            type="text"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            required
            className="form-control text-center fs-5"
            autoComplete="one-time-code"
            placeholder="000000"
            autoFocus
          />
        </div>
        {error && <div className="alert alert-danger py-2">{error}</div>}
        <button type="submit" disabled={loading || totpCode.length !== 6} className="btn btn-primary w-100">
          {loading ? "Processing..." : "Verify & Sign In"}
        </button>
      </div>
    </form>
  );
}

export function TwoFactorShell({ email }: Readonly<{ email: string }>) {
  return (
    <main className="min-vh-100 bg-light d-flex align-items-center justify-content-center p-3">
      <div style={{ width: "100%", maxWidth: 460 }}>
        <div className="text-center mb-4">
          <Image
            src="/tda-logo-transparent.png"
            alt="PT. Transformasi Digital Abadi"
            className="login-tda-logo"
            width={200}
            height={75}
            priority
          />
          <h1 className="h5 fw-semibold mt-3 mb-0">Two-Factor Authentication</h1>
          <p className="small text-muted mb-0">{email}</p>
        </div>
        <TwoFactorForm email={email} />
      </div>
    </main>
  );
}
