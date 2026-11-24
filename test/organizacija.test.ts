// Organizacija (S6, tok 2, ekrani 20 i 26, odluke 150 i 202): OIB, slug, koraci zahtjeva, stanje „N / 5”, Safe,
// postavke, vanjske kampanje, članovi i uloge (barem jedan owner), pozivnica (istek, prihvat, odbijanje) i
// učitavači organizacijskih ruta. Sve nad sqliteom sa seedom (test/pomoc/baza.ts).
import { describe, expect, it } from "vitest";
import primjeri from "../seed/primjeri.json";
import {
  clanovi,
  odbijPozivnicu,
  opozoviPozivnicu,
  pozivnicaPoTokenu,
  pozivniceNaCekanju,
  pozovi,
  prihvatiPozivnicu,
  promijeniUlogu,
  stanjePozivnice,
  ukloniClana,
} from "../src/lib/db/clanovi";
import {
  TRAJANJE_POZIVNICE,
  dodajVanjsku,
  idVanjske,
  kampanjeOrganizacije,
  kontrolnaZnamenkaOib,
  korakZahtjeva,
  nacrtZahtjeva,
  posaljiZahtjev,
  postavkeOrganizacije,
  potvrdiVanjsku,
  predloziSlug,
  provjeriPodatke,
  prviNedovrseni,
  spremiKyb,
  spremiPodatke,
  spremiPostavke,
  spremiProjekt,
  spremiSafe,
  spremiZastupnika,
  stanjeZahtjeva,
  ukloniVanjsku,
  valjanOib,
  valjanSlug,
  valjanUrl,
  valjanaAdresa,
  vanjskeOrganizacije,
  type UlazPodataka,
} from "../src/lib/db/organizacija";
import { korisnikPoEmailu, korisnikSesije } from "../src/lib/sesija";
import { ucitaj as ucitajPodatke } from "../src/views/stranice/organisation.new.details.ucitaj";
import { ucitaj as ucitajPregled } from "../src/views/stranice/organisation.new.review.ucitaj";
import { ucitaj as ucitajClanove, type PodaciClanova } from "../src/views/stranice/org.members.ucitaj";
import { ucitaj as ucitajPozivnicu, type PodaciPozivnice } from "../src/views/stranice/invite.ucitaj";
import { ucitaj as ucitajZahtjev } from "../src/views/stranice/org.application.ucitaj";
import { ucitaj as ucitajPostavke } from "../src/views/stranice/org.settings.ucitaj";
import { ucitaj as ucitajVanjske } from "../src/views/stranice/org.external.ucitaj";
import { ucitaj as ucitajKampanje } from "../src/views/stranice/org.campaigns.ucitaj";
import { broj, kaoD1, novaBaza, redovi } from "./pomoc/baza";
import { kontekst } from "./pomoc/kontekst";

const sqlite = novaBaza({ seed: true });
const db = kaoD1(sqlite);
const sad = Date.now();
const KATEGORIJE = ["charity", "culture", "projects", "needs", "sport", "animals", "travel", "other"];
const organizator = (await korisnikSesije(db, primjeri.demoSesija, sad))!;
const novi = (await korisnikSesije(db, primjeri.demoSesijaNovi, sad))!;
const korisnik = async (email: string) => {
  const k = (await korisnikPoEmailu(db, email))!;
  return { id: k.id, email: k.email, ime: k.ime, platformRole: k.platformRole };
};
const adminSvjetionika = await korisnik("petra.probic@demo.invalid");
const orgId = (slug: string) => redovi<{ id: string }>(sqlite, "SELECT id FROM organizations WHERE slug = ?", slug)[0]!.id;
const SVJETIONIK = primjeri.organizacijaOrganizatora;
const status = (r: unknown) => (r instanceof Response ? r.status : 200);
const lokacija = (r: unknown) => (r instanceof Response ? r.headers.get("Location") : null);

/** Ispravan OIB s danih 10 znamenki (test ne koristi stvarne OIB-e). */
const oib = (prvih10: string) => prvih10 + kontrolnaZnamenkaOib(prvih10);

