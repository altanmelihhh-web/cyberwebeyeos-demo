// ============================================================================
// MONITORING DASHBOARD - Kart Fabrikası ve Yönetimi
// ============================================================================

console.log('📊 MonitoringDashboard.js yükleniyor...');

const CARD_LAYOUT_OPTIONS = ['1x1', '2x1', '1x2', '2x2'];

const CARD_TYPE_DEFINITIONS = [
    { type: 'backupStatus', label: 'Network Backup Status', unique: true, defaultTitle: 'Network Backup Status', defaultLayout: '2x1' },
    { type: 'certificateSummary', label: 'Sertifika Özeti', unique: true, defaultTitle: 'Sertifika Durumu ozeti (45 Gun Icinde Sona Erecekler)', defaultLayout: '2x1' },
    { type: 'tasksOverview', label: 'Periyodik İşler', unique: true, defaultTitle: 'Periyodik Isler', defaultLayout: '2x1' },
    { type: 'customerIssues', label: 'Müşteri Sorunları', unique: true, defaultTitle: 'Musteri Sorunlari', defaultLayout: '2x1' },
    { type: 'usefulLinks', label: 'Faydalı Linkler', unique: true, defaultTitle: 'Faydali Linkler', defaultLayout: '2x1' },
    { type: 'apiWidgetGrid', label: 'API Widget Alanı', unique: true, defaultTitle: "API Dashboard Widget'ları", defaultLayout: '2x1' },
    { type: 'customNote', label: 'Not Kartı', unique: false, defaultTitle: 'Not Kartı', defaultLayout: '1x1', configFields: [
        { key: 'content', label: 'Not İçeriği', type: 'textarea', rows: 5, placeholder: 'Kart gövdesinde görünecek notunuzu yazın...' }
    ] },
    { type: 'embeddedPage', label: 'Harici İçerik (URL)', unique: false, defaultTitle: 'Harici İçerik', defaultLayout: '2x1', configFields: [
        { key: 'url', label: 'Bağlanılacak URL', type: 'url', placeholder: 'https://...', required: true, help: 'HTTPS protokolü önerilir.' },
        { key: 'height', label: 'Yükseklik (px)', type: 'number', defaultValue: 400, help: 'İçerik yüksekliği varsayılan olarak 400 px.' }
    ] }
];

const DEFAULT_CARD_LAYOUT = CARD_TYPE_DEFINITIONS.filter(def => def.unique).map(def => ({
    id: def.type,
    type: def.type,
    title: def.defaultTitle,
    layout: def.defaultLayout,
    enabled: true,
    config: {}
}));

