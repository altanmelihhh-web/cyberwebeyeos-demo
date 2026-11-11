// ============================================================================
// MAIN.JS - Backup Monitoring, Network Tools, Hash Navigation
// Modüler dosyalardaki fonksiyonlar buradan kaldirildi (2026-04-03)
// ============================================================================


// 2. Dashboard veri yükleme fonksiyonlarini debug modunda çalistir
function debugDashboardData() {
  console.log("=== Dashboard Debug Basliyor ===");
  
  // Periyodik isleri kontrol et
  console.log("1. Periyodik isler kontrol ediliyor...");
  fetch('get-tasks.php?type=periodic&limit=10')
    .then(response => response.json())
    .then(data => {
      console.log("Periyodik isler API yaniti:", data);
      if (Array.isArray(data)) {
        console.log("Toplam periyodik is sayisi:", data.length);
        if (data.length > 0) {
          console.log("Ilk periyodik is:", data[0]);
        }
      } else {
        console.error("Periyodik isler array degil!");
      }
    })
    .catch(error => console.error("Periyodik isler hatasi:", error));
  
  // CAB islerini kontrol et
  console.log("2. CAB isleri kontrol ediliyor...");
  fetch('get-tasks.php?type=cab&limit=5')
    .then(response => response.json())
    .then(data => {
      console.log("CAB isleri API yaniti:", data);
      if (Array.isArray(data)) {
        console.log("Toplam CAB is sayisi:", data.length);
        if (data.length > 0) {
          console.log("Ilk CAB isi:", data[0]);
        }
      } else {
        console.error("CAB isleri array degil!");
      }
    })
    .catch(error => console.error("CAB isleri hatasi:", error));
  
  // Road Map islerini kontrol et
  console.log("3. Road Map isleri kontrol ediliyor...");
  fetch('get-tasks.php?type=roadmap&limit=5')
    .then(response => response.json())
    .then(data => {
      console.log("Road Map isleri API yaniti:", data);
      if (Array.isArray(data)) {
        console.log("Toplam Road Map is sayisi:", data.length);
        if (data.length > 0) {
          console.log("Ilk Road Map isi:", data[0]);
        }
      } else {
        console.error("Road Map isleri array degil!");
      }
    })
    .catch(error => console.error("Road Map isleri hatasi:", error));
  
  console.log("=== Dashboard Debug Bitti ===");
}

// 3. Dashboard'daki isler kartinin DOM'da var olup olmadigini kontrol et
function checkDashboardTasksDOM() {
  console.log("=== Dashboard DOM Kontrolü ===");
  
  const dashboardGrid = document.querySelector('.dashboard-grid');
  console.log("Dashboard grid bulundu mu?", !!dashboardGrid);
  
  if (dashboardGrid) {
    const allCards = dashboardGrid.querySelectorAll('.card');
    console.log("Toplam kart sayisi:", allCards.length);
    
    // Isler kartini bul
    const tasksCard = Array.from(allCards).find(card => {
      const cardTitle = card.querySelector('.card-title');
      return cardTitle && cardTitle.textContent.includes('Periyodik Isler');
    });
    
    console.log("Isler karti bulundu mu?", !!tasksCard);
    
    if (tasksCard) {
      // Tab içeriklerini kontrol et
      const periodicContent = tasksCard.querySelector('#periodic-dashboard');
      const cabContent = tasksCard.querySelector('#cab-dashboard');
      const roadmapContent = tasksCard.querySelector('#roadmap-dashboard');
      
      console.log("Periyodik içerik var mi?", !!periodicContent);
      console.log("CAB içerik var mi?", !!cabContent);
      console.log("Road Map içerik var mi?", !!roadmapContent);
      
      // Tablo body'leri kontrol et
      const periodicTbody = document.getElementById('dashboard-periodic-tasks');
      const cabTbody = document.getElementById('dashboard-cab-tasks');
      const roadmapTbody = document.getElementById('dashboard-roadmap-tasks');
      
      console.log("Periyodik tbody var mi?", !!periodicTbody);
      console.log("CAB tbody var mi?", !!cabTbody);
      console.log("Road Map tbody var mi?", !!roadmapTbody);
      
      if (periodicTbody) {
        console.log("Periyodik tbody içerigi:", periodicTbody.innerHTML);
      }
      if (roadmapTbody) {
        console.log("Road Map tbody içerigi:", roadmapTbody.innerHTML);
      }
    }
  }
  
  console.log("=== DOM Kontrolü Bitti ===");
}

// 4. Manuel olarak dashboard verilerini yeniden yükle
function refreshDashboardTasks() {
  console.log("Dashboard isleri manuel olarak yenileniyor...");
  
  // önce DOM'u kontrol et
  checkDashboardTasksDOM();
  
  // Sonra verileri yükle
  if (typeof loadDashboardTasks === 'function') {
    loadDashboardTasks();
  } else {
    console.error("loadDashboardTasks fonksiyonu bulunamadi!");
  }
}

// 5. Sayfa yüklendiginde otomatik kontrol
document.addEventListener('DOMContentLoaded', function() {
  console.log("Sayfa yüklendi. Dashboard kontrolleri basliyor...");
  
  // Eger dashboard görünüyorsa verileri yükle
  const dashboardPage = document.getElementById('dashboard-page');
  if (dashboardPage && dashboardPage.style.display !== 'none') {
    console.log("Dashboard sayfasi görünür durumda. Veriler yükleniyor...");
    setTimeout(() => {
      refreshDashboardTasks();
    }, 1000); // 1 saniye bekle, DOM'un tamamen yüklenmesi için
  }
});

// Konsol komutlari
console.log("=== Dashboard Debug Komutlari ===");
console.log("debugDashboardData() - API verilerini kontrol et");
console.log("checkDashboardTasksDOM() - DOM elementlerini kontrol et");
console.log("refreshDashboardTasks() - Dashboard islerini yenile");
console.log("================================");

// Dokuman fonksiyonlari DocumentManagement.js'e tasindi
// Eski fonksiyonlar DocMgmt'ye yonlendirildi
function viewDocument(id) { if (window.DocMgmt) DocMgmt.previewDocument(id); }
function downloadDocument(id) { if (window.DocMgmt) DocMgmt.downloadDocument(id); }
function editDocument(id) { /* DocumentManagement.js'e tasindi */ }
function deleteDocument(id) { if (window.DocMgmt) DocMgmt.deleteDocument(id); }


// loadDocuments wrapper - delegates to DocMgmt
function loadDocuments(path) {
    if (window.DocMgmt && typeof DocMgmt.loadDocuments === 'function') {
        DocMgmt.loadDocuments();
        return;
    }
    console.warn('DocMgmt not available for loadDocuments');
}


// Ana uygulama kontrolcüsü
const App = {
    currentPage: 'dashboard',
    
    init() {
        this.loadComponents();
        this.setupEventListeners();
        this.showPage('dashboard');
    },
    
    async loadComponents() {
        // Component'leri yükle
        await this.loadComponent('sidebar-container', 'components/sidebar.html');
        await this.loadComponent('header-container', 'components/header.html');
        await this.loadComponent('modals-container', 'modals/backup-details-modal.html');
    },
    
    async loadComponent(containerId, componentPath) {
        try {
            const response = await fetch(componentPath);
            const html = await response.text();
            document.getElementById(containerId).innerHTML = html;
        } catch (error) {
            console.error(`Component yüklenemedi: ${componentPath}`, error);
        }
    },
    
    async showPage(pageName) {
        this.currentPage = pageName;
        const container = document.getElementById('page-container');
        
        try {
            const response = await fetch(`pages/${pageName}.html`);
            const html = await response.text();
            container.innerHTML = html;
            
            // Sayfa özel init fonksiyonunu çağır
            if (window[`init${this.capitalize(pageName)}Page`]) {
                window[`init${this.capitalize(pageName)}Page`]();
            }
        } catch (error) {
            console.error(`Sayfa yüklenemedi: ${pageName}`, error);
        }
    },
    
    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    },
    
    setupEventListeners() {
        // Global event listener'lar
        document.addEventListener('click', (e) => {
            // Menü tiklamalari
            if (e.target.matches('[data-page]')) {
                e.preventDefault();
                this.showPage(e.target.dataset.page);
            }
        });
    }
};

let backupStatusInterval;
let currentBackupData = null;
let selectedTenant = 'all'; // all, prod, test

// LocalStorage cache key
const BACKUP_CACHE_KEY = 'backup_monitoring_cache';
const BACKUP_CACHE_TIMESTAMP_KEY = 'backup_monitoring_cache_timestamp';

// Cache helper functions
function saveBackupDataToCache(data) {
    try {
        localStorage.setItem(BACKUP_CACHE_KEY, JSON.stringify(data));
        localStorage.setItem(BACKUP_CACHE_TIMESTAMP_KEY, Date.now().toString());
        console.log('✅ Backup data saved to cache');
    } catch (error) {
        console.error('Failed to save backup data to cache:', error);
    }
}

function loadBackupDataFromCache() {
    try {
        const cachedData = localStorage.getItem(BACKUP_CACHE_KEY);
        const timestamp = localStorage.getItem(BACKUP_CACHE_TIMESTAMP_KEY);

        if (cachedData && timestamp) {
            const data = JSON.parse(cachedData);
            const cacheAge = Date.now() - parseInt(timestamp);
            const cacheAgeMinutes = Math.round(cacheAge / (1000 * 60));

            console.log(`📦 Loaded backup data from cache (${cacheAgeMinutes} minutes old)`);
            return data;
        }

        console.log('ℹ️ No cached backup data found');
        return null;
    } catch (error) {
        console.error('Failed to load backup data from cache:', error);
        return null;
    }
}

function clearBackupCache() {
    try {
        localStorage.removeItem(BACKUP_CACHE_KEY);
        localStorage.removeItem(BACKUP_CACHE_TIMESTAMP_KEY);
        console.log('🗑️ Backup cache cleared');
    } catch (error) {
        console.error('Failed to clear backup cache:', error);
    }
}

// Initialize backup monitoring when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Starting initialization');

    // Load cached data first (instant display)
    const cachedData = loadBackupDataFromCache();
    if (cachedData) {
        console.log('📦 Displaying cached backup data...');
        currentBackupData = cachedData;
        updateDashboardWidget(cachedData);
        if (App.currentPage === 'backup-monitoring') {
            updateBackupDetailsPage(cachedData);
        }
    }

    // Start automatic refresh (will fetch fresh data)
    startBackupMonitoring();

    // Setup tab functionality for backup monitoring page
    try {
        initBackupTabs();
    } catch (e) {
        console.warn('initBackupTabs error:', e.message);
    }

    // Initialize app - DEVRE DIŞI (Component sistemi kullanmıyoruz)
    // App.init();

    console.log('✅ Main.js initialization complete');
});

function startBackupMonitoring() {
    // Ilk yükleme
    refreshBackupStatus();
    
    // Her 5 dakikada bir otomatik yenile
    backupStatusInterval = setInterval(refreshBackupStatus, 300000); // 5 minutes
}

function stopBackupMonitoring() {
    if (backupStatusInterval) {
        clearInterval(backupStatusInterval);
    }
}

