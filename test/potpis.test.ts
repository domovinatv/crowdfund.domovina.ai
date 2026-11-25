/**
 * Potpis MPT webhooka (S7, odluka 706): Standard Webhooks kao rail `outbox.ts` `signedPost`.
 */
import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { TOLERANCIJA_S, kljucTajne, potpisanaZaglavlja, potpisi, provjeriPotpis } from "../src/lib/mpt/potpis";
import { TAJNA_TESTA } from "./pomoc/mpt-dvojnik";

const SAD = Date.UTC(2026, 10, 25, 12);
const TIJELO = JSON.stringify({ type: "intent.paid", sid: "abcdef123456" });

async function zaglavlja(x: Partial<Record<string, string>> = {}, tajna = TAJNA_TESTA, sad = SAD): Promise<Headers> {
  const z = await potpisanaZaglavlja(tajna, "int_abcdef123456", TIJELO, sad);
  return new Headers({ ...z, ...x } as Record<string, string>);
}

describe("potpisi()", () => {
  it("isti algoritam kao rail: base64 HMAC-SHA256 nad `id.timestamp.tijelo`, ključ = base64 iza whsec_", async () => {
    const kljuc = Buffer.from(TAJNA_TESTA.slice("whsec_".length), "base64");
    const ocekivano = createHmac("sha256", kljuc).update(`int_x.1700000000.${TIJELO}`).digest("base64");
    expect(await potpisi(TAJNA_TESTA, "int_x", 1700000000, TIJELO)).toBe(`v1,${ocekivano}`);
  });
  it("neispravna tajna baca, `kljucTajne` vraća null", async () => {
    expect(kljucTajne("")).toBeNull();
    expect(kljucTajne("whsec_%%%")).toBeNull();
    await expect(potpisi("whsec_", "a", 1, "x")).rejects.toThrow();
  });
});

describe("provjeriPotpis()", () => {
  it("ispravan potpis prolazi", async () => {
    const r = await provjeriPotpis(TAJNA_TESTA, await zaglavlja(), TIJELO, SAD);
    expect(r).toEqual({ ok: true, id: "int_abcdef123456", timestamp: Math.floor(SAD / 1000) });
  });

  it("kriva tajna, izmijenjeno tijelo ili drugi id: odbijeno (potpis)", async () => {
    const druga = `whsec_${btoa("neka-sasvim-druga-tajna-32-bajta")}`;
    expect(await provjeriPotpis(druga, await zaglavlja(), TIJELO, SAD)).toEqual({ ok: false, razlog: "potpis" });
    expect(await provjeriPotpis(TAJNA_TESTA, await zaglavlja(), TIJELO + " ", SAD)).toEqual({ ok: false, razlog: "potpis" });
    expect(await provjeriPotpis(TAJNA_TESTA, await zaglavlja({ "webhook-id": "int_drugi" }), TIJELO, SAD)).toEqual({ ok: false, razlog: "potpis" });
  });

  it("timestamp izvan 5 min (prošlost i budućnost): odbijeno (vrijeme); rub prolazi", async () => {
    const z = await zaglavlja();
    expect((await provjeriPotpis(TAJNA_TESTA, z, TIJELO, SAD + (TOLERANCIJA_S + 1) * 1000)).ok).toBe(false);
    expect(await provjeriPotpis(TAJNA_TESTA, z, TIJELO, SAD + (TOLERANCIJA_S + 1) * 1000)).toEqual({ ok: false, razlog: "vrijeme" });
    expect(await provjeriPotpis(TAJNA_TESTA, z, TIJELO, SAD - (TOLERANCIJA_S + 1) * 1000)).toEqual({ ok: false, razlog: "vrijeme" });
    expect((await provjeriPotpis(TAJNA_TESTA, z, TIJELO, SAD + TOLERANCIJA_S * 1000)).ok).toBe(true);
  });

  it("više potpisa razmaknutih razmakom: dovoljan je jedan ispravan v1; druge verzije se preskaču", async () => {
    const pravi = (await zaglavlja()).get("webhook-signature")!;
    const krivi = `v1,${btoa("x".repeat(32))}`;
    for (const vise of [`${krivi} ${pravi}`, `v1a,${pravi.slice(3)} ${pravi}`, `v1,nije-base64 ${pravi}`]) {
      expect((await provjeriPotpis(TAJNA_TESTA, await zaglavlja({ "webhook-signature": vise }), TIJELO, SAD)).ok, vise).toBe(true);
    }
    expect((await provjeriPotpis(TAJNA_TESTA, await zaglavlja({ "webhook-signature": `${krivi} v1a,${pravi.slice(3)}` }), TIJELO, SAD)).ok).toBe(false);
  });

  it("bez zaglavlja, nebrojčani timestamp ili bez tajne", async () => {
    expect(await provjeriPotpis(TAJNA_TESTA, new Headers(), TIJELO, SAD)).toEqual({ ok: false, razlog: "zaglavlja" });
    expect(await provjeriPotpis(TAJNA_TESTA, await zaglavlja({ "webhook-timestamp": "12a" }), TIJELO, SAD)).toEqual({ ok: false, razlog: "zaglavlja" });
    expect(await provjeriPotpis("", await zaglavlja(), TIJELO, SAD)).toEqual({ ok: false, razlog: "tajna" });
  });
});
