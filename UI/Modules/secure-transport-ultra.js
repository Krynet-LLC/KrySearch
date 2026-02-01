/* SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (C) 2026 Krynet, LLC
 * https://github.com/Bloodware-Inc/KrySearch
 */
window.KRY_PLUGINS = window.KRY_PLUGINS || [];
window.KRY_PLUGINS.push({
  id: "secure-transport-ultra",
  order: 95,
  run() {
    try {
      const enc = new TextEncoder();
      const dec = new TextDecoder();
      const hasCrypto =
        window.crypto &&
        crypto.subtle &&
        typeof crypto.subtle.encrypt === "function";

      const delay = (min = 25, max = 140) =>
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

      async function seal(str) {
        if (!hasCrypto) return { plain: str };
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
        if (!hasCrypto || pkg.plain) return pkg.plain;
        const key = await sessionKeyPromise;
        const out = await crypto.subtle.decrypt(
          { name: "AES-GCM", iv: pkg.iv },
          key,
          pkg.data
        );
        return dec.decode(out);
      }

      function wipe(o) {
        if (!o) return;
        for (const k in o) if (o[k] instanceof Uint8Array) o[k].fill(0);
      }

      function isEngineURL(url) {
        try {
          const u = new URL(url, location.href);
          return u.searchParams.has("engine");
        } catch {
          return false;
        }
      }

      async function hardNavigate(url) {
        try {
          const sealed = await seal(url);
          await delay();
          const finalURL = await unseal(sealed);
          wipe(sealed);
          location.assign(finalURL);
        } catch {
          location.assign(url);
        }
      }

      const realAssign = location.assign.bind(location);
      const realReplace = location.replace.bind(location);

      location.assign = function(url) {
        return isEngineURL(url) ? hardNavigate(url) : realAssign(url);
      };

      location.replace = function(url) {
        return isEngineURL(url) ? hardNavigate(url) : realReplace(url);
      };

      // Safe location.href override
      try {
        Object.defineProperty(location, "href", {
          set(url) { isEngineURL(url) ? hardNavigate(url) : realAssign(url); },
          get() { return document.URL; },
          configurable: true
        });
      } catch {
        // fail silently if browser blocks it
      }

      // Click interception
      document.addEventListener("click", e => {
        const a = e.target.closest("a[href]");
        if (!a) return;
        if (isEngineURL(a.href)) {
          e.preventDefault();
          hardNavigate(a.href);
        }
      }, true);

      // Form interception
      document.addEventListener("submit", e => {
        const form = e.target;
        if (form && form.action && isEngineURL(form.action)) {
          e.preventDefault();
          hardNavigate(form.action);
        }
      }, true);

      // Mutation observer to catch dynamic links
      const observer = new MutationObserver(mutations => {
        for (const m of mutations) {
          for (const n of m.addedNodes) {
            if (n.nodeType !== 1) continue;

            if (n.tagName === "A" && isEngineURL(n.href)) {
              try { n.remove(); } catch {}
            }

            if (n.querySelectorAll) {
              try {
                n.querySelectorAll("a[href]").forEach(a => {
                  if (isEngineURL(a.href)) try { a.remove(); } catch {}
                });
              } catch {}
            }
          }
        }
      });

      observer.observe(document.documentElement, {
        childList: true,
        subtree: true
      });

      // Expose safe hard navigation function
      try {
        Object.defineProperty(window, "__KRY_HARD_NAV__", {
          value: hardNavigate,
          writable: false,
          configurable: false,
          enumerable: false
        });
      } catch {}

    } catch {
      // silent by design
    }
  }
});
