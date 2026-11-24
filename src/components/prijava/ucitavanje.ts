/**
 * Zajedničko učitavačima prijave (S6): čitanje obrasca, `next`, slanje koda i unos koda za
 * `/prijava/kod` (login) i `/registracija/potvrda` (email_verify).
 */
import type { AstroCookies } from "astro";
import type { Lang } from "../../i18n";
import { url, type KljucRute } from "../../lib/rute";
import {
  KOLACIC_PRIJAVE,
  izdajKod,
  kodPoId,
  korisnikPoEmailu,
  posaljiDemoPostu,
  postaviPrijavu,
  postaviSesiju,
  prijavi,
  procitajDemoPostu,
  provjeriKod,
  sigurniNext,
  type DemoPoruka,
  type RazlogNeuspjeha,
  type StanjeKoda,
  type Svrha,
} from "../../lib/sesija";
import type { KontekstStranice } from "../../views/tipovi";

export const niz = (x: FormDataEntryValue | null | undefined): string => (typeof x === "string" ? x : "");

/** `next` iz upita ili obrasca: provjeren relativni put, ili "" kad ga nema. */
export function nextIz(v: string | null | undefined, lang: Lang): string {
  return v ? sigurniNext(v, lang) : "";
}

/** `?next=…` ili "". */
export const upitNext = (next: string): string => (next ? `?next=${encodeURIComponent(next)}` : "");

export const preusmjeri303 = (gdje: string): Response => new Response(null, { status: 303, headers: { Location: gdje, "Cache-Control": "private, no-store" } });

/** Izdaj kod (i poveznicu), zapamti ga za sljedeći ekran i „pošalji” u demo poštu. */
export async function posaljiKod(
  ctx: { db: D1Database; cookies: AstroCookies; url: URL },
  o: { email: string; userId: string | null; svrha: Exclude<Svrha, "step_up">; next: string; sad: number },
): Promise<void> {
  const k = await izdajKod(ctx.db, { email: o.email, userId: o.userId, svrha: o.svrha, sad: o.sad });
  postaviPrijavu(ctx.cookies, ctx.url, k.id);
  posaljiDemoPostu(ctx.cookies, ctx.url, { id: k.id, email: o.email, kod: k.kod, link: `/auth/link/${k.link}${upitNext(o.next)}` });
}

export interface PodaciUnosaKoda {
  /** „nema” = ovaj preglednik nema poslan kod (kolačić `prijava`). */
  stanje: StanjeKoda | "nema";
  email: string | null;
  istjece: number | null;
  demo: DemoPoruka | null;
  next: string;
  greska: RazlogNeuspjeha | null;
  preostalo: number | null;
}

/**
 * Unos koda: GET prikazuje stanje koda iz kolačića `prijava`; POST `kod` → sesija i 303 na `next`;
 * POST `ponovo=1` → novi kod za istu e-poštu i 303 na istu stranicu.
 */
export async function ucitajUnosKoda(
  ctx: KontekstStranice,
  svrha: Exclude<Svrha, "step_up">,
  ruta: KljucRute,
  sad: number = Date.now(),
): Promise<Response | { podaci: PodaciUnosaKoda }> {
  const id = ctx.cookies.get(KOLACIC_PRIJAVE)?.value ?? "";
  let next = nextIz(ctx.url.searchParams.get("next"), ctx.lang);
  let greska: RazlogNeuspjeha | null = null;
  let preostalo: number | null = null;

  if (ctx.request.method === "POST") {
    const f = await ctx.request.formData();
    next = nextIz(niz(f.get("next")) || ctx.url.searchParams.get("next"), ctx.lang);
    const red = id ? await kodPoId(ctx.db, id, sad) : null;
    if (niz(f.get("ponovo")) === "1") {
      if (red && red.svrha === svrha) {
        await posaljiKod(ctx, { email: red.email, userId: red.userId, svrha, next, sad });
      }
      return preusmjeri303(url(ctx.lang, ruta) + upitNext(next));
    }
    const ishod = await provjeriKod(ctx.db, { id, kod: niz(f.get("kod")), svrha, sad });
    if (ishod.ok) {
      const userId = ishod.userId ?? (await korisnikPoEmailu(ctx.db, ishod.email))?.id;
      if (userId) {
        const s = await prijavi(ctx.db, {
          userId,
          email: ishod.email,
          nacin: "email_code",
          sad,
          ip: ctx.request.headers.get("cf-connecting-ip"),
          userAgent: ctx.request.headers.get("user-agent"),
        });
        postaviSesiju(ctx.cookies, ctx.url, s);
        return preusmjeri303(sigurniNext(next, ctx.lang));
      }
      greska = "nema";
    } else {
      greska = ishod.razlog;
      preostalo = ishod.preostalo ?? null;
    }
  }

  const red = id ? await kodPoId(ctx.db, id, sad) : null;
  const vrijedi = red && red.svrha === svrha;
  return {
    podaci: {
      stanje: vrijedi ? red.stanje : "nema",
      email: vrijedi ? red.email : null,
      istjece: vrijedi ? red.istjece : null,
      demo: vrijedi ? procitajDemoPostu(ctx.cookies, red.id) : null,
      next,
      greska,
      preostalo,
    },
  };
}
