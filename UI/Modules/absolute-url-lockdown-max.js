/* SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (C) 2026 Krynet, LLC
 * https://github.com/Bloodware-Inc/KrySearch
 *
 * Absolute URL Lockdown Max – Efficient, secure, privacy-first
 */
(function () {
  "use strict";

  const plugin = {
    id: "absolute-url-lockdown-max",
    description: "Maximal browser URL defense using local feeds and async checks",

    async run() {
      try {
        const BLOCK = 60, MAX_DEPTH = 6, SILENT = false;
        const REDIRECT_PARAMS = ["url","u","redirect","target","dest","destination","next","continue","r"];
        const SHORTENERS = new Set(["bit.ly","t.co","tinyurl.com","goo.gl","is.gd","buff.ly","ow.ly","cutt.ly"]);
        const KEYWORDS = /(login|verify|secure|update|wallet|invoice|payment)/i;
        const SUSPICIOUS_TLDS = /\.(zip|mov|xyz|top|gq|tk|ml|cf|work|click)$/i;
        const feeds = {
          openPhish: new Set(), spamhaus: new Set(), malware: new Set()
        };
        let loaded = false;

        const loadFeeds = async () => {
          if (loaded) return;
          loaded = true;
          await Promise.all([
            ["Modules/Feeds/openphish.txt","openPhish"],
            ["Modules/Feeds/spamhaus_drop.txt","spamhaus"],
            ["Modules/Feeds/urlhaus.txt","malware"]
          ].map(async ([url,setName]) => {
            try {
              const r = await fetch(url, {cache:"force-cache"});
              if (!r.ok) return;
              r.text().then(t=>t.split("\n").forEach(l=>{
                const d=l.trim().split(/[ ;]/)[0];
                if(d && !d.startsWith("#")) feeds[setName].add(d);
              }));
            } catch {}
          }));
        };

        const extractRedirect = url => {
          try { const u=new URL(url); for(const p of REDIRECT_PARAMS) if(u.searchParams.has(p)) return decodeURIComponent(u.searchParams.get(p)); } catch{} return null;
        };
        const decodeB64 = s => { try{ const d=atob(s); return d.startsWith("http")?d:null;}catch{return null;}};

        const scoreUrl = url=>{
          let s=0; try{
            const u=new URL(url);
            if(u.protocol!=="https:") s+=15;
            if(/^\d+\.\d+\.\d+\.\d+$/.test(u.hostname)) s+=20;
            if(u.hostname.startsWith("xn--")) s+=15;
            if(SHORTENERS.has(u.hostname)) s+=15;
            if(SUSPICIOUS_TLDS.test(u.hostname)) s+=10;
            if(KEYWORDS.test(u.pathname+u.search)) s+=10;
            if(feeds.openPhish.has(url)) s+=40;
            if(feeds.spamhaus.has(u.hostname)) s+=40;
            if(feeds.malware.has(u.hostname)) s+=50;
            if(u.port && ![80,443].includes(Number(u.port))) s+=10;
            if(/(\.exe|\.dll|\.bat|\.scr|\.js)$/i.test(u.pathname)) s+=20;
          } catch{s+=30;}
          return Math.min(100,s);
        };

        const scan = async (url, depth=0, chain=[]) => {
          if(depth>MAX_DEPTH) return {block:true,chain};
          chain.push(url);
          if(scoreUrl(url)>=BLOCK) return {block:true,chain};
          const r=extractRedirect(url)||decodeB64(url.split("=").pop());
          return r?scan(r,depth+1,chain):{block:false,chain};
        };

        const blockDownloads=()=>{
          window.open=()=>null;
          document.addEventListener("click",e=>{
            const a=e.target.closest("a"); if(!a) return;
            const href=a.href||"";
            if(a.hasAttribute("download")||/(\.exe|\.dll|\.bat|\.scr|\.js)$/i.test(href)){
              e.preventDefault(); e.stopImmediatePropagation();
              if(!SILENT) alert("🚫 Download blocked: potential malware");
            }
            a.removeAttribute("target");
          },true);
        };

        const autoBlock = async ()=>{
          const urlParam=new URLSearchParams(location.search).get("url");
          if(urlParam){ await loadFeeds(); const res=await scan(urlParam); if(res.block){if(!SILENT) alert("🚫 Dangerous ?url blocked."); history.replaceState({}, "", location.pathname);}}
        };

        const interceptClicks=()=>{
          const handler=async e=>{
            const el=e.target.closest("a, form"); if(!el) return;
            const url=el.href||el.action; if(!url) return;
            await loadFeeds(); const res=await scan(url);
            if(res.block){e.preventDefault(); e.stopImmediatePropagation(); if(!SILENT) alert("🚫 Unsafe URL blocked.");}
          };
          document.addEventListener("click",handler,true);
          document.addEventListener("submit",handler,true);
        };

        blockDownloads();
        await autoBlock();
        interceptClicks();

      } catch(err){console.error("[Absolute URL Lockdown Max]",err);}
    }
  };

  window.KRY_PLUGINS=window.KRY_PLUGINS||[];
  window.KRY_PLUGINS.push(plugin);

})();
