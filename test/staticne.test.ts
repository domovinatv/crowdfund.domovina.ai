/**
 * Statične stranice S5: svaka ruta ima pogled, tekstovi su jednako strukturirani na hr i en,
 * copy bez „ulaganja”, pravila prikaza nose svih 7 redoslijeda, učitavači FAQ-a i ponude.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { OPIS_REDOSLIJEDA, REDOSLIJEDI } from "../src/lib/redoslijedi";
import { url } from "../src/lib/rute";
import { FAQ, KATEGORIJE_FAQ } from "../src/views/sadrzaj/faq";
import * as kakoRadi from "../src/views/sadrzaj/kako-radi";
import { KONTAKT, TEME } from "../src/views/sadrzaj/kontakt";
import { NAZIVI, SKUPINE } from "../src/views/sadrzaj/navigacija";
import * as organizacije from "../src/views/sadrzaj/organizacije";
import { PRAVILA_PRIKAZA } from "../src/views/sadrzaj/pravila-prikaza";
import * as pravno from "../src/views/sadrzaj/pravno";
import { SIGURNOST } from "../src/views/sadrzaj/sigurnost";
import type { SadrzajStranice } from "../src/views/sadrzaj/tipovi";
import { TROSKOVI } from "../src/views/sadrzaj/troskovi";
import { ucitaj as ucitajFaq } from "../src/views/stranice/faq.category.ucitaj";
import { ucitaj as ucitajPonudu } from "../src/views/stranice/offers.new.ucitaj";
import type { KontekstStranice } from "../src/views/tipovi";
import { ROOT } from "./pomoc/baza";

const S5_STATICNE = [
  "how-it-works", "how-it-works.for-others", "how-it-works.donate", "how-it-works.moneyboxes", "how-it-works.sharing",
  "how-it-works.offers", "costs", "faq", "faq.category", "safety", "terms", "privacy", "ranking", "about", "contact",
  "for-organisations", "monthly", "offers", "offers.new",
];

const STRANICE: Record<string, { hr: SadrzajStranice; en: SadrzajStranice }> = {
  ...(kakoRadi as Record<string, { hr: SadrzajStranice; en: SadrzajStranice }>),
  ZA_ORGANIZACIJE: organizacije.ZA_ORGANIZACIJE,
  MJESECNE: organizacije.MJESECNE,
  PONUDE_KATALOG: organizacije.PONUDE_KATALOG,
  PONUDE_NOVA: organizacije.PONUDE_NOVA,
  O_NAMA: pravno.O_NAMA,
  UVJETI: pravno.UVJETI,
  PRIVATNOST: pravno.PRIVATNOST,
  TROSKOVI,
  SIGURNOST,
  PRAVILA_PRIKAZA,
  KONTAKT,
};

/** Oblik bez teksta: ključevi, duljine nizova, zastavice; tekst mora biti neprazan. */
function oblik(x: unknown): unknown {
  if (typeof x === "string") return x.trim() ? "s" : "PRAZNO";
  if (Array.isArray(x)) return x.map(oblik);
  if (x && typeof x === "object") {
    return Object.fromEntries(
      Object.entries(x)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, k === "id" || k === "kljuc" || k === "sidro" || k === "upit" || typeof v === "boolean" ? v : oblik(v)]),
    );
  }
  return x;
}

const ctx = (put: string, params: Record<string, string> = {}): KontekstStranice => {
  const u = new URL(put, "http://x");
  return { lang: put.startsWith("/en") ? "en" : "hr", params, url: u, request: new Request(u), cookies: undefined as never, db: undefined as never, korisnik: null };
};

describe("pogledi S5", () => {
  const datoteke = readdirSync(join(ROOT, "src/views/stranice"));
  it.each(S5_STATICNE)("%s ima pogled", (k) => {
    expect(datoteke).toContain(`${k}.astro`);
  });
});

