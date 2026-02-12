/* SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (C) 2026 Krynet, LLC
 * https://github.com/Bloodware-Inc/KrySearch
 *
 * ZK LibRedirect Advanced – Hardened Enterprise Edition
 * - Zero-knowledge, nocookie
 * - Dynamic mirrors with reputation filtering
 * - Tor/I2P hardening
 * - Self-healing with safe periodic config refresh
 * - Fully safe from client-side XSS and unsafe navigation
 */
(function () {
  "use strict";

  window.KRY_PLUGINS = window.KRY_PLUGINS || [];

  window.KRY_PLUGINS.push({
    id: "zk-libredirect-advanced-hardened-xss",
    description:
      "Self-healing, zero-knowledge nocookie redirect plugin with live updates, mirror validation, and Tor/I2P hardening, XSS safe",

    config: Object.freeze({
      CONFIG_URL: "https://raw.githubusercontent.com/libredirect/browser_extension/refs/heads/master/src/config.json",
      REFRESH_INTERVAL_MS: 15 * 60 * 1000, // 15 minutes
      MIRROR_REPUTATION_MIN: 50,
      ENABLED: true,
      DEBUG: false
    }),

    async run() {
      if (!this.config.ENABLED) return;

      let redirectMap = {};

      /** ===================== HELPERS ===================== */

      const loadConfig = async () => {
        try {
          const res = await fetch(this.config.CONFIG_URL, {
            cache: "force-cache",
            credentials: "omit",
            referrerPolicy: "no-referrer"
          });
          if (!res.ok) throw new Error(`Failed to fetch config: ${res.status}`);
          const json = await res.json();
          const { frontends = {}, services = {} } = json;
          const map = {};

          for (const [svc, def] of Object.entries(services)) {
            if (!def.targets || !def.frontends) continue;
            for (const domain of def.targets) {
              const mirrors = def.frontends
                .map(f => frontends[f]?.url)
                .filter(u => typeof u === "string")
                .map(u => { try { return new URL(u).hostname; } catch { return null; } })
                .filter(Boolean);
              if (mirrors.length) map[domain] = { mirrors, service: svc };
            }
          }

          redirectMap = map;
          if (this.config.DEBUG) console.info("[KrySearch] Config loaded", redirectMap);
        } catch (err) {
          if (this.config.DEBUG) console.error("[KrySearch] Failed to load config", err);
        }
      };

      const randomItem = arr => Array.isArray(arr) && arr.length ? arr[Math.floor(Math.random() * arr.length)] : null;

      const simpleReputation = domain => {
        let score = 100;
        if (!domain || typeof domain !== "string") return 0;
        try {
          if (domain.endsWith(".xyz") || domain.endsWith(".top") || domain.endsWith(".cf")) score -= 50;
          if (domain.length > 30) score -= 10;
          if (/^[0-9.]+$/.test(domain)) score -= 20; // IP hosts
        } catch {}
        return Math.max(0, score);
      };

      const validateMirror = async host => {
        if (!host) return false;
        const TIMEOUT_MS = 3000;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, TIMEOUT_MS);
        try {
          await fetch(`https://${host}/`, {
            method: "HEAD",
            mode: "no-cors",
            signal: controller.signal
          });
          return true;
        } catch {
          return false;
        } finally {
          clearTimeout(timeoutId);
        }
      };

      const rewriteURL = async raw => {
        try {
          const u = new URL(raw, location.origin);
          const entry = redirectMap[u.hostname];
          if (!entry) return u.href;

          let safeMirrors = entry.mirrors.filter(m => simpleReputation(m) >= this.config.MIRROR_REPUTATION_MIN);
          safeMirrors = (await Promise.all(safeMirrors.map(m => validateMirror(m).then(ok => ok ? m : null)))).filter(Boolean);
          if (!safeMirrors.length) return u.href;

          const mirror = randomItem(safeMirrors);
          if (!mirror) return u.href;

          u.hostname = mirror;
          u.protocol = "https:";
          return u.href;
        } catch { return location.href; }
      };

      const isTorOrI2P = () => /TorBrowser|I2P/.test(navigator.userAgent || "");

      /** ===================== SAFE NAVIGATION ===================== */
      const safeNavigate = url => {
        try {
          const u = new URL(url, location.origin);
          if (!["https:"].includes(u.protocol)) return;
          if (!redirectMap[u.hostname]) return; // whitelist enforcement
          location.assign(u.href);
        } catch {}
      };

      /** ===================== LINK INTERCEPTION ===================== */
      const interceptClick = async e => {
        try {
          const a = e.target.closest("a[href]");
          if (!a) return;
          const raw = a.getAttribute("href");
          if (!raw || /^#|^javascript:|^data:/i.test(raw)) return;

          e.preventDefault();
          e.stopImmediatePropagation();

          let target = await rewriteURL(raw);
          if (isTorOrI2P()) {
            const u = new URL(target, location.origin);
            u.protocol = "https:";
            target = u.href;
          }

          safeNavigate(target);
        } catch (err) {
          if (this.config.DEBUG) console.warn("[KrySearch] Link interception failed", err);
        }
      };

      document.addEventListener("click", interceptClick, true);

      /** ===================== HANDLE ?url= QUERY ===================== */
      const handleURLParam = async () => {
        try {
          const params = new URLSearchParams(location.search);
          if (!params.has("url")) return;

          const raw = params.get("url");
          if (!raw) return;

          let urlObj;
          try { urlObj = new URL(raw, location.origin); } catch { return; }

          if (!redirectMap[urlObj.hostname]) return;

          let target = await rewriteURL(urlObj.href);
          if (isTorOrI2P()) {
            const u = new URL(target, location.origin);
            u.protocol = "https:";
            target = u.href;
          }

          history.replaceState({}, "", location.pathname);
          safeNavigate(target);
        } catch (err) {
          if (this.config.DEBUG) console.warn("[KrySearch] URL param handling failed", err);
        }
      };

      /** ===================== SELF-HEALING LOOP ===================== */
      const selfHeal = async () => {
        await loadConfig();
        await handleURLParam();
        if (this.config.DEBUG) console.info("[KrySearch] Self-healing iteration complete");
      };

      await selfHeal();
      setInterval(selfHeal, this.config.REFRESH_INTERVAL_MS);
    }
  });
})();
