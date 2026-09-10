import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import type { Page } from "@playwright/test";
import type { Database } from "@/types/database";

config({ path: ".env.local", quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const admin: SupabaseClient<Database> = createClient<Database>(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Saved sessions, written by auth.setup.ts and reused by every spec. */
export const STATE = {
  customer: "tests/e2e/.auth/customer.json",
  owner: "tests/e2e/.auth/owner.json",
  admin: "tests/e2e/.auth/admin.json",
} as const;

/** Demo accounts created by supabase/seed.sql. */
export const DEMO = {
  ownerEmail: "owner1@queuecut.dev",
  adminEmail: "admin@queuecut.dev",
  password: "Password123!",
  /** Phone numbers wired to the fixed local OTP in supabase/config.toml. */
  otp: "123456",
  freeCustomerPhone: "9000000007",
  shopId: "d0000000-0000-4000-8000-000000000001",
  shopName: "Classic Cuts",
} as const;

export async function signInWithPassword(page: Page, email: string, path = "/shop/login") {
  await page.goto(path);
  await page.locator("input#email").fill(email);
  await page.locator("input#password").fill(DEMO.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/(shop|admin)\/dashboard/);
}

export async function signInWithOtp(page: Page, phone: string) {
  await page.goto("/login");
  await page.getByRole("radio", { name: /mobile otp/i }).click();
  await page.locator("input#phone").fill(phone);
  await page.getByRole("button", { name: /send code/i }).click();
  await page.waitForURL(/\/verify/);
  await page.locator("input#token").fill(DEMO.otp);
  await page.getByRole("button", { name: /verify/i }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/verify"));
}

/** Walk the join-queue stepper from the shop's join page to the token screen. */
export async function joinQueue(page: Page, service = /haircut/i) {
  await page.goto(`/shops/${DEMO.shopId}/join`);
  await page.getByRole("button", { name: /any available barber/i }).click();
  await page.getByRole("button", { name: /continue/i }).click();
  await page.getByRole("button", { name: service }).first().click();
  await page.getByRole("button", { name: /review & join/i }).click();
  await page.getByRole("button", { name: /^join queue$/i }).click();
  await page.waitForURL(/\/my-queue/);
}

/** Remove every queue entry for the demo shop so a test starts from a known state. */
export async function resetDemoQueue(): Promise<void> {
  await admin.from("queue_entries").delete().eq("shop_id", DEMO.shopId);
  await admin.from("queues").update({ last_token_number: 0, current_token: null }).eq("shop_id", DEMO.shopId);
  await admin
    .from("shops")
    .update({ is_open: true, queue_paused: false, opening_time: "00:00", closing_time: "23:59" })
    .eq("id", DEMO.shopId);
}

export async function clearCustomerEntries(...phones: string[]): Promise<void> {
  for (const phone of phones) {
    const { data } = await admin.from("users").select("id").eq("phone", `+91${phone}`).maybeSingle();
    if (data) await admin.from("queue_entries").delete().eq("user_id", data.id);
  }
}
