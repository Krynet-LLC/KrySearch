(async () => {
  "use strict";

  const CONFIG_PATH = "../config.json";

  const params = new URLSearchParams(window.location.search);
  const query = params.get("q");
  const rawUrl = params.get("url");
  const forcedEngine = params.get("engine");

  // 🚫 No params → do absolutely nothing
  if (!query && !rawUrl) return;

  let config;
  try {
    const res = await fetch(CONFIG_PATH, { cache: "no-store" });
    config = await res.json();
  } catch {
    document.body.textContent = "Failed to load config.json";
    return;
  }

  const engines = {
    ...config.engines.open_source,
    ...config.engines.closed_source
  };

  const engineKey =
    forcedEngine && engines[forcedEngine]
      ? forcedEngine
      : config.search.defaultEngine;

  const engine = engines[engineKey];
  if (!engine || !engine.url) {
    document.body.textContent = "Invalid engine";
    return;
  }

  let destination;

  // -----------------------
  // URL MODE (ENGINE-FORCED)
  // -----------------------
  if (rawUrl) {
    let cleanUrl;
    try {
      cleanUrl = new URL(rawUrl).toString();
    } catch {
      document.body.textContent = "Invalid URL";
      return;
    }

    destination = engine.url.replace(
      "{query}",
      encodeURIComponent(cleanUrl)
    );
  }

  // -----------------------
  // QUERY MODE
  // -----------------------
  else if (query) {
    destination = engine.url.replace(
      "{query}",
      encodeURIComponent(query)
    );
  }

  if (!destination) return;

  window.location.replace(destination);
})();
