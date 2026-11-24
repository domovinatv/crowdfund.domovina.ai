import { defineMiddleware } from "astro:middleware";
import { isLang } from "./i18n";

const GODINA_S = 60 * 60 * 24 * 365;

/**
 * Jezik iz prvog segmenta (`/hr/…`, `/en/…`). Posjet jezičnoj stranici pamti jezik u kolačiću
 * `lang`, pa ga `/` i kratki linkovi poštuju (odluka 300, 301).
 */
export const onRequest = defineMiddleware(async (ctx, next) => {
  const prvi = ctx.url.pathname.split("/")[1];
  if (isLang(prvi)) {
    ctx.locals.lang = prvi;
    if (ctx.cookies.get("lang")?.value !== prvi) {
      ctx.cookies.set("lang", prvi, { path: "/", maxAge: GODINA_S, sameSite: "lax", secure: ctx.url.protocol === "https:" });
    }
  }
  return next();
});
