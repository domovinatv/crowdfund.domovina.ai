import { describe, expect, it } from "vitest";
import { kampanjaPoJavnomId, komentariKampanje, novostiKampanje, uplateKampanje } from "../src/lib/db/kampanja";
import { katalog } from "../src/lib/db/katalog";
import primjeri from "../seed/primjeri.json";
import { broj, kaoD1, novaBaza, redovi, SAD_SEEDA } from "./pomoc/baza";

const SAD = SAD_SEEDA;
const sqlite = novaBaza({ seed: true });
const db = kaoD1(sqlite);
const K = primjeri.kampanja;

const kampanja = async (id: string) => (await kampanjaPoJavnomId(db, id, SAD))!;
const idKampanje = (publicId: string) =>
  redovi<{ campaign_id: string }>(sqlite, "SELECT campaign_id FROM campaign_settings WHERE public_id = ?", publicId)[0]!.campaign_id;
/** Ni u jednom javnom objektu nema e-pošte ni hasha IBAN-a. */
const bezOsobnih = (x: unknown) => {
  const j = JSON.stringify(x);
  expect(j).not.toContain("@demo.invalid");
  expect(j).not.toMatch(/"demo[0-9a-f]{20,}"/);
};

describe("kampanjaPoJavnomId()", () => {
  it("aktivna: sve za stranicu, ID bez obzira na veličinu slova", async () => {
    const k = await kampanja(K.aktivna);
    expect(k.publicId).toBe(K.aktivna);
    expect((await kampanjaPoJavnomId(db, ` ${K.aktivna.toUpperCase()} `, SAD))?.id).toBe(k.id);
    expect(k).toMatchObject({ stanje: "active", primaUplate: true, noindex: false, kind: "one_time", type: "donation" });
    expect(k.category).toEqual({ key: "charity", nameHr: "Dobrotvorno", nameEn: "Charity" });
    expect(k.organizator.organizationSlug).toBe("demo-svjetionik");
    expect(k.organizator.verified).toBe(true);
    expect(k.novac).toMatchObject({ chainId: 10200, mode: "byo", provjeren: true });
    expect(k.novac!.safeAddress).toMatch(/^0xde5afe/);
    expect(k.statistika.raisedCents).toBe(broj(sqlite, "SELECT raised_cents FROM campaign_stats WHERE campaign_id = ?", k.id));
    expect(k.statistika.posto).toBe(Math.floor((k.statistika.raisedCents! * 100) / k.goalCents!));
    expect(k.brojevi.uplate).toBe(broj(sqlite, "SELECT count(*) FROM contributions WHERE campaign_id = ? AND state = 'paid'", k.id));
    expect(k.brojevi.kasice).toBe(1);
    expect(k.postavke).toMatchObject({ komentari: "everyone", kasiceDopustene: true, popisUplataVidljiv: true });
    expect(k.autor).toBeNull();
    expect(k.videoUrl).toBeNull();
    bezOsobnih(k);
  });

  it("video: prvi zapis `campaign_media` (kind video) po poziciji (S11)", async () => {
    const id = idKampanje(K.aktivna);
    const umetni = sqlite.prepare("INSERT INTO campaign_media (id, campaign_id, kind, file_id, video_url, position, created_at) VALUES (?, ?, 'video', NULL, ?, ?, 0)");
    umetni.run("m-video-2", id, "https://vimeo.com/76979871", 1);
    umetni.run("m-video-1", id, "https://youtu.be/dQw4w9WgXcQ", 0);
    try {
      expect((await kampanja(K.aktivna)).videoUrl).toBe("https://youtu.be/dQw4w9WgXcQ");
    } finally {
      sqlite.prepare("DELETE FROM campaign_media WHERE id IN ('m-video-1', 'm-video-2')").run();
    }
  });

  it("nevaljan ili nepostojeći ID → null", async () => {
    for (const id of ["", "abc", "zzzzzz", "iiiiii", "1h01z", "1h01zm1"]) expect(await kampanjaPoJavnomId(db, id, SAD), id).toBeNull();
  });

  it("404: draft, review, blokirana i obrisana", async () => {
    for (const id of [K.draft404, K.review404, K.blokirana404, K.obrisana404]) expect(await kampanjaPoJavnomId(db, id, SAD), id).toBeNull();
  });

  it("unlisted: dohvatljiva s noindex, ali nije u katalogu", async () => {
    const k = await kampanja(K.unlisted);
    expect(k.noindex).toBe(true);
    expect(k.primaUplate).toBe(true);
    expect((await katalog(db, { q: k.title }, SAD)).ukupno).toBe(0);
  });

  it("isključena (paused) i zatvorena su vidljive, ali ne primaju uplate", async () => {
    expect(await kampanja(K.paused)).toMatchObject({ stanje: "paused", primaUplate: false });
    expect(await kampanja(K.zavrsena)).toMatchObject({ stanje: "closed", primaUplate: false });
    expect((await kampanja(K.zavrsena)).statistika.posto).toBeGreaterThanOrEqual(100);
  });

  it("rok istekao: i dalje aktivna i prima uplate (odluka 204), cilj dosegnut", async () => {
    const k = await kampanja(K.rokIstekaoUspjesna);
    expect(k).toMatchObject({ stanje: "active", rokIstekao: true, daysLeft: 0, primaUplate: true });
    expect(k.statistika.posto).toBeGreaterThanOrEqual(100);
    expect(k.postavke.redoslijedUplata).toBe("highest");
    expect(k.postavke.komentari).toBe("contributors");
  });

  it("skriveni iznos i broj (406) ne izlaze iz upita", async () => {
    const iznos = await kampanja(K.skrivenIznos);
    expect(iznos.statistika.raisedCents).toBeNull();
    expect(iznos.statistika.posto).toBeNull();
    const stvarno = broj(sqlite, "SELECT raised_cents FROM campaign_stats WHERE campaign_id = ?", iznos.id);
    expect(stvarno).toBeGreaterThan(0);
    expect(JSON.stringify(iznos)).not.toContain(`:${stvarno}`);
    const brojP = await kampanja(K.skrivenBroj);
    expect(brojP.statistika.contributorCount).toBeNull();
    expect(brojP.statistika.contributionCount).toBeNull();
    expect(brojP.brojevi.uplate).toBeNull();
    expect(brojP.statistika.raisedCents).not.toBeNull();
  });

  it("popis uplata skriven, komentari i kasice isključeni, za organizaciju, ponude, razine", async () => {
    const p = await kampanja(K.popisUplataSkriven);
    expect(p.postavke.popisUplataVidljiv).toBe(false);
    expect(p.brojevi.uplate).toBeNull();
    const ki = await kampanja(K.komentariIskljuceni);
    expect(ki.postavke).toMatchObject({ komentari: "off", kasiceDopustene: false });
    expect(ki.brojevi).toMatchObject({ komentari: 0, kasice: 0 });
    const zo = await kampanja(K.zaOrganizaciju);
    expect(zo.kind).toBe("for_organization");
    expect(zo.autor?.name).toBeTruthy();
    const sp = await kampanja(K.sPonudama);
    expect(sp.postavke.ponudeDopustene).toBe(true);
    expect(sp.brojevi.ponude).toBe(2);
    expect(sp.razine.length).toBeGreaterThan(0);
    expect(sp.razine.every((r) => r.preostalo === null || r.preostalo >= 0)).toBe(true);
  });
});

