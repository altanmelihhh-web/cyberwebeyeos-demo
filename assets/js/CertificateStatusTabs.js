// SSL Durumları Tab JavaScript Kodları

// SSL sorgulama yöntemini insan okur etikete çevirir.
// Sadece 3 etiket: Public / Lokal DNS / F5
function sslMethodLabel(method) {
    const map = {
        'crt_sh'        : { text: 'Public',    color: '#2563eb', bg: '#dbeafe' },
        'stream_socket' : { text: 'Lokal DNS', color: '#059669', bg: '#d1fae5' },
        'openssl_cli'   : { text: 'Lokal DNS', color: '#059669', bg: '#d1fae5' },
        'kept-existing' : { text: 'F5',        color: '#7c3aed', bg: '#ede9fe' },
        'f5-test'       : { text: 'F5',        color: '#7c3aed', bg: '#ede9fe' },
        'f5-prod'       : { text: 'F5',        color: '#7c3aed', bg: '#ede9fe' },
        'f5-drc'        : { text: 'F5',        color: '#7c3aed', bg: '#ede9fe' },
        'none'          : { text: '—',         color: '#6b7280', bg: '#f3f4f6' },
    };
    const m = map[method] || { text: method || '—', color: '#6b7280', bg: '#f3f4f6' };
    return `<span style="background: ${m.bg}; color: ${m.color}; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">${m.text}</span>`;
}

// "Kademe" bilgisi (1/2/3) varsa gösterilir.
function sslTierBadge(tier, source) {
    if (!tier) return '';
    const colors = { 1: '#2563eb', 2: '#059669', 3: '#7c3aed' };
    const labels = { 1: 'K1', 2: 'K2', 3: 'K3' };
    const c = colors[tier] || '#6b7280';
    return `<span title="Kademe ${tier} - ${source || ''}" style="display: inline-block; background: ${c}; color: white; font-size: 10px; padding: 2px 5px; border-radius: 3px; margin-right: 4px; font-weight: 700;">${labels[tier]}</span>`;
}

document.addEventListener('DOMContentLoaded', function() {
    // Alt tab'lar için event listener
    const subTabs = document.querySelectorAll('.sub-tab');
    subTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const subtab = this.getAttribute('data-subtab');

            // Aktif tab'ı değiştir
            subTabs.forEach(t => {
                t.classList.remove('active');
                t.style.borderBottom = 'none';
                t.style.fontWeight = 'normal';
                t.style.color = '#666';
            });

            this.classList.add('active');
            this.style.borderBottom = '3px solid ' + (subtab === 'failed-certs' ? '#f5576c' : subtab === 'success-certs' ? '#28a745' : '#6c757d');
            this.style.fontWeight = '600';
            this.style.color = subtab === 'failed-certs' ? '#f5576c' : subtab === 'success-certs' ? '#28a745' : '#6c757d';

            // İçeriği göster/gizle
            document.querySelectorAll('.sub-tab-content').forEach(content => {
                content.style.display = 'none';
            });
            document.getElementById(subtab).style.display = 'block';
        });
    });
});

