/**
 * Widget Management System
 * Handles dashboard widget customization, drag & drop, and persistence
 */

// Widget Management State
const WidgetManager = {
    editMode: false,
    sortableInstance: null,
    widgets: [],

    /**
     * Initialize widget management system
     */
    init() {
        this.saveDefaultConfig(); // Varsayılan ayarları kaydet
        this.loadWidgets(); // Custom widget'ları yükle
        this.renderWidgets(); // Custom widget'ları render et
        this.loadWidgetConfig(); // Sıralamayı yükle
        this.setupEventListeners();
        this.setupWidgetActionListeners(); // Widget butonları için event delegation
        this.initializeSortable();
        console.log('Widget Management System initialized');
    },

    /**
     * Setup event delegation for widget action buttons
     */
    setupWidgetActionListeners() {
        const grid = document.getElementById('dashboard-widgets-grid');
        if (!grid) {
            console.error('❌ Dashboard grid not found for event delegation');
            return;
        }

        // Event delegation - grid'de dinle, tüm widget butonları için
        grid.addEventListener('click', (e) => {
            const target = e.target.closest('.widget-action-btn');
            if (!target) return;

            e.preventDefault();
            e.stopPropagation();

            // data-widget-id veya onclick'ten widget ID bul
            let widgetId = target.dataset.widgetId;
            if (!widgetId) {
                // onclick attribute'undan cikar: deleteWidget('widget-xxx')
                const onclickAttr = target.getAttribute('onclick') || '';
                const match = onclickAttr.match(/(?:deleteWidget|resizeWidget|editWidget)\(['"]([^'"]+)['"]\)/);
                if (match) widgetId = match[1];
            }
            if (!widgetId) {
                // En yakin card'dan widget ID al
                const card = target.closest('[data-widget-id]');
                if (card) widgetId = card.dataset.widgetId;
            }
            if (!widgetId) {
                console.warn('⚠️ Widget ID bulunamadı:', target);
                return;
            }

            if (target.classList.contains('btn-delete') || target.classList.contains('widget-delete-btn')) {
                console.log('🗑️ Delete button clicked (delegation) for:', widgetId);
                deleteWidget(widgetId);
            } else if (target.classList.contains('btn-resize') || target.classList.contains('widget-resize-btn')) {
                console.log('🔄 Resize button clicked (delegation) for:', widgetId);
                resizeWidget(widgetId);
            }
        });

        console.log('✅ Widget action listeners setup (event delegation)');
    },

    /**
     * Save current state as default configuration
     */
    saveDefaultConfig() {
        // Sadece bir kere kaydet (eğer yoksa)
        if (localStorage.getItem('widgetDefaultConfig')) {
            return; // Zaten kaydedilmiş
        }

        const grid = document.getElementById('dashboard-widgets-grid');
        if (!grid) return;

        const cards = grid.querySelectorAll('.card[data-widget-id]');
        const defaultConfig = Array.from(cards).map((card, index) => ({
            id: card.dataset.widgetId,
            position: index,
            size: card.dataset.widgetSize || '1x1'
        }));

        localStorage.setItem('widgetDefaultConfig', JSON.stringify(defaultConfig));
        console.log('Default widget configuration saved:', defaultConfig);
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Toggle edit mode button
        const toggleBtn = document.getElementById('toggle-edit-mode-btn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleEditMode());
        }

        // Add widget button
        const addBtn = document.getElementById('add-widget-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.openAddWidgetModal());
        }

        // Reset widgets button
        const resetBtn = document.getElementById('reset-widgets-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetWidgets());
        }
    },

    /**
     * Toggle edit mode
     */
    toggleEditMode() {
        this.editMode = !this.editMode;
        const grid = document.getElementById('dashboard-widgets-grid');
        const btn = document.getElementById('toggle-edit-mode-btn');

        if (this.editMode) {
            // Enable edit mode
            grid.classList.add('edit-mode');
            btn.innerHTML = '<i class="fas fa-lock-open"></i><span>Kilitle</span>';
            btn.classList.remove('btn-lock');
            btn.classList.add('btn-unlock');

            // Enable drag & drop
            if (this.sortableInstance) {
                this.sortableInstance.option('disabled', false);
            }

            console.log('Edit mode enabled');
        } else {
            // Disable edit mode
            grid.classList.remove('edit-mode');
            btn.innerHTML = '<i class="fas fa-lock"></i><span>Düzenleme Modu</span>';
            btn.classList.remove('btn-unlock');
            btn.classList.add('btn-lock');

            // Disable drag & drop
            if (this.sortableInstance) {
                this.sortableInstance.option('disabled', true);
            }

            // Save widget order
            this.saveWidgetOrder();

            console.log('Edit mode disabled');
        }
    },

    /**
     * Initialize SortableJS for drag & drop
     */
    initializeSortable() {
        const grid = document.getElementById('dashboard-widgets-grid');
        if (!grid || typeof Sortable === 'undefined') {
            console.error('Cannot initialize Sortable: grid not found or SortableJS not loaded');
            return;
        }

        this.sortableInstance = Sortable.create(grid, {
            animation: 200,
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag',
            disabled: true, // Start disabled (only enable in edit mode)
            handle: '.card', // Make entire card draggable
            filter: '.widget-action-btn', // Don't drag when clicking action buttons

            onStart: (evt) => {
                console.log('Drag started:', evt.item.dataset.widgetId);
            },

            onEnd: (evt) => {
                console.log('Drag ended:', evt.item.dataset.widgetId);
                console.log('New position:', evt.newIndex);

                // Auto-save order after drag
                setTimeout(() => {
                    this.saveWidgetOrder();
                }, 100);
            }
        });

        console.log('SortableJS initialized');
    },

    /**
     * Save custom widgets to localStorage
     */
    saveWidgets() {
        const dataToSave = JSON.stringify(this.widgets);
        localStorage.setItem('customWidgets', dataToSave);
        console.log('💾 Saved to localStorage:', this.widgets.length, 'widgets');
        console.log('💾 localStorage content:', dataToSave.substring(0, 100) + '...');

        // Verify save
        const verification = localStorage.getItem('customWidgets');
        if (verification === dataToSave) {
            console.log('✅ Save verified successfully');
        } else {
            console.error('❌ Save verification failed!');
        }
    },

    /**
     * Load custom widgets from localStorage
     */
    loadWidgets() {
        try {
            const saved = localStorage.getItem('customWidgets');
            console.log('📂 Loading from localStorage...');
            if (saved) {
                this.widgets = JSON.parse(saved);
                console.log('✅ Loaded', this.widgets.length, 'custom widgets');
                console.log('📂 Widget IDs:', this.widgets.map(w => w.id));
            } else {
                console.log('ℹ️ No saved widgets found in localStorage');
            }
        } catch (error) {
            console.error('❌ Error loading custom widgets:', error);
            this.widgets = [];
        }
    },

    /**
     * Render all custom widgets to the grid
     */
    renderWidgets() {
        console.log('🎨 Rendering widgets...');
        const grid = document.getElementById('dashboard-widgets-grid');
        if (!grid) {
            console.error('❌ Dashboard grid not found!');
            return;
        }

        // Remove existing custom widgets first
        const existingCustom = grid.querySelectorAll('.card[data-custom-widget="true"]');
        console.log('🗑️ Removing', existingCustom.length, 'existing custom widgets from DOM');
        existingCustom.forEach(el => el.remove());

        // Add custom widgets
        console.log('➕ Adding', this.widgets.length, 'widgets to DOM');
        this.widgets.forEach((widget, index) => {
            console.log(`  ${index + 1}. Adding widget:`, widget.id, widget.title, 'type:', widget.type);
            const widgetElement = this.createWidgetElement(widget);
            grid.appendChild(widgetElement);

            // Eğer page-card widget ise, veri yükleme fonksiyonunu çağır
            if (widget.type === 'page-card' && widget.pageId) {
                console.log('🎯 Page card detected, scheduling data load for:', widget.pageId);
                setTimeout(() => {
                    if (typeof loadPageCardData === 'function') {
                        loadPageCardData(widget.pageId, widget.id);
                    } else {
                        console.error('❌ loadPageCardData function not found!');
                    }
                }, 300);
            }
        });

        // Reinitialize sortable
        this.initializeSortable();
        console.log('✅ Rendering complete');
    },

    /**
     * Create a widget DOM element
     */
    createWidgetElement(widget) {
        const div = document.createElement('div');
        div.className = `card widget-${widget.size}`;
        div.dataset.widgetId = widget.id;
        div.dataset.widgetSize = widget.size;
        div.dataset.customWidget = 'true';

        div.innerHTML = `
            <div class="card-header">
                <h3>${widget.title}</h3>
                <div class="widget-actions">
                    <button class="widget-action-btn btn-resize" data-widget-id="${widget.id}" title="Boyutlandır">
                        <i class="fas fa-expand-arrows-alt"></i>
                    </button>
                    <button class="widget-action-btn btn-delete" data-widget-id="${widget.id}" title="Sil">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
            <div class="card-body" style="overflow: auto;">
                ${widget.content}
            </div>
        `;

        // Event delegation kullanıyoruz, inline listener'lara gerek yok
        return div;
    },

    /**
     * Delete a custom widget
     */
    deleteWidget(widgetId) {
        console.log('🗑️ Deleting widget:', widgetId);
        console.log('📦 Current widgets before delete:', this.widgets.length, this.widgets);

        if (!confirm('Bu widget\'ı silmek istediğinizden emin misiniz?')) {
            return;
        }

        // Widget'ı filtrele
        const beforeCount = this.widgets.length;
        this.widgets = this.widgets.filter(w => w.id !== widgetId);
        const afterCount = this.widgets.length;

        console.log('📦 Widgets after filter:', afterCount, this.widgets);
        console.log(`✅ Deleted ${beforeCount - afterCount} widget(s)`);

        // localStorage'a kaydet
        this.saveWidgets();

        // DOM'dan kaldır ve yeniden render et
        this.renderWidgets();

        this.showNotification('Widget silindi', 'success');
    },

    /**
     * Save widget configuration (order + sizes)
     */
    saveWidgetOrder() {
        const grid = document.getElementById('dashboard-widgets-grid');
        const cards = grid.querySelectorAll('.card[data-widget-id]');

        const config = Array.from(cards).map((card, index) => ({
            id: card.dataset.widgetId,
            position: index,
            size: card.dataset.widgetSize || '1x1'
        }));

        console.log('Saving widget configuration:', config);

        // Save to localStorage
        localStorage.setItem('widgetConfig', JSON.stringify(config));

        this.showNotification('Widget ayarları kaydedildi', 'success');
    },

    /**
     * Load widget configuration
     */
    loadWidgetConfig() {
        try {
            const savedConfig = localStorage.getItem('widgetConfig');
            if (savedConfig) {
                const config = JSON.parse(savedConfig);
                this.applyWidgetConfig(config);
            }
        } catch (error) {
            console.error('Error loading widget config:', error);
        }
    },

    /**
     * Apply saved widget configuration (order + sizes)
     */
    applyWidgetConfig(config) {
        const grid = document.getElementById('dashboard-widgets-grid');
        if (!grid) return;

        // Apply sizes and order
        config.forEach((item) => {
            const card = grid.querySelector(`[data-widget-id="${item.id}"]`);
            if (card) {
                // Remove old size classes
                card.classList.remove('widget-1x1', 'widget-1x2', 'widget-1x1-tall', 'widget-1x2-tall');

                // Add new size class
                card.classList.add(`widget-${item.size}`);
                card.dataset.widgetSize = item.size;

                // Reorder
                grid.appendChild(card);
            }
        });

        console.log('Applied widget configuration');
    },

    /**
     * Reset widgets to default
     */
    resetWidgets() {
        if (!confirm('Tüm widget ayarlarını varsayılana döndürmek istediğinizden emin misiniz?')) {
            return;
        }

        // Clear user config (keep default config)
        localStorage.removeItem('widgetConfig');
        localStorage.removeItem('widgetOrder');

        // Load default configuration
        const defaultConfig = localStorage.getItem('widgetDefaultConfig');
        if (defaultConfig) {
            this.applyWidgetConfig(JSON.parse(defaultConfig));
        }

        this.showNotification('Widget ayarları varsayılana döndürüldü', 'success');

        console.log('Widgets reset to default');
    },

    /**
     * Edit widget
     */
    editWidget(widgetId) {
        const card = document.querySelector(`[data-widget-id="${widgetId}"]`);
        if (!card) {
            console.error('Widget not found:', widgetId);
            return;
        }

        const widgetType = card.dataset.widgetType;
        const widgetSize = card.dataset.widgetSize;

        console.log('Edit widget:', widgetId, widgetType, widgetSize);

        // Open edit modal
        this.openEditWidgetModal(widgetId, widgetType, widgetSize);
    },

    /**
     * Resize widget - Open modal to select size
     */
    resizeWidget(widgetId) {
        const card = document.querySelector(`[data-widget-id="${widgetId}"]`);
        if (!card) {
            console.error('Widget not found:', widgetId);
            return;
        }

        // Store current widget ID for modal
        this.currentResizingWidget = widgetId;

        // Open resize modal
        const modal = document.getElementById('widget-resize-modal');
        if (modal) {
            modal.style.display = 'block';
        }

        console.log('Opening resize modal for:', widgetId);
    },

    /**
     * Apply selected size to widget
     */
    applyWidgetSize(size) {
        if (!this.currentResizingWidget) {
            console.error('No widget selected for resizing');
            return;
        }

        const card = document.querySelector(`[data-widget-id="${this.currentResizingWidget}"]`);
        if (!card) {
            console.error('Widget not found:', this.currentResizingWidget);
            return;
        }

        // Remove old size classes
        card.classList.remove('widget-1x1', 'widget-1x2', 'widget-1x1-tall', 'widget-1x2-tall');

        // Add new size class
        card.classList.add(`widget-${size}`);
        card.dataset.widgetSize = size;

        this.saveWidgetOrder();
        this.showNotification(`Widget boyutu değiştirildi: ${size}`, 'success');

        console.log('Resized widget:', this.currentResizingWidget, 'to', size);

        // Close modal
        this.closeResizeModal();
    },

    /**
     * Close resize modal
     */
    closeResizeModal() {
        const modal = document.getElementById('widget-resize-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        this.currentResizingWidget = null;
    },

    /**
     * Open Add Widget modal
     */
    openAddWidgetModal() {
        console.log('Opening add widget modal...');
        const modal = document.getElementById('add-widget-modal');
        if (modal) {
            modal.style.display = 'block';
        }
    },

    /**
     * Open Edit Widget modal
     */
    openEditWidgetModal(widgetId, widgetType, widgetSize) {
        console.log('Opening edit widget modal...', widgetId);

        // TODO: Implement modal
        alert(`Edit Widget: ${widgetId}\nType: ${widgetType}\nSize: ${widgetSize}\n\nComing soon!`);
    },

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `widget-notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;

        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#3B82F6'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            gap: 10px;
            z-index: 10000;
            font-size: 14px;
            animation: slideIn 0.3s ease-out;
        `;

        document.body.appendChild(notification);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
};

// Global functions for onclick handlers
function toggleEditMode() {
    WidgetManager.toggleEditMode();
}

function deleteWidget(widgetId) {
    if (!confirm('Bu widget\'ı silmek istediğinizden emin misiniz?')) return;

    const el = document.querySelector('[data-widget-id="' + widgetId + '"]');
    if (el) {
        el.style.transition = 'opacity 0.3s, transform 0.3s';
        el.style.opacity = '0';
        el.style.transform = 'scale(0.9)';
        setTimeout(function() { el.remove(); }, 300);

        // Silinen widget'i localStorage'a kaydet (sayfa yenilenince geri gelmesin)
        var hidden = JSON.parse(localStorage.getItem('hiddenWidgets') || '[]');
        if (hidden.indexOf(widgetId) === -1) hidden.push(widgetId);
        localStorage.setItem('hiddenWidgets', JSON.stringify(hidden));

        console.log('✅ Widget silindi:', widgetId);
    }
}

function editWidget(widgetId) {
    WidgetManager.editWidget(widgetId);
}

function resizeWidget(widgetId) {
    WidgetManager.resizeWidget(widgetId);
}

function selectWidgetSize(size) {
    WidgetManager.applyWidgetSize(size);
}

function closeResizeModal() {
    WidgetManager.closeResizeModal();
}

// Sayfa yuklenince silinen widget'lari gizle
function applyHiddenWidgets() {
    var hidden = JSON.parse(localStorage.getItem('hiddenWidgets') || '[]');
    hidden.forEach(function(id) {
        var el = document.querySelector('[data-widget-id="' + id + '"]');
        if (el) el.style.display = 'none';
    });
}

// Tum widget'lari geri getir (Varsayilana Don butonu icin)
function resetWidgets() {
    localStorage.removeItem('hiddenWidgets');
    document.querySelectorAll('[data-widget-id]').forEach(function(el) {
        el.style.display = '';
        el.style.opacity = '1';
        el.style.transform = '';
    });
    console.log('✅ Tum widget\'lar geri getirildi');
}
window.resetWidgets = resetWidgets;

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    // Silinen widget'lari gizle
    applyHiddenWidgets();

    // Wait for SortableJS to load
    if (typeof Sortable !== 'undefined') {
        WidgetManager.init();
    } else {
        console.error('SortableJS not loaded');
    }
});

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Additional global functions for widget modal
function openAddWidgetModal() {
    WidgetManager.openAddWidgetModal();
}

