/**
 * Potvrda e-pošte nakon registracije `/hr/registracija/potvrda` (J): „provjerite e-poštu” s demo kodom,
 * unos koda (svrha `email_verify`) i ponovno slanje. Uspjeh → sesija i 303 na `next`
 * (uz `?organizacija=1` na registraciji to je `organisation.new`).
 */
import { ucitajUnosKoda, type PodaciUnosaKoda } from "../../components/prijava/ucitavanje";
import type { Ucitaj } from "../tipovi";

export const ucitaj: Ucitaj<PodaciUnosaKoda> = (ctx) => ucitajUnosKoda(ctx, "email_verify", "sign-up.confirm");
