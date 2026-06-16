import "dotenv/config";

import { checkDatabaseConnection } from "../lib/db-connection";
import { prisma } from "../lib/prisma";

async function main() {
  const result = await checkDatabaseConnection();

  if (!result.ok) {
    console.warn("[db] database unreachable — app will continue starting");
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
