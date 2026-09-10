import { existsSync, statSync } from "node:fs";
import { test as setup } from "@playwright/test";
import { DEMO, STATE, signInWithOtp, signInWithPassword } from "./fixtures";

/**
 * Signs each role in once and stores the session; specs reuse these states
 * rather than logging in repeatedly. A stored state younger than the session
 * lifetime is reused as-is, which keeps repeated local runs within the OTP
 * rate limits the app enforces in production.
 */
const MAX_STATE_AGE_MS = 30 * 60_000;

function isFresh(path: string): boolean {
  if (process.env.E2E_FORCE_LOGIN) return false;
  if (!existsSync(path)) return false;
  return Date.now() - statSync(path).mtimeMs < MAX_STATE_AGE_MS;
}

setup("authenticate customer", async ({ page }) => {
  if (isFresh(STATE.customer)) setup.skip(true, "reusing recent customer session");
  await signInWithOtp(page, DEMO.freeCustomerPhone);
  await page.context().storageState({ path: STATE.customer });
});

setup("authenticate shop owner", async ({ page }) => {
  if (isFresh(STATE.owner)) setup.skip(true, "reusing recent owner session");
  await signInWithPassword(page, DEMO.ownerEmail);
  await page.context().storageState({ path: STATE.owner });
});

setup("authenticate admin", async ({ page }) => {
  if (isFresh(STATE.admin)) setup.skip(true, "reusing recent admin session");
  await signInWithPassword(page, DEMO.adminEmail, "/admin/login");
  await page.context().storageState({ path: STATE.admin });
});