const podaci = (x: Partial<UlazPodataka> = {}): UlazPodataka => ({
  naziv: "Udruga Testna Lipa",
  slug: "testna-lipa",
  pravniOblik: "udruga",
  oib: oib("1234567890"),
  web: "https://testna-lipa.invalid",
  mreze: ["https://social.invalid/testna-lipa"],
  opis: "Testna udruga za provjeru zahtjeva.",
  kategorija: "culture",
  adresa: "Ulica 1",
  grad: "Zagreb",
  postanski: "10000",
  ...x,
});

describe("pravila polja", () => {
  it("OIB: ISO 7064 MOD 11,10 (kontrolna znamenka), točno 11 znamenki", () => {
    const dobar = oib("9876543210");
    expect(valjanOib(dobar)).toBe(true);
    const krivaZnamenka = dobar.slice(0, 10) + ((Number(dobar[10]) + 1) % 10);
    expect(valjanOib(krivaZnamenka)).toBe(false);
    expect(valjanOib(dobar.slice(0, 10))).toBe(false);
    expect(valjanOib(`${dobar}1`)).toBe(false);
    expect(valjanOib("abcdefghijk")).toBe(false);
    // poznati primjer iz dokumentacije ISO 7064: kontrolna znamenka 10 → 0
    for (let i = 0; i < 200; i++) {
      const p = String(1_000_000_000 + i * 7919).slice(0, 10);
      expect(valjanOib(oib(p))).toBe(true);
    }
  });
  it("slug: 3–40 znakova a-z0-9 i crtica, ne na rubu; prijedlog iz naziva bez dijakritike", () => {
    expect(valjanSlug("demo-svjetionik")).toBe(true);
    expect(valjanSlug("ab")).toBe(false);
    expect(valjanSlug("-abc")).toBe(false);
    expect(valjanSlug("Abc")).toBe(false);
    expect(valjanSlug("a".repeat(41))).toBe(false);
    expect(predloziSlug("Udruga „Šapica” Đakovo — Čakovec")).toBe("udruga-sapica-dakovo-cakovec");
  });
  it("URL samo http(s); Safe adresa 0x + 40 hex", () => {
    expect(valjanUrl("https://primjer.invalid")).toBe(true);
    expect(valjanUrl("javascript:alert(1)")).toBe(false);
    expect(valjanUrl("ftp://x.invalid")).toBe(false);
    expect(valjanaAdresa(`0x${"ab".repeat(20)}`)).toBe(true);
    expect(valjanaAdresa(`0x${"ab".repeat(19)}`)).toBe(false);
    expect(valjanaAdresa(`0x${"zz".repeat(20)}`)).toBe(false);
  });
  it("provjeriPodatke: obavezna polja, OIB, pravni oblik (osoba = faza 2), kategorija, poštanski broj", () => {
    expect(provjeriPodatke(podaci(), KATEGORIJE)).toEqual({});
    const g = provjeriPodatke(podaci({ naziv: "", oib: "12345678901", pravniOblik: "osoba", web: "x", kategorija: "nema", postanski: "1" }), KATEGORIJE);
    expect(g).toEqual({ naziv: "obavezno", oib: "neispravno", pravniOblik: "faza2", web: "neispravno", kategorija: "neispravno", postanski: "neispravno" });
    expect(provjeriPodatke(podaci({ pravniOblik: "dionicko" }), KATEGORIJE).pravniOblik).toBe("neispravno");
    expect(provjeriPodatke(podaci({ mreze: ["a", "b", "c", "d"] }), KATEGORIJE).mreze).toBe("neispravno");
  });
  it("korak „N / 5”: nacrt 2, poslan ili odbijen 3, aktivna 4, prima kampanje drugih 5", () => {
    expect(korakZahtjeva({ status: "pending", zahtjev: "draft", primaKampanjeDrugih: false })).toBe(2);
    expect(korakZahtjeva({ status: "pending", zahtjev: "submitted", primaKampanjeDrugih: false })).toBe(3);
    expect(korakZahtjeva({ status: "pending", zahtjev: "rejected", primaKampanjeDrugih: false })).toBe(3);
    expect(korakZahtjeva({ status: "active", zahtjev: null, primaKampanjeDrugih: false })).toBe(4);
    expect(korakZahtjeva({ status: "active", zahtjev: "approved", primaKampanjeDrugih: true })).toBe(5);
  });
});

