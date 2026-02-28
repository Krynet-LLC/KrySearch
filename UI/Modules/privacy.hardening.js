/* SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (C) 2026 Krynet, LLC
 * https://github.com/Bloodware-Inc/KrySearch
 */
(function () {
  "use strict";

  const plugin = {
    id: "privacy-hardening",
    description: "Disable high-risk browser APIs (cross-browser safe)",

    run() {
      const deny = () => undefined;
      const nav = navigator;
      const proto = Object.getPrototypeOf(nav);

      // High-risk navigator APIs
      const targets = [
        "geolocation","mediaDevices","clipboard",
        "bluetooth","usb","serial","vibrate",
        "storage","push"
      ];

      targets.forEach(api => {
        try {
          if (api in nav) Object.defineProperty(nav, api, { get: deny, configurable: true, enumerable: false });
          if (proto && api in proto) Object.defineProperty(proto, api, { get: deny, configurable: true, enumerable: false });
        } catch {}
      });

      // Freeze navigator and its prototype
      try { Object.freeze(nav); } catch {}
      try { Object.freeze(proto); } catch {}
    }
  };

  window.KRY_PLUGINS = window.KRY_PLUGINS || [];
  window.KRY_PLUGINS.push(plugin);
})();
