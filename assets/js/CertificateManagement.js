// ========================================
// 4. SERTİFİKA YÖNETİMİ (Certificate Management)
// ========================================

// ── Debug loglama — her işlemi konsola yazar ───────────────────────────────
function certLog(tag, msg, data) {
    var style = 'background:#1a1a2e;color:#00d4ff;padding:2px 6px;border-radius:3px;font-weight:bold;';
    if (data !== undefined) {
        console.log('%c[CERT:' + tag + ']%c ' + msg, style, '', data);
    } else {
        console.log('%c[CERT:' + tag + ']%c ' + msg, style, '');
    }
}

// ── Tanı fonksiyonu — console'dan certDiag() ile çağrılır ────────────────
window.certDiag = function() {
    var style  = 'background:#0d4f3c;color:#2ecc71;padding:2px 6px;border-radius:3px;font-weight:bold;';
    var styleE = 'background:#4f0d0d;color:#e74c3c;padding:2px 6px;border-radius:3px;font-weight:bold;';
    var log = function(ok, msg, val) {
        var s = ok ? style : styleE;
        var icon = ok ? '✅' : '❌';
        if (val !== undefined) console.log('%c[CERT-DIAG]%c ' + icon + ' ' + msg, s, '', val);
        else                   console.log('%c[CERT-DIAG]%c ' + icon + ' ' + msg, s, '');
    };
    console.group('=== CERT DIAGNOSTIC ===');

    var modal = document.getElementById('add-certificate-modal');
    log(!!modal, 'add-certificate-modal DOM\'da var mı?', modal ? modal.id : 'BULUNAMADI');
    if (modal) {
        var disp = getComputedStyle(modal).display;
        log(true, 'Modal computed display (kapalıyken "none" olmalı)', disp);
        log(true, 'Modal inline style.display', modal.style.display || '(boş)');
    }

    var form = document.getElementById('add-certificate-form');
    log(!!form, 'add-certificate-form DOM\'da var mı?', form ? form.id : 'BULUNAMADI');
    if (form) {
        log(typeof form.onsubmit === 'function', 'form.onsubmit tanımlı mı?',
            form.onsubmit ? form.onsubmit.toString().slice(0, 80) + '...' : 'null');
    }

    log(typeof window.openModal === 'function', 'window.openModal tanımlı mı?');
    if (typeof window.openModal === 'function') {
        var src = window.openModal.toString().slice(0, 120);
        log(true, 'openModal kaynağı (ilk 120 karakter)', src);
        log(typeof window.originalOpenModal === 'function',
            'window.originalOpenModal var mı? (InlinePages wrapper aktifse olur)');
    }

    var closeBtn = document.querySelector('#add-certificate-modal .close-modal');
    log(!!closeBtn, 'Modal kapat butonu var mı?');

    var submitBtn = document.querySelector('#add-certificate-form .submit-btn');
    log(!!submitBtn, 'Form submit butonu var mı?');

    // openModal simüle et
    if (modal && typeof window.openModal === 'function') {
        console.group('→ openModal simülasyonu (AÇIP HEMEN KAPATIYOR)');
        window.openModal('add-certificate-modal');
        var afterDisp = getComputedStyle(modal).display;
        log(afterDisp === 'block', 'openModal sonrası display', afterDisp);
        if (afterDisp === 'block') {
            window.closeModal('add-certificate-modal');
            console.log('Modal kapatıldı — simülasyon tamamlandı');
        }
        console.groupEnd();
    }

    console.groupEnd();
};
// ─────────────────────────────────────────────────────────────────────────────

// Sertifika görüntüleme fonksiyonu — noreferrer kaldırıldı; window.close() bloklamaması için
function viewCertificate(id) {
    certLog('VIEW', 'Önizleme açılıyor', id);
    const url = '_api/preview-certificates.html?id=' + encodeURIComponent(id);
    const w = window.open(url, '_blank', 'noopener');
    if (!w) {
        certLog('VIEW', 'Popup engellendi, aynı sekmede açılıyor');
        window.location.href = url;
    } else {
        certLog('VIEW', 'Yeni sekme açıldı ✅');
    }
}

function loadCertificates(retryCount = 0) {
    console.log("loadCertificates called (retry: " + retryCount + ")");

    // Tüm sertifika tablosunu seç
    const certificatesTable = document.querySelector('#all-certificates table tbody');
    const expiringTable = document.querySelector('#expiring-soon table tbody');

    if (!certificatesTable || !expiringTable) {
        if (retryCount < 5) {
            console.error("Certificate tables not found, retrying in 200ms... (attempt " + (retryCount + 1) + "/5)");
            // Tablolar henuz render edilmemisse, kisa bir gecikmeyle tekrar dene
            setTimeout(() => loadCertificates(retryCount + 1), 200);
        } else {
            console.error("Certificate tables not found after 5 retries. Giving up.");
        }
        return;
    }
    
    // Tablolari temizle ve yükleme göstergesi göster
    certificatesTable.innerHTML = `
        <tr>
            <td colspan="10" class="text-center">
                <i class="fas fa-sync fa-spin"></i> Sertifikalar yükleniyor...
            </td>
        </tr>
    `;

    expiringTable.innerHTML = `
        <tr>
            <td colspan="7" class="text-center">
                <i class="fas fa-sync fa-spin"></i> Sertifikalar yükleniyor...
            </td>
        </tr>
    `;
    
    // Sertifikalari almak için Ajax istegi
    fetch('get-certificates.php')
        .then(response => {
            console.log("Response status:", response.status);
            if (!response.ok) {
                throw new Error('Network response was not ok: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            console.log("Certificate data received:", data);
            
            // Tablolari temizle
            certificatesTable.innerHTML = '';
            expiringTable.innerHTML = '';
            
            // Hata mesaji var ise
            if (data.error) {
                certificatesTable.innerHTML = `
                    <tr>
                        <td colspan="10" class="text-center">
                            Hata: ${data.error}
                        </td>
                    </tr>
                `;
                expiringTable.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center">
                            Hata: ${data.error}
                        </td>
                    </tr>
                `;
                return;
            }

            // Sertifika bulunamadi ise
            if (data.length === 0) {
                certificatesTable.innerHTML = `
                    <tr>
                        <td colspan="10" class="text-center">
                            Hiç sertifika bulunamadı
                        </td>
                    </tr>
                `;
                expiringTable.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center">
                            Yakında sona erecek sertifika bulunamadı
                        </td>
                    </tr>
                `;
                return;
            }
            
            // Global cache — takvim ve zincir doğrulama için
            window._allCertificatesCache = data;

            // Bitiş tarihine göre sırala (en yakın bitiş üstte)
            data.sort((a, b) => (a.endDate || '').localeCompare(b.endDate || ''));

            // Sertifikalari listele
            data.forEach(cert => {
                // Durum sinifini belirle
                let statusClass = 'status-active';
                let statusText = 'Aktif';
                
                if (cert.status === 'critical') {
                    statusClass = 'status-danger';
                    statusText = cert.daysRemaining + ' Gün Kaldı';
                } else if (cert.status === 'warning') {
                    statusClass = 'status-warning';
                    statusText = cert.daysRemaining + ' Gün Kaldı';
                } else if (cert.status === 'expired') {
                    statusClass = 'status-expired';
                    statusText = 'Süresi Dolmuş';
                }
                
                // Yaşam döngüsü durumu format ve renk
                let lifecycleClass = 'status-active';
                let lifecycleText = 'Aktif';

                if (cert.lifecycleStatus) {
                    if (cert.lifecycleStatus === 'danger') {
                        lifecycleClass = 'status-danger';
                    } else if (cert.lifecycleStatus === 'warning') {
                        lifecycleClass = 'status-warning';
                    } else if (cert.lifecycleStatus === 'info') {
                        lifecycleClass = 'status-info';
                    } else if (cert.lifecycleStatus === 'success') {
                        lifecycleClass = 'status-success';
                    }
                    lifecycleText = cert.lifecycleMessage || lifecycleText;
                }

                // Tüm sertifikalar tablosuna ekle
                certificatesTable.innerHTML += `
                    <tr>
                        <td>${cert.name}</td>
                        <td>${cert.domain}</td>
                        <td>${cert.startDateFormatted}</td>
                        <td>${cert.changeDateFormatted && cert.changeDateFormatted !== '-' ?
                            cert.changeDateFormatted + (cert.changeTime ? ' ' + cert.changeTime : '') :
                            '-'}</td>
                        <td>${cert.endDateFormatted}</td>
                        <td><span class="status ${statusClass}">${statusText}</span></td>
                        <td><span class="status ${lifecycleClass}" title="${lifecycleText}">${lifecycleText}</span></td>
                        <td>${cert.responsible || '<span style="color: red; font-weight: bold;">Atanmamis!</span>'}</td>
                        <td title="${cert.notes || ''}">
                            ${cert.notes ? (cert.notes.length > 15 ? cert.notes.substring(0, 15) + '...' : cert.notes) : '-'}
                        </td>
                        <td>
                            <button class="action-btn view-btn" onclick="viewCertificate('${cert.id}')" title="Görüntüle">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn edit-btn" onclick="editCertificate('${cert.id}')" title="Düzenle">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn refresh-btn" onclick="refreshCertificateFromSSL('${cert.id}')" title="SSL Bilgilerini Yenile">
                                <i class="fas fa-sync-alt"></i>
                            </button>
                            <button class="action-btn delete-btn" onclick="deleteCertificate('${cert.id}')" title="Sil">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
                
                // Yakinda sona erecek sertifikalar tablosuna ekle (7 sütun: Ad, Domain, Bitiş, Kalan, Sorumlu, Not, İşlemler)
                if (cert.status === 'critical' || cert.status === 'warning') {
                    expiringTable.innerHTML += `
                        <tr>
                            <td>${cert.name || '-'}</td>
                            <td>${cert.domain}</td>
                            <td>${cert.endDateFormatted}</td>
                            <td><span class="status ${statusClass}">${cert.daysRemaining} Gün</span></td>
                            <td>${cert.responsible || '<span style="color:#dc3545;">Atanmamış</span>'}</td>
                            <td title="${cert.notes || ''}">${cert.notes ? (cert.notes.length > 15 ? cert.notes.substring(0, 15) + '...' : cert.notes) : '-'}</td>
                            <td>
                                <button class="action-btn view-btn" onclick="viewCertificate('${cert.id}')" title="Görüntüle"><i class="fas fa-eye"></i></button>
                                <button class="action-btn edit-btn" onclick="editCertificate('${cert.id}')" title="Düzenle"><i class="fas fa-edit"></i></button>
                                <button class="action-btn refresh-btn" onclick="refreshCertificateFromSSL('${cert.id}')" title="SSL Bilgilerini Yenile"><i class="fas fa-sync-alt"></i></button>
                            </td>
                        </tr>
                    `;
                }
            });
        })
        .catch(error => {
            console.error("Error fetching certificates:", error);
            certificatesTable.innerHTML = `
                <tr>
                    <td colspan="10" class="text-center">
                        Sertifikalar yüklenirken hata oluştu: ${error.message}
                    </td>
                </tr>
            `;
            expiringTable.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">
                        Sertifikalar yüklenirken hata oluştu: ${error.message}
                    </td>
                </tr>
            `;
        });
}

// Sertifika arama — tablo satırlarını filtrele
function searchCertificates() {
    const input = document.getElementById('certificate-search-input');
    if (!input) return;
    const query = input.value.toLowerCase().trim();
    const rows = document.querySelectorAll('#all-certificates table tbody tr');
    rows.forEach(row => {
        row.style.display = query === '' || row.textContent.toLowerCase().includes(query) ? '' : 'none';
    });
}

function renewCertificate(id) {
    certLog('RENEW', 'Yenileme başlıyor', id);
    
    // Mevcut sertifika bilgilerini almak için get-certificates.php kullan
    fetch('get-certificates.php')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Sertifikayi bul
            const certificate = data.find(cert => cert.id === id);
            if (!certificate) {
                throw new Error('Sertifika bulunamadi');
            }
            
            // Bitis tarihini bir yil ilerlet
            const endDate = new Date(certificate.endDate);
            const newEndDate = new Date(endDate);
            newEndDate.setFullYear(newEndDate.getFullYear() + 1);
            
            // Varsayilan saat degeri
            const defaultTime = "10:00";
            
            // Güncellenecek veriyi hazirla
            const updateData = {
                id: id,
                name: certificate.name,
                domain: certificate.domain,
                service: certificate.service || '',
                startDate: certificate.startDate,
                endDate: formatDateForInput(newEndDate),
                responsible: certificate.responsible || '',
                changeDate: '',
                changeTime: defaultTime,
                notes: certificate.notes || 'Otomatik yenileme: ' + new Date().toLocaleString()
            };
            
            // Mevcut edit-certificate.php kullanarak güncelle
            return fetch('edit-certificate.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                alert('Sertifika basariyla yenilendi.');
                // Sayfalari güncelle
                loadDashboardCertificates();
                if (document.getElementById('certificates-page').style.display !== 'none') {
                    loadCertificates();
                }
            } else {
                alert('Hata: ' + data.error);
            }
        })
        .catch(error => {
            certLog('RENEW', '❌ HATA', error.message);
            alert('Sertifika yenilenirken hata olustu: ' + error.message);
        });
}

// SSL sorgulamasıyla sertifika yenileme
function refreshCertificateFromSSL(id) {
    console.log('Refreshing certificate from SSL:', id);

    if (!confirm('Bu sertifikanın SSL bilgileri domain üzerinden sorgulanacak ve tarihler otomatik güncellenecektir. Devam etmek istiyor musunuz?')) {
        return;
    }

    // Loading göstergesi
    const loadingMsg = 'SSL sertifika bilgileri sorgulanıyor, lütfen bekleyin...';

    // Geçici bir yükleme mesajı göster
    if (typeof showNotification === 'function') {
        showNotification(loadingMsg, 'info');
    } else {
        console.log(loadingMsg);
    }

    // SSL bilgilerini sorgula ve güncelle
    fetch('refresh-certificate.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id: id })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            alert('Sertifika SSL bilgileri başarıyla güncellendi!\n\n' +
                  'Domain: ' + (data.certificate.domain || '') + '\n' +
                  'Başlangıç: ' + (data.certificate.startDate || '') + '\n' +
                  'Bitiş: ' + (data.certificate.endDate || '') + '\n' +
                  'Issuer: ' + (data.certificate.ssl_issuer || '') + '\n' +
                  'Self-Signed: ' + (data.certificate.ssl_self_signed ? 'Evet' : 'Hayır'));

            // Sayfaları güncelle
            loadDashboardCertificates();
            if (document.getElementById('certificates-page') &&
                document.getElementById('certificates-page').style.display !== 'none') {
                loadCertificates();
            }
        } else {
            alert('Hata: ' + (data.error || 'Bilinmeyen hata'));
        }
    })
    .catch(error => {
        console.error('Error refreshing certificate:', error);
        alert('SSL sorgulaması sırasında hata oluştu: ' + error.message);
    });
}

// Tarih formatini HTML input için ayarlama yardimci fonksiyonu
function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// "Yeni Sertifika Ekle" butonu — modal'ı sıfırlayarak add modunda açar.
// Eğer önceki işlem edit modunda bıraktıysa form.onsubmit'i düzeltir.
function openAddCertificateModal() {
    certLog('ADD', 'Yeni sertifika modal açılıyor');
    const modal = document.getElementById('add-certificate-modal');
    certLog('ADD', 'Modal elementi', modal ? '✅ bulundu id=' + modal.id : '❌ BULUNAMADI');
    const modalTitle = modal ? modal.querySelector('.modal-title') : null;
    const form = document.getElementById('add-certificate-form');
    certLog('ADD', 'Form elementi', form ? '✅' : '❌ BULUNAMADI');
    const submitBtn = form ? form.querySelector('.submit-btn') : null;

    if (modalTitle) modalTitle.textContent = 'Yeni Sertifika Ekle';
    if (submitBtn)  submitBtn.textContent  = 'Sertifika Ekle';
    if (form)       form.reset();

    setupCertificateForm();

    certLog('ADD', 'openModal çağrılıyor');
    openModal('add-certificate-modal');
    const afterDisplay = modal ? getComputedStyle(modal).display : 'N/A';
    certLog('ADD', 'openModal sonrası display=' + afterDisplay + (afterDisplay === 'block' ? ' ✅' : ' ❌ AÇILMADI'));
}

