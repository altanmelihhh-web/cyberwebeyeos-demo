// ============================================================================
// USER MANAGEMENT - Kullanıcı Yönetimi
// ============================================================================

console.log('👤 UserManagement.js yükleniyor...');

// Add User Form submission handler
document.addEventListener('DOMContentLoaded', function() {
  const addUserForm = document.getElementById('add-user-form');

  if (addUserForm) {
    console.log('✅ Add user form bulundu, AJAX handler ekleniyor...');

    addUserForm.addEventListener('submit', async function(event) {
      event.preventDefault(); // Sayfa yönlendirmesini engelle

      console.log('📤 Kullanıcı ekleme/güncelleme formu gönderiliyor (AJAX)...');

      // DEBUG: Check username field state
      const usernameField = document.getElementById('user-username');
      console.log('🔍 Username field state:', {
        value: usernameField.value,
        name: usernameField.name,
        disabled: usernameField.disabled,
        readonly: usernameField.readOnly,
        type: usernameField.type
      });

      // Check if this is update or add mode
      const isUpdateMode = addUserForm.hasAttribute('data-action') && addUserForm.getAttribute('data-action') === 'update';
      const username = addUserForm.getAttribute('data-username') || '';

      console.log('Mode:', isUpdateMode ? 'UPDATE' : 'ADD', 'Username:', username);

      // Form verilerini al
      const formData = new FormData(addUserForm);

      // DEBUG: Check what FormData has BEFORE processing
      console.log('📋 RAW FormData before processing:');
      for (let [key, value] of formData.entries()) {
        console.log(`  ${key}: "${value}"`);
      }

      // Get permissions from form
      const permissions = window.getPermissionsFromForm ? window.getPermissionsFromForm() : null;
      console.log('Permissions:', permissions);

      // Submit butonunu devre dışı bırak (çift tıklama önleme)
      const submitBtn = addUserForm.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = isUpdateMode ? 'Güncelleniyor...' : 'Ekleniyor...';

      try {
        let response;

        if (isUpdateMode) {
          // UPDATE MODE - use URLSearchParams
          const params = new URLSearchParams();
          params.append('action', 'update_user');
          params.append('username', username);
          params.append('name', formData.get('name'));
          params.append('email', formData.get('email'));
          params.append('role', formData.get('role'));
          if (permissions) {
            params.append('permissions', JSON.stringify(permissions));
          }

          console.log('Sending UPDATE request:', params.toString());

          response = await fetch('user-management.php', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: params.toString()
          });
        } else {
          // ADD MODE - use FormData
          if (permissions) {
            formData.append('permissions', JSON.stringify(permissions));
          }

          console.log('Sending ADD request with FormData');

          response = await fetch('user-management.php', {
            method: 'POST',
            credentials: 'same-origin',
            body: formData
          });
        }

        const data = await response.text();
        console.log('✅ Yanıt alındı:', data);

        // HTTP hata kontrolü
        if (!response.ok) {
          const errorMsg = 'Sunucu hatası (' + response.status + '): ' + (data || 'Bilinmeyen hata');
          console.error('❌ HTTP Error:', errorMsg);
          if (typeof showNotification === 'function') {
            showNotification('error', errorMsg);
          } else {
            alert('❌ ' + errorMsg);
          }
          return;
        }

        // Başarılı mı kontrol et
        if (data.includes('basariyla') || data.includes('başarıyla')) {
          // Başarı mesajı göster
          if (typeof showNotification === 'function') {
            showNotification('success', data);
          } else {
            alert('✅ ' + data);
          }

          // Modal'ı kapat (force=true ile onay istemeden)
          setTimeout(() => {
            closeModal('add-user-modal', true);
          }, 1000);

          // Kullanıcı listesini yenile
          if (typeof loadUsersList === 'function') {
            setTimeout(() => {
              loadUsersList();
            }, 1200);
          } else if (typeof loadUsers === 'function') {
            setTimeout(() => {
              loadUsers();
            }, 1200);
          }
        } else {
          // Hata mesajı göster - boş mesaj kontrolü ekle
          const errorMessage = data.trim() || 'Bir hata oluştu. Lütfen tüm alanları kontrol edin.';
          console.error('❌ İşlem hatası:', errorMessage);
          if (typeof showNotification === 'function') {
            showNotification('error', errorMessage);
          } else {
            alert('❌ ' + errorMessage);
          }
        }
      } catch (error) {
        console.error('❌ AJAX hatası:', error);
        const errorMsg = 'Kullanıcı kaydedilirken bir hata oluştu: ' + (error.message || 'Bilinmeyen hata');
        if (typeof showNotification === 'function') {
          showNotification('error', errorMsg);
        } else {
          alert('❌ ' + errorMsg);
        }
      } finally {
        // Submit butonunu tekrar aktif et
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
    });
  }
});

// Bildirim göster (toast notification)
function showNotification(message, type = 'info') {
  // Mevcut bildirimleri temizle
  const existingNotifications = document.querySelectorAll('.user-notification');
  existingNotifications.forEach(notif => notif.remove());

  // Yeni bildirim oluştur
  const notification = document.createElement('div');
  notification.className = `user-notification user-notification-${type}`;
  notification.textContent = message;

  // Stil ekle
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    font-size: 14px;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    animation: slideInRight 0.3s ease-out;
    max-width: 400px;
    word-wrap: break-word;
  `;

  // Renk belirleme
  if (type === 'success') {
    notification.style.backgroundColor = '#27ae60';
  } else if (type === 'error') {
    notification.style.backgroundColor = '#e74c3c';
  } else {
    notification.style.backgroundColor = '#3498db';
  }

  // Animasyon ekle
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideInRight {
      from {
        transform: translateX(100%);
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
        transform: translateX(100%);
        opacity: 0;
      }
    }
  `;
  if (!document.querySelector('style[data-notification-styles]')) {
    style.setAttribute('data-notification-styles', 'true');
    document.head.appendChild(style);
  }

  // Sayfaya ekle
  document.body.appendChild(notification);

  // 4 saniye sonra kaldır
  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease-in';
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 4000);
}

console.log('✅ UserManagement.js yüklendi');
