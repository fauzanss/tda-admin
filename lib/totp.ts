import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import { generateSecret, generateURI, verifySync } from "otplib";

const TOTP_ISSUER = "TDA Admin";

function getEncryptionKey(): Buffer {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "";
  return createHash("sha256").update(secret).digest();
}

export function createTotpSecret(): string {
  return generateSecret();
}

export function buildOtpAuthUri(email: string, secret: string): string {
  return generateURI({
    issuer: TOTP_ISSUER,
    label: email,
    secret,
  });
}

export function verifyTotpCode(secret: string, token: string): boolean {
  const normalized = token.replace(/\s/g, "");
  if (!/^\d{6}$/.test(normalized)) {
    return false;
  }
  const result = verifySync({ secret, token: normalized });
  return result.valid;
}

export function encryptTotpSecret(plain: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptTotpSecret(stored: string): string {
  const [ivHex, tagHex, dataHex] = stored.split(":");
  if (!ivHex || !tagHex || !dataHex) {
    throw new Error("Invalid encrypted TOTP secret");
  }
  const key = getEncryptionKey();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
