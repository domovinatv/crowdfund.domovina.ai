import { describe, expect, it } from "vitest";
import { kasicaPoAliasu, kasiceKampanje, linkZaPracenje, zabiljeziPosjet } from "../src/lib/db/kasice";
import { DEMO_TAJNA_PRACENJA, odjaviPracenje, pracenjePoTokenu, procitajTokenPracenja, tokenPracenja } from "../src/lib/db/pracenje";
import { spremiPrijavu, type UlazPrijave } from "../src/lib/db/prijave";
import { katalogOrganizacija, organizacijaPoSlugu, profilKorisnika, vanjskaKampanja } from "../src/lib/db/profili";
import { MIN } from "../src/lib/db/zajednicko";
import primjeri from "../seed/primjeri.json";
import { demoPrimjeri, tokenPracenja as tokenIzSeeda } from "../scripts/seed.mjs";
import { broj, kaoD1, novaBaza, redovi } from "./pomoc/baza";

const SAD = new Date(Date.UTC(2026, 10, 20, 9, 0, 0));
const sqlite = novaBaza({ seed: true });
const db = kaoD1(sqlite);
const K = primjeri.kampanja;
const idKampanje = (publicId: string) =>
  redovi<{ campaign_id: string }>(sqlite, "SELECT campaign_id FROM campaign_settings WHERE public_id = ?", publicId)[0]!.campaign_id;
const bezEposte = (x: unknown) => expect(JSON.stringify(x)).not.toContain("@demo.invalid");

describe("seed/primjeri.json", () => {
  it("jednak generatoru i svaki primjer postoji", () => {
    expect(primjeri).toEqual(demoPrimjeri());
    expect(Object.values(primjeri.kampanja).every((id) => /^[0-9a-z]{6}$/.test(id))).toBe(true);
  });
});

describe("kasice", () => {
  it("kasicaPoAliasu: bez obzira na veličinu slova, s podacima kampanje za „Podrži”", async () => {
    const k = (await kasicaPoAliasu(db, primjeri.kasica.toUpperCase()))!;
    expect(k.alias).toBe(primjeri.kasica);
    expect(k.kampanja).toMatchObject({ stanje: "active", primaUplate: true, noindex: false });
    expect(k.kampanja.publicId).toMatch(/^[0-9a-z]{6}$/);
    expect(k.raisedCents).toBe(
      broj(sqlite, `SELECT COALESCE(sum(d.amount_received_cents), 0) FROM contribution_attributions a
        JOIN contributions d ON d.id = a.contribution_id JOIN moneyboxes m ON m.id = a.moneybox_id
        WHERE m.alias = ? AND d.state = 'paid'`, primjeri.kasica),
    );
    expect(k.contributionCount).toBeGreaterThan(0);
    expect(k.ownerName).toBeTruthy();
    bezEposte(k);
  });

  it("neaktivna, nepostojeća ili nevaljan alias → null", async () => {
    expect(await kasicaPoAliasu(db, primjeri.kasicaNeaktivna404)).toBeNull();
    expect(await kasicaPoAliasu(db, "demo-nema-je")).toBeNull();
    expect(await kasicaPoAliasu(db, "a b")).toBeNull();
  });

  it("kasiceKampanje: dvije kasice iste kampanje; kampanja bez kasica i nevidljiva → []", async () => {
    const id = redovi<{ campaign_id: string }>(sqlite, "SELECT campaign_id FROM moneyboxes WHERE alias = ?", primjeri.kasica)[0]!.campaign_id;
    const k = await kasiceKampanje(db, id);
    expect(k.length).toBe(2);
    expect(k[0]!.raisedCents!).toBeGreaterThanOrEqual(k[1]!.raisedCents!);
    expect(await kasiceKampanje(db, idKampanje(K.komentariIskljuceni))).toEqual([]);
    expect(await kasiceKampanje(db, idKampanje(K.blokirana404))).toEqual([]);
  });
});