function editCertificate(id) {
    certLog('EDIT', 'Düzenleme başlıyor', id);

    const modal = document.getElementById('add-certificate-modal');
    certLog('EDIT', 'Modal', modal ? '✅ id=' + modal.id : '❌ BULUNAMADI - bu kritik!');

    const modalTitle = document.querySelector('#add-certificate-modal .modal-title');
    if (modalTitle) modalTitle.textContent = 'Sertifika Düzenle';
    const submitBtn = document.querySelector('#add-certificate-form .submit-btn');
    if (submitBtn) submitBtn.textContent = 'Sertifikayı Güncelle';

    certLog('EDIT', 'openModal çağrılıyor...');
    openModal('add-certificate-modal');
    const afterDisplay = modal ? getComputedStyle(modal).display : 'N/A';
    certLog('EDIT', 'openModal sonrası display=' + afterDisplay + (afterDisplay === 'block' ? ' ✅' : ' ❌ AÇILMADI'));

    // Submit handler'ı değiştir — cloneNode yerine doğrudan onsubmit ataması
    // (cloneNode programatik input değerlerini/listener'ları taşımadığı için güvensizdi).
    const form = document.getElementById('add-certificate-form');
    if (form) {
        form.onsubmit = function(e) {
            e.preventDefault();
            updateCertificate(id);
        };
    }

    fetch('get-certificates.php')
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            if (!Array.isArray(data)) {
                throw new Error(data && data.error ? data.error : 'Sertifika listesi alınamadı');
            }
            const certificate = data.find(cert => cert.id === id);
            if (!certificate) throw new Error('Sertifika bulunamadı');

            const setVal = (elId, val) => {
                const el = document.getElementById(elId);
                if (el) el.value = val;
            };

            setVal('certificate-name', certificate.name || '');
            setVal('certificate-domain', certificate.domain || '');
            setVal('certificate-service', certificate.service || '');

            // Tarihler — geçersizse boş bırak
            if (certificate.startDate) {
                const sd = new Date(certificate.startDate);
                if (!isNaN(sd.getTime())) setVal('certificate-start-date', formatDateForInput(sd));
            }
            if (certificate.endDate) {
                const ed = new Date(certificate.endDate);
                if (!isNaN(ed.getTime())) setVal('certificate-end-date', formatDateForInput(ed));
            }

            setVal('certificate-responsible', certificate.responsible || '');

            const changeDate = (certificate.changeDate && certificate.changeDate.trim() !== '') ? certificate.changeDate : '';
            setVal('certificate-change-date', changeDate);

            const changeTime = (certificate.changeTime && certificate.changeTime.trim() !== '') ? certificate.changeTime : '10:00';
            setVal('certificate-change-time', changeTime);

            setVal('certificate-notes', certificate.notes || '');
            setVal('certificate-lifecycle', certificate.lifecycle || 'active');
            setVal('certificate-ticket-number', certificate.ticketNumber || '');
            setVal('certificate-customer-contact', certificate.customerContact || '');
        })
        .catch(error => {
            console.error('Error fetching certificate details:', error);
            alert('Sertifika bilgileri alınırken hata oluştu: ' + error.message);
        });
}

function updateCertificate(id) {
    // Form verilerini al
    const name = document.getElementById('certificate-name').value;
    const domain = document.getElementById('certificate-domain').value;
    const service = document.getElementById('certificate-service').value;
    const startDate = document.getElementById('certificate-start-date').value;
    const endDate = document.getElementById('certificate-end-date').value;
    const responsible = document.getElementById('certificate-responsible').value;
    
    // Degisim tarihi ve saati alanlari için özel işlem
    let changeDate = '';
    const changeDateElement = document.getElementById('certificate-change-date');
    if (changeDateElement) {
        changeDate = changeDateElement.value || '';
    }
    
    let changeTime = '';
    const changeTimeElement = document.getElementById('certificate-change-time');
    if (changeTimeElement && changeDate) {
        changeTime = changeTimeElement.value || '10:00';
    }
    
    let notes = '';
    const notesElement = document.getElementById('certificate-notes');
    if (notesElement) {
        notes = notesElement.value || '';
    }

    const lifecycleEl = document.getElementById('certificate-lifecycle');
    const lifecycle = lifecycleEl ? (lifecycleEl.value || 'active') : 'active';

    const ticketEl = document.getElementById('certificate-ticket-number');
    const ticketNumber = ticketEl ? (ticketEl.value || '') : '';

    const contactEl = document.getElementById('certificate-customer-contact');
    const customerContact = contactEl ? (contactEl.value || '') : '';

    // Verileri dogrula
    if (!name || !domain || !startDate || !endDate) {
        alert('Lütfen tüm zorunlu alanlari doldurun.');
        return;
    }

    // Gönderme düğmesini güncelle
    const submitButton = document.querySelector('#add-certificate-form .submit-btn');
    const originalButtonText = submitButton.textContent;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Güncelleniyor...';
    submitButton.disabled = true;

    // Sertifikayi güncelle
    fetch('edit-certificate.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            id: id,
            name: name,
            domain: domain,
            service: service,
            startDate: startDate,
            endDate: endDate,
            responsible: responsible,
            changeDate: changeDate,
            changeTime: changeTime,
            notes: notes,
            lifecycle: lifecycle,
            ticketNumber: ticketNumber,
            customerContact: customerContact
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        submitButton.textContent = originalButtonText;
        submitButton.disabled = false;
        
        if (data.success) {
            alert('Sertifika basariyla güncellendi.');
            closeModal('add-certificate-modal');
            loadCertificates();
            
            // Formu sifirla ve basligi degistir
            document.getElementById('add-certificate-form').reset();
            document.querySelector('#add-certificate-modal .modal-title').textContent = 'Yeni Sertifika Ekle';
            document.querySelector('#add-certificate-form .submit-btn').textContent = 'Sertifika Ekle';
            
            // Form submit isleyicisini geri al
            setupCertificateForm();
        } else {
            alert('Hata: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Error updating certificate:', error);
        submitButton.textContent = originalButtonText;
        submitButton.disabled = false;
        alert('Sertifika güncellenirken hata olustu: ' + error.message);
    });
}

// Sertifika silme fonksiyonu
function deleteCertificate(id) {
    certLog('DELETE', 'Silme isteği', id);
    if (confirm('Bu sertifikayi silmek istediginizden emin misiniz?')) {
        certLog('DELETE', 'Onaylandı, istek gönderiliyor → delete-certificate.php?id=' + id);
        fetch('delete-certificate.php?id=' + id, {
            method: 'POST'
        })
        .then(response => {
            certLog('DELETE', 'HTTP yanıtı', response.status);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            certLog('DELETE', 'Sunucu yanıtı', data);
            if (data.success) {
                loadCertificates();
                alert('Sertifika basariyla silindi.');
            } else {
                alert('Hata: ' + data.error);
            }
        })
        .catch(error => {
            certLog('DELETE', '❌ HATA', error.message);
            alert('Sertifika silinirken hata olustu: ' + error.message);
        });
    } else {
        certLog('DELETE', 'İptal edildi');
    }
}

// Basitlestirilmis sertifika form isleyicisi
function setupCertificateForm() {
    certLog('FORM-SETUP', 'Form kurulumu başlıyor');
    
    // Formu dogrudan seç
    const form = document.getElementById('add-certificate-form');
    
    if (!form) {
        console.error("Sertifika formu bulunamadi!");
        return;
    }
    
    console.log("Sertifika formu bulundu:", form);
    
    // Submit butonunu kontrol et
    const submitButton = form.querySelector('.submit-btn');
    if (!submitButton) {
        console.error("Submit butonu bulunamadi!");
    } else {
        console.log("Submit butonu bulundu:", submitButton);
    }
    
    // Dogrudan submit olayi ekle
    form.onsubmit = function(e) {
        e.preventDefault();
        certLog('FORM-SUBMIT', 'Form gönderme tetiklendi');
        
        try {
            // Form verilerini al
            const name = document.getElementById('certificate-name').value;
            const domain = document.getElementById('certificate-domain').value;
            const service = document.getElementById('certificate-service').value;
            const startDate = document.getElementById('certificate-start-date').value;
            const endDate = document.getElementById('certificate-end-date').value;
            const responsible = document.getElementById('certificate-responsible').value;
            
            console.log("Temel form verileri alindi:", { name, domain, service, startDate, endDate, responsible });
            
            // Degisim tarihi ve saati için özel işlem
            let changeDate = '';
            const changeDateElement = document.getElementById('certificate-change-date');
            if (changeDateElement) {
                changeDate = changeDateElement.value || '';
                console.log("Degisim tarihi bulundu:", changeDate);
            } else {
                console.warn("certificate-change-date elementi bulunamadi");
            }
            
            let changeTime = '';
            const changeTimeElement = document.getElementById('certificate-change-time');
            if (changeTimeElement && changeDate) {
                changeTime = changeTimeElement.value || '10:00';
                console.log("Degisim saati bulundu:", changeTime);
            } else if (!changeTimeElement) {
                console.warn("certificate-change-time elementi bulunamadi");
            }
            
            const notesElement = document.getElementById('certificate-notes');
            const notes = notesElement ? notesElement.value || '' : '';
            if (!notesElement) {
                console.warn("certificate-notes elementi bulunamadi");
            }

            // Yaşam döngüsü alanlari
            const lifecycleElement = document.getElementById('certificate-lifecycle');
            const lifecycle = lifecycleElement ? lifecycleElement.value || 'active' : 'active';

            const ticketNumberElement = document.getElementById('certificate-ticket-number');
            const ticketNumber = ticketNumberElement ? ticketNumberElement.value || '' : '';

            const customerContactElement = document.getElementById('certificate-customer-contact');
            const customerContact = customerContactElement ? customerContactElement.value || '' : '';
            
            // Verileri dogrula
            if (!name || !domain || !startDate || !endDate || !responsible) {
                alert('Lütfen tüm zorunlu alanlari doldurun.');
                return;
            }

            // Tarih validasyonu
            const startDateObj = new Date(startDate);
            const endDateObj = new Date(endDate);

            // Geçerli tarih mi kontrol et
            if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
                alert('Lütfen geçerli tarihler girin.');
                return;
            }

            // Bitis tarihi başlangıçtan sonra mi
            if (endDateObj <= startDateObj) {
                alert('Bitis tarihi başlangıç tarihinden sonra olmalidir.');
                return;
            }

            // Tarihlerin mantikli bir aralikta olup olmadigini kontrol et
            const year = startDateObj.getFullYear();
            if (year < 2000 || year > 2100) {
                alert('Lütfen geçerli bir başlangıç tarihi girin (2000-2100 arasi).');
                return;
            }

            const endYear = endDateObj.getFullYear();
            if (endYear < 2000 || endYear > 2100) {
                alert('Lütfen geçerli bir bitis tarihi girin (2000-2100 arasi).');
                return;
            }

            // Degisim tarihi varsa dogrula
            if (changeDate) {
                const changeDateObj = new Date(changeDate);
                if (isNaN(changeDateObj.getTime())) {
                    alert('Lütfen geçerli bir degisim tarihi girin.');
                    return;
                }

                const changeYear = changeDateObj.getFullYear();
                if (changeYear < 2000 || changeYear > 2100) {
                    alert('Lütfen geçerli bir degisim tarihi girin (2000-2100 arasi).');
                    return;
                }
            }

            // Degisim saati validasyonu
            if (changeTime && changeDate) {
                const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
                if (!timeRegex.test(changeTime)) {
                    alert('Lütfen geçerli bir saat girin (HH:MM formatinda, örn: 14:30).');
                    return;
                }
            }
            
            // Gönderme düğmesini güncelle
            const submitButton = form.querySelector('.submit-btn');
            if (!submitButton) {
                console.error("Submit butonu bulunamadi! Form gönderilemiyor.");
                return;
            }
            
            const originalButtonText = submitButton.textContent;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ekleniyor...';
            submitButton.disabled = true;
            
            certLog('FORM-SUBMIT', 'add-certificate.php\'e gönderiliyor', {name, domain, responsible, startDate, endDate});
            fetch('add-certificate.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: name,
                    domain: domain,
                    service: service,
                    startDate: startDate,
                    endDate: endDate,
                    responsible: responsible,
                    changeDate: changeDate,
                    changeTime: changeTime,
                    notes: notes,
                    lifecycle: lifecycle,
                    ticketNumber: ticketNumber,
                    customerContact: customerContact
                })
            })
            .then(response => {
                certLog('FORM-SUBMIT', 'HTTP yanıt', response.status);
                if (!response.ok) {
                    throw new Error('HTTP ' + response.status);
                }
                return response.json();
            })
            .then(data => {
                certLog('FORM-SUBMIT', 'Sunucu yanıtı', data);
                submitButton.textContent = originalButtonText;
                submitButton.disabled = false;
                if (data.success) {
                    alert('Sertifika basariyla eklendi.');
                    form.reset();
                    closeModal('add-certificate-modal');
                    loadCertificates();
                } else {
                    alert('Hata: ' + (data.error || 'Bilinmeyen bir hata olustu'));
                }
            })
            .catch(error => {
                certLog('FORM-SUBMIT', '❌ HATA', error.message);
                submitButton.textContent = originalButtonText;
                submitButton.disabled = false;
                alert('Sertifika eklenirken hata olustu: ' + error.message);
            });
        } catch (error) {
            console.error("Form isleme hatasi:", error);
            alert("Formda bir hata olustu: " + error.message);
        }
        
        return false;
    };
    
    console.log("Sertifika formu olay dinleyicisi ayarlandi");
    
    // Submit butonuna tiklama isleyici — e.preventDefault() ile native form-submit'in
    // çift tetiklenmesi (onclick → dispatchEvent → onsubmit + native → onsubmit) önlenir.
    if (submitButton) {
        submitButton.onclick = function(e) {
            e.preventDefault();
            const formValid = form.checkValidity();
            if (!formValid) {
                form.reportValidity();
            } else {
                const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                form.dispatchEvent(submitEvent);
            }
        };
    }
}

