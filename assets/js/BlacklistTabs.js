// ============================================================================
// BLACKLIST YÖNETIMI - Navigation & Tab Switching
// ============================================================================

console.log('📋 Blacklist Yönetimi JavaScript yüklendi');

const BLACKLIST_TABS = {
    cyberwebeyeos:   { color: '#3498db', contentId: 'cyberwebeyeos-blacklist-content'   },
};

function switchBlacklistTab(tab) {
    const cfg = BLACKLIST_TABS[tab];
    if (!cfg) return;

    // Tüm tab butonlarını pasif yap
    document.querySelectorAll('.blacklist-tab-btn').forEach(btn => {
        btn.style.background = '#ecf0f1';
        btn.style.color = '#7f8c8d';
        btn.classList.remove('active');
    });

    // Tüm içerikleri gizle
    document.querySelectorAll('.blacklist-tab-content').forEach(el => {
        el.style.display = 'none';
    });

    // Aktif tab'ı göster
    const activeBtn = document.querySelector(`[data-tab="${tab}"]`);
    if (activeBtn) {
        activeBtn.style.background = cfg.color;
        activeBtn.style.color = 'white';
        activeBtn.classList.add('active');
    }

    const content = document.getElementById(cfg.contentId);
    if (content) content.style.display = 'block';

    console.log(`✅ Blacklist tab: ${tab}`);
}

// Note: Hash navigation handled by main.js
