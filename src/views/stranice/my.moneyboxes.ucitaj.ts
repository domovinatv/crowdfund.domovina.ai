/**
 * Moje kasice `/hr/moje/kasice` (P, V; obilazak 08 i 24): skupine `?status=active|disabled|deleted` s brojačima.
 * POST `akcija=iskljuci|ukljuci` + `alias`: samo vlasnik, obrisana se ne vraća. Uspjeh 303 s `?ok=`.
 */
import { poljaObrasca, preusmjeri303 } from "../../components/moje/ucitavanje";
import { STATUSI_KASICE, isStatusKasice, mojeKasice, postaviKasicu, type MojaKasica, type StatusKasice } from "../../lib/db/moje";
import { zahtijevajPrijavu } from "../../lib/pristup";
import { url } from "../../lib/rute";
import type { Ucitaj } from "../tipovi";

export interface PodaciMojihKasica {
  kasice: MojaKasica[];
  status: StatusKasice;
  brojevi: Record<StatusKasice, number>;
  poruka: "iskljucena" | "ukljucena" | null;
  greska: boolean;
}

export const ucitaj: Ucitaj<PodaciMojihKasica> = async (ctx) => {
  const k = zahtijevajPrijavu(ctx);
  if (k instanceof Response) return k;
  let greska = false;
  if (ctx.request.method === "POST") {
    const f = await poljaObrasca(ctx.request);
    if ((f.akcija === "iskljuci" || f.akcija === "ukljuci") && (await postaviKasicu(ctx.db, k.id, f.alias ?? "", f.akcija === "ukljuci"))) {
      const status = f.akcija === "ukljuci" ? "active" : "disabled";
      return preusmjeri303(`${url(ctx.lang, "my.moneyboxes")}?status=${status}&ok=${f.akcija === "ukljuci" ? "ukljucena" : "iskljucena"}`);
    }
    greska = true;
  }
  const q = ctx.url.searchParams;
  const status: StatusKasice = isStatusKasice(q.get("status")) ? (q.get("status") as StatusKasice) : "active";
  const sve = await mojeKasice(ctx.db, k.id);
  const brojevi = Object.fromEntries(STATUSI_KASICE.map((s) => [s, sve.filter((x) => x.status === s).length])) as Record<StatusKasice, number>;
  const ok = q.get("ok");
  return {
    podaci: {
      kasice: sve.filter((x) => x.status === status),
      status,
      brojevi,
      poruka: ok === "iskljucena" || ok === "ukljucena" ? ok : null,
      greska,
    },
  };
};
