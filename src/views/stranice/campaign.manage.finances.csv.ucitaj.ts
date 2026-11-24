/**
 * CSV financija `/hr/{id}/upravljanje/financije.csv` (U:viewer): samo učitavač, bez pogleda (dispečer vraća
 * njegov `Response`). UTF-8 s BOM-om za Excel, `Content-Disposition: attachment`, ispravan escape (RFC 4180
 * i zaštita od formula). `?state=` kao na stranici financija.
 */
import { ucitajUpravljanje } from "../../components/upravljanje/ucitavanje";
import { csvFinancija, financijeKampanje } from "../../lib/db/financije";
import { UPRAVLJANJE } from "../sadrzaj/upravljanje";
import type { Ucitaj } from "../tipovi";
import { filtarIz } from "./campaign.manage.finances.ucitaj";

export const ucitaj: Ucitaj = async (ctx) => {
  const u = await ucitajUpravljanje(ctx, "campaign.manage.finances.csv");
  if (u instanceof Response) return u;
  const filtar = filtarIz(ctx.url.searchParams.get("state"));
  const redovi = await financijeKampanje(ctx.db, u.k.id, filtar);
  const tijelo = csvFinancija(redovi, UPRAVLJANJE[ctx.lang].financije.csv, u.k.currency);
  const datum = new Date().toISOString().slice(0, 10);
  const ime = `${ctx.lang === "hr" ? "financije" : "finances"}-${u.k.publicId}-${datum}.csv`;
  return new Response(tijelo, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${ime}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
};
