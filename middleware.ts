import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

import { getSessionTokenCookieNameForMiddleware } from "@/lib/auth-cookies";
import { canWriteFiles, isAdminRole } from "@/lib/role-guards";

type TokenWithRole = { role?: string; mfaVerified?: boolean };

export default withAuth(
  function middleware(req) {
    const role = (req.nextauth.token as TokenWithRole | undefined)?.role;
    const { pathname } = req.nextUrl;

    if (pathname.startsWith("/admin/settings") && !isAdminRole(role)) {
      return NextResponse.redirect(new URL("/admin/dashboard", req.nextUrl));
    }

    if (!canWriteFiles(role)) {
      if (pathname.match(/\/admin\/documents\/(SPH|PURCHASE_ORDER|SURAT_JALAN|INVOICE)\/[^/]+\/new$/)) {
        const t = pathname.split("/")[3];
        return NextResponse.redirect(new URL(`/admin/documents/${t}`, req.nextUrl));
      }
      const editMatch = pathname.match(
        /^\/admin\/documents\/(SPH|PURCHASE_ORDER|SURAT_JALAN|INVOICE)\/([^/]+)\/edit$/,
      );
      if (editMatch) {
        return NextResponse.redirect(new URL(`/admin/documents/${editMatch[1]}`, req.nextUrl));
      }
    }

    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/login",
    },
    callbacks: {
      authorized: ({ token }) => Boolean(token) && (token as TokenWithRole).mfaVerified === true,
    },
    cookies: {
      sessionToken: {
        name: getSessionTokenCookieNameForMiddleware(),
      },
    },
  },
);

export const config = {
  matcher: ["/admin/:path*"],
};