function closeAddWidgetModal() {
    const modal = document.getElementById('add-widget-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function selectWidgetType(type) {
    console.log('Widget type selected:', type);

    // Close the add widget modal
    closeAddWidgetModal();

    // Open appropriate form modal based on type
    switch(type) {
        case 'url':
            document.getElementById('url-widget-form-modal').style.display = 'block';
            break;

        case 'note':
            document.getElementById('note-widget-form-modal').style.display = 'block';
            break;

        case 'page-shortcut':
            // Dinamik olarak sayfaları yükle
            populatePageOptions();
            document.getElementById('page-widget-form-modal').style.display = 'block';
            break;

        case 'clock':
            document.getElementById('clock-widget-form-modal').style.display = 'block';
            break;

        case 'countdown':
            document.getElementById('countdown-widget-form-modal').style.display = 'block';
            break;

        case 'image':
            document.getElementById('image-widget-form-modal').style.display = 'block';
            break;

        case 'page-card':
            // Dinamik olarak sayfa kartlarını yükle
            populatePageCardOptions();
            document.getElementById('page-card-widget-form-modal').style.display = 'block';
            break;

        default:
            WidgetManager.showNotification('Bu widget tipi henüz desteklenmiyor', 'error');
            return;
    }
}

/**
 * Sidebar'dan tüm sayfaları okuyup dinamik olarak page widget formunu doldurur
 */
function populatePageOptions() {
    const container = document.getElementById('page-widget-options-container');
    if (!container) {
        console.error('Page options container not found');
        return;
    }

    // Sidebar menüden tüm linkleri oku
    const sidebarLinks = document.querySelectorAll('.sidebar-menu a[href^="#"]');
    const pages = [];

    sidebarLinks.forEach(link => {
        const href = link.getAttribute('href');
        const pageId = href.substring(1); // # karakterini kaldır
        const icon = link.querySelector('i');
        const iconClass = icon ? icon.className.replace('fas ', '') : 'fa-file';
        const text = link.textContent.trim();

        // Dashboard'u atla (widget'a gerek yok)
        if (pageId === 'dashboard') return;

        pages.push({
            id: pageId,
            name: text,
            icon: iconClass
        });
    });

    console.log('Found pages from sidebar:', pages);

    // Renk paleti (her sayfa için farklı renk)
    const colorPalette = [
        '#3B82F6', '#F59E0B', '#10B981', '#8B5CF6',
        '#EF4444', '#6366F1', '#EC4899', '#06B6D4',
        '#F97316', '#14B8A6', '#8B5CF6', '#F43F5E'
    ];

    // Radio butonları oluştur
    let html = '';
    pages.forEach((page, index) => {
        const color = colorPalette[index % colorPalette.length];
        const isFirst = index === 0 ? 'required' : '';

        html += `
            <label class="page-option" style="display: flex; align-items: center; padding: 12px; border: 2px solid var(--border-color); border-radius: 8px; cursor: pointer; transition: all 0.2s; background: var(--bg-secondary);">
                <input type="radio" name="page-widget-page" value="${page.id}" ${isFirst} style="margin-right: 12px; width: 18px; height: 18px;">
                <i class="fas ${page.icon}" style="margin-right: 10px; color: ${color}; font-size: 1.1rem;"></i>
                <span style="color: var(--text-primary); font-size: 0.95rem;">${page.name}</span>
            </label>
        `;
    });

    container.innerHTML = html;
    console.log('Page options populated:', pages.length, 'pages');
}

// Form modal close functions
function closeUrlWidgetForm() {
    document.getElementById('url-widget-form-modal').style.display = 'none';
    document.getElementById('url-widget-form').reset();
}

function closeNoteWidgetForm() {
    document.getElementById('note-widget-form-modal').style.display = 'none';
    document.getElementById('note-widget-form').reset();
}

function closePageWidgetForm() {
    document.getElementById('page-widget-form-modal').style.display = 'none';
    document.getElementById('page-widget-form').reset();
}

function closeClockWidgetForm() {
    document.getElementById('clock-widget-form-modal').style.display = 'none';
    document.getElementById('clock-widget-form').reset();
}

function closeCountdownWidgetForm() {
    document.getElementById('countdown-widget-form-modal').style.display = 'none';
    document.getElementById('countdown-widget-form').reset();
}

function closeImageWidgetForm() {
    document.getElementById('image-widget-form-modal').style.display = 'none';
    document.getElementById('image-widget-form').reset();
}

// Form submit functions
function saveUrlWidget(event) {
    event.preventDefault();

    const title = document.getElementById('url-widget-title').value;
    const url = document.getElementById('url-widget-url').value;
    const size = document.querySelector('input[name="url-widget-size"]:checked').value;

    const widgetData = {
        id: `widget-${Date.now()}`,
        type: 'url',
        title: title,
        url: url,
        size: size,
        order: WidgetManager.widgets.length,
        content: `
            <div style="width: 100%; height: 100%; position: relative;">
                <iframe src="${url}"
                        style="width: 100%; height: 100%; border: none;"
                        frameborder="0"
                        onload="this.style.display='block'; this.nextElementSibling.style.display='none';"
                        onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"></iframe>
                <div style="display: none; width: 100%; height: 100%; flex-direction: column; align-items: center; justify-content: center; padding: 20px; text-align: center; color: var(--text-secondary);">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 10px; color: #F59E0B;"></i>
                    <p style="margin-bottom: 15px; font-size: 0.9rem;">Bu site iframe'de görüntülenemiyor.</p>
                    <a href="${url}" target="_blank" style="padding: 10px 20px; background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); color: white; border-radius: 8px; text-decoration: none; font-size: 0.9rem;">
                        <i class="fas fa-external-link-alt"></i> Yeni Sekmede Aç
                    </a>
                </div>
            </div>
        `
    };

    WidgetManager.widgets.push(widgetData);
    WidgetManager.saveWidgets();
    WidgetManager.renderWidgets();
    WidgetManager.showNotification(`${title} widget'ı eklendi`, 'success');

    closeUrlWidgetForm();
}

function saveNoteWidget(event) {
    event.preventDefault();

    const title = document.getElementById('note-widget-title').value;
    const content = document.getElementById('note-widget-content').value;
    const size = document.querySelector('input[name="note-widget-size"]:checked').value;

    const widgetData = {
        id: `widget-${Date.now()}`,
        type: 'note',
        title: title,
        size: size,
        order: WidgetManager.widgets.length,
        content: `<div style="padding: 15px; color: var(--text-primary); white-space: pre-wrap; overflow-y: auto; height: 100%;">${content}</div>`
    };

    WidgetManager.widgets.push(widgetData);
    WidgetManager.saveWidgets();
    WidgetManager.renderWidgets();
    WidgetManager.showNotification(`${title} widget'ı eklendi`, 'success');

    closeNoteWidgetForm();
}

function savePageWidget(event) {
    event.preventDefault();

    const selectedRadio = document.querySelector('input[name="page-widget-page"]:checked');
    if (!selectedRadio) {
        WidgetManager.showNotification('Lütfen bir sayfa seçin', 'error');
        return;
    }

    const pageId = selectedRadio.value;

    // Seçilen radio'nun label'ından bilgileri al
    const label = selectedRadio.closest('label');
    const iconElement = label.querySelector('i.fas');
    const nameElement = label.querySelector('span');

    const title = nameElement ? nameElement.textContent.trim() : pageId;
    const iconClass = iconElement ? iconElement.className.replace('fas ', '').split(' ')[0] : 'fa-file';
    const iconColor = iconElement ? window.getComputedStyle(iconElement).color : '#3B82F6';

    // Dinamik açıklama oluştur
    const pageDescriptions = {
        'dokumanlar': 'Tüm dökümanlarınızı görüntüleyin ve yönetin',
        'backuplar': 'Backup dosyalarını yönetin ve indirin',
        'sertifikalar': 'SSL sertifikalarını takip edin',
        'backup-monitoring': 'Sunucu yedekleme durumunu izleyin',
        'isler': 'Görevleri ve takvimi yönetin',
        'musterisorunlari': 'Müşteri sorunlarını takip edin',
        'faydalilinkler': 'Hızlı erişim linkleri',
        'araclar': 'API yönetimi ve test araçları',
        'guvenlik-dashboard': 'Güvenlik durumunu izleyin',
        'guvenlik-politikalari': 'Güvenlik politikalarını yönetin',
        'kullanicilar': 'Kullanıcı hesaplarını yönetin',
        'ayarlar': 'Sistem ayarlarını yapılandırın'
    };

    const description = pageDescriptions[pageId] || `${title} sayfasına hızlı erişim`;

    // Renk gradyanları
    const colorGradients = [
        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
        'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
        'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
        'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
        'linear-gradient(135deg, #ff6e7f 0%, #bfe9ff 100%)',
        'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
        'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
    ];

    // pageId'den hash oluştur ve renk seç
    const hashCode = pageId.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0);
    const color = colorGradients[Math.abs(hashCode) % colorGradients.length];

    const widgetData = {
        id: `widget-${Date.now()}`,
        type: 'page-shortcut',
        title: title,
        pageId: pageId,
        size: '1x1',
        order: WidgetManager.widgets.length,
        content: `
            <div onclick="showPage('${pageId}'); window.location.hash='${pageId}';"
                 style="width: 100%; height: 100%; background: ${color}; color: white; border-radius: 8px; cursor: pointer; transition: all 0.3s; display: flex; flex-direction: column; padding: 20px; position: relative; overflow: hidden;"
                 onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 12px 24px rgba(0,0,0,0.15)';"
                 onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';">

                <!-- Icon Background -->
                <div style="position: absolute; top: -20px; right: -20px; font-size: 6rem; opacity: 0.15;">
                    <i class="fas ${iconClass}"></i>
                </div>

                <!-- Content -->
                <div style="position: relative; z-index: 1; height: 100%; display: flex; flex-direction: column;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                            <i class="fas ${iconClass}" style="font-size: 1.8rem;"></i>
                            <h4 style="margin: 0; font-size: 1.1rem; font-weight: 600;">${title}</h4>
                        </div>
                        <p style="margin: 0; font-size: 0.85rem; opacity: 0.9; line-height: 1.4;">
                            ${description}
                        </p>
                    </div>

                    <!-- Action Button -->
                    <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.2); margin-top: auto;">
                        <span style="font-size: 0.8rem; opacity: 0.8;">Hızlı Erişim</span>
                        <i class="fas fa-arrow-right" style="font-size: 1rem;"></i>
                    </div>
                </div>
            </div>
        `
    };

    WidgetManager.widgets.push(widgetData);
    WidgetManager.saveWidgets();
    WidgetManager.renderWidgets();
    WidgetManager.showNotification(`${title} kısayolu eklendi`, 'success');

    closePageWidgetForm();
}

