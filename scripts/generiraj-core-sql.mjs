#!/usr/bin/env node
// Generira migrations/0001_core.sql iz `contract` exporta @domovina/campaign-core
// (odluka 200: J2 migracije u campaign-coreu ne postoje, pa ih platforma izvodi iz opisa).
//
// Pravila preslikavanja (docs/09-d1-shema.md, konvencije campaign-corea):
//  - samo CORE_TABLES (15), redom iz paketa; vertikale se ne stvaraju;
//  - tip stupca doslovno iz `sql`, `NOT NULL` kad `nullable` nije true, nijedan DEFAULT;
//  - `values` → CHECK (x IN (…)), `bool` → CHECK (x IN (0, 1)), `json` → CHECK (json_valid(x));
//  - `ref` → REFERENCES tablica(stupac); `primaryKey` → PRIMARY KEY (…) na kraju tablice;
//  - `unique` bez `where` → UNIQUE (…) u tablici, s `where` → CREATE UNIQUE INDEX … WHERE.
//
// Upotreba: npm run db:gen-core   (piše datoteku)
//           node scripts/generiraj-core-sql.mjs --stdout
// Test (agent B) uvozi coreSql() i uspoređuje s datotekom.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { contract } from "@domovina/campaign-core";

/** @param {readonly string[]} values */
const sqlList = (values) => values.map((v) => `'${v.replaceAll("'", "''")}'`).join(", ");

/**
 * @param {string} name
 * @param {import("@domovina/campaign-core").Column} col
 */
function columnSql(name, col) {
  const parts = [name, col.sql];
  if (!col.nullable) parts.push("NOT NULL");
  if (col.values) parts.push(`CHECK (${name} IN (${sqlList(col.values)}))`);
  if (col.bool) parts.push(`CHECK (${name} IN (0, 1))`);
  if (col.json) parts.push(`CHECK (json_valid(${name}))`);
  if (col.ref) {
    const [table, column] = col.ref.split(".");
    parts.push(`REFERENCES ${table}(${column})`);
  }
  return parts.join(" ");
}

/** @param {import("@domovina/campaign-core").TableSpec<any>} t */
function tableSql(t) {
  /** @type {string[]} */
  const lines = Object.entries(t.columns).map(([name, col]) => columnSql(name, col));
  lines.push(`PRIMARY KEY (${t.primaryKey.join(", ")})`);
  const indexes = [];
  for (const u of t.unique ?? []) {
    if (u.where) {
      indexes.push(
        `CREATE UNIQUE INDEX ${t.name}_${u.columns.join("_")}_uq ON ${t.name} (${u.columns.join(", ")}) WHERE ${u.where};`,
      );
    } else {
      lines.push(`UNIQUE (${u.columns.join(", ")})`);
    }
  }
  const create = `CREATE TABLE ${t.name} (\n  ${lines.join(",\n  ")}\n);`;
  return [create, ...indexes].join("\n");
}

/** Cijeli sadržaj 0001_core.sql za dani `contract` (deterministički, bez datuma). */
export function coreSql(c = contract) {
  const header = [
    "-- GENERIRANO: ne uređivati ručno.",
    "-- Izvor: @domovina/campaign-core `contract.CORE_TABLES` (odluka 200).",
    "-- Obnova: npm run db:gen-core",
    "",
  ].join("\n");
  return header + c.CORE_TABLES.map(tableSql).join("\n\n") + "\n";
}

export const CORE_SQL_PATH = fileURLToPath(new URL("../migrations/0001_core.sql", import.meta.url));

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const sql = coreSql();
  if (process.argv.includes("--stdout")) process.stdout.write(sql);
  else {
    writeFileSync(CORE_SQL_PATH, sql);
    console.log(`Zapisano ${CORE_SQL_PATH} (${contract.CORE_TABLES.length} tablica)`);
  }
}
