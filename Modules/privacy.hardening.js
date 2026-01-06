(function () {
  const plugin = {
    id: "privacy-hardening",
    description: "Disable high-risk browser APIs",

    run() {
      const deny = () => { throw new Error("Blocked") }

      const targets = [
        "geolocation",
        "mediaDevices",
        "clipboard",
        "bluetooth",
        "usb",
        "serial"
      ]

      targets.forEach(k => {
        if (navigator[k]) {
          try {
            Object.defineProperty(navigator, k, {
              get: deny
            })
          } catch {}
        }
      })
    }
  }

  window.KRY_PLUGINS.push(plugin)
})()
