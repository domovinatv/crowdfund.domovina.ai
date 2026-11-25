/**
 * Obrasci organizatora S10 (paritet A01, A06, A24, B01): objava s koraka opisa, naslovnica kasice,
 * kategorija / naslovnica / video / mjesečni doprinosi u uređivanju kampanje, tekstovi trake i registracije.
 */
import { describe, expect, it } from "vitest";
import primjeri from "../seed/primjeri.json";
import { kasicaPoAliasu } from "../src/lib/db/kasice";
import { kampanjaZaUpravljanje, spremiPostavke, ulazIzKampanje } from "../src/lib/db/upravljanje";
import { url } from "../src/lib/rute";
import { korisnikPoEmailu, type Korisnik } from "../src/lib/sesija";
import { CAROBNJAK } from "../src/views/sadrzaj/carobnjak";
import { OPIS_UREDIVAC } from "../src/views/sadrzaj/opis";
import { PRIJAVA } from "../src/views/sadrzaj/prijava";
import { ucitaj as ucitajOpis } from "../src/views/stranice/new-campaign.description.ucitaj";
import { ucitaj as ucitajUredi, type PodaciUredi } from "../src/views/stranice/campaign.edit.ucitaj";
import { ucitaj as ucitajNovuKasicu, type PodaciNoveKasice } from "../src/views/stranice/campaign.moneybox.new.ucitaj";
import type { PodaciKoraka } from "../src/components/carobnjak/ucitavanje";
import { broj, kaoD1, novaBaza, redovi } from "./pomoc/baza";
import { kontekst } from "./pomoc/kontekst";
import { lokacija, okolina, podaci, status } from "./pomoc/upravljanje";

const SAD = Date.UTC(2026, 10, 25, 10);
const OPIS = "## Zašto\nPrikupljamo za **novi krov** dvorane u kojoj vježba pedesetak djece iz susjedstva.\n- crijep\n- radovi";

async function korisnik(db: D1Database, email: string): Promise<Korisnik> {
  const k = (await korisnikPoEmailu(db, email))!;
  return { id: k.id, email: k.email, ime: k.ime, platformRole: k.platformRole };
}

