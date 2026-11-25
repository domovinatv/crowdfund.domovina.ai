/**
 * Uplata kroz MPT (S7, odluke 705–708): webhook i pull idu istim putem (`src/lib/db/uplate.ts`), bez mreže
 * (dvojnik raila `test/pomoc/mpt-dvojnik.ts`), nad seedanim SQLiteom.
 */
import type { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it } from "vitest";
import { noviSid, stvoriIntent } from "../src/lib/mpt/klijent";
import { obradiSimulaciju, obradiWebhook, odgovorStanja } from "../src/lib/mpt/obrada";
import { dogadajIzIntenta, hashIbana, primijeniDogadaj, stanjeCheckouta, uskladiCheckout, uskladiIntent, type StanjeCheckouta } from "../src/lib/db/uplate";
import { broj, kaoD1, novaBaza, redovi } from "./pomoc/baza";
import { IBAN_TESTA, TAJNA_TESTA, dvojnikMpt, type DvojnikMpt } from "./pomoc/mpt-dvojnik";

let sqlite: DatabaseSync;
let db: D1Database;
let dv: DvojnikMpt;
let kampanja: string;

beforeEach(() => {
  sqlite = novaBaza({ seed: true });
  db = kaoD1(sqlite);
  dv = dvojnikMpt();
  kampanja = (sqlite.prepare(
    `SELECT c.id FROM campaigns c JOIN campaign_stats st ON st.campaign_id = c.id WHERE c.state = 'active' ORDER BY c.id LIMIT 1`,
  ).get() as { id: string }).id;
});

interface Uplata {
  sid: string;
  checkoutId: string;
  doprinosId: string;
  napojnicaSid: string | null;
}

