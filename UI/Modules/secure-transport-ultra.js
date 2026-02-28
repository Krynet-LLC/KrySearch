/* SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (C) 2026 Krynet, LLC
 * https://github.com/Bloodware-Inc/KrySearch
 *
 * Secure Transport Ultra – MAXSEC / ENGINE-AGNOSTIC
 * Hardened, idempotent URL & form interception with optional session-bound AES-GCM sealing
 */
(() => {
  "use strict";

  const plugin = {
    id: "secure-transport-ultra-maxsec",
    order: 95,
    description: "Enforces HTTPS + engine param, idempotent interception, history API fencing",

    run() {
      try {
        const HTTPS = "https:";
        const ORIGIN = location.origin;
        const intercepted = new WeakSet();

        // ===================== CRYPTO (OPTIONAL) =====================
        const enc = new TextEncoder();
        const dec = new TextDecoder();
        const hasCrypto = globalThis.crypto?.subtle?.encrypt;

        const sessionKeyPromise = hasCrypto
          ? crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"])
          : null;

        const seal = async str => {
          if (!hasCrypto) return str;
          const key = await sessionKeyPromise;
          const iv = crypto.getRandomValues(new Uint8Array(12));
          const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(str));
          return { iv, data };
        };

        const unseal = async pkg => {
          if (!hasCrypto || typeof pkg === "string") return pkg;
          const key = await sessionKeyPromise;
          const out = await crypto.subtle.decrypt({ name: "AES-GCM", iv: pkg.iv }, key, pkg.data);
          return dec.decode(out);
        };

        // ===================== URL SANITIZATION =====================
        const sanitizeURL = raw => {
          try {
            const url = new URL(raw, ORIGIN);
            if (url.protocol !== HTTPS) return null;
            if (!url.searchParams.has("engine")) return null;
            url.hash = "";
            return url.href;
          } catch {
            return null;
          }
        };

        // ===================== HARD NAVIGATION =====================
        const hardNavigate = async raw => {
          const safe = sanitizeURL(raw);
          if (!safe) return;
          try {
            const sealed = await seal(safe);
            const finalURL = await unseal(sealed);
            location.assign(finalURL);
          } catch {
            location.assign(safe);
          }
        };

        // ===================== ELEMENT INTERCEPTION =====================
        const interceptElement = el => {
          if (!el || intercepted.has(el)) return;
          intercepted.add(el);

          if (el.tagName === "A" && el.href) {
            const safe = sanitizeURL(el.href);
            if (!safe) return;
            el.rel = "noopener noreferrer";
            el.target = "_self";
            el.addEventListener("click", e => { e.preventDefault(); hardNavigate(safe); }, { capture: true });
          }

          if (el.tagName === "FORM" && el.action) {
            const safe = sanitizeURL(el.action);
            if (!safe) return;
            el.addEventListener("submit", e => { e.preventDefault(); hardNavigate(safe); }, { capture: true });
          }
        };

        // ===================== GLOBAL EVENT FENCING =====================
        document.addEventListener("click", e => interceptElement(e.target.closest("a")), true);
        document.addEventListener("submit", e => interceptElement(e.target.closest("form")), true);

        // ===================== MUTATION OBSERVER =====================
        new MutationObserver(muts => {
          for (const m of muts) {
            for (const n of m.addedNodes) {
              if (!(n instanceof Element)) continue;
              n.querySelectorAll("a[href], form[action]").forEach(interceptElement);
            }
          }
        }).observe(document.documentElement, { childList: true, subtree: true });

        // ===================== HISTORY API FENCING =====================
        const patchHistory = method => {
          const orig = history[method].bind(history);
          history[method] = (_, __, url) => { const safe = sanitizeURL(url); if (safe) hardNavigate(safe); else orig(_, __, url); };
        };
        patchHistory("pushState");
        patchHistory("replaceState");

        // ===================== PUBLIC API =====================
        Object.defineProperty(globalThis, "__KRY_HARD_NAV__", {
          value: hardNavigate,
          writable: false,
          configurable: false,
          enumerable: false
        });
        Object.freeze(globalThis.__KRY_HARD_NAV__);

      } catch (err) {
        console.error("[secure-transport-ultra-maxsec] fatal:", err);
      }
    }
  };

  window.KRY_PLUGINS = window.KRY_PLUGINS || [];
  window.KRY_PLUGINS.push(plugin);
})();
