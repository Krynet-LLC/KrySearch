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

  // Single authoritative state object
  const state = {
    feeds: {
      openPhish,
      spamhaus,
      malwareHosts
    },
    output: null,
    loaded: false
  };

  Object.seal(state);
  Object.seal(state.feeds);

  /* ===================== FEED LOADER ===================== */

  async function loadFeedsOnce() {
    if (state.loaded) return;
    state.loaded = true;

    const feeds = [
      { url: "UI/Modules/Feeds/openPhish.txt", target: openPhish },
      { url: "UI/Modules/Feeds/drop.txt",     target: spamhaus },
      { url: "UI/Modules/Feeds/urlhaus.txt",  target: malwareHosts }
    ];

    await Promise.all(
      feeds.map(async ({ url, target }) => {
        try {
          const res = await fetch(url, { cache: "no-store" });
          if (!res.ok) return;

          const text = await res.text();
          for (const line of text.split("\n")) {
            const value = line.trim().split(/[ ;]/)[0];
            if (value && value[0] !== "#") {
              target.add(value);
            }
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
    // Prefer ctx if usable
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
      } catch {
        /* ctx is frozen or hostile */
      }
    }

    // Fallback: controlled global exposure
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
    description: "Feed-aware URL scanner (runner-agnostic, CSP-safe)",

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
