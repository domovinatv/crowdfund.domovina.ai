// E2E mock e-pošte organizatoru o novom doprinosu (S11; S8 `src/lib/db/obavijesti.ts`, odluka 821) nad STVARNIM
// MPT sandboxom: organizatorica (demo sesija, autorica kampanje, `contribution_notifications = 1`) na
// „Upravljanje → Obavijesti” nema poruku s tim iznosom → anonimni podržavatelj u DRUGOM kontekstu preglednika
// plaća kroz sandbox („Simuliraj uplatu”) → organizatorica nakon osvježavanja vidi „Novi doprinos od {iznos}”
// upućen na svoju e-poštu, kao najnoviju poruku. Iznos s centima je slučajan, pa se poruka nalazi po njemu.
// Projekt 375 plaća „aktivnoj”, 1280 drugoj kampanji iste organizatorice (testovi se vrte paralelno).
// Troši jednu simulaciju po projektu (MPT kvota sandboxa).
//   BASE_URL=http://localhost:4321 npx playwright test e2e/posta-organizatoru.spec.ts
import { expect, test, type Page } from "@playwright/test";
import { KOLACIC_SESIJE, ucitajPrimjere } from "./javne-rute.ts";

const p = ucitajPrimjere();
const KAMPANJA: Record<string, string> = { "mobitel-375": p.kampanja.aktivna!, "desktop-1280": p.kampanja.uskoroZavrsava! };

/** Nakon simulacije stranica se vraća (303 na Referer); ako rail još nije gotov, „Osvježi stanje” povlači stanje. */
async function cekaj(page: Page, oznaka: string) {
  for (let i = 0; i < 10; i++) {
    if (await page.locator(oznaka).count()) return;
    await page.waitForTimeout(1000);
    await page.reload();
  }
  await expect(page.locator(oznaka)).toBeVisible();
}

test("organizator vidi mock e-poruku o novom doprinosu nakon uplate u sandboxu", async ({ page, browser, context, baseURL }, info) => {
  test.setTimeout(90_000);
  const id = KAMPANJA[info.project.name] ?? KAMPANJA["desktop-1280"]!;
  const eura = 11 + Math.floor(Math.random() * 80);
  const centi = 1 + Math.floor(Math.random() * 98);
  const unos = `${eura},${String(centi).padStart(2, "0")}`;
  const poruka = new RegExp(`Novi doprinos od ${unos}\\s€`);
  const greske: string[] = [];
  page.on("pageerror", (e) => greske.push(e.message));

  // 1. Organizatorica: obavijesti o uplatama uključene, još nema poruke s ovim iznosom.
  await context.addCookies([{ name: KOLACIC_SESIJE, value: p.demoSesija, domain: new URL(baseURL!).hostname, path: "/" }]);
  const obavijesti = `/hr/${id}/upravljanje/obavijesti`;
  await page.goto(obavijesti);
  await expect(page.locator("#n-uplate")).toBeChecked();
  await expect(page.getByText(poruka)).toHaveCount(0);

  // 2. Anonimni podržavatelj u zasebnom kontekstu (bez kolačića sesije) plaća kroz sandbox.
  const gost = await browser.newContext({ baseURL, viewport: page.viewportSize() ?? undefined });
  const g = await gost.newPage();
  try {
    await g.goto(`/hr/${id}/podrzi`);
    await g.fill("#svojIznos", unos);
    await g.fill("#email", `e2e-posta-${Date.now().toString(36)}@example.org`);
    await g.fill("#ime", "E2E Pošta");
    await g.locator("input[name='uvjeti']").check();
    await g.locator("[data-checkout-obrazac] button[type='submit']").click();
    await expect(g).toHaveURL(new RegExp(`/hr/${id}/podrzi/[A-Za-z0-9_-]{22}$`));
    await expect(g.locator("[data-sandbox]")).toBeVisible();
    await g.getByRole("button", { name: "Simuliraj uplatu", exact: true }).click();
    await cekaj(g, "[data-uplaceno]");
  } finally {
    await gost.close();
  }

  // 3. Organizatorica: poruka s iznosom, upućena njoj, među najnovijima.
  await page.reload();
  const popis = page.locator("[data-mock-uplate]");
  await expect(popis).toBeVisible();
  const stavka = popis.locator("li", { hasText: poruka });
  await expect(stavka).toHaveCount(1);
  await expect(stavka).toContainText(`za ${p.demoRacuni.organizator}`);
  // Najnovija je na vrhu; paralelni testovi (uplata.spec) mogu dodati svoju, pa je dovoljno među prve tri.
  const tekstovi = await popis.locator("li").allTextContents();
  expect(tekstovi.slice(0, 3).some((t) => poruka.test(t))).toBe(true);
  // Payload ne nosi podržavatelja (S8): ni ime ni e-poštu gosta.
  await expect(popis).not.toContainText("E2E Pošta");
  await expect(popis).not.toContainText("example.org");
  expect(greske).toEqual([]);
});
