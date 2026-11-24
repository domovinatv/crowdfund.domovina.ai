import { env } from "cloudflare:workers";
import { defineMiddleware } from "astro:middleware";
import { isLang } from "./i18n";
import { KOLACIC_SESIJE, korisnikSesije, obrisiSesiju } from "./lib/sesija";

const GODINA_S = 60 * 60 * 24 * 365;

/**
 * Jezik iz prvog segmenta (`/hr/…`, `/en/…`). Posjet jezičnoj stranici pamti jezik u kolačiću
 * `lang`, pa ga `/` i kratki linkovi poštuju (odluka 300, 301).
 *
 * Sesija (S6, mock prijava): `locals.korisnik` iz kolačića `sesija`; bez kolačića nema upita u bazu,
 * pa su javne stranice neprijavljenima iste kao prije. Nevažeći ili opozvani token briše kolačić.
 */
export const onRequest = defineMiddleware(async (ctx, next) => {
  const prvi = ctx.url.pathname.split("/")[1];
  if (isLang(prvi)) {
    ctx.locals.lang = prvi;
    if (ctx.cookies.get("lang")?.value !== prvi) {
      ctx.cookies.set("lang", prvi, { path: "/", maxAge: GODINA_S, sameSite: "lax", secure: ctx.url.protocol === "https:" });
    }
  }
  const token = ctx.cookies.get(KOLACIC_SESIJE)?.value;
  ctx.locals.korisnik = token ? await korisnikSesije(env.DB, token, Date.now()) : null;
  if (token && !ctx.locals.korisnik) obrisiSesiju(ctx.cookies);
  return next();
});
