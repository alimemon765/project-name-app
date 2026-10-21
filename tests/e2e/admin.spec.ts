import { test, expect } from "@playwright/test";

// The classifier review page exists only on the local admin server (npm run admin: ADMIN_LABELS=1, bound to 127.0.0.1).
test("the review page is not served by the normal app", async ({ request }) => {
  const res = await request.get("/admin/labels");
  expect(res.status()).toBe(404);
});
