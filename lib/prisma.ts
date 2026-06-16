import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/generated/prisma/client";

function createAdapter() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  const parsed = new URL(databaseUrl.replace(/^mysql:\/\//, "http://"));

  return new PrismaMariaDb({
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: decodeURIComponent(parsed.pathname.replace(/^\//, "")),
    connectionLimit: 2,
    acquireTimeout: 10_000,
    connectTimeout: 5_000,
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  adapter?: PrismaMariaDb;
};

function createPrismaClient() {
  const adapter = globalForPrisma.adapter ?? createAdapter();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.adapter = adapter;
  }

  const logLevels =
    process.env.NODE_ENV === "development"
      ? (["query", "info", "warn", "error"] as const)
      : (["error"] as const);

  return new PrismaClient({ adapter, log: [...logLevels] });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
