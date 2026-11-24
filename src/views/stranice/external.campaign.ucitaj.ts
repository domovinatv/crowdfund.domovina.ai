/** Vanjska kampanja `/hr/vanjska/{id}` (tok 9): nema je, nije `active` ili organizacija nije aktivna → 404. */
import { vanjskaKampanja, type VanjskaKampanja } from "../../lib/db/profili";
import { nijePronadeno, type Ucitaj } from "../tipovi";

export const ucitaj: Ucitaj<VanjskaKampanja> = async ({ params, db }) => {
  const v = await vanjskaKampanja(db, params.id ?? "");
  return v ? { podaci: v } : nijePronadeno();
};
