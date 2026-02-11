'use strict';

let CONFIG = null;

// Load the config
async function loadConfig() {
  try {
    const res = await fetch('Config/config.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    CONFIG = await res.json();
  } catch (err) {
    console.error('[KrySearch] Failed to load config.json:', err);
  }
}

// Force dark mode
function forceDarkMode() {
  document.documentElement.style.background = '#1f1f1f';
  document.documentElement.style.color = '#fff';
}

// Sanitize search queries
function sanitizeQuery(q) {
  return encodeURIComponent(q.trim());
}

// Navigate safely
function navigateTo(url) {
  if (!url) return;
  if (!/^https:\/\//i.test(url)) url = 'https://' + url;
  window.location.href = url;
}

// Handle both ?q= and ?url=
function handleInput(rawQuery, rawUrl) {
  if (rawUrl) {
    navigateTo(rawUrl.startsWith('http') ? rawUrl : 'https://' + rawUrl);
    return;
  }

  if (rawQuery && CONFIG) {
    const defaultEngineKey = CONFIG.search?.defaultEngine;
    const engines = { ...CONFIG.engines.open_source, ...CONFIG.engines.closed_source };
    const engine = engines[defaultEngineKey];

    if (!engine || !engine.url) {
      console.error('[KrySearch] Default engine not found in config.');
      return;
    }

    const targetUrl = engine.url.replace('{query}', sanitizeQuery(rawQuery));
    navigateTo(targetUrl);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  forceDarkMode();
  await loadConfig();

  const params = new URLSearchParams(location.search);
  const rawQuery = params.get('q');
  const rawUrl = params.get('url');

  handleInput(rawQuery, rawUrl);

  // Setup input box and button (optional, for UI interaction)
  const input = document.getElementById('q');
  const goBtn = document.getElementById('go');
  if (goBtn && input) {
    goBtn.addEventListener('click', () => handleInput(input.value, null));
    if (!input) return; handleQuery(input.value, select?.value || engine, false);
  }
});
