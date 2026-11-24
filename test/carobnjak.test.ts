// Čarobnjak kampanje (S6, odluke 152, 211): validacija koraka, zabranjene riječi, nacrt u kolačiću i u
// campaign_drafts, prijelaz lokalnog nacrta na račun, 302 s /nova-kampanja, svi koraci 200 bez prijave.
import { describe, expect, it } from "vitest";
import primjeri from "../seed/primjeri.json";
import { citajLokalniNacrt, dekodiraj, kodiraj, spremiLokalniNacrt } from "../src/components/carobnjak/kolacic";
import type { PodaciKoraka } from "../src/components/carobnjak/ucitavanje";
import {
  korakCilj,
  korakMediji,
  korakOpis,
  korakVrsta,
  nacrtiKorisnika,
  ocistiNacrt,
  parsirajIznos,
  prviNedovrseni,
  trenutniNacrt,
  zabranjeneRijeci,
  type Nacrt,
} from "../src/lib/db/nacrti";
import { korisnikSesije } from "../src/lib/sesija";
import { CAROBNJAK } from "../src/views/sadrzaj/carobnjak";
import { ucitaj as ulaz } from "../src/views/stranice/new-campaign.ucitaj";
import { ucitaj as vrsta } from "../src/views/stranice/new-campaign.type.ucitaj";
import { ucitaj as cilj } from "../src/views/stranice/new-campaign.goal.ucitaj";
import { ucitaj as mediji } from "../src/views/stranice/new-campaign.media.ucitaj";
import { ucitaj as opis } from "../src/views/stranice/new-campaign.description.ucitaj";
import { ucitaj as pregled } from "../src/views/stranice/new-campaign.preview.ucitaj";
import { broj, kaoD1, novaBaza } from "./pomoc/baza";
import { kontekst, laziKolacici } from "./pomoc/kontekst";

const SAD = Date.UTC(2026, 10, 25, 10);
const OPIS = "Prikupljamo za novi krov dvorane u kojoj vježba pedesetak djece iz susjedstva svaki tjedan.";
const svjeza = () => {
  const sqlite = novaBaza({ seed: true });
  return { sqlite, db: kaoD1(sqlite) };
};
const podaci = (r: unknown): PodaciKoraka => {
  expect(r).not.toBeInstanceOf(Response);
  return (r as { podaci: PodaciKoraka }).podaci;
};
const lokacija = (r: unknown) => {
  expect(r).toBeInstanceOf(Response);
  return { status: (r as Response).status, gdje: (r as Response).headers.get("Location") };
};
const opcije = { moje: [{ id: "org-a" }], primatelji: [{ id: "org-p" }], prijavljen: true };

