import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  site: "https://marcodantonio.it",
  output: "server",
  adapter: cloudflare({
    configPath: "./wrangler.toml",
    imageService: "passthrough",
    // Local UI / security QA must never consume a remote Workers AI call.
    remoteBindings: false,
  }),
  integrations: [react()],
  session: false,
  devToolbar: { enabled: false },
  server: { host: "127.0.0.1", port: 3010 },
  vite: {
    plugins: [tailwindcss()],
    resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
    css: { postcss: { plugins: [] } },
  },
});
