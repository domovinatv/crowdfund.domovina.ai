/**
 * Praćenje kampanje (S6): gost (spremljen samo hash tokena, potvrda poveznicom POST-om, ponovni upis iste
 * e-pošte), prijavljeni (odmah potvrđeno, sve isključeno = odjava), odjava tokenom, tok kroz učitavače stranice
 * kampanje (demo pošta s poveznicom) i stranice praćenja. Nad seedanim SQLiteom.
 */
import { describe, expect, it } from "vitest";
import primjeri from "../seed/primjeri.json";
import { odjaviPracenje, potvrdiPracenje, pracenjeKorisnika, pracenjePoTokenu, pratiKampanju, tokenPracenja } from "../src/lib/db/pracenje";
import { url } from "../src/lib/rute";
import { hashTokena } from "../src/lib/sesija";
import { ucitaj as ucitajKampanju, type PodaciKampanje } from "../src/views/stranice/campaign.ucitaj";
import { ucitaj as ucitajPracenje, type PodaciPracenja } from "../src/views/stranice/follow.ucitaj";
import { ucitaj as ucitajOdjavu } from "../src/views/stranice/follow.unsubscribe.ucitaj";
import { broj } from "./pomoc/baza";
import { kontekst, laziKolacici } from "./pomoc/kontekst";
import { lokacija, okolina, podaci, status } from "./pomoc/upravljanje";

const SVE = { komentari: true, novosti: true, kraj: true };
const NISTA = { komentari: false, novosti: false, kraj: false };
type O = Awaited<ReturnType<typeof okolina>>;
const red = (o: O, email: string) =>
  o.sqlite.prepare("SELECT token_hash, confirmed_at, notify_comments, notify_updates, notify_end, user_id FROM campaign_follows WHERE email = ? AND campaign_id = ?")
    .get(email, o.aktivna.id) as { token_hash: string; confirmed_at: number | null; notify_comments: number; notify_updates: number; notify_end: number; user_id: string | null } | undefined;

describe("gost", () => {
  it("valjana e-pošta i barem jedna obavijest; inače greška bez zapisa", async () => {
    const o = await okolina();
    expect(await pratiKampanju(o.db, o.aktivna.id, { email: "nije-email" }, SVE, o.sad)).toEqual({ ok: false, greska: "email" });
    expect(await pratiKampanju(o.db, o.aktivna.id, { email: "gost@example.org" }, NISTA, o.sad)).toEqual({ ok: false, greska: "nista" });
    expect(red(o, "gost@example.org")).toBeUndefined();
    const nevidljiva = o.kampanja(primjeri.kampanja.draft404); // nacrt nije javno vidljiv
    expect((await pratiKampanju(o.db, nevidljiva.id, { email: "gost@example.org" }, SVE, o.sad)).ok).toBe(false);
  });
  it("sprema se samo hash tokena; praćenje nije potvrđeno dok se ne potvrdi POST-om", async () => {
    const o = await okolina();
    const r = await pratiKampanju(o.db, o.aktivna.id, { email: "  Gost@Example.org " }, { ...NISTA, novosti: true }, o.sad);
    if (!r.ok || r.vrsta !== "potvrda") throw new Error("očekivana potvrda");
    expect(r.email).toBe("gost@example.org");
    const x = red(o, "gost@example.org")!;
    expect(x.token_hash).toBe(await hashTokena(r.token));
    expect(x.token_hash).not.toContain(r.token);
    expect(broj(o.sqlite, "SELECT count(*) AS n FROM campaign_follows WHERE token_hash = ?", r.token)).toBe(0);
    expect(x.confirmed_at).toBeNull();
    expect((await pracenjePoTokenu(o.db, r.token))?.potvrdeno).toBe(false);
    expect(await potvrdiPracenje(o.db, r.token, o.sad + 1)).toBe(true);
    expect(red(o, "gost@example.org")!.confirmed_at).toBe(o.sad + 1);
    // Idempotentno: druga potvrda ne mijenja vrijeme.
    expect(await potvrdiPracenje(o.db, r.token, o.sad + 2)).toBe(true);
    expect(red(o, "gost@example.org")!.confirmed_at).toBe(o.sad + 1);
    expect(await potvrdiPracenje(o.db, "nepostojeci-token-abcdefghij", o.sad)).toBe(false);
  });
  it("ponovni upis iste e-pošte: nepotvrđeno mijenja prekidače, potvrđeno ne (samo nova poveznica, stara ne vrijedi)", async () => {
    const o = await okolina();
    const r1 = await pratiKampanju(o.db, o.aktivna.id, { email: "gost@example.org" }, { ...NISTA, novosti: true }, o.sad);
    const r2 = await pratiKampanju(o.db, o.aktivna.id, { email: "gost@example.org" }, { ...NISTA, kraj: true }, o.sad);
    if (!r1.ok || !r2.ok || r1.vrsta !== "potvrda" || r2.vrsta !== "potvrda") throw new Error("potvrda");
    expect(red(o, "gost@example.org")).toMatchObject({ notify_updates: 0, notify_end: 1 });
    expect(await pracenjePoTokenu(o.db, r1.token)).toBeNull();
    await potvrdiPracenje(o.db, r2.token, o.sad);
    const r3 = await pratiKampanju(o.db, o.aktivna.id, { email: "gost@example.org" }, SVE, o.sad);
    if (!r3.ok || r3.vrsta !== "potvrda") throw new Error("potvrda");
    expect(red(o, "gost@example.org")).toMatchObject({ notify_comments: 0, notify_updates: 0, notify_end: 1 });
    expect(red(o, "gost@example.org")!.confirmed_at).not.toBeNull();
    expect(await pracenjePoTokenu(o.db, r2.token)).toBeNull();
    expect((await pracenjePoTokenu(o.db, r3.token))?.potvrdeno).toBe(true);
    expect(broj(o.sqlite, "SELECT count(*) AS n FROM campaign_follows WHERE email = 'gost@example.org'")).toBe(1);
  });
  it("odjava tokenom gasi sve tri obavijesti; red ostaje", async () => {
    const o = await okolina();
    const r = await pratiKampanju(o.db, o.aktivna.id, { email: "gost@example.org" }, SVE, o.sad);
    if (!r.ok || r.vrsta !== "potvrda") throw new Error("potvrda");
    expect(await odjaviPracenje(o.db, r.token)).toBe(true);
    expect(red(o, "gost@example.org")).toMatchObject({ notify_comments: 0, notify_updates: 0, notify_end: 0 });
    expect((await pracenjePoTokenu(o.db, r.token))?.aktivno).toBe(false);
  });
});