const DashboardHelpers = {
    cloneDeep(value) {
        return JSON.parse(JSON.stringify(value));
    },
    createElementFromHTML(html) {
        const template = document.createElement('template');
        template.innerHTML = html.trim();
        return template.content.firstElementChild;
    },
    escapeId(value) {
        if (window.CSS && typeof window.CSS.escape === 'function') {
            return CSS.escape(value);
        }
        return String(value).replace(/"/g, '\\"');
    }
};

const DashboardCardFactory = {
    create(config) {
        const renderer = this.renderers[config.type];
        if (!renderer) {
            console.warn('Bilinmeyen kart tipi:', config.type);
            return null;
        }
        const element = renderer(config);
        if (!element) {
            return null;
        }
        const layoutClass = `layout-${(config.layout || '1x1').toLowerCase()}`;
        element.dataset.dashboardCard = config.id || `card-${Date.now()}`;
        element.dataset.cardType = config.type;
        element.dataset.cardLayout = config.layout || '1x1';
        element.classList.add(layoutClass);
        return element;
    },
    renderers: {
        backupStatus(config) {
            const title = escapeHtml(config.title || 'Network Backup Status');
            return DashboardHelpers.createElementFromHTML(`
                <div class="card backup-monitoring-card">
                    <div class="card-header">
                        <div>
                            <i class="fas fa-server"></i>
                            <span class="card-title">${title}</span>
                        </div>
                        <span id="backup-status-badge" class="status-badge status-loading">
                            <i class="fas fa-spinner fa-spin"></i> Yukleniyor...
                        </span>
                    </div>
                    <div class="card-body">
                        <div class="backup-stats-grid">
                            <div class="stat-item">
                                <div class="stat-number" id="total-dirs">-</div>
                                <div class="stat-label">Toplam Dizin</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-number text-success" id="successful-backups">-</div>
                                <div class="stat-label">Basarili</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-number text-danger" id="failed-backups">-</div>
                                <div class="stat-label">Basarisiz</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-number text-warning" id="total-problems">-</div>
                                <div class="stat-label">Toplam Sorun</div>
                            </div>
                        </div>

                        <div class="server-breakdown mt-10" style="background: #f8f9fa; padding: 10px; border-radius: 5px; margin-bottom: 10px;">
                            <h4 style="font-size: 0.75rem; margin-bottom: 8px; color: #2c3e50; font-weight: 600;">
                                <i class="fas fa-hdd"></i> Sunucu Durumu
                            </h4>
                            <div class="server-stats-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
                                <div class="server-stat-item" style="background: white; padding: 8px; border-radius: 4px; text-align: center; border-left: 3px solid #3498db;">
                                    <div class="server-name" style="font-size: 0.7rem; color: #7f8c8d; margin-bottom: 3px;">Ansible</div>
                                    <div class="server-stats" style="font-size: 0.75rem;">
                                        <span class="server-success" id="server-ansible-success" style="color: #27ae60; font-weight: bold;">0</span>
                                        <span style="color: #95a5a6;">/</span>
                                        <span class="server-total" id="server-ansible-total" style="color: #2c3e50;">0</span>
                                    </div>
                                </div>
                                <div class="server-stat-item" style="background: white; padding: 8px; border-radius: 4px; text-align: center; border-left: 3px solid #e74c3c;">
                                    <div class="server-name" style="font-size: 0.7rem; color: #7f8c8d; margin-bottom: 3px;">Cyberwebeyeos VB</div>
                                    <div class="server-stats" style="font-size: 0.75rem;">
                                        <span class="server-success" id="server-cyberwebeyeos-success" style="color: #27ae60; font-weight: bold;">0</span>
                                        <span style="color: #95a5a6;">/</span>
                                        <span class="server-total" id="server-cyberwebeyeos-total" style="color: #2c3e50;">0</span>
                                    </div>
                                </div>
                                <div class="server-stat-item" style="background: white; padding: 8px; border-radius: 4px; text-align: center; border-left: 3px solid #f39c12;">
                                    <div class="server-name" style="font-size: 0.7rem; color: #7f8c8d; margin-bottom: 3px;">Örnek Müşteri A VB</div>
                                    <div class="server-stats" style="font-size: 0.75rem;">
                                        <span class="server-success" id="server-ornek-musteri-a-success" style="color: #27ae60; font-weight: bold;">0</span>
                                        <span style="color: #95a5a6;">/</span>
                                        <span class="server-total" id="server-ornek-musteri-a-total" style="color: #2c3e50;">0</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="tenant-breakdown">
                            <h4 style="font-size: 0.8rem; margin-bottom: 8px; color: #2c3e50;">Tenant Durumu</h4>
                            <div class="tenant-section">
                                <h5><i class="fas fa-industry" style="font-size: 0.7rem;"></i> Production</h5>
                                <div class="scope-grid">
                                    <div class="scope-item">
                                        <div class="scope-name">Cyberwebeyeos Prod</div>
                                        <div class="scope-status">
                                            <span class="scope-success" id="prod-cyberwebeyeos-prod-success">0</span>/<span class="scope-failed" id="prod-cyberwebeyeos-prod-failed">0</span>
                                        </div>
                                    </div>
                                    <div class="scope-item">
                                        <div class="scope-name">Cyberwebeyeos DRC</div>
                                        <div class="scope-status">
                                            <span class="scope-success" id="prod-cyberwebeyeos-drc-success">0</span>/<span class="scope-failed" id="prod-cyberwebeyeos-drc-failed">0</span>
                                        </div>
                                    </div>
                                    <div class="scope-item">
                                        <div class="scope-name">Cyberwebeyeos VB</div>
                                        <div class="scope-status">
                                            <span class="scope-success" id="prod-cyberwebeyeos-vb-success">0</span>/<span class="scope-failed" id="prod-cyberwebeyeos-vb-failed">0</span>
                                        </div>
                                    </div>
                                    <div class="scope-item">
                                        <div class="scope-name">Örnek Müşteri A Prod</div>
                                        <div class="scope-status">
                                            <span class="scope-success" id="prod-ornek-musteri-a-prod-success">0</span>/<span class="scope-failed" id="prod-ornek-musteri-a-prod-failed">0</span>
                                        </div>
                                    </div>
                                    <div class="scope-item">
                                        <div class="scope-name">Örnek Müşteri A DRC</div>
                                        <div class="scope-status">
                                            <span class="scope-success" id="prod-ornek-musteri-a-drc-success">0</span>/<span class="scope-failed" id="prod-ornek-musteri-a-drc-failed">0</span>
                                        </div>
                                    </div>
                                    <div class="scope-item">
                                        <div class="scope-name">Örnek Müşteri A CM</div>
                                        <div class="scope-status">
                                            <span class="scope-success" id="prod-ornek-musteri-a-cm-success">0</span>/<span class="scope-failed" id="prod-ornek-musteri-a-cm-failed">0</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="tenant-section">
                                <h5><i class="fas fa-flask" style="font-size: 0.7rem;"></i> Test</h5>
                                <div class="scope-grid">
                                    <div class="scope-item">
                                        <div class="scope-name">Cyberwebeyeos Test</div>
                                        <div class="scope-status">
                                            <span class="scope-success" id="test-cyberwebeyeos-test-success">0</span>/<span class="scope-failed" id="test-cyberwebeyeos-test-failed">0</span>
                                        </div>
                                    </div>
                                    <div class="scope-item">
                                        <div class="scope-name">Örnek Müşteri A Test</div>
                                        <div class="scope-status">
                                            <span class="scope-success" id="test-ornek-musteri-a-test-success">0</span>/<span class="scope-failed" id="test-ornek-musteri-a-test-failed">0</span>
                                        </div>
                                    </div>
                                    <div class="scope-item">
                                        <div class="scope-name">Örnek Müşteri A CM Test</div>
                                        <div class="scope-status">
                                            <span class="scope-success" id="test-ornek-musteri-a-cm-success">0</span>/<span class="scope-failed" id="test-ornek-musteri-a-cm-failed">0</span>
                                        </div>
                                    </div>
                                    <div class="scope-item">
                                        <div class="scope-name">Örnek Müşteri A VB Test</div>
                                        <div class="scope-status">
                                            <span class="scope-success" id="test-ornek-musteri-a-vb-success">0</span>/<span class="scope-failed" id="test-ornek-musteri-a-vb-failed">0</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="whitelist-status">
                            <h4 style="font-size: 0.8rem; margin-bottom: 8px; color: #2c3e50;">Whitelist Durumu (Production)</h4>
                            <div class="whitelist-grid">
                                <div class="whitelist-item">
                                    <div class="whitelist-system">Cyberwebeyeos</div>
                                    <div class="whitelist-counts">
                                        <span id="prod-cyberwebeyeos-ansible-count">-</span> entries
                                        <span class="server-label" style="font-size: 0.65rem; color: #95a5a6;">(VB: <span id="prod-cyberwebeyeos-vb-count">-</span>)</span>
                                        <div class="a10-status" id="prod-cyberwebeyeos-a10-status">A10: Kontrol ediliyor</div>
                                    </div>
                                </div>
                                <div class="whitelist-item">
                                    <div class="whitelist-system">Örnek Müşteri A</div>
                                    <div class="whitelist-counts">
                                        <span id="prod-ornek-musteri-a-ansible-count">-</span> entries
                                        <span class="server-label" style="font-size: 0.65rem; color: #95a5a6;">(CM: <span id="prod-ornek-musteri-a-cm-count">-</span>)</span>
                                        <div class="a10-status" id="prod-ornek-musteri-a-a10-status">A10: Kontrol ediliyor</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="last-update">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <small class="text-muted">
                                    Son guncelleme: <span id="last-update-time">-</span>
                                </small>
                                <small class="server-info" id="server-info" style="color: #95a5a6; font-size: 0.65rem;"></small>
                            </div>
                            <div class="freshness-indicator">
                                <div id="freshness-dot"></div>
                                <small id="freshness-text" style="color: #7f8c8d; font-size: 0.7rem;">Veri durumu kontrol ediliyor...</small>
                            </div>
                        </div>

                        <div class="backup-actions">
                            <button onclick="refreshBackupStatus()" class="btn" style="background: #3498db; color: white;">
                                <i class="fas fa-sync-alt"></i> Yenile
                            </button>
                            <button onclick="showPage('backup-monitoring')" class="btn" style="background: #2ecc71; color: white;">
                                <i class="fas fa-chart-line"></i> Detaylar
                            </button>
                        </div>
                    </div>
                </div>
            `);
        },
        certificateSummary(config) {
            const title = escapeHtml(config.title || 'Sertifika Durumu ozeti (45 Gun Icinde Sona Erecekler)');
            return DashboardHelpers.createElementFromHTML(`
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">${title}</h3>
                        <button class="action-btn view-btn" onclick="showPage('certificates')">Tumunu Gor</button>
                    </div>
                    <div class="card-body">
                        <div class="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Sertifika</th>
                                        <th>Bitis</th>
                                        <th>Kalan</th>
                                        <th>Sorumlu</th>
                                    </tr>
                                </thead>
                                <tbody id="dashboard-certificate-table">
                                    <tr>
                                        <td colspan="4" style="text-align:center; padding:20px; color:#7f8c8d;">Veriler yukleniyor...</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div class="expiry-warning">
                            <h4>Acil Bildirimler</h4>
                            <div id="dashboard-certificate-warnings"></div>
                        </div>
                    </div>
                </div>
            `);
        },
        tasksOverview(config) {
            const title = escapeHtml(config.title || 'Periyodik Isler');
            return DashboardHelpers.createElementFromHTML(`
                <div class="card">
                    <div class="tabs">
                        <div class="tab active" data-tab="periodic-dashboard">Periyodik Isler</div>
                        <div class="tab" data-tab="cab-dashboard">CAB Planli</div>
                        <div class="tab" data-tab="roadmap-dashboard">Road Map</div>
                    </div>
                    <div class="tab-content active" id="periodic-dashboard">
                        <div class="card-header" style="padding-top: 0;">
                            <h3 class="card-title">${title}</h3>
                            <button class="action-btn view-btn" onclick="showPage('tasks')">Tumunu Gor</button>
                        </div>
                        <div class="card-body" style="padding-top: 0;">
                            <div class="search-filter-container">
                                <div class="search-container">
                                    <i class="fas fa-search search-icon"></i>
                                    <input type="text" class="search-input" placeholder="Is ara..." id="dashboard-periodic-search">
                                </div>
                                <select class="filter-select" id="dashboard-periodic-filter">
                                    <option value="">Tum Alanlar</option>
                                    <option value="PROJE-001">Lisans Yenileme</option>
                                    <option value="PROJE-004">Örnek Müşteri A</option>
                                </select>
                            </div>
                            <div class="table-container" style="max-height: 300px; overflow-y: auto;">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Is</th>
                                            <th>Sorumlu</th>
                                            <th>Son Tarih</th>
                                            <th>Durum</th>
                                        </tr>
                                    </thead>
                                    <tbody id="dashboard-periodic-tasks">
                                        <tr>
                                            <td colspan="4" style="text-align:center; padding:20px; color:#7f8c8d;">Veriler yukleniyor...</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    <div class="tab-content" id="cab-dashboard" style="display: none;">
                        <div class="card-header" style="padding-top: 0;">
                            <h3 class="card-title">CAB Planli Isler</h3>
                            <button class="action-btn view-btn" onclick="showPage('tasks')">Tumunu Gor</button>
                        </div>
                        <div class="card-body" style="padding-top: 0;">
                            <div class="table-container" style="max-height: 300px; overflow-y: auto;">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Proje</th>
                                            <th>Sorumlu</th>
                                            <th>Planlanan Tarih</th>
                                            <th>Durum</th>
                                        </tr>
                                    </thead>
                                    <tbody id="dashboard-cab-tasks">
                                        <tr>
                                            <td colspan="4" style="text-align:center; padding:20px; color:#7f8c8d;">Veriler yukleniyor...</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    <div class="tab-content" id="roadmap-dashboard" style="display: none;">
                        <div class="card-header" style="padding-top: 0;">
                            <h3 class="card-title">Road Map Projeleri</h3>
                            <button class="action-btn view-btn" onclick="showPage('tasks')">Tumunu Gor</button>
                        </div>
                        <div class="card-body" style="padding-top: 0;">
                            <div class="search-filter-container">
                                <div class="search-container">
                                    <i class="fas fa-search search-icon"></i>
                                    <input type="text" class="search-input" placeholder="Proje ara..." id="dashboard-roadmap-search">
                                </div>
                                <select class="filter-select" id="dashboard-roadmap-filter">
                                    <option value="">Tum Alanlar</option>
                                    <option value="PROJE-001">Lisans Yenileme</option>
                                    <option value="PROJE-004">Örnek Müşteri A</option>
                                </select>
                            </div>
                            <div class="table-container" style="max-height: 300px; overflow-y: auto;">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Proje</th>
                                            <th>Sorumlu</th>
                                            <th>Bitis</th>
                                        </tr>
                                    </thead>
                                    <tbody id="dashboard-roadmap-tasks">
                                        <tr>
                                            <td colspan="3" style="text-align:center; padding:20px; color:#7f8c8d;">Veriler yukleniyor...</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            `);
        },
        customerIssues(config) {
            const title = escapeHtml(config.title || 'Musteri Sorunlari');
            return DashboardHelpers.createElementFromHTML(`
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">${title}</h3>
                        <button class="action-btn view-btn" onclick="showPage('musteri-sorunlari')">Tumunu Gor</button>
                    </div>
                    <div class="card-body">
                        <div class="musteri-metrics-grid">
                            <div class="metric-card">
                                <div class="metric-value" id="dashboard-customer-total">-</div>
                                <div class="metric-label">Toplam Musteri</div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-value" id="dashboard-customer-issues">-</div>
                                <div class="metric-label">Toplam Kayit</div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-value" id="dashboard-customer-month">-</div>
                                <div class="metric-label">Bu Ay</div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-value" id="dashboard-customer-top">-</div>
                                <div class="metric-label">En Sik</div>
                            </div>
                        </div>
                        <div class="musteri-sorunlari-list mt-15">
                            <h4 style="font-size: 0.85rem; margin-bottom: 8px;">Son Eklenen Sorunlar</h4>
                            <div class="musteri-sorun-item">
                                <div class="sorun-header">
                                    <div class="sorun-musteri">Yükleniyor...</div>
                                    <div class="sorun-date">-</div>
                                </div>
                                <div class="sorun-details">
                                    <div class="sorun-title">Veriler hazırlaniyor</div>
                                    <div class="sorun-assignee">-</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `);
        },
        usefulLinks(config) {
            const title = escapeHtml(config.title || 'Faydali Linkler');
            return DashboardHelpers.createElementFromHTML(`
                <div class="card full-width">
                    <div class="card-header">
                        <h3 class="card-title">
                            <i class="fas fa-link"></i>
                            ${title}
                            <span id="dashboard-links-count" style="background: #e9ecef; color: #495057; padding: 2px 8px; border-radius: 12px; font-size: 0.75em; margin-left: 8px;">0</span>
                        </h3>
                        <div style="display: flex; gap: 10px;">
                            <button class="action-btn view-btn" onclick="openModal('add-link-modal')">
                                <i class="fas fa-plus"></i> Yeni Link
                            </button>
                            <button class="action-btn view-btn" onclick="showPage('useful-links')">
                                <i class="fas fa-external-link-alt"></i> Tumunu Gor
                            </button>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="search-filter-container">
                            <div class="search-container">
                                <i class="fas fa-search search-icon"></i>
                                <input type="text" class="search-input" placeholder="Link ara..." id="dashboard-search-input">
                            </div>
                            <select class="filter-select" id="dashboard-environment-filter">
                                <option value="">Tum Ortamlar</option>
                                <option value="public">Public</option>
                                <option value="cyberwebeyeos-prod">Cyberwebeyeos Prod</option>
                                <option value="cyberwebeyeos-test">Cyberwebeyeos Test</option>
                                <option value="ornek-musteri-a-prod">Örnek Müşteri A Prod</option>
                                <option value="ornek-musteri-a-test">Örnek Müşteri A Test</option>
                            </select>
                            <select class="filter-select" id="dashboard-category-filter">
                                <option value="">Tum Kategoriler</option>
                                <option value="portal">Portal</option>
                                <option value="monitoring">Monitoring</option>
                                <option value="blacklist">Blacklist</option>
                                <option value="admin">Admin</option>
                                <option value="documentation">Dokümantasyon</option>
                                <option value="other">Diger</option>
                            </select>
                        </div>
                        <div id="dashboard-links-grid" class="documents-grid" style="max-height: 500px; overflow-y: auto;">
                            <div style="text-align: center; padding: 40px; grid-column: 1 / -1;">
                                <i class="fas fa-spinner fa-spin" style="font-size: 2em; color: #3498db;"></i>
                                <p style="margin-top: 10px; color: #7f8c8d;">Linkler yukleniyor...</p>
                            </div>
                        </div>
                    </div>
                </div>
            `);
        },
        apiWidgetGrid(config) {
            const title = escapeHtml(config.title || "API Dashboard Widget'ları");
            return DashboardHelpers.createElementFromHTML(`
                <div class="card">
                    <div class="card-header">
                        <div>
                            <i class="fas fa-th-large"></i>
                            <span class="card-title">${title}</span>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button class="btn btn-light" id="dashboard-refresh-widgets">
                                <i class="fas fa-sync-alt"></i> Yenile
                            </button>
                            <button class="btn btn-light" onclick="showPage('tools')">
                                <i class="fas fa-cog"></i> Widget Yönet
                            </button>
                            <button class="submit-btn" onclick="openWidgetModal()">
                                <i class="fas fa-plus"></i> Yeni Widget
                            </button>
                        </div>
                    </div>
                    <div class="card-body">
                        <div id="custom-dashboard-empty" class="custom-dashboard-empty" style="display: none; text-align: center; padding: 40px; color: #7f8c8d;">
                            <i class="fas fa-layer-group" style="font-size: 2rem;"></i>
                            <p style="margin-top: 10px;">Henüz tanımlı widget yok. Başlamak için <strong>Yeni Widget</strong> butonuna tıklayın.</p>
                        </div>
                        <div id="custom-dashboard-widgets" class="custom-dashboard-grid"></div>
                    </div>
                </div>
            `);
        },
        customNote(config) {
            const title = escapeHtml(config.title || 'Not Kartı');
            const rawContent = (config.config?.content || '').trim();
            const contentHtml = rawContent
                ? escapeHtml(rawContent).replace(/\n/g, '<br>')
                : '<div class="dashboard-note-placeholder">Not eklemek için kart düzenle modunu kullanabilirsiniz.</div>';
            return DashboardHelpers.createElementFromHTML(`
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">${title}</h3>
                    </div>
                    <div class="card-body">
                        <div class="custom-note-content">${contentHtml}</div>
                    </div>
                </div>
            `);
        },
        embeddedPage(config) {
            const title = escapeHtml(config.title || 'Harici İçerik');
            const url = (config.config?.url || '').trim();
            const heightValue = parseInt(config.config?.height, 10);
            const height = Number.isFinite(heightValue) && heightValue > 0 ? heightValue : 400;
            const body = url
                ? `<iframe class="dashboard-embed-frame" src="${escapeHtml(url)}" height="${height}" loading="lazy"></iframe>`
                : '<div class="dashboard-embed-placeholder">Bağlanılacak URL tanımlanmadı.</div>';
            const headerActions = url
                ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener" class="action-btn view-btn"><i class="fas fa-external-link-alt"></i></a>`
                : '';
            return DashboardHelpers.createElementFromHTML(`
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">${title}</h3>
                        ${headerActions}
                    </div>
                    <div class="card-body">
                        ${body}
                    </div>
                </div>
            `);
        }
    }
};

const DashboardCardModal = {
    modalId: 'dashboard-card-modal',
    form: null,
    typeSelect: null,
    layoutSelect: null,
    titleInput: null,
    enabledCheckbox: null,
    configContainer: null,
    currentConfigInputs: new Map(),

    init() {
        this.form = document.getElementById('dashboard-card-form');
        this.typeSelect = document.getElementById('dashboard-card-type');
        this.layoutSelect = document.getElementById('dashboard-card-layout');
        this.titleInput = document.getElementById('dashboard-card-title');
        this.enabledCheckbox = document.getElementById('dashboard-card-enabled');
        this.configContainer = document.getElementById('dashboard-card-config-container');
        this.currentConfigInputs = new Map();

        if (!this.form) {
            return;
        }

        if (this.typeSelect) {
            this.typeSelect.addEventListener('change', () => this.updateTypeSpecificFields());
        }

        this.form.addEventListener('submit', (event) => {
            event.preventDefault();
            const type = this.typeSelect.value;
            if (!type) {
                alert('Lütfen kart türü seçin');
                return;
            }

            const definition = CARD_TYPE_DEFINITIONS.find(def => def.type === type);
            const title = this.titleInput.value.trim() || (definition ? definition.defaultTitle : 'Yeni Kart');
            const layout = this.layoutSelect.value || (definition ? definition.defaultLayout : '1x1');
            const enabled = this.enabledCheckbox.checked;
            const config = this.collectConfigValues(definition);
            if (config === null) {
                return;
            }

            DashboardLayoutManager.addCard({
                type,
                title,
                layout,
                enabled,
                config
            });
            closeModal(this.modalId);
        });
    },

    open() {
        if (!this.form) {
            this.init();
        }
        if (!this.form) {
            return;
        }
        this.populateTypeOptions();
        this.form.reset();
        if (this.layoutSelect) {
            this.layoutSelect.value = '1x1';
        }
        if (this.enabledCheckbox) {
            this.enabledCheckbox.checked = true;
        }
        this.updateTypeSpecificFields();
        openModal(this.modalId);
    },

    populateTypeOptions() {
        if (!this.typeSelect) {
            return;
        }
        const existingTypes = new Set(DashboardLayoutManager.getCards().map(card => card.type));
        let hasAvailable = false;
        this.typeSelect.innerHTML = CARD_TYPE_DEFINITIONS.map(def => {
            const disabled = def.unique && existingTypes.has(def.type);
            if (!disabled) {
                hasAvailable = true;
            }
            return `<option value="${def.type}" ${disabled ? 'disabled' : ''}>${escapeHtml(def.label)}</option>`;
        }).join('');

        const submitBtn = this.form?.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = !hasAvailable;
        }

        if (!hasAvailable) {
            this.typeSelect.innerHTML = '<option value="" disabled selected>Tüm kartlar eklendi</option>';
        }

        const firstEnabled = Array.from(this.typeSelect.options).find(option => !option.disabled && option.value);
        if (firstEnabled) {
            this.typeSelect.value = firstEnabled.value;
        } else {
            this.typeSelect.value = '';
        }
        this.updateTypeSpecificFields();
    },

    updateTypeSpecificFields() {
        if (!this.typeSelect) {
            return;
        }
        const selectedType = this.typeSelect.value;
        const definition = CARD_TYPE_DEFINITIONS.find(def => def.type === selectedType);
        this.buildConfigFields(definition);
        if (this.layoutSelect && definition?.defaultLayout) {
            this.layoutSelect.value = definition.defaultLayout;
        }
    },

    buildConfigFields(definition) {
        if (!this.configContainer) {
            return;
        }

        const fields = definition?.configFields || [];
        if (!fields.length) {
            this.configContainer.style.display = 'none';
            this.configContainer.innerHTML = '';
            this.currentConfigInputs = new Map();
            return;
        }

        this.configContainer.style.display = 'block';
        this.configContainer.innerHTML = fields.map(field => {
            const isTextarea = field.type === 'textarea';
            const inputAttr = isTextarea
                ? `data-config-key="${field.key}" class="form-control" rows="${field.rows || 4}" placeholder="${field.placeholder || ''}"`
                : `data-config-key="${field.key}" class="form-control" type="${field.type === 'number' ? 'number' : field.type === 'url' ? 'url' : 'text'}" placeholder="${field.placeholder || ''}"`;
            const helpText = field.help ? `<small style="display:block; margin-top:6px; color:#7f8c8d;">${field.help}</small>` : '';
            const defaultVal = field.defaultValue !== undefined ? field.defaultValue : '';
            return `
                <div class="form-group">
                    <label>${escapeHtml(field.label)}${field.required ? ' *' : ''}</label>
                    ${isTextarea
                        ? `<textarea ${inputAttr}>${escapeHtml(defaultVal || '')}</textarea>`
                        : `<input ${inputAttr} value="${escapeHtml(defaultVal || '')}">`}
                    ${helpText}
                </div>
            `;
        }).join('');

        this.currentConfigInputs = new Map();
        fields.forEach(field => {
            const input = this.configContainer.querySelector(`[data-config-key="${field.key}"]`);
            if (input) {
                this.currentConfigInputs.set(field.key, { field, input });
            }
        });
    },

    collectConfigValues(definition) {
        const fields = definition?.configFields || [];
        if (!fields.length) {
            return {};
        }

        const config = {};
        for (const field of fields) {
            const entry = this.currentConfigInputs.get(field.key);
            if (!entry) {
                continue;
            }
            const input = entry.input;
            let value = field.type === 'textarea' ? input.value : input.value.trim();

            if (!value && field.defaultValue !== undefined) {
                value = field.defaultValue;
                if (typeof value === 'string' && field.type !== 'textarea') {
                    value = value.trim();
                }
            }

            if (!value && field.required) {
                alert(`${field.label} alanı boş bırakılamaz.`);
                input.focus();
                return null;
            }

            if (!value) {
                continue;
            }

            if (field.type === 'number') {
                const num = parseInt(value, 10);
                if (isNaN(num)) {
                    alert(`${field.label} alanı sayısal olmalıdır.`);
                    input.focus();
                    return null;
                }
                config[field.key] = num;
            } else {
                config[field.key] = value;
            }
        }

        return config;
    }
};

