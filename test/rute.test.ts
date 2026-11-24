import { describe, expect, it } from "vitest";
import { RUTE, RUTE_BEZ_JEZIKA, prevediPut, url } from "../src/lib/rute";

// Odluke 302 i 401 / docs/07 konvencija 3: javni ID kampanje je 6 znakova Crockford base32
// (0–9, A–Z bez I L O U), čita se bez obzira na veličinu slova. Statični segment od točno
// 6 znakova NA MJESTU GDJE MOŽE STAJATI ID (prvi segment iza /{lang}/ i prvi segment rute bez
// jezika) ne smije biti valjan ID, inače se sudara s /{lang}/{id} ili /{id}. Dublji segmenti
// (manage, stream, drafts, events) ne mogu se sudariti i izuzeti su (odluka 401).
const JAVNI_ID = /^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{6}$/i;
const JEZICI = new Set(["hr", "en"]);

/** Segment na mjestu ID-a: prvi iza /{lang}/, inače prvi. `null` ako je dinamičan ili ne postoji. */
function segmentNaMjestuId(put: string): string | null {
  const s = put.split("/").filter(Boolean);
  const seg = JEZICI.has(s[0] ?? "") ? s[1] : s[0];
  return seg && !seg.startsWith("{") ? seg : null;
}

/** Putevi čiji se statični segment na mjestu ID-a može pročitati kao javni ID. */
function sudariSIdom(putevi: readonly string[]): string[] {
  return putevi.filter((p) => {
    const seg = segmentNaMjestuId(p);
    return seg !== null && JAVNI_ID.test(seg);
  });
}

const PUTEVI = [
  "/hr",
  "/en",
  ...RUTE.flatMap((r) => [`/hr/${r.hr}`, `/en/${r.en}`]),
  ...RUTE_BEZ_JEZIKA.map((r) => `/${r.put}`),
];

describe("odluke 302 i 401: statični segment na mjestu ID-a nije javni ID", () => {
  const naMjestuId = PUTEVI.map(segmentNaMjestuId).filter((s): s is string => s !== null);
  const sest = [...new Set(naMjestuId.filter((s) => s.length === 6))];

  it("tablica ima segmente od 6 znakova na mjestu ID-a (test nije prazan)", () => {
    expect(sest.length).toBeGreaterThan(0);
  });

  it("nijedna ruta iz tablice se ne sudara s ID-om", () => {
    expect(sudariSIdom(PUTEVI)).toEqual([]);
  });

  it.each(sest)("„%s” sadrži i/l/o/u ili crticu", (seg) => {
    expect(JAVNI_ID.test(seg)).toBe(false);
  });

  it("pravi sudar se hvata: izmišljena /en/safety (preimenovana u /en/security)", () => {
    expect(sudariSIdom(["/en/safety", "/safety"])).toEqual(["/en/safety", "/safety"]);
    expect(sudariSIdom(["/en/security"])).toEqual([]);
  });

  it("dublji segmenti su izuzeti (manage, stream)", () => {
    expect(sudariSIdom(["/en/{id}/manage", "/embed/{id}/stream"])).toEqual([]);
    expect(PUTEVI).toContain("/embed/{id}/stream");
  });
});

describe("tablica ruta", () => {
  it("ključevi su jedinstveni", () => {
    const k = [...RUTE.map((r) => r.kljuc), ...RUTE_BEZ_JEZIKA.map((r) => r.kljuc)];
    expect(new Set(k).size).toBe(k.length);
  });

  it("hr i en imaju iste dinamičke parametre", () => {
    for (const r of RUTE) {
      const p = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
      expect(p(r.en), r.kljuc).toEqual(p(r.hr));
    }
  });

  it("url i prevediPut", () => {
    expect(url("hr", "home")).toBe("/hr");
    expect(url("en", "campaigns")).toBe("/en/campaigns");
    expect(url("hr", "campaign.support", { id: "7k3m9q" })).toBe("/hr/7k3m9q/podrzi");
    expect(prevediPut("/hr/kampanje?category=sport", "en")).toBe("/en/campaigns?category=sport");
    expect(prevediPut("/en/7k3m9q/support", "hr")).toBe("/hr/7k3m9q/podrzi");
    expect(prevediPut("/hr/o/udruga-x/clanovi", "en")).toBe("/en/o/udruga-x/members");
    expect(prevediPut("/hr", "en")).toBe("/en");
    expect(prevediPut("/hr/nepostojece/x/y", "en")).toBe("/en");
  });
});