describe("linkovi za praćenje", () => {
  it("linkZaPracenje: aktivan link vodi na javni ID kampanje; neaktivan → null", async () => {
    const l = (await linkZaPracenje(db, primjeri.linkZaPracenje.toUpperCase()))!;
    expect(l.slug).toBe(primjeri.linkZaPracenje);
    expect(l.publicId).toBe(K.aktivna);
    expect(await linkZaPracenje(db, primjeri.linkZaPracenjeNeaktivan404)).toBeNull();
    expect(await linkZaPracenje(db, "x")).toBeNull();
  });

  it("zabiljeziPosjet: isti posjetitelj jednom u 10 minuta, drugi posjetitelj odmah", async () => {
    const svjeza = novaBaza({ seed: true });
    const d = kaoD1(svjeza);
    const l = (await linkZaPracenje(d, primjeri.linkZaPracenje))!;
    const n = () => broj(svjeza, "SELECT count(*) FROM link_visits WHERE tracking_link_id = ?", l.id);
    const prije = n();
    const t0 = SAD.getTime() + 60 * MIN;
    expect(await zabiljeziPosjet(d, l.id, "hash-a", new Date(t0))).toBe(true);
    expect(await zabiljeziPosjet(d, l.id, "hash-a", new Date(t0 + 5 * MIN))).toBe(false);
    expect(await zabiljeziPosjet(d, l.id, "hash-a", new Date(t0 + 10 * MIN - 1))).toBe(false);
    expect(await zabiljeziPosjet(d, l.id, "hash-b", new Date(t0 + 5 * MIN))).toBe(true);
    expect(await zabiljeziPosjet(d, l.id, "hash-a", new Date(t0 + 10 * MIN))).toBe(true);
    expect(n()).toBe(prije + 3);
    const r = redovi<{ id: string; visited_at: number }>(svjeza, "SELECT id, visited_at FROM link_visits WHERE visitor_hash = 'hash-a' ORDER BY visited_at");
    expect(r.map((x) => x.visited_at)).toEqual([t0, t0 + 10 * MIN]);
    expect(r[0]!.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

describe("profilKorisnika()", () => {
  it("javni profil: vidljivo po prekidačima, bez e-pošte i telefona kad su isključeni", async () => {
    const p = (await profilKorisnika(db, primjeri.korisnik.javni, SAD))!;
    expect(p.displayName).toBeTruthy();
    expect(p.email).toBeNull();
    expect(p.phone).toBeNull();
    expect(p.registeredAt).toBeGreaterThan(0);
    expect(p.totalRaisedCents).toBeNull();
    expect(p.noindex).toBe(false);
    expect(p.kampanje.vlastite!.length).toBeGreaterThan(0);
    expect(p.kampanje.promovirane!.length).toBeGreaterThan(0);
    // unlisted kampanja istog autora se ne nabraja na profilu
    const sve = Object.values(p.kampanje).flatMap((x) => x ?? []).map((k) => k.publicId);
    expect(sve).not.toContain(K.unlisted);
    bezEposte(p);
  });

  it("show_total_raised i indexable", async () => {
    const marko = redovi<{ id: string }>(sqlite, "SELECT id FROM users WHERE first_name = 'Marko'")[0]!.id;
    const p = (await profilKorisnika(db, marko.toUpperCase(), SAD))!;
    expect(p.totalRaisedCents).toBeGreaterThan(0);
    expect((await profilKorisnika(db, primjeri.korisnik.javniNeindeksiran, SAD))!.noindex).toBe(true);
  });

  it("privatan profil (svi prekidači isključeni), nepostojeći i nevaljan slug → null", async () => {
    expect(await profilKorisnika(db, primjeri.korisnik.privatni404, SAD)).toBeNull();
    expect(await profilKorisnika(db, "00000000-0000-7000-8000-000000000000", SAD)).toBeNull();
    expect(await profilKorisnika(db, "ana-primjeric", SAD)).toBeNull();
  });
});

describe("organizacije i vanjske kampanje", () => {
  it("organizacijaPoSlugu: opis, verifikacija, kampanje bez unlisted, vanjske", async () => {
    const o = (await organizacijaPoSlugu(db, primjeri.organizacija, SAD))!;
    expect(o).toMatchObject({ slug: primjeri.organizacija, verified: true, legalForm: "udruga", city: "Varaždin" });
    expect(o.kampanje.length).toBeGreaterThan(0);
    expect(o.kampanje.map((k) => k.publicId)).not.toContain(K.unlisted);
    expect(o.vanjske.map((v) => v.id)).toContain(primjeri.vanjska);
    expect(o.safe?.address).toMatch(/^0xde5afe/);
    bezEposte(o);
    expect((await organizacijaPoSlugu(db, primjeri.organizacijaNeverificirana, SAD))!.verified).toBe(false);
    expect(await organizacijaPoSlugu(db, "demo-nema", SAD)).toBeNull();
  });

  it("katalogOrganizacija: sve aktivne, filtar kategorije, broj aktivnih kampanja", async () => {
    const sve = await katalogOrganizacija(db);
    expect(sve.ukupno).toBe(5);
    expect(sve.ukupnoStranica).toBe(1);
    const imena = sve.organizacije.map((o) => o.displayName);
    // NOCASE je ASCII: „Š” ide iza „Z” (D1 nema ICU kolaciju za hrvatski).
    expect(imena).toEqual(redovi<{ n: string }>(sqlite, "SELECT display_name AS n FROM organizations ORDER BY n COLLATE NOCASE").map((r) => r.n));
    expect(sve.organizacije.reduce((a, o) => a + o.brojAktivnihKampanja, 0)).toBeGreaterThan(10);
    const ziv = await katalogOrganizacija(db, { category: "animals" });
    expect(ziv.organizacije.map((o) => o.slug)).toEqual(["demo-sapica"]);
    expect((await katalogOrganizacija(db, { page: 2 })).organizacije).toEqual([]);
  });

  it("vanjskaKampanja: aktivna s organizacijom; pending → null", async () => {
    const v = (await vanjskaKampanja(db, primjeri.vanjska))!;
    expect(v).toMatchObject({ platform: "4fund", organizacija: { verified: true } });
    expect(v.url).toMatch(/^https:\/\/4fund\.invalid\//);
    expect(await vanjskaKampanja(db, primjeri.vanjskaNeaktivna404)).toBeNull();
    expect(await vanjskaKampanja(db, "nije-uuid")).toBeNull();
  });
});

describe("praćenje po tokenu", () => {
  it("token iz seeda (node:crypto) jednak je tokenu iz Workera (WebCrypto)", async () => {
    const t = (await procitajTokenPracenja(primjeri.pracenjeToken))!;
    expect(await tokenPracenja(t.userId, t.campaignId)).toBe(primjeri.pracenjeToken);
    expect(tokenIzSeeda(t.userId, t.campaignId)).toBe(primjeri.pracenjeToken);
  });

  it("pracenjePoTokenu: obavijesti, bez osobnih podataka; krivotvoren token → null", async () => {
    const p = (await pracenjePoTokenu(db, primjeri.pracenjeToken))!;
    expect(p).toMatchObject({ publicId: K.aktivna, aktivno: true, kampanjaVidljiva: true, obavijesti: { komentari: true, novosti: true, kraj: true } });
    expect(Object.keys(p).sort()).toEqual(["aktivno", "campaignId", "kampanjaVidljiva", "obavijesti", "publicId", "title"]);
    const [u, c, sig] = primjeri.pracenjeToken.split(".");
    expect(await pracenjePoTokenu(db, `${u}.${c}.${sig!.slice(0, -1)}A`)).toBeNull();
    expect(await pracenjePoTokenu(db, `${u}.${c}.x`)).toBeNull();
    expect(await pracenjePoTokenu(db, primjeri.pracenjeToken, "druga-tajna")).toBeNull();
    expect(await pracenjePoTokenu(db, "smece")).toBeNull();
    // ispravno potpisan, ali takvog praćenja nema
    expect(await pracenjePoTokenu(db, await tokenPracenja(u!, idKampanje(K.paused), DEMO_TAJNA_PRACENJA))).toBeNull();
  });

  it("odjaviPracenje: isključuje sve obavijesti, ponovljena odjava je bezopasna", async () => {
    const svjeza = kaoD1(novaBaza({ seed: true }));
    expect(await odjaviPracenje(svjeza, primjeri.pracenjeToken)).toBe(true);
    expect(await pracenjePoTokenu(svjeza, primjeri.pracenjeToken)).toMatchObject({ aktivno: false, obavijesti: { komentari: false, novosti: false, kraj: false } });
    expect(await odjaviPracenje(svjeza, primjeri.pracenjeToken)).toBe(true);
    expect(await odjaviPracenje(svjeza, "smece")).toBe(false);
  });
});

describe("spremiPrijavu()", () => {
  const opis = "Kampanja traži novac za parcelu koja, koliko znam, nije u vlasništvu organizatora.";
  const valjana: UlazPrijave = { targetType: "campaign", targetId: K.aktivna.toUpperCase(), reason: "fraud", description: opis, email: "prijava@demo.invalid", privola: true };

  it("validacija: obavezna polja, opis 50–500, e-pošta, razlog, cilj, privola", async () => {
    const d = kaoD1(novaBaza({ seed: true }));
    const prazno = await spremiPrijavu(d, { targetType: "", targetId: "", reason: "", description: "", email: "", privola: false }, SAD);
    expect(prazno).toEqual({ ok: false, greske: { targetType: "obavezno", targetId: "obavezno", reason: "obavezno", description: "obavezno", email: "obavezno", privola: "obavezno" } });
    const r = await spremiPrijavu(d, { ...valjana, targetType: "nesto", reason: "dosada", description: "prekratko", email: "nije-adresa", phone: "abc" }, SAD);
    expect(r).toEqual({ ok: false, greske: { targetType: "nevaljano", reason: "nevaljano", description: "prekratko", email: "nevaljano", phone: "nevaljano" } });
    expect(await spremiPrijavu(d, { ...valjana, description: "x".repeat(501) }, SAD)).toEqual({ ok: false, greske: { description: "predugo" } });
    expect(await spremiPrijavu(d, { ...valjana, description: `  ${"x".repeat(50)}  ` }, SAD)).toMatchObject({ ok: true });
  });

  it("cilj: nepostojeći i skriveni (draft) → ne_postoji", async () => {
    const d = kaoD1(novaBaza({ seed: true }));
    expect(await spremiPrijavu(d, { ...valjana, targetId: "zzzzzz" }, SAD)).toEqual({ ok: false, greske: { targetId: "ne_postoji" } });
    expect(await spremiPrijavu(d, { ...valjana, targetId: K.draft404 }, SAD)).toEqual({ ok: false, greske: { targetId: "ne_postoji" } });
  });

  it("upis: prijava s internim ID-em cilja i privola report_gdpr", async () => {
    const baza = novaBaza({ seed: true });
    const r = await spremiPrijavu(kaoD1(baza), { ...valjana, phone: "+385 1 234 5678" }, SAD);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const red = redovi<Record<string, unknown>>(baza, "SELECT * FROM reports WHERE id = ?", r.id)[0]!;
    expect(red).toMatchObject({ target_type: "campaign", target_id: idKampanje(K.aktivna), reason: "fraud", description: opis, reporter_email: "prijava@demo.invalid", status: "received", created_at: SAD.getTime() });
    expect(broj(baza, "SELECT count(*) FROM consents WHERE kind = 'report_gdpr' AND email = 'prijava@demo.invalid'")).toBe(1);
    const kasica = await spremiPrijavu(kaoD1(baza), { ...valjana, targetType: "moneybox", targetId: primjeri.kasica, reason: "spam" }, SAD);
    expect(kasica.ok).toBe(true);
  });
});
