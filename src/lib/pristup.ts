/**
 * Razine pristupa iz docs/07 („Razine pristupa”): P, P+e, U:uloga, K, A. Čiste funkcije i upiti nad D1,
 * pa ih test zove nad sqliteom (test/pristup.test.ts).
 *
 * ## Kako koristiti u učitavaču (`src/views/stranice/<kljuc>.ucitaj.ts`)
 *
 * `ctx` je `KontekstStranice`; `ctx.korisnik` puni middleware iz kolačića `sesija` (null = neprijavljen).
 * Svaki `zahtijevaj…` vraća `Response` (302 na prijavu, 404) ili ono što je tražio:
 *
 * ```ts
 * import { zahtijevajKampanju, zahtijevajPrijavu, zahtijevajSvjezuPotvrdu } from "../../lib/pristup";
 *
 * export const ucitaj: Ucitaj<Podaci> = async (ctx) => {
 *   // P: samo prijavljeni
 *   const korisnik = zahtijevajPrijavu(ctx);
 *   if (korisnik instanceof Response) return korisnik;
 *
 *   // K (U:editor): uloga u organizaciji kampanje ≥ editor, autor dok čeka odobrenje, ili moderator
 *   const p = await zahtijevajKampanju(ctx, ctx.params.id ?? "", { najmanje: "editor" });
 *   if (p instanceof Response) return p;           // 302 neprijavljenom, 404 bez prava
 *   // p.kampanja.uloga, p.kampanja.autor, p.kampanja.moderator …
 *
 *   // P+e: osjetljiva radnja (brisanje, uloge, povrat) — zovi u POST grani, prije promjene
 *   if (ctx.request.method === "POST") {
 *     const potvrda = await zahtijevajSvjezuPotvrdu(ctx, "close_campaign");
 *     if (potvrda) return potvrda;                 // 302 na /{lang}/potvrda-radnje/{token}?next=…
 *     // … radnja …
 *   }
 *   return { podaci: { … } };
 * };
 * ```
 *
 * Organizacija: `zahtijevajOrganizaciju(ctx, ctx.params.slug, "admin")`. Moderacija (`/admin/*`, Astro
 * stranice bez jezika): `zahtijevajModeratora({ lang: "hr", url: Astro.url, korisnik: Astro.locals.korisnik })`
 * → bez sesije 302 na prijavu, prijavljen bez uloge moderatora 404.
 *
 * Test: prijavljenog korisnika daje `korisnikSesije(db, primjeri.demoSesija, sad)` (src/lib/sesija.ts) ili
 * izravno objekt `{ id, email, ime, platformRole }` u `ctx.korisnik`.
 */
import type { AstroCookies } from "astro";
import type { Lang } from "../i18n";
import { url as urlRute } from "./rute";
import { KOLACIC_DEMO_POSTE, SVJEZA_POTVRDA, izdajKod, kodPoId, posaljiDemoPostu, type Korisnik } from "./sesija";

export type { Korisnik } from "./sesija";

export const ULOGE = ["viewer", "editor", "admin", "owner"] as const;
export type Uloga = (typeof ULOGE)[number];

/** Najmanje što treba za provjeru prijave. `KontekstStranice` to već ima. */
export interface KontekstPristupa {
  lang: Lang;
  url: URL;
  korisnik: Korisnik | null;
}

export const isUloga = (x: unknown): x is Uloga => typeof x === "string" && (ULOGE as readonly string[]).includes(x);

/** viewer < editor < admin < owner (odluka 202). Bez uloge je uvijek false. */
export function imaUlogu(uloga: Uloga | null | undefined, najmanje: Uloga): boolean {
  return !!uloga && ULOGE.indexOf(uloga) >= ULOGE.indexOf(najmanje);
}

export const jeModerator = (k: Korisnik | null | undefined): boolean => k?.platformRole === "moderator";

/** `/{lang}/prijava?next=<put+upit>` za trenutni URL. */
export function urlPrijave(lang: Lang, adresa: URL): string {
  return `${urlRute(lang, "sign-in")}?next=${encodeURIComponent(adresa.pathname + adresa.search)}`;
}

const preusmjeri = (gdje: string) => new Response(null, { status: 302, headers: { Location: gdje, "Cache-Control": "private, no-store" } });
const nema = () => new Response(null, { status: 404 });

/** P: prijavljeni korisnik ili 302 na prijavu s `?next=`. */
export function zahtijevajPrijavu(ctx: KontekstPristupa): Response | Korisnik {
  return ctx.korisnik ?? preusmjeri(urlPrijave(ctx.lang, ctx.url));
}

/** A: moderator; neprijavljeni 302 na prijavu, ostali 404 (postojanje moderacije se ne otkriva). */
export function zahtijevajModeratora(ctx: KontekstPristupa): Response | Korisnik {
  const k = zahtijevajPrijavu(ctx);
  if (k instanceof Response) return k;
  return jeModerator(k) ? k : nema();
}

