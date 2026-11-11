// ============================================================================
// API MANAGER - API Yönetim Sistemi
// ============================================================================

console.log('🔌 ApiManager.js yükleniyor...');

const AUTH_LABELS = {
    'none': '🔓 No Auth',
    'bearer': '🔑 Bearer Token',
    'apikey': '🔐 API Key',
    'basic': '👤 Basic Auth'
};

let apisCache = null;
let isLoadingApis = false;

function normalizeApiResponse(data) {
    if (Array.isArray(data)) {
        return data;
    }

    if (data && Array.isArray(data.data)) {
        return data.data;
    }

    if (data && Array.isArray(data.apis)) {
        return data.apis;
    }

    return [];
}

function formatCustomHeaders(headers) {
    if (!Array.isArray(headers)) {
        return '';
    }
    return headers
        .filter(header => header && header.name)
        .map(header => `${header.name}: ${header.value ?? ''}`.trim())
        .join('\n');
}

function getAuthTypeName(type) {
    return AUTH_LABELS[type] || type || 'Bilinmiyor';
}

function buildAuthSummary(api) {
    const authType = api.auth_type || 'none';

    if (authType === 'apikey' && api.api_key) {
        return `${getAuthTypeName(authType)} • ${api.api_key}`;
    }

    if (authType === 'basic' && api.api_key) {
        return `${getAuthTypeName(authType)} • Kullanıcı: ${escapeHtml(api.api_key)}`;
    }

    return getAuthTypeName(authType);
}

// ============================================================================
// API İŞLEMLERİ
// ============================================================================

