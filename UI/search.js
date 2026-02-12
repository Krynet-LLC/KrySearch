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

function navigateSafe(url) {
  if (!url) return;
  if (typeof window.__KRY_HARD_NAV__ === 'function') {
    window.__KRY_HARD_NAV__(url);
  } else {
    location.assign(url);
  }
}

function buildSearchUrl(input, engineKey) {
  const engines = getAllEngines();
  const engine = engines[engineKey];
  if (!engine?.url || !engine.url.includes('{query}')) return null;

  const q = encodeURIComponent(input.trim());
  return engine.url.replace('{query}', q);
}

/* =========================
   PARAM ORDER ENFORCEMENT
========================= */
function enforceParamOrder(mode, value, engine) {
  const ordered = new URLSearchParams();

  if (mode === 'q') ordered.set('q', value);
  if (mode === 'url') ordered.set('url', value);

  ordered.set('engine', engine);

  const canonical = `${location.pathname}?${ordered.toString()}`;
  const current = `${location.pathname}${location.search}`;

  if (canonical !== current) {
    history.replaceState(null, '', canonical);
  }

  return ordered;
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
     ENGINE RESOLUTION
  ========================= */
  const engine =
    params.get('engine') && engines[params.get('engine')]
      ? params.get('engine')
      : defaultEngine;

  /* =========================
     MODE DETECTION
  ========================= */
  const hasUrl = params.has('url');
  const hasQuery = params.has('q');

  if (hasUrl) {
    const value = params.get('url');
    enforceParamOrder('url', value, engine);

    const normalized =
      value.startsWith('http') ? value : `https://${value}`;

    const target = buildSearchUrl(normalized, engine);
    if (target) navigateSafe(target);
    return;
  }

  if (hasQuery) {
    const value = params.get('q');
    enforceParamOrder('q', value, engine);

    const target = buildSearchUrl(value, engine);
    if (target) navigateSafe(target);
    return;
  }

  /* =========================
     UI MODE
  ========================= */
  populateEngineDropdown(engine);

  const input = document.getElementById('q');
  const goBtn = document.getElementById('go');
  const select = document.getElementById('engine');

  if (goBtn && input && select) {
    goBtn.addEventListener('click', () => {
      const q = input.value.trim();
      if (!q) return;

      const selectedEngine =
        engines[select.value] ? select.value : defaultEngine;

      const target = buildSearchUrl(q, selectedEngine);
      if (target) navigateSafe(target);
    });
  }
});
