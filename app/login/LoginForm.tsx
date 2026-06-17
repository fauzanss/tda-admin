"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

import { checkLoginPassword } from "@/app/login/actions";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/admin/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.set("email", email);
    formData.set("password", password);

    const result = await checkLoginPassword(formData);
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    const nextPath =
      result.next === "setup"
        ? `/login/setup-authenticator?callbackUrl=${encodeURIComponent(callbackUrl)}`
        : `/login/two-factor?callbackUrl=${encodeURIComponent(callbackUrl)}`;

    router.push(nextPath);
  }

  return (
    <form onSubmit={onSubmit} className="card shadow-sm">
      <div className="card-body p-4">
        <div className="mb-3">
          <label className="form-label">Email</label>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            required
            className="form-control"
            autoComplete="username"
          />
        </div>
        <div className="mb-3">
          <label className="form-label">Password</label>
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            required
            className="form-control"
            autoComplete="current-password"
          />
        </div>
        {error && <div className="alert alert-danger py-2">{error}</div>}
        <button type="submit" disabled={loading} className="btn btn-primary w-100">
          {loading ? "Processing..." : "Continue"}
        </button>
      </div>
    </form>
  );
}
