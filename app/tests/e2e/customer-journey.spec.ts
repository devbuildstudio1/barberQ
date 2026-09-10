import { expect, test } from "@playwright/test";
import { DEMO, STATE, admin, clearCustomerEntries, joinQueue, resetDemoQueue } from "./fixtures";

test.describe("customer journey", () => {
  test.use({ storageState: STATE.customer });

  test.beforeEach(async () => {
    await resetDemoQueue();
    await clearCustomerEntries(DEMO.freeCustomerPhone);
  });

  test("discovers a shop, joins the queue and receives a live token", async ({ page }) => {
    await page.goto("/shops");
    await expect(page.getByRole("heading", { name: "Find a barber" })).toBeVisible();

    await page.locator("input#shops-q").fill(DEMO.shopName);
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: DEMO.shopName })).toBeVisible();

    await page.getByRole("link", { name: DEMO.shopName }).first().click();
    await page.waitForURL(/\/shops\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { name: DEMO.shopName, level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: /services & prices/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /^barbers$/i, level: 2 })).toBeVisible();

    await page.getByRole("link", { name: /join queue/i }).first().click();
    await page.waitForURL(/\/join$/);

    await page.getByRole("button", { name: /any available barber/i }).click();
    await page.getByRole("button", { name: /continue/i }).click();
    await page.getByRole("button", { name: /haircut/i }).first().click();
    await page.getByRole("button", { name: /review & join/i }).click();
    await expect(page.getByRole("heading", { name: /confirm your spot/i })).toBeVisible();
    await page.getByRole("button", { name: /^join queue$/i }).click();

    await page.waitForURL(/\/my-queue/);
    await expect(page.getByText("Your queue")).toBeVisible();
    await expect(page.getByText(/^A-\d+$/).first()).toBeVisible();
    await expect(page.getByText("People ahead")).toBeVisible();
    await expect(page.getByText("Estimated wait")).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "Live" }).first()).toBeVisible();
  });

  test("prevents joining the same shop twice on one day", async ({ page }) => {
    await joinQueue(page);
    // Returning to the join page sends the customer straight back to their token.
    await page.goto(`/shops/${DEMO.shopId}/join`);
    await expect(page).toHaveURL(/\/my-queue/);
    await expect(page.getByText(/^A-\d+$/).first()).toBeVisible();
  });

  test("lets a customer leave the queue", async ({ page }) => {
    await joinQueue(page);
    await page.getByRole("button", { name: /leave queue/i }).click();
    await page.getByRole("button", { name: /^leave queue$/i }).last().click();
    await expect(page.getByText("Your queue is empty.")).toBeVisible();
  });

  test("shows a closed shop instead of the join form", async ({ page }) => {
    await admin.from("shops").update({ is_open: false }).eq("id", DEMO.shopId);
    try {
      await page.goto(`/shops/${DEMO.shopId}/join`);
      await expect(page.getByText("This shop is currently closed.")).toBeVisible();
    } finally {
      await admin.from("shops").update({ is_open: true }).eq("id", DEMO.shopId);
    }
  });

  test("shows a paused queue instead of the join form", async ({ page }) => {
    await admin.from("shops").update({ queue_paused: true }).eq("id", DEMO.shopId);
    try {
      await page.goto(`/shops/${DEMO.shopId}/join`);
      await expect(page.getByText("Queue temporarily paused.")).toBeVisible();
    } finally {
      await admin.from("shops").update({ queue_paused: false }).eq("id", DEMO.shopId);
    }
  });

  test("filters and sorts the shop list", async ({ page }) => {
    await page.goto("/shops");
    await page.getByRole("button", { name: /open now/i }).click();
    await expect(page).toHaveURL(/open=true/);

    await page.getByLabel("Sort").selectOption("rating");
    await expect(page).toHaveURL(/sort=rating/);
    await expect(page.getByRole("listitem").first()).toBeVisible();
  });

  test("shows notifications for queue activity", async ({ page }) => {
    await joinQueue(page);
    await page.goto("/notifications");
    await expect(page.getByText("You're in the queue").first()).toBeVisible();
  });
});

test.describe("signed-out visitor", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("can browse shops but is sent to login before joining", async ({ page }) => {
    await page.goto("/shops");
    await expect(page.getByRole("heading", { name: "Find a barber" })).toBeVisible();

    await page.goto(`/shops/${DEMO.shopId}/join`);
    await expect(page).toHaveURL(/\/login\?next=/);
  });

  test("sees the landing page call to action", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /no more waiting/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /find a barber/i })).toBeVisible();
  });

  test("cannot reach the customer queue screen", async ({ page }) => {
    await page.goto("/my-queue");
    await expect(page).toHaveURL(/\/login\?next=/);
  });
});
