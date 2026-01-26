/* ==============================
   Absolute URL & Param Sanitizer
   Cleans tracking & junk before navigating
   ============================== */
(function() {
  "use strict";

  const plugin = {
    id: "url-param-sanitizer",
    description: "Sanitize all URLs: only ?url= & ?q= allowed, strip tracking before navigating",

    run() {
      try {
        const ALLOWED_PARAMS = new Set(["url", "q"]);
        const TRACKING_PREFIXES = ["utm_", "fbclid", "gclid", "_ga", "_gl", "_gid"];

        function sanitizeUrl(rawUrl) {
          try {
            const u = new URL(rawUrl, window.location.origin);
            const params = new URLSearchParams(u.search);
            let modified = false;

            // Remove disallowed params
            for (const key of Array.from(params.keys())) {
              if (!ALLOWED_PARAMS.has(key) || TRACKING_PREFIXES.some(p => key.startsWith(p))) {
                params.delete(key);
                modified = true;
              }
            }

            // Rebuild clean URL
            const cleanUrl = u.origin + u.pathname + (params.toString() ? "?" + params.toString() : "") + u.hash;
            return cleanUrl;
          } catch {
            return rawUrl;
          }
        }

        // Sanitize initial page load ?url= or ?q=
        const urlParams = new URLSearchParams(window.location.search);
        let shouldRedirect = false;
        let finalUrl = null;
        for (const key of ["url", "q"]) {
          if (urlParams.has(key)) {
            finalUrl = sanitizeUrl(urlParams.get(key));
            shouldRedirect = true;
            break;
          }
        }

        if (shouldRedirect && finalUrl) {
          // Remove ?url=/?q= from bar
          history.replaceState({}, "", window.location.pathname);
          // Navigate to sanitized URL
          window.location.assign(finalUrl);
        }

        // Intercept all clicks
        document.addEventListener("click", e => {
          const a = e.target.closest("a");
          if (!a || !a.href) return;
          const cleanHref = sanitizeUrl(a.href);
          if (a.href !== cleanHref) {
            e.preventDefault();
            e.stopImmediatePropagation();
            a.href = cleanHref;
            window.location.assign(cleanHref);
          }
        }, true);

        // Intercept form submissions
        document.addEventListener("submit", e => {
          const f = e.target;
          if (!f || !f.action) return;
          const cleanAction = sanitizeUrl(f.action);
          if (f.action !== cleanAction) {
            e.preventDefault();
            e.stopImmediatePropagation();
            f.action = cleanAction;
            f.submit();
          }
        }, true);

      } catch (err) {
        console.error("URL Param Sanitizer failed:", err);
      }
    }
  };

  window.KRY_PLUGINS = window.KRY_PLUGINS || [];
  window.KRY_PLUGINS.push(plugin);

})();
