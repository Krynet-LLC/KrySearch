(() => {
  "use strict";

  const DOH_SERVERS = [
    "https://dns.quad9.net/dns-query",
    "https://dns.google/dns-query",
    "https://cloudflare-dns.com/dns-query"
  ];
  const domainCache = new Map();

  const isDomain = input => /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(input);

  async function resolveWithDoH(domain, type='A') {
    type = type.toUpperCase();
    const cacheKey = `${domain}_${type}`;
    if (domainCache.has(cacheKey)) return domainCache.get(cacheKey);

    const results = await Promise.any(DOH_SERVERS.map(async server => {
      try {
        const url = `${server}?name=${encodeURIComponent(domain)}&type=${type}`;
        const controller = new AbortController();
        setTimeout(()=>controller.abort(),1500);
        const res = await fetch(url, { cache:'no-store', mode:'cors', signal: controller.signal });
        if(!res.ok) throw 0;
        const data = await res.json();
        if(Array.isArray(data.Answer)) return data.Answer.map(r=>r.data);
        return [];
      } catch { return []; }
    }));

    const final = results.flat();
    domainCache.set(cacheKey, final);
    return final;
  }

  async function supportsIPv6() {
    try {
      return await new Promise(resolve=>{
        const pc = new RTCPeerConnection({iceServers:[]});
        pc.createDataChannel("v6");
        pc.createOffer().then(o=>pc.setLocalDescription(o));
        pc.onicecandidate = e => { if(e.candidate?.candidate.includes("ipv6")) resolve(true); };
        setTimeout(()=>resolve(false),1500);
      });
    } catch { return false; }
  }

  const plugin = {
    id:"ultra-adaptive-quad9-doh",
    description:"Quad9 DoH resolver, CSP/CORS safe, IPv6-ready, GitHub Pages compatible",
    run: async ctx => {
      try {
        const local = {};
        local.supportsIPv6 = await supportsIPv6();

        const params = new URLSearchParams(location.search);
        const inputRaw = (params.get("url")||params.get("q")||"").trim();
        if(!inputRaw){ local.output=null; return; }

        let domain = inputRaw;
        try { domain = new URL(inputRaw).hostname; } catch {}

        if(!isDomain(domain)){ local.output=null; return; }

        const [A, AAAA, MX] = await Promise.all([
          resolveWithDoH(domain,"A"),
          resolveWithDoH(domain,"AAAA"),
          resolveWithDoH(domain,"MX")
        ]);

        local.output = { input: inputRaw, domain, A, AAAA, MX, note:"Resolved via DoH (Quad9 primary, Google & Cloudflare fallback)" };

        try { if(Object.isExtensible(ctx)) ctx.output = local.output; } catch {}
        ctx.__doHResult = local.output;

      } catch { try{ if(Object.isExtensible(ctx)) ctx.output=null; } catch{} }
    }
  };

  window.KRY_PLUGINS = window.KRY_PLUGINS||[];
  window.KRY_PLUGINS.push(plugin);
})();