function loadDashboardCertificates() {
    console.log("Loading dashboard certificates summary");
    
    // Get certificate table
    const dashboardCertTable = document.querySelector('#dashboard-page .card .table-container table tbody');
    
    if (!dashboardCertTable) {
        console.error("Dashboard certificate table not found");
        return;
    }
    
    // Show loading indicator
    dashboardCertTable.innerHTML = `
        <tr>
            <td colspan="6" class="text-center">
                <i class="fas fa-sync fa-spin"></i> Sertifikalar yükleniyor...
            </td>
        </tr>
    `;
    
    // Get warnings container
    const warningsContainer = document.querySelector('.expiry-warning');
    if (warningsContainer) {
        const warningTitle = warningsContainer.querySelector('h4');
        warningsContainer.innerHTML = '';
        warningsContainer.appendChild(warningTitle);
        
        const loadingWarning = document.createElement('div');
        loadingWarning.className = 'warning-item';
        loadingWarning.innerHTML = `
            <div class="warning-content">
                <div class="warning-text"><i class="fas fa-sync fa-spin"></i> Bildirimler yükleniyor...</div>
            </div>
        `;
        warningsContainer.appendChild(loadingWarning);
    }
    
    // Fetch certificate data
    fetch('get-certificates.php?expiring=45')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            console.log("Dashboard certificate data received:", data);
            
            dashboardCertTable.innerHTML = '';
            
            if (data.error) {
                dashboardCertTable.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center">
                            Hata: ${data.error}
                        </td>
                    </tr>
                `;
                
                if (warningsContainer) {
                    const warningTitle = warningsContainer.querySelector('h4');
                    warningsContainer.innerHTML = '';
                    warningsContainer.appendChild(warningTitle);
                    
                    const errorWarning = document.createElement('div');
                    errorWarning.className = 'warning-item';
                    errorWarning.innerHTML = `
                        <div class="warning-content">
                            <div class="warning-text">Bildirimler yüklenirken hata olustu: ${data.error}</div>
                        </div>
                    `;
                    warningsContainer.appendChild(errorWarning);
                }
                
                return;
            }
            
            if (data.length === 0) {
                dashboardCertTable.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center">
                            45 gün içinde sona erecek sertifika bulunamadi
                        </td>
                    </tr>
                `;
                
                if (warningsContainer) {
                    const warningTitle = warningsContainer.querySelector('h4');
                    warningsContainer.innerHTML = '';
                    warningsContainer.appendChild(warningTitle);
                    
                    const noWarning = document.createElement('div');
                    noWarning.className = 'warning-item';
                    noWarning.innerHTML = `
                        <div class="warning-content">
                            <div class="warning-text">Su anda acil bir bildirim bulunmamaktadir.</div>
                        </div>
                    `;
                    warningsContainer.appendChild(noWarning);
                }
                
                return;
            }
            
            const expiringCerts = Array.isArray(data) ? 
                data.filter(cert => cert.status === 'critical' || cert.status === 'warning') : [];
            
            if (expiringCerts.length === 0) {
                dashboardCertTable.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center">
                            45 gün içinde sona erecek sertifika bulunamadi
                        </td>
                    </tr>
                `;
                
                if (warningsContainer) {
                    const warningTitle = warningsContainer.querySelector('h4');
                    warningsContainer.innerHTML = '';
                    warningsContainer.appendChild(warningTitle);
                    
                    const noWarning = document.createElement('div');
                    noWarning.className = 'warning-item';
                    noWarning.innerHTML = `
                        <div class="warning-content">
                            <div class="warning-text">Su anda acil bir bildirim bulunmamaktadir.</div>
                        </div>
                    `;
                    warningsContainer.appendChild(noWarning);
                }
                
                return;
            }
            
            expiringCerts.forEach(cert => {
                let statusClass = 'status-active';
                let statusText = 'Aktif';

                if (cert.status === 'critical') {
                    statusClass = 'status-danger';
                    statusText = cert.daysRemaining + ' Gün Kaldı';
                } else if (cert.status === 'warning') {
                    statusClass = 'status-warning';
                    statusText = cert.daysRemaining + ' Gün Kaldı';
                }

                dashboardCertTable.innerHTML += `
                    <tr>
                        <td>${cert.name || cert.domain}</td>
                        <td>${cert.endDateFormatted}</td>
                        <td>${cert.changeDateFormatted && cert.changeDateFormatted !== '-' ?
                            cert.changeDateFormatted + (cert.changeTime ? ' ' + cert.changeTime : '') :
                            '-'}</td>
                        <td><span class="status ${statusClass}">${statusText}</span></td>
                        <td>${cert.responsible || '-'}</td>
                        <td title="${cert.notes || ''}">
                            ${cert.notes ? (cert.notes.length > 20 ? cert.notes.substring(0, 20) + '...' : cert.notes) : '-'}
                        </td>
                    </tr>
                `;
            });

            // Dashboard özet bilgilerini güncelle
            const certLastUpdate = document.getElementById('cert-last-update');
            const certExpiringCount = document.getElementById('cert-expiring-count');

            if (certLastUpdate) {
                const now = new Date();
                const formatted = now.toLocaleString('tr-TR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                certLastUpdate.textContent = formatted;
            }

            if (certExpiringCount) {
                certExpiringCount.textContent = expiringCerts.length;
            }

            if (warningsContainer) {
                const warningTitle = warningsContainer.querySelector('h4');
                warningsContainer.innerHTML = '';
                warningsContainer.appendChild(warningTitle);
                generateDynamicWarnings(expiringCerts, warningsContainer);
            }
        })
        .catch(error => {
            console.error("Error fetching dashboard certificates:", error);
            
            dashboardCertTable.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">
                        Sertifikalar yüklenirken hata olustu: ${error.message}
                    </td>
                </tr>
            `;
            
            if (warningsContainer) {
                const warningTitle = warningsContainer.querySelector('h4');
                warningsContainer.innerHTML = '';
                warningsContainer.appendChild(warningTitle);
                
                const errorWarning = document.createElement('div');
                errorWarning.className = 'warning-item';
                errorWarning.innerHTML = `
                    <div class="warning-content">
                        <div class="warning-text">Bildirimler yüklenirken hata olustu: ${error.message}</div>
                    </div>
                `;
                warningsContainer.appendChild(errorWarning);
            }
        });
}

// Function to generate dynamic warnings
function generateDynamicWarnings(certificates, container) {
    if (!container || !certificates || certificates.length === 0) return;
    
    const warningTitle = container.querySelector('h4');
    container.innerHTML = '';
    if (warningTitle) container.appendChild(warningTitle);
    
    const criticalCerts = certificates.filter(cert => cert.daysRemaining <= 7);
    const highWarningCerts = certificates.filter(cert => cert.daysRemaining > 7 && cert.daysRemaining <= 14);
    const mediumWarningCerts = certificates.filter(cert => cert.daysRemaining > 14 && cert.daysRemaining <= 30);
    
    criticalCerts.forEach(cert => {
        const serviceName = cert.service || 'Belirtilmemis servis';
        const hasResponsible = cert.responsible && cert.responsible.trim() !== '';
        
        const warningItem = document.createElement('div');
        warningItem.className = 'warning-item warning-danger';
        warningItem.innerHTML = `
            <div class="warning-icon"><i class="fas fa-exclamation-triangle"></i></div>
            <div class="warning-content">
                <div class="warning-title">${cert.domain} sertifikasi ${cert.daysRemaining} gün içinde sona erecek!</div>
                <div class="warning-text">
                    ${cert.endDateFormatted} tarihinde sona erecek. 
                    ${cert.csr ? 'CSR Onayi bekliyor.' : 'Acil yenileme gerekiyor!'}
                    ${!hasResponsible ? '<strong>Dikkat: Sorumlu atanmamis!</strong>' : ''}
                </div>
            </div>
            <div class="warning-action">
                <button class="action-btn view-btn" onclick="viewCertificate('${cert.id}')">Incele</button>
                <button class="action-btn view-btn" onclick="renewCertificate('${cert.id}')">Yenile</button>
                ${!hasResponsible ? `<button class="action-btn edit-btn" onclick="assignResponsible('${cert.id}')">Üstlen</button>` : ''}
            </div>
        `;
        container.appendChild(warningItem);
    });
    
    highWarningCerts.forEach(cert => {
        const serviceName = cert.service || 'Belirtilmemis servis';
        const hasResponsible = cert.responsible && cert.responsible.trim() !== '';
        
        const warningItem = document.createElement('div');
        warningItem.className = 'warning-item warning-warning';
        warningItem.innerHTML = `
            <div class="warning-icon"><i class="fas fa-exclamation-circle"></i></div>
            <div class="warning-content">
                <div class="warning-title">${cert.domain} sertifikasi ${cert.daysRemaining} gün içinde sona erecek!</div>
                <div class="warning-text">
                    ${serviceName} servisinde kullanilan sertifika ${cert.endDateFormatted} tarihinde sona erecek.
                    ${!hasResponsible ? '<strong>Sorumlu atanmamis!</strong>' : ''}
                </div>
            </div>
            <div class="warning-action">
                <button class="action-btn view-btn" onclick="viewCertificate('${cert.id}')">Incele</button>
                <button class="action-btn view-btn" onclick="renewCertificate('${cert.id}')">Yenile</button>
                ${!hasResponsible ? `<button class="action-btn edit-btn" onclick="assignResponsible('${cert.id}')">Üstlen</button>` : ''}
            </div>
        `;
        container.appendChild(warningItem);
    });
    
    mediumWarningCerts.forEach(cert => {
        const serviceName = cert.service || 'Belirtilmemis servis';
        const hasResponsible = cert.responsible && cert.responsible.trim() !== '';
        
        if (!hasResponsible) {
            const warningItem = document.createElement('div');
            warningItem.className = 'warning-item warning-info';
            warningItem.innerHTML = `
                <div class="warning-icon"><i class="fas fa-info-circle"></i></div>
                <div class="warning-content">
                    <div class="warning-title">${cert.domain} sertifikasi için sorumlu atamasi gerekiyor</div>
                    <div class="warning-text">
                        ${serviceName} servisinde kullanilan sertifika ${cert.endDateFormatted} tarihinde sona erecek (${cert.daysRemaining} gün kaldı).
                        <strong>Henüz sorumlu atanmamis.</strong>
                    </div>
                </div>
                <div class="warning-action">
                    <button class="action-btn view-btn" onclick="viewCertificate('${cert.id}')">Incele</button>
                    <button class="action-btn edit-btn" onclick="assignResponsible('${cert.id}')">Sorumlu Ata</button>
                    <button class="action-btn view-btn" onclick="planRenewal('${cert.id}')">Planlama Yap</button>
                </div>
            `;
            container.appendChild(warningItem);
        }
    });
    
    if (container.querySelectorAll('.warning-item').length === 0) {
        const noWarningItem = document.createElement('div');
        noWarningItem.className = 'warning-item';
        noWarningItem.innerHTML = `
            <div class="warning-content">
                <div class="warning-text">Su anda acil bir bildirim bulunmamaktadir.</div>
            </div>
        `;
        container.appendChild(noWarningItem);
    }
}

// Function to assign responsible person to a certificate
function assignResponsible(id) {
    certLog('ASSIGN', 'Sorumlu atama başlıyor', id);
    
    const responsibleName = prompt('Sertifika sorumlusu olarak atamak istediginiz kisinin adini girin:');
    
    if (!responsibleName) {
        return;
    }
    
    fetch('get-certificates.php')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            const certificate = data.find(cert => cert.id === id);
            if (!certificate) {
                throw new Error('Sertifika bulunamadi');
            }
            
            const updateData = {
                id: id,
                name: certificate.name,
                domain: certificate.domain,
                service: certificate.service || '',
                startDate: certificate.startDate,
                endDate: certificate.endDate,
                responsible: responsibleName
            };
            
            return fetch('edit-certificate.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                alert('Sertifika sorumlusu basariyla güncellendi.');
                loadDashboardCertificates();
                if (document.getElementById('certificates-page').style.display !== 'none') {
                    loadCertificates();
                }
            } else {
                alert('Hata: ' + data.error);
            }
        })
        .catch(error => {
            certLog('ASSIGN', '❌ HATA', error.message);
            alert('Sertifika sorumlusu güncellenirken hata olustu: ' + error.message);
        });
}

function planRenewal(id) {
    certLog('PLAN', 'Yenileme planı başlıyor', id);
    
    fetch('get-certificates.php')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            const certificate = data.find(cert => cert.id === id);
            if (!certificate) {
                throw new Error('Sertifika bulunamadi');
            }
            
            certLog('PLAN', 'plan-renewal-modal açılıyor');
            openModal('plan-renewal-modal');
            var planModalDisp = getComputedStyle(document.getElementById('plan-renewal-modal') || document.createElement('div')).display;
            certLog('PLAN', 'plan-renewal-modal display=' + planModalDisp + (planModalDisp === 'block' ? ' ✅' : ' ❌'));

            document.getElementById('renewal-certificate-id').value = id;
            
            const endDate = new Date(certificate.endDate);
            document.getElementById('renewal-domain').value = certificate.domain;
            document.getElementById('renewal-end-date').value = formatDateForInput(endDate);
            
            if (certificate.responsible) {
                document.getElementById('renewal-responsible').value = certificate.responsible;
            }
            
            if (certificate.notes) {
                document.getElementById('renewal-notes').value = certificate.notes;
            }
            
            const planDate = new Date();
            planDate.setMonth(planDate.getMonth() + 1);
            document.getElementById('renewal-plan-date').value = formatDateForInput(planDate);
            
            const form = document.getElementById('plan-renewal-form');
            
            const newForm = form.cloneNode(true);
            form.parentNode.replaceChild(newForm, form);
            
            newForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const certificateId = document.getElementById('renewal-certificate-id').value;
                const responsible = document.getElementById('renewal-responsible').value;
                const planDate = document.getElementById('renewal-plan-date').value;
                const notes = document.getElementById('renewal-notes').value || '';
                const changeTime = document.getElementById('renewal-change-time').value || '10:00';
                
                if (!responsible || !planDate) {
                    alert('Lütfen tüm zorunlu alanlari doldurun.');
                    return;
                }
                
                const submitBtn = newForm.querySelector('.submit-btn');
                const originalBtnText = submitBtn.textContent;
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Kaydediliyor...';
                
                const updateData = {
                    id: certificateId,
                    name: certificate.name,
                    domain: certificate.domain,
                    service: certificate.service || '',
                    startDate: certificate.startDate,
                    endDate: certificate.endDate,
                    responsible: responsible,
                    notes: (notes ? notes + '\n' : '') + 
                           'Yenileme plani: ' + planDate + 
                           (changeTime ? ' ' + changeTime : ''),
                    changeDate: planDate, 
                    changeTime: changeTime
                };
                
                fetch('edit-certificate.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updateData)
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok: ' + response.status);
                    }
                    return response.json();
                })
                .then(data => {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalBtnText;
                    
                    if (data.success) {
                        alert('Yenileme plani basariyla kaydedildi.');
                        closeModal('plan-renewal-modal');
                        loadDashboardCertificates();
                        if (document.getElementById('certificates-page').style.display !== 'none') {
                            loadCertificates();
                        }
                    } else {
                        alert('Hata: ' + (data.error || 'Bilinmeyen bir hata'));
                    }
                })
                .catch(error => {
                    console.error('Error saving renewal plan:', error);
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalBtnText;
                    alert('Yenileme plani kaydedilirken hata olustu: ' + error.message);
                });
            });
        })
        .catch(error => {
            certLog('PLAN', '❌ HATA', error.message);
            alert('Sertifika bilgileri alinirken hata olustu: ' + error.message);
        });
}

// Set up renewal plan form
function setupRenewalPlanForm() {
    const form = document.getElementById('plan-renewal-form');
    if (!form) return;
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const certificateId = document.getElementById('renewal-certificate-id').value;
        const responsible = document.getElementById('renewal-responsible').value;
        const planDate = document.getElementById('renewal-plan-date').value;
        const notes = document.getElementById('renewal-notes').value;
        
        if (!responsible || !planDate) {
            alert('Lütfen tüm zorunlu alanlari doldurun.');
            return;
        }
        
        fetch('save-renewal-plan.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                certificateId: certificateId,
                responsible: responsible,
                planDate: planDate,
                notes: notes
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                alert('Yenileme plani basariyla kaydedildi.');
                closeModal('plan-renewal-modal');
                loadDashboardCertificates();
                if (document.getElementById('certificates-page').style.display !== 'none') {
                    loadCertificates();
                }
            } else {
                alert('Hata: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error saving renewal plan:', error);
            alert('Yenileme plani kaydedilirken hata olustu: ' + error.message);
        });
    });
}

// Sertifika sayfa tablarini kur
function setupCertificateTabs() {
    const tabs = document.querySelectorAll('#certificates-page .tabs .tab');

    if (tabs.length === 0) {
        console.log("Sertifika tablari bulunamadi");
        return;
    }

    tabs.forEach(tab => {
        // Eski event listener'lari kaldir
        const newTab = tab.cloneNode(true);
        tab.parentNode.replaceChild(newTab, tab);
    });

    // Yeni tab'lari seç
    const newTabs = document.querySelectorAll('#certificates-page .tabs .tab');

    // Aktif tab'i bul ve içeriği göster (sayfa tekrar ziyaretinde inline style sıfırla)
    const activeTab = document.querySelector('#certificates-page .tabs .tab.active');
    const activeTabId = activeTab ? activeTab.getAttribute('data-tab') : 'all-certificates';
    document.querySelectorAll('#certificates-page .tab-content').forEach(content => {
        content.style.display = content.id === activeTabId ? 'block' : 'none';
    });

    newTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            console.log("Certificate tab clicked:", tabId);

            // Aktif tab'i vurgula
            newTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            // Tab içeriklerini göster/gizle
            const tabContents = document.querySelectorAll('#certificates-page .tab-content');
            tabContents.forEach(content => {
                content.classList.remove('active');
                content.style.display = 'none';
            });

            // Takvimden çıkarken body scroll'u sıfırla (sidebar taşma önlemi)
            window.scrollTo(0, 0);

            const selectedContent = document.getElementById(tabId);
            if (selectedContent) {
                selectedContent.classList.add('active');
                selectedContent.style.display = 'block';

                // Tab değiştiğinde veriyi yükle
                if (tabId === 'all-certificates' || tabId === 'expiring-soon') {
                    loadCertificates();
                } else if (tabId === 'certificate-history' || tabId === 'change-history') {
                    if (window.CertHistory && typeof window.CertHistory.load === 'function') {
                        window.CertHistory.load();
                    }
                } else if (tabId === 'cert-settings-tab') {
                    // Ayarlar sekmesi acilirken son ayarlari sunucudan tazele
                    if (window.CertSettings && typeof window.CertSettings.reload === 'function') {
                        window.CertSettings.reload();
                    }
                }
            }
        });
    });

    console.log("Sertifika tablari kuruldu");
}

