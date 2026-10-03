import { test, expect } from "@playwright/test";
test("create event, reserve place, persist reference and cancel", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Create an event" }).click();
  const title = "Demo browser event " + Date.now();
  await page.getByLabel("Event title").fill(title);
  await page.getByLabel("Date", { exact: true }).fill("2099-02-01");
  await page.getByLabel("Capacity", { exact: true }).fill("2");
  await page.getByLabel("Fictional venue").fill("Demo venue");
  await page
    .getByLabel("Description", { exact: true })
    .fill("A fictional browser test.");
  await page.getByRole("button", { name: "Create event", exact: true }).click();
  await page.getByLabel("Search events").fill(title);
  const card = page.locator(".event-card").filter({ hasText: title });
  await card.getByRole("button", { name: "Reserve a place" }).click();
  await page.getByLabel("Fictional alias").fill("Demo Browser");
  await page.getByRole("button", { name: "Confirm reservation" }).click();
  await expect(
    page.getByText("Your demo reservation is saved."),
  ).toBeAttached();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: /My reservations/ }).click();
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Cancel reservation", exact: true })
    .click();
  await page.getByRole("button", { name: "Confirm cancellation" }).click();
  await expect(page.getByText("A seat is waiting for you.")).toBeVisible();
});
test("unavailable API has a retry path", async ({ page }) => {
  await page.route("**/api/events", (r) =>
    r.fulfill({ status: 503, json: { error: "Demo service unavailable" } }),
  );
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("unavailable");
  await page.unroute("**/api/events");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.locator(".event-card").first()).toBeVisible();
});
test("search empty state and mobile layout", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".event-card").first()).toBeVisible();
  await page.getByLabel("Search events").fill("impossible-title-not-here");
  await expect(page.getByText("No events in this view.")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
