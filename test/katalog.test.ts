import { describe, expect, it } from "vitest";
import { brojaciNaslovnice, katalog, kategorije, urednickiIzbor, type FiltriKataloga } from "../src/lib/db/katalog";
import { REDOSLIJEDI, type Redoslijed } from "../src/lib/redoslijedi";
import { DAN, type PunaKartica } from "../src/lib/db/zajednicko";
import primjeri from "../seed/primjeri.json";
import { broj, kaoD1, novaBaza, redovi } from "./pomoc/baza";

const SAD = new Date(Date.UTC(2026, 10, 20, 9, 0, 0));
const T = SAD.getTime();
const sqlite = novaBaza({ seed: true });
const db = kaoD1(sqlite);

const U_KATALOGU = `c.state = 'active' AND c.visibility = 'public' AND c.deleted_at IS NULL
  AND s.blocked_at IS NULL AND s.paused_at IS NULL`;

interface Sirovo {
  id: string;
  public_id: string;
  created_at: number;
  objava: number;
  ends_at: number | null;
  raised: number;
  hide_raised: number;
  dan: number;
  novost: number | null;
  goal_cents: number | null;
  kind: string;
  category_key: string;
  verified: number;
}

const sirovo = redovi<Sirovo>(
  sqlite,
  `SELECT c.id, s.public_id, c.created_at, COALESCE(c.starts_at, c.created_at) AS objava, c.ends_at,
          COALESCE(st.raised_cents, 0) AS raised, s.hide_raised, c.goal_cents, s.kind, s.category_key,
          (SELECT COALESCE(SUM(amount_received_cents), 0) FROM contributions d
            WHERE d.campaign_id = c.id AND d.state = 'paid' AND d.paid_at >= ?) AS dan,
          (SELECT MAX(published_at) FROM campaign_updates u WHERE u.campaign_id = c.id AND u.deleted_at IS NULL) AS novost,
          COALESCE((SELECT v.status = 'approved' FROM organizations o JOIN verifications v
                     ON v.subject_id = o.id AND v.kind = 'org_kyb' WHERE o.organizer_id = c.organizer_id
                     ORDER BY v.requested_at DESC LIMIT 1), 0) AS verified
     FROM campaigns c JOIN campaign_settings s ON s.campaign_id = c.id
     LEFT JOIN campaign_stats st ON st.campaign_id = c.id
    WHERE ${U_KATALOGU}`,
  T - DAN,
);

const jednaki = (a: Sirovo, b: Sirovo) => b.created_at - a.created_at || (a.id < b.id ? -1 : 1);
const OCEKIVANO: Record<Redoslijed, (a: Sirovo, b: Sirovo) => number> = {
  most: (a, b) => a.hide_raised - b.hide_raised || (a.hide_raised ? 0 : b.raised - a.raised) || jednaki(a, b),
  least: (a, b) => a.hide_raised - b.hide_raised || (a.hide_raised ? 0 : a.raised - b.raised) || jednaki(a, b),
  popular: (a, b) => a.hide_raised - b.hide_raised || (a.hide_raised ? 0 : b.dan - a.dan) || jednaki(a, b),
  newest: (a, b) => b.objava - a.objava || jednaki(a, b),
  oldest: (a, b) => a.objava - b.objava || jednaki(a, b),
  ending: (a, b) => {
    const ka = a.ends_at === null || a.ends_at < T ? 1 : 0;
    const kb = b.ends_at === null || b.ends_at < T ? 1 : 0;
    return ka - kb || (ka ? 0 : a.ends_at! - b.ends_at!) || jednaki(a, b);
  },
  updated: (a, b) => (a.novost === null ? 1 : 0) - (b.novost === null ? 1 : 0) || (b.novost ?? 0) - (a.novost ?? 0) || jednaki(a, b),
};

/** Sve stranice kataloga za filtre. */
async function sveStranice(f: FiltriKataloga): Promise<PunaKartica[]> {
  const prva = await katalog(db, { ...f, page: 1 }, SAD);
  const sve = [...prva.kartice];
  for (let p = 2; p <= prva.ukupnoStranica; p++) sve.push(...(await katalog(db, { ...f, page: p }, SAD)).kartice);
  return sve;
}

