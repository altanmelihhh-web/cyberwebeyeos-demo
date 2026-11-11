// Lockout ayarlarını kaydet
function saveLockoutSettings() {
    const btn = event.target;
    const originalText = btn.textContent;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Kaydediliyor...';
    btn.disabled = true;

    const settings = {
        lockout_time_window: document.getElementById('lockout-time-window').value,
        max_failed_login_attempts: document.getElementById('max-failed-login-attempts').value,
        account_lockout_duration: document.getElementById('account-lockout-duration').value
    };

    fetch('save-settings.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: settings })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            btn.innerHTML = '<i class="fas fa-check"></i> Kaydedildi!';
            btn.style.background = '#27ae60';
            setTimeout(() => {
                btn.textContent = originalText;
                btn.disabled = false;
                btn.style.background = '';
            }, 2000);
        } else {
            btn.innerHTML = '<i class="fas fa-times"></i> Hata!';
            btn.style.background = '#e74c3c';
            alert('Ayarlar kaydedilemedi: ' + (data.message || 'Bilinmeyen hata'));
            setTimeout(() => {
                btn.textContent = originalText;
                btn.disabled = false;
                btn.style.background = '';
            }, 2000);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        btn.innerHTML = '<i class="fas fa-times"></i> Hata!';
        btn.style.background = '#e74c3c';
        alert('Bağlantı hatası: ' + error.message);
        setTimeout(() => {
            btn.textContent = originalText;
            btn.disabled = false;
            btn.style.background = '';
        }, 2000);
    });
}

// IP-based lockout ayarlarını kaydet
function saveIpLockoutSettings() {
    const btn = event.target;
    const originalText = btn.textContent;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Kaydediliyor...';
    btn.disabled = true;

    const settings = {
        ip_lockout_time_window: document.getElementById('ip-lockout-time-window').value,
        ip_max_failed_attempts: document.getElementById('ip-max-failed-attempts').value,
        ip_lockout_duration: document.getElementById('ip-lockout-duration').value
    };

    fetch('save-settings.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: settings })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            btn.innerHTML = '<i class="fas fa-check"></i> Kaydedildi!';
            btn.style.background = '#27ae60';
            setTimeout(() => {
                btn.textContent = originalText;
                btn.disabled = false;
                btn.style.background = '';
            }, 2000);
        } else {
            btn.innerHTML = '<i class="fas fa-times"></i> Hata!';
            btn.style.background = '#e74c3c';
            alert('Ayarlar kaydedilemedi: ' + (data.message || 'Bilinmeyen hata'));
            setTimeout(() => {
                btn.textContent = originalText;
                btn.disabled = false;
                btn.style.background = '';
            }, 2000);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        btn.innerHTML = '<i class="fas fa-times"></i> Hata!';
        btn.style.background = '#e74c3c';
        alert('Bağlantı hatası: ' + error.message);
        setTimeout(() => {
            btn.textContent = originalText;
            btn.disabled = false;
            btn.style.background = '';
        }, 2000);
    });
}

// ============================================
// SECURITY DASHBOARD FUNCTIONS
// ============================================

let securityDashboardInterval = null;

// Refresh security dashboard data
function refreshSecurityDashboard() {
    fetch('get-lockout-status.php')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                updateSecurityStats(data.data);
                renderLockedIPs(data.data.locked_ips);
                renderLockedUsers(data.data.locked_users);
            } else {
                console.error('Failed to fetch lockout status:', data.message);
            }
        })
        .catch(error => {
            console.error('Error fetching lockout status:', error);
        });
}

// Update statistics cards
function updateSecurityStats(data) {
    const lockedIPs = data.locked_ips.filter(ip => ip.locked_until && new Date(ip.locked_until) > new Date()).length;
    const lockedUsers = data.locked_users.filter(user => user.locked_until && new Date(user.locked_until) > new Date()).length;
    const activeAttempts = data.locked_ips.filter(ip => ip.attempt_count > 0 && (!ip.locked_until || new Date(ip.locked_until) <= new Date())).length;

    document.getElementById('stat-locked-ips').textContent = lockedIPs;
    document.getElementById('stat-locked-users').textContent = lockedUsers;
    document.getElementById('stat-active-attempts').textContent = activeAttempts;
    document.getElementById('stat-last-update').textContent = new Date(data.timestamp).toLocaleTimeString('tr-TR');
}

