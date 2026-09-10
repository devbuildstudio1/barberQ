import { handle, jsonOk } from "@/lib/api/response";
import { assertProfile } from "@/lib/auth/guards";
import { toAppError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

/** GET /api/notifications — the caller's notifications, newest first. */
export const GET = handle(async (req) => {
  await assertProfile();
  const url = new URL(req.url);
  const unreadOnly = url.searchParams.get("unread") === "true";
  const supabase = await createClient();
  let query = supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(100);
  if (unreadOnly) query = query.eq("read", false);
  const { data, error } = await query;
  if (error) throw toAppError(error);
  return jsonOk(data);
});
