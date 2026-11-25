// E2E tok 3 (docs/04-tokovi.md, odluke 632, 637–651): novi korisnik pokreće kampanju za tuđu organizaciju
// (Fixed Beneficiary, `?za=`), kampanja čeka u `review` i nije javna; admin organizacije (demo sesija
// organizatora) je odobri ili odbije s razlogom. Nakon odobrenja kampanja je javna i u katalogu, a autor više
// nema K pristup (odluka 600); nakon odbijanja ostaje 404, a autor vidi razlog u „Moje kampanje”.
// Anonimni zahtjevi idu kroz `request` (bez kolačića preglednika). Svaki test ima svježeg korisnika (`…@demo.invalid` s vremenskom oznakom), pa testovi rade paralelno.
import { expect, test, type Browser, type Page } from "@playwright/test";
import { KOLACIC_SESIJE, ucitajPrimjere } from "./javne-rute.ts";

const primjeri = ucitajPrimjere();
const ORG = primjeri.organizacijaOrganizatora;

const oznaka = (projekt: string) => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}${projekt.startsWith("mobitel") ? "m" : "d"}`;

/** Registracija i potvrda e-pošte kodom iz demo pretinca; ostavlja prijavljenu sesiju u `page`. */
async function registriraj(page: Page, oz: string) {
  // networkidle: u `astro dev` Vite zna osvježiti stranicu nakon prvog učitavanja i obrisati upisana polja.
  await page.goto("/hr/registracija", { waitUntil: "networkidle" });
  const polja = { ime: "Test", prezime: `Autor ${oz}`, email: `e2e-${oz}@demo.invalid` };
  for (const [ime, v] of Object.entries(polja)) await page.locator(`input[name=${ime}]`).fill(v);
  await page.locator("input[name=uvjeti]").check();
  for (const [ime, v] of Object.entries(polja)) await expect(page.locator(`input[name=${ime}]`)).toHaveValue(v);
  await page.locator("form:has(input[name=uvjeti]) button[type=submit]").click();
  await expect(page).toHaveURL(/\/hr\/registracija\/potvrda/);
  const kod = (await page.locator("[data-demo-kod]").textContent())?.trim() ?? "";
  expect(kod).toMatch(/^\d{6}$/);
  await page.locator("input[name=kod]").fill(kod);
  await page.locator("form:has(input[name=kod]) button[type=submit]").click();
  await expect(page).not.toHaveURL(/\/registracija\/potvrda/);
}

/** Čarobnjak `?za={slug}` od vrste do objave; vraća javni ID kampanje u `review`. */
async function objaviZaOrganizaciju(page: Page, naslov: string): Promise<string> {
  await page.goto(`/hr/nova-kampanja?za=${ORG}`);
  await expect(page).toHaveURL(/\/hr\/nova-kampanja\/vrsta\?za=/);
  await expect(page.locator("input[name=vrsta][value=for_organization]")).toBeChecked();
  await page.locator("form:has(input[name=vrsta]) button[type=submit]").click();

  await expect(page).toHaveURL(/\/hr\/nova-kampanja\/cilj$/);
  await page.locator("input[name=naslov]").fill(naslov);
  await page.locator("input[name=cilj]").fill("1500");
  // Primatelj je već odabran iz `?za=`.
  await expect(page.locator("select[name=organizacija] option:checked")).toHaveAttribute("value", /^za:/);
  await page.locator("form:has(input[name=naslov]) button[type=submit]").click();

  await expect(page).toHaveURL(/\/hr\/nova-kampanja\/mediji$/);
  await page.locator("input[name=tema][value=charity]").check();
  await page.locator("form:has(input[name=tema]) button[type=submit]").click();

  await expect(page).toHaveURL(/\/hr\/nova-kampanja\/opis$/);
  await page
    .locator("textarea[name=opis]")
    .fill("Prikupljamo doprinose za opremu udruge kako bi volonteri mogli raditi s djecom tijekom cijele godine.");
  await page.locator("form:has(textarea[name=opis]) button[type=submit]:not([name=akcija])").click();

  await expect(page).toHaveURL(/\/hr\/nova-kampanja\/pregled$/);
  await page.locator("form:has(input[name=akcija][value=objavi]) button[type=submit]").click();
  await expect(page).toHaveURL(/\/hr\/moje\/kampanje\?objavljeno=[0-9a-z]{6}$/);
  return new URL(page.url()).searchParams.get("objavljeno")!;
}

/** Novi kontekst preglednika s demo sesijom organizatora (admin `demo-svjetionik`). */
async function organizator(browser: Browser, baseURL: string): Promise<Page> {
  const ctx = await browser.newContext({ baseURL });
  await ctx.addCookies([{ name: KOLACIC_SESIJE, value: primjeri.demoSesija, url: baseURL }]);
  return ctx.newPage();
}


test.describe("organizacija odobrava tuđu kampanju (tok 3)", () => {
  test("odobri → javna i u katalogu, autor gubi upravljanje", async ({ page, browser, baseURL, request }, info) => {
    const oz = oznaka(info.project.name);
    const naslov = `E2E odobri ${oz}`;
    await registriraj(page, oz);
    const id = await objaviZaOrganizaciju(page, naslov);

    // Čeka odobrenje: nije javna, autor još upravlja (K dok čeka, odluka 600).
    expect((await request.get(`/hr/${id}`, { maxRedirects: 0 })).status()).toBe(404);
    expect((await page.request.get(`/hr/${id}/upravljanje`, { maxRedirects: 0 })).status()).toBe(200);

    const org = await organizator(browser, baseURL!);
    await org.goto(`/hr/o/${ORG}/odobravanje`);
    const stavka = org.locator("li", { has: org.locator("h3", { hasText: naslov }) });
    await expect(stavka).toHaveCount(1);
    await stavka.locator("form:has(input[name=radnja][value=odobri]) button[type=submit]").click();
    await expect(org).toHaveURL(new RegExp(`/hr/o/${ORG}/odobravanje\\?odobrena=${id}$`));
    await expect(org.locator("li", { has: org.locator("h3", { hasText: naslov }) })).toHaveCount(0);
    await org.context().close();

    expect((await request.get(`/hr/${id}`, { maxRedirects: 0 })).status()).toBe(200);
    const katalog = await page.request.get(`/hr/kampanje?q=${encodeURIComponent(naslov)}`);
    expect(katalog.status()).toBe(200);
    expect(await katalog.text()).toContain(`href="/hr/${id}"`);
    // Nakon odobrenja upravlja organizacija; autor bez uloge dobiva 404 (odluka 600).
    expect((await page.request.get(`/hr/${id}/upravljanje`, { maxRedirects: 0 })).status()).toBe(404);
  });

  test("odbij s razlogom → ostaje 404, autor vidi razlog", async ({ page, browser, baseURL, request }, info) => {
    const oz = oznaka(info.project.name);
    const naslov = `E2E odbij ${oz}`;
    const razlog = `Udruga ne prikuplja za ovu namjenu (${oz}).`;
    await registriraj(page, oz);
    const id = await objaviZaOrganizaciju(page, naslov);

    const org = await organizator(browser, baseURL!);
    await org.goto(`/hr/o/${ORG}/odobravanje`);
    const stavka = org.locator("li", { has: org.locator("h3", { hasText: naslov }) });
    const odbij = stavka.locator("form:has(input[name=radnja][value=odbij])");

    // Prekratak razlog (< 10 znakova): 200 s porukom, kampanja i dalje čeka.
    await odbij.locator("textarea[name=razlog]").fill("kratko");
    await odbij.locator("button[type=submit]").click();
    await expect(org).toHaveURL(new RegExp(`/hr/o/${ORG}/odobravanje$`));
    await expect(stavka.locator("textarea[name=razlog][aria-invalid=true]")).toHaveCount(1);

    await odbij.locator("textarea[name=razlog]").fill(razlog);
    await odbij.locator("button[type=submit]").click();
    await expect(org).toHaveURL(new RegExp(`/hr/o/${ORG}/odobravanje\\?odbijena=${id}$`));
    await expect(org.locator("li", { has: org.locator("h3", { hasText: naslov }) })).toHaveCount(0);
    await org.context().close();

    expect((await request.get(`/hr/${id}`, { maxRedirects: 0 })).status()).toBe(404);
    const katalog = await page.request.get(`/hr/kampanje?q=${encodeURIComponent(naslov)}`);
    expect(await katalog.text()).not.toContain(`href="/hr/${id}"`);
    // Odbijena (`cancelled`) više ne čeka: autor nema K pristup (odluka 600), razlog vidi u „Moje kampanje”.
    expect((await page.request.get(`/hr/${id}/upravljanje`, { maxRedirects: 0 })).status()).toBe(404);
    await page.goto("/hr/moje/kampanje");
    await expect(page.getByText(razlog)).toBeVisible();
  });
});
