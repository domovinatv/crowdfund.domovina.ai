/**
 * Obavijesti `/hr/{id}/upravljanje/obavijesti` (K, javni pregled §4.2): o novim uplatama je postavka kampanje
 * (`campaign_settings.contribution_notifications`, mijenja uloga ≥ editor), o komentarima i kraju kampanje je
 * osobno praćenje člana (`campaign_follows` s `user_id`). Prototip ne šalje e-poštu: poruke o novim doprinosima
 * upisane u `notifications` (S8, `src/lib/db/obavijesti.ts`) prikazuju se kao mock.
 */
import { kucica, nakon, porukaUspjeha, ucitajUpravljanje, type Upravljanje } from "../../components/upravljanje/ucitavanje";
import { imaUlogu } from "../../lib/pristup";
import { obavijestiUpravljanja, spremiObavijesti, type ObavijestiUpravljanja } from "../../lib/db/upravljanje";
import { porukeOUplatama, type MockPoruka } from "../../lib/db/obavijesti";
import type { Ucitaj } from "../tipovi";

export interface PodaciObavijesti {
  u: Upravljanje;
  obavijesti: ObavijestiUpravljanja;
  smijeKampanju: boolean;
  spremljeno: boolean;
  /** Mock e-poruke o novim doprinosima (zadnjih 10). */
  poruke: MockPoruka[];
}

export const ucitaj: Ucitaj<PodaciObavijesti> = async (ctx) => {
  const u = await ucitajUpravljanje(ctx, "campaign.manage.notifications");
  if (u instanceof Response) return u;
  const smijeKampanju = imaUlogu(u.pristup.uloga, "editor");
  if (ctx.request.method === "POST") {
    const f = await ctx.request.formData();
    const o = { uplate: kucica(f, "uplate"), komentari: kucica(f, "komentari"), kraj: kucica(f, "kraj") };
    await spremiObavijesti(ctx.db, u.k.id, u.korisnik.id, o, smijeKampanju, Date.now());
    return nakon(u.put, "spremljeno");
  }
  return {
    podaci: {
      u, obavijesti: await obavijestiUpravljanja(ctx.db, u.k.id, u.korisnik.id), smijeKampanju,
      spremljeno: porukaUspjeha(ctx.url, ["spremljeno"]) !== null,
      poruke: await porukeOUplatama(ctx.db, u.k.id),
    },
  };
};
