/**
 * Faza 2 (S8-B): katalog i stranica ponude, obrazac nove ponude (samo nacrt, Founder's Offer traži verifikaciju),
 * razine i zaključane novosti razine, promocija. Nad seedanim SQLiteom, bez mreže.
 */
import { describe, expect, it } from "vitest";
import primjeri from "../seed/primjeri.json";
import { katalogPonuda, kampanjeZaPonudu, ponudaPoId, provjeriPonudu, spremiNacrtPonude, type PoljaPonude } from "../src/lib/db/ponude";
import { novostiRazina, razineZaUpravljanje } from "../src/lib/db/razine";
import { korisnikPoEmailu } from "../src/lib/sesija";
import { prijedlogAliasa } from "../src/views/stranice/campaign.manage.promotion.ucitaj";
import { ucitaj as ucitajNovu } from "../src/views/stranice/offers.new.ucitaj";
import { ucitaj as ucitajPonudu } from "../src/views/stranice/offer.ucitaj";
import { broj, kaoD1, novaBaza, redovi } from "./pomoc/baza";
import { kontekst } from "./pomoc/kontekst";

const svjeza = () => {
  const sqlite = novaBaza({ seed: true });
  return { sqlite, db: kaoD1(sqlite) };
};
const korisnik = async (db: D1Database, email: string) => {
  const k = (await korisnikPoEmailu(db, email))!;
  return { id: k.id, email: k.email, ime: k.ime, platformRole: k.platformRole };
};
const polja = (x: Partial<PoljaPonude> = {}): PoljaPonude => ({
  campaign: primjeri.kampanja.aktivna, title: "Ručno rađena torba", description: "Platnena torba s tiskom, nova, šaljem poštom.",
  category: "fashion", condition: "new", mode: "buy_now", price: "12,50", quantity: "3", days: "14", delivery: "post", ...x,
});

describe("katalog i stranica ponude", () => {
  const { db } = svjeza();
  it("katalog: samo aktivne javne ponude; filtar vrste i kategorije; nepoznat filtar = sve", async () => {
    const sve = await katalogPonuda(db);
    expect(sve.ukupno).toBeGreaterThanOrEqual(5);
    expect(sve.kartice.every((k) => k.status === "active")).toBe(true);
    const aukcije = await katalogPonuda(db, { mode: "auction" });
    expect(aukcije.kartice.length).toBeGreaterThan(0);
    expect(aukcije.kartice.every((k) => k.mode === "auction" && k.bids >= 0)).toBe(true);
    expect((await katalogPonuda(db, { category: "sport" })).kartice.every((k) => k.category === "sport")).toBe(true);
    expect((await katalogPonuda(db, { mode: "xx", category: "yy" })).ukupno).toBe(sve.ukupno);
  });
  it("stranica ponude: licitacije bez imena, najviša prva; nacrt i nepoznata ponuda 404", async () => {
    const p = (await ponudaPoId(db, primjeri.ponuda))!;
    expect(p.mode).toBe("auction");
    expect(p.licitacije.length).toBeGreaterThanOrEqual(2);
    expect(p.topBidCents).toBe(Math.max(...p.licitacije.map((b) => b.amountCents)));
    expect(JSON.stringify(p)).not.toMatch(/@demo\.invalid|user_id/);
    const nacrt = redovi<{ id: string }>(novaBaza({ seed: true }), "SELECT id FROM offers WHERE status = 'draft' LIMIT 1")[0]!.id;
    expect(await ponudaPoId(db, nacrt)).toBeNull();
    expect((await ucitajPonudu(kontekst(db, `/hr/ponude/${nacrt}`, { params: { offer: nacrt } })) as Response).status).toBe(404);
    expect((await ucitajPonudu(kontekst(db, "/hr/ponude/nema", { params: { offer: "nema" } })) as Response).status).toBe(404);
  });
});

