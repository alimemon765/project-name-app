// Integration tests use their own database (created by `npm run db:local`), never the dev data in "coastal".
export const TEST_DB_URL = process.env.TEST_DATABASE_URL ?? "postgres://postgres@localhost:55433/coastal_test";
