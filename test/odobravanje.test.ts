// Odobravanje tuđih kampanja za organizaciju (S6, tok 3, docs/05 „review → active | cancelled”):
// odobri (beneficiary_approved_*, active, mock MPT registracija), odbij s razlogom (cancelled + razlog, 0007),
// pravila stanja, organizacije i Safea, te učitavač `/hr/o/{slug}/odobravanje` (U:admin).
import { describe, expect, it } from "vitest";
import primjeri from "../seed/primjeri.json";
import { kampanjaPoJavnomId } from "../src/lib/db/kampanja";
import { kampanjeZaOdobrenje, odbijKampanju, odluceneKampanje, odobriKampanju, provjeriRazlog, RAZLOG_MAX } from "../src/lib/db/odobravanje";
import { korisnikPoEmailu, korisnikSesije } from "../src/lib/sesija";
import { ucitaj as ucitajOdobravanje, type PodaciOdobravanja } from "../src/views/stranice/org.approvals.ucitaj";
import { broj, kaoD1, novaBaza, redovi } from "./pomoc/baza";
import { kontekst } from "./pomoc/kontekst";

const sad = Date.now();
const SVJETIONIK = primjeri.organizacijaOrganizatora;
const ZA_ODOBRENJE = primjeri.kampanja.zaOdobrenje404;
const U_PREGLEDU = primjeri.kampanja.review404;

function svjeze() {
  const sqlite = novaBaza({ seed: true });
  const db = kaoD1(sqlite);
  const orgId = (slug: string) => redovi<{ id: string }>(sqlite, "SELECT id FROM organizations WHERE slug = ?", slug)[0]!.id;
  const kampanja = (publicId: string) =>
    redovi<Record<string, unknown>>(
      sqlite,
      `SELECT c.id, c.state, c.starts_at, s.beneficiary_approved_at, s.beneficiary_approved_by, s.beneficiary_rejected_at,
              s.beneficiary_rejected_by, s.beneficiary_rejected_reason, cs.verified_at
         FROM campaigns c JOIN campaign_settings s ON s.campaign_id = c.id LEFT JOIN campaign_safes cs ON cs.campaign_id = c.id
        WHERE s.public_id = ?`,
      publicId,
    )[0]!;
  return { sqlite, db, orgId, kampanja };
}

describe("red čekanja i povijest", () => {
  const { db, orgId } = svjeze();
  it("Svjetionik ima dvije kampanje drugih na čekanju (najstarija prva); druge organizacije nemaju", async () => {
    const red = await kampanjeZaOdobrenje(db, orgId(SVJETIONIK));
    expect(red.map((k) => k.publicId)).toEqual([U_PREGLEDU, ZA_ODOBRENJE]);
    expect(red[1]).toMatchObject({ autorEmail: "maja.skicic@demo.invalid", ciljCenti: 120000, valuta: "EUR" });
    expect(await kampanjeZaOdobrenje(db, orgId("demo-sapica"))).toEqual([]);
  });
  it("povijest: seedom odobrena rođendanska akcija", async () => {
    const o = await odluceneKampanje(db, orgId(SVJETIONIK));
    expect(o.find((x) => x.publicId === primjeri.kampanja.zaOrganizaciju)).toMatchObject({ odluka: "odobrena", razlog: null });
  });
});

