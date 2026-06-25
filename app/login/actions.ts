"use server";

import QRCode from "qrcode";
import { compare } from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  MAX_TOTP_ATTEMPTS,
  clearPending2FaCookie,
  getPending2FaFromCookie,
  setPending2FaCookie,
  updatePending2FaAttempts,
} from "@/lib/pending-2fa";
import { prisma } from "@/lib/prisma";
import {
  buildOtpAuthUri,
  createTotpSecret,
  decryptTotpSecret,
  encryptTotpSecret,
  verifyTotpCode,
} from "@/lib/totp";

const loginPasswordSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const totpCodeSchema = z.object({
  totpCode: z.string().regex(/^\d{6}$/, "Kode harus 6 digit"),
});

export type CheckLoginPasswordResult =
  | { ok: true; next: "setup" | "verify"; email: string }
  | { ok: false; error: string };

export async function checkLoginPassword(formData: FormData): Promise<CheckLoginPasswordResult> {
  const parsed = loginPasswordSchema.safeParse({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) {
    console.warn("[auth] login: invalid email/password payload");
    return { ok: false, error: "Invalid email or password." };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      isActive: true,
      totpEnabled: true,
    },
  });

  if (!user || user.isActive === false) {
    console.warn("[auth] login: user not found or inactive", { email: parsed.data.email });
    return { ok: false, error: "Invalid email or password." };
  }

  const validPassword = await compare(parsed.data.password, user.passwordHash);
  if (!validPassword) {
    console.warn("[auth] login: invalid password", { userId: user.id, email: user.email });
    return { ok: false, error: "Invalid email or password." };
  }

  await setPending2FaCookie(user.id, user.email);
  console.info("[auth] login: password ok, pending 2fa set", {
    userId: user.id,
    email: user.email,
    next: user.totpEnabled ? "verify" : "setup",
  });

  return {
    ok: true,
    next: user.totpEnabled ? "verify" : "setup",
    email: user.email,
  };
}

export type TotpSetupData = {
  email: string;
  qrDataUrl: string;
  manualKey: string;
};

export async function getTotpSetupData(): Promise<TotpSetupData | null> {
  const pending = await getPending2FaFromCookie();
  if (!pending) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: pending.userId },
    select: { email: true, totpSecret: true, totpEnabled: true },
  });
  if (!user || user.email !== pending.email || user.totpEnabled) {
    return null;
  }

  let secret: string;
  if (user.totpSecret) {
    secret = decryptTotpSecret(user.totpSecret);
  } else {
    secret = createTotpSecret();
    await prisma.user.update({
      where: { id: pending.userId },
      data: { totpSecret: encryptTotpSecret(secret) },
    });
  }

  const uri = buildOtpAuthUri(user.email, secret);
  const qrDataUrl = await QRCode.toDataURL(uri);

  return {
    email: user.email,
    qrDataUrl,
    manualKey: secret,
  };
}

export async function confirmTotpSetup(formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  const pending = await getPending2FaFromCookie();
  if (!pending) {
    return { ok: false, error: "Sesi login kedaluwarsa. Silakan login ulang." };
  }
  if (pending.attempts >= MAX_TOTP_ATTEMPTS) {
    await clearPending2FaCookie();
    return { ok: false, error: "Terlalu banyak percobaan. Silakan login ulang." };
  }

  const parsed = totpCodeSchema.safeParse({
    totpCode: String(formData.get("totpCode") ?? "").trim(),
  });
  if (!parsed.success) {
    return { ok: false, error: "Kode tidak valid." };
  }

  const user = await prisma.user.findUnique({
    where: { id: pending.userId },
    select: { email: true, totpSecret: true, totpEnabled: true },
  });
  if (!user || user.email !== pending.email || !user.totpSecret || user.totpEnabled) {
    return { ok: false, error: "Setup authenticator tidak tersedia." };
  }

  const secret = decryptTotpSecret(user.totpSecret);
  if (!verifyTotpCode(secret, parsed.data.totpCode)) {
    await updatePending2FaAttempts(pending.attempts + 1);
    return { ok: false, error: "Invalid code." };
  }

  await prisma.user.update({
    where: { id: pending.userId },
    data: { totpEnabled: true },
  });

  return { ok: true };
}

export async function recordTotpLoginFailure(): Promise<void> {
  const pending = await getPending2FaFromCookie();
  if (!pending) {
    return;
  }
  const nextAttempts = pending.attempts + 1;
  if (nextAttempts >= MAX_TOTP_ATTEMPTS) {
    await clearPending2FaCookie();
    return;
  }
  await updatePending2FaAttempts(nextAttempts);
}

export async function requirePending2FaOrRedirect(): Promise<{ email: string; mode: "setup" | "verify" }> {
  const pending = await getPending2FaFromCookie();
  if (!pending) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: pending.userId },
    select: { email: true, totpEnabled: true },
  });
  if (!user || user.email !== pending.email) {
    redirect("/login");
  }

  return {
    email: user.email,
    mode: user.totpEnabled ? "verify" : "setup",
  };
}
