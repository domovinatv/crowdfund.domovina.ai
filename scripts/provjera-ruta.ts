/**
 * Provjera javnih ruta S5 nad pokrenutim serverom (odluka 503):
 *   npx astro build && npx wrangler dev --port 8798   # u drugom terminalu
 *   node scripts/provjera-ruta.ts [http://localhost:8798]
 * Ispis: status po ruti, izostavljene rute s razlogom, zbroj; izlaz 1 ako ijedna ne odgovara.
 */
import { IZOSTAVLJENE, javneRute, ucitajPrimjere } from "../e2e/javne-rute.ts";

const baza = process.argv[2] ?? "http://localhost:8798";
const rute = javneRute(ucitajPrimjere());
let lose = 0;
for (const r of rute) {
  const res = await fetch(baza + r.put, { redirect: "manual" });
  const ok = res.status === r.status;
  if (!ok) lose++;
  console.log(`${ok ? "ok  " : "LOŠE"} ${res.status} (oček. ${r.status})  ${r.put}  [${r.opis}]`);
}
for (const [k, razlog] of Object.entries(IZOSTAVLJENE)) console.log(`izost.  ${k}: ${razlog}`);
console.log(`\nruta: ${rute.length}, odgovara: ${rute.length - lose}, ne odgovara: ${lose}, izostavljeno: ${Object.keys(IZOSTAVLJENE).length}`);
process.exit(lose ? 1 : 0);
