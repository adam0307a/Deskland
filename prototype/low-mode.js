(function () {
  'use strict';
  if (window.__desklandLowModeInstalled) return;
  window.__desklandLowModeInstalled = true;

  var qsLow = false;
  try {
    qsLow = new URLSearchParams(window.location.search || '').get('low') === '1';
  } catch (e) {}

  var lowMode = !!(window.__desklandInitialLowMode || qsLow);
  var MIN_FRAME_MS = 66; // ~15 FPS strict ceiling in Low Mode
  var LOW_DPR_CAP = 0.75;
  var origRAF = typeof window.requestAnimationFrame === 'function'
    ? window.requestAnimationFrame.bind(window)
    : null;
  var origCAF = typeof window.cancelAnimationFrame === 'function'
    ? window.cancelAnimationFrame.bind(window)
    : null;
  var lastFrameAt = 0;
  var nextHandle = 100000000;
  var handles = Object.create(null);
  var styleInjected = false;

  function ensureLowModeStyle() {
    if (styleInjected) return;
    var root = document.documentElement;
    if (!root) return;
    styleInjected = true;
    root.classList.toggle('dk-low-mode', lowMode);
    var style = document.createElement('style');
    style.id = 'dk-low-mode-style';
    style.textContent =
      'html.dk-low-mode *, html.dk-low-mode *::before, html.dk-low-mode *::after {' +
      '  backdrop-filter: none !important;' +
      '  -webkit-backdrop-filter: none !important;' +
      '}';
    (document.head || root).appendChild(style);
  }

  function syncDomClass() {
    var root = document.documentElement;
    if (root) {
      ensureLowModeStyle();
      root.classList.toggle('dk-low-mode', lowMode);
    } else {
      document.addEventListener('DOMContentLoaded', ensureLowModeStyle, { once: true });
    }
  }

  // Intercept heavy Canvas2D Gaussian shadowBlur & filter blur while Low Mode is active
  if (typeof CanvasRenderingContext2D !== 'undefined') {
    try {
      var proto = CanvasRenderingContext2D.prototype;
      var shadowDesc = Object.getOwnPropertyDescriptor(proto, 'shadowBlur');
      if (shadowDesc && shadowDesc.configurable && shadowDesc.set) {
        Object.defineProperty(proto, 'shadowBlur', {
          configurable: true,
          enumerable: shadowDesc.enumerable,
          get: shadowDesc.get,
          set: function (v) {
            shadowDesc.set.call(this, lowMode ? 0 : v);
          }
        });
      }
      var filterDesc = Object.getOwnPropertyDescriptor(proto, 'filter');
      if (filterDesc && filterDesc.configurable && filterDesc.set) {
        Object.defineProperty(proto, 'filter', {
          configurable: true,
          enumerable: filterDesc.enumerable,
          get: filterDesc.get,
          set: function (v) {
            if (lowMode && typeof v === 'string' && v.indexOf('blur') !== -1) {
              filterDesc.set.call(this, 'none');
              return;
            }
            filterDesc.set.call(this, v);
          }
        });
      }
      var smoothDesc = Object.getOwnPropertyDescriptor(proto, 'imageSmoothingQuality');
      if (smoothDesc && smoothDesc.configurable && smoothDesc.set) {
        Object.defineProperty(proto, 'imageSmoothingQuality', {
          configurable: true,
          enumerable: smoothDesc.enumerable,
          get: smoothDesc.get,
          set: function (v) {
            smoothDesc.set.call(this, lowMode ? 'low' : v);
          }
        });
      }
    } catch (e) {}
  }

  // Timer-backed rAF gate: genuinely lets the WebView/compositor sleep between frames
  if (origRAF && origCAF) {
    window.requestAnimationFrame = function (cb) {
      if (!lowMode || window.__desklandRecording || typeof cb !== 'function') {
        return origRAF(cb);
      }
      var id = nextHandle++;
      var now = performance.now();
      var wait = Math.max(0, MIN_FRAME_MS - (now - lastFrameAt));
      var entry = { canceled: false, timer: 0, raf: 0 };
      handles[id] = entry;
      var dispatch = function () {
        if (entry.canceled) {
          delete handles[id];
          return;
        }
        entry.raf = origRAF(function (ts) {
          delete handles[id];
          if (entry.canceled) return;
          lastFrameAt = performance.now();
          cb(ts);
        });
      };
      if (wait <= 4) {
        dispatch();
      } else {
        entry.timer = window.setTimeout(dispatch, Math.round(wait));
      }
      return id;
    };

    window.cancelAnimationFrame = function (id) {
      var entry = handles[id];
      if (entry) {
        entry.canceled = true;
        if (entry.timer) window.clearTimeout(entry.timer);
        if (entry.raf) origCAF(entry.raf);
        delete handles[id];
        return;
      }
      origCAF(id);
    };
  }

  function applyLowMode(enabled) {
    var next = !!enabled;
    var changed = next !== lowMode;
    lowMode = next;
    syncDomClass();
    if (changed) {
      try {
        window.dispatchEvent(new CustomEvent('deskland:lowmode', { detail: { lowMode: lowMode } }));
      } catch (e) {}
      try {
        window.dispatchEvent(new Event('resize'));
      } catch (e) {}
    }
  }

  function handleMsg(ev) {
    var m = ev && ev.data !== undefined ? ev.data : ev;
    if (typeof m === 'string') {
      if (m.charAt(0) !== '{') return;
      try { m = JSON.parse(m); } catch (e) { return; }
    }
    if (!m || typeof m !== 'object') return;
    if (m.t === 'lowMode') {
      applyLowMode(m.v);
    } else if (m.t === 'settings' || m.t === 'init') {
      var v = m.v || m.params || m;
      if (v && typeof v.lowMode === 'boolean') {
        applyLowMode(v.lowMode);
      }
    }
  }

  Object.defineProperty(window, '__desklandLowMode', {
    configurable: true,
    enumerable: true,
    get: function () { return lowMode; }
  });

  window.__desklandSetLowMode = applyLowMode;

  window.__desklandScale = function (normalMax, previewScale) {
    if (typeof previewScale === 'number' && previewScale > 0) {
      var qs = window.location.search || '';
      if (qs.indexOf('preview=1') !== -1) return previewScale;
    }
    var nativeDpr = window.devicePixelRatio || 1;
    var maxCap = lowMode ? LOW_DPR_CAP : (typeof normalMax === 'number' && normalMax > 0 ? normalMax : 1.5);
    return Math.min(nativeDpr, maxCap);
  };

  window.addEventListener('message', handleMsg, false);
  if (window.chrome && window.chrome.webview && typeof window.chrome.webview.addEventListener === 'function') {
    try { window.chrome.webview.addEventListener('message', handleMsg); } catch (e) {}
  }
  syncDomClass();
})();
