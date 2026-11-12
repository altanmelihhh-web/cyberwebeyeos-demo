/**
 * Jira DYF Management
 * Handles Cyberwebeyeos and Örnek Müşteri A DYF issues display and management
 */

let dyfCurrentPage = {
    cyberwebeyeos: 1,
    'ornek-musteri-a': 1
};

let dyfItemsPerPage = {
    cyberwebeyeos: 5,
    'ornek-musteri-a': 5
};

// Cache for calendar data (loaded once, not refreshed on pagination)
let dyfCalendarCache = {
    cyberwebeyeos: null,
    'ornek-musteri-a': null
};

/**
 * Load DYF issues for a company
 */
async function loadDYFIssues(company, page = 1) {
    const perPage = dyfItemsPerPage[company] || 20;
    const offset = (page - 1) * perPage;
    const search = document.getElementById(`${company}-dyf-search`)?.value || '';
    const status = document.getElementById(`${company}-dyf-status-filter`)?.value || '';

    try {
        const params = new URLSearchParams({
            company: company,
            limit: perPage,
            offset: offset
        });

        if (search) params.append('search', search);
        if (status) params.append('status', status);

        const response = await fetch(`${window.PORTAL_BASE_URL}/get-jira-issues.php?${params}`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Unknown error');
        }

        renderDYFIssues(company, data.issues);
        renderDYFPagination(company, data.total, page);
        updateDYFStats(company, data.total, data.syncStats);
        updateDYFSyncWarning(company, data.syncHealth);

        // Populate status filter if empty
        populateStatusFilter(company, data.issues);

        // Load calendar data separately (only once)
        if (!dyfCalendarCache[company]) {
            loadDYFCalendarData(company);
        }

    } catch (error) {
        console.error(`Error loading ${company} DYF issues:`, error);
        showDYFError(company, error.message);
    }
}

/**
 * Render DYF issues in table
 */
