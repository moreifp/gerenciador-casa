import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

const now = new Date();
const BUILD_ID = `${now.toISOString().slice(0, 16).replace(/[-:T]/g, "").replace(/^(\d{8})/, "$1-")}`;

const versionJson = () => ({
  name: "version-json",
  apply: "build" as const,
  generateBundle(this: any) {
    this.emitFile({ type: "asset", fileName: "version.json", source: JSON.stringify({ buildId: BUILD_ID }) });
  },
});

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  plugins: [
    react(),
    versionJson(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: null,
      devOptions: { enabled: false },
      workbox: {
        // index.html is NOT precached: navigations always go to the network first.
        globPatterns: ["**/*.{js,css,ico,png,svg,woff2}"],
        globIgnores: ["**/version.json"],
        navigateFallback: null,
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ request }: { request: Request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: { cacheName: "html-pages", networkTimeoutSeconds: 4, expiration: { maxEntries: 5 } },
          },
          {
            urlPattern: ({ url }: { url: URL }) => url.pathname.endsWith(".webmanifest") || url.pathname === "/version.json",
            handler: "NetworkOnly",
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api",
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 },
            },
          },
        ],
        navigateFallbackDenylist: [/^\/~oauth/],
      },
      manifest: {
        name: "Gerenciador Casa",
        short_name: "Gerenciador Casa",
        description: "Gerenciador Casa — tarefas da equipe da casa",
        theme_color: "#FFFFFF",
        background_color: "#FFFFFF",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          { src: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "/icon-maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
