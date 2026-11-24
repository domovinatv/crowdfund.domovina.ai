/**
 * Upravljanje kampanjom (S6): pristup po ulogama za svaku podstranicu, isključi/uključi, zaključavanje
 * naslova/opisa/cilja nakon odobrene verifikacije namjene, zatvaranje i brisanje s dodatnom potvrdom (P+e),
 * kasice, linkovi, obavijesti, verifikacija namjene, „Kamo ide novac” i nova kasica. Nad seedanim SQLiteom.
 */
import { describe, expect, it } from "vitest";
import primjeri from "../seed/primjeri.json";
import { STRANICE_UPRAVLJANJA, praviloIzPristupa, type StranicaUpravljanja } from "../src/components/upravljanje/ucitavanje";
import {
  dodajDokument, kampanjaZaUpravljanje, obavijestiUpravljanja, posaljiNaPregled, spremiPostavke, ulazIzKampanje,
} from "../src/lib/db/upravljanje";
import { url } from "../src/lib/rute";
import * as tekstovi from "../src/views/sadrzaj/upravljanje";
import { ucitaj as ucitajUredi } from "../src/views/stranice/campaign.edit.ucitaj";
import { ucitaj as ucitajPlocu } from "../src/views/stranice/campaign.manage.ucitaj";
import { ucitaj as ucitajFinancije } from "../src/views/stranice/campaign.manage.finances.ucitaj";
import { ucitaj as ucitajCsv } from "../src/views/stranice/campaign.manage.finances.csv.ucitaj";
import { ucitaj as ucitajPovrate } from "../src/views/stranice/campaign.manage.refunds.ucitaj";
import { ucitaj as ucitajNovosti } from "../src/views/stranice/campaign.manage.updates.ucitaj";
import { ucitaj as ucitajKomentare } from "../src/views/stranice/campaign.manage.comments.ucitaj";
import { ucitaj as ucitajKasice, type PodaciKasica } from "../src/views/stranice/campaign.manage.moneyboxes.ucitaj";
import { ucitaj as ucitajLinkove, type PodaciLinkova } from "../src/views/stranice/campaign.manage.links.ucitaj";
import { ucitaj as ucitajObavijesti, type PodaciObavijesti } from "../src/views/stranice/campaign.manage.notifications.ucitaj";
import { ucitaj as ucitajVerifikaciju, type PodaciVerifikacije } from "../src/views/stranice/campaign.manage.verification.ucitaj";
import { ucitaj as ucitajNovac, type PodaciNovca } from "../src/views/stranice/campaign.manage.money.ucitaj";
import { ucitaj as ucitajZatvaranje, type PodaciZatvaranja } from "../src/views/stranice/campaign.manage.close.ucitaj";
import { ucitaj as ucitajNovuKasicu, type PodaciNoveKasice } from "../src/views/stranice/campaign.moneybox.new.ucitaj";
import type { Ucitaj } from "../src/views/tipovi";
import { broj } from "./pomoc/baza";
import { kontekst } from "./pomoc/kontekst";
import { lokacija, okolina, podaci, status, type Uloga } from "./pomoc/upravljanje";

const UCITAVACI: Record<StranicaUpravljanja, Ucitaj<unknown>> = {
  "campaign.manage": ucitajPlocu,
  "campaign.edit": ucitajUredi,
  "campaign.manage.finances": ucitajFinancije,
  "campaign.manage.finances.csv": ucitajCsv,
  "campaign.manage.refunds": ucitajPovrate,
  "campaign.manage.updates": ucitajNovosti,
  "campaign.manage.comments": ucitajKomentare,
  "campaign.manage.moneyboxes": ucitajKasice,
  "campaign.manage.links": ucitajLinkove,
  "campaign.manage.notifications": ucitajObavijesti,
  "campaign.manage.verification": ucitajVerifikaciju,
  "campaign.manage.money": ucitajNovac,
  "campaign.manage.close": ucitajZatvaranje,
};

