/**
 * Pravi SSE statusa (S11, TODO F3): prijevod okvira raila i proxy `GET /api/checkouts/{id}/stream`, bez mreže
 * (lažni `fetch` vraća SSE tijelo), nad seedanim SQLiteom.
 */
import type { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it } from "vitest";
import type { DohvatFn, MptKonfig } from "../src/lib/mpt/klijent";
import { odgovorStreama, prevediOkvir, prevoditeljSse } from "../src/lib/mpt/stream";
import { kaoD1, novaBaza } from "./pomoc/baza";

const K: MptKonfig = { apiUrl: "https://rail.test", secretKey: "sk_test_x", webhookSecret: "", tenantId: "t", tipTarget: "0x1" };

const okvirRaila = (state: string, stage: string, id = 1) =>
  `event: stage\nid: ${id}\ndata: ${JSON.stringify({
    sid: "S1",
    state,
    status: { stage, amount_received_cents: 2000, order_id: "ord_tajno", forward_tx_hash: "0xabc" },
  })}\n\n`;

async function procitaj(r: Response): Promise<string> {
  return await new Response(r.body).text();
}

/** SSE tijelo u komadima proizvoljne veličine (provjera rezanja okvira preko granica komada). */
function tijelo(tekst: string, komad = 7): ReadableStream<Uint8Array> {
  const bajtovi = new TextEncoder().encode(tekst);
  let i = 0;
  return new ReadableStream({
    pull(ctl) {
      if (i >= bajtovi.length) return ctl.close();
      ctl.enqueue(bajtovi.slice(i, i + komad));
      i += komad;
    },
  });
}

describe("prevediOkvir", () => {
  it("stage → stanje samo s state i fazom (bez iznosa, narudžbe i hasha)", () => {
    const o = prevediOkvir(okvirRaila("pending", "received_processing").trim());
    expect(o).toBe(`event: stanje\ndata: {"state":"pending","faza":"received_processing"}\n\n`);
    expect(o).not.toMatch(/ord_tajno|0xabc|2000/);
  });
  it("retry i ping prolaze, ostalo se preskače", () => {
    expect(prevediOkvir("retry: 3000")).toBe("retry: 3000\n\n");
    expect(prevediOkvir(": ping")).toBe(": ping\n\n");
    expect(prevediOkvir("retry: abc")).toBeNull();
    expect(prevediOkvir("event: nesto\ndata: {}")).toBeNull();
    expect(prevediOkvir("event: stage\ndata: nije json")).toBeNull();
    expect(prevediOkvir("data: {\"state\":\"paid\"}")).toBeNull();
  });
});

describe("prevoditeljSse", () => {
  it("reže okvire preko granica komada, CRLF i zadnji okvir bez praznog reda", async () => {
    const ulaz = `retry: 3000\r\n\r\n${okvirRaila("pending", "awaiting_payment")}: ping\n\n${okvirRaila("paid", "settled", 2).trim()}`;
    const izlaz = await new Response(tijelo(ulaz, 5).pipeThrough(prevoditeljSse())).text();
    expect(izlaz).toBe(
      "retry: 3000\n\n" +
        `event: stanje\ndata: {"state":"pending","faza":"awaiting_payment"}\n\n` +
        ": ping\n\n" +
        `event: stanje\ndata: {"state":"paid","faza":"settled"}\n\n`,
    );
  });
});

