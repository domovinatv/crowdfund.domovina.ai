/**
 * Unos koda prijave `/hr/prijava/kod` (J): kod iz kolačića `prijava`, najviše 5 pokušaja, 5 minuta;
 * uspjeh → sesija (kolačić `sesija`) i 303 na `next` (samo relativni put). Bez poslanog koda 200 s uputom.
 */
import { ucitajUnosKoda, type PodaciUnosaKoda } from "../../components/prijava/ucitavanje";
import type { Ucitaj } from "../tipovi";

export const ucitaj: Ucitaj<PodaciUnosaKoda> = (ctx) => ucitajUnosKoda(ctx, "login", "sign-in.code");
