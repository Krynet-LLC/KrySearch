/* zk-gsb-equivalent – KrySearch Plugin (Optimized)
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (C) 2026 Krynet, LLC
 */
(() => {
  "use strict";

  console.warn("✅ zk-gsb-equivalent ACTIVE (Optimized)");

  /* ===================== STATE ===================== */
  const FEEDS = {
    openPhish: new Set(),
    spamhaus: new Set(),
    malwareHosts: new Set()
  };

  const state = Object.seal({
    loaded: false,
    output: null
  });

  /* ===================== PATH RESOLUTION ===================== */
  const FEED_BASE = new URL("./Feeds/", new URL(document.currentScript.src).href).href;

  /* ===================== FEED LOADER ===================== */
  async function loadFeeds() {
    if (state.loaded) return;
    state.loaded = true;

    const feedFiles = [
      ["openphish.txt", "openPhish"],
      ["spamhaus_drop.txt", "spamhaus"],
      ["urlhaus.txt", "malwareHosts"]
    ];

    await Promise.all(feedFiles.map(async ([file, key]) => {
      try {
        const res = await fetch(FEED_BASE + file, { cache: "no-store" });
        if (!res.ok) return;
        const text = await res.text();
        for (const line of text.split("\n")) {
          const domain = line.trim().split(/[ ;]/)[0];
          if (domain && !domain.startsWith("#")) FEEDS[key].add(domain);
        }
      } catch {}
    }));
  }

  /* ===================== UTIL ===================== */
  const extractDomain = input => {
    try { return new URL(input).hostname; }
    catch { return input; }
  };

  /* ===================== PLUGIN ===================== */
  const plugin = {
    id: "zk-gsb-equivalent",
    description: "Exact-path feed scanner (Optimized for GH Pages)",

    run: async ctx => {
      await loadFeeds();

      const params = new URLSearchParams(location.search);
      const input = (params.get("url") || params.get("q") || "").trim();
      if (!input) return;

      const domain = extractDomain(input);

      state.output = {
        input,
        domain,
        flagged: {
          openPhish: FEEDS.openPhish.has(domain),
          spamhaus: FEEDS.spamhaus.has(domain),
          malwareHosts: FEEDS.malwareHosts.has(domain)
        }
      };

      if (ctx && typeof ctx === "object" && !("safeFeeds" in ctx)) {
        Object.defineProperty(ctx, "safeFeeds", {
          value: state,
          configurable: false
        });
      }
    }
  };

  globalThis.KRY_PLUGINS ??= [];
  globalThis.KRY_PLUGINS.push(plugin);
})();
