/**
 * Mjesečna podrška i ostatak checkouta (S8, agent A): pravila termina i obrasca, prvi mjesec kroz checkout,
 * `dospjeliPodsjetnici` (mock e-pošta, idempotentno, pauza nakon 3 neplaćena), stranica podsjetnika (T),
 * postavke, privola uvjeta u `consents`, poruka kao komentar i mock e-poruka organizatoru tek kad je doprinos
 * `paid`. Bez mreže: MPT je dvojnik `test/pomoc/mpt-dvojnik.ts`.
 */
import { readFileSync } from "node:fs";
import type { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prazanObrazac, provjeriObrazac, stvoriCheckout, type ObrazacCheckouta } from "../src/lib/db/checkout";
import {
  NEPLACENIH_DO_PAUZE,
  ROK_PODSJETNIKA,
  dospjeliPodsjetnici,
  mjesecnoDopusteno,
  posaljiPodsjetnik,
  provjeriPonavljanje,
  razdoblje,
  sljedeciTermin,
  stvoriObecanje,
} from "../src/lib/db/ponavljanje";
import { porukeOUplatama } from "../src/lib/db/obavijesti";
import { promijeniPonavljanje } from "../src/lib/db/postavke";
import { uskladiCheckout } from "../src/lib/db/uplate";
import { korisnikSesije, type Korisnik } from "../src/lib/sesija";
import { ucitaj as ucitajPodrsku, type PodaciPodrske } from "../src/views/stranice/campaign.support.ucitaj";
import { ucitaj as ucitajPodsjetnik, type PodaciPodsjetnika } from "../src/views/stranice/reminder.ucitaj";
import { ucitaj as ucitajPostavke, type PodaciPonavljanja } from "../src/views/stranice/settings.recurring.ucitaj";
import { ucitaj as ucitajObavijesti, type PodaciObavijesti } from "../src/views/stranice/campaign.manage.notifications.ucitaj";
import { broj, kaoD1, novaBaza, PRIMJERI, redovi } from "./pomoc/baza";
import { kontekst } from "./pomoc/kontekst";
import { dvojnikMpt, type DvojnikMpt } from "./pomoc/mpt-dvojnik";

const primjeri = JSON.parse(readFileSync(PRIMJERI, "utf8")) as { kampanja: Record<string, string>; demoSesija: string; demoSesijaNovi: string };
const MJESECNA = primjeri.kampanja.mjesecna!;
const AKTIVNA = primjeri.kampanja.aktivna!;
const DAN_MS = 86_400_000;

let sqlite: DatabaseSync;
let db: D1Database;
let dv: DvojnikMpt;
let korisnik: Korisnik;

beforeEach(async () => {
  sqlite = novaBaza({ seed: true });
  db = kaoD1(sqlite);
  dv = dvojnikMpt();
  korisnik = (await korisnikSesije(db, primjeri.demoSesijaNovi, Date.now()))!;
  vi.stubGlobal("fetch", dv.dohvat);
});
afterEach(() => vi.unstubAllGlobals());

const env = () => ({ MPT_API_URL: dv.konfig.apiUrl, MPT_SECRET_KEY: dv.konfig.secretKey, MPT_TIP_TARGET: dv.konfig.tipTarget });
const idKampanje = (publicId: string) =>
  (sqlite.prepare("SELECT campaign_id FROM campaign_settings WHERE public_id = ?").get(publicId) as { campaign_id: string }).campaign_id;
const podrska = (publicId: string, obrazac: Record<string, string>, k: Korisnik | null = korisnik) =>
  ucitajPodrsku({ ...kontekst(db, `/hr/${publicId}/podrzi`, { params: { id: publicId }, obrazac, korisnik: k }), env: env() });
