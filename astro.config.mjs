// @ts-check
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://crowdfund.domovina.ai",
  output: "server",
  // Bez Astro sesija i Cloudflare Images: adapter bi inače dodao vezove SESSION (KV) i
  // IMAGES, a prototip ih ne koristi (uzor listici.domovina.ai).
  session: false,
  adapter: cloudflare({ imageService: "passthrough", remoteBindings: false }),
  // React samo za otoke (odluka 311).
  integrations: [react()],
  vite: { plugins: [tailwindcss()] },
});