/** Očekivani pristup (docs/07 stupac `pristup`), zapisan ručno da test ne ponavlja logiku `smije()`. */
const SMIJE: Record<StranicaUpravljanja, Uloga[]> = {
  "campaign.manage": ["owner", "admin", "editor", "viewer", "moderator"],
  "campaign.edit": ["owner", "admin", "editor", "moderator"],
  "campaign.manage.finances": ["owner", "admin", "editor", "viewer"],
  "campaign.manage.finances.csv": ["owner", "admin", "editor", "viewer"],
  "campaign.manage.refunds": ["owner", "admin"],
  "campaign.manage.updates": ["owner", "admin", "editor", "moderator"],
  "campaign.manage.comments": ["owner", "admin", "editor", "moderator"],
  "campaign.manage.moneyboxes": ["owner", "admin", "editor", "viewer", "moderator"],
  "campaign.manage.links": ["owner", "admin", "editor", "viewer", "moderator"],
  "campaign.manage.notifications": ["owner", "admin", "editor", "viewer", "moderator"],
  "campaign.manage.verification": ["owner", "admin", "editor", "moderator"],
  "campaign.manage.money": ["owner", "admin", "editor", "viewer", "moderator"],
  "campaign.manage.close": ["owner"],
};
const ULOGE: Uloga[] = ["owner", "admin", "editor", "viewer", "moderator", "novi"];

type O = Awaited<ReturnType<typeof okolina>>;
const put = (o: O, kljuc: StranicaUpravljanja, id = o.aktivna.public_id) => url("hr", kljuc, { id });
const get = (o: O, kljuc: StranicaUpravljanja, uloga: Uloga | null, upit = "") =>
  UCITAVACI[kljuc](kontekst(o.db, put(o, kljuc) + upit, { params: { id: o.aktivna.public_id }, korisnik: uloga ? o.korisnici[uloga] : null }));
const post = (o: O, kljuc: StranicaUpravljanja, uloga: Uloga, obrazac: Record<string, string>) =>
  UCITAVACI[kljuc](kontekst(o.db, put(o, kljuc), { params: { id: o.aktivna.public_id }, korisnik: o.korisnici[uloga], obrazac }));

describe("tekstovi upravljanja", () => {
  it("hr i en imaju isti oblik", () => {
    const kljucevi = (x: unknown, p = ""): string[] =>
      x && typeof x === "object" ? Object.entries(x).flatMap(([k, v]) => kljucevi(v, `${p}.${k}`)) : [p];
    expect(kljucevi(tekstovi.UPRAVLJANJE.en).sort()).toEqual(kljucevi(tekstovi.UPRAVLJANJE.hr).sort());
  });
  it("izbornik ima naslov za svaku stranicu upravljanja", () => {
    for (const s of STRANICE_UPRAVLJANJA) expect(tekstovi.UPRAVLJANJE.hr.nav.stranice[s], s).toBeTruthy();
  });
  it("pravilo iz stupca pristupa: najmanja uloga i „samo uloga”", () => {
    expect(praviloIzPristupa("K")).toEqual({ najmanje: "viewer", samoUloga: false });
    expect(praviloIzPristupa("K (U:editor)")).toEqual({ najmanje: "editor", samoUloga: false });
    expect(praviloIzPristupa("U:admin, P+e")).toEqual({ najmanje: "admin", samoUloga: true });
  });
});

describe("pristup po ulogama (GET)", async () => {
  const o = await okolina();
  for (const kljuc of Object.keys(UCITAVACI) as StranicaUpravljanja[]) {
    it(`${kljuc}: neprijavljeni → 302 na prijavu`, async () => {
      const r = await get(o, kljuc, null);
      expect(status(r)).toBe(302);
      expect(lokacija(r)).toContain(url("hr", "sign-in"));
    });
    for (const uloga of ULOGE) {
      const smije = SMIJE[kljuc].includes(uloga);
      it(`${kljuc}: ${uloga} → ${smije ? 200 : 404}`, async () => {
        expect(status(await get(o, kljuc, uloga))).toBe(smije ? 200 : 404);
      });
    }
  }
  it("izbornik nudi samo dopuštene stranice", async () => {
    const r = podaci<PodaciKasica>(await get(o, "campaign.manage.moneyboxes", "viewer"));
    expect(r.u.dopustene).toEqual(STRANICE_UPRAVLJANJA.filter((s) => SMIJE[s].includes("viewer")));
    const m = podaci<PodaciKasica>(await get(o, "campaign.manage.moneyboxes", "moderator"));
    expect(m.u.dopustene).not.toContain("campaign.manage.finances");
  });
  it("nepostojeća kampanja → 404", async () => {
    const r = await ucitajPlocu(kontekst(o.db, "/hr/zzzzzz/upravljanje", { params: { id: "zzzzzz" }, korisnik: o.korisnici.owner }));
    expect(status(r)).toBe(404);
  });
});

