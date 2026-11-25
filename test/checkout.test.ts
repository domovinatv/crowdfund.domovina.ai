/**
 * Checkout (S7, agent B): validacija obrasca, `stvoriCheckout` (redovi, metadata bez osobnih podataka,
 * atribucija, MPT greška), napojnica (ne dira doprinos ni statistiku), API napojnice i učitavači koraka.
 * Bez mreže: MPT je dvojnik `test/pomoc/mpt-dvojnik.ts` (i kao globalni `fetch` za učitavače).
 */
import { readFileSync } from "node:fs";
import type { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  iznosNapojnice,
  noviIdCheckouta,
  odgovorNapojnice,
  oibIspravan,
  prazanObrazac,
  provjeriObrazac,
  stvoriCheckout,
  stvoriNapojnicu,
  type CistiCheckout,
  type ObrazacCheckouta,
} from "../src/lib/db/checkout";
import { uskladiCheckout } from "../src/lib/db/uplate";
import { korisnikSesije } from "../src/lib/sesija";
import { CHECKOUT } from "../src/views/sadrzaj/checkout";
import { ucitaj as ucitajPodrsku, type PodaciPodrske } from "../src/views/stranice/campaign.support.ucitaj";
import { ucitaj as ucitajPlacanje, type PodaciPlacanja } from "../src/views/stranice/campaign.support.checkout.ucitaj";
import { ucitaj as ucitajNapojnicu } from "../src/views/stranice/campaign.support.checkout.tip.ucitaj";
import { ucitaj as ucitajPotvrdu, type PodaciPotvrde } from "../src/views/stranice/campaign.support.checkout.done.ucitaj";
import { broj, kaoD1, novaBaza, PRIMJERI, redovi } from "./pomoc/baza";
import { kontekst, laziKolacici } from "./pomoc/kontekst";
import { dvojnikMpt, type DvojnikMpt } from "./pomoc/mpt-dvojnik";

const primjeri = JSON.parse(readFileSync(PRIMJERI, "utf8")) as {
  kampanja: Record<string, string>;
  kasica: string;
  linkZaPracenje: string;
  demoSesija: string;
  checkout: string;
};
const AKTIVNA = primjeri.kampanja.aktivna!;

let sqlite: DatabaseSync;
let db: D1Database;
let dv: DvojnikMpt;

beforeEach(() => {
  sqlite = novaBaza({ seed: true });
  db = kaoD1(sqlite);
  dv = dvojnikMpt();
});
afterEach(() => vi.unstubAllGlobals());

const obrazac = (o: Partial<ObrazacCheckouta> = {}): ObrazacCheckouta => ({
  ...prazanObrazac(),
  izbor: "2500",
  email: "ana@example.org",
  uvjeti: true,
  ...o,
});

const cisto = (o: Partial<ObrazacCheckouta> = {}): CistiCheckout => {
  const r = provjeriObrazac(obrazac(o), { prijavljen: null });
  if (!r.ok) throw new Error(JSON.stringify(r.greske));
  return r.cisto;
};

const idKampanje = (publicId: string) =>
  (sqlite.prepare("SELECT campaign_id FROM campaign_settings WHERE public_id = ?").get(publicId) as { campaign_id: string }).campaign_id;
const stats = (publicId: string) =>
  sqlite.prepare("SELECT raised_cents, contribution_count FROM campaign_stats WHERE campaign_id = ?").get(idKampanje(publicId)) as {
    raised_cents: number;
    contribution_count: number;
  };
const povratak = (id: string) => `http://localhost:8798/hr/${AKTIVNA}/podrzi/${id}`;

async function checkout(o: Partial<ObrazacCheckouta> = {}, dodatno: Partial<Parameters<typeof stvoriCheckout>[2]> = {}) {
  const r = await stvoriCheckout(db, dv.konfig, { publicId: AKTIVNA, podaci: cisto(o), korisnik: null, povratniUrl: povratak, ...dodatno }, dv.dohvat);
  if (!r.ok) throw new Error(r.razlog);
  return r;
}

