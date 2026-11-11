// ReputationManagement.js
// Portal'ın Reputation & Blocklist Monitor dashboard'unu yönetir.
// loadReputationAll() showPage('reputation') case'inde tetiklenir.

(function () {
    'use strict';

    const API = 'api/reputation-status.php';

    // ========== Yardımcılar ==========
    function fmtDate(s) {
        if (!s) return '—';
        try {
            const d = new Date(s);
            if (isNaN(d)) return s;
            return d.toLocaleString('tr-TR', { hour12: false });
        } catch (e) { return s; }
    }

    function fmtDuration(sec) {
        if (sec == null) return '—';
        sec = parseInt(sec, 10);
        if (sec < 60) return sec + ' sn';
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m} dk ${s} sn`;
    }

    function escapeHtml(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function badge(status) {
        const cls = 'rep-badge ' + escapeHtml(status || 'unsupported');
        return `<span class="${cls}">${escapeHtml(status || '—')}</span>`;
    }

    function catBadge(cat) {
        return `<span class="rep-badge cat-${escapeHtml(cat)}">${escapeHtml(cat)}</span>`;
    }

    function reasonHtml(row) {
        const d = row.details;
        const lookupUrl = row.lookup_url;
        const providerKey = row.provider_key;
        let parts = [];

        if (d && typeof d === 'object') {
            // --- VirusTotal özel render ---
            if (providerKey === 'virustotal') {
                const mal = parseInt(d.malicious || 0, 10);
                const sus = parseInt(d.suspicious || 0, 10);
                const total = parseInt(d.total || 0, 10);
                const rep = d.reputation;

                if (mal > 0 || sus > 0) {
                    parts.push(`<span class="rep-decoded-chip severity-${mal >= 2 ? 'critical' : 'warning'}">⚠ ${mal} kötü · ${sus} şüpheli / ${total} vendor</span>`);
                } else {
                    parts.push(`<span class="rep-decoded-chip severity-info">✓ 0 / ${total} vendor temiz</span>`);
                }

                if (rep != null && rep !== 0) {
                    const cls = rep < 0 ? 'severity-warning' : 'severity-info';
                    parts.push(`<span class="rep-decoded-chip ${cls}">skor: ${escapeHtml(String(rep))}</span>`);
                }

                // Firewall vendor özel görünüm
                if (d.firewall_verdicts && typeof d.firewall_verdicts === 'object') {
                    const fwBad = Object.entries(d.firewall_verdicts)
                        .filter(([_, v]) => v.category === 'malicious' || v.category === 'suspicious');
                    if (fwBad.length) {
                        const chips = fwBad.map(([vendor, v]) =>
                            `<span class="rep-decoded-chip severity-critical" title="${escapeHtml(v.result || '')}">🛡 ${escapeHtml(vendor)}: ${escapeHtml(v.category)}</span>`
                        ).join('');
                        parts.push(`<div style="margin-top:3px;">${chips}</div>`);
                    }
                }

                // Kategoriler
                if (d.categories && typeof d.categories === 'object' && Object.keys(d.categories).length) {
                    const catList = Object.entries(d.categories).slice(0, 3)
                        .map(([k, v]) => escapeHtml(`${k}: ${v}`)).join(' · ');
                    parts.push(`<div style="font-size:.74rem;color:#7f8c8d;margin-top:2px;">📁 ${catList}</div>`);
                }

                // İlk 3 flag'li vendor
                if (Array.isArray(d.flagged) && d.flagged.length) {
                    const flagged = d.flagged.slice(0, 3).map(f =>
                        `<span style="color:#c0392b;font-size:.75rem;" title="${escapeHtml(f.result || '')}">${escapeHtml(f.vendor)}</span>`
                    ).join(', ');
                    parts.push(`<div style="font-size:.74rem;color:#95a5a6;margin-top:2px;">diğer: ${flagged}${d.flagged.length > 3 ? '…' : ''}</div>`);
                }
            }

            // --- DNSBL / generic decoded ---
            else if (Array.isArray(d.decoded) && d.decoded.length) {
                // Canlı scrape ile alınmış insan-okur sebep varsa onu önce göster
                if (d.human_reason) {
                    const sevClass = d.rating === 'poor' || d.rating === 'bad' ? 'critical'
                                   : d.rating === 'fair' ? 'warning'
                                   : 'info';
                    parts.push(`<span class="rep-decoded-chip severity-${sevClass}">${escapeHtml(d.human_reason)}</span>`);
                    if (d.removal_url) {
                        parts.push(`<a class="rep-reason-link" href="${escapeHtml(d.removal_url)}" target="_blank" rel="noopener">✋ kaldırma isteği</a>`);
                    }
                } else {
                    const chips = d.decoded.map(c =>
                        `<span class="rep-decoded-chip severity-${escapeHtml(c.severity || 'warning')}" title="${escapeHtml(c.code)}">${escapeHtml(c.name)}</span>`
                    ).join('');
                    parts.push(chips);
                }

                if (Array.isArray(d.reasons) && d.reasons.length) {
                    const rs = d.reasons.filter(r => r && typeof r === 'string' && r.trim() !== '' && !/^https?:\/\//.test(r));
                    if (rs.length) {
                        parts.push(`<div style="font-size:.74rem;color:#7f8c8d;margin-top:2px;">${escapeHtml(rs.slice(0, 2).join(' | '))}</div>`);
                    }
                }
            }

            // --- Shodan InternetDB (exposure) ---
            else if (providerKey === 'shodan_db') {
                // Açık portlar chip olarak
                const ports = Array.isArray(d.ports) ? d.ports : [];
                const criticalPorts = Array.isArray(d.critical_ports) ? d.critical_ports : [];
                const vulns = Array.isArray(d.vulns) ? d.vulns : [];

                if (ports.length) {
                    const portChips = ports.map(p => {
                        const isCrit = criticalPorts.indexOf(p) !== -1;
                        const cls = isCrit ? 'critical' : 'warning';
                        return `<span class="rep-decoded-chip severity-${cls}">📡 ${escapeHtml(p)}</span>`;
                    }).join(' ');
                    parts.push(portChips);
                }
                if (vulns.length) {
                    const vulnChips = vulns.slice(0, 3).map(v =>
                        `<span class="rep-decoded-chip severity-critical">🐛 ${escapeHtml(v)}</span>`
                    ).join(' ');
                    parts.push(`<div style="margin-top:3px;">${vulnChips}${vulns.length > 3 ? ` +${vulns.length - 3}` : ''}</div>`);
                }
                // Risk skoru
                if (d.risk && typeof d.risk === 'object' && d.risk.score != null) {
                    const sev = d.risk.severity || 'info';
                    const sevClass = sev === 'critical' ? 'critical' : sev === 'high' ? 'critical' : sev === 'medium' ? 'warning' : 'info';
                    parts.push(`<span class="rep-decoded-chip severity-${sevClass}">⚠ risk ${d.risk.score}/100 (${escapeHtml(sev)})</span>`);
                }
                // Hostname varsa küçük metin olarak
                if (Array.isArray(d.hostnames) && d.hostnames.length) {
                    parts.push(`<div style="font-size:.72rem;color:#95a5a6;margin-top:2px;">${escapeHtml(d.hostnames[0])}</div>`);
                }
            }

            // --- NTP amplification probe ---
            else if (providerKey === 'ntp_amp_check') {
                if (d.amplification_ratio) {
                    parts.push(`<span class="rep-decoded-chip severity-critical">🚨 NTP amplification ${escapeHtml(d.amplification_ratio)}x</span>`);
                }
                if (d.response_size) {
                    parts.push(`<span style="font-size:.74rem;color:#7f8c8d;">cevap: ${escapeHtml(d.response_size)} byte</span>`);
                }
                if (d.fix_hint) {
                    parts.push(`<div style="font-size:.72rem;color:#b9770e;margin-top:2px;">💡 ${escapeHtml(d.fix_hint)}</div>`);
                }
            }

            // --- URLhaus ---
            else if (providerKey === 'urlhaus' && d.url_count != null) {
                parts.push(`<span class="rep-decoded-chip severity-critical">🦠 ${d.url_count} malware URL</span>`);
                if (d.firstseen) parts.push(`<span style="font-size:.74rem;color:#7f8c8d;">first seen ${escapeHtml(d.firstseen)}</span>`);
            }

            // --- Talos ---
            else if (providerKey === 'talos') {
                if (d.category_pretty) parts.push(`<span class="rep-decoded-chip severity-warning">📁 ${escapeHtml(d.category_pretty)}</span>`);
                if (d.threat_level)    parts.push(`<span class="rep-decoded-chip severity-${d.threat_level === 'Blacklist' ? 'critical' : 'info'}">${escapeHtml(d.threat_level)}</span>`);
                if (d.web_score)       parts.push(`<span style="font-size:.74rem;color:#7f8c8d;">web: ${escapeHtml(d.web_score)}</span>`);
            }

            // --- RIPEstat routing ---
            else if (providerKey === 'ripestat') {
                if (d.ownership === 'ours' && d.rpki_worst) {
                    const sev = d.rpki_worst === 'invalid' ? 'critical' : d.rpki_worst === 'unknown' ? 'warning' : 'info';
                    parts.push(`<span class="rep-decoded-chip severity-${sev}">RPKI ${escapeHtml(d.rpki_worst)}</span>`);
                }
                if (Array.isArray(d.origin_asns) && d.origin_asns.length) {
                    const asnList = d.origin_asns.map(a => `AS${a.asn}`).join(', ');
                    parts.push(`<div style="font-size:.74rem;color:#7f8c8d;">origin: ${escapeHtml(asnList)}</div>`);
                }
            }

            // --- GENERIC: human_reason fallback (her provider için) ---
            // Yukarıdaki özel branch'ler eşleşmemiş veya eşleşmiş ama part üretmemişse
            // human_reason varsa onu göster — bu %90 durumda dolu olur
            if (d.human_reason && !parts.some(p => typeof p === 'string' && p.indexOf('human_reason') !== -1)) {
                // Eğer parts tamamen boşsa human_reason'u büyük chip olarak ekle
                if (parts.length === 0) {
                    parts.push(`<span class="rep-decoded-chip severity-warning">${escapeHtml(d.human_reason)}</span>`);
                } else {
                    // Zaten bir şey var — human_reason'u alt satıra küçük not olarak
                    parts.push(`<div style="font-size:.72rem;color:#7f8c8d;margin-top:2px;">${escapeHtml(d.human_reason)}</div>`);
                }
            }

            // --- Hata/rate limit ---
            if (d.error) {
                parts.push(`<div style="color:#b9770e;font-size:.76rem;">⚠ ${escapeHtml(d.error)}</div>`);
            }

            // --- Son çare: raw kodlar ---
            if (!parts.length && Array.isArray(d.return_codes) && d.return_codes.length) {
                parts.push(`<code style="font-size:.76rem;color:#95a5a6;">${escapeHtml(d.return_codes.join(', '))}</code>`);
            }

            // --- Note fallback (baseline kabul, ISP-assigned vb) ---
            if (!parts.length && d.note) {
                parts.push(`<span style="color:#7f8c8d;font-size:.82rem;">${escapeHtml(d.note)}</span>`);
            }
        }

        // Hâlâ boşsa sebep alanına status + kategori bazlı açıklayıcı metin koy
        if (!parts.length) {
            const fallbackMsg = row.status === 'listed'
                ? `${row.provider_name || 'Bilinmeyen sağlayıcı'} listedi (detay verisi eksik)`
                : row.status === 'rate_limited'
                ? `${row.provider_name || 'Sağlayıcı'} rate-limit / resolver bloklu — doğrulama için linke tıklayın`
                : row.status === 'error'
                ? 'Sorgu sırasında hata — ${row.provider_name || "sağlayıcı"} şu an cevap vermiyor'
                : '—';
            parts.push(`<span style="color:#95a5a6;font-style:italic;">${escapeHtml(fallbackMsg)}</span>`);
        }

        // Doğrulama linki — her provider için lookup_url + özel permalink'ler
        const permalink = (d && (d.vt_permalink || d.talos_permalink || d.urlhaus_permalink)) || lookupUrl;
        if (permalink) {
            parts.push(`<a class="rep-reason-link" href="${escapeHtml(permalink)}" target="_blank" rel="noopener" title="Sağlayıcı sayfasında doğrula">🔗 doğrula</a>`);
        }

        return parts.join(' ');
    }

    async function apiGet(params) {
        const qs = new URLSearchParams(params).toString();
        const res = await fetch(`${API}?${qs}`, { credentials: 'same-origin' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
    }

    async function apiPost(params, body) {
        const qs = new URLSearchParams(params).toString();
        const res = await fetch(`${API}?${qs}`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body || {}),
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
    }

    // ========== Yükleyiciler ==========
    async function loadReputationSummary() {
        try {
            const r = await apiGet({ action: 'summary' });
            if (!r.success) throw new Error(r.error || 'API hatası');
            renderSummary(r.data);
            renderOwners(r.data.owners || []);
            renderProvidersTab(r.data.providers || []);
            populateFilterDropdowns(r.data);
        } catch (e) {
            document.getElementById('rep-stats').innerHTML =
                `<div class="rep-empty">Hata: ${escapeHtml(e.message)}</div>`;
        }
    }

    function renderSummary(data) {
        const t = data.totals || {};
        const lv = data.levels || {};
        const lr = data.last_run;
        const totalCount = parseInt(t.total_assets || 0, 10);

        const crit = parseInt(lv.critical || 0, 10);
        const caut = parseInt(lv.caution || 0, 10);
        const pfp  = parseInt(lv.possible_fp || 0, 10);
        const cln  = parseInt(lv.clean || 0, 10);

        const critCls = crit > 0 ? 'bad'  : 'ok';
        const cautCls = caut > 0 ? 'warn' : 'ok';

        const html = `
            <div class="rep-card">
                <h4>İzlenen Varlık</h4>
                <div class="num">${totalCount}</div>
                <div class="sub">IP + Domain + Prefix</div>
            </div>
            <div class="rep-card ${critCls}">
                <h4>🔴 Kritik</h4>
                <div class="num">${crit}</div>
                <div class="sub">acil aksiyon</div>
            </div>
            <div class="rep-card ${cautCls}">
                <h4>🟠 Dikkat</h4>
                <div class="num">${caut}</div>
                <div class="sub">authoritative uyarı</div>
            </div>
            <div class="rep-card">
                <h4>🟡 Olası F/P</h4>
                <div class="num">${pfp}</div>
                <div class="sub">tek kaynak listelemesi</div>
            </div>
            <div class="rep-card ok">
                <h4>🟢 Temiz</h4>
                <div class="num">${cln}</div>
                <div class="sub">sağlıklı</div>
            </div>
            <div class="rep-card">
                <h4>Aktif Sağlayıcı</h4>
                <div class="num">${t.active_providers || 0}</div>
                <div class="sub">DNSBL / Routing / Exposure</div>
            </div>
        `;
        document.getElementById('rep-stats').innerHTML = html;

        const lrEl = document.getElementById('rep-last-run-info');
        if (lr) {
            lrEl.textContent = `Son tarama: ${fmtDate(lr.finished_at || lr.started_at)} · ${lr.assets_checked || 0} varlık · ${lr.findings_new || 0} yeni`;
        } else {
            lrEl.textContent = 'Henüz tarama yapılmadı';
        }
    }

    function renderOwners(owners) {
        const tbody = document.getElementById('rep-owners-body');
        if (!owners.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="rep-empty">Kayıt yok</td></tr>';
            return;
        }
        tbody.innerHTML = owners.map(o => {
            const listed = parseInt(o.listed_assets || 0, 10);
            const badgeCls = listed > 0 ? 'listed' : 'clean';
            const badgeTxt = listed > 0 ? `${listed} listelendi` : 'temiz';
            return `
                <tr>
                    <td><strong>${escapeHtml(o.owner || '—')}</strong></td>
                    <td>${o.total_assets}</td>
                    <td>${listed}</td>
                    <td>${o.listed_findings || 0}</td>
                    <td>${o.clean_findings || 0}</td>
                    <td><span class="rep-badge ${badgeCls}">${badgeTxt}</span></td>
                </tr>
            `;
        }).join('');
    }

    function renderProvidersTab(providers) {
        // Detaylı kart render için catalog verisini çek
        apiGet({ action: 'providers' }).then(r => {
            if (!r.success) return;
            renderProvidersCards(r.data);
        });
    }

    function renderProvidersCards(providers) {
        const tbody = document.getElementById('rep-providers-body');
        if (!providers.length) {
            tbody.innerHTML = '<tr><td colspan="3" class="rep-empty">Kayıt yok</td></tr>';
            return;
        }
        tbody.innerHTML = providers.map(p => {
            const cat = p.catalog || {};
            const listedCount = parseInt(p.listed_count || 0, 10);
            const enabled = !!p.is_enabled;
            const urls = (cat.urls || []).map(u =>
                `<a href="${escapeHtml(u.url)}" target="_blank" rel="noopener" class="rep-btn-recheck" style="text-decoration:none;background:#3498db;margin-right:4px;">${escapeHtml(u.label)}</a>`
            ).join('');
            const how = (cat.how || []).length
                ? `<ul style="margin:4px 0 8px 18px;padding:0;font-size:.78rem;color:#7f8c8d;">${cat.how.map(h => `<li>${escapeHtml(h)}</li>`).join('')}</ul>`
                : '';
            return `
                <tr>
                    <td colspan="3" style="padding:14px;">
                        <div style="display:flex;gap:16px;align-items:flex-start;">
                            <div style="flex:1;">
                                <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
                                    <strong style="color:#2c3e50;font-size:1rem;">${escapeHtml(cat.title || p.display_name)}</strong>
                                    ${catBadge(p.category)}
                                    <span class="rep-badge ${enabled ? 'clean' : 'rate_limited'}">${enabled ? '✓ aktif' : 'devre dışı'}</span>
                                    ${listedCount > 0 ? `<span class="rep-badge listed">${listedCount} listed</span>` : ''}
                                </div>
                                <div style="font-size:.85rem;color:#34495e;margin-bottom:6px;">${escapeHtml(cat.summary || '—')}</div>
                                ${how ? `<details><summary style="cursor:pointer;font-size:.78rem;color:#3498db;">Nasıl çalışır?</summary>${how}</details>` : ''}
                                ${cat.criteria ? `<div style="font-size:.78rem;color:#7f8c8d;margin-top:4px;"><strong>Kriter:</strong> ${escapeHtml(cat.criteria)}</div>` : ''}
                                <div style="margin-top:8px;">${urls}</div>
                            </div>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function populateFilterDropdowns(data) {
        const ownerSel = document.getElementById('rep-filter-owner');
        const current = ownerSel.value;
        const ownerOpts = '<option value="">Tümü</option>' +
            (data.owners || []).map(o => `<option value="${escapeHtml(o.owner)}">${escapeHtml(o.owner)} (${o.total_assets})</option>`).join('');
        ownerSel.innerHTML = ownerOpts;
        ownerSel.value = current;
        // Aynı owner listesini ranking ve assets filtreleri için de doldur
        ['rep-rank-owner','rep-assets-owner-filter'].forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            const cur = el.value;
            el.innerHTML = ownerOpts;
            el.value = cur;
        });

        apiGet({ action: 'providers' }).then(r => {
            if (!r.success) return;
            const provSel = document.getElementById('rep-filter-provider');
            const cur = provSel.value;
            provSel.innerHTML = '<option value="">Tümü</option>' +
                r.data.map(p => `<option value="${escapeHtml(p.provider_key)}">${escapeHtml(p.display_name)}</option>`).join('');
            provSel.value = cur;
        }).catch(() => {});
    }

    // Seçili finding id'leri
    let selectedFindingIds = new Set();

    async function loadReputationDetails() {
        const owner    = document.getElementById('rep-filter-owner').value;
        const status   = document.getElementById('rep-filter-status').value;
        const provider = document.getElementById('rep-filter-provider').value;
        const ack      = document.getElementById('rep-filter-ack')?.value ?? 'active';

        const tbody = document.getElementById('rep-findings-body');
        tbody.innerHTML = '<tr><td colspan="9" class="rep-loading">Yükleniyor…</td></tr>';

        try {
            const params = { action: 'details' };
            if (owner)    params.owner = owner;
            if (status)   params.status = status;
            if (provider) params.provider = provider;

            const r = await apiGet(params);
            if (!r.success) throw new Error(r.error || 'API hatası');

            let rows = r.data || [];
            if (ack) rows = rows.filter(r => (r.ack_state || 'active') === ack);

            document.getElementById('rep-details-count').textContent = `${rows.length} kayıt`;

            if (!rows.length) {
                tbody.innerHTML = '<tr><td colspan="9" class="rep-empty">Kayıt yok — filtreleri gevşetmeyi deneyin</td></tr>';
                selectedFindingIds.clear();
                updateBulkBar();
                return;
            }

            tbody.innerHTML = rows.map(row => {
                const ackState = row.ack_state || 'active';
                const ackLabel = ackStateLabel(ackState);
                const isChecked = selectedFindingIds.has(row.finding_id);
                return `
                    <tr data-finding-id="${row.finding_id}" style="${ackState !== 'active' ? 'opacity:.65;' : ''}">
                        <td><input type="checkbox" class="rep-fnd-cb" ${isChecked ? 'checked' : ''} onchange="toggleFinding(${row.finding_id}, this.checked)"></td>
                        <td><span class="rep-mono">${escapeHtml(row.asset_value)}</span></td>
                        <td>${escapeHtml(row.owner || '—')}</td>
                        <td>${escapeHtml(row.provider_name)}</td>
                        <td>${catBadge(row.provider_category)}</td>
                        <td>${badge(row.status)}</td>
                        <td>
                            <span class="rep-consensus ${ackCssClass(ackState)}" title="${escapeHtml(row.ack_note || '')}">${escapeHtml(ackLabel)}</span>
                            ${ackState !== 'active' && row.ack_by ? `<div style="font-size:.7rem;color:#95a5a6;">${escapeHtml(row.ack_by)} · ${fmtDate(row.ack_at)}</div>` : ''}
                        </td>
                        <td style="max-width:300px;">${reasonHtml(row)}</td>
                        <td style="min-width:120px;">
                            <select onchange="quickAck(${row.finding_id}, this.value)" style="padding:4px;border:1px solid #ddd;border-radius:3px;font-size:.75rem;max-width:120px;">
                                <option value="">işaretle…</option>
                                <option value="fp">❌ F/P</option>
                                <option value="accepted">✓ Kabul</option>
                                <option value="resolved">🔧 Kapatıldı</option>
                                ${ackState !== 'active' ? '<option value="active">↺ Aktif yap</option>' : ''}
                            </select>
                        </td>
                    </tr>
                `;
            }).join('');
        } catch (e) {
            tbody.innerHTML = `<tr><td colspan="9" class="rep-empty">Hata: ${escapeHtml(e.message)}</td></tr>`;
        }
    }

    function ackStateLabel(state) {
        return { active:'🟢 Aktif', resolved:'🔧 Kapatıldı', fp:'❌ F/P', accepted:'✓ Kabul' }[state] || state;
    }
    function ackCssClass(state) {
        return { active:'clean', resolved:'caution', fp:'possible_fp', accepted:'possible_fp' }[state] || 'clean';
    }

    // ========== Ack seçim ve bulk işlemler ==========
    function toggleFinding(id, checked) {
        if (checked) selectedFindingIds.add(id);
        else selectedFindingIds.delete(id);
        updateBulkBar();
    }
    function toggleAllFindings(master) {
        document.querySelectorAll('.rep-fnd-cb').forEach(cb => {
            cb.checked = master.checked;
            const id = parseInt(cb.closest('tr').dataset.findingId, 10);
            if (master.checked) selectedFindingIds.add(id);
            else selectedFindingIds.delete(id);
        });
        updateBulkBar();
    }
    function clearSelection() {
        selectedFindingIds.clear();
        document.querySelectorAll('.rep-fnd-cb').forEach(cb => cb.checked = false);
        updateBulkBar();
    }
    function updateBulkBar() {
        const bar = document.getElementById('rep-bulk-ack-bar');
        const n = selectedFindingIds.size;
        if (!bar) return;
        bar.style.display = n > 0 ? 'flex' : 'none';
        document.getElementById('rep-bulk-count').textContent = `${n} seçili`;
    }

    // Tek satır hızlı ack (dropdown)
    async function quickAck(findingId, state) {
        if (!state) return;
        openAckModal([findingId], state);
    }

    // Toplu ack
    function bulkAck(state) {
        if (selectedFindingIds.size === 0) return;
        openAckModal([...selectedFindingIds], state);
    }

    function openAckModal(ids, state) {
        const labels = { fp:'F/P (yanlış alarm)', accepted:'Kabul (biliyorum)', resolved:'Kapatıldı (sorun giderildi)', active:'Aktif' };
        document.getElementById('rep-ack-modal-title').textContent = `${ids.length} bulguyu işaretle: ${labels[state] || state}`;
        document.getElementById('rep-ack-modal-desc').textContent = state === 'resolved'
            ? 'Kapatıldı: bir sonraki tarama yine tespit ederse tekrar alarm üretir.'
            : state === 'active'
            ? 'Aktif: bu bulgu normal alarm akışına döner.'
            : 'Sonraki taramalar bu bulguyu sessizce atlar (ignore).';
        document.getElementById('rep-ack-modal-note').value = '';
        document.getElementById('rep-ack-modal').style.display = 'flex';
        document.getElementById('rep-ack-modal-confirm').onclick = async () => {
            const note = document.getElementById('rep-ack-modal-note').value;
            try {
                const r = await apiPost({ action: 'acknowledge' }, { finding_ids: ids, state, note });
                if (!r.success) { alert('Hata: ' + (r.error || '—')); return; }
                closeAckModal();
                clearSelection();
                loadReputationDetails();
                loadReputationSummary();
            } catch (e) { alert('Hata: ' + e.message); }
        };
    }
    function closeAckModal() {
        document.getElementById('rep-ack-modal').style.display = 'none';
    }

    async function loadReputationRuns() {
        const tbody = document.getElementById('rep-runs-body');
        tbody.innerHTML = '<tr><td colspan="9" class="rep-loading">Yükleniyor…</td></tr>';
        try {
            const r = await apiGet({ action: 'runs' });
            if (!r.success) throw new Error(r.error || 'API hatası');
            const runs = r.data || [];
            if (!runs.length) {
                tbody.innerHTML = '<tr><td colspan="9" class="rep-empty">Henüz tarama yapılmadı</td></tr>';
                return;
            }
            tbody.innerHTML = runs.map(run => `
                <tr>
                    <td>${run.id}</td>
                    <td>${fmtDate(run.started_at)}</td>
                    <td>${fmtDuration(run.duration_sec)}</td>
                    <td>${run.assets_checked}</td>
                    <td>${run.providers_queried}</td>
                    <td>${parseInt(run.findings_new,10) > 0 ? `<span class="rep-badge listed">${run.findings_new}</span>` : run.findings_new}</td>
                    <td>${parseInt(run.findings_cleared,10) > 0 ? `<span class="rep-badge clean">${run.findings_cleared}</span>` : run.findings_cleared}</td>
                    <td>${parseInt(run.errors,10) > 0 ? `<span class="rep-badge error">${run.errors}</span>` : run.errors}</td>
                    <td>${escapeHtml(run.triggered_by)}</td>
                </tr>
            `).join('');
        } catch (e) {
            tbody.innerHTML = `<tr><td colspan="9" class="rep-empty">Hata: ${escapeHtml(e.message)}</td></tr>`;
        }
    }

    function resetReputationFilters() {
        document.getElementById('rep-filter-owner').value = '';
        document.getElementById('rep-filter-status').value = 'listed';
        document.getElementById('rep-filter-provider').value = '';
        loadReputationDetails();
    }

    async function recheckReputationAsset(assetId) {
        try {
            const r = await apiPost({ action: 'recheck' }, { asset_id: assetId });
            if (!r.success) { alert('Hata: ' + (r.error || 'bilinmiyor')); return; }
            const listed = (r.results || []).filter(x => x.status === 'listed').length;
            alert(`Yeniden tarama tamamlandı — ${listed} sağlayıcıda listelenmiş.`);
            loadReputationAll();
        } catch (e) {
            alert('Hata: ' + e.message);
        }
    }

    function loadReputationAll() {
        loadReputationSummary();
        loadReputationDetails();
        loadReputationRuns();
        loadReputationRanking();
        loadReputationExposure();
        loadReputationNotifications();
        loadReputationReferences();
        renderConsensusDiagram();
        refreshActiveRun();
        startActivePolling();
    }

    // ========== Consensus Diyagramı (dinamik) ==========
    async function renderConsensusDiagram() {
        const el = document.getElementById('rep-flow-diagram');
        if (!el) return;
        try {
            const r = await apiGet({ action: 'providers' });
            if (!r.success) throw new Error('providers API hatası');
            const providers = r.data || [];
            // Sadece aktif provider'lar
            const active = providers.filter(p => p.is_enabled);

            // Kategoriye göre grupla
            const groups = {};
            active.forEach(p => {
                const cat = p.category || 'other';
                if (!groups[cat]) groups[cat] = [];
                groups[cat].push(p);
            });

            // Kategori meta
            const catMeta = {
                dnsbl:    { label: 'DNSBL (Mail Reputation)',  icon: '📧', color: '#3498db', auth: false },
                abuse:    { label: 'Abuse / Threat Intel',     icon: '🦠', color: '#e74c3c', auth: true  },
                web_cat:  { label: 'Web Category',             icon: '📁', color: '#9b59b6', auth: true  },
                routing:  { label: 'Routing & BGP',            icon: '🛰', color: '#16a085', auth: true  },
                exposure: { label: 'Exposure / Surface',       icon: '🛡', color: '#e67e22', auth: true  },
                dns:      { label: 'DNS Health',               icon: '🌐', color: '#2980b9', auth: true  },
            };

            // Toplam provider sayısı
            const totalCount = active.length;
            const totalAuth  = active.filter(p => catMeta[p.category]?.auth).length;
            const totalOpin  = totalCount - totalAuth;

            // --- HTML/CSS diyagram ---
            let html = `
                <div style="display:grid;grid-template-columns:170px 1fr 200px;gap:16px;align-items:center;">

                    <!-- Sol: IP/Domain/Prefix giriş -->
                    <div style="background:#3498db;color:#fff;padding:16px;border-radius:8px;text-align:center;font-weight:700;box-shadow:0 2px 4px rgba(52,152,219,.3);">
                        <div style="font-size:1.5rem;">📋</div>
                        <div style="margin-top:4px;">IP / Domain / Prefix</div>
                        <div style="font-size:.75rem;opacity:.9;margin-top:4px;">Tarama hedefi</div>
                    </div>

                    <!-- Orta: Provider kategorileri -->
                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;">
            `;

            // Her kategori için bir kutu
            const catOrder = ['dnsbl', 'abuse', 'routing', 'exposure', 'dns', 'web_cat'];
            catOrder.forEach(cat => {
                if (!groups[cat] || groups[cat].length === 0) return;
                const meta = catMeta[cat] || { label: cat, icon: '•', color: '#7f8c8d', auth: false };
                const authBadge = meta.auth
                    ? '<span style="font-size:.62rem;background:#fadbd8;color:#922b21;padding:1px 5px;border-radius:8px;margin-left:4px;">AUTH</span>'
                    : '<span style="font-size:.62rem;background:#d6eaf8;color:#21618c;padding:1px 5px;border-radius:8px;margin-left:4px;">OPIN</span>';
                html += `
                    <div style="background:#fff;border:2px solid ${meta.color};border-radius:8px;padding:10px;">
                        <div style="font-size:.78rem;color:${meta.color};font-weight:700;margin-bottom:6px;">
                            ${meta.icon} ${escapeHtml(meta.label)} (${groups[cat].length})${authBadge}
                        </div>
                        <div style="font-size:.72rem;color:#2c3e50;line-height:1.5;">
                            ${groups[cat].map(p => escapeHtml(p.display_name)).join('<br>')}
                        </div>
                    </div>
                `;
            });

            html += `
                    </div>

                    <!-- Sağ: Karar sonuçları -->
                    <div style="display:flex;flex-direction:column;gap:4px;">
                        <div style="background:#d5f5e3;border-left:3px solid #27ae60;padding:8px 10px;border-radius:4px;font-size:.76rem;">
                            <strong style="color:#196f3d;">0/N → CLEAN</strong><br>
                            <span style="color:#7f8c8d;font-size:.7rem;">mail yok</span>
                        </div>
                        <div style="background:#fcf3cf;border-left:3px solid #f1c40f;padding:8px 10px;border-radius:4px;font-size:.76rem;">
                            <strong style="color:#7d6608;">1/N + opinion → F/P</strong><br>
                            <span style="color:#7f8c8d;font-size:.7rem;">audit only, mail yok</span>
                        </div>
                        <div style="background:#fdebd0;border-left:3px solid #e67e22;padding:8px 10px;border-radius:4px;font-size:.76rem;">
                            <strong style="color:#a04000;">1 auth veya 2-3 → CAUTION</strong><br>
                            <span style="color:#7f8c8d;font-size:.7rem;">mail + audit</span>
                        </div>
                        <div style="background:#fadbd8;border-left:3px solid #c0392b;padding:8px 10px;border-radius:4px;font-size:.76rem;">
                            <strong style="color:#922b21;">4+ veya critical → CRITICAL</strong><br>
                            <span style="color:#7f8c8d;font-size:.7rem;">acil mail + audit</span>
                        </div>
                    </div>
                </div>

                <!-- Ack state katmanı -->
                <div style="margin-top:14px;padding:10px 14px;background:#ecf0f1;border-radius:6px;font-size:.76rem;color:#2c3e50;">
                    <strong>Ack State Katmanı:</strong>
                    <span style="color:#27ae60;">🟢 active</span> →
                    <span style="color:#a04000;">🔧 resolved</span> (re-alert yeniden çıkarsa) /
                    <span style="color:#7d6608;">❌ fp</span> (ignore sessiz) /
                    <span style="color:#21618c;">✓ accepted</span> (biliyorum, ignore)
                </div>

                <!-- İstatistik özeti -->
                <div style="margin-top:10px;display:flex;gap:12px;font-size:.76rem;color:#7f8c8d;">
                    <span><strong style="color:#2c3e50;">${totalCount}</strong> aktif provider</span>
                    <span><strong style="color:#922b21;">${totalAuth}</strong> authoritative (tek başına kritik)</span>
                    <span><strong style="color:#21618c;">${totalOpin}</strong> opinion (2+ kaynak gerektirir)</span>
                </div>
            `;

            el.innerHTML = html;
        } catch (e) {
            el.innerHTML = `<div class="rep-empty">Diyagram yüklenemedi: ${escapeHtml(e.message)}</div>`;
        }
    }

    // ========== Varlık Skoru (Consensus) ==========
    async function loadReputationRanking() {
        const owner = document.getElementById('rep-rank-owner').value;
        const level = document.getElementById('rep-rank-level').value;
        const tbody = document.getElementById('rep-ranking-body');
        tbody.innerHTML = '<tr><td colspan="7" class="rep-loading">Yükleniyor…</td></tr>';
        try {
            const params = { action: 'consensus' };
            if (owner) params.owner = owner;
            if (level) params.level = level;
            const r = await apiGet(params);
            if (!r.success) throw new Error(r.error || 'API hatası');
            let rows = r.data || [];
            // Varsayılan: listed olan en üstte; level seçilmemişse clean'i dışla
            if (!level) rows = rows.filter(x => parseInt(x.listed_count, 10) > 0);

            document.getElementById('rep-rank-count').textContent = `${rows.length} varlık`;

            if (!rows.length) {
                tbody.innerHTML = '<tr><td colspan="7" class="rep-empty">Herhangi bir kaynakta listeleme yok — temiz</td></tr>';
                return;
            }
            tbody.innerHTML = rows.map(row => {
                const listed = parseInt(row.listed_count, 10);
                const total  = parseInt(row.total_enabled_providers, 10);
                const chk    = parseInt(row.checked_count, 10);
                const meter  = renderMeter(listed, chk);
                const providers = (row.listed_providers || '')
                    .replace(/^\{|\}$/g, '')
                    .split(',')
                    .filter(Boolean)
                    .map(p => `<span class="rep-decoded-chip severity-warning">${escapeHtml(p)}</span>`)
                    .join(' ') || '<span style="color:#95a5a6;">—</span>';
                return `
                    <tr>
                        <td><span class="rep-mono">${escapeHtml(row.asset_value)}</span></td>
                        <td>${escapeHtml(row.owner || '—')}</td>
                        <td><span class="rep-consensus ${escapeHtml(row.consensus_level)}">${escapeHtml(consensusLabel(row.consensus_level))}</span>${meter}</td>
                        <td>${listed} / ${chk}</td>
                        <td>${row.listed_percent_total != null ? row.listed_percent_total + '%' : '—'}</td>
                        <td>${providers}</td>
                        <td>${fmtDate(row.last_checked)}</td>
                    </tr>
                `;
            }).join('');
        } catch (e) {
            tbody.innerHTML = `<tr><td colspan="7" class="rep-empty">Hata: ${escapeHtml(e.message)}</td></tr>`;
        }
    }

    function consensusLabel(level) {
        return { clean: 'Temiz', possible_fp: 'Muhtemel F/P', caution: 'Dikkat', critical: 'Kritik' }[level] || level || '—';
    }

    function renderMeter(listed, total) {
        const n = Math.max(total, 1);
        let html = '<span class="rep-meter">';
        for (let i = 0; i < n; i++) {
            const cls = i < listed ? (listed >= 4 ? 'on-crit' : 'on-warn') : '';
            html += `<span class="seg ${cls}"></span>`;
        }
        return html + '</span>';
    }

    // ========== Bildirimler ==========
    // ========== Asset CRUD (Sahipler sekmesi) ==========
    async function loadAssetsList() {
        const tbody = document.getElementById('rep-assets-body');
        tbody.innerHTML = '<tr><td colspan="7" class="rep-loading">Yükleniyor…</td></tr>';
        try {
            const owner = document.getElementById('rep-assets-owner-filter').value;
            const type  = document.getElementById('rep-assets-type-filter').value;
            const params = { action: 'assets_list' };
            if (owner) params.owner = owner;
            if (type)  params.type  = type;
            const r = await apiGet(params);
            if (!r.success) throw new Error(r.error || 'API hatası');
            const rows = r.data || [];
            document.getElementById('rep-assets-count').textContent = `${rows.length} varlık`;
            if (!rows.length) {
                tbody.innerHTML = '<tr><td colspan="7" class="rep-empty">Kayıt yok</td></tr>';
                return;
            }
            tbody.innerHTML = rows.map(a => `
                <tr>
                    <td><span class="rep-decoded-chip severity-info">${escapeHtml(a.asset_type)}</span></td>
                    <td><span class="rep-mono">${escapeHtml(a.asset_value)}</span></td>
                    <td>${escapeHtml(a.owner || '—')}</td>
                    <td style="font-size:.78rem;color:#7f8c8d;max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(a.notes || '')}">${escapeHtml(a.notes || '—')}</td>
                    <td>${a.is_active ? '<span class="rep-badge clean">aktif</span>' : '<span class="rep-badge rate_limited">pasif</span>'}</td>
                    <td style="font-size:.75rem;color:#95a5a6;">${fmtDate(a.created_at)}</td>
                    <td>
                        <button class="rep-btn-recheck" onclick='openAssetForm(${JSON.stringify(a)})'>✏️</button>
                        <button class="rep-btn-recheck" style="background:#e74c3c;" onclick="deleteAsset(${a.id}, '${escapeHtml(a.asset_value)}')">🗑</button>
                    </td>
                </tr>
            `).join('');
        } catch (e) {
            tbody.innerHTML = `<tr><td colspan="7" class="rep-empty">Hata: ${escapeHtml(e.message)}</td></tr>`;
        }
    }

    function openAssetForm(asset = null) {
        const modal = document.getElementById('rep-asset-modal');
        document.getElementById('rep-asset-modal-title').textContent = asset ? 'Varlığı Düzenle' : 'Yeni Varlık';
        document.getElementById('rep-asset-id').value       = asset?.id || '';
        document.getElementById('rep-asset-type').value     = asset?.asset_type || 'ip';
        document.getElementById('rep-asset-value').value    = asset?.asset_value || '';
        document.getElementById('rep-asset-owner').value    = asset?.owner || '';
        document.getElementById('rep-asset-notes').value    = asset?.notes || '';
        document.getElementById('rep-asset-active').checked = asset ? !!asset.is_active : true;
        modal.style.display = 'flex';
    }
    function closeAssetModal() {
        document.getElementById('rep-asset-modal').style.display = 'none';
    }

    async function saveAsset(event) {
        event.preventDefault();
        const body = {
            id:          parseInt(document.getElementById('rep-asset-id').value, 10) || 0,
            asset_type:  document.getElementById('rep-asset-type').value,
            asset_value: document.getElementById('rep-asset-value').value.trim(),
            owner:       document.getElementById('rep-asset-owner').value.trim(),
            notes:       document.getElementById('rep-asset-notes').value.trim(),
            is_active:   document.getElementById('rep-asset-active').checked,
        };
        try {
            const r = await apiPost({ action: 'asset_upsert' }, body);
            if (!r.success) { alert('Hata: ' + (r.error || '—')); return; }
            closeAssetModal();
            loadAssetsList();
            loadReputationSummary();
        } catch (e) { alert('Hata: ' + e.message); }
    }

    async function deleteAsset(id, value) {
        if (!confirm(`"${value}" varlığını siliyorsunuz. Bu işlem findings'i de silecek. Devam edilsin mi?`)) return;
        try {
            const r = await apiPost({ action: 'asset_delete' }, { id, hard: true });
            if (!r.success) { alert('Hata: ' + (r.error || '—')); return; }
            loadAssetsList();
            loadReputationSummary();
        } catch (e) { alert('Hata: ' + e.message); }
    }

    function openBulkCidrForm() {
        document.getElementById('rep-bulk-cidr-modal').style.display = 'flex';
    }
    function closeBulkCidrModal() {
        document.getElementById('rep-bulk-cidr-modal').style.display = 'none';
    }

    async function submitBulkCidr(event) {
        event.preventDefault();
        const body = {
            cidr:  document.getElementById('rep-bulk-cidr').value.trim(),
            owner: document.getElementById('rep-bulk-owner').value.trim(),
            notes: document.getElementById('rep-bulk-notes').value.trim(),
        };
        try {
            const r = await apiPost({ action: 'bulk_cidr_import' }, body);
            if (!r.success) { alert('Hata: ' + (r.error || '—')); return; }
            alert(`${r.imported} IP import edildi (${r.cidr})`);
            closeBulkCidrModal();
            loadAssetsList();
            loadReputationSummary();
        } catch (e) { alert('Hata: ' + e.message); }
    }

    // ========== Referanslar sekmesi ==========
    async function loadReputationReferences() {
        try {
            const r = await apiGet({ action: 'references' });
            if (!r.success) return;
            const d = r.data;

            const stdEl = document.getElementById('rep-ref-standards');
            if (stdEl && d.standards) {
                stdEl.innerHTML = d.standards.map(s => `
                    <div style="background:#fff;padding:14px 16px;border-radius:6px;box-shadow:0 1px 3px rgba(0,0,0,.05);border-left:3px solid #3498db;">
                        <div style="font-weight:700;color:#2c3e50;">${escapeHtml(s.name)}</div>
                        <div style="font-size:.78rem;color:#7f8c8d;margin:4px 0 8px;">${escapeHtml(s.note || '')}</div>
                        <a href="${escapeHtml(s.url)}" target="_blank" rel="noopener" class="rep-reason-link" style="font-size:.82rem;">📄 Resmi doküman</a>
                    </div>
                `).join('');
            }

            const thEl = document.getElementById('rep-ref-thresholds');
            if (thEl && d.severity_thresholds) {
                const order = ['critical','high','medium','low'];
                thEl.innerHTML = order.map(k => {
                    const t = d.severity_thresholds[k];
                    if (!t) return '';
                    return `
                        <div style="background:${escapeHtml(t.color)};color:#fff;padding:10px 16px;border-radius:6px;min-width:180px;">
                            <div style="font-weight:700;text-transform:uppercase;font-size:.85rem;">${escapeHtml(k)} (${t.min}+)</div>
                            <div style="font-size:.75rem;opacity:.9;">${escapeHtml(t.desc)}</div>
                        </div>
                    `;
                }).join('');
            }

            const portEl = document.getElementById('rep-ref-ports');
            if (portEl && d.port_categories) {
                const rows = Object.entries(d.port_categories).map(([key, cat]) => {
                    const riskCls = cat.risk === 'critical' ? 'critical'
                        : cat.risk === 'high' ? 'caution'
                        : cat.risk === 'medium' ? 'possible_fp' : 'clean';
                    return `
                        <tr>
                            <td><strong>${escapeHtml(cat.label)}</strong><br><code style="font-size:.72rem;color:#95a5a6;">${escapeHtml(key)}</code></td>
                            <td><span class="rep-mono">${(cat.ports || []).join(', ')}</span></td>
                            <td><strong style="color:#c0392b;">+${cat.points}</strong></td>
                            <td><span class="rep-consensus ${riskCls}">${escapeHtml(cat.risk)}</span></td>
                        </tr>
                    `;
                }).join('');
                portEl.innerHTML = rows || '<tr><td colspan="4" class="rep-empty">—</td></tr>';
            }

            const formulaEl = document.getElementById('rep-ref-formula');
            if (formulaEl && d.scoring_formula) {
                formulaEl.innerHTML = Object.entries(d.scoring_formula).map(([k, v]) => `
                    <div style="padding:6px 0;border-bottom:1px solid #f0f0f0;font-size:.85rem;">
                        <strong style="color:#2c3e50;">${escapeHtml(k)}:</strong>
                        <span style="color:#7f8c8d;">${escapeHtml(v)}</span>
                    </div>
                `).join('');
            }

            const renderControls = () => {
                const filter = document.getElementById('rep-ref-std-filter')?.value || '';
                const controlsEl = document.getElementById('rep-ref-controls');
                if (!controlsEl || !d.controls) return;
                const filtered = Object.entries(d.controls).filter(([k, v]) => !filter || v.standard === filter);
                if (!filtered.length) {
                    controlsEl.innerHTML = '<tr><td colspan="4" class="rep-empty">Kayıt yok</td></tr>';
                    return;
                }
                controlsEl.innerHTML = filtered.map(([code, ctrl]) => `
                    <tr>
                        <td><span class="rep-mono"><strong>${escapeHtml(code)}</strong></span></td>
                        <td><span class="rep-decoded-chip severity-info">${escapeHtml(ctrl.standard)}</span></td>
                        <td><strong>${escapeHtml(ctrl.title)}</strong></td>
                        <td style="font-size:.8rem;color:#7f8c8d;">${escapeHtml(ctrl.desc)}</td>
                    </tr>
                `).join('');
            };
            renderControls();
            const stdFilter = document.getElementById('rep-ref-std-filter');
            if (stdFilter && !stdFilter.dataset.bound) {
                stdFilter.dataset.bound = '1';
                stdFilter.addEventListener('change', renderControls);
            }
        } catch (e) { /* sessiz */ }
    }

    // ========== Baseline kabul işlemleri ==========
    async function acceptBaselineSingle(assetId) {
        if (!confirm('Bu asset\'in şu anki açık portlarını baseline olarak kabul ediyorsunuz. Onaylıyor musunuz?')) return;
        try {
            const r = await apiPost({ action: 'accept_baseline' }, { mode: 'single', asset_id: assetId });
            if (!r.success) { alert('Hata: ' + (r.error || 'bilinmiyor')); return; }
            loadReputationExposure();
        } catch (e) { alert('Hata: ' + e.message); }
    }

    async function bulkAcceptBaseline() {
        if (!confirm('TÜM mevcut Shodan bulgularındaki portları baseline olarak kabul edeceksiniz. Sonraki taramalarda sadece yeni portlar alarm verecek. Devam edilsin mi?')) return;
        try {
            const r = await apiPost({ action: 'accept_baseline' }, { mode: 'bulk' });
            if (!r.success) { alert('Hata: ' + (r.error || 'bilinmiyor')); return; }
            alert(`${r.updated || 0} asset için baseline kabul edildi.`);
            loadReputationExposure();
        } catch (e) { alert('Hata: ' + e.message); }
    }

    // ========== Exposure Dashboard (Shodan) ==========
    async function loadReputationExposure() {
        try {
            const r = await apiGet({ action: 'exposure' });
            if (!r.success) throw new Error(r.error || 'API hatası');
            const d = r.data;
            const t = d.totals || {};

            // Özet kartları
            const crit = parseInt(t.critical || 0, 10);
            const warn = parseInt(t.warning || 0, 10);
            const critCls = crit > 0 ? 'bad' : 'ok';
            const warnCls = warn > 0 ? 'warn' : 'ok';
            document.getElementById('rep-expo-cards').innerHTML = `
                <div class="rep-expo-card">
                    <h4>Taranan IP</h4>
                    <div class="num">${t.scanned || 0}</div>
                    <div class="sub">Shodan InternetDB</div>
                </div>
                <div class="rep-expo-card ok">
                    <h4>🟢 Temiz</h4>
                    <div class="num">${t.clean || 0}</div>
                    <div class="sub">Shodan'da kayıt yok</div>
                </div>
                <div class="rep-expo-card">
                    <h4>📡 Port Açık</h4>
                    <div class="num">${t.ports_open_total || 0}</div>
                    <div class="sub">en az 1 servis görünür</div>
                </div>
                <div class="rep-expo-card ${critCls}">
                    <h4>🔴 Kritik</h4>
                    <div class="num">${crit}</div>
                    <div class="sub">hassas port / CVE</div>
                </div>
                <div class="rep-expo-card ${warnCls}">
                    <h4>🟠 Dikkat</h4>
                    <div class="num">${warn}</div>
                    <div class="sub">beklenmedik port</div>
                </div>
                <div class="rep-expo-card ${t.cve_unique_count > 0 ? 'bad' : 'ok'}">
                    <h4>🐛 CVE</h4>
                    <div class="num">${t.cve_unique_count || 0}</div>
                    <div class="sub">${t.vulns_total || 0} IP etkilendi</div>
                </div>
            `;

            // Port dağılımı
            const tp = d.top_ports || {};
            const tpKeys = Object.keys(tp);
            const maxPortCnt = Math.max(1, ...Object.values(tp));
            const criticalPorts = new Set(['21','22','23','445','1433','3306','3389','5432','5900','6379','27017','9200','123']);
            if (tpKeys.length === 0) {
                document.getElementById('rep-expo-ports').innerHTML = '<div class="rep-empty">Henüz açık port bulunamadı</div>';
            } else {
                document.getElementById('rep-expo-ports').innerHTML = tpKeys.map(p => {
                    const c = tp[p];
                    const pct = Math.round((c / maxPortCnt) * 100);
                    const isCrit = criticalPorts.has(String(p));
                    return `
                        <div class="rep-portbar ${isCrit ? 'critical' : ''}">
                            <div class="port">${escapeHtml(p)}</div>
                            <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
                            <div class="cnt">${c}</div>
                        </div>
                    `;
                }).join('');
            }

            // Owner breakdown
            const ob = d.owner_breakdown || {};
            const obKeys = Object.keys(ob).sort();
            if (!obKeys.length) {
                document.getElementById('rep-expo-owners').innerHTML = '<div class="rep-empty">Veri yok</div>';
            } else {
                document.getElementById('rep-expo-owners').innerHTML = obKeys.map(owner => {
                    const s = ob[owner];
                    const listed = parseInt(s.listed || 0, 10);
                    const cls = listed > 0 ? 'listed' : 'clean';
                    return `
                        <div class="rep-owner-row">
                            <div class="name">${escapeHtml(owner)}</div>
                            <div class="stats">${s.scanned || 0} taranan · ${s.clean || 0} temiz · <strong>${listed}</strong> bulgu</div>
                            <span class="rep-badge ${cls}">${listed > 0 ? '⚠' : '✓'}</span>
                        </div>
                    `;
                }).join('');
            }

            // CVE listesi
            const cves = d.top_cves || {};
            const cveKeys = Object.keys(cves);
            if (!cveKeys.length) {
                document.getElementById('rep-expo-cves').innerHTML = '<div class="rep-empty" style="padding:10px;">CVE bulgusu yok</div>';
            } else {
                document.getElementById('rep-expo-cves').innerHTML = cveKeys.map(c => `
                    <div class="rep-cve-item">
                        <a href="https://nvd.nist.gov/vuln/detail/${encodeURIComponent(c)}" target="_blank" rel="noopener">${escapeHtml(c)}</a>
                        <span class="count">${cves[c]} IP</span>
                    </div>
                `).join('');
            }

            // Kritik asset tablosu
            const critRows = d.critical_assets || [];
            const critBody = document.getElementById('rep-expo-critical');
            if (!critRows.length) {
                critBody.innerHTML = '<tr><td colspan="6" class="rep-empty">Kritik bulgu yok 🟢</td></tr>';
            } else {
                critBody.innerHTML = critRows.map(a => `
                    <tr>
                        <td><span class="rep-mono">${escapeHtml(a.asset_value)}</span></td>
                        <td>${escapeHtml(a.owner)}</td>
                        <td>${(a.critical_ports || []).map(p => `<span class="rep-decoded-chip severity-critical">${escapeHtml(p)}</span>`).join(' ')}</td>
                        <td>${(a.vulns || []).slice(0, 3).map(v => `<span class="rep-decoded-chip severity-critical">${escapeHtml(v)}</span>`).join(' ')}${(a.vulns || []).length > 3 ? '…' : ''}</td>
                        <td style="font-size:.78rem;">${escapeHtml(a.human_reason || '—')}</td>
                        <td>${a.permalink ? `<a class="rep-reason-link" href="${escapeHtml(a.permalink)}" target="_blank" rel="noopener">🔗 Shodan</a>` : ''}</td>
                    </tr>
                `).join('');
            }

            // Warning asset tablosu
            const warnRows = d.warning_assets || [];
            const warnBody = document.getElementById('rep-expo-warning');
            if (!warnRows.length) {
                warnBody.innerHTML = '<tr><td colspan="7" class="rep-empty">Dikkat seviyesinde bulgu yok</td></tr>';
            } else {
                warnBody.innerHTML = warnRows.map(a => `
                    <tr>
                        <td><span class="rep-mono">${escapeHtml(a.asset_value)}</span></td>
                        <td>${escapeHtml(a.owner)}</td>
                        <td>${(a.ports || []).map(p => `<span class="rep-decoded-chip severity-warning">${escapeHtml(p)}</span>`).join(' ')}</td>
                        <td style="font-size:.75rem;color:#7f8c8d;">${escapeHtml((a.hostnames || []).slice(0, 1)[0] || '—')}</td>
                        <td style="font-size:.78rem;">${escapeHtml(a.human_reason || '—')}</td>
                        <td>${a.permalink ? `<a class="rep-reason-link" href="${escapeHtml(a.permalink)}" target="_blank" rel="noopener">🔗 Shodan</a>` : ''}</td>
                        <td>${a.baseline_accepted
                            ? '<span class="rep-badge clean">✓ baseline</span>'
                            : `<button class="rep-btn-recheck" style="background:#27ae60;" onclick="acceptBaselineSingle(${a.asset_id})">✓ Baseline</button>`}</td>
                    </tr>
                `).join('');
            }
        } catch (e) {
            document.getElementById('rep-expo-cards').innerHTML =
                `<div class="rep-empty">Hata: ${escapeHtml(e.message)}</div>`;
        }
    }

    async function loadReputationRadar() {
        try {
            const r = await apiGet({ action: 'radar_links' });
            if (!r.success) return;
            const el = document.getElementById('rep-radar-widget');
            if (!el) return;
            const asns = r.data || [];
            if (!asns.length) {
                el.innerHTML = '<div class="rep-empty" style="grid-column:1/-1;">ASN verisi yok — önce prefix taraması çalıştırın</div>';
                return;
            }
            el.innerHTML = asns.map(a => `
                <div style="background:#fff;padding:12px 14px;border-radius:6px;border-left:3px solid #3498db;box-shadow:0 1px 3px rgba(0,0,0,.06);">
                    <div style="font-weight:700;color:#2c3e50;font-size:.95rem;">AS${a.asn}</div>
                    <div style="color:#7f8c8d;font-size:.78rem;margin:2px 0 8px;">${escapeHtml(a.holder || '—')}</div>
                    <div style="display:flex;gap:6px;flex-wrap:wrap;">
                        <a href="${escapeHtml(a.radar_url)}" target="_blank" rel="noopener" class="rep-btn-recheck" style="text-decoration:none;">🛰 Cloudflare Radar</a>
                        <a href="${escapeHtml(a.ripe_url)}" target="_blank" rel="noopener" class="rep-btn-recheck" style="text-decoration:none;background:#27ae60;">RIPEstat</a>
                        <a href="${escapeHtml(a.bgpview_url)}" target="_blank" rel="noopener" class="rep-btn-recheck" style="text-decoration:none;background:#9b59b6;">bgp.tools</a>
                    </div>
                </div>
            `).join('');
        } catch (e) { /* sessizce geç */ }
    }

    async function loadReputationNotifications() {
        try {
            const r = await apiGet({ action: 'notifications' });
            if (!r.success) throw new Error(r.error || 'API hatası');
            const data = r.data;
            document.getElementById('rep-notify-recipient').textContent = data.recipient || '(ayarlanmamış)';

            // Gönderilen alarmlar
            const sent = data.alerts_sent || [];
            const sentEl = document.getElementById('rep-alerts-sent');
            if (!sent.length) {
                sentEl.innerHTML = '<div class="rep-empty">Henüz alarm gönderilmedi</div>';
            } else {
                sentEl.innerHTML = sent.map(a => `
                    <div class="rep-timeline-item action-reputation_listing_new">
                        <div class="rep-timeline-time">${fmtDate(a.alert_sent_at)}</div>
                        <div class="rep-timeline-action">📧 ${escapeHtml(a.asset_type)} ${escapeHtml(a.asset_value)}</div>
                        <div class="rep-timeline-details">${escapeHtml(a.provider_name)} · ${escapeHtml(a.owner || '—')} · ${escapeHtml(a.severity || '—')}</div>
                    </div>
                `).join('');
            }

            // Audit log
            const audit = data.audit_log || [];
            const auditEl = document.getElementById('rep-audit-timeline');
            if (!audit.length) {
                auditEl.innerHTML = '<div class="rep-empty">Audit log kaydı yok</div>';
            } else {
                auditEl.innerHTML = audit.map(a => `
                    <div class="rep-timeline-item action-${escapeHtml(a.action)}">
                        <div class="rep-timeline-time">${fmtDate(a.created_at)}</div>
                        <div class="rep-timeline-action">${escapeHtml(a.action)}</div>
                        <div class="rep-timeline-details">${escapeHtml(a.details || '')}</div>
                    </div>
                `).join('');
            }
        } catch (e) {
            document.getElementById('rep-audit-timeline').innerHTML =
                `<div class="rep-empty">Hata: ${escapeHtml(e.message)}</div>`;
        }
    }

    async function loadReputationLog() {
        const panel = document.getElementById('rep-log-panel');
        panel.style.display = 'block';
        panel.textContent = 'Yükleniyor…';
        try {
            const r = await apiGet({ action: 'log_tail' });
            if (!r.success) throw new Error(r.error || 'API hatası');
            if (!r.data.exists) {
                panel.textContent = 'Log dosyası bulunamadı: ' + r.data.path;
                return;
            }
            panel.textContent = (r.data.lines || []).join('\n');
            panel.scrollTop = panel.scrollHeight;
        } catch (e) {
            panel.textContent = 'Hata: ' + e.message;
        }
    }

    // ========== Aktif tarama ilerleme paneli ==========
    let activePollTimer = null;

    async function refreshActiveRun() {
        try {
            const r = await apiGet({ action: 'active' });
            if (!r.success) return;
            const data = r.data;
            const panel = document.getElementById('rep-progress');
            if (!data) {
                panel.classList.remove('active');
                stopActivePolling();
                return;
            }
            panel.classList.add('active');

            const pct     = data.percent != null ? data.percent : 0;
            const checked = data.assets_checked || 0;
            const total   = data.assets_total   || 0;
            const elapsed = data.elapsed_sec    || 0;
            const eta     = data.eta_sec;

            document.getElementById('rep-prog-title').textContent =
                `Tarama sürüyor · Run #${data.id} (${data.triggered_by || ''})`;
            document.getElementById('rep-prog-fill').style.width = pct + '%';
            document.getElementById('rep-prog-percent').textContent = pct + '%';
            document.getElementById('rep-prog-assets').textContent  = total > 0 ? `${checked} / ${total}` : String(checked);
            document.getElementById('rep-prog-elapsed').textContent = fmtDuration(elapsed);
            document.getElementById('rep-prog-eta').textContent     = eta != null ? fmtDuration(eta) : '—';
            document.getElementById('rep-prog-current').textContent = data.current_asset || '—';
            document.getElementById('rep-prog-new').textContent     = data.findings_new || 0;
        } catch (e) {
            // sessizce geç
        }
    }

    function startActivePolling() {
        stopActivePolling();
        activePollTimer = setInterval(async () => {
            await refreshActiveRun();
            // Panel gizliyse polling gereksiz
            const panel = document.getElementById('rep-progress');
            if (panel && !panel.classList.contains('active')) {
                stopActivePolling();
                // Tarama bitince özet ve listeyi tazele
                loadReputationSummary();
                loadReputationRuns();
            }
        }, 4000);
    }

    function stopActivePolling() {
        if (activePollTimer) {
            clearInterval(activePollTimer);
            activePollTimer = null;
        }
    }

    // ========== Sekmeler ==========
    function initRepTabs() {
        document.querySelectorAll('.rep-tab-btn').forEach(btn => {
            if (btn.dataset.repBound) return;
            btn.dataset.repBound = '1';
            btn.addEventListener('click', () => {
                const tab = btn.dataset.repTab;
                document.querySelectorAll('.rep-tab-btn').forEach(b => b.classList.toggle('active', b === btn));
                document.querySelectorAll('.rep-tab-content').forEach(c => c.classList.toggle('active', c.dataset.repPane === tab));
            });
        });
    }

    // Global ihraçlar — main.js showPage() tarafından çağrılır
    window.loadReputationAll           = loadReputationAll;
    window.loadReputationSummary       = loadReputationSummary;
    window.loadReputationDetails       = loadReputationDetails;
    window.loadReputationRuns          = loadReputationRuns;
    window.loadReputationRanking       = loadReputationRanking;
    window.loadReputationNotifications = loadReputationNotifications;
    window.loadReputationExposure      = loadReputationExposure;
    window.acceptBaselineSingle        = acceptBaselineSingle;
    window.bulkAcceptBaseline          = bulkAcceptBaseline;
    window.loadReputationRadar         = loadReputationRadar;
    window.loadReputationReferences    = loadReputationReferences;
    window.renderConsensusDiagram      = renderConsensusDiagram;
    window.toggleFinding               = toggleFinding;
    window.toggleAllFindings           = toggleAllFindings;
    window.clearSelection              = clearSelection;
    window.quickAck                    = quickAck;
    window.bulkAck                     = bulkAck;
    window.closeAckModal               = closeAckModal;
    window.loadAssetsList              = loadAssetsList;
    window.openAssetForm               = openAssetForm;
    window.closeAssetModal             = closeAssetModal;
    window.saveAsset                   = saveAsset;
    window.deleteAsset                 = deleteAsset;
    window.openBulkCidrForm            = openBulkCidrForm;
    window.closeBulkCidrModal          = closeBulkCidrModal;
    window.submitBulkCidr              = submitBulkCidr;
    window.loadReputationLog           = loadReputationLog;
    window.resetReputationFilters      = resetReputationFilters;
    window.recheckReputationAsset      = recheckReputationAsset;

    document.addEventListener('DOMContentLoaded', initRepTabs);
    // Sayfa hash ile açılırsa da tab bağlantılarını tekrar kontrol et
    window.addEventListener('hashchange', initRepTabs);
})();
