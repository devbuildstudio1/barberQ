import { handle, jsonOk } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";

export const POST = handle(async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return jsonOk({ signedOut: true });
});
