"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

import { checkLoginPassword } from "@/app/login/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

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
    <form onSubmit={onSubmit}>
      <Card>
        <CardBody className="space-y-4 p-6">
          <div>
            <Label htmlFor="loginEmail">Email</Label>
            <Input
              id="loginEmail"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              required
              autoComplete="username"
            />
          </div>
          <div>
            <Label htmlFor="loginPassword">Password</Label>
            <Input
              id="loginPassword"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              required
              autoComplete="current-password"
            />
          </div>
          {error && <Alert variant="danger">{error}</Alert>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Spinner size={16} className="text-current" />
                Processing...
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </CardBody>
      </Card>
    </form>
  );
}
