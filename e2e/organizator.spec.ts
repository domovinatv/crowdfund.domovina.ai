// E2E organizatora (S6): novi korisnik → registracija s kodom iz demo pošte → verifikacija osobe (mock EMI,
// „Simuliraj: odobreno”) → čarobnjak osobne kampanje kroz svih 5 koraka → Objavi → stranica kampanje 200 →
// kartica u katalogu (`?q=`) i na „Moje kampanje”. Svaki projekt (375, 1280) radi sa svojim svježim računom.
// Pokretanje nad dev serverom: `BASE_URL=http://localhost:4401 npx playwright test e2e/organizator.spec.ts`.
import { expect, test, type Page } from "@playwright/test";

const OPIS =
  "Skupljamo za novi krov društvenog doma u kojem se svaki tjedan okupljaju djeca i stariji iz susjedstva. Hvala svima.";

/** Datum za `<input type="date">`: danas + n dana (UTC). */
const zaDana = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

/** „Dalje” koraka čarobnjaka: zadnji gumb obrasca (iznad je samo „Počni ispočetka” u zasebnom obrascu). */
async function dalje(page: Page) {
  await page.locator("main form[method='post'] button[type='submit']").last().click();
}

test("novi korisnik → verifikacija → kampanja → objava → u katalogu i na „Moje”", async ({ page }, info) => {
  test.setTimeout(120_000);
  const greske: string[] = [];
  page.on("pageerror", (e) => greske.push(e.message));

  const oznaka = `${Date.now().toString(36)}${info.project.name.startsWith("mob") ? "m" : "d"}${Math.floor(Math.random() * 1e4)}`;
  const email = `e2e-${oznaka}@demo.invalid`;
  const naslov = `Krov doma ${oznaka}`;

  // 1. Registracija → kod iz demo pošte.
  await page.goto("/hr/registracija");
  await page.fill("#ime", "Eva");
  await page.fill("#prezime", "Testna");
  await page.fill("#email", email);
  await page.locator("input[name='uvjeti']").check();
  await page.locator("main form button[type='submit']").click();
  await expect(page).toHaveURL(/\/hr\/registracija\/potvrda/);
  const kod = (await page.locator("[data-demo-kod]").textContent())!.trim();
  expect(kod).toMatch(/^\d{6}$/);
  await page.fill("#kod", kod);
  await page.locator("main form button[type='submit']").first().click();
  await expect(page).not.toHaveURL(/\/registracija\/potvrda/);

  // 2. Verifikacija osobe: vrsta → podaci → pregled → „Simuliraj: odobreno”.
  await page.goto("/hr/postavke/verifikacija");
  await expect(page.locator("main h1")).toHaveCount(1);
  await page.goto("/hr/postavke/verifikacija/vrsta");
  await page.locator("main a[href='/hr/postavke/verifikacija/podaci']").first().click();
  await expect(page).toHaveURL(/\/hr\/postavke\/verifikacija\/podaci/);
  await page.fill("#first_name", "Eva");
  await page.fill("#last_name", "Testna");
  await page.selectOption("#citizenship", "HR");
  await page.selectOption("#birth_country", "HR");
  await page.fill("#birth_date", "1990-05-17");
  await page.fill("#document_number", "123456789");
  await page.locator("input[name='no_expiry']").check();
  await page.selectOption("#residence_country", "HR");
  await page.fill("#street", "Ilica");
  await page.fill("#house_number", "1");
  await page.fill("#postal_code", "10000");
  await page.fill("#city", "Zagreb");
  await page.locator("input[name='pep'][value='no']").check();
  await page.locator("input[name='accuracy']").check();
  await page.locator("main form button[type='submit']").click();
  await expect(page).toHaveURL(/\/hr\/postavke\/verifikacija\/pregled/);
  await page.locator("form:has(input[name='odluka'][value='approved']) button[type='submit']").click();
  await expect(page).toHaveURL(/\/hr\/postavke\/verifikacija\/pregled/);
  await expect(page.locator("form:has(input[name='odluka'][value='approved'])")).toHaveCount(0);

  // 3. Čarobnjak: osobna kampanja, svaki korak.
  await page.goto("/hr/nova-kampanja");
  await expect(page).toHaveURL(/\/hr\/nova-kampanja\/vrsta/);
  await page.locator("input[name='vrsta'][value='one_time']").check();
  await page.locator("input[name='kategorija'][value='charity']").check();
  await dalje(page);
  await expect(page).toHaveURL(/\/hr\/nova-kampanja\/cilj/);
  await page.fill("input[name='naslov']", naslov);
  await page.fill("input[name='cilj']", "1500");
  await page.fill("input[name='rok']", zaDana(60));
  await page.locator("input[name='organizacija'][value='osobno']").check();
  await dalje(page);
  await expect(page).toHaveURL(/\/hr\/nova-kampanja\/mediji/);
  await page.locator("input[name='tema'][value='repairs']").check();
  await dalje(page);
  await expect(page).toHaveURL(/\/hr\/nova-kampanja\/opis/);
  await page.fill("textarea[name='opis']", OPIS);
  await dalje(page);
  await expect(page).toHaveURL(/\/hr\/nova-kampanja\/pregled/);
  await expect(page.locator("main")).toContainText(naslov);

  // 4. Objavi → /hr/{id}?objavljeno=1.
  const objavi = page.locator("form:has(input[name='akcija'][value='objavi']) button[type='submit']");
  await expect(objavi).toBeEnabled();
  await objavi.click();
  await expect(page).toHaveURL(/\/hr\/[0-9a-z]{6}\?objavljeno=1$/);
  const publicId = new URL(page.url()).pathname.split("/")[2]!;
  const stranica = await page.request.get(`/hr/${publicId}?objavljeno=1`);
  expect(stranica.status()).toBe(200);
  await expect(page.locator("main h1")).toContainText(naslov);

  // 5. Katalog i „Moje kampanje”.
  await page.goto(`/hr/kampanje?q=${encodeURIComponent(naslov)}`);
  await expect(page.locator(`main a[href='/hr/${publicId}']`).first()).toBeVisible();
  await page.goto("/hr/moje/kampanje");
  const kartica = page.locator(`[data-public-id='${publicId}']`);
  await expect(kartica).toBeVisible();
  await expect(kartica).toContainText(naslov);
  await expect(kartica).toContainText("Aktivna");

  const preljev = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(preljev, "horizontalni scroll").toBeLessThanOrEqual(1);
  expect(greske).toEqual([]);
});
