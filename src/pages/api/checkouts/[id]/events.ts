// `GET /api/checkouts/{id}/events` (S7, odluka 705): pull s raila (ako je MPT konfiguriran) i stanje
// checkouta, doprinosa i napojnice kao JSON. Pristup T (ID checkouta). Logika u `src/lib/mpt/obrada.ts`.
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { mptKonfig } from "../../../../lib/mpt/klijent";
import { odgovorStanja } from "../../../../lib/mpt/obrada";

export const prerender = false;

const okolina = env as unknown as Record<string, unknown>;
const tajnaIbana = typeof okolina.TAJNA_IBANA === "string" && okolina.TAJNA_IBANA ? okolina.TAJNA_IBANA : undefined;

export const GET: APIRoute = ({ params }) =>
  odgovorStanja(env.DB, mptKonfig(env), params.id ?? "", fetch, Date.now(), { ibanTajna: tajnaIbana });
