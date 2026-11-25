/**
 * Vanjska 4fund kampanja (tok 9, odluke 209, 800–802): čista pravila bez baze. Oblik URL-a, `external_id`,
 * adresa plaćanja i provjera polja koja organizator unosi ručno (naslov, kratki opis, kategorija).
 */

/** Najdulji naslov (`external_campaigns.title` CHECK) i kratki opis (migracija 0008). */
export const NASLOV_VANJSKE_NAJVISE = 120;
export const OPIS_VANJSKE_NAJVISE = 300;

/** `external_id` 4fund kampanje: 6 znakova [a-z0-9] (spremamo mala slova). */
export const idVanjskeIspravan = (id: string): boolean => /^[a-z0-9]{6}$/.test(id);

/** URL 4fund kampanje: `https://4fund.com/{6 znakova}` (s `www.` ili bez, s kosom crtom na kraju ili bez). */
export function idVanjske(u: string): string | null {
  const m = u.trim().match(/^https:\/\/(?:www\.)?4fund\.com\/([a-zA-Z0-9]{6})\/?$/);
  return m ? m[1]!.toLowerCase() : null;
}

/** Kanonski URL kampanje (spremljen u `external_campaigns.url`). */
export const urlVanjske = (externalId: string): string => `https://4fund.com/${externalId}`;

/**
 * Gumb „Podrži na 4fundu” (odluka 801): sastavlja se iz provjerenog `external_id`, nikad iz spremljenog URL-a.
 * Neispravan ID → null (gumb se ne prikazuje).
 */
export function placanjeVanjske(externalId: string): string | null {
  const id = externalId.trim().toLowerCase();
  return idVanjskeIspravan(id) ? `https://4fund.com/${id}/pay` : null;
}

export type PoljeVanjske = "url" | "naslov" | "opis" | "kategorija";
export type GreskeVanjske = Partial<Record<PoljeVanjske, string>>;

export interface UlazVanjske {
  naslov: string;
  opis: string;
  kategorija: string;
}

/** Duljina u znakovima (ne UTF-16 jedinicama), kao brojač u pregledniku. */
const duljina = (s: string) => [...s].length;

/** Naslov, opis i kategorija (dodavanje i uređivanje). Opis je neobavezan; prazan se sprema kao NULL. */
export function provjeriPodatkeVanjske(u: UlazVanjske, kategorije: readonly string[]): GreskeVanjske {
  const g: GreskeVanjske = {};
  const naslov = u.naslov.trim();
  if (!naslov) g.naslov = "obavezno";
  else if (duljina(naslov) > NASLOV_VANJSKE_NAJVISE) g.naslov = "predugo";
  if (duljina(u.opis.trim()) > OPIS_VANJSKE_NAJVISE) g.opis = "predugo";
  if (u.kategorija && !kategorije.includes(u.kategorija)) g.kategorija = "neispravno";
  return g;
}

/** Dodavanje: uz podatke i URL (oblik, ne postojanje kampanje na 4fundu). */
export function provjeriNovuVanjsku(u: UlazVanjske & { url: string }, kategorije: readonly string[]): GreskeVanjske {
  const g: GreskeVanjske = {};
  if (!u.url.trim()) g.url = "obavezno";
  else if (!idVanjske(u.url)) g.url = "neispravno";
  return { ...g, ...provjeriPodatkeVanjske(u, kategorije) };
}
