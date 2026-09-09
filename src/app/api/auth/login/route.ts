import { handle, jsonOk, readJson } from "@/lib/api/response";
import { sendPhoneOtp, signInWithPassword, verifyPhoneOtp } from "@/lib/auth/actions";
import { AppError } from "@/lib/errors";

/**
 * POST /api/auth/login
 * body: { type: "password", email, password }
 *       { type: "phone", phone }          -> sends OTP
 *       { type: "otp", phone, token }     -> verifies OTP, sets session cookies
 */
export const POST = handle(async (req) => {
  const body = (await readJson(req)) as { type?: string };
  const result =
    body.type === "otp" ? await verifyPhoneOtp(body) : body.type === "phone" ? await sendPhoneOtp(body) : await signInWithPassword(body);
  if (!result.ok) throw new AppError(result.error.code, result.error.message, result.error.fieldErrors);
  return jsonOk(result.data);
});
