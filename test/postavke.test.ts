// Postavke računa i verifikacija osobe (S6, ekrani 02 i 10–18): pristup P (302 bez prijave), P+e za brisanje,
// validacija svakog POST-a, prekidači, slug, telefon samo verificiranom, KYC koraci i simulacija odluke EMI-ja.
import { describe, expect, it } from "vitest";
import primjeri from "../seed/primjeri.json";
import { osobaVerificirana } from "../src/lib/db/objava";
import {
  normalizirajTelefon,
  provjeriObrazacKyc,
  provjeriPodatke,
  provjeriSlug,
  valjanOib,
} from "../src/lib/db/postavke";
import { hashTokena, type Korisnik } from "../src/lib/sesija";
import { POSTAVKE } from "../src/views/sadrzaj/postavke";
import { ucitaj as postavke } from "../src/views/stranice/settings.ucitaj";
import { ucitaj as podaciRacuna } from "../src/views/stranice/settings.details.ucitaj";
import { ucitaj as telefon } from "../src/views/stranice/settings.phone.ucitaj";
import { ucitaj as profil } from "../src/views/stranice/settings.profile.ucitaj";
import { ucitaj as nacini } from "../src/views/stranice/settings.sign-in.ucitaj";
import { ucitaj as sigurnost } from "../src/views/stranice/settings.security.ucitaj";
import { ucitaj as verifikacija } from "../src/views/stranice/settings.verification.ucitaj";
import { ucitaj as vrsta } from "../src/views/stranice/settings.verification.type.ucitaj";
import { ucitaj as kyc } from "../src/views/stranice/settings.verification.details.ucitaj";
import { ucitaj as pregledKyc } from "../src/views/stranice/settings.verification.review.ucitaj";
import { ucitaj as verifikacijaKampanja } from "../src/views/stranice/settings.campaign-verification.ucitaj";
import { ucitaj as linkovi } from "../src/views/stranice/settings.links.ucitaj";
import { ucitaj as dijeljenja } from "../src/views/stranice/settings.links.sharing.ucitaj";
import { ucitaj as ponavljajuce } from "../src/views/stranice/settings.recurring.ucitaj";
import { ucitaj as povijest } from "../src/views/stranice/settings.sign-in-history.ucitaj";
import type { Ucitaj } from "../src/views/tipovi";
import { broj, kaoD1, novaBaza, redovi } from "./pomoc/baza";
import { kontekst, laziKolacici } from "./pomoc/kontekst";

const SAD = Date.UTC(2026, 10, 25, 10);
const svjeza = () => {
  const sqlite = novaBaza({ seed: true });
  return { sqlite, db: kaoD1(sqlite) };
};
type Baza = ReturnType<typeof svjeza>;
const korisnik = ({ sqlite }: Baza, email: string): Korisnik => {
  const r = sqlite.prepare("SELECT id, email FROM users WHERE email = ?").get(email) as { id: string; email: string };
  return { id: r.id, email: r.email, ime: email, platformRole: "user" };
};
const podaci = <T,>(r: unknown): T => {
  expect(r).not.toBeInstanceOf(Response);
  return (r as { podaci: T }).podaci;
};
const lokacija = (r: unknown) => {
  expect(r).toBeInstanceOf(Response);
  return { status: (r as Response).status, gdje: (r as Response).headers.get("Location") ?? "" };
};
/** Odobrena verifikacija osobe izravno u bazi. */
const verificiraj = ({ sqlite }: Baza, userId: string) =>
  sqlite
    .prepare("INSERT INTO verifications (id, kind, subject_type, subject_id, status, provider, requested_at, decided_at) VALUES (?, 'person_kyc', 'user', ?, 'approved', 'mock', ?, ?)")
    .run(`kyc-${userId}`, userId, SAD - 1000, SAD - 500);

const KYC: Record<string, string> = {
  first_name: "Nova", last_name: "Korisnica", citizenship: "HR", birth_country: "HR", birth_date: "1990-05-17", oib: "12345678903",
  residence_country: "HR", document_type: "id_card", document_number: "123456789", document_expiry: "2030-01-01",
  street: "Ilica", house_number: "1", postal_code: "10000", city: "Zagreb", pep: "no", accuracy: "1",
};