function renderDYFIssues(company, issues) {
    const tbody = document.getElementById(`${company}-dyf-body`);

    if (!issues || issues.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px;">
                    <i class="fas fa-inbox" style="font-size: 48px; color: #bbb;"></i>
                    <p style="margin-top: 10px; color: #666;">Kayıt bulunamadı</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = issues.map(issue => `
        <tr>
            <td>
                <a href="${issue.jira_url}" target="_blank" style="color: #3498db; text-decoration: none; font-weight: 600;">
                    ${escapeHtml(issue.jira_key)}
                    <i class="fas fa-external-link-alt" style="font-size: 0.8em; margin-left: 4px;"></i>
                </a>
            </td>
            <td title="${escapeHtml(issue.summary)}" style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${escapeHtml(issue.summary)}
            </td>
            <td>
                <span class="status-badge status-${getStatusClass(issue.status)}">
                    ${escapeHtml(issue.status)}
                </span>
            </td>
            <td>${escapeHtml(issue.assignee_display_name || 'Atanmamış')}</td>
            <td style="font-size: 0.9em; color: #666;">${escapeHtml(issue.created_at)}</td>
            <td style="font-size: 0.9em; color: #666;">${escapeHtml(issue.updated_at)}</td>
            <td>
                <button onclick="viewDYFIssue('${escapeHtml(issue.jira_key)}')" class="icon-btn" title="Detayları Gör">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

/**
 * Get status CSS class
 */
function getStatusClass(status) {
    if (!status) return 'pending';

    const statusLower = status.toLowerCase();

    // Completed/Success statuses → Green
    if (statusLower.includes('yapıld') ||
        statusLower.includes('yapildi') ||
        statusLower.includes('değişiklik') ||
        statusLower.includes('degisiklik') ||
        statusLower.includes('tamamlan') ||
        statusLower.includes('başarı') ||
        statusLower.includes('basari') ||
        statusLower.includes('basarili') ||
        statusLower.includes('done') ||
        statusLower.includes('closed') ||
        statusLower.includes('resolved')) {
        return 'completed';
    }

    // Cancelled/Failed statuses → Red
    if (statusLower.includes('iptal') ||
        statusLower.includes('cancel') ||
        statusLower.includes('reject') ||
        statusLower.includes('reddedil') ||
        statusLower.includes('failed') ||
        statusLower.includes('başarısız') ||
        statusLower.includes('basarisiz') ||
        statusLower.includes('red')) {
        return 'cancelled';
    }

    // In-Progress/Pending statuses → Orange
    if (statusLower.includes('devam') ||
        statusLower.includes('progress') ||
        statusLower.includes('bekl') ||
        statusLower.includes('onay') ||
        statusLower.includes('cab') ||
        statusLower.includes('pending') ||
        statusLower.includes('open')) {
        return 'pending';
    }

    // Default → Orange (treat unknown as in-progress)
    return 'pending';
}

/**
 * Render pagination
 */
function renderDYFPagination(company, total, currentPage) {
    const perPage = dyfItemsPerPage[company] || 20;
    const totalPages = Math.ceil(total / perPage);
    const paginationDiv = document.getElementById(`${company}-dyf-pagination`);

    if (totalPages <= 1) {
        paginationDiv.innerHTML = '';
        return;
    }

    let paginationHTML = '<div style="display: flex; gap: 5px; justify-content: center; align-items: center;">';

    // Previous button
    paginationHTML += `
        <button onclick="changeDYFPage('${company}', ${currentPage - 1})"
                ${currentPage === 1 ? 'disabled' : ''}
                style="padding: 8px 12px; border: 1px solid #ddd; background: white; border-radius: 5px; cursor: pointer;">
            <i class="fas fa-chevron-left"></i>
        </button>
    `;

    // Page numbers
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
        paginationHTML += `<button onclick="changeDYFPage('${company}', 1)" style="padding: 8px 12px; border: 1px solid #ddd; background: white; border-radius: 5px; cursor: pointer;">1</button>`;
        if (startPage > 2) {
            paginationHTML += '<span style="padding: 8px;">...</span>';
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        const active = i === currentPage ? 'background: #3498db; color: white;' : 'background: white;';
        paginationHTML += `
            <button onclick="changeDYFPage('${company}', ${i})"
                    style="padding: 8px 12px; border: 1px solid #ddd; ${active} border-radius: 5px; cursor: pointer;">
                ${i}
            </button>
        `;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += '<span style="padding: 8px;">...</span>';
        }
        paginationHTML += `<button onclick="changeDYFPage('${company}', ${totalPages})" style="padding: 8px 12px; border: 1px solid #ddd; background: white; border-radius: 5px; cursor: pointer;">${totalPages}</button>`;
    }

    // Next button
    paginationHTML += `
        <button onclick="changeDYFPage('${company}', ${currentPage + 1})"
                ${currentPage === totalPages ? 'disabled' : ''}
                style="padding: 8px 12px; border: 1px solid #ddd; background: white; border-radius: 5px; cursor: pointer;">
            <i class="fas fa-chevron-right"></i>
        </button>
    `;

    paginationHTML += '</div>';
    paginationDiv.innerHTML = paginationHTML;
}

/**
 * Change page
 */
function changeDYFPage(company, page) {
    dyfCurrentPage[company] = page;
    loadDYFIssues(company, page);
}

/**
 * Update stats
 */
function updateDYFStats(company, total, syncStats) {
    document.getElementById(`${company}-dyf-total`).textContent = total;

    if (syncStats && syncStats.length > 0) {
        const companyStat = syncStats.find(s => s.company === company);
        if (companyStat) {
            document.getElementById(`${company}-dyf-last-sync`).textContent = companyStat.sync_completed_at;
        }
    }
}

/**
 * Senkronizasyon basarisizsa ekranda uyari banner'i goster
 */
function updateDYFSyncWarning(company, syncHealth) {
    const banner = document.getElementById(`${company}-dyf-sync-warning`);
    if (!banner) return;

    const health = syncHealth?.[company];
    if (!health || !health.is_down) {
        banner.style.display = 'none';
        banner.innerHTML = '';
        return;
    }

    let sinceText = '';
    if (health.last_success_at) {
        const lastSuccess = new Date(health.last_success_at.replace(' ', 'T'));
        const hours = Math.floor((Date.now() - lastSuccess.getTime()) / 3600000);
        if (hours >= 24) {
            sinceText = ` (yaklaşık ${Math.floor(hours / 24)} gündür)`;
        } else if (hours >= 1) {
            sinceText = ` (yaklaşık ${hours} saattir)`;
        }
    }

    banner.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <strong>Jira senkronizasyonu başarısız oluyor${sinceText}.</strong>
        Aşağıdaki liste güncel Jira verisini yansıtmıyor olabilir. Servis hesabının şifre/token süresi dolmuş olabilir, IT ile iletişime geçin.
    `;
    banner.style.display = 'block';
}

/**
 * Jira Ayarlari tab'i acildiginda mevcut ayarlari yukle
 */
async function loadJiraSettings() {
    const badge = document.getElementById('jira-cred-status-badge');
    const usernameInput = document.getElementById('jira-cred-username');
    const recipientsInput = document.getElementById('jira-notify-recipients');
    const expiryInput = document.getElementById('jira-notify-expiry-days');
    const notifyBeforeInput = document.getElementById('jira-notify-days-before');

    if (!badge) return;

    try {
        const response = await fetch(`${window.PORTAL_BASE_URL}/get-jira-settings.php`);
        const data = await response.json();
        if (!data.success) return;

        if (usernameInput) usernameInput.value = data.username || '';
        if (recipientsInput) recipientsInput.value = data.notify_recipients || '';
        if (expiryInput) expiryInput.value = data.expiry_days || 90;
        if (notifyBeforeInput) notifyBeforeInput.value = data.notify_days_before || 14;

        const statusStyles = {
            ok:      { bg: '#f0fdf4', border: '#16a34a', color: '#166534', icon: 'fa-check-circle' },
            warning: { bg: '#fffbeb', border: '#f59e0b', color: '#92400e', icon: 'fa-exclamation-triangle' },
            expired: { bg: '#fef2f2', border: '#dc2626', color: '#991b1b', icon: 'fa-times-circle' },
            unknown: { bg: '#f3f4f6', border: '#9ca3af', color: '#4b5563', icon: 'fa-question-circle' }
        };
        const s = statusStyles[data.status] || statusStyles.unknown;

        let text;
        if (data.status === 'unknown') {
            text = 'Şifre değişim tarihi henüz kayıtlı değil.';
        } else if (data.days_left < 0) {
            text = `<strong>Süresi doldu.</strong> Son değişim: ${escapeHtml(data.password_changed_at || '-')} (${Math.abs(data.days_left)} gün önce süresi dolmuş olmalı, kurum politikası: ${data.expiry_days} gün)`;
        } else {
            text = `Son değişim: <strong>${escapeHtml(data.password_changed_at || '-')}</strong> · Tahmini son geçerlilik: <strong>${escapeHtml(data.expires_at || '-')}</strong> · Kalan: <strong>${data.days_left} gün</strong>`;
        }
        if (data.has_pending_change) {
            text += ' <br><em>Bekleyen bir değişiklik var, en geç 15 dakika içinde uygulanacak.</em>';
        }

        badge.style.background = s.bg;
        badge.style.border = `1px solid ${s.border}`;
        badge.style.color = s.color;
        badge.innerHTML = `<i class="fas ${s.icon}"></i> ${text}`;
        badge.style.display = 'block';

        renderJiraConnectionInfo(data);
    } catch (error) {
        console.error('Jira ayarları yüklenemedi:', error);
    }
}

/**
 * "Baglanti ve Senkronizasyon" kartindaki sunucu/hesap/son-sync bilgilerini doldurur.
 */
function renderJiraConnectionInfo(data) {
    const urlEl = document.getElementById('jira-conn-url');
    if (!urlEl) return;

    urlEl.textContent = data.jira_url || '-';
    document.getElementById('jira-conn-user').textContent = data.jira_user || '-';

    const passEl = document.getElementById('jira-conn-pass');
    passEl.innerHTML = data.has_password
        ? '<span style="color:#16a34a;"><i class="fas fa-check"></i> Kayıtlı</span>'
        : '<span style="color:#dc2626;"><i class="fas fa-times"></i> Kayıtlı değil</span>';

    ['cyberwebeyeos', 'ornek-musteri-a'].forEach(company => {
        const el = document.getElementById(`jira-conn-last-${company}`);
        if (!el) return;

        const row = data.last_syncs?.[company];
        if (!row) {
            el.innerHTML = '<span style="color:#94a3b8;">Kayıt yok</span>';
            return;
        }

        const when = row.sync_completed_at || row.sync_started_at || '-';
        if (row.status === 'success') {
            el.innerHTML = `<span style="color:#16a34a;"><i class="fas fa-check-circle"></i> ${escapeHtml(when)}</span>`
                + ` <span style="color:#64748b; font-weight:400;">(${row.total_fetched ?? 0} kayıt)</span>`;
        } else {
            el.innerHTML = `<span style="color:#dc2626;"><i class="fas fa-times-circle"></i> ${escapeHtml(when)}</span>`
                + ` <span style="color:#64748b; font-weight:400;">(başarısız)</span>`;
        }
    });
}

/**
 * Jira baglantisini test eder. Basarisizlik durumunda Jira'nin bildirdigi
 * gercek sebebi (CAPTCHA kilidi, hatali sifre vb.) ekranda gosterir.
 */
async function testJiraConnection() {
    const btn = document.getElementById('jira-test-btn');
    const resultDiv = document.getElementById('jira-sync-result');
    if (!btn || !resultDiv) return;

    btn.disabled = true;
    resultDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Jira bağlantısı test ediliyor...';

    try {
        const response = await fetch(`${window.PORTAL_BASE_URL}/jira-sync-trigger.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'test' })
        });
        const data = await response.json();

        if (!data.success) {
            resultDiv.innerHTML = jiraResultBox('error', escapeHtml(data.error || 'Test yapılamadı'));
            return;
        }

        const t = data.test;
        resultDiv.innerHTML = t.ok
            ? jiraResultBox('success', escapeHtml(t.message))
            : jiraResultBox('error', `<strong>HTTP ${t.code}</strong> — ${escapeHtml(t.message)}`);
    } catch (error) {
        resultDiv.innerHTML = jiraResultBox('error', `İstek başarısız: ${escapeHtml(error.message)}`);
    } finally {
        btn.disabled = false;
    }
}

/**
 * Senkronizasyonu elle tetikler (cron'un 15 dakikalik dongusunu beklemeden).
 */
async function triggerJiraSync() {
    const btn = document.getElementById('jira-sync-btn');
    const resultDiv = document.getElementById('jira-sync-result');
    if (!btn || !resultDiv) return;

    const target = document.getElementById('jira-sync-target')?.value || 'all';

    btn.disabled = true;
    resultDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Senkronizasyon çalışıyor, lütfen bekleyin...';

    try {
        const response = await fetch(`${window.PORTAL_BASE_URL}/jira-sync-trigger.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'sync', target })
        });
        const data = await response.json();

        if (!data.success) {
            resultDiv.innerHTML = jiraResultBox('error', escapeHtml(data.error || data.message || 'Senkronizasyon başarısız'));
        } else {
            let html = `<strong>${escapeHtml(data.message)}</strong>`;
            (data.results || []).forEach(r => {
                const label = r.company === 'cyberwebeyeos' ? 'Cyberwebeyeos' : 'Örnek Müşteri A';
                html += `<br>${escapeHtml(label)}: ${r.total_fetched ?? 0} çekildi, `
                      + `${r.total_created ?? 0} eklendi, ${r.total_updated ?? 0} güncellendi`
                      + (r.total_errors > 0 ? `, <span style="color:#b45309;">${r.total_errors} hata</span>` : '');
            });
            resultDiv.innerHTML = jiraResultBox('success', html);
        }

        loadJiraSettings();
    } catch (error) {
        resultDiv.innerHTML = jiraResultBox('error', `İstek başarısız: ${escapeHtml(error.message)}`);
    } finally {
        btn.disabled = false;
    }
}