describe("A06: objava izravno s koraka opisa", () => {
  const svjeza = async () => {
    const sqlite = novaBaza({ seed: true });
    const db = kaoD1(sqlite);
    const k = await korisnik(db, primjeri.demoRacuni.organizator);
    const orgId = redovi<{ id: string }>(sqlite, "SELECT id FROM organizations WHERE slug = ?", primjeri.organizacijaOrganizatora)[0]!.id;
    return { sqlite, db, k, orgId };
  };
  const nacrt = (orgId: string, dodatno: Record<string, unknown> = {}) => JSON.stringify({
    vrsta: "one_time", kategorija: "charity", naslov: "Novi krov dvorane", ciljCenti: 10_000, rok: "2027-03-31",
    organizacija: { nacin: "moja", orgId }, tema: "repairs", mediji: true, ...dodatno,
  });

  it("valjani prethodni koraci: GET nudi objavu, POST akcija=objavi sprema opis i objavljuje (isti 303 kao pregled)", async () => {
    const { sqlite, db, k, orgId } = await svjeza();
    sqlite.prepare("INSERT INTO campaign_drafts (id, user_id, source, step, data, created_at, updated_at) VALUES ('d1', ?, 'server', 4, ?, ?, ?)")
      .run(k.id, nacrt(orgId), SAD, SAD);
    const get = podaci<PodaciKoraka>(await ucitajOpis(kontekst(db, "/hr/nova-kampanja/opis", { korisnik: k })));
    expect(get.nedostaje).toEqual(["opis"]);
    const r = await ucitajOpis(kontekst(db, "/hr/nova-kampanja/opis", { korisnik: k, obrazac: { opis: OPIS, akcija: "objavi" } }));
    expect(status(r)).toBe(303);
    expect(lokacija(r)).toMatch(/^\/hr\/[0-9a-z]{6}\?objavljeno=1$/);
    expect(broj(sqlite, "SELECT count(*) FROM campaigns WHERE title = 'Novi krov dvorane' AND description = ?", OPIS)).toBe(1);
    expect(broj(sqlite, "SELECT count(*) FROM campaign_drafts WHERE id = 'd1' AND campaign_id IS NOT NULL")).toBe(1);
  });

  it("bez akcije ide na pregled; prekratak opis ne objavljuje", async () => {
    const { sqlite, db, k, orgId } = await svjeza();
    sqlite.prepare("INSERT INTO campaign_drafts (id, user_id, source, step, data, created_at, updated_at) VALUES ('d2', ?, 'server', 4, ?, ?, ?)")
      .run(k.id, nacrt(orgId), SAD, SAD);
    const prije = broj(sqlite, "SELECT count(*) FROM campaigns");
    const kratko = await ucitajOpis(kontekst(db, "/hr/nova-kampanja/opis", { korisnik: k, obrazac: { opis: "kratko", akcija: "objavi" } }));
    expect(podaci<PodaciKoraka>(kratko).greske.opis).toBe("prekratko");
    const dalje = await ucitajOpis(kontekst(db, "/hr/nova-kampanja/opis", { korisnik: k, obrazac: { opis: OPIS } }));
    expect(lokacija(dalje)).toBe(url("hr", "new-campaign.preview"));
    expect(broj(sqlite, "SELECT count(*) FROM campaigns")).toBe(prije);
  });

  it("nedovršen raniji korak: objava pada s greškom na istom koraku; neprijavljeni ide na pregled", async () => {
    const { sqlite, db, k, orgId } = await svjeza();
    sqlite.prepare("INSERT INTO campaign_drafts (id, user_id, source, step, data, created_at, updated_at) VALUES ('d3', ?, 'server', 4, ?, ?, ?)")
      .run(k.id, nacrt(orgId, { naslov: undefined }), SAD, SAD);
    const r = await ucitajOpis(kontekst(db, "/hr/nova-kampanja/opis", { korisnik: k, obrazac: { opis: OPIS, akcija: "objavi" } }));
    const p = podaci<PodaciKoraka>(r);
    expect(p.korak).toBe("description");
    expect(p.greskaObjave).toBe("nedostaje");
    expect(p.nacrt.opis).toBe(OPIS);
    const anon = await ucitajOpis(kontekst(db, "/hr/nova-kampanja/opis", { obrazac: { opis: OPIS, akcija: "objavi" } }));
    expect(lokacija(anon)).toBe(url("hr", "new-campaign.preview"));
  });
});

describe("A24: naslovnica kasice", () => {
  const ctx = (o: Awaited<ReturnType<typeof okolina>>, obrazac?: Record<string, string>) =>
    ucitajNovuKasicu(kontekst(o.db, url("hr", "campaign.moneybox.new", { id: o.aktivna.public_id }), {
      params: { id: o.aktivna.public_id }, korisnik: o.korisnici.novi, obrazac,
    }));
  it("zadano je naslovnica kampanje; nepoznata tema je greška", async () => {
    const o = await okolina();
    expect(podaci<PodaciNoveKasice>(await ctx(o)).vrijednosti.coverTheme).toBe("");
    const g = podaci<PodaciNoveKasice>(await ctx(o, { title: "K", alias: "s10-kasica", rules: "1", coverTheme: "<script>" }));
    expect(g.greske.coverTheme).toBe("nevaljano");
  });
  it("odabrana tema se sprema i prikazuje; bez teme kasica preuzima temu kampanje", async () => {
    const o = await okolina();
    expect(status(await ctx(o, { title: "Rođendanska", alias: "s10-rodendan", rules: "1", coverTheme: "birthday" }))).toBe(303);
    expect(broj(o.sqlite, "SELECT count(*) FROM moneyboxes WHERE alias = 's10-rodendan' AND cover_theme = 'birthday'")).toBe(1);
    expect((await kasicaPoAliasu(o.db, "s10-rodendan"))!.coverTheme).toBe("birthday");
    expect(status(await ctx(o, { title: "Obična", alias: "s10-obicna", rules: "1" }))).toBe(303);
    const temaKampanje = redovi<{ t: string }>(o.sqlite, "SELECT cover_theme AS t FROM campaign_settings WHERE campaign_id = ?", o.aktivna.id)[0]!.t;
    expect((await kasicaPoAliasu(o.db, "s10-obicna"))!.coverTheme).toBe(temaKampanje);
  });
  it("migracija ograničava temu na 15 vrijednosti", async () => {
    const o = await okolina();
    expect(() => o.sqlite.prepare("UPDATE moneyboxes SET cover_theme = 'nepostoji' WHERE alias = ?").run(primjeri.kasica)).toThrow(/CHECK/);
  });
});

