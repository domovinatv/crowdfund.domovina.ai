// `POST /webhooks/mpt` (S7, odluka 706): webhook MPT raila, pristup „potpis” (Standard Webhooks, bez sesije
// i CSRF-a). Logika u `src/lib/mpt/obrada.ts`.
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { obradiWebhook } from "../../lib/mpt/obrada";

export const prerender = false;

const okolina = env as unknown as Record<string, unknown>;
const tekst = (k: string) => (typeof okolina[k] === "string" ? (okolina[k] as string).trim() : "");

export const POST: APIRoute = ({ request }) =>
  obradiWebhook(request, env.DB, tekst("MPT_WEBHOOK_SECRET"), Date.now(), { ibanTajna: tekst("TAJNA_IBANA") || undefined });
