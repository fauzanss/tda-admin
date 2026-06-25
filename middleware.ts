import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

import {
  getAllNextAuthSessionCookieNames,
  getSessionTokenCookieNameForMiddleware,
  PENDING_2FA_COOKIE_NAME,
} from "@/lib/auth-cookies";
import { canWriteFiles, isAdminRole } from "@/lib/role-guards";

type TokenWithRole = { role?: string; mfaVerified?: boolean };

const MID_LOGIN_PREFIXES = ["/login/two-factor", "/login/setup-authenticator"] as const;

function isMidLoginPath(pathname: string) {
  return MID_LOGIN_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function clearSessionCookies(response: NextResponse) {
  for (const name of getAllNextAuthSessionCookieNames()) {
    response.cookies.delete(name);
  }
  return response;
}

export default withAuth(
  function middleware(req) {
    if (req.nextUrl.pathname === "/login") {
      const response = NextResponse.next();
      response.cookies.delete(PENDING_2FA_COOKIE_NAME);
      return response;
    }

    if (isMidLoginPath(req.nextUrl.pathname)) {
      return clearSessionCookies(NextResponse.next());
    }

    const role = (req.nextauth.token as TokenWithRole | undefined)?.role;
    const { pathname } = req.nextUrl;

    if (pathname === "/admin/documents/PURCHASE_ORDER") {
      return NextResponse.redirect(new URL("/admin/po-keluar", req.nextUrl));
    }
    if (pathname === "/admin/documents/PURCHASE_ORDER/new") {
      return NextResponse.redirect(new URL("/admin/po-keluar/new", req.nextUrl));
    }
    const poEditMatch = pathname.match(/^\/admin\/documents\/PURCHASE_ORDER\/([^/]+)\/edit$/);
    if (poEditMatch) {
      return NextResponse.redirect(new URL(`/admin/po-keluar/${poEditMatch[1]}/edit`, req.nextUrl));
    }
    const poPreviewMatch = pathname.match(/^\/admin\/documents\/PURCHASE_ORDER\/([^/]+)\/preview$/);
    if (poPreviewMatch) {
      return NextResponse.redirect(new URL(`/admin/po-keluar/${poPreviewMatch[1]}/preview`, req.nextUrl));
    }

    if (pathname.startsWith("/admin/settings") && !isAdminRole(role)) {
      return NextResponse.redirect(new URL("/admin/dashboard", req.nextUrl));
    }

    if (!canWriteFiles(role)) {
      if (pathname.match(/\/admin\/documents\/(SPH|SURAT_JALAN|INVOICE)\/[^/]+\/new$/)) {
        const t = pathname.split("/")[3];
        return NextResponse.redirect(new URL(`/admin/documents/${t}`, req.nextUrl));
      }
      const editMatch = pathname.match(
        /^\/admin\/documents\/(SPH|SURAT_JALAN|INVOICE)\/([^/]+)\/edit$/,
      );
      if (editMatch) {
        return NextResponse.redirect(new URL(`/admin/documents/${editMatch[1]}`, req.nextUrl));
      }
      if (pathname === "/admin/po-masuk/new") {
        return NextResponse.redirect(new URL("/admin/po-masuk", req.nextUrl));
      }
      if (pathname === "/admin/po-keluar/new") {
        return NextResponse.redirect(new URL("/admin/po-keluar", req.nextUrl));
      }
      if (pathname.match(/^\/admin\/po-keluar\/[^/]+\/edit$/)) {
        return NextResponse.redirect(new URL("/admin/po-keluar", req.nextUrl));
      }
    }

    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/login",
    },
    callbacks: {
      authorized: ({ req, token }) => {
        if (req.nextUrl.pathname === "/login" || isMidLoginPath(req.nextUrl.pathname)) {
          return true;
        }
        return Boolean(token) && (token as TokenWithRole).mfaVerified === true;
      },
    },
    cookies: {
      sessionToken: {
        name: getSessionTokenCookieNameForMiddleware(),
      },
    },
  },
);

export const config = {
  matcher: ["/admin/:path*", "/login", "/login/two-factor", "/login/setup-authenticator"],
};
