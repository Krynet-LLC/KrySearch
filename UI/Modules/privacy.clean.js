/* SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (C) 2026 Krynet, LLC
 * https://github.com/Bloodware-Inc/KrySearch
 *
 * Privacy Clean Max – clear storage & disable speculative APIs
 */
(function(){
  "use strict";

  const plugin={
    id:"privacy-clean-max",
    description:"Clear all storage and disable speculative APIs",
    run(){
      try{
        // ===============================
        // Storage Cleanup
        // ===============================
        try{ localStorage.clear(); } catch{}
        try{ sessionStorage.clear(); } catch{}
        try{
          if(window.indexedDB?.databases){
            indexedDB.databases().then(dbs=>{
              dbs?.forEach(db=>{ try{ indexedDB.deleteDatabase(db.name); } catch{} });
            }).catch(()=>{});
          }
        } catch{}

        // ===============================
        // Cookie Cleanup
        // ===============================
        try{
          document.cookie.split(";").forEach(c=>{
            document.cookie=c.replace(/^ +/,"").replace(/=.*/,"=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/");
          });
        } catch{}

        // ===============================
        // Kill Speculative Links
        // ===============================
        const killLinks=()=>{
          document.querySelectorAll(
            'link[rel="prefetch"],link[rel="dns-prefetch"],link[rel="prerender"],link[rel="preconnect"]'
          ).forEach(l=>l.remove());
        };

        killLinks();

        // Observe DOM for future speculative links
        try{
          new MutationObserver(muts=>{
            muts.forEach(m=>{
              m.addedNodes.forEach(n=>{ if(n?.querySelectorAll) killLinks(); });
            });
          }).observe(document.documentElement,{childList:true,subtree:true});
        } catch{}

      } catch{}
    }
  };

  window.KRY_PLUGINS=window.KRY_PLUGINS||[];
  window.KRY_PLUGINS.push(plugin);

})();