/**
 * Test / senkronizasyon sonucu icin renkli kutu.
 */
function jiraResultBox(type, innerHtml) {
    const s = type === 'success'
        ? { bg: '#f0fdf4', border: '#16a34a', color: '#166534', icon: 'fa-check-circle' }
        : { bg: '#fef2f2', border: '#dc2626', color: '#991b1b', icon: 'fa-exclamation-triangle' };

    return `<div style="background:${s.bg}; border:1px solid ${s.border}; color:${s.color};
                 border-radius:6px; padding:12px 14px; line-height:1.6;">
              <i class="fas ${s.icon}"></i> ${innerHtml}
            </div>`;
}

/**
 * Jira servis hesabi kullanici adi / sifresini kaydet (Ayarlar tab'i)
 */
async function saveJiraCredential() {
    const usernameInput = document.getElementById('jira-cred-username');
    const passwordInput = document.getElementById('jira-cred-password');
    const resultDiv = document.getElementById('jira-cred-result');
    const username = usernameInput?.value?.trim() || '';
    const password = passwordInput?.value || '';

    if (!username && !password) {
        resultDiv.innerHTML = '<span style="color:#e74c3c;">Kullanıcı adı veya şifreden en az biri girilmeli.</span>';
        return;
    }

    resultDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Kaydediliyor...';

    try {
        const response = await fetch(`${window.PORTAL_BASE_URL}/save-jira-credential.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jira_username: username, jira_password: password })
        });
        const data = await response.json();

        if (data.success) {
            // Kaydetme basarili olsa da baglanti testi basarisiz olabilir
            // (ornegin hesap CAPTCHA kilidinde) — bunu sari/kirmizi gosterelim.
            const testFailed = data.applied === false || (data.test && data.test.ok === false);
            resultDiv.innerHTML = jiraResultBox(
                testFailed ? 'error' : 'success',
                escapeHtml(data.message)
            );
            passwordInput.value = '';
            loadJiraSettings();
        } else {
            resultDiv.innerHTML = `<span style="color:#e74c3c;"><i class="fas fa-exclamation-triangle"></i> ${escapeHtml(data.error || 'Hata oluştu')}</span>`;
        }
    } catch (error) {
        resultDiv.innerHTML = `<span style="color:#e74c3c;">İstek başarısız: ${escapeHtml(error.message)}</span>`;
    }
}

/**
 * Jira bildirim ayarlarini kaydet (Ayarlar tab'i)
 */
async function saveJiraNotifySettings() {
    const recipientsInput = document.getElementById('jira-notify-recipients');
    const expiryInput = document.getElementById('jira-notify-expiry-days');
    const notifyBeforeInput = document.getElementById('jira-notify-days-before');
    const resultDiv = document.getElementById('jira-notify-result');

    resultDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Kaydediliyor...';

    try {
        const response = await fetch(`${window.PORTAL_BASE_URL}/save-jira-notify-settings.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                notify_recipients: recipientsInput?.value?.trim() || '',
                expiry_days: parseInt(expiryInput?.value, 10) || 90,
                notify_days_before: parseInt(notifyBeforeInput?.value, 10) || 14
            })
        });
        const data = await response.json();

        if (data.success) {
            resultDiv.innerHTML = `<span style="color:#27ae60;"><i class="fas fa-check-circle"></i> ${escapeHtml(data.message)}</span>`;
            loadJiraSettings();
        } else {
            resultDiv.innerHTML = `<span style="color:#e74c3c;"><i class="fas fa-exclamation-triangle"></i> ${escapeHtml(data.error || 'Hata oluştu')}</span>`;
        }
    } catch (error) {
        resultDiv.innerHTML = `<span style="color:#e74c3c;">İstek başarısız: ${escapeHtml(error.message)}</span>`;
    }
}