// SSL durumlarını yükle
function loadSSLStatus() {
    fetch('get-certificate-status.php')
        .then(response => response.json())
        .then(data => {
            if (!data.success) {
                console.error('SSL status error:', data.error);
                return;
            }

            // İstatistikleri güncelle
            document.getElementById('stat-total').textContent = data.stats.total;
            document.getElementById('stat-success').textContent = data.stats.success;
            document.getElementById('stat-failed').textContent = data.stats.failed;
            document.getElementById('stat-pending').textContent = data.stats.pending;
            document.getElementById('last-update-time').textContent = data.stats.last_update || 'Henüz güncellenmedi';

            // Başarısız sertifikaları doldur
            const failedTable = document.getElementById('failed-table-body');
            if (data.failed.length === 0) {
                failedTable.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #28a745;"><i class="fas fa-check-circle"></i> Harika! Hiç hatalı sertifika yok.</td></tr>';
            } else {
                failedTable.innerHTML = data.failed.map(cert => `
                    <tr>
                        <td>${cert.name}</td>
                        <td><code>${cert.domain}</code></td>
                        <td>${cert.query_time || 'Henüz denenmedi'}</td>
                        <td><span style="color: #dc3545; font-size: 12px;"><i class="fas fa-exclamation-circle"></i> SSL sorgulaması başarısız</span></td>
                        <td>${cert.responsible || '<span style="color: #dc3545;">Atanmamış</span>'}</td>
                        <td>
                            <button class="action-btn refresh-btn" onclick="refreshCertificateFromSSL('${cert.id}')" title="Tekrar Dene">
                                <i class="fas fa-sync-alt"></i>
                            </button>
                            <button class="action-btn edit-btn" onclick="editCertificate('${cert.id}')" title="Manuel Düzenle">
                                <i class="fas fa-edit"></i>
                            </button>
                        </td>
                    </tr>
                `).join('');
            }

            // Başarılı sertifikaları doldur
            const successTable = document.getElementById('success-table-body');
            if (data.successful.length === 0) {
                successTable.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px;">Henüz başarılı güncelleme yok.</td></tr>';
            } else {
                successTable.innerHTML = data.successful.map(cert => `
                    <tr>
                        <td>${cert.name}</td>
                        <td><code>${cert.domain}</code></td>
                        <td>${cert.query_time || '-'}</td>
                        <td>${cert.start_date || '-'} → ${cert.end_date || '-'}</td>
                        <td><span class="${cert.days_remaining < 30 ? 'status-warning' : 'status-active'}">${cert.days_remaining} gün</span></td>
                        <td style="font-size: 11px;">${cert.issuer || 'N/A'}</td>
                    </tr>
                `).join('');
            }

            // Bekleyen sertifikaları doldur
            const pendingTable = document.getElementById('pending-table-body');
            if (data.pending.length === 0) {
                pendingTable.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px;">Tüm sertifikalar sisteme eklenmiş.</td></tr>';
            } else {
                pendingTable.innerHTML = data.pending.map(cert => `
                    <tr>
                        <td>${cert.name}</td>
                        <td><code>${cert.domain}</code></td>
                        <td>${cert.start_date || 'Yok'} → ${cert.end_date || 'Yok'}</td>
                        <td>${cert.responsible || '<span style="color: #dc3545;">Atanmamış</span>'}</td>
                        <td>
                            <button class="action-btn refresh-btn" onclick="refreshCertificateFromSSL('${cert.id}')" title="SSL Sorgula">
                                <i class="fas fa-sync-alt"></i>
                            </button>
                        </td>
                    </tr>
                `).join('');
            }
        })
        .catch(error => {
            console.error('Error loading SSL status:', error);
        });
}

// Tüm sertifikaları güncelle
let _sslUpdateInProgress = false;
let _sslUpdateTimerHandle = null;

