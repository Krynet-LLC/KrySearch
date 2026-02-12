/* SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (C) 2026 Krynet, LLC
 * https://github.com/Bloodware-Inc/KrySearch
 */
'use strict';

let CONFIG = null;

/* =========================
   CONFIG
========================= */
async function loadConfig() {
  try {
    const res = await fetch('Config/config.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    CONFIG = Object.freeze(await res.json());
  } catch (err) {
    console.error('[KrySearch] Config load failed:', err);
    CONFIG = null;
  }
}

/* =========================
   PLUGINS
========================= */
function runPlugins(ctx) {
  if (!Array.isArray(window.KRY_PLUGINS)) return;

  window.KRY_PLUGINS
    .slice()
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .forEach(p => {
      try {
        if (typeof p?.run === 'function') p.run(ctx);
      } catch (e) {
        console.error('[KrySearch] Plugin error:', e);
      }
    });
}

/* =========================
   HELPERS
========================= */
function getAllEngines() {
  return {
    ...CONFIG.engines.open_source,
    ...CONFIG.engines.closed_source
  };
}

function sanitizeHttpsUrl(url) {
  try {
    const u = new URL(url, location.origin);
    return u.protocol === 'https:' ? u.href : null;
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
   UI
========================= */
function populateEngineDropdown(activeEngine) {
  const select = document.getElementById('engine');
  if (!select || !CONFIG) return;

  select.textContent = '';

  const engines = getAllEngines();
  for (const [key, eng] of Object.entries(engines)) {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = eng.name;
    select.appendChild(opt);
  }

  select.value = activeEngine;
}

function forceDarkMode() {
  document.documentElement.classList.add('dark-mode');
  document.body.style.background =
    CONFIG?.appearance?.colors?.secondary || '#1f1f1f';
  document.body.style.color = '#fff';
}

/* =========================
   SEARCH ROUTER
========================= */
function buildSearchUrl(query, engineKey) {
  const engines = getAllEngines();
  const engine = engines[engineKey];
  if (!engine?.url) return null;

  const q = encodeURIComponent(query.trim());
  const url = engine.url.includes('{query}')
    ? engine.url.replace('{query}', q)
    : engine.url + (engine.url.includes('?') ? '&' : '?') + 'q=' + q;

  return sanitizeHttpsUrl(url);
}

/* =========================
   BOOTSTRAP
========================= */
document.addEventListener('DOMContentLoaded', async () => {
  await loadConfig();
  if (!CONFIG) return;

  forceDarkMode();

  const ctx = Object.freeze({
    ua: navigator.userAgent,
    lang: navigator.language,
    platform: navigator.platform,
    url: location.href
  });

  runPlugins(ctx);

  const params = new URLSearchParams(location.search);
  const engines = getAllEngines();
  const defaultEngine = CONFIG.search.defaultEngine;

  /* =========================
     DIRECT MODE — ?url=
  ========================= */
  const rawUrl = params.get('url');
  if (rawUrl) {
    const candidate = sanitizeHttpsUrl(
      rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`
    );
    if (candidate) navigateSafe(candidate);
    return;
  }

  /* =========================
     ENGINE RESOLUTION
  ========================= */
  let engine =
    params.get('engine') && engines[params.get('engine')]
      ? params.get('engine')
      : defaultEngine;

  /* If engine missing → canonicalize URL */
  if (!params.get('engine')) {
    params.set('engine', engine);
    history.replaceState(
      null,
      '',
      `${location.pathname}?${params.toString()}`
    );
  }

  populateEngineDropdown(engine);

  /* =========================
     SEARCH MODE — ?q=
  ========================= */
  const rawQuery = params.get('q');
  if (rawQuery) {
    const target = buildSearchUrl(rawQuery, engine);
    if (target) navigateSafe(target);
    return;
  }

  /* =========================
     UI EVENTS
  ========================= */
  const input = document.getElementById('q');
  const goBtn = document.getElementById('go');
  const select = document.getElementById('engine');

  if (goBtn && input && select) {
    goBtn.addEventListener('click', () => {
      const q = input.value.trim();
      if (!q) return;

      const selectedEngine = select.value || defaultEngine;
      const target = buildSearchUrl(q, selectedEngine);
      if (target) navigateSafe(target);
    });
  }
});
