import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing from the environment variables.");
}

const sql = neon(databaseUrl);

try {
  const result = await sql`SELECT NOW() AS current_time`;
  console.log("Neon connection successful:", result[0]);
} catch (error) {
  console.error("Neon connection failed:", error);
  process.exitCode = 1;
}