describe("čiste provjere", () => {
  it("slug: a-z0-9-, 3–40, ne UUID", () => {
    expect(provjeriSlug("ivana-t")).toBeNull();
    expect(provjeriSlug("ab")).toBe("neispravno");
    expect(provjeriSlug("Ivana")).toBe("neispravno");
    expect(provjeriSlug("a_b")).toBe("neispravno");
    expect(provjeriSlug("x".repeat(41))).toBe("neispravno");
    expect(provjeriSlug("019e4cfb-5400-7ccf-9efe-8f1118b63f0e")).toBe("neispravno");
  });

  it("telefon: + i 8–15 znamenki, prazno = brisanje", () => {
    expect(normalizirajTelefon("+385 91 123 4567")).toBe("+385911234567");
    expect(normalizirajTelefon("")).toBeNull();
    expect(normalizirajTelefon("091 123 4567")).toBe(false);
    expect(normalizirajTelefon("+0123456789")).toBe(false);
  });

  it("OIB: kontrolna znamenka ISO 7064", () => {
    expect(valjanOib("12345678903")).toBe(true);
    expect(valjanOib("12345678901")).toBe(false);
    expect(valjanOib("1234567890")).toBe(false);
  });

  it("podaci: „o meni” i web samo verificiranom; web mora biti http(s)", () => {
    const f = { first_name: "Ana", about: "Tekst", website: "javascript:alert(1)" };
    expect(provjeriPodatke(f, false)).toEqual({ greske: {}, vrijednosti: { first_name: "Ana", last_name: null, display_name: null } });
    expect(provjeriPodatke(f, true).greske).toEqual({ website: "neispravno" });
    expect(provjeriPodatke({ ...f, website: "https://primjer.hr" }, true).greske).toEqual({});
    expect(provjeriPodatke({ first_name: "x".repeat(256) }, false).greske).toEqual({ first_name: "predugo" });
  });

  it("KYC obrazac: obavezna polja, EGP, punoljetnost, istek dokumenta, PEP", () => {
    expect(provjeriObrazacKyc(KYC, SAD)).toEqual({});
    const prazno = provjeriObrazacKyc({}, SAD);
    for (const k of ["first_name", "last_name", "citizenship", "birth_country", "birth_date", "residence_country", "document_type", "document_number", "document_expiry", "street", "house_number", "postal_code", "city", "pep", "accuracy"])
      expect(prazno[k], k).toBeDefined();
    expect(prazno.residence_country).toBe("egp");
    expect(provjeriObrazacKyc({ ...KYC, residence_country: "RS" }, SAD)).toEqual({ residence_country: "egp" });
    expect(provjeriObrazacKyc({ ...KYC, birth_date: "2010-01-01" }, SAD)).toEqual({ birth_date: "maloljetan" });
    expect(provjeriObrazacKyc({ ...KYC, document_expiry: "2020-01-01" }, SAD)).toEqual({ document_expiry: "istekao" });
    expect(provjeriObrazacKyc({ ...KYC, document_expiry: "", no_expiry: "1" }, SAD)).toEqual({});
    expect(provjeriObrazacKyc({ ...KYC, oib: "12345678901" }, SAD)).toEqual({ oib: "neispravno" });
    expect(provjeriObrazacKyc({ ...KYC, pep: "yes" }, SAD)).toEqual({ pep_kind: "obavezno", pep_statement: "obavezno" });
    expect(provjeriObrazacKyc({ ...KYC, pep: "yes", pep_kind: "family", pep_statement: "1" }, SAD)).toEqual({});
  });
});

describe("pristup P", () => {
  const SVI: [string, Ucitaj][] = [
    ["/hr/postavke", postavke], ["/hr/postavke/podaci", podaciRacuna], ["/hr/postavke/telefon", telefon], ["/hr/postavke/profil", profil],
    ["/hr/postavke/prijava", nacini], ["/hr/postavke/sigurnost", sigurnost], ["/hr/postavke/verifikacija", verifikacija],
    ["/hr/postavke/verifikacija/vrsta", vrsta], ["/hr/postavke/verifikacija/podaci", kyc], ["/hr/postavke/verifikacija/pregled", pregledKyc],
    ["/hr/postavke/verifikacija-kampanja", verifikacijaKampanja], ["/hr/postavke/linkovi", linkovi], ["/hr/postavke/linkovi/dijeljenje", dijeljenja],
    ["/hr/postavke/ponavljajuce", ponavljajuce], ["/hr/postavke/povijest-prijava", povijest],
  ];

  it("bez prijave: GET i POST su 302 na prijavu s next", async () => {
    const { db } = svjeza();
    for (const [put, u] of SVI) {
      for (const obrazac of [undefined, { akcija: "obrisi" }]) {
        const l = lokacija(await u(kontekst(db, put, obrazac ? { obrazac } : {})));
        expect(l.status, put).toBe(302);
        expect(l.gdje, put).toContain(`/hr/prijava?next=${encodeURIComponent(put)}`);
      }
    }
  });

  it("prijavljen: svaka ruta osim /postavke daje podatke; /postavke je 302 na podatke", async () => {
    const b = svjeza();
    const k = korisnik(b, primjeri.demoRacuni.organizator);
    expect(lokacija(await postavke(kontekst(b.db, "/hr/postavke", { korisnik: k })))).toEqual({ status: 302, gdje: "/hr/postavke/podaci" });
    expect(lokacija(await postavke(kontekst(b.db, "/en/settings", { korisnik: k }))).gdje).toBe("/en/settings/details");
    for (const [put, u] of SVI.slice(1)) podaci(await u(kontekst(b.db, put, { korisnik: k })));
  });
});