describe("novostiKampanje()", () => {
  it("od najnovije, bez obrisanih; skrivena kampanja nema novosti", async () => {
    const id = idKampanje(K.aktivna);
    const n = await novostiKampanje(db, id);
    expect(n.length).toBe(broj(sqlite, "SELECT count(*) FROM campaign_updates WHERE campaign_id = ? AND deleted_at IS NULL", id));
    expect(n.length).toBeGreaterThan(0);
    expect(n.map((x) => x.publishedAt)).toEqual([...n.map((x) => x.publishedAt)].sort((a, b) => b - a));
    expect(await novostiKampanje(db, idKampanje(K.blokirana404))).toEqual([]);
  });
});

describe("komentariKampanje()", () => {
  const sviKomentari = async () => {
    const ids = redovi<{ campaign_id: string }>(sqlite, "SELECT DISTINCT campaign_id FROM comments").map((r) => r.campaign_id);
    return (await Promise.all(ids.map((id) => komentariKampanje(db, id)))).flatMap((k) => k.komentari);
  };

  it("bez sakrivenih i obrisanih, jedna razina odgovora", async () => {
    const svi = await sviKomentari();
    const sakriveni = redovi<{ id: string }>(sqlite, "SELECT id FROM comments WHERE hidden_at IS NOT NULL").map((r) => r.id);
    expect(sakriveni.length).toBeGreaterThan(0);
    const ravno = svi.flatMap((k) => [k, ...k.odgovori]);
    for (const id of sakriveni) expect(ravno.map((k) => k.id)).not.toContain(id);
    expect(svi.some((k) => k.odgovori.length > 0)).toBe(true);
    expect(svi.flatMap((k) => k.odgovori).every((o) => o.odgovori.length === 0)).toBe(true);
    expect(svi.flatMap((k) => k.odgovori).some((o) => o.autor.organizator)).toBe(true);
    bezOsobnih(svi);
  });

  it("poruka iz checkouta: anonimna bez imena i iznosa, skriveni iznos ostaje skriven", async () => {
    const svi = await sviKomentari();
    const izDoprinosa = redovi<{ id: string; anonymous: number; amount_hidden: number; hide_raised: number }>(
      sqlite,
      `SELECT k.id, p.anonymous, a.amount_hidden, s.hide_raised FROM comments k
         JOIN contribution_profiles p ON p.contribution_id = k.contribution_id
         JOIN contribution_attributions a ON a.contribution_id = k.contribution_id
         JOIN campaign_settings s ON s.campaign_id = k.campaign_id
         JOIN campaigns c ON c.id = k.campaign_id
        WHERE k.hidden_at IS NULL AND s.blocked_at IS NULL AND c.deleted_at IS NULL AND c.state IN ('active','closed')
          AND s.comments_mode != 'off'`,
    );
    expect(izDoprinosa.length).toBeGreaterThan(0);
    for (const r of izDoprinosa) {
      const k = svi.find((x) => x.id === r.id)!;
      expect(k, r.id).toBeDefined();
      if (r.anonymous) expect(k.autor).toMatchObject({ name: null, anonymous: true, profileSlug: null });
      if (r.anonymous || r.amount_hidden || r.hide_raised) expect(k.amountCents).toBeNull();
      else expect(k.amountCents).toBeGreaterThan(0);
    }
  });

  it("isključeni komentari i nevidljiva kampanja: prazno", async () => {
    expect(await komentariKampanje(db, idKampanje(K.komentariIskljuceni))).toEqual({ nacin: "off", iskljuceni: true, komentari: [] });
    expect((await komentariKampanje(db, idKampanje(K.blokirana404))).komentari).toEqual([]);
  });
});