describe("isključi / uključi kampanju", () => {
  it("urednik isključuje i uključuje (paused_at), promatrač ne smije", async () => {
    const o = await okolina();
    const paused = () => broj(o.sqlite, "SELECT count(*) AS n FROM campaign_settings WHERE campaign_id = ? AND paused_at IS NOT NULL", o.aktivna.id);
    expect(status(await post(o, "campaign.manage", "viewer", { akcija: "iskljuci" }))).toBe(404);
    expect(paused()).toBe(0);
    const r = await post(o, "campaign.manage", "editor", { akcija: "iskljuci" });
    expect(status(r)).toBe(303);
    expect(lokacija(r)).toContain("?ok=iskljucena");
    expect(paused()).toBe(1);
    // Ponovno isključivanje nije prijelaz: stranica s greškom, bez promjene.
    expect((podaci<{ greska: boolean }>(await post(o, "campaign.manage", "editor", { akcija: "iskljuci" }))).greska).toBe(true);
    expect(lokacija(await post(o, "campaign.manage", "owner", { akcija: "ukljuci" }))).toContain("?ok=ukljucena");
    expect(paused()).toBe(0);
  });
});

describe("zaključavanje nakon odobrene verifikacije namjene", () => {
  it("naslov, opis i cilj su zaključani; ostala polja se mogu mijenjati", async () => {
    const o = await okolina();
    const prije = (await kampanjaZaUpravljanje(o.db, o.aktivna.id))!;
    expect(prije.zakljucano).toBe(false);
    o.sqlite
      .prepare(
        `INSERT INTO verifications (id, kind, subject_type, subject_id, status, provider, trigger, requested_at, decided_at)
         VALUES (?, 'campaign_purpose', 'campaign', ?, 'approved', 'platform', 'user', ?, ?)`,
      )
      .run(crypto.randomUUID(), o.aktivna.id, o.sad + 1, o.sad + 2);
    const k = (await kampanjaZaUpravljanje(o.db, o.aktivna.id))!;
    expect(k.zakljucano).toBe(true);
    const ulaz = ulazIzKampanje(k, "hr");
    const r = await spremiPostavke(o.db, k, { ...ulaz, title: `${k.title} x`, description: "drugi opis", goal: "123" }, o.sad);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.greske).toMatchObject({ title: "zakljucano", description: "zakljucano", goal: "zakljucano" });
    expect((await spremiPostavke(o.db, k, { ...ulaz, thankYou: "Hvala svima!" }, o.sad)).ok).toBe(true);
  });
  it("obrazac bez zaključanih polja (disabled) sprema ostalo, s izmijenjenim naslovom vraća grešku", async () => {
    const o = await okolina();
    o.sqlite
      .prepare(
        `INSERT INTO verifications (id, kind, subject_type, subject_id, status, provider, trigger, requested_at, decided_at)
         VALUES (?, 'campaign_purpose', 'campaign', ?, 'approved', 'platform', 'user', ?, ?)`,
      )
      .run(crypto.randomUUID(), o.aktivna.id, o.sad + 1, o.sad + 2);
    const k = (await kampanjaZaUpravljanje(o.db, o.aktivna.id))!;
    const { title: _t, description: _d, goal: _g, ...ostalo } = ulazIzKampanje(k, "hr");
    const obrazac = Object.fromEntries(Object.entries(ostalo).flatMap(([p, v]) => (typeof v === "boolean" ? (v ? [[p, "1"]] : []) : [[p, String(v)]])));
    expect(status(await post(o, "campaign.edit", "editor", obrazac))).toBe(303);
    const r = await post(o, "campaign.edit", "editor", { ...obrazac, title: "Novi naslov" });
    expect(status(r)).toBe(200);
    expect(podaci<{ greske: Record<string, string> }>(r).greske.title).toBe("zakljucano");
  });
});