function refreshAllCertificatesSSL() {
    if (_sslUpdateInProgress) {
        return; // zaten çalışıyor
    }
    if (!confirm('Tüm sertifikalar için SSL sorgulaması yapılacak. Bu işlem birkaç dakika sürebilir. Mevcut veriler ekranda kalmaya devam edecek. Devam edilsin mi?')) {
        return;
    }

    _sslUpdateInProgress = true;
    const btn = document.querySelector('#ssl-status .submit-btn');
    let originalBtnHTML = null;
    if (btn) {
        originalBtnHTML = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Güncelleniyor...';
    }

    // Inline durum paneli ekle/göster
    let statusBox = document.getElementById('ssl-update-status-box');
    if (!statusBox) {
        statusBox = document.createElement('div');
        statusBox.id = 'ssl-update-status-box';
        statusBox.style.cssText = 'margin: 10px 0 20px; padding: 12px 16px; background: #e3f2fd; border-left: 4px solid #2196f3; border-radius: 6px; color: #0d47a1; font-size: 14px; display: flex; align-items: center; gap: 10px;';
        const anchor = document.querySelector('#ssl-status .stats-container');
        if (anchor && anchor.parentNode) {
            anchor.parentNode.insertBefore(statusBox, anchor.nextSibling);
        } else {
            document.getElementById('ssl-status').prepend(statusBox);
        }
    }
    statusBox.style.display = 'flex';
    const startedAt = Date.now();
    const updateTimer = () => {
        const elapsed = Math.floor((Date.now() - startedAt) / 1000);
        const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
        const ss = String(elapsed % 60).padStart(2, '0');
        statusBox.innerHTML = `
            <i class="fas fa-sync-alt fa-spin" style="font-size: 18px;"></i>
            <div style="flex: 1;">
                <strong>Toplu SSL güncellemesi sürüyor…</strong>
                <div style="font-size: 12px; opacity: 0.85; margin-top: 3px;">
                    Geçen süre: <strong>${mm}:${ss}</strong> · Mevcut veriler tablolarda görüntülenmeye devam ediyor. İşlem bitince sayfa otomatik olarak yenilenecek.
                </div>
            </div>`;
    };
    updateTimer();
    _sslUpdateTimerHandle = setInterval(updateTimer, 1000);

    const finish = (type, message) => {
        _sslUpdateInProgress = false;
        if (_sslUpdateTimerHandle) {
            clearInterval(_sslUpdateTimerHandle);
            _sslUpdateTimerHandle = null;
        }
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalBtnHTML || '<i class="fas fa-sync-alt"></i> Tümünü Şimdi Güncelle';
        }
        const totalElapsed = Math.floor((Date.now() - startedAt) / 1000);
        const mm = String(Math.floor(totalElapsed / 60)).padStart(2, '0');
        const ss = String(totalElapsed % 60).padStart(2, '0');
        const colors = type === 'success'
            ? { bg: '#e8f5e9', border: '#2e7d32', text: '#1b5e20', icon: 'fa-check-circle' }
            : { bg: '#ffebee', border: '#c62828', text: '#b71c1c', icon: 'fa-exclamation-triangle' };
        statusBox.style.background = colors.bg;
        statusBox.style.borderLeftColor = colors.border;
        statusBox.style.color = colors.text;
        statusBox.innerHTML = `
            <i class="fas ${colors.icon}" style="font-size: 18px;"></i>
            <div style="flex: 1;">
                <strong>${type === 'success' ? 'Güncelleme tamamlandı' : 'Güncelleme başarısız'}</strong>
                <div style="font-size: 12px; opacity: 0.85; margin-top: 3px;">
                    Toplam süre: ${mm}:${ss} · ${message}
                </div>
            </div>
            <button onclick="document.getElementById('ssl-update-status-box').style.display='none'" style="background: transparent; border: none; color: inherit; cursor: pointer; font-size: 16px;">&times;</button>`;

        if (type === 'success') {
            loadSSLStatus();
            if (typeof loadCertificates === 'function') {
                loadCertificates();
            }
            if (typeof loadDashboardCertificates === 'function') {
                loadDashboardCertificates();
            }
        }
    };

    fetch('update-certificates.php?action=update')
        .then(response => {
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return response.json();
        })
        .then(data => {
            if (data.success) {
                finish('success', data.message || 'Tüm sertifikalar yeniden sorgulandı.');
            } else {
                finish('error', data.error || 'Bilinmeyen hata');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            finish('error', 'Sunucuya ulaşılamadı veya işlem zaman aşımına uğradı: ' + error.message);
        });
}

// Tek bir sertifikayı SSL sorgula
function refreshCertificateFromSSL(certId) {
    if (!confirm('Bu sertifika için SSL sorgulaması yapılacak. Devam etmek istiyor musunuz?')) {
        return;
    }

    // Loading göstergesi
    const btn = event.target.closest('button');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spin fa-spinner"></i>';
    btn.disabled = true;

    fetch('refresh-certificate.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id: certId })
    })
    .then(response => response.json())
    .then(data => {
        btn.innerHTML = originalHTML;
        btn.disabled = false;

        if (data.success) {
            alert('Sertifika başarıyla güncellendi!');
            loadSSLStatus();
            if (typeof loadCertificates === 'function') {
                loadCertificates();
            }
        } else {
            alert('Hata: ' + (data.error || 'Bilinmeyen hata'));
        }
    })
    .catch(error => {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
        console.error('Error:', error);
        alert('Güncelleme sırasında hata oluştu.');
    });
}

// SSL Status tab'ı görünür olduğunda verileri yükle
const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
        if (mutation.target.id === 'ssl-status' && mutation.target.classList.contains('active')) {
            loadSSLStatus();
        }
    });
});

const sslStatusTab = document.getElementById('ssl-status');
if (sslStatusTab) {
    observer.observe(sslStatusTab, {
        attributes: true,
        attributeFilter: ['class']
    });
}
