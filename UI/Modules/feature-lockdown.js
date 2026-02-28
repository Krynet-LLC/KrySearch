/* SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (C) 2026 Krynet, LLC
 * https://github.com/Bloodware-Inc/KrySearch
 *
 * Feature Lockdown Max – lightweight, secure, minimal
 */
(function(){
  "use strict";

  const plugin={
    id:"feature-lockdown-max",
    description:"Disable drag/drop, context abuse, future-proofed",
    run: function(){
      try {
        const evts=["dragstart","drop","contextmenu"];
        const block=e=>{ try{ e.preventDefault(); }catch{} };
        evts.forEach(evt=>document.addEventListener(evt, block, {capture:true}));
      }catch(e){ console.warn?.("[Feature Lockdown Max]",e); }
    }
  };

  window.KRY_PLUGINS=window.KRY_PLUGINS||[];
  window.KRY_PLUGINS.push(plugin);

})();
