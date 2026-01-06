/* KrySearch Ultra-Smart Quad9 DNS Resolver
 * - Auto-selects A/AAAA based on IPv6 support
 * - MX for emails
 * - Silent, cached, privacy-first
 */

(function() {
  const DOH_URL = 'https://dns.quad9.net/dns-query';
  const cache = new Map();

  const isDomain = input => /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(input);
  const isEmail  = input => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);

  async function supportsIPv6() {
    try {
      const res = await fetch("https://ipv6.test-ipv6.com/ip?", { method: "HEAD", cache: "no-store" });
      return res.ok;
    } catch { return false; }
  }

  function detectRecordTypes(input, ipv6) {
    if (isEmail(input)) return ["MX"];
    if (isDomain(input)) return ipv6 ? ["AAAA","A"] : ["A","AAAA"];
    return [];
  }

  async function resolve(domain, type) {
    const key = `${domain}_${type}`;
    if (cache.has(key)) return cache.get(key);

    try {
      const res = await fetch(`${DOH_URL}?name=${encodeURIComponent(domain)}&type=${type}`, {
        headers: { 'accept': 'application/dns-json' },
        cache: 'no-store'
      });
      if (!res.ok) { cache.set(key,false); return false; }

      const data = await res.json();
      if (!data.Answer) { cache.set(key,false); return false; }

      const records = data.Answer
        .filter(r => (type==="A"&&r.type===1) || (type==="AAAA"&&r.type===28) || (type==="MX"&&r.type===15))
        .map(r => type==="MX" ? r.data.split(" ")[1] : r.data);

      const result = records.length ? records : false;
      cache.set(key,result);
      return result;
    } catch {
      cache.set(key,false);
      return false;
    }
  }

  const plugin = {
    id: "ultra-adaptive-quad9-doh",
    description: "Ultra-smart Quad9 DNS resolver: auto A/AAAA based on IPv6, MX for emails, cached, privacy-first",
    async run(ctx) {
      const params = Object.fromEntries(new URLSearchParams(window.location.search));
      const input = (params.url || params.q || "").trim();
      if (!input) return;

      const ipv6 = await supportsIPv6();
      const types = detectRecordTypes(input, ipv6);
      if (!types.length) return;

      ctx.dnsResolver = { resolve };
      await Promise.all(types.map(t => resolve(input,t)));
    }
  };

  window.KRY_PLUGINS = window.KRY_PLUGINS || [];
  window.KRY_PLUGINS.push(plugin);
})();
