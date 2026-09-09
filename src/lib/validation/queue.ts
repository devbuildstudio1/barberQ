import { z } from "zod";
import { uuidSchema } from "./common";

export const joinQueueSchema = z.object({
  shop_id: uuidSchema,
  service_id: uuidSchema,
  barber_id: uuidSchema.optional().nullable(),
});
export type JoinQueueInput = z.input<typeof joinQueueSchema>;

export const queueEntryActionSchema = z.object({
  entry_id: uuidSchema,
});

export const reviewSchema = z.object({
  queue_entry_id: uuidSchema,
  rating: z.coerce.number().int().min(1, "Pick a rating").max(5, "Rating must be 1–5"),
  review: z
    .string()
    .trim()
    .max(1000, "Review is too long")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});
export type ReviewInput = z.input<typeof reviewSchema>;

export const shopSearchSchema = z.object({
  q: z.string().trim().max(80).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  sort: z.enum(["recommended", "nearest", "rating", "wait", "price"]).default("recommended"),
  open: z.coerce.boolean().optional(),
  maxDistance: z.coerce.number().positive().max(100).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  maxWait: z.coerce.number().min(0).optional(),
});
export type ShopSearchInput = z.input<typeof shopSearchSchema>;
export type ShopSearchParams = z.output<typeof shopSearchSchema>;
