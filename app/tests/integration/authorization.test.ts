import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, anonClient, createShopFixture, createUser, deleteUsers, rpcError, type Fixture, type TestUser } from "./helpers";

/**
 * Verifies that authorization holds in the database itself: RLS policies,
 * ownership checks inside SECURITY DEFINER functions, and the guard triggers
 * that protect moderated columns. Nothing here relies on the UI or the server.
 */
describe("authorization and RLS", () => {
  let shopA: Fixture;
  let shopB: Fixture;
  let pendingShop: Fixture;
  let customer: TestUser;
  let otherCustomer: TestUser;
  let platformAdmin: TestUser;

  beforeAll(async () => {
    [shopA, shopB, pendingShop] = await Promise.all([
      createShopFixture(),
      createShopFixture(),
      createShopFixture({ approved: false, isOpen: false }),
    ]);
    [customer, otherCustomer, platformAdmin] = await Promise.all([
      createUser("customer", "RLS Customer"),
      createUser("customer", "Other Customer"),
      createUser("admin", "Platform Admin"),
    ]);
  }, 60_000);

  afterAll(async () => {
    await Promise.all([shopA.cleanup(), shopB.cleanup(), pendingShop.cleanup()]);
    await deleteUsers(customer, otherCustomer, platformAdmin);
  });

  describe("shop visibility", () => {
    it("shows approved shops to anonymous visitors", async () => {
      const { data } = await anonClient().from("shops").select("id").eq("id", shopA.shopId);
      expect(data).toHaveLength(1);
    });

    it("hides unapproved shops from the public", async () => {
      const { data } = await anonClient().from("shops").select("id").eq("id", pendingShop.shopId);
      expect(data).toHaveLength(0);
    });

    it("hides unapproved shops from other customers", async () => {
      const { data } = await customer.client.from("shops").select("id").eq("id", pendingShop.shopId);
      expect(data).toHaveLength(0);
    });

    it("shows an owner their own unapproved shop", async () => {
      const { data } = await pendingShop.owner.client.from("shops").select("id").eq("id", pendingShop.shopId);
      expect(data).toHaveLength(1);
    });

    it("excludes unapproved shops from public discovery", async () => {
      const { data } = await anonClient().rpc("list_public_shops", {});
      const ids = (data ?? []).map((s) => s.id);
      expect(ids).toContain(shopA.shopId);
      expect(ids).not.toContain(pendingShop.shopId);
    });
  });

  describe("shop ownership", () => {
    it("prevents an owner from editing another owner's shop", async () => {
      const { error, count } = await shopA.owner.client
        .from("shops")
        .update({ name: "Hijacked" }, { count: "exact" })
        .eq("id", shopB.shopId);
      expect(error).toBeNull();
      expect(count).toBe(0);

      const { data } = await admin.from("shops").select("name").eq("id", shopB.shopId).single();
      expect(data!.name).not.toBe("Hijacked");
    });

    it("lets an owner edit their own shop", async () => {
      const { error } = await shopA.owner.client.from("shops").update({ name: "Renamed Shop" }).eq("id", shopA.shopId);
      expect(error).toBeNull();
      const { data } = await admin.from("shops").select("name").eq("id", shopA.shopId).single();
      expect(data!.name).toBe("Renamed Shop");
    });

    it("blocks an owner from approving their own shop", async () => {
      const { error } = await pendingShop.owner.client.from("shops").update({ status: "approved" }).eq("id", pendingShop.shopId);
      expect(error?.message).toContain("FORBIDDEN");

      const { data } = await admin.from("shops").select("status").eq("id", pendingShop.shopId).single();
      expect(data!.status).toBe("pending");
    });

    it("blocks an owner from inflating their own rating", async () => {
      const { error } = await shopA.owner.client.from("shops").update({ rating: 5, review_count: 999 }).eq("id", shopA.shopId);
      expect(error?.message).toContain("FORBIDDEN");
    });

    it("blocks an owner from transferring ownership to someone else", async () => {
      const { error } = await shopA.owner.client.from("shops").update({ owner_id: customer.id }).eq("id", shopA.shopId);
      expect(error?.message).toContain("FORBIDDEN");
    });

    it("prevents adding barbers to a shop you don't own", async () => {
      const { error } = await shopA.owner.client.from("barbers").insert({ shop_id: shopB.shopId, name: "Intruder" });
      expect(error).not.toBeNull();
    });

    it("prevents editing another shop's services", async () => {
      const { count } = await shopA.owner.client
        .from("services")
        .update({ price: 1 }, { count: "exact" })
        .eq("id", shopB.serviceId);
      expect(count).toBe(0);
    });
  });

  describe("queue operations", () => {
    it("prevents a customer from calling the next customer", async () => {
      const entry = await customer.client.rpc("join_queue", { p_shop_id: shopA.shopId, p_service_id: shopA.serviceId });
      expect(rpcError(entry)).toBeNull();

      const called = await customer.client.rpc("call_next", { p_queue_id: entry.data!.queue_id });
      expect(rpcError(called)).toContain("FORBIDDEN");

      await customer.client.rpc("cancel_queue_entry", { p_entry_id: entry.data!.id });
    });

    it("prevents an owner from operating another shop's queue", async () => {
      const entry = await customer.client.rpc("join_queue", { p_shop_id: shopA.shopId, p_service_id: shopA.serviceId });
      const called = await shopB.owner.client.rpc("call_next", { p_queue_id: entry.data!.queue_id });
      expect(rpcError(called)).toContain("FORBIDDEN");

      await customer.client.rpc("cancel_queue_entry", { p_entry_id: entry.data!.id });
    });

    it("prevents a customer from cancelling someone else's entry", async () => {
      const entry = await customer.client.rpc("join_queue", { p_shop_id: shopA.shopId, p_service_id: shopA.serviceId });
      const cancelled = await otherCustomer.client.rpc("cancel_queue_entry", { p_entry_id: entry.data!.id });
      expect(rpcError(cancelled)).toMatch(/FORBIDDEN|NOT_FOUND/);

      const { data } = await admin.from("queue_entries").select("status").eq("id", entry.data!.id).single();
      expect(data!.status).toBe("waiting");

      await customer.client.rpc("cancel_queue_entry", { p_entry_id: entry.data!.id });
    });

    it("lets a shop owner cancel a waiting entry in their own queue", async () => {
      const entry = await customer.client.rpc("join_queue", { p_shop_id: shopA.shopId, p_service_id: shopA.serviceId });
      const cancelled = await shopA.owner.client.rpc("cancel_queue_entry", { p_entry_id: entry.data!.id });
      expect(cancelled.data!.status).toBe("cancelled");
    });

    it("hides other customers' queue entries", async () => {
      const entry = await customer.client.rpc("join_queue", { p_shop_id: shopA.shopId, p_service_id: shopA.serviceId });
      const { data } = await otherCustomer.client.from("queue_entries").select("id").eq("id", entry.data!.id);
      expect(data).toHaveLength(0);

      await customer.client.rpc("cancel_queue_entry", { p_entry_id: entry.data!.id });
    });

    it("blocks direct writes to queue_entries", async () => {
      const { data: queue } = await admin.from("queues").select("id, queue_date").eq("shop_id", shopA.shopId).limit(1).single();
      const { error } = await customer.client.from("queue_entries").insert({
        queue_id: queue!.id,
        shop_id: shopA.shopId,
        user_id: customer.id,
        service_id: shopA.serviceId,
        queue_date: queue!.queue_date,
        token_number: 9999,
        estimated_duration_minutes: 30,
      });
      expect(error).not.toBeNull();
    });

    it("blocks a customer from editing their own entry's status directly", async () => {
      const entry = await customer.client.rpc("join_queue", { p_shop_id: shopA.shopId, p_service_id: shopA.serviceId });
      const { count } = await customer.client
        .from("queue_entries")
        .update({ status: "completed" }, { count: "exact" })
        .eq("id", entry.data!.id);
      expect(count).toBe(0);

      const { data } = await admin.from("queue_entries").select("status").eq("id", entry.data!.id).single();
      expect(data!.status).toBe("waiting");

      await customer.client.rpc("cancel_queue_entry", { p_entry_id: entry.data!.id });
    });

    it("hides the staff queue board from customers", async () => {
      const board = await customer.client.rpc("get_shop_queue_board", { p_shop_id: shopA.shopId });
      expect(rpcError(board)).toContain("FORBIDDEN");
    });

    it("gives the owner a board including customer names", async () => {
      const entry = await customer.client.rpc("join_queue", { p_shop_id: shopA.shopId, p_service_id: shopA.serviceId });
      const board = await shopA.owner.client.rpc("get_shop_queue_board", { p_shop_id: shopA.shopId });
      expect(rpcError(board)).toBeNull();
      expect(JSON.stringify(board.data)).toContain("RLS Customer");

      await customer.client.rpc("cancel_queue_entry", { p_entry_id: entry.data!.id });
    });
  });

  describe("profiles and notifications", () => {
    it("hides other users' profiles", async () => {
      const { data } = await customer.client.from("users").select("id").eq("id", otherCustomer.id);
      expect(data).toHaveLength(0);
    });

    it("blocks self-promotion to admin", async () => {
      const { error } = await customer.client.from("users").update({ role: "admin" }).eq("id", customer.id);
      expect(error?.message).toContain("FORBIDDEN");

      const { data } = await admin.from("users").select("role").eq("id", customer.id).single();
      expect(data!.role).toBe("customer");
    });

    it("blocks a deactivated user from reactivating themselves", async () => {
      const victim = await createUser("customer", "Suspended User");
      try {
        await admin.from("users").update({ is_active: false }).eq("id", victim.id);

        const { error } = await victim.client.from("users").update({ is_active: true }).eq("id", victim.id);
        expect(error?.message).toContain("FORBIDDEN");

        const { data } = await admin.from("users").select("is_active").eq("id", victim.id).single();
        expect(data!.is_active).toBe(false);
      } finally {
        await deleteUsers(victim);
      }
    });

    it("allows editing your own name", async () => {
      const { error } = await customer.client.from("users").update({ name: "Renamed Customer" }).eq("id", customer.id);
      expect(error).toBeNull();
    });

    it("hides other users' notifications", async () => {
      await admin.from("notifications").insert({ user_id: otherCustomer.id, title: "Private", message: "Secret", type: "system" });
      const { data } = await customer.client.from("notifications").select("id").eq("user_id", otherCustomer.id);
      expect(data).toHaveLength(0);
    });
  });

  describe("admin capabilities", () => {
    it("blocks non-admins from the admin statistics", async () => {
      const { data } = await customer.client.rpc("admin_stats");
      expect(data).toBeNull();
    });

    it("blocks non-admins from changing shop status", async () => {
      const result = await customer.client.rpc("admin_set_shop_status", { p_shop_id: pendingShop.shopId, p_status: "approved" });
      expect(rpcError(result)).toContain("FORBIDDEN");
    });

    it("lets an admin approve a shop and notifies the owner", async () => {
      const result = await platformAdmin.client.rpc("admin_set_shop_status", { p_shop_id: pendingShop.shopId, p_status: "approved" });
      expect(rpcError(result)).toBeNull();
      expect(result.data!.status).toBe("approved");
      expect(result.data!.approved_at).not.toBeNull();

      const { data: notes } = await admin
        .from("notifications")
        .select("type")
        .eq("user_id", pendingShop.owner.id)
        .eq("type", "shop_approved");
      expect((notes ?? []).length).toBeGreaterThan(0);
    });

    it("lets an admin suspend a shop, which closes and hides it", async () => {
      const result = await platformAdmin.client.rpc("admin_set_shop_status", {
        p_shop_id: pendingShop.shopId,
        p_status: "suspended",
        p_reason: "Policy violation",
      });
      expect(result.data!.status).toBe("suspended");
      expect(result.data!.is_open).toBe(false);

      const { data } = await anonClient().from("shops").select("id").eq("id", pendingShop.shopId);
      expect(data).toHaveLength(0);
    });

    it("gives an admin platform-wide statistics", async () => {
      const { data } = await platformAdmin.client.rpc("admin_stats");
      const stats = data as unknown as { total_shops: number; total_users: number };
      expect(stats.total_shops).toBeGreaterThan(0);
      expect(stats.total_users).toBeGreaterThan(0);
    });
  });

  describe("anonymous access", () => {
    it("cannot join a queue", async () => {
      const result = await anonClient().rpc("join_queue", { p_shop_id: shopA.shopId, p_service_id: shopA.serviceId });
      expect(result.error).not.toBeNull();
    });

    it("cannot read queue entries", async () => {
      const { data, error } = await anonClient().from("queue_entries").select("id").limit(1);
      expect(error ?? data).toBeTruthy();
      if (!error) expect(data).toHaveLength(0);
    });

    it("can read the public queue snapshot", async () => {
      const { data: queue } = await admin.from("queues").select("id").eq("shop_id", shopA.shopId).limit(1).single();
      const { data, error } = await anonClient().rpc("get_queue_snapshot", { p_queue_id: queue!.id });
      expect(error).toBeNull();
      expect(data).not.toBeNull();
    });
  });
});
