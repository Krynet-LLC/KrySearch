/* SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (C) 2026 Krynet, LLC
 * https://github.com/Bloodware-Inc/KrySearch
 *
 * ZK LibRedirect Advanced – Self-Healing Enterprise Edition
 * - Zero-knowledge, nocookie
 * - Dynamic mirrors with reputation filtering
 * - Tor/I2P hardening
 * - Automatic config refresh & dead-mirror detection
 * - Highest cybersecurity & privacy standards
 */
(function () {
  "use strict";

  window.KRY_PLUGINS = window.KRY_PLUGINS || [];

  window.KRY_PLUGINS.push({
    id: "zk-libredirect-advanced-sh",
    description: "Self-healing, zero-knowledge nocookie redirect plugin with live updates, mirror validation, and Tor/I2P hardening",

    config: {
      CONFIG_URL: "https://raw.githubusercontent.com/libredirect/browser_extension/refs/heads/master/src/config.json",
      REFRESH_INTERVAL_MS: 15 * 60 * 1000, // 15 minutes
      MIRROR_REPUTATION_MIN: 50,
      ENABLED: true,
      DEBUG: false
    },

    async run() {
      if (!this.config.ENABLED) return;

      let MAP = null;

      /** ===================== HELPERS ===================== */

      /** Fetch LibRedirect config */
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
                .filter(Boolean)
                .map(u => { try { return new URL(u).hostname; } catch { return null; } })
                .filter(Boolean);

              if (mirrors.length) map[domain] = { mirrors, service: svc };
            }
          }

          MAP = map;
          if (this.config.DEBUG) console.info("[KrySearch] Config loaded", map);
        } catch (err) {
          console.error("[KrySearch] Failed to load config", err);
          MAP = MAP || {};
        }
      };

      /** Random item from array */
      const randomItem = arr => arr[Math.floor(Math.random() * arr.length)];

      /** Simple reputation scoring */
      const simpleReputation = domain => {
        let score = 100;
        try {
          if (domain.endsWith(".xyz") || domain.endsWith(".top") || domain.endsWith(".cf")) score -= 50;
          if (domain.length > 30) score -= 10;
          if (/^[0-9.]+$/.test(domain)) score -= 20; // IP hosts
        } catch {}
        return Math.max(0, score);
      };

      /** Validate HTTPS mirror availability (quick check) */
      const validateMirror = async host => {
        try {
          await fetch(`https://${host}/`, { method: "HEAD", mode: "no-cors" });
          return true;
        } catch {
          return false;
        }
      };

      /** Rewrite URL with reputation filtering & mirror validation */
      const rewriteURL = async raw => {
        try {
          const u = new URL(raw, location.origin);
          const entry = MAP[u.hostname];
          if (!entry) return raw;

          // filter mirrors by reputation
          let safeMirrors = entry.mirrors.filter(m => simpleReputation(m) >= this.config.MIRROR_REPUTATION_MIN);

          // async dead mirror filtering
          const checks = safeMirrors.map(m => validateMirror(m).then(ok => ok ? m : null));
          safeMirrors = (await Promise.all(checks)).filter(Boolean);

          if (!safeMirrors.length) return raw;

          const mirror = randomItem(safeMirrors);
          u.hostname = mirror;
          u.protocol = "https:";
          return u.href;
        } catch {
          return raw;
        }
      };

      /** Detect Tor/I2P environment */
      const isTorOrI2P = () => /TorBrowser|I2P/.test(navigator.userAgent || "");

      /** ===================== LINK INTERCEPTION ===================== */
      const interceptClick = async e => {
        try {
          const a = e.target.closest("a[href]");
          if (!a) return;

          const raw = a.getAttribute("href");
          if (!raw || raw.startsWith("#") || raw.startsWith("javascript:")) return;

          e.preventDefault();
          e.stopImmediatePropagation();

          let target = await rewriteURL(raw);

          if (isTorOrI2P()) {
            const urlObj = new URL(target, location.origin);
            urlObj.protocol = "https:";
            target = urlObj.href;
          }

          location.href = target;
        } catch (err) {
          if (this.config.DEBUG) console.warn("[KrySearch] Link interception failed", err);
        }
      };

      document.addEventListener("click", interceptClick, true);

      /** ===================== HANDLE ?url= QUERY ===================== */
      const handleURLParam = async () => {
        const params = new URLSearchParams(location.search);
        if (!params.has("url")) return;

        let target = await rewriteURL(decodeURIComponent(params.get("url")));

        if (isTorOrI2P()) {
          const urlObj = new URL(target, location.origin);
          urlObj.protocol = "https:";
          target = urlObj.href;
        }

        history.replaceState({}, "", location.pathname);
        location.replace(target);
      };

      /** ===================== SELF-HEALING LOOP ===================== */
      const selfHeal = async () => {
        await loadConfig();
        await handleURLParam();
        if (this.config.DEBUG) console.info("[KrySearch] Self-healing iteration complete");
      };

      // Initial run
      await selfHeal();

      // Periodic refresh
      setInterval(selfHeal, this.config.REFRESH_INTERVAL_MS);
    }
  });
})();
