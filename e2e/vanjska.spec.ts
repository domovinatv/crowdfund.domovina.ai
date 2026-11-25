// E2E vanjske 4fund kampanje (S8, tok 9, odluke 800–802): urednik organizacije (demo sesija organizatora) doda 4fund
// link s kratkim opisom → vidi kod vlasništva → „Provjeri” (mock) → javna stranica `/hr/vanjska/{id}` ima oznaku
// „plaćanje na 4fund.com”, gumb `https://4fund.com/{id}/pay` u novoj kartici i nema iznosa → kampanja je na profilu
// organizacije. Svaki projekt (375, 1280) dodaje svoj nasumični 6-znakovni ID, pa se testovi ne sudaraju.
//   BASE_URL=http://localhost:8798 npx playwright test e2e/vanjska.spec.ts
import { expect, test } from "@playwright/test";
import { KOLACIC_SESIJE, ucitajPrimjere } from "./javne-rute.ts";

const p = ucitajPrimjere();
const ORG = p.organizacijaOrganizatora;

/** 6 znakova [a-z0-9]: vrijeme + slučajno, da se ponovljena pokretanja ne sudaraju (UNIQUE platform, external_id). */
const noviId = () =>
  (Date.now().toString(36).slice(-3) + Math.random().toString(36).slice(2, 5)).padEnd(6, "0").slice(0, 6);

test("urednik doda 4fund kampanju → kod → Provjeri → javna stranica s gumbom /pay, bez iznosa → na profilu", async ({ page, context, baseURL }) => {
  const greske: string[] = [];
  page.on("pageerror", (e) => greske.push(e.message));
  const host = new URL(baseURL!).hostname;
  await context.addCookies([{ name: KOLACIC_SESIJE, value: p.demoSesija, domain: host, path: "/" }]);

  const id = noviId();
  const naslov = `Zimska akcija ${id}`;
  const opis = `Kratki opis vanjske kampanje ${id}: hrana i lijekovi za zimu.`;

  // 1. Dodavanje: URL + naslov + kratki opis.
  await page.goto(`/hr/o/${ORG}/vanjske`);
  await page.fill("#url", `https://4fund.com/${id.toUpperCase()}`);
  await page.fill("#naslov", naslov);
  await page.fill("#opis", opis);
  await page.locator("main form:has(input[name='radnja'][value='dodaj']) button[type='submit']").click();
  await expect(page).toHaveURL(new RegExp(`/hr/o/${ORG}/vanjske\\?dodana=1`));

  // 2. Kod vlasništva i „Provjeri”.
  const stavka = page.locator("main li", { hasText: naslov });
  await expect(stavka).toContainText(`https://4fund.com/${id}`);
  await expect(stavka).toContainText(opis);
  await expect(stavka.locator(".font-mono")).toHaveText(/^DOMOVINA-[A-Z0-9]{8}$/);
  await stavka.locator("form:has(input[name='radnja'][value='provjeri']) button").click();
  await expect(page).toHaveURL(/\?spremljeno=1/);

  // 3. Javna stranica vanjske kampanje.
  const javna = page.locator("main li", { hasText: naslov }).locator("[data-javna-vanjska]");
  await expect(javna).toBeVisible();
  await javna.click();
  await expect(page).toHaveURL(/\/hr\/vanjska\/[0-9a-f-]{36}$/);
  const putJavne = new URL(page.url()).pathname;
  await expect(page.locator("main h1")).toHaveText(naslov);
  await expect(page.locator("[data-opis-vanjske]")).toHaveText(opis);
  await expect(page.locator("[data-placanje-na]")).toHaveText(/plaćanje na 4fund\.com/);
  await expect(page.locator("[data-bez-iznosa]")).toContainText("ne prikazujemo");
  const gumb = page.locator("a[data-gumb-vanjske]");
  await expect(gumb).toHaveAttribute("href", `https://4fund.com/${id}/pay`);
  await expect(gumb).toHaveAttribute("target", "_blank");
  await expect(gumb).toHaveAttribute("rel", /noopener/);
  await expect(gumb).toHaveAttribute("rel", /nofollow/);
  // Nema iznosa: ni oznake prikupljenog iznosa ni traka napretka, ni znak eura u glavnom sadržaju.
  await expect(page.locator("main [data-prikupljeno-centi]")).toHaveCount(0);
  await expect(page.locator("main [role='progressbar']")).toHaveCount(0);
  expect(await page.locator("main").innerText()).not.toMatch(/€|\bEUR\b/);

  // 4. Profil organizacije prikazuje vanjsku kampanju s poveznicom na našu stranicu.
  await page.goto(`/hr/o/${ORG}`);
  const kartica = page.locator("[data-vanjska-kartica]", { hasText: naslov });
  await expect(kartica).toBeVisible();
  await expect(kartica.locator(`a[href='${putJavne}']`)).toBeVisible();

  // 5. Katalog: zaseban odjeljak vanjskih kampanja pronalazi je pretragom.
  await page.goto(`/hr/kampanje?q=${encodeURIComponent(naslov)}`);
  await expect(page.locator("[data-vanjske-katalog] [data-vanjska-kartica]", { hasText: naslov })).toBeVisible();

  expect(greske).toEqual([]);
});
