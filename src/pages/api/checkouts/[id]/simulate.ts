// `POST /api/checkouts/{id}/simulate` (S7, odluka 704): simulacija uplate samo za sandbox intent, pa isti pull
// kao `events`. Pristup T. Obrazac bez JS-a dobiva 303 natrag na Referer istog origina. Logika u
// `src/lib/mpt/obrada.ts`.
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { mptKonfig } from "../../../../lib/mpt/klijent";
import { obradiSimulaciju } from "../../../../lib/mpt/obrada";

export const prerender = false;

const okolina = env as unknown as Record<string, unknown>;
const tajnaIbana = typeof okolina.TAJNA_IBANA === "string" && okolina.TAJNA_IBANA ? okolina.TAJNA_IBANA : undefined;

export const POST: APIRoute = ({ request, params }) =>
  obradiSimulaciju(request, env.DB, mptKonfig(env), params.id ?? "", fetch, Date.now(), { ibanTajna: tajnaIbana });