const checkoutIz = (r: unknown) => (r as Response).headers.get("location")!.split("/").pop()!;
/** Simulira uplatu na railu i povuče stanje (isti put kao webhook). */
async function plati(checkoutId: string) {
  const sid = (sqlite.prepare("SELECT contribution_sid FROM checkouts WHERE id = ?").get(checkoutId) as { contribution_sid: string }).contribution_sid;
  await dv.simuliraj(sid, "paid");
  await uskladiCheckout(db, dv.konfig, checkoutId, dv.dohvat);
}

describe("pravila", () => {
  it("termin: dan u 7:00 UTC, strogo nakon `sad`, u mjesecu nakon pokrivenog", () => {
    const sad = Date.UTC(2026, 10, 25, 12); // 25. 11. 2026.
    expect(new Date(sljedeciTermin(5, sad, null)).toISOString()).toBe("2026-12-05T07:00:00.000Z");
    expect(new Date(sljedeciTermin(28, sad, null)).toISOString()).toBe("2026-11-28T07:00:00.000Z");
    expect(new Date(sljedeciTermin(28, sad, "2026-11")).toISOString()).toBe("2026-12-28T07:00:00.000Z");
    expect(new Date(sljedeciTermin(1, Date.UTC(2026, 11, 20), "2026-12")).toISOString()).toBe("2027-01-01T07:00:00.000Z");
    expect(razdoblje(Date.UTC(2027, 0, 1))).toBe("2027-01");
  });

  it("mjesečno samo za vrstu recurring ili recurrence monthly", () => {
    expect(mjesecnoDopusteno({ kind: "recurring", recurrence: "none" })).toBe(true);
    expect(mjesecnoDopusteno({ kind: "one_time", recurrence: "monthly" })).toBe(true);
    expect(mjesecnoDopusteno({ kind: "one_time", recurrence: "none" })).toBe(false);
    expect(mjesecnoDopusteno({ kind: "for_organization", recurrence: "yearly" })).toBe(false);
  });

  it("obrazac: jednom uvijek prolazi; mjesečno traži prijavu, dopuštenu kampanju, dan 1–28 i način", () => {
    const u = { ucestalost: "mjesecno", dan: "15", nacin: "reminder" };
    expect(provjeriPonavljanje({ ...u, ucestalost: "jednom" }, { prijavljen: false, dopusteno: false })).toEqual({ ok: true, mjesecno: null });
    expect(provjeriPonavljanje(u, { prijavljen: true, dopusteno: true })).toEqual({ ok: true, mjesecno: { dan: 15, nacin: "reminder" } });
    expect(provjeriPonavljanje(u, { prijavljen: false, dopusteno: true })).toEqual({ ok: false, greske: { ucestalost: "prijava" } });
    expect(provjeriPonavljanje(u, { prijavljen: true, dopusteno: false })).toEqual({ ok: false, greske: { ucestalost: "nedopusteno" } });
    for (const dan of ["0", "29", "", "1.5", "abc"]) {
      expect(provjeriPonavljanje({ ...u, dan }, { prijavljen: true, dopusteno: true }), dan).toEqual({ ok: false, greske: { dan: "nevaljan" } });
    }
    expect(provjeriPonavljanje({ ...u, nacin: "sepa_dd" }, { prijavljen: true, dopusteno: true })).toEqual({ ok: false, greske: { nacin: "nevaljan" } });
  });
});

