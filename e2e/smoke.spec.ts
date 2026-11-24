// Playwright smoke po javnoj ruti (S5): status, jedan h1, bez horizontalnog scrolla, bez grešaka u konzoli.
import { expect, test } from "@playwright/test";
import { javneRute, ucitajPrimjere } from "./javne-rute.ts";

const rute = javneRute(ucitajPrimjere()).filter((r) => r.status === 200);

for (const r of rute) {
  test(`${r.put} [${r.opis}]`, async ({ page }) => {
    const greske: string[] = [];
    page.on("console", (m) => m.type() === "error" && greske.push(m.text()));
    page.on("pageerror", (e) => greske.push(e.message));
    const res = await page.goto(r.put);
    expect(res?.status()).toBe(200);
    if (!r.put.startsWith("/embed/")) await expect(page.locator("h1")).toHaveCount(1);
    const preljev = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(preljev, "horizontalni scroll").toBeLessThanOrEqual(1);
    expect(greske).toEqual([]);
  });
}
