// E2E uplate nad STVARNIM MPT sandboxom (S7, odluke 704–708): obrazac „Podrži” → stranica plaćanja (sandbox, referenca)
// → „Simuliraj uplatu” → doprinos plaćen → kampanja ima veći iznos i novog podržavatelja; napojnica > 0 → simulacija →
// iznos kampanje NE raste od napojnice. Treba `wrangler dev` s `.dev.vars` (MPT ključevi) i mrežu prema api.mpt.hr.
// Svaki test i projekt (375, 1280) koristi svoju kampanju iz seeda, jer se testovi vrte paralelno.
//   BASE_URL=http://localhost:8798 npx playwright test e2e/uplata.spec.ts
import { expect, test, type Page } from "@playwright/test";
import { ucitajPrimjere } from "./javne-rute.ts";

const k = ucitajPrimjere().kampanja;
const KAMPANJE = {
  doprinos: { "mobitel-375": k.aktivna!, "desktop-1280": k.zaOrganizaciju! },
  napojnica: { "mobitel-375": k.sPonudama!, "desktop-1280": k.komentariIskljuceni! },
} as const;

const kampanja = (vrsta: keyof typeof KAMPANJE, projekt: string): string =>
  KAMPANJE[vrsta][projekt as keyof (typeof KAMPANJE)["doprinos"]] ?? KAMPANJE[vrsta]["desktop-1280"];

async function prikupljeno(page: Page, id: string): Promise<number> {
  await page.goto(`/hr/${id}`);
  return Number(await page.locator("[data-prikupljeno-centi]").first().getAttribute("data-prikupljeno-centi"));
}

/** Nakon simulacije stranica se vraća (303 na Referer); ako rail još nije gotov, „Osvježi stanje” povlači stanje. */
async function cekaj(page: Page, oznaka: string) {
  for (let i = 0; i < 10; i++) {
    if (await page.locator(oznaka).count()) return;
    await page.waitForTimeout(1000);
    await page.reload();
  }
  await expect(page.locator(oznaka)).toBeVisible();
}

/** Obrazac → stranica plaćanja → simulacija → plaćeno. Vraća URL stranice plaćanja. */
async function doprinesi(page: Page, id: string, eura: string, ime: string): Promise<string> {
  await page.goto(`/hr/${id}/podrzi`);
  await page.fill("#svojIznos", eura);
  await page.fill("#email", `e2e-${ime.toLowerCase().replace(/\s+/g, "-")}@example.org`);
  await page.fill("#ime", ime);
  await page.fill("#poruka", "E2E sandbox");
  await page.locator("input[name='uvjeti']").check();
  await page.locator("[data-checkout-obrazac] button[type='submit']").click();
  await expect(page).toHaveURL(new RegExp(`/hr/${id}/podrzi/[A-Za-z0-9_-]{22}$`));
  const url = page.url();
  await expect(page.locator("[data-sandbox]")).toBeVisible();
  await expect(page.locator("[data-referenca]")).not.toBeEmpty();
  const preljev = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(preljev, "horizontalni scroll stranice plaćanja").toBeLessThanOrEqual(1);
  await page.getByRole("button", { name: "Simuliraj uplatu", exact: true }).click();
  await cekaj(page, "[data-uplaceno]");
  return url;
}

test("doprinos kroz sandbox: plaćeno → veći iznos i novi podržavatelj na kampanji", async ({ page }, info) => {
  test.setTimeout(90_000);
  const greske: string[] = [];
  page.on("pageerror", (e) => greske.push(e.message));
  const id = kampanja("doprinos", info.project.name);
  const ime = `E2E ${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;

  const prije = await prikupljeno(page, id);
  await doprinesi(page, id, "7", ime);
  const poslije = await prikupljeno(page, id);
  expect(poslije).toBeGreaterThanOrEqual(prije + 700);
  await expect(page.getByText(ime, { exact: false }).first()).toBeVisible();
  expect(greske).toEqual([]);
});

test("napojnica > 0 kroz sandbox: iznos kampanje ne raste od napojnice", async ({ page }, info) => {
  test.setTimeout(120_000);
  const greske: string[] = [];
  page.on("pageerror", (e) => greske.push(e.message));
  const id = kampanja("napojnica", info.project.name);
  const ime = `E2E N ${Date.now().toString(36)}`;

  const prije = await prikupljeno(page, id);
  const placanje = await doprinesi(page, id, "20", ime);
  const nakonDoprinosa = await prikupljeno(page, id);
  expect(nakonDoprinosa).toBe(prije + 2000);

  await page.goto(`${placanje}/napojnica`);
  const izbori = page.locator("input[name='napojnica']");
  await expect(izbori.first()).toHaveValue("0");
  await expect(page.locator("input[name='napojnica']:checked")).toHaveCount(0);
  await page.locator("label", { has: page.locator("input[name='napojnica'][value='200']") }).click();
  await page.locator("main form[method='post'] button[type='submit']").last().click();
  await expect(page).toHaveURL(new RegExp(`${placanje.replace(/[/.]/g, "\\$&")}/napojnica$`));
  await expect(page.locator("[data-sandbox]")).toBeVisible();
  await page.getByRole("button", { name: "Simuliraj uplatu", exact: true }).click();
  await cekaj(page, "[data-napojnica-placena]");

  expect(await prikupljeno(page, id)).toBe(nakonDoprinosa);
  await page.goto(`${placanje}/potvrda`);
  await expect(page.locator("[data-stanje-doprinosa='paid']")).toBeVisible();
  expect(greske).toEqual([]);
});