describe("podaci i telefon", () => {
  it("podaci: neverificiranom se „o meni” ne sprema; greška je 200 s porukom; uspjeh 303 ?ok", async () => {
    const b = svjeza();
    const k = korisnik(b, primjeri.demoRacuni.novi);
    const r = lokacija(await podaciRacuna(kontekst(b.db, "/hr/postavke/podaci", { korisnik: k, obrazac: { first_name: " Nova ", last_name: "K", display_name: "", about: "Tajno" } })));
    expect(r).toEqual({ status: 303, gdje: "/hr/postavke/podaci?ok=1" });
    expect(redovi(b.sqlite, "SELECT first_name, last_name, display_name, about FROM users WHERE id = ?", k.id)[0]).toEqual({
      first_name: "Nova", last_name: "K", display_name: null, about: null,
    });
    verificiraj(b, k.id);
    const g = podaci<{ greske: Record<string, string> }>(await podaciRacuna(kontekst(b.db, "/hr/postavke/podaci", { korisnik: k, obrazac: { first_name: "Nova", website: "ftp://x" } })));
    expect(g.greske).toEqual({ website: "neispravno" });
    lokacija(await podaciRacuna(kontekst(b.db, "/hr/postavke/podaci", { korisnik: k, obrazac: { first_name: "Nova", about: "O meni", website: "https://nova.hr" } })));
    expect(redovi(b.sqlite, "SELECT about, website FROM users WHERE id = ?", k.id)[0]).toEqual({ about: "O meni", website: "https://nova.hr" });
  });

  it("telefon samo verificiranom; neispravan broj; uklanjanje uvijek", async () => {
    const b = svjeza();
    const k = korisnik(b, primjeri.demoRacuni.novi);
    const put = "/hr/postavke/telefon";
    const ne = podaci<{ greska: string; verificiran: boolean }>(await telefon(kontekst(b.db, put, { korisnik: k, obrazac: { phone: "+385911234567" } })));
    expect(ne).toMatchObject({ greska: "verifikacija", verificiran: false });
    expect(broj(b.sqlite, "SELECT COUNT(*) AS n FROM users WHERE id = ? AND phone IS NOT NULL", k.id)).toBe(0);
    verificiraj(b, k.id);
    expect(podaci<{ greska: string }>(await telefon(kontekst(b.db, put, { korisnik: k, obrazac: { phone: "091 123" } }))).greska).toBe("neispravno");
    expect(lokacija(await telefon(kontekst(b.db, put, { korisnik: k, obrazac: { phone: "+385 91 123 4567" } }))).status).toBe(303);
    expect(redovi<{ phone: string }>(b.sqlite, "SELECT phone FROM users WHERE id = ?", k.id)[0]!.phone).toBe("+385911234567");
    lokacija(await telefon(kontekst(b.db, put, { korisnik: k, obrazac: { akcija: "ukloni" } })));
    expect(redovi<{ phone: string | null }>(b.sqlite, "SELECT phone FROM users WHERE id = ?", k.id)[0]!.phone).toBeNull();
  });
});

