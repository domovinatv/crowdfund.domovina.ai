// E2E videa kampanje (S11): organizatorica (demo sesija) upisuje video u „Uredi kampanju” → stranica kampanje
// prikazuje NAŠ statični okvir (nijedan zahtjev prema YouTubeu/Vimeu prije klika), axe čist, bez horizontalnog
// scrolla → klik ga zamjenjuje iframeom youtube-nocookie / player.vimeo (?dnt=1). Nepodržana poveznica (kanal)
// je greška uz polje. Na kraju se video uklanja. Projekt 375 radi s YouTubeom na „aktivnoj”, 1280 s Vimeom na
// drugoj kampanji iste organizatorice, jer se projekti vrte paralelno. Iframe se ne učitava stvarno (route).
//   BASE_URL=http://localhost:4321 npx playwright test e2e/video.spec.ts
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { KOLACIC_SESIJE, ucitajPrimjere } from "./javne-rute.ts";

const p = ucitajPrimjere();
const TRECI = /(^|\.)(youtube\.com|youtube-nocookie\.com|youtu\.be|ytimg\.com|googlevideo\.com|ggpht\.com|vimeo\.com|vimeocdn\.com)$/;

const SLUCAJ = {
  "mobitel-375": {
    id: p.kampanja.aktivna!,
    url: "https://youtu.be/dQw4w9WgXcQ?si=e2e",
    izvorni: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    ugradnja: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1",
    gumb: "Video s YouTubea",
  },
  "desktop-1280": {
    id: p.kampanja.uskoroZavrsava!,
    url: "https://vimeo.com/76979871",
    izvorni: "https://vimeo.com/76979871",
    ugradnja: "https://player.vimeo.com/video/76979871?dnt=1&autoplay=1",
    gumb: "Video s Vimea",
  },
} as const;

async function spremiVideo(page: Page, id: string, url: string) {
  await page.goto(`/hr/${id}/uredi`);
  await page.fill("#videoUrl", url);
  await page.locator("form:has(#videoUrl) button[type='submit']").click();
}

test("video kampanje: okvir bez trećih strana do klika, pa iframe bez kolačića", async ({ page, context, baseURL }, info) => {
  test.setTimeout(60_000);
  const s = SLUCAJ[info.project.name as keyof typeof SLUCAJ] ?? SLUCAJ["desktop-1280"];
  const greske: string[] = [];
  page.on("pageerror", (e) => greske.push(e.message));
  const treci: string[] = [];
  page.on("request", (r) => {
    const host = new URL(r.url()).hostname;
    if (TRECI.test(host)) treci.push(r.url());
  });
  // Iframe nakon klika ne ide na mrežu: ugradnja se vraća kao prazna stranica.
  await context.route(/^https:\/\/(www\.youtube-nocookie\.com|player\.vimeo\.com)\//, (r) =>
    r.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>video</title>" }),
  );
  await context.addCookies([{ name: KOLACIC_SESIJE, value: p.demoSesija, domain: new URL(baseURL!).hostname, path: "/" }]);

  try {
    // Nepodržana poveznica: greška uz polje, ništa se ne sprema.
    await spremiVideo(page, s.id, "https://www.youtube.com/channel/UC1234567890");
    await expect(page.locator("#videoUrl-greska")).toBeVisible();

    await spremiVideo(page, s.id, s.url);
    await expect(page).toHaveURL(/\?ok=spremljeno/);

    await page.goto(`/hr/${s.id}`);
    const okvir = page.locator("a[data-video-okvir]");
    await expect(okvir).toBeVisible();
    await expect(okvir).toHaveAttribute("href", s.izvorni);
    await expect(okvir).toHaveAttribute("target", "_blank");
    await expect(okvir).toHaveAttribute("rel", "noopener");
    await expect(okvir).toContainText(s.gumb);
    await expect(page.locator("main iframe")).toHaveCount(0);

    // 16:9 i unutar stupca.
    const kutija = (await page.locator("[data-video]").boundingBox())!;
    expect(Math.abs(kutija.width / kutija.height - 16 / 9)).toBeLessThan(0.02);
    const preljev = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(preljev, "horizontalni scroll").toBeLessThanOrEqual(1);

    const axe = await new AxeBuilder({ page }).include("[data-video]").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(axe.violations.map((v) => v.id)).toEqual([]);
    expect(treci, "zahtjevi prema trećim stranama prije klika").toEqual([]);

    await okvir.click();
    const iframe = page.locator("[data-video] iframe");
    await expect(iframe).toHaveAttribute("src", s.ugradnja);
    await expect(iframe).toHaveAttribute("title", /^Video kampanje \((YouTube|Vimeo)\)$/);
    await expect(iframe).toHaveAttribute("referrerpolicy", "strict-origin-when-cross-origin");
    await expect(iframe).toHaveAttribute("loading", "lazy");
    await expect(iframe).toHaveAttribute("allow", "autoplay; encrypted-media; fullscreen; picture-in-picture");
    await expect(page.locator("a[data-video-okvir]")).toHaveCount(0);
    expect(page.url()).toContain(`/hr/${s.id}`);
    expect(greske).toEqual([]);
  } finally {
    await spremiVideo(page, s.id, "");
    await expect(page).toHaveURL(/\?ok=spremljeno/);
    await page.goto(`/hr/${s.id}`);
    await expect(page.locator("[data-video]")).toHaveCount(0);
  }
});
