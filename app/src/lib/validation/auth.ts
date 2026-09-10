import { z } from "zod";
import { emailSchema, nameSchema, otpSchema, passwordSchema, phoneSchema } from "./common";

export const phoneStartSchema = z.object({
  phone: phoneSchema,
  name: nameSchema.optional(),
});
export type PhoneStartInput = z.input<typeof phoneStartSchema>;

export const phoneVerifySchema = z.object({
  phone: phoneSchema,
  token: otpSchema,
  name: nameSchema.optional(),
});
export type PhoneVerifyInput = z.input<typeof phoneVerifySchema>;

export const emailLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password").max(72),
});
export type EmailLoginInput = z.input<typeof emailLoginSchema>;

export const ownerSignupSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    phone: phoneSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });
export type OwnerSignupInput = z.input<typeof ownerSignupSchema>;

export const profileUpdateSchema = z.object({
  name: nameSchema,
  email: emailSchema.optional().or(z.literal("").transform(() => undefined)),
  profile_image: z.url().optional().nullable(),
});
export type ProfileUpdateInput = z.input<typeof profileUpdateSchema>;
