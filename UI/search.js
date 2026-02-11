/* SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (C) 2026 Krynet, LLC
 * https://github.com/Bloodware-Inc/KrySearch
 */
'use strict';

let CONFIG = null;

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

function runPlugins() {
  if (!Array.isArray(window.KRY_PLUGINS)) return;
  window.KRY_PLUGINS.slice()
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .forEach(p => {
      try { typeof p?.run === 'function' && p.run(window.KRY_CONTEXT); }
      catch (err) { console.error('[KrySearch] Plugin error:', err); }
    });
}

function populateEngineDropdown() {
  if (!CONFIG) return;
  const select = document.getElementById('engine');
  if (!select) return;

  select.textContent = '';
  const engines = { ...CONFIG.engines.open_source, ...CONFIG.engines.closed_source };

  Object.entries(engines).forEach(([key, eng]) => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = eng.name; // safe
    select.appendChild(opt);
  });

  const params = new URLSearchParams(location.search);
  const engineParam = params.get('engine') || CONFIG.search.defaultEngine;
  if (engineParam in engines) select.value = engineParam;
}

function sanitizeEngineUrl(url) {
  try {
    const u = new URL(url, location.origin);
    if (!/^https:\/\//i.test(u.href)) return null; // force HTTPS
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

function handleQuery(value, engineKey, isUrl) {
  if (!CONFIG || !value) return;

  value = value.trim();
  const engines = { ...CONFIG.engines.open_source, ...CONFIG.engines.closed_source };
  const engine = engines[engineKey] || engines[CONFIG.search.defaultEngine];
  if (!engine) return;

  let target = '';

  if (isUrl) {
    const prefixed = value.startsWith('http://') || value.startsWith('https://') ? value : 'https://' + value;
    target = sanitizeEngineUrl(prefixed);
    if (!target) return;
  } else {
    const query = encodeURIComponent(value);
    switch (engine.mode) {
      case 'direct':
        if (!engine.base) return;
        target = engine.base;
        if (engine.appendInput) {
          if (!target.endsWith('/') && !value.startsWith('/')) target += '/';
          target += value;
        }
        target = sanitizeEngineUrl(target);
        break;
      case 'query':
        if (!engine.url) return;
        const baseUrl = engine.url.includes('{query}') || engine.url.includes('%s')
          ? engine.url.replace('{query}', query).replace('%s', query)
          : engine.url + (engine.url.includes('?') ? '&' : '?') + 'q=' + query;
        target = sanitizeEngineUrl(baseUrl);
        break;
      default:
        return;
    }
    if (!target) return;
  }

  navigateSafe(target);
}

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

  const input = document.getElementById('q');
  const select = document.getElementById('engine');
  const params = new URLSearchParams(location.search);
  const engineKey = params.get('engine') || (CONFIG?.search.defaultEngine || 'startpage');

  const rawUrl = params.get('url');
  if (rawUrl) {
    handleQuery(rawUrl, engineKey, true);
    return;
  }

  const rawQuery = params.get('q');
  if (rawQuery && input) {
    input.value = rawQuery.replace(/[^\w\s-]/g, ''); // sanitize input for display only
    handleQuery(input.value, select?.value || engineKey, false);
  }

  const goBtn = document.getElementById('go');
  if (goBtn && input) {
    goBtn.addEventListener('click', () => handleQuery(input.value, select?.value || engineKey, false));
  }
});
