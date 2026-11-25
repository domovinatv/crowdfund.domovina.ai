/**
 * Video kampanje (S11): whitelist YouTube/Vimeo, strogi ID, ugradnja i izvorni URL grade se iz ID-a.
 */
import { describe, expect, it } from "vitest";
import { parsirajVideo } from "../src/lib/video";
import { valjanVideoUrl } from "../src/lib/db/nacrti";

const YT = "dQw4w9WgXcQ";

describe("parsirajVideo: YouTube", () => {
  it("četiri oblika daju isti video", () => {
    for (const u of [
      `https://www.youtube.com/watch?v=${YT}`,
      `https://youtube.com/watch?v=${YT}&t=42s`,
      `https://m.youtube.com/watch?feature=share&v=${YT}`,
      `https://youtu.be/${YT}`,
      `https://youtu.be/${YT}?si=abc`,
      `https://www.youtube.com/shorts/${YT}`,
      `https://www.youtube.com/shorts/${YT}/`,
      `https://www.youtube.com/embed/${YT}`,
      `  https://WWW.YouTube.com/watch?v=${YT}  `,
    ]) {
      expect(parsirajVideo(u), u).toEqual({
        izvor: "youtube",
        id: YT,
        ugradnja: `https://www.youtube-nocookie.com/embed/${YT}?autoplay=1`,
        izvorni: `https://www.youtube.com/watch?v=${YT}`,
      });
    }
  });
  it("neispravan ID ili put", () => {
    for (const u of [
      "https://www.youtube.com/watch?v=abc",
      `https://www.youtube.com/watch?v=${YT}x`,
      `https://www.youtube.com/watch?v=${YT.slice(0, 10)}"`,
      "https://www.youtube.com/watch?v=<script>xx",
      "https://www.youtube.com/watch",
      `https://www.youtube.com/channel/${YT}`,
      `https://www.youtube.com/shorts/${YT}/extra`,
      `https://www.youtube.com/v/${YT}`,
      `https://youtu.be/${YT}/x`,
      "https://youtu.be/",
      `https://www.youtube.com/playlist?list=${YT}`,
    ]) {
      expect(parsirajVideo(u), u).toBeNull();
    }
  });
});

describe("parsirajVideo: Vimeo", () => {
  it("vimeo.com/broj", () => {
    const ocekivano = { izvor: "vimeo", id: "76979871", ugradnja: "https://player.vimeo.com/video/76979871?dnt=1&autoplay=1", izvorni: "https://vimeo.com/76979871" };
    expect(parsirajVideo("https://vimeo.com/76979871")).toEqual(ocekivano);
    expect(parsirajVideo("https://www.vimeo.com/76979871/")).toEqual(ocekivano);
    expect(parsirajVideo("https://vimeo.com/76979871?share=copy")).toEqual(ocekivano);
  });
  it("sve ostalo s Vimea", () => {
    for (const u of [
      "https://vimeo.com/channels/staffpicks/76979871",
      "https://vimeo.com/abc",
      "https://vimeo.com/1234567890123",
      "https://vimeo.com/",
      "https://player.vimeo.com/video/76979871",
    ]) {
      expect(parsirajVideo(u), u).toBeNull();
    }
  });
});

describe("parsirajVideo: ostali hostovi i sheme", () => {
  it("odbija", () => {
    for (const u of [
      null,
      undefined,
      "",
      "nije url",
      `http://www.youtube.com/watch?v=${YT}`,
      `javascript:alert(1)//youtube.com/watch?v=${YT}`,
      `https://youtube.com.zlo.hr/watch?v=${YT}`,
      `https://zlo.hr/watch?v=${YT}`,
      `https://notyoutube.com/watch?v=${YT}`,
      `https://www.youtube-nocookie.com/embed/${YT}`,
      `https://korisnik@www.youtube.com/watch?v=${YT}`,
      `https://www.youtube.com:8443/watch?v=${YT}`,
      `https://dailymotion.com/video/x7tgad0`,
      `https://www.youtube.com/watch?v=${YT}&x=${"a".repeat(500)}`,
    ]) {
      expect(parsirajVideo(u), String(u)).toBeNull();
    }
  });
});

describe("valjanVideoUrl: obrazac prihvaća samo ono što stranica prikazuje", () => {
  it("isti kriterij kao parsirajVideo", () => {
    expect(valjanVideoUrl(`https://youtu.be/${YT}`)).toBe(true);
    expect(valjanVideoUrl("https://vimeo.com/76979871")).toBe(true);
    expect(valjanVideoUrl("https://www.youtube.com/watch?v=abc")).toBe(false);
    expect(valjanVideoUrl("https://vimeo.com/channels/x")).toBe(false);
  });
});
