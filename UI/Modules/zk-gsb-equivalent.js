/* SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (C) 2026 Krynet, LLC
 * https://github.com/Bloodware-Inc/KrySearch
 */
window.KRY_PLUGINS = window.KRY_PLUGINS || [];

window.KRY_PLUGINS.push({
  id: "zk-gsb-equivalent",
  description: "Local feeds scan: openPhish, spamhaus/drop, urlhaus",
  order: 100,

  run: async function (ctx) {
    try {
      // ====== FEED SETS ======
      const openPhish = new Set();
      const spamhaus = new Set();
      const malwareHosts = new Set();

      async function loadFeeds() {
        const feeds = [
          { url: "Feeds/openPhish.txt", set: openPhish },
          { url: "Feeds/drop.txt", set: spamhaus },
          { url: "Feeds/urlhaus.txt", set: malwareHosts }
        ];

        await Promise.all(feeds.map(async f => {
          try {
            const res = await fetch(f.url, { cache: "no-store" });
            if (!res.ok) return;
            const txt = await res.text();
            txt.split("\n").forEach(line => {
              const d = line.trim().split(/[ ;]/)[0];
              if (d && !d.startsWith("#")) f.set.add(d);
            });
          } catch {}
        }));
      }

      await loadFeeds(); // MUST finish before scanning

      // ====== SCORING FUNCTION ======
      function scoreUrl(rawUrl) {
        try {
          const urlObj = new URL(rawUrl);
          const host = urlObj.hostname.toLowerCase();

          let score = 0;
          if (openPhish.has(host)) score += 50;
          if (spamhaus.has(host)) score += 100;
          if (malwareHosts.has(host)) score += 75;

          return { host, score };
        } catch {
          return { host: rawUrl, score: 0 };
        }
      }

      // ====== EXAMPLE: SCAN CURRENT URL ======
      if (ctx && ctx.url) {
        ctx.scanResult = scoreUrl(ctx.url);
      }

      // Expose sets & function for debug / further use
      window.__KRY_FEEDS__ = { openPhish, spamhaus, malwareHosts, scoreUrl };

    } catch (err) {
      console.error("zk-gsb-equivalent plugin failed:", err);
    }
  }
});
      const entropy = s => new Set(s).size / Math.max(1, s.length);

      function heuristicScore(host) {
        let score = 100;
        if (BAD.has(host)) score -= 80;
        if (entropy(host) > 0.75) score -= 25;
        if (/\d{5,}/.test(host)) score -= 20;
        if (host.split(".")[0].length > 15) score -= 15;
        return score;
      }

      function verdict(url) {
        const u = new URL(url);
        if (u.protocol !== "https:") throw "no https";

        const score = heuristicScore(u.hostname);
        if (score < 50) throw "unsafe";
        return url;
      }

      // Override window.open
      const _open = window.open;
      window.open = function (url, ...args) {
        try {
          return _open(verdict(url), ...args);
        } catch {
          alert("🚫 Blocked by Safe‑Browsing equivalent layer");
        }
      };

      // Auto-block ?url= queries
      const qp = new URLSearchParams(location.search);
      if (qp.has("url")) {
        try {
          location.replace(verdict(qp.get("url")));
        } catch {
          document.body.innerHTML =
            "<h2>🚫 Unsafe destination blocked</h2>";
        }
      }

      console.log(`[KrySearch] zk-gsb-equivalent loaded: ${BAD.size} domains loaded`);
    }
  });
})();
