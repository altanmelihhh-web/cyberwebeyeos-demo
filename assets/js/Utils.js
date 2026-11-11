// ============================================================================
// UTILS - Yardımcı Fonksiyonlar
// ============================================================================

console.log('🛠️ Utils.js yükleniyor...');

/**
 * HTML karakterlerini escape eder (XSS koruması)
 */
function escapeHtml(text) {
  if (!text && text !== 0) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

/**
 * Tarihi YYYY-MM-DD formatında döndürür
 */
function formatDateForInput(date) {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Tarihi güzel formatta gösterir (DD.MM.YYYY)
 */
function formatDateDisplay(date) {
  if (!date) return '';
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

/**
 * Bir sonraki tarihi hesaplar (periyodik işler için)
 */
function calculateNextDate(dateStr, interval, unit) {
  const date = new Date(dateStr);

  switch (unit) {
    case 'day':
      date.setDate(date.getDate() + interval);
      break;
    case 'week':
      date.setDate(date.getDate() + (interval * 7));
      break;
    case 'month':
      date.setMonth(date.getMonth() + interval);
      break;
    case 'year':
      date.setFullYear(date.getFullYear() + interval);
      break;
    default:
      date.setDate(date.getDate() + interval);
  }

  return formatDateForInput(date);
}

/**
 * İki tarih arasındaki gün farkını hesaplar
 */
function daysBetween(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2 - d1);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Bugünün tarihini döndürür (YYYY-MM-DD)
 */
function getToday() {
  return formatDateForInput(new Date());
}

/**
 * Dosya boyutunu human-readable formata çevirir
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * String'i truncate eder (kırpma)
 */
function truncate(str, length = 50) {
  if (!str) return '';
  if (str.length <= length) return str;
  return str.substring(0, length) + '...';
}

/**
 * Debounce fonksiyonu (arama için)
 */
function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Toast notification gösterir
 * @param {string} message - Gösterilecek mesaj
 * @param {string} type - success, error, warning, info
 * @param {number} duration - Gösterim süresi (ms), default 4000
 */
function showNotification(message, type = 'info', duration = 4000) {
  // Eski notification varsa kaldır
  const existing = document.getElementById('global-notification');
  if (existing) {
    existing.remove();
  }

  // Icon seç
  const icons = {
    success: 'fa-check-circle',
    error: 'fa-times-circle',
    warning: 'fa-exclamation-triangle',
    info: 'fa-info-circle'
  };

  const colors = {
    success: '#27ae60',
    error: '#e74c3c',
    warning: '#f39c12',
    info: '#3498db'
  };

  const bgColors = {
    success: '#d4edda',
    error: '#f8d7da',
    warning: '#fff3cd',
    info: '#d1ecf1'
  };

  // Toast elementi oluştur
  const toast = document.createElement('div');
  toast.id = 'global-notification';
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    min-width: 300px;
    max-width: 500px;
    background: ${bgColors[type] || bgColors.info};
    color: #2c3e50;
    padding: 16px 20px;
    border-radius: 8px;
    border-left: 4px solid ${colors[type] || colors.info};
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    font-size: 14px;
    line-height: 1.5;
    animation: slideInRight 0.3s ease-out;
    display: flex;
    align-items: start;
    gap: 12px;
  `;

  toast.innerHTML = `
    <i class="fas ${icons[type] || icons.info}" style="color: ${colors[type] || colors.info}; font-size: 20px; margin-top: 2px;"></i>
    <div style="flex: 1;">${message}</div>
    <button onclick="this.parentElement.remove()" style="background: none; border: none; color: #7f8c8d; cursor: pointer; font-size: 18px; padding: 0; margin-left: 8px;">
      <i class="fas fa-times"></i>
    </button>
  `;

  // CSS animation ekle (eğer yoksa)
  if (!document.getElementById('notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
      @keyframes slideInRight {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOutRight {
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
  }

  document.body.appendChild(toast);

  // Otomatik kapat
  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.animation = 'slideOutRight 0.3s ease-in';
      setTimeout(() => {
        if (toast.parentElement) {
          toast.remove();
        }
      }, 300);
    }
  }, duration);
}

// Global export
window.escapeHtml = escapeHtml;
window.formatDateForInput = formatDateForInput;
window.formatDateDisplay = formatDateDisplay;
window.calculateNextDate = calculateNextDate;
window.daysBetween = daysBetween;
window.getToday = getToday;
window.formatFileSize = formatFileSize;
window.truncate = truncate;
window.debounce = debounce;
window.showNotification = showNotification;

console.log('✅ Utils.js yüklendi');
