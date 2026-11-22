import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  // Todas las pruebas comparten el estado en memoria del servidor: una a la vez
  workers: 1,
  use: {
    baseURL: "http://localhost:3080",
    // Un selector errado falla en 10 s con su log, no en 60 s (sugerencia del prompt de depuración)
    actionTimeout: 10_000,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  reporter: [["list"], ["html", { open: "never" }]],
});