describe("profil i brisanje računa", () => {
  it("prekidači, indeksiranje, newsletter i slug se spremaju; slug jedinstven i ne-UUID", async () => {
    const b = svjeza();
    const k = korisnik(b, primjeri.demoRacuni.novi);
    const put = "/hr/postavke/profil";
    const r = lokacija(await profil(kontekst(b.db, put, { korisnik: k, obrazac: { show_email: "1", show_owned: "1", slug: "Nova-K", newsletter: "1" } })));
    expect(r).toEqual({ status: 303, gdje: "/hr/postavke/profil?ok=1" });
    const s = redovi<Record<string, number>>(b.sqlite, "SELECT * FROM user_settings WHERE user_id = ?", k.id)[0]!;
    expect(s).toMatchObject({ show_email: 1, show_owned: 1, show_avatar: 0, show_donated: 0, indexable: 0 });
    expect(redovi<{ slug: string }>(b.sqlite, "SELECT slug FROM users WHERE id = ?", k.id)[0]!.slug).toBe("nova-k");
    expect(broj(b.sqlite, "SELECT granted AS n FROM consents WHERE user_id = ? AND kind = 'newsletter' ORDER BY created_at DESC, id DESC LIMIT 1", k.id)).toBe(1);

    const zauzet = podaci<{ greske: Record<string, string>; postavke: { slug: string } }>(
      await profil(kontekst(b.db, put, { korisnik: k, obrazac: { slug: primjeri.korisnikSlug, show_email: "1" } })),
    );
    expect(zauzet.greske).toEqual({ slug: "zauzet" });
    expect(zauzet.postavke.slug).toBe(primjeri.korisnikSlug);
    const uuid = podaci<{ greske: Record<string, string> }>(await profil(kontekst(b.db, put, { korisnik: k, obrazac: { slug: k.id } })));
    expect(uuid.greske).toEqual({ slug: "neispravno" });
    // greška ništa ne mijenja
    expect(redovi<{ slug: string }>(b.sqlite, "SELECT slug FROM users WHERE id = ?", k.id)[0]!.slug).toBe("nova-k");
    // prazan slug briše
    lokacija(await profil(kontekst(b.db, put, { korisnik: k, obrazac: { slug: "", indexable: "1" } })));
    expect(redovi<{ slug: string | null }>(b.sqlite, "SELECT slug FROM users WHERE id = ?", k.id)[0]!.slug).toBeNull();
  });

  it("brisanje: bez svježe potvrde 302 na potvrdu radnje; s potvrdom briše, opoziva sesije i odjavljuje", async () => {
    const b = svjeza();
    const k = korisnik(b, primjeri.demoRacuni.novi);
    const put = "/hr/postavke/profil";
    const bez = lokacija(await profil(kontekst(b.db, put, { korisnik: k, obrazac: { akcija: "obrisi" } })));
    expect(bez.status).toBe(302);
    expect(bez.gdje).toMatch(/^\/hr\/potvrda-radnje\/[^?]+\?next=%2Fhr%2Fpostavke%2Fprofil$/);
    expect(broj(b.sqlite, "SELECT COUNT(*) AS n FROM users WHERE id = ? AND deleted_at IS NULL", k.id)).toBe(1);

    const sad = Date.now();
    b.sqlite
      .prepare("INSERT INTO one_time_codes (id, user_id, email, purpose, action, code_hash, attempts, created_at, expires_at, used_at) VALUES ('svjeza', ?, ?, 'step_up', 'delete_account', 'x', 0, ?, ?, ?)")
      .run(k.id, k.email, sad - 1000, sad + 60_000, sad - 500);
    const kolacici = laziKolacici({ sesija: "token" });
    const s = lokacija(await profil(kontekst(b.db, put, { korisnik: k, obrazac: { akcija: "obrisi" }, kolacici })));
    expect(s).toEqual({ status: 303, gdje: "/hr?obrisan=1" });
    expect(kolacici.mapa.has("sesija")).toBe(false);
    expect(broj(b.sqlite, "SELECT COUNT(*) AS n FROM users WHERE id = ? AND deleted_at IS NOT NULL", k.id)).toBe(1);
    expect(broj(b.sqlite, "SELECT COUNT(*) AS n FROM sessions WHERE user_id = ? AND revoked_at IS NULL", k.id)).toBe(0);
    expect(broj(b.sqlite, "SELECT COUNT(*) AS n FROM memberships WHERE user_id = ?", k.id)).toBe(0);
  });

  it("brisanje: jedini vlasnik pravne organizacije ne može obrisati račun", async () => {
    const b = svjeza();
    const k = korisnik(b, primjeri.demoRacuni.organizator);
    const jedini = broj(
      b.sqlite,
      `SELECT COUNT(*) AS n FROM memberships m JOIN organizations o ON o.id = m.organization_id WHERE m.user_id = ? AND m.role = 'owner' AND o.kind = 'legal'
         AND NOT EXISTS (SELECT 1 FROM memberships m2 WHERE m2.organization_id = o.id AND m2.role = 'owner' AND m2.user_id <> m.user_id)`,
      k.id,
    );
    expect(jedini).toBeGreaterThan(0);
    const sad = Date.now();
    b.sqlite
      .prepare("INSERT INTO one_time_codes (id, user_id, email, purpose, action, code_hash, attempts, created_at, expires_at, used_at) VALUES ('svjeza', ?, ?, 'step_up', 'delete_account', 'x', 0, ?, ?, ?)")
      .run(k.id, k.email, sad - 1000, sad + 60_000, sad - 500);
    const r = podaci<{ greskaBrisanja: string }>(await profil(kontekst(b.db, "/hr/postavke/profil", { korisnik: k, obrazac: { akcija: "obrisi" } })));
    expect(r.greskaBrisanja).toBe("jedini_vlasnik");
    expect(broj(b.sqlite, "SELECT COUNT(*) AS n FROM users WHERE id = ? AND deleted_at IS NULL", k.id)).toBe(1);
  });
});

