import { sql } from "drizzle-orm";

export async function checkDatabaseConnection(): Promise<void> {
  const { db } = await import("./index.js");
  await db.execute(sql`select 1`);
}
