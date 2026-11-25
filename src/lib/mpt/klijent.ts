/**
 * MPT klijent na poslužitelju (S7, odluke 700–). Ugovor raila: pay.domovina.ai
 * `docs/integrations/sandbox-quickstart.md` i `backend/src/intents/api.ts` (`/v1/intents`).
 *
 * Samo poslužitelj: `sk_test_` ključ nikad ne ide u preglednik. Preglednik smije čitati javni
 * `status_stream_url` (SSE) i `status_url`; stanje u bazi mijenja samo webhook ili pull
 * (`src/lib/db/uplate.ts`), nikad `mpt_status` iz povratnog URL-a.
 *
 * `fetch` se ubacuje (test double u `test/pomoc/mpt-dvojnik.ts`), pa unit testovi rade bez mreže.
 * Oblik statusa (`MptStatus`) je podskup energy.domovina.ai `lib/mpt-intent.ts` @94335d7
 * (`IntentStatus`, faze iz raila `intents/stage.ts`); odluka 11, vendorirano, ne izvučeno.
 */

export interface MptKonfig {
  /** npr. `https://api.mpt.hr` (bez završne kose crte). */
  apiUrl: string;
  /** `sk_test_…` (sandbox) ili `sk_…`. */
  secretKey: string;
  /** `whsec_…` za provjeru potpisa webhooka. */
  webhookSecret: string;
  tenantId: string;
  /** Adresa za napojnicu (Safe platforme). U sandboxu demo adresa raila. */
  tipTarget: string;
}

type Okolina = Record<string, unknown>;

const str = (e: Okolina, k: string): string => (typeof e[k] === "string" ? (e[k] as string).trim() : "");

/** Konfiguracija iz okoline Workera (`.dev.vars` lokalno). `null` kad ključ nedostaje. */
export function mptKonfig(env: unknown): MptKonfig | null {
  const e = (env ?? {}) as Okolina;
  const apiUrl = str(e, "MPT_API_URL").replace(/\/+$/, "");
  const secretKey = str(e, "MPT_SECRET_KEY");
  if (!apiUrl || !secretKey) return null;
  return {
    apiUrl,
    secretKey,
    webhookSecret: str(e, "MPT_WEBHOOK_SECRET"),
    tenantId: str(e, "MPT_TENANT_ID"),
    tipTarget: str(e, "MPT_TIP_TARGET") || str(e, "MPT_DEMO_TARGET") || "0x000000000000000000000000000000000000dEaD",
  };
}

/** Stanje intenta na railu. */
export type MptStanje = "pending" | "paid" | "expired" | "cancelled";

/** Faza iz raila (`status.stage`), energy `IntentStage`. */
export type MptFaza =
  | "awaiting_payment"
  | "received_processing"
  | "minted"
  | "forwarding"
  | "settled"
  | "rejected"
  | "expired"
  | (string & {});

export interface MptIntent {
  sid: string;
  state: MptStanje;
  amountCents: number;
  amountReceivedCents: number | null;
  memo: string;
  /** U sandboxu `null` (nema stvarne uplate). */
  iban: string | null;
  beneficiaryName: string | null;
  bic: string | null;
  epcQrData: string | null;
  hub3Data: string | null;
  /** Kratka referenca (ADR 0028), 4 znamenke. */
  shortRef: string | null;
  targetAddress: string;
  checkoutUrl: string | null;
  statusUrl: string | null;
  statusStreamUrl: string | null;
  /** Samo sandbox. */
  simulateUrl: string | null;
  sandbox: boolean;
  /** ms od epohe */
  createdAt: number | null;
  expiresAt: number | null;
  paidAt: number | null;
  stage: MptFaza | null;
  /** Rail javlja manjak/višak u `status.amount_mismatch` (underpaid). */
  amountMismatch: unknown;
  metadata: Record<string, unknown> | null;
}

export interface NoviIntent {
  /** Naš sid (base64url 6–32); rail ga prihvaća, pa checkout može nastati prije poziva. */
  sid?: string;
  targetAddress: string;
  amountCents: number;
  label?: string;
  metadata?: Record<string, string | number | boolean | null>;
  expiresInSeconds?: number;
  returnUrl?: string;
}

export class MptGreska extends Error {
  constructor(
    public readonly status: number,
    public readonly kod: string,
  ) {
    super(`MPT ${status}: ${kod}`);
    this.name = "MptGreska";
  }
}

export type DohvatFn = typeof fetch;