describe("odobri", () => {
  it("review → active, oznaka odobrenja, starts_at, mock MPT (campaign_safes.verified_at); javno vidljiva i u katalogu", async () => {
    const { db, orgId, kampanja } = svjeze();
    const organizator = (await korisnikSesije(db, primjeri.demoSesija, sad))!;
    expect(await kampanjaPoJavnomId(db, ZA_ODOBRENJE)).toBeNull();
    const r = await odobriKampanju(db, { orgId: orgId(SVJETIONIK), campaignId: ZA_ODOBRENJE, userId: organizator.id }, sad);
    expect(r).toEqual({ ok: true, publicId: ZA_ODOBRENJE, mpt: `mock-mpt-${ZA_ODOBRENJE}` });
    expect(kampanja(ZA_ODOBRENJE)).toMatchObject({
      state: "active",
      starts_at: sad,
      beneficiary_approved_at: sad,
      beneficiary_approved_by: organizator.id,
      beneficiary_rejected_at: null,
      verified_at: sad,
    });
    expect(await kampanjaPoJavnomId(db, ZA_ODOBRENJE)).not.toBeNull();
    expect((await kampanjeZaOdobrenje(db, orgId(SVJETIONIK))).map((k) => k.publicId)).toEqual([U_PREGLEDU]);
    // drugi put: više ne čeka
    expect(await odobriKampanju(db, { orgId: orgId(SVJETIONIK), campaignId: ZA_ODOBRENJE, userId: organizator.id }, sad)).toEqual({ ok: false, greska: "stanje" });
  });
  it("tuđa organizacija, nepostojeća kampanja, neaktivna organizacija i organizacija bez Safea se odbijaju", async () => {
    const { sqlite, db, orgId } = svjeze();
    const u = (await korisnikPoEmailu(db, "ivana.testic@demo.invalid"))!;
    expect(await odobriKampanju(db, { orgId: orgId("demo-sapica"), campaignId: ZA_ODOBRENJE, userId: u.id })).toEqual({ ok: false, greska: "nema" });
    expect(await odobriKampanju(db, { orgId: orgId(SVJETIONIK), campaignId: "zzzzzz", userId: u.id })).toEqual({ ok: false, greska: "nema" });
    expect(await odobriKampanju(db, { orgId: orgId(SVJETIONIK), campaignId: primjeri.kampanja.aktivna, userId: u.id })).toEqual({ ok: false, greska: "nema" });
    sqlite.prepare("UPDATE organizations SET status = 'suspended' WHERE slug = ?").run(SVJETIONIK);
    expect(await odobriKampanju(db, { orgId: orgId(SVJETIONIK), campaignId: ZA_ODOBRENJE, userId: u.id })).toEqual({ ok: false, greska: "organizacija" });
    sqlite.prepare("UPDATE organizations SET status = 'active', safe_address = NULL, safe_chain_id = NULL WHERE slug = ?").run(SVJETIONIK);
    sqlite.prepare("DELETE FROM campaign_safes WHERE campaign_id = (SELECT campaign_id FROM campaign_settings WHERE public_id = ?)").run(ZA_ODOBRENJE);
    expect(await odobriKampanju(db, { orgId: orgId(SVJETIONIK), campaignId: ZA_ODOBRENJE, userId: u.id })).toEqual({ ok: false, greska: "safe" });
  });
  it("bez reda campaign_safes: mock registracija ga stvara iz Safea organizacije (byo, 0 platformskih potpisnika)", async () => {
    const { sqlite, db, orgId } = svjeze();
    const u = (await korisnikPoEmailu(db, "ivana.testic@demo.invalid"))!;
    sqlite.prepare("DELETE FROM campaign_safes WHERE campaign_id = (SELECT campaign_id FROM campaign_settings WHERE public_id = ?)").run(ZA_ODOBRENJE);
    expect((await odobriKampanju(db, { orgId: orgId(SVJETIONIK), campaignId: ZA_ODOBRENJE, userId: u.id }, sad)).ok).toBe(true);
    const s = redovi<Record<string, unknown>>(
      sqlite,
      "SELECT cs.address, cs.platform_signer_count, cs.verified_at, o.safe_address FROM campaign_safes cs JOIN campaign_settings s ON s.campaign_id = cs.campaign_id JOIN organizations o ON o.id = s.beneficiary_organization_id WHERE s.public_id = ?",
      ZA_ODOBRENJE,
    )[0]!;
    expect(s.address).toBe(s.safe_address);
    expect(s).toMatchObject({ platform_signer_count: 0, verified_at: sad });
  });
});