describe("načini prijave, sigurnost, povijest", () => {
  it("zadnji način prijave se ne uklanja; tuđi id je „nema”; drugi se uklanja", async () => {
    const b = svjeza();
    const k = korisnik(b, primjeri.demoRacuni.organizator);
    const put = "/hr/postavke/prijava";
    const svi = redovi<{ id: string }>(b.sqlite, "SELECT id FROM auth_identities WHERE user_id = ?", k.id);
    for (const { id } of svi.slice(1)) b.sqlite.prepare("DELETE FROM auth_identities WHERE id = ?").run(id);
    const zadnji = podaci<{ greska: string }>(await nacini(kontekst(b.db, put, { korisnik: k, obrazac: { ukloni: svi[0]!.id } })));
    expect(zadnji.greska).toBe("zadnji");
    const tudi = redovi<{ id: string }>(b.sqlite, "SELECT id FROM auth_identities WHERE user_id <> ? LIMIT 1", k.id)[0]!.id;
    expect(podaci<{ greska: string }>(await nacini(kontekst(b.db, put, { korisnik: k, obrazac: { ukloni: tudi } }))).greska).toBe("nema");
    b.sqlite.prepare("INSERT INTO auth_identities (id, user_id, provider, subject, created_at) VALUES ('g1', ?, 'google', 'g-sub', ?)").run(k.id, SAD);
    expect(lokacija(await nacini(kontekst(b.db, put, { korisnik: k, obrazac: { ukloni: "g1" } }))).status).toBe(303);
    expect(broj(b.sqlite, "SELECT COUNT(*) AS n FROM auth_identities WHERE id = 'g1'")).toBe(0);
  });

  it("odjava ostalih uređaja čuva trenutnu sesiju", async () => {
    const b = svjeza();
    const k = korisnik(b, primjeri.demoRacuni.novi);
    const sad = Date.now();
    for (const t of ["ova", "druga", "treca"])
      b.sqlite.prepare("INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)").run(await hashTokena(t), k.id, sad, sad + 86_400_000);
    const prije = podaci<{ sesija: number }>(await sigurnost(kontekst(b.db, "/hr/postavke/sigurnost", { korisnik: k }))).sesija;
    expect(prije).toBeGreaterThanOrEqual(3);
    const r = lokacija(await sigurnost(kontekst(b.db, "/hr/postavke/sigurnost", { korisnik: k, obrazac: { akcija: "odjavi_ostale" }, kolacici: laziKolacici({ sesija: "ova" }) })));
    expect(r).toEqual({ status: 303, gdje: `/hr/postavke/sigurnost?ok=${prije - 1}` });
    expect(redovi(b.sqlite, "SELECT id FROM sessions WHERE user_id = ? AND revoked_at IS NULL", k.id)).toEqual([{ id: await hashTokena("ova") }]);
    const nakon = podaci<{ odjavljeno: number }>(await sigurnost(kontekst(b.db, `/hr/postavke/sigurnost?ok=${prije - 1}`, { korisnik: k })));
    expect(nakon.odjavljeno).toBe(prije - 1);
  });

  it("povijest prijava: samo vlastite, najnovije prve", async () => {
    const b = svjeza();
    const k = korisnik(b, primjeri.demoRacuni.organizator);
    const p = podaci<{ prijave: { loggedInAt: number }[] }>(await povijest(kontekst(b.db, "/hr/postavke/povijest-prijava", { korisnik: k })));
    expect(p.prijave.length).toBe(broj(b.sqlite, "SELECT COUNT(*) AS n FROM login_events WHERE user_id = ?", k.id));
    const t = p.prijave.map((x) => x.loggedInAt);
    expect([...t].sort((a, c) => c - a)).toEqual(t);
  });
});

