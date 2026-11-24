/**
 * Financije kampanje (S6): CSV (BOM, CRLF, RFC 4180 escape, zaštita od formula, anonimni doprinosi), filtar
 * stanja i zbroj, povrati (P+e, zapis, potvrda → refunded, statistika kampanje). Nad seedanim SQLiteom.
 */
import { describe, expect, it } from "vitest";
import { BOM, csvFinancija, csvPolje, financijeKampanje, zbrojFinancija, type RedakFinancija } from "../src/lib/db/financije";
import { url } from "../src/lib/rute";
import { UPRAVLJANJE } from "../src/views/sadrzaj/upravljanje";
import { ucitaj as ucitajCsv } from "../src/views/stranice/campaign.manage.finances.csv.ucitaj";
import { ucitaj as ucitajFinancije, type PodaciFinancija } from "../src/views/stranice/campaign.manage.finances.ucitaj";
import { ucitaj as ucitajPovrate, type PodaciPovrata } from "../src/views/stranice/campaign.manage.refunds.ucitaj";
import { broj } from "./pomoc/baza";
import { kontekst } from "./pomoc/kontekst";
import { lokacija, okolina, podaci, status, type Uloga } from "./pomoc/upravljanje";

const Z = UPRAVLJANJE.hr.financije.csv;
const redak = (x: Partial<RedakFinancija> = {}): RedakFinancija => ({
  id: "d1", createdAt: Date.UTC(2026, 10, 1, 10), paidAt: Date.UTC(2026, 10, 1, 10, 5), ime: "Ana", anonimno: false, tvrtka: null,
  email: "ana@example.org", amountCents: 2500, receivedCents: 2500, stanje: "paid", stanjeIntenta: "paid", underpaid: false,
  kanal: "sepa", izvor: "checkout", kasica: null, link: null, dijeljenje: false, poruka: null, referenca: "RF18 1234", povrat: null, ...x,
});

