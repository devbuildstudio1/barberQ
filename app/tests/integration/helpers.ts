import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import type { Database } from "@/types/database";

config({ path: ".env.local", quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  throw new Error("Integration tests need NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY (see .env.local).");
}

export type Client = SupabaseClient<Database>;

/** Service-role client. Bypasses RLS — used only to build and tear down fixtures. */
export const admin: Client = createClient<Database>(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export function anonClient(): Client {
  return createClient<Database>(url!, anonKey!, { auth: { persistSession: false, autoRefreshToken: false } });
}

const PASSWORD = "TestPassword123!";
let counter = 0;

function uniqueEmail(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}-${Math.random().toString(36).slice(2, 8)}@test.local`;
}

export interface TestUser {
  id: string;
  email: string;
  client: Client;
}

/** Create a confirmed auth user and return a client signed in as them. */
export async function createUser(role: "customer" | "shop_owner" | "admin", name: string): Promise<TestUser> {
  const email = uniqueEmail(role);
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { name, role: role === "admin" ? "customer" : role },
  });
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);

  if (role === "admin") {
    const { error: roleErr } = await admin.from("users").update({ role: "admin" }).eq("id", data.user.id);
    if (roleErr) throw new Error(`promote admin failed: ${roleErr.message}`);
  }

  const client = anonClient();
  const { error: signInErr } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (signInErr) throw new Error(`signIn failed: ${signInErr.message}`);

  return { id: data.user.id, email, client };
}

export interface Fixture {
  owner: TestUser;
  shopId: string;
  barberId: string;
  /** 30-minute haircut. */
  serviceId: string;
  /** 15-minute trim. */
  shortServiceId: string;
  /** Disabled service, for negative tests. */
  inactiveServiceId: string;
  cleanup: () => Promise<void>;
}

/** Build an approved, open shop with a barber and services, owned by a fresh user. */
export async function createShopFixture(overrides: { isOpen?: boolean; queuePaused?: boolean; approved?: boolean } = {}): Promise<Fixture> {
  const owner = await createUser("shop_owner", "Test Owner");

  const { data: shop, error } = await admin
    .from("shops")
    .insert({
      owner_id: owner.id,
      name: `Test Shop ${Math.random().toString(36).slice(2, 8)}`,
      address: "1 Test Road, Chennai",
      city: "Chennai",
      latitude: 13.06,
      longitude: 80.25,
      status: overrides.approved === false ? "pending" : "approved",
      is_open: overrides.isOpen ?? true,
      queue_paused: overrides.queuePaused ?? false,
      // Wide hours so shop_is_open_now() never depends on the wall clock.
      opening_time: "00:00",
      closing_time: "23:59",
      approved_at: overrides.approved === false ? null : new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !shop) throw new Error(`create shop failed: ${error?.message}`);

  const { data: barber, error: barberErr } = await admin
    .from("barbers")
    .insert({ shop_id: shop.id, name: "Test Barber", experience_years: 5, status: "active", availability: "available" })
    .select("id")
    .single();
  if (barberErr || !barber) throw new Error(`create barber failed: ${barberErr?.message}`);

  const { data: services, error: svcErr } = await admin
    .from("services")
    .insert([
      { shop_id: shop.id, name: "Haircut", price: 150, duration_minutes: 30, status: "active", sort_order: 1 },
      { shop_id: shop.id, name: "Beard Trim", price: 100, duration_minutes: 15, status: "active", sort_order: 2 },
      { shop_id: shop.id, name: "Retired Service", price: 200, duration_minutes: 20, status: "inactive", sort_order: 3 },
    ])
    .select("id, name");
  if (svcErr || !services) throw new Error(`create services failed: ${svcErr?.message}`);

  const byName = (n: string) => services.find((s) => s.name === n)!.id;

  return {
    owner,
    shopId: shop.id,
    barberId: barber.id,
    serviceId: byName("Haircut"),
    shortServiceId: byName("Beard Trim"),
    inactiveServiceId: byName("Retired Service"),
    cleanup: async () => {
      await admin.from("shops").delete().eq("id", shop.id);
      await admin.auth.admin.deleteUser(owner.id).catch(() => {});
    },
  };
}

export async function deleteUsers(...users: TestUser[]): Promise<void> {
  await Promise.all(users.map((u) => admin.auth.admin.deleteUser(u.id).catch(() => {})));
}

/** The error message a Postgres function raised, or null when the call succeeded. */
export function rpcError(result: { error: { message: string } | null }): string | null {
  return result.error ? result.error.message : null;
}

/** Today's date in the platform timezone, matching public.app_today(). */
export function appToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}
