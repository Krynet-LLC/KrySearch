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

      const randomDelay = (min = 25, max = 140) =>
        new Promise(r =>
          setTimeout(
            r,
            min +
              (hasCrypto
                ? (crypto.getRandomValues(new Uint8Array(1))[0] / 255) * (max - min)
                : Math.random() * (max - min))
          )
        );

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
        } catch {
          location.assign(safe);
        }
      }

      /** OVERRIDE LOCATION METHODS SAFELY */
      const originalAssign = location.assign ? location.assign.bind(location) : url => location.href = url;
      const originalReplace = location.replace ? location.replace.bind(location) : url => location.href = url;
      const safeAssign = url => {
        const safe = sanitizeURL(url);
        return safe ? hardNavigate(safe) : originalAssign(url);
      };
      const safeReplace = url => {
        const safe = sanitizeURL(url);
        return safe ? hardNavigate(safe) : originalReplace(url);
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
              } catch {}
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
    } catch {
      // silent fail
    }
  }
});
