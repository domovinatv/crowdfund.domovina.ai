/**
 * Dvojnik MPT raila za unit testove (S7): lažni `fetch` koji drži intente u memoriji i potpisani webhook
 * zahtjevi za svaki događaj, bez mreže.
 *
 *   POST /v1/intents              → 201 (naš `sid` ili novi), 409 za postojeći sid
 *   GET  /v1/intents/:sid         → 200 / 404
 *   POST /v1/intents/:sid/simulate → ishodi iz pay.domovina.ai `docs/integrations/sandbox-quickstart.md` §3:
 *        paid      payment.received → intent.paid        state paid
 *        received  payment.received (paid ga kasnije završi) state pending
 *        underpaid payment.received → payment.underpaid  state pending (1 € manje)
 *        late      payment.received → payment.late       state expired (+ paid_at)
 *        rejected  payment.received → payment.rejected   state pending, faza rejected
 *      Druga uplata na isti intent → 409 `already_settled` / `already_rejected` (kao rail).
 *
 * Webhookovi iz HTTP simulacije skupljaju se u red (`webhookovi()` ih vraća i prazni); `simuliraj()` ih
 * vraća izravno. Payload je oblika raila `backend/src/intents/outbound.ts` (paid_at u Unix sekundama).
 */
import { intentIzJsona, type IshodSimulacije, type MptIntent, type MptKonfig } from "../../src/lib/mpt/klijent";
import { potpisanaZaglavlja } from "../../src/lib/mpt/potpis";

/** Tajna testa: `whsec_` + base64 od 32 bajta. */
export const TAJNA_TESTA = `whsec_${btoa("dvojnik-mpt-tajna-za-testove-32b")}`;
export const IBAN_TESTA = "DE89370400440532013000";

interface RedIntenta {
  sid: string;
  target_address: string;
  amount_cents: number;
  amount_received_cents: number | null;
  state: "pending" | "paid" | "expired";
  label: string | null;
  metadata: Record<string, unknown> | null;
  created_at: number; // Unix s
  expires_at: number;
  paid_at: number | null;
  stage: string;
  narudzba: { id: string; stanje: "pending" | "processed" | "rejected" } | null;
}

export interface OpcijeDvojnika {
  /** Sat u ms (zadano `Date.now`). */
  sad?: () => number;
  tajna?: string;
  apiUrl?: string;
  webhookUrl?: string;
  /** `secretKey` konfiguracije (zadano `sk_test_…`, tj. sandbox). */
  secretKey?: string;
}

export interface DvojnikMpt {
  dohvat: typeof fetch;
  konfig: MptKonfig;
  /** Simulacija uplate izravno (bez HTTP-a); vraća potpisane webhook zahtjeve redom. */
  simuliraj(sid: string, ishod?: IshodSimulacije, iznosCenti?: number): Promise<Request[]>;
  /** Intent kako ga vidi `dohvatiIntent`; `null` ako ne postoji. */
  intent(sid: string): MptIntent | null;
  /** Istek intenta (ttl sweep raila): pending → expired. */
  istekni(sid: string): void;
  /** Webhookovi nastali kroz HTTP simulaciju, redom; red se prazni. */
  webhookovi(): Request[];
  /** Broj poziva po metodi i putu (npr. `GET /v1/intents/abc`). */
  pozivi: string[];
}

const json = (status: number, tijelo: unknown) =>
  new Response(JSON.stringify(tijelo), { status, headers: { "content-type": "application/json" } });

