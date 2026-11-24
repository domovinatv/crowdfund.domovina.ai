// Mock prijava (S6, odluke 15 i 208): kodovi, poveznica, sesije, `next`, učitavači prijave i registracije,
// migracija 0004. Sve nad sqliteom bez mreže (test/pomoc/baza.ts).
import { describe, expect, it } from "vitest";
import primjeri from "../seed/primjeri.json";
import {
  KOLACIC_DEMO_POSTE,
  KOLACIC_PRIJAVE,
  KOLACIC_SESIJE,
  NAJVISE_POKUSAJA,
  TRAJANJE_KODA,
  TRAJANJE_SESIJE,
  hashTokena,
  ipPrefiks,
  iskoristiPoveznicu,
  izdajKod,
  korisnikPoEmailu,
  korisnikSesije,
  noviKod,
  opisUredaja,
  opozoviSesiju,
  prijavi,
  provjeriKod,
  sigurniNext,
  stanjePoveznice,
  type DemoPoruka,
} from "../src/lib/sesija";
import { ucitaj as ucitajKod } from "../src/views/stranice/sign-in.code.ucitaj";
import { ucitaj as ucitajPrijavu, type PodaciPrijave } from "../src/views/stranice/sign-in.ucitaj";
import { ucitaj as ucitajOdjavu } from "../src/views/stranice/sign-out.ucitaj";
import { ucitaj as ucitajPotvrdu } from "../src/views/stranice/sign-up.confirm.ucitaj";
import { ucitaj as ucitajRegistraciju, type PodaciRegistracije } from "../src/views/stranice/sign-up.ucitaj";
import type { PodaciUnosaKoda } from "../src/components/prijava/ucitavanje";
import { broj, kaoD1, novaBaza, redovi } from "./pomoc/baza";
import { kontekst, laziKolacici } from "./pomoc/kontekst";

const SAD = Date.UTC(2026, 10, 25, 10, 0, 0);
const ORGANIZATOR = primjeri.demoRacuni.organizator;

const svjeza = () => {
  const sqlite = novaBaza({ seed: true });
  return { sqlite, db: kaoD1(sqlite) };
};
const podaci = <T>(r: unknown): T => {
  expect(r).not.toBeInstanceOf(Response);
  return (r as { podaci: T }).podaci;
};
const lokacija = (r: unknown) => {
  expect(r).toBeInstanceOf(Response);
  return { status: (r as Response).status, gdje: (r as Response).headers.get("Location") };
};
const pogresan = (kod: string) => String((Number(kod) + 1) % 1_000_000).padStart(6, "0");

