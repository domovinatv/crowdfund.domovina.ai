/**
 * Komentari (S6): pravo komentiranja (samo prijavljeni, „samo podržavatelji”, isključeni), objava s javne
 * stranice (303 na sidro `#k-{id}`), moderacija organizatora (sakrij/prikaži, odgovor na vrh), javni prikaz
 * bez skrivenih. Nad seedanim SQLiteom.
 */
import { describe, expect, it } from "vitest";
import primjeri from "../seed/primjeri.json";
import { komentariKampanje } from "../src/lib/db/kampanja";
import { NAJVISE_KOMENTARA, dodajKomentar, komentariZaUpravljanje, odgovoriOrganizatora, postaviSkrivenost, pravoKomentara } from "../src/lib/db/komentari";
import type { Korisnik } from "../src/lib/pristup";
import { url } from "../src/lib/rute";
import { ucitaj as ucitajKampanju, type PodaciKampanje } from "../src/views/stranice/campaign.ucitaj";
import { ucitaj as ucitajKomentare, type PodaciKomentara } from "../src/views/stranice/campaign.manage.comments.ucitaj";
import { broj, redovi } from "./pomoc/baza";
import { kontekst } from "./pomoc/kontekst";
import { lokacija, okolina, podaci, status } from "./pomoc/upravljanje";

type O = Awaited<ReturnType<typeof okolina>>;

/** Podržavatelj aktivne kampanje (plaćeni doprinos s korisnikom) koji nije član njezine organizacije. */
function podrzavatelj(o: O): Korisnik {
  const r = redovi<{ id: string; email: string }>(
    o.sqlite,
    `SELECT DISTINCT u.id, u.email FROM contributions d
       JOIN contribution_attributions a ON a.contribution_id = d.id LEFT JOIN checkouts ch ON ch.id = a.checkout_id
       JOIN users u ON u.id = COALESCE(a.user_id, ch.user_id)
      WHERE d.campaign_id = ? AND d.state = 'paid'
        AND NOT EXISTS (SELECT 1 FROM memberships m WHERE m.user_id = u.id AND m.organization_id = ?)
      LIMIT 1`,
    o.aktivna.id, o.aktivna.org_id,
  )[0]!;
  return { id: r.id, email: r.email, ime: r.email, platformRole: "user" } as Korisnik;
}

const stranica = (o: O, korisnik: Korisnik | null, obrazac?: Record<string, string>, upit = "") =>
  ucitajKampanju(kontekst(o.db, url("hr", "campaign", { id: o.aktivna.public_id }) + upit, { params: { id: o.aktivna.public_id }, korisnik, obrazac }));

describe("pravo komentiranja", () => {
  it("svi: neprijavljeni → prijava, prijavljeni → da", async () => {
    const o = await okolina();
    expect(await pravoKomentara(o.db, o.aktivna.id, null)).toBe("prijava");
    expect(await pravoKomentara(o.db, o.aktivna.id, o.korisnici.novi.id)).toBe("da");
    expect(podaci<PodaciKampanje>(await stranica(o, null)).komentiranje.pravo).toBe("prijava");
    expect(podaci<PodaciKampanje>(await stranica(o, o.korisnici.novi)).komentiranje.pravo).toBe("da");
  });
  it("samo podržavatelji: novi ne smije, podržavatelj i član organizacije smiju", async () => {
    const o = await okolina();
    o.sqlite.prepare("UPDATE campaign_settings SET comments_mode = 'contributors' WHERE campaign_id = ?").run(o.aktivna.id);
    expect(await pravoKomentara(o.db, o.aktivna.id, o.korisnici.novi.id)).toBe("samo_podrzavatelji");
    expect(await pravoKomentara(o.db, o.aktivna.id, podrzavatelj(o).id)).toBe("da");
    expect(await pravoKomentara(o.db, o.aktivna.id, o.korisnici.viewer.id)).toBe("da");
    const r = await dodajKomentar(o.db, o.aktivna.id, o.korisnici.novi.id, "Pozdrav", o.sad);
    expect(r).toEqual({ ok: false, greska: "zabranjeno", pravo: "samo_podrzavatelji" });
    expect((await dodajKomentar(o.db, o.aktivna.id, podrzavatelj(o).id, "Sretno!", o.sad)).ok).toBe(true);
  });
  it("isključeni komentari: nitko ne komentira, javni popis prazan, upravljanje upozorava", async () => {
    const o = await okolina();
    const isk = o.kampanja(primjeri.kampanja.komentariIskljuceni);
    expect(await pravoKomentara(o.db, isk.id, o.korisnici.owner.id)).toBe("iskljuceni");
    expect((await dodajKomentar(o.db, isk.id, o.korisnici.owner.id, "x", o.sad)).ok).toBe(false);
    expect((await komentariKampanje(o.db, isk.id)).iskljuceni).toBe(true);
  });
  it("neprijavljeni POST s javne stranice ne sprema ništa (zabranjeno)", async () => {
    const o = await okolina();
    const prije = broj(o.sqlite, "SELECT count(*) AS n FROM comments WHERE campaign_id = ?", o.aktivna.id);
    const r = await stranica(o, null, { akcija: "komentar", body: "Anonimni pokušaj" });
    expect(podaci<PodaciKampanje>(r).komentiranje.greska).toBe("zabranjeno");
    expect(broj(o.sqlite, "SELECT count(*) AS n FROM comments WHERE campaign_id = ?", o.aktivna.id)).toBe(prije);
  });
});

