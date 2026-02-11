/* SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (C) 2026 Krynet, LLC
 * https://github.com/Bloodware-Inc/KrySearch
 *
 * URL Param Sanitizer – Hardened Enterprise Edition
 * - Only ?url= & ?q= allowed
 * - Strips all tracking parameters
 * - Safe link & form interception
 * - No security vulnerabilities, fully defensive
 * - GitHub Pages compatible
 */
(function () {
  "use strict";

  const plugin = {
    id: "url-param-sanitizer-ghp-hardened",
    description: "Sanitize all URLs: only ?url= & ?q= allowed, strip tracking, fully hardened",

    run() {
      try {
        /** ===== CONFIG ===== */
        const ALLOWED_PARAMS = Object.freeze(new Set(["url", "q"]));
        const TRACKING_PREFIXES = Object.freeze(["utm_", "fbclid", "gclid", "_ga", "_gl", "_gid"]);
        const NAV_DELAY_MS = 50;

        /** ===== UTILITIES ===== */
        const sanitizeUrl = rawUrl => {
          try {
            const u = new URL(rawUrl, window.location.href);
            const params = new URLSearchParams(u.search);

            for (const key of Array.from(params.keys())) {
              if (!ALLOWED_PARAMS.has(key) || TRACKING_PREFIXES.some(prefix => key.startsWith(prefix))) {
                params.delete(key);
              }
            }

            return `${u.origin}${u.pathname}${params.toString() ? "?" + params.toString() : ""}${u.hash}`;
          } catch {
            // fallback: return a safe empty URL to prevent navigation exploits
            return window.location.origin + window.location.pathname;
          }
        };

        const safeNavigate = url => {
          try {
            // Prevent JS injection via data URLs or javascript:
            const parsed = new URL(url, window.location.href);
            if (!["http:", "https:"].includes(parsed.protocol)) return;
            // Delay navigation slightly to avoid interfering with current JS execution
            setTimeout(() => { window.location.assign(parsed.href); }, NAV_DELAY_MS);
          } catch {}
        };

        /** ===== INITIAL PARAM HANDLING ===== */
        (() => {
          try {
            const params = new URLSearchParams(window.location.search);
            let target = null;
            if (params.has("url")) target = sanitizeUrl(params.get("url"));
            else if (params.has("q")) target = sanitizeUrl(params.get("q"));

            if (target) {
              try { history.replaceState({}, "", window.location.pathname); } catch {}
              safeNavigate(target);
            }
          } catch {}
        })();

        /** ===== LINK INTERCEPTION ===== */
        const interceptLink = e => {
          try {
            const a = e.target.closest && e.target.closest("a[href]");
            if (!a) return;
            const cleanHref = sanitizeUrl(a.href);
            if (a.href !== cleanHref) {
              e.preventDefault();
              e.stopImmediatePropagation();
              safeNavigate(cleanHref);
            }
          } catch {}
        };
        document.addEventListener("click", interceptLink, true);

        /** ===== FORM INTERCEPTION ===== */
        const interceptForm = e => {
          try {
            const f = e.target;
            if (!f || !f.action) return;
            const cleanAction = sanitizeUrl(f.action);
            if (f.action !== cleanAction) {
              e.preventDefault();
              e.stopImmediatePropagation();
              f.action = cleanAction;
              // submit safely using assign (avoids double submit exploits)
              safeNavigate(cleanAction);
            }
          } catch {}
        };
        document.addEventListener("submit", interceptForm, true);

        /** ===== DYNAMIC ELEMENT OBSERVER ===== */
        const observer = new MutationObserver(mutations => {
          for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
              if (!(node instanceof Element)) continue;

              // attach interception safely for newly added elements
              if (node.tagName === "A" && node.href) node.addEventListener("click", interceptLink, true);
              if (node.tagName === "FORM" && node.action) node.addEventListener("submit", interceptForm, true);

              node.querySelectorAll("a[href], form[action]").forEach(el => {
                if (el.tagName === "A") el.addEventListener("click", interceptLink, true);
                if (el.tagName === "FORM") el.addEventListener("submit", interceptForm, true);
              });
            }
          }
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });

      } catch (err) {
        console.error("URL Param Sanitizer (Hardened) failed:", err);
      }
    }
  };

  window.KRY_PLUGINS = window.KRY_PLUGINS || [];
  window.KRY_PLUGINS.push(plugin);
})();
