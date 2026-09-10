import { handle, jsonOk, readJson } from "@/lib/api/response";
import { sendPhoneOtp, signUpOwner } from "@/lib/auth/actions";
import { AppError } from "@/lib/errors";

/**
 * POST /api/auth/register
 * body: { type: "phone", phone, name }  -> sends OTP (verify via /api/auth/login type "otp")
 *       { type: "owner", name, email, phone, password, confirmPassword }
 */
export const POST = handle(async (req) => {
  const body = (await readJson(req)) as { type?: string };
  const result = body.type === "owner" ? await signUpOwner(body) : await sendPhoneOtp(body);
  if (!result.ok) throw new AppError(result.error.code, result.error.message, result.error.fieldErrors);
  return jsonOk(result.data, { status: 201 });
});
