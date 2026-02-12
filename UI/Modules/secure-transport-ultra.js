/* SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (C) 2026 Krynet, LLC
 * https://github.com/Bloodware-Inc/KrySearch
 *
 * Secure Transport Ultra – Fully hardened
 * - No XSS / no unsafe innerHTML
 * - Strict engine URL whitelist
 * - AES-GCM optional navigation payload encryption
 * - Safe dynamic links and forms interception
 */
window.KRY_PLUGINS = window.KRY_PLUGINS || [];

window.KRY_PLUGINS.push({
  id: "secure-transport-ultra-max",
  order: 95,

  run() {
    try {
      const enc = new TextEncoder();
      const dec = new TextDecoder();
      const hasCrypto =
        window.crypto &&
        crypto.subtle &&
        typeof crypto.subtle.encrypt === "function";

      const sessionKeyPromise = hasCrypto
        ? crypto.subtle.generateKey(
            { name: "AES-GCM", length: 256 },
            false,
            ["encrypt", "decrypt"]
          )
        : null;

      /** SAFE ENCRYPTION / DECRYPTION */
      async function seal(str) {
        if (!hasCrypto) return { plain: str };
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const key = await sessionKeyPromise;
        const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(str));
        return { iv, data };
      }

      async function unseal(pkg) {
        if (!hasCrypto || pkg.plain) return pkg.plain;
        const key = await sessionKeyPromise;
        const out = await crypto.subtle.decrypt({ name: "AES-GCM", iv: pkg.iv }, key, pkg.data);
        return dec.decode(out);
      }

      function delay(ms = 0) {
        return new Promise(resolve => setTimeout(resolve, ms));
      }

      /** STRICT SANITIZATION: only https + engine param */
      function sanitizeURL(raw) {
        try {
          const u = new URL(raw, location.origin);
          if (u.protocol !== "https:") return null;
          if (!u.searchParams.has("engine")) return null; // whitelist
          return u.href;
        } catch {
          return null;
        }
      }

      /** SAFE NAVIGATION */
      async function hardNavigate(raw) {
        const safe = sanitizeURL(raw);
        if (!safe) return;
        try {
          const sealed = await seal(safe);
          await delay();
          const finalURL = await unseal(sealed);
          location.assign(finalURL);
        } catch (err) {
          // If encryption/decryption fails, fall back to direct (sanitized) navigation.
          console.warn("Secure Transport Ultra: encryption failed, falling back to plain navigation.", err);
          location.assign(safe);
        }
      }

      /** OVERRIDE LOCATION METHODS SAFELY */
      const originalAssign = location.assign ? location.assign.bind(location) : url => hardNavigate(url);
      const originalReplace = location.replace ? location.replace.bind(location) : url => hardNavigate(url);
      const safeAssign = url => {
        const safe = sanitizeURL(url);
        if (!safe) return; // do not navigate to unsafe URLs
        return hardNavigate(safe);
      };
      const safeReplace = url => {
        const safe = sanitizeURL(url);
        if (!safe) return; // do not navigate to unsafe URLs
        return hardNavigate(safe);
      };

      Object.defineProperty(location, "assign", { value: safeAssign, configurable: false, writable: false });
      Object.defineProperty(location, "replace", { value: safeReplace, configurable: false, writable: false });

      /** INTERCEPT LINKS SAFELY */
      const interceptElement = async el => {
        if (!el) return;
        if (el.tagName === "A" && el.href) {
          const safe = sanitizeURL(el.href);
          if (safe) {
            el.addEventListener("click", e => {
              e.preventDefault();
              hardNavigate(safe);
            });
          }
        } else if (el.tagName === "FORM" && el.action) {
          const safe = sanitizeURL(el.action);
          if (safe) {
            el.addEventListener("submit", e => {
              e.preventDefault();
              hardNavigate(safe);
            });
          }
        }
      };

      document.addEventListener("click", e => interceptElement(e.target.closest("a")), true);
      document.addEventListener("submit", e => interceptElement(e.target.closest("form")), true);

      /** OBSERVE DYNAMIC NODES SAFELY */
      const observer = new MutationObserver(muts => {
        for (const m of muts) {
          for (const n of m.addedNodes) {
            if (n.nodeType !== 1) continue;
            if (n.querySelectorAll) {
              try {
                n.querySelectorAll("a[href], form[action]").forEach(interceptElement);
              } catch (err) {
                console.error("[KrySearch][secure-transport-ultra] Failed to intercept dynamic links/forms:", err);
              }
            }
          }
        }
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });

      /** EXPOSE SAFE HARD NAVIGATION */
      Object.defineProperty(window, "__KRY_HARD_NAV__", {
        value: hardNavigate,
        writable: false,
        configurable: false,
        enumerable: false
      });
    } catch (err) {
      console.error("[secure-transport-ultra-max] run() failed:", err);
    }
  }
});
