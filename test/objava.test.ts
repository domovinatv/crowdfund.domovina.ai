// Objava kampanje iz čarobnjaka (S6, docs/04 §3, odluke 8, 18, 201, 203, 212): obavezna polja, uloga ≥ admin,
// aktivna organizacija, verificirana osoba za osobnu kampanju, review za tuđu organizaciju, pragovi verifikacije.
import type { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import primjeri from "../seed/primjeri.json";
import { katalog } from "../src/lib/db/katalog";
import { kampanjaPoJavnomId } from "../src/lib/db/kampanja";
import { trenutniNacrt, type Nacrt } from "../src/lib/db/nacrti";
import { mojeOrganizacijeZaObjavu, nedostaje, noviJavniId, objavi, osobaVerificirana, primatelji, slugIzNaslova } from "../src/lib/db/objava";
import { PRAG_KAMPANJE, PRAG_ORGANIZATORA, ROK_DOKAZA, pragVerifikacije, stanjePraga, zbrojAktivnihCiljeva } from "../src/lib/db/pragovi";
import { pristupKampanji } from "../src/lib/pristup";
import { korisnikPoEmailu, type Korisnik } from "../src/lib/sesija";
import { ucitaj as pregled } from "../src/views/stranice/new-campaign.preview.ucitaj";
import { broj, kaoD1, novaBaza, redovi } from "./pomoc/baza";
import { kontekst } from "./pomoc/kontekst";

const SAD = Date.UTC(2026, 10, 25, 10);
const OPIS = "Prikupljamo za novi krov dvorane u kojoj vježba pedesetak djece iz susjedstva svaki tjedan.";
const svjeza = () => {
  const sqlite = novaBaza({ seed: true });
  return { sqlite, db: kaoD1(sqlite) };
};
async function korisnik(db: D1Database, email: string): Promise<Korisnik> {
  const k = (await korisnikPoEmailu(db, email))!;
  return { id: k.id, email: k.email, ime: k.ime, platformRole: k.platformRole };
}
const orgId = (sqlite: DatabaseSync, slug: string) => redovi<{ id: string }>(sqlite, "SELECT id FROM organizations WHERE slug = ?", slug)[0]!.id;
const potpun = (o: Nacrt["organizacija"], dodatno: Nacrt = {}): Nacrt => ({
  vrsta: "one_time", kategorija: "charity", naslov: "Novi krov dvorane", ciljCenti: 200_000, rok: "2027-03-31",
  organizacija: o, tema: "repairs", mediji: true, opis: OPIS, ...dodatno,
});
const verificiraj = (sqlite: DatabaseSync, userId: string, status = "approved") =>
  sqlite.prepare(
    `INSERT INTO verifications (id, kind, subject_type, subject_id, status, provider, requested_at, decided_at)
     VALUES (?, 'person_kyc', 'user', ?, ?, 'mock', ?, ?)`,
  ).run(`v-${userId}-${status}-${Math.random()}`, userId, status, SAD - 1000, SAD - 500);

describe("pragovi (odluka 18)", () => {
  it("čista funkcija: kampanja ≥ 5.000 €, organizator ≥ 12.500 € s ostalima", () => {
    expect(pragVerifikacije(PRAG_KAMPANJE - 1, 0)).toBeNull();
    expect(pragVerifikacije(PRAG_KAMPANJE, 0)).toBe("threshold_campaign");
    expect(pragVerifikacije(PRAG_KAMPANJE, PRAG_ORGANIZATORA)).toBe("threshold_campaign");
    expect(pragVerifikacije(400_000, 850_000)).toBe("threshold_organizer");
    expect(pragVerifikacije(400_000, 849_999)).toBeNull();
    expect(pragVerifikacije(null, PRAG_ORGANIZATORA)).toBe("threshold_organizer");
    expect(pragVerifikacije(null, 0)).toBeNull();
    expect(pragVerifikacije(-5, -5)).toBeNull();
  });

  it("zbroj aktivnih ciljeva organizatora i stanje praga kampanje", async () => {
    const { sqlite, db } = svjeza();
    const org = redovi<{ organizer_id: string }>(sqlite, "SELECT organizer_id FROM organizations WHERE slug = ?", primjeri.organizacijaOrganizatora)[0]!;
    const ocekivano = broj(sqlite, "SELECT COALESCE(SUM(goal_cents),0) FROM campaigns WHERE organizer_id = ? AND state = 'active' AND deleted_at IS NULL", org.organizer_id);
    expect(await zbrojAktivnihCiljeva(db, org.organizer_id)).toBe(ocekivano);
    const s = await stanjePraga(db, "nepostoji");
    expect(s).toBeNull();
    const v = redovi<{ subject_id: string; status: string }>(sqlite, "SELECT subject_id, status FROM verifications WHERE kind = 'campaign_purpose' ORDER BY requested_at DESC LIMIT 1")[0]!;
    expect((await stanjePraga(db, v.subject_id, SAD))?.stanje).toBe(v.status);
  });
});

describe("objava: provjere", () => {
  it("nedostaje: popis obaveznih polja", () => {
    expect(nedostaje({})).toEqual(["vrsta", "kategorija", "naslov", "cilj", "organizacija", "tema", "opis"]);
    expect(nedostaje(potpun({ nacin: "osobno" }))).toEqual([]);
    expect(nedostaje(potpun({ nacin: "osobno" }, { vrsta: "for_organization" }))).toEqual(["organizacija"]);
    expect(nedostaje(potpun({ nacin: "osobno" }, { opis: `${OPIS} Nudimo dionice.` }))).toEqual(["zabranjeno"]);
    expect(nedostaje(potpun({ nacin: "osobno" }, { vrsta: "recurring", ciljCenti: null }))).toEqual([]);
  });

  it("nepotpun nacrt ne mijenja bazu", async () => {
    const { sqlite, db } = svjeza();
    const k = await korisnik(db, primjeri.demoRacuni.organizator);
    const prije = broj(sqlite, "SELECT COUNT(*) FROM campaigns");
    const r = await objavi(db, k, { vrsta: "one_time" }, null, SAD);
    expect(r).toMatchObject({ ok: false, greska: "nedostaje" });
    expect(broj(sqlite, "SELECT COUNT(*) FROM campaigns")).toBe(prije);
  });

  it("u ime organizacije traži ulogu ≥ admin (editor i tuđa organizacija padaju)", async () => {
    const { sqlite, db } = svjeza();
    const editor = await korisnik(db, "luka.uzorkovic@demo.invalid");
    expect(await objavi(db, editor, potpun({ nacin: "moja", orgId: orgId(sqlite, "demo-sapica") }), null, SAD)).toMatchObject({ ok: false, greska: "uloga" });
    const org = await korisnik(db, primjeri.demoRacuni.organizator);
    expect(await objavi(db, org, potpun({ nacin: "moja", orgId: orgId(sqlite, "demo-sapica") }), null, SAD)).toMatchObject({ ok: false, greska: "uloga" });
    expect((await mojeOrganizacijeZaObjavu(db, editor.id)).map((o) => o.slug)).toEqual([]);
  });

  it("organizacija koja nije aktivna (KYB) ne objavljuje", async () => {
    const { sqlite, db } = svjeza();
    const k = await korisnik(db, primjeri.demoRacuni.organizator);
    sqlite.exec(`UPDATE organizations SET status = 'pending' WHERE slug = '${primjeri.organizacijaOrganizatora}'`);
    expect(await objavi(db, k, potpun({ nacin: "moja", orgId: orgId(sqlite, primjeri.organizacijaOrganizatora) }), null, SAD)).toMatchObject({ ok: false, greska: "organizacija_neaktivna" });
  });

  it("rok koji je prošao se odbija", async () => {
    const { sqlite, db } = svjeza();
    const k = await korisnik(db, primjeri.demoRacuni.organizator);
    expect(await objavi(db, k, potpun({ nacin: "moja", orgId: orgId(sqlite, primjeri.organizacijaOrganizatora) }, { rok: "2026-11-01" }), null, SAD)).toMatchObject({ ok: false, greska: "rok_prosao" });
  });
});

describe("objava: u ime svoje organizacije", () => {
  it("admin objavljuje aktivnu kampanju sa Safeom organizacije; nacrt se zatvara; kampanja je u katalogu", async () => {
    const { sqlite, db } = svjeza();
    const k = await korisnik(db, primjeri.demoRacuni.organizator);
    const oid = orgId(sqlite, primjeri.organizacijaOrganizatora);
    sqlite.prepare("INSERT INTO campaign_drafts (id, user_id, source, step, data, created_at, updated_at) VALUES ('n1', ?, 'server', 5, '{}', ?, ?)").run(k.id, SAD, SAD);
    const r = await objavi(db, k, potpun({ nacin: "moja", orgId: oid }, { ciljCenti: 100_000, videoUrl: "https://youtu.be/abc" }), "n1", SAD);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state).toBe("active");
    expect(r.publicId).toMatch(/^[0-9abcdefghjkmnpqrstvwxyz]{6}$/);
    const c = redovi<Record<string, unknown>>(sqlite, "SELECT * FROM campaigns WHERE id = ?", r.campaignId)[0]!;
    expect(c).toMatchObject({ state: "active", visibility: "public", type: "donation", mode: "byo", rails: "platform", demo: 0, goal_cents: 100_000, created_by: k.id, slug: "novi-krov-dvorane", recurrence: "none" });
    expect(c.ends_at).toBe(Date.parse("2027-03-31T23:59:59.999Z"));
    const s = redovi<Record<string, unknown>>(sqlite, "SELECT * FROM campaign_settings WHERE campaign_id = ?", r.campaignId)[0]!;
    expect(s).toMatchObject({ kind: "one_time", category_key: "charity", cover_theme: "repairs", created_by_user_id: k.id, beneficiary_organization_id: null });
    const safe = redovi<Record<string, unknown>>(sqlite, "SELECT * FROM campaign_safes WHERE campaign_id = ?", r.campaignId)[0]!;
    const orgSafe = redovi<{ safe_address: string }>(sqlite, "SELECT safe_address FROM organizations WHERE id = ?", oid)[0]!.safe_address;
    expect(safe).toMatchObject({ address: orgSafe, platform_signer_count: 0, verified_at: SAD });
    expect(broj(sqlite, "SELECT COUNT(*) FROM campaign_media WHERE campaign_id = ? AND kind = 'video'", r.campaignId)).toBe(1);
    expect(broj(sqlite, "SELECT COUNT(*) FROM campaign_drafts WHERE id = 'n1' AND campaign_id = ?", r.campaignId)).toBe(1);
    expect(await trenutniNacrt(db, k.id)).toBeNull();

    const stranica = await kampanjaPoJavnomId(db, r.publicId, new Date(SAD));
    expect(stranica?.title).toBe("Novi krov dvorane");
    const kat = await katalog(db, { q: "Novi krov dvorane" }, new Date(SAD));
    expect(kat.kartice.map((x) => x.publicId)).toContain(r.publicId);
  });

  it("isti naslov dobiva novi slug, a javni ID je jedinstven", async () => {
    const { sqlite, db } = svjeza();
    const k = await korisnik(db, primjeri.demoRacuni.organizator);
    const oid = orgId(sqlite, primjeri.organizacijaOrganizatora);
    const a = await objavi(db, k, potpun({ nacin: "moja", orgId: oid }, { ciljCenti: 10_000 }), null, SAD);
    const b = await objavi(db, k, potpun({ nacin: "moja", orgId: oid }, { ciljCenti: 10_000 }), null, SAD);
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.publicId).not.toBe(b.publicId);
    expect(redovi<{ slug: string }>(sqlite, "SELECT slug FROM campaigns WHERE id IN (?, ?) ORDER BY created_at, slug", a.campaignId, b.campaignId).map((x) => x.slug).sort()).toEqual(["novi-krov-dvorane", "novi-krov-dvorane-2"]);
  });

  it("prag kampanje: cilj ≥ 5.000 € → campaign_purpose requested, rok 14 dana (zastava, kampanja je aktivna)", async () => {
    const { sqlite, db } = svjeza();
    const k = await korisnik(db, primjeri.demoRacuni.organizator);
    const r = await objavi(db, k, potpun({ nacin: "moja", orgId: orgId(sqlite, primjeri.organizacijaOrganizatora) }, { ciljCenti: PRAG_KAMPANJE }), null, SAD);
    expect(r).toMatchObject({ ok: true, state: "active", prag: "threshold_campaign" });
    if (!r.ok) return;
    const v = redovi<Record<string, unknown>>(sqlite, "SELECT * FROM verifications WHERE subject_id = ?", r.campaignId)[0]!;
    expect(v).toMatchObject({ kind: "campaign_purpose", subject_type: "campaign", status: "requested", trigger: "threshold_campaign", requested_at: SAD, due_at: SAD + ROK_DOKAZA });
    expect((await stanjePraga(db, r.campaignId, SAD))?.stanje).toBe("requested");
    expect((await stanjePraga(db, r.campaignId, SAD + ROK_DOKAZA + 1))?.kasni).toBe(true);
  });

  it("prag organizatora: zbroj aktivnih ciljeva s novom ≥ 12.500 €", async () => {
    const { sqlite, db } = svjeza();
    const k = await korisnik(db, primjeri.demoRacuni.organizator);
    const oid = orgId(sqlite, primjeri.organizacijaOrganizatora);
    const organizer = redovi<{ organizer_id: string }>(sqlite, "SELECT organizer_id FROM organizations WHERE id = ?", oid)[0]!.organizer_id;
    const ostali = await zbrojAktivnihCiljeva(db, organizer);
    const cilj = Math.max(100, Math.min(PRAG_KAMPANJE - 100, PRAG_ORGANIZATORA - ostali));
    const r = await objavi(db, k, potpun({ nacin: "moja", orgId: oid }, { ciljCenti: cilj }), null, SAD);
    expect(r).toMatchObject({ ok: true, prag: pragVerifikacije(cilj, ostali) });
    if (!r.ok || !r.prag) return;
    expect(r.prag).toBe("threshold_organizer");
    expect(broj(sqlite, "SELECT COUNT(*) FROM verifications WHERE subject_id = ? AND trigger = 'threshold_organizer'", r.campaignId)).toBe(1);
  });

  it("bez praga nema verifikacije namjene", async () => {
    const { sqlite, db } = svjeza();
    const k = await korisnik(db, primjeri.demoRacuni.novi);
    verificiraj(sqlite, k.id);
    const r = await objavi(db, k, potpun({ nacin: "osobno" }, { ciljCenti: 10_000 }), null, SAD);
    expect(r).toMatchObject({ ok: true, prag: null });
    if (r.ok) expect(broj(sqlite, "SELECT COUNT(*) FROM verifications WHERE subject_id = ?", r.campaignId)).toBe(0);
  });
});