describe("checkout: mjesečno", () => {
  it("prijavljeni na mjesečnoj kampanji: obećanje + prvi mjesec s recurring_pledge_id; podsjetnik idući mjesec", async () => {
    const prije = Date.now();
    const r = await podrska(MJESECNA, { izbor: "svoj", svojIznos: "15", ucestalost: "mjesecno", dan: "10", nacin: "reminder" });
    expect((r as Response).status).toBe(303);
    const ch = checkoutIz(r);
    const [o] = redovi<{ id: string; amount_cents: number; day_of_month: number; mode: string; status: string; next_reminder_at: number; user_id: string }>(
      sqlite,
      "SELECT r.* FROM recurring_pledges r JOIN checkouts c ON c.recurring_pledge_id = r.id WHERE c.id = ?",
      ch,
    );
    expect(o).toMatchObject({ amount_cents: 1500, day_of_month: 10, mode: "reminder", status: "active", user_id: korisnik.id });
    expect(razdoblje(o!.next_reminder_at) > razdoblje(prije)).toBe(true);
    expect(new Date(o!.next_reminder_at).getUTCDate()).toBe(10);
    // Prijavljeni: bez privole u `consents` (prihvatio pri registraciji, odluka 725).
    expect(broj(sqlite, "SELECT count(*) FROM consents WHERE created_at >= ? AND kind = 'terms_privacy' AND email IS NOT NULL", prije)).toBe(0);
  });

  it("trajni nalog: obećanje bez termina podsjetnika", async () => {
    const r = await podrska(MJESECNA, { izbor: "svoj", svojIznos: "20", ucestalost: "mjesecno", dan: "3", nacin: "standing_order" });
    const o = sqlite.prepare("SELECT r.mode, r.next_reminder_at FROM recurring_pledges r JOIN checkouts c ON c.recurring_pledge_id = r.id WHERE c.id = ?").get(checkoutIz(r));
    expect(o).toEqual({ mode: "standing_order", next_reminder_at: null });
  });

  it("neprijavljeni i nemjesečna kampanja: greška uz učestalost, ništa se ne upisuje", async () => {
    const n = broj(sqlite, "SELECT count(*) FROM recurring_pledges");
    const anon = (await podrska(MJESECNA, { izbor: "svoj", svojIznos: "15", email: "a@example.org", uvjeti: "1", ucestalost: "mjesecno", dan: "10", nacin: "reminder" }, null)) as { podaci: PodaciPodrske };
    expect(anon.podaci.greskePonavljanja).toEqual({ ucestalost: "prijava" });
    const jednokratna = (await podrska(AKTIVNA, { izbor: "svoj", svojIznos: "15", ucestalost: "mjesecno", dan: "10", nacin: "reminder" })) as { podaci: PodaciPodrske };
    expect(jednokratna.podaci.mjesecno).toBe(false);
    expect(jednokratna.podaci.greskePonavljanja).toEqual({ ucestalost: "nedopusteno" });
    expect(broj(sqlite, "SELECT count(*) FROM recurring_pledges")).toBe(n);
    const get = (await ucitajPodrsku({ ...kontekst(db, `/hr/${MJESECNA}/podrzi?ucestalost=mjesecno`, { params: { id: MJESECNA } }), env: env() })) as { podaci: PodaciPodrske };
    expect(get.podaci.mjesecno).toBe(true);
    expect(get.podaci.ponavljanje.ucestalost).toBe("mjesecno");
  });

  it("MPT ne odgovara: obećanje se otkazuje", async () => {
    vi.stubGlobal("fetch", async () => new Response("{}", { status: 503 }));
    const r = (await podrska(MJESECNA, { izbor: "svoj", svojIznos: "15", ucestalost: "mjesecno", dan: "10", nacin: "reminder" })) as { podaci: PodaciPodrske };
    expect(r.podaci.greskaUplate).toBe("mpt");
    const o = sqlite.prepare("SELECT status FROM recurring_pledges WHERE user_id = ? ORDER BY created_at DESC LIMIT 1").get(korisnik.id) as { status: string };
    expect(o.status).toBe("cancelled");
  });
});