/** Uloga korisnika u organizaciji (obrisana organizacija nema članova). */
export async function ulogaU(db: D1Database, userId: string, orgId: string): Promise<Uloga | null> {
  const r = await db
    .prepare(
      `SELECT m.role FROM memberships m JOIN organizations o ON o.id = m.organization_id
        WHERE m.user_id = ? AND m.organization_id = ? AND o.deleted_at IS NULL`,
    )
    .bind(userId, orgId)
    .first<{ role: Uloga }>();
  return r?.role ?? null;
}

export interface PristupKampanji {
  campaignId: string;
  publicId: string;
  /** Organizacija kampanje (organizator iz jezgre ↔ organizacija 1:1). */
  organizationId: string | null;
  organizationSlug: string | null;
  /** Uloga korisnika u organizaciji kampanje. */
  uloga: Uloga | null;
  /** Korisnik je autor kampanje (`campaigns.created_by`). */
  autor: boolean;
  /** Autor kampanje za organizaciju koja još čeka odobrenje (draft/review, bez `beneficiary_approved_at`). */
  autorCeka: boolean;
  /** Razina K iz 07: uloga u organizaciji kampanje ili `autorCeka`. */
  k: boolean;
  moderator: boolean;
}

/**
 * Pristup korisnika kampanji (po `campaigns.id`). null = kampanja ne postoji ili je obrisana, ili korisnik
 * nema ni K ni ulogu moderatora. Kampanja koja nije javno vidljiva otvara se samo K i A (docs/07).
 */
export async function pristupKampanji(db: D1Database, korisnik: Korisnik | null, campaignId: string): Promise<PristupKampanji | null> {
  if (!korisnik) return null;
  const r = await db
    .prepare(
      `SELECT c.id, s.public_id, c.created_by, c.state, s.kind, s.beneficiary_approved_at, o.id AS org_id, o.slug,
              (SELECT m.role FROM memberships m WHERE m.user_id = ? AND m.organization_id = o.id AND o.deleted_at IS NULL) AS uloga
         FROM campaigns c JOIN campaign_settings s ON s.campaign_id = c.id
         LEFT JOIN organizations o ON o.organizer_id = c.organizer_id
        WHERE c.id = ? AND c.deleted_at IS NULL`,
    )
    .bind(korisnik.id, campaignId)
    .first<{
      id: string;
      public_id: string;
      created_by: string | null;
      state: string;
      kind: string;
      beneficiary_approved_at: number | null;
      org_id: string | null;
      slug: string | null;
      uloga: Uloga | null;
    }>();
  if (!r) return null;
  const autor = r.created_by === korisnik.id;
  const autorCeka = autor && r.kind === "for_organization" && r.beneficiary_approved_at === null && (r.state === "draft" || r.state === "review");
  const p: PristupKampanji = {
    campaignId: r.id,
    publicId: r.public_id,
    organizationId: r.org_id,
    organizationSlug: r.slug,
    uloga: r.uloga,
    autor,
    autorCeka,
    k: r.uloga !== null || autorCeka,
    moderator: jeModerator(korisnik),
  };
  return p.k || p.moderator ? p : null;
}

/**
 * K (uz `najmanje`: „K (U:editor)” i sl.) za kampanju po javnom ID-u iz rute. Prolazi uloga ≥ `najmanje`
 * (zadano viewer), autor dok čeka odobrenje i moderator. Neprijavljeni → 302 na prijavu; ostali → 404.
 */
export async function zahtijevajKampanju(
  ctx: KontekstPristupa & { db: D1Database },
  javniId: string,
  o: { najmanje?: Uloga } = {},
): Promise<Response | { korisnik: Korisnik; kampanja: PristupKampanji }> {
  const korisnik = zahtijevajPrijavu(ctx);
  if (korisnik instanceof Response) return korisnik;
  const id = javniId.trim().toLowerCase();
  if (!/^[0-9a-z]{6}$/.test(id)) return nema();
  const red = await ctx.db.prepare("SELECT campaign_id FROM campaign_settings WHERE public_id = ?").bind(id).first<{ campaign_id: string }>();
  const kampanja = red && (await pristupKampanji(ctx.db, korisnik, red.campaign_id));
  if (!kampanja) return nema();
  const prolazi = kampanja.moderator || kampanja.autorCeka || imaUlogu(kampanja.uloga, o.najmanje ?? "viewer");
  return prolazi ? { korisnik, kampanja } : nema();
}

export interface OrganizacijaPristupa {
  id: string;
  slug: string;
  displayName: string;
  status: "pending" | "active" | "suspended" | "closed";
  isFixedBeneficiary: boolean;
}