describe("zahtjev organizacije u 5 koraka", () => {
  const baza = novaBaza({ seed: true });
  const d = kaoD1(baza);
  const ja = { id: novi.id, email: novi.email };

  it("koraci redom: podaci stvaraju organizer + pending + owner + draft; zatim zastupnik, projekt, KYB, slanje", async () => {
    expect(await nacrtZahtjeva(d, ja.id)).toBeNull();
    expect(prviNedovrseni(null)).toBe("details");
    expect(await spremiZastupnika(d, ja.id, { ime: "N", prezime: "K", funkcija: "f", ovlast: true })).toEqual({ ok: false, greske: { nacrt: "nema" } });

    expect(await spremiPodatke(d, ja, podaci({ slug: SVJETIONIK }), KATEGORIJE)).toEqual({ ok: false, greske: { slug: "zauzet" } });
    expect(await spremiPodatke(d, ja, podaci(), KATEGORIJE)).toEqual({ ok: true, slug: "testna-lipa" });
    let n = (await nacrtZahtjeva(d, ja.id))!;
    expect(n).toMatchObject({ slug: "testna-lipa", naziv: "Udruga Testna Lipa", pravniOblik: "udruga", zastupnik: null, projekt: false, kyb: false });
    expect(prviNedovrseni(n)).toBe("representative");
    const org = redovi<Record<string, unknown>>(baza, "SELECT o.status, o.kind, g.holder_type, g.oib, g.contact_email FROM organizations o JOIN organizers g ON g.id = o.organizer_id WHERE o.slug = 'testna-lipa'")[0]!;
    expect(org).toEqual({ status: "pending", kind: "legal", holder_type: "association", oib: podaci().oib, contact_email: ja.email });
    expect(redovi(baza, "SELECT role FROM memberships WHERE organization_id = ? AND user_id = ?", n.organizationId, ja.id)).toEqual([{ role: "owner" }]);
    expect(redovi(baza, "SELECT status, step FROM organization_applications WHERE id = ?", n.applicationId)).toEqual([{ status: "draft", step: 2 }]);

    // ponovno spremanje mijenja isti nacrt (i slug), ne stvara drugi
    expect(await spremiPodatke(d, ja, podaci({ slug: "testna-lipa-2", pravniOblik: "zadruga" }), KATEGORIJE)).toEqual({ ok: true, slug: "testna-lipa-2" });
    expect(broj(baza, "SELECT count(*) FROM organization_applications WHERE submitted_by = ?", ja.id)).toBe(1);
    expect(broj(baza, "SELECT count(*) FROM organizers g JOIN organizations o ON o.organizer_id = g.id WHERE o.slug = 'testna-lipa-2' AND g.holder_type = 'cooperative'")).toBe(1);

    expect((await spremiZastupnika(d, ja.id, { ime: "", prezime: "K", funkcija: "f", ovlast: false })).ok).toBe(false);
    expect(await spremiZastupnika(d, ja.id, { ime: "Nova", prezime: "Korisnica", funkcija: "predsjednica", ovlast: true })).toEqual({ ok: true });
    expect(await spremiProjekt(d, ja.id, { opisProjekta: "kratko", ocekivaneUplate: "11-100" })).toEqual({ ok: false, greske: { opisProjekta: "prekratko" } });
    expect(await spremiProjekt(d, ja.id, { opisProjekta: "x".repeat(40), ocekivaneUplate: "milijun" })).toEqual({ ok: false, greske: { ocekivaneUplate: "obavezno" } });
    expect(await spremiProjekt(d, ja.id, { opisProjekta: "Skupljamo za opremu i nastupe ansambla u 2027.", ocekivaneUplate: "11-100" })).toEqual({ ok: true });
    n = (await nacrtZahtjeva(d, ja.id))!;
    expect(prviNedovrseni(n)).toBe("kyb");
    expect(await posaljiZahtjev(d, ja.id, true)).toEqual({ ok: false, greska: "nedovrsen" });

    expect(await spremiKyb(d, ja.id, false)).toEqual({ ok: false, greske: { privola: "obavezno" } });
    expect(await spremiKyb(d, ja.id, true)).toEqual({ ok: true });
    expect(await spremiKyb(d, ja.id, true)).toEqual({ ok: true });
    expect(broj(baza, "SELECT count(*) FROM verifications WHERE subject_id = ? AND kind = 'org_kyb' AND status = 'requested' AND provider = 'mock'", n.organizationId)).toBe(1);
    expect(prviNedovrseni((await nacrtZahtjeva(d, ja.id))!)).toBe("review");

    expect(await posaljiZahtjev(d, ja.id, false)).toEqual({ ok: false, greska: "uvjeti" });
    expect(await posaljiZahtjev(d, ja.id, true)).toEqual({ ok: true, slug: "testna-lipa-2" });
    expect(await nacrtZahtjeva(d, ja.id)).toBeNull();
    expect(redovi(baza, "SELECT status, step FROM organization_applications WHERE id = ?", n.applicationId)).toEqual([{ status: "submitted", step: 3 }]);
    const s = (await stanjeZahtjeva(d, n.organizationId))!;
    expect(s).toMatchObject({ korak: 3, organizacija: { status: "pending" }, zahtjev: { status: "submitted", zastupnik: { ime: "Nova", funkcija: "predsjednica" } }, kyb: { status: "submitted", pruzatelj: "mock" } });
  });

  it("Safe organizacije: samo aktivna organizacija, adresa 0x + 40 hex, lanac 100 ili 10200", async () => {
    const id = orgId(SVJETIONIK);
    const naCekanju = orgId(primjeri.organizacijaNaCekanju);
    expect(await spremiSafe(d, naCekanju, { adresa: `0x${"ab".repeat(20)}`, lanac: "100" })).toEqual({ ok: false, greske: { stanje: "nije_aktivna" } });
    expect(await spremiSafe(d, id, { adresa: "0x12", lanac: "1" })).toEqual({ ok: false, greske: { adresa: "neispravno", lanac: "neispravno" } });
    expect(await spremiSafe(d, id, { adresa: `0x${"AB".repeat(20)}`, lanac: "100" })).toEqual({ ok: true });
    expect(redovi(baza, "SELECT safe_address, safe_chain_id FROM organizations WHERE id = ?", id)).toEqual([{ safe_address: `0x${"ab".repeat(20)}`, safe_chain_id: 100 }]);
  });

  it("postavke: „prima kampanje drugih” smije uključiti samo aktivna organizacija; korak zahtjeva prati 4 ↔ 5", async () => {
    const naCekanju = orgId(primjeri.organizacijaNaCekanju);
    const p = (await postavkeOrganizacije(d, naCekanju))!;
    expect(await spremiPostavke(d, naCekanju, { ...p, kategorija: "", primaKampanjeDrugih: true }, KATEGORIJE)).toEqual({ ok: false, greske: { primaKampanjeDrugih: "nije_aktivna" } });
    const id = orgId(SVJETIONIK);
    const s = (await postavkeOrganizacije(d, id))!;
    expect(s.primaKampanjeDrugih).toBe(true);
    expect(await spremiPostavke(d, id, { ...s, kategorija: s.kategorija ?? "", primaKampanjeDrugih: false, web: "nije url" }, KATEGORIJE)).toEqual({ ok: false, greske: { web: "neispravno" } });
    expect(await spremiPostavke(d, id, { ...s, kategorija: "charity", naziv: "Zaklada Svjetionik nade (novo)", primaKampanjeDrugih: false }, KATEGORIJE)).toEqual({ ok: true });
    expect((await stanjeZahtjeva(d, id))!.korak).toBe(4);
    expect(redovi(baza, "SELECT step FROM organization_applications WHERE organization_id = ?", id)).toEqual([{ step: 4 }]);
    expect(await spremiPostavke(d, id, { ...s, kategorija: "charity", primaKampanjeDrugih: true }, KATEGORIJE)).toEqual({ ok: true });
    expect((await stanjeZahtjeva(d, id))!.korak).toBe(5);
  });

  it("vanjske 4fund kampanje: oblik URL-a, kod za opis, jedinstven ID, mock provjera i uklanjanje", async () => {
    const id = orgId(SVJETIONIK);
    expect(idVanjske("https://4fund.com/AbC123")).toBe("abc123");
    expect(idVanjske("https://www.4fund.com/abc123/")).toBe("abc123");
    expect(idVanjske("http://4fund.com/abc123")).toBeNull();
    expect(idVanjske("https://4fund.com.evil.invalid/abc123")).toBeNull();
    expect(await dodajVanjsku(d, id, { url: "https://druga.invalid/x", naslov: "", kategorija: "x" }, KATEGORIJE)).toEqual({
      ok: false,
      greske: { url: "neispravno", naslov: "obavezno", kategorija: "neispravno" },
    });
    const r = await dodajVanjsku(d, id, { url: "https://4fund.com/zq81xk", naslov: "Zimovanje", kategorija: "charity" }, KATEGORIJE);
    expect(r).toMatchObject({ ok: true, kod: expect.stringMatching(/^DOMOVINA-[A-Z0-9]{8}$/) });
    expect(await dodajVanjsku(d, id, { url: "https://4fund.com/ZQ81XK", naslov: "Opet", kategorija: "" }, KATEGORIJE)).toEqual({ ok: false, greske: { url: "zauzet" } });
    if (!r.ok) throw new Error();
    expect((await vanjskeOrganizacije(d, id)).find((v) => v.id === r.id)).toMatchObject({ status: "pending", externalId: "zq81xk" });
    expect(await potvrdiVanjsku(d, orgId("demo-sapica"), r.id)).toBe(false);
    expect(await potvrdiVanjsku(d, id, r.id)).toBe(true);
    expect(await potvrdiVanjsku(d, id, r.id)).toBe(false);
    expect(await ukloniVanjsku(d, id, r.id)).toBe(true);
    expect((await vanjskeOrganizacije(d, id)).some((v) => v.id === r.id)).toBe(false);
  });

  it("kampanje organizacije: vlastite i tuđe za nju, sa stanjima, bez obrisanih", async () => {
    const k = await kampanjeOrganizacije(d, orgId(SVJETIONIK));
    expect(k.map((x) => x.publicId)).toEqual(expect.arrayContaining([primjeri.kampanja.aktivna, primjeri.kampanja.zaOrganizaciju, primjeri.kampanja.review404]));
    expect(k.find((x) => x.publicId === primjeri.kampanja.review404)).toMatchObject({ state: "review", zaOrganizaciju: true });
    expect(k.every((x) => broj(baza, "SELECT count(*) FROM campaigns WHERE id = ? AND deleted_at IS NULL", x.id) === 1)).toBe(true);
  });
});