function saveClockWidget(event) {
    event.preventDefault();

    const title = document.getElementById('clock-widget-title').value;
    const timezone = document.getElementById('clock-widget-timezone').value;
    const widgetId = `widget-${Date.now()}`;

    const widgetData = {
        id: widgetId,
        type: 'clock',
        title: title,
        timezone: timezone,
        size: '1x1',
        order: WidgetManager.widgets.length,
        content: `
            <div id="${widgetId}-content" style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 8px; padding: 15px;">
                <div style="font-size: 2rem; font-weight: 700; font-family: 'Courier New', monospace; margin-bottom: 8px;" id="${widgetId}-time">--:--:--</div>
                <div style="font-size: 0.9rem; opacity: 0.9;" id="${widgetId}-date">---</div>
                <div style="font-size: 0.75rem; margin-top: 8px; opacity: 0.7;">${timezone === 'tr-TR' ? 'Türkiye' : timezone === 'en-US' ? 'Amerika' : timezone === 'en-GB' ? 'İngiltere' : 'Japonya'}</div>
            </div>
            <script>
                (function() {
                    const widgetId = '${widgetId}';
                    const locale = '${timezone}';

                    function updateClock() {
                        const now = new Date();
                        const timeEl = document.getElementById(widgetId + '-time');
                        const dateEl = document.getElementById(widgetId + '-date');

                        if (timeEl && dateEl) {
                            timeEl.textContent = now.toLocaleTimeString(locale);
                            dateEl.textContent = now.toLocaleDateString(locale, {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            });
                        }
                    }

                    updateClock();
                    setInterval(updateClock, 1000);
                })();
            </script>
        `
    };

    WidgetManager.widgets.push(widgetData);
    WidgetManager.saveWidgets();
    WidgetManager.renderWidgets();
    WidgetManager.showNotification(`${title} eklendi`, 'success');

    closeClockWidgetForm();
}