const ms = (v: unknown): number | null => {
  if (typeof v !== "string" || !v) return null;
  const t = Date.parse(v);
  return Number.isFinite(t) ? t : null;
};
const s = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
const n = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** JSON raila → `MptIntent`. Baca ako nema `sid`. */
export function intentIzJsona(j: Record<string, unknown>): MptIntent {
  const sid = s(j.sid);
  if (!sid) throw new MptGreska(502, "intent_bez_sida");
  const status = (j.status ?? {}) as Record<string, unknown>;
  const st = s(j.state);
  return {
    sid,
    state: (st === "paid" || st === "expired" || st === "cancelled" ? st : "pending") as MptStanje,
    amountCents: n(j.amount_cents) ?? 0,
    amountReceivedCents: n(j.amount_received_cents),
    memo: s(j.memo) ?? "",
    iban: s(j.iban),
    beneficiaryName: s(j.beneficiary_name),
    bic: s(j.bic),
    epcQrData: s(j.epc_qr_data),
    hub3Data: s(j.hub3_data),
    shortRef: s(j.short_ref),
    targetAddress: s(j.target_address) ?? "",
    checkoutUrl: s(j.checkout_url),
    statusUrl: s(j.status_url),
    statusStreamUrl: s(j.status_stream_url),
    simulateUrl: s(j.simulate_url),
    sandbox: j.sandbox === true,
    createdAt: ms(j.created_at),
    expiresAt: ms(j.expires_at),
    paidAt: ms(j.paid_at),
    stage: (s(status.stage) as MptFaza | null) ?? null,
    amountMismatch: status.amount_mismatch ?? null,
    metadata: j.metadata && typeof j.metadata === "object" ? (j.metadata as Record<string, unknown>) : null,
  };
}

const eur = (centi: number): string => (centi / 100).toFixed(2);

async function poziv(
  k: MptKonfig,
  put: string,
  init: RequestInit,
  dohvat: DohvatFn,
): Promise<{ status: number; json: Record<string, unknown> }> {
  const r = await dohvat(`${k.apiUrl}${put}`, {
    ...init,
    headers: { authorization: `Bearer ${k.secretKey}`, "content-type": "application/json", ...(init.headers ?? {}) },
  });
  let json: Record<string, unknown> = {};
  try {
    json = (await r.json()) as Record<string, unknown>;
  } catch {
    /* prazno tijelo */
  }
  return { status: r.status, json };
}

/** `POST /v1/intents` sa secret ključem (jedini način za `return_url`). */
export async function stvoriIntent(k: MptKonfig, novi: NoviIntent, dohvat: DohvatFn = fetch): Promise<MptIntent> {
  const tijelo: Record<string, unknown> = {
    target_address: novi.targetAddress,
    amount_eur: eur(novi.amountCents),
  };
  if (novi.sid) tijelo.sid = novi.sid;
  if (novi.label) tijelo.label = novi.label.slice(0, 120);
  if (novi.metadata) tijelo.metadata = novi.metadata;
  if (novi.expiresInSeconds) tijelo.expires_in_seconds = novi.expiresInSeconds;
  if (novi.returnUrl) tijelo.return_url = novi.returnUrl;
  const { status, json } = await poziv(k, "/v1/intents", { method: "POST", body: JSON.stringify(tijelo) }, dohvat);
  if (status !== 200 && status !== 201) throw new MptGreska(status, s(json.error) ?? "nepoznato");
  return intentIzJsona(json);
}

/** `GET /v1/intents/:sid`; `null` za 404. */
export async function dohvatiIntent(k: MptKonfig, sid: string, dohvat: DohvatFn = fetch): Promise<MptIntent | null> {
  const { status, json } = await poziv(k, `/v1/intents/${encodeURIComponent(sid)}`, { method: "GET" }, dohvat);
  if (status === 404) return null;
  if (status !== 200) throw new MptGreska(status, s(json.error) ?? "nepoznato");
  return intentIzJsona(json);
}

export type IshodSimulacije = "paid" | "received" | "underpaid" | "late" | "rejected";

/** Samo sandbox: `POST /v1/intents/:sid/simulate`. */
export async function simulirajUplatu(
  k: MptKonfig,
  sid: string,
  ishod: IshodSimulacije = "paid",
  dohvat: DohvatFn = fetch,
): Promise<{ ok: boolean; state: string | null }> {
  const { status, json } = await poziv(
    k,
    `/v1/intents/${encodeURIComponent(sid)}/simulate`,
    { method: "POST", body: JSON.stringify({ outcome: ishod }) },
    dohvat,
  );
  if (status !== 200 && status !== 201) throw new MptGreska(status, s(json.error) ?? "nepoznato");
  return { ok: json.ok === true, state: s(json.state) };
}

/** Novi sid: 16 znakova base64url (96 bita), unutar `^[A-Za-z0-9_-]{6,32}$` raila. */
export function noviSid(): string {
  const b = crypto.getRandomValues(new Uint8Array(12));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
