/* zk-gsb-equivalent – KrySearch Plugin
 * GitHub Pages safe, async, feed-aware
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (C) 2026 Krynet, LLC
 * https://github.com/Bloodware-Inc/KrySearch
 */
(() => {
  "use strict";

  /* ===================== INTERNAL STATE ===================== */

  const openPhish = new Set();
  const spamhaus = new Set();
  const malwareHosts = new Set();

  const state = {
    feeds: { openPhish, spamhaus, malwareHosts },
    output: null,
    loaded: false
  };

  Object.seal(state);
  Object.seal(state.feeds);

  /* ===================== PATH RESOLUTION ===================== */

  // Canonical KrySearch root (prevents UI/UI duplication)
  const BASE =
    location.origin +
    location.pathname.split("/UI/")[0] +
    "/UI/Modules/Feeds/";

  function feedPath(name) {
    return BASE + name;
  }

  /* ===================== FEED LOADER ===================== */

  async function loadFeedsOnce() {
    if (state.loaded) return;
    state.loaded = true;

    const feeds = [
      { url: feedPath("openPhish.txt"), target: openPhish },
      { url: feedPath("drop.txt"),     target: spamhaus },
      { url: feedPath("urlhaus.txt"),  target: malwareHosts }
    ];

    await Promise.all(
      feeds.map(async ({ url, target }) => {
        try {
          const res = await fetch(url, { cache: "no-store" });
          if (!res.ok) return;

          const text = await res.text();
          for (const line of text.split("\n")) {
            const v = line.trim().split(/[ ;]/)[0];
            if (v && v[0] !== "#") target.add(v);
          }
        } catch {
          /* silent by design */
        }
      })
    );
  }

  /* ===================== DOMAIN EXTRACTION ===================== */

  function extractDomain(input) {
    try {
      return new URL(input).hostname;
    } catch {
      return input;
    }
  }

  /* ===================== CONTEXT ATTACHMENT ===================== */

  function attachState(ctx) {
    if (ctx && typeof ctx === "object") {
      try {
        if (!("safeFeeds" in ctx)) {
          Object.defineProperty(ctx, "safeFeeds", {
            value: state,
            writable: false,
            configurable: false,
            enumerable: true
          });
        }
        return;
      } catch {}
    }

    if (!globalThis.KRY_SAFE_FEEDS) {
      Object.defineProperty(globalThis, "KRY_SAFE_FEEDS", {
        value: state,
        writable: false,
        configurable: false,
        enumerable: false
      });
    }
  }

  /* ===================== PLUGIN ===================== */

  const plugin = {
    id: "zk-gsb-equivalent",
    description: "Feed-aware URL scanner (path-safe, runner-agnostic)",

    run: async function (ctx) {
      try {
        attachState(ctx);
        await loadFeedsOnce();

        const params = new URLSearchParams(location.search);
        const input =
          (params.get("url") || params.get("q") || "").trim();

        if (!input) {
          state.output = null;
          return;
        }

        const domain = extractDomain(input);

        state.output = {
          input,
          domain,
          flagged: {
            openPhish: openPhish.has(domain),
            spamhaus: spamhaus.has(domain),
            malwareHosts: malwareHosts.has(domain)
          },
          note: "Feed scan complete (openPhish, drop/spamhaus, urlhaus)"
        };
      } catch {
        state.output = null;
      }
    }
  };

  /* ===================== REGISTRATION ===================== */

  globalThis.KRY_PLUGINS = globalThis.KRY_PLUGINS || [];
  globalThis.KRY_PLUGINS.push(plugin);

})();
