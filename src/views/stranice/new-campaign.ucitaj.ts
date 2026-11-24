/** `/nova-kampanja` (J): 302 na prvi nedovršeni korak nacrta (docs/07, ekran 03). Samo učitavač, bez pogleda. */
import { ucitajUlaz } from "../../components/carobnjak/ucitavanje";
import type { Ucitaj } from "../tipovi";

export const ucitaj: Ucitaj = (ctx) => ucitajUlaz(ctx);
