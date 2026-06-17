import { createHmac } from "node:crypto";

import { cookies } from "next/headers";

export const PENDING_2FA_COOKIE_NAME = "tda-pending-2fa";
export const PENDING_2FA_MAX_AGE_SECONDS = 300;
export const MAX_TOTP_ATTEMPTS = 5;

export type Pending2FaPayload = {
  userId: string;
  email: string;
  exp: number;
  attempts: number;
};

function getSigningSecret(): string {
  return process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "";
}

function signPayload(payload: Pending2FaPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", getSigningSecret()).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export function verifyPending2FaToken(token: string): Pending2FaPayload | null {
  const [data, sig] = token.split(".");
  if (!data || !sig) {
    return null;
  }
  const expected = createHmac("sha256", getSigningSecret()).update(data).digest("base64url");
  if (sig !== expected) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as Pending2FaPayload;
    if (payload.exp < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function buildPendingPayload(userId: string, email: string, attempts = 0): Pending2FaPayload {
  return {
    userId,
    email,
    attempts,
    exp: Date.now() + PENDING_2FA_MAX_AGE_SECONDS * 1000,
  };
}

export async function setPending2FaCookie(userId: string, email: string): Promise<void> {
  const token = signPayload(buildPendingPayload(userId, email));
  const cookieStore = await cookies();
  cookieStore.set(PENDING_2FA_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: PENDING_2FA_MAX_AGE_SECONDS,
    path: "/",
  });
}

export async function getPending2FaFromCookie(): Promise<Pending2FaPayload | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(PENDING_2FA_COOKIE_NAME)?.value;
  if (!raw) {
    return null;
  }
  return verifyPending2FaToken(raw);
}

export async function updatePending2FaAttempts(attempts: number): Promise<void> {
  const pending = await getPending2FaFromCookie();
  if (!pending) {
    return;
  }
  const token = signPayload(buildPendingPayload(pending.userId, pending.email, attempts));
  const cookieStore = await cookies();
  cookieStore.set(PENDING_2FA_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: PENDING_2FA_MAX_AGE_SECONDS,
    path: "/",
  });
}

export async function clearPending2FaCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(PENDING_2FA_COOKIE_NAME);
}
