// Moderacija platforme (S6, A, docs/04 tok 8, docs/05 „Prijava” i „Verifikacija”, odluka 645): red prijava,
// odluke s obrazloženjem i žalba, simulirani KYB, verifikacije namjene, blokada i deblokada kampanja, te učitavači
// stranica `/admin/*` (pristup A: bez sesije 302, ne-moderator 404; POST 303, greška 200).
import { describe, expect, it } from "vitest";
import primjeri from "../seed/primjeri.json";
import {
  ADMIN,
  provjeriPoljaOdluke,
  sastaviObrazlozenje,
  ucitajKampanje,
  ucitajOrganizacije,
  ucitajPrijave,
  ucitajPrijavu,
  ucitajVerifikacije,
  type Ishod,
  type KontekstModeracije,
} from "../src/components/moderacija/ucitaj";
import {
  OBRAZLOZENJE_MAX,
  ROK_DOKUMENATA,
  ROK_ZALBE,
  blokirajKampanju,
  deblokirajKampanju,
  kampanjeZaModeraciju,
  odluciKyb,
  odluciNamjenu,
  odluciOPrijavi,
  preuzmiPrijavu,
  prijava,
  provjeriObrazlozenje,
  redPrijava,
  verifikacijeNamjene,
  zabiljeziZalbu,
  zahtjeviOrganizacija,
  zatvoriPrijavu,
} from "../src/lib/db/moderacija";
import { DAN } from "../src/lib/db/zajednicko";
import type { Korisnik } from "../src/lib/sesija";
import { broj, kaoD1, novaBaza, redovi } from "./pomoc/baza";
import { kontekst } from "./pomoc/kontekst";

const SAD = Date.now();
const OBR = "Kampanja traži uplate za namjenu koja nije opisana u dokumentima.";
const NOVA = primjeri.prijavaNova;
const STARA = primjeri.prijavaModeracije;
const NAMJENA = primjeri.verifikacijaNamjene;

function svjeze() {
  const sqlite = novaBaza({ seed: true });
  const db = kaoD1(sqlite);
  const jedan = <T = Record<string, unknown>>(sql: string, ...p: (string | number | null)[]) => redovi<T>(sqlite, sql, ...p)[0]!;
  const moderator = jedan<{ id: string }>("SELECT id FROM users WHERE platform_role = 'moderator'").id;
  const kampanjaId = (publicId: string) => jedan<{ campaign_id: string }>("SELECT campaign_id FROM campaign_settings WHERE public_id = ?", publicId).campaign_id;
  const orgId = (slug: string) => jedan<{ id: string }>("SELECT id FROM organizations WHERE slug = ?", slug).id;
  const postavke = (campaignId: string) =>
    jedan<{ blocked_at: number | null; blocked_reason: string | null; purpose_verified: number }>(
      "SELECT blocked_at, blocked_reason, purpose_verified FROM campaign_settings WHERE campaign_id = ?",
      campaignId,
    );
  const otvoreneNamjene = (campaignId: string) =>
    redovi<{ status: string; trigger: string; requested_at: number; due_at: number }>(
      sqlite,
      "SELECT status, trigger, requested_at, due_at FROM verifications WHERE kind = 'campaign_purpose' AND subject_id = ? AND status IN ('requested','submitted','in_review')",
      campaignId,
    );
  const odluke = (targetId: string) =>
    redovi<{ report_id: string | null; action: string; statement: string; is_appeal: number; decided_by: string; decided_at: number }>(
      sqlite,
      "SELECT report_id, action, statement, is_appeal, decided_by, decided_at FROM moderation_decisions WHERE target_id = ? ORDER BY decided_at, id",
      targetId,
    );
  let n = 0;
  /** Nova prijava (opis 50–500 znakova, prijavitelj e-poštom). */
  const dodajPrijavu = (vrsta: string, ciljId: string, status = "received", kada = SAD - DAN) => {
    const id = `test-prijava-${++n}`;
    sqlite
      .prepare(
        `INSERT INTO reports (id, target_type, target_id, reason, description, reporter_email, status, created_at, updated_at)
         VALUES (?, ?, ?, 'fraud', ?, 'prijavitelj@demo.invalid', ?, ?, ?)`,
      )
      .run(id, vrsta, ciljId, "Opis prijave za test, dovoljno dug da prođe ograničenje od pedeset znakova.", status, kada, kada);
    return id;
  };
  return { sqlite, db, jedan, moderator, kampanjaId, orgId, postavke, otvoreneNamjene, odluke, dodajPrijavu };
}