describe("prijavljeni", () => {
  it("odmah potvrđeno; sve isključeno = prestanak praćenja; token za e-poštu je potpisan", async () => {
    const o = await okolina();
    const k = o.korisnici.novi;
    expect(await pratiKampanju(o.db, o.aktivna.id, { userId: k.id }, { ...NISTA, komentari: true }, o.sad)).toEqual({ ok: true, vrsta: "prijavljen", aktivno: true });
    expect(await pracenjeKorisnika(o.db, o.aktivna.id, k.id)).toEqual({ ...NISTA, komentari: true });
    expect(broj(o.sqlite, "SELECT count(*) AS n FROM campaign_follows WHERE user_id = ? AND confirmed_at IS NOT NULL AND token_hash IS NULL AND email IS NULL", k.id)).toBe(1);
    expect(await pratiKampanju(o.db, o.aktivna.id, { userId: k.id }, NISTA, o.sad)).toEqual({ ok: true, vrsta: "prijavljen", aktivno: false });
    expect(broj(o.sqlite, "SELECT count(*) AS n FROM campaign_follows WHERE user_id = ? AND campaign_id = ?", k.id, o.aktivna.id)).toBe(1);
    const token = await tokenPracenja(k.id, o.aktivna.id);
    await pratiKampanju(o.db, o.aktivna.id, { userId: k.id }, SVE, o.sad);
    expect(await pracenjePoTokenu(o.db, token)).toMatchObject({ aktivno: true, potvrdeno: true, publicId: o.aktivna.public_id });
    expect(await odjaviPracenje(o.db, token)).toBe(true);
    expect(await pracenjeKorisnika(o.db, o.aktivna.id, k.id)).toEqual(NISTA);
  });
});

