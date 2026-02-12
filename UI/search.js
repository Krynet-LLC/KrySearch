/* SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (C) 2026 Krynet, LLC
 * https://github.com/Bloodware-Inc/KrySearch
 */
'use strict';

let CONFIG = null;

/* =========================
   CONFIG LOADING
========================= */
async function loadConfig() {
  try {
    const res = await fetch('Config/config.json', { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    CONFIG = Object.freeze(await res.json());
  } catch (err) {
    console.error('[KrySearch] Failed to load config.json:', err);
    CONFIG = null;
  }
}

/* =========================
   PLUGIN RUNNER
========================= */
function runPlugins(context) {
  if (!Array.isArray(window.KRY_PLUGINS)) return;

  window.KRY_PLUGINS
    .slice()
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .forEach(p => {
      try {
        if (typeof p?.run === 'function') {
          p.run(context);
        }
      } catch (err) {
        console.error('[KrySearch] Plugin error:', err);
      }
    });
}

/* =========================
   ENGINE DROPDOWN
========================= */
function populateEngineDropdown() {
  if (!CONFIG) return;

  const select = document.getElementById('engine');
  if (!select) return;

  select.textContent = '';

  const engines = {
    ...CONFIG.engines.open_source,
    ...CONFIG.engines.closed_source
  };

  for (const [key, eng] of Object.entries(engines)) {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = eng.name;
    select.appendChild(opt);
  }

  const params = new URLSearchParams(location.search);
  const chosen =
    params.get('engine') ||
    CONFIG.search.defaultEngine;

  if (chosen in engines) {
    select.value = chosen;
  }
}

/* =========================
   SECURITY HELPERS
========================= */
function sanitizeHttpsUrl(url) {
  try {
    const u = new URL(url, location.origin);
    if (u.protocol !== 'https:') return null;
    return u.href;
  } catch {
    return null;
  }
}

function navigateSafe(url) {
  if (!url) return;

  if (typeof window.__KRY_HARD_NAV__ === 'function') {
    window.__KRY_HARD_NAV__(url);
  } else {
    location.assign(url);
  }
}

/* =========================
   SEARCH HANDLER (UI ONLY)
========================= */
function handleInput(query) {
  if (!CONFIG || !query) return;

  const engines = {
    ...CONFIG.engines.open_source,
    ...CONFIG.engines.closed_source
  };

  const engineKey =
    document.getElementById('engine')?.value ||
    CONFIG.search.defaultEngine;

  const engine = engines[engineKey] || engines[CONFIG.search.defaultEngine];
  if (!engine?.url) return;

  const q = encodeURIComponent(query.trim());

  const targetUrl = sanitizeHttpsUrl(
    engine.url.includes('{query}')
      ? engine.url.replace('{query}', q)
      : engine.url + (engine.url.includes('?') ? '&' : '?') + 'q=' + q
  );

  if (targetUrl) navigateSafe(targetUrl);
}

/* =========================
   DARK MODE
========================= */
function forceDarkMode() {
  document.documentElement.classList.add('dark-mode');
  document.body.style.background =
    CONFIG?.appearance?.colors?.secondary || '#1f1f1f';
  document.body.style.color = '#ffffff';
}

/* =========================
   BOOTSTRAP
========================= */
document.addEventListener('DOMContentLoaded', async () => {
  const KRY_CONTEXT = Object.freeze({
    ua: navigator.userAgent,
    lang: navigator.language,
    platform: navigator.platform,
    url: location.href
  });

  await loadConfig();
  forceDarkMode();
  populateEngineDropdown();
  runPlugins(KRY_CONTEXT);

  const status = document.getElementById('status');
  if (status) status.textContent = 'Private search mode';

  const input = document.getElementById('q');
  const goBtn = document.getElementById('go');
  const params = new URLSearchParams(location.search);

  /* =========================
     STRICT URL ROUTING
  ========================= */

  // ✅ DIRECT MODE — ONLY ?url=
  const rawUrl = params.get('url');
  if (rawUrl) {
    const candidate = sanitizeHttpsUrl(rawUrl.startsWith('http')
      ? rawUrl
      : `https://${rawUrl}`);

    if (candidate) navigateSafe(candidate);
    return;
  }

  // ✅ SEARCH MODE — ONLY ?q=
  const rawQuery = params.get('q');
  if (rawQuery && input && CONFIG) {
    input.value = rawQuery;

    const engines = {
      ...CONFIG.engines.open_source,
      ...CONFIG.engines.closed_source
    };

    const engineKey =
      params.get('engine') ||
      CONFIG.search.defaultEngine;

    const engine = engines[engineKey] || engines[CONFIG.search.defaultEngine];
    if (!engine?.url) return;

    const q = encodeURIComponent(rawQuery.trim());

    const targetUrl = sanitizeHttpsUrl(
      engine.url.includes('{query}')
        ? engine.url.replace('{query}', q)
        : engine.url + (engine.url.includes('?') ? '&' : '?') + 'q=' + q
    );

    if (targetUrl) navigateSafe(targetUrl);
    return;
  }

  /* =========================
     UI EVENTS
  ========================= */
  if (goBtn && input) {
    goBtn.addEventListener('click', () => {
      if (!input.value.trim()) return;
      handleInput(input.value);
    });
  }
});
