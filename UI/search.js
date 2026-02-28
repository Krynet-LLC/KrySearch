"use strict";

(async () => {
  const p = new URLSearchParams(location.search);
  const q = p.get("q");      // search query
  const u = p.get("url");    // direct URL
  const forcedEngine = p.get("engine");

  // 🚀 Direct URL mode
  if (u) {
    let target = u.startsWith("http") ? u : "https://" + u;
    try { target = new URL(target).href } 
    catch { return console.warn("[KrySearch] Invalid URL:", u) }
    return location.replace(target); // go straight to the site
  }

  // ❌ No search query → nothing to do
  if (!q) return;

  // 🔧 Load config
  let CONFIG;
  try {
    const res = await fetch("./Config/config.json", { cache: "no-store" });
    if (!res.ok) throw new Error(res.status);
    CONFIG = await res.json();
  } catch (e) { return console.error("[KrySearch] Failed to load config.json", e) }

  // 🔍 Determine engine
  const engines = { ...CONFIG.engines.open_source, ...CONFIG.engines.closed_source };
  const engineKey = (forcedEngine && engines[forcedEngine]) ? forcedEngine : CONFIG.search.defaultEngine;
  const engine = engines[engineKey];
  if (!engine?.url) return console.error("[KrySearch] Missing engine URL");

  // 🌐 Redirect using the search engine
  location.replace(engine.url.replace("{query}", encodeURIComponent(q)));
})();
