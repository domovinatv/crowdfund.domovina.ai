/** Čarobnjak, korak "type" (J, docs/07; zajednički učitavač components/carobnjak/ucitavanje.ts). */
import { ucitajKorak, type PodaciKoraka } from "../../components/carobnjak/ucitavanje";
import type { Ucitaj } from "../tipovi";

export const ucitaj: Ucitaj<PodaciKoraka> = (ctx) => ucitajKorak(ctx, "type");
