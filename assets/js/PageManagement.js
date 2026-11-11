// Cyberwebeyeos - Main JavaScript File

// ========================================
// 1. SAYFA YÖNETIMI (Page Management)
// ========================================

// Function to show the selected page
function showPage(pageId) {
  console.log("🚀 showPage called with: " + pageId);
  
  // Hide all content pages
  const contentPages = document.querySelectorAll('.content-page');
  contentPages.forEach(page => {
    page.style.display = 'none';
  });
  
  // Show the selected page
  const selectedPage = document.getElementById(pageId + '-page');
  if (selectedPage) {
    selectedPage.style.display = 'block';
    console.log("Showing page: " + pageId);
  } else {
    console.error("Page not found: " + pageId);
  }
  
  // Update active state in sidebar
  const menuItems = document.querySelectorAll('.sidebar-menu a');
  menuItems.forEach(item => {
    item.classList.remove('active');
  });
  
  // Find and mark the clicked menu item as active
  const activeMenuItem = document.querySelector(`.sidebar-menu a[onclick="showPage('${pageId}')"]`);
  if (activeMenuItem) {
    activeMenuItem.classList.add('active');
  }
  
  // If dashboard page is shown, load dashboard certificates
  if (pageId === 'dashboard') {
    loadDashboardCertificates();
    loadLinks(); // Dashboard için linkler
    loadDashboardTasks(); // Dashboard için isler
  }
  
  // If documents page is shown, load documents via DocMgmt
  if (pageId === 'documents') {
    if (window.DocMgmt) DocMgmt.loadDocuments();
    else if (typeof loadDocuments === 'function') loadDocuments();
  }
  
  // If certificates page is shown, load certificates
  if (pageId === 'certificates') {
    loadCertificates();
  }

  // If tools (API) page is shown, load APIs
  if (pageId === 'tools') {
    console.log('🔌 Tools sayfası açıldı, API\'ler yükleniyor...');
    if (typeof loadApis === 'function') {
      console.log('✅ loadApis fonksiyonu bulundu');
      loadApis();
    } else {
      console.error('❌ loadApis fonksiyonu bulunamadı! Tip:', typeof loadApis);
    }
  }
  
  // If useful-links page is shown, load links
  if (pageId === 'useful-links') {
    loadLinks();
    console.log("Useful Links page shown - loadLinks called");
    // Sayfa için event listener'lari ekle
    setTimeout(setupPageEventListeners, 300);
  }
  
  // If tasks page is shown, load tasks
  if (pageId === 'tasks') {
    loadTasksPage();
  }

  // If cihazlar (devices) page is shown, load devices
  if (pageId === 'cihazlar') {
    console.log('🖥️ Cihazlar sayfası açıldı, cihazlar yükleniyor...');
    console.log('🔍 loadDevices tipi:', typeof loadDevices);
    if (typeof loadDevices === 'function') {
      console.log('✅ loadDevices fonksiyonu bulundu, çağrılıyor...');
      loadDevices();
    } else {
      console.error('❌ loadDevices fonksiyonu bulunamadı!');
    }
  }

  // If haritalar (maps) page is shown, load maps
  if (pageId === 'haritalar') {
    console.log('🗺️ Haritalar sayfası açıldı, haritalar yükleniyor...');
    console.log('🔍 loadMaps tipi:', typeof loadMaps);
    if (typeof loadMaps === 'function') {
      console.log('✅ loadMaps fonksiyonu bulundu, çağrılıyor...');
      loadMaps();
    } else {
      console.error('❌ loadMaps fonksiyonu bulunamadı!');
    }
  }

  // If alerts page is shown, load alerts and ensure visibility
  if (pageId === 'alerts') {
    console.log('🔔 Alerts sayfası açıldı, alerts yükleniyor...');
    console.log('🔍 loadAlerts tipi:', typeof loadAlerts);
    if (typeof loadAlerts === 'function') {
      console.log('✅ loadAlerts fonksiyonu bulundu, çağrılıyor...');
      loadAlerts();
    } else {
      console.error('❌ loadAlerts fonksiyonu bulunamadı!');
    }

    // Kısa bir gecikme ile tekrar kontrol et (başka scriptler sayfayı kapatabilir)
    setTimeout(() => {
      const alertsPage = document.getElementById('alerts-page');
      if (alertsPage && window.getComputedStyle(alertsPage).display === 'none') {
        console.warn('⚠️ Alerts sayfası kapatılmış, tekrar açılıyor...');
        alertsPage.style.display = 'block';
      }
    }, 100);

    setTimeout(() => {
      const alertsPage = document.getElementById('alerts-page');
      if (alertsPage && window.getComputedStyle(alertsPage).display === 'none') {
        console.warn('⚠️ Alerts sayfası tekrar kapatılmış, düzeltiliyor...');
        alertsPage.style.display = 'block';
      }
    }, 500);
  }

  // If blacklist-yonetimi page is shown, ensure visibility
  if (pageId === 'blacklist-yonetimi') {
    console.log('🚫 Blacklist Yönetimi sayfası açıldı');
    console.log('📋 Blacklist page element:', document.getElementById('blacklist-yonetimi-page'));

    // Sayfa görünürlüğünü kontrol et
    setTimeout(() => {
      const blacklistPage = document.getElementById('blacklist-yonetimi-page');
      if (blacklistPage) {
        const displayStyle = window.getComputedStyle(blacklistPage).display;
        console.log('📊 Blacklist page display style:', displayStyle);

        if (displayStyle === 'none') {
          console.warn('⚠️ Blacklist sayfası gizli, tekrar gösteriliyor...');
          blacklistPage.style.display = 'block';
        } else {
          console.log('✅ Blacklist sayfası görünür');
        }

        // İframe'leri kontrol et
        const cyberwebeyeosFrame = document.getElementById('cyberwebeyeos-blacklist-frame');
        console.log('🖼️ Cyberwebeyeos iframe:', cyberwebeyeosFrame);
      } else {
        console.error('❌ Blacklist sayfası elementi bulunamadı!');
      }
    }, 100);

    // İkinci kontrol
    setTimeout(() => {
      const blacklistPage = document.getElementById('blacklist-yonetimi-page');
      if (blacklistPage && window.getComputedStyle(blacklistPage).display === 'none') {
        console.error('❌ Blacklist sayfası hala gizli, zorla gösteriliyor!');
        blacklistPage.style.display = 'block';
      }
    }, 500);
  }

  // If IPAM page is shown, load IP addresses
  if (pageId === 'ipam') {
    console.log('🌐 IPAM sayfası açıldı, IP adresleri yükleniyor...');
    if (typeof loadIpAddresses === 'function') {
      console.log('✅ loadIpAddresses fonksiyonu bulundu, çağrılıyor...');
      loadIpAddresses();
    } else {
      console.error('❌ loadIpAddresses fonksiyonu bulunamadı!');
    }

    // Sayfa görünürlüğünü kontrol et
    setTimeout(() => {
      const ipamPage = document.getElementById('ipam-page');
      if (ipamPage && window.getComputedStyle(ipamPage).display === 'none') {
        console.warn('⚠️ IPAM sayfası gizli, tekrar gösteriliyor...');
        ipamPage.style.display = 'block';
      }
    }, 100);
  }

  // If F5 Operations page is shown, load nodes and pools
  if (pageId === 'f5-operations') {
    console.log('🔧 F5 Operations sayfası açıldı');
    if (typeof f5LoadNodes === 'function') f5LoadNodes();
    if (typeof f5LoadPools === 'function') f5LoadPools();
  }

  // If Audit Log page is shown, load audit logs
  if (pageId === 'audit-log') {
    if (typeof loadAuditLogs === 'function') loadAuditLogs();
  }
}

console.log('✅ PageManagement.js yüklendi - showPage() fonksiyonu tanımlandı');