// CSV sablonu indirme fonksiyonu
function downloadCsvTemplate() {
    window.location.href = 'download-certificate-template.php';
}

// Toplu yükleme formu isleme
function setupBulkUploadForm() {
    const form = document.getElementById('bulk-upload-form');
    if (!form) return;
    
    // onsubmit kullan — addEventListener tekrarlı çağrılarda listener yığar
    form.onsubmit = function(e) {
        e.preventDefault();

        const fileInput = document.getElementById('excel-file');
        const opRadio = document.querySelector('input[name="operation-type"]:checked');
        const operationType = opRadio ? opRadio.value : 'add'; // NPE koruması

        if (!fileInput.files || fileInput.files.length === 0) {
            alert('Lütfen bir dosya seçin (CSV / XLSX / XLS).');
            return;
        }
        
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        formData.append('operation', operationType);
        
        const submitButton = form.querySelector('.submit-btn');
        const originalButtonText = submitButton.innerHTML;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Yükleniyor...';
        submitButton.disabled = true;
        
        fetch('process-certificate-bulk.php', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            submitButton.innerHTML = originalButtonText;
            submitButton.disabled = false;
            
            if (data.success) {
                let msg = 'Sertifikalar başarıyla işlendi.\n' +
                          'Eklenen: ' + (data.added || 0) + '\n' +
                          'Güncellenen: ' + (data.updated || 0) + '\n' +
                          'Hata: ' + (data.errors || 0);
                if (Array.isArray(data.details) && data.details.length > 0) {
                    msg += '\n\nDetaylar:\n' + data.details.slice(0, 10).join('\n');
                    if (data.details.length > 10) msg += '\n... ve ' + (data.details.length - 10) + ' daha';
                }
                alert(msg);
                form.reset();
                closeModal('bulk-upload-modal');
                loadCertificates();
            } else {
                alert('Hata: ' + (data.error || 'bilinmeyen hata'));
            }
        })
        .catch(error => {
            console.error('Error processing bulk upload:', error);
            submitButton.innerHTML = originalButtonText;
            submitButton.disabled = false;
            alert('Dosya islenirken hata olustu: ' + error.message);
        });
    };
}
// ============================================================================
// SERTİFİKA TAKVİM & HEAT MAP — v2
// ============================================================================
const CertCalendar = {
    year:    new Date().getFullYear(),
    month:   new Date().getMonth(),
    _certs:  [],
    _filter: 'all',   // 'all' | 'critical' | 'warning' | 'expired'

    MONTHS: ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'],
    MONTHS_SHORT: ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'],
    STATUS: {
        expired:  { color: '#e74c3c', bg: 'rgba(231,76,60,0.10)',  label: 'Süresi dolmuş' },
        critical: { color: '#e67e22', bg: 'rgba(230,126,34,0.10)', label: 'Kritik'         },
        warning:  { color: '#f39c12', bg: 'rgba(243,156,18,0.09)', label: 'Uyarı'          },
        active:   { color: '#27ae60', bg: 'rgba(39,174,96,0.07)',  label: 'Aktif'          },
    },

    init(certs) {
        this._certs = (certs || []).filter(c => c.endDate);
        this._renderStats();
        this._renderHeatmap();
        this._renderCalendar();
    },

    _buildMap(certsOverride) {
        const src = certsOverride || this._filteredCerts();
        const map = {};
        src.forEach(c => {
            const d = c.endDate.slice(0, 10);
            if (!map[d]) map[d] = [];
            map[d].push(c);
        });
        return map;
    },

    _filteredCerts() {
        if (this._filter === 'all') return this._certs;
        return this._certs.filter(c => {
            if (this._filter === 'expired')  return c.status === 'expired';
            if (this._filter === 'critical') return c.status === 'critical';
            if (this._filter === 'warning')  return c.status === 'warning' || c.status === 'critical';
            return true;
        });
    },

    _dayWorstStatus(certs) {
        if (!certs.length) return null;
        const order = ['expired','critical','warning','active'];
        for (const s of order) { if (certs.some(c => c.status === s)) return s; }
        return 'active';
    },

    // ── İstatistik özet şeridi ───────────────────────────────────────────────
    _renderStats() {
        const el = document.getElementById('cert-cal-stats');
        if (!el) return;
        const today = new Date().toISOString().slice(0, 10);
        const monthStart = today.slice(0, 7);
        const q90 = new Date(Date.now() + 90*86400000).toISOString().slice(0, 10);

        const expired  = this._certs.filter(c => c.status === 'expired').length;
        const critical = this._certs.filter(c => c.status === 'critical').length;
        const thisMonth= this._certs.filter(c => c.endDate.slice(0,7) === monthStart).length;
        const next90   = this._certs.filter(c => c.endDate >= today && c.endDate <= q90).length;

        const stat = (icon, val, label, color, bg) =>
            `<div style="background:${bg};border:1px solid ${color}33;border-radius:10px;padding:14px 16px;display:flex;align-items:center;gap:12px;min-width:0;overflow:hidden;">
                <div style="width:40px;height:40px;min-width:40px;border-radius:10px;background:${color}20;display:flex;align-items:center;justify-content:center;font-size:17px;">${icon}</div>
                <div style="min-width:0;"><div style="font-size:24px;font-weight:700;color:${color};line-height:1;">${val}</div>
                <div style="font-size:11px;color:#7f8c8d;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${label}</div></div>
            </div>`;

        el.innerHTML =
            stat('💀', expired,  'Süresi dolmuş',    '#e74c3c', '#fdecea') +
            stat('🔴', critical, 'Kritik (≤7 gün)',  '#e67e22', '#fef3e2') +
            stat('📅', thisMonth,'Bu ay vadeli',      '#3498db', '#eaf4fd') +
            stat('⏱', next90,   'Sonraki 90 gün',   '#8e44ad', '#f5eef8');
    },

    // ── Yıllık ısı haritası (GitHub-style: satırlar=Pzt-Paz, sütunlar=haftalar) ─
    _renderHeatmap() {
        const el = document.getElementById('cert-heatmap');
        if (!el) return;
        const map = this._buildMap(this._certs); // heat map her zaman tüm certs
        const today = new Date();
        const todayStr = today.toISOString().slice(0, 10);

        // Başlangıç: bugünden 2 ay önce, haftanın ilk Pazartesi
        let start = new Date(today.getFullYear(), today.getMonth() - 2, 1);
        const dow = start.getDay();
        start.setDate(start.getDate() - ((dow + 6) % 7)); // Pazartesi'ye çek

        // Bitiş: ~14 ay sonra (Pazar'a tamamla)
        let end = new Date(today.getFullYear() + 1, today.getMonth() + 3, 0);
        end.setDate(end.getDate() + (7 - end.getDay()) % 7);

        // Sütun (hafta) sayısı
        const totalWeeks = Math.ceil(((end - start) / 86400000 + 1) / 7);

        // Isı rengi — önem derecesine göre
        const heatColor = (certs) => {
            if (!certs || !certs.length) return 'var(--cal-empty,#e9ecef)';
            const s = this._dayWorstStatus(certs);
            const intensity = Math.min(certs.length / 3, 1); // 0-1
            const colors = {
                expired:  `rgba(231,76,60,${0.35 + intensity*0.65})`,
                critical: `rgba(230,126,34,${0.35 + intensity*0.65})`,
                warning:  `rgba(243,156,18,${0.30 + intensity*0.60})`,
                active:   `rgba(39,174,96,${0.25 + intensity*0.55})`,
            };
            return colors[s] || '#ddd';
        };

        // Legent
        const legend = document.getElementById('cert-heatmap-legend');
        if (legend) {
            const steps = ['#e9ecef','rgba(39,174,96,0.5)','rgba(243,156,18,0.7)','rgba(230,126,34,0.8)','rgba(231,76,60,0.95)'];
            legend.innerHTML = steps.map(c => `<span style="width:13px;height:13px;border-radius:3px;background:${c};display:inline-block;"></span>`).join('');
        }

        // Hafta başı — ay etiketlerini hesapla
        const dayNames = ['Pzt','','Çar','','Cum','','Paz'];

        // Tablo oluştur
        let cols = `<div style="display:grid;grid-template-rows:repeat(8,auto);grid-auto-columns:16px;grid-auto-flow:column;gap:3px;align-items:center;">`;

        // Ay etiketleri (ilk satır — satır 0)
        let monthLabel = '';
        let lastMonth = -1;
        let cur = new Date(start);
        for (let w = 0; w < totalWeeks; w++) {
            const wDate = new Date(cur);
            const m = wDate.getMonth();
            if (m !== lastMonth) {
                monthLabel += `<div style="grid-row:1;font-size:10px;color:#7f8c8d;white-space:nowrap;font-weight:600;overflow:visible;">${this.MONTHS_SHORT[m]}</div>`;
                lastMonth = m;
            } else {
                monthLabel += `<div style="grid-row:1;"></div>`;
            }
            cur.setDate(cur.getDate() + 7);
        }
        cols += monthLabel;

        // Gün etiketi sütunu (satırlar 2-8)
        dayNames.forEach((d, i) => {
            cols += `<div style="grid-column:1;grid-row:${i+2};font-size:10px;color:#aab;text-align:right;padding-right:4px;white-space:nowrap;">${d}</div>`;
        });

        // Hücreler
        cur = new Date(start);
        for (let w = 0; w < totalWeeks; w++) {
            for (let dow2 = 0; dow2 < 7; dow2++) {
                const key = cur.toISOString().slice(0, 10);
                const dayCerts = map[key] || [];
                const isToday = key === todayStr;
                const isFuture = key > todayStr;
                const title = dayCerts.length
                    ? `${key}: ${dayCerts.length} sertifika — ` + dayCerts.slice(0,3).map(c=>c.name).join(', ') + (dayCerts.length>3 ? '...' : '')
                    : key;
                cols += `<div onclick="CertCalendar._dayClick('${key}')"
                    style="grid-row:${dow2+2};width:13px;height:13px;border-radius:3px;
                           background:${heatColor(dayCerts)};cursor:${dayCerts.length?'pointer':'default'};
                           outline:${isToday ? '2px solid #667eea' : 'none'};outline-offset:1px;
                           opacity:${!isFuture && !dayCerts.length ? 0.45 : 1};"
                    title="${title}"></div>`;
                cur.setDate(cur.getDate() + 1);
            }
        }
        cols += '</div>';
        el.innerHTML = cols;
    },

    // ── Aylık takvim ────────────────────────────────────────────────────────
    _renderCalendar() {
        const grid  = document.getElementById('cert-calendar-grid');
        const title = document.getElementById('cert-cal-title');
        if (!grid || !title) return;

        title.textContent = this.MONTHS[this.month] + ' ' + this.year;

        const map       = this._buildMap();
        const today     = new Date();
        const todayStr  = today.toISOString().slice(0, 10);
        const firstDay  = new Date(this.year, this.month, 1).getDay();
        const daysInMonth = new Date(this.year, this.month + 1, 0).getDate();
        const offset    = (firstDay + 6) % 7; // Mon=0
        const dayNames  = ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];

        let html = `<div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px;margin-top:8px;width:100%;">`;

        // Gün başlıkları
        dayNames.forEach(d => {
            html += `<div style="text-align:center;font-size:11px;font-weight:700;color:#aab;padding:8px 0;letter-spacing:.5px;">${d}</div>`;
        });

        // Boş hücreler
        for (let i = 0; i < offset; i++) html += '<div></div>';

        // Günler
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr  = `${this.year}-${String(this.month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const certs    = map[dateStr] || [];
            const isToday  = dateStr === todayStr;
            const isPast   = dateStr < todayStr;
            const worst    = this._dayWorstStatus(certs);
            const st       = worst ? this.STATUS[worst] : null;

            const bg = isToday
                ? 'rgba(102,126,234,0.12)'
                : (st ? st.bg : 'transparent');
            const border = isToday
                ? '2px solid #667eea'
                : (st ? `1px solid ${st.color}44` : '1px solid var(--border-color,#e8e8e8)');

            // Cert satırları hücre içinde
            const certRows = certs.slice(0, 3).map(c => {
                const sc = this.STATUS[c.status] || this.STATUS.active;
                const label = (c.name || c.domain || '').slice(0, 20);
                return `<div onclick="event.stopPropagation();CertCalendar._showCertDetail('${c.id || ''}')"
                    style="display:flex;align-items:center;gap:4px;margin-top:3px;padding:2px 5px;
                           background:${sc.color}18;border-radius:4px;cursor:pointer;"
                    title="${c.name || ''} — ${c.domain || ''}">
                    <span style="width:6px;height:6px;border-radius:50%;background:${sc.color};flex-shrink:0;"></span>
                    <span style="font-size:10px;color:var(--text-color,#2c3e50);overflow:hidden;white-space:nowrap;text-overflow:ellipsis;max-width:100%;">${label}</span>
                </div>`;
            }).join('');
            const moreHtml = certs.length > 3
                ? `<div style="font-size:10px;color:#7f8c8d;margin-top:3px;padding-left:4px;">+${certs.length-3} daha</div>`
                : '';


            html += `<div onclick="CertCalendar._dayClick('${dateStr}')"
                style="min-height:80px;border:${border};border-radius:8px;padding:7px;
                       cursor:pointer;background:${bg};opacity:${isPast && !certs.length ? 0.45 : 1};
                       overflow:hidden;min-width:0;box-sizing:border-box;">





                <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                    <span style="font-size:14px;font-weight:${isToday?'700':'500'};
                                 color:${isToday?'#667eea':'var(--text-color,#2c3e50)'};">${day}</span>
                    ${certs.length ? `<span style="font-size:10px;font-weight:700;color:${st?.color||'#aab'};background:${st?.color||'#aab'}18;border-radius:10px;padding:1px 6px;">${certs.length}</span>` : ''}
                </div>
                ${certRows}${moreHtml}
            </div>`;
        }
        html += '</div>';
        grid.innerHTML = html;
    },

    // ── Gün detay paneli ────────────────────────────────────────────────────
    _dayClick(dateStr) {
        const map   = this._buildMap();
        const certs = map[dateStr] || [];
        if (!certs.length) return;
        const panel = document.getElementById('cert-cal-day-panel');
        const ptitle= document.getElementById('cert-cal-day-title');
        const plist = document.getElementById('cert-cal-day-list');
        if (!panel) return;

        const [y, m, d] = dateStr.split('-');
        ptitle.textContent = `${d} ${this.MONTHS[parseInt(m)-1]} ${y} — ${certs.length} sertifika`;

        plist.innerHTML = certs.map(c => {
            const sc     = this.STATUS[c.status] || this.STATUS.active;
            const days   = c.daysRemaining;
            const daysLbl= days < 0 ? 'Süresi doldu' : days === 0 ? 'Bugün!' : `${days} gün kaldı`;
            const lifecycle = c.lifecycleMessage || '';
            return `<div style="display:flex;align-items:flex-start;gap:14px;padding:12px 0;border-bottom:1px solid var(--border-color,#e8e8e8);">
                <div style="width:40px;height:40px;border-radius:10px;background:${sc.color}18;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <span style="width:12px;height:12px;border-radius:50%;background:${sc.color};"></span>
                </div>
                <div style="flex:1;min-width:0;">
                    <div style="font-weight:600;font-size:14px;color:var(--text-color,#2c3e50);">${c.name || ''}</div>
                    <div style="font-size:12px;color:#7f8c8d;margin-top:2px;">${c.domain || ''}</div>
                    ${lifecycle ? `<div style="font-size:11px;color:#7f8c8d;margin-top:2px;"><i class="fas fa-info-circle" style="color:#3498db;"></i> ${lifecycle}</div>` : ''}
                </div>
                <div style="text-align:right;flex-shrink:0;">
                    <div style="font-size:13px;font-weight:700;color:${sc.color};">${daysLbl}</div>
                    <div style="font-size:11px;color:#7f8c8d;margin-top:2px;">${c.responsible || 'Sorumlu yok'}</div>
                    <div style="font-size:10px;margin-top:4px;">
                        <span style="background:${sc.color}18;color:${sc.color};border-radius:4px;padding:2px 7px;font-weight:600;">${sc.label}</span>
                    </div>
                </div>
            </div>`;
        }).join('');

        panel.style.display = 'block';
        // panel sayfanın ana scroll'unda görünür hale getir (layout bozmadan)
        setTimeout(() => {
            const rect = panel.getBoundingClientRect();
            if (rect.top < 0 || rect.bottom > window.innerHeight) {
                panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }, 50);
    },

    _showCertDetail(certId) {
        // Ana listedeki sertifikayı bul ve detay göster
        if (!certId || typeof window.openCertificateDetails !== 'function') return;
        window.openCertificateDetails(certId);
    },

    // ── Filtre çipleri ───────────────────────────────────────────────────────
    setFilter(filter) {
        this._filter = filter;
        document.querySelectorAll('.cal-chip').forEach(chip => {
            const isActive = chip.getAttribute('data-filter') === filter;
            if (isActive) {
                chip.style.background = chip.style.borderColor;
                chip.style.color = '#fff';
            } else {
                chip.style.background = 'transparent';
                chip.style.color = chip.style.borderColor;
            }
        });
        this._renderCalendar();
    },

    prevMonth() {
        if (this.month === 0) { this.month = 11; this.year--; } else this.month--;
        this._renderCalendar();
        document.getElementById('cert-cal-day-panel').style.display = 'none';
    },
    nextMonth() {
        if (this.month === 11) { this.month = 0; this.year++; } else this.month++;
        this._renderCalendar();
        document.getElementById('cert-cal-day-panel').style.display = 'none';
    },
    goToday() {
        this.year  = new Date().getFullYear();
        this.month = new Date().getMonth();
        this._renderCalendar();
        document.getElementById('cert-cal-day-panel').style.display = 'none';
    },
};
window.CertCalendar = CertCalendar;

// ============================================================================
// TAB GEÇİŞ — Takvim + Geçmiş lazy yükleme
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    const certPage = document.getElementById('certificates-page');
    if (!certPage) return;

    certPage.addEventListener('click', (e) => {
        const tab = e.target.closest('.tab[data-tab]');
        if (!tab) return;
        const tabId = tab.getAttribute('data-tab');

        if (tabId === 'cert-calendar') {
            const certs = window._allCertificatesCache || [];
            CertCalendar.init(certs);
        }

        if (tabId === 'certificate-history') {
            CertHistory.load();
        }

        if (tabId === 'cert-trash') {
            CertTrash.load();
        }

        if (tabId === 'cert-discovery') {
            if (!CertDiscovery._data.length && !CertDiscovery._loading) {
                CertDiscovery.load(false);
            }
        }

        if (tabId === 'cert-renewal' && !CertRenewal._loaded) CertRenewal.load();
        if (tabId === 'cert-chain') CertChain.load();
        if (tabId === 'cert-generate') CertGenerate.init();
    });
});

// ============================================================================
// SERTİFİKA DEĞİŞİM GEÇMİŞİ (DB'den)
// ============================================================================
const CertHistory = {
    load() {
        const body = document.getElementById('cert-history-body');
        if (!body) return;
        body.innerHTML = '<div style="text-align:center;padding:30px;color:#3498db;"><i class="fas fa-spinner fa-spin"></i></div>';
        fetch('api/cert-history.php').then(r => r.json()).then(data => {
            if (!data.success || !data.rows.length) {
                body.innerHTML = '<p style="text-align:center;padding:30px;color:#7f8c8d;">Henüz değişim kaydı yok.</p>';
                return;
            }
            body.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:13px;">' +
                '<thead><tr style="background:var(--main-bg,#f8f9fa);"><th style="padding:10px 12px;text-align:left;">Sertifika</th><th style="padding:10px 12px;">Alan</th><th style="padding:10px 12px;">Eski Değer</th><th style="padding:10px 12px;">Yeni Değer</th><th style="padding:10px 12px;">Kim</th><th style="padding:10px 12px;">Tarih</th></tr></thead><tbody>' +
                data.rows.map(r => `<tr style="border-bottom:1px solid var(--border-color,#e0e0e0);">
                    <td style="padding:9px 12px;font-weight:500;">${r.cert_name || r.certificate_id}</td>
                    <td style="padding:9px 12px;color:#9b59b6;">${r.field_changed}</td>
                    <td style="padding:9px 12px;color:#e74c3c;max-width:150px;overflow:hidden;text-overflow:ellipsis;">${r.old_value || '-'}</td>
                    <td style="padding:9px 12px;color:#27ae60;max-width:150px;overflow:hidden;text-overflow:ellipsis;">${r.new_value || '-'}</td>
                    <td style="padding:9px 12px;color:#7f8c8d;">${r.changed_by || '-'}</td>
                    <td style="padding:9px 12px;color:#7f8c8d;white-space:nowrap;">${r.changed_at ? r.changed_at.slice(0,16) : '-'}</td>
                </tr>`).join('') +
                '</tbody></table>';
        }).catch(() => { body.innerHTML = '<p style="text-align:center;color:#e74c3c;">Geçmiş yüklenemedi.</p>'; });
    }
};
window.CertHistory = CertHistory;

// ============================================================================
// ÇÖP KUTUSU — Silinen (soft-delete) sertifikalar, geri yükleme
// ============================================================================
const CertTrash = {
    load() {
        const body = document.getElementById('cert-trash-body');
        if (!body) return;
        body.innerHTML = '<div style="text-align:center;padding:30px;color:#3498db;"><i class="fas fa-spinner fa-spin"></i></div>';
        fetch('get-certificate-status.php?deleted=1').then(r => r.json()).then(data => {
            const rows = Array.isArray(data) ? data : (data.rows || data.certificates || []);
            if (!rows.length) {
                body.innerHTML = '<p style="text-align:center;padding:30px;color:#7f8c8d;">Çöp kutusu boş.</p>';
                return;
            }
            body.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:13px;">' +
                '<thead><tr style="background:var(--main-bg,#f8f9fa);"><th style="padding:10px 12px;text-align:left;">Sertifika</th><th style="padding:10px 12px;text-align:left;">Domain</th><th style="padding:10px 12px;">Bitiş</th><th style="padding:10px 12px;">Silen</th><th style="padding:10px 12px;">Silinme</th><th style="padding:10px 12px;">İşlem</th></tr></thead><tbody>' +
                rows.map(r => `<tr style="border-bottom:1px solid var(--border-color,#e0e0e0);">
                    <td style="padding:9px 12px;font-weight:500;">${r.name || r.id}</td>
                    <td style="padding:9px 12px;">${r.domain || '-'}</td>
                    <td style="padding:9px 12px;color:#7f8c8d;white-space:nowrap;">${(r.end_date || r.endDate || '').slice(0,10) || '-'}</td>
                    <td style="padding:9px 12px;color:#7f8c8d;">${r.deleted_by || '-'}</td>
                    <td style="padding:9px 12px;color:#7f8c8d;white-space:nowrap;">${r.deleted_at ? r.deleted_at.slice(0,16) : '-'}</td>
                    <td style="padding:9px 12px;">
                        <button class="action-btn" onclick="CertTrash.restore('${r.id}', this)" style="background:#27ae60;color:#fff;border:none;padding:5px 12px;border-radius:5px;cursor:pointer;font-size:12px;"><i class="fas fa-undo"></i> Geri Yükle</button>
                    </td>
                </tr>`).join('') +
                '</tbody></table>';
        }).catch(() => { body.innerHTML = '<p style="text-align:center;color:#e74c3c;">Çöp kutusu yüklenemedi.</p>'; });
    },

    restore(id, btn) {
        if (!confirm('Bu sertifikayı geri yüklemek istediğinize emin misiniz?')) return;
        if (btn) btn.disabled = true;
        fetch('restore-certificate.php?id=' + encodeURIComponent(id), { method: 'POST' })
            .then(r => r.json())
            .then(d => {
                if (d.success) {
                    showNotification('Sertifika geri yüklendi.', 'success');
                    this.load();
                    if (typeof loadCertificates === 'function') loadCertificates();
                } else {
                    showNotification('Geri yükleme başarısız: ' + (d.error || 'Bilinmeyen'), 'error');
                    if (btn) btn.disabled = false;
                }
            })
            .catch(err => {
                showNotification('Bağlantı hatası: ' + err.message, 'error');
                if (btn) btn.disabled = false;
            });
    }
};
window.CertTrash = CertTrash;

// ============================================================================
// FAZ 3 — F5 SERTİFİKA KEŞFİ
// ============================================================================
const CertDiscovery = {
    _data:       [],   // tüm keşfedilen cert'ler
    _envStatus:  {},
    _currentEnv: 'all',
    _loading:    false,

    load(forceRefresh = false) {
        if (this._loading) return;
        this._loading = true;
        const list = document.getElementById('cert-discovery-list');
        const envBar = document.getElementById('disc-env-status');
        if (list) list.innerHTML = '<div style="text-align:center;padding:40px;color:#3498db;"><i class="fas fa-spinner fa-spin fa-2x"></i><br><br>F5 taranıyor, lütfen bekleyin...</div>';
        if (envBar) envBar.innerHTML = '';

        const url = 'api/cert-f5-discover.php' + (forceRefresh ? '?refresh=1' : '');
        fetch(url).then(r => r.json()).then(d => {
            this._loading = false;
            if (!d.success) {
                if (list) list.innerHTML = '<p style="color:#e74c3c;padding:20px;">Hata: ' + (d.error || 'Bilinmeyen hata') + '</p>';
                return;
            }
            this._data      = d.certs || [];
            this._envStatus = d.env_status || {};
            this._renderEnvStatus(d);
            this._updateEnvCounts();
            this._updateBadge();
            this.applyFilter();

            const ft = document.getElementById('disc-fetch-time');
            if (ft && d.fetched_at) {
                ft.textContent = 'Son tarama: ' + d.fetched_at.slice(0, 16) + (d.source === 'cache' ? ' (önbellek)' : ' (canlı)');
            }
        }).catch(err => {
            this._loading = false;
            if (list) list.innerHTML = '<p style="color:#e74c3c;padding:20px;">Bağlantı hatası: ' + err.message + '</p>';
        });
    },

    _renderEnvStatus(d) {
        const bar = document.getElementById('disc-env-status');
        if (!bar) return;
        const envOrder = ['PROD', 'DRC', 'TEST'];
        bar.innerHTML = envOrder.map(env => {
            const s = (d.env_status || {})[env] || { ok: false, count: 0, error: 'Yanıt yok' };
            const color = s.ok ? '#27ae60' : '#e74c3c';
            return `<span style="display:inline-flex;align-items:center;gap:6px;background:${s.ok ? '#e8f8f0' : '#fdecea'};border:1px solid ${color};border-radius:6px;padding:4px 10px;font-size:12px;">
                <span style="width:8px;height:8px;border-radius:50%;background:${color};"></span>
                <b>${env}</b> ${s.ok ? s.count + ' sertifika' : 'HATA: ' + s.error}
            </span>`;
        }).join('');
    },

    _updateEnvCounts() {
        ['PROD', 'DRC', 'TEST'].forEach(env => {
            const el = document.querySelector(`.disc-env-cnt[data-env="${env}"]`);
            if (!el) return;
            // Unique CN bazında say (chain kopyaları ayrı sayılmasın)
            const cnt = new Set(this._data.filter(c => c.env === env).map(c => c.cn || c.fingerprint)).size;
            el.textContent = cnt ? `(${cnt})` : '';
            el.style.color = '#667eea';
        });
        const newCnt = new Set(this._data.filter(c => c.match_status === 'new').map(c => c.cn || c.fingerprint)).size;
        const newEl  = document.getElementById('disc-new-only-cnt');
        if (newEl) newEl.textContent = newCnt || '';
    },

    _updateBadge() {
        const badge = document.getElementById('cert-discovery-badge');
        if (!badge) return;
        // Unique CN bazında say (raw entry sayısı değil, kaç farklı domain)
        const newCnt = new Set(this._data.filter(c => c.match_status === 'new').map(c => c.cn || c.fingerprint)).size;
        if (newCnt > 0) { badge.textContent = newCnt; badge.style.display = 'inline'; }
        else badge.style.display = 'none';
    },

    switchEnv(env) {
        this._currentEnv = env;
        document.querySelectorAll('.disc-env-tab').forEach(t => {
            const active = t.getAttribute('data-env') === env;
            const isNew  = t.getAttribute('data-env') === 'new_only';
            t.style.borderBottomColor = active ? (isNew ? '#e74c3c' : '#667eea') : 'transparent';
            t.style.fontWeight = active ? '600' : '400';
        });
        const list  = document.getElementById('cert-discovery-list');
        const sync  = document.getElementById('cert-discovery-sync-panel');
        const dism  = document.getElementById('cert-discovery-dismissed-panel');
        if (list) list.style.display = 'none';
        if (sync) sync.style.display = 'none';
        if (dism) dism.style.display = 'none';
        if (env === 'sync') {
            if (sync) { sync.style.display = 'block'; this._renderSyncPanel(); }
        } else if (env === 'dismissed') {
            if (dism) { dism.style.display = 'block'; this._loadDismissed(); }
        } else {
            if (list) list.style.display = 'block';
            this.applyFilter();
        }
    },

    // ── Yoksayılanlar Paneli ──────────────────────────────────────────────────
    _loadDismissed() {
        const panel = document.getElementById('cert-discovery-dismissed-panel');
        if (!panel) return;
        panel.innerHTML = '<div style="text-align:center;padding:30px;color:#3498db;"><i class="fas fa-spinner fa-spin"></i></div>';
        fetch('api/cert-discovery-action.php', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ action: 'list_dismissed' }),
        }).then(r => r.json()).then(d => {
            if (!d.success) { panel.innerHTML = '<p style="color:#e74c3c;">Liste alınamadı: ' + (d.error || '') + '</p>'; return; }
            const rows = d.rows || [];
            if (!rows.length) {
                panel.innerHTML = '<div style="text-align:center;padding:20px;color:#27ae60;"><i class="fas fa-check-circle fa-2x"></i><br><br>Yoksayılan kayıt yok.</div>';
                return;
            }
            panel.innerHTML = '<p style="font-size:13px;color:#7f8c8d;margin:0 0 12px;">Yanlışlıkla yoksaydığınız kayıtları geri alabilirsiniz. Geri alınan kayıt bir sonraki taramada yeniden görünür.</p>' +
                '<table style="width:100%;border-collapse:collapse;font-size:13px;">' +
                '<thead><tr style="background:var(--main-bg,#f8f9fa);"><th style="padding:10px 12px;text-align:left;">CN</th><th style="padding:10px 12px;text-align:left;">F5 Fingerprint</th><th style="padding:10px 12px;">Tarih</th><th style="padding:10px 12px;">İşlem</th></tr></thead><tbody>' +
                rows.map(r => `<tr style="border-bottom:1px solid var(--border-color,#e0e0e0);">
                    <td style="padding:9px 12px;font-weight:500;">${r.cn || '—'}</td>
                    <td style="padding:9px 12px;color:#7f8c8d;"><code style="font-size:11px;">${r.fingerprint}</code></td>
                    <td style="padding:9px 12px;color:#7f8c8d;white-space:nowrap;">${r.dismissed_at ? r.dismissed_at.slice(0,16) : '-'}</td>
                    <td style="padding:9px 12px;">
                        <button onclick="CertDiscovery.undismiss('${r.fingerprint.replace(/'/g,"\\'")}', this)" style="background:#3498db;color:#fff;border:none;padding:5px 12px;border-radius:5px;cursor:pointer;font-size:12px;"><i class="fas fa-undo"></i> Geri Al</button>
                    </td>
                </tr>`).join('') +
                '</tbody></table>';
        }).catch(err => { panel.innerHTML = '<p style="color:#e74c3c;">Bağlantı hatası: ' + err.message + '</p>'; });
    },

    undismiss(fingerprint, btn) {
        if (btn) btn.disabled = true;
        fetch('api/cert-discovery-action.php', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ action: 'undismiss', fingerprint }),
        }).then(r => r.json()).then(d => {
            if (d.success) {
                showNotification('Geri alındı. Yeniden taramada görünecek.', 'success');
                this._loadDismissed();
            } else {
                showNotification('Geri alma başarısız: ' + (d.error || 'Bilinmeyen'), 'error');
                if (btn) btn.disabled = false;
            }
        }).catch(err => {
            showNotification('Bağlantı hatası: ' + err.message, 'error');
            if (btn) btn.disabled = false;
        });
    },

    applyFilter() {
        if (this._currentEnv === 'sync') return;
        const isNewOnly    = this._currentEnv === 'new_only';
        const showNew     = isNewOnly ? true  : (document.getElementById('disc-filter-new')?.checked     !== false);
        const showManaged = isNewOnly ? false : (document.getElementById('disc-filter-managed')?.checked !== false);
        const onlyWildcard = document.getElementById('disc-filter-wildcard')?.checked;
        const q            = (document.getElementById('disc-search')?.value || '').toLowerCase().trim();

        let filtered = this._data.filter(c => {
            const envMatch = isNewOnly ? true : (this._currentEnv === 'all' || c.env === this._currentEnv);
            if (!envMatch) return false;
            if (c.match_status === 'new'     && !showNew)     return false;
            if (c.match_status === 'managed' && !showManaged) return false;
            if (onlyWildcard && !c.is_wildcard) return false;
            if (q) {
                const haystack = [c.cn, ...(c.san || [])].join(' ').toLowerCase();
                if (!haystack.includes(q)) return false;
            }
            return true;
        });

        this._renderList(this._groupByCN(filtered));
    },

    // CN bazında gruplama: aynı domain için PROD+DRC ve chain kopyaları tek kart gösterir
    _groupByCN(certs) {
        if (!certs || !certs.length) return certs;
        const isChainName = n => /([._\-]chain|[._\-]bundle)(\.\w+)?$/i.test(n || '');
        const envPri = { PROD: 0, DRC: 1, TEST: 2 };
        const map = new Map();
        for (const c of certs) {
            const key = (c.cn || '').toLowerCase() || c.fingerprint;
            if (!map.has(key)) map.set(key, { primary: null, envs: new Set(), fps: [], hasChain: false });
            const g = map.get(key);
            if (isChainName(c.f5_name)) {
                g.hasChain = true;
            } else if (!g.primary || (envPri[c.env] ?? 3) < (envPri[g.primary.env] ?? 3)) {
                g.primary = c;
            }
            g.envs.add(c.env);
            g.fps.push(c.fingerprint);
        }
        const result = [];
        for (const g of map.values()) {
            if (!g.primary) continue;
            result.push(Object.assign({}, g.primary, { _envs: [...g.envs], _has_chain: g.hasChain }));
        }
        return result;
    },

    _renderList(certs) {
        const list = document.getElementById('cert-discovery-list');
        if (!list) return;
        if (!certs.length) {
            list.innerHTML = '<p style="text-align:center;padding:30px;color:#7f8c8d;">Gösterilecek sertifika yok.</p>';
            return;
        }

        // Wildcard ve spesifik olarak grupla
        const wildcards  = certs.filter(c => c.is_wildcard);
        const specifics  = certs.filter(c => !c.is_wildcard);

        let html = '';
        if (wildcards.length) {
            html += `<div style="font-size:11px;font-weight:700;color:#7f8c8d;text-transform:uppercase;letter-spacing:.8px;margin:16px 0 8px;">Wildcard Sertifikalar (${wildcards.length})</div>`;
            html += wildcards.map(c => this._certCard(c)).join('');
        }
        if (specifics.length) {
            html += `<div style="font-size:11px;font-weight:700;color:#7f8c8d;text-transform:uppercase;letter-spacing:.8px;margin:16px 0 8px;">Spesifik Sertifikalar (${specifics.length})</div>`;
            html += specifics.map(c => this._certCard(c)).join('');
        }
        list.innerHTML = html;
    },

    _certCard(c) {
        const statusColor = c.match_status === 'new' ? '#3498db' : '#27ae60';
        const statusLabel = c.match_status === 'new' ? 'Yeni' : 'Yönetiliyor';
        const ENV_COLORS  = {PROD:'#e74c3c', DRC:'#e67e22', TEST:'#3498db'};
        const envBadges   = (c._envs || [c.env]).map(e => {
            const ec = ENV_COLORS[e] || '#95a5a6';
            return `<span style="font-size:11px;background:${ec};color:#fff;border-radius:4px;padding:1px 7px;">${e}</span>`;
        }).join(' ');
        const chainBadge  = c._has_chain
            ? `<span style="font-size:11px;background:#f5f5f5;color:#7f8c8d;border:1px solid #e0e0e0;border-radius:4px;padding:1px 6px;" title="Chain/bundle sertifika mevcut"><i class='fas fa-link'></i></span>`
            : '';

        const days = c.days_left;
        let daysColor = '#27ae60';
        if (days !== null) {
            if (days <= 7)  daysColor = '#e74c3c';
            else if (days <= 30) daysColor = '#e67e22';
            else if (days <= 45) daysColor = '#f39c12';
        }

        const keyStr = c.key_type
            ? `<span style="font-size:11px;background:#f0f0f0;border-radius:4px;padding:2px 6px;">${this._formatKeyType(c.key_type, c.key_size)}</span>`
            : '';

        const sanHtml = (c.san || []).filter(n => n !== c.cn).slice(0, 4).map(n =>
            `<span style="font-size:11px;background:#f8f9fa;border:1px solid #e0e0e0;border-radius:3px;padding:1px 6px;color:#555;">${n}</span>`
        ).join(' ') + (c.san && c.san.length > 5 ? ` <span style="font-size:11px;color:#7f8c8d;">+${c.san.length-5} daha</span>` : '');

        const actBtns = c.match_status === 'new' ? `
            <button onclick='CertDiscovery.openApprove(${JSON.stringify(c)})' style="background:#27ae60;color:#fff;border:none;padding:5px 12px;border-radius:5px;cursor:pointer;font-size:12px;"><i class="fas fa-plus"></i> Ekle</button>
            <button onclick="CertDiscovery.dismiss('${c.fingerprint}','${(c.cn||'').replace(/'/g,"\\'")}',this)" style="background:#f8f9fa;color:#666;border:1px solid #ddd;padding:5px 12px;border-radius:5px;cursor:pointer;font-size:12px;">Yoksay</button>
        ` : `<span style="font-size:12px;color:#27ae60;"><i class="fas fa-check-circle"></i> Portal'da mevcut</span>${c.matched_domain ? `<br><span style="font-size:11px;color:#7f8c8d;">${c.matched_domain}</span>` : ''}${c.matched_cert_id ? `<br><button onclick="CertDiscovery.refreshFromDiscovery('${c.matched_cert_id}',this)" style="margin-top:4px;background:#f8f9fa;color:#3498db;border:1px solid #3498db44;padding:3px 10px;border-radius:5px;cursor:pointer;font-size:11px;"><i class="fas fa-sync-alt"></i> SSL Sorgula</button>` : ''}`;

        return `<div style="display:flex;align-items:flex-start;gap:16px;padding:14px 0;border-bottom:1px solid var(--border-color,#e0e0e0);">
            <div style="flex:1;min-width:0;">
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
                    <span style="font-size:15px;font-weight:700;color:var(--text-color,#2c3e50);">${c.cn || '—'}</span>
                    ${envBadges}${chainBadge}
                    <span style="font-size:11px;background:${statusColor}22;color:${statusColor};border:1px solid ${statusColor}44;border-radius:4px;padding:1px 7px;">${statusLabel}</span>
                    ${keyStr}
                </div>
                <div style="font-size:12px;color:#7f8c8d;margin-bottom:4px;">F5 adı: <code style="font-size:11px;">${c.f5_name || '—'}</code></div>
                ${sanHtml ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:4px;">${sanHtml}</div>` : ''}
                <div style="font-size:12px;color:#7f8c8d;">
                    Issuer: ${c.issuer_cn || '—'} &nbsp;|&nbsp;
                    <span style="color:${daysColor};font-weight:600;">
                        ${days !== null ? (days > 0 ? days + ' gün kaldı' : 'Süresi dolmuş') : '—'}
                    </span>
                    &nbsp;(${c.exp_str || '—'})
                </div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0;">
                ${actBtns}
            </div>
        </div>`;
    },

    refreshFromDiscovery(certId, btn) {
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }
        fetch(`update-certificates.php?action=update-single&id=${encodeURIComponent(certId)}`)
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    showNotification('SSL bilgileri güncellendi.', 'success');
                    if (btn) { btn.innerHTML = '<i class="fas fa-check"></i> Güncellendi'; btn.style.color = '#27ae60'; }
                } else {
                    showNotification(data.error || 'Güncelleme başarısız.', 'error');
                    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-sync-alt"></i> SSL Sorgula'; }
                }
            })
            .catch(() => {
                showNotification('Bağlantı hatası.', 'error');
                if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-sync-alt"></i> SSL Sorgula'; }
            });
    },

    _formatKeyType(type, size) {
        if (!type) return '?';
        const t = type.toLowerCase();
        if (t.includes('rsa')) {
            let color, icon;
            if (!size)        { color = '#7f8c8d'; icon = 'RSA ?'; }
            else if (size < 2048) { color = '#e74c3c'; icon = `⚠ RSA ${size}`; }   // zayıf
            else if (size < 3072) { color = '#3498db'; icon = `RSA ${size}`; }      // kabul edilebilir
            else if (size < 4096) { color = '#27ae60'; icon = `RSA ${size}`; }      // iyi
            else                  { color = '#27ae60'; icon = `✓ RSA ${size}`; }   // çok iyi
            return `<span style="color:${color};font-weight:600;">${icon}</span>`;
        }
        if (t.includes('ecdsa') || t.includes('ec')) {
            const color = size && size >= 256 ? '#27ae60' : '#7f8c8d';
            return `<span style="color:${color};">ECDSA${size ? ' P-'+size : ''}</span>`;
        }
        return type;
    },

    // Bir CN'in PROD↔DRC karşılaştırmasına girip girmeyeceğine karar verir.
    // Ortam-özel (.prod./.drc./.test.) ve hostname olmayan (noktasız/boşluklu) CN'ler hariç tutulur —
    // bunlar doğal olarak tek ortamda bulunur ya da gerçek servis sertifikası değildir, yani sahte fark üretir.
    _isComparableCN(cn) {
        if (!cn) return false;
        const c = cn.toLowerCase();
        if (c.includes('.prod.') || c.includes('.drc.') || c.includes('.test.')) return false;
        if (c.indexOf('.') === -1 || /\s/.test(c)) return false;
        return true;
    },

    // ── PROD ↔ DRC Eşleşme Paneli ─────────────────────────────────────────────
    _renderSyncPanel() {
        const panel = document.getElementById('cert-discovery-sync-panel');
        if (!panel) return;

        const prod = this._data.filter(c => c.env === 'PROD' && !c.is_expired && this._isComparableCN(c.cn));
        const drc  = this._data.filter(c => c.env === 'DRC'  && !c.is_expired && this._isComparableCN(c.cn));

        const prodCNs = new Set(prod.map(c => c.cn?.toLowerCase()).filter(Boolean));
        const drcCNs  = new Set(drc.map(c => c.cn?.toLowerCase()).filter(Boolean));

        const onlyProd = prod.filter(c => c.cn && !drcCNs.has(c.cn.toLowerCase()));
        const onlyDrc  = drc.filter(c => c.cn && !prodCNs.has(c.cn.toLowerCase()));
        const bothCnt  = [...prodCNs].filter(cn => drcCNs.has(cn)).length;

        const syncPct = (prodCNs.size + drcCNs.size) > 0
            ? Math.round(bothCnt * 2 / (prodCNs.size + drcCNs.size) * 100)
            : 100;

        const barColor = syncPct === 100 ? '#27ae60' : (syncPct >= 80 ? '#f39c12' : '#e74c3c');

        const table = (title, color, icon, items) => {
            if (!items.length) return `<p style="color:#27ae60;"><i class="fas fa-check-circle"></i> ${title} — fark yok.</p>`;
            return `<h4 style="color:${color};margin:0 0 8px;">${icon} ${title} (${items.length})</h4>
            <div style="border:1px solid ${color}33;border-radius:8px;overflow:hidden;margin-bottom:16px;">
            ${items.map(c => `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-bottom:1px solid #f0f0f0;">
                <div>
                    <div style="font-weight:600;font-size:14px;">${c.cn || '—'}</div>
                    <div style="font-size:12px;color:#7f8c8d;">F5: ${c.f5_name} &nbsp;|&nbsp; ${c.exp_str || '—'}</div>
                </div>
                ${c.key_type ? `<span style="font-size:11px;background:#f0f0f0;border-radius:4px;padding:2px 6px;">${this._formatKeyType(c.key_type, c.key_size)}</span>` : ''}
            </div>`).join('')}
            </div>`;
        };

        panel.innerHTML = `
            <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;flex-wrap:wrap;">
                <div style="flex:1;">
                    <div style="font-size:13px;color:#7f8c8d;margin-bottom:6px;">PROD↔DRC Senkronizasyon Oranı</div>
                    <div style="background:#e0e0e0;border-radius:10px;height:14px;overflow:hidden;">
                        <div style="background:${barColor};height:100%;width:${syncPct}%;border-radius:10px;transition:width .4s;"></div>
                    </div>
                    <div style="font-size:12px;color:#7f8c8d;margin-top:4px;">%${syncPct} eşleşme &nbsp;·&nbsp; ${bothCnt} ortak &nbsp;·&nbsp; PROD: ${prod.length} &nbsp;·&nbsp; DRC: ${drc.length}</div>
                </div>
            </div>
            ${table('PROD\'da var, DRC\'de yok', '#e74c3c', '⬅', onlyProd)}
            ${table('DRC\'de var, PROD\'da yok', '#e67e22', '➡', onlyDrc)}
            ${(!onlyProd.length && !onlyDrc.length) ? '<div style="text-align:center;padding:20px;color:#27ae60;font-size:16px;"><i class="fas fa-check-circle fa-2x"></i><br><br>PROD ve DRC tamamen senkronize!</div>' : ''}
        `;
    },

    // ── Onay Modalı ───────────────────────────────────────────────────────────
    openApprove(cert) {
        document.getElementById('disc-approve-fingerprint').value = cert.fingerprint || '';
        document.getElementById('disc-approve-cn').value          = cert.cn || '';
        document.getElementById('disc-approve-issuer').value      = cert.issuer_cn || '';
        document.getElementById('disc-approve-domain').value      = cert.cn || '';
        document.getElementById('disc-approve-name').value        = cert.is_wildcard
            ? 'Wildcard ' + (cert.cn || '')
            : (cert.cn || cert.f5_name || '');
        document.getElementById('disc-approve-end').value = cert.exp_date
            ? new Date(cert.exp_date * 1000).toISOString().slice(0, 10)
            : '';
        // Başlangıç tarihi: F5 createTime varsa doldur (yaklaşık)
        let nbVal = '';
        if (cert.not_before) {
            try {
                const d = typeof cert.not_before === 'number'
                    ? new Date(cert.not_before * 1000)
                    : new Date(cert.not_before);
                if (d.getFullYear() > 1970) nbVal = d.toISOString().slice(0, 10);
            } catch(e) {}
        }
        document.getElementById('disc-approve-start').value = nbVal;
        // Sorumlu select — CertSettings tarafından doldurulmuş, sadece sıfırla
        const rsel = document.getElementById('disc-approve-responsible');
        if (rsel) rsel.value = '';
        const envStr = (cert._envs || [cert.env]).join('+');
        document.getElementById('disc-approve-notes').value = 'F5 (' + envStr + ') keşfedildi. F5: ' + cert.f5_name + (cert._has_chain ? ' (chain mevcut)' : '');
        openModal('cert-discovery-approve-modal');
    },

    approveSubmit() {
        const fp      = document.getElementById('disc-approve-fingerprint').value;
        const cn      = document.getElementById('disc-approve-cn').value;
        const name    = document.getElementById('disc-approve-name').value.trim();
        const endDate = document.getElementById('disc-approve-end').value;
        if (!name || !endDate) {
            showNotification('Ad ve bitiş tarihi zorunludur', 'error'); return;
        }
        const payload = {
            action:      'approve',
            fingerprint: fp,
            cn,
            name,
            domain:      cn,
            endDate,
            startDate:   document.getElementById('disc-approve-start').value || '',
            responsible: document.getElementById('disc-approve-responsible').value,
            notes:       document.getElementById('disc-approve-notes').value,
            issuer_cn:   document.getElementById('disc-approve-issuer').value,
        };
        fetch('api/cert-discovery-action.php', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
            .then(r => r.json())
            .then(d => {
                if (d.success) {
                    closeModal('cert-discovery-approve-modal');
                    showNotification('Sertifika eklendi!', 'success');
                    // Aynı CN'e ait tüm girişleri (_data'dan) kaldır
                    const normCn = cn.toLowerCase();
                    const relFps = this._data
                        .filter(c => (c.cn || '').toLowerCase() === normCn)
                        .map(c => c.fingerprint);
                    this._data = this._data.filter(c => (c.cn || '').toLowerCase() !== normCn);
                    this._updateBadge();
                    this._updateEnvCounts();
                    this.applyFilter();
                    // Sunucu tarafı approve sırasında zaten tüm CN girişlerini cache'den sildi
                    if (typeof loadCertificates === 'function') loadCertificates();
                } else {
                    console.error('cert-discovery-action hata:', d.error);
                    showNotification('Hata: ' + (d.error || 'Bilinmeyen'), 'error');
                }
            })
            .catch(err => {
                console.error('cert-discovery-action fetch hatası:', err);
                showNotification('Bağlantı hatası: ' + err.message, 'error');
            });
    },

    dismiss(fingerprint, cn, btn) {
        // Aynı CN'e ait tüm fingerprint'leri tek request ile yoksay
        const normCn = (cn || '').toLowerCase();
        const allFps = this._data
            .filter(c => c.fingerprint === fingerprint || (normCn && (c.cn || '').toLowerCase() === normCn))
            .map(c => c.fingerprint);
        if (btn) btn.disabled = true;
        fetch('api/cert-discovery-action.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ action: 'dismiss', fingerprint, fingerprints: allFps, cn }),
        })
        .then(r => r.json())
        .then(d => {
            if (d.success) {
                const fpSet = new Set(allFps);
                this._data = this._data.filter(c => !fpSet.has(c.fingerprint));
                this._updateBadge();
                this._updateEnvCounts();
                this.applyFilter();
                showNotification('Yoksayıldı', 'info');
            } else {
                console.error('dismiss hata:', d.error);
                if (btn) btn.disabled = false;
                showNotification('Yoksayma başarısız: ' + (d.error || 'Bilinmeyen'), 'error');
            }
        })
        .catch(err => {
            console.error('dismiss fetch hatası:', err);
            if (btn) btn.disabled = false;
            showNotification('Yoksayma başarısız: ' + err.message, 'error');
        });
    },
};
window.CertDiscovery = CertDiscovery;


// ============================================================================
// YENİLEME TAKİBİ
// ============================================================================
const CertRenewal = {
    _loaded: false,

    load() {
        this._loaded = true;
        const statsEl  = document.getElementById('cert-renewal-stats');
        const attEl    = document.getElementById('cert-renewal-attention');
        const onEl     = document.getElementById('cert-renewal-on-track');
        const compEl   = document.getElementById('cert-renewal-completed');
        if (statsEl) statsEl.innerHTML = '<div style="color:#667eea;"><i class="fas fa-spinner fa-spin"></i> Yükleniyor...</div>';

        fetch('api/cert-renewal-status.php')
            .then(r => r.json())
            .then(d => {
                if (!d.success) { if (statsEl) statsEl.innerHTML = '<p style="color:red;">Hata: ' + d.error + '</p>'; return; }
                this._renderStats(d.stats, statsEl);
                if (attEl)  attEl.innerHTML  = this._renderSection('Sertifikalar (yakından uzağa)', d.all, false);
                if (onEl)   onEl.innerHTML   = '';
                if (compEl) compEl.innerHTML = d.completed && d.completed.length
                    ? this._renderSection('Tamamlananlar (son 30 gün)', d.completed, false)
                    : '';
            })
            .catch(err => { if (statsEl) statsEl.innerHTML = '<p style="color:red;">Hata: ' + err.message + '</p>'; });
    },

    _renderStats(s, el) {
        if (!el) return;
        const cards = [
            { label:'Kritik',        val: s.critical,       bg:'#fdecea', color:'#e74c3c', icon:'fa-fire' },
            { label:'Uyarı',         val: s.warning,        bg:'#fff3e0', color:'#e67e22', icon:'fa-exclamation-triangle' },
            { label:'Sorumlu Yok',   val: s.no_responsible, bg:'#fdecea', color:'#c0392b', icon:'fa-user-slash' },
            { label:'Stale Süreç',   val: s.stale,          bg:'#fff8e1', color:'#f39c12', icon:'fa-clock' },
            { label:'Süreçte',       val: s.on_track,       bg:'#e8f5e9', color:'#27ae60', icon:'fa-check-circle' },
            { label:'Toplam İzlenen',val: s.total_active,   bg:'#eff1ff', color:'#667eea', icon:'fa-certificate' },
        ];
        el.innerHTML = cards.map(c => `
            <div style="background:${c.bg};border-radius:8px;padding:12px 16px;text-align:center;">
                <div style="font-size:22px;font-weight:700;color:${c.color};">${c.val}</div>
                <div style="font-size:11px;color:${c.color};margin-top:2px;"><i class="fas ${c.icon}"></i> ${c.label}</div>
            </div>`).join('');
    },

    _renderSection(title, items, isAttention) {
        if (!items.length) return '';
        const color = isAttention ? '#e74c3c' : '#27ae60';
        let html = `<div class="card" style="margin-bottom:16px;"><div class="card-body" style="padding:0 20px 16px;">
            <h4 style="margin:16px 0 12px;font-size:14px;color:${color};">${title} (${items.length})</h4>`;

        items.forEach(item => {
            const daysColor = item.days_left <= 7 ? '#e74c3c' : item.days_left <= 30 ? '#e67e22' : '#27ae60';
            const issues = item.issues.map(i =>
                `<span style="font-size:11px;background:${i.color}22;color:${i.color};border:1px solid ${i.color}44;border-radius:4px;padding:2px 8px;margin-right:4px;">${i.label}</span>`
            ).join('');

            // Lifecycle stepper
            const steps = ['active','csr_ready','csr_sent','renewal_planned','cert_received','chain_verified','f5_deployed','completed'];
            const stepLabels = ['İzlemede','CSR Hazır','CSR Gönderildi','Yenileme Plan.','Sert. Alındı','Zincir Doğr.','F5\'e Yüklendi','Tamamlandı'];
            const curOrder = steps.indexOf(item.lifecycle);
            const stepHtml = steps.map((s, i) => {
                const done = i < curOrder, cur = i === curOrder;
                const bg = done ? '#27ae60' : cur ? '#667eea' : '#e0e0e0';
                const fg = done || cur ? '#fff' : '#999';
                return `<div style="display:flex;flex-direction:column;align-items:center;flex:1;min-width:0;">
                    <div style="width:22px;height:22px;border-radius:50%;background:${bg};color:${fg};font-size:10px;display:flex;align-items:center;justify-content:center;font-weight:700;">${done?'✓':i+1}</div>
                    <div style="font-size:9px;color:${cur?'#667eea':'#999'};text-align:center;margin-top:2px;white-space:nowrap;overflow:hidden;max-width:56px;text-overflow:ellipsis;" title="${stepLabels[i]}">${stepLabels[i]}</div>
                </div>` +
                (i < steps.length-1 ? `<div style="flex:1;height:2px;background:${done?'#27ae60':'#e0e0e0'};align-self:center;margin-bottom:18px;min-width:6px;"></div>` : '');
            }).join('');

            html += `<div style="padding:12px 0;border-bottom:1px solid var(--border-color,#e0e0e0);min-width:0;">
                <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:8px;">
                    <div style="flex:1;min-width:0;">
                        <div style="font-weight:600;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.name}</div>
                        <div style="font-size:12px;color:#7f8c8d;">${item.domain || ''} &nbsp;|&nbsp; <span style="color:${daysColor};font-weight:600;">${item.days_left} gün kaldı</span> &nbsp;|&nbsp; ${item.responsible || '<span style="color:#e74c3c;">Sorumlu atanmamış</span>'}</div>
                        ${issues ? `<div style="margin-top:4px;">${issues}</div>` : ''}
                    </div>
                    <div style="flex-shrink:0;">
                        <select onchange="CertRenewal.updateLifecycle('${item.id}',this)" style="font-size:12px;padding:4px 8px;border:1px solid #ddd;border-radius:5px;color:${item.lc_color};">
                            ${steps.map((s,i) => `<option value="${s}"${s===item.lifecycle?' selected':''}>${stepLabels[i]}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div style="display:flex;align-items:center;overflow-x:auto;padding-bottom:4px;">${stepHtml}</div>
            </div>`;
        });

        return html + '</div></div>';
    },

    updateLifecycle(certId, sel) {
        const lc = sel.value;
        fetch('api/cert-renewal-status.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: certId, lifecycle: lc })
        }).then(r => r.json()).then(d => {
            if (d.success) {
                showNotification('Lifecycle güncellendi: ' + lc, 'success');
            } else {
                showNotification(d.error || 'Güncelleme başarısız', 'error');
                this.load(); // revert
            }
        });
    },
};
window.CertRenewal = CertRenewal;