describe("podsjetnici", () => {
  async function obecanje(dan = 10, sad = Date.UTC(2026, 10, 25, 12)) {
    return stvoriObecanje(db, { userId: korisnik.id, campaignId: idKampanje(MJESECNA), iznosCenti: 1200, dan, nacin: "reminder", sad });
  }

  it("dospjeliPodsjetnici: podsjetnik + mock e-poruka s tokenom, jednom po mjesecu, novi termin", async () => {
    const id = await obecanje();
    expect(await dospjeliPodsjetnici(db, Date.UTC(2026, 11, 9))).toEqual([]);
    const sada = Date.UTC(2026, 11, 10, 8);
    const prvi = (await dospjeliPodsjetnici(db, sada)).filter((r) => r.pledgeId === id); // seed ima svoje obećanje
    expect(prvi).toEqual([{ pledgeId: id, ishod: "poslan", period: "2026-12", token: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/) }]);
    expect((await dospjeliPodsjetnici(db, sada)).filter((r) => r.pledgeId === id)).toEqual([]);
    const [x] = redovi<{ period: string; token_hash: string; expires_at: number; notification_id: string }>(sqlite, "SELECT * FROM recurring_reminders WHERE pledge_id = ?", id);
    expect(x!.expires_at).toBe(sada + ROK_PODSJETNIKA);
    expect(x!.token_hash).not.toContain(prvi[0]!.token!);
    const n = sqlite.prepare("SELECT kind, email, user_id, sent_at, payload FROM notifications WHERE id = ?").get(x!.notification_id) as { kind: string; email: string; user_id: string; sent_at: null; payload: string };
    expect(n).toMatchObject({ kind: "recurring_reminder", email: korisnik.email, user_id: korisnik.id, sent_at: null });
    expect(JSON.parse(n.payload)).toMatchObject({ token: prvi[0]!.token, kampanja: MJESECNA, iznosCenti: 1200, period: "2026-12" });
    const next = (sqlite.prepare("SELECT next_reminder_at FROM recurring_pledges WHERE id = ?").get(id) as { next_reminder_at: number }).next_reminder_at;
    expect(new Date(next).toISOString()).toBe("2027-01-10T07:00:00.000Z");
  });

  it("pauzirano, otkazano i trajni nalog ne dobivaju podsjetnik; nakon 3 neplaćena obećanje se pauzira", async () => {
    const id = await obecanje(1);
    const drugi = await obecanje(1);
    await promijeniPonavljanje(db, korisnik.id, drugi, "pause", null, Date.UTC(2026, 10, 26));
    let t = Date.UTC(2026, 11, 1, 8);
    const ishodi: string[] = [];
    for (let i = 0; i < NEPLACENIH_DO_PAUZE + 1; i++) {
      for (const r of (await dospjeliPodsjetnici(db, t)).filter((x) => x.pledgeId === id || x.pledgeId === drugi)) {
        expect(r.pledgeId).toBe(id);
        ishodi.push(r.ishod);
      }
      t += 31 * DAN_MS;
    }
    expect(ishodi).toEqual(["poslan", "poslan", "poslan", "pauzirano"]);
    expect(sqlite.prepare("SELECT status, missed_count FROM recurring_pledges WHERE id = ?").get(id)).toEqual({ status: "paused", missed_count: 3 });
  });

  it("neplaćen podsjetnik povećava brojač, plaćen ga vraća na 0; istekla poveznica se ne plaća", async () => {
    const sad = Date.now();
    const id = await obecanje(1, sad);
    const missed = () => (sqlite.prepare("SELECT missed_count FROM recurring_pledges WHERE id = ?").get(id) as { missed_count: number }).missed_count;
    const p1 = (await posaljiPodsjetnik(db, id, sad))!;
    const p2 = (await posaljiPodsjetnik(db, id, sad))!;
    expect(missed()).toBe(1);
    // Poveznica p1 je istekla (rok + 1 ms): plaćanje se ne otvara.
    sqlite.prepare("UPDATE recurring_reminders SET expires_at = ? WHERE pledge_id = ? AND period = ?").run(sad - 1, id, p1.period);
    const ist = (await ucitajPodsjetnik({ ...kontekst(db, `/hr/podsjetnik/${p1.token}`, { params: { token: p1.token! }, obrazac: { radnja: "plati" } }), env: env() })) as { podaci: PodaciPodsjetnika };
    expect(ist.podaci.greska).toBe("istekao");
    expect(ist.podaci.p.istekao).toBe(true);
    const pl = await ucitajPodsjetnik({ ...kontekst(db, `/hr/podsjetnik/${p2.token}`, { params: { token: p2.token! }, obrazac: { radnja: "plati" } }), env: env() });
    await plati(checkoutIz(pl));
    await posaljiPodsjetnik(db, id, sad);
    expect(missed()).toBe(0);
  });

  it("promjena dana i nastavak preračunavaju termin", async () => {
    const id = await obecanje(10, Date.now());
    await promijeniPonavljanje(db, korisnik.id, id, "day", 20, Date.now());
    const t = (sqlite.prepare("SELECT next_reminder_at FROM recurring_pledges WHERE id = ?").get(id) as { next_reminder_at: number }).next_reminder_at;
    expect(new Date(t).getUTCDate()).toBe(20);
    expect(razdoblje(t) > razdoblje(Date.now())).toBe(true);
  });
});

