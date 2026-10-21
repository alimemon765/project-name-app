import { defineConfig, devices } from "@playwright/test";

// Runs against a production build (`npm run build && npm start -- -p 3100`); the service worker only registers in production.
// Every context starts with onboarding done (prefs cookie); tests/e2e/explore.spec.ts covers onboarding itself.
const host = new URL(process.env.E2E_BASE_URL ?? "http://localhost:3100").hostname;
const onboarded = { cookies: [{ name: "ph-prefs", value: "d30-p1-o1-t", domain: host, path: "/", expires: -1, httpOnly: false, secure: false, sameSite: "Lax" as const }], origins: [] };
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  retries: 0,
  use: { baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3100", channel: "chrome", trace: "retain-on-failure", storageState: onboarded },
  projects: [
    { name: "phone", use: { ...devices["Pixel 7"], channel: "chrome" } },
    { name: "desktop", use: { viewport: { width: 1280, height: 800 }, channel: "chrome" } },
  ],
});
