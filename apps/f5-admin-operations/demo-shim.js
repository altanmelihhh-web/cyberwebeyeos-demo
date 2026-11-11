/* Statik demo: /f5-api/* isteklerini _api/*.json dosyalarından yanıtlar. Backend yok. */
(function () {
  var base = (document.currentScript && document.currentScript.src || location.href).replace(/[^\/]*$/, '');
  var realFetch = window.fetch.bind(window);

  function json(body, status) {
    return new Response(JSON.stringify(body), { status: status || 200, headers: { 'Content-Type': 'application/json' } });
  }

  function toast(msg) {
    var el = document.createElement('div');
    el.textContent = msg;
    el.style.cssText = 'position:fixed;right:16px;bottom:16px;max-width:calc(100vw - 32px);z-index:99999;background:#1f2937;color:#fff;padding:10px 14px;border-radius:6px;font:13px/1.4 system-ui,sans-serif;box-shadow:0 4px 12px rgba(0,0,0,.4)';
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 3500);
  }

  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : input.url;
    var m = /\/f5-api\/([^?#]*)/.exec(url);
    if (!m) return realFetch(input, init);

    var method = ((init && init.method) || (typeof input !== 'string' && input.method) || 'GET').toUpperCase();
    if (method !== 'GET') {
      toast('Statik demo: yazma/çalıştırma işlemleri kapalı.');
      return Promise.resolve(json({ ok: false, error: 'static_demo' }, 403));
    }

    var path = m[1].replace(/\/$/, '');
    // dışa aktarım uçları düz metin döner
    if (/\/(xml|tmsh|as3|terraform|ansible)$/.test(path)) {
      return Promise.resolve(new Response('# Statik demo: dışa aktarma kapalı', { headers: { 'Content-Type': 'text/plain' } }));
    }
    // uygulama 404'te yerel cipher tablosuna düşer
    if (/^ciphers\/lookup\//.test(path)) return Promise.resolve(json({ error: 'static_demo' }, 404));

    var slug = decodeURIComponent(path).replace(/[^\w\/.-]+/g, '_'); // dosya adı: özel karakterler _
    return realFetch(base + '_api/' + slug + '.json').then(function (r) {
      return r.ok ? r : json({ success: true, data: [] });
    });
  };

  // shortcut: f5-admin-operations uses no WebSocket/EventSource/polling, so no stubs needed.
})();
