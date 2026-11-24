/**
 * Generator widgeta `/hr/{id}/widget`: GET obrazac s `?lang=hr|en` i `?target=campaign|support`
 * (ključevi kao na `/embed/{id}`), kod za kopiranje i pregled iframea.
 */
import { isLang, type Lang } from "../../i18n";
import type { StranicaKampanje } from "../../lib/db/kampanja";
import { isCiljWidgeta, kodWidgeta, putUgradnje, type CiljWidgeta } from "../../components/kampanja/dijeljenje";
import { ucitajKampanju } from "../../components/kampanja/ucitavanje";
import type { Ucitaj } from "../tipovi";

export interface PodaciWidgeta {
  k: StranicaKampanje;
  jezik: Lang;
  target: CiljWidgeta;
  kod: string;
  pregled: string;
}

export const ucitaj: Ucitaj<PodaciWidgeta> = async (ctx) => {
  const k = await ucitajKampanju(ctx, "campaign.widget");
  if (k instanceof Response) return k;
  const q = ctx.url.searchParams;
  const jezik = isLang(q.get("lang")) ? (q.get("lang") as Lang) : ctx.lang;
  const t = q.get("target");
  const target: CiljWidgeta = isCiljWidgeta(t) ? t : "campaign";
  return {
    podaci: {
      k,
      jezik,
      target,
      kod: kodWidgeta(ctx.url.origin, k.publicId, jezik, target, k.title),
      pregled: putUgradnje(k.publicId, jezik, target),
    },
  };
};
