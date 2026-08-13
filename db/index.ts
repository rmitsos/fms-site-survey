import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;

let pool: Pool | null = null;
function getPool(): Pool {
  if (!connectionString) {
    throw new Error(
      "No Postgres connection string found. Set DATABASE_URL (or POSTGRES_URL) in the environment.",
    );
  }
  pool ??= new Pool({ connectionString });
  return pool;
}

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

/** Lazy singleton so nothing touches DATABASE_URL until a request actually needs it. */
export function getDb() {
  dbInstance ??= drizzle(getPool(), { schema });
  return dbInstance;
}
