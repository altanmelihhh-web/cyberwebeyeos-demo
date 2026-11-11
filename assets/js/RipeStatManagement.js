/**
 * RipeStat sayfası — RIPE NCC RIPEstat Data API + Widget API entegrasyonu.
 * ASN/IP/prefix arama (Genel Bakış), BGPlay (resmi widget embed) ve Looking Glass sekmeleri.
 */

const RIPESTAT_SOURCEAPP = 'cyberwebeyeos-portal';
const RIPESTAT_DATA_BASE = 'https://stat.ripe.net/data/';
const RIPESTAT_WIDGET_JS = 'https://stat.ripe.net/widget-api/v1.2/widget_api.js';

let ripeStatLastResource = null;

function initRipeStatPage() {
    // Sayfa her açıldığında yeniden veri çekmeye gerek yok; sadece odak ver.
    const input = document.getElementById('ripestat-resource-input');
    if (input && !ripeStatLastResource) {
        input.focus();
    }
}

function ripeStatSwitchTab(tabId) {
    const shell = document.querySelector('#ripestat-page .ripestat-shell');
    if (!shell) return;
    shell.querySelectorAll('.ripestat-tabs .tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabId));
    shell.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === tabId));

    if (tabId === 'ripestat-bgplay' && ripeStatLastResource) {
        ripeStatLoadBgplay();
    }
}

function ripeStatClassify(resource) {
    const r = resource.trim();
    if (/^as\d+$/i.test(r) || /^\d+$/.test(r)) return 'asn';
    if (r.includes('/') || r.includes(':') || /^\d{1,3}(\.\d{1,3}){3}$/.test(r)) return 'prefix';
    return 'prefix';
}

async function ripeStatFetch(datacall, params) {
    const url = new URL(RIPESTAT_DATA_BASE + datacall + '/data.json');
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    url.searchParams.set('sourceapp', RIPESTAT_SOURCEAPP);
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    if (json.status && json.status !== 'ok' && json.status !== 'maintenance') {
        throw new Error(json.status_message || json.status);
    }
    return json.data || {};
}

function ripeStatBadge(text, tone) {
    return `<span class="ripestat-badge ripestat-badge-${tone}">${text}</span>`;
}

function ripeStatRpkiTone(status) {
    if (status === 'valid') return 'good';
    if (status === 'invalid') return 'bad';
    return 'neutral';
}

async function ripeStatSearch() {
    const input = document.getElementById('ripestat-resource-input');
    const resource = (input?.value || '').trim();
    if (!resource) return;

    ripeStatLastResource = resource;
    const type = ripeStatClassify(resource);

    const emptyEl = document.getElementById('ripestat-overview-empty');
    const resultsEl = document.getElementById('ripestat-overview-results');
    emptyEl.style.display = 'none';
    resultsEl.style.display = 'block';
    resultsEl.innerHTML = '<div class="ripestat-loading"><i class="fas fa-spinner fa-spin"></i> RIPE veritabanı sorgulanıyor...</div>';

    try {
        if (type === 'asn') {
            await ripeStatRenderAsn(resource, resultsEl);
        } else {
            await ripeStatRenderPrefixOrIp(resource, resultsEl);
        }
    } catch (e) {
        resultsEl.innerHTML = `<div class="ripestat-error"><i class="fas fa-triangle-exclamation"></i> RIPE veri servisine ulaşılamadı: ${ripeStatEsc(e.message)}. Kurumsal ağ/proxy politikanız stat.ripe.net çıkışını engelliyor olabilir.</div>`;
    }

    // Looking Glass sekmesini de aynı kaynak için hazırla
    ripeStatLoadLookingGlass(resource);

    // BGPlay sekmesi aktifse widget'ı yenile
    const bgplayTab = document.getElementById('ripestat-bgplay');
    if (bgplayTab && bgplayTab.classList.contains('active')) {
        ripeStatLoadBgplay();
    }
}