/**
 * U:uloga za organizaciju po slugu iz rute (i `pending`, da vlasnik vidi stanje zahtjeva).
 * Neprijavljeni → 302 na prijavu; bez dovoljne uloge ili nepostojeća → 404. Moderator ne prolazi
 * (moderacija ima `/admin/*`).
 */
export async function zahtijevajOrganizaciju(
  ctx: KontekstPristupa & { db: D1Database },
  slug: string,
  najmanje: Uloga,
): Promise<Response | { korisnik: Korisnik; organizacija: OrganizacijaPristupa; uloga: Uloga }> {
  const korisnik = zahtijevajPrijavu(ctx);
  if (korisnik instanceof Response) return korisnik;
  const r = await ctx.db
    .prepare(
      `SELECT o.id, o.slug, o.display_name, o.status, o.is_fixed_beneficiary, m.role
         FROM organizations o JOIN memberships m ON m.organization_id = o.id AND m.user_id = ?
        WHERE o.slug = ? AND o.deleted_at IS NULL`,
    )
    .bind(korisnik.id, slug.trim().toLowerCase())
    .first<{ id: string; slug: string; display_name: string; status: OrganizacijaPristupa["status"]; is_fixed_beneficiary: number; role: Uloga }>();
  if (!r || !imaUlogu(r.role, najmanje)) return nema();
  return {
    korisnik,
    uloga: r.role,
    organizacija: { id: r.id, slug: r.slug, displayName: r.display_name, status: r.status, isFixedBeneficiary: r.is_fixed_beneficiary === 1 },
  };
}

/** Osjetljive radnje s dodatnom potvrdom (odluka 208). Agenti smiju dodati nove (tekst u sadrzaj/prijava.ts). */
export const RADNJE_POTVRDE = ["refund", "close_campaign", "delete_campaign", "member_role", "delete_account"] as const;
export type RadnjaPotvrde = (typeof RADNJE_POTVRDE)[number];

/** Ima li korisnik svježu (≤ 10 min) iskorištenu dodatnu potvrdu za radnju. */
export async function imaSvjezuPotvrdu(db: D1Database, userId: string, action: string, sad: number): Promise<boolean> {
  const r = await db
    .prepare(
      `SELECT 1 AS da FROM one_time_codes
        WHERE user_id = ? AND purpose = 'step_up' AND action = ? AND used_at IS NOT NULL AND used_at >= ? LIMIT 1`,
    )
    .bind(userId, action, sad - SVJEZA_POTVRDA)
    .first<{ da: number }>();
  return !!r;
}

/**
 * P+e: null kad postoji svježa potvrda za `action`; inače izda kod (mock: demo pošta) i vrati 302 na
 * `/{lang}/potvrda-radnje/{token}?next=<trenutni put>`. Neprijavljeni → 302 na prijavu.
 * Ako ovaj preglednik već ima važeći neiskorišteni kod za istu radnju, ponovno ga koristi (bez novog).
 */
export async function zahtijevajSvjezuPotvrdu(
  ctx: KontekstPristupa & { db: D1Database; cookies: AstroCookies },
  action: RadnjaPotvrde | (string & {}),
  sad: number = Date.now(),
): Promise<Response | null> {
  const korisnik = zahtijevajPrijavu(ctx);
  if (korisnik instanceof Response) return korisnik;
  if (await imaSvjezuPotvrdu(ctx.db, korisnik.id, action, sad)) return null;
  const next = `?next=${encodeURIComponent(ctx.url.pathname + ctx.url.search)}`;
  const postojeci = await postojeciKod(ctx, korisnik.id, action, sad);
  if (postojeci) return preusmjeri(urlRute(ctx.lang, "confirm-action", { token: postojeci }) + next);
  const k = await izdajKod(ctx.db, { email: korisnik.email, userId: korisnik.id, svrha: "step_up", action, sad });
  posaljiDemoPostu(ctx.cookies, ctx.url, { id: k.id, email: korisnik.email, kod: k.kod, link: null });
  return preusmjeri(urlRute(ctx.lang, "confirm-action", { token: k.id }) + next);
}

/** Id važećeg koda za istu radnju iz demo pošte ovog preglednika, ili null. */
async function postojeciKod(ctx: { db: D1Database; cookies: AstroCookies }, userId: string, action: string, sad: number): Promise<string | null> {
  let id: string | undefined;
  try {
    id = (JSON.parse(ctx.cookies.get(KOLACIC_DEMO_POSTE)?.value ?? "null") as { id?: string } | null)?.id;
  } catch {
    return null;
  }
  if (!id) return null;
  const r = await kodPoId(ctx.db, id, sad);
  return r && r.svrha === "step_up" && r.userId === userId && r.action === action && r.stanje === "vrijedi" ? r.id : null;
}
