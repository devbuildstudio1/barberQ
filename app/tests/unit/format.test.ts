import { describe, expect, it } from "vitest";
import { formatDistance, formatINR, formatMinutes, formatToken, initials, pluralize } from "@/lib/utils/format";
import { haversineKm, directionsUrl, DEFAULT_LOCATION } from "@/lib/utils/geo";

describe("formatINR", () => {
  it("formats whole rupees without decimals", () => {
    expect(formatINR(150)).toBe("₹150");
    expect(formatINR(0)).toBe("₹0");
  });

  it("uses the Indian digit grouping", () => {
    expect(formatINR(100000)).toBe("₹1,00,000");
  });
});

describe("formatMinutes", () => {
  it("formats sub-hour durations", () => {
    expect(formatMinutes(0)).toBe("0 min");
    expect(formatMinutes(35)).toBe("35 min");
  });

  it("formats hours and remainders", () => {
    expect(formatMinutes(60)).toBe("1 hr");
    expect(formatMinutes(70)).toBe("1 hr 10 min");
    expect(formatMinutes(125)).toBe("2 hr 5 min");
  });

  it("clamps negatives to zero and rounds fractions", () => {
    expect(formatMinutes(-5)).toBe("0 min");
    expect(formatMinutes(29.6)).toBe("30 min");
  });
});

describe("formatDistance", () => {
  it("uses metres below one kilometre", () => {
    expect(formatDistance(0.8)).toBe("800 m");
    expect(formatDistance(0.05)).toBe("50 m");
  });

  it("uses one decimal place under 10 km and none above", () => {
    expect(formatDistance(3.24)).toBe("3.2 km");
    expect(formatDistance(12.4)).toBe("12 km");
  });

  it("renders an em dash when unknown", () => {
    expect(formatDistance(null)).toBe("—");
    expect(formatDistance(undefined)).toBe("—");
    expect(formatDistance(Number.NaN)).toBe("—");
  });
});

describe("formatToken", () => {
  it("joins prefix and number", () => {
    expect(formatToken("A", 27)).toBe("A-27");
    expect(formatToken("B", 1)).toBe("B-1");
  });
});

describe("initials", () => {
  it("takes the first letter of the first two words", () => {
    expect(initials("Rahul Sharma")).toBe("RS");
    expect(initials("Mani")).toBe("M");
    expect(initials("a b c d")).toBe("AB");
  });

  it("handles missing names", () => {
    expect(initials(null)).toBe("?");
    expect(initials("")).toBe("?");
  });
});

describe("pluralize", () => {
  it("uses the singular for exactly one", () => {
    expect(pluralize(1, "person", "people")).toBe("1 person");
    expect(pluralize(0, "person", "people")).toBe("0 people");
    expect(pluralize(4, "customer")).toBe("4 customers");
  });
});

describe("haversineKm", () => {
  it("returns zero for identical points", () => {
    expect(haversineKm(DEFAULT_LOCATION, DEFAULT_LOCATION)).toBeCloseTo(0, 6);
  });

  it("matches a known distance (Chennai landmarks, ~6 km)", () => {
    const adyar = { lat: 13.0067, lng: 80.2571 };
    const km = haversineKm(DEFAULT_LOCATION, adyar);
    expect(km).toBeGreaterThan(5);
    expect(km).toBeLessThan(7);
  });

  it("is symmetric", () => {
    const a = { lat: 13.06, lng: 80.25 };
    const b = { lat: 12.99, lng: 80.21 };
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 9);
  });
});

describe("directionsUrl", () => {
  it("builds a coordinate link when the shop is pinned", () => {
    expect(directionsUrl(13.06, 80.25)).toContain("destination=13.06,80.25");
  });

  it("falls back to a text search when coordinates are missing", () => {
    expect(directionsUrl(null, null, "Classic Cuts")).toContain("query=Classic%20Cuts");
  });
});