describe("odgovorStreama", () => {
  let sqlite: DatabaseSync;
  let db: D1Database;
  let checkoutId: string;
  const sid = "SidDoprinosa0001";
  const tipSid = "SidNapojnice0001";

  beforeEach(() => {
    sqlite = novaBaza({ seed: true });
    db = kaoD1(sqlite);
    const kampanja = (sqlite.prepare(`SELECT id FROM campaigns WHERE state = 'active' ORDER BY id LIMIT 1`).get() as { id: string }).id;
    const sad = Date.now();
    checkoutId = "chk-stream-1";
    sqlite
      .prepare(
        `INSERT INTO checkouts (id, campaign_id, contribution_sid, amount_cents, tip_cents, user_id, email, expires_at, created_at, updated_at)
         VALUES (?, ?, ?, 2000, 100, NULL, 'ana@example.org', ?, ?, ?)`,
      )
      .run(checkoutId, kampanja, sid, sad + 86_400_000, sad, sad);
    sqlite
      .prepare(
        `INSERT INTO contributions (id, campaign_id, quantity, amount_cents, currency, state, payment_rail, payment_intent_sid, underpaid, created_at, updated_at)
         VALUES ('dop-stream-1', ?, 1, 2000, 'EUR', 'pending', 'sepa', ?, 0, ?, ?)`,
      )
      .run(kampanja, sid, sad, sad);
    sqlite.prepare("INSERT INTO contribution_attributions (contribution_id, checkout_id, source) VALUES ('dop-stream-1', ?, 'checkout')").run(checkoutId);
    sqlite.prepare("INSERT INTO tips (id, checkout_id, sid, amount_cents, created_at, updated_at) VALUES ('tip-stream-1', ?, ?, 100, ?, ?)").run(checkoutId, tipSid, sad, sad);
  });

  const railSse = (pozivi: string[]): DohvatFn =>
    (async (url: string | URL | Request) => {
      pozivi.push(String(url));
      return new Response(tijelo(`retry: 3000\n\n${okvirRaila("pending", "awaiting_payment")}`), {
        status: 200,
        headers: { "content-type": "text/event-stream; charset=utf-8", "access-control-allow-origin": "*" },
      });
    }) as DohvatFn;

  it("proxyja stream intenta doprinosa, jedan poziv raila, naša zaglavlja", async () => {
    const pozivi: string[] = [];
    const r = await odgovorStreama(db, K, checkoutId, null, railSse(pozivi));
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toBe("text/event-stream; charset=utf-8");
    expect(r.headers.get("cache-control")).toBe("no-store");
    expect(r.headers.get("access-control-allow-origin")).toBeNull();
    expect(pozivi).toEqual([`https://rail.test/v1/intents/${sid}/stream`]);
    expect(await procitaj(r)).toBe(`retry: 3000\n\nevent: stanje\ndata: {"state":"pending","faza":"awaiting_payment"}\n\n`);
  });

  it("cilj napojnica gleda intent napojnice", async () => {
    const pozivi: string[] = [];
    const r = await odgovorStreama(db, K, checkoutId, "napojnica", railSse(pozivi));
    expect(r.status).toBe(200);
    expect(pozivi).toEqual([`https://rail.test/v1/intents/${tipSid}/stream`]);
  });

  it("400 za nepoznat cilj, 204 bez konfiguracije, 404 za nepoznat checkout i bez napojnice; rail se ne zove", async () => {
    const pozivi: string[] = [];
    expect((await odgovorStreama(db, K, checkoutId, "nesto", railSse(pozivi))).status).toBe(400);
    expect((await odgovorStreama(db, null, checkoutId, null, railSse(pozivi))).status).toBe(204);
    expect((await odgovorStreama(db, K, "nema", null, railSse(pozivi))).status).toBe(404);
    sqlite.prepare("DELETE FROM tips").run();
    expect((await odgovorStreama(db, K, checkoutId, "napojnica", railSse(pozivi))).status).toBe(404);
    expect(pozivi).toEqual([]);
  });

  it("rail bez SSE-a (404 JSON), 429, drugi oblik ili pad mreže → 204 (EventSource se zatvara, klijent radi pull)", async () => {
    const bezSse = (async () =>
      new Response(JSON.stringify({ error: "sse_not_yet_implemented_use_polling" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      })) as DohvatFn;
    const r404 = await odgovorStreama(db, K, checkoutId, null, bezSse);
    expect(r404.status).toBe(204);
    expect(r404.headers.get("cache-control")).toBe("no-store");
    expect(r404.headers.get("x-stream")).toBe("nedostupan");
    const r429 = (async () => new Response("{}", { status: 429, headers: { "content-type": "application/json" } })) as DohvatFn;
    expect((await odgovorStreama(db, K, checkoutId, null, r429)).status).toBe(204);
    const html = (async () => new Response("<html>", { status: 200, headers: { "content-type": "text/html" } })) as DohvatFn;
    expect((await odgovorStreama(db, K, checkoutId, null, html)).status).toBe(204);
    const pad = (async () => {
      throw new TypeError("mreža");
    }) as DohvatFn;
    expect((await odgovorStreama(db, K, checkoutId, null, pad)).status).toBe(204);
  });
});
