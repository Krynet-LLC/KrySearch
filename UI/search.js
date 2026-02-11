/* SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (C) 2026 Krynet, LLC
 * https://github.com/Bloodware-Inc/KrySearch
 */
'use strict';

/**
 * @typedef {Object} Engine
 * @property {string} name
 * @property {'direct'|'query'} mode
 * @property {string} [base]
 * @property {string} [url]
 * @property {boolean} [appendInput]
 */

/** @type {any} */
let CONFIG = null;

/**
 * Load external config.json
 */
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

/**
 * Run all registered plugins safely
 */
function runPlugins() {
  if (!Array.isArray(window.KRY_PLUGINS)) return;
  window.KRY_PLUGINS.slice()
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .forEach(p => {
      try {
        if (typeof p?.run === 'function') p.run(window.KRY_CONTEXT);
      } catch (err) {
        console.error('[KrySearch] Plugin error:', err);
      }
    });
}

/**
 * Populate engine dropdown
 */
function populateEngineDropdown() {
  if (!CONFIG) return;
  const select = document.getElementById('engine');
  if (!select) return;

  select.innerHTML = '';
  const engines = { ...CONFIG.engines.open_source, ...CONFIG.engines.closed_source };

  Object.entries(engines).forEach(([key, eng]) => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = eng.name;
    select.appendChild(opt);
  });

  // Set default selection
  const params = new URLSearchParams(location.search);
  const engineParam = params.get('engine') || CONFIG.search.defaultEngine;
  if (engineParam in engines) select.value = engineParam;
}

/**
 * Navigate safely
 * @param {string} url 
 */
function navigate(url) {
  if (!url) return;
  if (typeof window.__KRY_HARD_NAV__ === 'function') {
    window.__KRY_HARD_NAV__(url);
  } else {
    location.assign(url);
  }
}

/**
 * Handle query or URL
 * @param {string} value 
 * @param {string} engineKey 
 * @param {boolean} isUrl 
 */
function handleQuery(value, engineKey, isUrl) {
  if (!CONFIG || !value) return;

  value = value.trim();
  if (/^http:\/\//i.test(value)) {
    console.warn('[KrySearch] Blocked insecure HTTP URL');
    return;
  }

  const engines = { ...CONFIG.engines.open_source, ...CONFIG.engines.closed_source };
  const engine = engines[engineKey] || engines[CONFIG.search.defaultEngine];
  if (!engine) return;

  let target = '';

  if (isUrl) {
    // Direct URL
    target = value.startsWith('http://') || value.startsWith('https://') ? value : 'https://' + value;
  } else {
    // Query mode
    const query = encodeURIComponent(value);
    switch (engine.mode) {
      case 'direct':
        if (!engine.base) return;
        target = engine.base;
        if (engine.appendInput) {
          if (!target.endsWith('/') && !value.startsWith('/')) target += '/';
          target += value;
        }
        break;
      case 'query':
        if (!engine.url) return;
        if (engine.url.includes('{query}') || engine.url.includes('%s')) {
          target = engine.url.replace('{query}', query).replace('%s', query);
        } else {
          // Safe fallback: append ?q=
          target = engine.url + (engine.url.includes('?') ? '&' : '?') + 'q=' + query;
        }
        break;
      default:
        console.warn('[KrySearch] Unknown engine mode:', engine.mode);
        return;
    }
  }

  // Enforce HTTPS
  if (!/^https:\/\//i.test(target)) {
    console.error('[KrySearch] Only HTTPS URLs are allowed.');
    return;
  }

  navigate(target);
}

/**
 * Initialize DOM and handle URL params
 */
document.addEventListener('DOMContentLoaded', async () => {
  window.KRY_CONTEXT = Object.freeze({
    ua: navigator.userAgent,
    lang: navigator.language,
    platform: navigator.platform,
    url: location.href
  });

  await loadConfig();
  runPlugins();
  populateEngineDropdown();

  const status = document.getElementById('status');
  if (status) status.textContent = 'Private search mode';

  const input = /** @type {HTMLInputElement|null} */ (document.getElementById('q'));
  const select = /** @type {HTMLSelectElement|null} */ (document.getElementById('engine'));
  const params = new URLSearchParams(location.search);
  const engineKey = params.get('engine') || (CONFIG?.search.defaultEngine || 'startpage');

  // Handle ?url=
  const rawUrl = params.get('url');
  if (rawUrl) {
    try {
      handleQuery(decodeURIComponent(rawUrl), engineKey, true);
    } catch (err) {
      console.error('[KrySearch] Failed to handle URL param:', err);
    }
    return;
  }

  // Handle ?q=
  const rawQuery = params.get('q');
  if (rawQuery && input) {
    try {
      input.value = decodeURIComponent(rawQuery);
      handleQuery(input.value, select?.value || engineKey, false);
    } catch (err) {
      console.error('[KrySearch] Failed to handle query param:', err);
    }
  }

  // Go button
  const goBtn = document.getElementById('go');
  if (goBtn) {
    goBtn.addEventListener('click', () => {
      if (!input) return;
      handleQuery(input.value, select?.value || engineKey, false);
    });
  }
});
