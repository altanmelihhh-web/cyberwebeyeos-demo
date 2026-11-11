// ============================================================================
// USEFUL LINKS - Profesyonel Link Yönetimi
// ============================================================================

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔗 USEFUL LINKS BAŞLATILIYOR');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const UsefulLinks = {
    allLinks: [],
    currentView: 'grid',
    currentCategory: '',
    currentEnvironment: '',
    searchQuery: '',
    knownCategories: ['portal', 'monitoring', 'sertifika', 'blacklist', 'kontrol', 'destek'],

    init() {
        console.log('🔧 UsefulLinks.init()');
        this.loadLinks();
        this.setupEventListeners();
    },
    formatNumber(count) {
        if (typeof Intl !== 'undefined' && Intl.NumberFormat) {
            return new Intl.NumberFormat('tr-TR').format(count || 0);
        }
        return (count || 0).toString();
    },
    formatResultCount(count) {
        if (count === 0) return 'Kayıt bulunamadı';
        if (count === 1) return '1 kayıt listeleniyor';
        return `${count} kayıt listeleniyor`;
    },
    getCategoryLabel(cat) {
        const map = {
            'portal': 'Portal',
            'monitoring': 'Monitoring',
            'sertifika': 'Sertifika',
            'blacklist': 'Blacklist',
            'kontrol': 'Kontrol',
            'destek': 'Destek'
        };
        if (!cat) return 'Kategori Yok';
        return map[cat] || cat.charAt(0).toUpperCase() + cat.slice(1);
    },

    loadLinks() {
        console.log('📥 Linkler yükleniyor...');

        fetch('get-links.php')
            .then(response => {
                if (!response.ok) throw new Error('HTTP ' + response.status);
                return response.json();
            })
            .then(data => {
                console.log('✅ Response alındı:', data);

                // get-links.php returns {success, total, links, debug}
                // Extract the links array from the response
                let links = [];
                if (data && data.success && Array.isArray(data.links)) {
                    links = data.links;
                    console.log('✅ Linkler parse edildi:', links.length);
                } else if (Array.isArray(data)) {
                    // Fallback: if it's already an array
                    links = data;
                    console.log('✅ Direkt array alındı:', links.length);
                } else {
                    console.error('❌ Beklenmeyen response formatı:', data);
                }

                this.allLinks = links;
                this.updateCategoryCounts();
                this.renderLinks();
                this.updateCount();
            })
            .catch(error => {
                console.error('❌ Link yükleme hatası:', error);
                this.showError(error.message);
            });
    },

    setupEventListeners() {
        // Kategori tıklamaları
        const categoryItems = document.querySelectorAll('.category-item');
        categoryItems.forEach(item => {
            item.addEventListener('click', () => {
                const category = item.getAttribute('data-category') || '';
                this.selectCategory(category);
                item.blur();
            });
        });

        // Ortam filtresi (page)
        const envFilter = document.getElementById('page-environment-filter');
        if (envFilter) {
            envFilter.addEventListener('change', () => {
                this.currentEnvironment = envFilter.value;
                this.renderLinks();
            });
        }

        const pageCategoryFilter = document.getElementById('page-category-filter');
        if (pageCategoryFilter) {
            pageCategoryFilter.addEventListener('change', () => {
                const category = pageCategoryFilter.value || '';
                this.selectCategory(category);
            });
        }

        // Arama (page)
        const searchInput = document.getElementById('page-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                this.searchQuery = searchInput.value.toLowerCase();
                this.renderLinks();
            });
        }

        // Dashboard filtreleri
        const dashboardEnvFilter = document.getElementById('dashboard-environment-filter');
        if (dashboardEnvFilter) {
            dashboardEnvFilter.addEventListener('change', () => {
                this.currentEnvironment = dashboardEnvFilter.value;
                this.renderLinks();
            });
        }

        const dashboardCategoryFilter = document.getElementById('dashboard-category-filter');
        if (dashboardCategoryFilter) {
            dashboardCategoryFilter.addEventListener('change', () => {
                const cat = dashboardCategoryFilter.value;
                this.currentCategory = cat;
                this.renderLinks();
            });
        }

        const dashboardSearchInput = document.getElementById('dashboard-search-input');
        if (dashboardSearchInput) {
            dashboardSearchInput.addEventListener('input', () => {
                this.searchQuery = dashboardSearchInput.value.toLowerCase();
                this.renderLinks();
            });
        }
    },

    selectCategory(category) {
        this.currentCategory = category || '';

        // Kategori item'larını güncelle
        document.querySelectorAll('.category-item').forEach(item => {
            const itemCat = item.getAttribute('data-category') || '';
            item.classList.toggle('active', itemCat === category);
        });

        // Başlığı güncelle
        const categoryNames = {
            '': 'Tüm Linkler',
            'portal': 'Portal',
            'monitoring': 'Monitoring',
            'sertifika': 'Sertifika',
            'blacklist': 'Blacklist',
            'kontrol': 'Kontrol',
            'destek': 'Destek',
            'other': 'Diğer'
        };

        const nameElement = document.getElementById('current-category-name');
        if (nameElement) {
            nameElement.textContent = categoryNames[category] || 'Tüm Linkler';
        }

        const pageCategoryFilter = document.getElementById('page-category-filter');
        if (pageCategoryFilter) {
            if (this.knownCategories.includes(category)) {
                pageCategoryFilter.value = category;
            } else {
                pageCategoryFilter.value = '';
            }
        }
        this.renderLinks();
    },

    filterLinks() {
        let filtered = [...this.allLinks];

        // Kategori filtresi
        if (this.currentCategory) {
            if (this.currentCategory === 'other') {
                filtered = filtered.filter(link => {
                    const cat = (link.category || '').toLowerCase();
                    return !cat || !this.knownCategories.includes(cat);
                });
            } else {
                filtered = filtered.filter(link =>
                    link.category && link.category.toLowerCase() === this.currentCategory.toLowerCase()
                );
            }
        }

        // Ortam filtresi
        if (this.currentEnvironment) {
            filtered = filtered.filter(link =>
                link.environment && link.environment.toLowerCase() === this.currentEnvironment.toLowerCase()
            );
        }

        // Arama filtresi
        if (this.searchQuery) {
            filtered = filtered.filter(link =>
                (link.title && link.title.toLowerCase().includes(this.searchQuery)) ||
                (link.url && link.url.toLowerCase().includes(this.searchQuery))
            );
        }

        return filtered;
    },

    renderLinks() {
        if (this.currentView === 'grid') {
            this.renderGrid();
        } else {
            this.renderList();
        }
        // Also render to dashboard if it exists
        this.renderDashboardGrid();
    },

    renderDashboardGrid() {
        const container = document.getElementById('dashboard-links-grid');
        if (!container) return;

        const filtered = this.filterLinks();

        // Update dashboard count
        const countDisplay = document.getElementById('dashboard-links-count');
        if (countDisplay) {
            countDisplay.textContent = filtered.length;
        }

        if (filtered.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; grid-column: 1 / -1;">
                    <i class="fas fa-search" style="font-size: 2em; color: #e0e0e0;"></i>
                    <p style="margin-top: 10px; color: #7f8c8d;">Link bulunamadı</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';

        filtered.forEach(link => {
            const card = this.createCard(link);
            container.appendChild(card);
        });

        console.log('✅ Dashboard grid render edildi:', filtered.length);
    },

    renderGrid() {
        const container = document.getElementById('page-links-grid-view');
        if (!container) return;

        const filtered = this.filterLinks();

        // Sayaç güncelle
        const countDisplay = document.getElementById('links-count-display');
        if (countDisplay) {
            countDisplay.textContent = this.formatResultCount(filtered.length);
        }

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="links-empty-state">
                    <i class="fas fa-search"></i>
                    <p>Uygun kayıt bulunamadı</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';

        filtered.forEach(link => {
            const card = this.createCard(link);
            container.appendChild(card);
        });

        console.log('✅ Grid render edildi:', filtered.length);
    },

    renderList() {
        const container = document.getElementById('page-links-list');
        if (!container) return;

        const filtered = this.filterLinks();

        // Sayaç güncelle
        const countDisplay = document.getElementById('links-count-display');
        if (countDisplay) {
            countDisplay.textContent = this.formatResultCount(filtered.length);
        }

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="links-empty-state">
                    <i class="fas fa-search"></i>
                    <p>Uygun kayıt bulunamadı</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';

        filtered.forEach(link => {
            const item = this.createListItem(link);
            container.appendChild(item);
        });

        console.log('✅ Liste render edildi:', filtered.length);
    },

    createCard(link) {
        const card = document.createElement('a');
        card.href = link.url;
        card.target = '_blank';
        card.rel = 'noopener noreferrer';
        card.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 16px;
            padding: 32px 24px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            text-decoration: none;
            transition: all 0.3s ease;
            position: relative;
            border: 1px solid #f0f0f0;
            min-height: 160px;
        `;

        const iconColor = this.getCategoryColor(link.category);

        card.innerHTML = `
            <div style="
                width: 56px;
                height: 56px;
                border-radius: 12px;
                background: linear-gradient(135deg, ${iconColor} 0%, ${iconColor}dd 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                box-shadow: 0 4px 12px ${iconColor}40;
            ">
                <i class="fas ${link.icon || 'fa-link'}" style="font-size: 26px; color: white;"></i>
            </div>
            <h3 style="
                margin: 0;
                font-size: 1.05rem;
                font-weight: 600;
                color: #2c3e50;
                line-height: 1.4;
                text-align: center;
                letter-spacing: -0.01em;
            ">${this.esc(link.title)}</h3>
        `;

        // Hover effect
        card.addEventListener('mouseenter', () => {
            card.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
            card.style.transform = 'translateY(-4px)';
            card.style.borderColor = iconColor + '40';
        });
        card.addEventListener('mouseleave', () => {
            card.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
            card.style.transform = 'translateY(0)';
            card.style.borderColor = '#f0f0f0';
        });

        return card;
    },

    createListItem(link) {
        const item = document.createElement('a');
        item.href = link.url;
        item.target = '_blank';
        item.rel = 'noopener noreferrer';
        item.className = 'link-list-item';

        const iconColor = this.getCategoryColor(link.category);
        const categoryLabel = this.getCategoryLabel((link.category || '').toLowerCase());

        item.innerHTML = `
            <div class="link-list-icon" style="background:${iconColor};">
                <i class="fas ${link.icon || 'fa-link'}"></i>
            </div>
            <div class="link-list-info">
                <h5>${this.esc(link.title)}</h5>
                <p title="${this.esc(link.url)}">${this.esc(link.url)}</p>
            </div>
            <div class="link-list-meta">
                <span>${this.formatEnvironment(link.environment)}</span>
                <i class="fas fa-circle" style="font-size:4px;"></i>
                <span>${categoryLabel}</span>
                <i class="fas fa-arrow-up-right-from-square"></i>
            </div>
        `;

        return item;
    },

    updateCategoryCounts() {
        const knownSet = new Set(this.knownCategories);
        const counts = { total: this.allLinks.length, other: 0 };

        this.knownCategories.forEach(cat => {
            counts[cat] = 0;
        });

        this.allLinks.forEach(link => {
            const cat = (link.category || '').toLowerCase();
            if (knownSet.has(cat)) {
                counts[cat] += 1;
            } else {
                counts.other += 1;
            }
        });

        const updateBadge = (category, value) => {
            const item = document.querySelector(`.category-item[data-category="${category}"]`);
            if (!item) return;
            const badge = item.querySelector('.category-count');
            if (badge) {
                badge.textContent = this.formatNumber(value);
            }
        };

        updateBadge('', counts.total);
        this.knownCategories.forEach(cat => updateBadge(cat, counts[cat]));
        updateBadge('other', counts.other);

        this.updateStats();
    },

    updateStats() {
        const categorySet = new Set();
        const environmentSet = new Set();
        let favorites = 0;

        this.allLinks.forEach(link => {
            const cat = (link.category || '').toLowerCase();
            if (cat) {
                categorySet.add(cat);
            }

            const env = (link.environment || '').toLowerCase();
            if (env) {
                environmentSet.add(env);
            }

            if (link.isFavorite || link.favorite || link.is_favorite) {
                favorites += 1;
            }
        });

        const assign = (id, value) => {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = this.formatNumber(value);
            }
        };

        assign('stats-total-links', this.allLinks.length);
        assign('stats-categories', categorySet.size);
        assign('stats-environments', environmentSet.size);
        assign('stats-favorites', favorites);
    },

    updateCount() {
        const countEl = document.getElementById('page-links-count');
        if (countEl) {
            countEl.textContent = this.formatNumber(this.allLinks.length);
        }
    },

    getCategoryColor(category) {
        const colors = {
            monitoring: '#3498db',
            sertifika: '#27ae60',
            portal: '#9b59b6',
            kontrol: '#f39c12',
            destek: '#e74c3c',
            blacklist: '#34495e',
            other: '#7f8c8d'
        };
        return colors[category] || '#3498db';
    },

    formatEnvironment(env) {
        const formatted = {
            'public': 'Public',
            'cyberwebeyeos-test': 'Cyberwebeyeos Test',
            'cyberwebeyeos-prod': 'Cyberwebeyeos Prod',
            'cyberwebeyeos-drc': 'Cyberwebeyeos DRC',
            'ornek-musteri-a-test': 'Örnek Müşteri A Test',
            'ornek-musteri-a-prod': 'Örnek Müşteri A Prod',
            'ornek-musteri-a-drc': 'Örnek Müşteri A DRC'
        };
        return formatted[env] || env;
    },

    showError(message) {
        const gridView = document.getElementById('page-links-grid-view');
        const listView = document.getElementById('page-links-list');

        const errorHTML = `
            <div style="text-align: center; padding: 60px 20px; color: #e74c3c;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3em; margin-bottom: 15px;"></i>
                <p style="margin: 0; font-size: 15px;">Hata: ${this.esc(message)}</p>
            </div>
        `;

        if (gridView) gridView.innerHTML = errorHTML;
        if (listView) listView.innerHTML = errorHTML;
    },

    esc(text) {
        if (!text && text !== 0) return '';
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
        return String(text).replace(/[&<>"']/g, ch => map[ch]);
    }
};

// ============================================================================
// GÖRÜNÜM DEĞİŞTİRME
// ============================================================================

function switchLinksView(view) {
    UsefulLinks.currentView = view;

    const gridView = document.getElementById('page-links-grid-view');
    const listView = document.getElementById('page-links-table-view');
    const gridBtn = document.getElementById('view-grid-btn');
    const listBtn = document.getElementById('view-table-btn');

    if (view === 'grid') {
        gridView.style.display = 'grid';
        listView.style.display = 'none';
        gridBtn.classList.add('view-btn');
        listBtn.classList.remove('view-btn');
        UsefulLinks.renderGrid();
    } else {
        gridView.style.display = 'none';
        listView.style.display = 'block';
        listBtn.classList.add('view-btn');
        gridBtn.classList.remove('view-btn');
        UsefulLinks.renderList();
    }
}

// ============================================================================
// AUTO INIT
// ============================================================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => UsefulLinks.init(), 100);
    });
} else {
    setTimeout(() => UsefulLinks.init(), 100);
}

// Global export
window.UsefulLinks = UsefulLinks;
window.switchLinksView = switchLinksView;

console.log('✅ UsefulLinks.js yüklendi');