describe("jednokratni kod (login)", () => {
  it("točan kod prolazi jednom; drugi put je iskorišten", async () => {
    const { db } = svjeza();
    const u = (await korisnikPoEmailu(db, ORGANIZATOR))!;
    const k = await izdajKod(db, { email: ORGANIZATOR, userId: u.id, svrha: "login", sad: SAD });
    expect(k.kod).toMatch(/^\d{6}$/);
    expect(k.link).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(k.istjece).toBe(SAD + TRAJANJE_KODA);
    expect(await provjeriKod(db, { id: k.id, kod: k.kod, svrha: "login", sad: SAD + 1000 })).toMatchObject({ ok: true, userId: u.id, email: ORGANIZATOR });
    expect(await provjeriKod(db, { id: k.id, kod: k.kod, svrha: "login", sad: SAD + 2000 })).toEqual({ ok: false, razlog: "iskoristen" });
  });

  it("kod se sprema samo kao hash", async () => {
    const { db, sqlite } = svjeza();
    const k = await izdajKod(db, { email: ORGANIZATOR, userId: null, svrha: "login", sad: SAD });
    const red = redovi<{ code_hash: string }>(sqlite, "SELECT code_hash FROM one_time_codes WHERE id = ?", k.id)[0]!;
    expect(red.code_hash).toBe(await hashTokena(`${k.id}:${k.kod}`));
    expect(red.code_hash).not.toContain(k.kod);
  });

  it("pogrešan kod troši pokušaj; peti zaključava i točan kod", async () => {
    const { db, sqlite } = svjeza();
    const k = await izdajKod(db, { email: ORGANIZATOR, userId: null, svrha: "login", sad: SAD });
    for (let i = 1; i < NAJVISE_POKUSAJA; i++) {
      expect(await provjeriKod(db, { id: k.id, kod: pogresan(k.kod), svrha: "login", sad: SAD })).toEqual({ ok: false, razlog: "pogresan", preostalo: NAJVISE_POKUSAJA - i });
    }
    expect(await provjeriKod(db, { id: k.id, kod: "abc", svrha: "login", sad: SAD })).toEqual({ ok: false, razlog: "pokusaji" });
    expect(broj(sqlite, "SELECT attempts FROM one_time_codes WHERE id = ?", k.id)).toBe(5);
    expect(await provjeriKod(db, { id: k.id, kod: k.kod, svrha: "login", sad: SAD })).toEqual({ ok: false, razlog: "pokusaji" });
  });

  it("istekao nakon 5 minuta; kriva svrha ili nepoznat id je „nema”", async () => {
    const { db } = svjeza();
    const k = await izdajKod(db, { email: ORGANIZATOR, userId: null, svrha: "login", sad: SAD });
    expect(await provjeriKod(db, { id: k.id, kod: k.kod, svrha: "login", sad: SAD + TRAJANJE_KODA })).toEqual({ ok: false, razlog: "istekao" });
    expect(await provjeriKod(db, { id: k.id, kod: k.kod, svrha: "email_verify", sad: SAD })).toEqual({ ok: false, razlog: "nema" });
    expect(await provjeriKod(db, { id: "nema", kod: k.kod, svrha: "login", sad: SAD })).toEqual({ ok: false, razlog: "nema" });
  });

  it("novi kod poništava stari (vrijedi samo zadnji poslani)", async () => {
    const { db } = svjeza();
    const a = await izdajKod(db, { email: ORGANIZATOR, userId: null, svrha: "login", sad: SAD });
    const b = await izdajKod(db, { email: ORGANIZATOR, userId: null, svrha: "login", sad: SAD + 1000 });
    expect(await provjeriKod(db, { id: a.id, kod: a.kod, svrha: "login", sad: SAD + 2000 })).toEqual({ ok: false, razlog: "istekao" });
    expect((await provjeriKod(db, { id: b.id, kod: b.kod, svrha: "login", sad: SAD + 2000 })).ok).toBe(true);
  });

  it("noviKod je uvijek 6 znamenki", () => {
    for (let i = 0; i < 200; i++) expect(noviKod()).toMatch(/^\d{6}$/);
  });
});

describe("poveznica za prijavu", () => {
  it("GET stanje je ne troši; POST jednom; iskorišten kod gasi i poveznicu", async () => {
    const { db } = svjeza();
    const k = await izdajKod(db, { email: ORGANIZATOR, userId: null, svrha: "login", sad: SAD });
    expect(await stanjePoveznice(db, k.link!, SAD)).toEqual({ email: ORGANIZATOR, stanje: "vrijedi" });
    expect(await stanjePoveznice(db, k.link!, SAD)).toEqual({ email: ORGANIZATOR, stanje: "vrijedi" });
    expect(await iskoristiPoveznicu(db, k.link!, SAD)).toMatchObject({ ok: true, email: ORGANIZATOR });
    expect(await iskoristiPoveznicu(db, k.link!, SAD)).toEqual({ ok: false, razlog: "iskoristen" });
    // kod iste prijave više ne vrijedi
    expect(await provjeriKod(db, { id: k.id, kod: k.kod, svrha: "login", sad: SAD })).toEqual({ ok: false, razlog: "istekao" });
    expect(await stanjePoveznice(db, "nepostojeca", SAD)).toBeNull();
  });

  it("poveznica iz seeda postoji i istekla je (200 „istekla”, ne 404)", async () => {
    const { db } = svjeza();
    expect(await stanjePoveznice(db, primjeri.poveznicaPrijave, Date.now())).toEqual({ email: primjeri.demoRacuni.novi, stanje: "istekao" });
  });
});

