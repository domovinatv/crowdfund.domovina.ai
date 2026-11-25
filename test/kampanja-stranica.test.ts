/**
 * Stranica kampanje i podrute (S5): čista logika (kanonski ID, QR SVG, hash posjetitelja, dijeljenje, widget,
 * množina), tekstovi oba jezika istog oblika, učitavači nad seedanim SQLiteom (404, 301, 303, stub podrške).
 */
import { describe, expect, it } from "vitest";
import { kodWidgeta, opcijeWidgetaIz, poveznice, putStreama, putUgradnje } from "../src/components/kampanja/dijeljenje";
import { formatNovca, kanonskiJavniId, skratiAdresu } from "../src/components/kampanja/format";
import { hashPosjetitelja } from "../src/components/kampanja/posjetitelj";
import { TIHA_ZONA, qrMatrica, qrSvg } from "../src/components/kampanja/qr";
import * as kampanjaTekst from "../src/views/sadrzaj/kampanja";
import * as prijavaTekst from "../src/views/sadrzaj/prijava-sadrzaja";
import { ucitaj as ucitajKampanju, type PodaciKampanje } from "../src/views/stranice/campaign.ucitaj";
import { ucitaj as ucitajQr } from "../src/views/stranice/campaign.qr.ucitaj";
import { popisCestitke, ucitaj as ucitajPlakat, type PodaciPlakata } from "../src/views/stranice/campaign.poster.ucitaj";
import { ucitaj as ucitajWidget, type PodaciWidgeta } from "../src/views/stranice/campaign.widget.ucitaj";
import type { Uplata } from "../src/lib/db/kampanja";
import { ucitaj as ucitajPodrsku, type PodaciPodrske } from "../src/views/stranice/campaign.support.ucitaj";
import { ucitaj as ucitajKasicu } from "../src/views/stranice/moneybox.ucitaj";
import { ucitaj as ucitajPrijavu, type PodaciPrijave } from "../src/views/stranice/report.ucitaj";
import { ucitaj as ucitajPracenje } from "../src/views/stranice/follow.ucitaj";
import { ucitaj as ucitajOdjavu } from "../src/views/stranice/follow.unsubscribe.ucitaj";
import type { KontekstStranice } from "../src/views/tipovi";
import primjeri from "../seed/primjeri.json";
import { broj, kaoD1, novaBaza } from "./pomoc/baza";

const K = primjeri.kampanja;

describe("kanonskiJavniId()", () => {
  it("mala slova su kanonska, velika → preusmjeri, nevaljan oblik → null", () => {
    expect(kanonskiJavniId("1h01zm")).toEqual({ id: "1h01zm", preusmjeri: false });
    expect(kanonskiJavniId("1H01ZM")).toEqual({ id: "1h01zm", preusmjeri: true });
    expect(kanonskiJavniId("kampanje")).toEqual({ id: null, preusmjeri: false });
    expect(kanonskiJavniId("1i01zm")).toEqual({ id: null, preusmjeri: false }); // i nije u Crockford abecedi
  });
});

describe("oblikovanje", () => {
  it("novac bez decimala za cijele iznose, s decimalama inače", () => {
    expect(formatNovca("hr")(125000).replace(/\s/g, " ")).toBe("1.250 €");
    expect(formatNovca("hr")(1250).replace(/\s/g, " ")).toBe("12,50 €");
    expect(formatNovca("en")(125000)).toContain("1,250");
  });
  it("Safe adresa se skraćuje na početak i kraj", () => {
    expect(skratiAdresu("0xde5afe00000000000000000000000000000a1b2c")).toBe("0xde5a…1b2c");
  });
  it("množina: hr one/few/other, en one/other", () => {
    const m = kampanjaTekst.KAMPANJA.hr.statistika.podrzavatelja;
    expect(kampanjaTekst.mnozina("hr", 1, m)).toBe("1 podržavatelj");
    expect(kampanjaTekst.mnozina("hr", 3, kampanjaTekst.KAMPANJA.hr.statistika.uplata)).toBe("3 uplate");
    expect(kampanjaTekst.mnozina("hr", 21, kampanjaTekst.KAMPANJA.hr.statistika.dana)).toBe("21 dan do kraja");
    expect(kampanjaTekst.mnozina("en", 2, kampanjaTekst.KAMPANJA.en.statistika.podrzavatelja)).toBe("2 supporters");
  });
});