describe("red prijava i detalj", () => {
  const { db } = svjeze();
  it("otvorene prve: received prije decided; filtar po statusu", async () => {
    const red = await redPrijava(db);
    expect(red.map((p) => p.id)).toEqual([NOVA, STARA]);
    expect(red[0]).toMatchObject({ vrsta: "campaign", status: "received", razlog: "spam" });
    expect(red[0]!.oznaka).toContain(`(${"sg3842"})`);
    // Prijava s odlukom (blokada) je `decided` (S8: seed usklađen, odluka postoji).
    expect((await redPrijava(db, "decided")).map((p) => p.id)).toEqual([STARA]);
    expect(await redPrijava(db, "in_review")).toEqual([]);
    expect(await redPrijava(db, "closed")).toEqual([]);
  });
  it("detalj: kampanja cilja (blokirana), prijavitelj, odluke; nepostojeća null", async () => {
    const p = (await prijava(db, STARA))!;
    expect(p.kampanja).toMatchObject({ publicId: primjeri.kampanja.blokirana404, blokirana: true });
    expect(p.odluke).toHaveLength(1);
    expect(p.odluke[0]).toMatchObject({ radnja: "block_campaign", zalba: false });
    expect(p.opis.length).toBeGreaterThanOrEqual(50);
    expect(await prijava(db, "nema")).toBeNull();
  });
});

describe("stanja prijave: preuzmi, žalba, zatvori", () => {
  it("received → in_review jednom", async () => {
    const { db } = svjeze();
    expect(await preuzmiPrijavu(db, NOVA, SAD)).toBe(true);
    expect((await prijava(db, NOVA))!.status).toBe("in_review");
    expect(await preuzmiPrijavu(db, NOVA, SAD)).toBe(false);
  });
  it("žalba samo iz decided i unutar 14 dana od zadnje odluke; zatvaranje tek nakon roka", async () => {
    const { db, moderator } = svjeze();
    expect(await zabiljeziZalbu(db, NOVA, SAD)).toBe(false); // received
    const odluka = SAD - 2 * DAN;
    expect((await odluciOPrijavi(db, { reportId: NOVA, radnja: "no_action", obrazlozenje: OBR, moderatorId: moderator }, odluka)).ok).toBe(true);
    expect(await zatvoriPrijavu(db, NOVA, SAD)).toBe(false); // rok još traje
    expect(await zabiljeziZalbu(db, NOVA, odluka + ROK_ZALBE + 1)).toBe(false); // rok prošao
    expect(await zatvoriPrijavu(db, NOVA, odluka + ROK_ZALBE)).toBe(true);
    expect((await prijava(db, NOVA))!.status).toBe("closed");
    expect(await zatvoriPrijavu(db, NOVA, odluka + ROK_ZALBE)).toBe(false);
  });
  it("žalba unutar roka: decided → appealed", async () => {
    const { db, moderator } = svjeze();
    await odluciOPrijavi(db, { reportId: NOVA, radnja: "no_action", obrazlozenje: OBR, moderatorId: moderator }, SAD - DAN);
    expect(await zabiljeziZalbu(db, NOVA, SAD)).toBe(true);
    expect((await prijava(db, NOVA))!.status).toBe("appealed");
  });
});

