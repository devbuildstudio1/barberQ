import { z } from "zod";

/** E.164 phone. Accepts Indian 10-digit numbers and normalises to +91XXXXXXXXXX. */
export const phoneSchema = z
  .string()
  .trim()
  .min(8, "Enter a valid phone number")
  .transform((raw) => raw.replace(/[\s\-()]/g, ""))
  .transform((v) => (/^[6-9]\d{9}$/.test(v) ? `+91${v}` : v.startsWith("+") ? v : `+${v}`))
  .pipe(z.string().regex(/^\+[1-9]\d{7,14}$/, "Enter a valid phone number with country code"));

export const emailSchema = z.email("Enter a valid email address").trim().toLowerCase().max(254);

export const nameSchema = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(80, "Name is too long")
  .regex(/^[\p{L}\p{M} .'-]+$/u, "Name contains invalid characters");

export const uuidSchema = z.uuid("Invalid id");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password is too long");

export const otpSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Enter the 6-digit code");

export const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM format");

export const latitudeSchema = z.coerce.number().min(-90).max(90);
export const longitudeSchema = z.coerce.number().min(-180).max(180);

/** Strip HTML tags and collapse whitespace for free-text fields. */
export const safeText = (max: number, label = "Text") =>
  z
    .string()
    .trim()
    .max(max, `${label} must be under ${max} characters`)
    .transform((s) => s.replace(/<[^>]*>/g, "").replace(/\s{3,}/g, "\n\n"));

export const optionalSafeText = (max: number, label?: string) =>
  safeText(max, label).optional().or(z.literal("").transform(() => undefined));
