/**
 * Učitavači stranica moderacije `/admin/*` (S6, A, odluke 602 i 645). Stranice su Astro stranice bez jezika
 * (`src/pages/admin/`), a logika je ovdje da je test zove nad sqliteom (test/moderacija.test.ts): svaki učitavač
 * vraća `Response` (302 na prijavu, 404, 303 nakon uspješnog POST-a) ili `{ podaci }`. Greška obrasca je 200 s
 * porukom uz stavku. Upiti: src/lib/db/moderacija.ts.
 */
import {
  OBRAZLOZENJE_MAX,
  OBRAZLOZENJE_MIN,
  RADNJE,
  ROK_ZALBE,
  STATUSI_PRIJAVE,
  blokirajKampanju,
  deblokirajKampanju,
  kampanjeZaModeraciju,
  odluciKyb,
  odluciNamjenu,
  odluciOPrijavi,
  preuzmiPrijavu,
  prijava,
  redPrijava,
  verifikacijeNamjene,
  zabiljeziZalbu,
  zahtjeviOrganizacija,
  zatvoriPrijavu,
  type DetaljPrijave,
  type KampanjaModeracije,
  type Radnja,
  type StatusPrijave,
  type StavkaPrijave,
  type VerifikacijaNamjene,
  type ZahtjevOrganizacije,
} from "../../lib/db/moderacija";
import { zahtijevajModeratora, type Korisnik } from "../../lib/pristup";
import { MODERACIJA, type OsnovaOdluke, type TekstoviModeracije } from "../../views/sadrzaj/moderacija";
import { obrazac, polje, preusmjeri303 } from "../organizacija/ucitavanje";

/** Putevi moderacije (rute bez jezika, src/lib/rute.ts `admin.*`). */
export const ADMIN = {
  prijave: "/admin/prijave",
  prijava: (id: string) => `/admin/prijave/${encodeURIComponent(id)}`,
  organizacije: "/admin/organizacije",
  verifikacije: "/admin/verifikacije",
  kampanje: "/admin/kampanje",
} as const;

export interface KontekstModeracije {
  db: D1Database;
  url: URL;
  request: Request;
  korisnik: Korisnik | null;
}

export type Ishod<T> = Response | { podaci: T };
export type KljucPoruke = keyof TekstoviModeracije["poruke"];
export type KljucGreske = keyof TekstoviModeracije["greske"];

const nijePronadeno = () => new Response(null, { status: 404 });

/** A: moderator, inače 302 na `/hr/prijava?next=…` ili 404 (odluka 602). */
export const pristupModeraciji = (ctx: KontekstModeracije) => zahtijevajModeratora({ lang: "hr", url: ctx.url, korisnik: ctx.korisnik });

/** Poruka nakon 303 (`?poruka=`), samo poznati ključevi. */
function poruka(url: URL): KljucPoruke | null {
  const p = url.searchParams.get("poruka");
  return p && p in MODERACIJA.hr.poruke ? (p as KljucPoruke) : null;
}

const s303 = (put: string, p: KljucPoruke) => preusmjeri303(`${put}${put.includes("?") ? "&" : "?"}poruka=${p}`);

// --- Prijave --------------------------------------------------------------------------------------------

export interface PodaciPrijava {
  status: StatusPrijave | null;
  stavke: StavkaPrijave[];
}

export async function ucitajPrijave(ctx: KontekstModeracije): Promise<Ishod<PodaciPrijava>> {
  const m = pristupModeraciji(ctx);
  if (m instanceof Response) return m;
  const s = ctx.url.searchParams.get("status");
  const status = s && (STATUSI_PRIJAVE as readonly string[]).includes(s) ? (s as StatusPrijave) : null;
  return { podaci: { status, stavke: await redPrijava(ctx.db, status) } };
}

export const CINJENICE_MAX = 1500;
export const OSNOVE: readonly OsnovaOdluke[] = ["uvjeti", "zakon"];

export interface PoljaOdluke {
  radnja: string;
  cinjenice: string;
  osnova: string;
  osnovaOpis: string;
}

