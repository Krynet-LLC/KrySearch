/* SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (C) 2026 Krynet, LLC
 * https://github.com/Bloodware-Inc/KrySearch
 *
 * Feature Lockdown Max – disables drag/drop, context abuse, and future-proofs DOM manipulation
 */
(function () {
  "use strict";

  const plugin = {
    id: "feature-lockdown-max",
    description: "Disable drag/drop, context abuse, future-proofed",

    run: function () {
      try {
        /** ================= EVENT BLOCK ================= */
        const blockedEvents = ["dragstart", "drop", "contextmenu"];

        /**
         * Block the event safely
         * @param {Event} e
         */
        const blockEvent = e => {
          try { e.preventDefault(); } catch {}
        };

        /** Attach listeners to document and existing elements */
        blockedEvents.forEach(evt => {
          document.addEventListener(evt, blockEvent, { capture: true });
        });

        /** ================= MUTATION OBSERVER ================= */
        const observer = new MutationObserver(mutations => {
          mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
              if (!(node instanceof Element)) return;
              blockedEvents.forEach(evt => {
                node.addEventListener(evt, blockEvent, { capture: true });
              });
            });
          });
        });

        /** Observe entire document for new nodes */
        observer.observe(document.documentElement, {
          childList: true,
          subtree: true
        });

      } catch (err) {
        // Fail silently but log if debugging needed
        if (window.DEBUG_KRY_PLUGINS) console.warn("[KrySearch Plugin Error]", err);
      }
    }
  };

  /** ================= REGISTER PLUGIN ================= */
  window.KRY_PLUGINS = window.KRY_PLUGINS || [];
  window.KRY_PLUGINS.push(plugin);

})();