describe("koraci (čiste funkcije)", () => {
  it("vrsta: obavezna, kategorija obavezna osim za organizaciju; tema iz kategorije", () => {
    expect(korakVrsta({}, {}).greske).toEqual({ vrsta: "obavezno", kategorija: "obavezno" });
    const a = korakVrsta({}, { vrsta: "one_time", kategorija: "animals" });
    expect(a.greske).toEqual({});
    expect(a.nacrt).toMatchObject({ vrsta: "one_time", kategorija: "animals", tema: "animals" });
    const b = korakVrsta({}, { vrsta: "for_organization", za: "org-p" });
    expect(b.greske).toEqual({});
    expect(b.nacrt.organizacija).toEqual({ nacin: "za", orgId: "org-p" });
    // promjena vrste u/iz „za organizaciju” briše izbor organizacije
    const c = korakVrsta({ vrsta: "for_organization", organizacija: { nacin: "za", orgId: "org-p" } }, { vrsta: "one_time", kategorija: "other" });
    expect(c.nacrt.organizacija).toBeUndefined();
    expect(korakVrsta({}, { vrsta: "x", kategorija: "nepostoji" }).greske).toEqual({ vrsta: "obavezno", kategorija: "obavezno" });
  });

  it("cilj: naslov 3–60, iznos, rok u budućnosti, organizacija iz ponuđenih", () => {
    const n: Nacrt = { vrsta: "one_time", kategorija: "charity" };
    expect(korakCilj(n, {}, opcije, SAD).greske).toEqual({ naslov: "obavezno", cilj: "obavezno", organizacija: "obavezno" });
    expect(korakCilj(n, { naslov: "Ab", cilj: "0,5", organizacija: "moja:tuda" }, opcije, SAD).greske).toEqual({
      naslov: "prekratko", cilj: "premalo", organizacija: "obavezno",
    });
    expect(korakCilj(n, { naslov: "x".repeat(61), cilj: "abc", rok: "2026-11-25", organizacija: "osobno" }, opcije, SAD).greske).toEqual({
      naslov: "predugo", cilj: "neispravno", rok: "proslost",
    });
    expect(korakCilj(n, { naslov: "Dobro", cilj: "100", rok: "2030-01-01", organizacija: "osobno" }, opcije, SAD).greske).toEqual({ rok: "predaleko" });
    const ok = korakCilj(n, { naslov: "  Krov  dvorane ", cilj: "12.500", rok: "2027-03-31", organizacija: "moja:org-a" }, opcije, SAD);
    expect(ok.greske).toEqual({});
    expect(ok.nacrt).toMatchObject({ naslov: "Krov dvorane", ciljCenti: 1_250_000, rok: "2027-03-31", organizacija: { nacin: "moja", orgId: "org-a" } });
    expect(korakCilj(n, { naslov: "Ulaganje u krov", cilj: "10", organizacija: "osobno" }, opcije, SAD).greske).toEqual({ naslov: "zabranjeno" });
  });

  it("cilj: mjesečna bez cilja i bez roka; neprijavljeni smije ostaviti organizaciju za kasnije; za organizaciju samo primatelj", () => {
    const m = korakCilj({ vrsta: "recurring", kategorija: "sport" }, { naslov: "Mjesečno za klub", cilj: "", rok: "2027-01-01", organizacija: "osobno" }, opcije, SAD);
    expect(m.greske).toEqual({});
    expect(m.nacrt).toMatchObject({ ciljCenti: null, rok: null });
    const anon = korakCilj({ vrsta: "one_time", kategorija: "sport" }, { naslov: "Dresovi", cilj: "500", organizacija: "" }, { ...opcije, moje: [], prijavljen: false }, SAD);
    expect(anon.greske).toEqual({});
    expect(anon.nacrt.organizacija).toBeNull();
    const prijavljenBez = korakCilj({ vrsta: "one_time", kategorija: "sport" }, { naslov: "Dresovi", cilj: "500", organizacija: "" }, opcije, SAD);
    expect(prijavljenBez.greske).toEqual({ organizacija: "obavezno" });
    const za = { vrsta: "for_organization" as const };
    expect(korakCilj(za, { naslov: "Za zakladu", cilj: "100", organizacija: "moja:org-a" }, opcije, SAD).greske).toEqual({ organizacija: "obavezno_primatelj" });
    expect(korakCilj(za, { naslov: "Za zakladu", cilj: "100", organizacija: "za:org-p" }, opcije, SAD).greske).toEqual({});
  });

  it("mediji: tema obavezna, video samo https YouTube/Vimeo", () => {
    expect(korakMediji({}, {}).greske).toEqual({ tema: "obavezno" });
    expect(korakMediji({}, { tema: "school", video: "http://youtube.com/x" }).greske).toEqual({ video: "neispravno" });
    expect(korakMediji({}, { tema: "school", video: "https://evil.example/x" }).greske).toEqual({ video: "neispravno" });
    const ok = korakMediji({}, { tema: "school", video: "https://www.youtube.com/watch?v=abc" });
    expect(ok.greske).toEqual({});
    expect(ok.nacrt).toMatchObject({ tema: "school", videoUrl: "https://www.youtube.com/watch?v=abc", mediji: true });
  });

  it("opis: ≥ 50 znakova, ≤ 5000, bez zabranjenih riječi", () => {
    expect(korakOpis({}, { opis: "" }).greske).toEqual({ opis: "obavezno" });
    expect(korakOpis({}, { opis: "Kratko." }).greske).toEqual({ opis: "prekratko" });
    expect(korakOpis({}, { opis: "x".repeat(5001) }).greske).toEqual({ opis: "predugo" });
    expect(korakOpis({}, { opis: `${OPIS} Donatori dobivaju kamatu od 5 %.` }).greske).toEqual({ opis: "zabranjeno" });
    expect(korakOpis({}, { opis: OPIS }).greske).toEqual({});
  });

  it("zabranjene riječi: korijen na početku riječi (doprinos prolazi)", () => {
    expect(zabranjeneRijeci("Svaki doprinos je dobrodošao, hvala na donaciji.")).toEqual([]);
    expect(zabranjeneRijeci("Investicija s prinosom; ULAGANJE i uložite, dionice, dividenda")).toEqual([
      "investicija", "prinosom", "ulaganje", "uložite", "dionice", "dividenda",
    ]);
    expect(zabranjeneRijeci("Invest in equity")).toEqual(["invest", "equity"]);
  });

  it("iznos iz obrasca", () => {
    expect(parsirajIznos("10.000")).toBe(1_000_000);
    expect(parsirajIznos("10 000 €")).toBe(1_000_000);
    expect(parsirajIznos("2.500,50")).toBe(250_050);
    expect(parsirajIznos("2500.5")).toBe(250_050);
    expect(parsirajIznos("1,234")).toBeNull();
    expect(parsirajIznos("-5")).toBeNull();
    expect(parsirajIznos("")).toBeNull();
  });

  it("prvi nedovršeni korak", () => {
    expect(prviNedovrseni({})).toBe("type");
    const n: Nacrt = { vrsta: "one_time", kategorija: "charity", naslov: "Krov", ciljCenti: 1000, organizacija: null };
    expect(prviNedovrseni(n)).toBe("media");
    expect(prviNedovrseni({ ...n, tema: "charity", mediji: true })).toBe("description");
    expect(prviNedovrseni({ ...n, tema: "charity", mediji: true, opis: OPIS })).toBe("preview");
  });

  it("ocistiNacrt odbacuje nepoznato i neispravno", () => {
    expect(ocistiNacrt({ vrsta: "x", kategorija: "charity", ciljCenti: -5, organizacija: { nacin: "hack" }, tema: "nema", videoUrl: "javascript:x", zlo: 1 })).toEqual({ kategorija: "charity" });
    expect(ocistiNacrt(null)).toEqual({});
  });
});

