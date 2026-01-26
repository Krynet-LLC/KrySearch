/* Ultra-Adaptive Quad9 DoH Resolver (CSP + CORS Safe, URL-Compatible) */

(function () {
  const DOH_SERVERS = [
    'https://dns.quad9.net/dns-query',   // Primary
    'https://dns.google/dns-query',      // Secondary fallback
    'https://cloudflare-dns.com/dns-query', // Tertiary fallback
  ];

  const domainCache = new Map();

  // Detect IPv6 support via WebRTC (fallback if IP fetch fails)
  async function supportsIPv6() {
    return new Promise((resolve) => {
      try {
        const rtc = new RTCPeerConnection({ iceServers: [] });
        rtc.createDataChannel('ipv6_test');
        rtc.createOffer().then(offer => rtc.setLocalDescription(offer));
        rtc.onicecandidate = function (event) {
          if (event.candidate && event.candidate.candidate.includes('ipv6')) resolve(true);
          else resolve(false);
        };
        setTimeout(() => resolve(false), 2000); // fallback
      } catch { resolve(false); }
    });
  }

  // Simple domain checker
  function isDomain(input) {
    return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(input);
  }

  // DoH resolver
  async function resolveWithDoH(domain: string, type = 'A') {
    type = type.toUpperCase();
    const cacheKey = `${domain}_${type}`;
    if (domainCache.has(cacheKey)) return domainCache.get(cacheKey);

    let result: string[] | false = false;

    for (const server of DOH_SERVERS) {
      try {
        const url = `${server}?name=${encodeURIComponent(domain)}&type=${type}`;
        const res = await fetch(url, { cache: 'no-store', mode: 'cors' });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.Answer)) {
            result = [];
            for (const record of data.Answer) {
              if (type === 'A' || type === 'AAAA') result.push(record.data);
              else if (type === 'MX') result.push(record.data.split(' ')[1]);
            }
          }
          if (result.length) break; // stop at first successful server
        }
      } catch { continue; }
    }

    domainCache.set(cacheKey, result);
    return result;
  }

  const plugin = {
    id: 'ultra-adaptive-quad9-doh',
    description: 'Quad9 DoH resolver, CSP/CORS safe, IPv6-ready, works with full URLs',
    async run(ctx) {
      ctx.dnsResolver = { resolve: resolveWithDoH };
      ctx.supportsIPv6 = await supportsIPv6();

      const params = Object.fromEntries(new URLSearchParams(window.location.search));
      const inputRaw = (params.url || params.q || '').trim();
      if (!inputRaw) { ctx.output = null; return; }

      // Extract hostname if full URL
      let domain = inputRaw;
      try {
        const u = new URL(inputRaw);
        domain = u.hostname;
      } catch {} // keep original if invalid URL

      if (isDomain(domain)) {
        const A = await resolveWithDoH(domain, 'A');
        const AAAA = await resolveWithDoH(domain, 'AAAA');
        const MX = await resolveWithDoH(domain, 'MX');
        ctx.output = {
          input: inputRaw,
          domain,
          A: A || [],
          AAAA: AAAA || [],
          MX: MX || [],
          note: 'Resolved via DoH servers (Quad9, Google, Cloudflare), privacy-safe'
        };
      } else {
        ctx.output = null; // forward non-domain input silently
      }
    }
  };

  window.KRY_PLUGINS = window.KRY_PLUGINS || [];
  window.KRY_PLUGINS.push(plugin);
})();
