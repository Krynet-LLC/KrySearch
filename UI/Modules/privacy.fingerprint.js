/* SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (C) 2026 Krynet, LLC
 * https://github.com/Bloodware-Inc/KrySearch
 */
(function () {
  const plugin = {
    id: "privacy-max-hardening",
    description: "Flatten CSS, fonts, hardware, and GPU surfaces",

    run() {
      try {
        // ===============================
        // 1. CSS Media Queries
        // ===============================
        if (window.matchMedia) {
          const realMM = window.matchMedia.bind(window);
          window.matchMedia = query => ({
            matches: false,
            media: query,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false
          });
          try { Object.freeze(window.matchMedia); } catch {}
        }

        // ===============================
        // 2. Flatten Layout / Fonts
        // ===============================
        const neutralize = proto => {
          if (!proto?.getBoundingClientRect) return;
          const orig = proto.getBoundingClientRect;
          proto.getBoundingClientRect = function () {
            const r = orig.call(this);
            return {
              x: Math.round(r.x),
              y: Math.round(r.y),
              width: Math.round(r.width),
              height: Math.round(r.height),
              top: Math.round(r.top),
              left: Math.round(r.left),
              right: Math.round(r.right),
              bottom: Math.round(r.bottom)
            };
          };
        };
        neutralize(Element.prototype);
        neutralize(HTMLElement.prototype);

        // ===============================
        // 3. Hardware Concurrency
        // ===============================
        try { Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 4 }); } catch {}

        // ===============================
        // 4. GPU Timing / WebGPU
        // ===============================
        if (window.GPUDevice?.prototype?.createCommandEncoder) {
          const proto = GPUDevice.prototype;
          const orig = proto.createCommandEncoder;
          proto.createCommandEncoder = function () {
            const enc = orig.apply(this, arguments);
            if (enc?.finish) enc.finish = new Proxy(enc.finish, { apply(t, thisArg, args) { return t.apply(thisArg, args); } });
            return enc;
          };
        }

      } catch {}
    }
  };

  window.KRY_PLUGINS = window.KRY_PLUGINS || [];
  window.KRY_PLUGINS.push(plugin);
})();
