/* ==============================
   URL Param Sanitizer – GitHub Pages Friendly
   Only ?url= & ?q= allowed, tracking stripped before navigation
   ============================== */
(function() {
  "use strict";

  const plugin = {
    id: "url-param-sanitizer-ghp",
    description: "Sanitize all URLs: only ?url= & ?q= allowed, strip tracking before navigating (GitHub Pages safe)",

    run() {
      try {
        const ALLOWED_PARAMS = new Set(["url", "q"]);
        const TRACKING_PREFIXES = ["utm_", "fbclid", "gclid", "_ga", "_gl", "_gid"];

        function sanitizeUrl(rawUrl: string) {
          try {
            const u = new URL(rawUrl, window.location.href);
            const params = new URLSearchParams(u.search);
            let modified = false;

            // Remove disallowed params and tracking
            for (const key of Array.from(params.keys())) {
              if (!ALLOWED_PARAMS.has(key) || TRACKING_PREFIXES.some(p => key.startsWith(p))) {
                params.delete(key);
                modified = true;
              }
            }

            // Rebuild clean URL
            return u.origin + u.pathname + (params.toString() ? "?" + params.toString() : "") + u.hash;
          } catch {
            return rawUrl;
          }
        }

        // Sanitize initial page load ?url= or ?q=
        const urlParams = new URLSearchParams(window.location.search);
        let finalUrl: string | null = null;
        for (const key of ["url", "q"]) {
          if (urlParams.has(key)) {
            finalUrl = sanitizeUrl(urlParams.get(key)!);
            break;
          }
        }

        if (finalUrl) {
          // Remove ?url=/?q= from bar without reload
          history.replaceState({}, "", window.location.pathname);
          // GitHub Pages safe redirect using setTimeout
          setTimeout(() => window.location.href = finalUrl!, 50);
        }

        // Intercept clicks on links
        document.addEventListener("click", e => {
          const a = e.target.closest("a") as HTMLAnchorElement;
          if (!a || !a.href) return;
          const cleanHref = sanitizeUrl(a.href);
          if (a.href !== cleanHref) {
            e.preventDefault();
            e.stopImmediatePropagation();
            a.href = cleanHref;
            // GitHub Pages safe navigation
            setTimeout(() => window.location.href = cleanHref, 50);
          }
        }, true);

        // Intercept form submissions
        document.addEventListener("submit", e => {
          const f = e.target as HTMLFormElement;
          if (!f || !f.action) return;
          const cleanAction = sanitizeUrl(f.action);
          if (f.action !== cleanAction) {
            e.preventDefault();
            e.stopImmediatePropagation();
            f.action = cleanAction;
            setTimeout(() => f.submit(), 50);
          }
        }, true);

      } catch (err) {
        console.error("URL Param Sanitizer (GHP) failed:", err);
      }
    }
  };

  window.KRY_PLUGINS = window.KRY_PLUGINS || [];
  window.KRY_PLUGINS.push(plugin);

})();