describe("katalog()", () => {
  it("samo kampanje u katalogu: bez unlisted, isključenih, zatvorenih, draft, review, blokiranih i obrisanih", async () => {
    const r = await katalog(db, {}, SAD);
    expect(r.ukupno).toBe(sirovo.length);
    expect(r.ukupno).toBeGreaterThan(12);
    expect(r.sort).toBe("most");
    const ids = (await sveStranice({})).map((k) => k.publicId);
    expect(new Set(ids)).toEqual(new Set(sirovo.map((s) => s.public_id)));
    const k = primjeri.kampanja;
    for (const van of [k.unlisted, k.paused, k.zavrsena, k.draft404, k.review404, k.blokirana404, k.obrisana404]) {
      expect(ids).not.toContain(van);
    }
  });

  it("paginacija: 12 po stranici, bez preklapanja, stranica izvan raspona je prazna", async () => {
    const p1 = await katalog(db, { page: 1 }, SAD);
    const p2 = await katalog(db, { page: "2" }, SAD);
    expect(p1.poStranici).toBe(12);
    expect(p1.kartice).toHaveLength(12);
    expect(p1.ukupnoStranica).toBe(Math.ceil(sirovo.length / 12));
    expect(p2.stranica).toBe(2);
    const zajedno = [...p1.kartice, ...p2.kartice].map((x) => x.publicId);
    expect(new Set(zajedno).size).toBe(zajedno.length);
    expect((await katalog(db, { page: 99 }, SAD)).kartice).toEqual([]);
    expect((await katalog(db, { page: "nije-broj" }, SAD)).stranica).toBe(1);
    expect((await katalog(db, { page: -3 }, SAD)).stranica).toBe(1);
  });

  for (const sort of REDOSLIJEDI) {
    it(`redoslijed ${sort}: poredak jednak opisu iz odluke 501`, async () => {
      const dobiveno = (await sveStranice({ sort })).map((k) => k.publicId);
      const ocekivano = [...sirovo].sort(OCEKIVANO[sort]).map((s) => s.public_id);
      expect(dobiveno).toEqual(ocekivano);
    });
  }

  it("nevaljan redoslijed pada na zadani (most)", async () => {
    const r = await katalog(db, { sort: "bilo-sto" }, SAD);
    expect(r.sort).toBe("most");
    expect(r.kartice.map((k) => k.publicId)).toEqual((await katalog(db, { sort: "most" }, SAD)).kartice.map((k) => k.publicId));
  });

  it("skriveni iznos (406): null u kartici i na kraju u most, least i popular", async () => {
    for (const sort of ["most", "least", "popular"] as const) {
      const sve = await sveStranice({ sort });
      const skrivene = sve.filter((k) => k.hideRaised);
      expect(skrivene.length).toBeGreaterThan(0);
      expect(skrivene.every((k) => k.raisedCents === null && k.monthlyCents === null)).toBe(true);
      const prvaSkrivena = sve.findIndex((k) => k.hideRaised);
      expect(sve.slice(prvaSkrivena).every((k) => k.hideRaised), sort).toBe(true);
    }
    const sve = await sveStranice({});
    expect(sve.filter((k) => k.hideContributorCount).every((k) => k.contributorCount === null)).toBe(true);
  });

  it("kartica: vrsta, verifikacija, rok i dani do roka, tema, mjesečni iznos", async () => {
    const sve = await sveStranice({});
    const paketi = sve.find((k) => k.publicId === primjeri.kampanja.uskoroZavrsava)!;
    expect(paketi.daysLeft).toBe(3);
    expect(paketi.endsAt).toBe(T + 3 * DAN);
    const istekla = sve.find((k) => k.publicId === primjeri.kampanja.rokIstekaoUspjesna)!;
    expect(istekla.daysLeft).toBe(0);
    const mjesecna = sve.find((k) => k.publicId === primjeri.kampanja.mjesecna)!;
    expect(mjesecna.kind).toBe("recurring");
    expect(mjesecna.endsAt).toBeNull();
    expect(mjesecna.daysLeft).toBeNull();
    expect(mjesecna.monthlyCents).toBeGreaterThanOrEqual(0);
    expect(sve.filter((k) => k.kind === "one_time").every((k) => k.monthlyCents === null)).toBe(true);
    expect(sve.every((k) => k.coverTheme && k.state === "active")).toBe(true);
    expect(sve.some((k) => !k.verified) && sve.some((k) => k.verified)).toBe(true);
  });
});