describe("odluka o prijavi (DSA čl. 17)", () => {
  it("provjere: radnja, duljina obrazloženja, nepostojeća, već odlučena", async () => {
    const { db, moderator } = svjeze();
    const o = { reportId: NOVA, radnja: "block_campaign", obrazlozenje: OBR, moderatorId: moderator };
    expect(provjeriObrazlozenje("  kratko  ")).toBe("obrazlozenje_kratko");
    expect(provjeriObrazlozenje("x".repeat(OBRAZLOZENJE_MAX + 1))).toBe("obrazlozenje_dugo");
    expect(await odluciOPrijavi(db, { ...o, radnja: "zabrana" })).toEqual({ ok: false, greska: "radnja" });
    expect(await odluciOPrijavi(db, { ...o, obrazlozenje: "prekratko" })).toEqual({ ok: false, greska: "obrazlozenje_kratko" });
    expect(await odluciOPrijavi(db, { ...o, reportId: "nema" })).toEqual({ ok: false, greska: "nema" });
    expect((await odluciOPrijavi(db, { ...o, radnja: "no_action" }, SAD)).ok).toBe(true);
    expect(await odluciOPrijavi(db, o, SAD)).toEqual({ ok: false, greska: "stanje" });
  });
  it("block_campaign: decided, blocked_at, red moderation_decisions s prijavom, verifikacija namjene s rokom 14 dana", async () => {
    const { db, moderator, kampanjaId, postavke, otvoreneNamjene, odluke } = svjeze();
    const k = kampanjaId("sg3842");
    expect(postavke(k).blocked_at).toBeNull();
    const r = await odluciOPrijavi(db, { reportId: NOVA, radnja: "block_campaign", obrazlozenje: `  ${OBR}  `, moderatorId: moderator }, SAD);
    expect(r.ok).toBe(true);
    expect((await prijava(db, NOVA))!.status).toBe("decided");
    expect(postavke(k)).toMatchObject({ blocked_at: SAD, blocked_reason: OBR });
    expect(otvoreneNamjene(k)).toEqual([{ status: "requested", trigger: "report", requested_at: SAD, due_at: SAD + 14 * DAN }]);
    expect(ROK_DOKUMENATA).toBe(14 * DAN);
    expect(odluke(k)).toEqual([{ report_id: NOVA, action: "block_campaign", statement: OBR, is_appeal: 0, decided_by: moderator, decided_at: SAD }]);
  });
  it("blokada ne otvara drugu verifikaciju kad je jedna već otvorena", async () => {
    const { db, moderator, kampanjaId, otvoreneNamjene, dodajPrijavu } = svjeze();
    const k = kampanjaId(primjeri.kampanja.aktivna); // ima `submitted` verifikaciju namjene iz seeda
    const id = dodajPrijavu("campaign", k);
    expect((await odluciOPrijavi(db, { reportId: id, radnja: "block_campaign", obrazlozenje: OBR, moderatorId: moderator }, SAD)).ok).toBe(true);
    expect(otvoreneNamjene(k).map((v) => v.status)).toEqual(["submitted"]);
  });
  it("block_campaign za prijavu korisnika: radnja_cilj, ništa se ne zapisuje", async () => {
    const { db, moderator, dodajPrijavu, odluke } = svjeze();
    const id = dodajPrijavu("user", moderator);
    expect(await odluciOPrijavi(db, { reportId: id, radnja: "block_campaign", obrazlozenje: OBR, moderatorId: moderator })).toEqual({ ok: false, greska: "radnja_cilj" });
    expect(odluke(moderator)).toEqual([]);
  });
  it("hide_content na komentaru skriva komentar; blokada preko komentara blokira njegovu kampanju", async () => {
    const { db, moderator, jedan, dodajPrijavu, postavke } = svjeze();
    const kom = jedan<{ id: string; campaign_id: string }>("SELECT id, campaign_id FROM comments WHERE hidden_at IS NULL ORDER BY id LIMIT 1");
    const id = dodajPrijavu("comment", kom.id);
    expect((await prijava(db, id))!.kampanja?.id).toBe(kom.campaign_id);
    expect((await odluciOPrijavi(db, { reportId: id, radnja: "hide_content", obrazlozenje: OBR, moderatorId: moderator }, SAD)).ok).toBe(true);
    expect(jedan("SELECT hidden_at, hidden_by FROM comments WHERE id = ?", kom.id)).toEqual({ hidden_at: SAD, hidden_by: moderator });
    const id2 = dodajPrijavu("comment", kom.id);
    await odluciOPrijavi(db, { reportId: id2, radnja: "block_campaign", obrazlozenje: OBR, moderatorId: moderator }, SAD);
    expect(postavke(kom.campaign_id).blocked_at).toBe(SAD);
  });
  it("žalba: odluka no_action (is_appeal = 1) zatvara prijavu i deblokira kampanju", async () => {
    const { db, moderator, kampanjaId, postavke, odluke } = svjeze();
    const k = kampanjaId("sg3842");
    await odluciOPrijavi(db, { reportId: NOVA, radnja: "block_campaign", obrazlozenje: OBR, moderatorId: moderator }, SAD - DAN);
    expect(await zabiljeziZalbu(db, NOVA, SAD)).toBe(true);
    const r = await odluciOPrijavi(db, { reportId: NOVA, radnja: "no_action", obrazlozenje: "Organizator je dostavio dokaze o namjeni.", moderatorId: moderator }, SAD);
    expect(r.ok).toBe(true);
    expect((await prijava(db, NOVA))!.status).toBe("closed");
    expect(postavke(k).blocked_at).toBeNull();
    expect(odluke(k).map((d) => [d.action, d.is_appeal])).toEqual([
      ["block_campaign", 0],
      ["no_action", 1],
    ]);
  });
});

