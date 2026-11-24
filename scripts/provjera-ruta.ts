/**
 * Provjera ruta S5 i S6 nad pokrenutim serverom (odluka 503):
 *   npm run db:seed:local && npx astro build && npx wrangler dev --port 8798   # u drugom terminalu
 *   node scripts/provjera-ruta.ts [http://localhost:8798]
 * P/K/U/A rute provjeravaju se dvaput: bez sesije (302 na prijavu) i s demo sesijom iz seed/primjeri.json.
 * Ispis: status po provjeri; „nema pogleda” je zasebna kategorija (ruta je u tablici, a stranice još nema)
 * i ne ruši izlaz; izostavljene rute s razlogom; zbroj. Izlaz 1 samo ako ijedna provjera s pogledom ne odgovara.
 */
import { IZNIMKE, IZOSTAVLJENE, KOLACIC_SESIJE, javneRute, tokenSesije, ucitajPrimjere } from "../e2e/javne-rute.ts";

const baza = process.argv[2] ?? "http://localhost:8798";
const primjeri = ucitajPrimjere();
const rute = javneRute(primjeri);
let lose = 0;
let bezPogleda = 0;
const nemaPogleda = new Set<string>();
for (const r of rute) {
  const headers: Record<string, string> = r.sesija ? { Cookie: `${KOLACIC_SESIJE}=${tokenSesije(primjeri, r.sesija)}` } : {};
  const res = await fetch(baza + r.put, { redirect: "manual", headers });
  const ok = res.status === r.status;
  let oznaka = ok ? "ok  " : "LOŠE";
  if (!ok && !r.pogled) {
    oznaka = "NEMA";
    bezPogleda++;
    if (r.kljuc) nemaPogleda.add(r.kljuc);
  } else if (!ok) lose++;
  const kamo = res.status >= 300 && res.status < 400 ? ` → ${res.headers.get("location")}` : "";
  console.log(`${oznaka} ${res.status} (oček. ${r.status})  ${r.put}${kamo}  [${r.opis}]`);
}
for (const [k, i] of Object.entries(IZNIMKE)) console.log(`iznimka ${k}: ${i.razlog}`);
for (const [k, razlog] of Object.entries(IZOSTAVLJENE)) console.log(`izost.  ${k}: ${razlog}`);
if (nemaPogleda.size) console.log(`\nnema pogleda (${nemaPogleda.size} ruta): ${[...nemaPogleda].join(", ")}`);
console.log(
  `\nprovjera: ${rute.length}, odgovara: ${rute.length - lose - bezPogleda}, ne odgovara: ${lose}, ` +
    `nema pogleda: ${bezPogleda} (${nemaPogleda.size} ruta), izostavljeno: ${Object.keys(IZOSTAVLJENE).length}`,
);
process.exit(lose ? 1 : 0);
