import { describe, expect, it } from "vitest";
import { en } from "../src/i18n/en";
import { hr } from "../src/i18n/hr";
import { odaberiJezik } from "../src/i18n";

describe("i18n", () => {
  it("en ima iste ključeve kao hr", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(hr).sort());
  });

  it("nijedan tekst ne kaže „ulaže” / „invest” (podržavatelj doprinosi ili donira)", () => {
    for (const v of [...Object.values(hr), ...Object.values(en)]) {
      expect(v).not.toMatch(/ulag|ulož|ulaž|invest/i);
    }
  });

  it("odaberiJezik: kolačić, pa Accept-Language, zadano hr (odluka 300)", () => {
    expect(odaberiJezik("en", "hr-HR")).toBe("en");
    expect(odaberiJezik(undefined, "de-DE,en;q=0.8,hr;q=0.5")).toBe("en");
    expect(odaberiJezik(undefined, "en;q=0.4, hr-HR")).toBe("hr");
    expect(odaberiJezik("xx", "de")).toBe("hr");
    expect(odaberiJezik(undefined, null)).toBe("hr");
  });
});
