/**
 * Video kampanje (S11): iz URL-a koji je organizator upisao (`campaign_media.video_url`) izvlači se samo
 * izvor i strogo provjeren ID. Sve ostalo (URL korisnika, parametri, drugi hostovi) se odbacuje, a
 * poveznice za ugradnju i izvorni video grade se iz ID-a. Bez mreže, bez dohvaćanja thumbnaila.
 *
 * Dopušteno:
 *  - YouTube: `youtube.com/watch?v=ID`, `youtu.be/ID`, `youtube.com/shorts/ID`, `youtube.com/embed/ID`
 *    (hostovi `youtube.com`, `www.`, `m.`), ID točno 11 znakova `[A-Za-z0-9_-]`
 *  - Vimeo: `vimeo.com/BROJ` (i `www.`), ID 1–12 znamenki
 * Ugradnja: `www.youtube-nocookie.com/embed/ID` i `player.vimeo.com/video/ID?dnt=1`.
 */

export type IzvorVidea = "youtube" | "vimeo";

export interface Video {
  izvor: IzvorVidea;
  id: string;
  /** Adresa iframea (učitava se tek na klik). */
  ugradnja: string;
  /** Kanonska adresa videa kod izvora (poveznica bez JS-a). */
  izvorni: string;
}

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^[0-9]{1,12}$/;
const YOUTUBE_HOST = new Set(["youtube.com", "www.youtube.com", "m.youtube.com"]);
const VIMEO_HOST = new Set(["vimeo.com", "www.vimeo.com"]);

/** Najdulji URL koji se uopće razmatra (isto ograničenje kao obrazac). */
export const NAJDULJI_URL = 500;

function youtube(id: string): Video {
  return {
    izvor: "youtube",
    id,
    ugradnja: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1`,
    izvorni: `https://www.youtube.com/watch?v=${id}`,
  };
}

function vimeo(id: string): Video {
  return {
    izvor: "vimeo",
    id,
    ugradnja: `https://player.vimeo.com/video/${id}?dnt=1&autoplay=1`,
    izvorni: `https://vimeo.com/${id}`,
  };
}

/** Segmenti puta bez praznih (`/shorts/ID/` → `["shorts", "ID"]`). */
const segmenti = (put: string): string[] => put.split("/").filter(Boolean);

/** URL organizatora → video ili `null` (nije podržan, neispravan ID, nije https, predug). */
export function parsirajVideo(ulaz: string | null | undefined): Video | null {
  const s = (ulaz ?? "").trim();
  if (!s || s.length > NAJDULJI_URL) return null;
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" || u.username || u.password || u.port) return null;
  const host = u.hostname.toLowerCase();
  const dijelovi = segmenti(u.pathname);

  if (YOUTUBE_HOST.has(host)) {
    let id: string | null = null;
    if (dijelovi.length === 1 && dijelovi[0] === "watch") id = u.searchParams.get("v");
    else if (dijelovi.length === 2 && (dijelovi[0] === "shorts" || dijelovi[0] === "embed")) id = dijelovi[1]!;
    return id !== null && YOUTUBE_ID.test(id) ? youtube(id) : null;
  }
  if (host === "youtu.be") {
    return dijelovi.length === 1 && YOUTUBE_ID.test(dijelovi[0]!) ? youtube(dijelovi[0]!) : null;
  }
  if (VIMEO_HOST.has(host)) {
    return dijelovi.length === 1 && VIMEO_ID.test(dijelovi[0]!) ? vimeo(dijelovi[0]!) : null;
  }
  return null;
}
