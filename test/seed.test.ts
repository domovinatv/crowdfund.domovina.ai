import { readFileSync } from "node:fs";
import {
  CAMPAIGN_MODES,
  CAMPAIGN_RAILS,
  CAMPAIGN_STATES,
  CAMPAIGN_TYPES,
  CONTRIBUTION_STATES,
  HOLDER_TYPES,
  PAYMENT_RAILS,
  RECURRENCES,
  TIER_KINDS,
  VERTICALS,
  VISIBILITIES,
  canAcceptContributions,
  isAddress,
  isOneOf,
  isUsableAddress,
  isValidThreshold,
  violatesConflictInvariant,
  violatesModeSigners,
  type CampaignState,
  type Visibility,
} from "@domovina/campaign-core";
import { describe, expect, it } from "vitest";
import { demoSql, sadSeeda } from "../scripts/seed.mjs";
import { DEMO_SAD, SEED, broj, novaBaza, redovi } from "./pomoc/baza";

const db = novaBaza({ seed: true });

interface Kampanja {
  id: string;
  type: string;
  state: CampaignState;
  visibility: Visibility;
  mode: "integrated" | "byo";
  rails: string;
  vertical: string;
  recurrence: string;
  demo: number;
  created_at: number;
  deleted_at: number | null;
  public_id: string;
  category_key: string;
  paused_at: number | null;
  blocked_at: number | null;
  address: `0x${string}`;
  chain_id: number;
  threshold: number;
  owners: string;
  platform_signer_count: number;
  verified_at: number | null;
}

const kampanje = redovi<Kampanja>(
  db,
  `SELECT c.*, s.public_id, s.category_key, s.paused_at, s.blocked_at,
          f.address, f.chain_id, f.threshold, f.owners, f.platform_signer_count, f.verified_at
     FROM campaigns c
     JOIN campaign_settings s ON s.campaign_id = c.id
     LEFT JOIN campaign_safes f ON f.campaign_id = c.id`,
);