function saveCountdownWidget(event) {
    event.preventDefault();

    const title = document.getElementById('countdown-widget-title').value;
    const targetDate = document.getElementById('countdown-widget-date').value;
    const widgetId = `widget-${Date.now()}`;

    const widgetData = {
        id: widgetId,
        type: 'countdown',
        title: title,
        targetDate: targetDate,
        size: '1x1',
        order: WidgetManager.widgets.length,
        content: `
            <div style="width: 100%; height: 100%; display: flex; flex-direction: column; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; border-radius: 8px; padding: 15px;">
                <div style="flex: 1; display: flex; flex-direction: column; justify-content: center;">
                    <div id="${widgetId}-countdown" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 10px;">
                        <div style="text-align: center;">
                            <div id="${widgetId}-days" style="font-size: 1.8rem; font-weight: 700; font-family: 'Courier New', monospace;">0</div>
                            <div style="font-size: 0.7rem; opacity: 0.8;">Gün</div>
                        </div>
                        <div style="text-align: center;">
                            <div id="${widgetId}-hours" style="font-size: 1.8rem; font-weight: 700; font-family: 'Courier New', monospace;">0</div>
                            <div style="font-size: 0.7rem; opacity: 0.8;">Saat</div>
                        </div>
                        <div style="text-align: center;">
                            <div id="${widgetId}-minutes" style="font-size: 1.8rem; font-weight: 700; font-family: 'Courier New', monospace;">0</div>
                            <div style="font-size: 0.7rem; opacity: 0.8;">Dakika</div>
                        </div>
                        <div style="text-align: center;">
                            <div id="${widgetId}-seconds" style="font-size: 1.8rem; font-weight: 700; font-family: 'Courier New', monospace;">0</div>
                            <div style="font-size: 0.7rem; opacity: 0.8;">Saniye</div>
                        </div>
                    </div>
                </div>
            </div>
            <script>
                (function() {
                    const widgetId = '${widgetId}';
                    const targetDate = new Date('${targetDate}').getTime();

                    function updateCountdown() {
                        const now = new Date().getTime();
                        const distance = targetDate - now;

                        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
                        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

                        const daysEl = document.getElementById(widgetId + '-days');
                        const hoursEl = document.getElementById(widgetId + '-hours');
                        const minutesEl = document.getElementById(widgetId + '-minutes');
                        const secondsEl = document.getElementById(widgetId + '-seconds');

                        if (daysEl) daysEl.textContent = days > 0 ? days : 0;
                        if (hoursEl) hoursEl.textContent = hours > 0 ? hours : 0;
                        if (minutesEl) minutesEl.textContent = minutes > 0 ? minutes : 0;
                        if (secondsEl) secondsEl.textContent = seconds > 0 ? seconds : 0;

                        if (distance < 0) {
                            if (daysEl) daysEl.textContent = '0';
                            if (hoursEl) hoursEl.textContent = '0';
                            if (minutesEl) minutesEl.textContent = '0';
                            if (secondsEl) secondsEl.textContent = '0';
                        }
                    }

                    updateCountdown();
                    setInterval(updateCountdown, 1000);
                })();
            </script>
        `
    };

    WidgetManager.widgets.push(widgetData);
    WidgetManager.saveWidgets();
    WidgetManager.renderWidgets();
    WidgetManager.showNotification(`${title} geri sayımı eklendi`, 'success');

    closeCountdownWidgetForm();
}