describe("objava: za tuđu organizaciju (Fixed Beneficiary)", () => {
  it("prijavljeni bez uloge → review, bez odobrenja; autor ima K dok čeka", async () => {
    const { sqlite, db } = svjeza();
    const k = await korisnik(db, primjeri.demoRacuni.novi);
    const oid = orgId(sqlite, primjeri.organizacijaOrganizatora);
    expect((await primatelji(db)).map((p) => p.id)).toContain(oid);
    const r = await objavi(db, k, potpun({ nacin: "za", orgId: oid }, { vrsta: "for_organization", kategorija: undefined }), null, SAD);
    expect(r).toMatchObject({ ok: true, state: "review" });
    if (!r.ok) return;
    const s = redovi<Record<string, unknown>>(sqlite, "SELECT kind, beneficiary_organization_id, beneficiary_approved_at FROM campaign_settings WHERE campaign_id = ?", r.campaignId)[0]!;
    expect(s).toEqual({ kind: "for_organization", beneficiary_organization_id: oid, beneficiary_approved_at: null });
    expect(redovi<{ starts_at: number | null }>(sqlite, "SELECT starts_at FROM campaigns WHERE id = ?", r.campaignId)[0]!.starts_at).toBeNull();
    expect(redovi<{ verified_at: number | null }>(sqlite, "SELECT verified_at FROM campaign_safes WHERE campaign_id = ?", r.campaignId)[0]!.verified_at).toBeNull();
    expect((await pristupKampanji(db, k, r.campaignId))?.autorCeka).toBe(true);
    expect((await katalog(db, { q: "Novi krov dvorane" }, new Date(SAD))).kartice).toEqual([]);
  });

  it("admin organizacije primatelja objavljuje odmah (odobreno njime)", async () => {
    const { sqlite, db } = svjeza();
    const k = await korisnik(db, "petra.probic@demo.invalid");
    const oid = orgId(sqlite, primjeri.organizacijaOrganizatora);
    const r = await objavi(db, k, potpun({ nacin: "za", orgId: oid }, { vrsta: "for_organization" }), null, SAD);
    expect(r).toMatchObject({ ok: true, state: "active" });
    if (r.ok) expect(redovi<{ beneficiary_approved_by: string }>(sqlite, "SELECT beneficiary_approved_by FROM campaign_settings WHERE campaign_id = ?", r.campaignId)[0]!.beneficiary_approved_by).toBe(k.id);
  });

  it("organizacija koja ne prima kampanje drugih → greška", async () => {
    const { sqlite, db } = svjeza();
    const k = await korisnik(db, primjeri.demoRacuni.novi);
    expect(await objavi(db, k, potpun({ nacin: "za", orgId: orgId(sqlite, "demo-kud-lipa") }, { vrsta: "for_organization" }), null, SAD)).toMatchObject({ ok: false, greska: "primatelj" });
  });
});