describe("sesija", () => {
  it("prijavi: sesija (hash tokena), login_events s /24, auth_identities, potvrđena e-pošta", async () => {
    const { db, sqlite } = svjeza();
    const novi = (await korisnikPoEmailu(db, primjeri.demoRacuni.novi))!;
    sqlite.prepare("UPDATE users SET email_verified_at = NULL WHERE id = ?").run(novi.id);
    const s = await prijavi(db, { userId: novi.id, email: novi.email, nacin: "email_code", sad: SAD, ip: "203.0.113.77", userAgent: "Mozilla/5.0 (iPhone) Safari/605" });
    expect(s.id).toBe(await hashTokena(s.token));
    expect(broj(sqlite, "SELECT count(*) FROM sessions WHERE id = ?", s.token)).toBe(0);
    expect(redovi(sqlite, "SELECT ip_prefix, device FROM login_events WHERE session_id = ?", s.id)).toEqual([{ ip_prefix: "203.0.113.0/24", device: "Safari, iOS" }]);
    expect(broj(sqlite, "SELECT email_verified_at FROM users WHERE id = ?", novi.id)).toBe(SAD);
    expect(broj(sqlite, "SELECT count(*) FROM auth_identities WHERE user_id = ? AND provider = 'email_code'", novi.id)).toBe(1);
    await prijavi(db, { userId: novi.id, email: novi.email, nacin: "email_code", sad: SAD + 1000 });
    expect(broj(sqlite, "SELECT count(*) FROM auth_identities WHERE user_id = ? AND provider = 'email_code'", novi.id)).toBe(1);
    expect(await korisnikSesije(db, s.token, SAD + 1)).toMatchObject({ id: novi.id, email: novi.email, ime: "Nova Korisnica", platformRole: "user" });
  });

  it("istek, opoziv i obrisan korisnik gase sesiju", async () => {
    const { db, sqlite } = svjeza();
    const u = (await korisnikPoEmailu(db, ORGANIZATOR))!;
    const s = await prijavi(db, { userId: u.id, email: u.email, nacin: "google", sad: SAD });
    expect(await korisnikSesije(db, s.token, SAD + TRAJANJE_SESIJE - 1)).not.toBeNull();
    expect(await korisnikSesije(db, s.token, SAD + TRAJANJE_SESIJE)).toBeNull();
    expect(await opozoviSesiju(db, s.token, SAD + 5)).toBe(true);
    expect(await opozoviSesiju(db, s.token, SAD + 6)).toBe(false);
    expect(await korisnikSesije(db, s.token, SAD + 10)).toBeNull();
    const s2 = await prijavi(db, { userId: u.id, email: u.email, nacin: "google", sad: SAD });
    sqlite.prepare("UPDATE users SET deleted_at = ? WHERE id = ?").run(SAD, u.id);
    expect(await korisnikSesije(db, s2.token, SAD + 10)).toBeNull();
    expect(await korisnikSesije(db, undefined, SAD)).toBeNull();
    expect(await korisnikSesije(db, "x".repeat(500), SAD)).toBeNull();
  });

  it("demo sesije iz seeda: organizator i moderator", async () => {
    const { db } = svjeza();
    expect(await korisnikSesije(db, primjeri.demoSesija, Date.now())).toMatchObject({ email: ORGANIZATOR, platformRole: "user" });
    expect(await korisnikSesije(db, primjeri.demoSesijaModerator, Date.now())).toMatchObject({ email: primjeri.demoRacuni.moderator, platformRole: "moderator" });
    expect(await korisnikSesije(db, primjeri.demoSesijaNovi, Date.now())).toMatchObject({ email: primjeri.demoRacuni.novi });
  });
});

describe("next i pomoćnici", () => {
  it("next je samo relativni put na isti origin", () => {
    expect(sigurniNext("/hr/moje/kampanje?x=1#a", "hr")).toBe("/hr/moje/kampanje?x=1#a");
    expect(sigurniNext("/en/my/campaigns", "hr")).toBe("/en/my/campaigns");
    for (const los of ["https://zlo.example/", "//zlo.example/x", "/\\zlo.example", "javascript:alert(1)", "hr/kampanje", "/hr/\nx", "", null, undefined]) {
      expect(sigurniNext(los, "en"), String(los)).toBe("/en");
    }
  });
  it("ipPrefiks i opis uređaja ne spremaju punu adresu ni UA", () => {
    expect(ipPrefiks("198.51.100.23")).toBe("198.51.100.0/24");
    expect(ipPrefiks("2001:db8:abcd:12::1")).toBe("2001:db8:abcd::/48");
    expect(ipPrefiks(null)).toBeNull();
    expect(opisUredaja("Mozilla/5.0 (Windows NT 10.0) Firefox/140")).toBe("Firefox, Windows");
  });
});