describe("verifikacija osobe (mock EMI)", () => {
  it("vrsta → podaci → pregled → simulirano odobrenje; objava osobne kampanje to vidi", async () => {
    const b = svjeza();
    const k = korisnik(b, primjeri.demoRacuni.novi);
    expect(podaci<{ verifikacija: unknown }>(await verifikacija(kontekst(b.db, "/hr/postavke/verifikacija", { korisnik: k }))).verifikacija).toBeNull();
    expect(podaci<{ stanje: unknown }>(await vrsta(kontekst(b.db, "/hr/postavke/verifikacija/vrsta", { korisnik: k }))).stanje).toBeNull();
    const pocetno = podaci<{ vrijednosti: Record<string, string> }>(await kyc(kontekst(b.db, "/hr/postavke/verifikacija/podaci", { korisnik: k })));
    expect(pocetno.vrijednosti).toMatchObject({ first_name: "Nova", last_name: "Korisnica", residence_country: "HR" });

    const put = "/hr/postavke/verifikacija/podaci";
    const g = podaci<{ greske: Record<string, string>; vrijednosti: Record<string, string> }>(
      await kyc(kontekst(b.db, put, { korisnik: k, obrazac: { ...KYC, residence_country: "US", accuracy: "" } })),
    );
    expect(g.greske).toEqual({ residence_country: "egp", accuracy: "obavezno" });
    expect(g.vrijednosti.city).toBe("Zagreb");
    expect(broj(b.sqlite, "SELECT COUNT(*) AS n FROM verifications WHERE subject_id = ?", k.id)).toBe(0);

    expect(lokacija(await kyc(kontekst(b.db, put, { korisnik: k, obrazac: KYC })))).toEqual({ status: 303, gdje: "/hr/postavke/verifikacija/pregled" });
    const v = redovi<Record<string, unknown>>(b.sqlite, "SELECT kind, subject_type, status, provider, trigger, provider_ref FROM verifications WHERE subject_id = ?", k.id);
    expect(v).toHaveLength(1);
    expect(v[0]).toMatchObject({ kind: "person_kyc", subject_type: "user", status: "submitted", provider: "mock", trigger: "user" });
    expect(String(v[0]!.provider_ref)).toMatch(/^MOCK-KYC-/);
    // dok čeka odluku, obrazac je zaključan (POST → pregled, bez novog retka)
    expect(lokacija(await kyc(kontekst(b.db, put, { korisnik: k, obrazac: KYC }))).gdje).toBe("/hr/postavke/verifikacija/pregled");
    expect(broj(b.sqlite, "SELECT COUNT(*) AS n FROM verifications WHERE subject_id = ?", k.id)).toBe(1);
    expect(await osobaVerificirana(b.db, k.id)).toBe(false);

    const pp = "/hr/postavke/verifikacija/pregled";
    expect(podaci<{ greska: string }>(await pregledKyc(kontekst(b.db, pp, { korisnik: k, obrazac: { odluka: "nesto" } }))).greska).toBe("stanje");
    expect(lokacija(await pregledKyc(kontekst(b.db, pp, { korisnik: k, obrazac: { odluka: "approved" } })))).toEqual({ status: 303, gdje: `${pp}?ok=odluceno` });
    expect(await osobaVerificirana(b.db, k.id)).toBe(true);
    // odluka je konačna; ponovna simulacija je greška
    expect(podaci<{ greska: string }>(await pregledKyc(kontekst(b.db, pp, { korisnik: k, obrazac: { odluka: "rejected" } }))).greska).toBe("stanje");
    expect(podaci<{ verifikacija: { status: string } }>(await verifikacija(kontekst(b.db, "/hr/postavke/verifikacija", { korisnik: k }))).verifikacija.status).toBe("approved");
    // verificiran sada smije telefon
    expect(lokacija(await telefon(kontekst(b.db, "/hr/postavke/telefon", { korisnik: k, obrazac: { phone: "+385911234567" } }))).status).toBe(303);
  });

  it("odbijena: razlog zapisan, obrazac se smije poslati ponovno (novi redak)", async () => {
    const b = svjeza();
    const k = korisnik(b, primjeri.demoRacuni.novi);
    const pp = "/hr/postavke/verifikacija/pregled";
    expect(podaci<{ verifikacija: unknown }>(await pregledKyc(kontekst(b.db, pp, { korisnik: k }))).verifikacija).toBeNull();
    expect(podaci<{ greska: string }>(await pregledKyc(kontekst(b.db, pp, { korisnik: k, obrazac: { odluka: "approved" } }))).greska).toBe("stanje");
    lokacija(await kyc(kontekst(b.db, "/hr/postavke/verifikacija/podaci", { korisnik: k, obrazac: KYC })));
    lokacija(await pregledKyc(kontekst(b.db, pp, { korisnik: k, obrazac: { odluka: "rejected" } })));
    const v = podaci<{ verifikacija: { status: string; reason: string; decidedAt: number } }>(await pregledKyc(kontekst(b.db, pp, { korisnik: k }))).verifikacija;
    expect(v.status).toBe("rejected");
    expect(v.reason).toContain("mock");
    expect(v.decidedAt).toBeGreaterThan(0);
    expect(await osobaVerificirana(b.db, k.id)).toBe(false);
    expect(lokacija(await kyc(kontekst(b.db, "/hr/postavke/verifikacija/podaci", { korisnik: k, obrazac: KYC }))).status).toBe(303);
    expect(broj(b.sqlite, "SELECT COUNT(*) AS n FROM verifications WHERE subject_id = ? AND kind = 'person_kyc'", k.id)).toBe(2);
  });
});

