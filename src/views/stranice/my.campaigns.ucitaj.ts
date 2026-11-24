/**
 * Moje kampanje `/hr/moje/kampanje` (P, obilazak 08): kampanje mojih organizacija i moje kampanje za
 * organizacije, filtri `?state=` i `?org=`, redoslijed `?sort=`, nacrti s „Nastavi” i obavijesti iz upita
 * (`?objavljeno={id}` nakon objave koja čeka odobrenje, `?obrisana={id}` nakon brisanja, `?ok=`).
 * POST: `akcija=nastavi|obrisi-nacrt` + `nacrt={id}` (samo vlasnikov neobjavljeni nacrt).
 */
import { izbornik, poljaObrasca, preusmjeri303, type StavkaIzbornika } from "../../components/moje/ucitavanje";
import {
  brojPoStanju,
  filtriraj,
  isRedoslijedMoje,
  isStanjeMoje,
  kampanjaZaObavijest,
  mojeKampanje,
  organizacijeFiltra,
  type MojaKampanja,
  type RedoslijedMoje,
  type StanjeMoje,
} from "../../lib/db/moje";
import { nacrtiKorisnika, obrisiNacrt, oznaciTrenutnim, prviNedovrseni, type RedNacrta } from "../../lib/db/nacrti";
import { zahtijevajPrijavu } from "../../lib/pristup";
import { url } from "../../lib/rute";
import type { Ucitaj } from "../tipovi";

export type Obavijest =
  | { vrsta: "cekaOdobrenje" | "objavljena" | "obrisana"; naslov: string; org: string }
  | { vrsta: "obrisanaBezNaslova" | "nacrtObrisan" };

export interface PodaciMojihKampanja {
  kampanje: (MojaKampanja & { izbornik: StavkaIzbornika[] })[];
  ukupno: number;
  brojevi: Record<StanjeMoje, number>;
  organizacije: { slug: string; naziv: string }[];
  filtar: { stanje: StanjeMoje | null; organizacija: string | null; redoslijed: RedoslijedMoje };
  nacrti: RedNacrta[];
  obavijest: Obavijest | null;
  greska: "nacrtNema" | null;
}

export const ucitaj: Ucitaj<PodaciMojihKampanja> = async (ctx) => {
  const k = zahtijevajPrijavu(ctx);
  if (k instanceof Response) return k;
  const sad = Date.now();
  const put = url(ctx.lang, "my.campaigns");
  let greska: PodaciMojihKampanja["greska"] = null;

  if (ctx.request.method === "POST") {
    const f = await poljaObrasca(ctx.request);
    const nacrt = (await nacrtiKorisnika(ctx.db, k.id)).find((n) => n.id === f.nacrt);
    if (nacrt && f.akcija === "nastavi" && (await oznaciTrenutnim(ctx.db, k.id, nacrt.id, sad))) {
      return preusmjeri303(url(ctx.lang, `new-campaign.${prviNedovrseni(nacrt.nacrt)}`));
    }
    if (nacrt && f.akcija === "obrisi-nacrt" && (await obrisiNacrt(ctx.db, k.id, nacrt.id))) return preusmjeri303(`${put}?ok=nacrt-obrisan`);
    greska = "nacrtNema";
  }

  const q = ctx.url.searchParams;
  const stanje = isStanjeMoje(q.get("state")) ? (q.get("state") as StanjeMoje) : null;
  const redoslijed = isRedoslijedMoje(q.get("sort")) ? (q.get("sort") as RedoslijedMoje) : "newest";
  const [sve, nacrti] = await Promise.all([mojeKampanje(ctx.db, k.id), nacrtiKorisnika(ctx.db, k.id)]);
  const organizacije = organizacijeFiltra(sve);
  const orgUpit = (q.get("org") ?? "").trim().toLowerCase();
  const organizacija = organizacije.some((o) => o.slug === orgUpit) ? orgUpit : null;
  const brojevi = brojPoStanju(sve);
  brojevi.draft += nacrti.length;

  let obavijest: Obavijest | null = null;
  const objavljeno = q.get("objavljeno");
  const obrisana = q.get("obrisana");
  if (objavljeno) {
    const o = await kampanjaZaObavijest(ctx.db, k.id, objavljeno);
    if (o && !o.obrisana) obavijest = { vrsta: o.stanje === "review" ? "cekaOdobrenje" : "objavljena", naslov: o.naslov, org: o.organizacija ?? "" };
  } else if (obrisana) {
    const o = await kampanjaZaObavijest(ctx.db, k.id, obrisana);
    obavijest = o?.obrisana ? { vrsta: "obrisana", naslov: o.naslov, org: o.organizacija ?? "" } : { vrsta: "obrisanaBezNaslova" };
  } else if (q.get("ok") === "nacrt-obrisan") {
    obavijest = { vrsta: "nacrtObrisan" };
  }

  return {
    podaci: {
      kampanje: filtriraj(sve, { stanje, organizacija, redoslijed }).map((x) => ({ ...x, izbornik: izbornik(ctx.lang, x) })),
      ukupno: sve.length,
      brojevi,
      organizacije,
      filtar: { stanje, organizacija, redoslijed },
      nacrti: !organizacija && (!stanje || stanje === "draft") ? nacrti : [],
      obavijest,
      greska,
    },
  };
};
