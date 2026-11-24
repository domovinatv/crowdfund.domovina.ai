// Razine pristupa (docs/07, S6): P, U:uloga, K, A, P+e i stranica dodatne potvrde, nad seedom u sqliteu.
import { describe, expect, it } from "vitest";
import primjeri from "../seed/primjeri.json";
import {
  ULOGE,
  imaSvjezuPotvrdu,
  imaUlogu,
  jeModerator,
  pristupKampanji,
  ulogaU,
  zahtijevajKampanju,
  zahtijevajModeratora,
  zahtijevajOrganizaciju,
  zahtijevajPrijavu,
  zahtijevajSvjezuPotvrdu,
  type Korisnik,
} from "../src/lib/pristup";
import { KOLACIC_DEMO_POSTE, SVJEZA_POTVRDA, korisnikPoEmailu, korisnikSesije, type DemoPoruka } from "../src/lib/sesija";
import { ucitaj as ucitajPotvrduRadnje, type PodaciPotvrdeRadnje } from "../src/views/stranice/confirm-action.ucitaj";
import { ucitaj as ucitajKasicu } from "../src/views/stranice/campaign.moneybox.new.ucitaj";
import { ucitaj as ucitajPonudu } from "../src/views/stranice/offers.new.ucitaj";
import { kaoD1, novaBaza, redovi } from "./pomoc/baza";
import { kontekst, laziKolacici } from "./pomoc/kontekst";

const sqlite = novaBaza({ seed: true });
const db = kaoD1(sqlite);
const sad = Date.now();
const korisnik = async (email: string) => {
  const k = (await korisnikPoEmailu(db, email))!;
  return { id: k.id, email: k.email, ime: k.ime, platformRole: k.platformRole } satisfies Korisnik;
};
const organizator = (await korisnikSesije(db, primjeri.demoSesija, sad))!;
const moderator = (await korisnikSesije(db, primjeri.demoSesijaModerator, sad))!;
const novi = (await korisnikSesije(db, primjeri.demoSesijaNovi, sad))!;
const adminSvjetionika = await korisnik("petra.probic@demo.invalid"); // admin u demo-svjetionik
const viewerKrova = await korisnik("luka.uzorkovic@demo.invalid"); // viewer u demo-suncani-krov
const autorRodjendana = await korisnik("josip.izmisljenic@demo.invalid"); // autor odobrene kampanje za zakladu
const autorUPregledu = await korisnik("katarina.zamisljic@demo.invalid"); // autor kampanje koja čeka odobrenje

const orgId = (slug: string) => redovi<{ id: string }>(sqlite, "SELECT id FROM organizations WHERE slug = ?", slug)[0]!.id;
const kampanja = (uvjet: string) =>
  redovi<{ id: string; public_id: string }>(sqlite, `SELECT c.id, s.public_id FROM campaigns c JOIN campaign_settings s ON s.campaign_id = c.id WHERE ${uvjet} LIMIT 1`)[0]!;
const aktivna = kampanja(`s.public_id = '${primjeri.kampanja.aktivna}'`);
const zaOrganizaciju = kampanja(`s.public_id = '${primjeri.kampanja.zaOrganizaciju}'`);
const uPregledu = kampanja(`s.public_id = '${primjeri.kampanja.review404}'`);
const kampanjaKrova = kampanja(`c.organizer_id = (SELECT organizer_id FROM organizations WHERE slug = 'demo-suncani-krov') AND c.deleted_at IS NULL`);
const status = (r: unknown) => (r as Response).status;
const lokacija = (r: unknown) => (r as Response).headers.get("Location");

describe("uloge i moderator", () => {
  it("viewer < editor < admin < owner", () => {
    expect(ULOGE).toEqual(["viewer", "editor", "admin", "owner"]);
    expect(imaUlogu("owner", "admin")).toBe(true);
    expect(imaUlogu("admin", "admin")).toBe(true);
    expect(imaUlogu("editor", "admin")).toBe(false);
    expect(imaUlogu("viewer", "viewer")).toBe(true);
    expect(imaUlogu(null, "viewer")).toBe(false);
  });
  it("ulogaU iz memberships", async () => {
    expect(await ulogaU(db, organizator.id, orgId(primjeri.organizacijaOrganizatora))).toBe("owner");
    expect(await ulogaU(db, adminSvjetionika.id, orgId(primjeri.organizacijaOrganizatora))).toBe("admin");
    expect(await ulogaU(db, novi.id, orgId(primjeri.organizacijaOrganizatora))).toBeNull();
  });
  it("jeModerator samo za platform_role = moderator", () => {
    expect(jeModerator(moderator)).toBe(true);
    expect(jeModerator(organizator)).toBe(false);
    expect(jeModerator(null)).toBe(false);
  });
});

