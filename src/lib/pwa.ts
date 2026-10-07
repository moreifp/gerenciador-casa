import { registerSW } from "virtual:pwa-register";

const SW_URL = "/sw.js";
const RELOAD_FLAG = "sw-reloaded-for";
const CLEAN_FLAG = "sw-cache-cleaned-for";

function isRefusedContext(): boolean {
  const h = window.location.hostname;
  let inIframe = false;
  try { inIframe = window.self !== window.top; } catch { inIframe = true; }
  return (
    !import.meta.env.PROD ||
    inIframe ||
    h.startsWith("id-preview--") || h.startsWith("preview--") ||
    h === "lovableproject.com" || h.endsWith(".lovableproject.com") ||
    h === "lovableproject-dev.com" || h.endsWith(".lovableproject-dev.com") ||
    h === "beta.lovable.dev" || h.endsWith(".beta.lovable.dev") ||
    new URLSearchParams(window.location.search).get("sw") === "off"
  );
}

async function unregisterAppSW() {
  if (!("serviceWorker" in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(regs.filter((r) => r.active?.scriptURL.endsWith(SW_URL) || r.installing?.scriptURL.endsWith(SW_URL) || r.waiting?.scriptURL.endsWith(SW_URL)).map((r) => r.unregister()));
}

/** Once per build: drop caches from older app SWs (incl. old precached index.html). */
async function cleanOldCaches() {
  if (!("caches" in window)) return false;
  if (localStorage.getItem(CLEAN_FLAG) === __BUILD_ID__) return false;
  localStorage.setItem(CLEAN_FLAG, __BUILD_ID__);
  const names = await caches.keys();
  const stale = names.filter((n) => /precache-v\d+|html-pages|workbox-runtime/.test(n));
  await Promise.allSettled(stale.map((n) => caches.delete(n)));
  return stale.length > 0;
}

function reloadOnce() {
  if (sessionStorage.getItem(RELOAD_FLAG) === __BUILD_ID__) return;
  sessionStorage.setItem(RELOAD_FLAG, __BUILD_ID__);
  window.location.reload();
}

async function remoteBuildId(): Promise<string | null> {
  try {
    const r = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
    if (!r.ok) return null;
    return (await r.json()).buildId ?? null;
  } catch { return null; }
}

export function setupPWA() {
  if (!("serviceWorker" in navigator)) return;
  if (isRefusedContext()) { void unregisterAppSW(); return; }

  // When a new SW takes control, reload one time so the new bundle is used.
  let hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController) { hadController = true; return; }
    reloadOnce();
  });

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() { void updateSW(true); },
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      const check = async () => {
        await registration.update().catch(() => {});
        const remote = await remoteBuildId();
        if (remote && remote !== __BUILD_ID__) {
          await registration.update().catch(() => {});
          reloadOnce();
        }
      };
      void check();
      setInterval(check, 15 * 60 * 1000);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") void check();
      });
    },
  });

  void cleanOldCaches().then((hadStale) => { if (hadStale) reloadOnce(); });
}