describe("verifikacija kampanja, linkovi, ponavljajuće", () => {
  it("verifikacija kampanja: kampanje organizatora s pragom i stanjem dokaza; novi korisnik nema ništa", async () => {
    const b = svjeza();
    const k = korisnik(b, primjeri.demoRacuni.organizator);
    const p = podaci<{ kampanje: { prag: { stanje: string; prag: string | null } }[] }>(
      await verifikacijaKampanja(kontekst(b.db, "/hr/postavke/verifikacija-kampanja", { korisnik: k })),
    );
    expect(p.kampanje.length).toBeGreaterThan(0);
    for (const x of p.kampanje) expect(x.prag).toHaveProperty("stanje");
    const n = korisnik(b, primjeri.demoRacuni.novi);
    expect(podaci<{ kampanje: unknown[] }>(await verifikacijaKampanja(kontekst(b.db, "/hr/postavke/verifikacija-kampanja", { korisnik: n }))).kampanje).toEqual([]);
  });

  it("linkovi: novi link za vidljivu kampanju; slug zauzet / neispravan; nepostojeća kampanja; uključi-isključi samo svoj", async () => {
    const b = svjeza();
    const k = korisnik(b, primjeri.demoRacuni.novi);
    const put = "/hr/postavke/linkovi";
    const g = podaci<{ greske: Record<string, string> }>(await linkovi(kontekst(b.db, put, { korisnik: k, obrazac: { akcija: "stvori", campaign: "zzzzzz", slug: primjeri.linkZaPracenje } })));
    expect(g.greske).toEqual({ campaign: "nema", slug: "zauzet" });
    const g2 = podaci<{ greske: Record<string, string> }>(await linkovi(kontekst(b.db, put, { korisnik: k, obrazac: { akcija: "stvori", campaign: primjeri.kampanja.draft404, slug: "Ab" } })));
    expect(g2.greske).toEqual({ campaign: "nema", slug: "neispravno" });
    const ok = lokacija(await linkovi(kontekst(b.db, put, { korisnik: k, obrazac: { akcija: "stvori", campaign: primjeri.kampanja.aktivna, slug: "moj-link", label: "Facebook" } })));
    expect(ok).toEqual({ status: 303, gdje: `${put}?ok=stvoren` });
    const moji = podaci<{ linkovi: { id: string; slug: string; status: string; posjeti: number }[] }>(await linkovi(kontekst(b.db, put, { korisnik: k })));
    expect(moji.linkovi).toHaveLength(1);
    expect(moji.linkovi[0]).toMatchObject({ slug: "moj-link", status: "active", posjeti: 0 });
    lokacija(await linkovi(kontekst(b.db, put, { korisnik: k, obrazac: { akcija: "iskljuci", id: moji.linkovi[0]!.id } })));
    expect(broj(b.sqlite, "SELECT COUNT(*) AS n FROM tracking_links WHERE slug = 'moj-link' AND status = 'disabled'")).toBe(1);
    // tuđi link se ne mijenja
    const tudi = redovi<{ id: string; status: string }>(b.sqlite, "SELECT id, status FROM tracking_links WHERE slug = ?", primjeri.linkZaPracenje)[0]!;
    lokacija(await linkovi(kontekst(b.db, put, { korisnik: k, obrazac: { akcija: "iskljuci", id: tudi.id } })));
    expect(redovi<{ status: string }>(b.sqlite, "SELECT status FROM tracking_links WHERE id = ?", tudi.id)[0]!.status).toBe(tudi.status);
    // statistika vlasnika seed linka
    const vlasnik = redovi<{ owner_user_id: string }>(b.sqlite, "SELECT owner_user_id FROM tracking_links WHERE id = ?", tudi.id)[0]!.owner_user_id;
    const v = podaci<{ linkovi: { slug: string; posjeti: number }[] }>(await linkovi(kontekst(b.db, put, { korisnik: { ...k, id: vlasnik } })));
    expect(v.linkovi.find((l) => l.slug === primjeri.linkZaPracenje)?.posjeti).toBe(broj(b.sqlite, "SELECT COUNT(*) AS n FROM link_visits WHERE tracking_link_id = ?", tudi.id));
  });

  it("dijeljenja: samo vlastiti share_links", async () => {
    const b = svjeza();
    const n = korisnik(b, primjeri.demoRacuni.novi);
    const kampanja = redovi<{ campaign_id: string }>(b.sqlite, "SELECT campaign_id FROM campaign_settings WHERE public_id = ?", primjeri.kampanja.aktivna)[0]!.campaign_id;
    b.sqlite.prepare("INSERT INTO share_links (id, user_id, campaign_id, code, created_at) VALUES ('sl1', ?, ?, 'nova01', ?)").run(n.id, kampanja, SAD);
    const p = podaci<{ dijeljenja: { code: string; publicId: string }[] }>(await dijeljenja(kontekst(b.db, "/hr/postavke/linkovi/dijeljenje", { korisnik: n })));
    expect(p.dijeljenja).toEqual([expect.objectContaining({ code: "nova01", publicId: primjeri.kampanja.aktivna })]);
  });

  it("ponavljajuće: pauza, nastavak, dan 1–28, otkaz konačan, tuđe se ne mijenja", async () => {
    const b = svjeza();
    const n = korisnik(b, primjeri.demoRacuni.novi);
    const kampanja = redovi<{ campaign_id: string }>(b.sqlite, "SELECT campaign_id FROM campaign_settings WHERE public_id = ?", primjeri.kampanja.mjesecna)[0]!.campaign_id;
    b.sqlite
      .prepare("INSERT INTO recurring_pledges (id, user_id, campaign_id, amount_cents, day_of_month, created_at, updated_at) VALUES ('rp1', ?, ?, 1000, 5, ?, ?)")
      .run(n.id, kampanja, SAD, SAD);
    const put = "/hr/postavke/ponavljajuce";
    const post = (o: Record<string, string>) => ponavljajuce(kontekst(b.db, put, { korisnik: n, obrazac: { id: "rp1", ...o } }));
    const stanje = () => redovi<{ status: string; day_of_month: number }>(b.sqlite, "SELECT status, day_of_month FROM recurring_pledges WHERE id = 'rp1'")[0]!;
    expect(lokacija(await post({ radnja: "pause" })).status).toBe(303);
    expect(stanje().status).toBe("paused");
    expect(podaci<{ greska: boolean }>(await post({ radnja: "pause" })).greska).toBe(true);
    lokacija(await post({ radnja: "resume" }));
    expect(stanje().status).toBe("active");
    expect(podaci<{ greska: boolean }>(await post({ radnja: "day", dan: "29" })).greska).toBe(true);
    expect(podaci<{ greska: boolean }>(await post({ radnja: "day", dan: "x" })).greska).toBe(true);
    lokacija(await post({ radnja: "day", dan: "28" }));
    expect(stanje().day_of_month).toBe(28);
    expect(podaci<{ greska: boolean }>(await post({ radnja: "brisi" })).greska).toBe(true);
    // tuđe
    const tudi = korisnik(b, primjeri.demoRacuni.organizator);
    expect(podaci<{ greska: boolean }>(await ponavljajuce(kontekst(b.db, put, { korisnik: tudi, obrazac: { id: "rp1", radnja: "cancel" } }))).greska).toBe(true);
    lokacija(await post({ radnja: "cancel" }));
    expect(stanje().status).toBe("cancelled");
    expect(podaci<{ greska: boolean }>(await post({ radnja: "resume" })).greska).toBe(true);
    const p = podaci<{ ponavljanja: { id: string; status: string }[] }>(await ponavljajuce(kontekst(b.db, put, { korisnik: n })));
    expect(p.ponavljanja).toEqual([expect.objectContaining({ id: "rp1", status: "cancelled" })]);
  });
});

describe("tekstovi", () => {
  it("hr i en imaju isti oblik", () => {
    const oblik = (o: unknown): unknown =>
      o && typeof o === "object" ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, oblik(v)])) : typeof o;
    expect(oblik(POSTAVKE.en)).toEqual(oblik(POSTAVKE.hr));
  });
});
