/* zk-gsb-equivalent – KrySearch Plugin
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (C) 2026 Krynet, LLC
 */
(() => {
  "use strict";

  const feeds = Object.freeze({
    openPhish: new Set(),
    spamhaus: new Set(),
    malwareHosts: new Set()
  });

  const state = Object.seal({
    loaded: false,
    output: null
  });

  const FEED_BASE = "/KrySearch/UI/Modules/Feeds/";
  const MANIFEST  = FEED_BASE + "feeds.json";

  async function loadFeedsOnce() {
    if (state.loaded) return;
    state.loaded = true;

    let list;
    try {
      const res = await fetch(MANIFEST, { cache: "no-store" });
      if (!res.ok) return;
      list = await res.json();
    } catch {
      return;
    }

    await Promise.all(
      list.map(async name => {
        try {
          const res = await fetch(FEED_BASE + name, { cache: "no-store" });
          if (!res.ok) return;

          const set =
            name.includes("open") ? feeds.openPhish :
            name.includes("drop") ? feeds.spamhaus :
            feeds.malwareHosts;

          const text = await res.text();
          for (const line of text.split("\n")) {
            const v = line.trim().split(/[ ;]/)[0];
            if (v && v[0] !== "#") set.add(v);
          }
        } catch {}
      })
    );
  }

  function domain(input) {
    try { return new URL(input).hostname; }
    catch { return input; }
  }

  const plugin = {
    id: "zk-gsb-equivalent",
    run: async ctx => {
      await loadFeedsOnce();

      const q = new URLSearchParams(location.search);
      const input = (q.get("url") || q.get("q") || "").trim();
      if (!input) return;

      const d = domain(input);
      state.output = {
        input,
        domain: d,
        flagged: {
          openPhish: feeds.openPhish.has(d),
          spamhaus: feeds.spamhaus.has(d),
          malwareHosts: feeds.malwareHosts.has(d)
        }
      };

      if (ctx && typeof ctx === "object") {
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