describe("objava s javne stranice", () => {
  it("prijavljeni: 303 na sidro novog komentara, poruka uspjeha, komentar u javnom popisu", async () => {
    const o = await okolina();
    const r = await stranica(o, o.korisnici.novi, { akcija: "komentar", body: "  Super ideja!  " });
    expect(status(r)).toBe(303);
    const loc = lokacija(r)!;
    expect(loc).toMatch(new RegExp(`^${url("hr", "campaign", { id: o.aktivna.public_id })}\\?komentar=1#k-[0-9a-f-]{36}$`));
    const id = loc.split("#k-")[1]!;
    expect((o.sqlite.prepare("SELECT body FROM comments WHERE id = ?").get(id) as { body: string }).body).toBe("Super ideja!");
    const p = podaci<PodaciKampanje>(await stranica(o, o.korisnici.novi, undefined, "?komentar=1"));
    expect(p.komentiranje.poslano).toBe(true);
    expect(p.komentari.komentari.some((c) => c.id === id)).toBe(true);
  });
  it("prazan i predug komentar: greška uz polje, tekst ostaje", async () => {
    const o = await okolina();
    expect(podaci<PodaciKampanje>(await stranica(o, o.korisnici.novi, { akcija: "komentar", body: "   " })).komentiranje.greska).toBe("obavezno");
    const dug = "a".repeat(NAJVISE_KOMENTARA + 1);
    const p = podaci<PodaciKampanje>(await stranica(o, o.korisnici.novi, { akcija: "komentar", body: dug })).komentiranje;
    expect(p).toMatchObject({ greska: "predugo", body: dug });
  });
});

describe("moderacija organizatora", () => {
  const upr = (o: O, uloga: "editor" | "viewer" | "moderator", obrazac?: Record<string, string>) =>
    ucitajKomentare(kontekst(o.db, url("hr", "campaign.manage.comments", { id: o.aktivna.public_id }), {
      params: { id: o.aktivna.public_id }, korisnik: o.korisnici[uloga], obrazac,
    }));

  it("sakrij → nestaje s javne stranice (ostaje u upravljanju), prikaži → vraća se", async () => {
    const o = await okolina();
    const n = await dodajKomentar(o.db, o.aktivna.id, o.korisnici.novi.id, "Za skrivanje", o.sad);
    if (!n.ok) throw new Error("komentar");
    const r = await upr(o, "editor", { akcija: "sakrij", id: n.id });
    expect(lokacija(r)).toContain(`?ok=skriven#k-${n.id}`);
    expect((await komentariKampanje(o.db, o.aktivna.id)).komentari.some((c) => c.id === n.id)).toBe(false);
    const u = (await komentariZaUpravljanje(o.db, o.aktivna.id)).find((c) => c.id === n.id)!;
    expect(u.hiddenAt).not.toBeNull();
    expect(broj(o.sqlite, "SELECT count(*) AS n FROM comments WHERE id = ? AND hidden_by = ?", n.id, o.korisnici.editor.id)).toBe(1);
    expect(lokacija(await upr(o, "editor", { akcija: "prikazi", id: n.id }))).toContain("?ok=prikazan");
    expect((await komentariKampanje(o.db, o.aktivna.id)).komentari.some((c) => c.id === n.id)).toBe(true);
    expect(await postaviSkrivenost(o.db, o.aktivna.id, "nepostojeci", true, o.korisnici.editor.id, o.sad)).toBe(false);
  });
  it("odgovor organizatora ide ispod vrha (i odgovor na odgovor), s oznakom organizatora", async () => {
    const o = await okolina();
    const n = await dodajKomentar(o.db, o.aktivna.id, o.korisnici.novi.id, "Pitanje?", o.sad);
    if (!n.ok) throw new Error("komentar");
    expect(lokacija(await upr(o, "editor", { akcija: "odgovori", id: n.id, body: "Odgovor." }))).toContain(`?ok=odgovoreno#k-${n.id}`);
    const odg = o.sqlite.prepare("SELECT id, parent_id FROM comments WHERE parent_id = ?").get(n.id) as { id: string; parent_id: string };
    const r2 = await odgovoriOrganizatora(o.db, o.aktivna.id, odg.id, o.korisnici.owner.id, "Dopuna.", Date.now() + 60_000);
    expect(r2.ok).toBe(true);
    expect(broj(o.sqlite, "SELECT count(*) AS n FROM comments WHERE parent_id = ?", n.id)).toBe(2);
    const javno = (await komentariKampanje(o.db, o.aktivna.id)).komentari.find((c) => c.id === n.id)!;
    expect(javno.odgovori.map((x) => x.body)).toEqual(["Odgovor.", "Dopuna."]);
    expect(javno.odgovori.every((x) => x.autor.organizator)).toBe(true);
  });
  it("greške odgovora: prazan tekst, nepostojeći komentar; promatrač nema pristup", async () => {
    const o = await okolina();
    const n = await dodajKomentar(o.db, o.aktivna.id, o.korisnici.novi.id, "Bok", o.sad);
    if (!n.ok) throw new Error("komentar");
    expect(podaci<PodaciKomentara>(await upr(o, "editor", { akcija: "odgovori", id: n.id, body: " " })).greska).toEqual({ za: n.id, greska: "obavezno", body: " " });
    expect(podaci<PodaciKomentara>(await upr(o, "editor", { akcija: "odgovori", id: "nema", body: "x" })).greska?.greska).toBe("nema_roditelja");
    expect(status(await upr(o, "viewer", { akcija: "sakrij", id: n.id }))).toBe(404);
    expect(status(await upr(o, "moderator"))).toBe(200);
  });
});
