/**
 * DSA prijava sadržaja `/hr/prijavi-sadrzaj` (J*, tok 8): `?target=&id=` predpopunjava cilj.
 * POST → izjava u dobroj vjeri (provjera ovdje) + `spremiPrijavu` → 303 `?poslano=1` (PRG);
 * greške → 200 s porukama uz polje (odluka 515). Privitak (≤ 20 MB) traži R2 i dolazi poslije.
 */
import { CILJEVI_PRIJAVE, spremiPrijavu, type GreskaPrijave } from "../../lib/db/prijave";
import { url } from "../../lib/rute";
import type { PoljeObrasca } from "../sadrzaj/prijava-sadrzaja";
import type { Ucitaj } from "../tipovi";

export interface VrijednostiPrijave {
  targetType: string;
  targetId: string;
  reason: string;
  description: string;
  email: string;
  phone: string;
  izjava: boolean;
  privola: boolean;
}

export interface PodaciPrijave {
  poslano: boolean;
  greske: Partial<Record<PoljeObrasca, GreskaPrijave>>;
  vrijednosti: VrijednostiPrijave;
}

const niz = (x: FormDataEntryValue | null) => (typeof x === "string" ? x : "");

export const ucitaj: Ucitaj<PodaciPrijave> = async ({ lang, url: adresa, request, db }) => {
  if (request.method === "POST") {
    const f = await request.formData();
    const v: VrijednostiPrijave = {
      targetType: niz(f.get("target")),
      targetId: niz(f.get("id")),
      reason: niz(f.get("reason")),
      description: niz(f.get("description")),
      email: niz(f.get("email")),
      phone: niz(f.get("phone")),
      izjava: f.get("izjava") === "1",
      privola: f.get("privola") === "1",
    };
    // Izjava u dobroj vjeri nije dio `spremiPrijavu`: bez nje se zove s `privola: false`, što samo validira
    // (funkcija ne piše ništa dok ima ijedne greške), pa korisnik vidi sve greške odjednom.
    const r = await spremiPrijavu(db, { ...v, phone: v.phone || null, privola: v.privola && v.izjava });
    if (r.ok) return new Response(null, { status: 303, headers: { Location: `${url(lang, "report")}?poslano=1` } });
    const greske: PodaciPrijave["greske"] = { ...r.greske };
    if (!v.izjava) {
      greske.izjava = "obavezno";
      if (v.privola) delete greske.privola;
    }
    return { podaci: { poslano: false, greske, vrijednosti: v } };
  }
  const q = adresa.searchParams;
  const target = q.get("target") ?? "";
  return {
    podaci: {
      poslano: q.get("poslano") === "1",
      greske: {},
      vrijednosti: {
        targetType: (CILJEVI_PRIJAVE as readonly string[]).includes(target) ? target : "",
        targetId: (q.get("id") ?? "").slice(0, 64),
        reason: "",
        description: "",
        email: "",
        phone: "",
        izjava: false,
        privola: false,
      },
    },
  };
};
