// ============================================================================
// DASHBOARD API MANAGER - Dashboard API Yönetimi
// ============================================================================

console.log('🎯 DashboardApiManager.js yükleniyor...');

let dashboardApis = [];
let allApisForSelection = [];

// Dashboard API'lerini yükle ve göster
function loadDashboardApis() {
    console.log('📊 Dashboard API\'leri yükleniyor...');
    console.log('  Dashboard page görünür mü?', document.getElementById('dashboard-page')?.style.display);
    console.log('  API list container var mı?', !!document.getElementById('dashboard-api-list'));

    fetch('dashboard-api-manager.php?action=get')
        .then(response => {
            console.log('  📡 Response alındı, status:', response.status);
            return response.json();
        })
        .then(data => {
            console.log('  📦 Data parse edildi:', data);
            if (data.success) {
                dashboardApis = data.apis || [];
                console.log('  ✅ API\'ler alındı, sayı:', dashboardApis.length);
                renderDashboardApiList(dashboardApis);
            } else {
                console.error('  ❌ Dashboard API\'leri yüklenemedi, success=false');
            }
        })
        .catch(error => {
            console.error('  ❌ Fetch hatası:', error);
            const container = document.getElementById('dashboard-api-list');
            if (container) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 40px 20px; color: #e74c3c;">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p style="margin-top: 10px; font-size: 13px;">API'ler yüklenemedi</p>
                        <p style="font-size: 11px; color: #95a5a6;">${error.message}</p>
                    </div>
                `;
            }
        });
}

// Dashboard API listesini render et
function renderDashboardApiList(apis) {
    const container = document.getElementById('dashboard-api-list');

    console.log('🎨 renderDashboardApiList çağrıldı');
    console.log('  Container:', container);
    console.log('  API sayısı:', apis ? apis.length : 0);
    console.log('  API verileri:', apis);

    if (!container) {
        console.warn('dashboard-api-list container yok (demo)');
        return;
    }

    if (!apis || apis.length === 0) {
        console.log('⚠️ Hiç API yok, boş mesajı gösteriliyor');
        container.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: #95a5a6;">
                <i class="fas fa-plug" style="font-size: 2em; margin-bottom: 10px; opacity: 0.5;"></i>
                <p style="font-size: 13px; margin: 0;">Henüz dashboard'a API eklenmemiş</p>
                <button onclick="openDashboardApiModal()" style="margin-top: 15px; padding: 8px 16px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                    <i class="fas fa-plus"></i> API Ekle
                </button>
            </div>
        `;
        return;
    }

    console.log('✅ ' + apis.length + ' API render ediliyor...');

    container.innerHTML = apis.map(api => {
        const statusColor = api.last_status === 'success' ? '#27ae60' :
                           api.last_status === 'error' ? '#e74c3c' : '#95a5a6';

        const statusIcon = api.last_status === 'success' ? 'fa-check-circle' :
                          api.last_status === 'error' ? 'fa-times-circle' : 'fa-question-circle';

        const authIcon = api.auth_type === 'none' ? '🔓' :
                        api.auth_type === 'bearer' ? '🔑' :
                        api.auth_type === 'apikey' ? '🔐' : '👤';

        return `
            <div style="background: white; border: 1px solid #e9ecef; border-radius: 8px; padding: 12px; margin-bottom: 10px; transition: all 0.2s; border-left: 3px solid ${statusColor};"
                 onmouseover="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.1)'"
                 onmouseout="this.style.boxShadow='none'">

                <!-- Header -->
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                    <div style="flex: 1;">
                        <h4 style="margin: 0 0 4px 0; font-size: 13px; font-weight: 600; color: #2c3e50;">
                            ${authIcon} ${escapeHtml(api.name)}
                        </h4>
                        <p style="margin: 0; font-size: 11px; color: #7f8c8d; font-family: 'Courier New', monospace;">
                            ${escapeHtml(api.base_url.substring(0, 35))}${api.base_url.length > 35 ? '...' : ''}
                        </p>
                    </div>
                    <i class="fas ${statusIcon}" style="color: ${statusColor}; font-size: 14px;" title="${api.last_status || 'Test edilmedi'}"></i>
                </div>

                <!-- Description -->
                ${api.description ? `
                    <p style="margin: 0 0 10px 0; font-size: 11px; color: #7f8c8d; line-height: 1.4;">
                        ${escapeHtml(api.description.substring(0, 80))}${api.description.length > 80 ? '...' : ''}
                    </p>
                ` : ''}

                <!-- Actions -->
                <div style="display: flex; gap: 6px; margin-top: 10px;">
                    <button onclick="testDashboardApi('${api.id}')" title="Test Et"
                            style="flex: 1; padding: 6px; background: #27ae60; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; transition: all 0.2s;"
                            onmouseover="this.style.opacity='0.8'"
                            onmouseout="this.style.opacity='1'">
                        <i class="fas fa-vial"></i> Test
                    </button>
                    <button onclick="goToApiTools('${api.id}')" title="Araçlar'da Aç"
                            style="flex: 1; padding: 6px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; transition: all 0.2s;"
                            onmouseover="this.style.opacity='0.8'"
                            onmouseout="this.style.opacity='1'">
                        <i class="fas fa-external-link-alt"></i> Detay
                    </button>
                    <button onclick="removeDashboardApi('${api.id}')" title="Dashboard'dan Çıkar"
                            style="flex: 0.5; padding: 6px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; transition: all 0.2s;"
                            onmouseover="this.style.opacity='0.8'"
                            onmouseout="this.style.opacity='1'">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Modal aç - API seçim modal'ı
function openDashboardApiModal() {
    document.getElementById('dashboard-api-modal').style.display = 'block';

    // Tüm API'leri ve seçili olanları yükle
    fetch('dashboard-api-manager.php?action=all')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                allApisForSelection = data.all_apis || [];
                const selectedIds = data.selected_ids || [];
                renderApiSelectionList(allApisForSelection, selectedIds);
                updateSelectionCount();
            }
        })
        .catch(error => {
            console.error('API\'ler yüklenemedi:', error);
        });
}

// Modal kapat
function closeDashboardApiModal() {
    document.getElementById('dashboard-api-modal').style.display = 'none';
}

// API seçim listesini render et
function renderApiSelectionList(apis, selectedIds = []) {
    const container = document.getElementById('dashboard-api-selection-list');
    const totalCount = document.getElementById('total-api-count');

    totalCount.textContent = apis.length;

    if (apis.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #95a5a6;">
                <i class="fas fa-info-circle" style="font-size: 2em;"></i>
                <p style="margin-top: 10px;">Henüz hiç API eklenmemiş</p>
                <p style="font-size: 12px;">Önce Araçlar sayfasından API ekleyin</p>
            </div>
        `;
        return;
    }

    container.innerHTML = apis.map(api => {
        const isSelected = selectedIds.includes(api.id);
        const statusColor = api.last_status === 'success' ? '#27ae60' :
                           api.last_status === 'error' ? '#e74c3c' : '#95a5a6';

        const authIcon = api.auth_type === 'none' ? '🔓' :
                        api.auth_type === 'bearer' ? '🔑' :
                        api.auth_type === 'apikey' ? '🔐' : '👤';

        return `
            <label style="display: block; background: white; border: 1px solid ${isSelected ? '#3498db' : '#e9ecef'}; border-radius: 6px; padding: 12px; margin-bottom: 8px; cursor: pointer; transition: all 0.2s; ${isSelected ? 'box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);' : ''}"
                   onmouseover="if (!this.querySelector('input').checked) this.style.borderColor='#bdc3c7'"
                   onmouseout="if (!this.querySelector('input').checked) this.style.borderColor='#e9ecef'">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <input type="checkbox"
                           class="api-checkbox"
                           data-api-id="${api.id}"
                           ${isSelected ? 'checked' : ''}
                           onchange="updateSelectionCount()"
                           style="width: 18px; height: 18px; cursor: pointer;">

                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                            <span style="font-weight: 600; font-size: 13px; color: #2c3e50;">
                                ${authIcon} ${escapeHtml(api.name)}
                            </span>
                            <span style="width: 8px; height: 8px; border-radius: 50%; background: ${statusColor};" title="${api.last_status || 'Test edilmedi'}"></span>
                        </div>
                        <div style="font-size: 11px; color: #7f8c8d; font-family: 'Courier New', monospace;">
                            ${escapeHtml(api.base_url.substring(0, 50))}${api.base_url.length > 50 ? '...' : ''}
                        </div>
                        ${api.description ? `
                            <div style="font-size: 11px; color: #95a5a6; margin-top: 4px;">
                                ${escapeHtml(api.description.substring(0, 60))}${api.description.length > 60 ? '...' : ''}
                            </div>
                        ` : ''}
                    </div>
                </div>
            </label>
        `;
    }).join('');
}

// Seçim sayısını güncelle
function updateSelectionCount() {
    const checkboxes = document.querySelectorAll('.api-checkbox:checked');
    const count = checkboxes.length;
    document.getElementById('selected-api-count').textContent = count;

    // 10'dan fazla seçilirse uyarı
    if (count > 10) {
        document.getElementById('selected-api-count').style.color = '#e74c3c';
    } else {
        document.getElementById('selected-api-count').style.color = '#2c3e50';
    }
}

// Dashboard API'leri filtrele (modal içi arama)
function filterDashboardApis() {
    const searchTerm = document.getElementById('dashboard-api-search').value.toLowerCase();
    const selectedIds = Array.from(document.querySelectorAll('.api-checkbox:checked')).map(cb => cb.dataset.apiId);

    const filtered = allApisForSelection.filter(api => {
        return api.name.toLowerCase().includes(searchTerm) ||
               api.description.toLowerCase().includes(searchTerm) ||
               api.base_url.toLowerCase().includes(searchTerm);
    });

    renderApiSelectionList(filtered, selectedIds);
}

// Tümünü seç
function selectAllDashboardApis() {
    const checkboxes = document.querySelectorAll('.api-checkbox');
    checkboxes.forEach(cb => cb.checked = true);
    updateSelectionCount();
}

// Hiçbirini seçme
function deselectAllDashboardApis() {
    const checkboxes = document.querySelectorAll('.api-checkbox');
    checkboxes.forEach(cb => cb.checked = false);
    updateSelectionCount();
}

// Dashboard API'leri kaydet
function saveDashboardApis() {
    const checkboxes = document.querySelectorAll('.api-checkbox:checked');
    const selectedIds = Array.from(checkboxes).map(cb => cb.dataset.apiId);

    if (selectedIds.length > 10) {
        alert('⚠️ En fazla 10 API seçebilirsiniz!');
        return;
    }

    const formData = new FormData();
    formData.append('action', 'save');
    formData.append('api_ids', JSON.stringify(selectedIds));

    fetch('dashboard-api-manager.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            closeDashboardApiModal();
            loadDashboardApis(); // Listeyi yenile

            // Success toast (optional)
            console.log('✅ Dashboard API\'leri güncellendi:', data.count, 'API');
        } else {
            alert('❌ Hata: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Kayıt hatası:', error);
        alert('❌ API\'ler kaydedilirken hata oluştu');
    });
}

// Dashboard'dan API çıkar
function removeDashboardApi(apiId) {
    if (!confirm('Bu API\'yi dashboard\'dan çıkarmak istediğinize emin misiniz?')) {
        return;
    }

    const formData = new FormData();
    formData.append('action', 'remove');
    formData.append('api_id', apiId);

    fetch('dashboard-api-manager.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            loadDashboardApis(); // Listeyi yenile
        } else {
            alert('❌ Hata: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Silme hatası:', error);
    });
}

