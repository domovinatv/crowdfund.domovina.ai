/**
 * Članovi organizacije i pozivnice (S6, odluke 150 i 202, docs/08 §5.7): popis (U:viewer), pozivnica e-poštom s
 * ulogom (U:owner, token 7 dana, spremljen samo SHA-256), promjena uloge i uklanjanje (U:owner, P+e) uz pravilo
 * „barem jedan owner”, te prihvat ili odbijanje pozivnice (`/hr/pozivnica/{token}`).
 */
import { ULOGE, isUloga, type Uloga } from "../pristup";
import { hashTokena, noviToken, normalizirajEmail, valjanEmail } from "../sesija";
import { TRAJANJE_POZIVNICE } from "./organizacija";
import { uuid7 } from "./zajednicko";

export { TRAJANJE_POZIVNICE };

export interface Clan {
  userId: string;
  ime: string;
  email: string;
  uloga: Uloga;
  od: number;
}

export async function clanovi(db: D1Database, orgId: string): Promise<Clan[]> {
  const { results } = await db
    .prepare(
      `SELECT m.user_id, m.role, m.created_at, u.email, u.display_name, u.first_name, u.last_name
         FROM memberships m JOIN users u ON u.id = m.user_id
        WHERE m.organization_id = ? AND u.deleted_at IS NULL
        ORDER BY CASE m.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 WHEN 'editor' THEN 2 ELSE 3 END, m.created_at, m.user_id`,
    )
    .bind(orgId)
    .all<{ user_id: string; role: Uloga; created_at: number; email: string; display_name: string | null; first_name: string | null; last_name: string | null }>();
  return results.map((r) => ({
    userId: r.user_id,
    ime: r.display_name || [r.first_name, r.last_name].filter(Boolean).join(" ") || r.email.split("@")[0]!,
    email: r.email,
    uloga: r.role,
    od: r.created_at,
  }));
}

export type StanjePozivnice = "pending" | "expired" | "accepted" | "revoked";

/** Pozivnica `pending` kojoj je prošao rok je istekla i bez zapisa u bazi (GET ništa ne mijenja). */
export const stanjePozivnice = (status: StanjePozivnice, istjece: number, sad: number): StanjePozivnice =>
  status === "pending" && istjece <= sad ? "expired" : status;

export interface Pozivnica {
  id: string;
  email: string;
  uloga: Uloga;
  stanje: StanjePozivnice;
  istjece: number;
  pozvao: string;
}

/** Pozivnice na čekanju (i istekle koje još stoje kao `pending`), najnovije prve. */
export async function pozivniceNaCekanju(db: D1Database, orgId: string, sad: number = Date.now()): Promise<Pozivnica[]> {
  const { results } = await db
    .prepare(
      `SELECT i.id, i.email, i.role, i.status, i.expires_at, COALESCE(u.display_name, u.email) AS pozvao
         FROM membership_invites i JOIN users u ON u.id = i.invited_by
        WHERE i.organization_id = ? AND i.status = 'pending' ORDER BY i.created_at DESC, i.id`,
    )
    .bind(orgId)
    .all<{ id: string; email: string; role: Uloga; status: StanjePozivnice; expires_at: number; pozvao: string }>();
  return results.map((r) => ({ id: r.id, email: r.email, uloga: r.role, stanje: stanjePozivnice(r.status, r.expires_at, sad), istjece: r.expires_at, pozvao: r.pozvao }));
}

export type GreskaPozivnice = "email_prazno" | "email_neispravan" | "uloga" | "vec_clan";

/**
 * Nova pozivnica (U:owner). Prethodna pozivnica `pending` za istu e-poštu se opoziva. Vraća token (samo jednom;
 * u bazi je hash), koji pogled pokazuje u demo okviru jer prototip ne šalje e-poštu.
 */