describe("zatvori / obriši (U:owner, P+e)", () => {
  it("bez svježe potvrde POST vodi na potvrdu radnje i ništa ne mijenja", async () => {
    const o = await okolina();
    const r = await post(o, "campaign.manage.close", "owner", { akcija: "zatvori" });
    expect(status(r)).toBe(302);
    expect(lokacija(r)).toContain("/hr/potvrda-radnje/");
    expect(lokacija(r)).toContain(encodeURIComponent(put(o, "campaign.manage.close")));
    expect(broj(o.sqlite, "SELECT count(*) AS n FROM campaigns WHERE id = ? AND state = 'active'", o.aktivna.id)).toBe(1);
  });
  it("administrator ne smije ni s potvrdom (404)", async () => {
    const o = await okolina();
    o.potvrdi(o.korisnici.admin, "close_campaign");
    expect(status(await post(o, "campaign.manage.close", "admin", { akcija: "zatvori" }))).toBe(404);
  });
  it("s potvrdom: zatvori → closed, ponovno otvori → active, nedopušten prijelaz → greška stanja", async () => {
    const o = await okolina();
    o.potvrdi(o.korisnici.owner, "close_campaign");
    const stanje = () => o.sqlite.prepare("SELECT state FROM campaigns WHERE id = ?").get(o.aktivna.id) as { state: string };
    expect(lokacija(await post(o, "campaign.manage.close", "owner", { akcija: "zatvori" }))).toContain("?ok=zatvorena");
    expect(stanje().state).toBe("closed");
    expect(podaci<PodaciZatvaranja>(await post(o, "campaign.manage.close", "owner", { akcija: "zatvori" })).greska).toBe("stanje");
    expect(lokacija(await post(o, "campaign.manage.close", "owner", { akcija: "otvori" }))).toContain("?ok=otvorena");
    expect(stanje().state).toBe("active");
  });
  it("brisanje traži potvrdu za delete_campaign (ne vrijedi ona za zatvaranje) i upis ID-a", async () => {
    const o = await okolina();
    o.potvrdi(o.korisnici.owner, "close_campaign");
    expect(status(await post(o, "campaign.manage.close", "owner", { akcija: "obrisi", potvrdaId: o.aktivna.public_id }))).toBe(302);
    o.potvrdi(o.korisnici.owner, "delete_campaign");
    expect(podaci<PodaciZatvaranja>(await post(o, "campaign.manage.close", "owner", { akcija: "obrisi", potvrdaId: "krivo1" })).greska).toBe("potvrda_id");
    expect(broj(o.sqlite, "SELECT count(*) AS n FROM campaigns WHERE id = ? AND deleted_at IS NULL", o.aktivna.id)).toBe(1);
  });
  it("brisanje: soft delete, cancelled, kasice deleted, linkovi disabled, 303 na moje kampanje", async () => {
    const o = await okolina();
    o.sqlite
      .prepare("INSERT INTO tracking_links (id, campaign_id, owner_user_id, slug, label, status, created_at) VALUES (?, ?, ?, 'b2-test-link', NULL, 'active', ?)")
      .run(crypto.randomUUID(), o.aktivna.id, o.korisnici.owner.id, o.sad);
    expect(broj(o.sqlite, "SELECT count(*) AS n FROM moneyboxes WHERE campaign_id = ? AND status <> 'deleted'", o.aktivna.id)).toBeGreaterThan(0);
    o.potvrdi(o.korisnici.owner, "delete_campaign");
    const r = await post(o, "campaign.manage.close", "owner", { akcija: "obrisi", potvrdaId: ` ${o.aktivna.public_id.toUpperCase()} ` });
    expect(status(r)).toBe(303);
    expect(lokacija(r)).toBe(`${url("hr", "my.campaigns")}?obrisana=${o.aktivna.public_id}`);
    expect(broj(o.sqlite, "SELECT count(*) AS n FROM campaigns WHERE id = ? AND deleted_at IS NOT NULL AND state = 'cancelled'", o.aktivna.id)).toBe(1);
    expect(broj(o.sqlite, "SELECT count(*) AS n FROM moneyboxes WHERE campaign_id = ? AND status <> 'deleted'", o.aktivna.id)).toBe(0);
    expect(broj(o.sqlite, "SELECT count(*) AS n FROM tracking_links WHERE campaign_id = ? AND status <> 'disabled'", o.aktivna.id)).toBe(0);
    // Obrisana kampanja više nema stranica upravljanja.
    expect(status(await get(o, "campaign.manage", "owner"))).toBe(404);
  });
});

