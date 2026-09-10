import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, createShopFixture, createUser, deleteUsers, rpcError, type Fixture, type TestUser } from "./helpers";

/** The rules in section 41 of the brief, enforced in the database. */
describe("business rules", () => {
  let shop: Fixture;
  let customer: TestUser;
  let otherCustomer: TestUser;

  beforeAll(async () => {
    shop = await createShopFixture();
    [customer, otherCustomer] = await Promise.all([
      createUser("customer", "Rules Customer"),
      createUser("customer", "Second Customer"),
    ]);
  }, 60_000);

  afterAll(async () => {
    await shop.cleanup();
    await deleteUsers(customer, otherCustomer);
  });

  async function clearQueue() {
    await admin.from("queue_entries").delete().eq("shop_id", shop.shopId);
    await admin.from("queues").update({ last_token_number: 0, current_token: null }).eq("shop_id", shop.shopId);
  }

  async function setShop(patch: Record<string, unknown>) {
    await admin.from("shops").update(patch).eq("id", shop.shopId);
  }

  const join = (user: TestUser, serviceId = shop.serviceId, barberId?: string) =>
    user.client.rpc("join_queue", { p_shop_id: shop.shopId, p_service_id: serviceId, p_barber_id: barberId });

  describe("rule 2: a closed shop cannot accept queue entries", () => {
    it("rejects joins when the shop is switched off", async () => {
      await clearQueue();
      await setShop({ is_open: false });
      const result = await join(customer);
      expect(rpcError(result)).toContain("SHOP_CLOSED");
      await setShop({ is_open: true });
    });

    it("rejects joins outside opening hours", async () => {
      await clearQueue();
      // A one-minute window in the past: within the day, but not now.
      await setShop({ opening_time: "00:00", closing_time: "00:01" });
      const result = await join(customer);
      expect(rpcError(result)).toContain("SHOP_CLOSED");
      await setShop({ opening_time: "00:00", closing_time: "23:59" });
    });

    it("accepts joins again once reopened", async () => {
      await clearQueue();
      const result = await join(customer);
      expect(rpcError(result)).toBeNull();
    });
  });

  describe("rule 3: a paused queue cannot accept new customers", () => {
    it("rejects new joins while paused", async () => {
      await clearQueue();
      const paused = await shop.owner.client.rpc("set_shop_queue_paused", { p_shop_id: shop.shopId, p_paused: true });
      expect(paused.data!.queue_paused).toBe(true);

      const result = await join(customer);
      expect(rpcError(result)).toContain("QUEUE_PAUSED");
    });

    it("keeps existing tokens servable while paused", async () => {
      await clearQueue();
      await shop.owner.client.rpc("set_shop_queue_paused", { p_shop_id: shop.shopId, p_paused: false });
      const entry = await join(customer);
      await shop.owner.client.rpc("set_shop_queue_paused", { p_shop_id: shop.shopId, p_paused: true });

      const called = await shop.owner.client.rpc("call_next", { p_queue_id: entry.data!.queue_id });
      expect(rpcError(called)).toBeNull();
      expect(called.data!.status).toBe("called");

      await shop.owner.client.rpc("set_shop_queue_paused", { p_shop_id: shop.shopId, p_paused: false });
    });

    it("accepts joins again after resuming", async () => {
      await clearQueue();
      const result = await join(customer);
      expect(rpcError(result)).toBeNull();
    });
  });

  describe("rule 11: deactivated services cannot be selected", () => {
    it("rejects a disabled service", async () => {
      await clearQueue();
      const result = await join(customer, shop.inactiveServiceId);
      expect(rpcError(result)).toContain("SERVICE_UNAVAILABLE");
    });

    it("rejects a service belonging to another shop", async () => {
      await clearQueue();
      const other = await createShopFixture();
      try {
        const result = await join(customer, other.serviceId);
        expect(rpcError(result)).toContain("NOT_FOUND");
      } finally {
        await other.cleanup();
      }
    });
  });

  describe("rule 12: unavailable barbers cannot be selected", () => {
    it("rejects a barber who is on a break", async () => {
      await clearQueue();
      await admin.from("barbers").update({ availability: "on_break" }).eq("id", shop.barberId);
      const result = await join(customer, shop.serviceId, shop.barberId);
      expect(rpcError(result)).toContain("BARBER_UNAVAILABLE");
      await admin.from("barbers").update({ availability: "available" }).eq("id", shop.barberId);
    });

    it("rejects a deactivated barber", async () => {
      await clearQueue();
      await admin.from("barbers").update({ status: "inactive" }).eq("id", shop.barberId);
      const result = await join(customer, shop.serviceId, shop.barberId);
      expect(rpcError(result)).toContain("BARBER_UNAVAILABLE");
      await admin.from("barbers").update({ status: "active" }).eq("id", shop.barberId);
    });

    it("accepts an available barber", async () => {
      await clearQueue();
      const result = await join(customer, shop.serviceId, shop.barberId);
      expect(rpcError(result)).toBeNull();
    });
  });

  describe("rule 1: only approved shops are discoverable", () => {
    it("rejects joining a shop that is not approved", async () => {
      await clearQueue();
      const pending = await createShopFixture({ approved: false });
      try {
        const result = await customer.client.rpc("join_queue", { p_shop_id: pending.shopId, p_service_id: pending.serviceId });
        expect(rpcError(result)).toMatch(/SHOP_NOT_APPROVED|NOT_FOUND/);
      } finally {
        await pending.cleanup();
      }
    });
  });

  describe("rule 10: reviews require a completed visit", () => {
    async function completeVisit(user: TestUser) {
      await clearQueue();
      const entry = await user.client.rpc("join_queue", { p_shop_id: shop.shopId, p_service_id: shop.serviceId });
      await shop.owner.client.rpc("call_next", { p_queue_id: entry.data!.queue_id });
      await shop.owner.client.rpc("start_service", { p_entry_id: entry.data!.id });
      await shop.owner.client.rpc("complete_service", { p_entry_id: entry.data!.id });
      return entry.data!;
    }

    it("allows a review after a completed visit", async () => {
      const entry = await completeVisit(customer);
      const { error } = await customer.client.from("reviews").insert({
        user_id: customer.id,
        shop_id: shop.shopId,
        barber_id: entry.barber_id,
        queue_entry_id: entry.id,
        rating: 5,
        review: "Great cut",
      });
      expect(error).toBeNull();
    });

    it("updates the shop's rating and review count", async () => {
      const { data } = await admin.from("shops").select("rating, review_count").eq("id", shop.shopId).single();
      expect(data!.review_count).toBeGreaterThan(0);
      expect(Number(data!.rating)).toBeGreaterThan(0);
    });

    it("rejects a second review for the same visit", async () => {
      const { data: existing } = await admin.from("reviews").select("queue_entry_id").eq("user_id", customer.id).limit(1).single();
      const { error } = await customer.client.from("reviews").insert({
        user_id: customer.id,
        shop_id: shop.shopId,
        queue_entry_id: existing!.queue_entry_id,
        rating: 1,
        review: "Changed my mind",
      });
      expect(error).not.toBeNull();
    });

    it("rejects a review for a visit that is still waiting", async () => {
      await clearQueue();
      const entry = await join(otherCustomer);
      const { error } = await otherCustomer.client.from("reviews").insert({
        user_id: otherCustomer.id,
        shop_id: shop.shopId,
        queue_entry_id: entry.data!.id,
        rating: 5,
      });
      expect(error).not.toBeNull();
    });

    it("rejects a review for someone else's visit", async () => {
      const entry = await completeVisit(customer);
      const { error } = await otherCustomer.client.from("reviews").insert({
        user_id: otherCustomer.id,
        shop_id: shop.shopId,
        queue_entry_id: entry.id,
        rating: 5,
      });
      expect(error).not.toBeNull();
    });

    it("rejects a review with no visit attached", async () => {
      const { error } = await customer.client.from("reviews").insert({
        user_id: customer.id,
        shop_id: shop.shopId,
        queue_entry_id: null,
        rating: 5,
      });
      expect(error).not.toBeNull();
    });

    it("lists unreviewed completed visits for the customer", async () => {
      await completeVisit(otherCustomer);
      const { data } = await otherCustomer.client.rpc("get_my_reviewable_visits");
      const visits = data as unknown as { shop_id: string }[];
      expect(visits.length).toBeGreaterThan(0);
      expect(visits[0].shop_id).toBe(shop.shopId);
    });
  });

  describe("rule 13: the queue promotes the next customer correctly", () => {
    it("serves customers in order across cancellations", async () => {
      await clearQueue();
      const a = await join(customer);
      const b = await join(otherCustomer);
      const queueId = a.data!.queue_id;

      await customer.client.rpc("cancel_queue_entry", { p_entry_id: a.data!.id });
      const called = await shop.owner.client.rpc("call_next", { p_queue_id: queueId });
      expect(called.data!.token_number).toBe(b.data!.token_number);
    });

    it("notifies waiting customers as they move up", async () => {
      await clearQueue();
      const a = await join(customer);
      await join(otherCustomer);

      await shop.owner.client.rpc("call_next", { p_queue_id: a.data!.queue_id });
      const { data: notes } = await admin
        .from("notifications")
        .select("type")
        .eq("user_id", otherCustomer.id)
        .in("type", ["turn_approaching", "ahead_one", "ahead_two"]);
      expect((notes ?? []).length).toBeGreaterThan(0);
    });

    it("notifies the called customer that it is their turn", async () => {
      await clearQueue();
      const entry = await join(customer);
      await shop.owner.client.rpc("call_next", { p_queue_id: entry.data!.queue_id });

      const { data: notes } = await admin.from("notifications").select("type").eq("user_id", customer.id).eq("type", "your_turn");
      expect((notes ?? []).length).toBeGreaterThan(0);
    });

    it("notifies a customer when they join", async () => {
      await clearQueue();
      await join(customer);
      const { data: notes } = await admin.from("notifications").select("type").eq("user_id", customer.id).eq("type", "queue_joined");
      expect((notes ?? []).length).toBeGreaterThan(0);
    });
  });

  describe("shop live status", () => {
    it("reports open, waiting count and wait estimate", async () => {
      await clearQueue();
      await join(customer);
      const { data } = await customer.client.rpc("get_shop_live_status", { p_shop_id: shop.shopId });
      const status = data as unknown as { is_open: boolean; waiting_count: number; estimated_wait_minutes: number };

      expect(status.is_open).toBe(true);
      expect(status.waiting_count).toBe(1);
      expect(status.estimated_wait_minutes).toBe(30);
    });

    it("reports closed once the shop shuts", async () => {
      await setShop({ is_open: false });
      const { data } = await customer.client.rpc("get_shop_live_status", { p_shop_id: shop.shopId });
      expect((data as unknown as { is_open: boolean }).is_open).toBe(false);
      await setShop({ is_open: true });
    });
  });
});
