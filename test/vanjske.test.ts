/**
 * Vanjska 4fund kampanja (S8, agent A, tok 9, odluke 800–802): oblik URL-a i `external_id`, adresa plaćanja
 * `/{id}/pay`, duljina kratkog opisa, uređivanje, javna stranica i odjeljak u katalogu. Bez mreže.
 */
import { describe, expect, it } from "vitest";
import primjeri from "../seed/primjeri.json";
import { dodajVanjsku, potvrdiVanjsku, urediVanjsku, vanjskeOrganizacije } from "../src/lib/db/organizacija";
import { vanjskaKampanja, vanjskeUKatalogu } from "../src/lib/db/profili";
import { korisnikSesije } from "../src/lib/sesija";
import {
  OPIS_VANJSKE_NAJVISE,
  idVanjske,
  idVanjskeIspravan,
  placanjeVanjske,
  provjeriNovuVanjsku,
  provjeriPodatkeVanjske,
  urlVanjske,
} from "../src/lib/vanjske";
import { ucitaj as ucitajVanjske } from "../src/views/stranice/org.external.ucitaj";
import { ucitaj as ucitajKatalog, type PodaciKataloga } from "../src/views/stranice/campaigns.ucitaj";
import { kaoD1, novaBaza, redovi } from "./pomoc/baza";
import { kontekst } from "./pomoc/kontekst";

const sqlite = novaBaza({ seed: true });
const db = kaoD1(sqlite);
const KATEGORIJE = ["charity", "animals", "other"];
const SVJETIONIK = primjeri.organizacijaOrganizatora;
const orgId = redovi<{ id: string }>(sqlite, "SELECT id FROM organizations WHERE slug = ?", SVJETIONIK)[0]!.id;
const organizator = (await korisnikSesije(db, primjeri.demoSesija, Date.now()))!;
const S = <T,>(r: unknown) => r as { podaci: T };

describe("oblik URL-a i external_id", () => {
  it("prihvaća samo https://(www.)4fund.com/{6 znakova}, ID u malim slovima", () => {
    expect(idVanjske("https://4fund.com/AbC123")).toBe("abc123");
    expect(idVanjske("  https://www.4fund.com/abc123/ ")).toBe("abc123");
    for (const los of [
      "http://4fund.com/abc123",
      "https://4fund.com/abc12",
      "https://4fund.com/abc1234",
      "https://4fund.com/abc123/pay",
      "https://4fund.com/abc123?x=1",
      "https://4fund.com.evil.invalid/abc123",
      "https://evil.invalid/4fund.com/abc123",
      "https://4fund.com/abc-12",
      "",
    ]) {
      expect(idVanjske(los), los).toBeNull();
    }
    expect(urlVanjske("abc123")).toBe("https://4fund.com/abc123");
  });

  it("external_id: točno 6 znakova [a-z0-9]", () => {
    expect(idVanjskeIspravan("zq81xk")).toBe(true);
    expect(idVanjskeIspravan("ZQ81XK")).toBe(false);
    expect(idVanjskeIspravan("demo-61f475c1")).toBe(false);
    expect(idVanjskeIspravan("ab/12c")).toBe(false);
  });

  it("gumb vodi na https://4fund.com/{id}/pay iz provjerenog ID-a (odluka 801); neispravan ID → nema gumba", () => {
    expect(placanjeVanjske("zq81xk")).toBe("https://4fund.com/zq81xk/pay");
    expect(placanjeVanjske(" ZQ81XK ")).toBe("https://4fund.com/zq81xk/pay");
    expect(placanjeVanjske("demo-61f475c1")).toBeNull();
    expect(placanjeVanjske("../x/y")).toBeNull();
  });
});

describe("kratki opis i ostala polja", () => {
  const ulaz = { url: "https://4fund.com/abc123", naslov: "Zimovanje", opis: "", kategorija: "" };

  it("opis je neobavezan i ima najviše 300 znakova (broje se znakovi, ne bajtovi)", () => {
    expect(OPIS_VANJSKE_NAJVISE).toBe(300);
    expect(provjeriNovuVanjsku(ulaz, KATEGORIJE)).toEqual({});
    expect(provjeriNovuVanjsku({ ...ulaz, opis: "č".repeat(300) }, KATEGORIJE)).toEqual({});
    expect(provjeriNovuVanjsku({ ...ulaz, opis: "🙂".repeat(300) }, KATEGORIJE)).toEqual({});
    expect(provjeriNovuVanjsku({ ...ulaz, opis: "a".repeat(301) }, KATEGORIJE)).toEqual({ opis: "predugo" });
    expect(provjeriNovuVanjsku({ ...ulaz, opis: `  ${"a".repeat(300)}  ` }, KATEGORIJE)).toEqual({});
  });

  it("naslov obavezan do 120 znakova, kategorija iz popisa, URL obavezan i ispravan", () => {
    expect(provjeriNovuVanjsku({ url: "", naslov: " ", opis: "", kategorija: "nema" }, KATEGORIJE)).toEqual({
      url: "obavezno",
      naslov: "obavezno",
      kategorija: "neispravno",
    });
    expect(provjeriNovuVanjsku({ ...ulaz, url: "https://4fund.com/x" }, KATEGORIJE)).toEqual({ url: "neispravno" });
    expect(provjeriPodatkeVanjske({ naslov: "n".repeat(121), opis: "", kategorija: "animals" }, KATEGORIJE)).toEqual({ naslov: "predugo" });
  });
});

