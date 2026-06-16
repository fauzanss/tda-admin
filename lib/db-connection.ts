import { prisma } from "@/lib/prisma";

export type DatabaseConnectionResult = {
  ok: boolean;
  label: string;
  durationMs: number;
  error?: unknown;
};

function getDatabaseLabel(): string {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return "DATABASE_URL not set";
  }

  const parsed = new URL(databaseUrl.replace(/^mysql:\/\//, "http://"));
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ""));

  return `${parsed.hostname}:${parsed.port || "3306"}/${database}`;
}

export async function checkDatabaseConnection(): Promise<DatabaseConnectionResult> {
  const startedAt = Date.now();
  const label = getDatabaseLabel();

  try {
    await prisma.$queryRaw`SELECT 1`;
    const durationMs = Date.now() - startedAt;
    console.info(`[db] connection ok (${durationMs}ms) → ${label}`);
    return { ok: true, label, durationMs };
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    console.error(`[db] connection failed (${durationMs}ms) → ${label}`);
    console.error(error);
    return { ok: false, label, durationMs, error };
  }
}
