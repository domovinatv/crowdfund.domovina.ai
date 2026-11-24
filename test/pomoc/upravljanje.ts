/**
 * Okolina testova upravljanja kampanjom (S6, agent B): svježa seedana baza, korisnici po ulozi u organizaciji
 * aktivne demo kampanje (owner, admin, editor, viewer), moderator, novi bez članstva, i svježa dodatna potvrda
 * (P+e) upisom iskorištenog `step_up` koda.
 */
import primjeri from "../../seed/primjeri.json";
import type { Korisnik } from "../../src/lib/pristup";
import { korisnikPoEmailu, korisnikSesije } from "../../src/lib/sesija";
import { kaoD1, novaBaza, redovi } from "./baza";

export type Uloga = "owner" | "admin" | "editor" | "viewer" | "moderator" | "novi";

export async function okolina() {
  const sqlite = novaBaza({ seed: true });
  const db = kaoD1(sqlite);
  const sad = Date.now();
  const kampanja = (publicId: string) =>
    redovi<{ id: string; public_id: string; org_id: string; created_by: string | null }>(
      sqlite,
      `SELECT c.id, s.public_id, o.id AS org_id, c.created_by FROM campaigns c JOIN campaign_settings s ON s.campaign_id = c.id
         JOIN organizations o ON o.organizer_id = c.organizer_id WHERE s.public_id = ?`,
      publicId,
    )[0]!;
  const aktivna = kampanja(primjeri.kampanja.aktivna);
  const poEmailu = async (email: string): Promise<Korisnik> => {
    const k = (await korisnikPoEmailu(db, email))!;
    return { id: k.id, email: k.email, ime: k.ime, platformRole: k.platformRole };
  };
  const owner = (await korisnikSesije(db, primjeri.demoSesija, sad))!;
  const moderator = (await korisnikSesije(db, primjeri.demoSesijaModerator, sad))!;
  const novi = (await korisnikSesije(db, primjeri.demoSesijaNovi, sad))!;
  const admin = await poEmailu("petra.probic@demo.invalid");
  const editor = await poEmailu("katarina.zamisljic@demo.invalid");
  const viewer = await poEmailu("marko.oglednic@demo.invalid");
  // Uloge u organizaciji aktivne kampanje neovisno o tome kako seed (agent C) raspoređuje članove.
  for (const [k, uloga] of [[owner, "owner"], [admin, "admin"], [editor, "editor"], [viewer, "viewer"]] as const) {
    sqlite
      .prepare(
        `INSERT INTO memberships (user_id, organization_id, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (user_id, organization_id) DO UPDATE SET role = excluded.role`,
      )
      .run(k.id, aktivna.org_id, uloga, sad, sad);
  }
  const korisnici: Record<Uloga, Korisnik> = { owner, admin, editor, viewer, moderator, novi };

  /** Svježa dodatna potvrda kodom za radnju (kao da je korisnik upravo upisao kod). */
  const potvrdi = (k: Korisnik, action: string) =>
    sqlite
      .prepare(
        `INSERT INTO one_time_codes (id, user_id, email, purpose, action, code_hash, created_at, expires_at, used_at)
         VALUES (?, ?, ?, 'step_up', ?, 'test', ?, ?, ?)`,
      )
      .run(crypto.randomUUID(), k.id, k.email, action, sad - 1000, sad + 600_000, sad - 500);

  return { sqlite, db, sad, aktivna, kampanja, korisnici, potvrdi };
}

export const status = (r: unknown) => (r instanceof Response ? r.status : 200);
export const lokacija = (r: unknown) => (r as Response).headers.get("Location");
export const podaci = <T>(r: unknown): T => (r as { podaci: T }).podaci;