describe("stranica podsjetnika /hr/podsjetnik/{token} (T)", () => {
  async function svjez() {
    const id = await stvoriObecanje(db, { userId: korisnik.id, campaignId: idKampanje(MJESECNA), iznosCenti: 1200, dan: 10, nacin: "reminder", sad: Date.now() });
    const p = (await posaljiPodsjetnik(db, id, Date.now()))!;
    return { id, token: p.token! };
  }
  const ctx = (token: string, obrazac?: Record<string, string>) => ({ ...kontekst(db, `/hr/podsjetnik/${token}`, { params: { token }, obrazac }), env: env() });

  it("GET: kampanja, iznos, stanje; nepoznat token 404", async () => {
    const { token } = await svjez();
    const r = (await ucitajPodsjetnik(ctx(token))) as { podaci: PodaciPodsjetnika };
    expect(r.podaci.p).toMatchObject({ istekao: false, kampanja: { publicId: MJESECNA }, obecanje: { iznosCenti: 1200, status: "active", dan: 10 } });
    expect(((await ucitajPodsjetnik(ctx("nepoznat-token-0000000000000000000000"))) as Response).status).toBe(404);
    expect(((await ucitajPodsjetnik(ctx("x"))) as Response).status).toBe(404);
  });

  it("„Plati ovaj mjesec”: novi intent istim klijentom (checkout s recurring_pledge_id), ponovni klik vodi na isti", async () => {
    const { id, token } = await svjez();
    const a = await ucitajPodsjetnik(ctx(token, { radnja: "plati" }));
    expect((a as Response).status).toBe(303);
    expect((a as Response).headers.get("location")).toMatch(new RegExp(`^/hr/${MJESECNA}/podrzi/[A-Za-z0-9_-]{22}$`));
    const ch = checkoutIz(a);
    expect(sqlite.prepare("SELECT recurring_pledge_id, amount_cents, user_id FROM checkouts WHERE id = ?").get(ch)).toEqual({ recurring_pledge_id: id, amount_cents: 1200, user_id: korisnik.id });
    expect(checkoutIz(await ucitajPodsjetnik(ctx(token, { radnja: "plati" })))).toBe(ch);
    expect(broj(sqlite, "SELECT count(*) FROM checkouts WHERE recurring_pledge_id = ?", id)).toBe(1);
  });

  it("pauza, nastavak i odjava (303 ?poruka=); odjavljeno se ne plaća", async () => {
    const { id, token } = await svjez();
    const stanje = () => (sqlite.prepare("SELECT status FROM recurring_pledges WHERE id = ?").get(id) as { status: string }).status;
    expect((await ucitajPodsjetnik(ctx(token, { radnja: "pauza" })) as Response).headers.get("location")).toBe(`/hr/podsjetnik/${token}?poruka=pauza`);
    expect(stanje()).toBe("paused");
    await ucitajPodsjetnik(ctx(token, { radnja: "nastavak" }));
    expect(stanje()).toBe("active");
    await ucitajPodsjetnik(ctx(token, { radnja: "odjava" }));
    expect(stanje()).toBe("cancelled");
    const p = (await ucitajPodsjetnik(ctx(token, { radnja: "plati" }))) as { podaci: PodaciPodsjetnika };
    expect(p.podaci.greska).toBe("otkazano");
    expect(((await ucitajPodsjetnik(ctx(token, { radnja: "nesto" }))) as Response).status).toBe(404);
  });
});

