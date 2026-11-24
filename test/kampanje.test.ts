import { describe, expect, it } from "vitest";
import { aktivneKampanje } from "../src/lib/db/kampanje";
import { broj, kaoD1, novaBaza, redovi } from "./pomoc/baza";

const db = novaBaza({ seed: true });

describe("aktivneKampanje() nad seedanom bazom", async () => {
  const sve = await aktivneKampanje(kaoD1(db), 1000);
  const ocekivano = redovi<{ public_id: string }>(
    db,
    `SELECT s.public_id FROM campaigns c JOIN campaign_settings s ON s.campaign_id = c.id
      WHERE c.state = 'active' AND c.visibility = 'public' AND c.deleted_at IS NULL
        AND s.blocked_at IS NULL AND s.paused_at IS NULL`,
  ).map((r) => r.public_id);

  it("vraća točno active + public, bez obrisanih, blokiranih i isključenih", () => {
    expect(ocekivano.length).toBeGreaterThan(10);
    expect(new Set(sve.map((k) => k.publicId))).toEqual(new Set(ocekivano));
    const iskljuceni = redovi<{ public_id: string }>(
      db,
      `SELECT s.public_id FROM campaigns c JOIN campaign_settings s ON s.campaign_id = c.id
        WHERE c.state != 'active' OR c.visibility != 'public' OR c.deleted_at IS NOT NULL
           OR s.blocked_at IS NOT NULL OR s.paused_at IS NOT NULL`,
    ).map((r) => r.public_id);
    expect(iskljuceni.length).toBeGreaterThanOrEqual(7);
    for (const id of iskljuceni) expect(sve.map((k) => k.publicId)).not.toContain(id);
  });

  it("poštuje limit i redoslijed po zadnjoj aktivnosti", async () => {
    const prvih = await aktivneKampanje(kaoD1(db), 5);
    expect(prvih.map((k) => k.publicId)).toEqual(sve.slice(0, 5).map((k) => k.publicId));
  });

  it("skriveni iznos i broj podržavatelja dolaze kao zastavice iz campaign_settings", () => {
    const skriveni = sve.filter((k) => k.hideRaised);
    expect(skriveni.length).toBeGreaterThan(0);
    const izBaze = broj(
      db,
      `SELECT count(*) FROM campaigns c JOIN campaign_settings s ON s.campaign_id = c.id
        WHERE c.state = 'active' AND c.visibility = 'public' AND c.deleted_at IS NULL
          AND s.blocked_at IS NULL AND s.paused_at IS NULL AND s.hide_raised = 1`,
    );
    expect(skriveni).toHaveLength(izBaze);
    expect(sve.some((k) => k.hideContributorCount)).toBe(true);
    // skriveni iznos i broj ne izlaze iz upita (ni u JSON-u)
    expect(skriveni.every((k) => k.raisedCents === null)).toBe(true);
    expect(sve.filter((k) => k.hideContributorCount).every((k) => k.contributorCount === null)).toBe(true);
    expect(sve.filter((k) => !k.hideRaised).every((k) => (k.raisedCents ?? 0) > 0)).toBe(true);
  });

  it("kartica: kategorija, organizator i demo oznaka", () => {
    for (const k of sve) {
      expect(k.categoryHr).toBeTruthy();
      expect(k.categoryEn).toBeTruthy();
      expect(k.organizerName).toBeTruthy();
      expect(k.organizationSlug).toMatch(/^demo-/);
      expect(k.demo).toBe(true);
      expect(k.currency).toBe("EUR");
    }
  });
});
