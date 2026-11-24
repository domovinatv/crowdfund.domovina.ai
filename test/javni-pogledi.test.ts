/**
 * Javni pogledi S5 (naslovnica, katalozi, profili, vanjska kampanja): gradnja URL-a kataloga bez JS-a,
 * množina, tekstovi hr/en istog oblika i učitavači nad seedom (302 čišćenja, prevelik `page`, 404).
 */
import { describe, expect, it } from "vitest";
import { brojem, oblikMnozine } from "../src/components/katalog/oblik";
import { aktivniFiltri, bezFiltra, brojeviStranica, naStranicu, ocisceniUpit, parovi, sUpitom } from "../src/components/katalog/upit";
import { temaKategorije } from "../src/components/katalog/teme";
import * as javni from "../src/views/sadrzaj/javni";
import { ucitaj as ucitajKatalog, type PodaciKataloga } from "../src/views/stranice/campaigns.ucitaj";
import { ucitaj as ucitajVanjsku } from "../src/views/stranice/external.campaign.ucitaj";
import { ucitaj as ucitajNaslovnicu, type PodaciNaslovnice } from "../src/views/stranice/home.ucitaj";
import { ucitaj as ucitajOrg, type PodaciOrganizacije } from "../src/views/stranice/org.ucitaj";
import { ucitaj as ucitajOrganizacije, type PodaciOrganizacija } from "../src/views/stranice/organisations.ucitaj";
import { ucitaj as ucitajOsobu } from "../src/views/stranice/user.ucitaj";
import type { KontekstStranice } from "../src/views/tipovi";
import primjeri from "../seed/primjeri.json";
import { kaoD1, novaBaza } from "./pomoc/baza";

const db = kaoD1(novaBaza({ seed: true }));
const ctx = (put: string, params: Record<string, string> = {}): KontekstStranice => {
  const u = new URL(put, "http://x");
  return { lang: put.startsWith("/en") ? "en" : "hr", params, url: u, request: new Request(u), cookies: undefined as never, db };
};
const P = (s: string) => new URLSearchParams(s);
const podaci = <T>(r: unknown): T => {
  expect(r).not.toBeInstanceOf(Response);
  return (r as { podaci: T }).podaci;
};

describe("upit kataloga", () => {
  it("parovi i sUpitom: bez praznih i izostavljenih ključeva", () => {
    expect(parovi(P("q=&category=animals&page=2&sort=most"), ["page"])).toEqual([["category", "animals"], ["sort", "most"]]);
    expect(sUpitom("/hr/kampanje", [])).toBe("/hr/kampanje");
    expect(sUpitom("/hr/kampanje", [["q", "krov i ž"]])).toBe("/hr/kampanje?q=krov+i+%C5%BE");
  });

  it("čip ✕ miče filtar i stranicu, ostalo (i sort) ostaje", () => {
    expect(bezFiltra("/hr/kampanje", P("category=animals&verified=1&page=3&sort=newest"), "verified")).toBe("/hr/kampanje?category=animals&sort=newest");
  });

  it("naStranicu: prva bez `page`, ostale s njim", () => {
    const p = P("type=recurring&page=4");
    expect(naStranicu("/en/campaigns", p, 1)).toBe("/en/campaigns?type=recurring");
    expect(naStranicu("/en/campaigns", p, 5)).toBe("/en/campaigns?type=recurring&page=5");
  });

  it("brojeviStranica: prva, zadnja, susjedi, „…” samo za razmak veći od jedne", () => {
    expect(brojeviStranica(1, 1)).toEqual([1]);
    expect(brojeviStranica(1, 3)).toEqual([1, 2, 3]);
    expect(brojeviStranica(5, 10)).toEqual([1, null, 4, 5, 6, null, 10]);
    expect(brojeviStranica(3, 10)).toEqual([1, 2, 3, 4, null, 10]);
    expect(brojeviStranica(50, 4)).toEqual([1, null, 4]);
  });

  it("aktivniFiltri: ista pravila kao upit (boolean 0/false/off isključen, nevaljana vrsta ignorirana)", () => {
    expect(aktivniFiltri(P("q=%20krov%20&verified=1&ending=0&successful=off&type=xx&near=Zagreb&sort=most&page=2"))).toEqual([
      { kljuc: "q", vrijednost: "krov" },
      { kljuc: "verified", vrijednost: "1" },
      { kljuc: "near", vrijednost: "Zagreb" },
    ]);
    expect(aktivniFiltri(P("type=for_organization&moneyboxes=on"))).toEqual([
      { kljuc: "type", vrijednost: "for_organization" },
      { kljuc: "moneyboxes", vrijednost: "1" },
    ]);
  });

  it("ocisceniUpit: prazna polja, page=1 i nevaljan page van; čist upit → null", () => {
    expect(ocisceniUpit(P("q=&category=&type=recurring&near=&page=1"))).toEqual([["type", "recurring"]]);
    expect(ocisceniUpit(P("page=abc&sort=most"))).toEqual([["sort", "most"]]);
    expect(ocisceniUpit(P("type=recurring&page=2"))).toBeNull();
    expect(ocisceniUpit(P(""))).toBeNull();
  });
});

