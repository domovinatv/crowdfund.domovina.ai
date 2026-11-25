/**
 * `potvrdiPovrat` i `contributor_count` (S8-B, popravak iz S6/S7): podržavatelj se oduzima samo ako nakon povrata
 * u kampanji nema drugog `paid` doprinosa istog podržavatelja (odluka 717: `payer_iban_hash`, e-pošta checkouta
 * bez obzira na veličinu slova, `user_id` checkouta). Nad seedanim SQLiteom, bez mreže.
 */
import { describe, expect, it } from "vitest";
import { potvrdiPovrat } from "../src/lib/db/financije";
import { kaoD1, novaBaza, redovi } from "./pomoc/baza";

type Doprinos = { id: string; campaign_id: string; payer_iban_hash: string; payment_intent_sid: string | null; amount_received_cents: number };

function okolina() {
  const sqlite = novaBaza({ seed: true });
  const db = kaoD1(sqlite);
  // Kampanja s barem 4 plaćena doprinosa kroz checkout (sid poznat), svaki s drugim platiteljem.
  const [kampanja] = redovi<{ campaign_id: string }>(
    sqlite,
    `SELECT campaign_id FROM contributions WHERE state = 'paid' AND payment_intent_sid IS NOT NULL
      GROUP BY campaign_id HAVING count(DISTINCT payer_iban_hash) >= 6 ORDER BY campaign_id LIMIT 1`,
  );
  const cid = kampanja!.campaign_id;
  const placeni = redovi<Doprinos>(
    sqlite,
    `SELECT id, campaign_id, payer_iban_hash, payment_intent_sid, amount_received_cents FROM contributions
      WHERE campaign_id = ? AND state = 'paid' AND payment_intent_sid IS NOT NULL ORDER BY id`,
    cid,
  );
  // Doprinosi kroz checkout čiji platitelj u kampanji nema drugog plaćenog doprinosa (ni kroz QR kampanje).
  const hashevi = redovi<{ h: string }>(sqlite, "SELECT payer_iban_hash AS h FROM contributions WHERE campaign_id = ? AND state = 'paid'", cid).map((r) => r.h);
  const jedini = placeni.filter((d) => hashevi.filter((h) => h === d.payer_iban_hash).length === 1);
  const user = redovi<{ id: string }>(sqlite, "SELECT id FROM users ORDER BY id LIMIT 1")[0]!.id;
  const stat = () =>
    sqlite.prepare("SELECT contributor_count AS n, contribution_count AS c FROM campaign_stats WHERE campaign_id = ?").get(cid) as { n: number; c: number };
  let i = 0;
  const povrat = async (d: Doprinos) => {
    const id = `test-povrat-${++i}`;
    sqlite
      .prepare(
        `INSERT INTO refunds (id, contribution_id, amount_cents, method, bank_reference, status, recorded_by, created_at)
         VALUES (?, ?, ?, 'bank_transfer', ?, 'recorded', ?, ?)`,
      )
      .run(id, d.id, d.amount_received_cents, `TEST-${i}`, user, Date.now());
    return potvrdiPovrat(db, cid, id, Date.now());
  };
  const checkout = (d: Doprinos, polja: { email?: string | null; user_id?: string | null }) => {
    for (const [k, v] of Object.entries(polja)) {
      sqlite.prepare(`UPDATE checkouts SET ${k} = ? WHERE contribution_sid = ?`).run(v ?? null, d.payment_intent_sid);
    }
  };
  return { sqlite, jedini, stat, povrat, checkout, user };
}

describe("potvrdiPovrat: contributor_count po pravilu 717", () => {
  it("jedini doprinos podržavatelja: povrat oduzima i podržavatelja", async () => {
    const o = okolina();
    const d = o.jedini[0]!;
    const prije = o.stat();
    expect(await o.povrat(d)).toBe(true);
    expect(o.stat()).toEqual({ n: prije.n - 1, c: prije.c - 1 });
  });

  it("isti payer_iban_hash ima drugi paid doprinos: podržavatelj ostaje; povrat i drugoga ga oduzima", async () => {
    const o = okolina();
    const [a, b] = o.jedini;
    o.sqlite.prepare("UPDATE contributions SET payer_iban_hash = ? WHERE id = ?").run(a!.payer_iban_hash, b!.id);
    o.sqlite.prepare("UPDATE campaign_stats SET contributor_count = contributor_count - 1").run(); // b više nije zaseban
    const prije = o.stat();
    expect(await o.povrat(a!)).toBe(true);
    expect(o.stat()).toEqual({ n: prije.n, c: prije.c - 1 });
    expect(await o.povrat({ ...b!, payer_iban_hash: a!.payer_iban_hash })).toBe(true);
    expect(o.stat()).toEqual({ n: prije.n - 1, c: prije.c - 2 });
  });

  it("ista e-pošta checkouta (druga velika slova), drugi IBAN: podržavatelj ostaje", async () => {
    const o = okolina();
    const [a, b] = o.jedini;
    o.checkout(a!, { email: "Ista.Osoba@demo.invalid", user_id: null });
    o.checkout(b!, { email: "ista.osoba@DEMO.invalid", user_id: null });
    const prije = o.stat();
    await o.povrat(a!);
    expect(o.stat()).toEqual({ n: prije.n, c: prije.c - 1 });
  });

  it("isti user_id checkouta, druga e-pošta i IBAN: podržavatelj ostaje", async () => {
    const o = okolina();
    const [a, b] = o.jedini;
    o.checkout(a!, { email: "prva@demo.invalid", user_id: o.user });
    o.checkout(b!, { email: "druga@demo.invalid", user_id: o.user });
    const prije = o.stat();
    await o.povrat(a!);
    expect(o.stat()).toEqual({ n: prije.n, c: prije.c - 1 });
  });

  it("drugi doprinos istog podržavatelja nije paid (pending): povrat oduzima podržavatelja", async () => {
    const o = okolina();
    const [a, b] = o.jedini;
    o.sqlite.prepare("UPDATE contributions SET payer_iban_hash = ?, state = 'pending' WHERE id = ?").run(a!.payer_iban_hash, b!.id);
    const prije = o.stat();
    await o.povrat(a!);
    expect(o.stat().n).toBe(prije.n - 1);
  });
});
