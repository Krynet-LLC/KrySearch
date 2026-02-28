"use strict";

(async () => {
  const CONFIG_PATH = "./Config/config.json";

  const params = new URLSearchParams(location.search);
  const q = params.get("q");
  const rawUrl = params.get("url");
  const forcedEngine = params.get("engine");

  console.log("[KrySearch] Params:", { q, rawUrl, forcedEngine });

  let finalQuery = null;

  /* =========================
     URL MODE
  ========================= */

  if (rawUrl) {
    try {
      const normalized = rawUrl.startsWith("http")
        ? rawUrl
        : "https://" + rawUrl;

      const parsed = new URL(normalized);

      if (parsed.protocol !== "https:") {
        console.warn("[KrySearch] Blocked non-HTTPS URL:", parsed.href);
        return;
      }

      finalQuery = parsed.href;
      console.log("[KrySearch] URL mode active:", finalQuery);

    } catch (e) {
      console.warn("[KrySearch] Invalid URL param:", rawUrl);
      return;
    }
  }

  /* =========================
     SEARCH MODE
  ========================= */

  if (!finalQuery && q) {
    finalQuery = q.trim();
    console.log("[KrySearch] Search mode active:", finalQuery);
  }

  if (!finalQuery) {
    console.log("[KrySearch] No query provided. Exiting.");
    return;
  }

  /* =========================
     LOAD CONFIG
  ========================= */

  let CONFIG;
  try {
    const res = await fetch(CONFIG_PATH, { cache: "no-store" });
    if (!res.ok) throw new Error(res.status);
    CONFIG = await res.json();
    console.log("[KrySearch] Config loaded.");
  } catch (e) {
    console.error("[KrySearch] Failed to load config.json", e);
    return;
  }

  /* =========================
     ENGINE RESOLUTION
  ========================= */

  const engines = {
    ...CONFIG.engines.open_source,
    ...CONFIG.engines.closed_source
  };

  const defaultKey = (CONFIG.search.defaultEngine || "").toLowerCase();
  const requestedKey = (forcedEngine || "").toLowerCase();

  let engineKey = defaultKey;

  if (requestedKey && engines[requestedKey]) {
    engineKey = requestedKey;
    console.log("[KrySearch] Forced engine detected:", engineKey);
  }

  if (!engines[engineKey]) {
    console.warn("[KrySearch] Invalid default engine. Falling back.");
    engineKey = Object.keys(engines)[0];
  }

  const engine = engines[engineKey];

  console.log("[KrySearch] Using engine:", engineKey);
  console.log("[KrySearch] Engine config:", engine);

  if (!engine?.url) {
    console.error("[KrySearch] Engine missing URL. Aborting.");
    return;
  }

  /* =========================
     BUILD TARGET
  ========================= */

  const target = engine.url.replace(
    "{query}",
    encodeURIComponent(finalQuery)
  );

  console.log("[KrySearch] Final query:", finalQuery);
  console.log("[KrySearch] Redirecting to:", target);

  window.location.assign(target);
})();
