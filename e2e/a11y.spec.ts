// Pristupačnost (S9): axe-core (WCAG 2.0/2.1 A i AA) na 375 px i 1280 px, očekivano 0 nalaza.
//
// Izbor ruta: iz `javneRute()` (e2e/javne-rute.ts) uzimaju se provjere sa statusom 200 i pogledom, pa
// po jedna po ključu rute (`kljuc`; prva je hr inačica). Rubni slučajevi bez ključa (pauzirana, završena,
// skriveni iznos, osobna kampanja, filtri kataloga, profil po slugu) ulaze po `opis`, jer imaju vlastita
// stanja sučelja. Uz to uzorak en ruta (`EN_UZORAK`) za drugi jezik istih predložaka. CSV preuzimanje
// nije stranica pa se preskače. P/K/U/A rute idu s kolačićem demo sesije kao u smoke.spec.ts.
// Ukupno 120 stranica po projektu; s 4 workera oba projekta traju ~35 s (svih 211 stranica s 200, hr i
// en, ~60 s; jednokratni prolaz u S9 nije našao ništa izvan ovog izbora).
//
// Izuzeća: nema ih. Kontrast se popravlja u src/, ne isključuje. axe „incomplete” (pozadina iza
// prekrivenog elementa ili gradijenta) nije pad testa; ručno provjereno u S9.
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { KOLACIC_SESIJE, javneRute, tokenSesije, ucitajPrimjere, type ProvjeraRute } from "./javne-rute.ts";

const primjeri = ucitajPrimjere();
const sve = javneRute(primjeri).filter((r) => r.status === 200 && r.pogled && !r.put.endsWith(".csv"));

const EN_UZORAK = new Set(["home", "campaign", "campaign.support", "campaign.manage", "settings.details", "sign-in"]);

const odabrane: ProvjeraRute[] = [];
const vidjeno = new Set<string>();
for (const r of sve) {
  const kljuc = r.kljuc ?? r.opis;
  const en = r.put.startsWith("/en");
  if (en && r.kljuc && EN_UZORAK.has(r.kljuc) && !vidjeno.has(`en:${kljuc}`)) {
    vidjeno.add(`en:${kljuc}`);
    odabrane.push(r);
    continue;
  }
  if (vidjeno.has(kljuc)) continue;
  vidjeno.add(kljuc);
  odabrane.push(r);
}

for (const r of odabrane) {
  test(`a11y ${r.put} [${r.opis}]`, async ({ page, baseURL }) => {
    if (r.sesija) {
      await page.context().addCookies([{ name: KOLACIC_SESIJE, value: tokenSesije(primjeri, r.sesija), url: baseURL! }]);
    }
    const res = await page.goto(r.put);
    expect(res?.status()).toBe(200);
    const rezultat = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const nalazi = rezultat.violations.flatMap((v) =>
      v.nodes.map((n) => `${v.id} [${v.impact}] ${n.target.join(" ")}${n.any[0]?.message ? ` — ${n.any[0].message}` : ""}`),
    );
    expect(nalazi, `axe nalazi na ${r.put}`).toEqual([]);
    // axe 4.x više ne prijavljuje duplicirane ID-jeve kao WCAG nalaz (4.1.1 je zastario), a dupli ID
    // kvari aria-labelledby i skip link (#sadrzaj na /uvjeti, S9): provjera ide ovdje.
    const dupli = await page.evaluate(() => {
      const n = new Map<string, number>();
      for (const el of document.querySelectorAll("[id]")) n.set(el.id, (n.get(el.id) ?? 0) + 1);
      return [...n].filter(([, c]) => c > 1).map(([id]) => id);
    });
    expect(dupli, `duplicirani id na ${r.put}`).toEqual([]);
  });
}