describe("nova ponuda: samo nacrt", () => {
  it("provjera polja: obavezno, iznos, količina aukcije = 1, trajanje", () => {
    const K = [{ publicId: primjeri.kampanja.aktivna, title: "x", vlastita: true }];
    expect(provjeriPonudu(polja(), K, false).greske).toEqual({});
    expect(provjeriPonudu(polja({ price: "0,50" }), K, false).greske.price).toBe("premalo");
    expect(provjeriPonudu(polja({ price: "abc", days: "90", title: "" }), K, false).greske).toMatchObject({ price: "nevaljano", days: "previse", title: "obavezno" });
    expect(provjeriPonudu(polja({ mode: "auction", quantity: "5" }), K, false).kolicina).toBe(1);
    expect(provjeriPonudu(polja({ campaign: "zzzzzz" }), K, false).greske.campaign).toBe("nedostupna");
    expect(provjeriPonudu(polja(), [{ ...K[0]!, vlastita: false }], false).greske.campaign).toBe("neverificiran");
  });
  it("vlastita kampanja → nacrt organizatora; tuđa bez verifikacije odbijena; verificiran → Founder's Offer pending", async () => {
    const { sqlite, db } = svjeza();
    const org = await korisnik(db, primjeri.demoRacuni.organizator);
    expect((await kampanjeZaPonudu(db, org.id)).find((k) => k.publicId === primjeri.kampanja.aktivna)?.vlastita).toBe(true);
    const r = await spremiNacrtPonude(db, org.id, polja(), false, Date.now());
    expect(r.ok).toBe(true);
    if (r.ok) expect(redovi(sqlite, "SELECT status, is_founder, founder_status, price_cents, quantity FROM offers WHERE id = ?", r.id)[0])
      .toEqual({ status: "draft", is_founder: 0, founder_status: null, price_cents: 1250, quantity: 3 });
    const novi = await korisnik(db, primjeri.demoRacuni.novi);
    expect(await spremiNacrtPonude(db, novi.id, polja(), false, Date.now())).toEqual({ ok: false, greske: { campaign: "neverificiran" } });
    const f = await spremiNacrtPonude(db, novi.id, polja(), true, Date.now());
    expect(f.ok).toBe(true);
    if (f.ok) expect(redovi(sqlite, "SELECT is_founder, founder_status FROM offers WHERE id = ?", f.id)[0]).toEqual({ is_founder: 1, founder_status: "pending" });
    // Kupnje ni licitacija nema: obrazac ne dira offer_bids ni contributions.
    expect(broj(sqlite, "SELECT count(*) FROM contributions WHERE campaign_id IN (SELECT campaign_id FROM offers WHERE status = 'draft')")).toBeGreaterThan(0);
  });
  it("učitavač: POST sprema nacrt i 303 na obrazac; greške ostaju na stranici", async () => {
    const { db } = svjeza();
    const org = await korisnik(db, primjeri.demoRacuni.organizator);
    const r = (await ucitajNovu(kontekst(db, "/hr/ponude/nova", { korisnik: org, obrazac: { ...polja() } }))) as Response;
    expect(r.status).toBe(303);
    expect(r.headers.get("Location")).toBe("/hr/ponude/nova?ok=spremljeno#nacrti");
    const g = await ucitajNovu(kontekst(db, "/hr/ponude/nova", { korisnik: org, obrazac: { ...polja({ title: "" }) } }));
    expect(g).toHaveProperty("podaci.greske.title", "obavezno");
    const nacrti = await ucitajNovu(kontekst(db, "/hr/ponude/nova?ok=spremljeno", { korisnik: org }));
    expect(nacrti).toHaveProperty("podaci.spremljeno", true);
  });
});

describe("razine i promocija", () => {
  const { db, sqlite } = svjeza();
  it("zaključane novosti razine: naslov i razina, bez teksta", async () => {
    const id = redovi<{ id: string }>(sqlite, "SELECT campaign_id AS id FROM campaign_settings WHERE public_id = ?", primjeri.kampanja.mjesecna)[0]!.id;
    const n = await novostiRazina(db, id);
    expect(n.length).toBeGreaterThanOrEqual(2);
    expect(Object.keys(n[0]!).sort()).toEqual(["id", "publishedAt", "tierTitle", "title"]);
    const r = await razineZaUpravljanje(db, id);
    expect(r.reduce((a, x) => a + x.novosti, 0)).toBe(n.length);
  });
  it("prijedlog aliasa: mala slova bez dijakritika, ≤ 40 znakova", () => {
    expect(prijedlogAliasa("Topli obroci za starije u susjedstvu")).toBe("topli-obroci-za-starije-u-susjedstvu");
    expect(prijedlogAliasa("Školski pribor za djecu iz udomiteljskih obitelji").length).toBeLessThanOrEqual(40);
    expect(prijedlogAliasa("Đak")).toBe("dak");
  });
});
