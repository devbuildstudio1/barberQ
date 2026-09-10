import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, appToday, createShopFixture, createUser, deleteUsers, rpcError, type Fixture, type TestUser } from "./helpers";

/**
 * Exercises the queue engine against a real Postgres instance: token
 * allocation, the state machine, concurrency and the business rules that only
 * the database can enforce.
 */
describe("queue engine", () => {
  let fx: Fixture;
  let customers: TestUser[];

  beforeAll(async () => {
    fx = await createShopFixture();
    customers = await Promise.all([
      createUser("customer", "Customer One"),
      createUser("customer", "Customer Two"),
      createUser("customer", "Customer Three"),
      createUser("customer", "Customer Four"),
      createUser("customer", "Customer Five"),
    ]);
  }, 60_000);

  afterAll(async () => {
    await fx.cleanup();
    await deleteUsers(...customers);
  });

  async function join(user: TestUser, serviceId = fx.serviceId, barberId: string | null = null) {
    return user.client.rpc("join_queue", { p_shop_id: fx.shopId, p_service_id: serviceId, p_barber_id: barberId ?? undefined });
  }

  async function clearQueue() {
    await admin.from("queue_entries").delete().eq("shop_id", fx.shopId);
    await admin.from("queues").update({ last_token_number: 0, current_token: null }).eq("shop_id", fx.shopId);
  }

  describe("token generation", () => {
    it("issues sequential tokens starting at 1", async () => {
      await clearQueue();
      const first = await join(customers[0]);
      const second = await join(customers[1]);
      expect(rpcError(first)).toBeNull();
      expect(first.data!.token_number).toBe(1);
      expect(second.data!.token_number).toBe(2);
      expect(first.data!.status).toBe("waiting");
      expect(first.data!.queue_date).toBe(appToday());
    });

    it("records the service duration on the entry so estimates survive price changes", async () => {
      await clearQueue();
      const entry = await join(customers[0], fx.shortServiceId);
      expect(entry.data!.estimated_duration_minutes).toBe(15);
    });

    it("keeps a separate token series per barber", async () => {
      await clearQueue();
      const anyBarber = await join(customers[0]);
      const specific = await join(customers[1], fx.serviceId, fx.barberId);
      expect(anyBarber.data!.token_number).toBe(1);
      expect(specific.data!.token_number).toBe(1);
      expect(specific.data!.queue_id).not.toBe(anyBarber.data!.queue_id);

      const { data: queues } = await admin.from("queues").select("token_prefix, barber_id").eq("shop_id", fx.shopId).eq("queue_date", appToday());
      const prefixes = (queues ?? []).map((q) => q.token_prefix).sort();
      expect(new Set(prefixes).size).toBe(prefixes.length);
    });
  });

  describe("duplicate prevention", () => {
    it("rejects a second active entry at the same shop on the same day", async () => {
      await clearQueue();
      await join(customers[0]);
      const again = await join(customers[0]);
      expect(rpcError(again)).toContain("ALREADY_IN_QUEUE");
    });

    it("rejects a duplicate even for a different barber queue at the same shop", async () => {
      await clearQueue();
      await join(customers[0]);
      const again = await join(customers[0], fx.serviceId, fx.barberId);
      expect(rpcError(again)).toContain("ALREADY_IN_QUEUE");
    });

    it("allows re-joining after cancelling", async () => {
      await clearQueue();
      const first = await join(customers[0]);
      const cancelled = await customers[0].client.rpc("cancel_queue_entry", { p_entry_id: first.data!.id });
      expect(cancelled.data!.status).toBe("cancelled");

      const second = await join(customers[0]);
      expect(rpcError(second)).toBeNull();
      expect(second.data!.token_number).toBeGreaterThan(first.data!.token_number);
    });

    it("allows re-joining after being marked no-show", async () => {
      await clearQueue();
      const first = await join(customers[0]);
      await fx.owner.client.rpc("mark_no_show", { p_entry_id: first.data!.id });
      const second = await join(customers[0]);
      expect(rpcError(second)).toBeNull();
    });

    it("does not block a different customer", async () => {
      await clearQueue();
      await join(customers[0]);
      const other = await join(customers[1]);
      expect(rpcError(other)).toBeNull();
    });
  });

  describe("state machine", () => {
    it("runs waiting -> called -> serving -> completed", async () => {
      await clearQueue();
      const entry = await join(customers[0]);
      const queueId = entry.data!.queue_id;

      const called = await fx.owner.client.rpc("call_next", { p_queue_id: queueId });
      expect(called.data!.status).toBe("called");
      expect(called.data!.called_at).not.toBeNull();

      const started = await fx.owner.client.rpc("start_service", { p_entry_id: entry.data!.id });
      expect(started.data!.status).toBe("serving");
      expect(started.data!.started_at).not.toBeNull();

      const completed = await fx.owner.client.rpc("complete_service", { p_entry_id: entry.data!.id });
      expect(completed.data!.status).toBe("completed");
      expect(completed.data!.completed_at).not.toBeNull();
    });

    it("updates the queue's current token when a customer is called", async () => {
      await clearQueue();
      const entry = await join(customers[0]);
      await fx.owner.client.rpc("call_next", { p_queue_id: entry.data!.queue_id });
      const { data: queue } = await admin.from("queues").select("current_token").eq("id", entry.data!.queue_id).single();
      expect(queue!.current_token).toBe(entry.data!.token_number);
    });

    it("rejects start before the customer is called", async () => {
      await clearQueue();
      const entry = await join(customers[0]);
      const started = await fx.owner.client.rpc("start_service", { p_entry_id: entry.data!.id });
      expect(rpcError(started)).toContain("INVALID_QUEUE_STATE");
    });

    it("rejects complete before service starts", async () => {
      await clearQueue();
      const entry = await join(customers[0]);
      await fx.owner.client.rpc("call_next", { p_queue_id: entry.data!.queue_id });
      const completed = await fx.owner.client.rpc("complete_service", { p_entry_id: entry.data!.id });
      expect(rpcError(completed)).toContain("INVALID_QUEUE_STATE");
    });

    it("rejects cancelling an entry that is already being served", async () => {
      await clearQueue();
      const entry = await join(customers[0]);
      await fx.owner.client.rpc("call_next", { p_queue_id: entry.data!.queue_id });
      await fx.owner.client.rpc("start_service", { p_entry_id: entry.data!.id });
      const cancelled = await customers[0].client.rpc("cancel_queue_entry", { p_entry_id: entry.data!.id });
      expect(rpcError(cancelled)).toContain("INVALID_QUEUE_STATE");
    });

    it("rejects any transition out of a completed entry", async () => {
      await clearQueue();
      const entry = await join(customers[0]);
      await fx.owner.client.rpc("call_next", { p_queue_id: entry.data!.queue_id });
      await fx.owner.client.rpc("start_service", { p_entry_id: entry.data!.id });
      await fx.owner.client.rpc("complete_service", { p_entry_id: entry.data!.id });

      expect(rpcError(await fx.owner.client.rpc("start_service", { p_entry_id: entry.data!.id }))).toContain("INVALID_QUEUE_STATE");
      expect(rpcError(await fx.owner.client.rpc("complete_service", { p_entry_id: entry.data!.id }))).toContain("INVALID_QUEUE_STATE");
      expect(rpcError(await fx.owner.client.rpc("mark_no_show", { p_entry_id: entry.data!.id }))).toContain("INVALID_QUEUE_STATE");
      expect(rpcError(await customers[0].client.rpc("cancel_queue_entry", { p_entry_id: entry.data!.id }))).toContain("INVALID_QUEUE_STATE");
    });

    it("marks a called customer as no-show and frees the chair", async () => {
      await clearQueue();
      const first = await join(customers[0]);
      const second = await join(customers[1]);
      await fx.owner.client.rpc("call_next", { p_queue_id: first.data!.queue_id });

      const noShow = await fx.owner.client.rpc("mark_no_show", { p_entry_id: first.data!.id });
      expect(noShow.data!.status).toBe("no_show");

      const next = await fx.owner.client.rpc("call_next", { p_queue_id: first.data!.queue_id });
      expect(next.data!.token_number).toBe(second.data!.token_number);
    });

    it("calls waiting customers in token order", async () => {
      await clearQueue();
      const a = await join(customers[0]);
      const b = await join(customers[1]);
      const c = await join(customers[2]);
      const queueId = a.data!.queue_id;

      for (const expected of [a, b, c]) {
        const called = await fx.owner.client.rpc("call_next", { p_queue_id: queueId });
        expect(called.data!.token_number).toBe(expected.data!.token_number);
        await fx.owner.client.rpc("start_service", { p_entry_id: called.data!.id });
        await fx.owner.client.rpc("complete_service", { p_entry_id: called.data!.id });
      }
    });

    it("refuses to call next while someone is already called or serving", async () => {
      await clearQueue();
      const a = await join(customers[0]);
      await join(customers[1]);
      await fx.owner.client.rpc("call_next", { p_queue_id: a.data!.queue_id });

      const second = await fx.owner.client.rpc("call_next", { p_queue_id: a.data!.queue_id });
      expect(rpcError(second)).toContain("INVALID_QUEUE_STATE");
    });

    it("reports NOT_FOUND when the queue is empty", async () => {
      await clearQueue();
      const { data: queue } = await admin.from("queues").select("id").eq("shop_id", fx.shopId).is("barber_id", null).eq("queue_date", appToday()).maybeSingle();
      if (!queue) return;
      const called = await fx.owner.client.rpc("call_next", { p_queue_id: queue.id });
      expect(rpcError(called)).toContain("NOT_FOUND");
    });
  });

  describe("concurrency", () => {
    it("gives every simultaneous joiner a unique token", async () => {
      await clearQueue();
      const results = await Promise.all(customers.map((c) => join(c)));
      const tokens = results.filter((r) => !r.error).map((r) => r.data!.token_number);

      expect(tokens).toHaveLength(customers.length);
      expect(new Set(tokens).size).toBe(tokens.length);
      expect([...tokens].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
    });

    it("lets only one of several simultaneous joins by the same customer through", async () => {
      await clearQueue();
      const attempts = await Promise.all([join(customers[0]), join(customers[0]), join(customers[0])]);
      const succeeded = attempts.filter((a) => !a.error);
      const failed = attempts.filter((a) => a.error);

      expect(succeeded).toHaveLength(1);
      expect(failed).toHaveLength(2);
      for (const f of failed) expect(f.error!.message).toMatch(/ALREADY_IN_QUEUE|CONFLICT|duplicate/i);
    });

    it("lets only one of two simultaneous call-next operations succeed", async () => {
      await clearQueue();
      const a = await join(customers[0]);
      await join(customers[1]);
      const queueId = a.data!.queue_id;

      const [first, second] = await Promise.all([
        fx.owner.client.rpc("call_next", { p_queue_id: queueId }),
        fx.owner.client.rpc("call_next", { p_queue_id: queueId }),
      ]);
      const ok = [first, second].filter((r) => !r.error);
      expect(ok).toHaveLength(1);

      const { count } = await admin
        .from("queue_entries")
        .select("id", { count: "exact", head: true })
        .eq("queue_id", queueId)
        .in("status", ["called", "serving"]);
      expect(count).toBe(1);
    });

    it("keeps the waiting counter consistent under parallel joins and cancels", async () => {
      await clearQueue();
      const joined = await Promise.all(customers.map((c) => join(c)));
      await Promise.all(joined.slice(0, 2).map((j, i) => customers[i].client.rpc("cancel_queue_entry", { p_entry_id: j.data!.id })));

      const queueId = joined[0].data!.queue_id;
      const { count } = await admin.from("queue_entries").select("id", { count: "exact", head: true }).eq("queue_id", queueId).eq("status", "waiting");
      const { data: queue } = await admin.from("queues").select("waiting_count").eq("id", queueId).single();
      expect(queue!.waiting_count).toBe(count);
    });
  });

  describe("wait-time estimation", () => {
    it("returns zero for an empty queue", async () => {
      await clearQueue();
      const { data: queue } = await admin.from("queues").select("id").eq("shop_id", fx.shopId).is("barber_id", null).eq("queue_date", appToday()).maybeSingle();
      if (!queue) return;
      const { data } = await fx.owner.client.rpc("estimate_wait_minutes", { p_queue_id: queue.id });
      expect(data).toBe(0);
    });

    it("sums the durations of everyone ahead", async () => {
      await clearQueue();
      // 30 + 15 + 30 minutes queued; the barber-specific queue is untouched.
      const a = await join(customers[0], fx.serviceId);
      await join(customers[1], fx.shortServiceId);
      await join(customers[2], fx.serviceId);

      const { data: total } = await fx.owner.client.rpc("estimate_wait_minutes", { p_queue_id: a.data!.queue_id });
      expect(total).toBe(75);
    });

    it("counts only the customers ahead of a given token", async () => {
      await clearQueue();
      const a = await join(customers[0], fx.serviceId);
      const b = await join(customers[1], fx.shortServiceId);
      const c = await join(customers[2], fx.serviceId);

      const ahead = async (token: number) =>
        (await fx.owner.client.rpc("estimate_wait_minutes", { p_queue_id: a.data!.queue_id, p_before_token: token })).data;

      expect(await ahead(a.data!.token_number)).toBe(0);
      expect(await ahead(b.data!.token_number)).toBe(30);
      expect(await ahead(c.data!.token_number)).toBe(45);
    });

    it("shrinks as customers ahead are completed", async () => {
      await clearQueue();
      const a = await join(customers[0], fx.serviceId);
      const b = await join(customers[1], fx.serviceId);
      const queueId = a.data!.queue_id;

      const before = (await fx.owner.client.rpc("estimate_wait_minutes", { p_queue_id: queueId, p_before_token: b.data!.token_number })).data!;
      await fx.owner.client.rpc("call_next", { p_queue_id: queueId });
      await fx.owner.client.rpc("start_service", { p_entry_id: a.data!.id });
      await fx.owner.client.rpc("complete_service", { p_entry_id: a.data!.id });
      const after = (await fx.owner.client.rpc("estimate_wait_minutes", { p_queue_id: queueId, p_before_token: b.data!.token_number })).data!;

      expect(after).toBeLessThan(before);
      expect(after).toBe(0);
    });

    it("ignores cancelled and no-show entries", async () => {
      await clearQueue();
      const a = await join(customers[0], fx.serviceId);
      const b = await join(customers[1], fx.serviceId);
      const c = await join(customers[2], fx.serviceId);
      await customers[1].client.rpc("cancel_queue_entry", { p_entry_id: b.data!.id });

      const wait = (await fx.owner.client.rpc("estimate_wait_minutes", { p_queue_id: a.data!.queue_id, p_before_token: c.data!.token_number })).data;
      expect(wait).toBe(30);
    });
  });

  describe("customer-facing read model", () => {
    it("reports position, people ahead and the current token", async () => {
      await clearQueue();
      await join(customers[0]);
      await join(customers[1]);
      const third = await join(customers[2]);

      const { data } = await customers[2].client.rpc("get_my_active_queue_entry");
      const payload = data as unknown as { people_ahead: number; entry: { token_number: number }; estimated_wait_minutes: number };
      expect(payload.people_ahead).toBe(2);
      expect(payload.entry.token_number).toBe(third.data!.token_number);
      expect(payload.estimated_wait_minutes).toBe(60);
    });

    it("drops people ahead as the queue advances", async () => {
      await clearQueue();
      const a = await join(customers[0]);
      await join(customers[1]);
      const queueId = a.data!.queue_id;

      const before = (await customers[1].client.rpc("get_my_active_queue_entry")).data as unknown as { people_ahead: number };
      expect(before.people_ahead).toBe(1);

      await fx.owner.client.rpc("call_next", { p_queue_id: queueId });
      await fx.owner.client.rpc("start_service", { p_entry_id: a.data!.id });
      await fx.owner.client.rpc("complete_service", { p_entry_id: a.data!.id });

      const after = (await customers[1].client.rpc("get_my_active_queue_entry")).data as unknown as { people_ahead: number };
      expect(after.people_ahead).toBe(0);
    });

    it("returns null once the customer has no active entry", async () => {
      await clearQueue();
      const { data } = await customers[4].client.rpc("get_my_active_queue_entry");
      expect(data).toBeNull();
    });

    it("exposes a public snapshot without personal data", async () => {
      await clearQueue();
      const entry = await join(customers[0]);
      const { data } = await customers[1].client.rpc("get_queue_snapshot", { p_queue_id: entry.data!.queue_id });
      const snapshot = data as unknown as Record<string, unknown>;

      expect(snapshot.waiting_count).toBe(1);
      expect(JSON.stringify(snapshot)).not.toContain(customers[0].id);
      expect(JSON.stringify(snapshot)).not.toContain("Customer One");
    });
  });
});