describe("uplateKampanje()", () => {
  it("latest: samo plaćene, od najnovije; limit/offset; ukupno", async () => {
    const id = idKampanje(K.aktivna);
    const n = broj(sqlite, "SELECT count(*) FROM contributions WHERE campaign_id = ? AND state = 'paid'", id);
    const sve = await uplateKampanje(db, id, { sort: "latest", limit: 100 });
    expect(sve).toMatchObject({ skriveno: false, sort: "latest", ukupno: n });
    expect(sve.uplate).toHaveLength(n);
    expect(sve.uplate.map((u) => u.paidAt)).toEqual([...sve.uplate.map((u) => u.paidAt)].sort((a, b) => b - a));
    const druga = await uplateKampanje(db, id, { sort: "latest", limit: 3, offset: 3 });
    expect(druga.uplate).toEqual(sve.uplate.slice(3, 6));
    bezOsobnih(sve);
  });

  it("anonimnost i skriveni iznos doprinosa (406)", async () => {
    const svi = redovi<{ campaign_id: string }>(
      sqlite,
      `SELECT DISTINCT s.campaign_id FROM campaign_settings s JOIN campaigns c ON c.id = s.campaign_id
        WHERE c.state IN ('active','closed') AND c.deleted_at IS NULL AND s.blocked_at IS NULL AND s.hide_raised = 0`,
    );
    const uplate = (await Promise.all(svi.map((r) => uplateKampanje(db, r.campaign_id, { limit: 100 })))).flatMap((u) => u.uplate);
    const anonimne = uplate.filter((u) => u.anonymous);
    expect(anonimne.length).toBeGreaterThan(0);
    expect(anonimne.every((u) => u.name === null && !u.nameVerified)).toBe(true);
    expect(uplate.filter((u) => !u.anonymous).every((u) => u.name)).toBe(true);
    const skriveni = uplate.filter((u) => u.amountCents === null);
    expect(skriveni.length).toBe(
      broj(sqlite, `SELECT count(*) FROM contributions d JOIN contribution_attributions a ON a.contribution_id = d.id
        JOIN campaign_settings s ON s.campaign_id = d.campaign_id JOIN campaigns c ON c.id = d.campaign_id
        WHERE d.state = 'paid' AND a.amount_hidden = 1 AND s.hide_raised = 0 AND c.state IN ('active','closed')
          AND c.deleted_at IS NULL AND s.blocked_at IS NULL AND s.contributions_list = 'visible'`),
    );
    expect(skriveni.length).toBeGreaterThan(0);
  });

  it("highest: vidljivi iznosi od najvećeg, skriveni na kraju; zadani redoslijed iz postavki", async () => {
    const id = idKampanje(K.rokIstekaoUspjesna);
    const zadano = await uplateKampanje(db, id, { limit: 100 });
    expect(zadano.sort).toBe("highest");
    const iznosi = zadano.uplate.map((u) => u.amountCents);
    const prviSkriveni = iznosi.indexOf(null);
    const vidljivi = (prviSkriveni < 0 ? iznosi : iznosi.slice(0, prviSkriveni)) as number[];
    expect(vidljivi).toEqual([...vidljivi].sort((a, b) => b - a));
    if (prviSkriveni >= 0) expect(iznosi.slice(prviSkriveni).every((x) => x === null)).toBe(true);
  });

  it("kampanja sa skrivenim iznosom: svi iznosi null i poredak po vremenu", async () => {
    const r = await uplateKampanje(db, idKampanje(K.skrivenIznos), { sort: "highest", limit: 100 });
    expect(r.sort).toBe("latest");
    expect(r.uplate.length).toBeGreaterThan(0);
    expect(r.uplate.every((u) => u.amountCents === null)).toBe(true);
  });

  it("skriven broj → ukupno null; skriven popis → prazno; nevidljiva kampanja → prazno", async () => {
    const b = await uplateKampanje(db, idKampanje(K.skrivenBroj));
    expect(b.ukupno).toBeNull();
    expect(b.uplate.length).toBeGreaterThan(0);
    expect(await uplateKampanje(db, idKampanje(K.popisUplataSkriven))).toMatchObject({ skriveno: true, ukupno: null, uplate: [] });
    expect(await uplateKampanje(db, idKampanje(K.blokirana404))).toMatchObject({ skriveno: true, uplate: [] });
  });
});
