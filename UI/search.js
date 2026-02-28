"use strict";

(async()=>{
  const p=new URLSearchParams(location.search),q=p.get("q"),u=p.get("url");
  if(!q&&!u) return;

  let c;
  try{c=await(await fetch("./Config/config.json",{cache:"no-store"})).json()}catch{console.error("[KrySearch] Failed to load config");return}

  const e={...c.engines.open_source,...c.engines.closed_source},
        key=(p.get("engine")||c.search.defaultEngine||"").toLowerCase(),
        engine=e[key]||e[c.search.defaultEngine]||e[Object.keys(e)[0]];
  if(!engine?.url) return console.error("[KrySearch] Engine missing URL");

  let query=u?((u.startsWith("http")?u:"https://"+u)) : q;
  try{if(u)query=new URL(query).href}catch{return console.warn("[KrySearch] Invalid URL")}

  console.log("[KrySearch] Params:",{q,u,forcedEngine:p.get("engine")});
  console.log("[KrySearch] Using engine:",key);
  console.log("[KrySearch] Final query:",query);
  console.log("[KrySearch] Redirecting to:",engine.url.replace("{query}",encodeURIComponent(query)));

  window.location.assign(engine.url.replace("{query}",encodeURIComponent(query)));
})();
