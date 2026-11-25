// E2E mjesečne podrške nad STVARNIM MPT sandboxom (S10; tok 10, odluke 14, 819–828): prijavljena podržavateljica na
// kampanji s mjesečnim uplatama bira „svaki mjesec” → stranica plaćanja (sandbox) → „Simuliraj uplatu” → plaćeno →
// stranica plaćanja i potvrda pokazuju obećanje (podsjetnik ili trajni nalog) → poruka „prikaži kao komentar” je
// komentar na kampanji (odluka 823) → u postavkama ponavljajućih (mock e-pošta, odluka 821) podsjetnik se može
// „poslati sada” i otvara stranicu podsjetnika s istim iznosom. Usput: kvačice obavijesti (A19) su neoznačene.
// Projekt 375 bira podsjetnik, 1280 trajni nalog; iznos je slučajan, obećanje se nalazi po `data-obecanje-id`.
//   BASE_URL=http://localhost:4321 npx playwright test e2e/mjesecno.spec.ts
import { expect, test, type Page } from "@playwright/test";
import { KOLACIC_SESIJE, ucitajPrimjere } from "./javne-rute.ts";

const p = ucitajPrimjere();
const ID = p.kampanja.mjesecna!;

/** Nakon simulacije stranica se vraća (303 na Referer); ako rail još nije gotov, GET povlači stanje. */
async function cekaj(page: Page, oznaka: string) {
  for (let i = 0; i < 10; i++) {
    if (await page.locator(oznaka).count()) return;
    await page.waitForTimeout(1000);
    await page.reload();
  }
  await expect(page.locator(oznaka)).toBeVisible();
}

test("mjesečna podrška kroz sandbox: obećanje, komentar iz poruke, podsjetnik u mock pošti", async ({ page, context, baseURL }, info) => {
  test.setTimeout(120_000);
  const greske: string[] = [];
  page.on("pageerror", (e) => greske.push(e.message));
  page.on("console", (m) => m.type() === "error" && greske.push(m.text()));
  await context.addCookies([{ name: KOLACIC_SESIJE, value: p.demoSesijaNovi, domain: new URL(baseURL!).hostname, path: "/" }]);
  const nacin = info.project.name === "mobitel-375" ? "reminder" : "standing_order";
  const oznaka = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
  const poruka = `E2E mjesečno ${oznaka}`;
  const eura = 5 + Math.floor(Math.random() * 40);
  const iznos = new RegExp(`\\b${eura}(,00)?\\s€`);

  // 1. Obrazac: „svaki mjesec” predodabran iz upita, dan, način, poruka kao komentar; kvačice obavijesti prazne.
  await page.goto(`/hr/${ID}/podrzi?ucestalost=mjesecno`);
  await expect(page.locator("input[name='ucestalost'][value='mjesecno']")).toBeChecked();
  await expect(page.locator("input[name='novosti']")).not.toBeChecked();
  await expect(page.locator("input[name='marketing']")).not.toBeChecked();
  await page.fill("#svojIznos", String(eura));
  await page.selectOption("#dan", "15");
  await page.locator(`input[name='nacin'][value='${nacin}']`).check();
  await page.fill("#poruka", poruka);
  await page.locator("input[name='komentar']").check();
  await page.locator("[data-checkout-obrazac] button[type='submit']").click();

  // 2. Stranica plaćanja: sandbox, obećanje prije uplate, simulacija → plaćeno.
  await expect(page).toHaveURL(new RegExp(`/hr/${ID}/podrzi/[A-Za-z0-9_-]{22}$`));
  const placanje = page.url();
  const obecanje = page.locator(`[data-obecanje='${nacin}']`);
  await expect(obecanje).toBeVisible();
  await expect(obecanje).toContainText(iznos);
  const obecanjeId = (await obecanje.getAttribute("data-obecanje-id"))!;
  expect(obecanjeId).toMatch(/^[0-9a-f-]{36}$/);
  await expect(page.locator("[data-sandbox]")).toBeVisible();
  await page.getByRole("button", { name: "Simuliraj uplatu", exact: true }).click();
  await cekaj(page, "[data-uplaceno]");
  await expect(page.locator(`[data-obecanje='${nacin}']`)).toBeVisible();

  // 3. Potvrda: plaćeno i isto obećanje (podsjetnik s idućim terminom ili trajni nalog).
  await page.goto(`${placanje}/potvrda`);
  await expect(page.locator("[data-stanje-doprinosa='paid']")).toBeVisible();
  await expect(page.locator(`[data-obecanje='${nacin}']`)).toContainText("15.");

  // 4. Poruka „prikaži kao komentar” je komentar na kampanji (upisuje se pri prijelazu u plaćeno).
  await page.goto(`/hr/${ID}`);
  await expect(page.locator("article[id^='k-']", { hasText: poruka })).toBeVisible();

  // 5. Postavke ponavljajućih: obećanje postoji; za podsjetnik mock e-pošta „pošalji sada” → stranica podsjetnika.
  await page.goto("/hr/postavke/ponavljajuce");
  const red = page.locator(`[data-obecanje='${obecanjeId}']`);
  await expect(red).toBeVisible();
  if (nacin === "reminder") {
    await red.locator("[data-simuliraj-podsjetnik]").click();
    const mock = page.locator(`[data-obecanje='${obecanjeId}'] [data-mock-podsjetnik]`);
    await expect(mock).toBeVisible();
    await mock.locator("[data-poveznica-podsjetnika]").click();
    await expect(page.locator("[data-iznos-podsjetnika]")).toContainText(iznos);
    await expect(page.locator("[data-stanje-obecanja='active']")).toBeVisible();
  } else {
    await expect(red.locator("[data-simuliraj-podsjetnik]")).toHaveCount(0);
  }
  expect(greske).toEqual([]);
});