describe("P: zahtijevajPrijavu", () => {
  it("neprijavljeni → 302 na /{lang}/prijava?next=<put+upit>", () => {
    const r = zahtijevajPrijavu({ lang: "en", url: new URL("http://x/en/my/campaigns?sort=newest"), korisnik: null });
    expect(status(r)).toBe(302);
    expect(lokacija(r)).toBe(`/en/sign-in?next=${encodeURIComponent("/en/my/campaigns?sort=newest")}`);
    expect(zahtijevajPrijavu({ lang: "hr", url: new URL("http://x/hr"), korisnik: organizator })).toBe(organizator);
  });
  it("P stranice S5 (odluka 516): 302 bez sesije, 200 sa sesijom", async () => {
    const put = `/hr/${primjeri.kampanja.aktivna}/kasica/nova`;
    expect(lokacija(await ucitajKasicu(kontekst(db, put)))).toBe(`/hr/prijava?next=${encodeURIComponent(put)}`);
    expect(await ucitajKasicu(kontekst(db, put, { korisnik: novi }))).toEqual({ podaci: null });
    expect(await ucitajPonudu(kontekst(db, "/en/offers/new", { korisnik: novi }))).toEqual({ podaci: null });
  });
});

describe("K: pristupKampanji i zahtijevajKampanju", () => {
  it("uloga u organizaciji kampanje daje K", async () => {
    expect(await pristupKampanji(db, organizator, aktivna.id)).toMatchObject({ uloga: "owner", k: true, autor: true, moderator: false, organizationSlug: primjeri.organizacijaOrganizatora });
    expect(await pristupKampanji(db, adminSvjetionika, zaOrganizaciju.id)).toMatchObject({ uloga: "admin", k: true, autor: false });
  });
  it("autor kampanje za organizaciju ima K samo dok čeka odobrenje", async () => {
    expect(await pristupKampanji(db, autorUPregledu, uPregledu.id)).toMatchObject({ uloga: null, autor: true, autorCeka: true, k: true });
    expect(await pristupKampanji(db, autorRodjendana, zaOrganizaciju.id)).toBeNull();
  });
  it("moderator prolazi bez K; bez veze i neprijavljeni nemaju pristup", async () => {
    expect(await pristupKampanji(db, moderator, aktivna.id)).toMatchObject({ k: false, moderator: true });
    expect(await pristupKampanji(db, novi, aktivna.id)).toBeNull();
    expect(await pristupKampanji(db, null, aktivna.id)).toBeNull();
    expect(await pristupKampanji(db, organizator, "nepostojeca")).toBeNull();
  });
  it("zahtijevajKampanju: 302 neprijavljenom, 404 bez prava ili uloge ispod najmanje", async () => {
    const put = `/hr/${aktivna.public_id}/upravljanje`;
    expect(status(await zahtijevajKampanju(kontekst(db, put), aktivna.public_id))).toBe(302);
    expect(status(await zahtijevajKampanju(kontekst(db, put, { korisnik: novi }), aktivna.public_id))).toBe(404);
    expect(status(await zahtijevajKampanju(kontekst(db, put, { korisnik: organizator }), "zzzzzz"))).toBe(404);
    expect(status(await zahtijevajKampanju(kontekst(db, put, { korisnik: organizator }), "../x"))).toBe(404);
    const ok = await zahtijevajKampanju(kontekst(db, put, { korisnik: organizator }), aktivna.public_id.toUpperCase(), { najmanje: "owner" });
    expect(ok).toMatchObject({ korisnik: organizator, kampanja: { campaignId: aktivna.id, uloga: "owner" } });
    const krov = kontekst(db, `/hr/${kampanjaKrova.public_id}/uredi`, { korisnik: viewerKrova });
    expect(await zahtijevajKampanju(krov, kampanjaKrova.public_id)).toMatchObject({ kampanja: { uloga: "viewer" } });
    expect(status(await zahtijevajKampanju(krov, kampanjaKrova.public_id, { najmanje: "editor" }))).toBe(404);
    expect(await zahtijevajKampanju(kontekst(db, put, { korisnik: autorUPregledu }), uPregledu.public_id, { najmanje: "editor" })).toMatchObject({ kampanja: { autorCeka: true } });
    expect(await zahtijevajKampanju(kontekst(db, put, { korisnik: moderator }), aktivna.public_id, { najmanje: "owner" })).toMatchObject({ kampanja: { moderator: true } });
  });
});

