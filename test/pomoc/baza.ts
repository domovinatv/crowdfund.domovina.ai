/**
 * SQLite za testove: `node:sqlite` (Node ≥ 22.5, bez dodatne ovisnosti), FK uključeni kao u D1.
 * `kaoD1()` je mali shim D1 sučelja (`prepare().bind().all()/first()/run()`) za upite iz src/lib/db.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { fileURLToPath } from "node:url";

export const ROOT = fileURLToPath(new URL("../..", import.meta.url));
export const MIGRACIJE = join(ROOT, "migrations");
export const SEED = join(ROOT, "seed", "demo.sql");
export const PRIMJERI = join(ROOT, "seed", "primjeri.json");

/** „Sad” s kojim je generiran seed/demo.sql (`DEMO_SAD`, odluka 532): početak tog UTC dana. */
export const DEMO_SAD: string = (JSON.parse(readFileSync(PRIMJERI, "utf8")) as { demoSad: string }).demoSad;
export const SAD_SEEDA = new Date(`${DEMO_SAD}T00:00:00Z`);

export function migracije(): { datoteka: string; sql: string }[] {
  return readdirSync(MIGRACIJE)
    .filter((f) => /^\d{4}_.*\.sql$/.test(f))
    .sort()
    .map((datoteka) => ({ datoteka, sql: readFileSync(join(MIGRACIJE, datoteka), "utf8") }));
}

/** Prazna baza s migracijama, opcionalno i seedom. */
export function novaBaza({ seed = false } = {}): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");
  for (const m of migracije()) db.exec(m.sql);
  if (seed) db.exec(readFileSync(SEED, "utf8"));
  return db;
}

export function redovi<T>(db: DatabaseSync, sql: string, ...p: SQLInputValue[]): T[] {
  return db.prepare(sql).all(...p) as T[];
}

export function broj(db: DatabaseSync, sql: string, ...p: SQLInputValue[]): number {
  const r = db.prepare(sql).get(...p) as Record<string, number> | undefined;
  return Number(Object.values(r ?? {})[0]);
}

/** Shim D1Database nad node:sqlite; samo ono što koriste upiti iz src/lib/db. */
export function kaoD1(db: DatabaseSync): D1Database {
  const izjava = (sql: string, p: SQLInputValue[] = []) => ({
    bind: (...v: unknown[]) => izjava(sql, v as SQLInputValue[]),
    all: async () => ({ results: db.prepare(sql).all(...p).map((r) => ({ ...r })), success: true, meta: {} }),
    first: async () => {
      const r = db.prepare(sql).get(...p);
      return r ? { ...r } : null;
    },
    run: async () => ({ results: [], success: true, meta: db.prepare(sql).run(...p) }),
    /** Sinkrono izvođenje za `batch` (SELECT vraća retke, ostalo `changes`). */
    izvedi: () =>
      /^\s*(SELECT|WITH)\b/i.test(sql) || /\bRETURNING\b/i.test(sql)
        ? { results: db.prepare(sql).all(...p).map((r) => ({ ...r })), success: true, meta: {} }
        : { results: [], success: true, meta: db.prepare(sql).run(...p) },
  });
  type Izjava = ReturnType<typeof izjava>;
  // D1 `batch` je transakcija: sve ili ništa, izjave serijski (S7, src/lib/db/uplate.ts).
  const batch = async (izjave: Izjava[]) => {
    db.exec("BEGIN");
    try {
      const rez = izjave.map((i) => i.izvedi());
      db.exec("COMMIT");
      return rez;
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  };
  return { prepare: (sql: string) => izjava(sql), batch } as unknown as D1Database;
}
