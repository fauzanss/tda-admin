import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions } from "next-auth";
import { UserRole } from "@/generated/prisma/client";
import { compare } from "bcryptjs";
import { z } from "zod";

import { getNextAuthTdaCookieOptions } from "@/lib/auth-cookies";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  cookies: getNextAuthTdaCookieOptions(),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });

        if (!user) {
          return null;
        }

        const validPassword = await compare(
          parsed.data.password,
          user.passwordHash,
        );

        if (!validPassword) {
          return null;
        }

        if ((user as { isActive?: boolean }).isActive === false) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          /* Default ADMIN if column belum ter-migrate (setelah db push + generate, pakai user.role) */
          role: (user as { role?: UserRole }).role ?? "ADMIN",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        (token as { role?: UserRole }).role = (user as unknown as { role: UserRole }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        (session.user as { role: UserRole }).role =
          (token as { role?: UserRole }).role ?? "ADMIN";
      }
      return session;
    },
  },
};
