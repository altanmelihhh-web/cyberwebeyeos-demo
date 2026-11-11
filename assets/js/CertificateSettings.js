// =====================================================================
// CertificateSettings.js
// Sertifika sayfasındaki "Ayarlar" sekmesi ve sertifika dropdown'larının
// dinamik veri kaynağı. cert-settings.json içeriğini get/save eder.
// =====================================================================

(function () {
    // Modul state
    let currentSettings = null;
    const RESPONSIBLE_DROPDOWN_IDS = ['certificate-responsible', 'renewal-responsible'];

    // ---- Helpers ----
    function escapeHTML(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
    function setStatus(msg, type = 'info') {
        const el = document.getElementById('cert-settings-status');
        if (!el) return;
        const colors = { info: '#6b7280', success: '#059669', error: '#dc2626' };
        el.textContent = msg || '';
        el.style.color = colors[type] || colors.info;
        if (msg && type === 'success') {
            setTimeout(() => { if (el.textContent === msg) el.textContent = ''; }, 4000);
        }
    }

    // ---- Dropdown senkronizasyonu ----
    // Sayfadaki sertifika sorumlu seçim kutularını cert-settings.json'a göre doldurur.
    function populateResponsibleDropdowns(list) {
        RESPONSIBLE_DROPDOWN_IDS.forEach(id => {
            const sel = document.getElementById(id);
            if (!sel) return;
            const current = sel.value;
            // İlk option (placeholder) korunur
            sel.innerHTML = '<option value="">Sorumlu Seçin</option>' +
                list.map(p => `<option value="${escapeHTML(p)}">${escapeHTML(p)}</option>`).join('');
            // Önceki seçim hâlâ listede ise geri yükle
            if (current && list.includes(current)) sel.value = current;
        });
    }

    // ---- Ayarları sunucudan yükle ----
    function loadSettings() {
        return fetch('get-cert-settings.php', { credentials: 'same-origin' })
            .then(r => r.json())
            .then(data => {
                if (!data.success) throw new Error(data.error || 'bilinmeyen hata');
                currentSettings = data.settings || {};
                populateResponsibleDropdowns(currentSettings.responsibles || []);
                renderSettingsTab();
                return currentSettings;
            })
            .catch(err => {
                console.error('Cert settings yüklenemedi:', err);
                setStatus('Ayarlar yüklenemedi: ' + err.message, 'error');
            });
    }

    // ---- Ayarlar sekmesi UI ----
    function renderSettingsTab() {
        if (!currentSettings) return;

        // Sorumlu listesi
        const ul = document.getElementById('cert-responsibles-list');
        if (ul) {
            const list = currentSettings.responsibles || [];
            if (list.length === 0) {
                ul.innerHTML = '<li style="padding: 12px; color:#888; text-align:center;">Henüz sorumlu eklenmemiş.</li>';
            } else {
                ul.innerHTML = list.map((name, idx) => `
                    <li style="display:flex; align-items:center; justify-content:space-between; padding:10px 14px; border:1px solid #e0e0e0; border-radius:6px; margin-bottom:6px; background:#fafbfc;">
                        <span style="font-weight:500; color:#2c3e50;">
                            <i class="fas fa-user" style="color:#94a3b8; margin-right:8px;"></i>${escapeHTML(name)}
                        </span>
                        <button type="button" class="action-btn delete-btn" data-resp-idx="${idx}" title="Çıkar">
                            <i class="fas fa-times"></i>
                        </button>
                    </li>
                `).join('');
                ul.querySelectorAll('[data-resp-idx]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const i = parseInt(btn.getAttribute('data-resp-idx'), 10);
                        currentSettings.responsibles.splice(i, 1);
                        renderSettingsTab();
                    });
                });
            }
        }

        // Bildirim ayarları
        const enabledCb = document.getElementById('cert-notif-enabled');
        const emails    = document.getElementById('cert-notif-emails');
        const notif = currentSettings.notifications || {};
        if (enabledCb) enabledCb.checked = !!notif.enabled;
        if (emails)    emails.value      = notif.email_recipients || '';

        // Mail şablonu
        const tpl = currentSettings.mail_template || {};
        const tplSubj   = document.getElementById('cert-tpl-subject');
        const tplIntro  = document.getElementById('cert-tpl-intro');
        const tplFooter = document.getElementById('cert-tpl-footer');
        if (tplSubj)   tplSubj.value   = tpl.subject     || '';
        if (tplIntro)  tplIntro.value  = tpl.intro_html  || '';
        if (tplFooter) tplFooter.value = tpl.footer_html || '';

        // Eşikler tablosu
        const tbody = document.getElementById('cert-thresholds-tbody');
        if (tbody) {
            const ths = (notif.thresholds || []);
            if (ths.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:14px; color:#888;">Henüz eşik tanımlı değil.</td></tr>';
            } else {
                tbody.innerHTML = ths.map((t, idx) => {
                    const channels = Array.isArray(t.channels) ? t.channels : [];
                    const dash = channels.includes('dashboard');
                    const mail = channels.includes('email');
                    const typeColors = {
                        info:     { bg: '#dbeafe', color: '#1e40af' },
                        warning:  { bg: '#fef3c7', color: '#92400e' },
                        critical: { bg: '#fee2e2', color: '#991b1b' },
                        urgent:   { bg: '#fecaca', color: '#7f1d1d' },
                    };
                    return `
                        <tr data-th-idx="${idx}">
                            <td><input type="number" class="form-control th-days" value="${t.days}" min="1" max="3650" style="width: 80px;"></td>
                            <td>
                                <select class="form-select th-type">
                                    <option value="info"${t.type==='info'?' selected':''}>info</option>
                                    <option value="warning"${t.type==='warning'?' selected':''}>warning</option>
                                    <option value="critical"${t.type==='critical'?' selected':''}>critical</option>
                                    <option value="urgent"${t.type==='urgent'?' selected':''}>urgent</option>
                                </select>
                            </td>
                            <td><input type="text" class="form-control th-label" value="${escapeHTML(t.label || '')}" maxlength="80"></td>
                            <td>
                                <label style="font-size:12px; margin-right:8px;"><input type="checkbox" class="th-ch-dash" ${dash?'checked':''}> dashboard</label><br>
                                <label style="font-size:12px;"><input type="checkbox" class="th-ch-mail" ${mail?'checked':''}> email</label>
                            </td>
                            <td>
                                <button type="button" class="action-btn delete-btn" data-th-del="${idx}" title="Sil"><i class="fas fa-times"></i></button>
                            </td>
                        </tr>`;
                }).join('');
                tbody.querySelectorAll('[data-th-del]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const i = parseInt(btn.getAttribute('data-th-del'), 10);
                        currentSettings.notifications.thresholds.splice(i, 1);
                        renderSettingsTab();
                    });
                });
            }
        }

        // Meta
        const meta = document.getElementById('cert-settings-meta');
        if (meta) meta.textContent = (currentSettings.updated_at || '-') + ' · ' + (currentSettings.updated_by || '-');
    }

    // ---- Eylem: eşiklerin DOM'undan geri toplanması ----
    function collectThresholdsFromDOM() {
        const rows = document.querySelectorAll('#cert-thresholds-tbody tr[data-th-idx]');
        const out = [];
        rows.forEach(tr => {
            const days  = parseInt(tr.querySelector('.th-days').value, 10);
            const type  = tr.querySelector('.th-type').value;
            const label = tr.querySelector('.th-label').value.trim();
            const chs = [];
            if (tr.querySelector('.th-ch-dash').checked) chs.push('dashboard');
            if (tr.querySelector('.th-ch-mail').checked) chs.push('email');
            if (days > 0) out.push({ days, type, label, channels: chs });
        });
        return out;
    }

    // ---- Şablonu DOM'dan topla ----
    function collectTemplateFromDOM() {
        const sub = document.getElementById('cert-tpl-subject');
        const ino = document.getElementById('cert-tpl-intro');
        const ftr = document.getElementById('cert-tpl-footer');
        return {
            subject:     sub ? sub.value : '',
            intro_html:  ino ? ino.value : '',
            footer_html: ftr ? ftr.value : '',
        };
    }

    // ---- Kaydet ----
    function saveSettings() {
        if (!currentSettings) return;
        const enabledCb = document.getElementById('cert-notif-enabled');
        const emails    = document.getElementById('cert-notif-emails');
        const payload = {
            responsibles: currentSettings.responsibles || [],
            notifications: {
                enabled: enabledCb ? enabledCb.checked : false,
                email_recipients: emails ? emails.value.trim() : '',
                thresholds: collectThresholdsFromDOM(),
            },
            mail_template: collectTemplateFromDOM(),
        };
        setStatus('Kaydediliyor...', 'info');
        fetch('save-cert-settings.php', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })
        .then(r => r.json())
        .then(data => {
            if (!data.success) throw new Error(data.error || 'kayıt başarısız');
            currentSettings = data.settings;
            populateResponsibleDropdowns(currentSettings.responsibles || []);
            renderSettingsTab();
            setStatus('Ayarlar kaydedildi.', 'success');
        })
        .catch(err => {
            console.error('Cert settings kayıt hatası:', err);
            setStatus('Kayıt başarısız: ' + err.message, 'error');
        });
    }

    // ---- Event'ler ----
    document.addEventListener('DOMContentLoaded', function () {
        loadSettings();

        const addRespBtn = document.getElementById('cert-add-responsible-btn');
        const addRespInp = document.getElementById('cert-new-responsible-input');
        if (addRespBtn && addRespInp) {
            const addNew = () => {
                const v = addRespInp.value.trim();
                if (!v) return;
                if (!currentSettings) return;
                if (!currentSettings.responsibles) currentSettings.responsibles = [];
                if (currentSettings.responsibles.includes(v)) {
                    setStatus('Bu kişi zaten listede.', 'error');
                    return;
                }
                currentSettings.responsibles.push(v);
                addRespInp.value = '';
                renderSettingsTab();
                setStatus('Eklendi (kaydetmeyi unutmayın).', 'info');
            };
            addRespBtn.addEventListener('click', addNew);
            addRespInp.addEventListener('keypress', e => { if (e.key === 'Enter') { e.preventDefault(); addNew(); } });
        }

        const addThBtn = document.getElementById('cert-add-threshold-btn');
        if (addThBtn) {
            addThBtn.addEventListener('click', () => {
                if (!currentSettings) return;
                if (!currentSettings.notifications) currentSettings.notifications = { enabled: true, email_recipients: '', thresholds: [] };
                if (!currentSettings.notifications.thresholds) currentSettings.notifications.thresholds = [];
                // Toplama: önce DOM'daki düzenlemeleri kaybetmeden currentSettings'e yaz
                currentSettings.notifications.thresholds = collectThresholdsFromDOM();
                currentSettings.notifications.thresholds.push({ days: 30, type: 'warning', label: '30 gün — Uyarı', channels: ['dashboard'] });
                renderSettingsTab();
            });
        }

        const saveBtn = document.getElementById('cert-settings-save-btn');
        if (saveBtn) saveBtn.addEventListener('click', saveSettings);

        const testBtn = document.getElementById('cert-test-mail-btn');
        if (testBtn) testBtn.addEventListener('click', () => {
            const email = prompt('Test e-postası hangi adrese gönderilsin?', '');
            if (!email) return;
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                setStatus('Geçersiz e-posta adresi.', 'error');
                return;
            }
            setStatus('Test e-postası gönderiliyor...', 'info');
            fetch('cert-notify.php?test=' + encodeURIComponent(email), { credentials: 'same-origin' })
                .then(r => r.json())
                .then(data => {
                    if (!data.success) throw new Error(data.error || 'mail başarısız');
                    setStatus(`Test maili gönderildi → ${data.to} (${data.count || 0} cert)`, 'success');
                })
                .catch(err => setStatus('Hata: ' + err.message, 'error'));
        });

        // Şablon önizleme — kaydedilmemiş içeriği POST eder, render edilmiş HTML yeni sekmede açılır
        const tplPreviewBtn = document.getElementById('cert-tpl-preview-btn');
        if (tplPreviewBtn) tplPreviewBtn.addEventListener('click', () => {
            setStatus('Önizleme hazırlanıyor...', 'info');
            const payload = { mail_template: collectTemplateFromDOM() };
            fetch('cert-notify.php?preview=1', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            .then(r => {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.text();
            })
            .then(html => {
                const w = window.open('', '_blank');
                if (!w) {
                    setStatus('Pop-up engellendi — tarayıcınızdan portala pop-up izni verin.', 'error');
                    return;
                }
                w.document.open();
                w.document.write(html);
                w.document.close();
                setStatus('Önizleme yeni sekmede açıldı.', 'success');
            })
            .catch(err => setStatus('Önizleme hatası: ' + err.message, 'error'));
        });
    });

    // Dış erişim için (örn. başka modülden tetiklemek)
    window.CertSettings = {
        reload: loadSettings,
        get: () => currentSettings,
    };
})();
