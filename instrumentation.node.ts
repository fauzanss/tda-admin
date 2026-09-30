import { checkDatabaseConnection } from "@/lib/db-connection";

export async function registerNode() {
  await checkDatabaseConnection();
}
