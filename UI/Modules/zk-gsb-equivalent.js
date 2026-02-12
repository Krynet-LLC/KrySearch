/* zk-gsb-equivalent – KrySearch Plugin
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (C) 2026 Krynet, LLC
 */
(() => {
  "use strict";

  /* ===================== HARD FACT STATE ===================== */

  const openPhish = new Set();
  const spamhaus = new Set();
  const malwareHosts = new Set();

  const state = Object.seal({
    loaded: false,
    output: null
  });

  /* ===================== PATH (SCRIPT-RELATIVE, UNBREAKABLE) ===================== */

  const SCRIPT_URL = new URL(document.currentScript.src);
  const FEED_BASE  = new URL("../Feeds/", SCRIPT_URL).href;

  /* ===================== FEED LOADER ===================== */

  async function loadFeedsOnce() {
    if (state.loaded) return;
    state.loaded = true;

    const FEEDS = [
      { file: "openphish.txt",      target: openPhish },
      { file: "spamhaus_drop.txt",  target: spamhaus },
      { file: "urlhaus.txt",        target: malwareHosts }
    ];

    await Promise.all(
      FEEDS.map(async ({ file, target }) => {
        const url = FEED_BASE + file;

        try {
          const res = await fetch(url, { cache: "no-store" });
          if (!res.ok) {
            console.error("[zk-gsb] Missing feed:", url);
            return;
          }

          const text = await res.text();
          for (const line of text.split("\n")) {
            const v = line.trim().split(/[ ;]/)[0];
            if (v && !v.startsWith("#")) target.add(v);
          }
        } catch (err) {
          console.error("[zk-gsb] Feed load failed:", file, err);
        }
      })
    );
  }

  /* ===================== DOMAIN EXTRACTION ===================== */

  function extractDomain(input) {
    try { return new URL(input).hostname; }
    catch { return input; }
  }

  /* ===================== PLUGIN ===================== */

  const plugin = {
    id: "zk-gsb-equivalent",
    description: "Exact-filename feed scanner (no inference, GH Pages safe)",

    run: async ctx => {
      await loadFeedsOnce();

      const qs = new URLSearchParams(location.search);
      const input = (qs.get("url") || qs.get("q") || "").trim();
      if (!input) return;

      const domain = extractDomain(input);

      state.output = {
        input,
        domain,
        flagged: {
          openPhish: openPhish.has(domain),
          spamhaus: spamhaus.has(domain),
          malwareHosts: malwareHosts.has(domain)
        }
      };

      if (ctx && typeof ctx === "object" && !("safeFeeds" in ctx)) {
        Object.defineProperty(ctx, "safeFeeds", {
          value: state,
          writable: false,
          configurable: false
        });
      }
    }
  };

  /* ===================== REGISTER ===================== */

  globalThis.KRY_PLUGINS ??= [];
  globalThis.KRY_PLUGINS.push(plugin);
})();