describe("učitavači prijave", () => {
  it("prijava → kod → sesija → 303 na next; kolačići prijave i demo pošte nestaju", async () => {
    const { db, sqlite } = svjeza();
    const kolacici = laziKolacici();
    const next = "/hr/moje/kampanje?filter=active";
    const r = await ucitajPrijavu(kontekst(db, `/hr/prijava?next=${encodeURIComponent(next)}`, { obrazac: { email: ` ${ORGANIZATOR.toUpperCase()} `, next }, kolacici }));
    expect(lokacija(r)).toEqual({ status: 303, gdje: `/hr/prijava/kod?next=${encodeURIComponent(next)}` });
    const posta = JSON.parse(kolacici.mapa.get(KOLACIC_DEMO_POSTE)!) as DemoPoruka;
    expect(posta).toMatchObject({ email: ORGANIZATOR, id: kolacici.mapa.get(KOLACIC_PRIJAVE) });
    expect(posta.link).toMatch(/^\/auth\/link\/[A-Za-z0-9_-]{43}\?next=/);

    const prikaz = podaci<PodaciUnosaKoda>(await ucitajKod(kontekst(db, `/hr/prijava/kod?next=${encodeURIComponent(next)}`, { kolacici })));
    expect(prikaz).toMatchObject({ stanje: "vrijedi", email: ORGANIZATOR, next, greska: null });
    expect(prikaz.demo?.kod).toBe(posta.kod);

    const krivo = podaci<PodaciUnosaKoda>(await ucitajKod(kontekst(db, "/hr/prijava/kod", { obrazac: { kod: pogresan(posta.kod), next }, kolacici })));
    expect(krivo).toMatchObject({ greska: "pogresan", preostalo: 4, stanje: "vrijedi" });

    const ok = await ucitajKod(kontekst(db, "/hr/prijava/kod", { obrazac: { kod: posta.kod, next }, kolacici }));
    expect(lokacija(ok)).toEqual({ status: 303, gdje: next });
    expect(kolacici.mapa.has(KOLACIC_PRIJAVE)).toBe(false);
    expect(kolacici.mapa.has(KOLACIC_DEMO_POSTE)).toBe(false);
    const token = kolacici.mapa.get(KOLACIC_SESIJE)!;
    expect((await korisnikSesije(db, token, Date.now()))?.email).toBe(ORGANIZATOR);
    expect(broj(sqlite, "SELECT count(*) FROM login_events WHERE session_id = ? AND ip_prefix = '203.0.113.0/24'", await hashTokena(token))).toBe(1);
  });

  it("next na drugi origin vodi na naslovnicu", async () => {
    const { db } = svjeza();
    const kolacici = laziKolacici();
    await ucitajPrijavu(kontekst(db, "/en/sign-in", { obrazac: { email: ORGANIZATOR, next: "https://zlo.example/" }, kolacici }));
    const posta = JSON.parse(kolacici.mapa.get(KOLACIC_DEMO_POSTE)!) as DemoPoruka;
    const ok = await ucitajKod(kontekst(db, "/en/sign-in/code", { obrazac: { kod: posta.kod, next: "//zlo.example" }, kolacici }));
    expect(lokacija(ok)).toEqual({ status: 303, gdje: "/en" });
  });

  it("kod bez kolačića: 200 „nema”; novi kod (ponovo=1) zamjenjuje stari", async () => {
    const { db } = svjeza();
    expect(podaci<PodaciUnosaKoda>(await ucitajKod(kontekst(db, "/hr/prijava/kod"))).stanje).toBe("nema");
    const kolacici = laziKolacici();
    await ucitajPrijavu(kontekst(db, "/hr/prijava", { obrazac: { email: ORGANIZATOR }, kolacici }));
    const stari = kolacici.mapa.get(KOLACIC_PRIJAVE)!;
    expect(lokacija(await ucitajKod(kontekst(db, "/hr/prijava/kod", { obrazac: { ponovo: "1" }, kolacici })))).toEqual({ status: 303, gdje: "/hr/prijava/kod" });
    expect(kolacici.mapa.get(KOLACIC_PRIJAVE)).not.toBe(stari);
  });

  it("nepoznata e-pošta: bez uvjeta ponuda računa (200), s uvjetima tihi upis i privola", async () => {
    const { db, sqlite } = svjeza();
    const email = "nova.osoba@demo.invalid";
    const ponuda = podaci<PodaciPrijave>(await ucitajPrijavu(kontekst(db, "/hr/prijava", { obrazac: { email } })));
    expect(ponuda).toMatchObject({ nepoznata: true, greska: null, email });
    expect(podaci<PodaciPrijave>(await ucitajPrijavu(kontekst(db, "/hr/prijava", { obrazac: { email, nepoznata: "1" } }))).greska).toBe("uvjeti");
    expect(await korisnikPoEmailu(db, email)).toBeNull();
    const r = await ucitajPrijavu(kontekst(db, "/hr/prijava", { obrazac: { email, nepoznata: "1", uvjeti: "1" } }));
    expect(lokacija(r).status).toBe(303);
    const u = (await korisnikPoEmailu(db, email))!;
    expect(redovi(sqlite, "SELECT kind, granted FROM consents WHERE user_id = ?", u.id)).toEqual([{ kind: "terms_privacy", granted: 1 }]);
    expect(podaci<PodaciPrijave>(await ucitajPrijavu(kontekst(db, "/hr/prijava", { obrazac: { email: "nije-adresa" } }))).greska).toBe("email_neispravan");
  });

  it("registracija: validacija, privole, potvrda koda vodi na organizacija/nova", async () => {
    const { db, sqlite } = svjeza();
    const lose = podaci<PodaciRegistracije>(await ucitajRegistraciju(kontekst(db, "/hr/registracija", { obrazac: { ime: "", prezime: "X", email: ORGANIZATOR } })));
    expect(lose.greske).toEqual({ ime: "ime", email: "email_postoji", uvjeti: "uvjeti" });

    const kolacici = laziKolacici();
    const r = await ucitajRegistraciju(
      kontekst(db, "/hr/registracija?organizacija=1", { obrazac: { ime: "Iva", prezime: "Nova", email: "iva.nova@demo.invalid", uvjeti: "1" }, kolacici }),
    );
    expect(lokacija(r)).toEqual({ status: 303, gdje: `/hr/registracija/potvrda?next=${encodeURIComponent("/hr/organizacija/nova")}` });
    const u = (await korisnikPoEmailu(db, "iva.nova@demo.invalid"))!;
    expect(u.ime).toBe("Iva Nova");
    expect(redovi(sqlite, "SELECT kind, granted FROM consents WHERE user_id = ? ORDER BY kind", u.id)).toEqual([
      { kind: "newsletter", granted: 0 },
      { kind: "terms_privacy", granted: 1 },
    ]);
    expect(broj(sqlite, "SELECT count(*) FROM users WHERE id = ? AND email_verified_at IS NULL", u.id)).toBe(1);

    const posta = JSON.parse(kolacici.mapa.get(KOLACIC_DEMO_POSTE)!) as DemoPoruka;
    // kod za potvrdu e-pošte ne vrijedi na ekranu prijave (druga svrha)
    expect(podaci<PodaciUnosaKoda>(await ucitajKod(kontekst(db, "/hr/prijava/kod", { kolacici }))).stanje).toBe("nema");
    const ok = await ucitajPotvrdu(kontekst(db, "/hr/registracija/potvrda", { obrazac: { kod: posta.kod, next: "/hr/organizacija/nova" }, kolacici }));
    expect(lokacija(ok)).toEqual({ status: 303, gdje: "/hr/organizacija/nova" });
    expect(broj(sqlite, "SELECT count(*) FROM users WHERE id = ? AND email_verified_at IS NOT NULL", u.id)).toBe(1);
  });

  it("odjava: GET bez sesije 302 na prijavu; POST opoziva sesiju i briše kolačić", async () => {
    const { db } = svjeza();
    expect(lokacija(await ucitajOdjavu(kontekst(db, "/hr/odjava")))).toEqual({ status: 302, gdje: `/hr/prijava?next=${encodeURIComponent("/hr/odjava")}` });
    const u = (await korisnikPoEmailu(db, ORGANIZATOR))!;
    const s = await prijavi(db, { userId: u.id, email: u.email, nacin: "email_code", sad: Date.now() });
    const korisnik = await korisnikSesije(db, s.token, Date.now());
    expect(podaci(await ucitajOdjavu(kontekst(db, "/hr/odjava", { korisnik })))).toEqual({ korisnik });
    const kolacici = laziKolacici({ [KOLACIC_SESIJE]: s.token });
    expect(lokacija(await ucitajOdjavu(kontekst(db, "/en/sign-out", { obrazac: {}, korisnik, kolacici })))).toEqual({ status: 303, gdje: "/en" });
    expect(kolacici.mapa.has(KOLACIC_SESIJE)).toBe(false);
    expect(await korisnikSesije(db, s.token, Date.now())).toBeNull();
  });
});