describe("csvPolje()", () => {
  it("navodnici samo kad treba, navodnik udvostručen, prazno za null", () => {
    expect(csvPolje("obično")).toBe("obično");
    expect(csvPolje("a,b")).toBe('"a,b"');
    expect(csvPolje("a;b")).toBe('"a;b"');
    expect(csvPolje('reče "hvala"')).toBe('"reče ""hvala"""');
    expect(csvPolje("dva\nreda")).toBe('"dva\nreda"');
    expect(csvPolje(null)).toBe("");
    expect(csvPolje(undefined)).toBe("");
    expect(csvPolje(-12)).toBe("-12");
  });
  it("zaštita od formula: = + - @ tab i CR na početku dobivaju apostrof", () => {
    for (const x of ["=SUM(A1:A9)", "+385", "-1", "@cmd", "\tx", "\rx"]) expect(csvPolje(x).replace(/^"/, "")).toMatch(/^'/);
    expect(csvPolje('=HYPERLINK("http://x","y")')).toBe(`"'=HYPERLINK(""http://x"",""y"")"`);
  });
});

describe("csvFinancija()", () => {
  const csv = csvFinancija([
    redak(),
    redak({ id: "d2", ime: "Marko", anonimno: true, poruka: "=1+1, hvala", email: null, receivedCents: null, paidAt: null, stanje: "pending", stanjeIntenta: "open" }),
  ], Z);
  const linije = csv.slice(BOM.length).split("\r\n");
  it("počinje BOM-om, redovi su CRLF i završava CRLF-om, nema golog LF-a", () => {
    expect(csv.startsWith(BOM)).toBe(true);
    expect(csv.endsWith("\r\n")).toBe(true);
    expect(csv.replace(/\r\n/g, "")).not.toContain("\n");
    expect(linije).toHaveLength(4); // zaglavlje, 2 retka, prazno iza zadnjeg CRLF-a
  });
  it("zaglavlje iz tekstova, iznosi u eurima s točkom, prazno za nepoznato", () => {
    expect(linije[0]!.split(",")[0]).toBe(Z.id);
    expect(linije[1]).toContain(",25.00,25.00,EUR,paid,");
    expect(linije[1]).toContain("2026-11-01T10:00:00.000Z");
    expect(linije[2]).toContain(",25.00,,EUR,pending,open,");
  });
  it("anonimni doprinos: organizator vidi ime, stupac anonimno = da; poruka s formulom je neutralizirana", () => {
    expect(linije[2]).toContain(`,Marko,${Z.da},`);
    expect(linije[1]).toContain(`,Ana,${Z.ne},`);
    expect(linije[2]).toContain(`"'=1+1, hvala"`);
  });
  it("en zaglavlja imaju isti broj stupaca", () => {
    const en = csvFinancija([], UPRAVLJANJE.en.financije.csv);
    expect(en.slice(BOM.length).split("\r\n")[0]!.split(",").length).toBe(linije[0]!.split(",").length);
  });
});

describe("financije nad seedom", () => {
  it("filtar stanja i zbroj plaćenih", async () => {
    const o = await okolina();
    const svi = await financijeKampanje(o.db, o.aktivna.id);
    const placeni = await financijeKampanje(o.db, o.aktivna.id, "paid");
    expect(placeni.every((r) => r.stanje === "paid")).toBe(true);
    expect(placeni.length).toBe(svi.filter((r) => r.stanje === "paid").length);
    const z = zbrojFinancija(svi);
    expect(z.brojPlacenih).toBe(placeni.length);
    expect(z.placeno).toBe(placeni.reduce((s, r) => s + (r.receivedCents ?? 0), 0));
    const p = podaci<PodaciFinancija>(await ucitajFinancije(kontekst(o.db, `${url("hr", "campaign.manage.finances", { id: o.aktivna.public_id })}?state=nesto`, {
      params: { id: o.aktivna.public_id }, korisnik: o.korisnici.viewer,
    })));
    expect(p.filtar).toBe("all");
  });
  it("CSV ruta: text/csv, privitak, bez predmemorije, anonimni doprinos s imenom za organizatora", async () => {
    const o = await okolina();
    const r = (await ucitajCsv(kontekst(o.db, url("hr", "campaign.manage.finances.csv", { id: o.aktivna.public_id }), {
      params: { id: o.aktivna.public_id }, korisnik: o.korisnici.viewer,
    }))) as Response;
    expect(r.status).toBe(200);
    expect(r.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    expect(r.headers.get("Content-Disposition")).toMatch(new RegExp(`^attachment; filename="financije-${o.aktivna.public_id}-\\d{4}-\\d{2}-\\d{2}\\.csv"$`));
    expect(r.headers.get("Cache-Control")).toContain("no-store");
    const bajtovi = new Uint8Array(await r.arrayBuffer());
    expect([...bajtovi.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]); // UTF-8 BOM
    const tijelo = new TextDecoder("utf-8", { ignoreBOM: true }).decode(bajtovi);
    expect(tijelo.startsWith(BOM)).toBe(true);
    const anonimni = (await financijeKampanje(o.db, o.aktivna.id)).filter((x) => x.anonimno);
    expect(anonimni.length).toBeGreaterThan(0);
    for (const a of anonimni) expect(tijelo).toContain(`${a.id},`);
    expect(tijelo.split("\r\n").filter((l) => l.includes(`,${Z.da},`)).length).toBeGreaterThanOrEqual(anonimni.length);
  });
});

describe("povrati (U:admin, P+e)", () => {
  const POVRATI = (o: Awaited<ReturnType<typeof okolina>>, uloga: Uloga, obrazac?: Record<string, string>) =>
    ucitajPovrate(kontekst(o.db, url("hr", "campaign.manage.refunds", { id: o.aktivna.public_id }), {
      params: { id: o.aktivna.public_id }, korisnik: o.korisnici[uloga], obrazac,
    }));
  const TX = `0x${"ab".repeat(32)}`;

  it("urednik nema pristup; administrator bez potvrde ide na potvrdu radnje", async () => {
    const o = await okolina();
    const seedPovrata = broj(o.sqlite, "SELECT count(*) AS n FROM refunds");
    expect(status(await POVRATI(o, "editor"))).toBe(404);
    const r = await POVRATI(o, "admin", { contribution: "x", method: "safe_tx", reference: TX });
    expect(status(r)).toBe(302);
    expect(lokacija(r)).toContain("/hr/potvrda-radnje/");
    expect(broj(o.sqlite, "SELECT count(*) AS n FROM refunds")).toBe(seedPovrata);
  });
  it("validacija zapisa: doprinos, način, referenca (tx hash / bankovna)", async () => {
    const o = await okolina();
    o.potvrdi(o.korisnici.admin, "refund");
    const seedPovrata = broj(o.sqlite, "SELECT count(*) AS n FROM refunds");
    const d = podaci<PodaciPovrata>(await POVRATI(o, "admin")).placeni[0]!;
    const g = async (f: Record<string, string>) => podaci<PodaciPovrata>(await POVRATI(o, "admin", f));
    expect((await g({ contribution: "", method: "safe_tx", reference: TX })).greske.contribution).toBe("obavezno");
    expect((await g({ contribution: d.id, method: "gotovina", reference: "x" })).greske.method).toBe("nevaljano");
    expect((await g({ contribution: d.id, method: "safe_tx", reference: "0x12" })).greske.reference).toBe("nevaljano");
    expect((await g({ contribution: d.id, method: "bank_transfer", reference: "" })).greske.reference).toBe("obavezno");
    expect(broj(o.sqlite, "SELECT count(*) AS n FROM refunds")).toBe(seedPovrata);
  });
  it("zapis → potvrda: doprinos refunded, statistika umanjena, drugi zapis za isti doprinos odbijen", async () => {
    const o = await okolina();
    o.potvrdi(o.korisnici.admin, "refund");
    const p = podaci<PodaciPovrata>(await POVRATI(o, "admin"));
    const d = p.placeni[0]!;
    const stat = () => o.sqlite.prepare("SELECT raised_cents, contribution_count FROM campaign_stats WHERE campaign_id = ?").get(o.aktivna.id) as { raised_cents: number; contribution_count: number };
    const prije = stat();
    const r = await POVRATI(o, "admin", { contribution: d.id, method: "safe_tx", reference: TX.toUpperCase().replace("0X", "0x") });
    expect(lokacija(r)).toContain("?ok=zapisan");
    const zapis = o.sqlite.prepare("SELECT id, status, amount_cents, safe_tx_hash FROM refunds WHERE contribution_id = ?").get(d.id) as {
      id: string; status: string; amount_cents: number; safe_tx_hash: string;
    };
    expect(zapis).toMatchObject({ status: "recorded", amount_cents: d.receivedCents, safe_tx_hash: TX });
    expect(stat()).toEqual(prije); // zapis još ne mijenja brojke
    expect(podaci<PodaciPovrata>(await POVRATI(o, "admin", { contribution: d.id, method: "safe_tx", reference: TX })).greske.contribution).toBe("vec_postoji");
    expect(lokacija(await POVRATI(o, "admin", { akcija: "potvrdi", refund: zapis.id }))).toContain("?ok=potvrden");
    expect(broj(o.sqlite, "SELECT count(*) AS n FROM contributions WHERE id = ? AND state = 'refunded'", d.id)).toBe(1);
    expect(stat()).toEqual({ raised_cents: prije.raised_cents - (d.receivedCents ?? 0), contribution_count: prije.contribution_count - 1 });
    // Ponovna potvrda nije moguća (već potvrđen) i ne umanjuje statistiku dvaput.
    expect(podaci<PodaciPovrata>(await POVRATI(o, "admin", { akcija: "potvrdi", refund: zapis.id })).greskaPotvrde).toBe(true);
    expect(stat().contribution_count).toBe(prije.contribution_count - 1);
    const nakon = podaci<PodaciPovrata>(await POVRATI(o, "admin"));
    expect(nakon.placeni.find((x) => x.id === d.id)).toBeUndefined();
    expect(nakon.povrati.find((x) => x.id === zapis.id)?.status).toBe("confirmed");
  });
});
