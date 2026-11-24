import { describe, expect, it } from "vitest";
import { NAJVISE, TEME_KONTAKTA, spremiPorukuKontakta, uuidv7, validirajPorukuKontakta } from "../src/lib/db/kontakt";
import { ucitaj } from "../src/views/stranice/contact.ucitaj";
import type { KontekstStranice } from "../src/views/tipovi";
import { broj, kaoD1, novaBaza, redovi } from "./pomoc/baza";

const ispravno = { name: "Ana Anić", email: "ana@demo.invalid", topic: "suggestion", content: "Prijedlog za katalog." };

describe("TEME_KONTAKTA", () => {
  it("ima 10 tema, točno one iz CHECK ograničenja contact_messages", () => {
    const db = novaBaza();
    const sql = redovi<{ sql: string }>(db, "SELECT sql FROM sqlite_master WHERE name = 'contact_messages'")[0]!.sql;
    const izCheck = [...sql.match(/topic IN \(([^)]*)\)/)![1]!.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
    expect(TEME_KONTAKTA).toHaveLength(10);
    expect([...TEME_KONTAKTA]).toEqual(izCheck);
  });
});

describe("validirajPorukuKontakta()", () => {
  it("prihvaća ispravan unos i obrezuje rubne razmake", () => {
    const r = validirajPorukuKontakta({ ...ispravno, name: "  Ana Anić ", content: "\n Bok \r\n drugi red " });
    expect(r).toEqual({ ok: true, poruka: { name: "Ana Anić", email: "ana@demo.invalid", topic: "suggestion", content: "Bok \n drugi red", userId: null } });
  });

  it("prazan unos: sva četiri polja obavezna", () => {
    expect(validirajPorukuKontakta({})).toEqual({ ok: false, greske: { name: "obavezno", email: "obavezno", topic: "obavezno", content: "obavezno" } });
    expect(validirajPorukuKontakta({ name: "   ", email: 3, topic: null, content: "" }).ok).toBe(false);
  });

  it("neispravna e-pošta i nepoznata tema", () => {
    const r = validirajPorukuKontakta({ ...ispravno, email: "ana@", topic: "withdrawal_blockage" });
    expect(r).toEqual({ ok: false, greske: { email: "neispravno", topic: "neispravno" } });
  });

  it("granice duljine u znakovima (ne UTF-16 jedinicama)", () => {
    expect(validirajPorukuKontakta({ ...ispravno, content: "ž".repeat(NAJVISE.content) }).ok).toBe(true);
    expect(validirajPorukuKontakta({ ...ispravno, content: "😀".repeat(NAJVISE.content) }).ok).toBe(true);
    expect(validirajPorukuKontakta({ ...ispravno, content: "a".repeat(NAJVISE.content + 1) })).toEqual({ ok: false, greske: { content: "predugo" } });
    expect(validirajPorukuKontakta({ ...ispravno, name: "a".repeat(NAJVISE.name + 1) })).toEqual({ ok: false, greske: { name: "predugo" } });
  });
});

describe("spremiPorukuKontakta() nad sqlite", () => {
  it("sprema red sa svim stupcima; najdulja poruka prolazi CHECK", async () => {
    const db = novaBaza();
    const sad = Date.UTC(2026, 10, 24, 12);
    const r = await spremiPorukuKontakta(kaoD1(db), { ...ispravno, content: "😀".repeat(NAJVISE.content) }, { sad });
    expect(r.ok).toBe(true);
    const red = redovi<Record<string, unknown>>(db, "SELECT * FROM contact_messages")[0]!;
    expect(red).toMatchObject({ name: "Ana Anić", email: "ana@demo.invalid", topic: "suggestion", user_id: null, created_at: sad });
    expect(red.id).toBe(r.ok && r.id);
    expect(red.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("neispravan unos ne dira bazu", async () => {
    const db = novaBaza();
    const r = await spremiPorukuKontakta(kaoD1(db), { ...ispravno, topic: "x" });
    expect(r).toEqual({ ok: false, greske: { topic: "neispravno" } });
    expect(broj(db, "SELECT count(*) FROM contact_messages")).toBe(0);
  });

  it("uuidv7 nosi vrijeme i raste s vremenom", () => {
    const a = uuidv7(1_700_000_000_000);
    const b = uuidv7(1_700_000_000_001);
    expect(parseInt(a.replace(/-/g, "").slice(0, 12), 16)).toBe(1_700_000_000_000);
    expect(a < b).toBe(true);
  });
});

describe("učitavač kontakta", () => {
  const ctx = (db: ReturnType<typeof novaBaza>, put: string, init?: RequestInit): KontekstStranice => {
    const url = new URL(put, "http://x");
    return { lang: "hr", params: {}, url, request: new Request(url, init), cookies: undefined as never, db: kaoD1(db), korisnik: null };
  };

  it("GET: ?tema= predodabire poznatu temu, nepoznatu ignorira", async () => {
    const db = novaBaza();
    expect(await ucitaj(ctx(db, "/hr/kontakt?tema=offers"))).toMatchObject({ podaci: { poslano: false, vrijednosti: { topic: "offers" } } });
    expect(await ucitaj(ctx(db, "/hr/kontakt?tema=bla"))).toMatchObject({ podaci: { vrijednosti: { topic: "" } } });
    expect(await ucitaj(ctx(db, "/hr/kontakt?poslano=1"))).toMatchObject({ podaci: { poslano: true } });
  });

  it("POST ispravan: sprema i 303 na /hr/kontakt?poslano=1", async () => {
    const db = novaBaza();
    const r = await ucitaj(ctx(db, "/hr/kontakt", { method: "POST", body: new URLSearchParams(ispravno) }));
    expect(r).toBeInstanceOf(Response);
    expect((r as Response).status).toBe(303);
    expect((r as Response).headers.get("Location")).toBe("/hr/kontakt?poslano=1");
    expect(broj(db, "SELECT count(*) FROM contact_messages")).toBe(1);
  });

  it("POST neispravan: vraća greške i upisane vrijednosti, bez zapisa", async () => {
    const db = novaBaza();
    const r = await ucitaj(ctx(db, "/hr/kontakt", { method: "POST", body: new URLSearchParams({ ...ispravno, email: "ne" }) }));
    expect(r).toMatchObject({ podaci: { poslano: false, greske: { email: "neispravno" }, vrijednosti: { email: "ne", name: "Ana Anić" } } });
    expect(broj(db, "SELECT count(*) FROM contact_messages")).toBe(0);
  });
});
