/* SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (C) 2026 Krynet, LLC
 * https://github.com/Bloodware-Inc/KrySearch
 *
 * URL Param & Link Sanitizer – Hardened Enterprise Edition
 * - Only ?url= & ?q= allowed
 * - Strips tracking & known provider junk
 * - Safe link & form interception
 * - Dynamic content support
 */
(function () {
  "use strict";

  const plugin = {
    id: "url-sanitizer-max",
    description: "Hardened URL param and link sanitizer (tracking-free, safe)",

    run: async function () {
      try {
        /** ===== CONFIG ===== */
        const ALLOWED_PARAMS = new Set(["url", "q"]);
        const TRACKING_PREFIXES = ["utm_", "fbclid", "gclid", "_ga", "_gl", "_gid"];
        const NAV_DELAY_MS = 50;
        const RULES_URL = "https://raw.githubusercontent.com/ClearURLs/Rules/master/data.min.json";

        /** ===== RULES ===== */
        let rules = [];
        async function loadRules() {
          try {
            const data = await (await fetch(RULES_URL)).json();
            rules = Object.entries(data.providers).map(([name, p]) => ({
              name,
              urlPattern: new RegExp(p.urlPattern, "i"),
              rules: p.rules?.map(r => new RegExp(r, "i")),
              rawRules: p.rawRules?.map(r => new RegExp(r, "i")),
              exceptions: p.exceptions?.map(r => new RegExp(r, "i")),
            }));
          } catch (e) { console.warn("[ClearURLs] Failed to load rules", e); }
        }

        /** ===== URL CLEANING ===== */
        function sanitizeUrl(rawUrl) {
          try {
            let url = new URL(rawUrl, window.location.href);

            // Strip unwanted URL params
            for (const key of [...url.searchParams.keys()]) {
              const isTracking = TRACKING_PREFIXES.some(p => key.startsWith(p));
              const isAllowed = ALLOWED_PARAMS.has(key);
              if (isTracking || !isAllowed) url.searchParams.delete(key);
            }

            // Apply ClearURLs rules
            rules.forEach(r => {
              if (!r.urlPattern.test(url.href)) return;
              if (r.exceptions?.some(rx => rx.test(url.href))) return;

              if (r.rules) [...url.searchParams].forEach(([param]) => {
                if (r.rules.some(rx => rx.test(param))) url.searchParams.delete(param);
              });

              if (r.rawRules) {
                let s = url.href;
                r.rawRules.forEach(rx => s = s.replace(rx, ""));
                try { url = new URL(s); } catch {}
              }
            });

            return url.toString();
          } catch { return window.location.origin + window.location.pathname; }
        }

        function safeNavigate(url) {
          try {
            const u = new URL(url, window.location.href);
            if (!["http:", "https:"].includes(u.protocol)) return;
            setTimeout(() => { window.location.assign(u.href); }, NAV_DELAY_MS);
          } catch {}
        }

        /** ===== INITIAL PARAM HANDLING ===== */
        (() => {
          const params = new URLSearchParams(window.location.search);
          let target = params.has("url") ? sanitizeUrl(params.get("url")) : 
                       params.has("q") ? sanitizeUrl(params.get("q")) : null;
          if (target) {
            try { history.replaceState({}, "", window.location.pathname); } catch {}
            safeNavigate(target);
          }
        })();

        /** ===== LINK & FORM INTERCEPTION ===== */
        const interceptLink = e => {
          const a = e.target.closest?.("a[href]");
          if (!a) return;
          const cleanHref = sanitizeUrl(a.href);
          if (a.href !== cleanHref) {
            e.preventDefault(); e.stopImmediatePropagation();
            safeNavigate(cleanHref);
          }
        };
        const interceptForm = e => {
          const f = e.target; if (!f || !f.action) return;
          const cleanAction = sanitizeUrl(f.action);
          if (f.action !== cleanAction) {
            e.preventDefault(); e.stopImmediatePropagation();
            f.action = cleanAction;
            HTMLFormElement.prototype.submit.call(f);
          }
        };
        document.addEventListener("click", interceptLink, true);
        document.addEventListener("submit", interceptForm, true);

        /** ===== DYNAMIC ELEMENTS ===== */
        const observer = new MutationObserver(mutations => {
          for (const m of mutations) {
            for (const n of m.addedNodes) {
              if (!(n instanceof Element)) continue;
              if (n.tagName === "A" && n.href) n.addEventListener("click", interceptLink, true);
              if (n.tagName === "FORM" && n.action) n.addEventListener("submit", interceptForm, true);
              n.querySelectorAll("a[href], form[action]").forEach(el => {
                if (el.tagName === "A") el.addEventListener("click", interceptLink, true);
                if (el.tagName === "FORM") el.addEventListener("submit", interceptForm, true);
              });
            }
          }
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });

        await loadRules();
      } catch (err) { console.error("URL Sanitizer failed:", err); }
    }
  };

  window.KRY_PLUGINS = window.KRY_PLUGINS || [];
  window.KRY_PLUGINS.push(plugin);
})();
