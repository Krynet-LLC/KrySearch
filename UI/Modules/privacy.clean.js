/* SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (C) 2026 Krynet, LLC
 * https://github.com/Bloodware-Inc/KrySearch
 */
(function () {
  const plugin = {
    id: "privacy-clean-max",
    description: "Clear all storage and disable speculative APIs",

    run() {
      try {
        // ===============================
        // Storage Cleanup
        // ===============================
        try { localStorage.clear(); } catch {}
        try { sessionStorage.clear(); } catch {}

        // IndexedDB cleanup
        try {
          if (window.indexedDB && indexedDB.databases) {
            indexedDB.databases().then(function(dbs) {
              if (Array.isArray(dbs)) {
                dbs.forEach(function(db) {
                  if (db && db.name) {
                    try { indexedDB.deleteDatabase(db.name); } catch {}
                  }
                });
              }
            }).catch(function(){});
          }
        } catch {}

        // ===============================
        // Cookie Cleanup
        // ===============================
        try {
          document.cookie.split(";").forEach(function(c) {
            document.cookie = c.replace(/^ +/, "")
              .replace(/=.*/, "=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/");
          });
        } catch {}

        // ===============================
        // Kill Speculative Fetches
        // ===============================
        function killLinks() {
          var links = document.querySelectorAll(
            'link[rel="prefetch"],link[rel="dns-prefetch"],link[rel="prerender"],link[rel="preconnect"]'
          );
          if (links && links.length) {
            for (var i = 0; i < links.length; i++) links[i].remove();
          }
        }

        killLinks(); // Immediately kill any speculative links in the DOM

        // Observe future DOM insertions to kill speculative links
        try {
          var observer = new MutationObserver(function(muts) {
            muts.forEach(function(m) {
              m.addedNodes.forEach(function(n) {
                if (n && n.querySelectorAll) killLinks();
              });
            });
          });
          observer.observe(document.documentElement, { childList: true, subtree: true });
        } catch {}

      } catch {
        // Silent fail
      }
    }
  };

  window.KRY_PLUGINS = window.KRY_PLUGINS || [];
  window.KRY_PLUGINS.push(plugin);
})();
