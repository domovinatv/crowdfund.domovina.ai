/**
 * Opis kampanje: vlastiti, mali i siguran Markdown podskup (S10, paritet A06). Alatna traka
 * (`components/opis/AlatnaTraka.astro`) ubacuje isti podskup u `textarea`; ovdje se pretvara u HTML.
 *
 * Redoslijed je bitan za sigurnost: najprije se escapea CIJELI tekst (nijedan znak korisnika ne ostaje
 * kao HTML), tek onda se iz escapeanog teksta grade naše oznake. Podskup:
 *  - `**podebljano**`, `*kurziv*`
 *  - `[tekst](https://…)` samo sa shemom http(s); `rel="nofollow ugc noopener"`
 *  - retci `- stavka` → popis s grotičicama
 *  - redak `## Naslov` → `<h3>` (pod naslovom sekcije `<h2>` na stranici kampanje)
 *  - prazan redak dijeli odlomke, jedan prijelom unutar odlomka → `<br>`
 * Slike, video, poravnanje, sirovi HTML i ostale sheme poveznica ne postoje (ostaju običan tekst).
 */

const ESCAPE: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export const escapeHtml = (s: string): string => s.replace(/[&<>"']/g, (z) => ESCAPE[z]!);

/** Poveznica nad escapeanim tekstom: URL bez razmaka i zagrada, shema samo http(s). */
const POVEZNICA = /\[([^\]\n]+)\]\((https?:\/\/[^\s()<>]+)\)/g;
/** Sadržaj ne smije imati `*` ni `<`: oznake se ne mogu križati, HTML ostaje dobro ugniježđen. */
const PODEBLJANO = /\*\*([^*<\n]+?)\*\*/g;
const KURZIV = /\*([^*<\n]+?)\*/g;

export const REL_POVEZNICE = "nofollow ugc noopener";

function naglasci(s: string): string {
  return s.replace(PODEBLJANO, "<strong>$1</strong>").replace(KURZIV, "<em>$1</em>");
}

/** Jedan redak (već escapean): poveznice, pa naglasci samo izvan URL-a. */
function redak(esc: string): string {
  let out = "";
  let zadnji = 0;
  for (const m of esc.matchAll(POVEZNICA)) {
    out += naglasci(esc.slice(zadnji, m.index));
    out += `<a href="${m[2]}" rel="${REL_POVEZNICE}">${naglasci(m[1]!)}</a>`;
    zadnji = m.index! + m[0].length;
  }
  return out + naglasci(esc.slice(zadnji));
}

const STAVKA = /^\s*-\s+(.*)$/;
const NASLOV = /^\s*##\s+(.*)$/;

/** Markdown podskup → HTML. Ulaz je nepouzdan (tekst organizatora); izlaz ide u `set:html`. */
export function renderirajOpis(tekst: string): string {
  const retci = escapeHtml(tekst.replace(/\r\n?/g, "\n")).split("\n");
  const out: string[] = [];
  let odlomak: string[] = [];
  let popis: string[] = [];
  const zatvoriOdlomak = () => {
    if (odlomak.length) out.push(`<p>${odlomak.map(redak).join("<br>")}</p>`);
    odlomak = [];
  };
  const zatvoriPopis = () => {
    if (popis.length) out.push(`<ul>${popis.map((s) => `<li>${redak(s)}</li>`).join("")}</ul>`);
    popis = [];
  };
  for (const r of retci) {
    const stavka = STAVKA.exec(r);
    const naslov = NASLOV.exec(r);
    if (!r.trim()) {
      zatvoriOdlomak();
      zatvoriPopis();
    } else if (naslov && naslov[1]!.trim()) {
      zatvoriOdlomak();
      zatvoriPopis();
      out.push(`<h3>${redak(naslov[1]!.trim())}</h3>`);
    } else if (stavka && stavka[1]!.trim()) {
      zatvoriOdlomak();
      popis.push(stavka[1]!.trim());
    } else {
      zatvoriPopis();
      odlomak.push(r.trim());
    }
  }
  zatvoriOdlomak();
  zatvoriPopis();
  return out.join("\n");
}

/** Opis bez oznaka (meta opis, isječci): `[tekst](url)` → tekst, bez `**`, `*`, `## `, `- `. */
export function obicniTekstOpisa(tekst: string): string {
  return tekst
    .replace(/\r\n?/g, "\n")
    .replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s()<>]+)\)/g, "$1")
    .replace(/\*\*([^*\n]+?)\*\*/g, "$1")
    .replace(/\*([^*\n]+?)\*/g, "$1")
    .replace(/^\s*(##|-)\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Stil renderiranog opisa (Tailwind varijante na omotaču, renderer ne nosi klase). */
export const KLASA_OPISA =
  "max-w-[70ch] break-words text-ink-soft [&_a]:text-action [&_a]:underline [&_a]:underline-offset-2 [&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-ink [&_li]:mt-1 [&_p]:mt-3 [&_strong]:font-semibold [&_strong]:text-ink [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&>:first-child]:mt-0";
