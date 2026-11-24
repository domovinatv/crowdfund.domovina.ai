/**
 * Članovi `/hr/o/{slug}/clanovi` (popis U:viewer, izmjene U:owner, docs/08 §5.7). POST `radnja`:
 * `pozovi` (e-pošta + uloga → pozivnica 7 dana; link u demo okviru preko kratkog kolačića jer nema pošte),
 * `opozovi`, `uloga` i `ukloni` (P+e `member_role`, barem jedan owner). Ne-vlasnik na POST dobiva 404.
 */
import { obrazac, organizacijaRute, polje, preusmjeri303 } from "../../components/organizacija/ucitavanje";
import { clanovi, opozoviPozivnicu, pozivniceNaCekanju, pozovi, promijeniUlogu, ukloniClana, type Clan, type GreskaClana, type GreskaPozivnice, type Pozivnica } from "../../lib/db/clanovi";
import { zahtijevajSvjezuPotvrdu, type OrganizacijaPristupa, type Uloga } from "../../lib/pristup";
import { url } from "../../lib/rute";
import { nijePronadeno, type Ucitaj } from "../tipovi";

/** Kratki kolačić s tokenom zadnje pozivnice (demo pošta), samo za stranicu članova te organizacije. */
export const KOLACIC_DEMO_POZIVNICE = "demo_pozivnica";

export interface PodaciClanova {
  organizacija: OrganizacijaPristupa;
  uloga: Uloga;
  ja: string;
  mozeUredjivati: boolean;
  clanovi: Clan[];
  pozivnice: Pozivnica[];
  sad: number;
  poziv: { email: string; uloga: string; greska: GreskaPozivnice | null };
  greskaClana: GreskaClana | null;
  demo: { email: string; link: string } | null;
  spremljeno: boolean;
}

export const ucitaj: Ucitaj<PodaciClanova> = async (ctx) => {
  const p = await organizacijaRute(ctx, "viewer");
  if (p instanceof Response) return p;
  const orgId = p.organizacija.id;
  const ovdje = url(ctx.lang, "org.members", { slug: p.organizacija.slug });
  const vlasnik = p.uloga === "owner";
  const f = await obrazac(ctx);
  let poziv: PodaciClanova["poziv"] = { email: "", uloga: "editor", greska: null };
  let greskaClana: GreskaClana | null = null;
  if (f) {
    if (!vlasnik) return nijePronadeno();
    const radnja = polje(f, "radnja");
    if (radnja === "pozovi") {
      poziv = { email: polje(f, "email"), uloga: polje(f, "uloga"), greska: null };
      const r = await pozovi(ctx.db, { orgId, email: poziv.email, uloga: poziv.uloga, pozvao: p.korisnik.id });
      if (r.ok) {
        ctx.cookies.set(KOLACIC_DEMO_POZIVNICE, JSON.stringify({ email: poziv.email.toLowerCase(), token: r.token }), {
          path: ovdje,
          httpOnly: true,
          sameSite: "lax",
          secure: ctx.url.protocol === "https:",
          maxAge: 600,
        });
        return preusmjeri303(`${ovdje}?spremljeno=1`);
      }
      poziv.greska = r.greska;
    } else if (radnja === "opozovi") {
      await opozoviPozivnicu(ctx.db, orgId, polje(f, "id"));
      return preusmjeri303(`${ovdje}?spremljeno=1`);
    } else if (radnja === "uloga" || radnja === "ukloni") {
      const potvrda = await zahtijevajSvjezuPotvrdu(ctx, "member_role");
      if (potvrda) return potvrda;
      const userId = polje(f, "userId");
      const r = radnja === "uloga" ? await promijeniUlogu(ctx.db, orgId, userId, polje(f, "uloga")) : await ukloniClana(ctx.db, orgId, userId);
      if (r.ok) {
        if (userId === p.korisnik.id && radnja === "ukloni") return preusmjeri303(url(ctx.lang, "organisation.new"));
        return preusmjeri303(`${ovdje}?spremljeno=1`);
      }
      greskaClana = r.greska;
    } else return nijePronadeno();
  }
  let demo: PodaciClanova["demo"] = null;
  try {
    const d = JSON.parse(ctx.cookies.get(KOLACIC_DEMO_POZIVNICE)?.value ?? "null") as { email?: string; token?: string } | null;
    if (vlasnik && d?.email && d.token) demo = { email: d.email, link: url(ctx.lang, "invite", { token: d.token }) };
  } catch {
    demo = null;
  }
  const sad = Date.now();
  return {
    podaci: {
      organizacija: p.organizacija,
      uloga: p.uloga,
      ja: p.korisnik.id,
      mozeUredjivati: vlasnik,
      clanovi: await clanovi(ctx.db, orgId),
      pozivnice: vlasnik ? await pozivniceNaCekanju(ctx.db, orgId, sad) : [],
      sad,
      poziv,
      greskaClana,
      demo,
      spremljeno: !f && ctx.url.searchParams.get("spremljeno") === "1",
    },
  };
};