// Multi-endpoint data fetcher - DÜZELTME
async function fetchMultiEndpointData() {
    console.log('🔄 === FETCHING BACKUP DATA ===');
    const errors = [];

    const fetchJsonSafe = async (url, label) => {
        console.log(`🌐 Fetching ${label} from: ${url}`);
        try {
            const response = await fetch(url, { cache: 'no-store' });
            console.log(`📥 ${label} response status:`, response.status, response.statusText);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status} ${response.statusText}`);
            }

            const contentType = response.headers.get('content-type') || '';
            console.log(`📋 ${label} content-type:`, contentType);

            if (!contentType.includes('application/json')) {
                const sample = (await response.text()).slice(0, 200);
                throw new Error(`Beklenen JSON, gelen içerik türü: ${contentType || 'bilinmiyor'}\nÖrnek içerik: ${sample}`);
            }

            // Read response text first to check if it's empty
            const text = await response.text();
            if (!text || text.trim() === '') {
                console.warn(`⚠️ ${label}: Boş yanıt alındı, default data kullanılıyor`);
                return null;
            }

            try {
                const data = JSON.parse(text);
                console.log(`✅ ${label} data received successfully:`, data);
                console.log(`📊 ${label} scope_breakdown:`, data.scope_breakdown);
                console.log(`📈 ${label} backup_summary:`, data.backup_summary);
                return data;
            } catch (parseError) {
                console.error(`❌ ${label}: JSON parse hatası:`, parseError);
                console.error('Response text:', text.slice(0, 200));
                return null;
            }
        } catch (error) {
            const message = `${label} endpoint hatası: ${error.message}`;
            console.error(`❌ ${message}`, error);
            errors.push(message);
            return null;
        }
    };

    const baseUrl = window.PORTAL_BASE_URL || '';
    const prodData = reclassifyStaleSummary(await fetchJsonSafe(`${baseUrl}/backup_receiver_prod.php?action=current`, 'Production'));
    const testData = reclassifyStaleSummary(await fetchJsonSafe(`${baseUrl}/backup_receiver_test.php?action=current`, 'Test'));

    console.log('📦 Production data received:', prodData ? '✅ YES' : '❌ NO');
    console.log('📦 Test data received:', testData ? '✅ YES' : '❌ NO');

    // Production verisi mevcutsa tenant alanını zorla production yapalım
    if (prodData && prodData.tenant !== 'production') {
        prodData.tenant = 'production';
        console.log('🔧 Production tenant field corrected');
    }

    console.log('🔀 Merging data...');
    const merged = mergeBackupData(prodData, testData);
    console.log('✅ === MERGED DATA ===', merged);
    console.log('📊 Merged scope_breakdown:', merged.scope_breakdown);
    console.log('🏢 Merged production_data:', merged.production_data ? 'Present' : 'Missing');
    console.log('🧪 Merged test_data:', merged.test_data ? 'Present' : 'Missing');

    return { data: merged, errors };
}

// Bayat kaynagin eski basarili/basarisiz sayilarini "eksik" olarak isaretle.
// Ansible bugun veri gondermediyse, 8 ay onceki "26 basarili" sayisini bugunmus
// gibi gostermek yanlis bilgi veriyor - o dizinlerin BUGUNKU durumu bilinmiyor,
// dolayisiyla successful/failed sifirlanip hepsi "missing" (eksik) sayilir.
function reclassifyStaleSummary(source) {
    if (!source || !source.backup_summary) return source;

    if (source.is_stale) {
        const total = source.backup_summary.total_dirs || 0;
        source.backup_summary = {
            total_dirs: total,
            successful: 0,
            failed: 0,
            missing: total
        };
        return source;
    }

    // Kaynak sunucunun (backup_check.sh) kendi ozet satiri ile ayrintili
    // breakdown'u bazen tutmuyor (ornek: "Total: 31" derken alt kirilimlar
    // 15+15=30 veriyor). Sabit/gelen total_dirs'e guvenmek yerine, gercek
    // dizin sayisini her zaman successful+failed+missing toplamindan
    // hesapla ki arayuzde asla "72 dizin ama 71 basarili" gibi acikca
    // yanlis bir toplam gorunmesin.
    const summary = source.backup_summary;
    const successful = summary.successful || 0;
    const failed = summary.failed || 0;
    const missing = summary.missing || 0;
    const reportedTotal = summary.total_dirs || 0;
    const realTotal = successful + failed + missing;

    if (realTotal !== reportedTotal) {
        console.warn(`Backup summary tutarsizligi tespit edildi (tenant: ${source.tenant || 'bilinmiyor'}): kaynak total_dirs=${reportedTotal} bildirdi, ancak successful(${successful})+failed(${failed})+missing(${missing})=${realTotal}. Kaynaktaki sayac hatali oldugu icin gercek breakdown toplami kullaniliyor.`);
    }

    summary.total_dirs = realTotal;
    summary.missing = missing;

    return source;
}

// Veri birlestirme fonksiyonu - DÜZELTME
function mergeBackupData(prodData, testData) {
    // Her iki veri de yoksa
    if (!prodData && !testData) {
        return {
            timestamp: new Date().toISOString(),
            overall_status: 'no_data',
            backup_summary: { total_dirs: 0, successful: 0, failed: 0 },
            scope_breakdown: {},
            whitelist_status: { cyberwebeyeos: {}, 'ornek-musteri-a': {} },
            problems_count: 0,
            message: 'Veri bekleniyor...'
        };
    }
    
    // Sadece bir tanesi varsa, o veriyi direkt döndür
    if (!prodData && testData) {
        testData.is_test_only = true;
        return testData;
    }
    
    if (prodData && !testData) {
        prodData.is_prod_only = true;
        return prodData;
    }
    
    // Ikisi de varsa, verileri birlestir
    const merged = {
        timestamp: prodData.timestamp || testData.timestamp || new Date().toISOString(),
        received_at: prodData.received_at || testData.received_at || new Date().toISOString(),
        overall_status: 'success',
        backup_summary: {
            total_dirs: (prodData.backup_summary?.total_dirs || 0) + (testData.backup_summary?.total_dirs || 0),
            successful: (prodData.backup_summary?.successful || 0) + (testData.backup_summary?.successful || 0),
            failed: (prodData.backup_summary?.failed || 0) + (testData.backup_summary?.failed || 0),
            missing: (prodData.backup_summary?.missing || 0) + (testData.backup_summary?.missing || 0)
        },
        scope_breakdown: {},
        whitelist_status: prodData.whitelist_status || {},
        a10_loading_status: prodData.a10_loading_status || {},
        a10_loading_details: prodData.a10_loading_details || {},
        problems_count: (prodData.problems_count || 0) + (testData.problems_count || 0),
        received_at: new Date().toISOString(),
        
        // Multi-server bilgilerini koru (YENI)
        multi_server: prodData.multi_server || false,
        server_count: prodData.server_count || 1,
        servers: prodData.servers || ['ansible'],
        server_breakdown: prodData.server_breakdown || null,
        
        // Ayri ayri sakla
        production_data: prodData,
        test_data: testData
    };
    
    // Scope breakdown'lari birlestir
    if (prodData.scope_breakdown) {
        Object.assign(merged.scope_breakdown, prodData.scope_breakdown);
    }
    if (testData.scope_breakdown) {
        Object.assign(merged.scope_breakdown, testData.scope_breakdown);
    }
    
    // Overall status hesapla
    if (merged.problems_count === 0) {
        merged.overall_status = 'success';
    } else if (merged.problems_count <= 2) {
        merged.overall_status = 'warning';
    } else {
        merged.overall_status = 'critical';
    }

    // Bayat veri kontrolu: prod veya test kaynaklarindan biri STALE_THRESHOLD_HOURS'tan
    // eski ise, alttaki gercek durum ne olursa olsun bunu ayrica isaretliyoruz.
    // Aksi halde ansible'dan veri gelmeyi kesse bile eski basari/hata sonsuza dek "guncel" gorunuyor.
    merged.is_stale = !!(prodData.is_stale || testData.is_stale);
    merged.stale_sources = [];
    if (prodData.is_stale) merged.stale_sources.push({ label: 'Production', hours: prodData.data_age_hours });
    if (testData.is_stale) merged.stale_sources.push({ label: 'Test', hours: testData.data_age_hours });
    if (merged.is_stale) {
        merged.last_known_status = merged.overall_status;
        merged.overall_status = 'stale';
    }

    return merged;
}

async function refreshBackupStatus() {
    try {
        // Loading overlay göster
        showLoadingOverlay(true);

        // Multi-endpoint veri çek
        const { data, errors } = await fetchMultiEndpointData();

        // Veri başarıyla alındıysa kaydet ve göster
        if (data && data.overall_status !== 'no_data') {
            currentBackupData = data;

            // Cache'e kaydet (kalıcı olsun)
            saveBackupDataToCache(data);

            // Dashboard widget'i güncelle
            updateDashboardWidget(data);

            // Eger backup monitoring sayfasindaysak, o sayfayi da güncelle
            if (App.currentPage === 'backup-monitoring') {
                updateBackupDetailsPage(data);
            }

            // Loading overlay kapat
            showLoadingOverlay(false);

            if (errors && errors.length) {
                showToast('Uyarı', 'Veri güncellendi ama bazı endpointler hata verdi', 'warning');
                console.warn('Endpoint errors:', errors);
            } else {
                showToast('Basarili', 'Backup verileri güncellendi', 'success');
            }
        } else {
            // Veri alınamadıysa cached data kullanmaya devam et
            console.warn('No data received from endpoints, using cached data');
            showLoadingOverlay(false);

            if (currentBackupData) {
                showToast('Uyarı', 'Yeni veri alınamadı, son veri gösteriliyor', 'warning');
            } else {
                showToast('Hata', 'Veri alınamadı ve cache boş', 'error');
            }
        }

        // Data loaded animasyonu
        const card = document.querySelector('.backup-monitoring-card');
        if (card) {
            card.classList.add('data-loaded');
            setTimeout(() => {
                card.classList.remove('data-loaded');
            }, 600);
        }

    } catch (error) {
        console.error('Backup status refresh error:', error);
        showLoadingOverlay(false);

        // Hata olsa bile cached data kullanmaya devam et
        if (currentBackupData) {
            showToast('Uyarı', 'Yenileme hatası, son veri gösteriliyor', 'warning');
        } else {
            showToast('Hata', 'Veri alınamadı: ' + error.message, 'error');
        }
    }
}

function showLoadingOverlay(show) {
    const overlay = document.getElementById('backupLoadingOverlay');
    if (overlay) {
        if (show) {
            overlay.classList.add('active');
        } else {
            setTimeout(() => {
                overlay.classList.remove('active');
            }, 500);
        }
    }
}

function showToast(title, message, type = 'info') {
    const toast = document.getElementById('backupToast');
    if (!toast) return;
    
    const toastTitle = toast.querySelector('.backup-toast-title');
    const toastMessage = toast.querySelector('.backup-toast-message');
    const toastIcon = toast.querySelector('.backup-toast-icon i');
    
    if (toastTitle) toastTitle.textContent = title;
    if (toastMessage) toastMessage.textContent = message;
    
    // Icon ve renk ayarla
    toast.className = 'backup-toast show ' + type;
    if (toastIcon) {
        if (type === 'success') {
            toastIcon.className = 'fas fa-check-circle';
            toastIcon.style.color = '#2ecc71';
        } else if (type === 'error') {
            toastIcon.className = 'fas fa-exclamation-circle';
            toastIcon.style.color = '#e74c3c';
        } else {
            toastIcon.className = 'fas fa-info-circle';
            toastIcon.style.color = '#3498db';
        }
    }
    
    // 3 saniye sonra kapat
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// A10 Status Text fonksiyonu
function getA10StatusText(status, details) {
    // Details varsa onu kullan
    if (details && details !== '') {
        switch (status) {
            case 'SUCCESS': 
                return `<span style="color: #27ae60;"><i class="fas fa-check-circle"></i> ${details}</span>`;
            case 'RECENT':
                return `<span style="color: #27ae60;"><i class="fas fa-check-circle"></i> ${details}</span>`;
            case 'OLD':
                return `<span style="color: #f39c12;"><i class="fas fa-exclamation-triangle"></i> ${details}</span>`;
            case 'FAILED': 
                return `<span style="color: #e74c3c;"><i class="fas fa-times-circle"></i> ${details}</span>`;
            case 'NO_LOGS': 
                return `<span style="color: #f39c12;"><i class="fas fa-exclamation-triangle"></i> ${details}</span>`;
            case 'ERROR': 
                return `<span style="color: #e74c3c;"><i class="fas fa-exclamation-circle"></i> ${details}</span>`;
            default: 
                return `<span style="color: #95a5a6;"><i class="fas fa-question-circle"></i> ${details}</span>`;
        }
    }
    
    // Details yoksa default text kullan
    switch (status) {
        case 'SUCCESS': 
            return '<span style="color: #27ae60;"><i class="fas fa-check-circle"></i> Basarili</span>';
        case 'RECENT':
            return '<span style="color: #27ae60;"><i class="fas fa-check-circle"></i> Son 3 gün içinde yüklendi</span>';
        case 'OLD':
            return '<span style="color: #f39c12;"><i class="fas fa-exclamation-triangle"></i> Eski yükleme</span>';
        case 'FAILED': 
            return '<span style="color: #e74c3c;"><i class="fas fa-times-circle"></i> Basarisiz</span>';
        case 'NO_LOGS': 
            return '<span style="color: #f39c12;"><i class="fas fa-exclamation-triangle"></i> Log Yok</span>';
        case 'ERROR': 
            return '<span style="color: #e74c3c;"><i class="fas fa-exclamation-circle"></i> Baglanti Hatasi</span>';
        default: 
            return '<span style="color: #95a5a6;"><i class="fas fa-question-circle"></i> Bilinmiyor</span>';
    }
}

// Dashboard widget güncelleme - DÜZELTME
function updateDashboardWidget(data) {
    console.log('Updating dashboard widget with data:', data);
    
    // Status badge
    const badge = document.getElementById('backup-status-badge');
    if (badge) {
        let statusClass, statusText, statusIcon;
        
        switch (data.overall_status) {
            case 'success':
                statusClass = 'status-success';
                statusText = 'All Systems Normal';
                statusIcon = 'fas fa-check-circle';
                break;
            case 'warning':
                statusClass = 'status-warning';
                statusText = 'Warnings Detected';
                statusIcon = 'fas fa-exclamation-triangle';
                break;
            case 'critical':
                statusClass = 'status-critical';
                statusText = 'Critical Issues';
                statusIcon = 'fas fa-times-circle';
                break;
            case 'stale':
                statusClass = 'status-critical';
                statusText = 'VERI GELMIYOR';
                statusIcon = 'fas fa-plug-circle-xmark';
                break;
            default:
                statusClass = 'status-loading';
                statusText = 'Unknown';
                statusIcon = 'fas fa-question-circle';
        }
        
        badge.className = 'status-badge ' + statusClass;
        badge.innerHTML = `<i class="${statusIcon}"></i> ${statusText}`;
    }
    
    // Statistics - toplam degerleri göster
    console.log('📊 Widget istatistikleri güncelleniyor:', {
        total_dirs: data.backup_summary?.total_dirs || 0,
        successful: data.backup_summary?.successful || 0,
        failed: data.backup_summary?.failed || 0,
        problems: data.problems_count || 0,
        timestamp: data.timestamp || data.received_at
    });

    updateElement('total-dirs', data.backup_summary?.total_dirs || 0);
    updateElement('successful-backups', data.backup_summary?.successful || 0);
    updateElement('failed-backups', (data.backup_summary?.failed || 0) + (data.backup_summary?.missing || 0));
    updateElement('total-problems', (data.problems_count || 0) + (data.backup_summary?.missing || 0));
    
    // Server breakdown - YENI EKLENEN
    if (data.server_breakdown) {
        console.log('Updating server breakdown:', data.server_breakdown);
        
        // Ansible server
        if (data.server_breakdown.ansible) {
            updateElement('server-ansible-success', data.server_breakdown.ansible.success || 0);
            updateElement('server-ansible-total', data.server_breakdown.ansible.total || 0);
        }
        
        // Cyberwebeyeos VB
        if (data.server_breakdown.cyberwebeyeos_vb) {
            updateElement('server-cyberwebeyeos-success', data.server_breakdown.cyberwebeyeos_vb.success || 0);
            updateElement('server-cyberwebeyeos-total', data.server_breakdown.cyberwebeyeos_vb.total || 0);
        }
        
        // Örnek Müşteri A VB
        if (data.server_breakdown['ornek-musteri-a_vb']) {
            updateElement('server-ornek-musteri-a-success', data.server_breakdown['ornek-musteri-a_vb'].success || 0);
            updateElement('server-ornek-musteri-a-total', data.server_breakdown['ornek-musteri-a_vb'].total || 0);
        }
    }
    
    // Production Scope breakdown - DÜZELTME
    const prodData = data.production_data || data;
    const prodScopes = prodData.scope_breakdown || data.scope_breakdown || {};
    
    console.log('Production scope data:', prodScopes);
    
    // Her scope için kontrol et
    ['cyberwebeyeos_prod', 'cyberwebeyeos_drc', 'ornek-musteri-a_prod', 'ornek-musteri-a_drc'].forEach(scope => {
        const scopeData = prodScopes[scope] || { success: 0, failed: 0 };
        updateElement(`prod-${scope.replace('_', '-')}-success`, scopeData.success || 0);
        updateElement(`prod-${scope.replace('_', '-')}-failed`, scopeData.failed || 0);
    });
    
    // Whitelist status
    const whitelist = prodData.whitelist_status || data.whitelist_status || {};
    updateElement('prod-cyberwebeyeos-ansible-count', whitelist.cyberwebeyeos?.ansible || '-');
    updateElement('prod-cyberwebeyeos-vb-count', whitelist.cyberwebeyeos?.virtualbackup || '-');
    updateElement('prod-ornek-musteri-a-ansible-count', whitelist['ornek-musteri-a']?.ansible || '-');
    updateElement('prod-ornek-musteri-a-cm-count', whitelist['ornek-musteri-a']?.coremgmt || '-');
    
    // A10 status
    const a10Status = prodData.a10_loading_status || data.a10_loading_status || {};
    const a10Details = prodData.a10_loading_details || data.a10_loading_details || {};
    
    const cyberwebeyeosA10Element = document.getElementById('prod-cyberwebeyeos-a10-status');
    const ornekMusteriAA10Element = document.getElementById('prod-ornek-musteri-a-a10-status');
    
    if (cyberwebeyeosA10Element) {
        cyberwebeyeosA10Element.innerHTML = 'A10: ' + getA10StatusText(a10Status.cyberwebeyeos || 'unknown', a10Details.cyberwebeyeos || '');
    }
    
    if (ornekMusteriAA10Element) {
        ornekMusteriAA10Element.innerHTML = 'A10: ' + getA10StatusText(a10Status['ornek-musteri-a'] || 'unknown', a10Details['ornek-musteri-a'] || '');
    }
    
    // Test Scope breakdown
    if (data.test_data) {
        const testScopes = data.test_data.scope_breakdown || {};
        
        console.log('Updating test scopes:', testScopes);

        // Test ortami kendi scope'larini kullaniyor
        updateElement('test-maslak-success', testScopes.maslak?.success || 0);
        updateElement('test-maslak-failed', testScopes.maslak?.failed || 0);
        updateElement('test-spine-success', testScopes.spine?.success || 0);
        updateElement('test-spine-failed', testScopes.spine?.failed || 0);
        updateElement('test-ornekMusteriAtest-success', testScopes['ornek-musteri-atest']?.success || 0);
        updateElement('test-ornekMusteriAtest-failed', testScopes['ornek-musteri-atest']?.failed || 0);
    }
    
    // Last update and freshness
    updateLastUpdateInfo(data);
}

function updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    } else {
        console.warn(`Element not found: ${id}`);
    }
}

function formatDateTime(timestamp) {
    if (!timestamp) return '-';
    const date = new Date(timestamp);

    // Tarih formatı: "10 Aralık 2025 07:06:43"
    const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    };

    return date.toLocaleString('tr-TR', options);
}

function updateLastUpdateInfo(data) {
    const timestamp = data.timestamp || data.received_at;
    const lastUpdateElement = document.getElementById('last-update-time');
    const updateStatusElement = document.getElementById('update-status');
    const freshnessElement = document.getElementById('freshness-text');
    const freshnessDot = document.getElementById('freshness-dot');

    console.log('⏰ Last update info:', {
        timestamp: timestamp,
        formatted: formatDateTime(timestamp),
        source: data.source_server || 'unknown'
    });

    if (timestamp) {
        const updateTime = new Date(timestamp);
        const now = new Date();
        const hoursAgo = (now - updateTime) / (1000 * 60 * 60);

        if (lastUpdateElement) {
            // Tam tarih ve saat göster
            lastUpdateElement.textContent = formatDateTime(timestamp);
            lastUpdateElement.title = `${hoursAgo.toFixed(1)} saat önce`;
        }
        
        // Data freshness indicator
        let freshnessClass = '';
        let freshnessText = '';
        let dotColor = '';
        
        if (hoursAgo < 2) {
            freshnessClass = 'freshness-fresh';
            freshnessText = 'Data is up-to-date';
            dotColor = '#27ae60';
        } else if (hoursAgo < 25) {
            freshnessClass = 'freshness-stale';
            freshnessText = `Updated ${Math.round(hoursAgo)} hours ago`;
            dotColor = '#f39c12';
        } else {
            freshnessClass = 'freshness-old';
            freshnessText = 'Data is outdated! Check script';
            dotColor = '#e74c3c';
        }
        
        if (updateStatusElement) {
            updateStatusElement.textContent = freshnessText;
        }
        
        if (freshnessElement) {
            freshnessElement.textContent = freshnessText;
        }
        
        if (freshnessDot) {
            freshnessDot.style.backgroundColor = dotColor;
        }
        
        // Add freshness class to indicator
        const indicator = document.querySelector('.freshness-indicator');
        if (indicator) {
            indicator.className = `freshness-indicator ${freshnessClass}`;
        }
    }
}

// Backup monitoring page functions
async function refreshBackupDetails() {
    // Onceden currentBackupData varsa fetch hiç çalışmıyordu, buton bu yüzden
    // ilk yüklemeden sonra tepkisiz kalıyordu. Her tıklamada sunucudan yeniden çek.
    await refreshBackupStatus();

    if (currentBackupData) {
        updateBackupDetailsPage(currentBackupData);
    }
}

function updateStaleBanner(data) {
    const banner = document.getElementById('backup-stale-banner');
    const bannerText = document.getElementById('backup-stale-banner-text');
    if (!banner || !bannerText) return;

    const staleSources = data.stale_sources || (data.is_stale ? [{ label: data.tenant === 'production' ? 'Production' : 'Test', hours: data.data_age_hours }] : []);

    if (data.is_stale && staleSources.length > 0) {
        const parts = staleSources.map(s => `${s.label}: ${Math.round(s.hours)} saattir veri yok`).join(', ');
        bannerText.textContent = `VERI EKSIK - Ansible sunucusundan yeni veri gelmiyor (${parts}). Bu kaynagin dizinleri "basarili" degil, durumu BILINMIYOR olarak sayiliyor ve asagida Eski/Eksik Backup rakamina ekleniyor - lutfen sunucu tarafini kontrol edin.`;
        banner.style.display = 'block';
    } else {
        banner.style.display = 'none';
    }
}

function updateBackupDetailsPage(data) {
    updateStaleBanner(data);

    // Overall status numbers - Production ve Test toplamini hesapla
    let totalDirs = 0;
    let totalSuccessful = 0;
    let totalFailed = 0;
    let totalMissing = 0;
    let recoveryAttempted = false;

    // Production verilerini ekle
    if (data.production_data && data.production_data.backup_summary) {
        totalDirs += data.production_data.backup_summary.total_dirs || 0;
        totalSuccessful += data.production_data.backup_summary.successful || 0;
        totalFailed += data.production_data.backup_summary.failed || 0;
        totalMissing += data.production_data.backup_summary.missing || 0;
        if (data.production_data.auto_recovery && data.production_data.auto_recovery.attempted) {
            recoveryAttempted = true;
        }
    }

    // Test verilerini ekle
    if (data.test_data && data.test_data.backup_summary) {
        totalDirs += data.test_data.backup_summary.total_dirs || 0;
        totalSuccessful += data.test_data.backup_summary.successful || 0;
        totalFailed += data.test_data.backup_summary.failed || 0;
        totalMissing += data.test_data.backup_summary.missing || 0;
        if (data.test_data.auto_recovery && data.test_data.auto_recovery.attempted) {
            recoveryAttempted = true;
        }
    }

    // Eger ayri data yoksa, genel veriyi kullan
    if (totalDirs === 0 && data.backup_summary) {
        totalDirs = data.backup_summary.total_dirs || 0;
        totalSuccessful = data.backup_summary.successful || 0;
        totalFailed = data.backup_summary.failed || 0;
        totalMissing = data.backup_summary.missing || 0;
        recoveryAttempted = data.auto_recovery?.attempted || false;
    }

    // "Eski/Eksik Backup" kutusu hem gercek hatalari hem de bugun hic veri
    // gelmedigi icin durumu bilinmeyen (missing) dizinleri gosterir - stale
    // kaynagin eski "basarili" sayisini gizlice basari gibi gostermemek icin.
    updateElement('detail-total-dirs', totalDirs);
    updateElement('detail-successful', totalSuccessful);
    updateElement('detail-failed', totalFailed + totalMissing);
    updateElement('detail-recovery', recoveryAttempted ? '✓ Executed' : '✗ Not Needed');

    // Header info
    updateElement('header-last-update', `Last update: ${formatDateTime(data.timestamp || data.received_at)}`);

    const timestamp = data.timestamp || data.received_at;
    if (timestamp) {
        const updateTime = new Date(timestamp);
        const now = new Date();
        const hoursAgo = (now - updateTime) / (1000 * 60 * 60);
        updateElement('header-data-age', `${Math.round(hoursAgo * 10) / 10} hours ago`);
    }
    
    // Update tabs content - her zaman çağır
    updateScopeDetails(data);
    updateServerDetails(data);
    updateWhitelistDetails(data);
    updateFailedDirs(data);
    
    // Debug için veriyi logla
    console.log('updateBackupDetailsPage - Full data:', data);
    console.log('updateBackupDetailsPage - Scope breakdown:', data.scope_breakdown);
    if (data.production_data) {
        console.log('updateBackupDetailsPage - Production scope breakdown:', data.production_data.scope_breakdown);
    }
    if (data.test_data) {
        console.log('updateBackupDetailsPage - Test scope breakdown:', data.test_data.scope_breakdown);
    }
}

function updateScopeDetails(data) {
    console.log('=== updateScopeDetails START ===');
    console.log('Full data received:', data);
    
    const prodContainer = document.getElementById('prod-scope-detail-content');
    const testContainer = document.getElementById('test-scope-detail-content');
    
    console.log('Prod container found:', prodContainer ? 'YES' : 'NO');
    console.log('Test container found:', testContainer ? 'YES' : 'NO');
    
    // Production scopes
    if (prodContainer) {
        // Multi-source veri kontrolü
        let prodScopes = null;
        
        // öncelik sirasi: production_data > direkt data > prod data
        if (data.production_data && data.production_data.scope_breakdown) {
            prodScopes = data.production_data.scope_breakdown;
            console.log('Using production_data.scope_breakdown');
        } else if (data.scope_breakdown) {
            // Eger direkt scope_breakdown varsa ve production scope'lari içeriyorsa
            if (data.scope_breakdown.cyberwebeyeos_prod || data.scope_breakdown.cyberwebeyeos_drc || 
                data.scope_breakdown['ornek-musteri-a_prod'] || data.scope_breakdown['ornek-musteri-a_drc']) {
                prodScopes = data.scope_breakdown;
                console.log('Using direct data.scope_breakdown for production');
            }
        } else if (data.prod && data.prod.scope_breakdown) {
            prodScopes = data.prod.scope_breakdown;
            console.log('Using data.prod.scope_breakdown');
        }
        
        console.log('Production scope breakdown found:', prodScopes);
        
        const prodScopeList = [
            { name: 'Cyberwebeyeos Production', key: 'cyberwebeyeos_prod', color: '#3498db', server: 'ansible' },
            { name: 'Cyberwebeyeos DRC', key: 'cyberwebeyeos_drc', color: '#2ecc71', server: 'ansible' },
            { name: 'Örnek Müşteri A Production', key: 'ornek-musteri-a_prod', color: '#e74c3c', server: 'ansible' },
            { name: 'Örnek Müşteri A DRC', key: 'ornek-musteri-a_drc', color: '#f39c12', server: 'ansible' }
        ];
        
        // Multi-server ise server bazli grupla
        if (data.multi_server && data.server_breakdown) {
            prodContainer.innerHTML = generateServerBasedScopeCards(prodScopeList, prodScopes, data.server_breakdown, 'production');
        } else {
            // Tek server - eski görünüm
            if (!prodScopes || Object.keys(prodScopes).length === 0) {
                console.log('No production scope data available');
                prodContainer.innerHTML = '<div class="alert alert-warning">Production scope verisi henüz yüklenmedi veya bos.</div>';
            } else {
                const html = generateScopeCards(prodScopeList, { scope_breakdown: prodScopes });
                prodContainer.innerHTML = html;
            }
        }
    }
    
    // Test scopes
    if (testContainer) {
        let testScopes = null;
        
        if (data.test_data && data.test_data.scope_breakdown) {
            testScopes = data.test_data.scope_breakdown;
            console.log('Using test_data.scope_breakdown');
        } else if (data.test && data.test.scope_breakdown) {
            testScopes = data.test.scope_breakdown;
            console.log('Using data.test.scope_breakdown');
        } else if (data.scope_breakdown) {
            // Test scope'lari kontrol et
            if (data.scope_breakdown.maslak || data.scope_breakdown.spine || data.scope_breakdown['ornek-musteri-atest']) {
                testScopes = data.scope_breakdown;
                console.log('Using direct data.scope_breakdown for test');
            }
        }
        
        console.log('Test scope breakdown found:', testScopes);

        // Test ortami kendi scope'larini kullaniyor (eski ansible test sunucusu)
        const testScopeList = [
            { name: 'Örnek Müşteri Atest', key: 'ornek-musteri-atest', color: '#e67e22', server: 'test_ansible' }
        ];
        
        if (!testScopes || Object.keys(testScopes).length === 0) {
            console.log('No test scope data available');
            testContainer.innerHTML = '<div class="alert alert-info">Test scope verisi henüz yüklenmedi veya bos.</div>';
        } else {
            const html = generateScopeCards(testScopeList, { scope_breakdown: testScopes });
            testContainer.innerHTML = html;
        }
    }
    
    console.log('=== updateScopeDetails END ===');
}

// Server bazli scope kartlari olustur (multi-server için)
function generateServerBasedScopeCards(scopes, scopeData, serverBreakdown, tenant) {
    if (!scopeData) {
        return '<div class="alert alert-warning">Scope verisi bulunamadi.</div>';
    }
    
    let html = '<div style="display: grid; gap: 20px;">';
    
    // Ansible Server Scopes
    html += `
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
            <h5 style="margin: 0 0 15px 0; color: #2c3e50;">
                <i class="fas fa-server" style="color: #3498db;"></i> Ansible Server Scopes
            </h5>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 15px;">
    `;
    
    // Ansible scope'lari
    const ansibleScopes = scopes.filter(s => s.server === 'ansible');
    ansibleScopes.forEach(scope => {
        const data = scopeData[scope.key] || { success: 0, failed: 0 };
        html += generateSingleScopeCard(scope, data);
    });
    
    html += '</div></div>';
    
    // VirtualBackup Scopes (eger multi-server ve production ise)
    if (tenant === 'production' && serverBreakdown && (serverBreakdown.cyberwebeyeos_vb || serverBreakdown['ornek-musteri-a_vb'])) {
        html += `
            <div style="background: #fff5f5; padding: 15px; border-radius: 8px; margin-top: 15px;">
                <h5 style="margin: 0 0 15px 0; color: #2c3e50;">
                    <i class="fas fa-database" style="color: #e74c3c;"></i> VirtualBackup Server Scopes
                </h5>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 15px;">
        `;
        
        // VirtualBackup scope'lari için ayni verileri kullan (su an için)
        ansibleScopes.forEach(scope => {
            const data = scopeData[scope.key] || { success: 0, failed: 0 };
            const vbScope = { ...scope, name: scope.name + ' (VB)' };
            html += generateSingleScopeCard(vbScope, data);
        });
        
        html += '</div></div>';
    }
    
    html += '</div>';
    return html;
}

// Tek bir scope karti olustur
function generateSingleScopeCard(scope, data) {
    const success = parseInt(data.success) || 0;
    const failed = parseInt(data.failed) || 0;
    const total = success + failed;
    const successRate = total > 0 ? Math.round((success / total) * 100) : 0;
    
    return `
        <div style="background: white; border-left: 4px solid ${scope.color}; padding: 15px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h6 style="margin: 0; color: #2c3e50; font-size: 0.9rem;">${scope.name}</h6>
                <span style="background: ${successRate === 100 ? '#27ae60' : successRate >= 80 ? '#f39c12' : '#e74c3c'}; color: white; padding: 2px 6px; border-radius: 10px; font-size: 0.7rem; font-weight: 600;">
                    ${successRate}%
                </span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.85rem;">
                <div style="text-align: center;">
                    <div style="font-weight: bold; color: #27ae60;">${success}</div>
                    <div style="font-size: 0.7rem; color: #7f8c8d;">Basarili</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-weight: bold; color: #e74c3c;">${failed}</div>
                    <div style="font-size: 0.7rem; color: #7f8c8d;">Basarisiz</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-weight: bold; color: #2c3e50;">${total}</div>
                    <div style="font-size: 0.7rem; color: #7f8c8d;">Toplam</div>
                </div>
            </div>
            <div class="progress" style="height: 6px;">
                <div class="progress-bar progress-bar-success" style="width: ${successRate}%;"></div>
            </div>
        </div>
    `;
}

function generateScopeCards(scopes, data) {
    console.log('generateScopeCards called with:', { scopes, data });
    
    if (!data || !data.scope_breakdown) {
        console.log('No scope breakdown data in generateScopeCards');
        return '<div class="alert alert-warning">Scope verisi henüz yüklenmedi.</div>';
    }
    
    const cards = scopes.map(scope => {
        const scopeData = data.scope_breakdown[scope.key];
        console.log(`Scope ${scope.key} data:`, scopeData);
        
        if (!scopeData) {
            console.log(`No data for scope ${scope.key}`);
            // Scope verisi yoksa varsayilan degerlerle göster
            return `
                <div class="scope-detail-card" style="background: white; border-left: 4px solid ${scope.color}; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div class="scope-detail-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <h4 style="margin: 0; color: #2c3e50;">${scope.name}</h4>
                        <span style="background: #95a5a6; color: white; padding: 4px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">
                            Veri Yok
                        </span>
                    </div>
                    <div class="scope-stats" style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <div style="text-align: center;">
                            <div style="font-size: 1.25rem; font-weight: bold; color: #95a5a6;">-</div>
                            <div style="font-size: 0.8rem; color: #7f8c8d;">Basarili</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 1.25rem; font-weight: bold; color: #95a5a6;">-</div>
                            <div style="font-size: 0.8rem; color: #7f8c8d;">Basarisiz</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 1.25rem; font-weight: bold; color: #95a5a6;">-</div>
                            <div style="font-size: 0.8rem; color: #7f8c8d;">Toplam</div>
                        </div>
                    </div>
                    <div class="progress">
                        <div class="progress-bar" style="width: 0%;"></div>
                    </div>
                </div>
            `;
        }
        
        const success = parseInt(scopeData.success) || 0;
        const failed = parseInt(scopeData.failed) || 0;
        const total = success + failed;
        const successRate = total > 0 ? Math.round((success / total) * 100) : 0;
        
        console.log(`Scope ${scope.key} calculated:`, { success, failed, total, successRate });
        
        return `
            <div class="scope-detail-card" style="background: white; border-left: 4px solid ${scope.color}; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <div class="scope-detail-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h4 style="margin: 0; color: #2c3e50;">${scope.name}</h4>
                    <span style="background: ${successRate === 100 ? '#27ae60' : successRate >= 80 ? '#f39c12' : '#e74c3c'}; color: white; padding: 4px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">
                        ${successRate}% Basari
                    </span>
                </div>
                <div class="scope-stats" style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <div style="text-align: center;">
                        <div style="font-size: 1.25rem; font-weight: bold; color: #27ae60;">${success}</div>
                        <div style="font-size: 0.8rem; color: #7f8c8d;">Basarili</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 1.25rem; font-weight: bold; color: #e74c3c;">${failed}</div>
                        <div style="font-size: 0.8rem; color: #7f8c8d;">Basarisiz</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 1.25rem; font-weight: bold; color: #2c3e50;">${total}</div>
                        <div style="font-size: 0.8rem; color: #7f8c8d;">Toplam</div>
                    </div>
                </div>
                <div class="progress">
                    <div class="progress-bar progress-bar-success" style="width: ${successRate}%;"></div>
                </div>
            </div>
        `;
    });
    
    return cards.join('');
}

function updateWhitelistDetails(data) {
    const prodContainer = document.getElementById('prod-whitelist-detail-content');
    
    // Production whitelist
    if (prodContainer) {
        const prodData = data.production_data || data;
        const cyberwebeyeos = prodData.whitelist_status?.cyberwebeyeos || {};
        const ornekMusteriA = prodData.whitelist_status?.['ornek-musteri-a'] || {};
        
        prodContainer.innerHTML = `
            <div class="whitelist-detail-card" style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border-left: 4px solid #3498db;">
                <h4 style="margin-bottom: 15px; color: #2c3e50;"><i class="fas fa-building"></i> Cyberwebeyeos Sistemleri</h4>
                <div class="whitelist-stats">
                    <div style="margin-bottom: 10px;">
                        <strong>Ansible Server:</strong> ${cyberwebeyeos.ansible || 'N/A'} entries
                    </div>
                    <div style="margin-bottom: 10px;">
                        <strong>VirtualBackup:</strong> ${cyberwebeyeos.virtualbackup || 'N/A'} entries
                        ${cyberwebeyeos.virtualbackup && cyberwebeyeos.ansible ? 
                            `<span style="margin-left: 10px; font-size: 0.85rem; color: ${cyberwebeyeos.virtualbackup === cyberwebeyeos.ansible ? '#27ae60' : '#e74c3c'};">
                                (${cyberwebeyeos.virtualbackup === cyberwebeyeos.ansible ? 'Eslesme OK' : 'Fark var!'})
                            </span>` : ''
                        }
                    </div>
                    <div style="margin-bottom: 10px;">
                        <strong>A10 DDoS:</strong> Single IP: ${cyberwebeyeos.a10_single || 'N/A'}, Subnet: ${cyberwebeyeos.a10_subnet || 'N/A'}
                    </div>
                    <div style="margin-bottom: 10px;">
                        <strong>A10 Loading Status:</strong> ${getA10StatusText(prodData.a10_loading_status?.cyberwebeyeos, prodData.a10_loading_details?.cyberwebeyeos)}
                    </div>
                </div>
            </div>
            
            <div class="whitelist-detail-card" style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border-left: 4px solid #e74c3c;">
                <h4 style="margin-bottom: 15px; color: #2c3e50;"><i class="fas fa-building"></i> Örnek Müşteri A Sistemleri</h4>
                <div class="whitelist-stats">
                    <div style="margin-bottom: 10px;">
                        <strong>Ansible Server:</strong> ${ornekMusteriA.ansible || 'N/A'} entries
                    </div>
                    <div style="margin-bottom: 10px;">
                        <strong>Core Management:</strong> ${ornekMusteriA.coremgmt || 'N/A'} entries
                        ${ornekMusteriA.coremgmt && ornekMusteriA.ansible ? 
                            `<span style="margin-left: 10px; font-size: 0.85rem; color: ${ornekMusteriA.coremgmt === ornekMusteriA.ansible ? '#27ae60' : '#e74c3c'};">
                                (${ornekMusteriA.coremgmt === ornekMusteriA.ansible ? 'Eslesme OK' : 'Fark var!'})
                            </span>` : ''
                        }
                    </div>
                    <div style="margin-bottom: 10px;">
                        <strong>A10 DDoS:</strong> Single IP: ${ornekMusteriA.a10_single || 'N/A'}, Subnet: ${ornekMusteriA.a10_subnet || 'N/A'}
                    </div>
                    <div style="margin-bottom: 10px;">
                        <strong>A10 Loading Status:</strong> ${getA10StatusText(prodData.a10_loading_status?.['ornek-musteri-a'], prodData.a10_loading_details?.['ornek-musteri-a'])}
                    </div>
                </div>
            </div>
        `;
    }
}

// updateFailedDirs fonksiyonu
function updateFailedDirs(data) {
    const prodContainer = document.getElementById('prod-failed-dirs-content');
    const testContainer = document.getElementById('test-failed-dirs-content');

    // Production ve test failed directories'i ayir
    const prodFailedDirs = [];
    const testFailedDirs = [];

    // Production scope listesi
    const prodScopes = ['cyberwebeyeos_prod', 'cyberwebeyeos_drc', 'ornek-musteri-a_prod', 'ornek-musteri-a_drc'];

    // Test scope listesi
    const testScopes = ['maslak', 'spine', 'ornek-musteri-atest'];

    // Eger production_data ve test_data varsa, onlardan al
    if (data.production_data && data.production_data.failed_directories) {
        prodFailedDirs.push(...data.production_data.failed_directories);
    }

    if (data.test_data && data.test_data.failed_directories) {
        testFailedDirs.push(...data.test_data.failed_directories);
    }

    // Eger ayri data yoksa ve failed_directories varsa
    if (prodFailedDirs.length === 0 && testFailedDirs.length === 0 && data.failed_directories) {
        data.failed_directories.forEach(dir => {
            const scope = (dir.scope || '').toLowerCase();

            if (prodScopes.includes(scope)) {
                prodFailedDirs.push(dir);
            } else if (testScopes.includes(scope)) {
                testFailedDirs.push(dir);
            }
        });
    }

    // DUPLICATE FILTERING - Aynı dizin sadece 1 kez gösterilsin
    const removeDuplicates = (dirs) => {
        const seen = new Map();
        const unique = [];

        dirs.forEach(dir => {
            const key = `${dir.name || 'unknown'}|${dir.scope || 'unknown'}`;
            if (!seen.has(key)) {
                seen.set(key, true);
                unique.push(dir);
            }
        });

        console.log(`Duplicate filtering: ${dirs.length} → ${unique.length} (${dirs.length - unique.length} duplicates removed)`);
        return unique;
    };

    // Duplicate'leri temizle
    const uniqueProdFailedDirs = removeDuplicates(prodFailedDirs);
    const uniqueTestFailedDirs = removeDuplicates(testFailedDirs);

    // Update production failed dirs
    if (prodContainer) {
        prodContainer.innerHTML = generateFailedDirsContent(uniqueProdFailedDirs, data.multi_server, data.production_data || data);
    }

    // Update test failed dirs
    if (testContainer) {
        testContainer.innerHTML = generateFailedDirsContent(uniqueTestFailedDirs, false, data.test_data || data);
    }
}

// Failed Directories içerik olusturma - YENI server destegi eklendi
function generateFailedDirsContent(failedDirs, isMultiServer, scopeData) {
    // Eğer failed_directories boş ama scope_breakdown'da failed var mı kontrol et
    if (failedDirs.length === 0) {
        // Scope breakdown'dan failed sayısını hesapla
        let totalFailedInScopes = 0;
        if (scopeData && scopeData.scope_breakdown) {
            Object.values(scopeData.scope_breakdown).forEach(scope => {
                totalFailedInScopes += scope.failed || 0;
            });
        }

        if (totalFailedInScopes > 0) {
            // Başarısız var ama detay yok
            return `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    <strong>Uyarı:</strong> ${totalFailedInScopes} dizinde backup hatası tespit edildi ancak detay bilgisi mevcut değil.
                    <br><small>Ansible script'in güncel versiyonunu kullandığınızdan emin olun.</small>
                </div>
            `;
        }

        return `
            <div class="alert alert-success">
                <i class="fas fa-check-circle"></i> All backup directories are in successful state!
            </div>
        `;
    }
    
    // F5 cihazlarini grupla
    const f5Devices = failedDirs.filter(dir => 
        dir.name && (dir.name.includes('/F5') || dir.name.includes('F5/'))
    );
    const otherDevices = failedDirs.filter(dir => 
        !dir.name || (!dir.name.includes('/F5') && !dir.name.includes('F5/'))
    );
    
    // F5 cihazlarini scope'a göre grupla
    const f5ByScope = {};
    f5Devices.forEach(device => {
        const scope = device.scope || 'Unknown';
        if (!f5ByScope[scope]) {
            f5ByScope[scope] = [];
        }
        f5ByScope[scope].push(device);
    });
    
    let tableRows = '';
    
    // F5 cihazlarini göster
    if (Object.keys(f5ByScope).length > 0) {
        tableRows += `
            <tr style="background: #f0f0f0;">
                <td colspan="${isMultiServer ? '4' : '3'}" style="padding: 10px; font-weight: bold; color: #e74c3c;">
                    <i class="fas fa-server"></i> F5 Cihazlari (${f5Devices.length} adet)
                </td>
            </tr>
        `;
        
        Object.entries(f5ByScope).forEach(([scope, devices]) => {
            let scopeColor = '#95a5a6';
            const scopeColorMap = {
                'cyberwebeyeos_prod': '#3498db',
                'cyberwebeyeos_drc': '#2ecc71',
                'ornek-musteri-a_prod': '#e74c3c',
                'ornek-musteri-a_drc': '#f39c12'
            };
            
            if (scopeColorMap[scope]) {
                scopeColor = scopeColorMap[scope];
            }
            
            tableRows += devices.map(device => `
                <tr>
                    ${isMultiServer && device.server ? `
                        <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">
                            <span style="background: #95a5a6; color: white; padding: 2px 6px; border-radius: 3px; font-size: 0.75rem;">
                                ${device.server.toUpperCase()}
                            </span>
                        </td>
                    ` : ''}
                    <td style="font-weight: 600; padding: 8px; border-bottom: 1px solid #dee2e6;">
                        <i class="fas fa-exclamation-triangle" style="color: #e74c3c; margin-right: 5px;"></i>
                        ${device.name || device.directory || 'N/A'}
                    </td>
                    <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">
                        <span style="background: ${scopeColor}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.8rem;">
                            ${scope}
                        </span>
                    </td>
                    <td style="color: #e74c3c; padding: 8px; border-bottom: 1px solid #dee2e6;">
                        ${device.details || device.error || device.reason || 'Unknown error'}
                    </td>
                </tr>
            `).join('');
        });
    }
    
    // Diger cihazlari göster
    if (otherDevices.length > 0) {
        if (f5Devices.length > 0) {
            tableRows += `
                <tr style="background: #f0f0f0;">
                    <td colspan="${isMultiServer ? '4' : '3'}" style="padding: 10px; font-weight: bold; color: #e67e22;">
                        <i class="fas fa-folder"></i> Diger Dizinler (${otherDevices.length} adet)
                    </td>
                </tr>
            `;
        }
        
        tableRows += otherDevices.map(dir => {
            let scopeDisplay = dir.scope || 'Unknown';
            const scopeColorMap = {
                'maslak': '#9b59b6',
                'spine': '#1abc9c',
                'ornek-musteri-atest': '#e67e22',
                'cyberwebeyeos_prod': '#3498db',
                'cyberwebeyeos_drc': '#2ecc71',
                'ornek-musteri-a_prod': '#e74c3c',
                'ornek-musteri-a_drc': '#f39c12'
            };
            
            let scopeColor = '#95a5a6';
            for (const [key, color] of Object.entries(scopeColorMap)) {
                if (dir.scope && dir.scope.toLowerCase().includes(key.replace('_', ''))) {
                    scopeColor = color;
                    break;
                }
            }
            
            return `
                <tr>
                    ${isMultiServer && dir.server ? `
                        <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">
                            <span style="background: #95a5a6; color: white; padding: 2px 6px; border-radius: 3px; font-size: 0.75rem;">
                                ${dir.server.toUpperCase()}
                            </span>
                        </td>
                    ` : ''}
                    <td style="font-weight: 600; padding: 8px; border-bottom: 1px solid #dee2e6;">
                        ${dir.name || dir.directory || 'N/A'}
                    </td>
                    <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">
                        <span style="background: ${scopeColor}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.8rem;">
                            ${scopeDisplay}
                        </span>
                    </td>
                    <td style="color: #e74c3c; padding: 8px; border-bottom: 1px solid #dee2e6;">
                        ${dir.details || dir.error || dir.reason || 'Unknown error'}
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    return `
        <div class="alert alert-warning" style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px;">
            <i class="fas fa-exclamation-triangle" style="color: #856404;"></i>
            <strong style="color: #856404;">Dikkat:</strong>
            <span style="color: #856404;">Toplam ${failedDirs.length} dizinde backup dosyası eski veya bulunamıyor!</span>
            ${f5Devices.length > 0 ? `<br><strong style="color: #856404;">F5 Cihazlari: ${f5Devices.length} adet</strong>` : ''}
            <br><small style="color: #856404; font-size: 0.85rem;">
                <i class="fas fa-info-circle"></i> Bu dizinlerdeki backup dosyaları 2 günden eski veya hiç dosya bulunamadı.
            </small>
        </div>
        <table class="failed-dirs-table" style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr style="background: #f8f9fa;">
                    ${isMultiServer ? '<th style="padding: 8px; text-align: left; border-bottom: 2px solid #dee2e6;">Server</th>' : ''}
                    <th style="padding: 8px; text-align: left; border-bottom: 2px solid #dee2e6;">Dizin Adi</th>
                    <th style="padding: 8px; text-align: left; border-bottom: 2px solid #dee2e6;">Scope</th>
                    <th style="padding: 8px; text-align: left; border-bottom: 2px solid #dee2e6;">Hata Detayi</th>
                </tr>
            </thead>
            <tbody>
                ${tableRows}
            </tbody>
        </table>
    `;
}

// Tab islevselligi - DÜZELTME
function initBackupTabs() {
    console.log('Initializing backup tabs...');
    
    // Tab functionality
    const tabs = document.querySelectorAll('.backup-tabs .tab');
    console.log('Found tabs:', tabs.length);
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active from all tabs
            tabs.forEach(t => {
                t.classList.remove('active');
                t.style.background = 'white';
                t.style.color = '#2c3e50';
            });
            
            // Hide all tab contents
            document.querySelectorAll('#backup-monitoring-page .tab-content').forEach(content => {
                content.style.display = 'none';
            });
            
            // Activate clicked tab
            this.classList.add('active');
            this.style.background = '#3498db';
            this.style.color = 'white';
            
            // Show corresponding content
            const tabId = this.getAttribute('data-tab');
            console.log('Tab clicked:', tabId);
            
            const content = document.getElementById(tabId);
            if (content) {
                content.style.display = 'block';
                
                // Load data for specific tabs
                if (tabId === 'server-details' && currentBackupData) {
                    updateServerDetails(currentBackupData);
                } else if (tabId === 'historical' && currentBackupData) {
                    loadHistoricalData();
                } else if (tabId === 'logs') {
                    console.log('Loading logs tab...');
                    loadLogList();
                    setupLogFilterButtons();
                }
            }
        });
    });
    
    // Tenant filter buttons
    const tenantBtns = document.querySelectorAll('.tenant-btn');
    tenantBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            selectedTenant = this.dataset.tenant;
            console.log('Tenant selected:', selectedTenant);
            
            // Update button styles
            tenantBtns.forEach(b => {
                b.classList.remove('active');
                if (b.dataset.tenant === 'prod') {
                    b.style.background = 'white';
                    b.style.color = '#16a085';
                } else if (b.dataset.tenant === 'test') {
                    b.style.background = 'white';
                    b.style.color = '#e67e22';
                } else {
                    b.style.background = 'white';
                    b.style.color = '#3498db';
                }
            });
            
            this.classList.add('active');
            if (this.dataset.tenant === 'prod') {
                this.style.background = '#16a085';
                this.style.color = 'white';
            } else if (this.dataset.tenant === 'test') {
                this.style.background = '#e67e22';
                this.style.color = 'white';
            } else {
                this.style.background = '#3498db';
                this.style.color = 'white';
            }
            
            // Filter content AND update log list if logs tab is active
            filterContentByTenant();
            
            // Eger log sekmesi aktifse, log listesini de güncelle
            const activeTab = document.querySelector('.backup-tabs .tab.active');
            if (activeTab && activeTab.getAttribute('data-tab') === 'logs') {
                loadLogList();
            }
        });
    });

    // Refresh button event listener
    const refreshBtn = document.getElementById('backup-refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async function() {
            const icon = document.getElementById('backup-refresh-icon');
            if (icon) {
                icon.classList.add('fa-spin');
            }
            this.disabled = true;

            try {
                await refreshBackupDetails();
            } catch (error) {
                console.error('Error refreshing backup details:', error);
                showToast('Hata', 'Veriler yenilenemedi', 'error');
            } finally {
                if (icon) {
                    icon.classList.remove('fa-spin');
                }
                this.disabled = false;
            }
        });
    }
}