describe("organizacije i simulirani KYB", () => {
  it("popis: organizacija s poslanim KYB-om prva", async () => {
    const { db } = svjeze();
    const z = await zahtjeviOrganizacija(db);
    expect(z[0]).toMatchObject({ slug: primjeri.organizacijaNaCekanju, status: "pending", zahtjev: { status: "submitted", korak: 3 }, kyb: { status: "submitted" } });
    expect(z.some((x) => x.slug === "demo-sapica" && x.kyb?.status === "approved")).toBe(true);
  });
  it("odobri: verifikacija approved, organizacija active, zahtjev approved (korak 4)", async () => {
    const { db, jedan, orgId } = svjeze();
    const id = orgId(primjeri.organizacijaNaCekanju);
    expect(await odluciKyb(db, { orgId: id, odobri: true, razlog: "" }, SAD)).toEqual({ ok: true });
    expect(jedan("SELECT status FROM organizations WHERE id = ?", id)).toEqual({ status: "active" });
    expect(jedan("SELECT status, reason, decided_at FROM verifications WHERE kind = 'org_kyb' AND subject_id = ?", id)).toEqual({ status: "approved", reason: null, decided_at: SAD });
    expect(jedan("SELECT status, step FROM organization_applications WHERE organization_id = ?", id)).toEqual({ status: "approved", step: 4 });
    expect(await odluciKyb(db, { orgId: id, odobri: true, razlog: "" }, SAD)).toEqual({ ok: false, greska: "stanje" });
  });
  it("odbij: razlog obavezan; verifikacija i zahtjev rejected s razlogom, organizacija ostaje pending", async () => {
    const { db, jedan, orgId } = svjeze();
    const id = orgId(primjeri.organizacijaNaCekanju);
    expect(await odluciKyb(db, { orgId: id, odobri: false, razlog: "   " }, SAD)).toEqual({ ok: false, greska: "razlog" });
    expect(await odluciKyb(db, { orgId: id, odobri: false, razlog: "Izvadak iz registra nije čitljiv." }, SAD)).toEqual({ ok: true });
    expect(jedan("SELECT status FROM organizations WHERE id = ?", id)).toEqual({ status: "pending" });
    expect(jedan("SELECT status, reason FROM verifications WHERE kind = 'org_kyb' AND subject_id = ?", id)).toEqual({ status: "rejected", reason: "Izvadak iz registra nije čitljiv." });
    expect(jedan("SELECT status, reason FROM organization_applications WHERE organization_id = ?", id)).toEqual({ status: "rejected", reason: "Izvadak iz registra nije čitljiv." });
  });
  it("bez KYB-a: nema", async () => {
    const { db } = svjeze();
    expect(await odluciKyb(db, { orgId: "nepostojeca", odobri: true, razlog: "" })).toEqual({ ok: false, greska: "nema" });
  });
});