describe("objava: osobno (nije u fazi 1)", () => {
  it("traži verificiranu osobu; odbijena ili nepostojeća verifikacija ne prolazi", async () => {
    const { sqlite, db } = svjeza();
    const k = await korisnik(db, primjeri.demoRacuni.novi);
    expect(await osobaVerificirana(db, k.id)).toBe(false);
    expect(await objavi(db, k, potpun({ nacin: "osobno" }), null, SAD)).toMatchObject({ ok: false, greska: "osoba_neverificirana" });
    verificiraj(sqlite, k.id, "rejected");
    expect(await objavi(db, k, potpun({ nacin: "osobno" }), null, SAD)).toMatchObject({ ok: false, greska: "osoba_neverificirana" });
    expect(broj(sqlite, "SELECT COUNT(*) FROM organizations o JOIN memberships m ON m.organization_id = o.id WHERE o.kind = 'personal' AND m.user_id = ?", k.id)).toBe(0);
  });

  it("verificirana osoba: osobna organizacija (personal, osoba, owner) nastaje jednom", async () => {
    const { sqlite, db } = svjeza();
    const k = await korisnik(db, primjeri.demoRacuni.novi);
    verificiraj(sqlite, k.id);
    const a = await objavi(db, k, potpun({ nacin: "osobno" }), null, SAD);
    const b = await objavi(db, k, potpun({ nacin: "osobno" }, { vrsta: "recurring", ciljCenti: null, rok: null }), null, SAD);
    expect(a).toMatchObject({ ok: true, state: "active" });
    expect(b).toMatchObject({ ok: true, state: "active" });
    const o = redovi<Record<string, unknown>>(
      sqlite,
      `SELECT o.*, g.holder_type FROM organizations o JOIN organizers g ON g.id = o.organizer_id
         JOIN memberships m ON m.organization_id = o.id AND m.user_id = ? WHERE o.kind = 'personal'`,
      k.id,
    );
    expect(o).toHaveLength(1);
    expect(o[0]).toMatchObject({ legal_form: "osoba", status: "active", holder_type: "person", is_fixed_beneficiary: 0 });
    expect(String(o[0]!.slug)).toMatch(/^osoba-[a-z0-9-]+$/);
    expect(String(o[0]!.safe_address)).toMatch(/^0xde5afe[0-9a-f]{34}$/);
    expect(broj(sqlite, "SELECT COUNT(*) FROM memberships WHERE user_id = ? AND role = 'owner' AND organization_id = ?", k.id, String(o[0]!.id))).toBe(1);
    if (b.ok) expect(redovi<Record<string, unknown>>(sqlite, "SELECT recurrence, ends_at, goal_cents FROM campaigns WHERE id = ?", b.campaignId)[0]).toEqual({ recurrence: "monthly", ends_at: null, goal_cents: null });
    // osobna organizacija nije izbor „u ime organizacije”
    expect(await mojeOrganizacijeZaObjavu(db, k.id)).toEqual([]);
  });
});

