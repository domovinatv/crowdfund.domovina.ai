/// <reference types="astro/client" />
// Vezovi (DB) dolaze iz worker-configuration.d.ts (`npm run types` = wrangler types).
// Pristup u kodu: `import { env } from "cloudflare:workers"` (uzor listici/omm).

declare namespace App {
  interface Locals {
    /** Jezik stranice, iz prvog segmenta (src/middleware.ts). */
    lang?: import("./i18n").Lang;
    /** Prijavljeni korisnik iz kolačića `sesija` (src/middleware.ts, S6); null = neprijavljen. */
    korisnik: import("./lib/sesija").Korisnik | null;
  }
}
