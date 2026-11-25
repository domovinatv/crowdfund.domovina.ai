/**
 * Zajednički učitavač koraka čarobnjaka (S6, docs/07 `new-campaign.*`). Svi koraci su J: GET uvijek 200,
 * i s praznim nacrtom (provjera ruta, odluka 503); nedovršeni koraci se vide u stepperu i u pregledu.
 * POST sprema korak i vodi 303 na sljedeći; greška je 200 s porukom uz polje (odluka 500).
 * Nacrt: neprijavljeni → kolačić (`kolacic.ts`), prijavljeni → `campaign_drafts`; lokalni nacrt prelazi na
 * račun pri prvom ulasku prijavljenog (odluka 152).
 */
import { kategorije as kategorijeBaze } from "../../lib/db/katalog";
import {
  KORACI,
  korakCilj,
  korakDovrsen,
  korakMediji,
  korakOpis,
  korakVrsta,
  obrisiNacrt,
  prazan,
  prviNedovrseni,
  spremiNacrt,
  stvoriNacrt,
  trenutniNacrt,
  type Greske,
  type IshodKoraka,
  type Korak,
  type Nacrt,
  type RedNacrta,
} from "../../lib/db/nacrti";
import {
  mojeOrganizacijeZaObjavu,
  nedostaje,
  objavi,
  osobaVerificirana,
  primatelji as primateljiBaze,
  type GreskaObjave,
  type MojaOrganizacija,
  type Nedostaje,
  type Primatelj,
} from "../../lib/db/objava";
import { urlPrijave } from "../../lib/pristup";
import { url } from "../../lib/rute";
import type { KontekstStranice } from "../../views/tipovi";
import { preusmjeri303 } from "../prijava/ucitavanje";
import { KOLACIC_NACRTA, citajLokalniNacrt, obrisiLokalniNacrt, spremiLokalniNacrt } from "./kolacic";

export type IzvorNacrta = "preglednik" | "racun" | "racun_lokalni" | "nema";

export interface PodaciKoraka {
  korak: Korak;
  nacrt: Nacrt;
  izvor: IzvorNacrta;
  prijavljen: boolean;
  /** Ime prijavljenog (organizator osobne kampanje u pregledu). */
  ime: string | null;
  /** Dovršeni koraci (stepper). */
  dovrseni: Korak[];
  /** Prvi nedovršeni korak (gumb „Nastavi”). */
  prvi: Korak;
  greske: Greske;
  /** Poslane vrijednosti kad POST ne prođe. */
  polja: Record<string, string> | null;
  moje: MojaOrganizacija[];
  primatelji: Primatelj[];
  /** Organizacija iz `?za={slug}` (Fixed Beneficiary). */
  za: Primatelj | null;
  verificiran: boolean;
  kategorije: { key: string; hr: string; en: string }[];
  nedostaje: Nedostaje[];
  greskaObjave: GreskaObjave | null;
}

interface StanjeNacrta {
  nacrt: Nacrt;
  red: RedNacrta | null;
  izvor: IzvorNacrta;
}

/** Nacrt ovog posjetitelja; prijavljenom prvo prebaci lokalni nacrt na račun. */
export async function procitajNacrt(ctx: KontekstStranice, sad: number): Promise<StanjeNacrta> {
  const k = ctx.korisnik;
  if (!k) {
    const n = citajLokalniNacrt(ctx.cookies) ?? {};
    return { nacrt: n, red: null, izvor: prazan(n) ? "nema" : "preglednik" };
  }
  if (ctx.cookies.has(`${KOLACIC_NACRTA}0`)) {
    const lokalni = citajLokalniNacrt(ctx.cookies);
    if (lokalni && !prazan(lokalni)) await stvoriNacrt(ctx.db, k.id, lokalni, "local", sad);
    obrisiLokalniNacrt(ctx.cookies);
  }
  const red = await trenutniNacrt(ctx.db, k.id);
  return { nacrt: red?.nacrt ?? {}, red, izvor: red ? (red.source === "local" ? "racun_lokalni" : "racun") : "nema" };
}

const naKorak = (ctx: KontekstStranice, k: Korak) => url(ctx.lang, `new-campaign.${k}`);

const sljedeci: Record<Exclude<Korak, "preview">, Korak> = { type: "goal", goal: "media", media: "description", description: "preview" };