describe("verifikacije namjene", () => {
  it("popis: poslana prva, pa odlučene", async () => {
    const { db } = svjeze();
    const v = await verifikacijeNamjene(db);
    expect(v[0]).toMatchObject({ id: NAMJENA, status: "submitted", povod: "threshold_campaign", kampanja: { publicId: primjeri.kampanja.aktivna } });
    expect(v.at(-1)!.status).toBe("approved");
  });
  it("odobri: approved i purpose_verified = 1; ponovno: stanje", async () => {
    const { db, moderator, jedan, postavke, kampanjaId } = svjeze();
    expect(await odluciNamjenu(db, { id: NAMJENA, odobri: true, razlog: "", moderatorId: moderator }, SAD)).toEqual({ ok: true });
    expect(jedan("SELECT status, decided_at FROM verifications WHERE id = ?", NAMJENA)).toEqual({ status: "approved", decided_at: SAD });
    expect(postavke(kampanjaId(primjeri.kampanja.aktivna)).purpose_verified).toBe(1);
    expect(await odluciNamjenu(db, { id: NAMJENA, odobri: true, razlog: "", moderatorId: moderator })).toEqual({ ok: false, greska: "stanje" });
    expect(await odluciNamjenu(db, { id: "nema", odobri: true, razlog: "", moderatorId: moderator })).toEqual({ ok: false, greska: "nema" });
  });
  it("odbij: razlog ≥ 20; odbijena namjena blokira kampanju i bilježi odluku po službenoj dužnosti", async () => {
    const { db, moderator, postavke, kampanjaId, odluke } = svjeze();
    const k = kampanjaId(primjeri.kampanja.aktivna);
    expect(await odluciNamjenu(db, { id: NAMJENA, odobri: false, razlog: "kratko", moderatorId: moderator })).toEqual({ ok: false, greska: "razlog" });
    expect(await odluciNamjenu(db, { id: NAMJENA, odobri: false, razlog: OBR, moderatorId: moderator }, SAD)).toEqual({ ok: true });
    expect(postavke(k)).toMatchObject({ blocked_at: SAD, blocked_reason: OBR, purpose_verified: 0 });
    expect(odluke(k)).toEqual([{ report_id: null, action: "block_campaign", statement: OBR, is_appeal: 0, decided_by: moderator, decided_at: SAD }]);
  });
});

describe("blokada i deblokada kampanje", () => {
  it("popis: blokirana prva; traženje po ID-u i naslovu, LIKE znakovi se ne tumače", async () => {
    const { db } = svjeze();
    const sve = await kampanjeZaModeraciju(db);
    expect(sve[0]).toMatchObject({ publicId: primjeri.kampanja.blokirana404 });
    expect(sve[0]!.blokirana).not.toBeNull();
    expect((await kampanjeZaModeraciju(db, "SG3842")).map((k) => k.publicId)).toEqual(["sg3842"]);
    expect((await kampanjeZaModeraciju(db, "Zajednički vrt")).map((k) => k.publicId)).toContain(primjeri.kampanja.blokirana404);
    expect(await kampanjeZaModeraciju(db, "%")).toEqual([]);
  });
  it("blokiraj: razlog, nema, blokada + verifikacija (risk, 14 dana) + odluka; dvaput: stanje", async () => {
    const { db, moderator, kampanjaId, postavke, otvoreneNamjene, odluke } = svjeze();
    const k = kampanjaId("sg3842");
    expect(await blokirajKampanju(db, { campaignId: k, razlog: "kratko", moderatorId: moderator })).toEqual({ ok: false, greska: "razlog" });
    expect(await blokirajKampanju(db, { campaignId: "nema", razlog: OBR, moderatorId: moderator })).toEqual({ ok: false, greska: "nema" });
    expect(await blokirajKampanju(db, { campaignId: k, razlog: OBR, moderatorId: moderator }, SAD)).toEqual({ ok: true });
    expect(postavke(k).blocked_at).toBe(SAD);
    expect(otvoreneNamjene(k)).toEqual([{ status: "requested", trigger: "risk", requested_at: SAD, due_at: SAD + 14 * DAN }]);
    expect(odluke(k)).toEqual([{ report_id: null, action: "block_campaign", statement: OBR, is_appeal: 0, decided_by: moderator, decided_at: SAD }]);
    expect(await blokirajKampanju(db, { campaignId: k, razlog: OBR, moderatorId: moderator })).toEqual({ ok: false, greska: "stanje" });
  });
  it("deblokiraj: blocked_at NULL + odluka no_action; neblokirana: stanje", async () => {
    const { db, moderator, kampanjaId, postavke, odluke } = svjeze();
    const k = kampanjaId(primjeri.kampanja.blokirana404);
    const prije = odluke(k).length;
    expect(await deblokirajKampanju(db, { campaignId: k, razlog: "kratko", moderatorId: moderator })).toEqual({ ok: false, greska: "razlog" });
    expect(await deblokirajKampanju(db, { campaignId: k, razlog: OBR, moderatorId: moderator }, SAD)).toEqual({ ok: true });
    expect(postavke(k)).toMatchObject({ blocked_at: null, blocked_reason: null });
    expect(odluke(k)).toHaveLength(prije + 1);
    expect(odluke(k).at(-1)).toMatchObject({ report_id: null, action: "no_action", decided_by: moderator });
    expect(await deblokirajKampanju(db, { campaignId: k, razlog: OBR, moderatorId: moderator })).toEqual({ ok: false, greska: "stanje" });
    expect(await deblokirajKampanju(db, { campaignId: "nema", razlog: OBR, moderatorId: moderator })).toEqual({ ok: false, greska: "nema" });
  });
});

