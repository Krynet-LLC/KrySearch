(function () {
  const plugin = {
    id: "privacy-clean-max",
    description: "Clear all storage and disable speculative APIs",

    run() {
      try {
        // ===============================
        // Storage Cleanup
        // ===============================
        try { 
          localStorage.clear(); 
        } catch {} // Ignore any error
        
        try { 
          sessionStorage.clear(); 
        } catch {} // Ignore any error

        // Clearing IndexedDB databases
        try {
          if (window.indexedDB) {
            indexedDB.databases?.().then(dbs => {
              dbs.forEach(db => indexedDB.deleteDatabase(db.name));
            }).catch(() => {}); // Ignore errors here
          }
        } catch {}

        // ===============================
        // Cookie Cleanup
        // ===============================
        try {
          document.cookie.split(";").forEach(c => {
            document.cookie = c.replace(/^ +/, "")
              .replace(/=.*/, "=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/");
          });
        } catch {} // Ignore errors

        // ===============================
        // Kill Speculative Fetches
        // ===============================
        const killLinks = () => {
          document.querySelectorAll(
            'link[rel="prefetch"],link[rel="dns-prefetch"],link[rel="prerender"],link[rel="preconnect"]'
          ).forEach(l => l.remove());
        };

        killLinks(); // Immediately kill any speculative links in the DOM

        // Observe future DOM insertions to kill speculative links
        const observer = new MutationObserver(muts => {
          muts.forEach(m => {
            m.addedNodes.forEach(n => {
              if (n.querySelectorAll) killLinks();
            });
          });
        });

        observer.observe(document.documentElement, { childList: true, subtree: true });

      } catch {
        // Silent fail in case of any errors
      }
    }
  };

  window.KRY_PLUGINS = window.KRY_PLUGINS || [];
  window.KRY_PLUGINS.push(plugin); // Push the plugin to the global list
})();