// API'leri yükle
function loadApis(forceRefresh = false) {
    console.log('📥 API\'ler yükleniyor...');

    // Check if the API list element exists
    const apiListElement = document.getElementById('api-list');
    if (!apiListElement) {
        // Check if we're on the new tools page (has api-list-tbody)
        const newToolsPage = document.getElementById('api-list-tbody');
        if (newToolsPage) {
            console.log('ℹ️ Yeni tools sayfası tespit edildi, ApiManager.js atlanıyor');
            return; // Don't retry on new tools page
        }
        console.warn('⚠️ api-list elementi bulunamadı, daha sonra tekrar denenecek');
        setTimeout(() => loadApis(forceRefresh), 500);
        return;
    }

    if (!forceRefresh && Array.isArray(apisCache) && apisCache.length > 0) {
        console.log('ℹ️ API cache kullanılıyor, ' + apisCache.length + ' API render ediliyor');
        renderApiList(apisCache);
        updateTestApiSelect(apisCache);
        return;
    }

    if (isLoadingApis) {
        console.log('⏳ API yükleme devam ediyor, bekleniyor...');
        return;
    }

    isLoadingApis = true;

    fetch('api-manager.php?action=list')
        .then(response => {
            console.log('📡 API yanıtı alındı, HTTP status:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('📦 API verisi parse edildi:', data);
            if (data && data.success === false) {
                throw new Error(data.message || 'API listesi alınamadı');
            }
            const apis = normalizeApiResponse(data);
            console.log('✅ API\'ler yüklendi ve normalize edildi:', apis.length, 'adet API');
            console.log('🔍 İlk API:', apis[0] ? apis[0].name : 'yok');
            apisCache = apis;
            renderApiList(apis);
            updateTestApiSelect(apis);
        })
        .catch(error => {
            console.error('❌ API yükleme hatası:', error);
            const container = document.getElementById('api-list');
            if (container) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #e74c3c;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 2em;"></i>
                        <p>API'ler yüklenirken hata oluştu</p>
                        <p style="font-size: 13px;">${escapeHtml(error.message)}</p>
                        <button onclick="loadApis(true)" style="margin-top: 15px; padding: 8px 16px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            <i class="fas fa-sync"></i> Tekrar Dene
                        </button>
                    </div>
                `;
            }
            apisCache = null;
        })
        .finally(() => {
            isLoadingApis = false;
        });
}

// Filtreleri temizle
function clearFilters() {
    document.getElementById('api-search').value = '';
    document.getElementById('filter-status').value = 'all';
    document.getElementById('filter-auth').value = 'all';
    document.getElementById('filter-test').value = 'all';
    filterApis();
}

// Filtreleme fonksiyonu
function filterApis() {
    const searchTerm = document.getElementById('api-search').value.toLowerCase();
    const statusFilter = document.getElementById('filter-status').value;
    const authFilter = document.getElementById('filter-auth').value;
    const testFilter = document.getElementById('filter-test').value;

    if (!apisCache || apisCache.length === 0) {
        return;
    }

    // Filter APIs
    const filteredApis = apisCache.filter(api => {
        // Search filter
        const matchesSearch = !searchTerm ||
            api.name.toLowerCase().includes(searchTerm) ||
            api.description.toLowerCase().includes(searchTerm) ||
            api.base_url.toLowerCase().includes(searchTerm);

        // Status filter
        const matchesStatus = statusFilter === 'all' || api.status === statusFilter;

        // Auth filter
        const matchesAuth = authFilter === 'all' || api.auth_type === authFilter;

        // Test status filter
        let matchesTest = true;
        if (testFilter === 'success') {
            matchesTest = api.last_status === 'success';
        } else if (testFilter === 'error') {
            matchesTest = api.last_status === 'error';
        } else if (testFilter === 'untested') {
            matchesTest = !api.last_status;
        }

        return matchesSearch && matchesStatus && matchesAuth && matchesTest;
    });

    // Update filter info
    const filterInfo = document.getElementById('filter-info');
    const filterCount = document.getElementById('filter-count');

    const isFiltering = searchTerm || statusFilter !== 'all' || authFilter !== 'all' || testFilter !== 'all';

    if (isFiltering) {
        filterInfo.style.display = 'block';
        filterCount.textContent = filteredApis.length + '/' + apisCache.length;
    } else {
        filterInfo.style.display = 'none';
    }

    // Render filtered list
    renderApiList(filteredApis);
}

// API listesini render et
function renderApiList(apis) {
    console.log('🎨 renderApiList çağrıldı, API sayısı:', apis ? apis.length : 'undefined');

    const container = document.getElementById('api-list');
    if (!container) {
        console.error('❌ api-list container bulunamadı!');
        return;
    }

    if (!apis || apis.length === 0) {
        console.log('ℹ️ API listesi boş, bilgi mesajı gösteriliyor');

        // Check if this is due to filtering
        const searchTerm = document.getElementById('api-search')?.value;
        const isFiltering = searchTerm ||
            document.getElementById('filter-status')?.value !== 'all' ||
            document.getElementById('filter-auth')?.value !== 'all' ||
            document.getElementById('filter-test')?.value !== 'all';

        if (isFiltering && apisCache && apisCache.length > 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #95a5a6;">
                    <i class="fas fa-filter" style="font-size: 2em; margin-bottom: 10px;"></i>
                    <p>Filtreye uygun API bulunamadı</p>
                    <p style="font-size: 14px;">Arama veya filtreleri temizleyin</p>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #95a5a6;">
                    <i class="fas fa-info-circle" style="font-size: 2em; margin-bottom: 10px;"></i>
                    <p>Henüz kayıtlı API yok</p>
                    <p style="font-size: 14px;">Sağ üstteki "Yeni API Ekle" butonuna tıklayarak başlayın</p>
                </div>
            `;
        }
        return;
    }

    console.log('✏️ ' + apis.length + ' API render ediliyor...');

    container.innerHTML = apis.map(api => {
        const statusBadge = api.last_status === 'success' ?
            '<span style="background: #d4edda; color: #155724; padding: 3px 8px; border-radius: 10px; font-size: 10px; font-weight: 700;"><i class="fas fa-check-circle"></i> BAŞARILI</span>' :
            api.last_status === 'error' ?
            '<span style="background: #f8d7da; color: #721c24; padding: 3px 8px; border-radius: 10px; font-size: 10px; font-weight: 700;"><i class="fas fa-times-circle"></i> HATA</span>' :
            '<span style="background: #e2e3e5; color: #6c757d; padding: 3px 8px; border-radius: 10px; font-size: 10px; font-weight: 700;"><i class="fas fa-question-circle"></i> BELİRSİZ</span>';

        const activeBadge = api.status === 'active' ?
            '<span style="background: #cfe2ff; color: #084298; padding: 3px 8px; border-radius: 10px; font-size: 10px; font-weight: 700;"><i class="fas fa-power-off"></i> AKTİF</span>' :
            '<span style="background: #e2e3e5; color: #6c757d; padding: 3px 8px; border-radius: 10px; font-size: 10px; font-weight: 700;"><i class="fas fa-ban"></i> PASİF</span>';

        return `
            <div style="border: 1px solid ${api.last_status === 'success' ? '#28a745' : api.last_status === 'error' ? '#dc3545' : '#e9ecef'}; border-radius: 8px; padding: 15px; margin-bottom: 12px; background: white; transition: all 0.2s;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                    <h4 style="margin: 0; color: #2c3e50; font-size: 14px; font-weight: 600;">
                        <i class="fas fa-plug" style="color: #3498db;"></i> ${escapeHtml(api.name)}
                    </h4>
                    <div style="display: flex; gap: 4px; flex-direction: column; align-items: flex-end;">
                        ${statusBadge}
                        ${activeBadge}
                    </div>
                </div>
                <p style="margin: 0 0 8px 0; color: #7f8c8d; font-size: 11px; word-break: break-all;">
                    <i class="fas fa-link"></i> ${escapeHtml(api.base_url)}
                </p>
                <div style="display: flex; gap: 6px; margin-bottom: 10px;">
                    <span style="background: #e3f2fd; color: #1976d2; padding: 3px 8px; border-radius: 10px; font-size: 10px; font-weight: 600;">
                        ${escapeHtml(api.type || 'REST')}
                    </span>
                    <span style="background: #f3e5f5; color: #6a1b9a; padding: 3px 8px; border-radius: 10px; font-size: 10px; font-weight: 600;">
                        ${getAuthTypeName(api.auth_type)}
                    </span>
                </div>
                ${api.last_test ? `<p style="margin: 0 0 10px 0; font-size: 10px; color: #95a5a6;"><i class="fas fa-clock"></i> Son test: ${api.last_test}</p>` : ''}
                <div style="display: flex; gap: 5px;">
                    <button onclick="testApiConnection('${api.id}')" class="action-btn" title="Test Et" style="flex: 1; padding: 6px; background: #27ae60; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">
                        <i class="fas fa-vial"></i>
                    </button>
                    <button onclick="loadApiToQuickForm('${api.id}')" class="action-btn" title="Düzenle" style="flex: 1; padding: 6px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteApi('${api.id}')" class="action-btn" title="Sil" style="flex: 1; padding: 6px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Test API select'i güncelle
function updateTestApiSelect(apis) {
    // DEPRECATED: API Tester kaldırıldı, bu fonksiyon artık kullanılmıyor
    // Geriye dönük uyumluluk için boş bırakıldı
    return;
}

// ============================================================================
// MODAL İŞLEMLERİ
// ============================================================================

// API modal aç
function openApiModal(apiId = null) {
    document.getElementById('api-modal-title').textContent = apiId ? 'API Düzenle' : 'Yeni API Ekle';
    document.getElementById('api-form').reset();
    document.getElementById('api-id').value = '';
    const customHeadersField = document.getElementById('api-custom-headers');
    if (customHeadersField) {
        customHeadersField.value = '';
    }
    toggleAuthFields();

    const fillModalFields = (api) => {
        if (!api) {
            return;
        }
        document.getElementById('api-id').value = api.id;
        document.getElementById('api-name').value = api.name;
        document.getElementById('api-base-url').value = api.base_url;
        document.getElementById('api-auth-type').value = api.auth_type;
        document.getElementById('api-key').value = api.api_key || '';
        document.getElementById('api-value').value = api.api_value || '';
        document.getElementById('api-description').value = api.description || '';
        if (customHeadersField) {
            const rawHeaders = api.custom_headers_raw || formatCustomHeaders(api.custom_headers);
            customHeadersField.value = rawHeaders || '';
        }
        toggleAuthFields();
    };

    if (apiId) {
        if (Array.isArray(apisCache) && apisCache.length > 0) {
            const cachedApi = apisCache.find(a => a.id == apiId);
            if (cachedApi) {
                fillModalFields(cachedApi);
            }
        } else {
            fetch('api-manager.php?action=list')
                .then(response => response.json())
                .then(data => {
                    const apis = normalizeApiResponse(data);
                    const api = apis.find(a => a.id == apiId);
                    if (api) {
                        fillModalFields(api);
                    }
                });
        }
    }

    openModal('api-modal');
}

// Auth alanlarını göster/gizle
function toggleAuthFields() {
    const authType = document.getElementById('api-auth-type').value;
    const authFields = document.getElementById('auth-fields');
    const apiKeyField = document.getElementById('api-key-field');
    const apiKeyLabel = document.getElementById('api-key-label');
    const apiValueLabel = document.getElementById('api-value-label');
    const apiKeyInput = document.getElementById('api-key');
    const apiValueInput = document.getElementById('api-value');
    const authHelper = document.getElementById('auth-helper-text');

    if (!authFields) {
        return;
    }

    if (authType === 'none') {
        authFields.style.display = 'none';
        if (authHelper) {
            authHelper.textContent = 'Bu API kimlik doğrulama gerektirmiyor.';
        }
        if (apiValueInput) {
            apiValueInput.type = 'text';
        }
        return;
    }

    authFields.style.display = 'block';

    if (authType === 'apikey') {
        apiKeyField.style.display = 'block';
        if (apiKeyLabel) apiKeyLabel.textContent = 'Header Name (örn: X-API-Key)';
        if (apiKeyInput) {
            apiKeyInput.placeholder = 'X-API-Key';
            apiKeyInput.type = 'text';
        }
        if (apiValueLabel) apiValueLabel.textContent = 'Header Value / Token';
        if (apiValueInput) {
            apiValueInput.placeholder = 'your-api-key';
            apiValueInput.type = 'text';
        }
        if (authHelper) {
            authHelper.textContent = 'Grafana ve benzeri servisler için header adını ve değerini girin.';
        }
    } else if (authType === 'bearer') {
        apiKeyField.style.display = 'none';
        if (apiValueLabel) apiValueLabel.textContent = 'Bearer Token';
        if (apiValueInput) {
            apiValueInput.placeholder = 'eyJhbGciOi...';
            apiValueInput.type = 'text';
        }
        if (authHelper) {
            authHelper.textContent = 'Authorization: Bearer <token> header\'ı otomatik olarak eklenir.';
        }
    } else if (authType === 'basic') {
        apiKeyField.style.display = 'block';
        if (apiKeyLabel) apiKeyLabel.textContent = 'Kullanıcı Adı';
        if (apiKeyInput) {
            apiKeyInput.placeholder = 'username';
            apiKeyInput.type = 'text';
        }
        if (apiValueLabel) apiValueLabel.textContent = 'Şifre';
        if (apiValueInput) {
            apiValueInput.placeholder = '••••••••';
            apiValueInput.type = 'password';
        }
        if (authHelper) {
            authHelper.textContent = 'Basic Auth için kullanıcı adı ve şifre bilgilerini girin.';
        }
    }
}

// API kaydet
function saveApi(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const apiId = document.getElementById('api-id').value;
    formData.append('action', apiId ? 'edit' : 'add');

    fetch('api-manager.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            alert('✅ ' + result.message);
            closeModal('api-modal');
            apisCache = null;
            loadApis(true);
        } else {
            alert('❌ Hata: ' + result.message);
        }
    })
    .catch(error => {
        console.error('Hata:', error);
        alert('❌ Kaydetme sırasında hata oluştu');
    });
}

// API düzenle
function editApi(apiId) {
    openApiModal(apiId);
}

// API sil
function deleteApi(apiId) {
    if (!confirm('Bu API\'yi silmek istediğinizden emin misiniz?')) {
        return;
    }

    const formData = new FormData();
    formData.append('action', 'delete');
    formData.append('id', apiId);

    fetch('api-manager.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            alert('✅ ' + result.message);
            apisCache = null;
            loadApis(true);
        } else {
            alert('❌ Hata: ' + result.message);
        }
    })
    .catch(error => {
        console.error('Hata:', error);
        alert('❌ Silme sırasında hata oluştu');
    });
}

// ============================================================================
// TEST İŞLEMLERİ
// ============================================================================

// API bağlantısını test et
function testApiConnection(apiId) {
    // Get button if called from button click
    const btn = event && event.target ? event.target : null;
    let originalText = '';

    if (btn) {
        originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        btn.disabled = true;
    }

    // Show loading in quick test result (orta panel)
    const testResult = document.getElementById('quick-test-result');
    const testMessage = document.getElementById('quick-test-message');
    if (testResult && testMessage) {
        testResult.style.display = 'block';
        testResult.style.background = '#fff3cd';
        testResult.style.borderLeft = '4px solid #ffc107';
        testMessage.innerHTML = '<i class="fas fa-spinner fa-spin"></i> API bağlantısı test ediliyor...';
    }

    const formData = new FormData();
    formData.append('action', 'test');
    formData.append('id', apiId);

    fetch('api-manager.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(result => {
        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }

        // Update quick test result (Araçlar sayfası)
        if (testResult && testMessage) {
            if (result.success) {
                testResult.style.background = '#d4edda';
                testResult.style.borderLeft = '4px solid #28a745';
                testMessage.innerHTML = `
                    <i class="fas fa-check-circle"></i> <strong>✅ Bağlantı Başarılı!</strong><br>
                    <div style="margin-top: 8px; font-size: 12px;">
                        <strong>HTTP Status:</strong> ${result.http_code}<br>
                        <strong>Response Preview:</strong><br>
                        <pre style="background: #f8f9fa; padding: 8px; border-radius: 4px; margin-top: 4px; max-height: 150px; overflow: auto;">${JSON.stringify(result.response, null, 2).substring(0, 300)}...</pre>
                    </div>
                `;
            } else {
                testResult.style.background = '#f8d7da';
                testResult.style.borderLeft = '4px solid #dc3545';
                testMessage.innerHTML = `
                    <i class="fas fa-times-circle"></i> <strong>❌ Bağlantı Hatası!</strong><br>
                    <div style="margin-top: 8px; font-size: 12px;">
                        <strong>Hata:</strong> ${escapeHtml(result.message)}<br>
                        <strong>HTTP Status:</strong> ${result.http_code || 'N/A'}
                    </div>
                `;
            }
        } else {
            // Test paneli yoksa (Dashboard'dan test yapılıyor), notification göster
            if (result.success) {
                showNotification(
                    `<strong>✅ API Test Başarılı!</strong><br>` +
                    `<small>HTTP Status: ${result.http_code}</small>`,
                    'success'
                );
            } else {
                showNotification(
                    `<strong>❌ API Test Başarısız!</strong><br>` +
                    `<small>${escapeHtml(result.message)}</small>`,
                    'error'
                );
            }
        }

        // Reload API list to update status badges
        loadApis(true);

        // Dashboard API listesini de güncelle (eğer açıksa)
        if (typeof loadDashboardApis === 'function') {
            loadDashboardApis();
        }
    })
    .catch(error => {
        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }

        if (testResult && testMessage) {
            testResult.style.background = '#f8d7da';
            testResult.style.borderLeft = '4px solid #dc3545';
            testMessage.innerHTML = `<i class="fas fa-exclamation-triangle"></i> <strong>Hata:</strong> ${escapeHtml(error.message)}`;
        } else {
            // Test paneli yoksa notification göster
            showNotification(
                `<strong>❌ Test Hatası!</strong><br>` +
                `<small>${escapeHtml(error.message)}</small>`,
                'error'
            );
        }
    });
}

// API request gönder
function sendApiRequest() {
    const apiId = document.getElementById('test-api-select').value;
    const method = document.getElementById('test-method').value;
    const endpoint = document.getElementById('test-endpoint').value;
    const body = document.getElementById('test-body').value;

    if (!apiId) {
        alert('⚠️ Lütfen bir API seçin');
        return;
    }

    if (!endpoint) {
        alert('⚠️ Lütfen endpoint girin');
        return;
    }

    const responseDiv = document.getElementById('api-test-response');
    const statusDiv = document.getElementById('response-status');
    const bodyDiv = document.getElementById('response-body');

    statusDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> İstek gönderiliyor...';
    statusDiv.style.background = '#f39c12';
    statusDiv.style.color = 'white';
    bodyDiv.textContent = '';
    responseDiv.style.display = 'block';

    const formData = new FormData();
    formData.append('action', 'request');
    formData.append('id', apiId);
    formData.append('method', method);
    formData.append('endpoint', endpoint);
    formData.append('body', body);

    fetch('api-manager.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            statusDiv.innerHTML = `✅ HTTP ${result.http_code} - Başarılı`;
            statusDiv.style.background = '#27ae60';
            bodyDiv.textContent = JSON.stringify(result.response, null, 2);
        } else {
            statusDiv.innerHTML = `❌ HTTP ${result.http_code || 'N/A'} - Hata`;
            statusDiv.style.background = '#e74c3c';
            bodyDiv.textContent = result.message;
        }
    })
    .catch(error => {
        statusDiv.innerHTML = `❌ İstek Hatası`;
        statusDiv.style.background = '#e74c3c';
        bodyDiv.textContent = error.message;
    });
}

// ============================================================================
// QUICK ADD FORM FUNCTIONS
// ============================================================================

// API'yi orta paneldeki forma yükle (düzenleme için)
function loadApiToQuickForm(apiId) {
    const api = apisCache.find(a => a.id === apiId);
    if (!api) {
        console.error('API bulunamadı:', apiId);
        return;
    }

    console.log('📝 API forma yükleniyor:', api.name);

    // Formu doldur
    document.getElementById('quick-api-name').value = api.name || '';
    document.getElementById('quick-api-base-url').value = api.base_url || '';
    document.getElementById('quick-api-type').value = api.type || 'REST';
    document.getElementById('quick-api-auth-type').value = api.auth_type || 'none';
    document.getElementById('quick-api-description').value = api.description || '';

    // Auth alanlarını göster
    toggleQuickAuthFields();

    // Auth bilgilerini doldur
    if (api.auth_type === 'bearer') {
        // Bearer token'dan "Bearer " prefix'ini kaldır
        const token = api.api_value ? api.api_value.replace(/^Bearer\s+/i, '') : '';
        document.getElementById('quick-api-bearer-token').value = token;
    } else if (api.auth_type === 'apikey') {
        document.getElementById('quick-api-key-name').value = api.api_key || '';
        document.getElementById('quick-api-key-value').value = api.api_value || '';
    } else if (api.auth_type === 'basic') {
        document.getElementById('quick-api-username').value = api.api_key || '';
        document.getElementById('quick-api-password').value = api.api_value || '';
    }

    // Form başlığını güncelle
    const formTitle = document.querySelector('#quick-api-form').previousElementSibling;
    if (formTitle && formTitle.tagName === 'H3') {
        formTitle.innerHTML = '<i class="fas fa-edit"></i> API Düzenle: ' + escapeHtml(api.name);
    }

    // Form data attribute'una API ID'sini ekle (kaydetme için)
    document.getElementById('quick-api-form').setAttribute('data-editing-id', api.id);

    // Scroll to form
    const formElement = document.getElementById('quick-api-form');
    if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    console.log('✅ API forma yüklendi');
}

function toggleQuickAuthFields() {
    const authType = document.getElementById('quick-api-auth-type').value;
    const authFieldsContainer = document.getElementById('quick-auth-fields');
    const bearerField = document.getElementById('quick-bearer-field');
    const apikeyFields = document.getElementById('quick-apikey-fields');
    const basicFields = document.getElementById('quick-basic-fields');

    // Hide all auth fields first
    bearerField.style.display = 'none';
    apikeyFields.style.display = 'none';
    basicFields.style.display = 'none';

    if (authType === 'none') {
        authFieldsContainer.style.display = 'none';
    } else {
        authFieldsContainer.style.display = 'block';
        if (authType === 'bearer') {
            bearerField.style.display = 'block';
        } else if (authType === 'apikey') {
            apikeyFields.style.display = 'block';
        } else if (authType === 'basic') {
            basicFields.style.display = 'block';
        }
    }
}

function saveQuickApi() {
    const name = document.getElementById('quick-api-name').value.trim();
    const baseUrl = document.getElementById('quick-api-base-url').value.trim();
    const type = document.getElementById('quick-api-type').value;
    const authType = document.getElementById('quick-api-auth-type').value;
    const description = document.getElementById('quick-api-description').value.trim();

    if (!name || !baseUrl) {
        alert('❌ Lütfen API adı ve Base URL alanlarını doldurun!');
        return;
    }

    // Düzenleme mi yoksa yeni ekleme mi?
    const form = document.getElementById('quick-api-form');
    const editingId = form.getAttribute('data-editing-id');
    const isEditing = !!editingId;

    // Prepare API data
    const formData = new FormData();
    formData.append('action', isEditing ? 'edit' : 'add');
    if (isEditing) {
        formData.append('id', editingId);
    }
    formData.append('name', name);
    formData.append('base_url', baseUrl);
    formData.append('type', type);
    formData.append('auth_type', authType);
    formData.append('description', description);

    // Add auth credentials based on type
    if (authType === 'bearer') {
        const token = document.getElementById('quick-api-bearer-token').value.trim();
        formData.append('api_key', 'Authorization');
        formData.append('api_value', 'Bearer ' + token);
    } else if (authType === 'apikey') {
        const keyName = document.getElementById('quick-api-key-name').value.trim();
        const keyValue = document.getElementById('quick-api-key-value').value.trim();
        formData.append('api_key', keyName);
        formData.append('api_value', keyValue);
    } else if (authType === 'basic') {
        const username = document.getElementById('quick-api-username').value.trim();
        const password = document.getElementById('quick-api-password').value.trim();
        formData.append('api_key', username);
        formData.append('api_value', password);
    }

    // Show loading state
    const testResult = document.getElementById('quick-test-result');
    const testMessage = document.getElementById('quick-test-message');
    testResult.style.display = 'block';
    testResult.style.background = '#fff3cd';
    testResult.style.borderLeft = '4px solid #ffc107';
    testMessage.innerHTML = '<i class="fas fa-spinner fa-spin"></i> API kaydediliyor...';

    fetch('api-manager.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            testResult.style.background = '#d4edda';
            testResult.style.borderLeft = '4px solid #28a745';
            testMessage.innerHTML = '<i class="fas fa-check-circle"></i> <strong>Başarılı!</strong> API ' + (isEditing ? 'güncellendi' : 'kaydedildi') + '.';

            // Reload API list
            loadApis(true);

            // Reset form title
            const formTitle = document.querySelector('#quick-api-form').previousElementSibling;
            if (formTitle && formTitle.tagName === 'H3') {
                formTitle.innerHTML = '<i class="fas fa-plus-circle"></i> Yeni API Ekle / Düzenle';
            }

            // Clear form after 2 seconds
            setTimeout(() => {
                clearQuickForm();
                testResult.style.display = 'none';
            }, 2000);
        } else {
            testResult.style.background = '#f8d7da';
            testResult.style.borderLeft = '4px solid #dc3545';
            testMessage.innerHTML = '<i class="fas fa-times-circle"></i> <strong>Hata:</strong> ' + (data.message || 'Bilinmeyen hata');
        }
    })
    .catch(error => {
        testResult.style.background = '#f8d7da';
        testResult.style.borderLeft = '4px solid #dc3545';
        testMessage.innerHTML = '<i class="fas fa-exclamation-triangle"></i> <strong>Bağlantı Hatası:</strong> ' + error.message;
    });
}

function testQuickApi() {
    const form = document.getElementById('quick-api-form');
    const editingId = form.getAttribute('data-editing-id');

    // Eğer düzenleme modundaysa, kayıtlı API'yi test et
    if (editingId) {
        console.log('📋 Kayıtlı API test ediliyor:', editingId);
        testApiConnection(editingId);
        return;
    }

    // Yeni API ise, önce kaydetmesi gerekiyor
    const name = document.getElementById('quick-api-name').value.trim();
    const baseUrl = document.getElementById('quick-api-base-url').value.trim();

    if (!name || !baseUrl) {
        alert('❌ Test etmek için önce API adı ve Base URL alanlarını doldurun!');
        return;
    }

    // Show info message
    const testResult = document.getElementById('quick-test-result');
    const testMessage = document.getElementById('quick-test-message');
    testResult.style.display = 'block';
    testResult.style.background = '#fff3cd';
    testResult.style.borderLeft = '4px solid #ffc107';
    testMessage.innerHTML = '<i class="fas fa-info-circle"></i> <strong>Bilgi:</strong> Yeni API\'leri test etmek için önce kaydetmeniz gerekiyor. "API\'yi Kaydet" butonuna tıklayın, ardından sol panelden test edebilirsiniz.';

    // Auto-hide after 5 seconds
    setTimeout(() => {
        testResult.style.display = 'none';
    }, 5000);
}

function clearQuickForm() {
    document.getElementById('quick-api-name').value = '';
    document.getElementById('quick-api-base-url').value = '';
    document.getElementById('quick-api-type').value = 'REST';
    document.getElementById('quick-api-auth-type').value = 'none';
    document.getElementById('quick-api-description').value = '';
    document.getElementById('quick-api-bearer-token').value = '';
    document.getElementById('quick-api-key-name').value = '';
    document.getElementById('quick-api-key-value').value = '';
    document.getElementById('quick-api-username').value = '';
    document.getElementById('quick-api-password').value = '';

    // Remove editing ID
    const form = document.getElementById('quick-api-form');
    form.removeAttribute('data-editing-id');

    // Reset form title
    const formTitle = form.previousElementSibling;
    if (formTitle && formTitle.tagName === 'H3') {
        formTitle.innerHTML = '<i class="fas fa-plus-circle"></i> Yeni API Ekle / Düzenle';
    }

    toggleQuickAuthFields();
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

window.loadApis = loadApis;
window.filterApis = filterApis;
window.clearFilters = clearFilters;
window.openApiModal = openApiModal;
window.toggleAuthFields = toggleAuthFields;
window.saveApi = saveApi;
window.editApi = editApi;
window.deleteApi = deleteApi;
window.testApiConnection = testApiConnection;
window.sendApiRequest = sendApiRequest;
window.toggleQuickAuthFields = toggleQuickAuthFields;
window.saveQuickApi = saveQuickApi;
window.testQuickApi = testQuickApi;
window.clearQuickForm = clearQuickForm;
window.loadApiToQuickForm = loadApiToQuickForm;

console.log('✅ ApiManager.js yüklendi');
