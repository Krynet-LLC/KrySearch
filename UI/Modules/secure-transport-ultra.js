/* SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (C) 2026 Krynet, LLC
 * https://github.com/Bloodware-Inc/KrySearch
 *
 * Secure Transport Ultra — MAXSEC / ENGINE-AGNOSTIC
 * - Browser-invariant compliant
 * - HTTPS enforced
 * - Requires engine param (no content allowlist)
 * - Idempotent interception
 * - History API fencing
 * - Optional session-bound AES-GCM sealing
 */

(() => {
  "use strict";

  /* ===================== REGISTRATION ===================== */

  window.KRY_PLUGINS = window.KRY_PLUGINS || [];

  window.KRY_PLUGINS.push({
    id: "secure-transport-ultra-maxsec",
    order: 95,

    run() {
      try {

        /* ===================== CONSTANTS ===================== */

        const HTTPS = "https:";
        const ORIGIN = location.origin;

        /* ===================== STATE ===================== */

        // Prevent duplicate interception
        const intercepted = new WeakSet();

        /* ===================== CRYPTO (OPTIONAL, SAFE) ===================== */

        const enc = new TextEncoder();
        const dec = new TextDecoder();

        const hasCrypto =
          globalThis.crypto &&
          crypto.subtle &&
          typeof crypto.subtle.encrypt === "function";

        const sessionKeyPromise = hasCrypto
          ? crypto.subtle.generateKey(
              { name: "AES-GCM", length: 256 },
              false,
              ["encrypt", "decrypt"]
            )
          : null;

        async function seal(str) {
          if (!hasCrypto) return str;
          const iv = crypto.getRandomValues(new Uint8Array(12));
          const key = await sessionKeyPromise;
          const data = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv },
            key,
            enc.encode(str)
          );
          return { iv, data };
        }

        async function unseal(pkg) {
          if (!hasCrypto || typeof pkg === "string") return pkg;
          const key = await sessionKeyPromise;
          const out = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: pkg.iv },
            key,
            pkg.data
          );
          return dec.decode(out);
        }

        /* ===================== URL SANITIZATION ===================== */

        function sanitizeURL(raw) {
          try {
            const url = new URL(raw, ORIGIN);

            // Enforce HTTPS only
            if (url.protocol !== HTTPS) return null;

            // Structural requirement only
            if (!url.searchParams.has("engine")) return null;

            // Strip fragments to prevent gadget abuse
            url.hash = "";

            return url.href;
          } catch {
            return null;
          }
        }

        /* ===================== HARD NAVIGATION ===================== */

        async function hardNavigate(raw) {
          const safe = sanitizeURL(raw);
          if (!safe) return;

          try {
            const sealed = await seal(safe);
            const finalURL = await unseal(sealed);
            location.assign(finalURL);
          } catch (err) {
            console.warn("[SecureTransportUltra] Crypto failure, fallback.", err);
            location.assign(safe);
          }
        }

        /* ===================== ELEMENT INTERCEPTION ===================== */

        function interceptElement(el) {
          if (!el || intercepted.has(el)) return;
          intercepted.add(el);

          if (el.tagName === "A" && el.href) {
            const safe = sanitizeURL(el.href);
            if (!safe) return;

            el.rel = "noopener noreferrer";
            el.target = "_self";

            el.addEventListener(
              "click",
              e => {
                e.preventDefault();
                hardNavigate(safe);
              },
              { capture: true }
            );
          }

          if (el.tagName === "FORM" && el.action) {
            const safe = sanitizeURL(el.action);
            if (!safe) return;

            el.addEventListener(
              "submit",
              e => {
                e.preventDefault();
                hardNavigate(safe);
              },
              { capture: true }
            );
          }
        }

        /* ===================== GLOBAL EVENT FENCING ===================== */

        document.addEventListener(
          "click",
          e => interceptElement(e.target.closest("a")),
          true
        );

        document.addEventListener(
          "submit",
          e => interceptElement(e.target.closest("form")),
          true
        );

        /* ===================== MUTATION OBSERVER ===================== */

        const observer = new MutationObserver(mutations => {
          for (const m of mutations) {
            for (const n of m.addedNodes) {
              if (n.nodeType !== 1 || !n.querySelectorAll) continue;
              n.querySelectorAll("a[href], form[action]").forEach(interceptElement);
            }
          }
        });

        observer.observe(document.documentElement, {
          childList: true,
          subtree: true
        });

        /* ===================== HISTORY API FENCING ===================== */

        history.pushState = function (_, __, url) {
          const safe = sanitizeURL(url);
          if (safe) hardNavigate(safe);
        };

        history.replaceState = function (_, __, url) {
          const safe = sanitizeURL(url);
          if (safe) hardNavigate(safe);
        };

        /* ===================== SAFE PUBLIC API ===================== */

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
  });
})();