function saveImageWidget(event) {
    event.preventDefault();

    const title = document.getElementById('image-widget-title').value;
    const imageUrl = document.getElementById('image-widget-url').value;
    const size = document.querySelector('input[name="image-widget-size"]:checked').value;

    const widgetData = {
        id: `widget-${Date.now()}`,
        type: 'image',
        title: title,
        imageUrl: imageUrl,
        size: size,
        order: WidgetManager.widgets.length,
        content: `
            <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: var(--bg-secondary); border-radius: 8px; overflow: hidden;">
                <img src="${imageUrl}"
                     alt="${title}"
                     style="max-width: 100%; max-height: 100%; object-fit: contain;"
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div style="display: none; flex-direction: column; align-items: center; justify-content: center; padding: 20px; color: var(--text-secondary);">
                    <i class="fas fa-image" style="font-size: 2rem; margin-bottom: 10px; opacity: 0.5;"></i>
                    <p style="font-size: 0.85rem; text-align: center;">Resim yüklenemedi</p>
                </div>
            </div>
        `
    };

    WidgetManager.widgets.push(widgetData);
    WidgetManager.saveWidgets();
    WidgetManager.renderWidgets();
    WidgetManager.showNotification(`${title} resmi eklendi`, 'success');

    closeImageWidgetForm();
}

/**
 * Sayfa kartları için seçenekleri doldur
 */
function populatePageCardOptions() {
    const container = document.getElementById('page-card-options-container');
    if (!container) {
        console.error('Page card options container not found');
        return;
    }

    // Tüm sayfa kartları tanımlaması
    const pageCards = [
        { id: 'documents', name: 'Dökümanlar', icon: 'fa-file-alt', color: '#3B82F6', description: 'Son dökümanları göster' },
        { id: 'backuplar', name: 'Backuplar', icon: 'fa-database', color: '#10B981', description: 'Backup dosyalarını göster' },
        { id: 'certificates', name: 'Sertifikalar', icon: 'fa-certificate', color: '#F59E0B', description: 'SSL sertifikaları' },
        { id: 'backup-monitoring', name: 'Backup Monitoring', icon: 'fa-server', color: '#8B5CF6', description: 'Sunucu yedekleme durumu' },
        { id: 'tasks', name: 'İşler', icon: 'fa-tasks', color: '#EF4444', description: 'Görevler ve takvim' },
        { id: 'customer-issues', name: 'Müşteri Sorunları', icon: 'fa-headset', color: '#EC4899', description: 'Müşteri sorunları takibi' },
        { id: 'useful-links', name: 'Faydalı Linkler', icon: 'fa-link', color: '#06B6D4', description: 'Hızlı erişim linkleri' },
        { id: 'apis', name: 'API Yönetimi', icon: 'fa-tools', color: '#F97316', description: 'API endpoint yönetimi' },
        { id: 'security-dashboard', name: 'Güvenlik Dashboard', icon: 'fa-shield-alt', color: '#DC2626', description: 'Güvenlik durumu ve ihlaller' }
    ];

    // Radio butonları oluştur
    let html = '';
    pageCards.forEach((page, index) => {
        const isFirst = index === 0 ? 'required' : '';

        html += `
            <label class="page-card-option" style="display: flex; align-items: center; padding: 15px; border: 2px solid var(--border-color); border-radius: 8px; cursor: pointer; transition: all 0.2s; background: var(--bg-secondary);">
                <input type="radio" name="page-card-page" value="${page.id}" ${isFirst} style="margin-right: 15px; width: 20px; height: 20px;">
                <div style="width: 40px; height: 40px; background: ${page.color}; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; margin-right: 15px;">
                    <i class="fas ${page.icon}" style="font-size: 1.2rem;"></i>
                </div>
                <div style="flex: 1;">
                    <div style="color: var(--text-primary); font-weight: 600; font-size: 0.95rem; margin-bottom: 3px;">${page.name}</div>
                    <div style="color: var(--text-secondary); font-size: 0.8rem;">${page.description}</div>
                </div>
            </label>
        `;
    });

    container.innerHTML = html;
    console.log('Page card options populated:', pageCards.length, 'cards');

    // Hover efektleri için CSS ekle
    const style = document.createElement('style');
    style.textContent = `
        .page-card-option:hover {
            border-color: #EF4444 !important;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
        }
        .page-card-option:has(input:checked) {
            border-color: #EF4444 !important;
            background: rgba(239, 68, 68, 0.1) !important;
        }
    `;
    if (!document.getElementById('page-card-options-style')) {
        style.id = 'page-card-options-style';
        document.head.appendChild(style);
    }
}