export function dvojnikMpt(o: OpcijeDvojnika = {}): DvojnikMpt {
  const sat = o.sad ?? (() => Date.now());
  const tajna = o.tajna ?? TAJNA_TESTA;
  const apiUrl = o.apiUrl ?? "https://mpt.test";
  const webhookUrl = o.webhookUrl ?? "http://localhost/webhooks/mpt";
  const intenti = new Map<string, RedIntenta>();
  const red: Request[] = [];
  const pozivi: string[] = [];
  let brojac = 0;
  const sadS = () => Math.floor(sat() / 1000);

  const uJson = (r: RedIntenta): Record<string, unknown> => ({
    sid: r.sid,
    state: r.state,
    amount_cents: r.amount_cents,
    amount_received_cents: r.amount_received_cents,
    currency: "eur",
    memo: `MPT ${r.sid}`,
    iban: null,
    beneficiary_name: null,
    bic: null,
    epc_qr_data: null,
    hub3_data: null,
    short_ref: String(1000 + (r.sid.charCodeAt(0) % 9000)),
    target_address: r.target_address,
    checkout_url: `${apiUrl}/c/${r.sid}`,
    status_url: `${apiUrl}/v1/intents/${r.sid}/status`,
    status_stream_url: `${apiUrl}/v1/intents/${r.sid}/stream`,
    simulate_url: `${apiUrl}/v1/intents/${r.sid}/simulate`,
    sandbox: true,
    label: r.label,
    created_at: new Date(r.created_at * 1000).toISOString(),
    expires_at: new Date(r.expires_at * 1000).toISOString(),
    paid_at: r.paid_at === null ? null : new Date(r.paid_at * 1000).toISOString(),
    status: { stage: r.stage, amount_mismatch: r.amount_received_cents !== null && r.amount_received_cents < r.amount_cents ? { expected_cents: r.amount_cents, received_cents: r.amount_received_cents } : null },
    metadata: r.metadata,
  });

  const potpisan = async (id: string, payload: Record<string, unknown>): Promise<Request> => {
    const tijelo = JSON.stringify({ ...payload, event_id: id, occurred_at: new Date(sat()).toISOString() });
    return new Request(webhookUrl, { method: "POST", headers: await potpisanaZaglavlja(tajna, id, tijelo, sat()), body: tijelo });
  };

  const namireno = (r: RedIntenta) => ({
    sid: r.sid,
    state: r.state,
    amount_cents: r.amount_cents,
    amount_received_cents: r.amount_received_cents,
    overpaid_cents: r.amount_received_cents !== null && r.amount_received_cents > r.amount_cents ? r.amount_received_cents - r.amount_cents : 0,
    currency: "eur",
    target_address: r.target_address,
    monerium_order_id: r.narudzba?.id ?? null,
    forward_tx_hash: null,
    paid_at: r.paid_at,
    sender_iban: IBAN_TESTA,
    sender_name: "Sandbox Uplatitelj",
    metadata: r.metadata,
  });

  type Greska = { greska: "not_found" | "already_settled" | "already_rejected" | "invalid_amount" };

  async function simulirajRed(sid: string, ishod: IshodSimulacije, iznosCenti?: number): Promise<Request[] | Greska> {
    const r = intenti.get(sid);
    if (!r) return { greska: "not_found" };
    if (r.narudzba?.stanje === "rejected") return { greska: "already_rejected" };
    if (r.narudzba?.stanje === "processed" || r.state === "paid") return { greska: "already_settled" };
    const iznos = iznosCenti ?? (ishod === "underpaid" ? (r.amount_cents >= 200 ? r.amount_cents - 100 : Math.max(1, Math.floor(r.amount_cents / 2))) : r.amount_cents);
    if (!(iznos > 0)) return { greska: "invalid_amount" };
    const izlaz: Request[] = [];
    if (!r.narudzba) {
      r.narudzba = { id: `sim_${sid}_${++brojac}`, stanje: "pending" };
      r.stage = "received_processing";
      izlaz.push(
        await potpisan(`rcv_${r.narudzba.id}`, {
          type: "payment.received", sid, campaign_id: null, monerium_order_id: r.narudzba.id,
          amount_received_cents: iznos, currency: "eur", funds_location: "monerium", settlement: "pending", review_expected: null,
        }),
      );
    }
    if (ishod === "received") return izlaz;
    if (ishod === "rejected") {
      r.narudzba.stanje = "rejected";
      r.stage = "rejected";
      izlaz.push(
        await potpisan(`rej_${r.narudzba.id}`, {
          type: "payment.rejected", sid, campaign_id: null, monerium_order_id: r.narudzba.id,
          amount_received_cents: iznos, currency: "eur", reason: "Simulated rejection (sandbox)", funds_location: "returned_to_payer",
        }),
      );
      return izlaz;
    }
    if (ishod === "late" && r.state === "pending") r.state = "expired";
    r.narudzba.stanje = "processed";
    r.stage = "settled";
    if (r.state === "expired") {
      r.paid_at = sadS();
      r.amount_received_cents = iznos;
      izlaz.push(await potpisan(`late_${sid}`, { type: "payment.late", ...namireno(r) }));
    } else if (iznos < r.amount_cents) {
      r.amount_received_cents = iznos;
      izlaz.push(
        await potpisan(`undp_${sid}`, {
          type: "payment.underpaid", ...namireno(r),
          expected_cents: r.amount_cents, received_cents: iznos, delta_cents: r.amount_cents - iznos, funds_location: "recipient",
        }),
      );
    } else {
      r.state = "paid";
      r.paid_at = sadS();
      r.amount_received_cents = iznos;
      izlaz.push(await potpisan(`int_${sid}`, { type: "intent.paid", ...namireno(r) }));
    }
    return izlaz;
  }

  const dohvat = (async (ulaz: RequestInfo | URL, init?: RequestInit) => {
    const zahtjev = new Request(ulaz, init);
    const put = new URL(zahtjev.url).pathname;
    pozivi.push(`${zahtjev.method} ${put}`);
    if (!(zahtjev.headers.get("authorization") ?? "").startsWith("Bearer ")) return json(401, { error: "unauthorized" });
    const tijelo = zahtjev.method === "POST" ? ((await zahtjev.json().catch(() => ({}))) as Record<string, unknown>) : {};

    if (zahtjev.method === "POST" && put === "/v1/intents") {
      const sid = typeof tijelo.sid === "string" ? tijelo.sid : `dv${String(++brojac).padStart(8, "0")}`;
      if (intenti.has(sid)) return json(409, { error: "sid_taken" });
      const centi = Math.round(Number(tijelo.amount_eur) * 100);
      if (!(centi > 0)) return json(400, { error: "invalid_amount" });
      const sad = sadS();
      const r: RedIntenta = {
        sid,
        target_address: String(tijelo.target_address ?? ""),
        amount_cents: centi,
        amount_received_cents: null,
        state: "pending",
        label: typeof tijelo.label === "string" ? tijelo.label : null,
        metadata: (tijelo.metadata as Record<string, unknown> | undefined) ?? null,
        created_at: sad,
        expires_at: sad + (typeof tijelo.expires_in_seconds === "number" ? tijelo.expires_in_seconds : 86400),
        paid_at: null,
        stage: "awaiting_payment",
        narudzba: null,
      };
      intenti.set(sid, r);
      return json(201, uJson(r));
    }
    const m = put.match(/^\/v1\/intents\/([^/]+)(\/simulate)?$/);
    if (m) {
      const sid = decodeURIComponent(m[1]!);
      if (zahtjev.method === "GET" && !m[2]) {
        const r = intenti.get(sid);
        return r ? json(200, uJson(r)) : json(404, { error: "not_found" });
      }
      if (zahtjev.method === "POST" && m[2]) {
        const ishod = (typeof tijelo.outcome === "string" ? tijelo.outcome : "paid") as IshodSimulacije;
        const iznos = typeof tijelo.amount_eur === "string" ? Math.round(Number(tijelo.amount_eur) * 100) : undefined;
        const rez = await simulirajRed(sid, ishod, iznos);
        if ("greska" in rez) return json(rez.greska === "not_found" ? 404 : 409, { error: rez.greska });
        red.push(...rez);
        return json(200, { ok: true, outcome: ishod, state: intenti.get(sid)!.state });
      }
    }
    return json(404, { error: "not_found" });
  }) as typeof fetch;

  return {
    dohvat,
    konfig: {
      apiUrl,
      secretKey: o.secretKey ?? "sk_test_dvojnik",
      webhookSecret: tajna,
      tenantId: "sbx-dvojnik",
      tipTarget: "0x000000000000000000000000000000000000dEaD",
    },
    async simuliraj(sid, ishod = "paid", iznosCenti) {
      const rez = await simulirajRed(sid, ishod, iznosCenti);
      if ("greska" in rez) throw new Error(`dvojnik: ${rez.greska}`);
      return rez;
    },
    intent(sid) {
      const r = intenti.get(sid);
      return r ? intentIzJsona(uJson(r)) : null;
    },
    istekni(sid) {
      const r = intenti.get(sid);
      if (!r || r.state !== "pending") return;
      r.state = "expired";
      r.expires_at = Math.min(r.expires_at, sadS());
      if (!r.narudzba) r.stage = "expired";
    },
    webhookovi() {
      return red.splice(0, red.length);
    },
    pozivi,
  };
}
