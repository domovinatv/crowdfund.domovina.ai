// „Moje” (S6, docs/07 „Moje i postavke”, obilazak 08 i 09): svaki upit iz src/lib/db/moje.ts nad seedom, pristup P
// učitavača, tuđe kampanje / donacije / kasice / vanjske se ne vide, izbornik po ulozi, obavijesti i POST radnje.
import type { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import primjeri from "../seed/primjeri.json";
import { izbornik } from "../src/components/moje/ucitavanje";
import {
  brojPoStanju,
  filtriraj,
  kampanjaZaObavijest,
  mojeDonacije,
  mojeKampanje,
  mojeKasice,
  mojeVanjske,
  mojNovac,
  organizacijeFiltra,
  postaviKasicu,
  stanjeMoje,
  ukupnoDonirano,
  type MojaKampanja,
} from "../src/lib/db/moje";
import { nacrtiKorisnika, stvoriNacrt, trenutniNacrt } from "../src/lib/db/nacrti";
import { url } from "../src/lib/rute";
import { korisnikPoEmailu, type Korisnik } from "../src/lib/sesija";
import { MOJE } from "../src/views/sadrzaj/moje";
import { ucitaj as ucitajKampanje, type PodaciMojihKampanja } from "../src/views/stranice/my.campaigns.ucitaj";
import { ucitaj as ucitajDonacije, type PodaciMojihDonacija } from "../src/views/stranice/my.donations.ucitaj";
import { ucitaj as ucitajVanjske, type PodaciMojihVanjskih } from "../src/views/stranice/my.external.ucitaj";
import { ucitaj as ucitajNovac, type PodaciMogNovca } from "../src/views/stranice/my.money.ucitaj";
import { ucitaj as ucitajKasice, type PodaciMojihKasica } from "../src/views/stranice/my.moneyboxes.ucitaj";
import { kaoD1, novaBaza, redovi } from "./pomoc/baza";
import { kontekst } from "./pomoc/kontekst";

const SAD = Date.UTC(2026, 10, 25, 10);
const svjeza = () => {
  const sqlite = novaBaza({ seed: true });
  return { sqlite, db: kaoD1(sqlite) };
};
async function korisnik(db: D1Database, email: string): Promise<Korisnik> {
  const k = (await korisnikPoEmailu(db, email))!;
  return { id: k.id, email: k.email, ime: k.ime, platformRole: k.platformRole };
}
const email = (ime: string) => `${ime}@demo.invalid`;
const status = (r: unknown) => (r instanceof Response ? r.status : 200);
const lokacija = (r: unknown) => (r as Response).headers.get("Location");
const podaci = <T>(r: unknown): T => (r as { podaci: T }).podaci;
const ids = (l: { publicId: string }[]) => l.map((x) => x.publicId).sort();
const po = (l: MojaKampanja[], id: string) => l.find((k) => k.publicId === id)!;
const svjetionik = (sqlite: DatabaseSync) =>
  redovi<{ public_id: string; deleted: number }>(
    sqlite,
    `SELECT s.public_id, c.deleted_at IS NOT NULL AS deleted FROM campaigns c JOIN campaign_settings s ON s.campaign_id = c.id
      JOIN organizations o ON o.organizer_id = c.organizer_id WHERE o.slug = ?`,
    primjeri.organizacijaOrganizatora,
  );

describe("stanjeMoje", () => {
  it("blokirana > zatvorena (i funded) > isključena > osnovno stanje", () => {
    expect(stanjeMoje("active", null, null)).toBe("active");
    expect(stanjeMoje("active", 1, null)).toBe("paused");
    expect(stanjeMoje("active", 1, 2)).toBe("blocked");
    expect(stanjeMoje("funded", null, null)).toBe("closed");
    expect(stanjeMoje("closed", 1, null)).toBe("closed");
    expect(stanjeMoje("review", null, null)).toBe("review");
    expect(stanjeMoje("cancelled", null, null)).toBe("cancelled");
    expect(stanjeMoje("draft", null, null)).toBe("draft");
  });
});

describe("mojeKampanje", () => {
  it("organizatorica vidi sve neobrisane kampanje svoje organizacije, ne vidi tuđe ni obrisane", async () => {
    const { sqlite, db } = svjeza();
    const ivana = await korisnik(db, primjeri.demoRacuni.organizator);
    const moje = await mojeKampanje(db, ivana.id);
    const ocekivano = svjetionik(sqlite).filter((r) => !r.deleted).map((r) => r.public_id).sort();
    expect(ids(moje)).toEqual(ocekivano);
    expect(ids(moje)).not.toContain(primjeri.kampanja.obrisana404);
    expect(moje.every((k) => k.organizacija?.slug === primjeri.organizacijaOrganizatora && k.uloga === "owner")).toBe(true);
    const tudje = redovi<{ public_id: string }>(
      sqlite,
      `SELECT s.public_id FROM campaign_settings s JOIN campaigns c ON c.id = s.campaign_id JOIN organizations o ON o.organizer_id = c.organizer_id WHERE o.slug = ?`,
      primjeri.organizacija,
    );
    expect(tudje.length).toBeGreaterThan(0);
    for (const t of tudje) expect(ids(moje)).not.toContain(t.public_id);
    expect(po(moje, primjeri.kampanja.paused).stanje).toBe("paused");
    expect(po(moje, primjeri.kampanja.zavrsena).stanje).toBe("closed");
    expect(po(moje, primjeri.kampanja.aktivna).autor).toBe(true);
  });

  it("novi korisnik nema kampanja; autor kampanje za tuđu organizaciju vidi je bez uloge", async () => {
    const { db } = svjeza();
    const novi = await korisnik(db, primjeri.demoRacuni.novi);
    expect(await mojeKampanje(db, novi.id)).toEqual([]);

    const katarina = await korisnik(db, email("katarina.zamisljic"));
    const k = po(await mojeKampanje(db, katarina.id), primjeri.kampanja.review404);
    expect(k).toMatchObject({ stanje: "review", uloga: null, autor: true, autorCeka: true, vrsta: "for_organization" });

    const josip = await korisnik(db, email("josip.izmisljenic"));
    const jos = await mojeKampanje(db, josip.id);
    expect(po(jos, primjeri.kampanja.zaOrganizaciju)).toMatchObject({ stanje: "active", uloga: null, autor: true, autorCeka: false });
    // Josip je i urednik SD Bura: vidi njezine kampanje s ulogom.
    expect(jos.some((x) => x.organizacija?.slug === "demo-sd-bura" && x.uloga === "editor")).toBe(true);
  });

  it("odbijena kampanja za organizaciju nosi razlog", async () => {
    const { sqlite, db } = svjeza();
    const katarina = await korisnik(db, email("katarina.zamisljic"));
    sqlite
      .prepare(
        `UPDATE campaign_settings SET beneficiary_rejected_at = ?, beneficiary_rejected_reason = 'Nije u skladu s našim programom.'
          WHERE public_id = ?`,
      )
      .run(SAD, primjeri.kampanja.review404);
    sqlite.prepare("UPDATE campaigns SET state = 'cancelled' WHERE id = (SELECT campaign_id FROM campaign_settings WHERE public_id = ?)").run(primjeri.kampanja.review404);
    const k = po(await mojeKampanje(db, katarina.id), primjeri.kampanja.review404);
    expect(k).toMatchObject({ stanje: "cancelled", autorCeka: false, razlogOdbijanja: "Nije u skladu s našim programom." });
  });

  it("filtriraj, brojPoStanju, organizacijeFiltra", async () => {
    const { db } = svjeza();
    const ivana = await korisnik(db, primjeri.demoRacuni.organizator);
    const sve = await mojeKampanje(db, ivana.id);
    const b = brojPoStanju(sve);
    expect(Object.values(b).reduce((s, n) => s + n, 0)).toBe(sve.length);
    expect(filtriraj(sve, { stanje: "review" }).every((k) => k.stanje === "review")).toBe(true);
    expect(filtriraj(sve, { stanje: "review" })).toHaveLength(b.review);
    expect(filtriraj(sve, { organizacija: "nepostoji" })).toEqual([]);
    expect(organizacijeFiltra(sve)).toEqual([{ slug: primjeri.organizacijaOrganizatora, naziv: sve[0]!.organizacija!.naziv }]);

    const novo = filtriraj(sve, { redoslijed: "newest" }).map((k) => k.stvorena);
    expect(novo).toEqual([...novo].sort((a, b) => b - a));
    const staro = filtriraj(sve, { redoslijed: "oldest" }).map((k) => k.stvorena);
    expect(staro).toEqual([...staro].sort((a, b) => a - b));
    const vise = filtriraj(sve, { redoslijed: "most" }).map((k) => k.prikupljenoCenti);
    expect(vise).toEqual([...vise].sort((a, b) => b - a));
    const manje = filtriraj(sve, { redoslijed: "least" }).map((k) => k.prikupljenoCenti);
    expect(manje).toEqual([...manje].sort((a, b) => a - b));
    const uplate = filtriraj(sve, { redoslijed: "most_payments" }).map((k) => k.brojDoprinosa);
    expect(uplate).toEqual([...uplate].sort((a, b) => b - a));
    const malo = filtriraj(sve, { redoslijed: "least_payments" }).map((k) => k.brojDoprinosa);
    expect(malo).toEqual([...malo].sort((a, b) => a - b));
  });
});

describe("izbornik po kampanji (isto pravilo kao upravljanje)", () => {
  it("vlasnik aktivne: sve poveznice; isključena i zatvorena bez QR-a za zatvorenu", async () => {
    const { db } = svjeza();
    const ivana = await korisnik(db, primjeri.demoRacuni.organizator);
    const moje = await mojeKampanje(db, ivana.id);
    const r = (id: string) => izbornik("hr", po(moje, id)).map((x) => x.radnja);
    expect(r(primjeri.kampanja.aktivna)).toEqual(["otvori", "uredi", "upravljaj", "financije", "csv", "obavijesti", "linkovi", "qr", "widget", "plakat", "iskljuci"]);
    expect(r(primjeri.kampanja.zavrsena)).toEqual(["otvori", "uredi", "upravljaj", "financije", "csv", "obavijesti", "linkovi"]);
    expect(r(primjeri.kampanja.review404)).not.toContain("otvori");
    expect(r(primjeri.kampanja.review404)).not.toContain("qr");
    const csv = izbornik("hr", po(moje, primjeri.kampanja.aktivna)).find((x) => x.radnja === "csv")!;
    expect(csv.href).toBe(url("hr", "campaign.manage.finances.csv", { id: primjeri.kampanja.aktivna }));
  });

  it("promatrač bez uređivanja; autor koji čeka ima K bez U; odobreni autor bez uloge samo javne poveznice", async () => {
    const { db } = svjeza();
    const luka = await korisnik(db, email("luka.uzorkovic"));
    const promatrac = (await mojeKampanje(db, luka.id)).filter((k) => k.uloga === "viewer");
    expect(promatrac.length).toBeGreaterThan(0);
    for (const k of promatrac) {
      const r = izbornik("hr", k).map((x) => x.radnja);
      expect(r).not.toContain("uredi");
      expect(r).not.toContain("iskljuci");
    }

    const katarina = await korisnik(db, email("katarina.zamisljic"));
    const ceka = izbornik("hr", po(await mojeKampanje(db, katarina.id), primjeri.kampanja.review404)).map((x) => x.radnja);
    expect(ceka).toEqual(["uredi", "upravljaj", "obavijesti", "linkovi"]);

    const josip = await korisnik(db, email("josip.izmisljenic"));
    const odobrena = izbornik("hr", po(await mojeKampanje(db, josip.id), primjeri.kampanja.zaOrganizaciju)).map((x) => x.radnja);
    expect(odobrena).toEqual(["otvori", "qr", "widget", "plakat"]);
  });
});

describe("kampanjaZaObavijest", () => {
  it("moja (i obrisana) da, tuđa i neispravan ID ne", async () => {
    const { db } = svjeza();
    const ivana = await korisnik(db, primjeri.demoRacuni.organizator);
    expect(await kampanjaZaObavijest(db, ivana.id, primjeri.kampanja.zaOdobrenje404)).toMatchObject({ stanje: "review", obrisana: false });
    expect(await kampanjaZaObavijest(db, ivana.id, primjeri.kampanja.obrisana404.toUpperCase())).toMatchObject({ obrisana: true });
    const novi = await korisnik(db, primjeri.demoRacuni.novi);
    expect(await kampanjaZaObavijest(db, novi.id, primjeri.kampanja.aktivna)).toBeNull();
    expect(await kampanjaZaObavijest(db, ivana.id, "x';--")).toBeNull();
  });
});

describe("mojeDonacije", () => {
  it("po user_id i po e-pošti (bez obzira na veličinu slova), bez tuđih; vraćena i ukupno", async () => {
    const { sqlite, db } = svjeza();
    const ivana = await korisnik(db, primjeri.demoRacuni.organizator);
    const prije = await mojeDonacije(db, ivana.id, ivana.email);
    const ocekivano = redovi<{ n: number }>(sqlite, "SELECT count(*) AS n FROM checkouts WHERE user_id = ? OR email = ?", ivana.id, ivana.email)[0]!.n;
    expect(prije).toHaveLength(ocekivano);
    expect(prije.length).toBeGreaterThan(0);

    // Doprinos prije registracije: samo e-pošta, velikim slovima.
    const kampanja = redovi<{ campaign_id: string }>(sqlite, "SELECT campaign_id FROM campaign_settings WHERE public_id = ?", primjeri.kampanja.aktivna)[0]!.campaign_id;
    sqlite
      .prepare(
        `INSERT INTO checkouts (id, campaign_id, contribution_sid, amount_cents, tip_cents, intent_state, user_id, email, expires_at, created_at, updated_at)
         VALUES ('ch-gost', ?, 'gost-sid-0001', 2500, 0, 'open', NULL, ?, ?, ?, ?)`,
      )
      .run(kampanja, ivana.email.toUpperCase(), SAD + 1000, SAD, SAD);
    const poslije = await mojeDonacije(db, ivana.id, ivana.email);
    expect(poslije).toHaveLength(ocekivano + 1);
    expect(poslije[0]).toMatchObject({ checkoutId: "ch-gost", stanje: "open", referenca: "gost-sid-0001", iznosCenti: 2500 });
    expect(ukupnoDonirano(poslije)).toBe(ukupnoDonirano(prije));
    expect(ukupnoDonirano(prije)).toBe(prije.filter((d) => d.stanje === "paid").reduce((s, d) => s + d.iznosCenti, 0));

    const novi = await korisnik(db, primjeri.demoRacuni.novi);
    expect(await mojeDonacije(db, novi.id, novi.email)).toEqual([]);
  });

  it("doprinos s povratom je „vraćeno”; nevidljiva kampanja nema javnu poveznicu", async () => {
    const { sqlite, db } = svjeza();
    const ivana = await korisnik(db, primjeri.demoRacuni.organizator);
    const sve = await mojeDonacije(db, ivana.id, ivana.email);
    const placena = sve.find((d) => d.stanje === "paid")!;
    const d = redovi<{ contribution_id: string }>(sqlite, "SELECT contribution_id FROM contribution_attributions WHERE checkout_id = ?", placena.checkoutId)[0];
    expect(d).toBeDefined();
    sqlite.prepare("UPDATE contributions SET state = 'refunded' WHERE id = ?").run(d!.contribution_id);
    expect((await mojeDonacije(db, ivana.id, ivana.email)).find((x) => x.checkoutId === placena.checkoutId)!.stanje).toBe("refunded");
    const blokirana = sve.find((x) => x.kampanja.publicId === primjeri.kampanja.blokirana404);
    if (blokirana) expect(blokirana.kampanja.vidljiva).toBe(false);
    expect(sve.filter((x) => x.kampanja.publicId === primjeri.kampanja.aktivna || x.kampanja.publicId === primjeri.kampanja.zavrsena).every((x) => x.kampanja.vidljiva)).toBe(true);
  });
});

describe("mojeKasice i postaviKasicu", () => {
  it("samo moje kasice; isključi/uključi samo vlasnik i samo iz odgovarajućeg stanja", async () => {
    const { sqlite, db } = svjeza();
    const petra = await korisnik(db, email("petra.probic"));
    const moje = await mojeKasice(db, petra.id);
    const ocekivano = redovi<{ alias: string }>(sqlite, "SELECT alias FROM moneyboxes WHERE owner_user_id = ? ORDER BY alias", petra.id).map((r) => r.alias);
    expect(moje.map((m) => m.alias).sort()).toEqual(ocekivano);
    expect(moje.find((m) => m.alias === primjeri.kasica)).toMatchObject({ status: "active" });
    expect(moje.find((m) => m.alias === primjeri.kasicaNeaktivna404)).toMatchObject({ status: "disabled" });

    const ivana = await korisnik(db, primjeri.demoRacuni.organizator);
    expect(await mojeKasice(db, ivana.id)).toEqual([]);
    expect(await postaviKasicu(db, ivana.id, primjeri.kasica, false, SAD)).toBe(false);

    expect(await postaviKasicu(db, petra.id, primjeri.kasica, true, SAD)).toBe(false); // već aktivna
    expect(await postaviKasicu(db, petra.id, primjeri.kasica.toUpperCase(), false, SAD)).toBe(true);
    expect((await mojeKasice(db, petra.id)).find((m) => m.alias === primjeri.kasica)!.status).toBe("disabled");
    expect(await postaviKasicu(db, petra.id, primjeri.kasica, true, SAD)).toBe(true);

    sqlite.prepare("UPDATE moneyboxes SET status = 'deleted' WHERE alias = ?").run(primjeri.kasicaNeaktivna404);
    expect(await postaviKasicu(db, petra.id, primjeri.kasicaNeaktivna404, true, SAD)).toBe(false);
  });

  it("skriveni iznos kampanje skriva i iznos kasice", async () => {
    const { sqlite, db } = svjeza();
    const petra = await korisnik(db, email("petra.probic"));
    const m = (await mojeKasice(db, petra.id)).find((x) => x.alias === primjeri.kasica)!;
    expect(m.prikupljenoCenti).not.toBeNull();
    sqlite.prepare("UPDATE campaign_settings SET hide_raised = 1 WHERE public_id = ?").run(m.kampanja.publicId);
    expect((await mojeKasice(db, petra.id)).find((x) => x.alias === primjeri.kasica)!.prikupljenoCenti).toBeNull();
  });
});

describe("mojNovac", () => {
  it("po organizaciji, bez nacrta i otkazanih, Safe s explorerom; novi korisnik nema ništa", async () => {
    const { db } = svjeza();
    const ivana = await korisnik(db, primjeri.demoRacuni.organizator);
    const skupine = await mojNovac(db, ivana.id);
    expect(skupine).toHaveLength(1);
    const g = skupine[0]!;
    expect(g.organizacija?.slug).toBe(primjeri.organizacijaOrganizatora);
    expect(g.kampanje.every((n) => n.kampanja.stanje !== "draft" && n.kampanja.stanje !== "cancelled")).toBe(true);
    expect(g.ukupnoCenti).toBe(g.kampanje.reduce((s, n) => s + n.kampanja.prikupljenoCenti, 0));
    const a = g.kampanje.find((n) => n.kampanja.publicId === primjeri.kampanja.aktivna)!;
    expect(a.safe).toMatch(/^0x[0-9a-f]{40}$/i);
    expect(a.explorer).toBe(`${a.lanac === 100 ? "https://gnosisscan.io/address/" : "https://gnosis-chiado.blockscout.com/address/"}${a.safe}`);
    const novi = await korisnik(db, primjeri.demoRacuni.novi);
    expect(await mojNovac(db, novi.id)).toEqual([]);
  });
});

describe("mojeVanjske", () => {
  it("vanjske organizacija u kojima sam član, bez uklonjenih i bez tuđih", async () => {
    const { sqlite, db } = svjeza();
    const ivana = await korisnik(db, primjeri.demoRacuni.organizator);
    const v = await mojeVanjske(db, ivana.id);
    expect(v.length).toBeGreaterThan(0);
    expect(v.every((x) => x.organizacija.slug === primjeri.organizacijaOrganizatora && x.uloga === "owner")).toBe(true);
    sqlite.prepare("UPDATE external_campaigns SET status = 'removed' WHERE id = ?").run(v[0]!.id);
    expect((await mojeVanjske(db, ivana.id)).map((x) => x.id)).not.toContain(v[0]!.id);
    const novi = await korisnik(db, primjeri.demoRacuni.novi);
    expect(await mojeVanjske(db, novi.id)).toEqual([]);
  });
});

describe("učitavači (P)", () => {
  const RUTE = [
    ["my.campaigns", ucitajKampanje],
    ["my.donations", ucitajDonacije],
    ["my.moneyboxes", ucitajKasice],
    ["my.money", ucitajNovac],
    ["my.external", ucitajVanjske],
  ] as const;

  it("neprijavljeni 302 na prijavu s next; prijavljeni 200", async () => {
    const { db } = svjeza();
    const ivana = await korisnik(db, primjeri.demoRacuni.organizator);
    for (const [kljuc, u] of RUTE) {
      const put = url("hr", kljuc);
      const r = await u(kontekst(db, put));
      expect(status(r)).toBe(302);
      expect(lokacija(r)).toBe(`${url("hr", "sign-in")}?next=${encodeURIComponent(put)}`);
      expect(status(await u(kontekst(db, url("en", kljuc), { korisnik: ivana })))).toBe(200);
    }
  });

  it("my.campaigns: filtri iz upita, neispravni se zanemaruju, tuđa organizacija u filtru se ne prihvaća", async () => {
    const { db } = svjeza();
    const ivana = await korisnik(db, primjeri.demoRacuni.organizator);
    const put = url("hr", "my.campaigns");
    const p = podaci<PodaciMojihKampanja>(await ucitajKampanje(kontekst(db, `${put}?state=review&sort=oldest`, { korisnik: ivana })));
    expect(p.filtar).toEqual({ stanje: "review", organizacija: null, redoslijed: "oldest" });
    expect(p.kampanje.every((k) => k.stanje === "review")).toBe(true);
    expect(p.kampanje[0]!.izbornik.length).toBeGreaterThan(0);
    const n = podaci<PodaciMojihKampanja>(await ucitajKampanje(kontekst(db, `${put}?state=xyz&sort=abc&org=${primjeri.organizacija}`, { korisnik: ivana })));
    expect(n.filtar).toEqual({ stanje: null, organizacija: null, redoslijed: "newest" });
    expect(n.kampanje).toHaveLength(n.ukupno);
  });

  it("my.campaigns: obavijesti ?objavljeno (čeka odobrenje), ?obrisana, tuđi ID bez naslova", async () => {
    const { db } = svjeza();
    const ivana = await korisnik(db, primjeri.demoRacuni.organizator);
    const put = url("hr", "my.campaigns");
    const o = podaci<PodaciMojihKampanja>(await ucitajKampanje(kontekst(db, `${put}?objavljeno=${primjeri.kampanja.zaOdobrenje404}`, { korisnik: ivana })));
    expect(o.obavijest).toMatchObject({ vrsta: "cekaOdobrenje" });
    const a = podaci<PodaciMojihKampanja>(await ucitajKampanje(kontekst(db, `${put}?objavljeno=${primjeri.kampanja.aktivna}`, { korisnik: ivana })));
    expect(a.obavijest).toMatchObject({ vrsta: "objavljena" });
    const b = podaci<PodaciMojihKampanja>(await ucitajKampanje(kontekst(db, `${put}?obrisana=${primjeri.kampanja.obrisana404}`, { korisnik: ivana })));
    expect(b.obavijest).toMatchObject({ vrsta: "obrisana" });
    const novi = await korisnik(db, primjeri.demoRacuni.novi);
    const t = podaci<PodaciMojihKampanja>(await ucitajKampanje(kontekst(db, `${put}?objavljeno=${primjeri.kampanja.aktivna}`, { korisnik: novi })));
    expect(t.obavijest).toBeNull();
    const t2 = podaci<PodaciMojihKampanja>(await ucitajKampanje(kontekst(db, `${put}?obrisana=${primjeri.kampanja.aktivna}`, { korisnik: novi })));
    expect(t2.obavijest).toEqual({ vrsta: "obrisanaBezNaslova" });
  });

  it("my.campaigns: nacrti — nastavi (303 na prvi nedovršeni korak), obriši, tuđi nacrt ne", async () => {
    const { db } = svjeza();
    const ivana = await korisnik(db, primjeri.demoRacuni.organizator);
    const put = url("hr", "my.campaigns");
    const stari = await stvoriNacrt(db, ivana.id, { vrsta: "one_time", kategorija: "charity", naslov: "Stari nacrt" }, "server", Date.now() - 60_000);
    const novi = await stvoriNacrt(db, ivana.id, { vrsta: "one_time" }, "server", Date.now() - 30_000);
    expect((await trenutniNacrt(db, ivana.id))!.id).toBe(novi);

    const p = podaci<PodaciMojihKampanja>(await ucitajKampanje(kontekst(db, put, { korisnik: ivana })));
    expect(p.nacrti.map((n) => n.id)).toEqual([novi, stari]);
    expect(p.brojevi.draft).toBe(2);
    expect(podaci<PodaciMojihKampanja>(await ucitajKampanje(kontekst(db, `${put}?state=active`, { korisnik: ivana }))).nacrti).toEqual([]);

    const r = await ucitajKampanje(kontekst(db, put, { korisnik: ivana, obrazac: { akcija: "nastavi", nacrt: stari } }));
    expect(status(r)).toBe(303);
    expect(lokacija(r)).toBe(url("hr", "new-campaign.goal"));
    expect((await trenutniNacrt(db, ivana.id))!.id).toBe(stari);

    const drugi = await korisnik(db, email("petra.probic"));
    const tudi = await ucitajKampanje(kontekst(db, put, { korisnik: drugi, obrazac: { akcija: "obrisi-nacrt", nacrt: stari } }));
    expect(status(tudi)).toBe(200);
    expect(podaci<PodaciMojihKampanja>(tudi).greska).toBe("nacrtNema");
    expect(await nacrtiKorisnika(db, ivana.id)).toHaveLength(2);

    const ob = await ucitajKampanje(kontekst(db, put, { korisnik: ivana, obrazac: { akcija: "obrisi-nacrt", nacrt: stari } }));
    expect(lokacija(ob)).toBe(`${put}?ok=nacrt-obrisan`);
    expect((await nacrtiKorisnika(db, ivana.id)).map((n) => n.id)).toEqual([novi]);
    const ok = podaci<PodaciMojihKampanja>(await ucitajKampanje(kontekst(db, `${put}?ok=nacrt-obrisan`, { korisnik: ivana })));
    expect(ok.obavijest).toEqual({ vrsta: "nacrtObrisan" });
  });

  it("my.moneyboxes: skupine i POST isključi (303), tuđa kasica 200 s greškom", async () => {
    const { db } = svjeza();
    const petra = await korisnik(db, email("petra.probic"));
    const put = url("hr", "my.moneyboxes");
    const p = podaci<PodaciMojihKasica>(await ucitajKasice(kontekst(db, put, { korisnik: petra })));
    expect(p.status).toBe("active");
    expect(p.kasice.every((m) => m.status === "active")).toBe(true);
    expect(p.brojevi.disabled).toBeGreaterThan(0);
    const r = await ucitajKasice(kontekst(db, put, { korisnik: petra, obrazac: { akcija: "iskljuci", alias: primjeri.kasica } }));
    expect(lokacija(r)).toBe(`${put}?status=disabled&ok=iskljucena`);
    const d = podaci<PodaciMojihKasica>(await ucitajKasice(kontekst(db, `${put}?status=disabled&ok=iskljucena`, { korisnik: petra })));
    expect(d.kasice.map((m) => m.alias)).toContain(primjeri.kasica);
    expect(d.poruka).toBe("iskljucena");
    const ivana = await korisnik(db, primjeri.demoRacuni.organizator);
    const t = await ucitajKasice(kontekst(db, put, { korisnik: ivana, obrazac: { akcija: "ukljuci", alias: primjeri.kasica } }));
    expect(status(t)).toBe(200);
    expect(podaci<PodaciMojihKasica>(t).greska).toBe(true);
  });

  it("my.donations, my.money, my.external: podaci samo prijavljenog", async () => {
    const { db } = svjeza();
    const ivana = await korisnik(db, primjeri.demoRacuni.organizator);
    const d = podaci<PodaciMojihDonacija>(await ucitajDonacije(kontekst(db, url("hr", "my.donations"), { korisnik: ivana })));
    expect(d.donacije.length).toBeGreaterThan(0);
    expect(d.ukupnoCenti).toBe(ukupnoDonirano(d.donacije));
    const n = podaci<PodaciMogNovca>(await ucitajNovac(kontekst(db, url("hr", "my.money"), { korisnik: ivana })));
    const det = n.skupine[0]!.detalji[primjeri.kampanja.aktivna];
    expect(det?.href).toBe(url("hr", "campaign.manage", { id: primjeri.kampanja.aktivna }));
    const v = podaci<PodaciMojihVanjskih>(await ucitajVanjske(kontekst(db, url("hr", "my.external"), { korisnik: ivana })));
    expect(v.vanjske.length).toBeGreaterThan(0);
    const novi = await korisnik(db, primjeri.demoRacuni.novi);
    expect(podaci<PodaciMojihDonacija>(await ucitajDonacije(kontekst(db, url("hr", "my.donations"), { korisnik: novi }))).donacije).toEqual([]);
    expect(podaci<PodaciMogNovca>(await ucitajNovac(kontekst(db, url("hr", "my.money"), { korisnik: novi }))).skupine).toEqual([]);
    expect(podaci<PodaciMojihVanjskih>(await ucitajVanjske(kontekst(db, url("hr", "my.external"), { korisnik: novi }))).vanjske).toEqual([]);
  });
});

describe("tekstovi „Moje”", () => {
  const kljucevi = (o: unknown, put = ""): string[] =>
    o && typeof o === "object"
      ? Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => (Array.isArray(v) ? [`${put}${k}[${v.length}]`] : kljucevi(v, `${put}${k}.`)))
      : [put];
  it("hr i en imaju isti oblik; copy bez „ulaže” / „invest” i bez isplate", () => {
    expect(kljucevi(MOJE.en)).toEqual(kljucevi(MOJE.hr));
    expect(JSON.stringify(MOJE)).not.toMatch(/ulag|ulož|ulaž|invest/i);
  });
});