describe("nacrt u kolačiću (neprijavljeni)", () => {
  it("kodiranje je povratno i s hrvatskim znakovima", () => {
    const n: Nacrt = { vrsta: "one_time", kategorija: "charity", naslov: "Čađa i šećer", opis: "ž".repeat(60) };
    expect(dekodiraj(kodiraj(n))).toEqual(n);
    expect(dekodiraj("!!!")).toBeNull();
  });

  it("veliki opis se dijeli na više kolačića; prevelik nacrt se odbija", () => {
    const k = laziKolacici();
    const url = new URL("http://localhost/hr");
    expect(spremiLokalniNacrt(k, url, { opis: "č".repeat(5000) })).toBe(true);
    expect([...k.mapa.keys()].filter((x) => x.startsWith("nacrt")).length).toBeGreaterThan(1);
    expect(citajLokalniNacrt(k)?.opis).toHaveLength(5000);
    expect(spremiLokalniNacrt(k, url, { opis: "č".repeat(5000), naslov: "ž".repeat(9000) } as Nacrt)).toBe(false);
  });

  it("neprijavljeni prolazi korake POST-om; nacrt je u kolačiću, baza se ne mijenja", async () => {
    const { sqlite, db } = svjeza();
    const prije = broj(sqlite, "SELECT COUNT(*) FROM campaign_drafts");
    const kolacici = laziKolacici();
    const r1 = await vrsta(kontekst(db, "/hr/nova-kampanja/vrsta", { kolacici, obrazac: { vrsta: "one_time", kategorija: "animals" } }));
    expect(lokacija(r1)).toEqual({ status: 303, gdje: "/hr/nova-kampanja/cilj" });
    const r2 = await cilj(kontekst(db, "/hr/nova-kampanja/cilj", { kolacici, obrazac: { naslov: "Hrana za sklonište", cilj: "800", organizacija: "" } }));
    expect(lokacija(r2).gdje).toBe("/hr/nova-kampanja/mediji");
    const r3 = await mediji(kontekst(db, "/hr/nova-kampanja/mediji", { kolacici, obrazac: { tema: "animals" } }));
    expect(lokacija(r3).gdje).toBe("/hr/nova-kampanja/opis");
    const r4 = await opis(kontekst(db, "/hr/nova-kampanja/opis", { kolacici, obrazac: { opis: OPIS } }));
    expect(lokacija(r4).gdje).toBe("/hr/nova-kampanja/pregled");
    expect(citajLokalniNacrt(kolacici)).toMatchObject({ naslov: "Hrana za sklonište", ciljCenti: 80_000, organizacija: null, opis: OPIS });
    expect(broj(sqlite, "SELECT COUNT(*) FROM campaign_drafts")).toBe(prije);

    const p = podaci(await pregled(kontekst(db, "/hr/nova-kampanja/pregled", { kolacici })));
    expect(p.izvor).toBe("preglednik");
    expect(p.nedostaje).toEqual(["organizacija"]);
    // Objava neprijavljenog vodi na prijavu s povratkom na pregled
    const r5 = await pregled(kontekst(db, "/hr/nova-kampanja/pregled", { kolacici, obrazac: { akcija: "objavi" } }));
    expect(lokacija(r5)).toEqual({ status: 303, gdje: "/hr/prijava?next=%2Fhr%2Fnova-kampanja%2Fpregled" });
  });

  it("greška koraka je 200 s greškom i poslanim vrijednostima, kolačić se ne mijenja", async () => {
    const { db } = svjeza();
    const kolacici = laziKolacici();
    const p = podaci(await cilj(kontekst(db, "/hr/nova-kampanja/cilj", { kolacici, obrazac: { naslov: "A", cilj: "x" } })));
    expect(p.greske).toMatchObject({ naslov: "prekratko", cilj: "neispravno" });
    expect(p.polja?.naslov).toBe("A");
    expect(kolacici.mapa.size).toBe(0);
  });

  it("svi koraci su 200 bez prijave i bez nacrta; /nova-kampanja je 302 na prvi nedovršeni", async () => {
    const { db } = svjeza();
    for (const [u, put] of [[vrsta, "vrsta"], [cilj, "cilj"], [mediji, "mediji"], [opis, "opis"], [pregled, "pregled"]] as const) {
      const p = podaci(await u(kontekst(db, `/hr/nova-kampanja/${put}`)));
      expect(p.izvor).toBe("nema");
      expect(p.prijavljen).toBe(false);
    }
    expect(lokacija(await ulaz(kontekst(db, "/hr/nova-kampanja")))).toEqual({ status: 302, gdje: "/hr/nova-kampanja/vrsta" });
    const kolacici = laziKolacici();
    spremiLokalniNacrt(kolacici, new URL("http://localhost"), { vrsta: "one_time", kategorija: "charity" });
    expect(lokacija(await ulaz(kontekst(db, "/en/new-campaign", { kolacici }))).gdje).toBe("/en/new-campaign/goal");
    expect(lokacija(await ulaz(kontekst(db, "/hr/nova-kampanja?za=demo-svjetionik"))).gdje).toBe("/hr/nova-kampanja/vrsta?za=demo-svjetionik");
  });

  it("?za={slug} prepoznaje samo organizaciju koja prima kampanje drugih", async () => {
    const { db } = svjeza();
    expect(podaci(await vrsta(kontekst(db, `/hr/nova-kampanja/vrsta?za=${primjeri.organizacijaOrganizatora}`))).za?.slug).toBe(primjeri.organizacijaOrganizatora);
    expect(podaci(await vrsta(kontekst(db, `/hr/nova-kampanja/vrsta?za=${primjeri.organizacijaNeverificirana}`))).za).toBeNull();
  });

  it("počni ispočetka briše nacrt iz kolačića", async () => {
    const { db } = svjeza();
    const kolacici = laziKolacici();
    spremiLokalniNacrt(kolacici, new URL("http://localhost"), { vrsta: "one_time" });
    const r = await vrsta(kontekst(db, "/hr/nova-kampanja/vrsta", { kolacici, obrazac: { akcija: "ispocetka" } }));
    expect(lokacija(r).gdje).toBe("/hr/nova-kampanja/vrsta");
    expect(citajLokalniNacrt(kolacici)).toBeNull();
  });
});