describe("seed/demo.sql", () => {
  it("je ažuran i deterministički: jednak demoSql(DEMO_SAD) iz primjeri.json", () => {
    const sql = readFileSync(SEED, "utf8");
    expect(sql.split("\n", 1)[0]).toBe(`-- DEMO_SAD=${DEMO_SAD}`);
    expect(sql).toBe(demoSql(DEMO_SAD));
    expect(demoSql("2026-11-20")).toBe(demoSql("2026-11-20"));
  });

  it("„sad” seeda (odluka 532): DEMO_SAD iz okoline ili tekući UTC dan; vremena se pomiču za razliku dana", () => {
    expect(sadSeeda("2026-11-20")).toBe("2026-11-20");
    expect(sadSeeda(undefined, new Date(Date.UTC(2026, 11, 3, 23, 59)))).toBe("2026-12-03");
    expect(() => sadSeeda("20.11.2026.")).toThrow();
    const max = (dan: string) => {
      const d = novaBaza();
      d.exec(demoSql(dan));
      return broj(d, "SELECT max(ends_at) FROM campaigns");
    };
    // rok najkasnije kampanje pomiče se točno za razliku dana
    expect(max("2026-11-24") - max("2026-11-20")).toBe(4 * 86_400_000);
  });

  it("migracije + seed na praznoj bazi: FK provjera prazna", () => {
    expect(redovi(db, "PRAGMA foreign_key_check")).toEqual([]);
    expect(redovi(db, "PRAGMA integrity_check")).toEqual([{ integrity_check: "ok" }]);
  });

  it("idempotentan: drugi upis daje iste brojke", () => {
    const d2 = novaBaza({ seed: true });
    const prije = broj(d2, "SELECT count(*) FROM contributions");
    d2.exec(readFileSync(SEED, "utf8"));
    expect(broj(d2, "SELECT count(*) FROM contributions")).toBe(prije);
    expect(broj(d2, "SELECT count(*) FROM categories")).toBe(8);
    expect(redovi(d2, "PRAGMA foreign_key_check")).toEqual([]);
  });

  it("količine: ≥ 20 kampanja, 7 organizacija (jedna na čekanju S6, jedna osobna S8), 12 korisnika", () => {
    expect(kampanje.length).toBeGreaterThanOrEqual(20);
    expect(broj(db, "SELECT count(*) FROM organizations")).toBe(7);
    expect(broj(db, "SELECT count(*) FROM organizations WHERE kind = 'personal'")).toBe(1);
    expect(broj(db, "SELECT count(*) FROM organizations WHERE status = 'pending'")).toBe(1);
    expect(broj(db, "SELECT count(*) FROM organizers")).toBe(7);
    expect(broj(db, "SELECT count(*) FROM users")).toBe(12);
    expect(broj(db, "SELECT count(*) FROM contributions")).toBeGreaterThan(100);
    expect(broj(db, "SELECT count(*) FROM campaign_updates")).toBeGreaterThan(0);
    expect(broj(db, "SELECT count(*) FROM comments")).toBeGreaterThan(0);
  });

  it("pokriva sve tipove kampanje i svih 8 kategorija", () => {
    expect(new Set(kampanje.map((k) => k.type))).toEqual(new Set(CAMPAIGN_TYPES));
    const kategorije = redovi<{ key: string }>(db, "SELECT key FROM categories").map((r) => r.key);
    expect(kategorije).toHaveLength(8);
    expect(new Set(kampanje.map((k) => k.category_key))).toEqual(new Set(kategorije));
  });

  it("rubni slučajevi postoje: draft, review, closed, cancelled+obrisana, paused, blocked, unlisted, skriveni iznos", () => {
    const ima = (sql: string) => broj(db, `SELECT count(*) FROM campaigns c JOIN campaign_settings s ON s.campaign_id = c.id WHERE ${sql}`);
    expect(ima("c.state = 'active' AND c.visibility = 'public'")).toBeGreaterThan(kampanje.length / 2);
    for (const uvjet of [
      "c.state = 'draft'",
      "c.state = 'review'",
      "c.state = 'closed'",
      "c.state = 'cancelled' AND c.deleted_at IS NOT NULL",
      "s.paused_at IS NOT NULL",
      "s.blocked_at IS NOT NULL",
      "c.visibility = 'unlisted'",
      "s.hide_raised = 1",
      "s.hide_contributor_count = 1",
      "s.kind = 'for_organization'",
    ])
      expect(ima(uvjet), uvjet).toBeGreaterThan(0);
    expect(broj(db, "SELECT count(*) FROM contribution_profiles WHERE anonymous = 1")).toBeGreaterThan(0);
    expect(broj(db, "SELECT count(*) FROM contribution_attributions WHERE amount_hidden = 1")).toBeGreaterThan(0);
  });

  it("S5 javni dio: kasice, linkovi i posjeti, vanjske, praćenja, ponude, profili, postavke prikaza", () => {
    expect(broj(db, "SELECT count(*) FROM moneyboxes WHERE status = 'active'")).toBeGreaterThanOrEqual(5);
    expect(broj(db, "SELECT max(n) FROM (SELECT count(*) AS n FROM moneyboxes GROUP BY campaign_id)")).toBeGreaterThanOrEqual(2);
    expect(broj(db, "SELECT count(*) FROM moneyboxes WHERE alias NOT LIKE 'demo-%'")).toBe(0);
    expect(broj(db, "SELECT count(*) FROM tracking_links WHERE status = 'active'")).toBeGreaterThanOrEqual(3);
    expect(broj(db, "SELECT count(*) FROM tracking_links WHERE slug NOT LIKE 'demo-%'")).toBe(0);
    expect(broj(db, "SELECT count(*) FROM link_visits WHERE tracking_link_id IS NOT NULL")).toBeGreaterThan(5);
    expect(broj(db, "SELECT count(*) FROM link_visits WHERE visitor_hash NOT LIKE 'demo%'")).toBe(0);
    expect(broj(db, "SELECT count(*) FROM external_campaigns WHERE status = 'active'")).toBeGreaterThanOrEqual(2);
    expect(broj(db, "SELECT count(*) FROM external_campaigns WHERE url NOT LIKE 'https://4fund.invalid/zz%'")).toBe(0);
    expect(broj(db, "SELECT count(*) FROM campaign_follows")).toBeGreaterThanOrEqual(3);
    expect(broj(db, "SELECT count(*) FROM offers")).toBeGreaterThan(0);
    // atribucija kasice/linka i checkout se slažu
    expect(broj(db, `SELECT count(*) FROM contribution_attributions a JOIN checkouts k ON k.id = a.checkout_id
                      WHERE a.moneybox_id IS NOT k.moneybox_id OR a.tracking_link_id IS NOT k.tracking_link_id`)).toBe(0);
    expect(broj(db, "SELECT count(*) FROM contribution_attributions WHERE moneybox_id IS NOT NULL")).toBeGreaterThan(0);
    expect(broj(db, "SELECT count(*) FROM contribution_attributions WHERE tracking_link_id IS NOT NULL")).toBeGreaterThan(0);
    // profili: privatan (svih 9 prekidača isključeno) i barem dva javna
    const prekidaci = "show_email + show_avatar + show_phone + show_total_raised + show_registered_date + show_promoted + show_owned + show_donated + show_for_organization";
    expect(broj(db, `SELECT count(*) FROM user_settings WHERE ${prekidaci} = 0`)).toBeGreaterThanOrEqual(1);
    expect(broj(db, `SELECT count(*) FROM user_settings WHERE ${prekidaci} > 0`)).toBeGreaterThanOrEqual(2);
    // postavke prikaza i rok
    const ima = (sql: string) => broj(db, `SELECT count(*) FROM campaigns c JOIN campaign_settings s ON s.campaign_id = c.id WHERE ${sql}`);
    expect(ima("s.comments_mode = 'off'")).toBeGreaterThan(0);
    expect(ima("s.allow_moneyboxes = 0")).toBeGreaterThan(0);
    expect(ima("s.contributions_list = 'hidden'")).toBeGreaterThan(0);
    expect(ima("c.state = 'closed' AND (SELECT raised_cents FROM campaign_stats WHERE campaign_id = c.id) >= c.goal_cents")).toBeGreaterThan(0);
    expect(ima("c.state = 'active' AND c.ends_at BETWEEN 1795165200000 AND 1795165200000 + 7 * 86400000")).toBeGreaterThan(0);
    expect(broj(db, "SELECT count(*) FROM verifications WHERE kind = 'org_kyb' AND status != 'approved'")).toBeGreaterThan(0);
  });

  it("vrijednosti su iz skupova campaign-corea", () => {
    for (const k of kampanje) {
      expect(isOneOf(CAMPAIGN_TYPES, k.type), k.type).toBe(true);
      expect(isOneOf(CAMPAIGN_STATES, k.state), k.state).toBe(true);
      expect(isOneOf(VISIBILITIES, k.visibility)).toBe(true);
      expect(isOneOf(CAMPAIGN_MODES, k.mode)).toBe(true);
      expect(isOneOf(CAMPAIGN_RAILS, k.rails)).toBe(true);
      expect(isOneOf(VERTICALS, k.vertical)).toBe(true);
      expect(isOneOf(RECURRENCES, k.recurrence)).toBe(true);
    }
    const sve = (sql: string, skup: readonly string[]) => {
      for (const r of redovi<{ v: string }>(db, sql)) expect(isOneOf(skup, r.v), `${sql}: ${r.v}`).toBe(true);
    };
    sve("SELECT DISTINCT kind AS v FROM campaign_tiers", TIER_KINDS);
    sve("SELECT DISTINCT state AS v FROM contributions", CONTRIBUTION_STATES);
    sve("SELECT DISTINCT payment_rail AS v FROM contributions", PAYMENT_RAILS);
    sve("SELECT DISTINCT holder_type AS v FROM organizers", HOLDER_TYPES);
    // odluka 204: funded se u fazi 1 ne koristi
    expect(kampanje.some((k) => k.state === "funded")).toBe(false);
  });

  it("invarijante campaign-corea vrijede za svaki Safe (odluka 203: byo, 0 platformskih potpisnika)", () => {
    for (const k of kampanje) {
      const owners = JSON.parse(k.owners) as string[];
      expect(owners.every(isAddress), k.id).toBe(true);
      const safe = { address: k.address, threshold: k.threshold, owners: owners as `0x${string}`[], platform_signer_count: k.platform_signer_count, verified_at: k.verified_at };
      expect(isUsableAddress(k.address), k.id).toBe(true);
      expect(violatesConflictInvariant(safe), k.id).toBe(false);
      expect(violatesModeSigners(k.mode, safe), k.id).toBe(false);
      expect(isValidThreshold(safe), k.id).toBe(true);
      expect([100, 10200]).toContain(k.chain_id);

      const otvorena = k.state === "active" && k.paused_at === null && k.blocked_at === null && k.deleted_at === null;
      if (otvorena) expect(canAcceptContributions(k, safe), k.id).toBe(true);
      if (k.state === "draft" || k.state === "review") {
        expect(broj(db, "SELECT count(*) FROM contributions WHERE campaign_id = ?", k.id), k.id).toBe(0);
      }
      if (k.state === "draft") expect(canAcceptContributions(k, safe)).toBe(false);
    }
  });

  it("demo oznaka: campaigns.demo = 1, e-pošta @demo.invalid, slug demo-", () => {
    expect(kampanje.every((k) => k.demo === 1)).toBe(true);
    expect(broj(db, "SELECT count(*) FROM campaigns WHERE json_extract(metadata, '$.demo') IS NOT 1")).toBe(0);
    expect(broj(db, "SELECT count(*) FROM users WHERE email NOT LIKE '%@demo.invalid'")).toBe(0);
    expect(broj(db, "SELECT count(*) FROM organizers WHERE contact_email NOT LIKE '%@demo.invalid'")).toBe(0);
    expect(broj(db, "SELECT count(*) FROM checkouts WHERE email NOT LIKE '%@demo.invalid'")).toBe(0);
    expect(broj(db, "SELECT count(*) FROM organizations WHERE slug NOT LIKE 'demo-%'")).toBe(0);
  });

  it("ID-evi: UUIDv7 s vremenom zapisa, javni ID 6 znakova Crockford base32 (odluka 212)", () => {
    for (const k of kampanje) {
      expect(k.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      expect(parseInt(k.id.replace("-", "").slice(0, 12), 16)).toBe(k.created_at);
      expect(k.public_id).toMatch(/^[0-9abcdefghjkmnpqrstvwxyz]{6}$/);
    }
  });

  it("agregati su dosljedni doprinosima (campaign_stats, inventory_claimed)", () => {
    const razlike = redovi(
      db,
      `SELECT s.campaign_id
         FROM campaign_stats s
         LEFT JOIN (SELECT campaign_id,
                           sum(amount_received_cents) AS raised,
                           count(*) AS n,
                           count(DISTINCT payer_iban_hash) AS ljudi,
                           max(paid_at) AS zadnji
                      FROM contributions WHERE state = 'paid' GROUP BY campaign_id) d
           ON d.campaign_id = s.campaign_id
        WHERE s.raised_cents IS NOT coalesce(d.raised, 0)
           OR s.contribution_count IS NOT coalesce(d.n, 0)
           OR s.contributor_count IS NOT coalesce(d.ljudi, 0)
           OR s.last_contribution_at IS NOT d.zadnji`,
    );
    expect(razlike).toEqual([]);
    expect(broj(db, "SELECT count(*) FROM campaign_stats")).toBe(kampanje.length);
    expect(broj(db, "SELECT count(*) FROM campaign_stats WHERE contributor_count < contribution_count")).toBeGreaterThan(0);

    const zalihe = redovi(
      db,
      `SELECT t.id FROM campaign_tiers t
        WHERE t.inventory_claimed IS NOT (SELECT coalesce(sum(quantity), 0) FROM contributions c
                                           WHERE c.tier_id = t.id AND c.state IN ('paid', 'refunded'))
           OR (t.inventory_total IS NOT NULL AND t.inventory_claimed > t.inventory_total)`,
    );
    expect(zalihe).toEqual([]);
    // doprinos s razinom = cijena × količina; bez razine samo donacije
    expect(broj(db, `SELECT count(*) FROM contributions c JOIN campaign_tiers t ON t.id = c.tier_id
                      WHERE c.amount_cents != t.price_cents * c.quantity`)).toBe(0);
    expect(broj(db, `SELECT count(*) FROM contributions c JOIN campaigns k ON k.id = c.campaign_id
                      WHERE (c.tier_id IS NULL) != (k.type = 'donation')`)).toBe(0);
    // refundirani doprinosi imaju zapis povrata
    expect(broj(db, `SELECT count(*) FROM contributions c WHERE state = 'refunded'
                      AND NOT EXISTS (SELECT 1 FROM refunds r WHERE r.contribution_id = c.id)`)).toBe(0);
  });

  it("S8 faza 2 i usklađenje: ponude i licitacije, Founder's Offer, novosti razine, kampanja osobe, KYB, prijava", () => {
    const P = JSON.parse(readFileSync(new URL("../seed/primjeri.json", import.meta.url), "utf8")) as {
      ponuda: string; kampanja: Record<string, string>; prijavaModeracije: string;
    };
    // Ponude samo na kampanjama koje ih dopuštaju; barem 3 kampanje s aktivnim ponudama, aukcija i kupnja.
    expect(broj(db, `SELECT count(*) FROM offers o JOIN campaign_settings s ON s.campaign_id = o.campaign_id
                      WHERE s.allow_external_offers = 0`)).toBe(0);
    expect(broj(db, "SELECT count(DISTINCT campaign_id) FROM offers WHERE status = 'active'")).toBeGreaterThanOrEqual(3);
    expect(broj(db, "SELECT count(*) FROM offers WHERE status = 'active' AND mode = 'auction'")).toBeGreaterThanOrEqual(2);
    expect(broj(db, "SELECT count(*) FROM offers WHERE status = 'draft'")).toBeGreaterThanOrEqual(1);
    expect(broj(db, "SELECT count(*) FROM offers WHERE category IS NULL")).toBe(0);
    // Primjer ponude je aktivna aukcija s licitacijama; licitacije aukcije rastu i nisu ispod početne cijene.
    expect(redovi(db, "SELECT mode, status FROM offers WHERE id = ?", P.ponuda)).toEqual([{ mode: "auction", status: "active" }]);
    expect(broj(db, "SELECT count(*) FROM offer_bids WHERE offer_id = ?", P.ponuda)).toBeGreaterThanOrEqual(2);
    expect(broj(db, `SELECT count(*) FROM offer_bids b JOIN offers o ON o.id = b.offer_id
                      WHERE o.mode <> 'auction' OR b.amount_cents <= o.price_cents`)).toBe(0);
    // Founder's Offer: prihvaćen, prodavatelj verificiran (person_kyc approved) i nije član organizacije kampanje.
    const founder = redovi<{ seller_user_id: string; founder_status: string; campaign_id: string }>(
      db, "SELECT seller_user_id, founder_status, campaign_id FROM offers WHERE is_founder = 1");
    expect(founder.length).toBeGreaterThanOrEqual(1);
    for (const f of founder) {
      expect(f.founder_status).toBe("accepted");
      expect(broj(db, "SELECT count(*) FROM verifications WHERE kind = 'person_kyc' AND subject_id = ? AND status = 'approved'", f.seller_user_id)).toBe(1);
      expect(broj(db, `SELECT count(*) FROM memberships m JOIN organizations o ON o.id = m.organization_id
                        JOIN campaigns c ON c.organizer_id = o.organizer_id WHERE c.id = ? AND m.user_id = ?`, f.campaign_id, f.seller_user_id)).toBe(0);
    }
    // Novosti razine pripadaju razini iste kampanje.
    expect(broj(db, "SELECT count(*) FROM campaign_updates WHERE tier_id IS NOT NULL")).toBeGreaterThanOrEqual(2);
    expect(broj(db, `SELECT count(*) FROM campaign_updates u JOIN campaign_tiers t ON t.id = u.tier_id
                      WHERE t.campaign_id <> u.campaign_id`)).toBe(0);
    // Kampanja fizičke osobe: osobna organizacija, organizator `person`, autor verificiran, aktivna.
    const osobna = redovi(db, `SELECT o.kind, o.legal_form, g.holder_type, c.state,
                                  (SELECT status FROM verifications v WHERE v.kind = 'person_kyc' AND v.subject_id = c.created_by) AS kyc
                             FROM campaign_settings s JOIN campaigns c ON c.id = s.campaign_id JOIN organizers g ON g.id = c.organizer_id
                             JOIN organizations o ON o.organizer_id = g.id WHERE s.public_id = ?`, P.kampanja.osobna!);
    expect(osobna).toEqual([{ kind: "personal", legal_form: "osoba", holder_type: "person", state: "active", kyc: "approved" }]);
    // Aktivna organizacija ima odobren prvi KYB; Sunčani krov ima noviju provjeru u tijeku.
    expect(broj(db, `SELECT count(*) FROM organizations o WHERE o.status = 'active' AND o.kind = 'legal' AND NOT EXISTS
                      (SELECT 1 FROM verifications v WHERE v.kind = 'org_kyb' AND v.subject_id = o.id AND v.status = 'approved')`)).toBe(0);
    expect(redovi(db, `SELECT v.status, v.trigger FROM verifications v JOIN organizations o ON o.id = v.subject_id
                        WHERE o.slug = 'demo-suncani-krov' ORDER BY v.requested_at`)).toEqual([
      { status: "approved", trigger: "user" }, { status: "in_review", trigger: "risk" },
    ]);
    // Prijava s odlukom nije `in_review`; prijava bez odluke nije `decided`.
    expect(redovi(db, "SELECT status FROM reports WHERE id = ?", P.prijavaModeracije)).toEqual([{ status: "decided" }]);
    expect(broj(db, `SELECT count(*) FROM reports r WHERE (r.status IN ('decided','closed','appealed'))
                      != EXISTS (SELECT 1 FROM moderation_decisions d WHERE d.report_id = r.id)`)).toBe(0);
  });
});