describe("učitavač pregleda: Objavi", () => {
  it("prijavljeni objavljuje trenutni nacrt i ide na stranicu kampanje; review ide na moje kampanje", async () => {
    const { sqlite, db } = svjeza();
    const k = await korisnik(db, primjeri.demoRacuni.organizator);
    const oid = orgId(sqlite, primjeri.organizacijaOrganizatora);
    sqlite.prepare("INSERT INTO campaign_drafts (id, user_id, source, step, data, created_at, updated_at) VALUES ('n2', ?, 'server', 5, ?, ?, ?)")
      .run(k.id, JSON.stringify(potpun({ nacin: "moja", orgId: oid }, { ciljCenti: 10_000 })), SAD, SAD);
    const r = (await pregled(kontekst(db, "/hr/nova-kampanja/pregled", { korisnik: k, obrazac: { akcija: "objavi" } }))) as Response;
    expect(r.status).toBe(303);
    expect(r.headers.get("Location")).toMatch(/^\/hr\/[0-9a-z]{6}\?objavljeno=1$/);

    const novi = await korisnik(db, primjeri.demoRacuni.novi);
    sqlite.prepare("INSERT INTO campaign_drafts (id, user_id, source, step, data, created_at, updated_at) VALUES ('n3', ?, 'server', 5, ?, ?, ?)")
      .run(novi.id, JSON.stringify(potpun({ nacin: "za", orgId: oid }, { vrsta: "for_organization" })), SAD, SAD);
    const r2 = (await pregled(kontekst(db, "/en/new-campaign/preview", { korisnik: novi, obrazac: { akcija: "objavi" } }))) as Response;
    expect(r2.headers.get("Location")).toMatch(/^\/en\/my\/campaigns\?objavljeno=[0-9a-z]{6}$/);
  });

  it("neuspjela objava je 200 s greškom", async () => {
    const { sqlite, db } = svjeza();
    const k = await korisnik(db, primjeri.demoRacuni.novi);
    sqlite.prepare("INSERT INTO campaign_drafts (id, user_id, source, step, data, created_at, updated_at) VALUES ('n4', ?, 'server', 5, ?, ?, ?)")
      .run(k.id, JSON.stringify(potpun({ nacin: "osobno" })), SAD, SAD);
    const r = await pregled(kontekst(db, "/hr/nova-kampanja/pregled", { korisnik: k, obrazac: { akcija: "objavi" } }));
    expect(r).not.toBeInstanceOf(Response);
    expect((r as { podaci: { greskaObjave: string } }).podaci.greskaObjave).toBe("osoba_neverificirana");
  });
});

describe("pomoćnici", () => {
  it("javni ID je Crockford, slug ASCII", () => {
    for (let i = 0; i < 50; i++) expect(noviJavniId()).toMatch(/^[0-9abcdefghjkmnpqrstvwxyz]{6}$/);
    expect(slugIzNaslova("Đački dom – Čakovec!")).toBe("dacki-dom-cakovec");
    expect(slugIzNaslova("!!!")).toBe("kampanja");
  });
});