async function novaUplata(o: { email?: string; userId?: string | null; iznos?: number; napojnica?: number } = {}): Promise<Uplata> {
  const sad = Date.now();
  const iznos = o.iznos ?? 2500;
  const sid = noviSid();
  await stvoriIntent(dv.konfig, { sid, targetAddress: "0x0000000000000000000000000000000000000001", amountCents: iznos }, dv.dohvat);
  const checkoutId = `chk-${sid}`;
  const doprinosId = `dop-${sid}`;
  sqlite
    .prepare(
      `INSERT INTO checkouts (id, campaign_id, contribution_sid, amount_cents, tip_cents, user_id, email, expires_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(checkoutId, kampanja, sid, iznos, o.napojnica ?? 0, o.userId ?? null, o.email ?? "ana@example.org", sad + 86_400_000, sad, sad);
  sqlite
    .prepare(
      `INSERT INTO contributions (id, campaign_id, quantity, amount_cents, currency, state, payment_rail, payment_intent_sid, underpaid, created_at, updated_at)
       VALUES (?, ?, 1, ?, 'EUR', 'pending', 'sepa', ?, 0, ?, ?)`,
    )
    .run(doprinosId, kampanja, iznos, sid, sad, sad);
  sqlite.prepare("INSERT INTO contribution_attributions (contribution_id, checkout_id, source) VALUES (?, ?, 'checkout')").run(doprinosId, checkoutId);
  let napojnicaSid: string | null = null;
  if (o.napojnica) {
    napojnicaSid = noviSid();
    await stvoriIntent(dv.konfig, { sid: napojnicaSid, targetAddress: dv.konfig.tipTarget, amountCents: o.napojnica }, dv.dohvat);
    sqlite
      .prepare("INSERT INTO tips (id, checkout_id, sid, amount_cents, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run(`tip-${napojnicaSid}`, checkoutId, napojnicaSid, o.napojnica, sad, sad);
  }
  return { sid, checkoutId, doprinosId, napojnicaSid };
}

const stats = () =>
  sqlite.prepare("SELECT raised_cents, contribution_count, contributor_count FROM campaign_stats WHERE campaign_id = ?").get(kampanja) as {
    raised_cents: number;
    contribution_count: number;
    contributor_count: number;
  };
const doprinos = (id: string) =>
  sqlite.prepare("SELECT state, amount_received_cents, underpaid, paid_at, payer_iban_hash FROM contributions WHERE id = ?").get(id) as {
    state: string;
    amount_received_cents: number | null;
    underpaid: number;
    paid_at: number | null;
    payer_iban_hash: string | null;
  };
const stanjeIntenta = (checkoutId: string) =>
  (sqlite.prepare("SELECT intent_state FROM checkouts WHERE id = ?").get(checkoutId) as { intent_state: string }).intent_state;
const dogadaji = (id: string) => broj(sqlite, "SELECT count(*) FROM contribution_events WHERE contribution_id = ?", id);

/** Isporuči webhookove (klonove, da se isti zahtjev može poslati opet). */
async function isporuci(zahtjevi: Request[]): Promise<{ status: number; ishod: string }[]> {
  const out = [];
  for (const z of zahtjevi) {
    const r = await obradiWebhook(z.clone() as unknown as Request, db, TAJNA_TESTA, Date.now());
    out.push({ status: r.status, ishod: ((await r.json()) as { ishod?: string }).ishod ?? "" });
  }
  return out;
}

describe("webhook: intent.paid", () => {
  it("received pa paid: doprinos paid, statistika jednom, checkout paid, IBAN samo kao hash", async () => {
    const u = await novaUplata();
    const prije = stats();
    const wh = await dv.simuliraj(u.sid, "paid");
    expect(wh.map((z) => z.headers.get("webhook-id")!.split("_")[0])).toEqual(["rcv", "int"]);
    expect(await isporuci(wh)).toEqual([
      { status: 200, ishod: "bez_promjene" },
      { status: 200, ishod: "primijenjeno" },
    ]);
    const d = doprinos(u.doprinosId);
    expect(d).toMatchObject({ state: "paid", amount_received_cents: 2500, underpaid: 0 });
    expect(d.paid_at).toBeGreaterThan(0);
    expect(d.payer_iban_hash).toBe(await hashIbana(IBAN_TESTA));
    expect(d.payer_iban_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(stats()).toEqual({
      raised_cents: prije.raised_cents + 2500,
      contribution_count: prije.contribution_count + 1,
      contributor_count: prije.contributor_count + 1,
    });
    expect(stanjeIntenta(u.checkoutId)).toBe("paid");
    expect(dogadaji(u.doprinosId)).toBe(2);
    expect(broj(sqlite, "SELECT count(*) FROM webhook_receipts WHERE sid = ? AND processed_at IS NOT NULL AND error IS NULL", u.sid)).toBe(2);
    // Sirovi IBAN nigdje u bazi.
    const sve = JSON.stringify([
      ...redovi(sqlite, "SELECT * FROM contributions WHERE id = ?", u.doprinosId),
      ...redovi(sqlite, "SELECT * FROM contribution_events WHERE contribution_id = ?", u.doprinosId),
      ...redovi(sqlite, "SELECT * FROM webhook_receipts WHERE sid = ?", u.sid),
    ]);
    expect(sve).not.toContain(IBAN_TESTA);
  });

  it("ponovljeni webhook (isti webhook-id): 200 bez upisa, bez dupliciranja doprinosa i statistike", async () => {
    const u = await novaUplata();
    const wh = await dv.simuliraj(u.sid, "paid");
    await isporuci(wh);
    const s1 = stats();
    const e1 = dogadaji(u.doprinosId);
    expect(await isporuci(wh)).toEqual([
      { status: 200, ishod: "duplikat" },
      { status: 200, ishod: "duplikat" },
    ]);
    expect(stats()).toEqual(s1);
    expect(dogadaji(u.doprinosId)).toBe(e1);
    expect(broj(sqlite, "SELECT count(*) FROM webhook_receipts WHERE sid = ?", u.sid)).toBe(2);
  });

  it("webhook pa pull istog intenta ne duplicira; pull pa webhook isto", async () => {
    const a = await novaUplata();
    await isporuci(await dv.simuliraj(a.sid, "paid"));
    const s1 = stats();
    const e1 = dogadaji(a.doprinosId);
    await uskladiIntent(db, dv.konfig, a.sid, dv.dohvat);
    await uskladiIntent(db, dv.konfig, a.sid, dv.dohvat);
    expect(stats()).toEqual(s1);
    expect(dogadaji(a.doprinosId)).toBe(e1);

    const b = await novaUplata({ email: "bruno@example.org" });
    const wh = await dv.simuliraj(b.sid, "paid");
    await uskladiIntent(db, dv.konfig, b.sid, dv.dohvat);
    const s2 = stats();
    expect(s2.raised_cents).toBe(s1.raised_cents + 2500);
    expect(doprinos(b.doprinosId).state).toBe("paid");
    expect(await isporuci(wh)).toEqual([
      { status: 200, ishod: "bez_promjene" },
      { status: 200, ishod: "bez_promjene" },
    ]);
    expect(stats()).toEqual(s2);
  });

  it("paralelni webhook i pull: statistika točno jednom", async () => {
    const u = await novaUplata();
    const prije = stats();
    const wh = await dv.simuliraj(u.sid, "paid");
    await Promise.all([isporuci(wh), uskladiIntent(db, dv.konfig, u.sid, dv.dohvat), uskladiIntent(db, dv.konfig, u.sid, dv.dohvat)]);
    expect(stats().contribution_count).toBe(prije.contribution_count + 1);
    expect(stats().raised_cents).toBe(prije.raised_cents + 2500);
  });

  it("contributor_count: ista e-pošta (druga velika slova) ili isti IBAN = isti podržavatelj, druga e-pošta = novi", async () => {
    const prije = stats();
    for (const email of ["ana@example.org", "ANA@Example.org"]) {
      const u = await novaUplata({ email });
      await isporuci(await dv.simuliraj(u.sid, "paid"));
    }
    // Dvojnik šalje isti IBAN za sve uplate, pa je i treća (druga e-pošta) isti podržavatelj po IBAN-u.
    const c = await novaUplata({ email: "cvijeta@example.org" });
    await isporuci(await dv.simuliraj(c.sid, "paid"));
    expect(stats().contribution_count).toBe(prije.contribution_count + 3);
    expect(stats().contributor_count).toBe(prije.contributor_count + 1);
    // Bez IBAN-a (pull ga ne nosi): druga e-pošta je novi podržavatelj.
    const d = await novaUplata({ email: "dora@example.org" });
    await dv.simuliraj(d.sid, "paid");
    await uskladiIntent(db, dv.konfig, d.sid, dv.dohvat);
    expect(stats().contributor_count).toBe(prije.contributor_count + 2);
  });
});

describe("underpaid, late, rejected, expired", () => {
  it("underpaid: doprinos paid s primljenim iznosom i underpaid=1, checkout underpaid; istek → underpaid_expired bez nove statistike", async () => {
    const u = await novaUplata({ iznos: 3000 });
    const prije = stats();
    const wh = await dv.simuliraj(u.sid, "underpaid");
    expect(wh.map((z) => z.headers.get("webhook-id")!.split("_")[0])).toEqual(["rcv", "undp"]);
    await isporuci(wh);
    expect(doprinos(u.doprinosId)).toMatchObject({ state: "paid", amount_received_cents: 2900, underpaid: 1 });
    expect(stanjeIntenta(u.checkoutId)).toBe("underpaid");
    expect(stats().raised_cents).toBe(prije.raised_cents + 2900);
    // Pull dok je intent pending s manjkom: ništa novo.
    await uskladiIntent(db, dv.konfig, u.sid, dv.dohvat);
    const s1 = stats();
    dv.istekni(u.sid);
    const st = await uskladiCheckout(db, dv.konfig, u.checkoutId, dv.dohvat);
    expect(st?.checkout.state).toBe("underpaid_expired");
    expect(st?.doprinos).toMatchObject({ state: "paid", faza: "settled" });
    expect(stats()).toEqual(s1);
  });

  it("underpaid samo iz pulla (bez webhooka): isto stanje", async () => {
    const u = await novaUplata({ iznos: 3000 });
    const prije = stats();
    await dv.simuliraj(u.sid, "underpaid");
    await uskladiIntent(db, dv.konfig, u.sid, dv.dohvat);
    expect(doprinos(u.doprinosId)).toMatchObject({ state: "paid", amount_received_cents: 2900, underpaid: 1 });
    expect(stanjeIntenta(u.checkoutId)).toBe("underpaid");
    expect(stats().raised_cents).toBe(prije.raised_cents + 2900);
  });

  it("late: doprinos paid, checkout late, statistika broji iznos; pull poslije ne mijenja ništa", async () => {
    const u = await novaUplata();
    const prije = stats();
    const wh = await dv.simuliraj(u.sid, "late");
    expect(wh.map((z) => z.headers.get("webhook-id")!.split("_")[0])).toEqual(["rcv", "late"]);
    await isporuci(wh);
    expect(doprinos(u.doprinosId)).toMatchObject({ state: "paid", amount_received_cents: 2500, underpaid: 0 });
    expect(stanjeIntenta(u.checkoutId)).toBe("late");
    expect(stats().raised_cents).toBe(prije.raised_cents + 2500);
    const s1 = stats();
    await uskladiIntent(db, dv.konfig, u.sid, dv.dohvat);
    expect(stats()).toEqual(s1);
  });

  it("expired pa late: istek (pull) → expired bez statistike, kasna uplata → paid i late", async () => {
    const u = await novaUplata();
    const prije = stats();
    dv.istekni(u.sid);
    await uskladiIntent(db, dv.konfig, u.sid, dv.dohvat);
    await uskladiIntent(db, dv.konfig, u.sid, dv.dohvat);
    expect(doprinos(u.doprinosId).state).toBe("expired");
    expect(stanjeIntenta(u.checkoutId)).toBe("expired");
    expect(dogadaji(u.doprinosId)).toBe(1);
    expect(stats()).toEqual(prije);
    await isporuci(await dv.simuliraj(u.sid, "late"));
    expect(doprinos(u.doprinosId).state).toBe("paid");
    expect(stanjeIntenta(u.checkoutId)).toBe("late");
    expect(stats().raised_cents).toBe(prije.raised_cents + 2500);
  });

  it("rejected: doprinos failed, checkout rejected, statistika netaknuta; ponovljeni pull idempotentan", async () => {
    const u = await novaUplata();
    const prije = stats();
    const wh = await dv.simuliraj(u.sid, "rejected");
    expect(wh.map((z) => z.headers.get("webhook-id")!.split("_")[0])).toEqual(["rcv", "rej"]);
    await isporuci(wh);
    expect(doprinos(u.doprinosId).state).toBe("failed");
    expect(stanjeIntenta(u.checkoutId)).toBe("rejected");
    const e1 = dogadaji(u.doprinosId);
    await uskladiIntent(db, dv.konfig, u.sid, dv.dohvat);
    expect(dogadaji(u.doprinosId)).toBe(e1);
    expect(stats()).toEqual(prije);
  });
});

describe("napojnica, nepoznat sid, ostale vrste", () => {
  it("napojnica paid: samo tips, doprinos i statistika netaknuti", async () => {
    const u = await novaUplata({ napojnica: 200 });
    const prije = stats();
    await isporuci(await dv.simuliraj(u.napojnicaSid!, "paid"));
    expect(sqlite.prepare("SELECT intent_state, amount_received_cents FROM tips WHERE sid = ?").get(u.napojnicaSid)).toEqual({
      intent_state: "paid",
      amount_received_cents: 200,
    });
    expect(doprinos(u.doprinosId).state).toBe("pending");
    expect(stanjeIntenta(u.checkoutId)).toBe("open");
    expect(stats()).toEqual(prije);
    expect(dogadaji(u.doprinosId)).toBe(0);
  });

  it("nepoznat sid: 200 i zapis greške u webhook_receipts", async () => {
    const tudi = dvojnikMpt();
    await stvoriIntent(tudi.konfig, { sid: "nepoznatSid01", targetAddress: "0x1", amountCents: 500 }, tudi.dohvat);
    const prije = stats();
    expect(await isporuci(await tudi.simuliraj("nepoznatSid01", "paid"))).toEqual([
      { status: 200, ishod: "nepoznat_sid" },
      { status: 200, ishod: "nepoznat_sid" },
    ]);
    expect(redovi(sqlite, "SELECT event_type, error FROM webhook_receipts WHERE sid = 'nepoznatSid01' ORDER BY event_type")).toEqual([
      { event_type: "intent.paid", error: "nepoznat_sid" },
      { event_type: "payment.received", error: "nepoznat_sid" },
    ]);
    expect(stats()).toEqual(prije);
  });

  it("forward.blocked i contribution.sepa: samo zapis, bez doprinosa", async () => {
    const u = await novaUplata();
    for (const [vrsta, id] of [["forward.blocked", "blk_o1"], ["contribution.sepa", "cmp_o2"]] as const) {
      const r = await primijeniDogadaj(
        db,
        { vrsta, webhookId: id, sid: u.sid, moneriumOrderId: id.slice(4), primljenoCenti: 2500, placenoU: null, senderIban: null, faza: null },
        Date.now(),
      );
      expect(r.ishod).toBe("zabiljezeno");
    }
    expect(doprinos(u.doprinosId).state).toBe("pending");
    expect(broj(sqlite, "SELECT count(*) FROM webhook_receipts WHERE webhook_id IN ('blk_o1','cmp_o2') AND processed_at IS NOT NULL")).toBe(2);
  });

  it("dogadajIzIntenta: received_processing nema događaj, paid nakon isteka je late", () => {
    const osnova = dv.intent("x");
    expect(osnova).toBeNull();
    const i = {
      sid: "s", state: "pending", amountCents: 100, amountReceivedCents: null, memo: "", iban: null, beneficiaryName: null, bic: null,
      epcQrData: null, hub3Data: null, shortRef: null, targetAddress: "", checkoutUrl: null, statusUrl: null, statusStreamUrl: null,
      simulateUrl: null, sandbox: true, createdAt: 0, expiresAt: 1000, paidAt: null, stage: "received_processing", amountMismatch: null, metadata: null,
    } as const;
    expect(dogadajIzIntenta(i)).toBeNull();
    expect(dogadajIzIntenta({ ...i, state: "paid", paidAt: 2000 })?.vrsta).toBe("payment.late");
    expect(dogadajIzIntenta({ ...i, state: "paid", paidAt: 500 })?.vrsta).toBe("intent.paid");
    expect(dogadajIzIntenta({ ...i, stage: "rejected" })?.vrsta).toBe("payment.rejected");
    expect(dogadajIzIntenta({ ...i, state: "expired", stage: "expired" })?.vrsta).toBe("intent.expired");
  });
});

describe("rute: webhook, events, simulate", () => {
  it("webhook: 401 bez/krivog potpisa, 400 za tijelo koje nije JSON, 503 bez tajne", async () => {
    const z = (h: Record<string, string>, tijelo = "{}") => new Request("http://localhost/webhooks/mpt", { method: "POST", headers: h, body: tijelo });
    expect((await obradiWebhook(z({}), db, TAJNA_TESTA)).status).toBe(401);
    const [pravi] = await dv.simuliraj((await novaUplata()).sid, "received");
    const h = Object.fromEntries(pravi!.headers);
    expect((await obradiWebhook(z(h, "{\"type\":\"intent.paid\"}"), db, TAJNA_TESTA)).status).toBe(401);
    const { potpisanaZaglavlja } = await import("../src/lib/mpt/potpis");
    const r400 = await obradiWebhook(z(await potpisanaZaglavlja(TAJNA_TESTA, "x_1", "nije json"), "nije json"), db, TAJNA_TESTA);
    expect(r400.status).toBe(400);
    const r503 = await obradiWebhook(pravi!.clone() as unknown as Request, db, "");
    expect(r503.status).toBe(503);
    expect(r503.headers.get("Cache-Control")).toBe("no-store");
    expect(broj(sqlite, "SELECT count(*) FROM webhook_receipts")).toBe(0);
  });

  it("events: 404 za nepoznat checkout; bez konfiguracije stanje iz baze; s konfiguracijom faza s raila", async () => {
    expect((await odgovorStanja(db, dv.konfig, "nema", dv.dohvat)).status).toBe(404);
    const u = await novaUplata({ napojnica: 100 });
    const bez = await odgovorStanja(db, null, u.checkoutId);
    expect(bez.headers.get("Cache-Control")).toBe("no-store");
    expect(await bez.json()).toEqual({
      checkout: { id: u.checkoutId, state: "open" },
      doprinos: { sid: u.sid, state: "pending", faza: null },
      napojnica: { sid: u.napojnicaSid!, state: "open", faza: null },
    } satisfies StanjeCheckouta);
    await dv.simuliraj(u.sid, "received");
    const s = (await (await odgovorStanja(db, dv.konfig, u.checkoutId, dv.dohvat)).json()) as StanjeCheckouta;
    expect(s.doprinos).toEqual({ sid: u.sid, state: "pending", faza: "received_processing" });
    expect(s.napojnica?.faza).toBe("awaiting_payment");
    await dv.simuliraj(u.sid, "paid");
    const p = (await (await odgovorStanja(db, dv.konfig, u.checkoutId, dv.dohvat)).json()) as StanjeCheckouta;
    expect(p.checkout.state).toBe("paid");
    expect(p.doprinos).toEqual({ sid: u.sid, state: "paid", faza: "settled" });
    // Završno stanje: drugi poziv ne ide na rail za doprinos.
    const n = dv.pozivi.filter((x) => x === `GET /v1/intents/${u.sid}`).length;
    await odgovorStanja(db, dv.konfig, u.checkoutId, dv.dohvat);
    expect(dv.pozivi.filter((x) => x === `GET /v1/intents/${u.sid}`).length).toBe(n);
  });

  it("events: greška raila ne ruši odgovor (stanje iz baze)", async () => {
    const u = await novaUplata();
    const pada = (async () => {
      throw new Error("mreža");
    }) as unknown as typeof fetch;
    const r = await odgovorStanja(db, dv.konfig, u.checkoutId, pada);
    expect(r.status).toBe(200);
    expect(((await r.json()) as StanjeCheckouta).checkout.state).toBe("open");
  });

  it("simulate: JSON paid → stanje paid; napojnica; drugi put 409; nevaljan ishod 400; nesandbox 404", async () => {
    const u = await novaUplata({ napojnica: 500 });
    const post = (tijelo: unknown, k = dv.konfig) =>
      obradiSimulaciju(
        new Request(`http://localhost/api/checkouts/${u.checkoutId}/simulate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(tijelo) }),
        db, k, u.checkoutId, dv.dohvat,
      );
    expect((await post({ ishod: "x" })).status).toBe(400);
    expect((await post({ ishod: "paid" }, { ...dv.konfig, secretKey: "sk_live_x" })).status).toBe(404);
    expect((await post({ ishod: "paid" }, null as never)).status).toBe(404);
    const r = await post({ ishod: "paid" });
    expect(r.status).toBe(200);
    expect(((await r.json()) as StanjeCheckouta).checkout.state).toBe("paid");
    const t = (await (await post({ ishod: "paid", cilj: "napojnica" })).json()) as StanjeCheckouta;
    expect(t.napojnica).toMatchObject({ state: "paid", faza: "settled" });
    const opet = await post({ ishod: "paid" });
    expect(opet.status).toBe(409);
    expect(((await opet.json()) as { greska: string }).greska).toBe("already_settled");
    expect((await obradiSimulaciju(new Request("http://localhost/x", { method: "POST" }), db, dv.konfig, "nema", dv.dohvat)).status).toBe(404);
  });

  it("simulate: obrazac s Refererom istog origina → 303 natrag; tuđi Referer → JSON", async () => {
    const u = await novaUplata();
    const obrazac = (referer: string) =>
      obradiSimulaciju(
        new Request(`http://localhost/api/checkouts/${u.checkoutId}/simulate`, {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded", referer },
          body: new URLSearchParams({ ishod: "received" }),
        }),
        db, dv.konfig, u.checkoutId, dv.dohvat,
      );
    const r = await obrazac("http://localhost/hr/abc234/podrzi/x?y=1");
    expect(r.status).toBe(303);
    expect(r.headers.get("Location")).toBe("/hr/abc234/podrzi/x?y=1");
    const tudi = await obrazac("https://zlo.example/x");
    // Drugi `received` na isti intent: rail nastavlja istu narudžbu (200), a tuđi Referer znači JSON.
    expect(tudi.status).toBe(200);
    expect(tudi.headers.get("content-type")).toContain("application/json");
  });
});

describe("stanjeCheckouta()", () => {
  it("bez napojnice: napojnica null", async () => {
    const u = await novaUplata();
    expect((await stanjeCheckouta(db, u.checkoutId))?.napojnica).toBeNull();
    expect(await stanjeCheckouta(db, "nema")).toBeNull();
  });
});