// ============================================================================
// ZİNCİR DOĞRULAMA
// ============================================================================
const CertChain = {

    load() {
        const allEl = document.getElementById('chain-all-results');
        if (allEl) allEl.innerHTML = '<div style="padding:20px;color:#667eea;"><i class="fas fa-spinner fa-spin"></i> Yükleniyor...</div>';
        fetch('api/cert-chain-status.php')
            .then(r => r.json())
            .then(d => {
                if (!d.success) { if (allEl) allEl.innerHTML = '<p style="color:red;">' + d.error + '</p>'; return; }
                if (allEl) allEl.innerHTML = this._buildStatusList(d.certs);
            })
            .catch(() => { if (allEl) allEl.innerHTML = '<p style="color:#e74c3c;">Yükleme hatası</p>'; });
    },

    validateSingle() {
        const domain = (document.getElementById('chain-domain-input')?.value || '').trim();
        const port   = parseInt(document.getElementById('chain-port-input')?.value || '443');
        const resEl  = document.getElementById('chain-result');
        if (!domain) { showNotification('Domain girin', 'warning'); return; }
        if (resEl) resEl.innerHTML = '<span style="color:#667eea;"><i class="fas fa-spinner fa-spin"></i> Doğrulanıyor...</span>';

        fetch(`api/cert-chain-validate.php?domain=${encodeURIComponent(domain)}&port=${port}`)
            .then(r => r.json())
            .then(d => {
                if (!d.success && !d.chain_ok) { if (resEl) resEl.innerHTML = '<span style="color:#e74c3c;">Hata: ' + (d.errors?.[0]||d.error||'Bilinmeyen') + '</span>'; return; }
                if (resEl) resEl.innerHTML = this._chainResultHtml(d);
            })
            .catch(() => { if (resEl) resEl.innerHTML = '<span style="color:#e74c3c;">Bağlantı hatası</span>'; });
    },

    rescanAll() {
        const allEl = document.getElementById('chain-all-results');
        if (allEl) allEl.innerHTML = '<div style="padding:20px;color:#667eea;"><i class="fas fa-spinner fa-spin"></i> Tüm sertifikalar taranıyor... (bu işlem ~1-2 dk sürebilir)</div>';
        const certs = window._allCertificatesCache || [];
        const ids = certs.filter(c => c.domain).map(c => c.id);
        if (!ids.length) { if (allEl) allEl.innerHTML = '<p style="color:#7f8c8d;padding:20px;">Sertifika bulunamadı.</p>'; return; }

        fetch('api/cert-chain-validate.php', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ cert_ids: ids })
        }).then(r => r.json()).then(d => {
            if (!d.success) { if (allEl) allEl.innerHTML = '<p style="color:red;">' + d.error + '</p>'; return; }
            showNotification('Tarama tamamlandı, sonuçlar yükleniyor...', 'success');
            this.load();
        });
    },

    toggleIgnore(certId, currentIgnore, btn) {
        const newVal = !currentIgnore;
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }
        fetch('api/cert-chain-status.php', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ id: certId, ignore: newVal })
        }).then(r => r.json()).then(d => {
            if (!d.success) { showNotification(d.error || 'Hata', 'error'); if (btn) { btn.disabled = false; btn.innerHTML = currentIgnore ? '✓ Aktif Et' : '⊘ Yoksay'; } return; }
            showNotification(newVal ? 'Sertifika günlük taramadan çıkarıldı' : 'Sertifika günlük taramaya eklendi', 'success');
            this.load();
        }).catch(() => { if (btn) { btn.disabled = false; btn.innerHTML = currentIgnore ? '✓ Aktif Et' : '⊘ Yoksay'; } });
    },

    _buildStatusList(certs) {
        if (!certs.length) return '<p style="padding:20px;color:#7f8c8d;">Sertifika bulunamadı.</p>';

        const active      = certs.filter(c => !c.chain_scan_ignore);
        const ignored     = certs.filter(c => c.chain_scan_ignore);
        const isAdmin     = document.querySelector('.admin-only') !== null;

        const real        = active.filter(c => !['unreachable','skipped'].includes(c.chain_status));
        const unreachable = active.filter(c => c.chain_status === 'unreachable' || c.chain_status === 'skipped');

        const stats = {
            ok:          real.filter(c => ['ok','f5_ok'].includes(c.chain_status)).length,
            warning:     real.filter(c => ['warning','f5_warning'].includes(c.chain_status)).length,
            error:       real.filter(c => c.chain_status === 'error').length,
            unchecked:   real.filter(c => !c.chain_status || c.chain_status === 'unchecked').length,
            unreachable: unreachable.length,
        };

        let html = `<div class="card" style="margin-bottom:16px;">
          <div class="card-body" style="padding:16px 20px;">
            <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:8px;">
              <span style="font-size:13px;color:#27ae60;font-weight:600;">✅ ${stats.ok} Sağlam</span>
              <span style="font-size:13px;color:#e67e22;font-weight:600;">⚠️ ${stats.warning} Uyarı</span>
              <span style="font-size:13px;color:#e74c3c;font-weight:600;">❌ ${stats.error} Gerçek Hata</span>
              ${stats.unchecked    ? `<span style="font-size:13px;color:#95a5a6;">⬜ ${stats.unchecked} Taranmadı</span>` : ''}
              ${stats.unreachable  ? `<span style="font-size:13px;color:#bdc3c7;">〰 ${stats.unreachable} Erişilemiyor</span>` : ''}
              ${ignored.length     ? `<span style="font-size:13px;color:#bdc3c7;">🚫 ${ignored.length} Yoksayılıyor</span>` : ''}
            </div>
            <p style="font-size:11px;color:#95a5a6;margin:0;">Son tarama günlük 08:20'de otomatik çalışır. "Erişilemiyor" = internal/wildcard/firewall — zincir hatası değildir.</p>
          </div>
        </div>`;

        html += '<div class="card"><div class="card-body" style="padding:0 20px 12px;">';
        real.forEach(c => { html += this._statusRowHtml(c, isAdmin); });

        if (unreachable.length) {
            html += `<div style="margin-top:16px;padding-top:12px;border-top:2px dashed #ecf0f1;">
                <div style="font-size:12px;color:#95a5a6;font-weight:600;margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px;">〰 Erişilemiyor / Wildcard (${unreachable.length}) — mail'e dahil edilmez</div>`;
            unreachable.forEach(c => { html += this._statusRowHtml(c, isAdmin); });
            html += '</div>';
        }

        if (ignored.length) {
            html += `<div style="margin-top:16px;padding-top:12px;border-top:2px dashed #ecf0f1;">
                <div style="font-size:12px;color:#95a5a6;font-weight:600;margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px;">🚫 Yoksayılan Sertifikalar (${ignored.length})</div>`;
            ignored.forEach(c => { html += this._statusRowHtml(c, isAdmin); });
            html += '</div>';
        }

        html += '</div></div>';
        return html;
    },

    _statusRowHtml(c, isAdmin) {
        const statusMap = {
            ok:          { icon:'✅', color:'#27ae60', label:'Sağlam'             },
            warning:     { icon:'⚠️', color:'#e67e22', label:'Uyarı'              },
            error:       { icon:'❌', color:'#e74c3c', label:'Hata'               },
            f5_ok:       { icon:'✅', color:'#059669', label:'F5 Doğrulandı'      },
            f5_warning:  { icon:'⚠️', color:'#d97706', label:'F5 Uyarı'           },
            unreachable: { icon:'〰',  color:'#bdc3c7', label:'Erişilemiyor'       },
            skipped:     { icon:'⊘',  color:'#bdc3c7', label:'Atlandı'            },
            unchecked:   { icon:'⬜', color:'#95a5a6', label:'Taranmadı'          },
        };
        const s       = statusMap[c.chain_status] || statusMap.unchecked;
        const ignored = c.chain_scan_ignore;
        const rowBg   = ignored ? '#f8f8f8' : '';
        const opacity = ignored ? 'opacity:0.6;' : '';
        const checkedAt = c.chain_checked_at
            ? new Date(c.chain_checked_at).toLocaleDateString('tr-TR', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})
            : '—';
        const firstIssue = (c.errors?.[0] || c.warnings?.[0]) || '';
        const ignoreBtnStyle = 'font-size:11px;padding:2px 8px;border-radius:4px;cursor:pointer;border:1px solid;';
        const ignoreBtn = isAdmin ? `<button onclick="CertChain.toggleIgnore('${c.id}',${ignored},this)"
            style="${ignoreBtnStyle}${ignored ? 'border-color:#27ae60;color:#27ae60;background:#fff;' : 'border-color:#bdc3c7;color:#7f8c8d;background:#fff;'}">
            ${ignored ? '✓ Aktif Et' : '⊘ Yoksay'}</button>` : '';

        const f5Info = (c.certs?.length === 0 && (c.chain_status === 'f5_ok' || c.chain_status === 'f5_warning'))
            ? `<span style="font-size:10px;background:#ede9fe;color:#5b21b6;padding:1px 5px;border-radius:3px;margin-left:4px;">F5</span>` : '';
        return `<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border-color,#f0f0f0);${opacity}background:${rowBg};flex-wrap:wrap;">
            <span style="min-width:22px;text-align:center;">${s.icon}</span>
            <div style="flex:1;min-width:150px;">
                <div style="font-size:13px;font-weight:600;color:${ignored?'#95a5a6':s.color};">${c.name}${f5Info}</div>
                <div style="font-size:11px;color:#95a5a6;">${c.domain}</div>
            </div>
            ${firstIssue ? `<div style="font-size:11px;color:${s.color};flex:2;min-width:120px;">${firstIssue}</div>` : '<div style="flex:2;"></div>'}
            <div style="font-size:11px;color:#bdc3c7;min-width:110px;text-align:right;">${checkedAt}</div>
            ${ignoreBtn}
        </div>`;
    },

    _chainResultHtml(d) {
        const ok       = d.chain_ok;
        const icon     = ok && !d.warnings?.length ? '✅' : ok ? '⚠️' : '❌';
        const color    = ok && !d.warnings?.length ? '#27ae60' : ok ? '#e67e22' : '#e74c3c';
        const statusTx = ok && !d.warnings?.length ? 'Zincir Sağlam' : ok ? 'Zincir Uyarıyla Geçerli' : 'Zincir Hatalı';

        let html = `<div style="background:${color}11;border:1px solid ${color}44;border-radius:8px;padding:12px 16px;margin-bottom:12px;">
            <div style="font-size:15px;font-weight:700;color:${color};margin-bottom:6px;">${icon} ${statusTx} — ${d.domain || ''} (Derinlik: ${d.chain_depth})</div>`;

        d.certs?.forEach((c, i) => {
            const cColor = c.is_expired ? '#e74c3c' : c.days_remaining < 30 ? '#e67e22' : '#27ae60';
            html += `<div style="padding:4px 0 4px ${i*16}px;font-size:12px;border-left:2px solid ${cColor};padding-left:8px;margin-left:${i*16}px;margin-bottom:4px;">
                <span style="font-weight:600;">${c.subject_cn}</span>
                <span style="color:#7f8c8d;margin-left:8px;">→ ${c.issuer_cn}</span>
                <span style="color:${cColor};margin-left:8px;">${c.days_remaining}g</span>
                ${c.is_root ? '<span style="font-size:10px;background:#667eea22;color:#667eea;border-radius:3px;padding:1px 5px;margin-left:4px;">ROOT</span>' : ''}
            </div>`;
        });

        if (d.warnings?.length) html += d.warnings.map(w => `<div style="font-size:12px;color:#e67e22;margin-top:4px;">⚠ ${w}</div>`).join('');
        if (d.errors?.length)   html += d.errors.map(e   => `<div style="font-size:12px;color:#e74c3c;margin-top:4px;">✗ ${e}</div>`).join('');

        return html + '</div>';
    },
};
window.CertChain = CertChain;

