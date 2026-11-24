/**
 * Poruke s obrasca za kontakt (`/hr/kontakt`, ekran 21) u tablicu `contact_messages`
 * (migrations/0002_platform.sql). Validacija je ista kao CHECK ograničenja tablice, pa baza nikad
 * ne odbija ono što je validacija pustila. Kodovi grešaka su neovisni o jeziku; tekst je u pogledu.
 */

/** 10 tema obrasca (CHECK `topic IN (…)`, docs/research/obilazak/21-kontakt.md „Za nas”). */
export const TEME_KONTAKTA = [
  "account_verification",
  "campaign_verification",
  "email_change",
  "safe_or_account",
  "account_block",
  "report_abuse",
  "offers",
  "promotion",
  "suggestion",
  "other",
] as const;
export type TemaKontakta = (typeof TEME_KONTAKTA)[number];
export const isTemaKontakta = (x: unknown): x is TemaKontakta => TEME_KONTAKTA.includes(x as TemaKontakta);

/** Granice u znakovima (Unicode code pointi, kao SQLite `length()`). E-pošta po RFC 5321. */
export const NAJVISE = { name: 255, email: 254, content: 5000 } as const;

export type PoljeKontakta = "name" | "email" | "topic" | "content";
export type GreskaPolja = "obavezno" | "predugo" | "neispravno";
export type GreskeKontakta = Partial<Record<PoljeKontakta, GreskaPolja>>;

export interface UlazKontakta {
  name?: unknown;
  email?: unknown;
  topic?: unknown;
  content?: unknown;
}

export interface PorukaKontakta {
  name: string;
  email: string;
  topic: TemaKontakta;
  content: string;
  userId: string | null;
}

export type RezultatKontakta<T> = { ok: true } & T | { ok: false; greske: GreskeKontakta };

const tekst = (x: unknown): string => (typeof x === "string" ? x.trim() : "");
const znakova = (s: string): number => [...s].length;
const EPOSTA = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validirajPorukuKontakta(ulaz: UlazKontakta, userId: string | null = null): RezultatKontakta<{ poruka: PorukaKontakta }> {
  const name = tekst(ulaz.name);
  const email = tekst(ulaz.email);
  const topic = tekst(ulaz.topic);
  // Poruka čuva unutarnje prijelome; obrezuju se samo rubni razmaci.
  const content = tekst(ulaz.content).replace(/\r\n?/g, "\n");
  const greske: GreskeKontakta = {};

  if (!name) greske.name = "obavezno";
  else if (znakova(name) > NAJVISE.name) greske.name = "predugo";

  if (!email) greske.email = "obavezno";
  else if (znakova(email) > NAJVISE.email) greske.email = "predugo";
  else if (!EPOSTA.test(email)) greske.email = "neispravno";

  if (!topic) greske.topic = "obavezno";
  else if (!isTemaKontakta(topic)) greske.topic = "neispravno";

  if (!content) greske.content = "obavezno";
  else if (znakova(content) > NAJVISE.content) greske.content = "predugo";

  if (Object.keys(greske).length > 0) return { ok: false, greske };
  return { ok: true, poruka: { name, email, topic: topic as TemaKontakta, content, userId } };
}

/** UUIDv7 (odluka 212): 48 bita unix ms + slučajni bitovi. */
export function uuidv7(sad: number = Date.now()): string {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  let t = sad;
  for (let i = 5; i >= 0; i--) {
    b[i] = t % 256;
    t = Math.floor(t / 256);
  }
  b[6] = (b[6]! & 0x0f) | 0x70;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/**
 * Validira i sprema poruku. Ne baca na neispravan unos: vraća kodove grešaka po polju.
 * `userId` je prijavljeni korisnik (auth je S6; dotad `null`).
 */
export async function spremiPorukuKontakta(
  db: D1Database,
  ulaz: UlazKontakta,
  opcije: { userId?: string | null; sad?: number; id?: string } = {},
): Promise<RezultatKontakta<{ id: string }>> {
  const v = validirajPorukuKontakta(ulaz, opcije.userId ?? null);
  if (!v.ok) return v;
  const sad = opcije.sad ?? Date.now();
  const id = opcije.id ?? uuidv7(sad);
  const p = v.poruka;
  await db
    .prepare("INSERT INTO contact_messages (id, name, email, topic, content, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(id, p.name, p.email, p.topic, p.content, p.userId, sad)
    .run();
  return { ok: true, id };
}
