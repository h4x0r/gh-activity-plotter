import { expect, test } from "@playwright/test";
import { mockInkblotApi } from "./fixtures";

// Regression guard for a WebKit-only crash. Dragging the time-range slider fires
// the explorer's URL-sync effect on every tick. WebKit throws a SecurityError
// after >100 history.replaceState() calls within 10s; thrown uncaught inside the
// effect (no error boundary), it tore the whole explorer down to Safari's
// "This page couldn't load" page. The URL sync must be debounced + guarded so a
// rapid drag can never crash the app.
//
// Chromium only *warns* on the same limit, so this spec runs under the dedicated
// `webkit` project (see playwright.config.ts) — chromium would pass while the
// real bug shipped.
test("rapid time-range dragging never crashes the explorer", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));

  await mockInkblotApi(page);
  await page.goto("/u/testuser");
  await expect(page.getByRole("img", { name: /streamgraph/i })).toBeVisible();

  const box = await page.locator('[data-slot="slider-track"]').boundingBox();
  if (!box) throw new Error("slider track not found");
  const y = box.y + box.height / 2;
  const xAt = (f: number) => box.x + box.width * f;

  // grab the lower handle and jiggle it ~160× in one continuous drag — well over
  // the 100-calls-per-10s ceiling if the URL sync isn't debounced
  await page.mouse.move(xAt(0.4), y);
  await page.mouse.down();
  for (let i = 0; i < 160; i++) {
    await page.mouse.move(xAt(i % 2 ? 0.3 : 0.1), y);
  }
  await page.mouse.up();
  await page.waitForTimeout(600);

  // the explorer must survive: no uncaught replaceState/SecurityError, chart still up
  expect(pageErrors.join("\n")).not.toMatch(/replaceState|SecurityError/i);
  await expect(page.getByRole("img", { name: /streamgraph/i })).toBeVisible();
});