describe("qrSvg()", () => {
  const adresa = "https://crowdfund.domovina.ai/1h01zm";
  it("deterministički SVG s tihom zonom 4 i jednim modulom po tamnoj ćeliji", () => {
    const m = qrMatrica(adresa);
    const svg = qrSvg(adresa, { naslov: "QR <test> & \"x\"" });
    const n = m.length + 2 * TIHA_ZONA;
    expect(m.length).toBeGreaterThanOrEqual(21);
    expect(svg).toBe(qrSvg(adresa, { naslov: "QR <test> & \"x\"" }));
    expect(svg).toContain(`viewBox="0 0 ${n} ${n}"`);
    expect((svg.match(/h1v1h-1z/g) ?? []).length).toBe(m.flat().filter(Boolean).length);
    expect(svg).toContain("<title>QR &lt;test&gt; &amp; &quot;x&quot;</title>");
    expect(svg).not.toMatch(/<script|href=|xlink/);
  });
  it("tražilo (finder) u gornjem lijevom kutu: 7×7 tamni rub", () => {
    const m = qrMatrica(adresa);
    for (let i = 0; i < 7; i++) {
      expect(m[0]![i]).toBe(true);
      expect(m[6]![i]).toBe(true);
      expect(m[i]![0]).toBe(true);
    }
  });
});

describe("hashPosjetitelja()", () => {
  const sad = new Date(Date.UTC(2026, 10, 20, 9));
  it("64 hex znaka, bez sirovog IP-a, isti dan isti hash, drugi dan drugi", async () => {
    const a = await hashPosjetitelja({ ip: "203.0.113.7", userAgent: "UA", sad });
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toContain("203");
    expect(await hashPosjetitelja({ ip: "203.0.113.7", userAgent: "UA", sad: new Date(Date.UTC(2026, 10, 20, 23)) })).toBe(a);
    expect(await hashPosjetitelja({ ip: "203.0.113.7", userAgent: "UA", sad: new Date(Date.UTC(2026, 10, 21, 1)) })).not.toBe(a);
    expect(await hashPosjetitelja({ ip: "203.0.113.8", userAgent: "UA", sad })).not.toBe(a);
    expect(await hashPosjetitelja({ ip: "203.0.113.7", userAgent: "UA", sad }, "druga-tajna")).not.toBe(a);
  });
});

describe("dijeljenje i widget", () => {
  it("poveznice su obične adrese s kodiranim URL-om", () => {
    const p = Object.fromEntries(poveznice("https://x.hr/1h01zm", "Naslov & više").map((x) => [x.kljuc, x.href]));
    expect(p.email).toMatch(/^mailto:\?subject=Naslov%20%26%20vi%C5%A1e&body=/);
    expect(p.whatsapp).toBe("https://wa.me/?text=Naslov%20%26%20vi%C5%A1e%20https%3A%2F%2Fx.hr%2F1h01zm");
    expect(p.facebook).toBe("https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fx.hr%2F1h01zm");
    expect(p.linkedin).toBe("https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fx.hr%2F1h01zm");
  });
  it("put ugradnje izostavlja zadane parametre, kod widgeta je iframe s escapeom", () => {
    expect(putUgradnje("1h01zm", "hr", "campaign")).toBe("/embed/1h01zm");
    expect(putUgradnje("1h01zm", "en", "support")).toBe("/embed/1h01zm?lang=en&target=support");
    const kod = kodWidgeta("https://crowdfund.domovina.ai", "1h01zm", "en", "support", 'A "b" <c>');
    expect(kod).toBe(
      '<iframe src="https://crowdfund.domovina.ai/embed/1h01zm?lang=en&amp;target=support" title="A &quot;b&quot; &lt;c>" width="360" height="420" style="border:0;max-width:100%" loading="lazy"></iframe>',
    );
  });
});