describe("katalog(): filtri", () => {
  const ids = async (f: FiltriKataloga) => (await sveStranice(f)).map((k) => k.publicId).sort();
  const iz = (uvjet: (s: Sirovo) => boolean) => sirovo.filter(uvjet).map((s) => s.public_id).sort();

  it("q: naslov ili opis, bez obzira na veličinu slova (ASCII), LIKE znakovi su doslovni", async () => {
    expect(await ids({ q: "STERILIZACIJA" })).toHaveLength(1);
    expect(await ids({ q: "kud" })).toEqual(
      iz((s) => broj(sqlite, "SELECT count(*) FROM campaigns WHERE id = ? AND (title LIKE '%kud%' OR description LIKE '%kud%')", s.id) === 1),
    );
    expect((await ids({ q: "kud" })).length).toBeGreaterThan(1);
    expect(await ids({ q: "%" })).toEqual([]);
    expect(await ids({ q: "   " })).toHaveLength(sirovo.length);
  });

  it("category i type (jednokratna, mjesečna, za organizaciju); nevaljan type se ignorira", async () => {
    expect(await ids({ category: "animals" })).toEqual(iz((s) => s.category_key === "animals"));
    for (const type of ["one_time", "recurring", "for_organization"]) {
      const r = await ids({ type });
      expect(r.length, type).toBeGreaterThan(0);
      expect(r).toEqual(iz((s) => s.kind === type));
    }
    expect(await ids({ type: "nesto" })).toHaveLength(sirovo.length);
  });

  it("verified: samo organizacije s odobrenim KYB-om", async () => {
    const r = await ids({ verified: true });
    expect(r).toEqual(iz((s) => s.verified === 1));
    expect(r.length).toBeLessThan(sirovo.length);
  });

  it("moneyboxes: kampanje s aktivnom kasicom koje dopuštaju kasice", async () => {
    const r = await ids({ moneyboxes: true });
    expect(r).toEqual(iz((s) => broj(sqlite, "SELECT count(*) FROM moneyboxes WHERE campaign_id = ? AND status = 'active'", s.id) > 0));
    expect(r).toContain(primjeri.kampanja.aktivna);
    expect(r.length).toBeGreaterThan(2);
  });

  it("ending: rok u sljedećih 7 dana", async () => {
    const r = await ids({ ending: true });
    expect(r).toEqual(iz((s) => s.ends_at !== null && s.ends_at >= T && s.ends_at <= T + 7 * DAN));
    expect(r).toContain(primjeri.kampanja.uskoroZavrsava);
  });

  it("successful: prikupljeno ≥ cilj, bez kampanja sa skrivenim iznosom", async () => {
    const r = await ids({ successful: true });
    expect(r).toEqual(iz((s) => s.hide_raised === 0 && s.goal_cents !== null && s.raised >= s.goal_cents));
    expect(r).toContain(primjeri.kampanja.rokIstekaoUspjesna);
  });

  it("near: tekstualno po mjestu kampanje ili gradu organizatora", async () => {
    const r = await ids({ near: "Varaždin" });
    expect(r.length).toBeGreaterThan(0);
    expect(r).toEqual(iz((s) => broj(sqlite, "SELECT count(*) FROM campaigns WHERE id = ? AND location_name = 'Varaždin'", s.id) === 1));
  });

  it("filtri se kombiniraju (AND) i ukupno odgovara karticama", async () => {
    const r = await katalog(db, { category: "animals", type: "one_time", sort: "newest" }, SAD);
    expect(r.ukupno).toBe(r.kartice.length);
    expect(r.kartice.every((k) => k.categoryKey === "animals" && k.kind === "one_time")).toBe(true);
  });
});

describe("kategorije(), brojaciNaslovnice(), urednickiIzbor()", () => {
  it("kategorije: svih 8 redom, zbroj aktivnih = katalog", async () => {
    const k = await kategorije(db);
    expect(k.map((x) => x.key)).toEqual(["charity", "culture", "projects", "needs", "sport", "animals", "travel", "other"]);
    expect(k.reduce((a, x) => a + x.brojAktivnih, 0)).toBe(sirovo.length);
    expect(k[0]).toMatchObject({ nameHr: "Dobrotvorno", nameEn: "Charity" });
  });

  it("brojači: aktivne, plaćeni doprinosi, prikupljeno bez skrivenih iznosa, zadnjih 30 dana", async () => {
    const b = await brojaciNaslovnice(db, SAD);
    const vidljiva = `c.state IN ('active','closed') AND c.visibility IN ('public','unlisted') AND c.deleted_at IS NULL AND s.blocked_at IS NULL`;
    expect(b.aktivnihKampanja).toBe(sirovo.length);
    expect(b.placenihDoprinosa).toBe(broj(sqlite, `SELECT count(*) FROM contributions d JOIN campaigns c ON c.id = d.campaign_id
      JOIN campaign_settings s ON s.campaign_id = c.id WHERE d.state = 'paid' AND ${vidljiva}`));
    expect(b.prikupljenoCents).toBe(broj(sqlite, `SELECT sum(st.raised_cents) FROM campaigns c JOIN campaign_settings s ON s.campaign_id = c.id
      JOIN campaign_stats st ON st.campaign_id = c.id WHERE s.hide_raised = 0 AND ${vidljiva}`));
    expect(b.doprinosaZadnjih30Dana).toBe(broj(sqlite, `SELECT count(*) FROM contributions d JOIN campaigns c ON c.id = d.campaign_id
      JOIN campaign_settings s ON s.campaign_id = c.id WHERE d.state = 'paid' AND d.paid_at >= ? AND ${vidljiva}`, T - 30 * DAN));
    expect(b.doprinosaZadnjih30Dana).toBeGreaterThan(0);
    expect(b.doprinosaZadnjih30Dana).toBeLessThan(b.placenihDoprinosa);
  });

  it("urednički izbor: verificirani organizator, u katalogu, s opisom, po prikupljenom", async () => {
    const r = await urednickiIzbor(db, 6, SAD);
    expect(r).toHaveLength(6);
    expect(r.every((k) => k.verified)).toBe(true);
    const vidljivi = r.filter((k) => !k.hideRaised).map((k) => k.raisedCents!);
    expect(vidljivi).toEqual([...vidljivi].sort((a, b) => b - a));
    const ocekivano = sirovo.filter((s) => s.verified === 1).sort(OCEKIVANO.most).slice(0, 6).map((s) => s.public_id);
    expect(r.map((k) => k.publicId)).toEqual(ocekivano);
  });
});
