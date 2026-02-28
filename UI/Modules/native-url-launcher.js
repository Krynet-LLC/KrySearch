/* SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (C) 2026 Krynet, LLC
 * https://github.com/Bloodware-Inc/KrySearch
 *
 * Open In App – cross-platform, minimal, lazy, safe
 */
(function(){
  "use strict";

  const SERVICES=[
    {match:/^https:\/\/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?(track|album|artist|playlist|user|episode|prerelease)\/([^?]+)/i, replace:(_,t,id)=>`spotify://${t}/${id}`},
    {match:/^https:\/\/(steamcommunity\.com|store\.steampowered\.com)\/.+/i, replace:url=>`steam://openurl/${url}`},
    {match:/^https:\/\/store\.epicgames\.com\/(.+)/i, replace:(_,p)=>`com.epicgames.launcher://store/${p}`},
    {match:/^https:\/\/(?:listen\.)?tidal\.com\/(?:browse\/)?(track|album|artist|playlist|user|video|mix)\/([a-f0-9-]+)/i, replace:(_,t,id)=>`tidal://${t}/${id}`},
    {match:/^https:\/\/music\.apple\.com\/.+/i, replace:url=>url.replace(/^https:/i,"itunes:")},
    {match:/^https:\/\/music\.youtube\.com\/.+/i, replace:url=>`vnd.youtube.music://open?url=${encodeURIComponent(url)}`},
    {match:/^https:\/\/www\.roblox\.com\/games\/(\d+)/i, replace:(_,id)=>`roblox-player://placeId=${id}`}
  ];

  const openExternal=(url,fallback)=>{
    try{
      if(typeof view?.open==="function") return view.open(url);
      if(typeof Sciter?.open==="function") return Sciter.open(url);
      window.location.href=url;
      if(fallback) setTimeout(()=>window.open(fallback,"_blank"),1500);
    }catch{ fallback&&window.open(fallback,"_blank"); }
  };

  const transformUrl=url=>{
    if(!url) return url;
    for(const s of SERVICES) if(s.match.test(url)) return url.replace(s.match,s.replace);
    return url;
  };

  const handleClick=e=>{
    const a=e.target.closest("a[href]");
    if(!a?.href) return;
    const transformed=transformUrl(a.href);
    if(transformed!==a.href){ e.preventDefault(); openExternal(transformed,a.href); }
  };

  window.KRY_PLUGINS=window.KRY_PLUGINS||[];
  window.KRY_PLUGINS.push({id:"open-in-app-clean",order:60,run:()=>document.addEventListener("click",handleClick,true)});

})();
