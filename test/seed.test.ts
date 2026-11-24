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
import { demoSql } from "../scripts/seed.mjs";
import { SEED, broj, novaBaza, redovi } from "./pomoc/baza";

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
  it("je ažuran i deterministički: jednak demoSql()", () => {
    expect(readFileSync(SEED, "utf8")).toBe(demoSql());
    expect(demoSql()).toBe(demoSql());
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

  it("količine: ≥ 20 kampanja, 5 organizacija, 10 osoba", () => {
    expect(kampanje.length).toBeGreaterThanOrEqual(20);
    expect(broj(db, "SELECT count(*) FROM organizations")).toBe(5);
    expect(broj(db, "SELECT count(*) FROM organizers")).toBe(5);
    expect(broj(db, "SELECT count(*) FROM users")).toBe(10);
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
});