describe("obrazloženje DSA čl. 17", () => {
  const polja = { radnja: "block_campaign", cinjenice: OBR, osnova: "uvjeti", osnovaOpis: "čl. 7. Uvjeta korištenja" };
  it("provjera polja", () => {
    expect(provjeriPoljaOdluke(polja)).toEqual({});
    expect(provjeriPoljaOdluke({ radnja: "x", cinjenice: "kratko", osnova: "", osnovaOpis: "" })).toEqual({
      radnja: "radnja",
      cinjenice: "cinjenice_kratko",
      osnova: "osnova",
      osnovaOpis: "osnova_opis",
    });
    expect(provjeriPoljaOdluke({ ...polja, cinjenice: "x".repeat(1501) }).cinjenice).toBe("cinjenice_dugo");
  });
  it("sastavljeno obrazloženje ima radnju, činjenice, osnovu, automatizirana i pravna sredstva", () => {
    const s = sastaviObrazlozenje(polja);
    for (const dio of ["Blokada kampanje", OBR, "Uvjeti korištenja platforme, čl. 7. Uvjeta korištenja", "Automatizirana sredstva: nisu korištena", "Pravna sredstva:", "14 dana"]) expect(s).toContain(dio);
    expect(s.length).toBeLessThanOrEqual(OBRAZLOZENJE_MAX);
  });
});

// --- Učitavači stranica /admin/* ----------------------------------------------------------------------------

const MOD: Korisnik = { id: "", email: primjeri.demoRacuni.moderator, ime: "Moderator", platformRole: "moderator" };
const ORG: Korisnik = { id: "x", email: "organizator@demo.invalid", ime: "Organizator", platformRole: "user" };

function ctx(db: D1Database, put: string, korisnik: Korisnik | null, obrazac?: Record<string, string>): KontekstModeracije {
  const k = kontekst(db, put, { korisnik, ...(obrazac ? { obrazac } : {}) });
  return { db: k.db, url: k.url, request: k.request, korisnik: k.korisnik };
}
const podaci = <T>(r: Ishod<T>): T => {
  if (r instanceof Response) throw new Error(`očekivani podaci, dobiven ${r.status}`);
  return r.podaci;
};