/** Oblik bez teksta (ključevi i duljine), funkcije se ne uspoređuju. */
function oblik(x: unknown): unknown {
  if (typeof x === "string") return x.trim() ? "s" : "PRAZNO";
  if (Array.isArray(x)) return x.map(oblik);
  if (x && typeof x === "object") return Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, oblik(v)]));
  return typeof x;
}

describe("tekstovi kampanje, prijave i praćenja", () => {
  const dvojezicni = { ...kampanjaTekst, ...prijavaTekst } as Record<string, unknown>;
  it.each(["KAMPANJA", "PODRUTE", "TEME_NASLOVNICE", "PRIJAVA", "PRACENJE"])("%s: hr i en istog oblika", (ime) => {
    const m = dvojezicni[ime] as { hr: unknown; en: unknown };
    expect(oblik(m.en)).toEqual(oblik(m.hr));
  });
  it("copy: doprinosi / donira, nikad „ulaže” / „invest”", () => {
    expect(JSON.stringify(dvojezicni)).not.toMatch(/ulag|ulož|ulaž|invest/i);
  });
});

describe("učitavači nad seedom", () => {
  const sqlite = novaBaza({ seed: true });
  const db = kaoD1(sqlite);
  const ctx = (put: string, params: Record<string, string>, init?: RequestInit): KontekstStranice => {
    const u = new URL(put, "http://localhost:8802");
    return { lang: put.startsWith("/en") ? "en" : "hr", params, url: u, request: new Request(u, init), cookies: undefined as never, db, korisnik: null };
  };
  const status = (r: unknown) => (r instanceof Response ? r.status : 200);

  it("campaign: javno vidljive 200, review/draft/blokirana/obrisana i nevaljan ID 404, velika slova 301", async () => {
    for (const [ime, id] of Object.entries(K)) {
      expect([ime, status(await ucitajKampanju(ctx(`/hr/${id}`, { id })))]).toEqual([ime, ime.endsWith("404") ? 404 : 200]);
    }
    expect(status(await ucitajKampanju(ctx("/hr/zzzzzz", { id: "zzzzzz" })))).toBe(404);
    const r = (await ucitajKampanju(ctx(`/en/${K.aktivna.toUpperCase()}?contributions=highest`, { id: K.aktivna.toUpperCase() }))) as Response;
    expect(r.status).toBe(301);
    expect(r.headers.get("Location")).toBe(`/en/${K.aktivna}?contributions=highest`);
  });

  it("campaign: skriveni popis uplata, isključeni komentari, skriveni iznos → samo po vremenu", async () => {
    const podaci = async (id: string, upit = "") => ((await ucitajKampanju(ctx(`/hr/${id}${upit}`, { id }))) as { podaci: PodaciKampanje }).podaci;
    expect((await podaci(K.popisUplataSkriven)).uplate.skriveno).toBe(true);
    expect((await podaci(K.komentariIskljuceni)).komentari.iskljuceni).toBe(true);
    const skriven = await podaci(K.skrivenIznos, "?contributions=highest");
    expect(skriven.k.statistika.raisedCents).toBeNull();
    expect(skriven.uplate.sort).toBe("latest");
    expect(skriven.uplate.uplate.every((u) => u.amountCents === null)).toBe(true);
    expect((await podaci(K.sPonudama)).ponude.length).toBeGreaterThan(0);
  });

  it("campaign: popis uplata po 10, „još” dok ima više", async () => {
    const p = ((await ucitajKampanju(ctx(`/hr/${K.aktivna}`, { id: K.aktivna }))) as { podaci: PodaciKampanje }).podaci;
    expect(p.uplate.uplate.length).toBeLessThanOrEqual(10);
    if (p.josUplata) {
      const p2 = ((await ucitajKampanju(ctx(`/hr/${K.aktivna}?contributions_page=2`, { id: K.aktivna }))) as { podaci: PodaciKampanje }).podaci;
      expect(p2.uplate.uplate.length).toBeGreaterThan(10);
    }
  });

  it("campaign: POST „Prati” neprijavljenog sprema nepotvrđeno praćenje i vraća 303 na potvrdu (S6)", async () => {
    const prije = broj(sqlite, "SELECT count(*) FROM campaign_follows");
    const r = (await ucitajKampanju(ctx(`/hr/${K.aktivna}`, { id: K.aktivna }, { method: "POST", body: new URLSearchParams({ akcija: "prati", email: "a@b.hr", novosti: "1" }) }))) as Response;
    expect(r.status).toBe(303);
    expect(r.headers.get("Location")).toBe(`/hr/${K.aktivna}?prati=potvrda#prati`);
    expect(broj(sqlite, "SELECT count(*) FROM campaign_follows")).toBe(prije + 1);
    expect(broj(sqlite, "SELECT count(*) FROM campaign_follows WHERE email = 'a@b.hr' AND confirmed_at IS NULL AND token_hash IS NOT NULL")).toBe(1);
  });

  it("campaign.qr: ?format=svg je preuzimanje SVG-a kratkog linka", async () => {
    const r = (await ucitajQr(ctx(`/hr/${K.aktivna}/qr?format=svg`, { id: K.aktivna }))) as Response;
    expect(r.headers.get("Content-Type")).toMatch(/^image\/svg\+xml/);
    expect(r.headers.get("Content-Disposition")).toBe(`attachment; filename="qr-${K.aktivna}.svg"`);
    expect(await r.text()).toContain(`http://localhost:8802/${K.aktivna}`);
  });

  it("campaign.support: kasica iz ?s= samo ako pripada kampanji; isključena kampanja 200 bez uplate", async () => {
    const kasica = await ucitajKasicu(ctx(`/hr/s/${primjeri.kasica}`, { alias: primjeri.kasica }));
    const pid = (kasica as { podaci: { kasica: { kampanja: { publicId: string } } } }).podaci.kasica.kampanja.publicId;
    const s = ((await ucitajPodrsku(ctx(`/hr/${pid}/podrzi?s=${primjeri.kasica}`, { id: pid }))) as { podaci: PodaciPodrske }).podaci;
    expect(s.kasica?.alias).toBe(primjeri.kasica);
    const drugi = pid === K.aktivna ? K.mjesecna : K.aktivna;
    expect(((await ucitajPodrsku(ctx(`/hr/${drugi}/podrzi?s=${primjeri.kasica}`, { id: drugi }))) as { podaci: PodaciPodrske }).podaci.kasica).toBeNull();
    const p = ((await ucitajPodrsku(ctx(`/hr/${K.paused}/podrzi`, { id: K.paused }))) as { podaci: PodaciPodrske }).podaci;
    expect(p.k.primaUplate).toBe(false);
  });

  it("moneybox: neaktivna 404, alias velikim slovima 301", async () => {
    expect(status(await ucitajKasicu(ctx(`/hr/s/${primjeri.kasicaNeaktivna404}`, { alias: primjeri.kasicaNeaktivna404 })))).toBe(404);
    const r = (await ucitajKasicu(ctx(`/hr/s/${primjeri.kasica.toUpperCase()}`, { alias: primjeri.kasica.toUpperCase() }))) as Response;
    expect([r.status, r.headers.get("Location")]).toEqual([301, `/hr/s/${primjeri.kasica}`]);
  });

  it("report: predpopunjen cilj, greške uz polje bez upisa, ispravna prijava → 303 i jedan red", async () => {
    const get = ((await ucitajPrijavu(ctx(`/hr/prijavi-sadrzaj?target=campaign&id=${K.aktivna}`, {}))) as { podaci: PodaciPrijave }).podaci;
    expect(get.vrijednosti).toMatchObject({ targetType: "campaign", targetId: K.aktivna });
    const prije = broj(sqlite, "SELECT count(*) FROM reports");
    const forma = (x: Record<string, string>) => ({ method: "POST", body: new URLSearchParams(x) });
    const dobro = { target: "campaign", id: K.aktivna, reason: "fraud", description: "x".repeat(60), email: "prijava@primjer.hr", izjava: "1", privola: "1" };
    const bezIzjave = { ...dobro, izjava: "" };
    const losa = ((await ucitajPrijavu(ctx("/hr/prijavi-sadrzaj", {}, forma(bezIzjave)))) as { podaci: PodaciPrijave }).podaci;
    expect(losa.greske).toEqual({ izjava: "obavezno" });
    const kratko = ((await ucitajPrijavu(ctx("/hr/prijavi-sadrzaj", {}, forma({ ...dobro, description: "kratko" })))) as { podaci: PodaciPrijave }).podaci;
    expect(kratko.greske).toEqual({ description: "prekratko" });
    expect(broj(sqlite, "SELECT count(*) FROM reports")).toBe(prije);
    const r = (await ucitajPrijavu(ctx("/en/report", {}, forma(dobro)))) as Response;
    expect([r.status, r.headers.get("Location")]).toEqual([303, "/en/report?poslano=1"]);
    expect(broj(sqlite, "SELECT count(*) FROM reports")).toBe(prije + 1);
  });

  it("follow i odjava: neispravan token 404, POST odjava → 303 i sve obavijesti isključene", async () => {
    const token = primjeri.pracenjeToken;
    expect(status(await ucitajPracenje(ctx("/hr/pracenje/x.y.z", { token: "x.y.z" })))).toBe(404);
    expect(status(await ucitajPracenje(ctx(`/hr/pracenje/${token}`, { token })))).toBe(200);
    expect(status(await ucitajOdjavu(ctx("/hr/pracenje/x.y.z/odjava", { token: "x.y.z" }, { method: "POST" })))).toBe(404);
    const r = (await ucitajOdjavu(ctx(`/en/follow/${token}/unsubscribe`, { token }, { method: "POST" }))) as Response;
    expect([r.status, r.headers.get("Location")]).toEqual([303, `/en/follow/${token}/unsubscribe?odjavljeno=1`]);
    const p = (await ucitajPracenje(ctx(`/hr/pracenje/${token}`, { token }))) as { podaci: { p: { aktivno: boolean } } };
    expect(p.podaci.p.aktivno).toBe(false);
  });
});