describe("baza: dodavanje, uređivanje, javna stranica, katalog", () => {
  it("dodavanje sprema opis (prazan → NULL), uređivanje mijenja naslov/opis/kategoriju, ne URL ni kod", async () => {
    const r = await dodajVanjsku(db, orgId, { url: "https://4fund.com/op1s01", naslov: " Ljetni kamp ", opis: "", kategorija: "" }, KATEGORIJE);
    if (!r.ok) throw new Error(JSON.stringify(r.greske));
    let v = (await vanjskeOrganizacije(db, orgId)).find((x) => x.id === r.id)!;
    expect(v).toMatchObject({ naslov: "Ljetni kamp", opis: null, kategorija: null, url: "https://4fund.com/op1s01", kod: r.kod });

    expect(await urediVanjsku(db, orgId, r.id, { naslov: "Ljetni kamp 2027", opis: "Kamp za djecu iz udomiteljskih obitelji.", kategorija: "charity" }, KATEGORIJE)).toEqual({ ok: true });
    v = (await vanjskeOrganizacije(db, orgId)).find((x) => x.id === r.id)!;
    expect(v).toMatchObject({ naslov: "Ljetni kamp 2027", opis: "Kamp za djecu iz udomiteljskih obitelji.", kategorija: "charity", kod: r.kod });

    expect(await urediVanjsku(db, orgId, r.id, { naslov: "x", opis: "a".repeat(301), kategorija: "" }, KATEGORIJE)).toEqual({ ok: false, greske: { opis: "predugo" } });
    // Tuđa organizacija ne može urediti.
    const druga = redovi<{ id: string }>(sqlite, "SELECT id FROM organizations WHERE id <> ? LIMIT 1", orgId)[0]!.id;
    expect((await urediVanjsku(db, druga, r.id, { naslov: "Otmica", opis: "", kategorija: "" }, KATEGORIJE)).ok).toBe(false);
  });

  it("javna stranica: tek nakon provjere; nosi opis i external_id za gumb /pay", async () => {
    const r = await dodajVanjsku(db, orgId, { url: "https://4fund.com/JAV123", naslov: "Javna", opis: "Opis za javnost.", kategorija: "animals" }, KATEGORIJE);
    if (!r.ok) throw new Error();
    expect(await vanjskaKampanja(db, r.id)).toBeNull();
    expect(await potvrdiVanjsku(db, orgId, r.id)).toBe(true);
    const v = (await vanjskaKampanja(db, r.id))!;
    expect(v).toMatchObject({ externalId: "jav123", description: "Opis za javnost.", url: "https://4fund.com/jav123" });
    expect(placanjeVanjske(v.externalId)).toBe("https://4fund.com/jav123/pay");
  });

  it("katalog: zaseban odjeljak na prvoj stranici, filtri q i category; drugi filtri i druga stranica ga skrivaju", async () => {
    const r = await dodajVanjsku(db, orgId, { url: "https://4fund.com/kat001", naslov: "Krovište sklonište", opis: "Novi krov za mačke.", kategorija: "animals" }, KATEGORIJE);
    if (!r.ok) throw new Error();
    await potvrdiVanjsku(db, orgId, r.id);
    expect((await vanjskeUKatalogu(db, { q: "mačke" })).map((x) => x.id)).toContain(r.id);
    expect((await vanjskeUKatalogu(db, { q: "nepostojeći%_" })).length).toBe(0);
    expect((await vanjskeUKatalogu(db, { category: "charity" })).map((x) => x.id)).not.toContain(r.id);

    const katalog = async (upit: string) => S<PodaciKataloga>(await ucitajKatalog(kontekst(db, `/hr/kampanje${upit}`))).podaci.vanjske;
    expect((await katalog("?q=krovi%C5%A1te")).map((x) => x.id)).toEqual([r.id]);
    expect((await katalog("?q=krovi%C5%A1te"))[0]!.organizacija).toBeTruthy();
    expect(await katalog("?q=krovi%C5%A1te&verified=1")).toEqual([]);
    expect(await katalog("?q=krovi%C5%A1te&page=2")).toEqual([]);
  });

  it("učitavač org.external: dodaj s opisom (303), uredi s greškom (200 s vrijednostima), uredi (303)", async () => {
    const put = `/hr/o/${SVJETIONIK}/vanjske`;
    const params = { slug: SVJETIONIK };
    const r = await ucitajVanjske(kontekst(db, put, { params, korisnik: organizator, obrazac: { radnja: "dodaj", url: "https://4fund.com/ucit01", naslov: "Iz učitavača", opis: "Kratko.", kategorija: "" } }));
    expect((r as Response).headers.get("Location")).toBe(`${put}?dodana=1`);
    const v = (await vanjskeOrganizacije(db, orgId)).find((x) => x.externalId === "ucit01")!;
    expect(v.opis).toBe("Kratko.");
    const lose = S<{ uredivanje: { id: string; opis: string; greske: object } }>(
      await ucitajVanjske(kontekst(db, put, { params, korisnik: organizator, obrazac: { radnja: "uredi", id: v.id, naslov: "N", opis: "x".repeat(301), kategorija: "" } })),
    );
    expect(lose.podaci.uredivanje).toMatchObject({ id: v.id, greske: { opis: "predugo" } });
    expect(lose.podaci.uredivanje.opis).toHaveLength(301);
    const ok = await ucitajVanjske(kontekst(db, put, { params, korisnik: organizator, obrazac: { radnja: "uredi", id: v.id, naslov: "Novi naslov", opis: "", kategorija: "" } }));
    expect((ok as Response).status).toBe(303);
    expect((await vanjskeOrganizacije(db, orgId)).find((x) => x.id === v.id)).toMatchObject({ naslov: "Novi naslov", opis: null });
  });
});