// Render locked IPs table
function renderLockedIPs(ips) {
    const tbody = document.getElementById('locked-ips-tbody');

    if (ips.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="padding: 40px; text-align: center; color: #27ae60;">
                    <i class="fas fa-check-circle" style="font-size: 24px; margin-bottom: 10px;"></i>
                    <div>Kilitli IP adresi bulunamadı.</div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = ips.map(ip => {
        const isLocked = ip.locked_until && new Date(ip.locked_until) > new Date();
        const statusBadge = isLocked
            ? '<span style="background: #e74c3c; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px;">🔒 KİLİTLİ</span>'
            : '<span style="background: #f39c12; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px;">⚠️ DENEMELİ</span>';

        const remainingTime = isLocked ? formatDuration(ip.minutes_remaining) : '-';

        return `
            <tr style="border-bottom: 1px solid #ecf0f1;">
                <td style="padding: 12px; font-family: monospace; font-weight: 600;">${ip.ip_address}</td>
                <td style="padding: 12px; text-align: center;">${ip.attempt_count}</td>
                <td style="padding: 12px;">${formatDateTime(ip.first_attempt)}</td>
                <td style="padding: 12px;">${formatDateTime(ip.last_attempt)}</td>
                <td style="padding: 12px;">${ip.locked_until ? formatDateTime(ip.locked_until) : '-'}</td>
                <td style="padding: 12px; text-align: center;">${remainingTime}</td>
                <td style="padding: 12px; text-align: center;">${statusBadge}</td>
                <td style="padding: 12px; text-align: center;">
                    <button onclick="unlockIP('${ip.ip_address}')" class="submit-btn" style="padding: 6px 12px; font-size: 12px; background: #27ae60;">
                        <i class="fas fa-unlock"></i> Kilidi Aç
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Render locked users table
function renderLockedUsers(users) {
    const tbody = document.getElementById('locked-users-tbody');

    if (users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="padding: 40px; text-align: center; color: #27ae60;">
                    <i class="fas fa-check-circle" style="font-size: 24px; margin-bottom: 10px;"></i>
                    <div>Kilitli kullanıcı bulunamadı.</div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = users.map(user => {
        const isLocked = user.locked_until && new Date(user.locked_until) > new Date();
        const statusBadge = isLocked
            ? '<span style="background: #e74c3c; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px;">🔒 KİLİTLİ</span>'
            : '<span style="background: #f39c12; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px;">⚠️ DENEMELİ</span>';

        const remainingTime = isLocked ? formatDuration(user.minutes_remaining) : '-';

        return `
            <tr style="border-bottom: 1px solid #ecf0f1;">
                <td style="padding: 12px; font-weight: 600;">${user.username}</td>
                <td style="padding: 12px;">${user.name || '-'}</td>
                <td style="padding: 12px;">${user.email || '-'}</td>
                <td style="padding: 12px; text-align: center;">${user.failed_login_attempts}</td>
                <td style="padding: 12px;">${formatDateTime(user.last_failed_login)}</td>
                <td style="padding: 12px;">${user.locked_until ? formatDateTime(user.locked_until) : '-'}</td>
                <td style="padding: 12px; text-align: center;">${remainingTime}</td>
                <td style="padding: 12px; text-align: center;">${statusBadge}</td>
                <td style="padding: 12px; text-align: center;">
                    <button onclick="unlockUser(${user.id}, '${user.username}')" class="submit-btn" style="padding: 6px 12px; font-size: 12px; background: #27ae60;">
                        <i class="fas fa-unlock"></i> Kilidi Aç
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Unlock IP address
function unlockIP(ipAddress) {
    if (!confirm(`${ipAddress} IP adresinin kilidini açmak istediğinize emin misiniz?`)) {
        return;
    }

    fetch('unlock-account.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'ip', ip_address: ipAddress })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert(data.message);
            refreshSecurityDashboard();
        } else {
            alert('Hata: ' + data.message);
        }
    })
    .catch(error => {
        alert('Bağlantı hatası: ' + error.message);
    });
}

// Unlock user account
function unlockUser(userId, username) {
    if (!confirm(`${username} kullanıcısının kilidini açmak istediğinize emin misiniz?`)) {
        return;
    }

    fetch('unlock-account.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'user', user_id: userId })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert(data.message);
            refreshSecurityDashboard();
        } else {
            alert('Hata: ' + data.message);
        }
    })
    .catch(error => {
        alert('Bağlantı hatası: ' + error.message);
    });
}

// Format duration (minutes to human readable)
function formatDuration(minutes) {
    if (!minutes || minutes <= 0) return '-';

    minutes = Math.ceil(minutes);

    if (minutes < 60) {
        return `${minutes} dakika`;
    } else {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours} saat ${mins} dakika` : `${hours} saat`;
    }
}

// Format datetime
function formatDateTime(datetime) {
    if (!datetime) return '-';
    const date = new Date(datetime);
    return date.toLocaleString('tr-TR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Auto-refresh security dashboard every 30 seconds
function startSecurityDashboardAutoRefresh() {
    if (securityDashboardInterval) {
        clearInterval(securityDashboardInterval);
    }
    securityDashboardInterval = setInterval(refreshSecurityDashboard, 30000);
}

function stopSecurityDashboardAutoRefresh() {
    if (securityDashboardInterval) {
        clearInterval(securityDashboardInterval);
        securityDashboardInterval = null;
    }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on security dashboard page
    const currentHash = window.location.hash;
    if (currentHash === '#guvenlik-dashboard') {
        refreshSecurityDashboard();
        startSecurityDashboardAutoRefresh();
    }
});

// Listen for hash changes to start/stop auto-refresh
window.addEventListener('hashchange', function() {
    const currentHash = window.location.hash;
    if (currentHash === '#guvenlik-dashboard') {
        refreshSecurityDashboard();
        startSecurityDashboardAutoRefresh();
    } else {
        stopSecurityDashboardAutoRefresh();
    }
});
