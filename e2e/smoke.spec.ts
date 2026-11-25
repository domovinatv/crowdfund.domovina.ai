// Playwright smoke po ruti (S5, S6): status, jedan h1, bez horizontalnog scrolla, bez grešaka u konzoli.
// Rute bez pogleda se preskaču (njih broji `npm run routes`); P/K/U/A rute idu s kolačićem demo sesije.
import { expect, test } from "@playwright/test";
import { KOLACIC_SESIJE, javneRute, tokenSesije, ucitajPrimjere } from "./javne-rute.ts";

const primjeri = ucitajPrimjere();
const rute = javneRute(primjeri).filter((r) => r.status === 200 && r.pogled);

for (const r of rute) {
  test(`${r.put} [${r.opis}]`, async ({ page, baseURL, request }) => {
    if (r.put.endsWith(".csv")) {
      // CSV je preuzimanje (Content-Disposition), ne stranica: provjera kroz request, ne kroz page.goto.
      const res = await request.get(r.put, { headers: r.sesija ? { cookie: `${KOLACIC_SESIJE}=${tokenSesije(primjeri, r.sesija)}` } : {} });
      expect(res.status()).toBe(200);
      expect(res.headers()["content-type"]).toContain("text/csv");
      return;
    }
    if (r.sesija) {
      await page.context().addCookies([{ name: KOLACIC_SESIJE, value: tokenSesije(primjeri, r.sesija), url: baseURL! }]);
    }
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