describe("obrazac checkouta (provjeriObrazac)", () => {
  it("iznos: obavezan, brzi izbor ili svoj („25,50”), granice 1 € (ili minimum kampanje) do 10.000 €", () => {
    const p = { prijavljen: null };
    expect(provjeriObrazac(obrazac({ izbor: "" }), p)).toEqual({ ok: false, greske: { iznos: "obavezno" } });
    expect(provjeriObrazac(obrazac({ izbor: "svoj", svojIznos: "abc" }), p)).toEqual({ ok: false, greske: { iznos: "nevaljan" } });
    expect(provjeriObrazac(obrazac({ izbor: "svoj", svojIznos: "0,50" }), p)).toEqual({ ok: false, greske: { iznos: "premalo" } });
    expect(provjeriObrazac(obrazac({ izbor: "svoj", svojIznos: "10.000,01" }), p)).toEqual({ ok: false, greske: { iznos: "previse" } });
    expect(provjeriObrazac(obrazac({ izbor: "500" }), { prijavljen: null, najmanjeCenti: 1000 })).toEqual({ ok: false, greske: { iznos: "premalo" } });
    expect(cisto({ izbor: "svoj", svojIznos: "25,50" }).iznosCenti).toBe(2550);
    // Bez JS-a: upisan svoj iznos bez odabira „svoj” vrijedi kao svoj.
    expect(cisto({ izbor: "", svojIznos: "40" }).iznosCenti).toBe(4000);
    expect(cisto({ izbor: "10000" }).iznosCenti).toBe(10000);
    expect(cisto({ izbor: "svoj", svojIznos: "10.000" }).iznosCenti).toBe(1_000_000);
  });

  it("neprijavljeni: e-pošta obavezna i ispravna, uvjeti obavezni, poruka ≤ 300 znakova", () => {
    const r = provjeriObrazac(obrazac({ email: "", uvjeti: false, poruka: "x".repeat(301) }), { prijavljen: null });
    expect(r).toEqual({ ok: false, greske: { email: "obavezno", uvjeti: "obavezno", poruka: "predugo" } });
    expect(provjeriObrazac(obrazac({ email: "nije-adresa" }), { prijavljen: null })).toEqual({ ok: false, greske: { email: "email" } });
    expect(cisto({ poruka: `  ${"ž".repeat(300)}  ` }).poruka).toBe("ž".repeat(300));
  });

  it("„kao tvrtka”: naziv obavezan, OIB neobavezan ali s kontrolnom znamenkom; ime i prezime se tada ne spremaju", () => {
    expect(oibIspravan("69435151530")).toBe(true);
    expect(oibIspravan("69435151531")).toBe(false);
    const r = provjeriObrazac(obrazac({ kaoTvrtka: true, tvrtka: "", oib: "12345678901" }), { prijavljen: null });
    expect(r).toEqual({ ok: false, greske: { tvrtka: "obavezno", oib: "oib" } });
    const c = cisto({ kaoTvrtka: true, tvrtka: "Primjer d.o.o.", oib: "694 351 515 30", ime: "Ana", prezime: "Anić" });
    expect(c).toMatchObject({ kaoTvrtka: true, tvrtka: "Primjer d.o.o.", oib: "69435151530", ime: null, prezime: null });
  });

  it("prijavljeni (odluka 153): e-pošta iz sesije, „kao tvrtka” i uvjeti se ne traže ni ne primaju", () => {
    const r = provjeriObrazac(obrazac({ email: "", uvjeti: false, kaoTvrtka: true, tvrtka: "X", oib: "1", ime: "Ana" }), {
      prijavljen: { email: "ivana@demo.invalid" },
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.cisto).toMatchObject({ email: "ivana@demo.invalid", kaoTvrtka: false, tvrtka: null, oib: null, ime: null });
  });

  it("napojnica: izbor obavezan (ništa predodabrano), 0/1/2/5 € ili svoj 1–1.000 €", () => {
    expect(iznosNapojnice("", "")).toBe("obavezno");
    expect(iznosNapojnice("0", "")).toBe(0);
    expect(iznosNapojnice("500", "")).toBe(500);
    expect(iznosNapojnice("300", "")).toBe("nevaljan");
    expect(iznosNapojnice("svoj", "3,50")).toBe(350);
    expect(iznosNapojnice("svoj", "0,5")).toBe("nevaljan");
    expect(iznosNapojnice("svoj", "1001")).toBe("nevaljan");
  });

  it("ID checkouta je 128-bitni base64url token", () => {
    const id = noviIdCheckouta();
    expect(id).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(noviIdCheckouta()).not.toBe(id);
  });
});

describe("stvoriCheckout", () => {
  it("upisuje checkout, doprinos, profil i atribuciju prije intenta; intent na Safe kampanje, metadata bez osobnih podataka", async () => {
    const prije = stats(AKTIVNA);
    const r = await checkout({ ime: "Ana", prezime: "Anić", poruka: "Sretno!", skrijIznos: true });
    const [ch] = redovi<Record<string, unknown>>(sqlite, "SELECT * FROM checkouts WHERE id = ?", r.checkoutId);
    expect(ch).toMatchObject({
      intent_state: "open", amount_cents: 2500, tip_cents: 0, email: "ana@example.org", first_name: "Ana", last_name: "Anić",
      as_company: 0, user_id: null, short_ref: r.intent.shortRef,
    });
    const sid = ch!.contribution_sid as string;
    expect(sid).toBe(r.intent.sid);
    const [d] = redovi<Record<string, unknown>>(sqlite, "SELECT * FROM contributions WHERE payment_intent_sid = ?", sid);
    expect(d).toMatchObject({ state: "pending", payment_rail: "sepa", quantity: 1, underpaid: 0, amount_cents: 2500, currency: "EUR" });
    const [p] = redovi<Record<string, unknown>>(sqlite, "SELECT * FROM contribution_profiles WHERE contribution_id = ?", d!.id as string);
    expect(p).toMatchObject({ anonymous: 0, display_name: "Ana Anić", message: "Sretno!" });
    const [a] = redovi<Record<string, unknown>>(sqlite, "SELECT * FROM contribution_attributions WHERE contribution_id = ?", d!.id as string);
    expect(a).toMatchObject({ checkout_id: r.checkoutId, source: "checkout", amount_hidden: 1, moneybox_id: null, tracking_link_id: null });

    const intent = dv.intent(sid)!;
    const safe = sqlite.prepare("SELECT address FROM campaign_safes WHERE campaign_id = ?").get(idKampanje(AKTIVNA)) as { address: string };
    expect(intent.targetAddress).toBe(safe.address);
    expect(intent.amountCents).toBe(2500);
    expect(intent.metadata).toEqual({ checkout: r.checkoutId, kampanja: AKTIVNA, vrsta: "doprinos" });
    const tekst = JSON.stringify(intent.metadata);
    for (const osobno of ["ana@example.org", "Ana", "Anić", "Sretno"]) expect(tekst).not.toContain(osobno);
    // Prije uplate statistika se ne mijenja.
    expect(stats(AKTIVNA)).toEqual(prije);
  });

  it("„skrij ime” → anonymous i bez imena na popisu; tvrtka → naziv tvrtke na popisu", async () => {
    const r1 = await checkout({ ime: "Ana", skrijIme: true });
    const r2 = await checkout({ kaoTvrtka: true, tvrtka: "Primjer d.o.o.", oib: "69435151530" });
    const profil = (id: string) =>
      sqlite.prepare(
        `SELECT p.anonymous, p.display_name, ch.as_company, ch.company_name, ch.company_oib FROM checkouts ch
           JOIN contributions d ON d.payment_intent_sid = ch.contribution_sid JOIN contribution_profiles p ON p.contribution_id = d.id
          WHERE ch.id = ?`,
      ).get(id);
    expect(profil(r1.checkoutId)).toMatchObject({ anonymous: 1, display_name: null });
    expect(profil(r2.checkoutId)).toMatchObject({ anonymous: 0, display_name: "Primjer d.o.o.", as_company: 1, company_name: "Primjer d.o.o.", company_oib: "69435151530" });
  });

  it("prijavljeni: user_id i e-pošta iz sesije, ime računa na popisu, bez „kao tvrtka”", async () => {
    const korisnik = (await korisnikSesije(db, primjeri.demoSesija, Date.now()))!;
    const ulaz = provjeriObrazac(obrazac({ email: "", kaoTvrtka: true, tvrtka: "X" }), { prijavljen: korisnik });
    if (!ulaz.ok) throw new Error("obrazac");
    const r = await stvoriCheckout(db, dv.konfig, { publicId: AKTIVNA, podaci: ulaz.cisto, korisnik, povratniUrl: povratak }, dv.dohvat);
    if (!r.ok) throw new Error(r.razlog);
    const ch = sqlite.prepare("SELECT user_id, email, as_company, company_name FROM checkouts WHERE id = ?").get(r.checkoutId);
    expect(ch).toEqual({ user_id: korisnik.id, email: korisnik.email, as_company: 0, company_name: null });
    const a = sqlite.prepare("SELECT user_id FROM contribution_attributions WHERE checkout_id = ?").get(r.checkoutId);
    expect(a).toEqual({ user_id: korisnik.id });
    expect(JSON.stringify(dv.intent(r.intent.sid)!.metadata)).not.toContain(korisnik.email);
  });

  it("atribucija: kasica `?s=` i link za praćenje iz kolačića samo ako pripadaju kampanji; metadata nosi njihove ID-eve", async () => {
    const m = sqlite.prepare(
      "SELECT m.id, s.public_id FROM moneyboxes m JOIN campaign_settings s ON s.campaign_id = m.campaign_id WHERE m.alias = ?",
    ).get(primjeri.kasica) as { id: string; public_id: string };
    const r = await stvoriCheckout(
      db, dv.konfig, { publicId: m.public_id, podaci: cisto(), korisnik: null, kasica: primjeri.kasica, povratniUrl: povratak }, dv.dohvat,
    );
    if (!r.ok) throw new Error(r.razlog);
    expect(sqlite.prepare("SELECT moneybox_id FROM checkouts WHERE id = ?").get(r.checkoutId)).toEqual({ moneybox_id: m.id });
    expect(dv.intent(r.intent.sid)!.metadata).toMatchObject({ kasica: m.id });

    const l = sqlite.prepare(
      "SELECT l.id, s.public_id FROM tracking_links l JOIN campaign_settings s ON s.campaign_id = l.campaign_id WHERE l.slug = ?",
    ).get(primjeri.linkZaPracenje) as { id: string; public_id: string };
    const r2 = await stvoriCheckout(
      db, dv.konfig, { publicId: l.public_id, podaci: cisto(), korisnik: null, atribucija: l.id, povratniUrl: povratak }, dv.dohvat,
    );
    if (!r2.ok) throw new Error(r2.razlog);
    expect(sqlite.prepare("SELECT tracking_link_id FROM contribution_attributions WHERE checkout_id = ?").get(r2.checkoutId)).toEqual({ tracking_link_id: l.id });
    expect(dv.intent(r2.intent.sid)!.metadata).toMatchObject({ link: l.id });

    // Tuđa kasica i tuđi link se zanemaruju.
    const drugaKampanja = l.public_id === AKTIVNA ? m.public_id : AKTIVNA;
    const r3 = await stvoriCheckout(
      db, dv.konfig,
      { publicId: drugaKampanja, podaci: cisto(), korisnik: null, kasica: drugaKampanja === m.public_id ? null : primjeri.kasica, atribucija: l.public_id === drugaKampanja ? null : l.id, povratniUrl: povratak },
      dv.dohvat,
    );
    if (!r3.ok) throw new Error(r3.razlog);
    expect(sqlite.prepare("SELECT moneybox_id, tracking_link_id FROM checkouts WHERE id = ?").get(r3.checkoutId)).toEqual({ moneybox_id: null, tracking_link_id: null });
  });

  it("kampanja koja ne prima uplate: ništa se ne upisuje", async () => {
    const n = broj(sqlite, "SELECT count(*) FROM checkouts");
    const r = await stvoriCheckout(db, dv.konfig, { publicId: primjeri.kampanja.paused!, podaci: cisto(), korisnik: null, povratniUrl: povratak }, dv.dohvat);
    expect(r).toEqual({ ok: false, razlog: "ne_prima" });
    expect(broj(sqlite, "SELECT count(*) FROM checkouts")).toBe(n);
    expect(dv.pozivi).toEqual([]);
  });

  it("MPT greška: doprinos `failed`, checkout `expired`, statistika netaknuta", async () => {
    const prije = stats(AKTIVNA);
    const pada: typeof fetch = async () => new Response(JSON.stringify({ error: "server_error" }), { status: 500 });
    const r = await stvoriCheckout(db, dv.konfig, { publicId: AKTIVNA, podaci: cisto(), korisnik: null, povratniUrl: povratak }, pada);
    expect(r).toEqual({ ok: false, razlog: "mpt", kod: "server_error" });
    const zadnji = sqlite.prepare(
      `SELECT ch.intent_state, d.state FROM checkouts ch JOIN contributions d ON d.payment_intent_sid = ch.contribution_sid
        WHERE ch.email = 'ana@example.org' ORDER BY ch.created_at DESC LIMIT 1`,
    ).get();
    expect(zadnji).toEqual({ intent_state: "expired", state: "failed" });
    expect(stats(AKTIVNA)).toEqual(prije);
  });
});

describe("napojnica", () => {
  it("tek nakon plaćenog doprinosa; zaseban intent na Safe platforme; ne dira doprinos ni statistiku", async () => {
    const r = await checkout({ izbor: "5000" });
    expect(await stvoriNapojnicu(db, dv.konfig, r.checkoutId, 200, dv.dohvat)).toEqual({ ok: false, razlog: "nije_placeno" });

    await dv.simuliraj(r.intent.sid, "paid");
    await uskladiCheckout(db, dv.konfig, r.checkoutId, dv.dohvat);
    const nakonDoprinosa = stats(AKTIVNA);
    const doprinos = () => sqlite.prepare("SELECT state, amount_received_cents FROM contributions WHERE payment_intent_sid = ?").get(r.intent.sid);
    const dPrije = doprinos();
    expect(dPrije).toEqual({ state: "paid", amount_received_cents: 5000 });

    const t = await stvoriNapojnicu(db, dv.konfig, r.checkoutId, 500, dv.dohvat);
    if (!t.ok || t.nula) throw new Error("napojnica");
    const intent = dv.intent(t.sid)!;
    expect(intent.targetAddress).toBe(dv.konfig.tipTarget);
    expect(intent.metadata).toEqual({ checkout: r.checkoutId, vrsta: "napojnica" });
    expect(sqlite.prepare("SELECT intent_state, amount_cents FROM tips WHERE sid = ?").get(t.sid)).toEqual({ intent_state: "open", amount_cents: 500 });
    expect(sqlite.prepare("SELECT tip_cents FROM checkouts WHERE id = ?").get(r.checkoutId)).toEqual({ tip_cents: 500 });

    await dv.simuliraj(t.sid, "paid");
    await uskladiCheckout(db, dv.konfig, r.checkoutId, dv.dohvat);
    expect(sqlite.prepare("SELECT intent_state FROM tips WHERE sid = ?").get(t.sid)).toEqual({ intent_state: "paid" });
    expect(stats(AKTIVNA)).toEqual(nakonDoprinosa);
    expect(doprinos()).toEqual(dPrije);
    // Druga napojnica za isti checkout vraća postojeću.
    expect(await stvoriNapojnicu(db, dv.konfig, r.checkoutId, 100, dv.dohvat)).toEqual({ ok: true, nula: false, sid: t.sid, intent: null });
  });

  it("0 € samo bilježi izbor, bez intenta; MPT greška briše red napojnice", async () => {
    const r = await checkout();
    await dv.simuliraj(r.intent.sid, "paid");
    await uskladiCheckout(db, dv.konfig, r.checkoutId, dv.dohvat);
    const poziva = dv.pozivi.length;
    expect(await stvoriNapojnicu(db, dv.konfig, r.checkoutId, 0, dv.dohvat)).toEqual({ ok: true, nula: true });
    expect(dv.pozivi.length).toBe(poziva);
    expect(broj(sqlite, "SELECT count(*) FROM tips WHERE checkout_id = ?", r.checkoutId)).toBe(0);

    const pada: typeof fetch = async () => new Response("{}", { status: 503 });
    const t = await stvoriNapojnicu(db, dv.konfig, r.checkoutId, 200, pada);
    expect(t).toMatchObject({ ok: false, razlog: "mpt" });
    expect(broj(sqlite, "SELECT count(*) FROM tips WHERE checkout_id = ?", r.checkoutId)).toBe(0);
    expect(sqlite.prepare("SELECT tip_cents FROM checkouts WHERE id = ?").get(r.checkoutId)).toEqual({ tip_cents: 0 });
  });

  it("API `POST /api/checkouts/{id}/tip`: samo JSON; 409 prije uplate, 400 za iznos, 200 s intentom", async () => {
    const r = await checkout();
    const zahtjev = (tijelo: unknown, tip = "application/json") =>
      new Request("http://localhost/api/checkouts/x/tip", { method: "POST", headers: { "content-type": tip }, body: JSON.stringify(tijelo) });
    expect((await odgovorNapojnice(zahtjev({ iznosCenti: 100 }, "application/x-www-form-urlencoded"), db, dv.konfig, r.checkoutId, dv.dohvat)).status).toBe(415);
    expect((await odgovorNapojnice(zahtjev({ iznosCenti: 100 }), db, dv.konfig, r.checkoutId, dv.dohvat)).status).toBe(409);
    expect((await odgovorNapojnice(zahtjev({ iznosCenti: 100 }), db, dv.konfig, "nepostojeci-checkout-id", dv.dohvat)).status).toBe(404);
    await dv.simuliraj(r.intent.sid, "paid");
    await uskladiCheckout(db, dv.konfig, r.checkoutId, dv.dohvat);
    expect((await odgovorNapojnice(zahtjev({ iznosCenti: 50 }), db, dv.konfig, r.checkoutId, dv.dohvat)).status).toBe(400);
    const ok = await odgovorNapojnice(zahtjev({ iznosCenti: 200 }), db, dv.konfig, r.checkoutId, dv.dohvat);
    expect(ok.status).toBe(200);
    const j = (await ok.json()) as { ok: boolean; napojnica: { sid: string; sandbox: boolean } };
    expect(j.ok).toBe(true);
    expect(j.napojnica.sandbox).toBe(true);
    expect(dv.intent(j.napojnica.sid)!.amountCents).toBe(200);
  });
});

describe("učitavači koraka checkouta", () => {
  const env = () => ({ MPT_API_URL: dv.konfig.apiUrl, MPT_SECRET_KEY: dv.konfig.secretKey, MPT_TIP_TARGET: dv.konfig.tipTarget });

  it("GET obrasca: brzi iznosi kampanje, kasica iz `?s=`; ne prima uplate → bez greške, bez obrasca", async () => {
    const r = await ucitajPodrsku({ ...kontekst(db, `/hr/${AKTIVNA}/podrzi`, { params: { id: AKTIVNA } }), env: env() });
    if (r instanceof Response) throw new Error(String(r.status));
    const p = r.podaci as PodaciPodrske;
    expect(p.k.primaUplate).toBe(true);
    expect(p.iznosi.length).toBeGreaterThan(0);
    expect(p.greske).toEqual({});
  });

  it("POST obrasca → 303 na stranicu plaćanja; greške ostaju na obrascu; kolačić atribucije se čita", async () => {
    vi.stubGlobal("fetch", dv.dohvat);
    const losa = await ucitajPodrsku({
      ...kontekst(db, `/hr/${AKTIVNA}/podrzi`, { params: { id: AKTIVNA }, obrazac: { izbor: "", email: "" } }),
      env: env(),
    });
    if (losa instanceof Response) throw new Error("očekivan obrazac");
    expect((losa.podaci as PodaciPodrske).greske).toMatchObject({ iznos: "obavezno", email: "obavezno", uvjeti: "obavezno" });

    const r = await ucitajPodrsku({
      ...kontekst(db, `/hr/${AKTIVNA}/podrzi`, {
        params: { id: AKTIVNA },
        obrazac: { izbor: "svoj", svojIznos: "12", email: "b@example.org", uvjeti: "1", poruka: "Bravo" },
        kolacici: laziKolacici({ atribucija: "nepostojeci-link" }),
      }),
      env: env(),
    });
    expect(r).toBeInstanceOf(Response);
    const res = r as Response;
    expect(res.status).toBe(303);
    const lokacija = res.headers.get("location")!;
    expect(lokacija).toMatch(new RegExp(`^/hr/${AKTIVNA}/podrzi/[A-Za-z0-9_-]{22}$`));
    const id = lokacija.split("/").pop()!;
    const sid = (sqlite.prepare("SELECT contribution_sid FROM checkouts WHERE id = ?").get(id) as { contribution_sid: string }).contribution_sid;
    expect(dv.intent(sid)!.amountCents).toBe(1200);

    // Stranica plaćanja: sandbox, intent s raila; nakon simulacije GET povuče stanje i pokaže uspjeh.
    const ctx = () => ({ ...kontekst(db, lokacija, { params: { id: AKTIVNA, checkout: id } }), env: env() });
    const p1 = await ucitajPlacanje(ctx());
    if (p1 instanceof Response) throw new Error(String(p1.status));
    const d1 = p1.podaci as PodaciPlacanja;
    expect(d1).toMatchObject({ sandbox: true, placen: false, neuspio: false });
    expect(d1.intent?.sid).toBe(sid);
    await dv.simuliraj(sid, "paid");
    const p2 = await ucitajPlacanje(ctx());
    if (p2 instanceof Response) throw new Error(String(p2.status));
    expect((p2.podaci as PodaciPlacanja).placen).toBe(true);

    // Napojnica 0 → 303 na potvrdu; potvrda pokazuje plaćen doprinos.
    const n = await ucitajNapojnicu({
      ...kontekst(db, `${lokacija}/napojnica`, { params: { id: AKTIVNA, checkout: id }, obrazac: { napojnica: "0" } }),
      env: env(),
    });
    expect((n as Response).status).toBe(303);
    expect((n as Response).headers.get("location")).toBe(`${lokacija}/potvrda`);
    const pt = await ucitajPotvrdu({ ...kontekst(db, `${lokacija}/potvrda`, { params: { id: AKTIVNA, checkout: id } }), env: env() });
    if (pt instanceof Response) throw new Error(String(pt.status));
    expect((pt.podaci as PodaciPotvrde).ch.doprinos?.stanje).toBe("paid");
  });

  it("checkout tuđe kampanje ili nepoznat ID → 404; seed checkout bez MPT-a radi iz baze", async () => {
    const tudi = await ucitajPlacanje(kontekst(db, "/hr/x", { params: { id: primjeri.kampanja.zavrsena!, checkout: primjeri.checkout } }));
    expect((tudi as Response).status).toBe(404);
    const nema = await ucitajPlacanje(kontekst(db, "/hr/x", { params: { id: AKTIVNA, checkout: "nepoznat-checkout-123" } }));
    expect((nema as Response).status).toBe(404);
    const seed = await ucitajPotvrdu(kontekst(db, "/hr/x", { params: { id: AKTIVNA, checkout: primjeri.checkout } }));
    if (seed instanceof Response) throw new Error(String(seed.status));
    expect((seed.podaci as PodaciPotvrde).ch.doprinos?.stanje).toBe("paid");
  });
});

describe("tekstovi checkouta", () => {
  const oblik = (x: unknown): unknown =>
    Array.isArray(x) ? x.length : x && typeof x === "object" ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, oblik(v)])) : typeof x;
  it("hr i en istog oblika; copy nikad „ulaže”", () => {
    expect(oblik(CHECKOUT.en)).toEqual(oblik(CHECKOUT.hr));
    expect(JSON.stringify(CHECKOUT.hr)).not.toMatch(/ulag|ulož|ulaž/i);
    expect(JSON.stringify(CHECKOUT.en)).not.toMatch(/invest/i);
  });
});