describe("oblik", () => {
  it("hrvatska množina ima tri oblika, engleska dva", () => {
    expect([1, 2, 4, 5, 11, 12, 21, 22, 25, 111, 101].map((n) => oblikMnozine("hr", n))).toEqual([
      "one", "few", "few", "other", "other", "other", "one", "few", "other", "other", "one",
    ]);
    expect([0, 1, 2, 21].map((n) => oblikMnozine("en", n))).toEqual(["other", "one", "other", "other"]);
    expect(brojem("hr", "card.daysLeft", 21)).toBe("Još 21 dan");
    expect(brojem("hr", "catalog.results", 3)).toBe("3 kampanje");
    expect(brojem("en", "card.supporters", 1)).toBe("1 supporter");
  });

  it("tema vanjske kampanje iz kategorije, nepoznata → null", () => {
    expect(temaKategorije("culture")).toBe("event");
    expect(temaKategorije(null)).toBeNull();
  });
});

/** Oblik bez teksta: ključevi i duljine nizova; tekst mora biti neprazan. */
function oblikTeksta(x: unknown): unknown {
  if (typeof x === "string") return x.trim() ? "s" : "PRAZNO";
  if (Array.isArray(x)) return x.map(oblikTeksta);
  if (x && typeof x === "object") {
    return Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, k === "vrsta" || k === "kljuc" ? v : oblikTeksta(v)]));
  }
  return x;
}

describe("tekstovi javnog dijela", () => {
  const moduli = Object.entries(javni).filter(([, v]) => v && typeof v === "object" && "hr" in v && "en" in v) as [string, { hr: unknown; en: unknown }][];

  it.each(moduli)("%s: hr i en istog oblika, bez praznih tekstova", (_, m) => {
    expect(oblikTeksta(m.en)).toEqual(oblikTeksta(m.hr));
    expect(JSON.stringify(m)).not.toContain("PRAZNO");
  });

  it("copy: doprinosi / donira, nikad „ulaže” / „invest”", () => {
    for (const [, m] of moduli) expect(JSON.stringify(m)).not.toMatch(/ulag|ulož|ulaž|invest/i);
  });
});

describe("učitavači", () => {
  it("naslovnica: izbor samo verificiranih, 4 kategorije+ s brojem, do 6 aktivnih", async () => {
    const p = podaci<PodaciNaslovnice>(await ucitajNaslovnicu(ctx("/hr")));
    expect(p.izbor.length).toBeGreaterThan(0);
    expect(p.izbor.every((k) => k.verified)).toBe(true);
    expect(p.kategorije).toHaveLength(8);
    expect(p.aktivne.length).toBeGreaterThan(0);
    expect(p.aktivne.length).toBeLessThanOrEqual(6);
    expect(p.brojaci.aktivnihKampanja).toBeGreaterThan(0);
  });

  it("katalog: prazna polja obrasca → 302 na čist upit", async () => {
    const r = (await ucitajKatalog(ctx("/hr/kampanje?q=&category=animals&type=&page=1"))) as Response;
    expect(r.status).toBe(302);
    expect(r.headers.get("Location")).toBe("/hr/kampanje?category=animals");
  });

  it("katalog: filtar kategorije i prevelik page (prazne kartice, ukupno > 0, nije 404)", async () => {
    const f = podaci<PodaciKataloga>(await ucitajKatalog(ctx(`/hr/kampanje?category=${primjeri.kategorija}`)));
    expect(f.rezultat.ukupno).toBeGreaterThan(0);
    expect(f.rezultat.kartice.every((k) => k.categoryKey === primjeri.kategorija)).toBe(true);
    const v = podaci<PodaciKataloga>(await ucitajKatalog(ctx("/en/campaigns?page=999")));
    expect(v.rezultat.kartice).toEqual([]);
    expect(v.rezultat.ukupno).toBeGreaterThan(0);
    expect(v.rezultat.stranica).toBe(999);
  });

  it("organizacije: filtar kategorije i stranica izvan raspona", async () => {
    const p = podaci<PodaciOrganizacija>(await ucitajOrganizacije(ctx("/hr/organizacije?category=animals")));
    expect(p.kategorija).toBe("animals");
    expect(p.katalog.organizacije.every((o) => o.categoryKey === "animals")).toBe(true);
    const v = podaci<PodaciOrganizacija>(await ucitajOrganizacije(ctx("/hr/organizacije?page=50")));
    expect(v.katalog.organizacije).toEqual([]);
  });

  it("profil osobe: javni → podaci, privatni i nepostojeći → 404", async () => {
    expect(podaci<{ slug: string }>(await ucitajOsobu(ctx("/hr/u/x", { slug: primjeri.korisnik.javni }))).slug).toBe(primjeri.korisnik.javni);
    expect(((await ucitajOsobu(ctx("/hr/u/x", { slug: primjeri.korisnik.privatni404 }))) as Response).status).toBe(404);
    expect(((await ucitajOsobu(ctx("/hr/u/x", { slug: "nema" }))) as Response).status).toBe(404);
  });

  it("organizacija: postojeća s nazivima kategorija za vanjske; nepostojeća → 404", async () => {
    const p = podaci<PodaciOrganizacije>(await ucitajOrg(ctx("/hr/o/x", { slug: primjeri.organizacija })));
    expect(p.o.slug).toBe(primjeri.organizacija);
    if (p.o.vanjske.length > 0) expect(p.kategorije).toHaveLength(8);
    expect(((await ucitajOrg(ctx("/hr/o/x", { slug: "nema-takve-organizacije" }))) as Response).status).toBe(404);
  });

  it("vanjska kampanja: aktivna → podaci, neaktivna → 404", async () => {
    expect(podaci<{ id: string }>(await ucitajVanjsku(ctx("/hr/vanjska/x", { id: primjeri.vanjska }))).id).toBe(primjeri.vanjska);
    expect(((await ucitajVanjsku(ctx("/hr/vanjska/x", { id: primjeri.vanjskaNeaktivna404 }))) as Response).status).toBe(404);
  });
});