// ============================================================================
// SERTİFİKA ÜRETİMİ (Self-signed + Let's Encrypt)
// ============================================================================
const CertGenerate = {
    _leSessionId: null,
    _pollTimer: null,

    init() {
        // Provider listesini lazy yükle
        if (!document.getElementById('le-provider')?.dataset.loaded) {
            fetch('api/cert-acme.php?providers')
                .then(r => r.json())
                .then(d => {
                    if (!d.success) return;
                    const sel = document.getElementById('le-provider');
                    if (!sel) return;
                    sel.innerHTML = Object.entries(d.providers)
                        .map(([k,v]) => `<option value="${k}">${v.name}</option>`).join('');
                    sel.dataset.loaded = '1';
                });
        }
    },

    switchTab(tab) {
        document.querySelectorAll('.cert-gen-tab').forEach(b => {
            const active = b.dataset.gentab === tab;
            b.style.background = active ? '#667eea' : '#f0f2f5';
            b.style.color      = active ? '#fff'    : '#555';
            b.style.fontWeight = active ? '600'     : '400';
        });
        document.getElementById('gen-tab-self-signed').style.display = tab === 'self-signed' ? '' : 'none';
        document.getElementById('gen-tab-letsencrypt').style.display = tab === 'letsencrypt'  ? '' : 'none';
    },

    // ── Self-Signed ───────────────────────────────────────────────────────────
    generateSelfSigned() {
        const domain  = document.getElementById('ss-domain')?.value.trim();
        const days    = parseInt(document.getElementById('ss-days')?.value || '365');
        const keySize = parseInt(document.getElementById('ss-keysize')?.value || '4096');
        const org     = document.getElementById('ss-org')?.value.trim();
        const sanRaw  = document.getElementById('ss-san')?.value.trim();
        const save    = document.getElementById('ss-save')?.checked;
        const resEl   = document.getElementById('ss-result');
        const btn     = document.getElementById('ss-gen-btn');

        if (!domain) { showNotification('Domain gerekli', 'warning'); return; }
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Oluşturuluyor...'; }
        if (resEl) resEl.style.display = 'none';

        const san = sanRaw ? sanRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

        fetch('api/cert-generate.php', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ domain, days, key_size: keySize, org, san, save_to_portal: save })
        }).then(r => r.json()).then(d => {
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-cog"></i> Oluştur'; }
            if (!d.success) { showNotification(d.error || 'Hata', 'error'); return; }
            if (resEl) {
                resEl.style.display = 'block';
                resEl.innerHTML = `
                    <div style="background:#e8f5e9;border:1px solid #27ae60;border-radius:8px;padding:16px;margin-bottom:12px;">
                        <div style="font-size:14px;font-weight:700;color:#27ae60;margin-bottom:8px;">✅ Sertifika Oluşturuldu!</div>
                        <div style="font-size:12px;color:#555;margin-bottom:4px;">Domain: <strong>${d.domain}</strong> &nbsp;|&nbsp; Geçerli: ${d.start_date} → ${d.end_date}</div>
                        ${d.cert_id ? `<div style="font-size:12px;color:#27ae60;margin-bottom:8px;"><i class="fas fa-check"></i> Portal'a eklendi (ID: ${d.cert_id.slice(0,8)}...)</div>` : ''}
                    </div>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;">
                        <button onclick="CertGenerate.download('${encodeURIComponent(d.cert_pem)}','${domain}.crt')" style="background:#3498db;color:#fff;border:none;border-radius:6px;padding:7px 14px;cursor:pointer;font-size:12px;"><i class="fas fa-download"></i> Sertifika (.crt)</button>
                        <button onclick="CertGenerate.download('${encodeURIComponent(d.key_pem)}','${domain}.key')" style="background:#e67e22;color:#fff;border:none;border-radius:6px;padding:7px 14px;cursor:pointer;font-size:12px;"><i class="fas fa-key"></i> Private Key (.key) — GİZLİ</button>
                    </div>
                    <details style="margin-top:12px;">
                        <summary style="font-size:12px;color:#7f8c8d;cursor:pointer;">Sertifika PEM göster</summary>
                        <textarea readonly style="width:100%;height:120px;font-size:11px;font-family:monospace;margin-top:6px;box-sizing:border-box;">${d.cert_pem}</textarea>
                    </details>`;
            }
            showNotification('Sertifika başarıyla oluşturuldu!', 'success');
        }).catch(err => {
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-cog"></i> Oluştur'; }
            showNotification('Hata: ' + err.message, 'error');
        });
    },

    download(encodedPem, filename) {
        const pem  = decodeURIComponent(encodedPem);
        const blob = new Blob([pem], { type: 'text/plain' });
        const a    = document.createElement('a');
        a.href     = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
    },

    // ── Let's Encrypt ─────────────────────────────────────────────────────────
    leInit() {
        const email    = document.getElementById('le-email')?.value.trim();
        const provider = document.getElementById('le-provider')?.value;
        const domRaw   = document.getElementById('le-domains')?.value.trim();
        const btn      = document.getElementById('le-init-btn');

        if (!email) { showNotification('E-posta gerekli', 'warning'); return; }
        if (!domRaw) { showNotification('Domain gerekli', 'warning'); return; }

        const domains = domRaw.split(',').map(s => s.trim()).filter(Boolean);
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Başlatılıyor...'; }

        fetch('api/cert-acme.php', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ action: 'init', email, provider, domains })
        }).then(r => r.json()).then(d => {
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-play"></i> Başlat — DNS Kaydını Al'; }
            if (!d.success) { showNotification(d.error || 'Hata', 'error'); return; }
            this._leSessionId = d.session_id;
            this._showDnsStep(d);
        }).catch(err => {
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-play"></i> Başlat — DNS Kaydını Al'; }
            showNotification('Hata: ' + err.message, 'error');
        });
    },

    _showDnsStep(d) {
        document.getElementById('le-step-1').style.display = 'none';
        document.getElementById('le-step-2').style.display = 'block';
        const dnsEl = document.getElementById('le-dns-records');
        if (dnsEl) {
            dnsEl.innerHTML = d.txt_records.map(r => `
                <div style="background:#fff;border:1px solid #e0e0e0;border-radius:6px;padding:10px 12px;margin-bottom:8px;font-family:monospace;">
                    <div style="font-size:11px;color:#7f8c8d;margin-bottom:2px;">TXT kaydı — ${r.domain}</div>
                    <div style="font-size:12px;"><span style="color:#9b59b6;font-weight:600;">Ad:</span> ${r.name}</div>
                    <div style="font-size:12px;margin-top:2px;word-break:break-all;"><span style="color:#9b59b6;font-weight:600;">Değer:</span> ${r.value}</div>
                    <button onclick="navigator.clipboard.writeText('${r.value}')" style="margin-top:6px;background:#f8f9fa;border:1px solid #ddd;border-radius:4px;padding:3px 8px;font-size:11px;cursor:pointer;"><i class="fas fa-copy"></i> Kopyala</button>
                </div>`).join('');
        }
    },

    leValidate() {
        if (!this._leSessionId) { showNotification('Oturum bulunamadı', 'error'); return; }
        const btn    = document.getElementById('le-validate-btn');
        const msgEl  = document.getElementById('le-status-msg');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Doğrulanıyor...'; }
        if (msgEl) msgEl.textContent = '';

        fetch('api/cert-acme.php', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ action: 'validate', session_id: this._leSessionId })
        }).then(r => r.json()).then(d => {
            if (!d.success) {
                if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check-circle"></i> DNS Eklendi, Doğrula'; }
                showNotification(d.error || 'Doğrulama hatası', 'error');
                return;
            }
            if (msgEl) msgEl.textContent = d.message || 'Doğrulama başlatıldı...';
            this._pollStatus();
        }).catch(err => {
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check-circle"></i> DNS Eklendi, Doğrula'; }
            showNotification('Hata: ' + err.message, 'error');
        });
    },

    _pollStatus() {
        if (this._pollTimer) clearTimeout(this._pollTimer);
        const msgEl = document.getElementById('le-status-msg');

        const poll = () => {
            fetch('api/cert-acme.php', {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({ action: 'status', session_id: this._leSessionId })
            }).then(r => r.json()).then(d => {
                if (!d.success) { if (msgEl) msgEl.innerHTML = '<span style="color:#e74c3c;">Hata: ' + d.error + '</span>'; return; }

                if (d.status === 'issued') {
                    this._showCertResult(d);
                } else if (d.status === 'error') {
                    if (msgEl) msgEl.innerHTML = '<span style="color:#e74c3c;">Hata: ' + (d.error||'Bilinmeyen') + '</span>';
                } else {
                    if (msgEl) msgEl.textContent = 'Durum: ' + d.status + '... (yeniden kontrol ediliyor)';
                    this._pollTimer = setTimeout(poll, 5000);
                }
            }).catch(() => {
                this._pollTimer = setTimeout(poll, 8000);
            });
        };
        this._pollTimer = setTimeout(poll, 3000);
    },

    _showCertResult(d) {
        document.getElementById('le-step-2').style.display = 'none';
        const step3 = document.getElementById('le-step-3');
        if (!step3) return;
        step3.style.display = 'block';
        const domain = document.getElementById('le-domains')?.value.split(',')[0].trim() || 'cert';
        step3.innerHTML = `
            <div style="background:#e8f5e9;border:1px solid #27ae60;border-radius:8px;padding:16px;margin-bottom:12px;">
                <div style="font-size:14px;font-weight:700;color:#27ae60;margin-bottom:8px;">🎉 Sertifika Başarıyla Verildi!</div>
                <p style="font-size:13px;color:#555;margin:0 0 12px;">Sertifikayı indirin ve sunucunuza yükleyin.</p>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    <button onclick="CertGenerate.download('${encodeURIComponent(d.cert_pem)}','${domain}.crt')" style="background:#27ae60;color:#fff;border:none;border-radius:6px;padding:7px 14px;cursor:pointer;font-size:12px;"><i class="fas fa-download"></i> Sertifika Zinciri (.crt)</button>
                    <button onclick="CertGenerate.download('${encodeURIComponent(d.key_pem)}','${domain}.key')" style="background:#e67e22;color:#fff;border:none;border-radius:6px;padding:7px 14px;cursor:pointer;font-size:12px;"><i class="fas fa-key"></i> Private Key (.key) — GİZLİ</button>
                    <button onclick="CertGenerate.leReset()" style="background:#f8f9fa;color:#666;border:1px solid #ddd;border-radius:6px;padding:7px 14px;cursor:pointer;font-size:12px;">Yeni Sertifika</button>
                </div>
            </div>`;
        showNotification('Sertifika başarıyla verildi!', 'success');
    },

    leCancel() {
        if (this._leSessionId) {
            fetch('api/cert-acme.php', {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({ action: 'cancel', session_id: this._leSessionId })
            });
            this._leSessionId = null;
        }
        if (this._pollTimer) clearTimeout(this._pollTimer);
        this.leReset();
    },

    leReset() {
        this._leSessionId = null;
        if (this._pollTimer) clearTimeout(this._pollTimer);
        document.getElementById('le-step-1').style.display = 'block';
        document.getElementById('le-step-2').style.display = 'none';
        document.getElementById('le-step-3').style.display = 'none';
        const btn = document.getElementById('le-init-btn');
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-play"></i> Başlat — DNS Kaydını Al'; }
    },
};
window.CertGenerate = CertGenerate;
