export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") {
    return;
  }

  const { checkDatabaseConnection } = await import("@/lib/db-connection");
  await checkDatabaseConnection();
}
