/* SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (C) 2026 Krynet, LLC
 * https://github.com/Bloodware-Inc/KrySearch
 */
'use strict';

let CONFIG = null;

// Load config.json
async function loadConfig() {
  try {
    const res = await fetch('Config/config.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    CONFIG = await res.json();
  } catch (err) {
    console.error('[KrySearch] Failed to load config.json:', err);
    CONFIG = null;
  }
}

// Run external plugins
function runPlugins() {
  if (!Array.isArray(window.KRY_PLUGINS)) return;
  window.KRY_PLUGINS.slice()
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .forEach(p => {
      try { typeof p?.run === 'function' && p.run(window.KRY_CONTEXT); }
      catch (err) { console.error('[KrySearch] Plugin error:', err); }
    });
}

// Populate search engine dropdown
function populateEngineDropdown() {
  if (!CONFIG) return;
  const select = document.getElementById('engine');
  if (!select) return;

  select.textContent = '';
  const engines = { ...CONFIG.engines.open_source, ...CONFIG.engines.closed_source };
  Object.entries(engines).forEach(([key, eng]) => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = eng.name;
    select.appendChild(opt);
  });

  const params = new URLSearchParams(location.search);
  const engineParam = params.get('engine') || CONFIG.search.defaultEngine;
  if (engineParam in engines) select.value = engineParam;
}

// Ensure URL is HTTPS
function sanitizeEngineUrl(url) {
  try {
    const u = new URL(url, location.origin);
    if (!/^https:\/\//i.test(u.href)) return null; // force HTTPS
    return u.href;
  } catch {
    return null;
  }
}

// Navigate safely
function navigateSafe(url) {
  if (!url) return;
  if (typeof window.__KRY_HARD_NAV__ === 'function') {
    window.__KRY_HARD_NAV__(url);
  } else {
    location.assign(url);
  }
}

// Handle input (search query or direct URL)
function handleInput(query, directUrl) {
  if (!CONFIG) return;
  const engines = { ...CONFIG.engines.open_source, ...CONFIG.engines.closed_source };
  const engineKey = document.getElementById('engine')?.value || CONFIG.search.defaultEngine;
  const engine = engines[engineKey] || engines[CONFIG.search.defaultEngine];

  let target = '';

  if (directUrl) {
    const prefixed = directUrl.startsWith('http://') || directUrl.startsWith('https://') ? directUrl : 'https://' + directUrl;
    target = sanitizeEngineUrl(prefixed);
  } else if (query) {
    const q = encodeURIComponent(query.trim());
    switch (engine.mode) {
      case 'direct':
        target = engine.base;
        if (engine.appendInput) {
          if (!target.endsWith('/') && !query.startsWith('/')) target += '/';
          target += query;
        }
        target = sanitizeEngineUrl(target);
        break;
      case 'query':
        if (!engine.url) return;
        target = engine.url.includes('{query}') 
          ? engine.url.replace('{query}', q)
          : engine.url + (engine.url.includes('?') ? '&' : '?') + 'q=' + q;
        target = sanitizeEngineUrl(target);
        break;
      default: return;
    }
  }

  if (target) navigateSafe(target);
}

// Force dark mode
function forceDarkMode() {
  document.documentElement.classList.add('dark-mode');
  document.body.style.background = CONFIG?.appearance?.colors?.secondary || '#1f1f1f';
  document.body.style.color = '#fff';
}

document.addEventListener('DOMContentLoaded', async () => {
  window.KRY_CONTEXT = Object.freeze({
    ua: navigator.userAgent,
    lang: navigator.language,
    platform: navigator.platform,
    url: location.href
  });

  forceDarkMode();
  await loadConfig();
  runPlugins();
  populateEngineDropdown();

  const status = document.getElementById('status');
  if (status) status.textContent = 'Private search mode';

  const input = document.getElementById('q');
  const goBtn = document.getElementById('go');
  const params = new URLSearchParams(location.search);

  // Direct URL navigation
  const rawUrl = params.get('url');
  if (rawUrl) {
    handleInput(null, rawUrl);
    return;
  }

  // Search query
  const rawQuery = params.get('q');
  if (rawQuery && input) {
    input.value = rawQuery;
    handleInput(rawQuery, null);
  }

  // Go button click
  if (goBtn && input) {
    goBtn.addEventListener('click', () => {
      if (!input.value.trim()) return;
      handleInput(input.value, null);
    });
  }
});
