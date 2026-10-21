import { defineConfig, devices } from "@playwright/test";

// Runs against a production build (`npm run build && npm start -- -p 3100`); the service worker only registers in production.
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  retries: 0,
  use: { baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3100", channel: "chrome", trace: "retain-on-failure" },
  projects: [
    { name: "phone", use: { ...devices["Pixel 7"], channel: "chrome" } },
    { name: "desktop", use: { viewport: { width: 1280, height: 800 }, channel: "chrome" } },
  ],
});