async function ripeStatRenderAsn(resource, container) {
    const asResource = /^\d+$/.test(resource) ? 'AS' + resource : resource.toUpperCase();
    const [overview, announced] = await Promise.all([
        ripeStatFetch('as-overview', { resource: asResource }),
        ripeStatFetch('announced-prefixes', { resource: asResource }).catch(() => ({ prefixes: [] }))
    ]);

    const prefixes = (announced.prefixes || []).slice(0, 25);

    container.innerHTML = `
        <div class="ripestat-card">
            <div class="ripestat-card-header">
                <i class="fas fa-building-columns"></i>
                <span>${ripeStatEsc(asResource)} — ${ripeStatEsc(overview.holder || 'Bilinmiyor')}</span>
                ${overview.announced ? ripeStatBadge('Duyuruluyor', 'good') : ripeStatBadge('Duyurulmuyor', 'bad')}
            </div>
            <div class="ripestat-card-body">
                <div class="ripestat-kv"><span>Kaynak Tipi</span><strong>ASN</strong></div>
                <div class="ripestat-kv"><span>Duyurulan Prefix Sayısı</span><strong>${prefixes.length ? prefixes.length + (announced.prefixes && announced.prefixes.length > 25 ? '+' : '') : '0'}</strong></div>
            </div>
        </div>
        <div class="ripestat-card">
            <div class="ripestat-card-header"><i class="fas fa-list"></i><span>Duyurulan Prefixler (ilk 25)</span></div>
            <div class="ripestat-card-body">
                <table class="ripestat-table">
                    <thead><tr><th>Prefix</th><th>Zaman Aralığı</th></tr></thead>
                    <tbody>
                        ${prefixes.map(p => `<tr><td>${ripeStatEsc(p.prefix)}</td><td>${ripeStatEsc((p.timelines || []).map(t => t.starttime + ' → ' + (t.endtime || 'şimdi')).join(', '))}</td></tr>`).join('') || '<tr><td colspan="2">Veri yok</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>`;
}

async function ripeStatRenderPrefixOrIp(resource, container) {
    const [overview, geoloc] = await Promise.all([
        ripeStatFetch('prefix-overview', { resource }).catch(() => null),
        ripeStatFetch('geoloc', { resource }).catch(() => null)
    ]);

    let rpkiHtml = '';
    const asns = overview && overview.asns ? overview.asns : [];
    if (asns.length && overview.resource) {
        const rpkiResults = await Promise.all(asns.slice(0, 5).map(a =>
            ripeStatFetch('rpki-validation', { resource: overview.resource, validating_asn: a.asn }).catch(() => null)
        ));
        rpkiHtml = rpkiResults.filter(Boolean).map((r, i) => `
            <div class="ripestat-kv">
                <span>AS${ripeStatEsc(String(asns[i].asn))} için RPKI</span>
                <strong>${ripeStatBadge(ripeStatEsc(r.status || 'bilinmiyor'), ripeStatRpkiTone(r.status))}</strong>
            </div>`).join('');
    }

    const geo = (geoloc && geoloc.locations && geoloc.locations[0]) || null;

    container.innerHTML = `
        <div class="ripestat-card">
            <div class="ripestat-card-header">
                <i class="fas fa-diagram-project"></i>
                <span>${ripeStatEsc((overview && overview.resource) || resource)}</span>
                ${overview && overview.is_less_specific !== undefined ? ripeStatBadge(overview.announced ? 'Duyuruluyor' : 'Duyurulmuyor', overview.announced ? 'good' : 'bad') : ''}
            </div>
            <div class="ripestat-card-body">
                <div class="ripestat-kv"><span>ASN(ler)</span><strong>${asns.length ? asns.map(a => 'AS' + a.asn + (a.holder ? ' — ' + ripeStatEsc(a.holder) : '')).join(', ') : 'Bilinmiyor'}</strong></div>
                <div class="ripestat-kv"><span>Blok Boyutu</span><strong>${overview && overview.block ? ripeStatEsc(overview.block.resource + ' (' + (overview.block.desc || '') + ')') : '—'}</strong></div>
                ${rpkiHtml}
            </div>
        </div>
        ${geo ? `
        <div class="ripestat-card">
            <div class="ripestat-card-header"><i class="fas fa-earth-europe"></i><span>Geolokasyon</span></div>
            <div class="ripestat-card-body">
                <div class="ripestat-kv"><span>Ülke</span><strong>${ripeStatEsc(geo.country || '—')}</strong></div>
                <div class="ripestat-kv"><span>Şehir</span><strong>${ripeStatEsc(geo.city || '—')}</strong></div>
            </div>
        </div>` : ''}`;
}

