window.KRY_PLUGINS.push({
  name: "native-url-adaptive",
  order: 60,
  run(ctx) {

    // Popular apps for Krynet users
    const appMap = [
      // Gaming
      { test: /steam\.com/, app: url => 'steam://openurl/'+encodeURIComponent(url) },
      { test: /epicgames\.com/, app: url => 'com.epicgames.launcher://'+encodeURIComponent(url) },
      { test: /gog\.com/, app: url => 'goggalaxy://launch/'+encodeURIComponent(url) },
      { test: /battle\.net/, app: url => 'battlenet://'+encodeURIComponent(url) },
      
      // Social / Collaboration
      { test: /discord\.com/, app: url => 'discord://'+encodeURIComponent(url) },
      { test: /slack\.com/, app: url => 'slack://open' },
      { test: /teams\.microsoft\.com/, app: url => 'msteams://'+encodeURIComponent(url) },
      { test: /zoom\.us/, app: url => 'zoomus://'+encodeURIComponent(url) },

      // Music / media / creators
      { test: /spotify\.com/, app: url => 'spotify://'+encodeURIComponent(url) },
      
      // Krynet
      { test: /krynet\.ai/, app: url => 'krynet://'+encodeURIComponent(url) }
    ];

    const params = new URLSearchParams(location.search)
    let urlParam = params.get("url")
    if (!urlParam) return
    try { urlParam = decodeURIComponent(urlParam) } catch {}

    // enforce HTTPS
    if (/^http:\/\//i.test(urlParam)) return

    // Adaptive launcher: try app first, fallback to web
    let launched = false
    for (const map of appMap) {
      if (map.test.test(urlParam)) {
        try {
          window.location.assign(map.app(urlParam))
          launched = true
          break
        } catch {
          // ignore, fallback
        }
      }
    }

    // fallback
    if (!launched) {
      window.location.assign(urlParam)
    }
  }
})
