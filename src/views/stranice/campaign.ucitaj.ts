/**
 * Stranica kampanje `/hr/{id}` (ekran 22, docs/08 §5.1). Kampanja koja nije javno vidljiva → 404,
 * ID velikim slovima → 301 na mala. `?contributions=latest|highest` i `?contributions_page=N` (popis uplata bez JS-a).
 *
 * POST (S6, obrazac radi bez JS-a):
 * - `akcija=prati`: prijavljeni sprema tri prekidača odmah (`?prati=spremljeno|odjavljeno`); neprijavljeni upisuje
 *   e-poštu, dobiva poveznicu za potvrdu u demo okviru (`?prati=potvrda`, odluka 508). Greška → 200 uz polje.
 * - `akcija=komentar`: komentar prijavljenog korisnika po pravilima `comments_mode` → 303 `#k-{id}`; greška → 200.
 * Član organizacije kampanje (K) vidi traku „Upravljaj kampanjom”.
 */
import { komentariKampanje, novostiKampanje, uplateKampanje, type KomentariKampanje, type Novost, type StranicaKampanje, type UplateKampanje } from "../../lib/db/kampanja";
import { kasiceKampanje, type Kasica } from "../../lib/db/kasice";
import { dodajKomentar, pravoKomentara, type GreskaKomentara, type PravoKomentara } from "../../lib/db/komentari";
import { ponudeKampanje, type Ponuda } from "../../lib/db/ponude";
import { novostiRazina, type NovostRazine } from "../../lib/db/razine";
import { pracenjeKorisnika, pratiKampanju, type ObavijestiPracenja } from "../../lib/db/pracenje";
import { pristupKampanji } from "../../lib/pristup";
import { url } from "../../lib/rute";
import { posaljiDemoPostu, procitajDemoPostu } from "../../lib/sesija";
import { stranicaIz } from "../../lib/db/zajednicko";
import { apsolutno, ucitajKampanju } from "../../components/kampanja/ucitavanje";
import { kucica, polje } from "../../components/upravljanje/ucitavanje";
import type { Ucitaj } from "../tipovi";

export type { Ponuda } from "../../lib/db/ponude";

/** Uplata po stranici popisa; „Prikaži još” dodaje sljedećih toliko (docs/08 §3.2: 10). */
export const UPLATA_PO_STRANICI = 10;

/** Id demo poruke potvrde praćenja u kolačiću `demo_posta`. */
export const DEMO_PRACENJE = "pracenje";

export interface StanjePracenja {
  prijavljen: boolean;
  /** Prekidači (prijavljeni: spremljeno stanje; inače zadnji poslani ili sve isključeno, ekran 22). */
  obavijesti: ObavijestiPracenja;
  email: string;
  poruka: "spremljeno" | "odjavljeno" | "potvrda" | null;
  greska: "email" | "nista" | null;
  /** Poveznica potvrde iz demo pošte (samo nakon `?prati=potvrda` u istom pregledniku). */
  demoLink: string | null;
  demoEmail: string | null;
}

export interface StanjeKomentiranja {
  pravo: PravoKomentara;
  greska: GreskaKomentara | null;
  body: string;
  poslano: boolean;
}

export interface PodaciKampanje {
  k: StranicaKampanje;
  novosti: Novost[];
  kasice: Kasica[];
  uplate: UplateKampanje;
  stranicaUplata: number;
  josUplata: boolean;
  komentari: KomentariKampanje;
  ponude: Ponuda[];
  /** Ekskluzivne novosti razine (faza 2): samo naslov, razina i datum. */
  novostiRazina: NovostRazine[];
  adresa: string;
  pracenje: StanjePracenja;
  komentiranje: StanjeKomentiranja;
  /** Put nadzorne ploče za člana organizacije kampanje (K), inače null. */
  upravljanje: string | null;
}

const NISTA: ObavijestiPracenja = { komentari: false, novosti: false, kraj: false };