/** Provjera polja DSA čl. 17 (prije sastavljanja obrazloženja). */
export function provjeriPoljaOdluke(p: PoljaOdluke): Partial<Record<keyof PoljaOdluke, KljucGreske>> {
  const g: Partial<Record<keyof PoljaOdluke, KljucGreske>> = {};
  if (!RADNJE.includes(p.radnja as Radnja)) g.radnja = "radnja";
  const c = p.cinjenice.trim();
  if (c.length < OBRAZLOZENJE_MIN) g.cinjenice = "cinjenice_kratko";
  else if (c.length > CINJENICE_MAX) g.cinjenice = "cinjenice_dugo";
  if (!OSNOVE.includes(p.osnova as OsnovaOdluke)) g.osnova = "osnova";
  const o = p.osnovaOpis.trim();
  if (o.length < 3 || o.length > 200) g.osnovaOpis = "osnova_opis";
  return g;
}

/**
 * Obrazloženje (DSA čl. 17 st. 3): radnja, činjenice i okolnosti, osnova (propis ili uvjeti), korištenje
 * automatiziranih sredstava (u prototipu nikad) i pravna sredstva. Sprema se kao `moderation_decisions.statement`.
 */
export function sastaviObrazlozenje(p: PoljaOdluke): string {
  const T = MODERACIJA.hr;
  const D = T.prijava.dijelovi;
  const s = [
    `${D.radnja}: ${T.radnje[p.radnja as Radnja] ?? p.radnja}.`,
    `${D.cinjenice}: ${p.cinjenice.trim()}`,
    `${D.osnova}: ${T.osnove[p.osnova as OsnovaOdluke] ?? p.osnova}, ${p.osnovaOpis.trim()}.`,
    `${D.automatizirano}: ${D.automatiziranoNe}.`,
    `${D.pravniLijek}: ${T.prijava.pravniLijekTekst}`,
  ].join("\n");
  return s.slice(0, OBRAZLOZENJE_MAX);
}

export interface PodaciPrijave {
  prijava: DetaljPrijave;
  /** Kraj roka za žalbu (zadnja odluka + 14 dana) dok je prijava `decided`. */
  rokZalbe: number | null;
  mozeZalba: boolean;
  mozeZatvoriti: boolean;
  poruka: KljucPoruke | null;
  greska: { obrazac: string; polja: Partial<Record<keyof PoljaOdluke | "opce", KljucGreske>>; vrijednosti: PoljaOdluke } | null;
}

export async function ucitajPrijavu(ctx: KontekstModeracije, id: string, sad: number = Date.now()): Promise<Ishod<PodaciPrijave>> {
  const m = pristupModeraciji(ctx);
  if (m instanceof Response) return m;
  const p0 = await prijava(ctx.db, id);
  if (!p0) return nijePronadeno();
  const ovdje = ADMIN.prijava(p0.id);
  const f = await obrazac(ctx);
  let greska: PodaciPrijave["greska"] = null;
  if (f) {
    const vrsta = polje(f, "obrazac");
    const vrijednosti: PoljaOdluke = { radnja: polje(f, "radnja"), cinjenice: polje(f, "cinjenice"), osnova: polje(f, "osnova"), osnovaOpis: polje(f, "osnovaOpis") };
    if (vrsta === "preuzmi") {
      if (await preuzmiPrijavu(ctx.db, p0.id, sad)) return s303(ovdje, "preuzeta");
      greska = { obrazac: vrsta, polja: { opce: "stanje" }, vrijednosti };
    } else if (vrsta === "zalba") {
      if (await zabiljeziZalbu(ctx.db, p0.id, sad)) return s303(ovdje, "zalba");
      greska = { obrazac: vrsta, polja: { opce: p0.status === "decided" ? "rok" : "stanje" }, vrijednosti };
    } else if (vrsta === "zatvori") {
      if (await zatvoriPrijavu(ctx.db, p0.id, sad)) return s303(ovdje, "zatvorena");
      greska = { obrazac: vrsta, polja: { opce: p0.status === "decided" ? "rok" : "stanje" }, vrijednosti };
    } else {
      const polja = provjeriPoljaOdluke(vrijednosti);
      if (Object.keys(polja).length === 0) {
        const r = await odluciOPrijavi(ctx.db, { reportId: p0.id, radnja: vrijednosti.radnja, obrazlozenje: sastaviObrazlozenje(vrijednosti), moderatorId: m.id }, sad);
        if (r.ok) return s303(ovdje, "odluka");
        greska = { obrazac: "odluka", polja: r.greska === "radnja" || r.greska === "radnja_cilj" ? { radnja: r.greska } : { opce: r.greska }, vrijednosti };
      } else greska = { obrazac: "odluka", polja, vrijednosti };
    }
  }
  const p = f ? ((await prijava(ctx.db, p0.id)) ?? p0) : p0;
  const zadnja = p.odluke.length ? Math.max(...p.odluke.map((d) => d.kada)) : null;
  const rokZalbe = p.status === "decided" && zadnja !== null ? zadnja + ROK_ZALBE : null;
  return {
    podaci: {
      prijava: p,
      rokZalbe,
      mozeZalba: rokZalbe !== null && sad < rokZalbe,
      mozeZatvoriti: rokZalbe !== null && sad >= rokZalbe,
      poruka: f ? null : poruka(ctx.url),
      greska,
    },
  };
}