function closePageCardWidgetForm() {
    document.getElementById('page-card-widget-form-modal').style.display = 'none';
    document.getElementById('page-card-widget-form').reset();
}

function savePageCardWidget(event) {
    event.preventDefault();

    const selectedRadio = document.querySelector('input[name="page-card-page"]:checked');
    if (!selectedRadio) {
        WidgetManager.showNotification('Lütfen bir sayfa seçin', 'error');
        return;
    }

    const pageId = selectedRadio.value;

    // Seçilen kartın bilgilerini al
    const label = selectedRadio.closest('label');
    const iconDiv = label.querySelector('div[style*="background"]');
    const nameDiv = label.querySelector('div[style*="font-weight: 600"]');
    const descDiv = label.querySelector('div[style*="font-size: 0.8rem"]');

    const title = nameDiv ? nameDiv.textContent.trim() : pageId;
    const description = descDiv ? descDiv.textContent.trim() : '';
    const iconElement = iconDiv ? iconDiv.querySelector('i') : null;
    const iconClass = iconElement ? iconElement.className.replace('fas ', '').split(' ')[0] : 'fa-file';
    const color = iconDiv ? window.getComputedStyle(iconDiv).backgroundColor : '#3B82F6';

    // Widget içeriğini oluştur - her sayfa için özel kart
    const widgetContent = createPageCardContent(pageId, title, iconClass, color, description);

    const widgetData = {
        id: `widget-${Date.now()}`,
        type: 'page-card',
        title: title,
        pageId: pageId,
        size: '1x1',
        order: WidgetManager.widgets.length,
        content: widgetContent
    };

    console.log('💾 Saving page card widget:', widgetData);

    WidgetManager.widgets.push(widgetData);
    WidgetManager.saveWidgets();
    WidgetManager.renderWidgets();
    WidgetManager.showNotification(`${title} kartı eklendi`, 'success');

    closePageCardWidgetForm();

    // Kartın dinamik içeriğini yükle
    console.log('⏳ Scheduling loadPageCardData for:', pageId);
    setTimeout(() => {
        console.log('🚀 Calling loadPageCardData now for:', pageId);
        loadPageCardData(pageId, widgetData.id);
    }, 500); // 500ms bekle, widget render olsun
}

/**
 * Her sayfa için özel kart içeriği oluştur
 */
function createPageCardContent(pageId, title, iconClass, color, description) {
    // Her sayfa için temel kart şablonu
    return `
        <div class="page-card-widget" data-page-id="${pageId}" style="height: 100%; display: flex; flex-direction: column; background: var(--card-bg); border-radius: 8px; overflow: hidden;">
            <!-- Kart Başlığı -->
            <div class="card-header" style="padding: 15px; background: ${color}; color: white; display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <i class="fas ${iconClass}" style="font-size: 1.2rem;"></i>
                    <h4 style="margin: 0; font-size: 0.95rem; font-weight: 600;">${title}</h4>
                </div>
                <button onclick="showPage('${pageId === 'backuplar' ? 'backups' : pageId === 'certificates' ? 'certificates' : pageId === 'tasks' ? 'tasks' : pageId === 'customer-issues' ? 'customer-issues' : pageId === 'useful-links' ? 'useful-links' : pageId === 'apis' ? 'tools' : pageId === 'documents' ? 'documents' : pageId === 'security-dashboard' ? 'security-dashboard' : pageId}'); window.location.hash='${pageId === 'backuplar' ? 'backuplar' : pageId === 'security-dashboard' ? 'guvenlik-dashboard' : pageId}';"
                        style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 5px 12px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; transition: all 0.2s;"
                        onmouseover="this.style.background='rgba(255,255,255,0.3)'"
                        onmouseout="this.style.background='rgba(255,255,255,0.2)'">
                    <i class="fas fa-external-link-alt"></i> Tümü
                </button>
            </div>

            <!-- Kart İçeriği -->
            <div id="page-card-content-${pageId}" class="card-body" style="flex: 1; padding: 15px; overflow-y: auto; color: var(--text-primary);">
                <div style="text-align: center; padding: 20px; color: var(--text-secondary);">
                    <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 10px;"></i>
                    <p style="margin: 0; font-size: 0.85rem;">Yükleniyor...</p>
                </div>
            </div>
        </div>
    `;
}

/**
 * Sayfa kartı için dinamik veri yükle
 */
function loadPageCardData(pageId, widgetId) {
    console.log('🎯 loadPageCardData called for pageId:', pageId, 'widgetId:', widgetId);

    const container = document.getElementById(`page-card-content-${pageId}`);
    if (!container) {
        console.error('❌ Page card container not found:', pageId);
        console.log('Available elements:', document.querySelectorAll('[id*="page-card-content"]'));
        return;
    }

    console.log('✅ Container found, loading data for:', pageId);

    // Her sayfa için özel veri yükleme
    switch(pageId) {
        case 'documents':
            loadDocumentsCardData(container);
            break;
        case 'certificates':
            loadCertificatesCardData(container);
            break;
        case 'tasks':
            loadTasksCardData(container);
            break;
        case 'customer-issues':
            loadCustomerIssuesCardData(container);
            break;
        case 'useful-links':
            loadUsefulLinksCardData(container);
            break;
        case 'apis':
            loadApisCardData(container);
            break;
        case 'backup-monitoring':
            loadBackupMonitoringCardData(container);
            break;
        case 'backuplar':
            loadBackupsCardData(container);
            break;
        case 'security-dashboard':
            loadSecurityDashboardCardData(container);
            break;
        default:
            container.innerHTML = `
                <div style="text-align: center; padding: 20px; color: var(--text-secondary);">
                    <i class="fas fa-info-circle" style="font-size: 2rem; margin-bottom: 10px;"></i>
                    <p style="margin: 0; font-size: 0.85rem;">Bu sayfa için kart desteği yakında eklenecek</p>
                </div>
            `;
    }
}