/**
 * Populate status filter
 */
function populateStatusFilter(company, issues) {
    const select = document.getElementById(`${company}-dyf-status-filter`);

    if (!select || select.options.length > 1) return;

    const statuses = [...new Set(issues.map(i => i.status))].sort();

    statuses.forEach(status => {
        const option = document.createElement('option');
        option.value = status;
        option.textContent = status;
        select.appendChild(option);
    });
}

/**
 * Show error
 */
function showDYFError(company, message) {
    const tbody = document.getElementById(`${company}-dyf-body`);
    tbody.innerHTML = `
        <tr>
            <td colspan="7" style="text-align: center; padding: 40px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #e74c3c;"></i>
                <p style="margin-top: 10px; color: #e74c3c;">Hata: ${escapeHtml(message)}</p>
            </td>
        </tr>
    `;
}

/**
 * Refresh functions
 */
function refreshCyberwebeyeosDYF() {
    // Clear cache and reload both table and calendar
    dyfCalendarCache.cyberwebeyeos = null;
    loadDYFIssues('cyberwebeyeos', dyfCurrentPage.cyberwebeyeos);
}

function refreshOrnekMusteriADYF() {
    // Clear cache and reload both table and calendar
    dyfCalendarCache['ornek-musteri-a'] = null;
    loadDYFIssues('ornek-musteri-a', dyfCurrentPage['ornek-musteri-a']);
}