export const ucitaj: Ucitaj<PodaciKampanje> = async (ctx) => {
  const k = await ucitajKampanju(ctx, "campaign");
  if (k instanceof Response) return k;
  const put = url(ctx.lang, "campaign", { id: k.publicId });
  const korisnik = ctx.korisnik;
  const sad = Date.now();
  const q = ctx.url.searchParams;

  const pracenje: StanjePracenja = {
    prijavljen: !!korisnik, obavijesti: NISTA, email: "", poruka: null, greska: null, demoLink: null, demoEmail: null,
  };
  const komentiranje: StanjeKomentiranja = { pravo: "nema", greska: null, body: "", poslano: q.get("komentar") === "1" };

  if (ctx.request.method === "POST") {
    const f = await ctx.request.formData();
    const akcija = polje(f, "akcija");
    if (akcija === "komentar") {
      const body = polje(f, "body");
      const r = await dodajKomentar(ctx.db, k.id, korisnik?.id ?? null, body, sad);
      if (r.ok) return new Response(null, { status: 303, headers: { Location: `${put}?komentar=1#k-${r.id}` } });
      komentiranje.greska = r.greska;
      komentiranje.body = body;
    } else {
      const obavijesti = { komentari: kucica(f, "komentari"), novosti: kucica(f, "novosti"), kraj: kucica(f, "kraj") };
      const email = polje(f, "email");
      const r = await pratiKampanju(ctx.db, k.id, korisnik ? { userId: korisnik.id } : { email }, obavijesti, sad);
      if (r.ok && r.vrsta === "prijavljen") {
        return new Response(null, { status: 303, headers: { Location: `${put}?prati=${r.aktivno ? "spremljeno" : "odjavljeno"}#prati` } });
      }
      if (r.ok) {
        const link = apsolutno(ctx, url(ctx.lang, "follow", { token: r.token }));
        if (ctx.cookies) posaljiDemoPostu(ctx.cookies, ctx.url, { id: DEMO_PRACENJE, email: r.email, kod: "", link });
        return new Response(null, { status: 303, headers: { Location: `${put}?prati=potvrda#prati` } });
      }
      pracenje.greska = r.greska === "kampanja" ? "nista" : r.greska;
      pracenje.obavijesti = obavijesti;
      pracenje.email = email;
    }
  }

  const sort = q.get("contributions");
  const stranicaUplata = Math.min(stranicaIz(q.get("contributions_page")), 9);
  const limit = UPLATA_PO_STRANICI * stranicaUplata;
  const [novosti, kasice, uplateSve, komentari, ponude, pravo, mojePracenje, pristup, zakljucane] = await Promise.all([
    novostiKampanje(ctx.db, k.id),
    k.postavke.kasiceDopustene ? kasiceKampanje(ctx.db, k.id) : Promise.resolve([]),
    uplateKampanje(ctx.db, k.id, { sort: sort === "highest" || sort === "latest" ? sort : undefined, limit: limit + 1 }),
    komentariKampanje(ctx.db, k.id),
    k.brojevi.ponude > 0 ? ponudeKampanje(ctx.db, k.id) : Promise.resolve([]),
    pravoKomentara(ctx.db, k.id, korisnik?.id ?? null),
    korisnik ? pracenjeKorisnika(ctx.db, k.id, korisnik.id) : Promise.resolve(null),
    korisnik ? pristupKampanji(ctx.db, korisnik, k.id) : Promise.resolve(null),
    k.razine.length > 0 ? novostiRazina(ctx.db, k.id) : Promise.resolve([]),
  ]);
  const josUplata = uplateSve.uplate.length > limit;
  const uplate = { ...uplateSve, uplate: uplateSve.uplate.slice(0, limit) };
  komentiranje.pravo = pravo;
  if (mojePracenje && !pracenje.greska) pracenje.obavijesti = mojePracenje;
  const p = q.get("prati");
  if (p === "spremljeno" || p === "odjavljeno" || p === "potvrda") pracenje.poruka = p;
  if (p === "potvrda") {
    const posta = ctx.cookies ? procitajDemoPostu(ctx.cookies, DEMO_PRACENJE) : null;
    pracenje.demoLink = posta?.link ?? null;
    pracenje.demoEmail = posta?.email ?? null;
  }

  return {
    podaci: {
      k,
      novosti,
      kasice,
      uplate,
      stranicaUplata,
      josUplata,
      komentari,
      ponude,
      novostiRazina: zakljucane,
      adresa: apsolutno(ctx, put),
      pracenje,
      komentiranje,
      upravljanje: pristup?.k ? url(ctx.lang, "campaign.manage", { id: k.publicId }) : null,
    },
  };
};