describe("postavke: mock podsjetnik i simulacija", () => {
  it("„pošalji sljedeći podsjetnik sada” samo za vlastito obećanje; GET pokazuje poveznicu podsjetnika", async () => {
    const id = await stvoriObecanje(db, { userId: korisnik.id, campaignId: idKampanje(MJESECNA), iznosCenti: 900, dan: 5, nacin: "reminder", sad: Date.now() });
    const tudji = (await korisnikSesije(db, primjeri.demoSesija, Date.now()))!;
    const put = "/hr/postavke/ponavljajuce";
    const los = (await ucitajPostavke(kontekst(db, put, { korisnik: tudji, obrazac: { id, radnja: "podsjetnik" } }))) as { podaci: PodaciPonavljanja };
    expect(los.podaci.greska).toBe(true);
    const ok = await ucitajPostavke(kontekst(db, put, { korisnik, obrazac: { id, radnja: "podsjetnik" } }));
    expect((ok as Response).headers.get("location")).toBe(`${put}?ok=podsjetnik`);
    const g = (await ucitajPostavke(kontekst(db, put, { korisnik }))) as { podaci: PodaciPonavljanja };
    const m = g.podaci.podsjetnici[id]!;
    expect(m.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(((await ucitajPodsjetnik({ ...kontekst(db, `/hr/podsjetnik/${m.token}`, { params: { token: m.token } }), env: env() })) as { podaci: unknown }).podaci).toBeTruthy();
  });
});

describe("checkout: privola, poruka kao komentar, mock e-poruka organizatoru", () => {
  const obrazac = (o: Partial<ObrazacCheckouta> = {}): ObrazacCheckouta => ({ ...prazanObrazac(), izbor: "2500", email: "ana@example.org", uvjeti: true, ...o });
  async function checkout(o: Partial<ObrazacCheckouta> = {}, k: { id: string; email: string; ime: string } | null = null, publicId = AKTIVNA) {
    const c = provjeriObrazac(obrazac(o), { prijavljen: k });
    if (!c.ok) throw new Error(JSON.stringify(c.greske));
    const r = await stvoriCheckout(db, dv.konfig, { publicId, podaci: c.cisto, korisnik: k, povratniUrl: (id) => `http://localhost/${id}` }, dv.dohvat);
    if (!r.ok) throw new Error(r.razlog);
    return r.checkoutId;
  }
  const doprinos = (ch: string) =>
    (sqlite.prepare("SELECT d.id FROM checkouts c JOIN contributions d ON d.payment_intent_sid = c.contribution_sid WHERE c.id = ?").get(ch) as { id: string }).id;

  it("neprijavljeni: prihvat uvjeta → consents(terms_privacy, e-pošta, verzija); prijavljeni: ništa", async () => {
    const n = broj(sqlite, "SELECT count(*) FROM consents");
    await checkout({ email: "Privola@Example.org" });
    expect(redovi(sqlite, "SELECT user_id, email, kind, text_version, granted FROM consents ORDER BY created_at DESC, id DESC LIMIT 1")).toEqual([
      { user_id: null, email: "Privola@Example.org", kind: "terms_privacy", text_version: "uvjeti-2026-11", granted: 1 },
    ]);
    await checkout({}, { id: korisnik.id, email: korisnik.email, ime: korisnik.ime });
    expect(broj(sqlite, "SELECT count(*) FROM consents")).toBe(n + 1);
  });

  it("kućica bez poruke se zanemaruje; s porukom → show_message_as_comment = 1", async () => {
    expect(provjeriObrazac(obrazac({ komentar: true }), { prijavljen: null })).toMatchObject({ ok: true, cisto: { prikaziKaoKomentar: false } });
    const ch = await checkout({ komentar: true, poruka: "Sretno svima!" });
    expect(sqlite.prepare("SELECT show_message_as_comment AS s FROM contribution_attributions WHERE contribution_id = ?").get(doprinos(ch))).toEqual({ s: 1 });
  });

  it("komentar i obavijest organizatoru nastaju tek na `paid`, jednom (ponovljeni pull ništa ne dodaje)", async () => {
    const ch = await checkout({ komentar: true, poruka: "  Sretno svima!  " });
    const d = doprinos(ch);
    const kampanja = idKampanje(AKTIVNA);
    expect(broj(sqlite, "SELECT count(*) FROM comments WHERE contribution_id = ?", d)).toBe(0);
    expect((await porukeOUplatama(db, kampanja)).length).toBe(0);
    await plati(ch);
    await uskladiCheckout(db, dv.konfig, ch, dv.dohvat);
    expect(redovi(sqlite, "SELECT body, author_id, campaign_id FROM comments WHERE contribution_id = ?", d)).toEqual([{ body: "Sretno svima!", author_id: null, campaign_id: kampanja }]);
    const poruke = await porukeOUplatama(db, kampanja);
    expect(poruke).toHaveLength(1);
    expect(poruke[0]!.iznosCenti).toBe(2500);
    const autor = sqlite.prepare("SELECT u.email FROM campaign_settings s JOIN users u ON u.id = s.created_by_user_id WHERE s.campaign_id = ?").get(kampanja) as { email: string };
    expect(poruke[0]!.email).toBe(autor.email);
    const payload = (sqlite.prepare("SELECT payload FROM notifications WHERE id = ?").get(poruke[0]!.id) as { payload: string }).payload;
    expect(payload).not.toContain("ana@example.org");
    expect(payload).not.toContain("Sretno");
  });

  it("bez kućice, isključeni komentari ili isključene obavijesti: ni komentara ni poruke", async () => {
    const kampanja = idKampanje(AKTIVNA);
    const a = await checkout({ poruka: "Samo organizatoru" });
    await plati(a);
    expect(broj(sqlite, "SELECT count(*) FROM comments WHERE contribution_id = ?", doprinos(a))).toBe(0);
    sqlite.prepare("UPDATE campaign_settings SET comments_mode = 'off', contribution_notifications = 0 WHERE campaign_id = ?").run(kampanja);
    const prije = (await porukeOUplatama(db, kampanja)).length;
    const b = await checkout({ komentar: true, poruka: "Ne vidi se" });
    await plati(b);
    expect(broj(sqlite, "SELECT count(*) FROM comments WHERE contribution_id = ?", doprinos(b))).toBe(0);
    expect((await porukeOUplatama(db, kampanja)).length).toBe(prije);
  });

  it("upravljanje → obavijesti prikazuje mock poruke (K)", async () => {
    const ch = await checkout();
    await plati(ch);
    const organizator = (await korisnikSesije(db, primjeri.demoSesija, Date.now()))!;
    const r = await ucitajObavijesti(kontekst(db, `/hr/${AKTIVNA}/upravljanje/obavijesti`, { params: { id: AKTIVNA }, korisnik: organizator }));
    if (r instanceof Response) throw new Error(String(r.status));
    expect((r.podaci as PodaciObavijesti).poruke.length).toBeGreaterThan(0);
  });
});