/**
 * View issue details
 */
function viewDYFIssue(jiraKey) {
    window.open(`_api/preview-task.html?jira=${encodeURIComponent(jiraKey)}`, '_blank');
}

/**
 * Load ALL DYF data for calendar (no pagination)
 */
async function loadDYFCalendarData(company) {
    try {
        const params = new URLSearchParams({
            company: company,
            calendar: 'true'  // Get all records for calendar
        });

        const response = await fetch(`${window.PORTAL_BASE_URL}/get-jira-issues.php?${params}`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Unknown error');
        }

        // Cache the calendar data
        dyfCalendarCache[company] = data.issues;

        // Add to calendar
        addDYFIssuesToCalendar(company, data.issues);

        console.log(`${company} DYF: ${data.issues.length} kayıt takvime eklendi`);

    } catch (error) {
        console.error(`Error loading ${company} DYF calendar data:`, error);
    }
}

/**
 * Add DYF issues to calendar
 */
function addDYFIssuesToCalendar(company, issues) {
    // Store the DYF issues for this company
    if (typeof window.dyfCalendarTasks === 'undefined') {
        window.dyfCalendarTasks = {
            cyberwebeyeos: [],
            'ornek-musteri-a': []
        };
    }

    // Clear old DYF tasks for this company
    window.dyfCalendarTasks[company] = [];

    // Add new DYF issues as calendar tasks with improved status mapping
    issues.forEach(issue => {
        // Determine task status based on DYF status using getStatusClass
        let taskStatus = 'warning'; // Default: In-Progress (Orange)
        const statusClass = getStatusClass(issue.status);

        // Map status class to calendar task status
        if (statusClass === 'completed') {
            taskStatus = 'completed';
        } else if (statusClass === 'cancelled') {
            taskStatus = 'critical';
        } else if (statusClass === 'pending') {
            taskStatus = 'warning';
        }

        window.dyfCalendarTasks[company].push({
            id: issue.jira_key,
            device: issue.jira_key,
            description: issue.summary,
            date: issue.date,
            status: taskStatus,
            type: 'dyf',
            company: company,
            jira_url: issue.jira_url,
            assignee: issue.assignee_display_name,
            originalStatus: issue.status, // Keep original status for display
            scheduledDate: issue.scheduled_date_formatted || null
        });
    });

    // Render the DYF calendar
    renderDYFCalendar(company);
}

/**
 * Current month/year for DYF calendars
 */
if (typeof window.dyfCalendarState === 'undefined') {
    window.dyfCalendarState = {
        cyberwebeyeos: { month: new Date().getMonth(), year: new Date().getFullYear() },
        'ornek-musteri-a': { month: new Date().getMonth(), year: new Date().getFullYear() }
    };
}

/**
 * Render DYF Calendar
 */