describe("članovi i uloge", () => {
  const baza = novaBaza({ seed: true });
  const d = kaoD1(baza);
  const id = orgId(SVJETIONIK);

  it("popis: owner prvi, pa admin", async () => {
    const c = await clanovi(d, id);
    expect(c.map((x) => [x.email, x.uloga])).toEqual([[organizator.email, "owner"], [adminSvjetionika.email, "admin"]]);
  });
  it("barem jedan owner: zadnji owner se ne može spustiti ni ukloniti; uz drugog ownera može", async () => {
    expect(await promijeniUlogu(d, id, organizator.id, "admin")).toEqual({ ok: false, greska: "zadnji_owner" });
    expect(await ukloniClana(d, id, organizator.id)).toEqual({ ok: false, greska: "zadnji_owner" });
    expect(await promijeniUlogu(d, id, adminSvjetionika.id, "sef")).toEqual({ ok: false, greska: "uloga" });
    expect(await promijeniUlogu(d, id, novi.id, "viewer")).toEqual({ ok: false, greska: "nije_clan" });
    expect(await promijeniUlogu(d, id, adminSvjetionika.id, "owner")).toEqual({ ok: true });
    expect(await promijeniUlogu(d, id, organizator.id, "editor")).toEqual({ ok: true });
    expect(await promijeniUlogu(d, id, adminSvjetionika.id, "viewer")).toEqual({ ok: false, greska: "zadnji_owner" });
    expect(await ukloniClana(d, id, organizator.id)).toEqual({ ok: true });
    expect(broj(baza, "SELECT count(*) FROM memberships WHERE organization_id = ? AND role = 'owner'", id)).toBe(1);
  });
});

