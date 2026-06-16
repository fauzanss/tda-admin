/** Edge-safe: no Prisma / next-auth server imports. */
export function isAdminRole(role: string | undefined | null): boolean {
  return role === "ADMIN";
}

export function canWriteFiles(role: string | undefined | null): boolean {
  return role === "ADMIN" || role === "STAFF";
}
