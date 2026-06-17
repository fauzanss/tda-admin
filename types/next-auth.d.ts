import type { UserRole } from "@/generated/prisma/client";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: UserRole;
      mfaVerified?: boolean;
    };
  }

  interface User {
    mfaVerified?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserRole;
    mfaVerified?: boolean;
  }
}
