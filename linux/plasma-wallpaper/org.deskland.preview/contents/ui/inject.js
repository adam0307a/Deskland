/* Deskland wallpaper bridge.
 *
 * Injected into the theme page at document creation. Gives the page the
 * `window.chrome.webview` shim it expects (same shape as the desktop host)
 * and feeds it two message types:
 *
 *   {t:"icons", vis:true, r:[[l,t,r,b], ...]}   physical pixels
 *   {t:"settings", v:{...}}                     theme parameters
 *
 * Icon positions come from ~/.cache/deskland/icons.json written by the
 * `org.deskland.iconspy` plasmoid running inside the desktop containment
 * (real pixel rectangles `[l, t, r, b]`, refreshed every 500 ms with a
 * timestamp `ts`). When the file is absent, unreadable, or older than 10 s,
 * we fall back to `vis: false` (island-free scene).
 */
(function () {
  'use strict';

  var QS = new URLSearchParams(location.search);
  var HOME = decodeURIComponent(QS.get('home') || '/');
  var CURRENT_THEME = QS.get('theme') || 'meadow';
  var ICONS_JSON = HOME + '/.cache/deskland/icons.json';
  var SETTINGS = HOME + '/.config/deskland/settings.json';
  var ICONS_TTL_MS = 10000;

  var listeners = [];
  var lastIcons = null;
  var lastSettings = null;

  window.chrome = window.chrome || {};
  window.chrome.webview = {
    /* The wallpaper host is fire-and-forget: messages from the page
     * (ready, record, snapshot, share) are requests the wallpaper cannot
     * fulfil, so they are simply ignored. */
    postMessage: function () {},
    addEventListener: function (type, fn) {
      if (type === 'message') listeners.push(fn);
    },
  };
  window.__desklandDeliver = function (json) {
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i]({ data: json }); } catch (e) { /* keep others alive */ }
    }
  };

  /* ---------------- icons (from org.deskland.iconspy) ---------------- */

  function deliverIcons(vis, rects, names) {
    var payload = { t: 'icons', vis: !!vis, r: rects || [] };
    if (Array.isArray(names) && names.length) payload.n = names;
    var msg = JSON.stringify(payload);
    window.__desklandLastIcons = msg;   /* debug aid */
    if (msg !== lastIcons) {
      lastIcons = msg;
      window.__desklandDeliver(msg);
    }
  }

  function pollIcons() {
    var xhr = new XMLHttpRequest();
    try { xhr.open('GET', 'file://' + ICONS_JSON, true); } catch (e) { deliverIcons(false, []); return; }
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      var data = null;
      try {
        if (xhr.responseText) data = JSON.parse(xhr.responseText);
      } catch (e) {
        data = null;
      }
      if (data && data.vis === true && Array.isArray(data.r) && typeof data.ts === 'number') {
        var age = Date.now() - data.ts;
        if (age <= ICONS_TTL_MS && age >= -5000) {
          deliverIcons(true, data.r, Array.isArray(data.n) ? data.n : []);
          return;
        }
      }
      deliverIcons(false, [], []);
    };
    try { xhr.send(); } catch (e) { deliverIcons(false, []); }
  }

  /* ---------------- settings ---------------- */

  var THEME_PAGES = {
    beach: 'flat.html',
    meadow: 'meadow.html',
    aurora: 'aurora.html',
    glade: 'glade.html',
    rift: 'rift.html',
    strike: 'strike.html',
    pocket: 'pocket.html',
    roach: 'roach.html',
    rosebrook: 'rosebrook.html',
    polarnight: 'polarnight.html',
    desert: 'desert.html',
  };

  var CUSTOM_DIR = HOME + '/.config/deskland/themes';
  var PROTO_BASE = (function () {
    var p = QS.get('proto');
    if (p) return decodeURIComponent(p);
    var cur = location.href.split('?')[0];
    if (cur.indexOf('/.config/deskland/themes/') === -1) return cur.replace(/[^/]+$/, '');
    return 'file:///usr/lib/deskland/prototype/';
  })();

  function navigateToThemeUrl(baseUrl, themeId) {
    location.replace(
      baseUrl
      + '?wallpaper=1&v=' + Date.now()
      + '&theme=' + encodeURIComponent(themeId)
      + '&home=' + encodeURIComponent(HOME)
      + '&proto=' + encodeURIComponent(PROTO_BASE)
    );
  }

  function tryCustomTheme(themeId) {
    var xhr = new XMLHttpRequest();
    try { xhr.open('GET', 'file://' + CUSTOM_DIR + '/registry.json', true); } catch (e) { return; }
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      var reg;
      try { reg = JSON.parse(xhr.responseText); } catch (e) { return; }
      var list = (reg && Array.isArray(reg.themes)) ? reg.themes : [];
      for (var i = 0; i < list.length; i++) {
        var item = list[i];
        if (item && item.id === themeId && item.entry) {
          navigateToThemeUrl('file://' + CUSTOM_DIR + '/' + encodeURIComponent(themeId) + '/' + item.entry, themeId);
          return;
        }
      }
    };
    try { xhr.send(); } catch (e) {}
  }

  function tryBuiltinOrCustomTheme(themeId) {
    var xhr = new XMLHttpRequest();
    try { xhr.open('GET', PROTO_BASE + 'themes.json', true); } catch (e) { tryCustomTheme(themeId); return; }
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      try {
        var reg = JSON.parse(xhr.responseText);
        var list = (reg && Array.isArray(reg.themes)) ? reg.themes : [];
        for (var i = 0; i < list.length; i++) {
          var item = list[i];
          if (item && item.id === themeId && item.page && item.status === 'ready') {
            navigateToThemeUrl(PROTO_BASE + item.page, themeId);
            return;
          }
        }
      } catch (e) {}
      tryCustomTheme(themeId);
    };
    try { xhr.send(); } catch (e) { tryCustomTheme(themeId); }
  }

  function pollSettings() {
    var xhr = new XMLHttpRequest();
    try { xhr.open('GET', 'file://' + SETTINGS, true); } catch (e) { return; }
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      var data;
      try { data = JSON.parse(xhr.responseText); } catch (e) { return; }
      if (!data) return;
      var theme = data.theme || 'meadow';
      var page = THEME_PAGES[theme];
      if (theme !== CURRENT_THEME) {
        if (page) {
          navigateToThemeUrl(PROTO_BASE + page, theme);
        } else {
          tryBuiltinOrCustomTheme(theme);
        }
        return;
      }
      var params = (data.params && data.params[theme]) || {};
      var resolved = {};
      for (var k in params) {
        if (Object.prototype.hasOwnProperty.call(params, k)) resolved[k] = params[k];
      }
      if (typeof resolved.audioFile === 'string') {
        resolved.audioSrc = resolved.audioFile
          ? 'file://' + HOME + '/.config/deskland/audio/' + encodeURIComponent(resolved.audioFile)
          : '';
      }
      var msg = JSON.stringify({ t: 'settings', v: resolved });
      window.__desklandLastSettings = msg;   /* debug aid */
      if (msg !== lastSettings) {
        lastSettings = msg;
        window.__desklandDeliver(msg);
      }
    };
    try { xhr.send(); } catch (e) { /* keep polling */ }
  }

  setInterval(pollIcons, 500);
  setInterval(pollSettings, 1000);
  pollIcons();
  pollSettings();
})();