describe("U:uloga i A", () => {
  it("zahtijevajOrganizaciju po slugu i najmanjoj ulozi; moderator ne prolazi", async () => {
    const put = `/hr/o/${primjeri.organizacijaOrganizatora}/clanovi`;
    expect(status(await zahtijevajOrganizaciju(kontekst(db, put), primjeri.organizacijaOrganizatora, "viewer"))).toBe(302);
    expect(await zahtijevajOrganizaciju(kontekst(db, put, { korisnik: organizator }), primjeri.organizacijaOrganizatora, "owner")).toMatchObject({
      uloga: "owner",
      organizacija: { slug: primjeri.organizacijaOrganizatora, status: "active", isFixedBeneficiary: true },
    });
    expect(status(await zahtijevajOrganizaciju(kontekst(db, put, { korisnik: adminSvjetionika }), primjeri.organizacijaOrganizatora, "owner"))).toBe(404);
    expect(await zahtijevajOrganizaciju(kontekst(db, put, { korisnik: adminSvjetionika }), primjeri.organizacijaOrganizatora, "admin")).toMatchObject({ uloga: "admin" });
    expect(status(await zahtijevajOrganizaciju(kontekst(db, put, { korisnik: moderator }), primjeri.organizacijaOrganizatora, "viewer"))).toBe(404);
  });
  it("zahtijevajModeratora: 302 bez sesije, 404 ne-moderatoru", () => {
    const ctx = (k: Korisnik | null) => ({ lang: "hr" as const, url: new URL("http://x/admin/prijave"), korisnik: k });
    expect(lokacija(zahtijevajModeratora(ctx(null)))).toBe(`/hr/prijava?next=${encodeURIComponent("/admin/prijave")}`);
    expect(status(zahtijevajModeratora(ctx(organizator)))).toBe(404);
    expect(zahtijevajModeratora(ctx(moderator))).toBe(moderator);
  });
});

describe("P+e: dodatna potvrda", () => {
  it("bez svježe potvrde 302 na potvrda-radnje; isti kod se ponovno koristi; kod → 303 na next; vrijedi 10 min", async () => {
    const d = kaoD1(novaBaza({ seed: true }));
    const kolacici = laziKolacici();
    const put = `/hr/${aktivna.public_id}/upravljanje/zatvori?korak=2`;
    const ctx = () => kontekst(d, put, { korisnik: organizator, kolacici });
    expect(status(await zahtijevajSvjezuPotvrdu(kontekst(d, put), "close_campaign", sad))).toBe(302);

    const r = await zahtijevajSvjezuPotvrdu(ctx(), "close_campaign", sad);
    expect(status(r)).toBe(302);
    const posta = JSON.parse(kolacici.mapa.get(KOLACIC_DEMO_POSTE)!) as DemoPoruka;
    expect(lokacija(r)).toBe(`/hr/potvrda-radnje/${posta.id}?next=${encodeURIComponent(put)}`);
    expect(lokacija(await zahtijevajSvjezuPotvrdu(ctx(), "close_campaign", sad))).toBe(lokacija(r));

    // stranica potvrde: tuđi token 404, vlastiti 200 s demo kodom
    const stranica = (k: Korisnik, obrazac?: Record<string, string>) =>
      ucitajPotvrduRadnje(kontekst(d, `/hr/potvrda-radnje/${posta.id}?next=${encodeURIComponent(put)}`, { params: { token: posta.id }, korisnik: k, kolacici, ...(obrazac ? { obrazac } : {}) }));
    expect(status(await stranica(adminSvjetionika))).toBe(404);
    expect(status(await ucitajPotvrduRadnje(kontekst(d, "/hr/potvrda-radnje/x", { params: { token: posta.id } })))).toBe(302);
    const p = (await stranica(organizator)) as { podaci: PodaciPotvrdeRadnje };
    expect(p.podaci).toMatchObject({ action: "close_campaign", stanje: "vrijedi", next: put, demo: { kod: posta.kod } });

    expect(await stranica(organizator, { kod: "000000" === posta.kod ? "111111" : "000000", next: put })).toMatchObject({ podaci: { greska: "pogresan", preostalo: 4 } });
    const ok = await stranica(organizator, { kod: posta.kod, next: put });
    expect([status(ok), lokacija(ok)]).toEqual([303, put]);

    const nakon = Date.now();
    expect(await zahtijevajSvjezuPotvrdu(ctx(), "close_campaign", nakon)).toBeNull();
    expect(await imaSvjezuPotvrdu(d, organizator.id, "delete_campaign", nakon)).toBe(false);
    expect(status(await zahtijevajSvjezuPotvrdu(ctx(), "close_campaign", nakon + SVJEZA_POTVRDA + 1000))).toBe(302);
  });

  it("token dodatne potvrde iz seeda otvara stranicu organizatoru (istekao kod: 200 s uputom)", async () => {
    const r = (await ucitajPotvrduRadnje(kontekst(db, `/hr/potvrda-radnje/${primjeri.potvrdaRadnje}`, { params: { token: primjeri.potvrdaRadnje }, korisnik: organizator }))) as {
      podaci: PodaciPotvrdeRadnje;
    };
    expect(r.podaci).toMatchObject({ stanje: "istekao", action: "close_campaign", demo: null });
  });
});