describe("kasice (K, mijenja uloga ≥ editor)", () => {
  it("popis sa stvarnim zbrojem; promatrač ne mijenja; urednik isključuje i uključuje", async () => {
    const o = await okolina();
    const p = podaci<PodaciKasica>(await get(o, "campaign.manage.moneyboxes", "viewer"));
    expect(p.smijeMijenjati).toBe(false);
    expect(p.kasice.length).toBeGreaterThan(0);
    const m = p.kasice.find((x) => x.status === "active")!;
    const zbroj = broj(o.sqlite, `SELECT COALESCE(SUM(d.amount_received_cents), 0) AS n FROM contribution_attributions a JOIN contributions d ON d.id = a.contribution_id
       WHERE a.moneybox_id = ? AND d.state = 'paid'`, m.id);
    expect(m.cents).toBe(zbroj);
    expect(status(await post(o, "campaign.manage.moneyboxes", "viewer", { akcija: "iskljuci", id: m.id }))).toBe(404);
    expect(lokacija(await post(o, "campaign.manage.moneyboxes", "editor", { akcija: "iskljuci", id: m.id }))).toContain("?ok=iskljucena");
    expect(broj(o.sqlite, "SELECT count(*) AS n FROM moneyboxes WHERE id = ? AND status = 'disabled'", m.id)).toBe(1);
    expect(lokacija(await post(o, "campaign.manage.moneyboxes", "editor", { akcija: "ukljuci", id: m.id }))).toContain("?ok=ukljucena");
    expect(status(await post(o, "campaign.manage.moneyboxes", "editor", { akcija: "iskljuci", id: "nema" }))).toBe(404);
  });
});

describe("linkovi za praćenje", () => {
  it("vlastiti slug, nasumični slug, zauzet i nevaljan slug", async () => {
    const o = await okolina();
    expect(lokacija(await post(o, "campaign.manage.links", "viewer", { slug: "B2-Moj-Link", label: "Facebook" }))).toContain("?ok=stvoren");
    expect(broj(o.sqlite, "SELECT count(*) AS n FROM tracking_links WHERE slug = 'b2-moj-link' AND owner_user_id = ?", o.korisnici.viewer.id)).toBe(1);
    expect(podaci<PodaciLinkova>(await post(o, "campaign.manage.links", "editor", { slug: "b2-moj-link", label: "" })).greske.slug).toBe("zauzeto");
    expect(podaci<PodaciLinkova>(await post(o, "campaign.manage.links", "editor", { slug: "ne valja!", label: "" })).greske.slug).toBe("nevaljano");
    expect(podaci<PodaciLinkova>(await post(o, "campaign.manage.links", "editor", { slug: "", label: "x".repeat(81) })).greske.label).toBe("predugo");
    expect(status(await post(o, "campaign.manage.links", "editor", { slug: "", label: "" }))).toBe(303);
    expect(broj(o.sqlite, "SELECT count(*) AS n FROM tracking_links WHERE campaign_id = ? AND owner_user_id = ?", o.aktivna.id, o.korisnici.editor.id)).toBe(1);
  });
  it("isključuje vlasnik linka ili urednik; tuđi promatrač ne smije", async () => {
    const o = await okolina();
    await post(o, "campaign.manage.links", "editor", { slug: "b2-urednikov", label: "" });
    const id = (o.sqlite.prepare("SELECT id FROM tracking_links WHERE slug = 'b2-urednikov'").get() as { id: string }).id;
    expect(status(await post(o, "campaign.manage.links", "viewer", { akcija: "iskljuci", id }))).toBe(404);
    expect(lokacija(await post(o, "campaign.manage.links", "admin", { akcija: "iskljuci", id }))).toContain("?ok=iskljucen");
    expect(lokacija(await post(o, "campaign.manage.links", "editor", { akcija: "ukljuci", id }))).toContain("?ok=ukljucen");
    await post(o, "campaign.manage.links", "viewer", { slug: "b2-promatracev", label: "" });
    const vlastiti = (o.sqlite.prepare("SELECT id FROM tracking_links WHERE slug = 'b2-promatracev'").get() as { id: string }).id;
    expect(status(await post(o, "campaign.manage.links", "viewer", { akcija: "iskljuci", id: vlastiti }))).toBe(303);
    const p = podaci<PodaciLinkova>(await get(o, "campaign.manage.links", "viewer"));
    expect(p.prefiks).toBe("http://localhost:8798/z/");
    expect(p.linkovi.find((l) => l.id === vlastiti)?.status).toBe("disabled");
  });
});

