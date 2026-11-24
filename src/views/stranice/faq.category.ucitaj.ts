/** Kategorija čestih pitanja: nepoznat ključ → 404 (odluka 502: ključ engleski u oba jezika). */
import { isKategorijaFaq, type KategorijaFaq } from "../sadrzaj/faq";
import { nijePronadeno, type Ucitaj } from "../tipovi";

export const ucitaj: Ucitaj<{ kategorija: KategorijaFaq }> = async ({ params }) =>
  isKategorijaFaq(params.category) ? { podaci: { kategorija: params.category } } : nijePronadeno();
