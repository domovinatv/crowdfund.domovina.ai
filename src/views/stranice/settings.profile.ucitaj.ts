/**
 * Profil i privatnost `/hr/postavke/profil` (P, ekran 12): 9 prekidača vidljivosti (`user_settings`),
 * indeksiranje, slug profila (odluka 507), newsletter. Brisanje računa je P+e (`delete_account`): POST
 * `akcija=obrisi` bez svježe potvrde → 302 na potvrdu radnje; s potvrdom briše i odjavljuje (303 na početnu).
 */
import { natrag, okIz, poljaObrasca, prijavljeni } from "../../components/postavke/ucitavanje";
import { obrisiRacun, postavkeProfila, spremiProfil, type PostavkeProfila } from "../../lib/db/postavke";
import { zahtijevajSvjezuPotvrdu } from "../../lib/pristup";
import { url } from "../../lib/rute";
import { obrisiSesiju } from "../../lib/sesija";
import type { Ucitaj } from "../tipovi";

export interface PodaciProfila {
  userId: string;
  postavke: PostavkeProfila;
  greske: Record<string, string>;
  greskaBrisanja: "jedini_vlasnik" | null;
  ok: string | null;
}

export const ucitaj: Ucitaj<PodaciProfila> = async (ctx) => {
  const k = prijavljeni(ctx);
  if (k instanceof Response) return k;
  const sad = Date.now();
  const postavke = await postavkeProfila(ctx.db, k.id);
  if (ctx.request.method === "POST") {
    const f = await poljaObrasca(ctx.request);
    if (f.akcija === "obrisi") {
      const potvrda = await zahtijevajSvjezuPotvrdu(ctx, "delete_account", sad);
      if (potvrda) return potvrda;
      const g = await obrisiRacun(ctx.db, k.id, sad);
      if (g) return { podaci: { userId: k.id, postavke, greske: {}, greskaBrisanja: g, ok: null } };
      obrisiSesiju(ctx.cookies);
      return new Response(null, { status: 303, headers: { Location: `${url(ctx.lang, "home")}?obrisan=1`, "Cache-Control": "private, no-store" } });
    }
    const greske = await spremiProfil(ctx.db, k.id, f, sad);
    if (Object.keys(greske).length) {
      // Vrati upisano (prekidače i slug) da korisnik ne izgubi izmjene.
      const upisano: PostavkeProfila = {
        prekidaci: Object.fromEntries(Object.keys(postavke.prekidaci).map((x) => [x, f[x] === "1"])) as PostavkeProfila["prekidaci"],
        slug: (f.slug ?? "").trim().toLowerCase() || null,
        newsletter: f.newsletter === "1",
      };
      return { podaci: { userId: k.id, postavke: upisano, greske, greskaBrisanja: null, ok: null } };
    }
    return natrag(ctx, "settings.profile");
  }
  return { podaci: { userId: k.id, postavke, greske: {}, greskaBrisanja: null, ok: okIz(ctx) } };
};