describe("pristup /admin/* (A, odluka 602)", () => {
  const { db, moderator } = svjeze();
  const mod = { ...MOD, id: moderator };
  const stranice: [string, (c: KontekstModeracije) => Promise<Ishod<unknown>>][] = [
    [ADMIN.prijave, ucitajPrijave],
    [ADMIN.prijava(STARA), (c) => ucitajPrijavu(c, STARA)],
    [ADMIN.organizacije, ucitajOrganizacije],
    [ADMIN.verifikacije, ucitajVerifikacije],
    [ADMIN.kampanje, ucitajKampanje],
  ];
  it.each(stranice)("%s: bez sesije 302 na prijavu, ne-moderator 404, moderator podaci", async (put, u) => {
    const bez = (await u(ctx(db, put, null))) as Response;
    expect(bez.status).toBe(302);
    expect(bez.headers.get("location")).toBe(`/hr/prijava?next=${encodeURIComponent(put)}`);
    expect(((await u(ctx(db, put, ORG))) as Response).status).toBe(404);
    expect(podaci(await u(ctx(db, put, mod)))).toBeTruthy();
  });
  it("ne-moderator ne može ni POST-om (404, ništa se ne mijenja)", async () => {
    const r = (await ucitajPrijavu(ctx(db, ADMIN.prijava(NOVA), ORG, { obrazac: "preuzmi" }), NOVA)) as Response;
    expect(r.status).toBe(404);
    expect((await prijava(db, NOVA))!.status).toBe("received");
  });
  it("nepostojeća prijava: 404", async () => {
    expect(((await ucitajPrijavu(ctx(db, ADMIN.prijava("nema"), mod), "nema")) as Response).status).toBe(404);
  });
  it("filtar statusa: nepoznat status znači sve", async () => {
    expect(podaci(await ucitajPrijave(ctx(db, `${ADMIN.prijave}?status=appealed`, mod))).stavke).toEqual([]);
    expect(podaci(await ucitajPrijave(ctx(db, `${ADMIN.prijave}?status=xx`, mod)))).toMatchObject({ status: null });
  });
});