describe("pozivnice", () => {
  const baza = novaBaza({ seed: true });
  const d = kaoD1(baza);
  const id = orgId(SVJETIONIK);

  it("seed: pozivnica na čekanju i istekla (pending s prošlim rokom → istekla bez zapisa)", async () => {
    expect(await pozivnicaPoTokenu(d, primjeri.pozivnica, sad)).toMatchObject({ stanje: "pending", uloga: "editor", email: novi.email, organizacija: { slug: SVJETIONIK } });
    expect(await pozivnicaPoTokenu(d, primjeri.pozivnicaIstekla, sad)).toMatchObject({ stanje: "expired" });
    expect(broj(baza, "SELECT count(*) FROM membership_invites WHERE status = 'expired'")).toBe(0);
    expect(await pozivnicaPoTokenu(d, "nepostojeci", sad)).toBeNull();
    expect(stanjePozivnice("pending", sad, sad)).toBe("expired");
    expect(stanjePozivnice("accepted", sad - 1, sad)).toBe("accepted");
  });
  it("nova pozivnica: provjere, hash u bazi, 7 dana, prethodna za istu e-poštu opozvana", async () => {
    expect(await pozovi(d, { orgId: id, email: "", uloga: "editor", pozvao: organizator.id }, sad)).toEqual({ ok: false, greska: "email_prazno" });
    expect(await pozovi(d, { orgId: id, email: "x@", uloga: "editor", pozvao: organizator.id }, sad)).toEqual({ ok: false, greska: "email_neispravan" });
    expect(await pozovi(d, { orgId: id, email: "a@demo.invalid", uloga: "boss", pozvao: organizator.id }, sad)).toEqual({ ok: false, greska: "uloga" });
    expect(await pozovi(d, { orgId: id, email: adminSvjetionika.email.toUpperCase(), uloga: "viewer", pozvao: organizator.id }, sad)).toEqual({ ok: false, greska: "vec_clan" });
    const prva = await pozovi(d, { orgId: id, email: "Netko@Demo.invalid", uloga: "viewer", pozvao: organizator.id }, sad);
    const druga = await pozovi(d, { orgId: id, email: "netko@demo.invalid", uloga: "editor", pozvao: organizator.id }, sad);
    if (!prva.ok || !druga.ok) throw new Error("pozivnica");
    expect(broj(baza, "SELECT count(*) FROM membership_invites WHERE token_hash = ?", druga.token)).toBe(0);
    expect(redovi(baza, "SELECT status FROM membership_invites WHERE id IN (?, ?) ORDER BY status", prva.id, druga.id)).toEqual([{ status: "pending" }, { status: "revoked" }]);
    expect(redovi(baza, "SELECT expires_at - created_at AS rok, email FROM membership_invites WHERE id = ?", druga.id)).toEqual([{ rok: TRAJANJE_POZIVNICE, email: "netko@demo.invalid" }]);
    const naCekanju = await pozivniceNaCekanju(d, id, sad);
    expect(naCekanju.map((p) => [p.email, p.stanje])).toEqual(expect.arrayContaining([["netko@demo.invalid", "pending"], ["bivsi.clan@demo.invalid", "expired"]]));
    expect(await opozoviPozivnicu(d, orgId("demo-sapica"), druga.id)).toBe(false);
    expect(await opozoviPozivnicu(d, id, druga.id)).toBe(true);
    expect((await pozivnicaPoTokenu(d, druga.token, sad))!.stanje).toBe("revoked");
  });
  it("prihvat: samo ista e-pošta i u roku; istekla, tuđa i iskorištena ne prolaze", async () => {
    expect(await prihvatiPozivnicu(d, primjeri.pozivnica, organizator, sad)).toBe("druga_eposta");
    expect(await prihvatiPozivnicu(d, primjeri.pozivnicaIstekla, { id: "x", email: "bivsi.clan@demo.invalid" }, sad)).toBe("nije_na_cekanju");
    expect(await prihvatiPozivnicu(d, "nema", novi, sad)).toBe("nema");
    expect(await prihvatiPozivnicu(d, primjeri.pozivnica, novi, sad + TRAJANJE_POZIVNICE)).toBe("nije_na_cekanju");
    expect(await prihvatiPozivnicu(d, primjeri.pozivnica, novi, sad)).toBe("prihvacena");
    expect(redovi(baza, "SELECT role, invited_by FROM memberships WHERE organization_id = ? AND user_id = ?", id, novi.id)).toEqual([{ role: "editor", invited_by: organizator.id }]);
    expect(await prihvatiPozivnicu(d, primjeri.pozivnica, novi, sad)).toBe("nije_na_cekanju");
    expect(await odbijPozivnicu(d, primjeri.pozivnica, novi, sad)).toBe("nije_na_cekanju");
  });
  it("odbijanje: pozivnica postaje revoked, član ne nastaje", async () => {
    const p = await pozovi(d, { orgId: id, email: "odbija@demo.invalid", uloga: "viewer", pozvao: organizator.id }, sad);
    if (!p.ok) throw new Error();
    expect(await odbijPozivnicu(d, p.token, { id: novi.id, email: "odbija@demo.invalid" }, sad)).toBe("odbijena");
    expect((await pozivnicaPoTokenu(d, p.token, sad))!.stanje).toBe("revoked");
  });
});