describe("obavijesti", () => {
  it("promatrač sprema samo osobne obavijesti; urednik mijenja i postavku kampanje", async () => {
    const o = await okolina();
    const prije = await obavijestiUpravljanja(o.db, o.aktivna.id, o.korisnici.viewer.id);
    expect(podaci<PodaciObavijesti>(await get(o, "campaign.manage.notifications", "viewer")).smijeKampanju).toBe(false);
    const r = await post(o, "campaign.manage.notifications", "viewer", prije.uplate ? { komentari: "1" } : { uplate: "1", komentari: "1" });
    expect(lokacija(r)).toContain("?ok=spremljeno");
    const v = await obavijestiUpravljanja(o.db, o.aktivna.id, o.korisnici.viewer.id);
    expect(v).toEqual({ uplate: prije.uplate, komentari: true, kraj: false });
    await post(o, "campaign.manage.notifications", "editor", prije.uplate ? { kraj: "1" } : { uplate: "1", kraj: "1" });
    const e = await obavijestiUpravljanja(o.db, o.aktivna.id, o.korisnici.editor.id);
    expect(e).toEqual({ uplate: !prije.uplate, komentari: false, kraj: true });
    expect(podaci<PodaciObavijesti>(await get(o, "campaign.manage.notifications", "editor", "?ok=spremljeno")).spremljeno).toBe(true);
  });
});

describe("verifikacija namjene", () => {
  const pdf = { name: "ponuda izvođača.pdf", size: 12_345, type: "application/pdf" };
  it("dokument (mock bez pohrane), pošalji na pregled, nakon slanja zaključano", async () => {
    const o = await okolina();
    // Seed: aktivna kampanja ima namjenu poslanu na pregled, pa se dokumenti ne dodaju.
    expect(podaci<PodaciVerifikacije>(await get(o, "campaign.manage.verification", "editor")).smijeDodati).toBe(false);
    o.sqlite.prepare("UPDATE verifications SET status = 'requested', due_at = ? WHERE kind = 'campaign_purpose' AND subject_id = ?").run(o.sad + 86_400_000, o.aktivna.id);
    o.sqlite.prepare("DELETE FROM campaign_documents WHERE campaign_id = ?").run(o.aktivna.id);
    const p = podaci<PodaciVerifikacije>(await get(o, "campaign.manage.verification", "editor"));
    expect(p.pragCenti).toBe(500_000);
    expect(p.smijeDodati).toBe(true);
    expect(await posaljiNaPregled(o.db, o.aktivna.id, o.sad)).toBe("nema_dokumenata");
    const g = await dodajDokument(o.db, o.aktivna.id, o.korisnici.editor.id, { kind: "nesto", label: "", datoteka: { ...pdf, type: "text/html" } }, o.sad);
    expect(g).toEqual({ ok: false, greske: { kind: "nevaljano", label: "obavezno", file: "nevaljano" } });
    const velika = await dodajDokument(o.db, o.aktivna.id, o.korisnici.editor.id, { kind: "other", label: "x", datoteka: { ...pdf, size: 21 * 1024 * 1024 } }, o.sad);
    expect(velika).toEqual({ ok: false, greske: { file: "prevelika" } });
    expect(await dodajDokument(o.db, o.aktivna.id, o.korisnici.editor.id, { kind: "contractor_quote", label: "Ponuda", datoteka: pdf }, o.sad)).toEqual({ ok: true });
    expect(broj(o.sqlite, "SELECT count(*) AS n FROM files WHERE purpose = 'purpose_evidence' AND r2_key LIKE 'mock/%'")).toBeGreaterThan(0);
    const r = await post(o, "campaign.manage.verification", "editor", { akcija: "posalji" });
    expect(lokacija(r)).toContain("?ok=poslano");
    const k = (await kampanjaZaUpravljanje(o.db, o.aktivna.id))!;
    expect(k.verifikacija?.status).toBe("submitted");
    expect(k.zakljucano).toBe(false);
    expect(podaci<PodaciVerifikacije>(await get(o, "campaign.manage.verification", "editor")).smijeDodati).toBe(false);
    expect(await dodajDokument(o.db, o.aktivna.id, o.korisnici.editor.id, { kind: "other", label: "Još", datoteka: pdf }, o.sad)).toEqual({ ok: false, greske: { file: "zakljucano" } });
    expect(podaci<PodaciVerifikacije>(await post(o, "campaign.manage.verification", "editor", { akcija: "posalji" })).greskaSlanja).toBe("stanje");
  });
  it("promatrač nema pristup verifikaciji", async () => {
    const o = await okolina();
    expect(status(await post(o, "campaign.manage.verification", "viewer", { akcija: "posalji" }))).toBe(404);
  });
});

