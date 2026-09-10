import { expect, test } from "@playwright/test";
import { DEMO, STATE, admin, clearCustomerEntries, joinQueue, resetDemoQueue } from "./fixtures";

test.describe("shop owner", () => {
  test.use({ storageState: STATE.owner });

  test.beforeEach(async () => {
    await resetDemoQueue();
    await clearCustomerEntries(DEMO.freeCustomerPhone);
  });

  test("runs a customer through the queue while the customer watches live", async ({ browser, page }) => {
    const customerContext = await browser.newContext({ storageState: STATE.customer });
    const customerPage = await customerContext.newPage();

    try {
      await joinQueue(customerPage);
      await expect(customerPage.getByText("You're in line")).toBeVisible();

      await page.goto("/shop/queue");
      await expect(page.getByRole("heading", { name: /today's queue/i, level: 2 })).toBeVisible();
      await page.getByRole("button", { name: /call next/i }).click();

      // No reload: the customer screen updates over the realtime channel.
      await expect(customerPage.locator("#main").getByText("It's your turn!")).toBeVisible({ timeout: 25_000 });

      await page.getByRole("button", { name: /start service/i }).click();
      await expect(customerPage.locator("#main").getByText("In the chair")).toBeVisible({ timeout: 25_000 });

      await page.getByRole("button", { name: /^complete$/i }).click();
      await expect(customerPage.locator("#main").getByText("Your queue is empty.")).toBeVisible({ timeout: 25_000 });
    } finally {
      await customerContext.close();
    }
  });

  test("marks a waiting customer as a no-show", async ({ browser, page }) => {
    const customerContext = await browser.newContext({ storageState: STATE.customer });
    const customerPage = await customerContext.newPage();

    try {
      await joinQueue(customerPage);

      await page.goto("/shop/queue");
      await page.getByRole("button", { name: /mark token .* as no show/i }).first().click();
      await page.getByRole("button", { name: /mark no-show/i }).click();

      await expect(customerPage.locator("#main").getByText("Your queue is empty.")).toBeVisible({ timeout: 25_000 });
    } finally {
      await customerContext.close();
    }
  });

  test("pauses and resumes the queue", async ({ page }) => {
    await page.goto("/shop/queue");

    await page.getByRole("button", { name: /^pause queue$/i }).first().click();
    await expect(page.getByText("Queue is paused")).toBeVisible();

    await page.getByRole("button", { name: /resume queue/i }).first().click();
    await expect(page.getByText("Queue is paused")).toBeHidden();
  });

  test("adds a service and shows it with INR pricing", async ({ page }) => {
    const name = `E2E Service ${Date.now()}`;
    await page.goto("/shop/services");

    await page.getByRole("button", { name: /add service/i }).click();
    await page.locator("input#svc-name").fill(name);
    await page.locator("input#svc-price").fill("199");
    await page.locator("input#svc-duration").fill("25");
    await page.getByRole("button", { name: /^add service$/i }).last().click();

    try {
      await expect(page.getByText(name).first()).toBeVisible();
      await expect(page.getByText("₹199").first()).toBeVisible();
    } finally {
      await admin.from("services").delete().eq("name", name);
    }
  });

  test("rejects an invalid service", async ({ page }) => {
    await page.goto("/shop/services");

    await page.getByRole("button", { name: /add service/i }).click();
    await page.locator("input#svc-name").fill("X");
    await page.locator("input#svc-price").fill("-5");
    await page.getByRole("button", { name: /^add service$/i }).last().click();

    await expect(page.getByText(/service name is too short/i)).toBeVisible();
  });

  test("adds a barber", async ({ page }) => {
    const name = `E2E Barber ${Date.now()}`;
    await page.goto("/shop/barbers");

    await page.getByRole("button", { name: /add barber/i }).first().click();
    const dialog = page.getByRole("dialog", { name: /add barber/i });
    await expect(dialog).toBeVisible();
    await page.locator("input#barber-name").fill(name);
    await page.locator("input#barber-exp").fill("7");
    // Activated from the keyboard: it verifies the accessible path and avoids a
    // hit-testing quirk of mobile emulation on a full-height modal.
    const submit = dialog.getByRole("button", { name: /^add barber$/i });
    await submit.focus();
    await submit.press("Enter");

    try {
      await expect(page.getByText(name, { exact: true })).toBeVisible({ timeout: 20_000 });
    } finally {
      await admin.from("barbers").delete().eq("name", name);
    }
  });

  test("shows the dashboard overview", async ({ page }) => {
    await page.goto("/shop/dashboard");
    await expect(page.getByText("Waiting now")).toBeVisible();
    await expect(page.getByText("Completed today")).toBeVisible();
    await expect(page.getByRole("heading", { name: DEMO.shopName })).toBeVisible();
  });

  test("cannot reach the admin console", async ({ page }) => {
    await page.goto("/admin/dashboard");
    await expect(page).toHaveURL(/localhost:3000\/$/);
  });
});

test.describe("customer cannot use staff tools", () => {
  test.use({ storageState: STATE.customer });

  test("is redirected away from the shop dashboard", async ({ page }) => {
    await page.goto("/shop/dashboard");
    await expect(page).toHaveURL(/localhost:3000\/$/);
  });

  test("is redirected away from the admin console", async ({ page }) => {
    await page.goto("/admin/dashboard");
    await expect(page).toHaveURL(/localhost:3000\/$/);
  });
});

test.describe("admin", () => {
  test.use({ storageState: STATE.admin });

  test("approves a pending shop, making it publicly discoverable", async ({ page }) => {
    const name = `E2E Pending Shop ${Date.now()}`;
    const { data: owner } = await admin.from("users").select("id").eq("role", "shop_owner").limit(1).single();
    const { data: shop } = await admin
      .from("shops")
      .insert({ owner_id: owner!.id, name, address: "9 Test Street", city: "Chennai", status: "pending" })
      .select("id")
      .single();

    try {
      await page.goto("/admin/shops?status=pending");
      const row = page.locator("tr", { hasText: name });
      await expect(row).toBeVisible();

      await row.getByRole("button", { name: /approve/i }).click();
      await page.getByRole("button", { name: /^approve$/i }).last().click();

      await expect(page.locator("tr", { hasText: name })).toBeHidden({ timeout: 20_000 });
      const { data: updated } = await admin.from("shops").select("status, approved_at").eq("id", shop!.id).single();
      expect(updated!.status).toBe("approved");
      expect(updated!.approved_at).not.toBeNull();
    } finally {
      await admin.from("shops").delete().eq("id", shop!.id);
    }
  });

  test("shows platform metrics", async ({ page }) => {
    await page.goto("/admin/dashboard");
    const main = page.locator("#main");
    await expect(main.getByText("Users").first()).toBeVisible();
    await expect(main.getByText("Active queues")).toBeVisible();
    await expect(main.getByText("Completed services")).toBeVisible();
  });

  test("lists users, barbers, queues and reviews", async ({ page }) => {
    for (const [path, heading] of [
      ["/admin/users", /users/i],
      ["/admin/barbers", /barbers/i],
      ["/admin/queues", /queues/i],
      ["/admin/reviews", /reviews/i],
      ["/admin/reports", /reports/i],
    ] as const) {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible();
    }
  });
});
