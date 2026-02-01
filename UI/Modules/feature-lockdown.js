/* SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (C) 2026 Krynet, LLC
 * https://github.com/Bloodware-Inc/KrySearch
 */
(function () {
  const plugin = {
    id: "feature-lockdown-max",
    description: "Disable drag/drop, context abuse, future-proofed",

    run() {
      try {
        const blockEvent = e => e.preventDefault();

        // Core listeners
        ["dragstart", "drop", "contextmenu"].forEach(ev =>
          document.addEventListener(ev, blockEvent, { capture: true, passive: false })
        );

        // Mutation observer to prevent new elements from bypassing
        const observer = new MutationObserver(muts => {
          muts.forEach(m => {
            m.addedNodes.forEach(n => {
              if (n.addEventListener) {
                ["dragstart", "drop", "contextmenu"].forEach(ev =>
                  n.addEventListener(ev, blockEvent, { capture: true, passive: false })
                );
              }
            });
          });
        });

        observer.observe(document.documentElement, { childList: true, subtree: true });

      } catch {
        // silent fail
      }
    }
  };

  window.KRY_PLUGINS = window.KRY_PLUGINS || [];
  window.KRY_PLUGINS.push(plugin);
})();