const DashboardLayoutManager = {
    grid: null,
    editButton: null,
    addButton: null,
    cards: [],
    editMode: false,
    sortable: null,
    persistTimer: null,

    init() {
        this.grid = document.getElementById('dashboard-grid');
        this.editButton = document.getElementById('dashboard-layout-edit');
        this.addButton = document.getElementById('dashboard-layout-add');

        if (!this.grid) {
            return;
        }

        DashboardCardModal.init();

        this.cards = DashboardHelpers.cloneDeep(DEFAULT_CARD_LAYOUT);
        this.renderCards();

        if (this.editButton) {
            this.editButton.addEventListener('click', () => this.toggleEdit());
        }

        if (this.addButton) {
            this.addButton.addEventListener('click', () => DashboardCardModal.open());
        }

        this.loadLayoutFromServer();
    },

    loadLayoutFromServer() {
        fetch('dashboard-layout.php?action=list')
            .then(response => response.json())
            .then(data => {
                if (data && data.success && data.layout && Array.isArray(data.layout.cards) && data.layout.cards.length) {
                    this.cards = data.layout.cards.map(card => this.normalizeCard(card));
                    this.renderCards();
                }
            })
            .catch(error => {
                console.warn('Dashboard layout okunamadı:', error);
            });
    },

    normalizeCard(card) {
        const def = CARD_TYPE_DEFINITIONS.find(item => item.type === card.type);
        const title = card.title || (def ? def.defaultTitle : 'Yeni Kart');
        const layout = card.layout || (def ? def.defaultLayout : '1x1');
        return {
            id: card.id || `${card.type || 'card'}-${Date.now()}`,
            type: card.type || 'custom',
            title,
            layout,
            enabled: card.enabled !== false,
            config: (card.config && !Array.isArray(card.config) && typeof card.config === 'object') ? card.config : {}
        };
    },

    getCards() {
        return this.cards.slice();
    },

    renderCards() {
        if (!this.grid) {
            return;
        }

        if (this.editMode && this.sortable) {
            this.disableDrag(false);
        }

        this.grid.innerHTML = '';
        const fragment = document.createDocumentFragment();
        const activeCards = this.cards.filter(card => card.enabled !== false);
        const presentTypes = new Set();

        if (activeCards.length === 0) {
            const empty = DashboardHelpers.createElementFromHTML(`
                <div class="dashboard-loading-placeholder">
                    <i class="fas fa-layer-group" style="font-size: 2rem; color: #95a5a6;"></i>
                    <p style="margin-top: 10px; color: #7f8c8d;">Henüz bir kart eklenmedi. Kart ekle butonunu kullanabilirsiniz.</p>
                </div>
            `);
            fragment.appendChild(empty);
        } else {
            activeCards.forEach(card => {
                const element = DashboardCardFactory.create(card);
                if (!element) {
                    return;
                }
                fragment.appendChild(element);
                presentTypes.add(card.type);
            });
        }

        this.grid.appendChild(fragment);

        this.updateAddButtonState();

        if (this.editMode) {
            this.enableDrag();
            this.applyEditControls();
        } else {
            this.disableDrag();
        }

        // Show grid immediately
        this.grid.classList.add('loaded');

        // Initialize content
        this.initializeCardContent(presentTypes);

        // Hide loading overlay immediately after render
        const loadingOverlay = document.getElementById('dashboard-loading-overlay');
        if (loadingOverlay) {
            // Small delay just for smooth transition
            setTimeout(() => {
                loadingOverlay.classList.add('hidden');
            }, 300);
        }
    },

    initializeCardContent(types) {
        // Backup kartı
        if (types.has('backupStatus') && typeof refreshBackupStatus === 'function') {
            refreshBackupStatus();
        }

        // Sertifika özeti
        if (types.has('certificateSummary') && typeof loadDashboardCertificates === 'function') {
            loadDashboardCertificates();
        }

        // İşler kartı
        if (types.has('tasksOverview') && typeof loadDashboardTasks === 'function') {
            loadDashboardTasks();
        }

        // Müşteri sorunları
        if (types.has('customerIssues') && typeof loadDashboardCustomerIssues === 'function') {
            loadDashboardCustomerIssues();
        }

        // Faydali linkler
        if (types.has('usefulLinks') && window.UsefulLinks && typeof window.UsefulLinks.loadLinks === 'function') {
            window.UsefulLinks.loadLinks();
        }

        // API widget alanı
        if (types.has('apiWidgetGrid')) {
            DashboardWidgets.init(true);
        } else {
            DashboardWidgets.destroy();
        }
    },

    toggleEdit(forceState) {
        const next = typeof forceState === 'boolean' ? forceState : !this.editMode;
        if (next === this.editMode) {
            return;
        }
        this.editMode = next;
        this.grid.classList.toggle('edit-mode', this.editMode);

        if (this.editButton) {
            this.editButton.innerHTML = this.editMode
                ? '<i class="fas fa-check"></i> Düzenlemeyi Bitir'
                : '<i class="fas fa-grip-vertical"></i> Düzenle';
        }

        if (this.editMode) {
            this.enableDrag();
            this.applyEditControls();
        } else {
            this.disableDrag();
            this.renderCards(); // controls remove
        }
    },

    enableDrag() {
        if (!this.grid || typeof Sortable === 'undefined') {
            console.warn('SortableJS bulunamadı.');
            return;
        }

        if (this.sortable) {
            return;
        }

        this.sortable = Sortable.create(this.grid, {
            animation: 180,
            handle: '.card',
            filter: '.card-edit-controls button, .card-edit-controls select',
            preventOnFilter: false,
            onStart: () => {
                this.grid.classList.add('dragging');
            },
            onEnd: (evt) => {
                this.grid.classList.remove('dragging');
                if (evt.item) {
                    evt.item.classList.add('dragging-active');
                    setTimeout(() => evt.item.classList.remove('dragging-active'), 150);
                }
                this.updateOrderFromDOM();
            }
        });
    },

    disableDrag() {
        if (this.sortable) {
            this.sortable.destroy();
            this.sortable = null;
        }
        if (this.grid) {
            this.grid.classList.remove('dragging');
        }
    },

    applyEditControls() {
        if (!this.grid) {
            return;
        }
        Array.from(this.grid.querySelectorAll('.card')).forEach(cardEl => {
            // remove existing controls
            const prev = cardEl.querySelector('.card-edit-controls');
            if (prev) {
                prev.remove();
            }

            const cardId = cardEl.dataset.dashboardCard;
            const card = this.cards.find(item => item.id === cardId);
            if (!card) {
                return;
            }

            const definition = this.getDefinition(card.type) || {};
            const hasConfig = Array.isArray(definition.configFields) && definition.configFields.length > 0;
            const isUnique = !!definition.unique;

            const controls = DashboardHelpers.createElementFromHTML(`
                <div class="card-edit-controls">
                    <strong>${escapeHtml(card.title || 'Kart')}</strong>
                    <div class="card-edit-row">
                        <label style="font-size: 0.75rem; color: #5f6c7b;">Boyut</label>
                        <select class="card-layout-select">
                            ${CARD_LAYOUT_OPTIONS.map(option => `<option value="${option}" ${option === (card.layout || '1x1') ? 'selected' : ''}>${option}</option>`).join('')}
                        </select>
                    </div>
                    <div class="card-edit-buttons">
                        <button type="button" class="card-rename-btn">
                            <i class="fas fa-i-cursor"></i> Başlık
                        </button>
                        ${hasConfig ? `<button type="button" class="card-config-btn"><i class="fas fa-sliders-h"></i> Ayarlar</button>` : ''}
                        <button type="button" class="card-delete-btn" ${isUnique ? 'disabled title="Bu kart sabittir"' : ''}>
                            <i class="fas fa-trash"></i> Sil
                        </button>
                    </div>
                </div>
            `);

            const layoutSelect = controls.querySelector('.card-layout-select');
            layoutSelect.addEventListener('change', (event) => {
                this.updateCardLayout(card.id, event.target.value);
            });

            const renameBtn = controls.querySelector('.card-rename-btn');
            renameBtn.addEventListener('click', () => {
                const newTitle = prompt('Kart başlığını güncelleyin', card.title || '');
                if (newTitle !== null) {
                    this.updateCardTitle(card.id, newTitle.trim());
                }
            });

            if (hasConfig) {
                const configBtn = controls.querySelector('.card-config-btn');
                if (configBtn) {
                    configBtn.addEventListener('click', () => {
                        this.openConfigPrompt(card, definition);
                    });
                }
            }

            const deleteBtn = controls.querySelector('.card-delete-btn');
            if (deleteBtn && !isUnique) {
                deleteBtn.addEventListener('click', () => {
                    if (confirm('Bu kartı kaldırmak istediğinize emin misiniz?')) {
                        this.removeCard(card.id);
                    }
                });
            }

            cardEl.appendChild(controls);
        });
    },

    updateCardLayout(cardId, newLayout) {
        const card = this.cards.find(item => item.id === cardId);
        if (!card) {
            return;
        }
        if (!CARD_LAYOUT_OPTIONS.includes(newLayout)) {
            newLayout = '1x1';
        }
        card.layout = newLayout;
        const cardElement = this.grid.querySelector(`[data-dashboard-card="${DashboardHelpers.escapeId(cardId)}"]`);
        if (cardElement) {
            CARD_LAYOUT_OPTIONS.forEach(option => {
                cardElement.classList.remove(`layout-${option}`);
            });
            cardElement.classList.add(`layout-${newLayout}`);
            cardElement.dataset.cardLayout = newLayout;
        }
        this.persistLayout();
    },

    updateCardTitle(cardId, newTitle) {
        const card = this.cards.find(item => item.id === cardId);
        if (!card) {
            return;
        }
        const definition = this.getDefinition(card.type);
        card.title = newTitle || (definition ? definition.defaultTitle : card.title);
        this.renderCards();
        this.persistLayout();
    },

    updateCardConfig(cardId, newConfig) {
        const card = this.cards.find(item => item.id === cardId);
        if (!card) {
            return;
        }
        card.config = newConfig || {};
        this.renderCards();
        this.persistLayout();
    },

    removeCard(cardId) {
        const index = this.cards.findIndex(card => card.id === cardId);
        if (index === -1) {
            return;
        }
        this.cards.splice(index, 1);
        this.renderCards();
        this.persistLayout();
    },

    addCard({ type, title, layout, enabled, config }) {
        const definition = CARD_TYPE_DEFINITIONS.find(def => def.type === type);
        if (!definition) {
            alert('Kart tipi bulunamadı');
            return;
        }
        if (definition.unique && this.cards.some(card => card.type === type)) {
            alert('Bu kart yalnızca bir kez eklenebilir.');
            return;
        }
        const card = this.normalizeCard({
            id: definition.unique ? type : `${type}-${Date.now()}`,
            type,
            title: title || definition.defaultTitle,
            layout: layout || definition.defaultLayout,
            enabled: enabled !== false,
            config: config || {}
        });
        this.cards.push(card);
        this.renderCards();
        this.persistLayout();
    },

    getDefinition(type) {
        return CARD_TYPE_DEFINITIONS.find(def => def.type === type);
    },

    openConfigPrompt(card, definition) {
        if (!definition || !Array.isArray(definition.configFields)) {
            return;
        }

        const updatedConfig = { ...(card.config || {}) };

        for (const field of definition.configFields) {
            const currentValue = updatedConfig[field.key] ?? field.defaultValue ?? '';
            const label = `${field.label}${field.required ? ' *' : ''}`;
            const input = prompt(label, String(currentValue ?? ''));
            if (input === null) {
                return; // kullanıcı iptal etti
            }
            let value = field.type === 'textarea' ? input : input.trim();

            if (!value && field.required) {
                alert(`${field.label} alanı boş bırakılamaz.`);
                return;
            }

            if (!value) {
                delete updatedConfig[field.key];
                continue;
            }

            if (field.type === 'number') {
                const num = parseInt(value, 10);
                if (isNaN(num)) {
                    alert(`${field.label} alanı sayısal olmalıdır.`);
                    return;
                }
                updatedConfig[field.key] = num;
            } else {
                updatedConfig[field.key] = value;
            }
        }

        this.updateCardConfig(card.id, updatedConfig);
    },

    updateAddButtonState() {
        if (!this.addButton) {
            return;
        }
        const existingTypes = new Set(this.cards.map(card => card.type));
        const hasAvailable = CARD_TYPE_DEFINITIONS.some(def => !def.unique || !existingTypes.has(def.type));
        this.addButton.disabled = !hasAvailable;
        if (hasAvailable) {
            this.addButton.removeAttribute('title');
        } else {
            this.addButton.title = 'Eklenebilir kart kalmadı.';
        }
    },

    updateOrderFromDOM() {
        const order = Array.from(this.grid.querySelectorAll('[data-dashboard-card]')).map(el => el.dataset.dashboardCard);
        if (!order.length) {
            return;
        }
        const idToCard = new Map(this.cards.map(card => [card.id, card]));
        this.cards = order.map(id => idToCard.get(id)).filter(Boolean);
        this.persistLayout();
    },

    persistLayout() {
        if (this.persistTimer) {
            clearTimeout(this.persistTimer);
        }
        this.persistTimer = setTimeout(() => {
            const layoutPayload = {
                cards: this.cards.map(card => ({
                    id: card.id,
                    type: card.type,
                    title: card.title,
                    layout: card.layout,
                    enabled: card.enabled,
                    config: card.config || {}
                }))
            };

            const formData = new FormData();
            formData.append('action', 'save');
            formData.append('layout', JSON.stringify(layoutPayload));

            fetch('dashboard-layout.php', {
                method: 'POST',
                body: formData
            })
                .then(response => response.json())
                .then(result => {
                    if (!result.success) {
                        console.error('Dashboard kaydedilemedi:', result.message);
                    }
                })
                .catch(error => console.error('Dashboard kaydedilemedi:', error));
        }, 400);
    }
};