// Kart veri yükleme fonksiyonları
function loadDocumentsCardData(container) {
    fetch('get-documents.php?mode=tree')
        .then(res => res.json())
        .then(data => {
            const docs = data.documents || [];
            const allFiles = getAllFilesFromDocs(docs).slice(0, 5);

            if (allFiles.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); font-size: 0.85rem; padding: 20px;">Henüz döküman yok</p>';
                return;
            }

            let html = '<div style="display: flex; flex-direction: column; gap: 8px;">';
            allFiles.forEach(file => {
                const icon = getFileIcon(file.type);
                html += `
                    <div onclick="DocMgmt.previewDocument('${file.id}')" style="padding: 10px; background: var(--bg-secondary); border-radius: 6px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 10px;"
                         onmouseover="this.style.background='var(--hover-bg)'" onmouseout="this.style.background='var(--bg-secondary)'">
                        <i class="fas ${icon}" style="color: #3B82F6; font-size: 1.1rem;"></i>
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-size: 0.85rem; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${file.name}</div>
                            <div style="font-size: 0.75rem; color: var(--text-secondary);">${file.size || ''}</div>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            container.innerHTML = html;
        })
        .catch(err => {
            container.innerHTML = `<p style="text-align: center; color: #EF4444; font-size: 0.85rem;">Yükleme hatası</p>`;
        });
}

function getAllFilesFromDocs(items) {
    let files = [];
    items.forEach(item => {
        if (item.isDirectory && Array.isArray(item.children)) {
            files = files.concat(getAllFilesFromDocs(item.children));
        } else if (!item.isDirectory) {
            files.push(item);
        }
    });
    return files;
}

function getFileIcon(type) {
    const icons = {
        'pdf': 'fa-file-pdf', 'doc': 'fa-file-word', 'docx': 'fa-file-word',
        'xls': 'fa-file-excel', 'xlsx': 'fa-file-excel', 'txt': 'fa-file-alt',
        'jpg': 'fa-file-image', 'jpeg': 'fa-file-image', 'png': 'fa-file-image'
    };
    return icons[type] || 'fa-file';
}

function loadCertificatesCardData(container) {
    fetch('get-certificates.php')
        .then(res => res.json())
        .then(data => {
            const certs = (data.certificates || []).slice(0, 5);

            if (certs.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); font-size: 0.85rem; padding: 20px;">Henüz sertifika yok</p>';
                return;
            }

            let html = '<div style="display: flex; flex-direction: column; gap: 8px;">';
            certs.forEach(cert => {
                const daysLeft = parseInt(cert.days_until_expiry);
                const statusColor = daysLeft < 30 ? '#EF4444' : daysLeft < 90 ? '#F59E0B' : '#10B981';

                html += `
                    <div style="padding: 10px; background: var(--bg-secondary); border-radius: 6px; border-left: 3px solid ${statusColor};">
                        <div style="font-size: 0.85rem; font-weight: 500; margin-bottom: 3px;">${cert.domain}</div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary);">${daysLeft} gün kaldı</div>
                    </div>
                `;
            });
            html += '</div>';
            container.innerHTML = html;
        })
        .catch(err => {
            container.innerHTML = `<p style="text-align: center; color: #EF4444; font-size: 0.85rem;">Yükleme hatası</p>`;
        });
}

function loadTasksCardData(container) {
    fetch('get-tasks.php')
        .then(res => res.json())
        .then(data => {
            const tasks = (data.tasks || []).filter(t => t.status !== 'completed').slice(0, 5);

            if (tasks.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); font-size: 0.85rem; padding: 20px;">Aktif görev yok</p>';
                return;
            }

            let html = '<div style="display: flex; flex-direction: column; gap: 8px;">';
            tasks.forEach(task => {
                const priorityColors = { high: '#EF4444', medium: '#F59E0B', low: '#10B981' };
                const priorityColor = priorityColors[task.priority] || '#6B7280';

                html += `
                    <div style="padding: 10px; background: var(--bg-secondary); border-radius: 6px; border-left: 3px solid ${priorityColor};">
                        <div style="font-size: 0.85rem; font-weight: 500;">${task.title}</div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 3px;">${task.due_date || 'Tarih yok'}</div>
                    </div>
                `;
            });
            html += '</div>';
            container.innerHTML = html;
        })
        .catch(err => {
            container.innerHTML = `<p style="text-align: center; color: #EF4444; font-size: 0.85rem;">Yükleme hatası</p>`;
        });
}

function loadCustomerIssuesCardData(container) {
    fetch('get-customer-issues.php')
        .then(res => res.json())
        .then(data => {
            const issues = (data.issues || []).filter(i => i.status === 'open').slice(0, 5);

            if (issues.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); font-size: 0.85rem; padding: 20px;">Açık sorun yok</p>';
                return;
            }

            let html = '<div style="display: flex; flex-direction: column; gap: 8px;">';
            issues.forEach(issue => {
                html += `
                    <div style="padding: 10px; background: var(--bg-secondary); border-radius: 6px; cursor: pointer;" onclick="showCustomerIssueDetails(${issue.id})">
                        <div style="font-size: 0.85rem; font-weight: 500;">${issue.title}</div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 3px;">${issue.customer} · ${issue.date}</div>
                    </div>
                `;
            });
            html += '</div>';
            container.innerHTML = html;
        })
        .catch(err => {
            container.innerHTML = `<p style="text-align: center; color: #EF4444; font-size: 0.85rem;">Yükleme hatası</p>`;
        });
}

function loadUsefulLinksCardData(container) {
    fetch('get-links.php')
        .then(res => res.json())
        .then(data => {
            const links = (data.links || []).slice(0, 5);

            if (links.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); font-size: 0.85rem; padding: 20px;">Henüz link yok</p>';
                return;
            }

            let html = '<div style="display: flex; flex-direction: column; gap: 8px;">';
            links.forEach(link => {
                html += `
                    <a href="${link.url}" target="_blank" style="padding: 10px; background: var(--bg-secondary); border-radius: 6px; text-decoration: none; color: var(--text-primary); display: block; transition: all 0.2s;"
                       onmouseover="this.style.background='var(--hover-bg)'" onmouseout="this.style.background='var(--bg-secondary)'">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <i class="fas fa-link" style="color: #06B6D4;"></i>
                            <div style="flex: 1; font-size: 0.85rem; font-weight: 500;">${link.title}</div>
                            <i class="fas fa-external-link-alt" style="font-size: 0.7rem; color: var(--text-secondary);"></i>
                        </div>
                    </a>
                `;
            });
            html += '</div>';
            container.innerHTML = html;
        })
        .catch(err => {
            container.innerHTML = `<p style="text-align: center; color: #EF4444; font-size: 0.85rem;">Yükleme hatası</p>`;
        });
}

function loadApisCardData(container) {
    fetch('get-apis.php')
        .then(res => res.json())
        .then(data => {
            const apis = (data.apis || []).slice(0, 5);

            if (apis.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); font-size: 0.85rem; padding: 20px;">Henüz API yok</p>';
                return;
            }

            let html = '<div style="display: flex; flex-direction: column; gap: 8px;">';
            apis.forEach(api => {
                const methodColors = { GET: '#10B981', POST: '#3B82F6', PUT: '#F59E0B', DELETE: '#EF4444' };
                const methodColor = methodColors[api.method] || '#6B7280';

                html += `
                    <div style="padding: 10px; background: var(--bg-secondary); border-radius: 6px; cursor: pointer;" onclick="testApi(${api.id})">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 3px;">
                            <span style="background: ${methodColor}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 600;">${api.method}</span>
                            <span style="font-size: 0.85rem; font-weight: 500;">${api.name}</span>
                        </div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary); font-family: monospace;">${api.endpoint}</div>
                    </div>
                `;
            });
            html += '</div>';
            container.innerHTML = html;
        })
        .catch(err => {
            container.innerHTML = `<p style="text-align: center; color: #EF4444; font-size: 0.85rem;">Yükleme hatası</p>`;
        });
}

function loadBackupMonitoringCardData(container) {
    fetch('get-backup-status.php')
        .then(res => res.json())
        .then(data => {
            const servers = (data.servers || []).slice(0, 5);

            if (servers.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); font-size: 0.85rem; padding: 20px;">Sunucu bulunamadı</p>';
                return;
            }

            let html = '<div style="display: flex; flex-direction: column; gap: 8px;">';
            servers.forEach(server => {
                const statusColor = server.status === 'success' ? '#10B981' : server.status === 'warning' ? '#F59E0B' : '#EF4444';

                html += `
                    <div style="padding: 10px; background: var(--bg-secondary); border-radius: 6px; border-left: 3px solid ${statusColor};">
                        <div style="font-size: 0.85rem; font-weight: 500;">${server.name}</div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 3px;">${server.last_backup || 'Yedek yok'}</div>
                    </div>
                `;
            });
            html += '</div>';
            container.innerHTML = html;
        })
        .catch(err => {
            container.innerHTML = `<p style="text-align: center; color: #EF4444; font-size: 0.85rem;">Yükleme hatası</p>`;
        });
}

function loadBackupsCardData(container) {
    console.log('🔄 Loading backups card data...');

    fetch('get-backups.php?limit=5&sort=date_desc')
        .then(res => {
            console.log('✅ Backups API response received:', res.status);
            return res.json();
        })
        .then(data => {
            console.log('📦 Backups data:', data);
            const backups = data.files || [];

            if (backups.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); font-size: 0.85rem; padding: 20px;">Henüz backup yok</p>';
                return;
            }

            let html = '<div style="display: flex; flex-direction: column; gap: 8px;">';
            backups.forEach(backup => {
                const categoryColors = {
                    'TestSite1': '#3B82F6',
                    'Örnek Müşteri A': '#10B981',
                    'TestSite2': '#F59E0B',
                    'AnsibleProd': '#8B5CF6',
                    'Other': '#6B7280'
                };
                const categoryColor = categoryColors[backup.category] || '#6B7280';

                // Field name is 'name' not 'file_name' in API response
                const fileName = backup.name || backup.file_name || 'Unnamed';
                const fileSize = backup.size_formatted || backup.file_size_formatted || '';

                html += `
                    <div style="padding: 10px; background: var(--bg-secondary); border-radius: 6px; border-left: 3px solid ${categoryColor}; cursor: pointer;" onclick="downloadBackup('${backup.id}')">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 3px;">
                            <i class="fas fa-file-archive" style="color: ${categoryColor}; font-size: 1rem;"></i>
                            <span style="font-size: 0.85rem; font-weight: 500; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${fileName}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-secondary);">
                            <span>${backup.category || 'N/A'}</span>
                            <span>${fileSize}</span>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            container.innerHTML = html;
            console.log('✅ Backups card rendered successfully');
        })
        .catch(err => {
            console.error('❌ Backup yükleme hatası:', err);
            container.innerHTML = `<p style="text-align: center; color: #EF4444; font-size: 0.85rem;">Yükleme hatası: ${err.message}</p>`;
        });
}