// Server Details fonksiyonu - GÜNCELLEME (6 sunucu destegi ve detayli görünüm)
function updateServerDetails(data) {
    const container = document.getElementById('server-details-content');
    if (!container) return;
    
    // Multi-server destegi kontrolü - hem production hem test için
    const isProductionMultiServer = data.multi_server || false;
    const hasTestData = data.test_data ? true : false;
    
    if (!isProductionMultiServer && !hasTestData) {
        container.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle"></i> Server detay bilgisi bulunamadi. Multi-server yapisinda detayli bilgi görüntülenir.
            </div>
        `;
        return;
    }
    
    let html = '<div style="margin-bottom: 20px;">';
    
    // Production Servers Section
    if (isProductionMultiServer && data.server_breakdown) {
        html += `
            <h4 style="color: #16a085; margin-bottom: 15px;">
                <i class="fas fa-industry"></i> Production Servers
            </h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 20px; margin-bottom: 30px;">
        `;
        
        // Production server detaylari
        const prodServers = [
            {
                key: 'ansible',
                name: 'Ansible Server',
                ip: '198.51.100.60',
                color: '#3498db',
                icon: 'fa-server'
            },
            {
                key: 'cyberwebeyeos_vb',
                name: 'Cyberwebeyeos VirtualBackup',
                ip: '198.51.100.61',
                color: '#e74c3c',
                icon: 'fa-database'
            },
            {
                key: 'ornek-musteri-a_vb',
                name: 'Örnek Müşteri A CoreMgmt',
                ip: '198.51.100.62',
                color: '#f39c12',
                icon: 'fa-cloud'
            }
        ];
        
        prodServers.forEach(server => {
            const stats = data.server_breakdown[server.key];
            if (!stats) return;
            
            const successRate = stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0;
            
            html += generateServerCard(server, stats, successRate, data);
        });
        
        html += '</div>';
    }
    
    // Test Servers Section
    if (hasTestData) {
        html += `
            <h4 style="color: #e67e22; margin-bottom: 15px;">
                <i class="fas fa-flask"></i> Test Servers
            </h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 20px;">
        `;
        
        // Test server detaylari - SADECE GERCEK SUNUCU
        // Not: Test ortaminda sadece Test Ansible Server var, diger sunucular simdilik mevcut degil
        const testServers = [
            {
                key: 'ansible',
                name: 'Test Ansible Server',
                ip: '198.51.100.63',
                color: '#9b59b6',
                icon: 'fa-server'
            }
            // Test VirtualBackup ve Test Virtual Ansible simdilik mevcut degil - veri cekildiginde eklenecek
        ];

        // Test data'dan istatistikleri al
        const testSummary = data.test_data.backup_summary || {};
        const testStats = {
            total: testSummary.total_dirs || 0,
            success: testSummary.successful || 0,
            failed: testSummary.failed || 0
        };

        // Sadece mevcut sunuculari goster
        testServers.forEach(server => {
            // Test icin gercek veriyi kullan
            const successRate = testStats.total > 0 ? Math.round((testStats.success / testStats.total) * 100) : 0;
            html += generateServerCard(server, testStats, successRate, data.test_data);
        });
        
        html += '</div>';
    }
    
    html += '</div>';
    container.innerHTML = html;
}

// Server karti olusturma fonksiyonu
function generateServerCard(server, stats, successRate, data) {
    let html = `
        <div class="server-detail-card" style="background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden;">
            <div style="background: ${server.color}; color: white; padding: 15px;">
                <h4 style="margin: 0; display: flex; align-items: center; gap: 10px;">
                    <i class="fas ${server.icon}"></i> ${server.name}
                </h4>
                <div style="font-size: 0.9rem; margin-top: 5px; opacity: 0.9;">${server.ip}</div>
            </div>
            <div style="padding: 20px;">
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px;">
                    <div style="text-align: center;">
                        <div style="font-size: 1.5rem; font-weight: bold; color: #2c3e50;">${stats.total}</div>
                        <div style="font-size: 0.85rem; color: #7f8c8d;">Toplam</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 1.5rem; font-weight: bold; color: #27ae60;">${stats.success}</div>
                        <div style="font-size: 0.85rem; color: #7f8c8d;">Basarili</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 1.5rem; font-weight: bold; color: #e74c3c;">${stats.failed}</div>
                        <div style="font-size: 0.85rem; color: #7f8c8d;">Basarisiz</div>
                    </div>
                </div>
                <div style="margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span style="font-weight: 600; color: #2c3e50;">Basari Orani</span>
                        <span style="font-weight: bold; color: ${successRate === 100 ? '#27ae60' : successRate >= 80 ? '#f39c12' : '#e74c3c'};">
                            ${successRate}%
                        </span>
                    </div>
                    <div class="progress" style="height: 10px;">
                        <div class="progress-bar ${successRate === 100 ? 'progress-bar-success' : successRate >= 80 ? 'progress-bar-warning' : 'progress-bar-danger'}" 
                             style="width: ${successRate}%;"></div>
                    </div>
                </div>
    `;
    
    // Sample devices varsa göster
    if (data.sample_devices && data.sample_devices.length > 0) {
        // Bu sunucuya ait cihazlari filtrele
        const serverDevices = data.sample_devices.filter(d => 
            d.server === server.key || (!d.server && server.key === 'ansible')
        ).slice(0, 5);
        
        if (serverDevices.length > 0) {
            html += `
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ecf0f1;">
                    <h6 style="margin-bottom: 10px; color: #2c3e50; font-size: 0.85rem;">
                        <i class="fas fa-list"></i> örnek Cihazlar (${serverDevices.length})
                    </h6>
                    <div style="max-height: 150px; overflow-y: auto;">
            `;
            
            serverDevices.forEach(device => {
                const statusColor = device.status === 'success' ? '#27ae60' : '#e74c3c';
                const statusIcon = device.status === 'success' ? 'check-circle' : 'times-circle';
                
                html += `
                    <div style="padding: 8px; background: #f8f9fa; margin-bottom: 5px; border-radius: 4px; font-size: 0.8rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <i class="fas fa-${statusIcon}" style="color: ${statusColor}; margin-right: 5px;"></i>
                                <strong>${device.name}</strong>
                                <span style="color: #7f8c8d; margin-left: 5px;">[${device.scope}]</span>
                            </div>
                            <div style="color: #95a5a6; font-size: 0.75rem;">
                                ${device.backup_date}
                            </div>
                        </div>
                    </div>
                `;
            });
            
            html += '</div></div>';
        }
    }
    
    // Execution time varsa göster
    if (data.execution_time) {
        html += `
            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #ecf0f1;">
                <i class="fas fa-clock" style="color: #95a5a6;"></i>
                <span style="font-size: 0.85rem; color: #7f8c8d;">çalisma süresi: ${data.execution_time} saniye</span>
            </div>
        `;
    }
    
    html += '</div></div>';
    return html;
}

function filterContentByTenant() {
    // Filter scope sections
    document.querySelectorAll('.tenant-scope-section').forEach(section => {
        if (selectedTenant === 'all' || section.dataset.tenant === selectedTenant) {
            section.style.display = 'block';
        } else {
            section.style.display = 'none';
        }
    });
    
    // Filter whitelist sections
    document.querySelectorAll('.tenant-whitelist-section').forEach(section => {
        if (selectedTenant === 'all' || section.dataset.tenant === selectedTenant) {
            section.style.display = 'block';
        } else {
            section.style.display = 'none';
        }
    });
    
    // Filter failed directories sections
    document.querySelectorAll('.tenant-failed-section').forEach(section => {
        if (selectedTenant === 'all' || section.dataset.tenant === selectedTenant) {
            section.style.display = 'block';
        } else {
            section.style.display = 'none';
        }
    });
}

// Historical data yükleme
async function loadHistoricalData() {
    try {
        // Tenant'a göre endpoint belirle
        let endpoint = '';
        if (selectedTenant === 'prod') {
            endpoint = 'backup_receiver_prod.php?action=historical&days=7';
        } else if (selectedTenant === 'test') {
            endpoint = 'backup_receiver_test.php?action=historical&days=7';
        } else {
            // Tümü seçiliyse her iki endpoint'ten de veri çek
            const prodResponse = await fetch('backup_receiver_prod.php?action=historical&days=7');
            const testResponse = await fetch('backup_receiver_test.php?action=historical&days=7');
            
            const prodData = prodResponse.ok ? await prodResponse.json() : [];
            const testData = testResponse.ok ? await testResponse.json() : [];
            
            // Verileri birlestir ve tarih sirasina göre sirala
            const allData = [...prodData, ...testData].sort((a, b) => 
                new Date(b.date) - new Date(a.date)
            );
            
            updateHistoricalContent(allData);
            return;
        }
        
        const response = await fetch(endpoint);
        if (!response.ok) throw new Error('API Error');
        
        const data = await response.json();
        updateHistoricalContent(data);
        
    } catch (error) {
        console.error('Historical data load error:', error);
        const container = document.getElementById('historical-content');
        if (container) {
            container.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle"></i> Geçmis veriler yüklenirken hata olustu: ${error.message}
                </div>
            `;
        }
    }
}

