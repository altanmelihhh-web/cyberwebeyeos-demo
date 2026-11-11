/* Statik demo: /netwatch/api/* (axios -> XHR) isteklerini _api/*.json dosyalarından yanıtlar. Backend, socket.io yok. */
(function () {
  var T0 = 1767225600; // örnek verinin "şimdi" anı; zamanlar gerçek şimdiye kaydırılır
  var base = (document.currentScript && document.currentScript.src || location.href).replace(/[^\/]*$/, '');
  var realFetch = window.fetch.bind(window);
  var xOpen = XMLHttpRequest.prototype.open, xSend = XMLHttpRequest.prototype.send;

  function toast(msg) {
    var el = document.createElement('div');
    el.textContent = msg;
    el.style.cssText = 'position:fixed;right:16px;bottom:16px;max-width:calc(100vw - 32px);z-index:99999;background:#1e293b;color:#fff;padding:10px 14px;border-radius:6px;font:13px/1.4 system-ui,sans-serif;box-shadow:0 4px 12px rgba(0,0,0,.4)';
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 3500);
  }

  // 10 gün içindeki epoch-saniye değerlerini delta kadar kaydır
  function shift(v, d) {
    if (typeof v === 'number') return v > 1e9 && v < 1e10 && Math.abs(v - T0) <= 864000 ? v + d : v;
    if (Array.isArray(v)) return v.map(function (x) { return shift(x, d); });
    if (v && typeof v === 'object') { var o = {}; for (var k in v) o[k] = shift(v[k], d); return o; }
    return v;
  }

  // dosya adı: yol + ayırt edici sorgu parametreleri (örn. metrics__targetId=1_type=ping_latency)
  function fileFor(u) {
    var p = decodeURIComponent(u.pathname.replace(/^.*\/netwatch\/api\//, '').replace(/\/$/, ''));
    var keys = /^history/.test(p) ? ['target'] : ['metric', 'provider', 'targetId', 'type'];
    var parts = keys.filter(function (k) { return u.searchParams.has(k); })
      .map(function (k) { return k + '=' + u.searchParams.get(k); });
    return { full: parts.length ? p + '__' + parts.join('_') : p, plain: p };
  }

  function load(name) {
    return realFetch(base + '_api/' + name + '.json').then(function (r) { return r.ok ? r.json() : null; });
  }

  function respond(x, status, body) {
    var text = JSON.stringify(body);
    function def(k, v) { Object.defineProperty(x, k, { value: v, configurable: true }); }
    def('readyState', 4); def('status', status); def('statusText', status === 200 ? 'OK' : 'Error');
    def('responseText', text); def('response', text); def('responseURL', x._u.href);
    x.getAllResponseHeaders = function () { return 'content-type: application/json\r\n'; };
    x.getResponseHeader = function (h) { return /content-type/i.test(h) ? 'application/json' : null; };
    ['readystatechange', 'load', 'loadend'].forEach(function (t) { x.dispatchEvent(new Event(t)); });
  }

  XMLHttpRequest.prototype.open = function (method, url) {
    var u = new URL(url, location.href);
    if (/\/netwatch\/(api|socket\.io)\//.test(u.pathname)) { this._m = method.toUpperCase(); this._u = u; }
    return xOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function () {
    var x = this;
    if (!x._u) return xSend.apply(x, arguments);
    setTimeout(function () {
      if (/socket\.io/.test(x._u.pathname)) { x.dispatchEvent(new Event('error')); x.dispatchEvent(new Event('loadend')); return; } // shortcut: canlı akış yok, bağlantı hep düşer
      if (x._m !== 'GET') { toast('Statik demo: yazma/çalıştırma işlemleri kapalı.'); return respond(x, 403, { ok: false, error: 'static_demo' }); }
      var f = fileFor(x._u), d = Math.floor(Date.now() / 1000) - T0;
      load(f.full).then(function (j) { return j || (f.full !== f.plain ? load(f.plain) : null); }).then(function (j) {
        respond(x, 200, j ? shift(j, d) : { success: true, data: [] });
      });
    }, 0);
  };

  // shortcut: WebSocket yalnız socket.io için kullanılıyor; hiç açılmayan stub, socket.io polling'e düşüp yine bağlanamaz.
  var RealWS = window.WebSocket;
  window.WebSocket = function (url) {
    if (!/socket\.io/.test(url)) return new RealWS(url);
    var ws = new EventTarget(); ws.readyState = 3; ws.close = ws.send = function () {};
    setTimeout(function () { ['error', 'close'].forEach(function (t) { var e = new Event(t); if (ws['on' + t]) ws['on' + t](e); ws.dispatchEvent(e); }); }, 0);
    return ws;
  };
})();