// --- Organizacije i KYB ---------------------------------------------------------------------------------

export interface GreskaStavke {
  id: string;
  greska: KljucGreske;
  razlog: string;
}

export interface PodaciOrganizacija {
  zahtjevi: ZahtjevOrganizacije[];
  poruka: KljucPoruke | null;
  greska: GreskaStavke | null;
}

export async function ucitajOrganizacije(ctx: KontekstModeracije, sad: number = Date.now()): Promise<Ishod<PodaciOrganizacija>> {
  const m = pristupModeraciji(ctx);
  if (m instanceof Response) return m;
  const f = await obrazac(ctx);
  let greska: GreskaStavke | null = null;
  if (f) {
    const orgId = polje(f, "orgId");
    const razlog = polje(f, "razlog");
    const odobri = polje(f, "odluka") === "odobri";
    const r = await odluciKyb(ctx.db, { orgId, odobri, razlog }, sad);
    if (r.ok) return s303(ADMIN.organizacije, odobri ? "odobrena" : "odbijena");
    greska = { id: orgId, greska: r.greska, razlog };
  }
  return { podaci: { zahtjevi: await zahtjeviOrganizacija(ctx.db), poruka: f ? null : poruka(ctx.url), greska } };
}

// --- Verifikacije namjene -------------------------------------------------------------------------------

export interface PodaciVerifikacija {
  verifikacije: VerifikacijaNamjene[];
  poruka: KljucPoruke | null;
  greska: GreskaStavke | null;
}

export async function ucitajVerifikacije(ctx: KontekstModeracije, sad: number = Date.now()): Promise<Ishod<PodaciVerifikacija>> {
  const m = pristupModeraciji(ctx);
  if (m instanceof Response) return m;
  const f = await obrazac(ctx);
  let greska: GreskaStavke | null = null;
  if (f) {
    const id = polje(f, "id");
    const razlog = polje(f, "razlog");
    const odobri = polje(f, "odluka") === "odobri";
    const r = await odluciNamjenu(ctx.db, { id, odobri, razlog, moderatorId: m.id }, sad);
    if (r.ok) return s303(ADMIN.verifikacije, odobri ? "odobrena" : "odbijena");
    greska = { id, greska: r.greska === "razlog" ? "razlog_kratko" : r.greska, razlog };
  }
  return { podaci: { verifikacije: await verifikacijeNamjene(ctx.db), poruka: f ? null : poruka(ctx.url), greska } };
}

// --- Kampanje: blokada i deblokada ----------------------------------------------------------------------

export interface PodaciKampanja {
  q: string;
  kampanje: KampanjaModeracije[];
  poruka: KljucPoruke | null;
  greska: GreskaStavke | null;
}

export async function ucitajKampanje(ctx: KontekstModeracije, sad: number = Date.now()): Promise<Ishod<PodaciKampanja>> {
  const m = pristupModeraciji(ctx);
  if (m instanceof Response) return m;
  const q = (ctx.url.searchParams.get("q") ?? "").slice(0, 100);
  const f = await obrazac(ctx);
  let greska: GreskaStavke | null = null;
  if (f) {
    const campaignId = polje(f, "campaignId");
    const razlog = polje(f, "razlog");
    const blokiraj = polje(f, "odluka") === "blokiraj";
    const r = blokiraj
      ? await blokirajKampanju(ctx.db, { campaignId, razlog, moderatorId: m.id }, sad)
      : await deblokirajKampanju(ctx.db, { campaignId, razlog, moderatorId: m.id }, sad);
    if (r.ok) return s303(ADMIN.kampanje + (q ? `?q=${encodeURIComponent(q)}` : ""), blokiraj ? "blokirana" : "deblokirana");
    greska = { id: campaignId, greska: r.greska === "razlog" ? "razlog_kratko" : r.greska, razlog };
  }
  return { podaci: { q, kampanje: await kampanjeZaModeraciju(ctx.db, q), poruka: f ? null : poruka(ctx.url), greska } };
}
