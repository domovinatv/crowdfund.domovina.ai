// `GET /api/checkouts/{id}/stream?cilj=doprinos|napojnica` (S11, TODO F3): proxy MPT SSE-a statusa kroz Worker,
// jer rail ne šalje CORS za naš origin. Pristup T (ID checkouta). Logika u `src/lib/mpt/stream.ts`.
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { mptKonfig } from "../../../../lib/mpt/klijent";
import { odgovorStreama } from "../../../../lib/mpt/stream";

export const prerender = false;

export const GET: APIRoute = ({ params, url, request }) =>
  odgovorStreama(env.DB, mptKonfig(env), params.id ?? "", url.searchParams.get("cilj"), fetch, request.signal);