export async function ucitajKorak(ctx: KontekstStranice, korak: Korak, sad: number = Date.now()): Promise<Response | { podaci: PodaciKoraka }> {
  const stanje = await procitajNacrt(ctx, sad);
  const k = ctx.korisnik;
  const [moje, prim, verificiran, kat] = await Promise.all([
    k ? mojeOrganizacijeZaObjavu(ctx.db, k.id) : Promise.resolve([]),
    primateljiBaze(ctx.db),
    k ? osobaVerificirana(ctx.db, k.id) : Promise.resolve(false),
    kategorijeBaze(ctx.db),
  ]);
  const zaSlug = (ctx.url.searchParams.get("za") ?? "").trim().toLowerCase();
  const za = zaSlug ? (prim.find((p) => p.slug === zaSlug) ?? null) : null;

  const podaci = (nacrt: Nacrt, greske: Greske = {}, polja: Record<string, string> | null = null, greskaObjave: GreskaObjave | null = null): { podaci: PodaciKoraka } => ({
    podaci: {
      korak,
      nacrt,
      izvor: stanje.izvor,
      prijavljen: !!k,
      ime: k?.ime ?? null,
      dovrseni: KORACI.filter((x) => korakDovrsen(nacrt, x)),
      prvi: prviNedovrseni(nacrt),
      greske,
      polja,
      moje,
      primatelji: prim,
      za,
      verificiran,
      kategorije: kat.map((c) => ({ key: c.key, hr: c.nameHr, en: c.nameEn })),
      nedostaje: nedostaje(nacrt),
      greskaObjave,
    },
  });

  if (ctx.request.method !== "POST") return podaci(stanje.nacrt);

  const f = await ctx.request.formData();
  const polja: Record<string, string> = {};
  for (const [kljuc, v] of f.entries()) if (typeof v === "string") polja[kljuc] = v;

  if (polja.akcija === "ispocetka") {
    if (k && stanje.red) await obrisiNacrt(ctx.db, k.id, stanje.red.id);
    if (!k) obrisiLokalniNacrt(ctx.cookies);
    return preusmjeri303(naKorak(ctx, "type"));
  }

  /** Objava (pregled i, od S10, izravno s koraka opisa): ista pravila `objavi()`, isti 303. */
  const objaviNacrt = async (korisnik: NonNullable<typeof k>, nacrt: Nacrt, nacrtId: string | null) => {
    const ishod = await objavi(ctx.db, korisnik, nacrt, nacrtId, sad);
    if (!ishod.ok) return podaci(nacrt, {}, null, ishod.greska);
    if (ishod.state === "review") return preusmjeri303(`${url(ctx.lang, "my.campaigns")}?objavljeno=${ishod.publicId}`);
    return preusmjeri303(`${url(ctx.lang, "campaign", { id: ishod.publicId })}?objavljeno=1`);
  };

  if (korak === "preview") {
    if (!k) return preusmjeri303(urlPrijave(ctx.lang, new URL(naKorak(ctx, "preview"), ctx.url)));
    return objaviNacrt(k, stanje.nacrt, stanje.red?.id ?? null);
  }

  let ishod: IshodKoraka;
  if (korak === "type") ishod = korakVrsta(stanje.nacrt, polja);
  else if (korak === "goal") ishod = korakCilj(stanje.nacrt, polja, { moje: moje.filter((m) => m.status === "active"), primatelji: prim, prijavljen: !!k }, sad);
  else if (korak === "media") ishod = korakMediji(stanje.nacrt, polja);
  else ishod = korakOpis(stanje.nacrt, polja);
  if (Object.keys(ishod.greske).length) return podaci(stanje.nacrt, ishod.greske, polja);

  let nacrtId: string | null = stanje.red?.id ?? null;
  if (k) {
    if (nacrtId) await spremiNacrt(ctx.db, k.id, nacrtId, ishod.nacrt, sad);
    else nacrtId = await stvoriNacrt(ctx.db, k.id, ishod.nacrt, "server", sad);
  } else if (!spremiLokalniNacrt(ctx.cookies, ctx.url, ishod.nacrt)) {
    return podaci(stanje.nacrt, { opis: "prevelik" }, polja);
  }
  // „Objavi” s koraka opisa (paritet A06): samo prijavljenom; neprijavljeni ide na pregled kao s „Dalje”.
  if (korak === "description" && polja.akcija === "objavi" && k) return objaviNacrt(k, ishod.nacrt, nacrtId);
  return preusmjeri303(naKorak(ctx, sljedeci[korak]));
}

/** `/nova-kampanja`: 302 na prvi nedovršeni korak (docs/07); `?za=` ide dalje na korak vrste. */
export async function ucitajUlaz(ctx: KontekstStranice, sad: number = Date.now()): Promise<Response> {
  const { nacrt } = await procitajNacrt(ctx, sad);
  const za = ctx.url.searchParams.get("za");
  const gdje = za ? `${naKorak(ctx, "type")}?za=${encodeURIComponent(za)}` : naKorak(ctx, prviNedovrseni(nacrt));
  return new Response(null, { status: 302, headers: { Location: gdje, "Cache-Control": "private, no-store" } });
}
