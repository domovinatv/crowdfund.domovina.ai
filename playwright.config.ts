import { defineConfig } from "@playwright/test";

// Smoke javnih ruta na 375 px i 1280 px (S5, odluka 503) i E2E organizatora (S6). Server: zadano build +
// wrangler dev nad lokalnim D1 na 8798 (prije: `npm run db:seed:local`). S `BASE_URL` (npr. pokrenut
// `astro dev`) koristi se taj server i ne pokreće se vlastiti. Nije dio `npm run check` jer treba server.
const BASE_URL = process.env.BASE_URL;

export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  fullyParallel: true,
  workers: 4,
  reporter: [["list"]],
  use: { baseURL: BASE_URL ?? "http://localhost:8798" },
  projects: [
    { name: "mobitel-375", use: { viewport: { width: 375, height: 812 } } },
    { name: "desktop-1280", use: { viewport: { width: 1280, height: 800 } } },
  ],
  ...(BASE_URL
    ? {}
    : {
        webServer: {
          command: "npx astro build && npx wrangler dev --port 8798",
          url: "http://localhost:8798/hr",
          reuseExistingServer: true,
          timeout: 180_000,
        },
      }),
});