export async function pozovi(
  db: D1Database,
  o: { orgId: string; email: string; uloga: string; pozvao: string },
  sad: number = Date.now(),
): Promise<{ ok: true; token: string; id: string } | { ok: false; greska: GreskaPozivnice }> {
  const email = normalizirajEmail(o.email);
  if (!email) return { ok: false, greska: "email_prazno" };
  if (!valjanEmail(email)) return { ok: false, greska: "email_neispravan" };
  if (!isUloga(o.uloga)) return { ok: false, greska: "uloga" };
  const clan = await db
    .prepare("SELECT 1 AS da FROM memberships m JOIN users u ON u.id = m.user_id WHERE m.organization_id = ? AND u.email = ?")
    .bind(o.orgId, email)
    .first();
  if (clan) return { ok: false, greska: "vec_clan" };
  await db
    .prepare("UPDATE membership_invites SET status = 'revoked' WHERE organization_id = ? AND email = ? AND status = 'pending'")
    .bind(o.orgId, email)
    .run();
  const token = noviToken();
  const id = uuid7(sad);
  await db
    .prepare(
      `INSERT INTO membership_invites (id, organization_id, email, role, token_hash, status, invited_by, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
    )
    .bind(id, o.orgId, email, o.uloga, await hashTokena(token), o.pozvao, sad, sad + TRAJANJE_POZIVNICE)
    .run();
  return { ok: true, token, id };
}

export async function opozoviPozivnicu(db: D1Database, orgId: string, id: string): Promise<boolean> {
  const r = await db
    .prepare("UPDATE membership_invites SET status = 'revoked' WHERE id = ? AND organization_id = ? AND status = 'pending'")
    .bind(id, orgId)
    .run();
  return (r.meta as { changes?: number }).changes === 1;
}

export type GreskaClana = "nije_clan" | "zadnji_owner" | "uloga";

async function brojVlasnika(db: D1Database, orgId: string): Promise<number> {
  const r = await db.prepare("SELECT count(*) AS n FROM memberships WHERE organization_id = ? AND role = 'owner'").bind(orgId).first<{ n: number }>();
  return r?.n ?? 0;
}

/** Promjena uloge (U:owner, P+e u učitavaču): zadnji `owner` ne može postati niža uloga. */
export async function promijeniUlogu(
  db: D1Database,
  orgId: string,
  userId: string,
  uloga: string,
  sad: number = Date.now(),
): Promise<{ ok: true } | { ok: false; greska: GreskaClana }> {
  if (!isUloga(uloga)) return { ok: false, greska: "uloga" };
  const r = await db.prepare("SELECT role FROM memberships WHERE organization_id = ? AND user_id = ?").bind(orgId, userId).first<{ role: Uloga }>();
  if (!r) return { ok: false, greska: "nije_clan" };
  if (r.role === uloga) return { ok: true };
  if (r.role === "owner" && (await brojVlasnika(db, orgId)) <= 1) return { ok: false, greska: "zadnji_owner" };
  await db.prepare("UPDATE memberships SET role = ?, updated_at = ? WHERE organization_id = ? AND user_id = ?").bind(uloga, sad, orgId, userId).run();
  return { ok: true };
}

/** Uklanjanje člana (U:owner, P+e u učitavaču): zadnji `owner` se ne može ukloniti. */
export async function ukloniClana(db: D1Database, orgId: string, userId: string): Promise<{ ok: true } | { ok: false; greska: GreskaClana }> {
  const r = await db.prepare("SELECT role FROM memberships WHERE organization_id = ? AND user_id = ?").bind(orgId, userId).first<{ role: Uloga }>();
  if (!r) return { ok: false, greska: "nije_clan" };
  if (r.role === "owner" && (await brojVlasnika(db, orgId)) <= 1) return { ok: false, greska: "zadnji_owner" };
  await db.prepare("DELETE FROM memberships WHERE organization_id = ? AND user_id = ?").bind(orgId, userId).run();
  return { ok: true };
}

// --- Pozivnica po tokenu (`/hr/pozivnica/{token}`) ------------------------------------------------------

export interface PozivnicaPoTokenu {
  id: string;
  email: string;
  uloga: Uloga;
  stanje: StanjePozivnice;
  istjece: number;
  pozvao: string;
  organizacija: { id: string; slug: string; naziv: string; status: string };
}

export async function pozivnicaPoTokenu(db: D1Database, token: string, sad: number = Date.now()): Promise<PozivnicaPoTokenu | null> {
  if (!token || token.length > 200) return null;
  const r = await db
    .prepare(
      `SELECT i.id, i.email, i.role, i.status, i.expires_at, COALESCE(u.display_name, u.email) AS pozvao,
              o.id AS org_id, o.slug, o.display_name, o.status AS org_status
         FROM membership_invites i
         JOIN organizations o ON o.id = i.organization_id AND o.deleted_at IS NULL
         JOIN users u ON u.id = i.invited_by
        WHERE i.token_hash = ?`,
    )
    .bind(await hashTokena(token))
    .first<{
      id: string;
      email: string;
      role: Uloga;
      status: StanjePozivnice;
      expires_at: number;
      pozvao: string;
      org_id: string;
      slug: string;
      display_name: string;
      org_status: string;
    }>();
  if (!r) return null;
  return {
    id: r.id,
    email: r.email,
    uloga: r.role,
    stanje: stanjePozivnice(r.status, r.expires_at, sad),
    istjece: r.expires_at,
    pozvao: r.pozvao,
    organizacija: { id: r.org_id, slug: r.slug, naziv: r.display_name, status: r.org_status },
  };
}

export type IshodPozivnice = "prihvacena" | "odbijena" | "vec_clan" | "nije_na_cekanju" | "druga_eposta" | "nema";

/**
 * Prihvat (P): pozivnica `pending` u roku, e-pošta prijavljenog = e-pošta pozivnice. Član postaje član s ulogom
 * iz pozivnice; tko je već član ostaje s postojećom ulogom, a pozivnica se svejedno zatvara (`accepted`).
 */
export async function prihvatiPozivnicu(
  db: D1Database,
  token: string,
  korisnik: { id: string; email: string },
  sad: number = Date.now(),
): Promise<IshodPozivnice> {
  const p = await pozivnicaPoTokenu(db, token, sad);
  if (!p) return "nema";
  if (p.stanje !== "pending") return "nije_na_cekanju";
  if (normalizirajEmail(korisnik.email) !== normalizirajEmail(p.email)) return "druga_eposta";
  await db.prepare("UPDATE membership_invites SET status = 'accepted' WHERE id = ?").bind(p.id).run();
  const clan = await db.prepare("SELECT 1 AS da FROM memberships WHERE organization_id = ? AND user_id = ?").bind(p.organizacija.id, korisnik.id).first();
  if (clan) return "vec_clan";
  const pozvao = await db.prepare("SELECT invited_by FROM membership_invites WHERE id = ?").bind(p.id).first<{ invited_by: string }>();
  await db
    .prepare("INSERT INTO memberships (user_id, organization_id, role, invited_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(korisnik.id, p.organizacija.id, p.uloga, pozvao?.invited_by ?? null, sad, sad)
    .run();
  return "prihvacena";
}

/** Odbijanje (P, ista e-pošta): pozivnica postaje `revoked`. */
export async function odbijPozivnicu(
  db: D1Database,
  token: string,
  korisnik: { id: string; email: string },
  sad: number = Date.now(),
): Promise<IshodPozivnice> {
  const p = await pozivnicaPoTokenu(db, token, sad);
  if (!p) return "nema";
  if (p.stanje !== "pending") return "nije_na_cekanju";
  if (normalizirajEmail(korisnik.email) !== normalizirajEmail(p.email)) return "druga_eposta";
  await db.prepare("UPDATE membership_invites SET status = 'revoked' WHERE id = ?").bind(p.id).run();
  return "odbijena";
}

export { ULOGE };