function renderDYFCalendar(company) {
    const state = window.dyfCalendarState[company];
    const tasks = window.dyfCalendarTasks[company] || [];

    // Update calendar title
    const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
                       'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    const titleElement = document.getElementById(`${company}-dyf-calendar-title`);
    if (titleElement) {
        titleElement.textContent = `${monthNames[state.month]} ${state.year}`;
    }

    // Get calendar dates container
    const datesContainer = document.getElementById(`${company}-dyf-calendar-dates`);
    if (!datesContainer) return;

    // Clear existing dates
    datesContainer.innerHTML = '';

    // Calculate first day of month and total days
    const firstDay = new Date(state.year, state.month, 1);
    const lastDay = new Date(state.year, state.month + 1, 0);
    const totalDays = lastDay.getDate();

    // Get day of week (0=Sunday, 1=Monday, etc.) - adjust for Monday start
    let firstDayOfWeek = firstDay.getDay() - 1;
    if (firstDayOfWeek === -1) firstDayOfWeek = 6; // Sunday becomes 6

    // Add empty cells for days before month starts
    for (let i = 0; i < firstDayOfWeek; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-date empty';
        datesContainer.appendChild(emptyCell);
    }

    // Add cells for each day of month
    const today = new Date();
    for (let day = 1; day <= totalDays; day++) {
        const dateStr = `${state.year}-${String(state.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayTasks = tasks.filter(task => task.date === dateStr);

        const dateCell = document.createElement('div');
        dateCell.className = 'calendar-date';

        // Check if today
        if (today.getDate() === day &&
            today.getMonth() === state.month &&
            today.getFullYear() === state.year) {
            dateCell.classList.add('today');
        }

        // Add day number
        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = day;
        dateCell.appendChild(dayNumber);

        // Add task indicators
        if (dayTasks.length > 0) {
            dateCell.classList.add('has-tasks');

            const taskIndicators = document.createElement('div');
            taskIndicators.className = 'task-indicators';
            taskIndicators.style.cssText = 'display: flex; flex-direction: column; gap: 2px; margin-top: 3px; font-size: 0.7em;';

            // Group tasks by status
            const statusGroups = {
                completed: 0,
                warning: 0,
                critical: 0
            };

            dayTasks.forEach(task => {
                if (statusGroups.hasOwnProperty(task.status)) {
                    statusGroups[task.status]++;
                }
            });

            // Status labels in Turkish
            const statusLabels = {
                completed: '✓',
                warning: '⚠',
                critical: '✕'
            };

            const statusColors = {
                completed: '#27ae60',
                warning: '#f39c12',
                critical: '#e74c3c'
            };

            // Add status counts with numbers
            Object.keys(statusGroups).forEach(status => {
                if (statusGroups[status] > 0) {
                    const indicator = document.createElement('div');
                    indicator.style.cssText = `
                        display: flex;
                        align-items: center;
                        gap: 2px;
                        color: ${statusColors[status]};
                        font-weight: 600;
                        white-space: nowrap;
                    `;
                    indicator.innerHTML = `${statusLabels[status]} ${statusGroups[status]}`;
                    taskIndicators.appendChild(indicator);
                }
            });

            dateCell.appendChild(taskIndicators);

            // Make clickable
            dateCell.style.cursor = 'pointer';
            dateCell.onclick = () => showDYFTasksForDate(company, dateStr, dayTasks);
        }

        datesContainer.appendChild(dateCell);
    }
}

/**
 * Show DYF tasks for selected date
 */
function showDYFTasksForDate(company, dateStr, tasks) {
    const dateElement = document.getElementById(`${company}-dyf-selected-date`);
    const listElement = document.getElementById(`${company}-dyf-date-tasks-list`);

    if (!dateElement || !listElement) return;

    // Format date for display
    const date = new Date(dateStr + 'T00:00:00');
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    dateElement.textContent = date.toLocaleDateString('tr-TR', options);

    // Clear existing content
    listElement.innerHTML = '';

    if (tasks.length === 0) {
        listElement.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: #999; background: var(--bg-secondary); border-radius: 6px;">
                <i class="fas fa-inbox" style="font-size: 3rem; opacity: 0.3; margin-bottom: 15px; display: block;"></i>
                <p style="margin: 0; font-size: 1rem;">Bu günde DYF kaydı yok</p>
            </div>
        `;
        return;
    }

    // Show task count
    const countBadge = document.createElement('div');
    countBadge.style.cssText = 'margin-bottom: 15px; padding: 8px 12px; background: var(--bg-secondary); border-radius: 6px; display: inline-block; font-size: 0.9rem; color: var(--text-secondary);';
    countBadge.innerHTML = `<i class="fas fa-list"></i> <strong>${tasks.length}</strong> DYF kaydı`;
    listElement.appendChild(countBadge);

    // Render tasks
    tasks.forEach((task, index) => {
        const taskCard = document.createElement('div');
        taskCard.style.cssText = `
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-left: 4px solid ${task.status === 'completed' ? '#27ae60' : task.status === 'critical' ? '#e74c3c' : '#f39c12'};
            border-radius: 6px;
            padding: 15px;
            margin-bottom: 12px;
            transition: all 0.2s ease;
            cursor: pointer;
        `;

        taskCard.onmouseover = function() {
            this.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            this.style.transform = 'translateY(-2px)';
        };
        taskCard.onmouseout = function() {
            this.style.boxShadow = 'none';
            this.style.transform = 'translateY(0)';
        };

        taskCard.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 5px;">
                        <strong style="font-size: 1rem; color: var(--text-primary);">
                            <a href="${task.jira_url}" target="_blank" style="color: #3498db; text-decoration: none; font-weight: 600;">
                                ${escapeHtml(task.device)}
                                <i class="fas fa-external-link-alt" style="font-size: 0.75em; margin-left: 4px;"></i>
                            </a>
                        </strong>
                    </div>
                </div>
                <span class="status-badge status-${getStatusClass(task.originalStatus)}" style="font-size: 0.85em; padding: 5px 10px; border-radius: 4px; white-space: nowrap;">
                    ${escapeHtml(task.originalStatus)}
                </span>
            </div>
            <div style="font-size: 0.9em; color: var(--text-secondary); margin-bottom: 10px; line-height: 1.5;">
                ${escapeHtml(task.description)}
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 12px; font-size: 0.85em; color: var(--text-tertiary); padding-top: 8px; border-top: 1px solid var(--border-color);">
                ${task.assignee ? `
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <i class="fas fa-user-circle" style="color: #3498db;"></i>
                        <span>${escapeHtml(task.assignee)}</span>
                    </div>
                ` : ''}
                ${task.scheduledDate ? `
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <i class="fas fa-calendar-check" style="color: #e67e22;"></i>
                        <span title="Gerçekleşeceği Tarih ve Zaman">${escapeHtml(task.scheduledDate)}</span>
                    </div>
                ` : ''}
            </div>
        `;
        listElement.appendChild(taskCard);
    });
}

/**
 * Change DYF calendar month
 */
function changeDYFCalendarMonth(company, direction) {
    const state = window.dyfCalendarState[company];

    state.month += direction;

    if (state.month < 0) {
        state.month = 11;
        state.year--;
    } else if (state.month > 11) {
        state.month = 0;
        state.year++;
    }

    renderDYFCalendar(company);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Initialize on page load
 */
document.addEventListener('DOMContentLoaded', function() {
    // Setup search filters with debounce
    ['cyberwebeyeos', 'ornek-musteri-a'].forEach(company => {
        const searchInput = document.getElementById(`${company}-dyf-search`);
        const statusFilter = document.getElementById(`${company}-dyf-status-filter`);
        const perPageSelect = document.getElementById(`${company}-dyf-per-page`);

        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', function() {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    dyfCurrentPage[company] = 1;
                    loadDYFIssues(company, 1);
                }, 500);
            });
        }

        if (statusFilter) {
            statusFilter.addEventListener('change', function() {
                dyfCurrentPage[company] = 1;
                loadDYFIssues(company, 1);
            });
        }

        if (perPageSelect) {
            perPageSelect.addEventListener('change', function() {
                dyfItemsPerPage[company] = parseInt(this.value);
                dyfCurrentPage[company] = 1;
                loadDYFIssues(company, 1);
            });
        }
    });

    // Listen for tab changes to load data
    document.addEventListener('click', function(e) {
        const tab = e.target.closest('.tab[data-tab="cyberwebeyeos-dyf"], .tab[data-tab="ornek-musteri-a-dyf"]');
        if (tab) {
            const company = tab.dataset.tab.replace('-dyf', '');
            // Load data only if not loaded yet
            const tbody = document.getElementById(`${company}-dyf-body`);
            if (tbody && tbody.querySelector('.fa-spinner')) {
                loadDYFIssues(company, 1);
            }
        }

        // Listen for dashboard DYF tab changes
        const dashboardTab = e.target.closest('.tab[data-tab="cyberwebeyeos-dyf-dashboard"], .tab[data-tab="ornek-musteri-a-dyf-dashboard"]');
        if (dashboardTab) {
            const company = dashboardTab.dataset.tab.replace('-dyf-dashboard', '');
            // Load data only if not loaded yet
            const statsTotal = document.getElementById(`${company}-dashboard-total`);
            if (statsTotal && statsTotal.textContent === '-') {
                loadDashboardDYF(company);
            }
        }
    });

    // Auto-load dashboard DYF data when dashboard page is visible
    if (window.location.hash === '' || window.location.hash === '#dashboard') {
        // Load both Cyberwebeyeos and Örnek Müşteri A DYF data for dashboard
        setTimeout(() => {
            loadDashboardDYF('cyberwebeyeos');
            loadDashboardDYF('ornek-musteri-a');
        }, 500);
    }
});

/**
 * Load DYF data for dashboard widget
 */
async function loadDashboardDYF(company) {
    try {
        const params = new URLSearchParams({
            company: company,
            dashboard: 'true'
        });

        const response = await fetch(`${window.PORTAL_BASE_URL}/get-jira-issues.php?${params}`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Unknown error');
        }

        // Update statistics
        if (data.statistics) {
            document.getElementById(`${company}-dashboard-total`).textContent = data.statistics.total;
            document.getElementById(`${company}-dashboard-open`).textContent = data.statistics.open;
            document.getElementById(`${company}-dashboard-completed`).textContent = data.statistics.completed;
        }

        // Render recent issues
        renderDashboardDYFList(company, data.issues);

    } catch (error) {
        console.error(`Error loading ${company} DYF dashboard data:`, error);
        showDashboardDYFError(company, error.message);
    }
}

/**
 * Render DYF issues in dashboard table
 */
function renderDashboardDYFList(company, issues) {
    const tbody = document.getElementById(`${company}-dashboard-dyf-list`);

    if (!issues || issues.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 20px; color: #999;">
                    Kayıt bulunamadı
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = issues.map(issue => {
        const statusClass = getStatusClass(issue.status);
        return `
            <tr style="cursor: pointer;" onclick="window.open('${issue.jira_url}', '_blank')">
                <td>
                    <span style="color: #3498db; font-weight: 600;">${escapeHtml(issue.jira_key)}</span>
                </td>
                <td title="${escapeHtml(issue.summary)}" style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${escapeHtml(issue.summary)}
                </td>
                <td>
                    <span class="status-badge status-${statusClass}" style="font-size: 0.85em; padding: 3px 8px;">
                        ${escapeHtml(issue.status)}
                    </span>
                </td>
                <td style="font-size: 0.85em; color: #666;">
                    ${escapeHtml(issue.created_at)}
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Show error in dashboard
 */
function showDashboardDYFError(company, message) {
    const tbody = document.getElementById(`${company}-dashboard-dyf-list`);
    tbody.innerHTML = `
        <tr>
            <td colspan="4" style="text-align: center; padding: 20px; color: #e74c3c;">
                <i class="fas fa-exclamation-triangle"></i> Hata: ${escapeHtml(message)}
            </td>
        </tr>
    `;
}

// ============================================================================
// CAB ONAY GEREKTIREN - Tum DYF'lerden CAB durumundakileri gosterir
// ============================================================================

function loadCABTasks() {
    var tbody = document.getElementById('cab-tasks-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;"><i class="fas fa-spinner fa-spin" style="font-size:24px;color:#3498db;"></i><p style="margin-top:10px;">CAB kayitlari yukleniyor...</p></td></tr>';

    // Hem cyberwebeyeos hem ornekMusteriA CAB issue'larini cek
    Promise.all([
        fetch('get-jira-issues.php?company=cyberwebeyeos&cab=true&limit=200').then(r => r.json()),
        fetch('get-jira-issues.php?company=ornekMusteriA&cab=true&limit=200').then(r => r.json())
    ]).then(function(results) {
        var allIssues = [];
        if (results[0] && results[0].issues) allIssues = allIssues.concat(results[0].issues);
        if (results[1] && results[1].issues) allIssues = allIssues.concat(results[1].issues);

        // Tarihe gore sirala (yeniden eskiye)
        allIssues.sort(function(a, b) {
            return (b.updated_at || b.created_at || '').localeCompare(a.updated_at || a.created_at || '');
        });

        if (allIssues.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#95a5a6;"><i class="fas fa-check-circle" style="font-size:2rem;display:block;margin-bottom:10px;"></i>CAB onay bekleyen kayit bulunmuyor</td></tr>';
            return;
        }

        var html = '';
        allIssues.forEach(function(issue) {
            var statusClass = getStatusClass(issue.status);
            var companyBadge = issue.company === 'cyberwebeyeos'
                ? '<span style="background:#3498db;color:#fff;padding:2px 8px;border-radius:10px;font-size:0.75rem;">Cyberwebeyeos</span>'
                : '<span style="background:#e67e22;color:#fff;padding:2px 8px;border-radius:10px;font-size:0.75rem;">Örnek Müşteri A</span>';
            html += '<tr>';
            html += '<td><a href="' + (issue.jira_url || '#') + '" target="_blank" style="color:#3498db;font-weight:600;">' + escapeHtml(issue.jira_key) + '</a></td>';
            html += '<td>' + escapeHtml(issue.summary || '-') + '</td>';
            html += '<td>' + companyBadge + '</td>';
            html += '<td><span class="status-badge ' + statusClass + '">' + escapeHtml(issue.status || '-') + '</span></td>';
            html += '<td>' + escapeHtml(issue.assignee_display_name || '-') + '</td>';
            html += '<td>' + escapeHtml(issue.updated_at || issue.created_at || '-') + '</td>';
            html += '<td><a href="' + (issue.jira_url || '#') + '" target="_blank" class="action-btn view-btn" title="Jira\'da Ac"><i class="fas fa-external-link-alt"></i></a></td>';
            html += '</tr>';
        });
        tbody.innerHTML = html;

        // Istatistik guncelle
        var countEl = document.getElementById('cab-tasks-count');
        if (countEl) countEl.textContent = allIssues.length;
    }).catch(function(err) {
        console.error('CAB tasks load error:', err);
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:#e74c3c;"><i class="fas fa-exclamation-triangle"></i> CAB verileri yuklenemedi</td></tr>';
    });
}

window.loadCABTasks = loadCABTasks;
