/**
 * Renderer opisa (S10, A06): Markdown podskup i XSS. Ulaz je tekst organizatora, izlaz ide u `set:html`.
 */
import { describe, expect, it } from "vitest";
import { KLASA_OPISA, REL_POVEZNICE, escapeHtml, obicniTekstOpisa, renderirajOpis } from "../src/lib/opis";
import { UPRAVLJANJE } from "../src/views/sadrzaj/upravljanje";

describe("renderirajOpis: podskup", () => {
  it("odlomci i prijelomi", () => {
    expect(renderirajOpis("Prvi red\ndrugi red\n\nNovi odlomak")).toBe("<p>Prvi red<br>drugi red</p>\n<p>Novi odlomak</p>");
    expect(renderirajOpis("a\r\n\r\nb")).toBe("<p>a</p>\n<p>b</p>");
    expect(renderirajOpis("")).toBe("");
    expect(renderirajOpis("  \n\n  ")).toBe("");
  });
  it("podebljano i kurziv", () => {
    expect(renderirajOpis("**jako** i *malo*")).toBe("<p><strong>jako</strong> i <em>malo</em></p>");
    expect(renderirajOpis("***oboje***")).toBe("<p>*<strong>oboje</strong>*</p>");
    expect(renderirajOpis("** nedovršeno")).toBe("<p>** nedovršeno</p>");
  });
  it("poveznica http(s) s rel", () => {
    expect(renderirajOpis("Vidi [stranicu](https://primjer.hr/a?b=1&c=2).")).toBe(
      `<p>Vidi <a href="https://primjer.hr/a?b=1&amp;c=2" rel="${REL_POVEZNICE}">stranicu</a>.</p>`,
    );
    expect(renderirajOpis("[**jako**](http://x.hr)")).toBe(`<p><a href="http://x.hr" rel="${REL_POVEZNICE}"><strong>jako</strong></a></p>`);
    // Zvjezdice u URL-u nisu naglasak.
    expect(renderirajOpis("[a](https://x.hr/*b*)")).toBe(`<p><a href="https://x.hr/*b*" rel="${REL_POVEZNICE}">a</a></p>`);
  });
  it("popis i naslov", () => {
    expect(renderirajOpis("## Na što ide novac\n- hrana\n- **lijekovi**\n\nHvala!")).toBe(
      "<h3>Na što ide novac</h3>\n<ul><li>hrana</li><li><strong>lijekovi</strong></li></ul>\n<p>Hvala!</p>",
    );
    expect(renderirajOpis("Uvod\n- a\nkraj")).toBe("<p>Uvod</p>\n<ul><li>a</li></ul>\n<p>kraj</p>");
    expect(renderirajOpis("-5 °C\n##bez razmaka\n# jedan")).toBe("<p>-5 °C<br>##bez razmaka<br># jedan</p>");
  });
  it("slike i ostale oznake ostaju tekst", () => {
    expect(renderirajOpis("![slika](https://x.hr/a.png)")).toBe(`<p>!<a href="https://x.hr/a.png" rel="${REL_POVEZNICE}">slika</a></p>`);
    expect(renderirajOpis("> citat\n`kod`")).toBe("<p>&gt; citat<br>`kod`</p>");
  });
});

describe("renderirajOpis: XSS", () => {
  const bezSirovogHtmla = (html: string) => {
    // Jedine oznake u izlazu su naše, bez atributa osim href/rel na <a>.
    const oznake = html.match(/<[^>]*>/g) ?? [];
    for (const o of oznake) expect(o).toMatch(/^<\/?(p|br|strong|em|ul|li|h3)>$|^<a href="https?:\/\/[^"<>\s]+" rel="nofollow ugc noopener">$|^<\/a>$/);
  };
  it("script i HTML oznake su escapeane", () => {
    const h = renderirajOpis("<script>alert(1)</script>\n<img src=x onerror=alert(1)>");
    expect(h).toBe("<p>&lt;script&gt;alert(1)&lt;/script&gt;<br>&lt;img src=x onerror=alert(1)&gt;</p>");
    bezSirovogHtmla(h);
  });
  it("javascript:, data: i druge sheme ne postaju poveznica", () => {
    for (const url of ["javascript:alert(1)", "JaVaScRiPt:alert(1)", "data:text/html,<b>x</b>", "vbscript:x", "//evil.hr", "/relativno", "mailto:a@b.hr"]) {
      const h = renderirajOpis(`[klik](${url})`);
      expect(h).not.toContain("<a ");
      bezSirovogHtmla(h);
    }
    expect(renderirajOpis("[x](https://ok.hr\njavascript:alert(1))")).not.toContain("javascript:alert(1)\"");
  });
  it("navodnici i atributi ne izlaze iz href", () => {
    const h = renderirajOpis('[x](https://a.hr/"onmouseover="alert`1`)');
    expect(h).toContain('href="https://a.hr/&quot;onmouseover=&quot;alert`1`"');
    expect(h).not.toMatch(/"\s*onmouseover=/);
    bezSirovogHtmla(h);
    const h2 = renderirajOpis("[x](https://a.hr/'onclick='y')");
    expect(h2).not.toMatch(/'\s*onclick=/);
    bezSirovogHtmla(h2);
  });
  it("oznake u tekstu poveznice i naglasku su escapeane", () => {
    const h = renderirajOpis("[<svg onload=alert(1)>](https://a.hr) **<b>x</b>** *<i>*");
    bezSirovogHtmla(h);
    expect(h).not.toContain("<svg");
    expect(h).not.toContain("<b>");
  });
  it("entiteti se ne dekodiraju u oznake", () => {
    const h = renderirajOpis("&lt;script&gt; &#60;img&#62;");
    expect(h).toBe("<p>&amp;lt;script&amp;gt; &amp;#60;img&amp;#62;</p>");
  });
});

describe("pomoćne funkcije opisa", () => {
  it("escapeHtml", () => expect(escapeHtml(`<a href="x">'&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;"));
  it("obični tekst za meta opis", () => {
    expect(obicniTekstOpisa("## Naslov\n**Jako** i *malo*, [web](https://a.hr).\n- stavka")).toBe("Naslov Jako i malo, web. stavka");
  });
  it("klasa omotača stilizira naše oznake tokenima", () => {
    for (const o of ["[&_a]:text-action", "[&_ul]:list-disc", "[&_h3]:font-semibold"]) expect(KLASA_OPISA).toContain(o);
  });
});

describe("opis kasice (S11): isti renderer", () => {
  it("predložak obrasca ostaje jedan odlomak, u oba jezika", () => {
    for (const lang of ["hr", "en"] as const) {
      const t = UPRAVLJANJE[lang].novaKasica.predlozak;
      expect(renderirajOpis(t)).toBe(`<p>${escapeHtml(t)}</p>`);
      expect(obicniTekstOpisa(t)).toBe(t);
    }
  });
  it("stari obični tekst s prijelomima: odlomci i <br> umjesto whitespace-pre-line", () => {
    expect(renderirajOpis("Trčim maraton.\nHvala!\n\nVidimo se na cilju.")).toBe("<p>Trčim maraton.<br>Hvala!</p>\n<p>Vidimo se na cilju.</p>");
  });
});