describe("odbij s razlogom", () => {
  it("razlog: obavezan, 10–500 znakova", () => {
    expect(provjeriRazlog("")).toBe("razlog_prazan");
    expect(provjeriRazlog("   kratko ")).toBe("razlog_kratak");
    expect(provjeriRazlog("x".repeat(RAZLOG_MAX + 1))).toBe("razlog_dug");
    expect(provjeriRazlog("Cilj nije u skladu s namjenom zaklade.")).toBeNull();
  });
  it("review → cancelled; razlog i tko je odbio u campaign_settings (0007); povijest ga prikazuje; ostaje 404", async () => {
    const { db, orgId, kampanja } = svjeze();
    const u = (await korisnikPoEmailu(db, "petra.probic@demo.invalid"))!;
    expect(await odbijKampanju(db, { orgId: orgId(SVJETIONIK), campaignId: U_PREGLEDU, userId: u.id, razlog: "x" })).toEqual({ ok: false, greska: "razlog_kratak" });
    const r = await odbijKampanju(db, { orgId: orgId(SVJETIONIK), campaignId: U_PREGLEDU, userId: u.id, razlog: "  Zaklada trenutno ne skuplja za školski pribor.  " }, sad);
    expect(r).toEqual({ ok: true, publicId: U_PREGLEDU });
    expect(kampanja(U_PREGLEDU)).toMatchObject({
      state: "cancelled",
      beneficiary_approved_at: null,
      beneficiary_rejected_at: sad,
      beneficiary_rejected_by: u.id,
      beneficiary_rejected_reason: "Zaklada trenutno ne skuplja za školski pribor.",
    });
    expect((await odluceneKampanje(db, orgId(SVJETIONIK)))[0]).toMatchObject({ publicId: U_PREGLEDU, odluka: "odbijena", razlog: "Zaklada trenutno ne skuplja za školski pribor." });
    expect(await kampanjaPoJavnomId(db, U_PREGLEDU)).toBeNull();
    expect(await odbijKampanju(db, { orgId: orgId(SVJETIONIK), campaignId: U_PREGLEDU, userId: u.id, razlog: "Opet odbijam istu kampanju." })).toEqual({ ok: false, greska: "stanje" });
    expect(await odobriKampanju(db, { orgId: orgId(SVJETIONIK), campaignId: U_PREGLEDU, userId: u.id })).toEqual({ ok: false, greska: "stanje" });
  });
});

describe("učitavač /hr/o/{slug}/odobravanje (U:admin)", () => {
  it("viewer i editor 404, admin vidi red; POST odobri 303 s porukom, greška 200 uz kampanju", async () => {
    const { sqlite, db } = svjeze();
    const k = async (email: string) => {
      const x = (await korisnikPoEmailu(db, email))!;
      return { id: x.id, email: x.email, ime: x.ime, platformRole: x.platformRole };
    };
    const admin = await k("petra.probic@demo.invalid");
    const novi = (await korisnikSesije(db, primjeri.demoSesijaNovi, sad))!;
    const params = { slug: SVJETIONIK };
    const put = `/hr/o/${SVJETIONIK}/odobravanje`;
    const nemaPristupa = await ucitajOdobravanje(kontekst(db, put, { params, korisnik: novi }));
    expect(nemaPristupa instanceof Response && nemaPristupa.status).toBe(404);
    const get = (await ucitajOdobravanje(kontekst(db, put, { params, korisnik: admin }))) as { podaci: PodaciOdobravanja };
    expect(get.podaci.naCekanju).toHaveLength(2);
    const lose = (await ucitajOdobravanje(kontekst(db, put, { params, korisnik: admin, obrazac: { radnja: "odbij", kampanja: ZA_ODOBRENJE, razlog: "" } }))) as {
      podaci: PodaciOdobravanja;
    };
    expect(lose.podaci.greska).toEqual({ kampanja: ZA_ODOBRENJE, greska: "razlog_prazan", razlog: "" });
    const r = await ucitajOdobravanje(kontekst(db, put, { params, korisnik: admin, obrazac: { radnja: "odobri", kampanja: ZA_ODOBRENJE.toUpperCase() } }));
    expect(r instanceof Response && r.status).toBe(303);
    expect(r instanceof Response && r.headers.get("Location")).toBe(`${put}?odobrena=${ZA_ODOBRENJE}`);
    expect(broj(sqlite, "SELECT count(*) FROM campaigns c JOIN campaign_settings s ON s.campaign_id = c.id WHERE s.public_id = ? AND c.state = 'active'", ZA_ODOBRENJE)).toBe(1);
    const poslije = (await ucitajOdobravanje(kontekst(db, `${put}?odobrena=${ZA_ODOBRENJE}`, { params, korisnik: admin }))) as { podaci: PodaciOdobravanja };
    expect(poslije.podaci.poruka).toEqual({ odluka: "odobrena", kampanja: ZA_ODOBRENJE });
  });
});