describe("B01: kategorija, naslovnica, video i mjesečni doprinosi u uređivanju", () => {
  it("valjane vrijednosti se spremaju u postavke, video u campaign_media, mjesečno u recurrence", async () => {
    const o = await okolina();
    const k = (await kampanjaZaUpravljanje(o.db, o.aktivna.id))!;
    const ulaz = ulazIzKampanje(k, "hr");
    expect(ulaz.allowMonthly).toBe(false);
    const r = await spremiPostavke(o.db, k, { ...ulaz, category: "sport", coverTheme: "sports", videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", allowMonthly: true }, o.sad);
    expect(r).toEqual({ ok: true });
    const n = (await kampanjaZaUpravljanje(o.db, o.aktivna.id))!;
    expect([n.categoryKey, n.coverTheme, n.videoUrl, n.recurrence]).toEqual(["sport", "sports", "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "monthly"]);
    // Prazan video briše zapis; isključeno mjesečno vraća `none`.
    expect(await spremiPostavke(o.db, n, { ...ulazIzKampanje(n, "hr"), videoUrl: "", allowMonthly: false }, o.sad)).toEqual({ ok: true });
    expect(broj(o.sqlite, "SELECT count(*) FROM campaign_media WHERE campaign_id = ?", o.aktivna.id)).toBe(0);
    expect((await kampanjaZaUpravljanje(o.db, o.aktivna.id))!.recurrence).toBe("none");
  });

  it("neispravne vrijednosti: greška uz polje, ništa se ne sprema", async () => {
    const o = await okolina();
    const k = (await kampanjaZaUpravljanje(o.db, o.aktivna.id))!;
    const r = await spremiPostavke(o.db, k, { ...ulazIzKampanje(k, "hr"), category: "", coverTheme: "plavo", videoUrl: "javascript:alert(1)" }, o.sad);
    expect(r).toEqual({ ok: false, greske: { category: "obavezno", coverTheme: "nevaljano", videoUrl: "nevaljano" } });
    const r2 = await spremiPostavke(o.db, k, { ...ulazIzKampanje(k, "hr"), category: "nepostoji", coverTheme: "" }, o.sad);
    expect(r2).toEqual({ ok: false, greske: { category: "nevaljano", coverTheme: "obavezno" } });
  });

  it("kampanja za organizaciju smije bez kategorije; mjesečna vrsta zadržava recurrence", async () => {
    const o = await okolina();
    const idPo = (pid: string) => redovi<{ id: string }>(o.sqlite, "SELECT campaign_id AS id FROM campaign_settings WHERE public_id = ?", pid)[0]!.id;
    const zaOrg = (await kampanjaZaUpravljanje(o.db, idPo(primjeri.kampanja.zaOrganizaciju)))!;
    expect(await spremiPostavke(o.db, zaOrg, { ...ulazIzKampanje(zaOrg, "hr"), category: "" }, o.sad)).toEqual({ ok: true });
    const mjesecna = (await kampanjaZaUpravljanje(o.db, idPo(primjeri.kampanja.mjesecna)))!;
    expect(mjesecna.kind).toBe("recurring");
    expect(ulazIzKampanje(mjesecna, "hr").allowMonthly).toBe(true);
    expect(await spremiPostavke(o.db, mjesecna, { ...ulazIzKampanje(mjesecna, "hr"), allowMonthly: false }, o.sad)).toEqual({ ok: true });
    expect((await kampanjaZaUpravljanje(o.db, mjesecna.id))!.recurrence).toBe(mjesecna.recurrence);
  });

  it("učitavač: kategorije iz kataloga; obrazac bez polja S10 ih ne mijenja; zaključana kampanja i dalje mijenja naslovnicu", async () => {
    const o = await okolina();
    const put = url("hr", "campaign.edit", { id: o.aktivna.public_id });
    const get = podaci<PodaciUredi>(await ucitajUredi(kontekst(o.db, put, { params: { id: o.aktivna.public_id }, korisnik: o.korisnici.editor })));
    expect(get.kategorije.map((c) => c.key)).toContain("charity");
    expect(get.kategorije).toHaveLength(8);
    const prije = (await kampanjaZaUpravljanje(o.db, o.aktivna.id))!;
    const { category: _c, coverTheme: _t, videoUrl: _v, allowMonthly: _m, ...staro } = get.vrijednosti;
    const obrazac = Object.fromEntries(Object.entries(staro).flatMap(([p, v]) => (typeof v === "boolean" ? (v ? [[p, "1"]] : []) : [[p, String(v)]])));
    expect(status(await ucitajUredi(kontekst(o.db, put, { params: { id: o.aktivna.public_id }, korisnik: o.korisnici.editor, obrazac })))).toBe(303);
    const poslije = (await kampanjaZaUpravljanje(o.db, o.aktivna.id))!;
    expect([poslije.categoryKey, poslije.coverTheme]).toEqual([prije.categoryKey, prije.coverTheme]);

    o.sqlite.prepare("UPDATE campaign_settings SET purpose_verified = 1 WHERE campaign_id = ?").run(o.aktivna.id);
    const zakljucana = (await kampanjaZaUpravljanje(o.db, o.aktivna.id))!;
    expect(zakljucana.zakljucano).toBe(true);
    expect(await spremiPostavke(o.db, zakljucana, { ...ulazIzKampanje(zakljucana, "hr"), coverTheme: "gift" }, o.sad)).toEqual({ ok: true });
  });
});

describe("tekstovi S10", () => {
  const kljucevi = (x: unknown, p = ""): string[] =>
    x && typeof x === "object" && !Array.isArray(x) ? Object.entries(x).flatMap(([k, v]) => kljucevi(v, `${p}.${k}`)) : [p];
  it("traka opisa, registracija i savjeti čarobnjaka imaju isti oblik na oba jezika", () => {
    expect(kljucevi(OPIS_UREDIVAC.en).sort()).toEqual(kljucevi(OPIS_UREDIVAC.hr).sort());
    expect(kljucevi(PRIJAVA.en.registracija).sort()).toEqual(kljucevi(PRIJAVA.hr.registracija).sort());
    for (const korak of ["cilj", "mediji", "opis"] as const) {
      expect(CAROBNJAK.hr[korak].savjeti.length).toBeGreaterThan(2);
      expect(CAROBNJAK.en[korak].savjeti.length).toBe(CAROBNJAK.hr[korak].savjeti.length);
    }
  });
  it("copy ne kaže „ulaže”", () => {
    const sve = JSON.stringify([OPIS_UREDIVAC, PRIJAVA.hr.registracija, CAROBNJAK.hr.cilj, CAROBNJAK.hr.mediji, CAROBNJAK.hr.opis]);
    expect(sve).not.toMatch(/ulaž|ulag/i);
  });
});
