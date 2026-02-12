/* zk-gsb-equivalent – KrySearch Plugin
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (C) 2026 Krynet, LLC
 */
(() => {
  "use strict";

  /* ===================== IMMUTABLE STATE ===================== */

  const feeds = Object.freeze({
    openPhish: new Set(),
    spamhaus: new Set(),
    malwareHosts: new Set()
  });

  const state = Object.seal({
    loaded: false,
    output: null
  });

  /* ===================== PATHS ===================== */

  const FEED_BASE = "/KrySearch/UI/Modules/Feeds/";
  const MANIFEST  = FEED_BASE + "feeds.json";

  /* ===================== FEED LOADER ===================== */

  async function loadFeedsOnce() {
    if (state.loaded) return;
    state.loaded = true;

    let list;
    try {
      const res = await fetch(MANIFEST, { cache: "no-store" });
      if (!res.ok) return;
      list = await res.json();
      if (!Array.isArray(list)) return;
    } catch {
      return;
    }

    await Promise.all(
      list.map(async file => {
        try {
          const res = await fetch(FEED_BASE + file, { cache: "no-store" });
          if (!res.ok) return;

          const text = await res.text();

          const target =
            file.includes("open")   ? feeds.openPhish :
            file.includes("spam") ||
            file.includes("drop")   ? feeds.spamhaus :
                                      feeds.malwareHosts;

          for (const line of text.split("\n")) {
            const v = line.trim().split(/[ ;]/)[0];
            if (v && v[0] !== "#") target.add(v);
          }
        } catch {}
      })
    );
  }

  /* ===================== UTIL ===================== */

  function extractDomain(input) {
    try { return new URL(input).hostname; }
    catch { return input; }
  }

  /* ===================== PLUGIN ===================== */

  const plugin = {
    id: "zk-gsb-equivalent",
    description: "Manifest-driven feed scanner (GH Pages safe)",

    run: async ctx => {
      await loadFeedsOnce();

      const qs = new URLSearchParams(location.search);
      const input = (qs.get("url") || qs.get("q") || "").trim();
      if (!input) return;

      const d = extractDomain(input);

      state.output = {
        input,
        domain: d,
        flagged: {
          openPhish: feeds.openPhish.has(d),
          spamhaus: feeds.spamhaus.has(d),
          malwareHosts: feeds.malwareHosts.has(d)
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
