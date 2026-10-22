// Integration tests use their own database (created by `npm run db:local`), never the dev data in "coastal".
export const TEST_DB_URL = process.env.TEST_DATABASE_URL ?? "postgres://postgres@localhost:55433/coastal_test";

/** A missing database must fail the run, not quietly skip it (a stopped Postgres once made "all green" meaningless).
 * Set SKIP_DB_TESTS=1 to skip deliberately, e.g. on a machine without Postgres. */
export function requireDb(reachable: boolean): boolean {
  if (reachable) return true;
  if (process.env.SKIP_DB_TESTS === "1") return false;
  throw new Error(`integration tests need the local test database at ${TEST_DB_URL}: run \`npm run db:local\` (or set SKIP_DB_TESTS=1 to skip on purpose)`);
}
