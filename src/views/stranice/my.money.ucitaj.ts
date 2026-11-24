/**
 * Kamo ide novac `/hr/moje/novac` (P, obilazak 09; odluka 6): umjesto isplate, Safe organizacije, mreža i
 * explorer za sve moje kampanje, po organizaciji.
 */
import { izbornik, type StavkaIzbornika } from "../../components/moje/ucitavanje";
import { mojNovac, type NovacOrganizacije } from "../../lib/db/moje";
import { zahtijevajPrijavu } from "../../lib/pristup";
import type { Ucitaj } from "../tipovi";

export interface PodaciMogNovca {
  skupine: (NovacOrganizacije & { detalji: Record<string, StavkaIzbornika | null> })[];
}

export const ucitaj: Ucitaj<PodaciMogNovca> = async (ctx) => {
  const k = zahtijevajPrijavu(ctx);
  if (k instanceof Response) return k;
  const skupine = await mojNovac(ctx.db, k.id);
  return {
    podaci: {
      skupine: skupine.map((g) => ({
        ...g,
        // Poveznica uz kampanju: upravljanje (ako smijem), inače javna stranica.
        detalji: Object.fromEntries(
          g.kampanje.map((n) => {
            const iz = izbornik(ctx.lang, n.kampanja);
            return [n.kampanja.publicId, iz.find((x) => x.radnja === "upravljaj") ?? iz.find((x) => x.radnja === "otvori") ?? null];
          }),
        ),
      })),
    },
  };
};