function loadSecurityDashboardCardData(container) {
    console.log('🔄 Loading security dashboard card data...');

    // Güvenlik istatistiklerini yükle
    fetch('get-security-stats.php')
        .then(res => {
            console.log('✅ Security API response received:', res.status);
            return res.json();
        })
        .then(data => {
            console.log('🛡️ Security data:', data);
            const blockedIPs = data.blocked_ips_count || 0;
            const blockedUsers = data.blocked_users_count || 0;
            const recentAttempts = data.recent_failed_attempts || 0;
            const criticalAlerts = data.critical_alerts || 0;

            let html = `
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <!-- Özet İstatistikler -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div style="padding: 12px; background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); border-radius: 6px; color: white; text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: 700;">${blockedIPs}</div>
                            <div style="font-size: 0.75rem; opacity: 0.9;">Engelli IP</div>
                        </div>
                        <div style="padding: 12px; background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); border-radius: 6px; color: white; text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: 700;">${blockedUsers}</div>
                            <div style="font-size: 0.75rem; opacity: 0.9;">Kilitli Kullanıcı</div>
                        </div>
                    </div>

                    <!-- Son Aktiviteler -->
                    <div style="padding: 10px; background: var(--bg-secondary); border-radius: 6px; border-left: 3px solid #EF4444;">
                        <div style="font-size: 0.85rem; font-weight: 500; margin-bottom: 3px;">
                            <i class="fas fa-exclamation-triangle"></i> Son 24 Saat
                        </div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary);">
                            ${recentAttempts} başarısız giriş denemesi
                        </div>
                    </div>
            `;

            // Kritik uyarılar varsa göster
            if (criticalAlerts > 0) {
                html += `
                    <div style="padding: 10px; background: rgba(239, 68, 68, 0.1); border-radius: 6px; border-left: 3px solid #EF4444;">
                        <div style="font-size: 0.85rem; font-weight: 600; color: #EF4444;">
                            <i class="fas fa-shield-alt"></i> ${criticalAlerts} Kritik Uyarı
                        </div>
                    </div>
                `;
            }

            html += '</div>';
            container.innerHTML = html;
            console.log('✅ Security card rendered successfully');
        })
        .catch(err => {
            console.error('❌ Güvenlik verileri yükleme hatası:', err);
            // Hata durumunda basit istatistikler göster
            container.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <div style="text-align: center; padding: 20px; color: var(--text-secondary);">
                        <i class="fas fa-shield-alt" style="font-size: 2rem; margin-bottom: 10px; color: #DC2626;"></i>
                        <p style="margin: 0; font-size: 0.85rem;">Güvenlik durumu izleniyor</p>
                        <p style="margin-top: 5px; font-size: 0.75rem; color: #EF4444;">${err.message}</p>
                    </div>
                </div>
            `;
        });
}

// Helper function for downloading backups from widget
function downloadBackup(backupId) {
    window.location.href = `download-backup.php?id=${backupId}`;
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

window.WidgetManager = WidgetManager;
window.openAddWidgetModal = openAddWidgetModal;
window.closeAddWidgetModal = closeAddWidgetModal;
window.selectWidgetType = selectWidgetType;
window.closeUrlWidgetForm = closeUrlWidgetForm;
window.closeNoteWidgetForm = closeNoteWidgetForm;
window.closePageWidgetForm = closePageWidgetForm;
window.closeClockWidgetForm = closeClockWidgetForm;
window.closeCountdownWidgetForm = closeCountdownWidgetForm;
window.closeImageWidgetForm = closeImageWidgetForm;
window.saveUrlWidget = saveUrlWidget;
window.saveNoteWidget = saveNoteWidget;
window.savePageWidget = savePageWidget;
window.saveClockWidget = saveClockWidget;
window.saveCountdownWidget = saveCountdownWidget;
window.saveImageWidget = saveImageWidget;
window.closePageCardWidgetForm = closePageCardWidgetForm;
window.savePageCardWidget = savePageCardWidget;
window.loadPageCardData = loadPageCardData;
window.downloadBackup = downloadBackup;
window.resizeWidget = resizeWidget;
window.deleteWidget = deleteWidget;

console.log('✅ WidgetManagement.js loaded - All widget types available (including page cards)');
