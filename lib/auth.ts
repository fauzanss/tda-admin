import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions } from "next-auth";
import { UserRole } from "@/generated/prisma/client";
import { cookies } from "next/headers";
import { z } from "zod";

import { getNextAuthTdaCookieOptions } from "@/lib/auth-cookies";
import {
  PENDING_2FA_COOKIE_NAME,
  clearPending2FaCookie,
  verifyPending2FaToken,
} from "@/lib/pending-2fa";
import { prisma } from "@/lib/prisma";
import { decryptTotpSecret, verifyTotpCode } from "@/lib/totp";

const totpSignInSchema = z.object({
  email: z.string().email(),
  totpCode: z.string().regex(/^\d{6}$/),
});

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
  cookies: getNextAuthTdaCookieOptions(),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Email & Password + TOTP",
      credentials: {
        email: { label: "Email", type: "email" },
        totpCode: { label: "Authenticator code", type: "text" },
      },
      async authorize(rawCredentials) {
        const parsed = totpSignInSchema.safeParse(rawCredentials);
        if (!parsed.success) {
          console.warn("[auth] credentials: invalid payload", {
            issues: parsed.error.issues.map((i) => i.path.join(".")),
          });
          return null;
        }

        const cookieStore = await cookies();
        const pendingRaw = cookieStore.get(PENDING_2FA_COOKIE_NAME)?.value;
        if (!pendingRaw) {
          console.warn("[auth] credentials: missing pending-2fa cookie", {
            email: parsed.data.email,
          });
          return null;
        }

        const pending = verifyPending2FaToken(pendingRaw);
        if (!pending) {
          console.warn("[auth] credentials: pending-2fa cookie invalid or expired", {
            email: parsed.data.email,
          });
          return null;
        }
        if (pending.email !== parsed.data.email) {
          console.warn("[auth] credentials: pending email mismatch", {
            pendingEmail: pending.email,
            formEmail: parsed.data.email,
            userId: pending.userId,
          });
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { id: pending.userId },
        });

        if (!user) {
          console.warn("[auth] credentials: user not found", { userId: pending.userId });
          return null;
        }
        if (user.isActive === false) {
          console.warn("[auth] credentials: user inactive", { userId: user.id, email: user.email });
          return null;
        }

        if (!user.totpEnabled || !user.totpSecret) {
          console.warn("[auth] credentials: totp not configured", {
            userId: user.id,
            email: user.email,
            totpEnabled: user.totpEnabled,
            hasTotpSecret: Boolean(user.totpSecret),
          });
          return null;
        }

        let secret: string;
        try {
          secret = decryptTotpSecret(user.totpSecret);
        } catch (error) {
          console.error("[auth] credentials: totp decrypt failed (secret rotated?)", {
            userId: user.id,
            email: user.email,
            error: error instanceof Error ? error.message : "unknown",
          });
          return null;
        }

        if (!verifyTotpCode(secret, parsed.data.totpCode)) {
          console.warn("[auth] credentials: invalid totp code", {
            userId: user.id,
            email: user.email,
            attempts: pending.attempts,
          });
          return null;
        }

        await clearPending2FaCookie();
        console.info("[auth] credentials: totp sign-in ok", { userId: user.id, email: user.email });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role ?? "ADMIN",
          mfaVerified: true,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        (token as { role?: UserRole }).role = (user as unknown as { role: UserRole }).role;
        token.mfaVerified = (user as { mfaVerified?: boolean }).mfaVerified === true;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        (session.user as { role: UserRole }).role =
          (token as { role?: UserRole }).role ?? "ADMIN";
        session.user.mfaVerified = token.mfaVerified === true;
      }
      return session;
    },
  },
};
