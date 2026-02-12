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
    console.error("[KrySearch] Config load failed", e);
    return;
  }

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

  let target;

  /* =========================
     DIRECT URL MODE
  ========================= */
  if (rawUrl) {
    let clean;
    try {
      clean = new URL(
        rawUrl.startsWith("http") ? rawUrl : "https://" + rawUrl
      ).href;
    } catch {
      return;
    }

    target = engine.url.replace(
      "{query}",
      encodeURIComponent(clean)
    );
  }

  /* =========================
     SEARCH QUERY MODE
  ========================= */
  if (q) {
    target = engine.url.replace(
      "{query}",
      encodeURIComponent(q)
    );
  }

  if (!target) return;

  location.replace(target);
})();
