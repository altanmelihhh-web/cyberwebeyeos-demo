// DeviceLifecycleManagement.js
// Portal'ın Device Lifecycle & EOL Monitor dashboard'unu yönetir.
// loadLifecycleAll() showPage('device-lifecycle') case'inde tetiklenir.

(function () {
    'use strict';

    const API = 'api/lifecycle-status.php';

    function escapeHtml(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function fmtDate(s) {
        if (!s) return '—';
        try {
            const d = new Date(s);
            if (isNaN(d)) return s;
            return d.toLocaleString('tr-TR', { hour12: false });
        } catch (e) { return s; }
    }

    const STATUS_LABELS = {
        ok: 'Sorun Yok',
        eol_soon: 'EOL Yaklaşıyor',
        eol: 'Satışı Bitti',
        eos: 'Desteği Bitti',
        no_data: 'Sorun Yok'
    };

    function statusBadge(status) {
        const cls = 'lc-badge ' + escapeHtml(status || 'no_data');
        const label = STATUS_LABELS[status] || status || '—';
        return `<span class="${cls}">${escapeHtml(label)}</span>`;
    }

    async function apiGet(action, params) {
        const qs = new URLSearchParams(Object.assign({ action }, params || {})).toString();
        const res = await fetch(`${API}?${qs}`);
        return res.json();
    }

    async function apiPost(action, body) {
        const res = await fetch(`${API}?action=${encodeURIComponent(action)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body || {})
        });
        return res.json();
    }

    // ========== Tabs ==========
    window.lcSwitchTab = function (tab, opts) {
        document.querySelectorAll('.lc-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.lc-tab-content').forEach(c => c.classList.remove('active'));
        const btn = document.querySelector(`.lc-tab-btn[data-lc-tab="${tab}"]`);
        const content = document.getElementById(`lc-tab-${tab}`);
        if (btn) btn.classList.add('active');
        if (content) content.classList.add('active');

        if (tab === 'bulgular') lcBackToBulguDevices();
        if (tab === 'eolref') lcLoadEolReference();
        if (tab === 'runs') lcLoadRuns();
        if (tab === 'ayarlar') { lcLoadSettings(); lcLoadKeywords(); lcLoadSources(); }
    };

    // ========== Tip bazlı son tarama durumu şeridi (Bulgular / EOL Referans) ==========
    const RUN_TYPE_STRIP_LABELS = { eol: 'EOL/EOS Taraması', cve: 'CVE Taraması', full: 'Tam Tarama (EOL+CVE)', mail: 'Mail Bildirimi' };

    function renderRunStatusStrip(lastRunsByType) {
        const rows = lastRunsByType || [];
        const html = rows.map(r => {
            const running = !r.finished_at;
            const hasError = (r.errors ?? 0) > 0;
            const cls = running ? 'running' : (hasError ? 'error' : 'ok');
            const icon = running ? '<i class="fas fa-spinner fa-spin"></i>' : (hasError ? '<i class="fas fa-exclamation-triangle"></i>' : '<i class="fas fa-check"></i>');
            const label = RUN_TYPE_STRIP_LABELS[r.run_type] || r.run_type;
            const when = fmtDate(r.finished_at || r.started_at);
            const statusText = running ? 'çalışıyor' : (hasError ? `${r.errors} hata` : 'başarılı');
            const title = hasError && r.notes ? escapeHtml(r.notes) : '';
            return `<span class="lc-runstatus-item ${cls}" title="${title}" onclick="lcSwitchTab('runs')">${icon} <b>${escapeHtml(label)}</b>: ${escapeHtml(when)} — ${escapeHtml(statusText)}</span>`;
        }).join('');
        const strips = [document.getElementById('lc-runstatus-bulgular'), document.getElementById('lc-runstatus-eolref')];
        strips.forEach(el => {
            if (!el) return;
            el.innerHTML = html || '<span style="color:#95a5a6;font-size:.82rem;">Henüz tarama çalıştırılmadı</span>';
        });
    }

    // ========== Bulgular sekmesi: cihaz envanteri + bulgu sayısı ==========
    let __lcFindingsDeviceFilter = null;

    window.lcLoadBulguDevices = async function () {
        const tbody = document.getElementById('lc-bulgu-devices-tbody');
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#95a5a6;padding:20px;">Yükleniyor…</td></tr>';

        const vendor = document.getElementById('lc-bulgu-filter-vendor')?.value || '';
        const instanceId = document.getElementById('lc-bulgu-filter-instance')?.value || '';
        const onlyWithFindings = document.getElementById('lc-bulgu-filter-onlywithfindings')?.checked;

        const resp = await apiGet('devices', { vendor, instance_id: instanceId });
        if (!resp.success) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#c0392b;padding:20px;">${escapeHtml(resp.error || 'Hata')}</td></tr>`;
            return;
        }

        let devices = resp.data || [];
        if (onlyWithFindings) devices = devices.filter(d => (d.finding_count ?? 0) > 0);

        // Vendor dropdown'unu bir kez doldur (envanter sekmesindekiyle aynı desen)
        const vendorSelect = document.getElementById('lc-bulgu-filter-vendor');
        if (vendorSelect && vendorSelect.options.length <= 1) {
            const vendors = [...new Set((resp.data || []).map(d => d.vendor).filter(Boolean))].sort();
            vendors.forEach(v => {
                const opt = document.createElement('option');
                opt.value = v; opt.textContent = v;
                vendorSelect.appendChild(opt);
            });
        }
        const instanceSelect = document.getElementById('lc-bulgu-filter-instance');
        if (instanceSelect && instanceSelect.options.length <= 1) {
            const seen = new Set();
            (resp.data || []).forEach(d => {
                if (d.instance_id && !seen.has(d.instance_id)) {
                    seen.add(d.instance_id);
                    const opt = document.createElement('option');
                    opt.value = d.instance_id;
                    opt.textContent = `${d.instance_name} (${d.environment})`;
                    instanceSelect.appendChild(opt);
                }
            });
        }

        if (!devices.length) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#95a5a6;padding:20px;">Cihaz bulunamadı</td></tr>';
            return;
        }

        // Bulgu sayısına göre azalan sırala — en çok bulgusu olan cihaz üstte
        devices = devices.slice().sort((a, b) => (b.finding_count ?? 0) - (a.finding_count ?? 0));

        tbody.innerHTML = devices.map(dev => {
            const nameLabel = dev.display_name && dev.display_name !== dev.hostname
                ? `${escapeHtml(dev.display_name)}<br><span style="font-size:.75rem;color:#95a5a6;">${escapeHtml(dev.hostname)}</span>`
                : escapeHtml(dev.hostname);

            const findingCount = dev.finding_count ?? 0;
            const devLabel = escapeHtml(dev.display_name || dev.hostname).replace(/'/g, "\\'");
            let findingHtml;
            if (findingCount > 0) {
                const tone = dev.finding_kev_count > 0 ? 'lc-kev-tag'
                    : dev.finding_critical_count > 0 ? 'lc-badge eol'
                    : 'lc-badge eol_soon';
                findingHtml = `<span class="${tone}" style="cursor:pointer;" title="Bulguları görüntülemek için tıklayın" onclick="lcShowDeviceFindings(${dev.id}, '${devLabel}')">${findingCount} bulgu</span>`;
            } else {
                findingHtml = '<span style="color:#95a5a6;">— bulgu yok</span>';
            }

            return `<tr data-lc-label="Cihaz: ${escapeHtml(dev.display_name || dev.hostname)}" style="${findingCount > 0 ? 'cursor:pointer;' : ''}" ${findingCount > 0 ? `onclick="lcShowDeviceFindings(${dev.id}, '${devLabel}')"` : ''}>
                <td>${escapeHtml(dev.environment || dev.instance_name || '—')}</td>
                <td>${nameLabel}</td>
                <td>${escapeHtml(dev.ip || '—')}</td>
                <td>${escapeHtml(dev.effective_vendor || dev.vendor || '—')}</td>
                <td>${escapeHtml(dev.effective_hardware || dev.hardware || '—')}</td>
                <td>${findingHtml}</td>
            </tr>`;
        }).join('');
    };

    window.lcShowDeviceFindings = function (deviceId, deviceLabel) {
        __lcFindingsDeviceFilter = { id: deviceId, label: deviceLabel };
        const ackFilter = document.getElementById('lc-vuln-filter-ack');
        if (ackFilter) ackFilter.value = '';
        document.getElementById('lc-bulgu-devices-view').style.display = 'none';
        document.getElementById('lc-bulgu-findings-view').style.display = 'block';
        lcLoadFindings();
    };

    window.lcBackToBulguDevices = function () {
        __lcFindingsDeviceFilter = null;
        document.getElementById('lc-bulgu-findings-view').style.display = 'none';
        document.getElementById('lc-bulgu-devices-view').style.display = 'block';
        lcLoadBulguDevices();
    };

    // ========== Özet kartlar ==========
    async function loadSummary() {
        const resp = await apiGet('summary');
        if (!resp.success) return;
        const d = resp.data;

        document.getElementById('lc-stat-total').textContent = d.total_devices ?? '—';
        document.getElementById('lc-stat-ok').textContent = d.status_counts?.ok ?? 0;
        document.getElementById('lc-stat-soon').textContent = d.status_counts?.eol_soon ?? 0;
        document.getElementById('lc-stat-eol').textContent = d.status_counts?.eol ?? 0;
        document.getElementById('lc-stat-eos').textContent = d.status_counts?.eos ?? 0;
        document.getElementById('lc-stat-nodata').textContent = d.status_counts?.no_data ?? 0;
        document.getElementById('lc-stat-kev').textContent = d.vuln_counts?.kev ?? 0;
        document.getElementById('lc-stat-critical').textContent = d.vuln_counts?.critical ?? 0;
        document.getElementById('lc-stat-high').textContent = d.vuln_counts?.high ?? 0;

        const vendorSelect = document.getElementById('lc-filter-vendor');
        if (vendorSelect && vendorSelect.options.length <= 1) {
            (d.by_vendor || []).forEach(v => {
                const opt = document.createElement('option');
                opt.value = v.vendor;
                opt.textContent = `${v.vendor} (${v.count})`;
                vendorSelect.appendChild(opt);
            });
        }

        const runInfo = document.getElementById('lc-last-run-info');
        if (runInfo) {
            if (d.last_run) {
                runInfo.textContent = `Son senkronizasyon: ${fmtDate(d.last_run.finished_at || d.last_run.started_at)} (${d.last_run.devices_synced ?? 0} cihaz)`;
            } else {
                runInfo.textContent = 'Henüz senkronizasyon yapılmadı';
            }
        }

        renderRunStatusStrip(d.last_runs_by_type);
    }

    // ========== Instance dropdown (librenms_instances) ==========
    async function loadInstances() {
        const sel = document.getElementById('lc-filter-instance');
        if (!sel || sel.options.length > 1) return;
        try {
            const res = await fetch('get-librenms-instances.php');
            const data = await res.json();
            (data.instances || []).forEach(inst => {
                const opt = document.createElement('option');
                opt.value = inst.id;
                opt.textContent = `${inst.name} (${inst.environment})`;
                sel.appendChild(opt);
            });
        } catch (e) { /* sessiz geç — filtre opsiyonel */ }
    }

    // ========== Envanter tablosu ==========
    window.lcLoadDevices = async function () {
        const tbody = document.getElementById('lc-devices-tbody');
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#95a5a6;padding:20px;">Yükleniyor…</td></tr>';

        const vendor = document.getElementById('lc-filter-vendor')?.value || '';
        const status = document.getElementById('lc-filter-status')?.value || '';
        const instanceId = document.getElementById('lc-filter-instance')?.value || '';
        const includeExcluded = document.getElementById('lc-filter-excluded')?.checked ? '1' : '';

        const resp = await apiGet('devices', { vendor, status, instance_id: instanceId, include_excluded: includeExcluded });
        if (!resp.success) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:#c0392b;padding:20px;">${escapeHtml(resp.error || 'Hata')}</td></tr>`;
            return;
        }

        const devices = resp.data || [];
        if (!devices.length) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#95a5a6;padding:20px;">Cihaz bulunamadı</td></tr>';
            return;
        }

        window.__lcDevicesCache = {};
        devices.forEach(d => { window.__lcDevicesCache[d.id] = d; });

        const noDate = '<span style="color:#e67e22;font-weight:600;">Tarih Yok</span>';

        // Her kolon için tek bir satır gösterilir (birden fazla eşleşme varsa bile
        // alt alta tekrar eden "Tarih Yok" satırları önlenir): ilgili tarih alanı
        // dolu olan ilk eşleşme kullanılır; hiçbirinde yoksa düzenleme linki verilir.
        function renderDateCol(matches, field, deviceId) {
            if (!matches.length) {
                return `${noDate} <a href="#" class="lc-source-link" onclick="lcQuickAddReference(${deviceId});return false;">referans ekle</a>`;
            }
            const withValue = matches.find(m => m[field]);
            if (withValue) {
                const inner = escapeHtml(withValue[field]);
                return withValue.source_url
                    ? `<a class="lc-source-link" href="${escapeHtml(withValue.source_url)}" target="_blank" rel="noopener" title="${escapeHtml(withValue.product_family)}">${inner}</a>`
                    : `<span title="${escapeHtml(withValue.product_family)}">${inner}</span>`;
            }
            return `${noDate} <a href="#" class="lc-source-link" onclick="lcSwitchTab('eolref');return false;" title="Mevcut referans kaydını EOL Referans sekmesinden düzenleyin">referansı düzenle</a>`;
        }

        tbody.innerHTML = devices.map(dev => {
            const matches = dev.eol_matches || [];
            const eosHtml = renderDateCol(matches, 'eos_date', dev.id);

            const vendorLabel = escapeHtml(dev.effective_vendor || '—') + (dev.vendor_override ? '<span class="lc-manual-tag">manuel</span>' : '');
            const hardwareLabel = escapeHtml(dev.effective_hardware || '—') + (dev.hardware_override ? '<span class="lc-manual-tag">manuel</span>' : '');
            const versionLabel = escapeHtml(dev.effective_version || '—') + (dev.version_override ? '<span class="lc-manual-tag">manuel</span>' : '');

            const nameLabel = dev.display_name && dev.display_name !== dev.hostname
                ? `${escapeHtml(dev.display_name)}<br><span style="font-size:.75rem;color:#95a5a6;">${escapeHtml(dev.hostname)}</span>`
                : escapeHtml(dev.hostname);

            const excludedTag = dev.is_excluded ? '<span class="lc-manual-tag" style="color:#c0392b;">hariç tutuldu</span>' : '';
            const excludeBtn = dev.is_excluded
                ? `<button class="lc-icon-btn" title="Takibe geri al" onclick="lcExcludeDevice(${dev.id}, false)"><i class="fas fa-undo"></i></button>`
                : `<button class="lc-icon-btn" title="Envanterden/taramadan hariç tut" onclick="lcExcludeDevice(${dev.id}, true)"><i class="fas fa-trash"></i></button>`;

            return `<tr data-lc-label="Cihaz: ${escapeHtml(dev.display_name || dev.hostname)}" style="${dev.is_excluded ? 'opacity:.55;' : ''}">
                <td>${escapeHtml(dev.environment || dev.instance_name || '—')}</td>
                <td>${nameLabel} ${excludedTag}</td>
                <td>${escapeHtml(dev.ip || '—')}</td>
                <td>${vendorLabel}</td>
                <td>${hardwareLabel}</td>
                <td>${versionLabel}</td>
                <td>${statusBadge(dev.eol_status)}</td>
                <td>${eosHtml}</td>
                <td>
                    <button class="lc-icon-btn" title="Marka/model düzenle" onclick="lcOpenDeviceModal(${dev.id})"><i class="fas fa-edit"></i></button>
                    ${excludeBtn}
                    ${commentBtn('device', dev.id)}
                </td>
            </tr>`;
        }).join('');

        lcApplyCommentCounts('device', devices.map(d => d.id));
    };

    // ========== Cihaz marka/model manuel düzenleme ==========
    window.lcOpenDeviceModal = function (deviceId) {
        const dev = (window.__lcDevicesCache || {})[deviceId];
        if (!dev) return;
        document.getElementById('lc-dev-id').value = dev.id;
        document.getElementById('lc-dev-hostname').textContent = dev.hostname;
        document.getElementById('lc-dev-raw').textContent = `os: ${dev.os_type || '—'} · hardware: ${dev.hardware || '—'} · versiyon: ${dev.version || '—'} · vendor (LibreNMS): ${dev.vendor || '—'}`;
        document.getElementById('lc-dev-vendor').value = dev.vendor_override || '';
        document.getElementById('lc-dev-hardware').value = dev.hardware_override || '';
        document.getElementById('lc-dev-version').value = dev.version_override || '';
        document.getElementById('lc-dev-notes').value = dev.manual_notes || '';
        document.getElementById('lc-device-modal-overlay').classList.add('active');
    };

    window.lcCloseDeviceModal = function () {
        document.getElementById('lc-device-modal-overlay').classList.remove('active');
    };

    window.lcSaveDeviceOverride = async function () {
        const payload = {
            device_id: document.getElementById('lc-dev-id').value,
            vendor_override: document.getElementById('lc-dev-vendor').value.trim(),
            hardware_override: document.getElementById('lc-dev-hardware').value.trim(),
            version_override: document.getElementById('lc-dev-version').value.trim(),
            manual_notes: document.getElementById('lc-dev-notes').value.trim()
        };
        const resp = await apiPost('device_update', payload);
        if (!resp.success) {
            alert('Kaydedilemedi: ' + (resp.error || 'bilinmeyen hata'));
            return;
        }
        lcCloseDeviceModal();
        lcLoadDevices();
        loadSummary();
    };

    window.lcClearDeviceOverride = async function () {
        if (!confirm('Manuel vendor/model değerlerini temizlemek istediğinize emin misiniz? LibreNMS değerlerine geri dönülecek.')) return;
        const payload = {
            device_id: document.getElementById('lc-dev-id').value,
            vendor_override: '',
            hardware_override: '',
            version_override: '',
            manual_notes: ''
        };
        const resp = await apiPost('device_update', payload);
        if (!resp.success) {
            alert('Temizlenemedi: ' + (resp.error || 'bilinmeyen hata'));
            return;
        }
        lcCloseDeviceModal();
        lcLoadDevices();
        loadSummary();
    };

    window.lcExcludeDevice = async function (deviceId, excluded) {
        const msg = excluded
            ? 'Bu cihazı envanterden/CVE-EOL taramasından hariç tutmak istediğinize emin misiniz? LibreNMS senkronizasyonu devam eder ama Envanter/Bulgular listelerinde ve istatistiklerde görünmez. İstediğiniz zaman "Hariç tutulanları da göster" ile geri alabilirsiniz.'
            : 'Bu cihazı tekrar takibe/taramaya dahil etmek istediğinize emin misiniz?';
        if (!confirm(msg)) return;
        const resp = await apiPost('device_exclude', { device_id: deviceId, excluded });
        if (!resp.success) {
            alert('Güncellenemedi: ' + (resp.error || 'bilinmeyen hata'));
            return;
        }
        lcLoadDevices();
        loadSummary();
    };

    // "Referans yok" cihaz satırından hızlıca EOL Referans formunu ön-dolu açar
    window.lcQuickAddReference = function (deviceId) {
        const dev = (window.__lcDevicesCache || {})[deviceId];
        if (!dev) return;
        lcSwitchTab('eolref');
        lcOpenEolForm();
        document.getElementById('lc-eol-vendor').value = dev.effective_vendor || '';
        document.getElementById('lc-eol-family').value = dev.effective_hardware || '';
        document.getElementById('lc-eol-matchtype').value = 'hardware_model';
        document.getElementById('lc-eol-pattern').value = dev.effective_hardware || '';
    };

    // ========== Genel Yorum Modülü (tüm sekmelerde ortak) ==========
    let __lcCommentsCtx = { entityType: null, entityId: null };

    function commentBtn(entityType, entityId) {
        return `<button class="lc-comment-btn" data-comment-btn="${entityType}-${entityId}" title="Yorumlar" onclick="lcOpenComments('${entityType}', ${entityId}, this)"><i class="fas fa-comment-dots"></i></button>`;
    }

    async function lcApplyCommentCounts(entityType, ids) {
        if (!ids.length) return;
        const resp = await apiGet('comments_counts', { entity_type: entityType, entity_ids: ids.join(',') });
        if (!resp.success) return;
        Object.entries(resp.data || {}).forEach(([id, count]) => {
            const btn = document.querySelector(`[data-comment-btn="${entityType}-${id}"]`);
            if (btn && count > 0) {
                btn.insertAdjacentHTML('beforeend', `<span class="lc-comment-count">${count}</span>`);
            }
        });
    }

    window.lcOpenComments = async function (entityType, entityId, triggerEl) {
        __lcCommentsCtx = { entityType, entityId };
        const label = triggerEl?.closest('tr')?.dataset?.lcLabel || `${entityType} #${entityId}`;
        document.getElementById('lc-comments-title').textContent = label;
        document.getElementById('lc-comments-input').value = '';
        document.getElementById('lc-comments-modal-overlay').classList.add('active');
        await lcRefreshComments();
    };

    window.lcCloseComments = function () {
        document.getElementById('lc-comments-modal-overlay').classList.remove('active');
    };

    async function lcRefreshComments() {
        const listEl = document.getElementById('lc-comments-list');
        listEl.innerHTML = '<div style="color:#95a5a6;font-size:.8rem;padding:8px;">Yükleniyor…</div>';
        const resp = await apiGet('comments_list', { entity_type: __lcCommentsCtx.entityType, entity_id: __lcCommentsCtx.entityId });
        if (!resp.success) {
            listEl.innerHTML = `<div style="color:#c0392b;font-size:.8rem;padding:8px;">${escapeHtml(resp.error || 'Hata')}</div>`;
            return;
        }
        const comments = resp.data || [];
        listEl.innerHTML = comments.length
            ? comments.map(c => `
                <div class="lc-comment-item">
                    <div class="lc-comment-meta">
                        <span>${escapeHtml(c.author || 'Bilinmeyen')} · ${fmtDate(c.created_at)}</span>
                        <span class="lc-comment-delete" onclick="lcDeleteComment(${c.id})" title="Sil"><i class="fas fa-times"></i></span>
                    </div>
                    <div>${escapeHtml(c.comment)}</div>
                </div>`).join('')
            : '<div style="color:#95a5a6;font-size:.8rem;padding:8px;">Henüz yorum yok</div>';
    }

    window.lcSubmitComment = async function () {
        const input = document.getElementById('lc-comments-input');
        const comment = input.value.trim();
        if (!comment) return;
        const resp = await apiPost('comment_add', { entity_type: __lcCommentsCtx.entityType, entity_id: __lcCommentsCtx.entityId, comment });
        if (!resp.success) {
            alert('Gönderilemedi: ' + (resp.error || 'bilinmeyen hata'));
            return;
        }
        input.value = '';
        await lcRefreshComments();
        // Liste yeniden yüklendiğinde yorum sayısı rozetleri güncellensin
        if (document.getElementById('lc-tab-envanter').classList.contains('active')) lcLoadDevices();
        if (document.getElementById('lc-tab-bulgular').classList.contains('active')) {
            if (document.getElementById('lc-bulgu-findings-view').style.display !== 'none') lcLoadFindings();
            else lcLoadBulguDevices();
        }
        if (document.getElementById('lc-tab-eolref').classList.contains('active')) lcLoadEolReference();
        if (document.getElementById('lc-tab-runs').classList.contains('active')) lcLoadRuns();
    };

    window.lcDeleteComment = async function (id) {
        if (!confirm('Bu yorumu silmek istediğinize emin misiniz?')) return;
        const resp = await apiPost('comment_delete', { id });
        if (!resp.success) {
            alert('Silinemedi: ' + (resp.error || 'bilinmeyen hata'));
            return;
        }
        await lcRefreshComments();
    };

    // ========== Bulgular (CVE) ==========
    const ACK_LABELS = { active: 'Aktif', resolved: 'Çözüldü', fp: 'Yanlış Pozitif', accepted: 'Kabul Edildi' };

    window.lcLoadFindings = async function () {
        const tbody = document.getElementById('lc-findings-tbody');
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#95a5a6;padding:20px;">Yükleniyor…</td></tr>';

        const ackState = document.getElementById('lc-vuln-filter-ack')?.value || '';
        const severity = document.getElementById('lc-vuln-filter-severity')?.value || '';
        const kevOnly = document.getElementById('lc-vuln-filter-kev')?.checked ? '1' : '';
        const minPublished = document.getElementById('lc-vuln-filter-minpublished')?.value || '';
        const includeNotAffected = document.getElementById('lc-vuln-filter-notaffected')?.checked ? '1' : '';

        const chip = document.getElementById('lc-findings-device-chip');
        if (chip) {
            if (__lcFindingsDeviceFilter) {
                chip.style.display = 'inline-flex';
                chip.querySelector('span').textContent = `Cihaz: ${__lcFindingsDeviceFilter.label}`;
            } else {
                chip.style.display = 'none';
            }
        }

        const params = { ack_state: ackState, severity, kev_only: kevOnly, min_published: minPublished, include_not_affected: includeNotAffected };
        if (__lcFindingsDeviceFilter) params.device_id = __lcFindingsDeviceFilter.id;

        const resp = await apiGet('findings', params);
        if (!resp.success) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:#c0392b;padding:20px;">${escapeHtml(resp.error || 'Hata')}</td></tr>`;
            return;
        }

        const rows = resp.data || [];
        if (!rows.length) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#95a5a6;padding:20px;">Bulgu yok</td></tr>';
            return;
        }

        // Aynı CVE birden fazla cihazı etkiliyorsa (paylaşılan firmware) tek tek
        // tekrar etmek yerine gruplayıp "N cihaz" rozeti + genişletilebilir liste gösterir.
        const groups = new Map();
        rows.forEach(f => {
            if (!groups.has(f.cve_id)) {
                groups.set(f.cve_id, { ...f, devices: [] });
            }
            groups.get(f.cve_id).devices.push(f);
        });

        const groupList = Array.from(groups.values()).sort((a, b) => {
            const kevDiff = (b.is_kev ? 1 : 0) - (a.is_kev ? 1 : 0);
            if (kevDiff) return kevDiff;
            return (b.cvss_score ?? 0) - (a.cvss_score ?? 0);
        });

        tbody.innerHTML = groupList.map((g, idx) => {
            const sevCls = escapeHtml(g.severity || 'unknown');
            const groupId = 'lc-grp-' + idx;
            const ackStates = new Set(g.devices.map(d => d.ack_state));
            const statusHtml = ackStates.size === 1
                ? `<span class="lc-badge ${escapeHtml(g.ack_state)}">${escapeHtml(ACK_LABELS[g.ack_state] || g.ack_state)}</span>`
                : `<span class="lc-badge" style="background:#eaeded;color:#7f8c8d;" title="${Array.from(ackStates).map(s => ACK_LABELS[s] || s).join(', ')}">Karışık</span>`;

            const confidenceBadge = g.match_confidence === 'low'
                ? ' <span class="lc-badge no_data" title="Bu eşleşme advisory açıklamasında yan cümlede geçen bir ürün adına dayanıyor, başlıkta doğrulanmadı — elle kontrol edin">Doğrulanmalı</span>'
                : '';
            const summaryRow = `<tr style="cursor:pointer;" onclick="lcToggleFindingGroup('${groupId}')">
                <td style="width:22px;"><i class="fas fa-chevron-right" id="${groupId}-chevron"></i></td>
                <td><a class="lc-source-link" href="${escapeHtml(g.nvd_url)}" target="_blank" rel="noopener" onclick="event.stopPropagation();">${escapeHtml(g.cve_id)}</a>${confidenceBadge}</td>
                <td><span class="lc-badge ${sevCls}">${sevCls !== 'unknown' ? sevCls : 'bilinmiyor'}</span></td>
                <td>${g.cvss_score ?? '—'}</td>
                <td>${g.is_kev ? '<span class="lc-kev-tag">AKTİF İSTİSMAR</span>' : '—'}</td>
                <td><span class="lc-manual-tag" style="background:#eef2ff;color:#3730a3;padding:2px 8px;border-radius:9px;">${g.devices.length} cihaz</span></td>
                <td>${g.published_date || '—'}</td>
                <td>${statusHtml}</td>
            </tr>`;

            const VERSION_MATCH_LABELS = {
                affected: '<span class="lc-badge eol" title="Cihaz versiyonu etkilenen aralıkta">Etkileniyor</span>',
                not_affected: '<span class="lc-badge ok" title="Cihaz versiyonu CVE\'nin bildirdiği etkilenen aralığın dışında">Etkilenmiyor</span>',
                unknown: '<span class="lc-badge no_data" title="Versiyon aralığı verisi yok veya cihaz versiyonu ayrıştırılamadı — elle kontrol edin">Bilinmiyor</span>'
            };
            const detailRows = g.devices.map(d => {
                const devName = d.display_name && d.display_name !== d.hostname
                    ? `${escapeHtml(d.display_name)} <span style="color:#bbb;">(${escapeHtml(d.hostname)})</span>`
                    : escapeHtml(d.hostname);
                const versionMatchHtml = VERSION_MATCH_LABELS[d.version_match] || VERSION_MATCH_LABELS.unknown;
                return `
                <tr style="background:#fafbfc;" data-lc-label="${escapeHtml(g.cve_id)} — ${escapeHtml(d.display_name || d.hostname)}">
                    <td></td>
                    <td colspan="2" style="font-size:.82rem;">${devName} <span style="color:#95a5a6;">(${escapeHtml(d.ip || '—')})</span> ${versionMatchHtml}</td>
                    <td colspan="2" style="font-size:.8rem;color:#7f8c8d;">${escapeHtml(d.vendor || '')} ${escapeHtml(d.hardware || '')} (v${escapeHtml(d.version || '?')}) · ${escapeHtml(d.environment || '')}</td>
                    <td><span class="lc-badge ${escapeHtml(d.ack_state)}">${escapeHtml(ACK_LABELS[d.ack_state] || d.ack_state)}</span></td>
                    <td>
                        <select onchange="lcAckFinding(${d.id}, this.value, '${escapeHtml(g.match_confidence || 'high')}')" style="font-size:.76rem;padding:3px 6px;">
                            <option value="">İşlem…</option>
                            <option value="resolved">✓ Çözüldü olarak işaretle</option>
                            <option value="fp">✗ Yanlış pozitif</option>
                            <option value="accepted">⚠ Riski kabul et</option>
                            <option value="active">↺ Aktif yap</option>
                        </select>
                    </td>
                    <td>${commentBtn('finding', d.id)}</td>
                </tr>`;
            }).join('');

            return summaryRow + `<tr id="${groupId}-detail" style="display:none;"><td colspan="8" style="padding:0;"><table style="width:100%;border-collapse:collapse;">${detailRows}</table></td></tr>`;
        }).join('');

        lcApplyCommentCounts('finding', rows.map(f => f.id));
    };

    window.lcToggleFindingGroup = function (groupId) {
        const detail = document.getElementById(groupId + '-detail');
        const chevron = document.getElementById(groupId + '-chevron');
        if (!detail) return;
        const isOpen = detail.style.display !== 'none';
        detail.style.display = isOpen ? 'none' : 'table-row';
        if (chevron) chevron.classList.toggle('fa-chevron-right', isOpen);
        if (chevron) chevron.classList.toggle('fa-chevron-down', !isOpen);
    };

    window.lcAckFinding = async function (id, ackState, matchConfidence) {
        if (!ackState) return;
        let note = '';
        let excludePermanently = false;
        if (ackState === 'fp' || ackState === 'accepted') {
            note = prompt('Not eklemek ister misiniz? (opsiyonel)') || '';
        }
        if (ackState === 'fp' && matchConfidence === 'low') {
            excludePermanently = confirm(
                'Bu bulgu "doğrulanmalı" (düşük güvenli) bir eşleşmeydi.\n\n' +
                'Bu advisory\'yi bu cihaz grubu (aynı vendor+ürün) için kalıcı olarak ' +
                'hariç tutmak ister misiniz? Böylece gelecekteki taramalarda tekrar ' +
                'yanlış pozitif olarak görünmez.'
            );
        }
        const resp = await apiPost('finding_ack', { id, ack_state: ackState, ack_note: note, exclude_permanently: excludePermanently });
        if (!resp.success) {
            alert('Güncellenemedi: ' + (resp.error || 'bilinmeyen hata'));
            return;
        }
        lcLoadFindings();
        loadSummary();
    };

    // ========== EOL Referans CRUD ==========
    window.lcLoadEolReference = async function () {
        const tbody = document.getElementById('lc-eol-tbody');
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#95a5a6;padding:20px;">Yükleniyor…</td></tr>';

        const resp = await apiGet('eol_list');
        if (!resp.success) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:#c0392b;padding:20px;">${escapeHtml(resp.error || 'Hata')}</td></tr>`;
            return;
        }

        const rows = resp.data || [];
        if (!rows.length) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#95a5a6;padding:20px;">Kayıt yok</td></tr>';
            return;
        }

        tbody.innerHTML = rows.map(r => `
            <tr data-lc-label="${escapeHtml(r.vendor)} — ${escapeHtml(r.product_family)}">
                <td>${escapeHtml(r.vendor)}</td>
                <td>${escapeHtml(r.product_family)}</td>
                <td>${r.match_type === 'hardware_model' ? 'Donanım' : 'Yazılım'}</td>
                <td><code>${escapeHtml(r.match_pattern)}</code></td>
                <td>${r.eol_date || '—'}</td>
                <td>${r.eos_date || '—'}</td>
                <td>${r.source_url ? `<a class="lc-source-link" href="${escapeHtml(r.source_url)}" target="_blank" rel="noopener">link</a>` : '—'}</td>
                <td>${r.last_verified_at || '—'}</td>
                <td>
                    <button onclick='lcEditEol(${JSON.stringify(r).replace(/'/g, "&#39;")})' title="Düzenle"><i class="fas fa-edit"></i></button>
                    <button onclick="lcDeleteEol(${r.id})" title="Sil"><i class="fas fa-trash"></i></button>
                    ${commentBtn('eol_reference', r.id)}
                </td>
            </tr>
        `).join('');

        lcApplyCommentCounts('eol_reference', rows.map(r => r.id));
    };

    window.lcOpenEolForm = function () {
        document.getElementById('lc-eol-form').style.display = 'block';
    };

    window.lcCloseEolForm = function () {
        document.getElementById('lc-eol-form').style.display = 'none';
        ['id', 'vendor', 'family', 'pattern', 'eoldate', 'eosdate', 'verified', 'url', 'notes'].forEach(f => {
            const el = document.getElementById('lc-eol-' + f);
            if (el) el.value = '';
        });
    };

    window.lcEditEol = function (row) {
        lcOpenEolForm();
        document.getElementById('lc-eol-id').value = row.id;
        document.getElementById('lc-eol-vendor').value = row.vendor || '';
        document.getElementById('lc-eol-family').value = row.product_family || '';
        document.getElementById('lc-eol-matchtype').value = row.match_type || 'hardware_model';
        document.getElementById('lc-eol-pattern').value = row.match_pattern || '';
        document.getElementById('lc-eol-eoldate').value = row.eol_date || '';
        document.getElementById('lc-eol-eosdate').value = row.eos_date || '';
        document.getElementById('lc-eol-verified').value = row.last_verified_at || '';
        document.getElementById('lc-eol-url').value = row.source_url || '';
        document.getElementById('lc-eol-notes').value = row.notes || '';
    };

    window.lcSaveEol = async function () {
        const payload = {
            id: document.getElementById('lc-eol-id').value || null,
            vendor: document.getElementById('lc-eol-vendor').value.trim(),
            product_family: document.getElementById('lc-eol-family').value.trim(),
            match_type: document.getElementById('lc-eol-matchtype').value,
            match_pattern: document.getElementById('lc-eol-pattern').value.trim(),
            eol_date: document.getElementById('lc-eol-eoldate').value || null,
            eos_date: document.getElementById('lc-eol-eosdate').value || null,
            last_verified_at: document.getElementById('lc-eol-verified').value || null,
            source_url: document.getElementById('lc-eol-url').value.trim(),
            notes: document.getElementById('lc-eol-notes').value.trim()
        };
        const resp = await apiPost('eol_upsert', payload);
        if (!resp.success) {
            alert('Kaydedilemedi: ' + (resp.error || 'bilinmeyen hata'));
            return;
        }
        lcCloseEolForm();
        lcLoadEolReference();
        loadSummary();
    };

    window.lcDeleteEol = async function (id) {
        if (!confirm('Bu EOL referans kaydını silmek istediğinize emin misiniz?')) return;
        const resp = await apiPost('eol_delete', { id });
        if (!resp.success) {
            alert('Silinemedi: ' + (resp.error || 'bilinmeyen hata'));
            return;
        }
        lcLoadEolReference();
        loadSummary();
    };

    // ========== Tarama Geçmişi ==========
    window.lcLoadRuns = async function () {
        const tbody = document.getElementById('lc-runs-tbody');
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#95a5a6;padding:20px;">Yükleniyor…</td></tr>';

        const resp = await apiGet('runs');
        if (!resp.success) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:#c0392b;padding:20px;">${escapeHtml(resp.error || 'Hata')}</td></tr>`;
            return;
        }

        const rows = resp.data || [];
        if (!rows.length) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#95a5a6;padding:20px;">Henüz çalıştırma yok</td></tr>';
            return;
        }

        const RUN_TYPE_LABELS = { full: 'Tam (EOL+CVE)', eol: 'EOL/EOS', cve: 'CVE' };

        tbody.innerHTML = rows.map(r => {
            const hasError = (r.errors ?? 0) > 0;
            const notRunning = !!r.finished_at;
            let statusHtml;
            if (!notRunning) {
                statusHtml = '<span class="lc-badge" style="background:#d6eaf8;color:#21618c;"><i class="fas fa-spinner fa-spin"></i> Çalışıyor</span>';
            } else if (hasError) {
                statusHtml = `<span class="lc-badge eol" title="${escapeHtml(r.notes || '')}"><i class="fas fa-exclamation-triangle"></i> ${r.errors} hata</span>`;
            } else {
                statusHtml = '<span class="lc-badge ok">✓ Başarılı</span>';
            }
            const noteHtml = hasError && r.notes
                ? `<div style="font-size:.72rem;color:#c0392b;margin-top:3px;max-width:280px;white-space:normal;">${escapeHtml(r.notes)}</div>`
                : '';

            return `<tr data-lc-label="Tarama #${r.id} — ${fmtDate(r.started_at)}" style="${hasError ? 'background:#fef5f4;' : ''}">
                <td>${fmtDate(r.started_at)}</td>
                <td>${fmtDate(r.finished_at)}</td>
                <td>${escapeHtml(RUN_TYPE_LABELS[r.run_type] || r.run_type || '—')}</td>
                <td>${r.devices_synced ?? '—'}</td>
                <td>${r.devices_total ?? '—'}</td>
                <td>${statusHtml}${noteHtml}</td>
                <td>${escapeHtml(r.triggered_by)}</td>
                <td>${commentBtn('run', r.id)}</td>
            </tr>`;
        }).join('');

        lcApplyCommentCounts('run', rows.map(r => r.id));
    };

    // ========== Senkronize Et ==========
    window.lcSyncNow = async function () {
        if (!confirm("LibreNMS Test/Prod ortamlarından cihaz envanterini senkronize edip CVE taraması yapmak istiyor musunuz? Bu işlem NVD sorguları nedeniyle ~1 dakika sürebilir.")) return;
        const resp = await apiPost('sync_now', {});
        if (!resp.success) {
            alert('Senkronizasyon başarısız: ' + (resp.error || 'bilinmeyen hata'));
            return;
        }
        alert(`Senkronizasyon tamamlandı: ${resp.result.synced}/${resp.result.total} cihaz, ${resp.result.findings_new ?? 0} yeni CVE bulgusu, ${resp.result.findings_resolved ?? 0} bulgu güncel taramada tespit edilmediği için otomatik çözüldü`);
        loadLifecycleAll();
    };

    // ========== Ayarlar ==========
    window.lcLoadSettings = async function () {
        const resp = await apiGet('settings_get');
        if (!resp.success) return;
        const s = resp.data;
        document.getElementById('lc-set-email').value = s.alert_email || '';
        document.getElementById('lc-set-mail-enabled').checked = !!s.mail_enabled;
        document.getElementById('lc-set-mail-hour').value = s.mail_hour ?? 8;
        document.getElementById('lc-set-eol-enabled').checked = !!s.eol_enabled;
        document.getElementById('lc-set-eol-day').value = s.eol_day_of_month ?? 1;
        document.getElementById('lc-set-eol-hour').value = s.eol_hour ?? 3;
        document.getElementById('lc-set-cve-enabled').checked = !!s.cve_enabled;
        document.getElementById('lc-set-cve-hour').value = s.cve_hour ?? 4;
    };

    window.lcSaveSettings = async function () {
        const payload = {
            alert_email: document.getElementById('lc-set-email').value.trim(),
            mail_enabled: document.getElementById('lc-set-mail-enabled').checked,
            mail_hour: document.getElementById('lc-set-mail-hour').value,
            eol_enabled: document.getElementById('lc-set-eol-enabled').checked,
            eol_day_of_month: document.getElementById('lc-set-eol-day').value,
            eol_hour: document.getElementById('lc-set-eol-hour').value,
            cve_enabled: document.getElementById('lc-set-cve-enabled').checked,
            cve_hour: document.getElementById('lc-set-cve-hour').value
        };
        const resp = await apiPost('settings_save', payload);
        if (!resp.success) {
            alert('Kaydedilemedi: ' + (resp.error || 'bilinmeyen hata'));
            return;
        }
        const msg = document.getElementById('lc-settings-saved-msg');
        msg.style.display = 'inline';
        setTimeout(() => { msg.style.display = 'none'; }, 3000);
    };

    // ========== Vendor/OS -> CVE Anahtar Kelime CRUD ==========
    window.lcLoadKeywords = async function () {
        const tbody = document.getElementById('lc-keyword-tbody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#95a5a6;padding:20px;">Yükleniyor…</td></tr>';

        const resp = await apiGet('keyword_list');
        if (!resp.success) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#c0392b;padding:20px;">${escapeHtml(resp.error || 'Hata')}</td></tr>`;
            return;
        }

        const rows = resp.data || [];
        if (!rows.length) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#95a5a6;padding:20px;">Kayıt yok</td></tr>';
            return;
        }

        tbody.innerHTML = rows.map(r => `
            <tr>
                <td>${escapeHtml(r.vendor)}</td>
                <td><code>${escapeHtml(r.os_type)}</code></td>
                <td>${escapeHtml(r.keyword)}</td>
                <td>${r.is_active ? '<span class="lc-badge ok">Etkin</span>' : '<span class="lc-badge no_data">Pasif</span>'}</td>
                <td style="font-size:.78rem;color:#95a5a6;">${escapeHtml(r.notes || '—')}</td>
                <td>
                    <button onclick='lcEditKeyword(${JSON.stringify(r).replace(/'/g, "&#39;")})' title="Düzenle"><i class="fas fa-edit"></i></button>
                    <button onclick="lcDeleteKeyword(${r.id})" title="Sil"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    };

    window.lcOpenKeywordForm = function () {
        document.getElementById('lc-keyword-form').style.display = 'block';
    };

    window.lcCloseKeywordForm = function () {
        document.getElementById('lc-keyword-form').style.display = 'none';
        ['id', 'vendor', 'ostype', 'keyword', 'notes'].forEach(f => {
            const el = document.getElementById('lc-kw-' + f);
            if (el) el.value = '';
        });
        document.getElementById('lc-kw-active').checked = true;
    };

    window.lcEditKeyword = function (row) {
        lcOpenKeywordForm();
        document.getElementById('lc-kw-id').value = row.id;
        document.getElementById('lc-kw-vendor').value = row.vendor || '';
        document.getElementById('lc-kw-ostype').value = row.os_type || '';
        document.getElementById('lc-kw-keyword').value = row.keyword || '';
        document.getElementById('lc-kw-notes').value = row.notes || '';
        document.getElementById('lc-kw-active').checked = !!row.is_active;
    };

    window.lcSaveKeyword = async function () {
        const payload = {
            id: document.getElementById('lc-kw-id').value || null,
            vendor: document.getElementById('lc-kw-vendor').value.trim(),
            os_type: document.getElementById('lc-kw-ostype').value.trim(),
            keyword: document.getElementById('lc-kw-keyword').value.trim(),
            is_active: document.getElementById('lc-kw-active').checked,
            notes: document.getElementById('lc-kw-notes').value.trim()
        };
        const resp = await apiPost('keyword_upsert', payload);
        if (!resp.success) {
            alert('Kaydedilemedi: ' + (resp.error || 'bilinmeyen hata'));
            return;
        }
        lcCloseKeywordForm();
        lcLoadKeywords();
    };

    window.lcDeleteKeyword = async function (id) {
        if (!confirm('Bu vendor/os eşleme kaydını silmek istediğinize emin misiniz? Bu kombinasyon bir sonraki taramadan itibaren atlanacak.')) return;
        const resp = await apiPost('keyword_delete', { id });
        if (!resp.success) {
            alert('Silinemedi: ' + (resp.error || 'bilinmeyen hata'));
            return;
        }
        lcLoadKeywords();
    };

    // ========== Zafiyet Kaynakları (URL) CRUD ==========
    window.lcLoadSources = async function () {
        const tbody = document.getElementById('lc-source-tbody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#95a5a6;padding:20px;">Yükleniyor…</td></tr>';

        const resp = await apiGet('source_list');
        if (!resp.success) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#c0392b;padding:20px;">${escapeHtml(resp.error || 'Hata')}</td></tr>`;
            return;
        }

        const rows = resp.data || [];
        if (!rows.length) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#95a5a6;padding:20px;">Kayıt yok</td></tr>';
            return;
        }

        tbody.innerHTML = rows.map(r => `
            <tr>
                <td>${escapeHtml(r.name)}<br><span style="font-size:.7rem;color:#95a5a6;"><code>${escapeHtml(r.source_key)}</code></span></td>
                <td>${escapeHtml(r.vendor || 'Genel')}</td>
                <td style="font-size:.76rem;max-width:280px;word-break:break-all;"><a class="lc-source-link" href="${escapeHtml(r.url)}" target="_blank" rel="noopener">${escapeHtml(r.url)}</a></td>
                <td>${r.is_active ? '<span class="lc-badge ok">Etkin</span>' : '<span class="lc-badge no_data">Pasif</span>'}</td>
                <td>
                    <button onclick='lcEditSource(${JSON.stringify(r).replace(/'/g, "&#39;")})' title="Düzenle"><i class="fas fa-edit"></i></button>
                    <button onclick="lcDeleteSource(${r.id})" title="Sil"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    };

    window.lcOpenSourceForm = function () {
        document.getElementById('lc-source-form').style.display = 'block';
    };

    window.lcCloseSourceForm = function () {
        document.getElementById('lc-source-form').style.display = 'none';
        ['id', 'key', 'name', 'vendor', 'url', 'notes'].forEach(f => {
            const el = document.getElementById('lc-src-' + f);
            if (el) el.value = '';
        });
        document.getElementById('lc-src-active').checked = true;
    };

    window.lcEditSource = function (row) {
        lcOpenSourceForm();
        document.getElementById('lc-src-id').value = row.id;
        document.getElementById('lc-src-key').value = row.source_key || '';
        document.getElementById('lc-src-name').value = row.name || '';
        document.getElementById('lc-src-vendor').value = row.vendor || '';
        document.getElementById('lc-src-url').value = row.url || '';
        document.getElementById('lc-src-notes').value = row.notes || '';
        document.getElementById('lc-src-active').checked = !!row.is_active;
    };

    window.lcSaveSource = async function () {
        const payload = {
            id: document.getElementById('lc-src-id').value || null,
            source_key: document.getElementById('lc-src-key').value.trim(),
            name: document.getElementById('lc-src-name').value.trim(),
            vendor: document.getElementById('lc-src-vendor').value.trim(),
            url: document.getElementById('lc-src-url').value.trim(),
            is_active: document.getElementById('lc-src-active').checked,
            notes: document.getElementById('lc-src-notes').value.trim()
        };
        const resp = await apiPost('source_upsert', payload);
        if (!resp.success) {
            alert('Kaydedilemedi: ' + (resp.error || 'bilinmeyen hata'));
            return;
        }
        lcCloseSourceForm();
        lcLoadSources();
    };

    window.lcDeleteSource = async function (id) {
        if (!confirm('Bu kaynağı silmek istediğinize emin misiniz? Sistem kaynaklarından biriyse (nvd/cisa_kev/fortinet_psirt/paloalto_advisory) silinince o kaynak varsayılan URL ile ve etkin olarak kullanılmaya devam eder.')) return;
        const resp = await apiPost('source_delete', { id });
        if (!resp.success) {
            alert('Silinemedi: ' + (resp.error || 'bilinmeyen hata'));
            return;
        }
        lcLoadSources();
    };

    window.lcSendPendingMailNow = async function () {
        if (!confirm('Bekleyen tüm kritik/KEV bulguları şimdi mail ile göndermek istiyor musunuz?')) return;
        const resp = await apiPost('mail_now', {});
        if (!resp.success) {
            alert('Gönderilemedi: ' + (resp.error || 'bilinmeyen hata'));
            return;
        }
        alert(resp.sent > 0 ? `${resp.sent} bulgu için mail gönderildi.` : 'Gönderilecek bekleyen kritik/KEV bulgu yok.');
    };

    // ========== Giriş noktası ==========
    window.loadLifecycleAll = function () {
        loadSummary();
        loadInstances();
        lcLoadDevices();
    };
})();
