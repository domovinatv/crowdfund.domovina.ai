/**
 * Novosti `/hr/{id}/upravljanje/novosti` (K (U:editor), ekran 22): popis, nova, uredi (`?edit={id}`), obriši
 * (soft). Novosti se prikazuju na javnoj stranici kampanje; nova obavještava pratitelje (mock).
 */
import { nakon, polje, porukaUspjeha, ucitajUpravljanje, type Upravljanje } from "../../components/upravljanje/ucitavanje";
import { novostiZaUpravljanje, obrisiNovost, spremiNovost, type GreskeNovosti, type NovostUpravljanja } from "../../lib/db/novosti";
import { nijePronadeno, type Ucitaj } from "../tipovi";

export const PORUKE_NOVOSTI = ["objavljena", "spremljena", "obrisana"] as const;

export interface PodaciNovosti {
  u: Upravljanje;
  novosti: NovostUpravljanja[];
  /** Novost koja se uređuje (`?edit=`), ili null za obrazac nove. */
  uredi: NovostUpravljanja | null;
  vrijednosti: { title: string; body: string };
  greske: GreskeNovosti;
  poruka: (typeof PORUKE_NOVOSTI)[number] | null;
}

export const ucitaj: Ucitaj<PodaciNovosti> = async (ctx) => {
  const u = await ucitajUpravljanje(ctx, "campaign.manage.updates");
  if (u instanceof Response) return u;
  const sad = Date.now();
  const novosti = await novostiZaUpravljanje(ctx.db, u.k.id);
  const editId = ctx.url.searchParams.get("edit");
  let uredi = editId ? (novosti.find((n) => n.id === editId) ?? null) : null;
  let vrijednosti = { title: uredi?.title ?? "", body: uredi?.body ?? "" };
  let greske: GreskeNovosti = {};
  if (ctx.request.method === "POST") {
    const f = await ctx.request.formData();
    const id = polje(f, "id");
    if (polje(f, "akcija") === "obrisi") {
      return (await obrisiNovost(ctx.db, u.k.id, id, sad)) ? nakon(u.put, "obrisana") : nijePronadeno();
    }
    vrijednosti = { title: polje(f, "title"), body: polje(f, "body") };
    const r = await spremiNovost(ctx.db, u.k.id, u.korisnik.id, { id: id || undefined, ...vrijednosti }, sad);
    if (r.ok) return nakon(u.put, id ? "spremljena" : "objavljena");
    if ("nema" in r) return nijePronadeno();
    greske = r.greske;
    uredi = id ? (novosti.find((n) => n.id === id) ?? null) : null;
  }
  return { podaci: { u, novosti, uredi, vrijednosti, greske, poruka: porukaUspjeha(ctx.url, PORUKE_NOVOSTI) } };
};