describe("POST stranica moderacije", () => {
  it("prijava: preuzmi → 303 s porukom; poruka se prikazuje na GET-u", async () => {
    const { db, moderator } = svjeze();
    const mod = { ...MOD, id: moderator };
    const r = (await ucitajPrijavu(ctx(db, ADMIN.prijava(NOVA), mod, { obrazac: "preuzmi" }), NOVA, SAD)) as Response;
    expect(r.status).toBe(303);
    expect(r.headers.get("location")).toBe(`${ADMIN.prijava(NOVA)}?poruka=preuzeta`);
    expect(podaci(await ucitajPrijavu(ctx(db, `${ADMIN.prijava(NOVA)}?poruka=preuzeta`, mod), NOVA))).toMatchObject({ poruka: "preuzeta", prijava: { status: "in_review" } });
    expect(podaci(await ucitajPrijavu(ctx(db, ADMIN.prijava(NOVA), mod, { obrazac: "preuzmi" }), NOVA))).toMatchObject({ greska: { polja: { opce: "stanje" } } });
  });
  it("prijava: neispravna polja odluke → 200 s greškama i vrijednostima; ispravna → 303 i sastavljeno obrazloženje", async () => {
    const { db, moderator, odluke, kampanjaId } = svjeze();
    const mod = { ...MOD, id: moderator };
    const lose = podaci(await ucitajPrijavu(ctx(db, ADMIN.prijava(NOVA), mod, { obrazac: "odluka", radnja: "", cinjenice: "kratko", osnova: "zakon", osnovaOpis: "ZKP" }), NOVA));
    expect(lose.greska).toEqual({
      obrazac: "odluka",
      polja: { radnja: "radnja", cinjenice: "cinjenice_kratko" },
      vrijednosti: { radnja: "", cinjenice: "kratko", osnova: "zakon", osnovaOpis: "ZKP" },
    });
    const ok = (await ucitajPrijavu(
      ctx(db, ADMIN.prijava(NOVA), mod, { obrazac: "odluka", radnja: "restrict_feature", cinjenice: OBR, osnova: "uvjeti", osnovaOpis: "čl. 7." }),
      NOVA,
      SAD,
    )) as Response;
    expect(ok.headers.get("location")).toBe(`${ADMIN.prijava(NOVA)}?poruka=odluka`);
    const d = odluke(kampanjaId("sg3842"));
    expect(d).toHaveLength(1);
    expect(d[0]!.statement).toContain("Činjenice i okolnosti: " + OBR);
    const p = podaci(await ucitajPrijavu(ctx(db, ADMIN.prijava(NOVA), mod), NOVA, SAD));
    expect(p).toMatchObject({ rokZalbe: SAD + ROK_ZALBE, mozeZalba: true, mozeZatvoriti: false });
    expect(podaci(await ucitajPrijavu(ctx(db, ADMIN.prijava(NOVA), mod), NOVA, SAD + ROK_ZALBE))).toMatchObject({ mozeZalba: false, mozeZatvoriti: true });
    const zalba = (await ucitajPrijavu(ctx(db, ADMIN.prijava(NOVA), mod, { obrazac: "zalba" }), NOVA, SAD + DAN)) as Response;
    expect(zalba.headers.get("location")).toBe(`${ADMIN.prijava(NOVA)}?poruka=zalba`);
    expect(podaci(await ucitajPrijavu(ctx(db, ADMIN.prijava(NOVA), mod, { obrazac: "zatvori" }), NOVA))).toMatchObject({ greska: { polja: { opce: "stanje" } } });
  });
  it("organizacije: simulirano odobrenje → 303, organizacija active; odbijanje bez razloga → greška uz organizaciju", async () => {
    const { db, moderator, orgId, jedan } = svjeze();
    const mod = { ...MOD, id: moderator };
    const id = orgId(primjeri.organizacijaNaCekanju);
    expect(podaci(await ucitajOrganizacije(ctx(db, ADMIN.organizacije, mod, { orgId: id, odluka: "odbij", razlog: "" })))).toMatchObject({ greska: { id, greska: "razlog" } });
    const r = (await ucitajOrganizacije(ctx(db, ADMIN.organizacije, mod, { orgId: id, odluka: "odobri" }))) as Response;
    expect([r.status, r.headers.get("location")]).toEqual([303, `${ADMIN.organizacije}?poruka=odobrena`]);
    expect(jedan("SELECT status FROM organizations WHERE id = ?", id)).toEqual({ status: "active" });
  });
  it("verifikacije: kratak razlog odbijanja → razlog_kratko; odbijanje → 303 i blokada", async () => {
    const { db, moderator, postavke, kampanjaId } = svjeze();
    const mod = { ...MOD, id: moderator };
    expect(podaci(await ucitajVerifikacije(ctx(db, ADMIN.verifikacije, mod, { id: NAMJENA, odluka: "odbij", razlog: "ne" })))).toMatchObject({
      greska: { id: NAMJENA, greska: "razlog_kratko", razlog: "ne" },
    });
    const r = (await ucitajVerifikacije(ctx(db, ADMIN.verifikacije, mod, { id: NAMJENA, odluka: "odbij", razlog: OBR }), SAD)) as Response;
    expect(r.headers.get("location")).toBe(`${ADMIN.verifikacije}?poruka=odbijena`);
    expect(postavke(kampanjaId(primjeri.kampanja.aktivna)).blocked_at).toBe(SAD);
  });
  it("kampanje: blokada čuva traženje u preusmjeravanju; kratak razlog → greška", async () => {
    const { db, moderator, kampanjaId, postavke } = svjeze();
    const mod = { ...MOD, id: moderator };
    const k = kampanjaId("sg3842");
    expect(podaci(await ucitajKampanje(ctx(db, ADMIN.kampanje, mod, { campaignId: k, odluka: "blokiraj", razlog: "x" })))).toMatchObject({ greska: { id: k, greska: "razlog_kratko" } });
    const r = (await ucitajKampanje(ctx(db, `${ADMIN.kampanje}?q=sg38`, mod, { campaignId: k, odluka: "blokiraj", razlog: OBR }))) as Response;
    expect(r.headers.get("location")).toBe(`${ADMIN.kampanje}?q=sg38&poruka=blokirana`);
    expect(postavke(k).blocked_at).not.toBeNull();
    const d = (await ucitajKampanje(ctx(db, ADMIN.kampanje, mod, { campaignId: k, odluka: "deblokiraj", razlog: OBR }))) as Response;
    expect(d.headers.get("location")).toBe(`${ADMIN.kampanje}?poruka=deblokirana`);
    expect(postavke(k).blocked_at).toBeNull();
    expect(podaci(await ucitajKampanje(ctx(db, `${ADMIN.kampanje}?q=sg3842`, mod))).kampanje.map((x) => x.publicId)).toEqual(["sg3842"]);
  });
});

it("seed ima moderatora i obje prijave (broj redova)", () => {
  const { sqlite } = svjeze();
  expect(broj(sqlite, "SELECT count(*) FROM users WHERE platform_role = 'moderator'")).toBe(1);
  expect(broj(sqlite, "SELECT count(*) FROM reports")).toBe(2);
});
