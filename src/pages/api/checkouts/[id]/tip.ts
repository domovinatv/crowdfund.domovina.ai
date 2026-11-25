// `POST /api/checkouts/{id}/tip` (S7, odluka 708): napojnica za JS klijente, isto što i obrazac stranice
// `campaign.support.checkout.tip`. Pristup T (ID checkouta). Logika u `src/lib/db/checkout.ts`.
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { mptKonfig } from "../../../../lib/mpt/klijent";
import { odgovorNapojnice } from "../../../../lib/db/checkout";

export const prerender = false;

export const POST: APIRoute = ({ request, params }) => odgovorNapojnice(request, env.DB, mptKonfig(env), params.id ?? "");
