import { z } from "zod";
import { emailSchema, latitudeSchema, longitudeSchema, nameSchema, optionalSafeText, phoneSchema, safeText, timeSchema } from "./common";

export const shopBaseSchema = z.object({
  name: z.string().trim().min(2, "Shop name is too short").max(100, "Shop name is too long"),
  description: optionalSafeText(1000, "Description"),
  address: safeText(300, "Address").pipe(z.string().min(5, "Enter the full address")),
  city: z.string().trim().max(80).optional().or(z.literal("").transform(() => undefined)),
  latitude: latitudeSchema.optional().nullable(),
  longitude: longitudeSchema.optional().nullable(),
  phone: phoneSchema.optional().or(z.literal("").transform(() => undefined)),
  email: emailSchema.optional().or(z.literal("").transform(() => undefined)),
  image: z.url().optional().nullable(),
  images: z.array(z.url()).max(10, "Up to 10 images").optional(),
  opening_time: timeSchema,
  closing_time: timeSchema,
});

export const shopRegisterSchema = shopBaseSchema.extend({
  owner_name: nameSchema,
});
export type ShopRegisterInput = z.input<typeof shopRegisterSchema>;

export const shopUpdateSchema = shopBaseSchema.partial();
export type ShopUpdateInput = z.input<typeof shopUpdateSchema>;

export const barberSchema = z.object({
  name: nameSchema,
  image: z.url().optional().nullable(),
  experience_years: z.coerce.number().int("Whole years only").min(0, "Cannot be negative").max(60, "Really?"),
  specialization: optionalSafeText(120, "Specialization"),
  status: z.enum(["active", "inactive"]).default("active"),
  availability: z.enum(["available", "on_break", "off_duty"]).default("available"),
});
export type BarberInput = z.input<typeof barberSchema>;

export const serviceSchema = z.object({
  name: z.string().trim().min(2, "Service name is too short").max(80, "Service name is too long"),
  price: z.coerce.number().min(0, "Price cannot be negative").max(100000, "Price is too high"),
  duration_minutes: z.coerce
    .number()
    .int("Whole minutes only")
    .min(5, "Minimum 5 minutes")
    .max(480, "Maximum 8 hours"),
  status: z.enum(["active", "inactive"]).default("active"),
});
export type ServiceInput = z.input<typeof serviceSchema>;

export const shopStatusSchema = z.object({
  status: z.enum(["approved", "rejected", "suspended", "pending"]),
  reason: optionalSafeText(300, "Reason"),
});