function updateHistoricalContent(data) {
    const container = document.getElementById('historical-content');
    if (!container) return;
    
    if (!data || data.length === 0) {
        container.innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-info-circle"></i> Geçmis veri bulunamadi.
            </div>
        `;
        return;
    }
    
    const tableRows = data.map(day => {
        const total = day.backup_summary?.total_dirs || 0;
        const successful = day.backup_summary?.successful || 0;
        const failed = day.backup_summary?.failed || 0;
        const successRate = total > 0 ? Math.round((successful / total) * 100) : 0;
        const tenant = day.tenant || 'prod';
        
        return `
            <tr>
                <td style="padding: 12px; border-bottom: 1px solid #dee2e6;">${day.date || 'N/A'}</td>
                <td style="padding: 12px; border-bottom: 1px solid #dee2e6;">
                    <span style="background: ${tenant === 'test' ? '#e67e22' : '#16a085'}; color: white; padding: 2px 8px; border-radius: 3px; font-size: 0.8rem;">
                        ${tenant.toUpperCase()}
                    </span>
                </td>
                <td style="padding: 12px; border-bottom: 1px solid #dee2e6;">${total}</td>
                <td style="padding: 12px; border-bottom: 1px solid #dee2e6; color: #27ae60; font-weight: 600;">${successful}</td>
                <td style="padding: 12px; border-bottom: 1px solid #dee2e6; color: #e74c3c; font-weight: 600;">${failed}</td>
                <td style="padding: 12px; border-bottom: 1px solid #dee2e6;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="color: ${successRate === 100 ? '#27ae60' : successRate >= 80 ? '#f39c12' : '#e74c3c'}; font-weight: 600;">
                            ${successRate}%
                        </span>
                        <div class="progress" style="flex: 1; height: 6px;">
                            <div class="progress-bar ${successRate === 100 ? 'progress-bar-success' : 'progress-bar-danger'}" 
                                 style="width: ${successRate}%;"></div>
                        </div>
                    </div>
                </td>
                <td style="padding: 12px; border-bottom: 1px solid #dee2e6;">${day.problems_count || 0}</td>
            </tr>
        `;
    }).join('');
    
    container.innerHTML = `
        <table style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr style="background: #f8f9fa;">
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Tarih</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Tenant</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Toplam</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Basarili</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Basarisiz</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Basari Orani</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Toplam Sorun</th>
                </tr>
            </thead>
            <tbody>
                ${tableRows}
            </tbody>
        </table>
    `;
}

// Historical tenant dropdown
document.addEventListener('change', function(e) {
    if (e.target.id === 'historical-tenant-select') {
        selectedTenant = e.target.value;
        loadHistoricalData();
    }
});

// Init page functions
function initBackupMonitoringPage() {
    console.log('Initializing backup monitoring page...');
    refreshBackupDetails();
    initBackupTabs();
}

// ========== LOG VIEWER FUNCTIONS ==========
let currentLogs = [];
let selectedLogType = 'all';

// Log listesini yükle
async function loadLogList() {
    try {
        console.log('Loading log list...');
        showLogLoading(true);
        
        // Container'i kontrol et
        const container = document.getElementById('log-list-container');
        if (!container) {
            console.error('ERROR: log-list-container element not found!');
            return;
        }
        
        // Tenant filtresini al
        let url = `backup_receiver.php?action=list_logs&days=30`;
        if (selectedTenant !== 'all') {
            url += `&tenant=${selectedTenant}`;
        }
        
        console.log('Loading logs from:', url);
        
        const response = await fetch(url);
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const text = await response.text();
            console.error('Response text:', text);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const logs = await response.json();
        console.log('Logs received:', logs);
        console.log('Number of logs:', logs.length);
        
        currentLogs = logs;
        displayLogList(logs);
        
    } catch (error) {
        console.error('Log list load error:', error);
        showLogError('Log listesi yüklenirken hata olustu: ' + error.message);
    } finally {
        showLogLoading(false);
    }
}

// Log listesini göster
function displayLogList(logs) {
    const container = document.getElementById('log-list-container');
    if (!container) {
        console.error('Log list container not found!');
        return;
    }
    
    // Log tipine göre filtrele
    let filteredLogs = logs;
    if (selectedLogType !== 'all') {
        filteredLogs = logs.filter(log => log.type === selectedLogType);
    }
    
    if (!filteredLogs || filteredLogs.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle"></i> Bu kriterlere uygun log dosyasi bulunmuyor.
            </div>
        `;
        return;
    }
    
    // Tarihe göre grupla
    const groupedLogs = {};
    filteredLogs.forEach(log => {
        const date = log.date || 'Bilinmeyen';
        if (!groupedLogs[date]) {
            groupedLogs[date] = [];
        }
        groupedLogs[date].push(log);
    });
    
    let html = '';
    Object.keys(groupedLogs).sort().reverse().forEach(date => {
        html += `
            <div class="log-date-group" style="margin-bottom: 20px;">
                <h5 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 5px;">
                    <i class="fas fa-calendar"></i> ${date}
                </h5>
                <div class="log-items" style="margin-top: 10px;">
        `;
        
        groupedLogs[date].forEach(log => {
            const icon = log.type === 'error' ? 'fa-exclamation-triangle' : 'fa-file-alt';
            const iconColor = log.type === 'error' ? '#e74c3c' : '#3498db';
            const tenantBadge = log.tenant === 'test' ? 
                '<span class="log-badge" style="background: #e67e22;">TEST</span>' : 
                '<span class="log-badge" style="background: #16a085;">PROD</span>';
            
            html += `
                <div class="log-item" style="background: white; padding: 15px; margin-bottom: 10px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); cursor: pointer;"
                     onclick="viewLogFile('${log.filename}')">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <i class="fas ${icon}" style="color: ${iconColor}; font-size: 1.2rem;"></i>
                            <div>
                                <div style="font-weight: 600; color: #2c3e50;">${log.filename}</div>
                                <div style="font-size: 0.85rem; color: #7f8c8d;">
                                    ${formatFileSize(log.size)} · ${log.modified}
                                </div>
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            ${tenantBadge}
                            <button class="btn btn-sm" style="background: #3498db; color: white;" 
                                    onclick="event.stopPropagation(); downloadLog('${log.filename}')">
                                <i class="fas fa-download"></i> Indir
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += '</div></div>';
    });
    
    container.innerHTML = html;
}

// Log dosyasini görüntüle
async function viewLogFile(filename) {
    try {
        showLogModal(true);
        showModalLoading(true);
        
        const response = await fetch(`backup_receiver.php?action=read_log&filename=${encodeURIComponent(filename)}&lines=1000`);
        if (!response.ok) throw new Error('API Error');
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        displayLogContent(data);
        
    } catch (error) {
        console.error('Log view error:', error);
        showModalError('Log görüntülenirken hata olustu: ' + error.message);
    } finally {
        showModalLoading(false);
    }
}

// Log içerigini göster
function displayLogContent(data) {
    const modalTitle = document.getElementById('log-modal-title');
    const modalInfo = document.getElementById('log-modal-info');
    const modalContent = document.getElementById('log-modal-content');
    
    if (modalTitle) modalTitle.textContent = data.filename;
    if (modalInfo) {
        modalInfo.innerHTML = `
            <span><i class="fas fa-file"></i> ${formatFileSize(data.size)}</span>
            <span><i class="fas fa-list-ol"></i> ${data.lines_shown} satir</span>
            <span><i class="fas fa-clock"></i> ${data.modified}</span>
        `;
    }
    
    if (modalContent) {
        const highlightedContent = highlightLogContent(data.content);
        modalContent.innerHTML = `<pre style="margin: 0; white-space: pre-wrap; word-wrap: break-word;">${highlightedContent}</pre>`;
    }
}

// Log içerigini renklendir
function highlightLogContent(content) {
    return content
        .replace(/\[([\d\/:\s]+)\]/g, '<span style="color: #3498db; font-weight: 600;">[$1]</span>')
        .replace(/\[ERROR\]/g, '<span style="background: #e74c3c; color: white; padding: 2px 4px; border-radius: 3px; font-weight: 600;">[ERROR]</span>')
        .replace(/\[WARNING\]/g, '<span style="background: #f39c12; color: white; padding: 2px 4px; border-radius: 3px; font-weight: 600;">[WARNING]</span>')
        .replace(/\[INFO\]/g, '<span style="background: #2ecc71; color: white; padding: 2px 4px; border-radius: 3px; font-weight: 600;">[INFO]</span>')
        .replace(/SUCCESS/g, '<span style="color: #27ae60; font-weight: 600;">SUCCESS</span>')
        .replace(/FAILED/g, '<span style="color: #e74c3c; font-weight: 600;">FAILED</span>')
        .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '<span style="color: #8e44ad; font-weight: 600;">$&</span>')
        .replace(/\/[\w\/\-\.]+/g, '<span style="color: #16a085;">$&</span>');
}

// Log dosyasini indir
function downloadLog(filename) {
    window.open(`backup_receiver.php?action=download_log&filename=${encodeURIComponent(filename)}`, '_blank');
}

// Log listesini yenile
function refreshLogList() {
    console.log('Refreshing log list...');
    loadLogList();
}

// Modal'i kapat
function closeLogModal() {
    showLogModal(false);
}

// UI Helper Functions
function showLogLoading(show) {
    const container = document.getElementById('log-list-container');
    if (!container) return;
    
    if (show) {
        container.innerHTML = `
            <div class="text-center" style="padding: 40px;">
                <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: #3498db;"></i>
                <p style="margin-top: 10px; color: #7f8c8d;">Log listesi yükleniyor...</p>
            </div>
        `;
    }
}

function showLogError(message) {
    const container = document.getElementById('log-list-container');
    if (container) {
        container.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle"></i> ${message}
            </div>
        `;
    }
}

function showLogModal(show) {
    const modal = document.getElementById('log-viewer-modal');
    if (modal) {
        modal.style.display = show ? 'block' : 'none';
    }
}

function showModalLoading(show) {
    const content = document.getElementById('log-modal-content');
    if (!content) return;
    
    if (show) {
        content.innerHTML = `
            <div class="text-center" style="padding: 40px;">
                <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: #3498db;"></i>
                <p style="margin-top: 10px;">Log içerigi yükleniyor...</p>
            </div>
        `;
    }
}

function showModalError(message) {
    const content = document.getElementById('log-modal-content');
    if (content) {
        content.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle"></i> ${message}
            </div>
        `;
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Log filter butonlari
function setupLogFilterButtons() {
    console.log('Setting up log filter buttons...');
    
    const filterBtns = document.querySelectorAll('.log-filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            selectedLogType = this.dataset.logtype;
            console.log('Log type selected:', selectedLogType);
            
            // Button stillerini güncelle
            filterBtns.forEach(b => {
                b.classList.remove('active');
                b.style.background = 'white';
                
                if (b.dataset.logtype === 'all') {
                    b.style.color = '#3498db';
                    b.style.borderColor = '#3498db';
                } else if (b.dataset.logtype === 'backup') {
                    b.style.color = '#2ecc71';
                    b.style.borderColor = '#2ecc71';
                } else if (b.dataset.logtype === 'error') {
                    b.style.color = '#e74c3c';
                    b.style.borderColor = '#e74c3c';
                }
            });
            
            this.classList.add('active');
            if (this.dataset.logtype === 'all') {
                this.style.background = '#3498db';
            } else if (this.dataset.logtype === 'backup') {
                this.style.background = '#2ecc71';
            } else if (this.dataset.logtype === 'error') {
                this.style.background = '#e74c3c';
            }
            this.style.color = 'white';
            
            // Log listesini güncelle
            displayLogList(currentLogs);
        });
    });
}

// Test API fonksiyonu
function testLogAPI() {
    fetch('backup_receiver.php?action=list_logs')
        .then(response => {
            console.log('Test API Response:', response);
            return response.text();
        })
        .then(text => {
            console.log('Raw response:', text);
            try {
                const json = JSON.parse(text);
                console.log('Parsed JSON:', json);
            } catch (e) {
                console.error('JSON parse error:', e);
            }
        })
        .catch(error => {
            console.error('Test API Error:', error);
        });
}

// initCurrentPage fonksiyonuna ekleme
function initDashboardPage() {
    console.log('Dashboard page initialized');
    // Dashboard için özel islemler varsa buraya eklenebilir
}

// Console debugging için yardimci fonksiyonlar
window.debugBackup = {
    testAPI: function() {
        console.log('Testing Production backup API...');
        fetch('backup_receiver_prod.php?action=current')
            .then(r => r.json())
            .then(d => console.log('Production data:', d))
            .catch(e => console.error('Error:', e));

        console.log('Testing Test backup API...');
        fetch('backup_receiver_test.php?action=current')
            .then(r => r.json())
            .then(d => console.log('Test data:', d))
            .catch(e => console.error('Error:', e));
    },
    
    testLogs: function() {
        console.log('Testing logs API...');
        testLogAPI();
    },
    
    showData: function() {
        console.log('Current backup data:', currentBackupData);
    },
    
    refreshNow: function() {
        console.log('Refreshing backup status...');
        refreshBackupStatus();
    }
};

console.log('app.js loaded successfully');
console.log('Debug commands available:');
console.log('- debugBackup.testAPI() - Test current data API');
console.log('- debugBackup.testLogs() - Test logs API');
console.log('- debugBackup.showData() - Show current data');
console.log('- debugBackup.refreshNow() - Refresh backup status');


// Network Monitor Functions - main.js'e eklenecek

// Network Monitor için global degiskenler
window.networkMonitor = {
    testInterval: null,
    testRunning: false,
    testHistory: []
};

// Network Monitor fonksiyonlarini window objesine ekle
window.saveNetworkConfiguration = function(e) {
    if (e) e.preventDefault();
    
    const config = {
        targetUrl: document.getElementById('target-url').value,
        tracerouteTarget: document.getElementById('traceroute-target').value,
        testInterval: document.getElementById('test-interval').value,
        startHour: document.getElementById('start-hour').value,
        endHour: document.getElementById('end-hour').value
    };
    
    // LocalStorage'a kaydet
    localStorage.setItem('networkMonitorConfig', JSON.stringify(config));
    
    // PHP'ye gönder
    fetch('./network-monitor.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            action: 'save_config',
            config: config
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            addNetworkLogMessage('Ayarlar kaydedildi', 'success');
        } else {
            addNetworkLogMessage('Kayit hatasi: ' + data.message, 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        addNetworkLogMessage('Baglanti hatasi', 'error');
    });
};

window.loadNetworkConfiguration = function() {
    const savedConfig = localStorage.getItem('networkMonitorConfig');
    if (savedConfig) {
        try {
            const config = JSON.parse(savedConfig);
            if (document.getElementById('target-url')) {
                document.getElementById('target-url').value = config.targetUrl || '';
            }
            if (document.getElementById('traceroute-target')) {
                document.getElementById('traceroute-target').value = config.tracerouteTarget || '8.8.8.8';
            }
            if (document.getElementById('test-interval')) {
                document.getElementById('test-interval').value = config.testInterval || '5';
            }
            if (document.getElementById('start-hour')) {
                document.getElementById('start-hour').value = config.startHour || '01:00';
            }
            if (document.getElementById('end-hour')) {
                document.getElementById('end-hour').value = config.endHour || '05:00';
            }
        } catch (e) {
            console.error('Config parse error:', e);
        }
    }
};

window.toggleNetworkTest = function() {
    if (window.networkMonitor.testRunning) {
        stopNetworkTest();
    } else {
        startNetworkTest();
    }
};

window.startNetworkTest = function() {
    const targetUrl = document.getElementById('target-url').value;
    if (!targetUrl) {
        alert('Lütfen hedef URL giriniz!');
        return;
    }
    
    window.networkMonitor.testRunning = true;
    updateNetworkTestStatus('running');
    
    // Ilk testi hemen çalistir
    runSingleNetworkTest();
    
    // Periyodik test
    const intervalMinutes = parseInt(document.getElementById('test-interval').value);
    window.networkMonitor.testInterval = setInterval(runSingleNetworkTest, intervalMinutes * 60 * 1000);
    
    // Buton metnini güncelle
    const startBtn = document.getElementById('start-test-btn');
    if (startBtn) {
        startBtn.innerHTML = '<i class="fas fa-stop"></i> Test Durdur';
        startBtn.classList.remove('submit-btn');
        startBtn.classList.add('btn-danger');
    }
};

window.stopNetworkTest = function() {
    window.networkMonitor.testRunning = false;
    if (window.networkMonitor.testInterval) {
        clearInterval(window.networkMonitor.testInterval);
        window.networkMonitor.testInterval = null;
    }
    
    updateNetworkTestStatus('stopped');
    
    // Buton metnini güncelle
    const startBtn = document.getElementById('start-test-btn');
    if (startBtn) {
        startBtn.innerHTML = '<i class="fas fa-play"></i> Test Baslat';
        startBtn.classList.remove('btn-danger');
        startBtn.classList.add('submit-btn');
    }
};

window.runSingleNetworkTest = function() {
    // Saat kontrolü
    if (!isInNetworkTestHours()) {
        addNetworkLogMessage('Test saati disinda, bekleniyor...', 'warning');
        return;
    }
    
    addNetworkLogMessage('Test baslatiliyor...', 'info');
    updateNetworkTestStatus('testing');
    
    const config = {
        targetUrl: document.getElementById('target-url').value,
        tracerouteTarget: document.getElementById('traceroute-target').value
    };
    
    // PHP'ye test istegi gönder
    fetch('./network-monitor.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            action: 'run_test',
            config: config
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            displayNetworkTestResults(data.results);
            addToNetworkHistory(data.results);
            updateNetworkTestStatus('running');
        } else {
            addNetworkLogMessage('Test hatasi: ' + data.message, 'error');
            updateNetworkTestStatus('error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        addNetworkLogMessage('Baglanti hatasi: ' + error.message, 'error');
        updateNetworkTestStatus('error');
    });
};

window.displayNetworkTestResults = function(results) {
    // Metrikleri güncelle
    if (document.getElementById('dns-time')) {
        document.getElementById('dns-time').textContent = results.dns_ms || '-';
    }
    if (document.getElementById('tcp-time')) {
        document.getElementById('tcp-time').textContent = results.tcp_ms || '-';
    }
    if (document.getElementById('ssl-time')) {
        document.getElementById('ssl-time').textContent = results.ssl_ms || '-';
    }
    if (document.getElementById('http-time')) {
        document.getElementById('http-time').textContent = results.http_ms || '-';
    }
    if (document.getElementById('total-time')) {
        document.getElementById('total-time').textContent = results.total_ms || '-';
    }
    if (document.getElementById('packet-loss')) {
        document.getElementById('packet-loss').textContent = results.packet_loss || '-';
    }
    
    // Log mesajlari
    if (results.logs && Array.isArray(results.logs)) {
        results.logs.forEach(log => {
            addNetworkLogMessage(log.message, log.type);
        });
    }
    
    // Traceroute sonuçlari
    if (results.traceroute && Array.isArray(results.traceroute)) {
        displayNetworkTraceroute(results.traceroute);
    }
    
    // Sorun tespiti
    analyzeNetworkResults(results);
};

window.displayNetworkTraceroute = function(hops) {
    const tbody = document.getElementById('traceroute-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    hops.forEach(hop => {
        const tr = document.createElement('tr');
        const status = hop.rtt > 100 ? 'warning' : 'success';
        tr.innerHTML = `
            <td>${hop.hop}</td>
            <td>${hop.ip}</td>
            <td>${hop.rtt}</td>
            <td><span class="status status-${status}">${status === 'success' ? 'Normal' : 'Yavas'}</span></td>
        `;
        tbody.appendChild(tr);
    });
};

window.analyzeNetworkResults = function(results) {
    const issues = [];
    
    if (results.dns_ms && results.dns_ms > 50) {
        issues.push(`DNS yavas: ${results.dns_ms}ms (normal < 50ms)`);
    }
    if (results.tcp_ms && results.tcp_ms > 200) {
        issues.push(`TCP yavas: ${results.tcp_ms}ms (normal < 200ms)`);
    }
    if (results.ssl_ms && results.ssl_ms > 300) {
        issues.push(`SSL yavas: ${results.ssl_ms}ms (normal < 300ms)`);
    }
    if (results.http_ms && results.http_ms > 2000) {
        issues.push(`HTTP yavas: ${results.http_ms}ms (normal < 2000ms)`);
    }
    if (results.packet_loss && results.packet_loss > 1) {
        issues.push(`Paket kaybi: ${results.packet_loss}%`);
    }
    
    if (issues.length > 0) {
        addNetworkLogMessage('--- SORUNLAR TESPIT EDILDI ---', 'warning');
        issues.forEach(issue => {
            addNetworkLogMessage('· ' + issue, 'warning');
        });
    } else {
        addNetworkLogMessage('Tüm degerler normal sinirlarda', 'success');
    }
};

window.addToNetworkHistory = function(results) {
    const historyItem = {
        timestamp: new Date().toISOString(),
        url: results.url,
        dns_ms: results.dns_ms,
        tcp_ms: results.tcp_ms,
        ssl_ms: results.ssl_ms,
        http_ms: results.http_ms,
        total_ms: results.total_ms,
        packet_loss: results.packet_loss,
        status: results.status
    };
    
    window.networkMonitor.testHistory.unshift(historyItem);
    
    // Maksimum 100 kayit tut
    if (window.networkMonitor.testHistory.length > 100) {
        window.networkMonitor.testHistory = window.networkMonitor.testHistory.slice(0, 100);
    }
    
    // LocalStorage'a kaydet
    try {
        localStorage.setItem('networkMonitorHistory', JSON.stringify(window.networkMonitor.testHistory));
    } catch (e) {
        console.error('LocalStorage error:', e);
    }
    
    // Tabloyu güncelle
    updateNetworkHistoryTable();
};

window.updateNetworkHistoryTable = function() {
    const tbody = document.getElementById('history-tbody');
    if (!tbody) return;
    
    if (window.networkMonitor.testHistory.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center">Henüz test geçmisi bulunmuyor</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    
    window.networkMonitor.testHistory.slice(0, 20).forEach(item => {
        const date = new Date(item.timestamp);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${date.toLocaleDateString('tr-TR')} ${date.toLocaleTimeString('tr-TR')}</td>
            <td>${item.url}</td>
            <td>${item.dns_ms || '-'}</td>
            <td>${item.tcp_ms || '-'}</td>
            <td>${item.ssl_ms || '-'}</td>
            <td>${item.http_ms || '-'}</td>
            <td>${item.total_ms || '-'}</td>
            <td>${item.packet_loss || '-'}</td>
            <td><span class="status status-${getNetworkStatusClass(item.status)}">${getNetworkStatusText(item.status)}</span></td>
        `;
        tbody.appendChild(tr);
    });
};

window.loadNetworkTestHistory = function() {
    try {
        const saved = localStorage.getItem('networkMonitorHistory');
        if (saved) {
            window.networkMonitor.testHistory = JSON.parse(saved);
            updateNetworkHistoryTable();
        }
    } catch (e) {
        console.error('History load error:', e);
        window.networkMonitor.testHistory = [];
    }
};

window.exportNetworkToCSV = function() {
    if (window.networkMonitor.testHistory.length === 0) {
        alert('Export edilecek veri yok');
        return;
    }
    
    let csv = 'Tarih,Saat,URL,DNS(ms),TCP(ms),SSL(ms),HTTP(ms),Toplam(ms),Paket Kaybi(%),Durum\n';
    
    window.networkMonitor.testHistory.forEach(item => {
        const date = new Date(item.timestamp);
        csv += `${date.toLocaleDateString('tr-TR')},${date.toLocaleTimeString('tr-TR')},`;
        csv += `${item.url},${item.dns_ms},${item.tcp_ms},${item.ssl_ms},`;
        csv += `${item.http_ms},${item.total_ms},${item.packet_loss},${getNetworkStatusText(item.status)}\n`;
    });
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `network_monitor_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
};

// Yardimci fonksiyonlar
window.isInNetworkTestHours = function() {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const startHour = document.getElementById('start-hour');
    const endHour = document.getElementById('end-hour');
    
    if (!startHour || !endHour) return true;
    
    const startParts = startHour.value.split(':');
    const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
    
    const endParts = endHour.value.split(':');
    const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
    
    if (startMinutes <= endMinutes) {
        return currentTime >= startMinutes && currentTime <= endMinutes;
    } else {
        return currentTime >= startMinutes || currentTime <= endMinutes;
    }
};

window.addNetworkLogMessage = function(message, type = 'info') {
    const output = document.getElementById('test-output');
    if (!output) return;
    
    const timestamp = new Date().toLocaleTimeString('tr-TR');
    
    const div = document.createElement('div');
    div.style.color = getNetworkLogColor(type);
    div.textContent = `[${timestamp}] ${message}`;
    
    output.appendChild(div);
    output.scrollTop = output.scrollHeight;
    
    while (output.children.length > 100) {
        output.removeChild(output.firstChild);
    }
};

window.updateNetworkTestStatus = function(status) {
    const statusElement = document.getElementById('test-status');
    if (!statusElement) return;
    
    switch(status) {
        case 'running':
            statusElement.className = 'status-badge status-success';
            statusElement.innerHTML = '<i class="fas fa-circle"></i> çalisiyor';
            break;
        case 'testing':
            statusElement.className = 'status-badge status-info';
            statusElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Test Yapiliyor';
            break;
        case 'stopped':
            statusElement.className = 'status-badge status-warning';
            statusElement.innerHTML = '<i class="fas fa-pause-circle"></i> Durduruldu';
            break;
        case 'error':
            statusElement.className = 'status-badge status-danger';
            statusElement.innerHTML = '<i class="fas fa-exclamation-circle"></i> Hata';
            break;
        default:
            statusElement.className = 'status-badge status-warning';
            statusElement.innerHTML = '<i class="fas fa-pause-circle"></i> Beklemede';
    }
};

window.getNetworkLogColor = function(type) {
    switch(type) {
        case 'success': return '#2ecc71';
        case 'warning': return '#f39c12';
        case 'error': return '#e74c3c';
        case 'info': return '#3498db';
        default: return '#95a5a6';
    }
};

window.getNetworkStatusClass = function(status) {
    switch(status) {
        case 'success': return 'success';
        case 'slow': return 'warning';
        case 'error': return 'danger';
        default: return 'secondary';
    }
};

window.getNetworkStatusText = function(status) {
    switch(status) {
        case 'success': return 'Basarili';
        case 'slow': return 'Yavas';
        case 'error': return 'Hata';
        default: return 'Bilinmiyor';
    }
};

// Network Monitor sayfasi gösterildiginde çalisacak
window.initNetworkMonitor = function() {
    // Form submit handler
    const configForm = document.getElementById('network-config-form');
    if (configForm) {
        configForm.addEventListener('submit', saveNetworkConfiguration);
    }
    
    // Test baslat butonu
    const startBtn = document.getElementById('start-test-btn');
    if (startBtn) {
        startBtn.addEventListener('click', toggleNetworkTest);
    }
    
    // CSV export butonu
    const exportBtn = document.getElementById('export-csv-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportNetworkToCSV);
    }
    
    // Kayitli ayarlari yükle
    loadNetworkConfiguration();
    
    // Test geçmisini yükle
    loadNetworkTestHistory();
};

// Build a page-id → permission-key lookup from the permissions registry.
// The registry uses permission keys (e.g. "audit_log"); showPage is called with
// page IDs (e.g. "audit-log"), so we index entries by both.
function buildPermLookup() {
    var lookup = {};
    if (!window.permissionRegistry || !window.permissionRegistry.pages) return lookup;
    Object.keys(window.permissionRegistry.pages).forEach(function(permKey) {
        var meta = window.permissionRegistry.pages[permKey];
        var pageId = meta.page_id || permKey;
        lookup[pageId] = permKey;
        lookup[permKey] = permKey;
    });
    return lookup;
}

// showPage fonksiyonuna eklenecek case
function showPage(page) {
    // Strip stray query params left over from a non-SPA page reload (e.g. pagination) — the SPA is hash-only, so any leftover ?... in the address bar is stale.
    if (window.location.search) {
        history.replaceState(null, '', window.location.pathname + window.location.hash);
    }

    // Permission check - block access to unauthorized pages
    if (typeof hasPagePermission === 'function' && page !== 'dashboard') {
        var permLookup = buildPermLookup();
        var permName = permLookup[page] || page;
        if (!hasPagePermission(permName)) {
            console.warn('🚫 Yetkisiz sayfa erişimi engellendi:', page, '(perm:', permName + ')');
            page = 'dashboard';
        }
    }

    // Kaldırılmış sayfalar (eski localStorage/hash) -> dashboard
    if (['checklist','config-generator','waf-owasp','waf-policy-check','incident-kb','db-ip-kontrol','ip-analyzer','cyber-scan-enricher'].indexOf(page) !== -1) page = 'dashboard';

    // Save current page to localStorage for refresh persistence
    localStorage.setItem('currentPage', page);
    console.log('💾 Sayfa kaydedildi:', page);

    // Update URL hash (if not already set)
    const expectedHash = pageToHash[page] || page;
    const currentHash = window.location.hash.substring(1);
    if (currentHash !== expectedHash) {
        window.location.hash = expectedHash;
    }

    // FIX: Dökümanlar, Faydalı Linkler ve Araçlar sayfalarında tam genişlik
    const mainContent = document.getElementById('main-content');
    const container = document.querySelector('.container');
    const body = document.body;

    if (page === 'documents' || page === 'useful-links' || page === 'tools') {
        // Body, container ve main-content'e tam genişlik zorla
        body.style.width = '100vw';
        body.style.maxWidth = 'none';
        body.style.overflow = 'hidden';

        if (container) {
            container.style.width = '100vw';
            container.style.maxWidth = 'none';
        }

        mainContent.style.width = 'calc(100vw - 200px)';
        mainContent.style.maxWidth = 'none';
        console.log('🎯 Tam genişlik aktif edildi:', page);
    } else {
        body.style.width = '';
        body.style.maxWidth = '';
        body.style.overflow = '';

        if (container) {
            container.style.width = '';
            container.style.maxWidth = '';
        }

        mainContent.style.width = '';
        mainContent.style.maxWidth = '';
    }

    // Tum sayfalari gizle (NetWatch iframe'i asla display:none olmaz - reload olmasin)
    var nwLoaded = document.getElementById('netwatch-iframe') && document.getElementById('netwatch-iframe').src && document.getElementById('netwatch-iframe').src !== '';
    document.querySelectorAll('.content-page').forEach(p => {
        if (p.id === 'netwatch-page' && nwLoaded) {
            // NetWatch iframe yuklenmisse asla display:none yapma
            if (page === 'netwatch') {
                p.style.cssText = 'display:block;';
            } else {
                p.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden;';
            }
        } else {
            p.style.cssText = 'display:none;';
        }
    });

    // Tüm menü linklerini pasif yap
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
        link.classList.remove('active');
    });

    // Aktif sayfanın menu linkini işaretle
    const activeLink = document.querySelector(`a[href="#${expectedHash}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }

    // Seçilen sayfayi göster
    switch(page) {
        case 'dashboard':
            document.getElementById('dashboard-page').style.display = 'block';
            console.log('📊 Dashboard sayfası açıldı');

            // API'leri yükle (DashboardApiManager.js otomatik yükleme yapıyor)
            // Ek olarak manuel yükleme için de çağır
            if (typeof loadDashboardApis === 'function') {
                requestAnimationFrame(() => {
                    loadDashboardApis();
                });
            }
            break;

        case 'documents':
            document.getElementById('documents-page').style.display = 'block';
            break;
            
        case 'certificates':
            document.getElementById('certificates-page').style.display = 'block';
            // Sertifikaları yükle - kisa gecikmeyle DOM'un render edilmesini bekle
            setTimeout(() => {
                if (typeof setupCertificateTabs === 'function') {
                    setupCertificateTabs();
                }
                if (typeof setupCertificateForm === 'function') {
                    setupCertificateForm();
                }
                if (typeof setupBulkUploadForm === 'function') {
                    setupBulkUploadForm();
                }
                if (typeof loadCertificates === 'function') {
                    loadCertificates();
                } else {
                    console.error('loadCertificates fonksiyonu bulunamadı!');
                }
            }, 100);
            break;

        case 'backuplar':
            document.getElementById('backups-page').style.display = 'block';
            console.log('💾 Backuplar sayfası açıldı, dosyalar yükleniyor...');
            // Backup dosyalarını yükle
            requestAnimationFrame(() => {
                if (typeof loadBackups === 'function') {
                    loadBackups();
                } else {
                    console.error('❌ loadBackups fonksiyonu bulunamadı!');
                }
            });
            break;

        case 'backup-monitoring':
            document.getElementById('backup-monitoring-page').style.display = 'block';
            console.log('🔄 Backup Monitoring sayfası açıldı, veri yükleniyor...');

            // Cached data varsa hemen göster
            if (currentBackupData) {
                console.log('📦 Cached backup data ile sayfa güncelleniyor');
                updateBackupDetailsPage(currentBackupData);
            } else {
                // Cache yoksa yeni veri çek
                console.log('⚠️ Cache bulunamadı, yeni veri çekiliyor...');
                requestAnimationFrame(() => {
                    if (typeof refreshBackupDetails === 'function') {
                        refreshBackupDetails();
                    }
                });
            }
            break;

        case 'cihazlar':
            document.getElementById('cihazlar-page').style.display = 'block';
            console.log('🖥️ Cihazlar sayfası açıldı, cihazlar yükleniyor...');
            // Cihazları yükle
            requestAnimationFrame(() => {
                if (typeof loadDevices === 'function') {
                    console.log('✅ loadDevices fonksiyonu bulundu, çağrılıyor...');
                    loadDevices();
                } else {
                    console.error('❌ loadDevices fonksiyonu bulunamadı!');
                    // Fonksiyon henüz yüklenmediyse bekle
                    setTimeout(() => {
                        if (typeof loadDevices === 'function') {
                            console.log('✅ loadDevices fonksiyonu bulundu (gecikme sonrası), çağrılıyor...');
                            loadDevices();
                        } else {
                            console.error('❌ loadDevices fonksiyonu hala bulunamadı!');
                        }
                    }, 300);
                }
            });
            break;

        case 'haritalar':
            document.getElementById('haritalar-page').style.display = 'block';
            console.log('🗺️ Haritalar sayfası açıldı, haritalar yükleniyor...');
            // Haritaları yükle
            requestAnimationFrame(() => {
                if (typeof loadMaps === 'function') {
                    console.log('✅ loadMaps fonksiyonu bulundu, çağrılıyor...');
                    loadMaps();
                } else {
                    console.error('❌ loadMaps fonksiyonu bulunamadı!');
                    // Fonksiyon henüz yüklenmediyse bekle
                    setTimeout(() => {
                        if (typeof loadMaps === 'function') {
                            console.log('✅ loadMaps fonksiyonu bulundu (gecikme sonrası), çağrılıyor...');
                            loadMaps();
                        } else {
                            console.error('❌ loadMaps fonksiyonu hala bulunamadı!');
                        }
                    }, 300);
                }
            });
            break;

        case 'tasks':
            document.getElementById('tasks-page').style.display = 'block';
            // CAB tab varsayilan olarak aktif - ilk acildiginda yukle
            if (typeof loadCABTasks === 'function') {
                loadCABTasks();
            }
            // Tab event listener'larini ayarla
            var taskTabs = document.querySelectorAll('#tasks-page .tabs .tab');
            taskTabs.forEach(function(tab) {
                tab.onclick = function() {
                    var tabId = this.getAttribute('data-tab');
                    // Tab aktif durumu
                    taskTabs.forEach(function(t) { t.classList.remove('active'); });
                    this.classList.add('active');
                    // Icerik goster/gizle
                    document.querySelectorAll('#tasks-page .tab-content').forEach(function(c) { c.style.display = 'none'; });
                    var target = document.getElementById(tabId);
                    if (target) target.style.display = 'block';
                    // Takvim goster/gizle
                    var cal = document.getElementById('tasks-calendar-section');
                    if (cal) cal.style.display = (tabId === 'advanced-search' || tabId === 'jira-ayarlar') ? 'none' : 'block';
                    // Ilgili veriyi yukle
                    if (tabId === 'cab-tasks' && typeof loadCABTasks === 'function') loadCABTasks();
                    if (tabId === 'cyberwebeyeos-dyf' && typeof loadDYFIssues === 'function') loadDYFIssues('cyberwebeyeos', 1);
                    if (tabId === 'ornek-musteri-a-dyf' && typeof loadDYFIssues === 'function') loadDYFIssues('ornek-musteri-a', 1);
                    if (tabId === 'jira-ayarlar' && typeof loadJiraSettings === 'function') loadJiraSettings();
                };
            });
            break;
            
        case 'useful-links':
            document.getElementById('useful-links-page').style.display = 'block';
            break;
            
        case 'tools':
            document.getElementById('tools-page').style.display = 'block';
            console.log('🔌 Tools sayfası açıldı, API\'ler yükleniyor...');

            // Try new tools page function first
            if (typeof loadApiList === 'function') {
                console.log('✅ loadApiList fonksiyonu bulundu (yeni tools), çağrılıyor...');
                loadApiList();
            } else if (typeof loadApis === 'function') {
                console.log('✅ loadApis fonksiyonu bulundu (eski), çağrılıyor...');
                loadApis();
            } else {
                console.error('❌ loadApis/loadApiList fonksiyonu bulunamadı!');
            }
            break;
            
        case 'guvenlik-dashboard':
            document.getElementById('guvenlik-dashboard-page').style.display = 'block';
            console.log('🛡️ Güvenlik Dashboard açıldı');
            // Dashboard verilerini yükle
            if (typeof refreshSecurityDashboard === 'function') {
                refreshSecurityDashboard();
                startSecurityDashboardAutoRefresh();
            }
            break;

        case 'guvenlik-politikalari':
            document.getElementById('guvenlik-politikalari-page').style.display = 'block';
            console.log('🔒 Güvenlik Politikaları açıldı');
            break;

        case 'users':
            document.getElementById('users-page').style.display = 'block';
            break;

        case 'settings':
            document.getElementById('settings-page').style.display = 'block';
            break;

        // Network Monitor case'i
        case 'network-monitor':
            document.getElementById('network-monitor-page').style.display = 'block';
            initNetworkMonitor(); // Network Monitor'ü baslat
            break;

        case 'alerts':
            document.getElementById('alerts-page').style.display = 'block';
            console.log('🔔 Alerts sayfası açıldı');
            // Alerts otomatik yükleniyor (alerts.php'deki MutationObserver ile)
            break;

        case 'reputation':
            document.getElementById('reputation-page').style.display = 'block';
            console.log('⭐ Reputation Monitor sayfası açıldı');
            if (typeof loadReputationAll === 'function') {
                requestAnimationFrame(() => loadReputationAll());
            }
            break;

        case 'device-lifecycle':
            document.getElementById('device-lifecycle-page').style.display = 'block';
            console.log('🔧 Cihaz Yaşam Döngüsü sayfası açıldı');
            if (typeof loadLifecycleAll === 'function') {
                requestAnimationFrame(() => loadLifecycleAll());
            }
            break;

        case 'blacklist-yonetimi':
            document.getElementById('blacklist-yonetimi-page').style.display = 'block';
            console.log('🚫 Blacklist Yönetimi sayfası açıldı');
            break;

        case 'ipam':
            document.getElementById('ipam-page').style.display = 'block';
            console.log('🌐 IPAM sayfası açıldı, IP adresleri yükleniyor...');
            // IP adreslerini yükle
            requestAnimationFrame(() => {
                if (typeof loadIpAddresses === 'function') {
                    console.log('✅ loadIpAddresses fonksiyonu bulundu, çağrılıyor...');
                    loadIpAddresses();
                } else {
                    console.error('❌ loadIpAddresses fonksiyonu bulunamadı!');
                }
            });
            break;

        case 'f5-operations':
            document.getElementById('f5-operations-page').style.display = 'block';
            console.log('🔧 F5 Operations sayfası açıldı');
            requestAnimationFrame(() => {
                if (typeof f5LoadNodes === 'function') {
                    f5LoadNodes();
                }
                if (typeof f5LoadPools === 'function') {
                    f5LoadPools();
                }
            });
            break;

        case 'waf-ip-whitelist':
            document.getElementById('waf-ip-whitelist-page').style.display = 'block';
            requestAnimationFrame(() => {
                if (typeof WafIpWhitelist !== 'undefined') WafIpWhitelist.init();
            });
            break;

        case 'audit-log':
            document.getElementById('audit-log-page').style.display = 'block';
            if (typeof loadAuditLogs === 'function') loadAuditLogs();
            break;

        case 'fw-audit-log':
            document.getElementById('fw-audit-log-page').style.display = 'block';
            if (typeof initFirewallAuditPage === 'function') initFirewallAuditPage();
            break;

        case 'zabbix-monitor':
            document.getElementById('zabbix-monitor-page').style.display = 'block';
            if (typeof initZabbixMonitorPage === 'function') initZabbixMonitorPage();
            break;

        case 'ripestat':
            document.getElementById('ripestat-page').style.display = 'block';
            if (typeof initRipeStatPage === 'function') initRipeStatPage();
            break;

        case 'firescope':
        case 'fireaudit': // legacy redirect
            document.getElementById('firescope-page').style.display = 'block';
            if (typeof initFireAuditPage === 'function') initFireAuditPage();
            break;

        case 'hakkinda':
            document.getElementById('hakkinda-page').style.display = 'block';
            break;

        case 'netwatch':
            document.getElementById('netwatch-page').style.cssText = 'display:block;';
            break;

        case 'wireshark-hub':
            document.getElementById('wireshark-hub-page').style.display = 'block';
            break;

        case 'cisco-cli-hub':
            // Legacy redirect: Cisco CLI Hub artik Network CLI Hub icinde (2026-04-10 birlesmesi)
            window.location.hash = 'network-cli-hub';
            showPage('network-cli-hub');
            return;

        case 'network-cli-hub':
            document.getElementById('network-cli-hub-page').style.display = 'block';
            break;

        case 'f5-cli-hub':
            document.getElementById('f5-cli-hub-page').style.display = 'block';
            break;

        case 'fortigate-cli-hub':
            document.getElementById('fortigate-cli-hub-page').style.display = 'block';
            break;

        case 'f5-admin-operations':
            document.getElementById('f5-admin-operations-page').style.display = 'block';
            break;

    }
}

// Network Monitor Fonksiyonlari
function startNetworkTest() {
    var url = document.getElementById('target-url').value;
    if (!url) {
        alert('Lütfen URL girin');
        return;
    }
    
    var output = document.getElementById('test-output');
    output.innerHTML = '<div style="color: #3498db">[' + new Date().toLocaleTimeString() + '] Test baslatiliyor...</div>';
    
    // PHP'ye istek gönder
    fetch('./network-monitor.php', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            action: 'run_test',
            config: {
                targetUrl: url,
                tracerouteTarget: document.getElementById('traceroute-target').value
            }
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && data.results) {
            // Sonuçlari göster
            document.getElementById('dns-time').textContent = data.results.dns_ms || '-';
            document.getElementById('tcp-time').textContent = data.results.tcp_ms || '-';
            document.getElementById('ssl-time').textContent = data.results.ssl_ms || '-';
            document.getElementById('http-time').textContent = data.results.http_ms || '-';
            document.getElementById('total-time').textContent = data.results.total_ms || '-';
            document.getElementById('packet-loss').textContent = data.results.packet_loss || '-';
            
            output.innerHTML += '<div style="color: #2ecc71">[' + new Date().toLocaleTimeString() + '] Test tamamlandi!</div>';
        } else {
            output.innerHTML += '<div style="color: #e74c3c">[' + new Date().toLocaleTimeString() + '] Hata: ' + (data.message || 'Bilinmeyen hata') + '</div>';
        }
    })
    .catch(error => {
        output.innerHTML += '<div style="color: #e74c3c">[' + new Date().toLocaleTimeString() + '] Baglanti hatasi!</div>';
    });
}

console.log('- debugBackup.refreshNow() - Refresh backup status');

// ============================================
// GLOBAL HELPER FUNCTIONS
// ============================================

// Task ekleme modalini aç
function showAddTaskModal() {
  if (typeof openModal === 'function') {
    openModal('add-task-modal');
  } else {
    console.error('openModal fonksiyonu bulunamadi');
  }
}

// Tarih icin task ekleme
window.addTaskForDate = function(dateString) {
  showAddTaskModal();

  // Eger tarih verilmisse tarih alanini doldur
  if (dateString) {
    setTimeout(() => {
      const taskDateField = document.getElementById('task-date');
      if (taskDateField) {
        taskDateField.value = dateString;
      }
    }, 100);
  }
}

// Global export
window.showAddTaskModal = showAddTaskModal;

// Mevcut kullanici bilgisi (auth.php'den gelmeli, degistirebilirsiniz)
const currentUser = typeof userInfo !== 'undefined' && userInfo ? userInfo.username : '';

// ============================================================================
// HASH NAVIGATION & PAGE PERSISTENCE
// ============================================================================

// Hash to Page ID Mapping - Clean Turkish URLs
const hashToPage = {
    'dashboard': 'dashboard',
    'dokumanlar': 'documents',
    'sertifikalar': 'certificates',
    'backuplar': 'backuplar',
    'backup-monitoring': 'backup-monitoring',
    'cihazlar': 'cihazlar',
    'haritalar': 'haritalar',
    'isler': 'tasks',
    'alerts': 'alerts',
    'reputation': 'reputation',
    'device-lifecycle': 'device-lifecycle',
    'blacklist-yonetimi': 'blacklist-yonetimi',
    'faydalilinkler': 'useful-links',
    'araclar': 'tools',
    'ipam': 'ipam',
    'guvenlik-dashboard': 'guvenlik-dashboard',
    'guvenlik-politikalari': 'guvenlik-politikalari',
    'kullanicilar': 'users',
    'ayarlar': 'settings',
    'f5-operations': 'f5-operations',
    'waf-ip-whitelist': 'waf-ip-whitelist',
    'hakkinda': 'hakkinda',
    'netwatch': 'netwatch',
    'wireshark-hub': 'wireshark-hub',
    'cisco-cli-hub': 'network-cli-hub', // legacy redirect
    'network-cli-hub': 'network-cli-hub',
    'f5-cli-hub': 'f5-cli-hub',
    'fortigate-cli-hub': 'fortigate-cli-hub',
    'f5-admin-operations': 'f5-admin-operations',
    'fw-audit-log': 'fw-audit-log',
    'zabbix-monitor': 'zabbix-monitor',
    'fireaudit': 'firescope',
    'firescope': 'firescope',
    'ripestat': 'ripestat'
};

// Page ID to Hash Mapping (reverse)
const pageToHash = {
    'dashboard': 'dashboard',
    'documents': 'dokumanlar',
    'certificates': 'sertifikalar',
    'backuplar': 'backuplar',
    'backup-monitoring': 'backup-monitoring',
    'cihazlar': 'cihazlar',
    'haritalar': 'haritalar',
    'tasks': 'isler',
    'alerts': 'alerts',
    'reputation': 'reputation',
    'device-lifecycle': 'device-lifecycle',
    'blacklist-yonetimi': 'blacklist-yonetimi',
    'useful-links': 'faydalilinkler',
    'tools': 'araclar',
    'ipam': 'ipam',
    'guvenlik-dashboard': 'guvenlik-dashboard',
    'guvenlik-politikalari': 'guvenlik-politikalari',
    'users': 'kullanicilar',
    'settings': 'ayarlar',
    'f5-operations': 'f5-operations',
    'waf-ip-whitelist': 'waf-ip-whitelist',
    'hakkinda': 'hakkinda',
    'netwatch': 'netwatch',
    'wireshark-hub': 'wireshark-hub',
    // cisco-cli-hub legacy redirect: artik network-cli-hub icinde
    'network-cli-hub': 'network-cli-hub',
    'f5-cli-hub': 'f5-cli-hub',
    'fortigate-cli-hub': 'fortigate-cli-hub',
    'f5-admin-operations': 'f5-admin-operations',
    'fw-audit-log': 'fw-audit-log',
    'zabbix-monitor': 'zabbix-monitor',
    'firescope': 'firescope',
    'ripestat': 'ripestat'
};

function handleHashChange() {
  const hash = window.location.hash.substring(1); // # işaretini kaldır
  if (hash) {
    // Hash'i page ID'ye çevir
    const pageId = hashToPage[hash] || hash;
    console.log('🔗 Hash:', hash, '→ Page ID:', pageId);
    showPage(pageId);
  } else {
    // Hash yoksa localStorage'dan son açık sayfayı yükle
    const savedPage = localStorage.getItem('currentPage');
    if (savedPage) {
      console.log('📂 Kaydedilen sayfa yükleniyor:', savedPage);
      showPage(savedPage);
      // Hash'i URL'e ekle
      const hash = pageToHash[savedPage] || savedPage;
      window.location.hash = hash;
    } else {
      // Hiçbir kayıt yoksa dashboard'u aç
      console.log('🏠 Varsayılan sayfa: dashboard');
      showPage('dashboard');
      window.location.hash = 'dashboard';
    }
  }
}

// Sayfa yüklendiğinde ve hash değiştiğinde çalış
window.addEventListener('hashchange', handleHashChange);
window.addEventListener('load', handleHashChange);

console.log('✅ Hash navigation & page persistence sistemi yüklendi');
console.log('✅ Hash navigation & page persistence sistemi yüklendi');

// ============================================================================
// ALL TASKS MODAL - For viewing all tasks of a selected date
// ============================================================================

/**
 * Open modal to show all tasks for the selected date
 */
function openAllTasksModal() {
  if (!window.currentSelectedDateForModal) {
    console.warn('No date selected');
    return;
  }

  const { formattedDate, tasks, dateString } = window.currentSelectedDateForModal;

  // Set modal title
  document.getElementById('modal-date-title').textContent = formattedDate;

  // Separate real and virtual tasks
  const realTasks = tasks.filter(task => !task.isVirtual);
  const virtualTasks = tasks.filter(task => task.isVirtual);

  // Build modal content
  let html = '';

  // Real tasks
  if (realTasks.length > 0) {
    html += '<h3 style="color: var(--secondary-color); font-size: 1.1rem; margin-bottom: 15px; border-bottom: 2px solid var(--border-color); padding-bottom: 8px;">Mevcut İşler</h3>';

    realTasks.forEach(task => {
      // Check if this is a DYF task
      if (task.type === 'dyf') {
        // DYF Task rendering
        let statusClass = '';
        if (task.status === 'completed') {
          statusClass = 'completed';
        } else {
          statusClass = 'active';
        }

        html += `
          <div class="date-task-item ${statusClass}" style="margin-bottom: 12px;">
            <div class="date-task-header">
              <div class="date-task-title">
                <span class="dyf-badge" style="background: ${task.company === 'cyberwebeyeos' ? '#3498db' : '#e67e22'}; color: white; padding: 3px 10px; border-radius: 4px; font-size: 0.85em; margin-right: 10px;">
                  ${task.company === 'cyberwebeyeos' ? 'CYBERWEBEYEOS' : 'ORNEK_MUSTERI_A'} DYF
                </span>
                <strong>${escapeHtml(task.device)}</strong>
              </div>
              <div class="date-task-actions">
                <button onclick="window.open('${task.jira_url}', '_blank')" title="Jira'da Gor">
                  <i class="fas fa-external-link-alt"></i>
                </button>
              </div>
            </div>
            <div class="date-task-info">
              <div style="margin-bottom: 8px;"><strong>Özet:</strong> ${escapeHtml(task.description)}</div>
              <div style="display: flex; gap: 20px; font-size: 0.95em;">
                <div><strong>Durum:</strong> <span style="color: ${task.status === 'completed' ? '#27ae60' : task.status === 'critical' ? '#e74c3c' : '#f39c12'};">${escapeHtml(task.originalStatus || task.status)}</span></div>
                ${task.assignee ? `<div><strong>Atanan:</strong> ${escapeHtml(task.assignee)}</div>` : ''}
              </div>
            </div>
          </div>
        `;
      } else {
        // Regular Task rendering
        let taskClass = 'date-task-item';

        if (task.status === 'critical') {
          taskClass += ' critical';
        } else if (task.status === 'warning') {
          taskClass += ' warning';
        } else if (task.status === 'completed') {
          taskClass += ' completed';
        }

        html += `
          <div class="${taskClass}" style="margin-bottom: 12px;">
            <div class="date-task-header">
              <div class="date-task-title">${escapeHtml(task.device)} - ${escapeHtml(task.reason)}</div>
              <div class="date-task-actions">
                <button onclick="viewTask('${task.id}')" title="Görüntüle">
                  <i class="fas fa-eye"></i>
                </button>
                <button onclick="editTask('${task.id}')" title="Düzenle">
                  <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteTask('${task.id}')" title="Sil">
                  <i class="fas fa-trash"></i>
                </button>
                ${task.isRecurring ? `<button onclick="markTaskCompleted('${task.id}')" title="Tamamlandı">
                  <i class="fas fa-check"></i>
                </button>` : ''}
              </div>
            </div>
            <div class="date-task-info">
              <strong>Maker:</strong> ${escapeHtml(task.maker)} |
              <strong>Checker:</strong> ${escapeHtml(task.checker)} |
              <strong>Kayıt:</strong> ${escapeHtml(task.record)}
              ${task.isRecurring ? `<br><span class="badge periodic-badge">Periyodik: Her ${task.recurringInterval} ${task.recurringUnit === 'day' ? 'gün' : (task.recurringUnit === 'week' ? 'hafta' : 'ay')}</span>` : ''}
            </div>
          </div>
        `;
      }
    });
  }

  // Virtual tasks
  if (virtualTasks.length > 0) {
    html += '<h3 style="color: var(--secondary-color); font-size: 1.1rem; margin: 25px 0 15px; border-bottom: 2px solid var(--border-color); padding-bottom: 8px;">Gelecek Tekrarlar</h3>';

    virtualTasks.forEach(task => {
      html += `
        <div class="date-task-item future-task" style="margin-bottom: 12px;">
          <div class="date-task-header">
            <div class="date-task-title">${escapeHtml(task.device)} - ${escapeHtml(task.reason)} (${task.occurrenceNumber}. tekrar)</div>
            <div class="date-task-actions">
              <button onclick="viewTask('${task.originalTaskId}')" title="Ana Görevi Görüntüle">
                <i class="fas fa-eye"></i>
              </button>
            </div>
          </div>
          <div class="date-task-info">
            <strong>Maker:</strong> ${escapeHtml(task.maker)} |
            <strong>Checker:</strong> ${escapeHtml(task.checker)} |
            <strong>Kayıt:</strong> ${escapeHtml(task.record)}
            <br><span class="badge periodic-badge">Periyodik: Her ${task.recurringInterval} ${task.recurringUnit === 'day' ? 'gün' : (task.recurringUnit === 'week' ? 'hafta' : 'ay')}</span>
          </div>
        </div>
      `;
    });
  }

  // If no tasks
  if (realTasks.length === 0 && virtualTasks.length === 0) {
    html = '<p style="text-align: center; color: #888; padding: 40px;">Bu tarih için hiç iş bulunamadı.</p>';
  }

  // Set modal content
  document.getElementById('all-tasks-modal-content').innerHTML = html;

  // Show modal
  document.getElementById('all-tasks-modal').style.display = 'block';
}

/**
 * Close all tasks modal
 */
function closeAllTasksModal() {
  document.getElementById('all-tasks-modal').style.display = 'none';
}

// Export functions to global scope
window.openAllTasksModal = openAllTasksModal;
window.closeAllTasksModal = closeAllTasksModal;

// Close modal when clicking outside
window.addEventListener('click', function(event) {
  const modal = document.getElementById('all-tasks-modal');
  if (event.target === modal) {
    closeAllTasksModal();
  }
});

// ============================================================================
// GLOBAL EXPORTS for inline onclick handlers
// ============================================================================
window.refreshBackupDetails = refreshBackupDetails;
