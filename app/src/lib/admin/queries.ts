import "server-only";

import { assertRole } from "@/lib/auth/guards";
import { toAppError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { todayInAppTz } from "@/lib/shops/queries";
import type { AdminStats, DailyReportRow, ShopStatus } from "@/types/domain";

export async function getAdminStats(): Promise<AdminStats> {
  await assertRole("admin");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_stats");
  if (error) throw toAppError(error);
  return data as unknown as AdminStats;
}

export async function getDailyReport(days = 14): Promise<DailyReportRow[]> {
  await assertRole("admin");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_daily_report", { p_days: days });
  if (error) throw toAppError(error);
  return (data as unknown as DailyReportRow[] | null) ?? [];
}

export interface AdminShopRow {
  id: string;
  name: string;
  address: string;
  city: string | null;
  status: ShopStatus;
  created_at: string;
  approved_at: string | null;
  rejection_reason: string | null;
  is_open: boolean;
  rating: number;
  review_count: number;
  owner: { id: string; name: string | null; phone: string | null; email: string | null } | null;
}

export async function listShopsForAdmin(status?: ShopStatus, search?: string): Promise<AdminShopRow[]> {
  await assertRole("admin");
  const supabase = await createClient();
  let query = supabase
    .from("shops")
    .select("id, name, address, city, status, created_at, approved_at, rejection_reason, is_open, rating, review_count, owner:users!shops_owner_id_fkey(id, name, phone, email)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (status) query = query.eq("status", status);
  if (search) query = query.ilike("name", `%${search}%`);
  const { data, error } = await query;
  if (error) throw toAppError(error);
  return (data ?? []) as unknown as AdminShopRow[];
}

export async function listUsersForAdmin(role?: "customer" | "shop_owner" | "admin", search?: string) {
  await assertRole("admin");
  const supabase = await createClient();
  let query = supabase.from("users").select("*").order("created_at", { ascending: false }).limit(200);
  if (role) query = query.eq("role", role);
  if (search) query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
  const { data, error } = await query;
  if (error) throw toAppError(error);
  return data ?? [];
}

export async function listBarbersForAdmin(search?: string) {
  await assertRole("admin");
  const supabase = await createClient();
  let query = supabase
    .from("barbers")
    .select("*, shop:shops(id, name, status)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (search) query = query.ilike("name", `%${search}%`);
  const { data, error } = await query;
  if (error) throw toAppError(error);
  return data ?? [];
}

export async function listActiveQueuesForAdmin() {
  await assertRole("admin");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("queues")
    .select("*, shop:shops(id, name, city, is_open, queue_paused), barber:barbers(id, name)")
    .eq("queue_date", todayInAppTz())
    .order("waiting_count", { ascending: false })
    .limit(200);
  if (error) throw toAppError(error);
  return data ?? [];
}

export async function listReviewsForAdmin(hidden?: boolean) {
  await assertRole("admin");
  const supabase = await createClient();
  let query = supabase
    .from("reviews")
    .select("*, shop:shops(id, name), user:users!reviews_user_id_fkey(id, name)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (hidden !== undefined) query = query.eq("is_hidden", hidden);
  const { data, error } = await query;
  if (error) throw toAppError(error);
  return data ?? [];
}