describe("S10: widget (veličina, izgled, stream) i čestitka zahvale", () => {
  it("opcijeWidgetaIz: whitelist, sve ostalo pada na zadano", () => {
    expect(opcijeWidgetaIz(new URLSearchParams(""))).toEqual({ target: "campaign", velicina: "medium", izgled: "light" });
    expect(opcijeWidgetaIz(new URLSearchParams("target=support&size=small&theme=dark"))).toEqual({ target: "support", velicina: "small", izgled: "dark" });
    expect(opcijeWidgetaIz(new URLSearchParams("target=x&size=<b>&theme=DARK"))).toEqual({ target: "campaign", velicina: "medium", izgled: "light" });
    expect(opcijeWidgetaIz(new URLSearchParams("size=large&size=small"))).toMatchObject({ velicina: "large" });
  });

  it("put i kod: zadane vrijednosti se izostavljaju, dimenzije iframea prate veličinu, stream adresa", () => {
    expect(putUgradnje("1h01zm", "hr", "campaign", { velicina: "medium", izgled: "light" })).toBe("/embed/1h01zm");
    expect(putUgradnje("1h01zm", "en", "support", { velicina: "large", izgled: "dark" })).toBe("/embed/1h01zm?lang=en&target=support&size=large&theme=dark");
    const kod = kodWidgeta("https://crowdfund.domovina.ai", "1h01zm", "hr", "campaign", "N", { velicina: "small", izgled: "dark" });
    expect(kod).toBe(
      '<iframe src="https://crowdfund.domovina.ai/embed/1h01zm?size=small&amp;theme=dark" title="N" width="300" height="340" style="border:0;max-width:100%" loading="lazy"></iframe>',
    );
    expect(kodWidgeta("https://x.hr", "1h01zm", "hr", "campaign", "N", { velicina: "large" })).toContain('width="480" height="480"');
    expect(putStreama("https://x.hr", "1h01zm", "hr")).toBe("https://x.hr/embed/1h01zm/stream");
    expect(putStreama("https://x.hr", "1h01zm", "en")).toBe("https://x.hr/embed/1h01zm/stream?lang=en");
  });

  it("popisCestitke: skriveni popis, anonimni bez imena, iznos kakav je javan, „i još N”, granica imena", () => {
    const u = (x: Partial<Uplata>): Uplata => ({ paidAt: 1, name: "Ana", anonymous: false, nameVerified: false, amountCents: 1000, message: null, tierTitle: null, quantity: 1, ...x });
    expect(popisCestitke({ skriveno: true, sort: "latest", ukupno: null, uplate: [] })).toEqual({ skriveno: true, imena: [], anonimnih: 0, jos: null });
    const p = popisCestitke({
      skriveno: false,
      sort: "latest",
      ukupno: 10,
      uplate: [u({}), u({ name: null, anonymous: true, amountCents: 5000 }), u({ name: "Ivo", amountCents: null }), u({ name: "Eva" })],
    }, 2);
    expect(p).toEqual({ skriveno: false, imena: [{ ime: "Ana", iznosCenti: 1000 }, { ime: "Ivo", iznosCenti: null }], anonimnih: 1, jos: 7 });
    expect(popisCestitke({ skriveno: false, sort: "latest", ukupno: null, uplate: [u({})] }).jos).toBeNull();
  });

  it("učitavači: plakat ?varijanta=cestitka (nepoznata → plakat), skriven popis; widget s veličinom i izgledom", async () => {
    const db = kaoD1(novaBaza({ seed: true }));
    const ctx = (put: string, id: string): KontekstStranice => {
      const u = new URL(put, "http://localhost:8802");
      return { lang: "hr", params: { id }, url: u, request: new Request(u), cookies: undefined as never, db, korisnik: null };
    };
    const plakat = async (id: string, upit: string) => ((await ucitajPlakat(ctx(`/hr/${id}/plakat${upit}`, id))) as { podaci: PodaciPlakata }).podaci;
    expect(await plakat(K.aktivna, "?varijanta=nesto")).toMatchObject({ varijanta: "plakat", cestitka: null });
    const c = (await plakat(K.aktivna, "?varijanta=cestitka")).cestitka!;
    expect(c.skriveno).toBe(false);
    expect(c.imena.length + c.anonimnih).toBeGreaterThan(0);
    expect((await plakat(K.popisUplataSkriven, "?varijanta=cestitka")).cestitka).toMatchObject({ skriveno: true, imena: [] });
    // Kampanja skriva prikupljeno → ni jedan iznos na čestitki.
    expect((await plakat(K.skrivenIznos, "?varijanta=cestitka")).cestitka!.imena.every((x) => x.iznosCenti === null)).toBe(true);

    const w = ((await ucitajWidget(ctx(`/hr/${K.aktivna}/widget?size=small&theme=dark&target=support`, K.aktivna))) as { podaci: PodaciWidgeta }).podaci;
    expect(w).toMatchObject({ velicina: "small", izgled: "dark", target: "support", dimenzije: { w: 300, h: 340 } });
    expect(w.pregled).toBe(`/embed/${K.aktivna}?target=support&size=small&theme=dark`);
    expect(w.stream).toBe(`http://localhost:8802/embed/${K.aktivna}/stream`);
    const z = ((await ucitajWidget(ctx(`/hr/${K.aktivna}/widget?size=huge&theme=neon`, K.aktivna))) as { podaci: PodaciWidgeta }).podaci;
    expect(z).toMatchObject({ velicina: "medium", izgled: "light" });
    expect(z.kod).toContain('width="360" height="420"');
  });
});
