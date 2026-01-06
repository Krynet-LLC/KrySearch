(function () {
  const plugin = {
    id: "privacy-fingerprint",
    description: "Add minor fingerprint instability",

    run() {
      try {
        const orig = Intl.DateTimeFormat
        Intl.DateTimeFormat = function (...args) {
          const fmt = new orig(...args)
          const r = fmt.resolvedOptions
          fmt.resolvedOptions = () => {
            const o = r.call(fmt)
            o.timeZone = "UTC"
            return o
          }
          return fmt
        }
      } catch {}
    }
  }

  window.KRY_PLUGINS.push(plugin)
})()
