import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CORE_SQL_PATH, coreSql } from "../scripts/generiraj-core-sql.mjs";

// docs/09: 0001_core.sql se generira iz @domovina/campaign-core; nova verzija paketa ruši test
// dok se migracija ne obnovi (`npm run db:gen-core`).
describe("migrations/0001_core.sql", () => {
  it("jednak je coreSql() iz paketa", () => {
    expect(readFileSync(CORE_SQL_PATH, "utf8")).toBe(coreSql());
  });
});
