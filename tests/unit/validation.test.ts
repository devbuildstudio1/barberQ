import { describe, expect, it } from "vitest";
import { AppError, toAppError, ERROR_MESSAGES } from "@/lib/errors";
import { parseOrThrow } from "@/lib/validation/parse";
import { emailSchema, nameSchema, otpSchema, phoneSchema } from "@/lib/validation/common";
import { barberSchema, serviceSchema, shopRegisterSchema } from "@/lib/validation/shop";
import { joinQueueSchema, reviewSchema, shopSearchSchema } from "@/lib/validation/queue";

describe("phoneSchema", () => {
  it("normalises a 10-digit Indian number to E.164", () => {
    expect(phoneSchema.parse("9876543210")).toBe("+919876543210");
    expect(phoneSchema.parse("98765 43210")).toBe("+919876543210");
    expect(phoneSchema.parse("98765-43210")).toBe("+919876543210");
  });

  it("keeps an already-qualified number", () => {
    expect(phoneSchema.parse("+919876543210")).toBe("+919876543210");
  });

  it("rejects numbers that are too short or malformed", () => {
    expect(phoneSchema.safeParse("12345").success).toBe(false);
    expect(phoneSchema.safeParse("abcdefghij").success).toBe(false);
  });

  it("rejects Indian numbers starting below 6", () => {
    expect(phoneSchema.safeParse("1234567890").success).toBe(false);
  });
});

describe("emailSchema", () => {
  it("lowercases and trims", () => {
    expect(emailSchema.parse("  Rahul@Example.COM ")).toBe("rahul@example.com");
  });

  it("rejects malformed addresses", () => {
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
  });
});

describe("nameSchema", () => {
  it("accepts names with spaces and punctuation", () => {
    expect(nameSchema.parse("  Rahul Sharma ")).toBe("Rahul Sharma");
    expect(nameSchema.safeParse("O'Brien").success).toBe(true);
  });

  it("rejects empty and one-character names", () => {
    expect(nameSchema.safeParse("").success).toBe(false);
    expect(nameSchema.safeParse("R").success).toBe(false);
  });

  it("rejects names with markup", () => {
    expect(nameSchema.safeParse("<script>alert(1)</script>").success).toBe(false);
  });
});

describe("otpSchema", () => {
  it("requires exactly six digits", () => {
    expect(otpSchema.parse("123456")).toBe("123456");
    expect(otpSchema.safeParse("12345").success).toBe(false);
    expect(otpSchema.safeParse("1234567").success).toBe(false);
    expect(otpSchema.safeParse("12345a").success).toBe(false);
  });
});

describe("serviceSchema", () => {
  const valid = { name: "Haircut", price: 150, duration_minutes: 30 };

  it("accepts a valid service and applies the default status", () => {
    expect(serviceSchema.parse(valid)).toMatchObject({ name: "Haircut", price: 150, duration_minutes: 30, status: "active" });
  });

  it("coerces numeric strings from form inputs", () => {
    expect(serviceSchema.parse({ ...valid, price: "250", duration_minutes: "45" })).toMatchObject({ price: 250, duration_minutes: 45 });
  });

  it("rejects a negative price", () => {
    expect(serviceSchema.safeParse({ ...valid, price: -1 }).success).toBe(false);
  });

  it("rejects a duration below 5 minutes or above 8 hours", () => {
    expect(serviceSchema.safeParse({ ...valid, duration_minutes: 1 }).success).toBe(false);
    expect(serviceSchema.safeParse({ ...valid, duration_minutes: 600 }).success).toBe(false);
  });

  it("rejects fractional durations", () => {
    expect(serviceSchema.safeParse({ ...valid, duration_minutes: 12.5 }).success).toBe(false);
  });

  it("rejects an empty name", () => {
    expect(serviceSchema.safeParse({ ...valid, name: "" }).success).toBe(false);
  });
});

describe("barberSchema", () => {
  it("rejects negative or implausible experience", () => {
    expect(barberSchema.safeParse({ name: "Mani", experience_years: -1 }).success).toBe(false);
    expect(barberSchema.safeParse({ name: "Mani", experience_years: 99 }).success).toBe(false);
  });

  it("defaults status and availability", () => {
    expect(barberSchema.parse({ name: "Mani", experience_years: 4 })).toMatchObject({ status: "active", availability: "available" });
  });
});

