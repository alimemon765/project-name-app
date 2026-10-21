// Server-side database client. Never import from client components.
import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import type { Database } from "./types";

let db: Kysely<Database> | undefined;

export function getDb(): Kysely<Database> {
  if (db) return db;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set (see .env.example)");
  const pool = new Pool({ connectionString, max: 5, connectionTimeoutMillis: 5000, statement_timeout: 10_000 });
  // A dropped idle connection emits 'error'; without a listener it would crash the server process.
  pool.on("error", (e) => process.stderr.write(`[db] idle client error: ${e.message}\n`));
  db = new Kysely<Database>({ dialect: new PostgresDialect({ pool }) });
  return db;
}
