/* SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (C) 2026 Krynet, LLC
 */
'use strict';

let CONFIG = null;

// Load JSON config
const loadConfig = async () => {
  try {
    const res = await fetch('Config/config.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    CONFIG = await res.json();
  } catch (err) {
    console.error('[KrySearch] Failed to load config.json:', err);
    CONFIG = null;
  }
};

// Run plugins if any
const runPlugins = () => {
  if (!Array.isArray(window.KRY_PLUGINS)) return;
  window.KRY_PLUGINS
    .slice()
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .forEach(p => {
      try { typeof p?.run === 'function' && p.run(window.KRY_CONTEXT); } 
      catch (err) { console.error('[KrySearch] Plugin error:', err); }
    });
};

// Populate engine dropdown
const populateEngineDropdown = () => {
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
};

// Sanitize URL
const sanitizeUrl = url => {
  try {
    const u = new URL(url, location.origin);
    return /^https:\/\//i.test(u.href) ? u.href : null;
  } catch {
    return null;
  }
};

// Build search engine URL
const buildSearchUrl = (query, engine) => {
  if (!engine) return null;
  const encodedQuery = encodeURIComponent(query.trim());
  let target = '';

  switch(engine.mode) {
    case 'query':
      target = engine.url?.replace('{query}', encodedQuery).replace('%s', encodedQuery);
      if(!target) target = engine.base + '?q=' + encodedQuery;
      break;
    case 'direct':
      target = engine.base || '';
      if(engine.appendInput) target += (!target.endsWith('/') && !query.startsWith('/') ? '/' : '') + query.trim();
      break;
    default:
      return null;
  }

  return sanitizeUrl(target);
};

// Navigate safely
const navigateSafe = url => {
  if (!url) return;
  if(typeof window.__KRY_HARD_NAV__ === 'function') window.__KRY_HARD_NAV__(url);
  else location.assign(url);
};

// Handle query / URL
const handleQuery = (value, engineKey, isUrl=false) => {
  if(!CONFIG || !value) return;
  const engines = { ...CONFIG.engines.open_source, ...CONFIG.engines.closed_source };
  const engine = engines[engineKey] || engines[CONFIG.search.defaultEngine];
  if(!engine) return;

  let target = isUrl 
    ? sanitizeUrl(value.startsWith('http://') || value.startsWith('https://') ? value : 'https://' + value)
    : buildSearchUrl(value, engine);

  if(!target) return;
  navigateSafe(target);
};

// Init
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

  const input = document.getElementById('q');
  const select = document.getElementById('engine');
  const status = document.getElementById('status');
  if(status) status.textContent = 'Private search mode';

  const params = new URLSearchParams(location.search);
  const engineKey = params.get('engine') || (CONFIG?.search.defaultEngine || 'startpage');

  // Direct URL navigation ?url=
  const urlParam = params.get('url');
  if(urlParam) { handleQuery(urlParam, engineKey, true); return; }

  // Search query ?q=
  const queryParam = params.get('q');
  if(queryParam && input) {
    input.value = queryParam.replace(/[^\w\s-]/g, ''); // sanitize for display
    handleQuery(input.value, select?.value||engineKey, false);
  }

  // Go button
  document.getElementById('go')?.addEventListener('click', () => handleQuery(input.value, select?.value||engineKey, false));

  // Enter key submits
  input?.addEventListener('keypress', e => { if(e.key === 'Enter') handleQuery(input.value, select?.value||engineKey, false); });
});