describe("nacrt na računu (prijavljeni)", () => {
  it("lokalni nacrt pri prvom ulasku prelazi na račun kao source local; kolačić se briše", async () => {
    const { sqlite, db } = svjeza();
    const korisnik = (await korisnikSesije(db, primjeri.demoSesijaNovi, SAD))!;
    const kolacici = laziKolacici();
    spremiLokalniNacrt(kolacici, new URL("http://localhost"), { vrsta: "one_time", kategorija: "travel", naslov: "Put na natjecanje" });
    const p = podaci(await cilj(kontekst(db, "/hr/nova-kampanja/cilj", { kolacici, korisnik })));
    expect(p.izvor).toBe("racun_lokalni");
    expect(p.nacrt.naslov).toBe("Put na natjecanje");
    expect(citajLokalniNacrt(kolacici)).toBeNull();
    expect(broj(sqlite, "SELECT COUNT(*) FROM campaign_drafts WHERE user_id = ? AND source = 'local'", korisnik.id)).toBe(1);
  });

  it("prijavljeni sprema svaki korak u campaign_drafts (source server, step = prvi nedovršeni)", async () => {
    const { db } = svjeza();
    const korisnik = (await korisnikSesije(db, primjeri.demoSesijaNovi, SAD))!;
    await vrsta(kontekst(db, "/hr/nova-kampanja/vrsta", { korisnik, obrazac: { vrsta: "one_time", kategorija: "sport" } }));
    let red = await trenutniNacrt(db, korisnik.id);
    expect(red).toMatchObject({ source: "server", step: 2, nacrt: { vrsta: "one_time", kategorija: "sport" } });
    const p = podaci(await cilj(kontekst(db, "/hr/nova-kampanja/cilj", { korisnik, obrazac: { naslov: "Dresovi", cilj: "300", organizacija: "" } })));
    expect(p.greske).toEqual({ organizacija: "obavezno" });
    await cilj(kontekst(db, "/hr/nova-kampanja/cilj", { korisnik, obrazac: { naslov: "Dresovi", cilj: "300", organizacija: "osobno" } }));
    red = await trenutniNacrt(db, korisnik.id);
    expect(red?.step).toBe(3);
    expect((await nacrtiKorisnika(db, korisnik.id)).length).toBe(1);
    await vrsta(kontekst(db, "/hr/nova-kampanja/vrsta", { korisnik, obrazac: { akcija: "ispocetka" } }));
    expect(await trenutniNacrt(db, korisnik.id)).toBeNull();
  });

  it("organizator vidi svoje organizacije s ulogom ≥ admin", async () => {
    const { db } = svjeza();
    const korisnik = (await korisnikSesije(db, primjeri.demoSesija, SAD))!;
    const p = podaci(await cilj(kontekst(db, "/hr/nova-kampanja/cilj", { korisnik })));
    expect(p.moje.map((m) => m.slug)).toContain(primjeri.organizacijaOrganizatora);
    expect(p.primatelji.length).toBeGreaterThan(0);
  });
});

describe("tekstovi čarobnjaka", () => {
  const kljucevi = (o: unknown, put = ""): string[] =>
    o && typeof o === "object"
      ? Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => (Array.isArray(v) ? [`${put}${k}[${v.length}]`] : kljucevi(v, `${put}${k}.`)))
      : [put];
  it("hr i en imaju isti oblik; copy bez „ulaže” / „invest”", () => {
    expect(kljucevi(CAROBNJAK.en)).toEqual(kljucevi(CAROBNJAK.hr));
    expect(JSON.stringify(CAROBNJAK)).not.toMatch(/ulag|ulož|ulaž|invest/i);
  });
});