describe("kamo ide novac", () => {
  it("Safe kampanje s 0 platformskih potpisnika i zbrojem plaćenih doprinosa", async () => {
    const o = await okolina();
    const n = podaci<PodaciNovca>(await get(o, "campaign.manage.money", "viewer")).novac;
    expect(n.safe).not.toBeNull();
    expect(n.safe!.platformSignerCount).toBe(0);
    expect(n.safe!.owners.length).toBeGreaterThanOrEqual(n.safe!.threshold);
    expect(n.prikupljenoCents).toBe(
      broj(o.sqlite, "SELECT COALESCE(SUM(amount_received_cents), 0) AS n FROM contributions WHERE campaign_id = ? AND state = 'paid'", o.aktivna.id),
    );
  });
});

describe("nova kasica (P)", () => {
  const ctx = (o: O, korisnik: Uloga | null, obrazac?: Record<string, string>) =>
    ucitajNovuKasicu(kontekst(o.db, url("hr", "campaign.moneybox.new", { id: o.aktivna.public_id }), {
      params: { id: o.aktivna.public_id }, korisnik: korisnik ? o.korisnici[korisnik] : null, obrazac,
    }));
  it("obrazac s predloženim aliasom i predloškom opisa; bez pravila greška", async () => {
    const o = await okolina();
    const p = podaci<PodaciNoveKasice>(await ctx(o, "novi"));
    expect(p.zatvoreno).toBeNull();
    expect(p.vrijednosti.alias).toMatch(/^[a-z0-9-]{3,60}$/);
    expect(p.vrijednosti.description).toBe(tekstovi.UPRAVLJANJE.hr.novaKasica.predlozak);
    const g = podaci<PodaciNoveKasice>(await ctx(o, "novi", { title: "", alias: "A B", goal: "abc" }));
    expect(g.greske).toMatchObject({ title: "obavezno", alias: "nevaljano", goal: "nevaljano", rules: "obavezno" });
  });
  it("uspjeh: kasica, privola pravila, 303 na /s/{alias}", async () => {
    const o = await okolina();
    const r = await ctx(o, "novi", { title: "Kasica za test", alias: "b2-kasica", goal: "150", description: "Opis", rules: "1", notifications: "1" });
    expect(status(r)).toBe(303);
    expect(lokacija(r)).toBe(`${url("hr", "moneybox", { alias: "b2-kasica" })}?nova=1`);
    expect(broj(o.sqlite, "SELECT count(*) AS n FROM moneyboxes WHERE alias = 'b2-kasica' AND goal_cents = 15000 AND status = 'active'")).toBe(1);
    expect(broj(o.sqlite, "SELECT count(*) AS n FROM consents WHERE user_id = ? AND kind = 'moneybox_rules'", o.korisnici.novi.id)).toBe(1);
    expect(podaci<PodaciNoveKasice>(await ctx(o, "novi", { title: "Druga", alias: "b2-kasica", rules: "1" })).greske.alias).toBe("zauzeto");
  });
  it("kampanja s isključenim kasicama ne prikazuje obrazac i ne sprema", async () => {
    const o = await okolina();
    o.sqlite.prepare("UPDATE campaign_settings SET allow_moneyboxes = 0 WHERE campaign_id = ?").run(o.aktivna.id);
    const r = await ctx(o, "novi", { title: "X", alias: "b2-zabranjena", rules: "1" });
    expect(podaci<PodaciNoveKasice>(r).zatvoreno).toBe("kasice");
    expect(broj(o.sqlite, "SELECT count(*) AS n FROM moneyboxes WHERE alias = 'b2-zabranjena'")).toBe(0);
  });
  it("neprijavljeni → 302 na prijavu", async () => {
    const o = await okolina();
    expect(status(await ctx(o, null))).toBe(302);
  });
});

it("demo seed ima aktivnu kampanju u organizaciji", () => expect(primjeri.kampanja.aktivna).toMatch(/^[0-9a-z]{6}$/));
