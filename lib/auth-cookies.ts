import type { NextAuthOptions } from "next-auth";

/** Penamaan cookie (prefix) supaya tidak tabrakan antar app di domain sama. */
const TDA = "tda-";

/**
 * Sama logika bawaan NextAuth (`defaultCookies`): __Secure- / __Host- hanya bila koneksi dianggap secure.
 * Pakai `NEXTAUTH_URL` (https) untuk production.
 */
function nextAuthUsesSecureCookiePrefix(): boolean {
  return process.env.NEXTAUTH_URL?.startsWith("https://") ?? false;
}

export function getNextAuthTdaCookieOptions(): NextAuthOptions["cookies"] {
  const secure = nextAuthUsesSecureCookiePrefix();
  const p = secure ? "__Secure-" : "";
  const host = secure ? "__Host-" : "";
  return {
    sessionToken: {
      name: `${p}${TDA}next-auth.session-token`,
      options: { httpOnly: true, sameSite: "lax", path: "/", secure },
    },
    callbackUrl: {
      name: `${p}${TDA}next-auth.callback-url`,
      options: { httpOnly: true, sameSite: "lax", path: "/", secure },
    },
    csrfToken: {
      name: `${host}${TDA}next-auth.csrf-token`,
      options: { httpOnly: true, sameSite: "lax", path: "/", secure },
    },
    pkceCodeVerifier: {
      name: `${p}${TDA}next-auth.pkce.code_verifier`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure,
        maxAge: 60 * 15,
      },
    },
    state: {
      name: `${p}${TDA}next-auth.state`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure,
        maxAge: 60 * 15,
      },
    },
    nonce: {
      name: `${p}${TDA}next-auth.nonce`,
      options: { httpOnly: true, sameSite: "lax", path: "/", secure },
    },
  };
}

/** Nama cookie session untuk `withAuth` (harus identik dengan di auth). */
export function getSessionTokenCookieNameForMiddleware(): string {
  const c = getNextAuthTdaCookieOptions();
  if (!c?.sessionToken?.name) {
    throw new Error("sessionToken cookie name is not set");
  }
  return c.sessionToken.name;
}
