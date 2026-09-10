import { z } from "zod";

/**
 * E.164 phone number. A bare 10-digit input is treated as an Indian mobile and
 * normalised to +91XXXXXXXXXX; anything else must carry an explicit country
 * code, so a mistyped local number can't silently become a foreign one.
 */
export const phoneSchema = z
  .string()
  .trim()
  .min(8, "Enter a valid phone number")
  .transform((raw) => raw.replace(/[\s\-()]/g, ""))
  .superRefine((v, ctx) => {
    const isIndianMobile = /^[6-9]\d{9}$/.test(v);
    const isInternational = /^\+[1-9]\d{7,14}$/.test(v);
    if (!isIndianMobile && !isInternational) {
      ctx.addIssue({ code: "custom", message: "Enter a 10-digit mobile number, or include the country code" });
    }
  })
  .transform((v) => (/^[6-9]\d{9}$/.test(v) ? `+91${v}` : v));

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .pipe(z.email("Enter a valid email address"));

/**
 * Display name for a person. Letters, marks, digits and a few separators are
 * allowed (real staff names include things like "Ravi 2"); markup characters
 * are not, so a name can never carry a tag into the UI.
 */
export const nameSchema = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(80, "Name is too long")
  .regex(/^[\p{L}\p{M}\p{N} .,'&()-]+$/u, "Name contains invalid characters")
  .refine((v) => /[\p{L}]/u.test(v), "Name must contain letters");

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

/** Strip HTML tags and collapse runs of blank lines. */
const sanitizeText = (s: string) => s.replace(/<[^>]*>/g, "").replace(/\s{3,}/g, "\n\n");

/** Trimmed, length-capped, tag-stripped free text. */
export const safeText = (max: number, label = "Text") =>
  z
    .string()
    .trim()
    .max(max, `${label} must be under ${max} characters`)
    .transform(sanitizeText);

/** Optional free text: blank, whitespace-only and null all become undefined. */
export const optionalSafeText = (max: number, label = "Text") =>
  z
    .union([safeText(max, label), z.null()])
    .transform((v) => (v == null || v === "" ? undefined : v))
    .optional();