describe("učitavači organizacije (pristup i obrasci)", () => {
  const baza = novaBaza({ seed: true });
  const d = kaoD1(baza);
  const ctx = (put: string, o: Parameters<typeof kontekst>[2] = {}) => kontekst(d, put, o);

  it("P: bez sesije 302 na prijavu; korak bez nacrta je 200 s uputom (provjera ruta)", async () => {
    expect(status(await ucitajPodatke(ctx("/hr/organizacija/nova/podaci")))).toBe(302);
    expect(lokacija(await ucitajPodatke(ctx("/hr/organizacija/nova/podaci")))).toContain("/hr/prijava?next=");
    expect(status(await ucitajPregled(ctx("/hr/organizacija/nova/pregled", { korisnik: novi })))).toBe(200);
  });
  it("podaci POST: greška 200 s porukom uz polje, uspjeh 303 na zastupnika", async () => {
    const lose = await ucitajPodatke(ctx("/hr/organizacija/nova/podaci", { korisnik: novi, obrazac: { naziv: "", slug: "x" } }));
    expect(status(lose)).toBe(200);
    expect((lose as { podaci: { greske: Record<string, string> } }).podaci.greske).toMatchObject({ naziv: "obavezno", slug: "neispravno" });
    const p = podaci({ slug: "ucitavac-lipa" });
    const r = await ucitajPodatke(ctx("/hr/organizacija/nova/podaci", { korisnik: novi, obrazac: { ...p, mreze: p.mreze.join("\n") } as unknown as Record<string, string> }));
    expect(status(r)).toBe(303);
    expect(lokacija(r)).toBe("/hr/organizacija/nova/zastupnik");
  });
  it("U:owner zahtjev, U:admin postavke, U:viewer kampanje, U:editor vanjske: admin ne vidi zahtjev; tuđa organizacija 404", async () => {
    const params = { slug: SVJETIONIK };
    expect(status(await ucitajZahtjev(ctx(`/hr/o/${SVJETIONIK}/zahtjev`, { params, korisnik: organizator })))).toBe(200);
    expect(status(await ucitajZahtjev(ctx(`/hr/o/${SVJETIONIK}/zahtjev`, { params, korisnik: adminSvjetionika })))).toBe(404);
    expect(status(await ucitajPostavke(ctx(`/hr/o/${SVJETIONIK}/postavke`, { params, korisnik: adminSvjetionika })))).toBe(200);
    expect(status(await ucitajKampanje(ctx(`/hr/o/${SVJETIONIK}/kampanje`, { params, korisnik: adminSvjetionika })))).toBe(200);
    expect(status(await ucitajVanjske(ctx(`/hr/o/${SVJETIONIK}/vanjske`, { params, korisnik: novi })))).toBe(404);
    expect(status(await ucitajPostavke(ctx(`/hr/o/demo-sapica/postavke`, { params: { slug: "demo-sapica" }, korisnik: organizator })))).toBe(404);
  });
  it("članovi: popis U:viewer; izmjene samo owner; promjena uloge traži P+e (302 na potvrdu radnje)", async () => {
    const params = { slug: SVJETIONIK };
    const put = `/hr/o/${SVJETIONIK}/clanovi`;
    const admin = (await ucitajClanove(ctx(put, { params, korisnik: adminSvjetionika }))) as { podaci: PodaciClanova };
    expect(admin.podaci.mozeUredjivati).toBe(false);
    expect(admin.podaci.clanovi).toHaveLength(2);
    expect(status(await ucitajClanove(ctx(put, { params, korisnik: adminSvjetionika, obrazac: { radnja: "pozovi", email: "a@demo.invalid", uloga: "viewer" } })))).toBe(404);
    const poziv = await ucitajClanove(ctx(put, { params, korisnik: organizator, obrazac: { radnja: "pozovi", email: "novi.clan@demo.invalid", uloga: "viewer" } }));
    expect(status(poziv)).toBe(303);
    expect(broj(baza, "SELECT count(*) FROM membership_invites WHERE email = 'novi.clan@demo.invalid' AND status = 'pending'")).toBe(1);
    const uloga = await ucitajClanove(ctx(put, { params, korisnik: organizator, obrazac: { radnja: "uloga", userId: adminSvjetionika.id, uloga: "editor" } }));
    expect(status(uloga)).toBe(302);
    expect(lokacija(uloga)).toMatch(/^\/hr\/potvrda-radnje\//);
    expect(redovi(baza, "SELECT role FROM memberships WHERE user_id = ? AND organization_id = ?", adminSvjetionika.id, orgId(SVJETIONIK))).toEqual([{ role: "admin" }]);
  });
  it("pozivnica: T bez prijave 200 (prikaz), prihvat traži prijavu; nepoznat token 404", async () => {
    const put = `/hr/pozivnica/${primjeri.pozivnica}`;
    const gost = (await ucitajPozivnicu(ctx(put, { params: { token: primjeri.pozivnica } }))) as { podaci: PodaciPozivnice };
    expect(gost.podaci.pozivnica.organizacija.slug).toBe(SVJETIONIK);
    expect(status(await ucitajPozivnicu(ctx(put, { params: { token: primjeri.pozivnica }, obrazac: { radnja: "prihvati" } })))).toBe(302);
    expect(status(await ucitajPozivnicu(ctx("/hr/pozivnica/nema", { params: { token: "nema" } })))).toBe(404);
    const r = await ucitajPozivnicu(ctx(put, { params: { token: primjeri.pozivnica }, korisnik: novi, obrazac: { radnja: "prihvati" } }));
    expect(status(r)).toBe(303);
    expect(lokacija(r)).toBe(`/hr/o/${SVJETIONIK}/kampanje`);
  });
});
