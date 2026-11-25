// E2E promocije i podržavatelja (S10, paritet A22, B08, B09): widget s veličinom i izgledom (kod i pregled, tamni
// iframe), overlay za stream iz PromoTools, čestitka zahvale na plakatu i dijeljenje komentara (kopiranje adrese
// sidra). Nova stanja sučelja prolaze i axe (WCAG 2.1 AA), jer ih a11y.spec obilazi samo sa zadanim parametrima.
//   BASE_URL=http://localhost:4321 npx playwright test e2e/promocija.spec.ts
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { ucitajPrimjere } from "./javne-rute.ts";

const k = ucitajPrimjere().kampanja;

async function axe(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  return r.violations.flatMap((v) => v.nodes.map((n) => `${v.id} ${n.target.join(" ")}`));
}

test("widget: veličina i izgled u kodu i pregledu, tamni iframe, stream iz PromoTools", async ({ page }) => {
  await page.goto(`/hr/${k.aktivna}`);
  await page.locator(`a[href='/hr/${k.aktivna}/widget#stream']`).click();
  await expect(page.locator("#adresa-streama")).toHaveValue(new RegExp(`/embed/${k.aktivna}/stream$`));

  await page.locator("label", { has: page.locator("input[name='size'][value='small']") }).click();
  await page.locator("label", { has: page.locator("input[name='theme'][value='dark']") }).click();
  await page.getByRole("button", { name: "Primijeni" }).click();
  await expect(page).toHaveURL(/size=small/);
  await expect(page.locator("#kod-widgeta")).toHaveValue(/size=small&amp;theme=dark" title="[^"]*" width="300" height="340"/);
  const pregled = page.locator("iframe[data-pregled-widgeta='small-dark']");
  await expect(pregled).toHaveAttribute("width", "300");
  expect(await axe(page)).toEqual([]);

  await page.goto(`/embed/${k.aktivna}?size=small&theme=dark`);
  await expect(page.locator("html")).toHaveClass(/widget-tamno/);
  await expect(page.locator("[data-widget='small-dark']")).toBeVisible();
  expect(await axe(page)).toEqual([]);
  // Nepoznate vrijednosti padaju na zadano.
  await page.goto(`/embed/${k.aktivna}?size=%3Cb%3E&theme=neon`);
  await expect(page.locator("[data-widget='medium-light']")).toBeVisible();
});

test("plakat: tab „Čestitka zahvale” s popisom podržavatelja; skriven popis bez imena", async ({ page }) => {
  await page.goto(`/hr/${k.aktivna}/plakat`);
  await page.getByRole("link", { name: "Čestitka zahvale" }).click();
  await expect(page).toHaveURL(/varijanta=cestitka/);
  await expect(page.getByRole("link", { name: "Čestitka zahvale" })).toHaveAttribute("aria-current", "page");
  await expect(page.locator("[data-cestitka] [data-imena] li").first()).toBeVisible();
  expect(await axe(page)).toEqual([]);
  await page.goto(`/hr/${k.popisUplataSkriven}/plakat?varijanta=cestitka`);
  await expect(page.locator("[data-cestitka] [data-imena]")).toHaveCount(0);
});

test("komentar: „Podijeli komentar” kopira adresu sidra i javlja to", async ({ page, context, browserName }) => {
  test.skip(browserName !== "chromium", "dozvola za međuspremnik samo u Chromiumu");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.addInitScript(() => Object.defineProperty(navigator, "share", { value: undefined, configurable: true }));
  await page.goto(`/hr/${k.aktivna}`);
  const gumb = page.locator("[data-dijeli-komentar]").first();
  const href = (await gumb.getAttribute("href"))!;
  expect(href).toMatch(new RegExp(`^/hr/${k.aktivna}#k-[0-9a-f-]{36}$`));
  await gumb.click();
  await expect(page.locator("[data-status-dijeljenja]")).toHaveText("Poveznica na komentar je kopirana.");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(new URL(href, page.url()).href);
});