// Dashboard'dan API'yi test et
function testDashboardApi(apiId) {
    // ApiManager.js'deki testApiConnection fonksiyonunu kullan
    if (typeof testApiConnection === 'function') {
        testApiConnection(apiId);
    } else {
        console.error('testApiConnection fonksiyonu bulunamadı!');
        alert('Test fonksiyonu yüklenemedi');
    }
}

// Araçlar sayfasına git ve API'yi yükle
function goToApiTools(apiId) {
    // Araçlar sayfasına geç
    showPage('tools');
    window.location.hash = 'tools';

    // Kısa bir gecikme ile API'yi forma yükle
    setTimeout(() => {
        if (typeof loadApiToQuickForm === 'function') {
            loadApiToQuickForm(apiId);
        }
    }, 500);
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

window.loadDashboardApis = loadDashboardApis;
window.openDashboardApiModal = openDashboardApiModal;
window.closeDashboardApiModal = closeDashboardApiModal;
window.filterDashboardApis = filterDashboardApis;
window.selectAllDashboardApis = selectAllDashboardApis;
window.deselectAllDashboardApis = deselectAllDashboardApis;
window.saveDashboardApis = saveDashboardApis;
window.removeDashboardApi = removeDashboardApi;
window.testDashboardApi = testDashboardApi;
window.goToApiTools = goToApiTools;

console.log('✅ DashboardApiManager.js yüklendi');

// ============================================================================
// AUTO-LOAD ON PAGE READY
// ============================================================================

// Dashboard sayfası açıksa API'leri otomatik yükle
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔄 DashboardApiManager: DOM ready, API\'ler kontrol ediliyor...');

    // Dashboard sayfası görünürse API'leri yükle
    const checkAndLoad = () => {
        const dashboardPage = document.getElementById('dashboard-page');
        const apiList = document.getElementById('dashboard-api-list');

        if (dashboardPage && apiList && dashboardPage.style.display !== 'none') {
            console.log('✅ Dashboard görünür, API\'ler yükleniyor...');
            loadDashboardApis();
        } else {
            console.log('⏳ Dashboard henüz görünür değil, bekliyor...');
        }
    };

    // İlk kontrol
    checkAndLoad();

    // Biraz bekleyip tekrar kontrol (timing sorunları için)
    setTimeout(checkAndLoad, 100);
    setTimeout(checkAndLoad, 300);
    setTimeout(checkAndLoad, 500);
});
