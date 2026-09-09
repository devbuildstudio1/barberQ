import { handle, jsonOk, readJson } from "@/lib/api/response";
import { updateProfile } from "@/lib/auth/actions";
import { assertProfile } from "@/lib/auth/guards";
import { AppError } from "@/lib/errors";

export const GET = handle(async () => {
  const profile = await assertProfile();
  return jsonOk(profile);
});

export const PATCH = handle(async (req) => {
  const result = await updateProfile(await readJson(req));
  if (!result.ok) throw new AppError(result.error.code, result.error.message, result.error.fieldErrors);
  return jsonOk(result.data);
});
