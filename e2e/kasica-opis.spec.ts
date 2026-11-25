// E2E opisa kasice (S11): prijavljena korisnica (demo sesija „novi”) otvara kasicu s opisom u Markdown podskupu
// (alatna traka i uputa uz polje) → javna stranica kasice renderira podebljano, popis i poveznicu s
// `rel="nofollow ugc noopener"`, a sirovi HTML ostaje tekst. axe čist, bez horizontalnog scrolla.
// Svaki projekt otvara svoju kasicu (slučajni alias).
//   BASE_URL=http://localhost:4321 npx playwright test e2e/kasica-opis.spec.ts
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { KOLACIC_SESIJE, ucitajPrimjere } from "./javne-rute.ts";

const p = ucitajPrimjere();

test("opis kasice kroz renderer opisa", async ({ page, context, baseURL }) => {
  const greske: string[] = [];
  page.on("pageerror", (e) => greske.push(e.message));
  await context.addCookies([{ name: KOLACIC_SESIJE, value: p.demoSesijaNovi, domain: new URL(baseURL!).hostname, path: "/" }]);
  const alias = `e2e-opis-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;

  await page.goto(`/hr/${p.kampanja.aktivna}/kasica/nova`);
  await expect(page.locator("[data-alatna-traka='description']")).toBeVisible();
  await expect(page.locator("#description-oblikovanje")).toBeVisible();
  await page.fill("#title", `Kasica ${alias}`);
  await page.fill("#alias", alias);
  await page.fill(
    "#description",
    "Trčim **polumaraton** za ovu kampanju.\n\n- svaki euro ide kampanji\n- [pravila utrke](https://primjer.hr/utrka)\n\n<img src=x onerror=alert(1)>",
  );
  await page.locator("input[name='rules']").check();
  await page.locator("main form[method='post'] button[type='submit']").last().click();
  await expect(page).toHaveURL(new RegExp(`/hr/s/${alias}`));

  const opis = page.locator("[data-opis-kasice]");
  await expect(opis.locator("strong")).toHaveText("polumaraton");
  await expect(opis.locator("ul > li")).toHaveCount(2);
  const a = opis.locator("a[href='https://primjer.hr/utrka']");
  await expect(a).toHaveText("pravila utrke");
  await expect(a).toHaveAttribute("rel", "nofollow ugc noopener");
  await expect(opis.locator("img")).toHaveCount(0);
  await expect(opis).toContainText("<img src=x onerror=alert(1)>");
  const meta = await page.locator("meta[name='description']").getAttribute("content");
  expect(meta).toContain("Trčim polumaraton");
  expect(meta).not.toContain("**");

  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(axe.violations.map((v) => `${v.id} ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  const preljev = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(preljev, "horizontalni scroll").toBeLessThanOrEqual(1);
  expect(greske).toEqual([]);
});
