/* SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (C) 2026 Krynet, LLC
 * https://github.com/Bloodware-Inc/KrySearch
 *
 * ZK LibRedirect Advanced – Hardened Optimized
 * - Zero-knowledge, nocookie
 * - Dynamic mirrors w/ reputation filter
 * - Tor/I2P hardened
 * - Self-healing w/ config refresh
 * - XSS-safe & secure navigation
 */
(() => {
  "use strict";

  window.KRY_PLUGINS ??= [];

  window.KRY_PLUGINS.push({
    id: "zk-libredirect-advanced-hardened-optimized",
    description:
      "Zero-knowledge nocookie redirect with mirror validation, self-healing, Tor/I2P hardening, and XSS safety",

    config: Object.freeze({
      CONFIG_URL:
        "https://raw.githubusercontent.com/libredirect/browser_extension/refs/heads/master/src/config.json",
      REFRESH_INTERVAL_MS: 15 * 60_000,
      MIRROR_REPUTATION_MIN: 50,
      ENABLED: true,
      DEBUG: false
    }),

    async run() {
      if (!this.config.ENABLED) return;

      let redirectMap = {};

      /* ===== UTILITIES ===== */
      const randomItem = arr =>
        Array.isArray(arr) && arr.length ? arr[Math.floor(Math.random() * arr.length)] : null;

      const simpleReputation = host => {
        if (!host) return 0;
        let score = 100;
        if (/\.xyz$|\.top$|\.cf$/i.test(host)) score -= 50;
        if (host.length > 30) score -= 10;
        if (/^[0-9.]+$/.test(host)) score -= 20;
        return Math.max(0, score);
      };

      const validateMirror = async host => {
        if (!host) return false;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3_000);
        try {
          await fetch(`https://${host}/`, { method: "HEAD", mode: "no-cors", signal: controller.signal });
          return true;
        } catch { return false; }
        finally { clearTimeout(timeout); }
      };

      const isTorOrI2P = () => /TorBrowser|I2P/i.test(navigator.userAgent);

      /* ===== CONFIG LOADER ===== */
      const loadConfig = async () => {
        try {
          const res = await fetch(this.config.CONFIG_URL, { cache: "reload", credentials: "omit", referrerPolicy: "no-referrer" });
          if (!res.ok) throw new Error(res.status);
          const json = await res.json();
          const map = {};
          for (const [svc, def] of Object.entries(json.services || {})) {
            if (!def.targets || !def.frontends) continue;
            for (const domain of def.targets) {
              const mirrors = def.frontends
                .map(f => json.frontends?.[f]?.url)
                .filter(u => u).map(u => { try { return new URL(u).hostname } catch { return null } })
                .filter(Boolean);
              if (mirrors.length) map[domain] = { mirrors, service: svc };
            }
          }
          redirectMap = map;
          if (this.config.DEBUG) console.info("[ZK LibRedirect] Config loaded", redirectMap);
        } catch (err) {
          if (this.config.DEBUG) console.warn("[ZK LibRedirect] Config load failed", err);
        }
      };

      const rewriteURL = async raw => {
        try {
          const u = new URL(raw, location.origin);
          const entry = redirectMap[u.hostname];
          if (!entry) return u.href;

          let mirrors = entry.mirrors.filter(m => simpleReputation(m) >= this.config.MIRROR_REPUTATION_MIN);
          mirrors = (await Promise.all(mirrors.map(m => validateMirror(m).then(ok => ok ? m : null)))).filter(Boolean);
          if (!mirrors.length) return u.href;

          const mirror = randomItem(mirrors);
          u.hostname = mirror;
          u.protocol = "https:";
          return u.href;
        } catch { return location.href; }
      };

      const safeNavigate = url => {
        try {
          const u = new URL(url, location.origin);
          if (!["https:"].includes(u.protocol)) return;
          if (!redirectMap[u.hostname]) return;
          location.assign(u.href);
        } catch {}
      };

      /* ===== LINK INTERCEPTION ===== */
      document.addEventListener("click", async e => {
        try {
          const a = e.target.closest("a[href]");
          if (!a) return;
          const raw = a.getAttribute("href");
          if (!raw || /^#|^javascript:|^data:/i.test(raw)) return;

          e.preventDefault();
          e.stopImmediatePropagation();

          let target = await rewriteURL(raw);
          if (isTorOrI2P()) { target = new URL(target, location.origin); target.protocol = "https:"; target = target.href; }

          safeNavigate(target);
        } catch {}
      }, true);

      /* ===== URL PARAM HANDLING ===== */
      const handleURLParam = async () => {
        try {
          const params = new URLSearchParams(location.search);
          if (!params.has("url")) return;
          let target = await rewriteURL(params.get("url"));
          if (isTorOrI2P()) { target = new URL(target, location.origin); target.protocol = "https:"; target = target.href; }
          history.replaceState({}, "", location.pathname);
          safeNavigate(target);
        } catch {}
      };

      /* ===== SELF-HEALING LOOP ===== */
      const selfHeal = async () => {
        await loadConfig();
        await handleURLParam();
        if (this.config.DEBUG) console.info("[ZK LibRedirect] Self-heal complete");
      };

      await selfHeal();
      setInterval(selfHeal, this.config.REFRESH_INTERVAL_MS);
    }
  });
})();