const DashboardWidgets = {
    widgets: [],
    timers: {},
    maxConcurrentRequests: 2,
    activeRequests: 0,
    requestQueue: [],
    requestGeneration: 0,
    container: null,
    emptyState: null,
    editButton: null,
    editMode: false,
    sortableInstance: null,
    onManualRefresh: null,
    onToggleEdit: null,

    init(force = false) {
        const container = document.getElementById('custom-dashboard-widgets');
        const emptyState = document.getElementById('custom-dashboard-empty');
        const editButton = document.getElementById('dashboard-edit-widgets');
        const manualRefreshBtn = document.getElementById('dashboard-refresh-widgets');

        if (!container) {
            this.destroy();
            return;
        }

        if (!force && this.container === container) {
            return;
        }

        this.destroy();

        this.container = container;
        this.emptyState = emptyState;
        this.editButton = editButton;

        this.onManualRefresh = () => {
            this.clearTimers();
            this.clearQueue();
            if (!this.widgets.length) {
                this.loadWidgets();
            } else {
                this.queueAllWidgets(true);
                this.setupAutoRefresh();
            }
        };

        if (manualRefreshBtn) {
            manualRefreshBtn.addEventListener('click', this.onManualRefresh);
        }

        this.onToggleEdit = () => this.toggleEditMode();
        if (this.editButton) {
            this.editButton.addEventListener('click', this.onToggleEdit);
        }

        this.loadWidgets();
    },

    destroy() {
        this.clearTimers();
        this.clearQueue();
        this.activeRequests = 0;
        if (this.editButton && this.onToggleEdit) {
            this.editButton.removeEventListener('click', this.onToggleEdit);
        }
        const manualRefreshBtn = document.getElementById('dashboard-refresh-widgets');
        if (manualRefreshBtn && this.onManualRefresh) {
            manualRefreshBtn.removeEventListener('click', this.onManualRefresh);
        }
        this.container = null;
        this.emptyState = null;
        this.editButton = null;
        this.onToggleEdit = null;
        this.onManualRefresh = null;
        if (this.sortableInstance) {
            this.sortableInstance.destroy();
            this.sortableInstance = null;
        }
        this.editMode = false;
    },

    loadWidgets() {
        if (!this.container) {
            return;
        }

        this.clearQueue();
        fetch('api-manager.php?action=list')
            .then(response => response.json())
            .then(data => {
                if (!Array.isArray(data)) {
                    throw new Error('Widget listesi alınamadı');
                }
                this.widgets = data
                    .filter(widget => widget.enabled !== false)
                    .map(widget => {
                        if (typeof widget.options === 'string') {
                            try {
                                widget.options = JSON.parse(widget.options);
                            } catch (err) {
                                console.warn('Widget options parse error:', err);
                                widget.options = {};
                            }
                        }
                        if (!widget.options || typeof widget.options !== 'object') {
                            widget.options = {};
                        }
                        if (typeof widget.order === 'undefined') {
                            widget.order = 0;
                        }
                        return widget;
                    })
                    .sort((a, b) => {
                        const orderA = typeof a.order === 'number' ? a.order : 0;
                        const orderB = typeof b.order === 'number' ? b.order : 0;
                        if (orderA === orderB) {
                            return (a.title || '').localeCompare(b.title || 'Widget', 'tr');
                        }
                        return orderA - orderB;
                    });
                this.renderWidgets();
                this.setupAutoRefresh();
            })
            .catch(error => {
                console.error('Dashboard widget listesi alınamadı:', error);
                if (this.emptyState) {
                    this.emptyState.style.display = 'block';
                    this.emptyState.innerHTML = `
                        <i class="fas fa-exclamation-triangle" style="font-size: 1.8rem; color: #e74c3c;"></i>
                        <p style="margin-top: 10px;">Widget listesi yüklenemedi: ${escapeHtml(error.message)}</p>
                    `;
                }
            });
    },

    renderWidgets() {
        if (!this.container) {
            return;
        }

        this.clearQueue();
        this.container.innerHTML = '';
        this.container.classList.toggle('edit-mode', this.editMode);

        if (this.widgets.length === 0) {
            if (this.emptyState) {
                this.emptyState.style.display = 'block';
            }
            this.disableDrag(false);
            return;
        }

        if (this.emptyState) {
            this.emptyState.style.display = 'none';
        }

        this.widgets.forEach(widget => {
            const card = this.renderWidgetCard(widget);
            this.container.appendChild(card);
        });

        this.queueAllWidgets();

        if (this.editMode) {
            this.enableDrag();
        } else {
            this.disableDrag(false);
        }
    },

    renderWidgetCard(widget) {
        const card = document.createElement('div');
        const layout = (widget.layout || '1x1').toLowerCase();
        card.className = `card dashboard-widget layout-${layout}`;
        card.dataset.widgetId = widget.id;
        card.dataset.layout = layout;
        card.innerHTML = `
            <div class="card-header widget-header">
                <div class="widget-header-info">
                    <i class="fas fa-chart-line"></i>
                    <span class="card-title">${escapeHtml(widget.title)}</span>
                </div>
                <div class="widget-header-tools">
                    <span class="widget-status badge badge-info" id="widget-status-${widget.id}">
                        <i class="fas fa-spinner fa-spin"></i> Yükleniyor
                    </span>
                    <button type="button" class="widget-drag-handle" title="Taşı">
                        <i class="fas fa-grip-vertical"></i>
                    </button>
                </div>
            </div>
            <div class="card-body">
                ${widget.description ? `<p class="widget-description">${escapeHtml(widget.description)}</p>` : ''}
                <div class="widget-content" id="widget-content-${widget.id}">
                    <div class="widget-loading">
                        <i class="fas fa-spinner fa-spin"></i> Veri bekleniyor...
                    </div>
                </div>
                <div class="widget-footer">
                    <small id="widget-updated-${widget.id}" class="text-muted">Son güncelleme: bekleniyor</small>
                    <button class="btn btn-light widget-refresh-btn" data-widget="${widget.id}">
                        <i class="fas fa-sync-alt"></i> Yenile
                    </button>
                </div>
            </div>
        `;

        const refreshBtn = card.querySelector('.widget-refresh-btn');
        refreshBtn.addEventListener('click', () => this.enqueueWidgetFetch(widget, true));

        return card;
    },

    queueAllWidgets(forceRefresh = false) {
        if (!Array.isArray(this.widgets)) {
            return;
        }
        this.widgets.forEach(widget => {
            this.enqueueWidgetFetch(widget, forceRefresh);
        });
    },

    clearQueue() {
        this.requestQueue = [];
        this.requestGeneration += 1;
        this.activeRequests = 0;
    },

    enqueueWidgetFetch(widget, forceRefresh = false) {
        if (!widget) {
            return;
        }
        this.prepareWidgetForFetch(widget);
        this.requestQueue.push({ widget, forceRefresh, generation: this.requestGeneration });
        this.processFetchQueue();
    },

    processFetchQueue() {
        while (this.activeRequests < this.maxConcurrentRequests && this.requestQueue.length > 0) {
            const job = this.requestQueue.shift();
            this.activeRequests += 1;
            this.fetchWidgetData(job.widget, job.forceRefresh, job.generation)
                .catch(() => {})
                .finally(() => {
                    this.activeRequests = Math.max(0, this.activeRequests - 1);
                    this.processFetchQueue();
                });
        }
    },

    prepareWidgetForFetch(widget) {
        const statusEl = document.getElementById(`widget-status-${widget.id}`);
        if (statusEl) {
            statusEl.className = 'widget-status badge badge-info';
            statusEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Yükleniyor';
        }
    },

    setupAutoRefresh() {
        if (this.editMode) {
            return;
        }
        this.clearTimers();
        this.widgets.forEach(widget => {
            if (!widget.refresh_interval || widget.refresh_interval <= 0) {
                return;
            }

            const interval = Math.max(15, parseInt(widget.refresh_interval, 10)) * 1000;
            this.timers[widget.id] = setInterval(() => {
                this.enqueueWidgetFetch(widget);
            }, interval);
        });
    },

    clearTimers() {
        Object.values(this.timers).forEach(timer => clearInterval(timer));
        this.timers = {};
    },

    toggleEditMode(forceState = null) {
        if (!this.container) {
            return;
        }
        const nextState = typeof forceState === 'boolean' ? forceState : !this.editMode;
        if (nextState === this.editMode) {
            return;
        }

        this.editMode = nextState;
        this.container.classList.toggle('edit-mode', this.editMode);

        if (this.editButton) {
            this.editButton.innerHTML = this.editMode
                ? '<i class="fas fa-check"></i> Düzenlemeyi Bitir'
                : '<i class="fas fa-grip-vertical"></i> Düzenle';
        }

        if (this.editMode) {
            this.clearTimers();
            this.enableDrag();
        } else {
            this.disableDrag();
            this.setupAutoRefresh();
        }
    },

    enableDrag() {
        if (!this.container || typeof Sortable === 'undefined') {
            console.warn('SortableJS bulunamadı.');
            return;
        }

        if (this.sortableInstance) {
            return;
        }

        this.sortableInstance = Sortable.create(this.container, {
            animation: 150,
            handle: '.widget-drag-handle',
            onEnd: () => this.updateOrderFromDOM()
        });
    },

    disableDrag(resetEditMode = true) {
        if (this.sortableInstance) {
            this.sortableInstance.destroy();
            this.sortableInstance = null;
        }

        if (resetEditMode) {
            this.container?.classList.remove('edit-mode');
            this.editMode = false;
            if (this.editButton) {
                this.editButton.innerHTML = '<i class="fas fa-grip-vertical"></i> Düzenle';
            }
        }
    },

    updateOrderFromDOM() {
        if (!this.container) {
            return;
        }

        const order = Array.from(this.container.querySelectorAll('.dashboard-widget'))
            .map(card => card.dataset.widgetId)
            .filter(Boolean);

        if (!order.length) {
            return;
        }

        const idToWidget = new Map(this.widgets.map(widget => [widget.id, widget]));
        this.widgets = order.map(id => idToWidget.get(id)).filter(Boolean);
    },

    fetchWidgetData(widget, forceRefresh = false, generation = this.requestGeneration) {
        const statusEl = document.getElementById(`widget-status-${widget.id}`);
        const updatedEl = document.getElementById(`widget-updated-${widget.id}`);

        if (statusEl) {
            statusEl.className = 'widget-status badge badge-info';
            statusEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Yükleniyor';
        }

        const formData = new FormData();
        formData.append('action', 'request');
        formData.append('id', widget.id);
        formData.append('method', widget.method || 'GET');
        formData.append('endpoint', widget.endpoint || '');

        const widgetOptions = widget.options || {};

        if (widgetOptions && widgetOptions.body) {
            formData.append('body', widgetOptions.body);
        }

        formData.append('use_cache', forceRefresh ? '0' : '1');

        let cacheTtl = parseInt(widget.cache_ttl || widgetOptions.cache_ttl || widget.refresh_interval || 60, 10);
        if (!Number.isFinite(cacheTtl) || cacheTtl <= 0) {
            cacheTtl = 60;
        }
        cacheTtl = Math.min(300, Math.max(5, cacheTtl));
        formData.append('cache_ttl', cacheTtl);

        return fetch('api-manager.php', {
            method: 'POST',
            body: formData
        })
            .then(response => response.json())
            .then(result => {
                if (!result.success) {
                    throw new Error(result.message || `HTTP ${result.http_code}`);
                }
                if (generation !== this.requestGeneration) {
                    return result;
                }
                this.renderWidgetData(widget, result.response ?? result);
                const cacheInfo = result.cache_hit === true ? ' • önbellekten' : result.cache_hit === 'stale' ? ' • eski veri' : '';
                if (statusEl) {
                    statusEl.className = 'widget-status badge badge-success';
                    const duration = typeof result.duration_ms === 'number'
                        ? ` ${Math.round(result.duration_ms)}ms`
                        : '';
                    statusEl.innerHTML = `<i class="fas fa-check-circle"></i> Güncel${cacheInfo} (${result.http_code}${duration ? ', ' + duration : ''})`;
                }
                if (updatedEl) {
                    updatedEl.textContent = `Son güncelleme: ${this.formatTimestamp(new Date())}`;
                }
                return result;
            })
            .catch(error => {
                console.error(`Widget ${widget.title} veri hatası:`, error);
                if (generation === this.requestGeneration) {
                    if (statusEl) {
                        statusEl.className = 'widget-status badge badge-danger';
                        statusEl.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Hata`;
                    }
                    this.renderError(widget, error);
                    if (updatedEl) {
                        updatedEl.textContent = 'Son güncelleme: başarısız';
                    }
                }
                throw error;
            });
    },

    renderWidgetData(widget, data) {
        const container = document.getElementById(`widget-content-${widget.id}`);
        if (!container) return;

        container.innerHTML = '';

        switch ((widget.template || 'json').toLowerCase()) {
            case 'metric':
                container.appendChild(this.renderMetricWidget(widget, data));
                break;
            case 'table':
            case 'list':
                container.appendChild(this.renderTableWidget(widget, data));
                break;
            case 'json':
            default:
                container.appendChild(this.renderJsonWidget(widget, data));
                break;
        }
    },

    renderMetricWidget(widget, data) {
        const valuePath = widget.options?.value_path || '';
        const value = valuePath ? this.resolvePath(data, valuePath) : data;
        const unit = widget.options?.unit || '';
        const prefix = widget.options?.prefix || '';

        return DashboardHelpers.createElementFromHTML(`
            <div class="widget-metric">
                <div class="metric-value">${escapeHtml(prefix)}${escapeHtml(value ?? '-')} ${unit ? `<span class="metric-unit">${escapeHtml(unit)}</span>` : ''}</div>
            </div>
        `);
    },

    renderTableWidget(widget, data) {
        const listPath = widget.options?.list_path || '';
        let rows = Array.isArray(data) ? data : this.resolvePath(data, listPath);
        if (!Array.isArray(rows)) {
            rows = [];
        }

        const fields = Array.isArray(widget.options?.list_fields) ? widget.options.list_fields : [];
        const emptyText = widget.options?.empty_text || 'Kayıt bulunamadı';

        if (rows.length === 0) {
            return DashboardHelpers.createElementFromHTML(`<div class="widget-empty">${escapeHtml(emptyText)}</div>`);
        }

        const table = document.createElement('table');
        table.className = 'widget-table';

        const thead = document.createElement('thead');
        thead.innerHTML = `<tr>${fields.map(field => `<th>${escapeHtml(field.label)}</th>`).join('')}</tr>`;
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        rows.forEach(row => {
            const tr = document.createElement('tr');
            fields.forEach(field => {
                const td = document.createElement('td');
                const value = this.resolvePath(row, field.path);
                td.textContent = value === undefined || value === null ? '-' : value;
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);

        const wrapper = document.createElement('div');
        wrapper.className = 'widget-table-wrapper';
        wrapper.appendChild(table);
        return wrapper;
    },

    renderJsonWidget(widget, data) {
        const path = widget.options?.json_path;
        let displayData = path ? this.resolvePath(data, path) : data;
        const maxItems = parseInt(widget.options?.max_items ?? '0', 10);
        if (Array.isArray(displayData) && maxItems > 0 && displayData.length > maxItems) {
            displayData = displayData.slice(0, maxItems);
        }

        return DashboardHelpers.createElementFromHTML(`
            <div class="widget-json">
                <pre>${escapeHtml(JSON.stringify(displayData, null, 2))}</pre>
            </div>
        `);
    },

    renderError(widget, error) {
        const container = document.getElementById(`widget-content-${widget.id}`);
        if (!container) return;

        container.innerHTML = `
            <div class="widget-error">
                <i class="fas fa-bug"></i>
                <p>${escapeHtml(error.message || 'Veri yüklenirken hata oluştu')}</p>
            </div>
        `;
    },

    resolvePath(obj, path) {
        if (!path) {
            return obj;
        }
        const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
        let current = obj;
        for (const part of parts) {
            if (!current || typeof current !== 'object' || !(part in current)) {
                return undefined;
            }
            current = current[part];
        }
        return current;
    },

    formatTimestamp(date) {
        return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
};

// Dashboard widget yönetim tablosu (Araçlar sayfası)
const DashboardWidgetManager = {
    widgets: [],
    apis: [],
    listContainer: null,
    templateSections: {},

    init() {
        this.listContainer = document.getElementById('dashboard-widget-list');
        this.templateSections = {
            metric: document.getElementById('widget-template-metric'),
            table: document.getElementById('widget-template-table'),
            json: document.getElementById('widget-template-json')
        };

        const templateSelect = document.getElementById('widget-template');
        if (templateSelect) {
            templateSelect.addEventListener('change', () => this.updateTemplateFields());
        }

        const form = document.getElementById('widget-form');
        if (form) {
            form.addEventListener('submit', (event) => this.save(event));
        }

        const refreshBtn = document.getElementById('widget-list-refresh');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.reload());
        }

        this.updateTemplateFields();

        if (this.listContainer) {
            this.loadApis()
                .then(() => this.reload())
                .catch(() => this.renderEmptyState('Widget listesi yüklenemedi.'));
        } else {
            this.loadApis().catch(() => {});
        }
    },

    loadApis() {
        return fetch('api-manager.php?action=list')
            .then(response => response.json())
            .then(data => {
                this.apis = Array.isArray(data) ? data : [];
                this.populateApiSelect();
            })
            .catch(error => {
                console.error('Widget API listesi alınamadı:', error);
                this.apis = [];
                this.populateApiSelect();
                throw error;
            });
    },

    populateApiSelect(selectedId = '') {
        const select = document.getElementById('widget-api-id');
        if (!select) {
            return;
        }

        const options = ['<option value="">-- API Seçin --</option>'];
        this.apis
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name, 'tr'))
            .forEach(api => {
                const selected = api.id == selectedId ? ' selected' : '';
                options.push(`<option value="${api.id}"${selected}>${escapeHtml(api.name)}</option>`);
            });

        select.innerHTML = options.join('');
        if (selectedId) {
            select.value = selectedId;
        }
    },

    reload() {
        if (!this.listContainer) {
            return;
        }
        this.renderLoading();
        this.loadWidgetList();
    },

    renderLoading() {
        if (!this.listContainer) return;
        this.listContainer.innerHTML = `
            <div style="text-align: center; padding: 30px; color: #7f8c8d;">
                <i class="fas fa-spinner fa-spin" style="font-size: 1.6rem; color: #3498db;"></i>
                <p style="margin-top: 10px;">Widget'lar yükleniyor...</p>
            </div>
        `;
    },

    renderEmptyState(message) {
        if (!this.listContainer) return;
        this.listContainer.innerHTML = `
            <div style="text-align: center; padding: 30px; color: #7f8c8d;">
                <i class="fas fa-layer-group" style="font-size: 1.6rem;"></i>
                <p style="margin-top: 10px;">${escapeHtml(message)}</p>
            </div>
        `;
    },

    loadWidgetList() {
        fetch('dashboard-manager.php?action=list')
            .then(response => response.json())
            .then(data => {
                if (!Array.isArray(data)) {
                    throw new Error('Widget listesi okunamadı');
                }
                this.widgets = data;
                this.renderWidgetList();
            })
            .catch(error => {
                console.error('Widget listesi yüklenemedi:', error);
                this.renderEmptyState('Widget listesi yüklenemedi.');
            });
    },

    renderWidgetList() {
        if (!this.listContainer) {
            return;
        }

        if (!this.widgets || this.widgets.length === 0) {
            this.renderEmptyState('Henüz tanımlı widget yok.');
            return;
        }

        const table = document.createElement('table');
        table.className = 'widget-admin-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>#</th>
                    <th>Başlık</th>
                    <th>API</th>
                    <th>Template</th>
                    <th>Endpoint</th>
                    <th>Yenileme</th>
                    <th>Durum</th>
                    <th>İşlemler</th>
                </tr>
            </thead>
            <tbody>
                ${this.widgets.map((widget, index) => this.renderWidgetRow(widget, index + 1)).join('')}
            </tbody>
        `;

        this.listContainer.innerHTML = '';
        this.listContainer.appendChild(table);
    },

    renderWidgetRow(widget, index) {
        const apiName = this.getApiName(widget.api_id);
        const templateName = this.getTemplateName(widget.template);
        const enabledBadge = widget.enabled !== false
            ? '<span class="badge badge-success">Aktif</span>'
            : '<span class="badge badge-secondary">Pasif</span>';
        const refreshText = `${parseInt(widget.refresh_interval, 10) || 0} sn`;

        return `
            <tr>
                <td style="width: 40px; font-weight: 600; color: #5f6c7b;">${escapeHtml(String(index))}</td>
                <td>
                    <strong>${escapeHtml(widget.title)}</strong>
                    ${widget.description ? `<br><small style="color:#7f8c8d;">${escapeHtml(widget.description)}</small>` : ''}
                </td>
                <td>${escapeHtml(apiName)}</td>
                <td>${escapeHtml(templateName)}</td>
                <td><code>${escapeHtml(widget.endpoint || '/')}</code></td>
                <td>${escapeHtml(refreshText)}</td>
                <td>${enabledBadge}</td>
                <td>
                    <div class="widget-admin-actions">
                        <button class="action-btn" style="background: #3498db; color: #fff;" onclick="editWidget('${widget.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn" style="background: #e67e22; color: #fff;" onclick="previewWidget('${widget.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn" style="background: #e74c3c; color: #fff;" onclick="deleteWidget('${widget.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    },

    getApiName(apiId) {
        const api = this.apis.find(item => item.id == apiId);
        return api ? api.name : (apiId || '-');
    },

    getTemplateName(template) {
        const map = {
            metric: 'Metric',
            table: 'Tablo',
            list: 'Liste',
            json: 'JSON'
        };
        return map[template] || template;
    },

    openModal(widgetId = null) {
        const form = document.getElementById('widget-form');
        if (!form) return;

        form.reset();
        document.getElementById('widget-id').value = widgetId || '';
        document.getElementById('widget-layout').value = '1x1';
        document.getElementById('widget-refresh').value = 300;
        document.getElementById('widget-enabled').checked = true;
        document.getElementById('widget-empty-text').value = 'Kayıt bulunamadı';
        document.getElementById('widget-modal-title').textContent = widgetId ? 'Widget Düzenle' : 'Yeni Widget';

        if (!this.apis || this.apis.length === 0) {
            this.loadApis().catch(() => {});
        } else {
            this.populateApiSelect();
        }

        if (widgetId) {
            const widget = this.widgets.find(item => item.id === widgetId);
            if (widget) {
                this.populateApiSelect(widget.api_id || '');
                document.getElementById('widget-title').value = widget.title || '';
                document.getElementById('widget-description').value = widget.description || '';
                document.getElementById('widget-api-id').value = widget.api_id || '';
                document.getElementById('widget-method').value = widget.method || 'GET';
                document.getElementById('widget-template').value = widget.template || 'metric';
                document.getElementById('widget-layout').value = widget.layout || '1x1';
                document.getElementById('widget-refresh').value = widget.refresh_interval || 300;
                document.getElementById('widget-endpoint').value = widget.endpoint || '';
                document.getElementById('widget-enabled').checked = widget.enabled !== false;
                document.getElementById('widget-body').value = widget.options?.body || '';

                if (widget.template === 'metric') {
                    document.getElementById('widget-value-path').value = widget.options?.value_path || '';
                    document.getElementById('widget-unit').value = widget.options?.unit || '';
                    document.getElementById('widget-prefix').value = widget.options?.prefix || '';
                } else if (widget.template === 'table' || widget.template === 'list') {
                    document.getElementById('widget-list-path').value = widget.options?.list_path || '';
                    const listFields = Array.isArray(widget.options?.list_fields)
                        ? widget.options.list_fields.map(field => `${field.label || ''}|${field.path || ''}`).join('\n')
                        : '';
                    document.getElementById('widget-list-fields').value = listFields;
                    document.getElementById('widget-empty-text').value = widget.options?.empty_text || 'Kayıt bulunamadı';
                } else if (widget.template === 'json') {
                    document.getElementById('widget-json-path').value = widget.options?.json_path || '';
                    document.getElementById('widget-max-items').value = widget.options?.max_items || '';
                }
            }
        } else {
            this.populateApiSelect();
        }

        this.updateTemplateFields();

        openModal('widget-modal');
    },

    updateTemplateFields() {
        const template = document.getElementById('widget-template')?.value || 'metric';
        Object.entries(this.templateSections || {}).forEach(([key, section]) => {
            if (!section) return;
            section.style.display = key === template ? 'block' : 'none';
        });
    },

    save(event) {
        event.preventDefault();
        const form = document.getElementById('widget-form');
        if (!form) return;

        const widgetId = document.getElementById('widget-id').value;
        const formData = new FormData(form);
        formData.append('action', widgetId ? 'edit' : 'add');
        formData.set('enabled', document.getElementById('widget-enabled').checked ? '1' : '0');
        formData.set('refresh_interval', document.getElementById('widget-refresh').value || '300');
        formData.set('layout', document.getElementById('widget-layout').value || '1x1');
        formData.set('body', document.getElementById('widget-body').value || '');

        const template = document.getElementById('widget-template').value;
        formData.set('template', template);

        if (template === 'metric') {
            formData.set('value_path', document.getElementById('widget-value-path').value || '');
            formData.set('unit', document.getElementById('widget-unit').value || '');
            formData.set('prefix', document.getElementById('widget-prefix').value || '');
        } else if (template === 'table' || template === 'list') {
            formData.set('list_path', document.getElementById('widget-list-path').value || '');
            formData.set('list_fields_raw', document.getElementById('widget-list-fields').value || '');
            formData.set('empty_text', document.getElementById('widget-empty-text').value || 'Kayıt bulunamadı');
        } else if (template === 'json') {
            formData.set('json_path', document.getElementById('widget-json-path').value || '');
            formData.set('max_items', document.getElementById('widget-max-items').value || '0');
        }

        fetch('dashboard-manager.php', {
            method: 'POST',
            body: formData
        })
            .then(response => response.json())
            .then(result => {
                if (!result.success) {
                    throw new Error(result.message || 'Kaydetme başarısız');
                }
                alert('✅ ' + result.message);
                closeModal('widget-modal');
                this.reload();
                DashboardWidgets.init(true);
            })
            .catch(error => {
                console.error('Widget kaydedilemedi:', error);
                alert('❌ Widget kaydedilemedi: ' + error.message);
            });
    },

    delete(widgetId) {
        if (!confirm('Bu widget\'ı silmek istediğinizden emin misiniz?')) {
            return;
        }

        const formData = new FormData();
        formData.append('action', 'delete');
        formData.append('id', widgetId);

        fetch('dashboard-manager.php', {
            method: 'POST',
            body: formData
        })
            .then(response => response.json())
            .then(result => {
                if (!result.success) {
                    throw new Error(result.message || 'Silme işlemi başarısız');
                }
                alert('✅ ' + result.message);
                this.reload();
                DashboardWidgets.init(true);
            })
            .catch(error => {
                console.error('Widget silme hatası:', error);
                alert('❌ Widget silinemedi: ' + error.message);
            });
    },

    preview(widgetId) {
        const widget = this.widgets.find(item => item.id === widgetId);
        if (!widget) {
            alert('Widget bulunamadı');
            return;
        }

        const formData = new FormData();
        formData.append('action', 'request');
        formData.append('id', widget.api_id);
        formData.append('method', widget.method || 'GET');
        formData.append('endpoint', widget.endpoint || '');
        if (widget.options && widget.options.body) {
            formData.append('body', widget.options.body);
        }

        fetch('api-manager.php', {
            method: 'POST',
            body: formData
        })
            .then(response => response.json())
            .then(result => {
                if (!result.success) {
                    throw new Error(result.message || `HTTP ${result.http_code}`);
                }

                const previewWindow = window.open('', '_blank', 'width=720,height=600,scrollbars=yes');
                const payload = JSON.stringify(result.response ?? result, null, 2);

                if (previewWindow) {
                    previewWindow.document.write(`
                        <html><head><title>Widget Önizleme</title></head>
                        <body style="margin:0;padding:16px;background:#0b1120;color:#f8fafc;font-family:monospace;">
                            <pre>${escapeHtml(payload)}</pre>
                        </body></html>
                    `);
                    previewWindow.document.close();
                } else {
                    alert('✅ HTTP ' + (result.http_code || 200) + '\n\n' + payload.substring(0, 1200));
                }
            })
            .catch(error => {
                alert('❌ Önizleme başarısız: ' + error.message);
            });
    }
};

window.DashboardLayoutManager = DashboardLayoutManager;
window.DashboardWidgets = DashboardWidgets;
window.DashboardWidgetManager = DashboardWidgetManager;
window.openWidgetModal = (id = null) => DashboardWidgetManager.openModal(id);
window.editWidget = (id) => DashboardWidgetManager.openModal(id);
// window.deleteWidget - WidgetManagement.js'deki akıllı fonksiyon kullanılıyor (custom/default ayırımı yapıyor)
window.previewWidget = (id) => DashboardWidgetManager.preview(id);
window.DashboardCardModal = DashboardCardModal;

document.addEventListener('DOMContentLoaded', () => {
    DashboardLayoutManager.init();
    DashboardWidgetManager.init();
});

console.log('✅ MonitoringDashboard.js yüklendi');
