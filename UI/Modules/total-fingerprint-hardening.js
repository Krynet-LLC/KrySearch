(() => {
  "use strict";
  const plugin = {
    id: "total-fingerprint-hardening",
    description: "Full-surface fingerprint normalization for KrySearch",
    run() {
      try {
        const engine = new URLSearchParams(location.search).get("engine") || "default";
        const profiles = {
          default: { vendor: "KrySearch", renderer: "KrySearch Renderer", audioNoise: 0, perfRes: 100 },
          tor:     { vendor: "Mozilla", renderer: "Gecko", audioNoise: 0, perfRes: 100 },
          chromium:{ vendor: "Google Inc.", renderer: "ANGLE", audioNoise: 0, perfRes: 50 }
        };
        const p = profiles[engine] || profiles.default;

        // Canvas
        if (HTMLCanvasElement?.prototype.toDataURL) HTMLCanvasElement.prototype.toDataURL = () => "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB";
        if (CanvasRenderingContext2D?.prototype.getImageData) CanvasRenderingContext2D.prototype.getImageData = (x,y,w,h)=>new ImageData(w,h);

        // WebGL
        const lockWebGL = proto => { if(!proto?.getParameter) return; const orig = proto.getParameter; proto.getParameter = p => ({37445:p.vendor,37446:p.renderer,7936:"WebGL 1.0",7937:"WebGL GLSL ES 1.0"}[p]??orig.call(this,p)); };
        if(window.WebGLRenderingContext) lockWebGL(WebGLRenderingContext.prototype);
        if(window.WebGL2RenderingContext) lockWebGL(WebGL2RenderingContext.prototype);

        // Fonts
        if(document.fonts) { document.fonts.check=()=>true; document.fonts.values=function*(){}; }

        // Permissions API
        if(navigator.permissions) navigator.permissions.query=()=>Promise.resolve({state:"prompt",onchange:null});

        // Battery API
        if(navigator.getBattery) navigator.getBattery=()=>Promise.resolve({charging:true,chargingTime:0,dischargingTime:Infinity,level:1,onchargingchange:null,onlevelchange:null});

        // Network
        if(navigator.connection) Object.defineProperty(navigator,"connection",{get:()=>({effectiveType:"4g",rtt:100,downlink:10,saveData:false,onchange:null}),configurable:true});

        // Audio
        const lockAudio=proto=>{if(!proto?.createAnalyser)return; const orig=proto.createAnalyser; proto.createAnalyser=function(){const a=orig.call(this); a.getFloatFrequencyData=arr=>arr.fill(p.audioNoise); a.getByteFrequencyData=arr=>arr.fill(0); return a; };};
        if(window.AudioContext) lockAudio(AudioContext.prototype);
        if(window.webkitAudioContext) lockAudio(window.webkitAudioContext.prototype);

        // MediaDevices
        if(navigator.mediaDevices){navigator.mediaDevices.enumerateDevices=()=>Promise.resolve([]); navigator.mediaDevices.getUserMedia=()=>Promise.reject(new Error("MediaDevices blocked"));}

        // Performance
        if(window.performance) performance.now=()=>Math.floor(Date.now()/p.perfRes)*p.perfRes;

        // Internal state (local only)
        const fingerprintData={hardened:true,engineProfile:engine,surfaces:["canvas","webgl","fonts","permissions","battery","network","audio","mediaDevices","performance"],entropy:"minimized",storage:"none",logging:false};

      } catch(e){console.error("[KrySearch Plugin Error]",e);}
    }
  };
  window.KRY_PLUGINS = window.KRY_PLUGINS||[];
  window.KRY_PLUGINS.push(plugin);
})();