describe("tok kroz stranice", () => {
  const put = (o: O) => url("hr", "campaign", { id: o.aktivna.public_id });

  it("gost: POST → 303 ?prati=potvrda, demo pošta s poveznicom, potvrda na stranici praćenja", async () => {
    const o = await okolina();
    const kolacici = laziKolacici();
    const r = await ucitajKampanju(kontekst(o.db, put(o), {
      params: { id: o.aktivna.public_id }, kolacici, obrazac: { akcija: "prati", email: "gost@example.org", novosti: "1" },
    }));
    expect(status(r)).toBe(303);
    expect(lokacija(r)).toBe(`${put(o)}?prati=potvrda#prati`);
    const p = podaci<PodaciKampanje>(await ucitajKampanju(kontekst(o.db, `${put(o)}?prati=potvrda`, { params: { id: o.aktivna.public_id }, kolacici })));
    expect(p.pracenje.poruka).toBe("potvrda");
    expect(p.pracenje.demoEmail).toBe("gost@example.org");
    expect(p.pracenje.demoLink).toMatch(/^http:\/\/localhost:8798\/hr\/pracenje\/[A-Za-z0-9_-]{20,64}$/);
    const token = p.pracenje.demoLink!.split("/").pop()!;
    // Drugi preglednik (bez kolačića) ne vidi poveznicu.
    expect(podaci<PodaciKampanje>(await ucitajKampanju(kontekst(o.db, `${put(o)}?prati=potvrda`, { params: { id: o.aktivna.public_id } }))).pracenje.demoLink).toBeNull();

    const f = (obrazac?: Record<string, string>, upit = "") =>
      ucitajPracenje(kontekst(o.db, url("hr", "follow", { token }) + upit, { params: { token }, obrazac }));
    const g = podaci<PodaciPracenja>(await f());
    expect(g.p.potvrdeno).toBe(false);
    expect(red(o, "gost@example.org")!.confirmed_at).toBeNull(); // GET ne mijenja stanje
    const potvrda = await f({});
    expect(status(potvrda)).toBe(303);
    expect(lokacija(potvrda)).toBe(`${url("hr", "follow", { token })}?potvrdeno=1`);
    const nakon = podaci<PodaciPracenja>(await f(undefined, "?potvrdeno=1"));
    expect(nakon).toMatchObject({ potvrdeno: true, p: { potvrdeno: true, aktivno: true } });
    expect(status(await ucitajPracenje(kontekst(o.db, "/hr/pracenje/krivi-token-xxxxxxxxxxxx", { params: { token: "krivi-token-xxxxxxxxxxxx" }, obrazac: {} })))).toBe(404);

    const odjava = await ucitajOdjavu(kontekst(o.db, url("hr", "follow.unsubscribe", { token }), { params: { token }, obrazac: {} }));
    expect(status(odjava)).toBe(303);
    expect(podaci<PodaciPracenja>(await f()).p.aktivno).toBe(false);
  });
  it("gost bez obavijesti ili s krivom e-poštom: greška na stranici, prekidači ostaju", async () => {
    const o = await okolina();
    const p = podaci<PodaciKampanje>(await ucitajKampanju(kontekst(o.db, put(o), {
      params: { id: o.aktivna.public_id }, obrazac: { akcija: "prati", email: "krivo", kraj: "1" },
    })));
    expect(p.pracenje).toMatchObject({ greska: "email", email: "krivo", obavijesti: { ...NISTA, kraj: true } });
    const q = podaci<PodaciKampanje>(await ucitajKampanju(kontekst(o.db, put(o), {
      params: { id: o.aktivna.public_id }, obrazac: { akcija: "prati", email: "gost@example.org" },
    })));
    expect(q.pracenje.greska).toBe("nista");
  });
  it("prijavljeni: POST → spremljeno / odjavljeno, prekidači iz baze na stranici", async () => {
    const o = await okolina();
    const k = o.korisnici.novi;
    const r = await ucitajKampanju(kontekst(o.db, put(o), { params: { id: o.aktivna.public_id }, korisnik: k, obrazac: { akcija: "prati", komentari: "1" } }));
    expect(lokacija(r)).toBe(`${put(o)}?prati=spremljeno#prati`);
    const p = podaci<PodaciKampanje>(await ucitajKampanju(kontekst(o.db, `${put(o)}?prati=spremljeno`, { params: { id: o.aktivna.public_id }, korisnik: k })));
    expect(p.pracenje).toMatchObject({ prijavljen: true, poruka: "spremljeno", obavijesti: { ...NISTA, komentari: true } });
    const r2 = await ucitajKampanju(kontekst(o.db, put(o), { params: { id: o.aktivna.public_id }, korisnik: k, obrazac: { akcija: "prati" } }));
    expect(lokacija(r2)).toBe(`${put(o)}?prati=odjavljeno#prati`);
  });
  it("traka „Upravljaj kampanjom” samo za člana organizacije", async () => {
    const o = await okolina();
    const za = async (korisnik: (typeof o.korisnici)[keyof typeof o.korisnici] | null) =>
      podaci<PodaciKampanje>(await ucitajKampanju(kontekst(o.db, put(o), { params: { id: o.aktivna.public_id }, korisnik }))).upravljanje;
    expect(await za(o.korisnici.viewer)).toBe(url("hr", "campaign.manage", { id: o.aktivna.public_id }));
    expect(await za(o.korisnici.novi)).toBeNull();
    expect(await za(null)).toBeNull();
  });
});
