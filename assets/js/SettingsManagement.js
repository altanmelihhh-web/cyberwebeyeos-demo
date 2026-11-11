/**
 * System Settings Management
 * Handles loading, updating, and managing all system settings
 */

class SettingsManager {
    constructor() {
        this.settings = {};
        this.init();
    }

    async init() {
        console.log('Settings Manager initializing...');
        await this.loadSettings();
        this.setupEventListeners();
        this.setupTabNavigation();
        this.setupChangeListeners();
    }

    async loadSettings() {
        try {
            const response = await fetch('get-settings.php');
            const data = await response.json();

            if (data.success) {
                this.settings = data.settings;
                this.populateFormFields();
                this.applySettings();
                console.log('Settings loaded:', data.count, 'settings');
            } else {
                console.error('Failed to load settings:', data.message);
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    populateFormFields() {
        Object.keys(this.settings).forEach(key => {
            const value = this.settings[key].value;
            const element = document.getElementById(key);

            if (!element) return;

            if (element.type === 'checkbox') {
                element.checked = value === '1' || value === 'true';
            } else if (element.type === 'radio') {
                if (element.value === value) {
                    element.checked = true;
                }
            } else if (element.tagName === 'SELECT') {
                element.value = value;
            } else if (element.tagName === 'TEXTAREA') {
                element.value = value;
            } else {
                element.value = value;
            }
        });
    }

    setupEventListeners() {
        const saveAllBtn = document.getElementById('save-all-settings');
        if (saveAllBtn) {
            saveAllBtn.addEventListener('click', () => this.saveAllSettings());
        }

        const saveButtons = document.querySelectorAll('#settings-page .submit-btn');
        saveButtons.forEach(btn => {
            if (btn.id !== 'save-all-settings') {
                btn.addEventListener('click', (e) => {
                    const tabContent = e.target.closest('.tab-content');
                    if (tabContent) {
                        this.saveTabSettings(tabContent);
                    }
                });
            }
        });
    }

    setupTabNavigation() {
        const tabs = document.querySelectorAll('#settings-page .tab');
        const tabContents = document.querySelectorAll('#settings-page .tab-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tabContents.forEach(tc => tc.style.display = 'none');

                tab.classList.add('active');

                const tabId = tab.getAttribute('data-tab');
                const content = document.getElementById(tabId);
                if (content) {
                    content.style.display = 'block';
                }
                if (tabId === 'integration-settings' && typeof initZabbixSettings === 'function') {
                    initZabbixSettings();
                }
            });
        });
    }

    async saveAllSettings() {
        const allSettings = this.collectAllSettings();
        await this.saveSettings(allSettings, 'Tum ayarlar');
    }

    async saveTabSettings(tabContent) {
        const settings = this.collectSettingsFromElement(tabContent);
        const tabName = tabContent.id.replace('-settings', '');
        await this.saveSettings(settings, tabName);
    }

    collectAllSettings() {
        const settingsPage = document.getElementById('settings-page');
        return this.collectSettingsFromElement(settingsPage);
    }

    collectSettingsFromElement(element) {
        const settings = {};
        const inputs = element.querySelectorAll('input, select, textarea');

        inputs.forEach(input => {
            if (!input.id) return;

            let value;

            if (input.type === 'checkbox') {
                value = input.checked ? '1' : '0';
            } else if (input.type === 'radio') {
                if (input.checked) {
                    value = input.value;
                } else {
                    return;
                }
            } else {
                value = input.value;
            }

            settings[input.id] = value;
        });

        return settings;
    }

    async saveSettings(settings, contextName = 'Ayarlar') {
        try {
            const response = await fetch('save-settings.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ settings })
            });

            const data = await response.json();

            if (data.success) {
                this.showNotification(contextName + ' basariyla kaydedildi!', 'success');
                await this.loadSettings();
            } else {
                this.showNotification('Hata: ' + data.message, 'error');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showNotification('Ayarlar kaydedilirken bir hata olustu', 'error');
        }
    }

    showNotification(message, type = 'success') {
        const bgColor = type === 'success' ? '#10B981' : '#EF4444';

        const notification = document.createElement('div');
        notification.className = 'notification notification-' + type;
        notification.textContent = message;
        notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: ' + bgColor + '; color: white; padding: 15px 25px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 10000; animation: slideIn 0.3s ease;';

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    getSetting(key) {
        return this.settings[key] ? this.settings[key].value : null;
    }

    getSettingsByCategory(category) {
        return Object.keys(this.settings)
            .filter(key => this.settings[key].category === category)
            .reduce((obj, key) => {
                obj[key] = this.settings[key].value;
                return obj;
            }, {});
    }

    applySettings() {
        const theme = this.getSetting('theme-select');
        if (theme) {
            localStorage.setItem('theme', theme);
            if (typeof applyTheme === 'function') applyTheme(theme);
            if (typeof updateThemeUI === 'function') updateThemeUI(theme);
        }

        const language = this.getSetting('language-select');
        if (language) {
            document.documentElement.lang = language;
            console.log('Language set to:', language);
        }

        const dateFormat = this.getSetting('date-format');
        if (dateFormat) {
            window.dateFormat = dateFormat;
            console.log('Date format set to:', dateFormat);
        }

        const rowsPerPage = this.getSetting('rows-per-page');
        if (rowsPerPage) {
            window.rowsPerPage = parseInt(rowsPerPage);
            console.log('Rows per page set to:', rowsPerPage);
        }

        console.log('All settings applied');
    }

    setupChangeListeners() {
        const themeSelect = document.getElementById('theme-select');
        if (themeSelect) {
            themeSelect.addEventListener('change', (e) => {
                const newTheme = e.target.value;
                localStorage.setItem('theme', newTheme);
                if (typeof applyTheme === 'function') applyTheme(newTheme);
                if (typeof updateThemeUI === 'function') updateThemeUI(newTheme);
            });
        }
    }
}

let settingsManager;
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize SettingsManager if settings page exists
    if (document.getElementById('settings-page')) {
        settingsManager = new SettingsManager();
    }
});

// Add animation styles only if not already present
if (!document.getElementById('settings-animations')) {
    const animationStyle = document.createElement('style');
    animationStyle.id = 'settings-animations';
    animationStyle.textContent = '@keyframes slideIn { from { transform: translateX(400px); opacity: 0; } to { transform: translateX(0); opacity: 1; } } @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(400px); opacity: 0; } }';
    document.head.appendChild(animationStyle);
}

console.log('SettingsManagement.js loaded');
