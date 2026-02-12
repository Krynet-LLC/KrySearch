"use strict";

(async () => {
  const CONFIG_PATH = "./Config/config.json";

  const params = new URLSearchParams(location.search);
  const q = params.get("q");
  const rawUrl = params.get("url");
  const forcedEngine = params.get("engine");

  // 🚫 No params → do nothing
  if (!q && !rawUrl) return;

  let CONFIG;
  try {
    const res = await fetch(CONFIG_PATH, { cache: "no-store" });
    if (!res.ok) throw new Error(res.status);
    CONFIG = await res.json();
  } catch (e) {
    console.error("[KrySearch] Failed to load config.json", e);
    return;
  }

  /* =========================
     PLUGINS
  ========================= */
  if (Array.isArray(window.KRY_PLUGINS)) {
    const ctx = Object.freeze({
      ua: navigator.userAgent,
      lang: navigator.language,
      platform: navigator.platform,
      url: location.href
    });

    window.KRY_PLUGINS
      .slice()
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .forEach(p => {
        try {
          if (typeof p?.run === "function") p.run(ctx);
        } catch (e) {
          console.error("[KrySearch] Plugin error:", e);
        }
      });
  }

  /* =========================
     DIRECT URL MODE
  ========================= */
  if (rawUrl) {
    let target;
    try {
      target = new URL(
        rawUrl.startsWith("http") ? rawUrl : "https://" + rawUrl
      );

      // Enforce HTTPS only
      if (target.protocol !== "https:") {
        console.warn("[KrySearch] Blocked non-HTTPS URL:", target.href);
        return;
      }

      location.replace(target.href);
      return;
    } catch {
      console.warn("[KrySearch] Invalid URL:", rawUrl);
      return;
    }
  }

  /* =========================
     SEARCH MODE
  ========================= */
  const engines = {
    ...CONFIG.engines.open_source,
    ...CONFIG.engines.closed_source
  };

  const engineKey =
    forcedEngine && engines[forcedEngine]
      ? forcedEngine
      : CONFIG.search.defaultEngine;

  const engine = engines[engineKey];
  if (!engine?.url) return;

  const target = engine.url.replace(
    "{query}",
    encodeURIComponent(q)
  );

  location.replace(target);
})();