describe("migracija 0004", () => {
  const sqlite = novaBaza();
  const db = sqlite;
  const stupci = (t: string) => redovi<{ name: string; notnull: number; dflt_value: string | null }>(db, `PRAGMA table_info(${t})`);

  it("users.slug, campaign_settings.contributions_list, campaign_follows s e-poštom i tokenom", () => {
    expect(stupci("users").map((c) => c.name)).toContain("slug");
    expect(stupci("campaign_settings").find((c) => c.name === "contributions_list")).toMatchObject({ notnull: 1, dflt_value: "'visible'" });
    const f = stupci("campaign_follows");
    expect(f.map((c) => c.name)).toEqual(expect.arrayContaining(["user_id", "email", "token_hash", "confirmed_at"]));
    expect(f.find((c) => c.name === "user_id")!.notnull).toBe(0);
  });

  it("CHECK i UNIQUE: slug ne smije biti UUID ni velika slova; pratitelj treba user_id ili e-poštu", () => {
    const s = novaBaza({ seed: true });
    const id = (e: string) => redovi<{ id: string }>(s, "SELECT id FROM users WHERE email = ?", e)[0]!.id;
    const novi = id(primjeri.demoRacuni.novi);
    expect(() => s.prepare("UPDATE users SET slug = ? WHERE id = ?").run("Velika", novi)).toThrow(/CHECK/);
    expect(() => s.prepare("UPDATE users SET slug = ? WHERE id = ?").run(novi, novi)).toThrow(/CHECK/);
    expect(() => s.prepare("UPDATE users SET slug = ? WHERE id = ?").run(primjeri.korisnikSlug, novi)).toThrow(/UNIQUE/);
    s.prepare("UPDATE users SET slug = 'nova-korisnica' WHERE id = ?").run(novi);
    const kampanja = redovi<{ campaign_id: string }>(s, "SELECT campaign_id FROM campaign_settings WHERE public_id = ?", primjeri.kampanja.aktivna)[0]!.campaign_id;
    const upis = s.prepare("INSERT INTO campaign_follows (user_id, email, campaign_id, notify_updates, token_hash, created_at) VALUES (?, ?, ?, 1, ?, 1)");
    upis.run(null, "pratitelj@demo.invalid", kampanja, "h1");
    expect(() => upis.run(null, "PRATITELJ@demo.invalid", kampanja, "h2")).toThrow(/UNIQUE/);
    expect(() => upis.run(null, null, kampanja, "h3")).toThrow(/CHECK/);
    expect(() => upis.run(null, "drugi@demo.invalid", kampanja, "h1")).toThrow(/UNIQUE/);
  });

  it("seed: skriven popis uplata je u stupcu, ne u metadata", () => {
    const s = novaBaza({ seed: true });
    expect(broj(s, "SELECT count(*) FROM campaign_settings WHERE contributions_list = 'hidden'")).toBe(1);
    expect(broj(s, "SELECT count(*) FROM campaigns WHERE json_extract(metadata, '$.contributions_list') IS NOT NULL")).toBe(0);
    expect(redovi(s, "SELECT s.public_id FROM campaign_settings s WHERE contributions_list = 'hidden'")).toEqual([{ public_id: primjeri.kampanja.popisUplataSkriven }]);
  });
});