async function ripeStatLoadLookingGlass(resource) {
    const emptyEl = document.getElementById('ripestat-lg-empty');
    const resultsEl = document.getElementById('ripestat-lg-results');
    emptyEl.style.display = 'none';
    resultsEl.style.display = 'block';
    resultsEl.innerHTML = '<div class="ripestat-loading"><i class="fas fa-spinner fa-spin"></i> Looking Glass verisi çekiliyor...</div>';

    try {
        const data = await ripeStatFetch('looking-glass', { resource });
        const rrcs = data.rrcs || [];
        if (!rrcs.length) {
            resultsEl.innerHTML = '<div class="ripestat-empty-state"><i class="fas fa-binoculars"></i><p>Bu kaynak için route collector verisi bulunamadı.</p></div>';
            return;
        }
        resultsEl.innerHTML = rrcs.map(rrc => `
            <div class="ripestat-card">
                <div class="ripestat-card-header"><i class="fas fa-server"></i><span>${ripeStatEsc(rrc.rrc || '')} — ${ripeStatEsc(rrc.location || '')}</span></div>
                <div class="ripestat-card-body">
                    <table class="ripestat-table">
                        <thead><tr><th>Peer AS</th><th>Prefix</th><th>AS Path</th><th>Son Güncelleme</th></tr></thead>
                        <tbody>
                            ${(rrc.peers || []).slice(0, 20).map(p => `<tr><td>AS${ripeStatEsc(String(p.asn_origin || ''))}</td><td>${ripeStatEsc(p.prefix || '')}</td><td>${ripeStatEsc((p.as_path || '').toString())}</td><td>${ripeStatEsc(p.last_updated || '')}</td></tr>`).join('') || '<tr><td colspan="4">Peer verisi yok</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>`).join('');
    } catch (e) {
        resultsEl.innerHTML = `<div class="ripestat-error"><i class="fas fa-triangle-exclamation"></i> Looking Glass verisi alınamadı: ${ripeStatEsc(e.message)}.</div>`;
    }
}

/**
 * RIPE'ın widget_api.js dosyası dahili olarak document.write() ile ek script'ler
 * enjekte ediyor. Bu, script sayfa yüklendikten sonra dinamik olarak eklenirse
 * (appendChild) tarayıcı tarafından sessizce yok sayılır ve window.ripestat hiç
 * oluşmaz. Çözüm: RIPE'ın kendi tavsiye ettiği izolasyon yöntemiyle, taze/boş bir
 * iframe belgesi açıp widget script'ini oraya document.write ile yazmak — taze
 * belge henüz "loading" aşamasında olduğu için document.write orada güvenle çalışır.
 */
function ripeStatMountBgplayIframe(containerId, params) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    const iframe = document.createElement('iframe');
    iframe.id = 'ripestat-bgplay-iframe';
    iframe.style.cssText = 'width:100%; height:640px; border:none; display:block;';
    container.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>html,body{margin:0;padding:0;background:transparent;} #bgplay-container{width:100%;}</style>
</head>
<body>
<div id="bgplay-container"></div>
<script src="${RIPESTAT_WIDGET_JS}"><\/script>
<script>
(function() {
    function boot(attempts) {
        if (window.ripestat && typeof window.ripestat.init === 'function') {
            window.ripestat.init('bgplay', ${JSON.stringify(params)}, 'bgplay-container', { size: 'fit' });
            return;
        }
        if (attempts <= 0) {
            document.getElementById('bgplay-container').innerHTML = '<p style="font-family:sans-serif;color:#b91c1c;padding:20px;">BGPlay widget yuklenemedi.</p>';
            return;
        }
        setTimeout(function() { boot(attempts - 1); }, 200);
    }
    boot(50);
})();
<\/script>
</body>
</html>`);
    doc.close();

    // İçerik yüksekliğine göre iframe'i otomatik büyüt (aynı origin'de yazdığımız için erişim serbest)
    let lastHeight = 0;
    const resizeToContent = () => {
        try {
            const body = iframe.contentWindow.document.body;
            const h = Math.max(body.scrollHeight, 640);
            if (h !== lastHeight) {
                iframe.style.height = h + 'px';
                lastHeight = h;
            }
        } catch (e) { /* henüz erişilemiyor, yoksay */ }
    };
    const resizeInterval = setInterval(resizeToContent, 500);
    setTimeout(() => clearInterval(resizeInterval), 30000);
}

async function ripeStatLoadBgplay() {
    if (!ripeStatLastResource) {
        return;
    }
    const emptyEl = document.getElementById('ripestat-bgplay-empty');
    const widgetEl = document.getElementById('ripestat-bgplay-widget');
    emptyEl.style.display = 'none';
    widgetEl.style.display = 'block';

    const hours = parseInt(document.getElementById('ripestat-bgplay-range')?.value || '24', 10);
    const endtime = new Date();
    const starttime = new Date(endtime.getTime() - hours * 3600 * 1000);

    ripeStatMountBgplayIframe('ripestat-bgplay-widget', {
        resource: ripeStatLastResource,
        starttime: starttime.toISOString().slice(0, 16),
        endtime: endtime.toISOString().slice(0, 16),
        sourceapp: RIPESTAT_SOURCEAPP
    });
}

function ripeStatEsc(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
}
