/**
 * WAF IP Whitelist Yönetimi
 * Seçili ortamdaki tüm WAF politikalarını aynı anda yükler,
 * her politikayı ayraçlı bir bölüm olarak gösterir.
 * Faz 1: Soft delete, orphan IP tespiti, audit log desteği.
 */

const WafIpWhitelist = (() => {

    let currentEnv       = 'prod';
    let allPolicies      = [];
    let filterText       = '';
    let filterStatus     = 'all';
    let filterPolicy     = '';
    let currentReportEnv = 'all';
    let sharedIps        = [];
    let selectedRows     = new Map(); // key: "env|policyId|ip" → {env, policyId, policyName, ip, mask}
    let wafDevices        = [];
    let editingDeviceEnv   = null; // host/kullanıcı/şifre inline düzenleme
    let schedulingDeviceEnv = null; // cron zamanlama inline düzenleme
    let lastSettingsCache  = null;
    const WEEKDAYS_TR = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

    // ── Init / Ortam değiştir ─────────────────────────────────────────
    function init() {
        loadAll();
        loadSharedIps();
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') { closeHistoryModal(); closeReportModal(); closeBulkModal(); closeSettingsModal(); }
        });
    }

    function setEnv(env, btn) {
        currentEnv   = env;
        allPolicies  = [];
        filterPolicy = '';
        document.querySelectorAll('#waf-env-btns .waf-env-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const sel = document.getElementById('waf-policy-filter');
        if (sel) { sel.innerHTML = '<option value="">Tüm Politikalar</option>'; sel.disabled = true; }
        document.getElementById('waf-stats-bar').style.display = 'none';
        document.getElementById('waf-ip-table-wrap').innerHTML = '';
        document.getElementById('waf-ip-table-wrap').style.display = 'none';
        loadAll();
    }

    // ── Tüm politikaları + IP'lerini çek ─────────────────────────────
    async function loadAll() {
        const wrap = document.getElementById('waf-ip-table-wrap');
        wrap.innerHTML = '<div class="waf-loading"><i class="fas fa-spinner fa-spin"></i> Politikalar yükleniyor...</div>';
        wrap.style.display = 'block';

        let policies;
        try {
            const res  = await fetch(`/portal/api/waf-ip-whitelist.php?action=get_policies&env=${currentEnv}`);
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Politika listesi alınamadı');
            policies = data.policies || [];
        } catch (e) {
            wrap.innerHTML = `<div class="waf-error"><i class="fas fa-exclamation-triangle"></i> ${e.message}</div>`;
            return;
        }

        if (policies.length === 0) {
            wrap.innerHTML = '<div class="waf-empty"><i class="fas fa-search"></i> Bu ortamda WAF politikası bulunamadı.</div>';
            return;
        }

        const sel = document.getElementById('waf-policy-filter');
        if (sel) {
            sel.innerHTML = '<option value="">Tüm Politikalar</option>';
            policies.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.dataset.name = p.name;
                opt.textContent  = p.name;
                sel.appendChild(opt);
            });
            sel.disabled = false;
        }

        wrap.innerHTML = `<div class="waf-loading"><i class="fas fa-spinner fa-spin"></i> ${policies.length} politikanın IP'leri çekiliyor...</div>`;

        const results = await Promise.allSettled(
            policies.map(p =>
                fetch(`/portal/api/waf-ip-whitelist.php?action=get_whitelist_ips&env=${currentEnv}&policy_id=${encodeURIComponent(p.id)}&policy_name=${encodeURIComponent(p.name)}`)
                    .then(r => r.json())
                    .then(d => ({ policy: p, data: d }))
            )
        );

        allPolicies = results.map(r => {
            if (r.status === 'rejected' || !r.value?.data?.success) {
                return { ...r.value?.policy, items: [], orphanIps: [], stats: {}, error: r.value?.data?.error || 'Hata' };
            }
            return {
                ...r.value.policy,
                items:     r.value.data.items     || [],
                orphanIps: r.value.data.orphanIps || [],
                stats:     r.value.data.stats     || {},
            };
        }).filter(p => p.id);

        renderGlobalStats();
        renderAll();
    }

    // ── Belirli bir politikayı yenile ────────────────────────────────
    async function reloadPolicy(policyId, policyName) {
        const section = document.getElementById('waf-section-' + policyId);
        if (section) {
            const tbody = section.querySelector('tbody');
            if (tbody) tbody.style.opacity = '0.4';
        }
        try {
            const res  = await fetch(`/portal/api/waf-ip-whitelist.php?action=get_whitelist_ips&env=${currentEnv}&policy_id=${encodeURIComponent(policyId)}&policy_name=${encodeURIComponent(policyName)}`);
            const data = await res.json();
            if (!data.success) throw new Error(data.error);

            const idx = allPolicies.findIndex(p => p.id === policyId);
            if (idx !== -1) {
                allPolicies[idx].items     = data.items     || [];
                allPolicies[idx].orphanIps = data.orphanIps || [];
                allPolicies[idx].stats     = data.stats     || {};
            }
        } catch (e) {
            showWafMsg('Yenileme hatası: ' + e.message, 'error');
        }
        renderGlobalStats();
        renderAll();
    }

    // ── Global istatistikler ──────────────────────────────────────────
    function renderGlobalStats() {
        const agg = { total: 0, ours: 0, temp: 0, warning: 0, expired: 0, orphans: 0 };
        allPolicies.forEach(p => {
            agg.total   += p.stats.total   || 0;
            agg.ours    += p.stats.ours    || 0;
            agg.temp    += p.stats.temp    || 0;
            agg.warning += (p.stats.critical || 0) + (p.stats.warning || 0);
            agg.expired += p.stats.expired || 0;
            agg.orphans += p.stats.orphans || 0;
        });

        const orphanBadge = agg.orphans > 0
            ? `<div class="waf-stat waf-stat-orphan" title="Bu IP'ler notlandırılmış ama artık F5'te yok">
                   <span class="waf-stat-num">${agg.orphans}</span>
                   <span class="waf-stat-label">F5'ten Silindi</span>
               </div>
               <button class="waf-btn-removal-notify" id="waf-removal-notify-btn"
                   onclick="WafIpWhitelist.sendRemovalNotify()"
                   title="F5'ten silinen IP'ler için ekibe bildirim maili gönder">
                   <i class="fas fa-bell"></i> Ekibi Bildir
               </button>`
            : '';

        const bar = document.getElementById('waf-stats-bar');
        bar.style.display = 'flex';
        bar.innerHTML = `
            <div class="waf-stat"><span class="waf-stat-num">${agg.total}</span><span class="waf-stat-label">Toplam IP</span></div>
            <div class="waf-stat waf-stat-ours"><span class="waf-stat-num">${agg.ours}</span><span class="waf-stat-label">Bizim IP</span></div>
            <div class="waf-stat waf-stat-temp"><span class="waf-stat-num">${agg.temp}</span><span class="waf-stat-label">Geçici</span></div>
            <div class="waf-stat waf-stat-warn"><span class="waf-stat-num">${agg.warning}</span><span class="waf-stat-label">Yaklaşan</span></div>
            <div class="waf-stat waf-stat-expired"><span class="waf-stat-num">${agg.expired}</span><span class="waf-stat-label">Süresi Doldu</span></div>
            ${orphanBadge}
            <div class="waf-stat" style="margin-left:auto;border-right:none;">
                <button class="waf-btn-reload-small"
                    onclick="WafIpWhitelist.loadAll()"
                    title="Notlarınıza dokunmaz — sadece F5'ten güncel veriyi çeker">
                    <i class="fas fa-sync-alt"></i> Tümünü Yenile
                </button>
            </div>`;
    }

    // ── Tüm politika bölümlerini render et ───────────────────────────
    function renderAll() {
        const wrap = document.getElementById('waf-ip-table-wrap');

        const visiblePolicies = filterPolicy
            ? allPolicies.filter(p => p.id === filterPolicy)
            : allPolicies;

        if (visiblePolicies.length === 0) {
            wrap.innerHTML = '<div class="waf-empty"><i class="fas fa-search"></i> Politika bulunamadı.</div>';
            return;
        }

        wrap.innerHTML = visiblePolicies.map((p, idx) => {
            const filtered  = applyItemFilters(p.items);
            const hasAlerts = (p.stats.expired || 0) > 0 || (p.stats.critical || 0) > 0;
            const hasOrphans= (p.orphanIps || []).length > 0;
            const envColor  = currentEnv === 'prod' ? '#dc2626' : currentEnv === 'drc' ? '#7c3aed' : '#0891b2';

            return `
            <div class="waf-policy-section${idx > 0 ? ' waf-policy-section--divided' : ''}" id="waf-section-${escHtml(p.id)}">
                <div class="waf-policy-header">
                    <div class="waf-policy-header-left">
                        <span class="waf-policy-env-badge" style="background:${envColor}">${currentEnv.toUpperCase()}</span>
                        <span class="waf-policy-name">${escHtml(p.name)}</span>
                        ${hasAlerts  ? '<span class="waf-policy-alert-dot" title="Süresi dolmuş veya kritik IP var"></span>' : ''}
                        ${hasOrphans ? '<span class="waf-policy-orphan-dot" title="F5\'ten silinmiş notlu IP var"></span>' : ''}
                    </div>
                    <div class="waf-policy-header-right">
                        ${renderPolicyMiniStats(p.stats)}
                        <button class="waf-policy-toggle" onclick="WafIpWhitelist.toggleSection('${escHtml(p.id)}')" title="Aç/Kapat">
                            <i class="fas fa-chevron-up" id="waf-chevron-${escHtml(p.id)}"></i>
                        </button>
                    </div>
                </div>
                <div class="waf-policy-body" id="waf-body-${escHtml(p.id)}">
                    ${p.error ? `<div class="waf-error" style="margin:12px 0;"><i class="fas fa-exclamation-triangle"></i> ${escHtml(p.error)}</div>` : ''}
                    ${renderPolicyTable(p, filtered)}
                    ${renderOrphanSection(p)}
                </div>
            </div>`;
        }).join('');
    }

    function renderPolicyMiniStats(stats) {
        const parts = [];
        if (stats.total)    parts.push(`<span class="waf-mini-stat">${stats.total} IP</span>`);
        if (stats.ours)     parts.push(`<span class="waf-mini-stat waf-mini-ours">${stats.ours} bizim</span>`);
        if (stats.expired)  parts.push(`<span class="waf-mini-stat waf-mini-expired">${stats.expired} dolmuş</span>`);
        if (stats.critical) parts.push(`<span class="waf-mini-stat waf-mini-critical">${stats.critical} kritik</span>`);
        if (stats.warning)  parts.push(`<span class="waf-mini-stat waf-mini-warning">${stats.warning} uyarı</span>`);
        if (stats.orphans)  parts.push(`<span class="waf-mini-stat waf-mini-orphan">${stats.orphans} kayıp</span>`);
        return `<div class="waf-policy-ministats">${parts.join('')}</div>`;
    }

    // ── Normal F5 IP tablosu ──────────────────────────────────────────
    function renderPolicyTable(policy, filtered) {
        if (policy.items.length === 0) {
            return '<div class="waf-empty waf-empty-policy"><i class="fas fa-check-circle" style="color:#10b981"></i> Bu politikada IP istisnası bulunmuyor.</div>';
        }
        if (filtered.length === 0) {
            return '<div class="waf-empty waf-empty-policy"><i class="fas fa-filter"></i> Aktif filtreye uyan IP yok — <a href="#" onclick="WafIpWhitelist.clearFilters(); return false;">filtreyi temizle</a></div>';
        }

        const pid  = policy.id;
        const pnm  = policy.name;
        const rows = filtered.map(item => {
            const cidr      = maskToCIDR(item.ipMask);
            const ipDisplay = item.ipMask !== '255.255.255.255'
                ? `${item.ipAddress}<span class="waf-cidr">/${cidr}</span>`
                : item.ipAddress;
            const statusBadge = buildStatusBadge(item);
            const rowClass = item.expStatus === 'expired'  ? 'waf-row-expired'
                           : item.expStatus === 'critical' ? 'waf-row-critical'
                           : item.expStatus === 'warning'  ? 'waf-row-warning'  : '';
            const selKey   = `${currentEnv}|${pid}|${item.ipAddress}`;
            const isChecked = selectedRows.has(selKey) ? 'checked' : '';

            return `
            <tr class="${rowClass}"
                data-ip="${escHtml(item.ipAddress)}"
                data-mask="${escHtml(item.ipMask)}"
                data-policy-id="${escHtml(pid)}"
                data-policy-name="${escHtml(pnm)}">
              <td class="waf-td-select">
                <input type="checkbox" class="waf-row-select" ${isChecked}
                       data-env="${escHtml(currentEnv)}"
                       data-policy-id="${escHtml(pid)}"
                       data-policy-name="${escHtml(pnm)}"
                       data-ip="${escHtml(item.ipAddress)}"
                       data-mask="${escHtml(item.ipMask)}"
                       onchange="WafIpWhitelist.onRowSelect(this)">
              </td>
              <td class="waf-td-ip">
                <span class="waf-ip-addr">${ipDisplay}</span>
                ${item.isOurs ? '<span class="waf-badge-ours">Bizim</span>' : ''}
              </td>
              <td class="waf-td-f5desc" title="${escHtml(item.f5Desc)}">${escHtml(item.f5Desc) || '<span class="waf-empty-val">—</span>'}</td>
              <td class="waf-td-comment">
                <input type="text" class="waf-comment-input" placeholder="Yorum..." value="${escHtml(item.comment)}">
              </td>
              <td class="waf-td-ours">
                <label class="waf-toggle">
                  <input type="checkbox" class="waf-ours-check" ${item.isOurs ? 'checked' : ''}>
                  <span class="waf-toggle-slider"></span>
                </label>
              </td>
              <td class="waf-td-date">
                <input type="date" class="waf-date-input"
                       value="${escHtml(item.expireDate || '')}"
                       min="${new Date().toISOString().split('T')[0]}">
              </td>
              <td class="waf-td-status">${statusBadge}</td>
              <td class="waf-td-updated">
                ${item.updatedAt
                    ? `<span title="${escHtml(item.updatedBy || item.createdBy || '')}">${formatDate(item.updatedAt)}<br><small>${escHtml(item.updatedBy || item.createdBy || '')}</small></span>`
                    : '<span class="waf-empty-val">—</span>'}
              </td>
              <td class="waf-td-actions">
                <button class="waf-btn-save" onclick="WafIpWhitelist.saveRow(this)" title="Kaydet"><i class="fas fa-save"></i></button>
                ${item.hasAnnotation
                    ? `<button class="waf-btn-archive" onclick="WafIpWhitelist.archiveRow(this)" title="Notu arşivle (veri kaybolmaz)"><i class="fas fa-archive"></i></button>`
                    : ''}
                <button class="waf-btn-history" onclick="WafIpWhitelist.showHistory('${escHtml(item.ipAddress)}','${escHtml(pid)}','${escHtml(pnm)}')" title="Geçmişi Gör"><i class="fas fa-history"></i></button>
              </td>
            </tr>`;
        }).join('');

        const allChecked = filtered.every(i => selectedRows.has(`${currentEnv}|${pid}|${i.ipAddress}`));

        return `
        <div class="waf-policy-table-info">
            <span>${filtered.length}${filtered.length !== policy.items.length ? ' / ' + policy.items.length : ''} IP</span>
        </div>
        <div class="waf-table-scroll">
        <table class="waf-table">
          <thead><tr>
            <th class="waf-th-select">
              <input type="checkbox" class="waf-select-all" title="Tümünü seç" ${allChecked && filtered.length > 0 ? 'checked' : ''}
                     onchange="WafIpWhitelist.toggleSelectAll(this,'${escHtml(pid)}')">
            </th>
            <th>IP Adresi</th><th>F5 Açıklama</th><th>Yorum</th>
            <th>Bizim mi?</th><th>Son Tarih</th><th>Durum</th>
            <th>Güncellendi</th><th>İşlem</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        </div>`;
    }

    // ── Orphan IP bölümü (F5'ten silinmiş ama notlanmış) ─────────────
    function renderOrphanSection(policy) {
        const orphans = policy.orphanIps || [];
        if (orphans.length === 0) return '';

        const rows = orphans.map(item => {
            const cidr = maskToCIDR(item.ipMask);
            const ipDisplay = item.ipMask && item.ipMask !== '255.255.255.255'
                ? `${item.ipAddress}<span class="waf-cidr">/${cidr}</span>`
                : item.ipAddress;
            const expBadge = item.expireDate
                ? (item.daysLeft < 0
                    ? `<span class="waf-status waf-status-expired">${Math.abs(item.daysLeft)}g geçti</span>`
                    : `<span class="waf-status waf-status-ok">${item.daysLeft}g kaldı</span>`)
                : '<span class="waf-status waf-status-nodates">Tarih Yok</span>';

            return `
            <tr class="waf-orphan-row"
                data-ip="${escHtml(item.ipAddress)}"
                data-mask="${escHtml(item.ipMask)}"
                data-policy-id="${escHtml(policy.id)}"
                data-policy-name="${escHtml(policy.name)}">
              <td class="waf-td-ip">
                <span class="waf-ip-addr">${ipDisplay}</span>
                <span class="waf-badge-orphan" title="Bu IP artık F5'te yok">F5'te Yok</span>
                ${item.isOurs ? '<span class="waf-badge-ours">Bizim</span>' : ''}
              </td>
              <td>${escHtml(item.comment) || '<span class="waf-empty-val">—</span>'}</td>
              <td>${expBadge}</td>
              <td><span class="waf-empty-val" title="${escHtml(item.createdBy || '')}">
                  ${item.updatedAt ? formatDate(item.updatedAt) : (item.createdAt ? formatDate(item.createdAt) : '—')}
              </span></td>
              <td class="waf-td-actions">
                <button class="waf-btn-archive waf-btn-archive-orphan"
                    onclick="WafIpWhitelist.archiveOrphan(this)"
                    title="Notu arşivle — geçmişte görünmeye devam eder">
                    <i class="fas fa-archive"></i> Arşivle
                </button>
                <button class="waf-btn-history"
                    onclick="WafIpWhitelist.showHistory('${escHtml(item.ipAddress)}','${escHtml(policy.id)}','${escHtml(policy.name)}')"
                    title="Geçmişi Gör">
                    <i class="fas fa-history"></i>
                </button>
              </td>
            </tr>`;
        }).join('');

        return `
        <div class="waf-orphan-section">
            <div class="waf-orphan-header">
                <i class="fas fa-exclamation-triangle"></i>
                F5'ten Silinen IP'ler — Notlarınız Korundu
                <span class="waf-orphan-count">${orphans.length}</span>
                <span class="waf-orphan-hint">Bu IP'ler artık F5'te yok ama notlarınız veritabanında saklı. Arşivleyerek geçmişe taşıyabilirsiniz.</span>
            </div>
            <div class="waf-table-scroll">
            <table class="waf-table waf-orphan-table">
              <thead><tr>
                <th>IP Adresi</th><th>Not</th><th>Son Tarih</th><th>Güncellendi</th><th>İşlem</th>
              </tr></thead>
              <tbody>${rows}</tbody>
            </table>
            </div>
        </div>`;
    }

    // ── Bölümü aç/kapat ───────────────────────────────────────────────
    function toggleSection(policyId) {
        const body    = document.getElementById('waf-body-' + policyId);
        const chevron = document.getElementById('waf-chevron-' + policyId);
        if (!body) return;
        const collapsed = body.style.display === 'none';
        body.style.display = collapsed ? '' : 'none';
        if (chevron) chevron.className = collapsed ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
    }

    // ── Filtreler ─────────────────────────────────────────────────────
    function onSearch(val) {
        filterText = val.trim();
        renderAll();
    }

    function onFilterStatus(val) {
        filterStatus = val;
        renderAll();
    }

    function onFilterPolicy(val) {
        filterPolicy = val;
        renderAll();
        if (val) {
            setTimeout(() => {
                const el = document.getElementById('waf-section-' + val);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 80);
        }
    }

    function clearFilters() {
        filterText   = '';
        filterStatus = 'all';
        filterPolicy = '';
        const s = document.getElementById('waf-search-input');
        const f = document.getElementById('waf-status-filter');
        const p = document.getElementById('waf-policy-filter');
        if (s) s.value = '';
        if (f) f.value = 'all';
        if (p) p.value = '';
        renderAll();
    }

    function applyItemFilters(items) {
        return items.filter(item => {
            if (filterStatus === 'ours'      && !item.isOurs)                                          return false;
            if (filterStatus === 'temp'      && !item.expireDate)                                      return false;
            if (filterStatus === 'expired'   && item.expStatus !== 'expired')                          return false;
            if (filterStatus === 'warning'   && !['critical','warning'].includes(item.expStatus))      return false;
            if (filterStatus === 'permanent' && (item.expireDate || item.isOurs))                      return false;
            if (filterStatus === 'nodates'   && (item.expireDate || item.isOurs))                      return false;
            if (filterText) {
                const q = filterText.toLowerCase();
                if (!item.ipAddress.includes(q) &&
                    !(item.f5Desc || '').toLowerCase().includes(q) &&
                    !(item.comment || '').toLowerCase().includes(q)) return false;
            }
            return true;
        });
    }

    // ── Satır Kaydet (inline — tablo re-render yok) ───────────────────
    async function saveRow(btn) {
        const tr       = btn.closest('tr');
        const policyId = tr.dataset.policyId;
        const policyNm = tr.dataset.policyName;
        const ip       = tr.dataset.ip;
        const mask     = tr.dataset.mask;
        const comment  = tr.querySelector('.waf-comment-input').value;
        const isOurs   = tr.querySelector('.waf-ours-check').checked;
        const expDate  = tr.querySelector('.waf-date-input').value;

        btn.disabled  = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        const fd = new FormData();
        fd.append('action',      'save_annotation');
        fd.append('env',         currentEnv);
        fd.append('policy_id',   policyId);
        fd.append('policy_name', policyNm);
        fd.append('ip_address',  ip);
        fd.append('ip_mask',     mask);
        fd.append('comment',     comment);
        fd.append('is_ours',     isOurs ? '1' : '0');
        fd.append('expire_date', expDate);

        try {
            const res  = await fetch('/portal/api/waf-ip-whitelist.php', { method: 'POST', fd });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);

            // Inline DOM update — tablo re-render yok
            updateRowInlineAfterSave(tr, { comment, isOurs, expDate });

            btn.innerHTML        = '<i class="fas fa-check"></i>';
            btn.style.background = '#10b981';
            setTimeout(() => {
                btn.disabled         = false;
                btn.innerHTML        = '<i class="fas fa-save"></i>';
                btn.style.background = '';
            }, 2000);

            // Archive butonunu göster (yeni annotation oluştu)
            if (!tr.querySelector('.waf-btn-archive')) {
                const archBtn = document.createElement('button');
                archBtn.className = 'waf-btn-archive';
                archBtn.title     = 'Notu arşivle (veri kaybolmaz)';
                archBtn.innerHTML = '<i class="fas fa-archive"></i>';
                archBtn.onclick   = () => archiveRow(archBtn);
                btn.parentElement.insertBefore(archBtn, btn.nextSibling);
            }
        } catch (e) {
            btn.disabled  = false;
            btn.innerHTML = '<i class="fas fa-save"></i>';
            showWafMsg('Kayıt hatası: ' + e.message, 'error');
        }
    }

    function updateRowInlineAfterSave(tr, { comment, isOurs, expDate }) {
        // Row class güncelle
        tr.classList.remove('waf-row-expired', 'waf-row-critical', 'waf-row-warning');

        // Status badge güncelle
        const statusTd = tr.querySelector('.waf-td-status');
        if (statusTd) {
            let badge = '';
            if (isOurs) {
                badge = '<span class="waf-status waf-status-ours">Kalıcı (Biz)</span>';
            } else if (!expDate) {
                badge = '<span class="waf-status waf-status-nodates">Tarih Yok</span>';
            } else {
                const today  = new Date(); today.setHours(0,0,0,0);
                const exp    = new Date(expDate); exp.setHours(0,0,0,0);
                const daysLeft = Math.round((exp - today) / 86400000);
                if (daysLeft < 0) {
                    badge = `<span class="waf-status waf-status-expired">${Math.abs(daysLeft)}g geçti</span>`;
                    tr.classList.add('waf-row-expired');
                } else if (daysLeft === 0) {
                    badge = '<span class="waf-status waf-status-critical">Bugün bitiyor</span>';
                    tr.classList.add('waf-row-critical');
                } else if (daysLeft <= 3) {
                    badge = `<span class="waf-status waf-status-critical">${daysLeft} gün kaldı</span>`;
                    tr.classList.add('waf-row-critical');
                } else if (daysLeft <= 7) {
                    badge = `<span class="waf-status waf-status-warning">${daysLeft} gün kaldı</span>`;
                    tr.classList.add('waf-row-warning');
                } else if (daysLeft <= 30) {
                    badge = `<span class="waf-status waf-status-soon">${daysLeft} gün kaldı</span>`;
                } else {
                    badge = `<span class="waf-status waf-status-ok">${daysLeft} gün kaldı</span>`;
                }
            }
            statusTd.innerHTML = badge;
        }

        // "Bizim" badge güncelle
        const ipTd    = tr.querySelector('.waf-td-ip');
        const oursBdg = ipTd?.querySelector('.waf-badge-ours');
        if (isOurs && !oursBdg) {
            ipTd.insertAdjacentHTML('beforeend', '<span class="waf-badge-ours">Bizim</span>');
        } else if (!isOurs && oursBdg) {
            oursBdg.remove();
        }

        // Güncellendi sütunu
        const updTd = tr.querySelector('.waf-td-updated');
        if (updTd) {
            const now = new Date().toLocaleDateString('tr-TR', { day:'2-digit', month:'2-digit', year:'numeric' });
            updTd.innerHTML = `<span>${now}<br><small>sen</small></span>`;
        }

        // allPolicies datasını senkronize et
        const pol = allPolicies.find(p => p.id === tr.dataset.policyId);
        if (pol) {
            const item = pol.items.find(i => i.ipAddress === tr.dataset.ip);
            if (item) {
                item.comment    = comment;
                item.isOurs     = isOurs;
                item.expireDate = expDate || null;
                if (expDate) {
                    const today = new Date(); today.setHours(0,0,0,0);
                    const exp   = new Date(expDate); exp.setHours(0,0,0,0);
                    item.daysLeft  = Math.round((exp - today) / 86400000);
                    item.expStatus = item.daysLeft < 0 ? 'expired' : item.daysLeft <= 3 ? 'critical' : item.daysLeft <= 7 ? 'warning' : item.daysLeft <= 30 ? 'soon' : 'active';
                } else {
                    item.daysLeft  = null;
                    item.expStatus = isOurs ? 'permanent' : 'permanent';
                }
            }
        }
    }

    // ── Annotation Arşivle (soft delete — veri kaybolmaz) ────────────
    async function archiveRow(btn) {
        const tr       = btn.closest('tr');
        const policyId = tr.dataset.policyId;
        const policyNm = tr.dataset.policyName;
        const ip       = tr.dataset.ip;

        if (!confirm(`"${ip}" için not arşivlensin mi?\n\nNot: Veri silinmez, geçmiş kayıtlarda görünmeye devam eder.`)) return;

        const body = new FormData();
        body.append('action',     'delete_annotation');
        body.append('env',        currentEnv);
        body.append('policy_id',  policyId);
        body.append('ip_address', ip);

        try {
            const res  = await fetch('/portal/api/waf-ip-whitelist.php', { method: 'POST', body });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            showWafMsg(`${ip} notu arşivlendi. Geçmişten erişilebilir.`, 'success');
            reloadPolicy(policyId, policyNm);
        } catch (e) {
            showWafMsg('Arşivleme hatası: ' + e.message, 'error');
        }
    }

    // ── Orphan Annotation Arşivle ─────────────────────────────────────
    async function archiveOrphan(btn) {
        const tr       = btn.closest('tr');
        const policyId = tr.dataset.policyId;
        const policyNm = tr.dataset.policyName;
        const ip       = tr.dataset.ip;

        if (!confirm(`"${ip}" zaten F5'ten silinmiş.\n\nPortal notunu da arşivlemek istiyor musunuz?\n(Veri silinmez, geçmişten erişilebilir kalır.)`)) return;

        btn.disabled  = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        const body = new FormData();
        body.append('action',     'delete_annotation');
        body.append('env',        currentEnv);
        body.append('policy_id',  policyId);
        body.append('ip_address', ip);

        try {
            const res  = await fetch('/portal/api/waf-ip-whitelist.php', { method: 'POST', body });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            showWafMsg(`${ip} notu arşivlendi. Geçmişten erişilebilir.`, 'success');
            reloadPolicy(policyId, policyNm);
        } catch (e) {
            btn.disabled  = false;
            btn.innerHTML = '<i class="fas fa-archive"></i> Arşivle';
            showWafMsg('Arşivleme hatası: ' + e.message, 'error');
        }
    }

    // ── IP Geçmiş Modalı ─────────────────────────────────────────────
    async function showHistory(ip, policyId, policyName) {
        const modal = document.getElementById('waf-history-modal');
        if (!modal) return;
        modal.style.display = 'flex';
        document.getElementById('waf-history-ip').textContent  = ip;
        document.getElementById('waf-history-meta').textContent = `${currentEnv.toUpperCase()} › ${policyName}`;
        document.getElementById('waf-history-body').innerHTML  =
            '<div class="waf-loading"><i class="fas fa-spinner fa-spin"></i> Geçmiş yükleniyor...</div>';

        try {
            const url = `/portal/api/waf-ip-whitelist.php?action=get_ip_history&env=${currentEnv}`
                      + `&policy_id=${encodeURIComponent(policyId)}&ip_address=${encodeURIComponent(ip)}`;
            const res  = await fetch(url);
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            document.getElementById('waf-history-body').innerHTML =
                renderHistoryContent(ip, data.history, data.annotations);
        } catch (e) {
            document.getElementById('waf-history-body').innerHTML =
                `<div class="waf-error"><i class="fas fa-exclamation-triangle"></i> ${escHtml(e.message)}</div>`;
        }
    }

    // ── F5 Kaldırma Bildirimi Gönder ──────────────────────────────────
    async function sendRemovalNotify() {
        const btn = document.getElementById('waf-removal-notify-btn');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gönderiliyor...'; }

        const body = new FormData();
        body.append('action',     'send_removal_notify');
        body.append('notify_env', currentEnv);

        try {
            const res  = await fetch('/portal/api/waf-ip-whitelist.php', { method: 'POST', body });
            const data = await res.json();

            if (data.reason === 'no_removals') {
                showWafMsg('Bildirim gerekmedi: tüm kayıp IP\'ler zaten bildirilmiş durumda.', 'info');
                if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-bell"></i> Ekibi Bildir'; }
            } else if (data.sent) {
                showWafMsg('Bildirim maili gönderildi — kayıp IP\'ler ekibe iletildi.', 'success');
                if (btn) {
                    btn.innerHTML = '<i class="fas fa-check"></i> Gönderildi';
                    btn.style.background = '#10b981';
                    setTimeout(() => {
                        btn.disabled = false;
                        btn.innerHTML = '<i class="fas fa-bell"></i> Ekibi Bildir';
                        btn.style.background = '';
                    }, 5000);
                }
            } else if (!data.success) {
                throw new Error(data.error || 'Bilinmeyen hata');
            } else {
                showWafMsg('Bildirim tamamlandı.', 'success');
                if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-bell"></i> Ekibi Bildir'; }
            }
        } catch (e) {
            showWafMsg('Bildirim hatası: ' + e.message, 'error');
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-bell"></i> Ekibi Bildir'; }
        }
    }

    // ── Çoklu Seçim ──────────────────────────────────────────────────
    function onRowSelect(cb) {
        const key = `${cb.dataset.env}|${cb.dataset.policyId}|${cb.dataset.ip}`;
        if (cb.checked) {
            selectedRows.set(key, {
                env: cb.dataset.env, policyId: cb.dataset.policyId,
                policyName: cb.dataset.policyName,
                ip: cb.dataset.ip, mask: cb.dataset.mask,
            });
        } else {
            selectedRows.delete(key);
        }
        updateBulkBar();
        // select-all checkbox senkronizasyonu
        const section = document.getElementById('waf-section-' + cb.dataset.policyId);
        if (section) {
            const all = [...section.querySelectorAll('.waf-row-select')];
            const hdr = section.querySelector('.waf-select-all');
            if (hdr) hdr.checked = all.length > 0 && all.every(c => c.checked);
        }
    }

    function toggleSelectAll(headerCb, policyId) {
        const section = document.getElementById('waf-section-' + policyId);
        if (!section) return;
        section.querySelectorAll('.waf-row-select').forEach(cb => {
            cb.checked = headerCb.checked;
            const key  = `${cb.dataset.env}|${cb.dataset.policyId}|${cb.dataset.ip}`;
            if (headerCb.checked) {
                selectedRows.set(key, {
                    env: cb.dataset.env, policyId: cb.dataset.policyId,
                    policyName: cb.dataset.policyName,
                    ip: cb.dataset.ip, mask: cb.dataset.mask,
                });
            } else {
                selectedRows.delete(key);
            }
        });
        updateBulkBar();
    }

    function updateBulkBar() {
        const bar = document.getElementById('waf-bulk-bar');
        const cnt = document.getElementById('waf-bulk-bar-count');
        if (!bar) return;
        if (selectedRows.size > 0) {
            bar.style.display = 'flex';
            cnt.textContent   = `${selectedRows.size} IP seçildi`;
        } else {
            bar.style.display = 'none';
        }
    }

    function clearSelection() {
        selectedRows.clear();
        document.querySelectorAll('.waf-row-select, .waf-select-all').forEach(cb => { cb.checked = false; });
        updateBulkBar();
    }

    // ── Paylaşımlı IP'ler ─────────────────────────────────────────────
    async function loadSharedIps() {
        const panel = document.getElementById('waf-shared-panel');
        const body  = document.getElementById('waf-shared-body');
        if (!panel) return;
        panel.style.display = 'block';
        body.innerHTML = '<div class="waf-loading"><i class="fas fa-spinner fa-spin"></i> Paylaşımlı IP\'ler yükleniyor...</div>';

        try {
            const res  = await fetch('/portal/api/waf-ip-whitelist.php?action=get_shared_ips');
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Alınamadı');
            sharedIps = data.sharedIps || [];
            document.getElementById('waf-shared-count').textContent = sharedIps.length;
            body.innerHTML = renderSharedTable(sharedIps);
        } catch (e) {
            body.innerHTML = `<div class="waf-error"><i class="fas fa-exclamation-triangle"></i> ${escHtml(e.message)}</div>`;
        }
    }

    function renderSharedTable(ips) {
        if (ips.length === 0) {
            return '<div class="waf-empty" style="padding:16px 20px;"><i class="fas fa-check-circle" style="color:#10b981"></i> 3\'ten fazla yerde tekrar eden IP yok.</div>';
        }
        const envColors = { prod: '#dc2626', test: '#0891b2', drc: '#7c3aed' };
        const rows = ips.map(ip => {
            const envBadges = ip.envs.map(e =>
                `<span class="waf-shared-env" style="background:${envColors[e]||'#6b7280'}">${e.toUpperCase()}</span>`
            ).join('');
            const commentCell = ip.commentConflict
                ? `<span class="waf-shared-conflict" title="Farklı politikalarda farklı yorum var">(çakışma)</span>`
                : (ip.commonComment
                    ? `<span class="waf-shared-comment">${escHtml(ip.commonComment)}</span>`
                    : '<span class="waf-empty-val">—</span>');
            const dateCell = ip.earliestExpire
                ? `<span class="waf-shared-date">${formatDate(ip.earliestExpire)}</span>${ip.dateConflict ? ' <span class="waf-shared-conflict">(çakışma)</span>' : ''}`
                : '<span class="waf-status waf-status-nodates" style="font-size:.75rem">Tarih Yok</span>';
            return `
            <tr>
              <td class="waf-shared-td-ip"><code class="waf-ip-code">${escHtml(ip.ipAddress)}</code></td>
              <td class="waf-shared-td-count"><span class="waf-shared-count-badge">${ip.occurrenceCount}</span></td>
              <td class="waf-shared-td-envs">${envBadges}</td>
              <td class="waf-shared-td-comment">${commentCell}</td>
              <td class="waf-shared-td-date">${dateCell}</td>
              <td class="waf-shared-td-action">
                <button class="waf-btn-shared-edit" onclick="WafIpWhitelist.openBulkModal(null,'${escHtml(ip.ipAddress)}')">
                  <i class="fas fa-edit"></i> Düzenle
                </button>
              </td>
            </tr>`;
        }).join('');

        return `
        <div class="waf-table-scroll">
        <table class="waf-shared-table">
          <thead><tr>
            <th>IP Adresi</th><th>Kaç Yerde</th><th>Ortamlar</th>
            <th>Yorum</th><th>Son Tarih</th><th>İşlem</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        </div>`;
    }

    // ── Toplu Düzenleme Modalı ────────────────────────────────────────
    // ipAddress: shared IP modalı için, null = çoklu seçimden geldi
    async function openBulkModal(fromSelectionBtn, ipAddress) {
        const modal = document.getElementById('waf-bulk-modal');
        const title = document.getElementById('waf-bulk-title');
        const meta  = document.getElementById('waf-bulk-meta');
        const occ   = document.getElementById('waf-bulk-occurrences');
        if (!modal) return;

        modal.style.display = 'flex';
        occ.innerHTML = '<div class="waf-loading"><i class="fas fa-spinner fa-spin"></i> Yükleniyor...</div>';

        // Form sıfırla
        const commentInp = document.getElementById('waf-bulk-comment');
        const dateInp    = document.getElementById('waf-bulk-date');
        const oursChk    = document.getElementById('waf-bulk-ours');
        const oursEnChk  = document.getElementById('waf-bulk-ours-enable');
        const oursRow    = document.getElementById('waf-bulk-ours-row');
        if (commentInp) commentInp.value  = '';
        if (dateInp)    dateInp.value     = '';
        if (oursChk)    oursChk.checked   = false;
        if (oursEnChk) {
            oursEnChk.checked = false;
            oursEnChk.onchange = () => {
                if (oursRow) { oursRow.style.opacity = oursEnChk.checked ? '1' : '.4'; oursRow.style.pointerEvents = oursEnChk.checked ? '' : 'none'; }
            };
        }
        document.getElementById('waf-bulk-save-msg').textContent = '';

        let occurrences = [];

        if (ipAddress) {
            // Shared IP hub'dan açıldı — API'den occurrences çek
            title.textContent = ipAddress;
            meta.textContent  = 'Tüm ortamlardaki politikalarda toplu düzenleme';
            try {
                const res  = await fetch(`/portal/api/waf-ip-whitelist.php?action=get_shared_ips&ip=${encodeURIComponent(ipAddress)}`);
                const data = await res.json();
                if (!data.success) throw new Error(data.error);
                const found = (data.sharedIps || []).find(s => s.ipAddress === ipAddress);
                occurrences = found ? found.occurrences : [];
                // Ortak değerleri prefill et
                if (found && !found.commentConflict && found.commonComment && commentInp)
                    commentInp.value = found.commonComment;
                if (found && !found.dateConflict && found.earliestExpire && dateInp)
                    dateInp.value = found.earliestExpire;
            } catch (e) {
                occ.innerHTML = `<div class="waf-error">${escHtml(e.message)}</div>`;
                return;
            }
        } else {
            // Çoklu seçimden geldi
            title.textContent = `${selectedRows.size} IP seçildi`;
            meta.textContent  = 'Seçili IP\'lere toplu uygulama — boş alan mevcut değeri korur';
            occurrences = [...selectedRows.values()].map(r => ({
                env: r.env, policy_id: r.policyId, policy_name: r.policyName,
                ip_address: r.ip,
            }));
        }

        occ.innerHTML = renderBulkOccurrences(occurrences, ipAddress);
    }

    function renderBulkOccurrences(occurrences, groupByIp) {
        const envColors = { prod: '#dc2626', test: '#0891b2', drc: '#7c3aed' };
        const rows = occurrences.map((o, i) => {
            const ec = envColors[o.env] || '#6b7280';
            return `
            <tr>
              <td class="waf-bulk-td-check">
                <input type="checkbox" class="waf-bulk-occ-check" checked
                       data-env="${escHtml(o.env)}"
                       data-policy-id="${escHtml(o.policy_id)}"
                       data-policy-name="${escHtml(o.policy_name)}"
                       data-ip="${escHtml(o.ip_address || o.ip || '')}">
              </td>
              ${!groupByIp ? `<td class="waf-bulk-td-ip"><code>${escHtml(o.ip_address || o.ip || '')}</code></td>` : ''}
              <td><span class="waf-shared-env" style="background:${ec}">${o.env.toUpperCase()}</span></td>
              <td class="waf-bulk-td-policy">${escHtml(o.policy_name)}</td>
              ${o.comment !== undefined ? `<td class="waf-bulk-td-cur"><span title="Mevcut yorum">${escHtml(o.comment||'—')}</span></td>` : ''}
              ${o.expire_date !== undefined ? `<td class="waf-bulk-td-cur">${o.expire_date ? formatDate(o.expire_date) : '<span class="waf-status waf-status-nodates" style="font-size:.75rem">Yok</span>'}</td>` : ''}
            </tr>`;
        }).join('');

        const extraCols = occurrences[0]?.comment !== undefined;
        return `
        <table class="waf-bulk-occ-table">
          <thead><tr>
            <th style="width:32px"><input type="checkbox" checked onchange="WafIpWhitelist.toggleBulkAll(this)" title="Tümünü seç/kaldır"></th>
            ${!groupByIp ? '<th>IP Adresi</th>' : ''}
            <th>Ortam</th><th>Politika</th>
            ${extraCols ? '<th>Mevcut Yorum</th><th>Mevcut Tarih</th>' : ''}
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>`;
    }

    function toggleBulkAll(hdr) {
        document.querySelectorAll('.waf-bulk-occ-check').forEach(cb => { cb.checked = hdr.checked; });
    }

    async function saveBulkAnnotation() {
        const targets = [...document.querySelectorAll('.waf-bulk-occ-check:checked')].map(cb => ({
            env:         cb.dataset.env,
            policy_id:   cb.dataset.policyId,
            policy_name: cb.dataset.policyName,
            ip_address:  cb.dataset.ip,
        }));

        if (targets.length === 0) {
            showBulkMsg('En az bir kayıt seçin.', 'error'); return;
        }

        const comment    = document.getElementById('waf-bulk-comment')?.value || '';
        const expireDate = document.getElementById('waf-bulk-date')?.value    || '';
        const oursEnable = document.getElementById('waf-bulk-ours-enable')?.checked;
        const isOurs     = oursEnable ? (document.getElementById('waf-bulk-ours')?.checked ? '1' : '0') : '';

        const saveBtn = document.getElementById('waf-bulk-save-btn');
        if (saveBtn) { saveBtn.disabled = true; saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uygulanıyor...'; }

        const fd = new FormData();
        fd.append('action',      'bulk_save_annotation');
        fd.append('comment',     comment);
        fd.append('expire_date', expireDate);
        fd.append('is_ours',     isOurs);
        fd.append('targets',     JSON.stringify(targets));

        try {
            const res  = await fetch('/portal/api/waf-ip-whitelist.php', { method: 'POST', body: fd });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);

            showBulkMsg(`${data.saved} kayıt güncellendi.${data.errors ? ' ' + data.errors + ' hata.' : ''}`, 'ok');
            setTimeout(() => { closeBulkModal(); loadSharedIps(); clearSelection(); }, 1500);

            // Etkilenen policy'leri yenile (sadece currentEnv olanlar)
            const affectedPolicies = new Set(targets.filter(t => t.env === currentEnv).map(t => t.policy_id));
            for (const polId of affectedPolicies) {
                const pol = allPolicies.find(p => p.id === polId);
                if (pol) await reloadPolicy(polId, pol.name);
            }
        } catch (e) {
            showBulkMsg(e.message, 'error');
        } finally {
            if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = '<i class="fas fa-check-double"></i> Tümüne Uygula'; }
        }
    }

    function showBulkMsg(msg, type) {
        const el = document.getElementById('waf-bulk-save-msg');
        if (!el) return;
        el.textContent = msg;
        el.className   = `waf-bulk-save-msg waf-bulk-save-msg--${type}`;
    }

    function closeBulkModal() {
        const modal = document.getElementById('waf-bulk-modal');
        if (modal) modal.style.display = 'none';
    }

    // ── Bildirim Ayarları Modalı ──────────────────────────────────────
    async function openSettingsModal() {
        const modal = document.getElementById('waf-settings-modal');
        const body  = document.getElementById('waf-settings-body');
        const foot  = document.getElementById('waf-settings-footer');
        if (!modal) return;
        modal.style.display = 'flex';
        body.innerHTML = '<div class="waf-loading"><i class="fas fa-spinner fa-spin"></i> Yükleniyor...</div>';
        foot.style.display = 'none';

        try {
            const res  = await fetch('/portal/api/waf-ip-whitelist.php?action=get_notify_settings');
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Ayarlar alınamadı');
            renderSettingsBody(data.settings);
            foot.style.display = 'flex';
        } catch (e) {
            body.innerHTML = `<div class="waf-error"><i class="fas fa-exclamation-triangle"></i> ${escHtml(e.message)}</div>`;
        }
    }

    // ── Cihazlar Modalı ────────────────────────────────────────────────
    async function switchPageTab(tab) {
        document.querySelectorAll('.waf-page-tab').forEach(t => t.classList.toggle('active', t.dataset.wafTab === tab));
        document.getElementById('waf-tab-ip-list').style.display = (tab === 'ip-list') ? '' : 'none';
        document.getElementById('waf-tab-devices').style.display = (tab === 'devices') ? '' : 'none';
        if (tab === 'devices') {
            editingDeviceEnv = null;
            schedulingDeviceEnv = null;
            await reloadDevicesOnly();
        }
    }

    function humanizeCron(enabled, expr) {
        if (!enabled || !expr) return 'Kapalı (zamanlanmamış)';
        const parts = expr.trim().split(/\s+/);
        if (parts.length === 5) {
            const [min, hour, dom, mon, dow] = parts;
            const hhmm = /^\d+$/.test(hour) && /^\d+$/.test(min)
                ? `${hour.padStart(2, '0')}:${min.padStart(2, '0')}` : null;
            if (hhmm && dom === '*' && mon === '*' && dow === '*') return `Her gün saat ${hhmm}`;
            if (hhmm && dom === '*' && mon === '*' && /^[0-6](,[0-6])*$/.test(dow)) {
                const days = dow.split(',').map(d => WEEKDAYS_TR[parseInt(d, 10)]).join(', ');
                return `Haftalık (${days}) saat ${hhmm}`;
            }
        }
        return `Özel: ${expr}`;
    }

    function renderDevicesSection() {
        const rows = wafDevices.map(d => {
            if (editingDeviceEnv === d.env) {
                return `
                <tr>
                    <td>${escHtml(d.name)} <span class="waf-settings-hint">(${d.env})</span></td>
                    <td colspan="5">
                        <div class="waf-settings-row"><span class="waf-settings-label">Ad</span>
                            <input type="text" id="wd-name-${d.env}" value="${escHtml(d.name)}" style="flex:1"></div>
                        <div class="waf-settings-row"><span class="waf-settings-label">Host</span>
                            <input type="text" id="wd-host-${d.env}" value="${escHtml(d.host)}" style="flex:1"></div>
                        <div class="waf-settings-row"><span class="waf-settings-label">Kullanıcı</span>
                            <input type="text" id="wd-user-${d.env}" value="${escHtml(d.username)}" autocomplete="off" style="flex:1"></div>
                        <div class="waf-settings-row"><span class="waf-settings-label">Şifre (boş = değişmez)</span>
                            <input type="password" id="wd-pass-${d.env}" autocomplete="new-password" style="flex:1"></div>
                        <div style="margin-top:6px;">
                            <button class="waf-btn-csv" onclick="WafIpWhitelist.saveDeviceEdit('${d.env}')"><i class="fas fa-save"></i> Kaydet</button>
                            <button class="waf-btn-notify" onclick="WafIpWhitelist.testDeviceEdit('${d.env}')" style="margin-left:6px;"><i class="fas fa-plug"></i> Bağlantıyı Test Et</button>
                            <button class="waf-btn-notify" onclick="WafIpWhitelist.cancelDeviceEdit()" style="margin-left:6px;">İptal</button>
                        </div>
                        <div id="wd-result-${d.env}" style="margin-top:6px;font-size:12px;"></div>
                    </td>
                </tr>`;
            }
            if (schedulingDeviceEnv === d.env) {
                const parts = (d.cron_expression || '').trim().split(/\s+/);
                const isDaily = d.cron_enabled && parts.length === 5 && parts[2] === '*' && parts[3] === '*' && parts[4] === '*' && /^\d+$/.test(parts[0]) && /^\d+$/.test(parts[1]);
                const isWeekly = d.cron_enabled && parts.length === 5 && parts[2] === '*' && parts[3] === '*' && /^[0-6](,[0-6])*$/.test(parts[4]) && /^\d+$/.test(parts[0]) && /^\d+$/.test(parts[1]);
                const isCustom = d.cron_enabled && d.cron_expression && !isDaily && !isWeekly;
                const initType = !d.cron_enabled ? 'off' : isWeekly ? 'weekly' : isCustom ? 'custom' : 'daily';
                const initTime = (isDaily || isWeekly) ? `${parts[1].padStart(2,'0')}:${parts[0].padStart(2,'0')}` : '08:00';
                const initDays = isWeekly ? parts[4].split(',').map(Number) : [1];
                return `
                <tr>
                    <td>${escHtml(d.name)} <span class="waf-settings-hint">(${d.env})</span></td>
                    <td colspan="5">
                        <div class="waf-settings-row"><span class="waf-settings-label">Sıklık</span>
                            <select id="wd-sched-type-${d.env}" onchange="WafIpWhitelist.refreshScheduleFields('${d.env}')">
                                <option value="off" ${initType==='off'?'selected':''}>Kapalı</option>
                                <option value="daily" ${initType==='daily'?'selected':''}>Günlük</option>
                                <option value="weekly" ${initType==='weekly'?'selected':''}>Haftalık</option>
                                <option value="custom" ${initType==='custom'?'selected':''}>Özel (cron ifadesi)</option>
                            </select></div>
                        <div class="waf-settings-row" id="wd-sched-time-row-${d.env}" style="${(initType==='daily'||initType==='weekly')?'':'display:none;'}">
                            <span class="waf-settings-label">Saat</span>
                            <input type="time" id="wd-sched-time-${d.env}" value="${initTime}"></div>
                        <div class="waf-settings-row" id="wd-sched-days-row-${d.env}" style="${initType==='weekly'?'':'display:none;'}">
                            <span class="waf-settings-label">Günler</span>
                            <span>${WEEKDAYS_TR.map((lbl, idx) => `<label style="margin-right:8px;font-weight:normal;"><input type="checkbox" class="wd-sched-day-${d.env}" value="${idx}" ${initDays.includes(idx)?'checked':''}> ${lbl}</label>`).join('')}</span></div>
                        <div class="waf-settings-row" id="wd-sched-custom-row-${d.env}" style="${initType==='custom'?'':'display:none;'}">
                            <span class="waf-settings-label">Cron ifadesi</span>
                            <input type="text" id="wd-sched-custom-${d.env}" value="${isCustom ? escHtml(d.cron_expression) : '0 8 * * 1'}" placeholder="0 8 * * 1" style="flex:1"></div>
                        <div style="margin-top:6px;">
                            <button class="waf-btn-csv" onclick="WafIpWhitelist.saveDeviceSchedule('${d.env}')"><i class="fas fa-save"></i> Kaydet</button>
                            <button class="waf-btn-notify" onclick="WafIpWhitelist.cancelDeviceSchedule()" style="margin-left:6px;">İptal</button>
                        </div>
                    </td>
                </tr>`;
            }
            const schedText = humanizeCron(d.cron_enabled, d.cron_expression);
            const hasSchedule = d.cron_enabled && d.cron_expression;
            return `
            <tr>
                <td>${escHtml(d.name)} <span class="waf-settings-hint">(${d.env})</span></td>
                <td class="mono">${escHtml(d.host)}</td>
                <td>${escHtml(d.username)}</td>
                <td>
                    <label class="waf-switch">
                        <input type="checkbox" ${d.is_active ? 'checked' : ''} onchange="WafIpWhitelist.toggleDeviceActive('${d.env}', this.checked)">
                        <span class="waf-switch-slider"></span>
                    </label>
                </td>
                <td>
                    <div>${escHtml(schedText)}</div>
                    <div style="margin-top:4px;">
                        <button class="waf-btn-notify" onclick="WafIpWhitelist.openDeviceSchedule('${d.env}')" title="Otomatik tarama saati / sıklığı">
                            <i class="fas fa-clock"></i> ${hasSchedule ? 'Zamanlamayı Düzenle' : 'Zamanla'}
                        </button>
                        ${hasSchedule ? `<button class="waf-btn-notify" onclick="WafIpWhitelist.removeDeviceSchedule('${d.env}')" style="margin-left:4px;">Kaldır</button>` : ''}
                    </div>
                </td>
                <td>
                    <button class="waf-btn-csv" onclick="WafIpWhitelist.openDeviceEdit('${d.env}')" title="Ad, host, kullanıcı adı ve şifre">
                        <i class="fas fa-user-shield"></i> Kimlik Bilgileri
                    </button>
                </td>
            </tr>`;
        }).join('');

        return `
        <div class="waf-settings-section">
            <div class="waf-settings-section-title"><i class="fas fa-server"></i> F5 Cihazları</div>
            <table class="data-table" style="width:100%;">
                <thead><tr><th>Ad</th><th>Host</th><th>Kullanıcı</th><th>Aktif</th><th>Zamanlama</th><th>İşlem</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
    }

    function renderDevicesTabBody() {
        const el = document.getElementById('waf-devices-body');
        if (!el) return;
        el.innerHTML = `<div class="waf-settings-form">${renderDevicesSection()}</div>`;
    }

    function refreshScheduleFields(env) {
        const t = document.getElementById(`wd-sched-type-${env}`).value;
        document.getElementById(`wd-sched-time-row-${env}`).style.display = (t === 'daily' || t === 'weekly') ? '' : 'none';
        document.getElementById(`wd-sched-days-row-${env}`).style.display = (t === 'weekly') ? '' : 'none';
        document.getElementById(`wd-sched-custom-row-${env}`).style.display = (t === 'custom') ? '' : 'none';
    }

    function openDeviceSchedule(env) {
        schedulingDeviceEnv = env;
        editingDeviceEnv = null;
        renderDevicesTabBody();
    }

    function cancelDeviceSchedule() {
        schedulingDeviceEnv = null;
        renderDevicesTabBody();
    }

    async function saveDeviceSchedule(env) {
        const t = document.getElementById(`wd-sched-type-${env}`).value;
        const body = new FormData();
        body.append('action', 'update_device');
        body.append('target_env', env);
        if (t === 'off') {
            body.append('cron_enabled', '0');
            body.append('cron_expression', '');
        } else if (t === 'daily') {
            const [h, m] = document.getElementById(`wd-sched-time-${env}`).value.split(':');
            body.append('cron_enabled', '1');
            body.append('cron_expression', `${parseInt(m,10)} ${parseInt(h,10)} * * *`);
        } else if (t === 'weekly') {
            const [h, m] = document.getElementById(`wd-sched-time-${env}`).value.split(':');
            const days = Array.from(document.querySelectorAll(`.wd-sched-day-${env}:checked`)).map(c => c.value);
            if (days.length === 0) { alert('En az bir gün seçin'); return; }
            body.append('cron_enabled', '1');
            body.append('cron_expression', `${parseInt(m,10)} ${parseInt(h,10)} * * ${days.join(',')}`);
        } else {
            const expr = document.getElementById(`wd-sched-custom-${env}`).value.trim();
            if (expr.split(/\s+/).length !== 5) { alert('Geçersiz cron ifadesi (5 alan olmalı)'); return; }
            body.append('cron_enabled', '1');
            body.append('cron_expression', expr);
        }
        try {
            const res = await fetch('/portal/api/waf-ip-whitelist.php', { method: 'POST', body });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Kaydedilemedi');
            schedulingDeviceEnv = null;
            await reloadDevicesOnly();
        } catch (e) { alert('Hata: ' + e.message); }
    }

    async function removeDeviceSchedule(env) {
        if (!confirm('Bu cihazın zamanlaması kaldırılsın mı?')) return;
        const body = new FormData();
        body.append('action', 'update_device');
        body.append('target_env', env);
        body.append('cron_enabled', '0');
        body.append('cron_expression', '');
        try {
            const res = await fetch('/portal/api/waf-ip-whitelist.php', { method: 'POST', body });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Kaldırılamadı');
            await reloadDevicesOnly();
        } catch (e) { alert('Hata: ' + e.message); }
    }

    function openDeviceEdit(env) {
        editingDeviceEnv = env;
        schedulingDeviceEnv = null;
        renderDevicesTabBody();
    }

    function cancelDeviceEdit() {
        editingDeviceEnv = null;
        renderDevicesTabBody();
    }

    function wdResult(env, text, ok) {
        const el = document.getElementById(`wd-result-${env}`);
        if (!el) return;
        el.textContent = text;
        el.style.color = ok === true ? '#22c55e' : (ok === false ? '#ef4444' : '');
    }

    /** Kaydetmeden once, ekranda yazan bilgilerle cihaza baglanmayi dener. */
    async function testDeviceEdit(env) {
        const host = document.getElementById(`wd-host-${env}`).value.trim();
        const user = document.getElementById(`wd-user-${env}`).value.trim();
        const pass = document.getElementById(`wd-pass-${env}`).value;
        if (!host || !user) { wdResult(env, 'Host ve kullanıcı boş olamaz', false); return; }

        wdResult(env, 'Test ediliyor...', null);
        const body = new FormData();
        body.append('action', 'test_device');
        body.append('target_env', env);
        body.append('host', host);
        body.append('username', user);
        if (pass) body.append('password', pass);
        try {
            const res  = await fetch('/portal/api/waf-ip-whitelist.php', { method: 'POST', body });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Test edilemedi');
            wdResult(env, data.ok
                ? `Başarılı (${data.source === 'form' ? 'ekrandaki bilgiler' : 'kayıtlı şifre'}, kullanıcı: ${data.username})`
                : `Başarısız: ${data.error}`, !!data.ok);
        } catch (e) { wdResult(env, 'Hata: ' + e.message, false); }
    }

    async function saveDeviceEdit(env) {
        const name = document.getElementById(`wd-name-${env}`).value.trim();
        const host = document.getElementById(`wd-host-${env}`).value.trim();
        const user = document.getElementById(`wd-user-${env}`).value.trim();
        const pass = document.getElementById(`wd-pass-${env}`).value;
        if (!host || !user) { wdResult(env, 'Host ve kullanıcı boş olamaz', false); return; }

        wdResult(env, 'Cihazda doğrulanıyor...', null);
        const body = new FormData();
        body.append('action', 'update_device');
        body.append('target_env', env);
        if (name) body.append('name', name);
        body.append('host', host);
        body.append('username', user);
        if (pass) body.append('password', pass);
        try {
            const res = await fetch('/portal/api/waf-ip-whitelist.php', { method: 'POST', body });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Kaydedilemedi');
            editingDeviceEnv = null;
            await reloadDevicesOnly();
        } catch (e) { wdResult(env, 'Hata: ' + e.message, false); }
    }

    async function toggleDeviceActive(env, active) {
        const body = new FormData();
        body.append('action', 'update_device');
        body.append('target_env', env);
        body.append('is_active', active ? '1' : '0');
        try {
            const res = await fetch('/portal/api/waf-ip-whitelist.php', { method: 'POST', body });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Güncellenemedi');
            await reloadDevicesOnly();
        } catch (e) { alert('Hata: ' + e.message); }
    }

    async function reloadDevicesOnly() {
        try {
            const res = await fetch('/portal/api/waf-ip-whitelist.php?action=list_devices');
            const data = await res.json();
            wafDevices = data.success ? (data.devices || []) : [];
        } catch (e) { /* sessiz geç, mevcut liste kalır */ }
        renderDevicesTabBody();
    }

    function renderSettingsBody(s) {
        lastSettingsCache = s;
        const thresholds = [1, 3, 7, 14, 30];
        const lastSent   = s._last_undated_notify
            ? new Date(s._last_undated_notify).toLocaleDateString('tr-TR')
            : 'Henüz gönderilmedi';

        document.getElementById('waf-settings-body').innerHTML = `
        <div class="waf-settings-form">

            <div class="waf-settings-section">
                <div class="waf-settings-section-title"><i class="fas fa-power-off"></i> Genel</div>
                <label class="waf-settings-row">
                    <span class="waf-settings-label">Bildirimleri aktif et</span>
                    <input type="checkbox" id="ws-enabled" ${s.enabled ? 'checked' : ''}>
                </label>
            </div>

            <div class="waf-settings-section">
                <div class="waf-settings-section-title"><i class="fas fa-envelope"></i> Mail Alıcıları</div>
                <div class="waf-settings-hint">Birden fazla adres için virgül veya noktalı virgül kullanın</div>
                <textarea id="ws-recipients" class="waf-settings-textarea" rows="3" placeholder="ornek@sirket.com, diger@sirket.com">${escHtml(s.email_recipients)}</textarea>
            </div>

            <div class="waf-settings-section">
                <div class="waf-settings-section-title"><i class="fas fa-calendar-times"></i> Süre Dolumu Bildirimleri</div>
                <div class="waf-settings-hint">Kaç gün kaldığında bildirim atılsın? (Her eşik için tek mail)</div>
                <div class="waf-settings-thresholds">
                    ${thresholds.map(d => `
                    <label class="waf-settings-threshold">
                        <input type="checkbox" name="ws-threshold" value="${d}" ${(s.expire_thresholds||[]).includes(d) ? 'checked' : ''}>
                        <span>${d} gün</span>
                    </label>`).join('')}
                </div>
            </div>

            <div class="waf-settings-section">
                <div class="waf-settings-section-title"><i class="fas fa-clock"></i> Tarihlenmemiş IP Bildirimi</div>
                <label class="waf-settings-row">
                    <span class="waf-settings-label">Tarihi olmayan IP'leri bildir</span>
                    <input type="checkbox" id="ws-notify-undated" ${s.notify_undated ? 'checked' : ''}>
                </label>
                <label class="waf-settings-row" style="margin-top:10px;">
                    <span class="waf-settings-label">Bildirim aralığı (gün)</span>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <input type="number" id="ws-undated-interval" class="waf-settings-number"
                               min="1" max="365" value="${s.notify_undated_interval_days}">
                        <span class="waf-settings-hint" style="margin:0;">günde bir</span>
                    </div>
                </label>
                <div class="waf-settings-info">
                    <i class="fas fa-info-circle"></i> Son gönderim: <strong>${escHtml(lastSent)}</strong>
                </div>
            </div>

        </div>`;
    }

    async function saveSettings() {
        const saveMsg = document.getElementById('waf-settings-save-msg');
        saveMsg.textContent = '';
        saveMsg.className   = 'waf-settings-save-msg';

        const enabled    = document.getElementById('ws-enabled')?.checked ? '1' : '0';
        const recipients = document.getElementById('ws-recipients')?.value?.trim() || '';
        const interval   = document.getElementById('ws-undated-interval')?.value || '7';
        const notifyUndated = document.getElementById('ws-notify-undated')?.checked ? '1' : '0';
        const thresholdBoxes = document.querySelectorAll('input[name="ws-threshold"]:checked');

        if (!recipients) {
            saveMsg.textContent = 'Mail alıcısı boş olamaz.';
            saveMsg.classList.add('waf-settings-save-msg--error');
            return;
        }
        if (thresholdBoxes.length === 0) {
            saveMsg.textContent = 'En az bir eşik değeri seçin.';
            saveMsg.classList.add('waf-settings-save-msg--error');
            return;
        }

        const body = new FormData();
        body.append('action',                      'save_notify_settings');
        body.append('enabled',                     enabled);
        body.append('email_recipients',            recipients);
        body.append('notify_undated',              notifyUndated);
        body.append('notify_undated_interval_days', interval);
        thresholdBoxes.forEach(cb => body.append('expire_thresholds[]', cb.value));

        try {
            const res  = await fetch('/portal/api/waf-ip-whitelist.php', { method: 'POST', body });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Kaydedilemedi');
            saveMsg.textContent = 'Ayarlar kaydedildi.';
            saveMsg.classList.add('waf-settings-save-msg--ok');
            setTimeout(() => { saveMsg.textContent = ''; saveMsg.className = 'waf-settings-save-msg'; }, 3000);
        } catch (e) {
            saveMsg.textContent = e.message;
            saveMsg.classList.add('waf-settings-save-msg--error');
        }
    }

    function closeSettingsModal() {
        const modal = document.getElementById('waf-settings-modal');
        if (modal) modal.style.display = 'none';
    }

    function closeHistoryModal() {
        const modal = document.getElementById('waf-history-modal');
        if (modal) modal.style.display = 'none';
    }

    function renderHistoryContent(ip, history, annotations) {
        let html = '';

        // ── Mevcut annotation durumu ──────────────────────────────
        if (annotations && annotations.length > 0) {
            const active   = annotations.filter(a => !a.is_deleted);
            const archived = annotations.filter(a =>  a.is_deleted);

            html += '<div class="waf-hist-section">';
            html += '<div class="waf-hist-section-title"><i class="fas fa-tag"></i> Mevcut Notlar</div>';

            if (active.length === 0) {
                html += '<div class="waf-hist-no-active"><i class="fas fa-archive"></i> Aktif not yok (tümü arşivlendi)</div>';
            } else {
                active.forEach(a => {
                    html += `
                    <div class="waf-hist-annotation">
                        <div class="waf-hist-anno-row">
                            <span class="waf-hist-anno-label">Policy:</span>
                            <span>${escHtml(a.policy_name || a.policy_id)}</span>
                            <span class="waf-hist-anno-env" style="background:${a.env==='prod'?'#dc2626':a.env==='drc'?'#7c3aed':'#0891b2'}">${a.env.toUpperCase()}</span>
                        </div>
                        ${a.comment ? `<div class="waf-hist-anno-row"><span class="waf-hist-anno-label">Not:</span> <span>${escHtml(a.comment)}</span></div>` : ''}
                        ${a.expire_date ? `<div class="waf-hist-anno-row"><span class="waf-hist-anno-label">Son Tarih:</span> <span>${escHtml(a.expire_date)}</span></div>` : ''}
                        ${a.is_ours ? '<div class="waf-hist-anno-row"><span class="waf-badge-ours" style="font-size:0.72rem">Bizim IP</span></div>' : ''}
                        <div class="waf-hist-anno-row waf-hist-anno-who">
                            Son güncelleme: ${escHtml(a.updated_by || a.created_by || '—')} — ${formatDate(a.updated_at || a.created_at)}
                        </div>
                    </div>`;
                });
            }

            if (archived.length > 0) {
                html += `<div class="waf-hist-archived-note"><i class="fas fa-archive"></i> ${archived.length} arşivlenmiş not var — geçmiş akışında görünüyor</div>`;
            }
            html += '</div>';
        }

        // ── Zaman çizelgesi ───────────────────────────────────────
        html += '<div class="waf-hist-section">';
        html += '<div class="waf-hist-section-title"><i class="fas fa-stream"></i> Olay Geçmişi</div>';

        if (!history || history.length === 0) {
            html += '<div class="waf-hist-empty"><i class="fas fa-inbox"></i> Henüz kayıtlı olay yok.</div>';
        } else {
            html += '<div class="waf-timeline">';
            history.forEach(entry => {
                const { icon, label, cls } = buildActionLabel(entry.action);
                const detailParts = [];
                if (entry.details) {
                    let d = entry.details;
                    if (typeof d === 'string') { try { d = JSON.parse(d); } catch(e) { d = {}; } }
                    if (d.comment    !== undefined && d.comment !== '')    detailParts.push(`Not: "${escHtml(d.comment)}"`);
                    if (d.expire_date !== undefined && d.expire_date)      detailParts.push(`Son Tarih: ${escHtml(d.expire_date)}`);
                    if (d.is_ours    !== undefined && d.is_ours)           detailParts.push('Bizim IP olarak işaretlendi');
                }
                html += `
                <div class="waf-timeline-item">
                    <div class="waf-timeline-dot ${cls}"></div>
                    <div class="waf-timeline-body">
                        <div class="waf-timeline-header">
                            <span class="waf-timeline-badge ${cls}">${icon} ${label}</span>
                            <span class="waf-timeline-who">${escHtml(entry.changed_by || 'system')}</span>
                            <span class="waf-timeline-time">${formatDateTime(entry.changed_at)}</span>
                        </div>
                        ${detailParts.length > 0
                            ? `<div class="waf-timeline-details">${detailParts.join(' &nbsp;·&nbsp; ')}</div>`
                            : ''}
                    </div>
                </div>`;
            });
            html += '</div>';
        }
        html += '</div>';

        return html;
    }

    function buildActionLabel(action) {
        const map = {
            'annotation_created'  : { icon: '●', label: 'Not Oluşturuldu',   cls: 'waf-tl-created'  },
            'annotation_updated'  : { icon: '●', label: 'Not Güncellendi',    cls: 'waf-tl-updated'  },
            'annotation_restored' : { icon: '●', label: 'Not Geri Yüklendi', cls: 'waf-tl-restored' },
            'annotation_deleted'  : { icon: '●', label: 'Not Arşivlendi',    cls: 'waf-tl-deleted'  },
            'removed_from_f5'     : { icon: '●', label: 'F5\'ten Silindi',   cls: 'waf-tl-removed'  },
        };
        return map[action] || { icon: '●', label: action, cls: 'waf-tl-default' };
    }

    function formatDateTime(dtStr) {
        if (!dtStr) return '—';
        try {
            return new Date(dtStr).toLocaleString('tr-TR', {
                day:'2-digit', month:'2-digit', year:'numeric',
                hour:'2-digit', minute:'2-digit'
            });
        } catch { return dtStr; }
    }

    // ── Faz 4 — Rapor Modalı ──────────────────────────────────────────
    function openReportModal() {
        const modal = document.getElementById('waf-report-modal');
        if (!modal) return;
        modal.style.display = 'flex';
        generateReport(currentReportEnv, null, true);
    }

    function closeReportModal() {
        const modal = document.getElementById('waf-report-modal');
        if (modal) modal.style.display = 'none';
    }

    async function generateReport(env, btn, initial) {
        currentReportEnv = env;

        document.querySelectorAll('#waf-report-env-btns .waf-report-env-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.env === env);
        });

        const body   = document.getElementById('waf-report-body');
        const footer = document.getElementById('waf-report-footer');
        const meta   = document.getElementById('waf-report-meta');
        if (body)   body.innerHTML   = '<div class="waf-loading"><i class="fas fa-spinner fa-spin"></i> Rapor oluşturuluyor...</div>';
        if (footer) footer.style.display = 'none';
        if (meta)   meta.textContent = 'Yükleniyor...';

        try {
            const res  = await fetch(`/portal/api/waf-ip-whitelist.php?action=get_report&report_env=${encodeURIComponent(env)}`);
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Rapor alınamadı');

            if (meta) {
                const envLabel = env === 'all' ? 'Tüm Ortamlar' : env.toUpperCase();
                meta.textContent = `${envLabel} · ${data.generated}`;
            }
            if (body)   body.innerHTML        = renderReportContent(data);
            if (footer) footer.style.display  = 'flex';
        } catch(e) {
            if (body) body.innerHTML = `<div class="waf-error"><i class="fas fa-exclamation-triangle"></i> ${escHtml(e.message)}</div>`;
        }
    }

    function renderReportContent(data) {
        const t         = data.totals    || {};
        const uniqIps   = data.unique_ips || [];
        const policies  = data.policies   || [];
        const envColors = { prod: '#dc2626', test: '#0891b2', drc: '#7c3aed' };

        let html = '';

        // ── 1. Özet istatistikler (sadece dış IP'ler)
        html += `<div class="waf-report-stats">
            <div class="waf-report-stat">
                <div class="waf-report-stat-num">${t.total || 0}</div>
                <div class="waf-report-stat-label">Toplam Kayıt</div>
            </div>
            <div class="waf-report-stat info">
                <div class="waf-report-stat-num">${uniqIps.length}</div>
                <div class="waf-report-stat-label">Benzersiz IP</div>
            </div>
            <div class="waf-report-stat warning">
                <div class="waf-report-stat-num">${t.without_date || 0}</div>
                <div class="waf-report-stat-label">Tarihsiz</div>
            </div>
            <div class="waf-report-stat info">
                <div class="waf-report-stat-num">${t.with_date || 0}</div>
                <div class="waf-report-stat-label">Tarihli</div>
            </div>
            <div class="waf-report-stat danger">
                <div class="waf-report-stat-num">${t.expired || 0}</div>
                <div class="waf-report-stat-label">Süresi Doldu</div>
            </div>
            <div class="waf-report-stat warning">
                <div class="waf-report-stat-num">${t.critical || 0}</div>
                <div class="waf-report-stat-label">Kritik (≤7 gün)</div>
            </div>
        </div>`;

        if (policies.length === 0) {
            html += '<div class="waf-hist-no-active" style="padding:16px 0;color:#6b7280">Bu ortamda kayıt yok.</div>';
            return html;
        }

        // ── 2. Tüm benzersiz IP adresleri (siber ekip önce bunlara bakar)
        html += `<div class="waf-report-section">
            <div class="waf-report-section-title">
                <i class="fas fa-list"></i> Tüm IP Adresleri
                <span style="font-size:.72rem;font-weight:400;color:#9ca3af;margin-left:4px">
                    — siber ekip buradaki IP'lerin gerekli olup olmadığına karar verir
                </span>
            </div>
            <table class="waf-report-table">
                <thead><tr>
                    <th>Ortam</th><th>IP Adresi</th><th>Policy Sayısı</th><th>Policy'ler</th>
                </tr></thead><tbody>`;
        uniqIps.forEach(row => {
            const ec   = envColors[row.env] || '#6b7280';
            const cidr = maskToCIDR(row.ip_mask);
            const ipDisp = row.ip_mask !== '255.255.255.255' ? `${row.ip_address}/${cidr}` : row.ip_address;
            html += `<tr>
                <td><span style="background:${ec};color:#fff;font-size:10px;font-weight:700;padding:2px 7px">${escHtml(row.env.toUpperCase())}</span></td>
                <td><code style="font-size:12px;font-weight:600">${escHtml(ipDisp)}</code></td>
                <td style="text-align:center;color:#6b7280">${row.policy_count}</td>
                <td style="font-size:11px;color:#6b7280">${escHtml(row.policies)}</td>
            </tr>`;
        });
        html += '</tbody></table></div>';

        // ── 3. Policy bazlı detay (yorum + tarih)
        html += `<div class="waf-report-section">
            <div class="waf-report-section-title">
                <i class="fas fa-shield-alt"></i> Policy Bazlı Detay
                <span style="font-size:.72rem;font-weight:400;color:#9ca3af;margin-left:4px">— her IP'nin hangi policy'de olduğu, yorumu ve tarihi</span>
            </div>`;

        policies.forEach(pol => {
            const ec    = envColors[pol.env] || '#6b7280';
            const total = pol.without_date.length + pol.with_date.length;
            const allIps = [...pol.without_date, ...pol.with_date];

            html += `<div class="waf-report-policy-block">
                <div class="waf-report-policy-label">
                    <span style="background:${ec};color:#fff;font-size:10px;font-weight:700;padding:2px 7px">${escHtml(pol.env.toUpperCase())}</span>
                    <strong>${escHtml(pol.policy_name)}</strong>
                    <span style="color:#9ca3af;font-size:.75rem">${total} IP</span>
                    ${pol.without_date.length > 0
                        ? `<span style="background:#fff7ed;color:#c2410c;font-size:.7rem;font-weight:600;padding:1px 7px;border-radius:3px">${pol.without_date.length} tarih girilmemiş</span>`
                        : ''}
                </div>
                <table class="waf-report-table">
                    <thead><tr>
                        <th>IP Adresi</th>
                        <th>Yorum / Not</th>
                        <th>Son Tarih</th>
                        <th>Kim Notladı</th>
                    </tr></thead><tbody>`;

            allIps.forEach(row => {
                const cidr   = maskToCIDR(row.ip_mask);
                const ipDisp = row.ip_mask !== '255.255.255.255'
                    ? `${row.ip_address}/${cidr}` : row.ip_address;

                let dateCell = '';
                if (!row.expire_date) {
                    dateCell = `<span style="background:#fff7ed;color:#c2410c;font-size:10px;font-weight:600;padding:2px 8px">Tarih Girilmemiş</span>`;
                } else {
                    const d = parseInt(row.days_left);
                    let bg = '#f0fdf4', col = '#059669';
                    if (d < 0)       { bg = '#fef2f2'; col = '#991b1b'; }
                    else if (d <= 3) { bg = '#fff7ed'; col = '#c2410c'; }
                    else if (d <= 7) { bg = '#fffbeb'; col = '#b45309'; }
                    const dl = d < 0 ? Math.abs(d)+'g geçti' : (d===0?'Bugün':d+' gün');
                    dateCell = `${escHtml(row.expire_date.substring(0,10))} <span style="background:${bg};color:${col};font-size:10px;font-weight:600;padding:1px 6px">${dl}</span>`;
                }

                const hasComment = row.comment && row.comment.trim();
                html += `<tr>
                    <td><code style="font-size:12px;font-weight:600">${escHtml(ipDisp)}</code></td>
                    <td style="color:${hasComment?'#374151':'#9ca3af'}">${hasComment ? escHtml(row.comment) : '<em>yorum yok</em>'}</td>
                    <td>${dateCell}</td>
                    <td style="font-size:11px;color:#6b7280">${escHtml(row.updated_by || row.created_by || '—')}</td>
                </tr>`;
            });
            html += '</tbody></table></div>';
        });
        html += '</div>';

        return html;
    }

    // ── CSV İndir ─────────────────────────────────────────────────────
    function exportCsv() {
        const url = `/portal/api/waf-ip-whitelist.php?action=export_csv&report_env=${encodeURIComponent(currentReportEnv)}`;
        window.open('_api/waf-preview-report.html', '_blank'); // statik demo
    }

    // ── PDF Önizle / İndir ────────────────────────────────────────────
    function exportPdf() {
        const url = `/portal/api/waf-ip-whitelist.php?action=preview_report&report_env=${encodeURIComponent(currentReportEnv)}`;
        window.open('_api/waf-preview-report.html', 'waf_report_pdf'); // statik demo
    }

    // ── Siber Ekibe Gönder ────────────────────────────────────────────
    async function sendReportMail() {
        const btn = document.getElementById('waf-report-mail-btn');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gönderiliyor...'; }

        const fd = new FormData();
        fd.append('report_env', currentReportEnv);

        try {
            const res  = await fetch('/portal/api/waf-ip-whitelist.php?action=send_report_mail', { method: 'POST', body: fd });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Bilinmeyen hata');
            showWafMsg(`Rapor gönderildi → ${data.recipient || ''}`, 'success');
            if (btn) {
                btn.innerHTML = '<i class="fas fa-check"></i> Gönderildi';
                btn.style.background = '#10b981';
                setTimeout(() => {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-paper-plane"></i> Siber Ekibe Gönder';
                    btn.style.background = '';
                }, 5000);
            }
        } catch(e) {
            showWafMsg('Mail hatası: ' + e.message, 'error');
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Siber Ekibe Gönder'; }
        }
    }

    // ── Rapor Maili (Manuel) ──────────────────────────────────────────
    async function sendTestMail() {
        const btn = document.getElementById('waf-test-mail-btn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gönderiliyor...';
        try {
            const body = new FormData();
            body.append('force_report', '1');
            const res  = await fetch('/portal/waf-ip-notify.php', { method: 'POST', body });
            const data = await res.json();
            if (data.success && data.sent > 0) {
                const info = `Gönderildi → ${data.recipient || 'ornek.hizmet'} (${data.expiring} süreli, ${data.undated} tarihsiz)`;
                btn.innerHTML = '<i class="fas fa-check"></i> Gönderildi';
                btn.style.background = '#10b981';
                showWafMsg(info, 'success');
                setTimeout(() => { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Rapor Gönder'; btn.style.background = ''; }, 4000);
            } else {
                throw new Error(data.error || data.reason || 'Bilinmeyen hata');
            }
        } catch (e) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-paper-plane"></i> Rapor Gönder';
            showWafMsg('Mail hatası: ' + e.message, 'error');
        }
    }

    // ── Yardımcılar ───────────────────────────────────────────────────
    function buildStatusBadge(item) {
        if (item.isOurs)      return '<span class="waf-status waf-status-ours">Kalıcı (Biz)</span>';
        if (!item.expireDate) return '<span class="waf-status waf-status-nodates">Tarih Yok</span>';
        const d = item.daysLeft;
        if (d < 0)   return `<span class="waf-status waf-status-expired">${Math.abs(d)}g geçti</span>`;
        if (d === 0) return '<span class="waf-status waf-status-critical">Bugün bitiyor</span>';
        if (d <= 3)  return `<span class="waf-status waf-status-critical">${d} gün kaldı</span>`;
        if (d <= 7)  return `<span class="waf-status waf-status-warning">${d} gün kaldı</span>`;
        if (d <= 30) return `<span class="waf-status waf-status-soon">${d} gün kaldı</span>`;
        return `<span class="waf-status waf-status-ok">${d} gün kaldı</span>`;
    }

    function maskToCIDR(mask) {
        if (!mask || mask === '255.255.255.255') return '32';
        const parts = mask.split('.').map(Number);
        let bits = 0;
        for (const p of parts) { let b = p; while (b > 0) { bits += b & 1; b >>= 1; } }
        return String(bits);
    }

    function escHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function formatDate(dtStr) {
        if (!dtStr) return '';
        try { return new Date(dtStr).toLocaleDateString('tr-TR', { day:'2-digit', month:'2-digit', year:'numeric' }); }
        catch { return dtStr; }
    }

    function showWafMsg(msg, type) {
        const el = document.getElementById('waf-msg');
        if (!el) return;
        el.textContent = msg;
        el.className   = 'waf-msg waf-msg-' + type;
        el.style.display = 'block';
        setTimeout(() => { el.style.display = 'none'; }, 6000);
    }

    return {
        init, setEnv, loadAll, reloadPolicy,
        onSearch, onFilterStatus, onFilterPolicy, clearFilters,
        saveRow, archiveRow, archiveOrphan,
        showHistory, closeHistoryModal,
        sendRemovalNotify,
        sendTestMail, toggleSection,
        openReportModal, closeReportModal, generateReport, exportCsv, exportPdf, sendReportMail,
        openSettingsModal, closeSettingsModal, saveSettings,
        switchPageTab,
        toggleDeviceActive, openDeviceEdit, cancelDeviceEdit, saveDeviceEdit, testDeviceEdit,
        openDeviceSchedule, cancelDeviceSchedule, saveDeviceSchedule, removeDeviceSchedule,
        refreshScheduleFields,
        loadSharedIps, openBulkModal, closeBulkModal, saveBulkAnnotation, toggleBulkAll,
        onRowSelect, toggleSelectAll, clearSelection,
    };

})();