describe("shopRegisterSchema", () => {
  const valid = {
    owner_name: "Ravi Kumar",
    name: "Classic Cuts",
    address: "12, Anna Salai, Thousand Lights",
    opening_time: "09:00",
    closing_time: "21:00",
  };

  it("accepts a minimal valid registration", () => {
    expect(shopRegisterSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects malformed times", () => {
    expect(shopRegisterSchema.safeParse({ ...valid, opening_time: "9am" }).success).toBe(false);
    expect(shopRegisterSchema.safeParse({ ...valid, closing_time: "25:00" }).success).toBe(false);
  });

  it("rejects out-of-range coordinates", () => {
    expect(shopRegisterSchema.safeParse({ ...valid, latitude: 91, longitude: 80 }).success).toBe(false);
    expect(shopRegisterSchema.safeParse({ ...valid, latitude: 13, longitude: 181 }).success).toBe(false);
  });

  it("strips markup from the address", () => {
    const parsed = shopRegisterSchema.parse({ ...valid, address: "12 Anna Salai <script>alert(1)</script>" });
    expect(parsed.address).not.toContain("<script>");
  });

  it("treats empty optional strings as undefined", () => {
    const parsed = shopRegisterSchema.parse({ ...valid, phone: "", email: "", description: "" });
    expect(parsed.phone).toBeUndefined();
    expect(parsed.email).toBeUndefined();
    expect(parsed.description).toBeUndefined();
  });
});

describe("reviewSchema", () => {
  const entry = crypto.randomUUID();

  it("accepts ratings 1..5", () => {
    for (const rating of [1, 2, 3, 4, 5]) {
      expect(reviewSchema.safeParse({ queue_entry_id: entry, rating }).success).toBe(true);
    }
  });

  it("rejects 0, 6 and fractional ratings", () => {
    expect(reviewSchema.safeParse({ queue_entry_id: entry, rating: 0 }).success).toBe(false);
    expect(reviewSchema.safeParse({ queue_entry_id: entry, rating: 6 }).success).toBe(false);
    expect(reviewSchema.safeParse({ queue_entry_id: entry, rating: 3.5 }).success).toBe(false);
  });

  it("rejects a non-uuid entry id", () => {
    expect(reviewSchema.safeParse({ queue_entry_id: "nope", rating: 5 }).success).toBe(false);
  });
});

describe("joinQueueSchema", () => {
  it("requires uuids and allows a null barber", () => {
    const input = { shop_id: crypto.randomUUID(), service_id: crypto.randomUUID(), barber_id: null };
    expect(joinQueueSchema.safeParse(input).success).toBe(true);
    expect(joinQueueSchema.safeParse({ ...input, shop_id: "abc" }).success).toBe(false);
  });
});

describe("shopSearchSchema", () => {
  it("defaults to the recommended sort", () => {
    expect(shopSearchSchema.parse({}).sort).toBe("recommended");
  });

  it("coerces query-string numbers", () => {
    const parsed = shopSearchSchema.parse({ lat: "13.06", lng: "80.25", maxDistance: "5", minRating: "4" });
    expect(parsed.lat).toBeCloseTo(13.06);
    expect(parsed.maxDistance).toBe(5);
  });

  it("rejects an unknown sort key", () => {
    expect(shopSearchSchema.safeParse({ sort: "cheapest" }).success).toBe(false);
  });
});

describe("parseOrThrow", () => {
  it("returns parsed data on success", () => {
    expect(parseOrThrow(otpSchema, "123456")).toBe("123456");
  });

  it("throws a VALIDATION_ERROR carrying field errors", () => {
    try {
      parseOrThrow(serviceSchema, { name: "", price: -1, duration_minutes: 1 });
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      const appErr = err as AppError;
      expect(appErr.code).toBe("VALIDATION_ERROR");
      expect(appErr.status).toBe(400);
      expect(Object.keys(appErr.details as Record<string, string[]>)).toEqual(
        expect.arrayContaining(["name", "price", "duration_minutes"]),
      );
    }
  });
});

describe("toAppError", () => {
  it("passes AppError through unchanged", () => {
    const original = new AppError("QUEUE_PAUSED");
    expect(toAppError(original)).toBe(original);
  });

  it("maps a database RAISE message to its error code", () => {
    expect(toAppError({ message: "ALREADY_IN_QUEUE" }).code).toBe("ALREADY_IN_QUEUE");
    expect(toAppError({ message: "SHOP_CLOSED" }).code).toBe("SHOP_CLOSED");
  });

  it("keeps the detail from a suffixed database message", () => {
    const err = toAppError({ message: "INVALID_QUEUE_STATE: waiting -> completed" });
    expect(err.code).toBe("INVALID_QUEUE_STATE");
    expect(err.details).toBe("waiting -> completed");
  });

  it("maps Postgres error codes to safe application errors", () => {
    expect(toAppError({ code: "23505", message: "duplicate key value" }).code).toBe("CONFLICT");
    expect(toAppError({ code: "42501", message: "permission denied" }).code).toBe("FORBIDDEN");
    expect(toAppError({ code: "PGRST116", message: "no rows" }).code).toBe("NOT_FOUND");
  });

  it("never leaks a raw database message to the user", () => {
    const raw = 'duplicate key value violates unique constraint "queue_entries_token_unique"';
    const err = toAppError({ code: "23505", message: raw });
    expect(err.message).toBe(ERROR_MESSAGES.CONFLICT);
    expect(err.message).not.toContain("constraint");
  });

  it("falls back to INTERNAL_ERROR for unknown failures", () => {
    expect(toAppError(new Error("kaboom")).code).toBe("INTERNAL_ERROR");
    expect(toAppError(undefined).code).toBe("INTERNAL_ERROR");
  });
});