describe("hr i en su jednako strukturirani", () => {
  it.each(Object.keys(STRANICE))("%s", (ime) => {
    expect(oblik(STRANICE[ime]!.en)).toEqual(oblik(STRANICE[ime]!.hr));
  });
  it("FAQ: iste kategorije i ista pitanja (id) na oba jezika", () => {
    expect(oblik(FAQ.en)).toEqual(oblik(FAQ.hr));
    expect(Object.keys(FAQ.hr)).toEqual([...KATEGORIJE_FAQ]);
  });
  it("kontakt: nazivi svih 10 tema na oba jezika", () => {
    expect(Object.keys(TEME.hr)).toHaveLength(10);
    expect(Object.keys(TEME.en)).toEqual(Object.keys(TEME.hr));
  });
  it("navigacija: svaka stranica skupine ima naziv na oba jezika i vodi na postojeću rutu", () => {
    for (const s of Object.values(SKUPINE))
      for (const k of s.stranice) {
        expect(NAZIVI[k]?.hr && NAZIVI[k]?.en, k).toBeTruthy();
        expect(() => url("hr", k)).not.toThrow();
      }
  });
});

describe("copy", () => {
  const izvor = readdirSync(join(ROOT, "src/views/sadrzaj")).map((f) => readFileSync(join(ROOT, "src/views/sadrzaj", f), "utf8")).join("\n");
  it("podržavatelj doprinosi ili donira, nikad ne „ulaže” (odluka 13)", () => {
    expect(izvor).not.toMatch(/\bula(že|ž|gat|gan|g)|\bulož|\binvest/i);
  });
  it("svaka veza u sadržaju vodi na postojeću rutu", () => {
    const sve = [...Object.values(STRANICE).flatMap((s) => [s.hr, s.en]).flatMap((s) => s.odjeljci), ...Object.values(FAQ.hr).flatMap((k) => k.pitanja), ...Object.values(FAQ.en).flatMap((k) => k.pitanja)];
    for (const v of sve.flatMap((o) => o.veze ?? [])) expect(url("hr", v.kljuc, v.params)).not.toContain("{");
  });
});

describe("pravila prikaza (DSA)", () => {
  it.each(["hr", "en"] as const)("%s: svih 7 redoslijeda, redom, s javnim opisom", (lang) => {
    const o = PRAVILA_PRIKAZA[lang].odjeljci.find((x) => x.id === "redoslijedi")!;
    expect(o.definicije).toHaveLength(REDOSLIJEDI.length);
    REDOSLIJEDI.forEach((r, i) => {
      expect(o.definicije![i]!.pojam.startsWith(OPIS_REDOSLIJEDA[r][lang].naziv)).toBe(true);
      expect(o.definicije![i]!.opis).toBe(OPIS_REDOSLIJEDA[r][lang].opis);
    });
  });
  it("katalog, plaćeno isticanje i urednički izbor su opisani", () => {
    expect(PRAVILA_PRIKAZA.hr.odjeljci.map((o) => o.id)).toEqual(expect.arrayContaining(["katalog", "placeno", "urednicki-izbor"]));
  });
});

describe("učitavači", () => {
  it.each(KATEGORIJE_FAQ)("FAQ %s → podaci", async (k) => {
    expect(await ucitajFaq(ctx(`/en/faq/${k}`, { category: k }))).toEqual({ podaci: { kategorija: k } });
  });
  it("FAQ nepoznata kategorija → 404 (i hrvatski ključ, odluka 502)", async () => {
    for (const k of ["nepostoji", "doniranje", "constructor"]) {
      const r = await ucitajFaq(ctx(`/hr/cesta-pitanja/${k}`, { category: k }));
      expect(r).toBeInstanceOf(Response);
      expect((r as Response).status).toBe(404);
    }
  });
  it("nova ponuda bez prijave → 302 na prijavu s ?next=", async () => {
    const r = (await ucitajPonudu(ctx("/en/offers/new?campaign=AB12CD"))) as Response;
    expect(r.status).toBe(302);
    expect(r.headers.get("Location")).toBe(`/en/sign-in?next=${encodeURIComponent("/en/offers/new?campaign=AB12CD")}`);
  });
});
