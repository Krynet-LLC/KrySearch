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
          try {
            e.preventDefault();
          } catch (err) {
            // Keep handler resilient; log only when debugging is enabled
            if (window.DEBUG_KRY_PLUGINS) {
              console.warn("[KrySearch Plugin Warning] preventDefault failed in feature-lockdown-max", err);
            }
          }
        };
        /** Attach listeners to document and existing elements */
        blockedEvents.forEach(evt => {
          document.addEventListener(evt, blockEvent, { capture: true });
        });

        // MutationObserver previously used to attach per-node listeners has been
        // removed as redundant, since document-level capturing listeners already
        // intercept the relevant events across the entire DOM.

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
