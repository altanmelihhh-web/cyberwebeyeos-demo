// ============================================================================
// MODALS - Modal Pencere Yönetimi
// ============================================================================

console.log('🔲 Modals.js yükleniyor...');

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) {
    console.warn('[openModal] Element bulunamadi:', modalId);
    return;
  }

  // Defansif guard: modal yanlilikla bir display:none parent icine
  // yerlestirilmis olabilir (orn. f5-operations-page). Her acilista
  // body'nin dogrudan child'i olmasini garanti et.
  if (modal.parentElement !== document.body) {
    document.body.appendChild(modal);
  }

  // Yeni açılışta "kirli" bayrağını sıfırla. Düzenleme modunda alanlar
  // açılıştan SONRA programatik (el.value = ...) doldurulur; bu atamalar
  // input/change eventi tetiklemediği için formu kirli yapmaz.
  modal.dataset.userDirty = '';

  modal.style.display = 'block';
  document.body.style.overflow = 'hidden'; // Arka planın scroll olmasını engelle
}

// Form kirli mi? — yalnızca GERÇEK kullanıcı etkileşimi (input/change) kirli sayılır.
// Programatik .value atamaları (örn. düzenleme formunu doldurmak) eventi
// tetiklemediği için kirli olarak işaretlenmez. Böylece "kaydedilmedi" uyarısı
// kullanıcı bir şey değiştirmediğinde yanlışlıkla çıkmaz.
function isFormDirty(modal) {
  return !!modal && modal.dataset.userDirty === '1';
}

// Kullanıcı bir form alanına dokunduğunda ilgili modal'ı kirli işaretle.
// Capture fazında dinleriz ki dinamik eklenen alanlar da kapsansın.
function markModalDirtyFromEvent(e) {
  const t = e.target;
  if (!t || typeof t.closest !== 'function') return;
  const modal = t.closest('.modal');
  if (modal) modal.dataset.userDirty = '1';
}
document.addEventListener('input', markModalDirtyFromEvent, true);
document.addEventListener('change', markModalDirtyFromEvent, true);

// Form gönderildiğinde (kaydet) artık "kaydedilmemiş" sayılmaz → bayrağı temizle.
document.addEventListener('submit', function (e) {
  const t = e.target;
  if (t && typeof t.closest === 'function') {
    const modal = t.closest('.modal');
    if (modal) modal.dataset.userDirty = '';
  }
}, true);

function closeModal(modalId, force = false) {
  const modal = document.getElementById(modalId);
  if (modal) {
    // Force kapatma değilse ve form doluysa onay iste
    if (!force && isFormDirty(modal)) {
      if (!confirm('⚠️ Girdiğiniz bilgiler kaydedilmedi.\n\nModal\'ı kapatmak istediğinize emin misiniz?')) {
        return false;
      }
    }

    modal.style.display = 'none';
    document.body.style.overflow = 'auto';

    // Formu temizle
    const forms = modal.querySelectorAll('form');
    forms.forEach(form => {
      form.reset();

      // If this is the user form, call resetUserForm to properly clean up
      if (form.id === 'add-user-form' && typeof resetUserForm === 'function') {
        setTimeout(() => resetUserForm(), 0);
      }
    });

    return true;
  }
  return false;
}

// Modal dışına tıklandığında onay iste ve kapat
window.onclick = function(event) {
  if (event.target.classList.contains('modal')) {
    const modal = event.target;

    // Form doluysa onay iste
    if (isFormDirty(modal)) {
      if (!confirm('⚠️ Girdiğiniz bilgiler kaydedilmedi.\n\nModal\'ı kapatmak istediğinize emin misiniz?')) {
        return;
      }
    }

    modal.style.display = 'none';
    document.body.style.overflow = 'auto';

    // Formu temizle
    const forms = modal.querySelectorAll('form');
    forms.forEach(form => form.reset());
  }
}

// ESC tuşu ile modal kapat (onay isteyerek)
document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
      if (modal.style.display === 'block') {
        // Form doluysa onay iste
        if (isFormDirty(modal)) {
          if (!confirm('⚠️ Girdiğiniz bilgiler kaydedilmedi.\n\nModal\'ı kapatmak istediğinize emin misiniz?')) {
            return;
          }
        }

        modal.style.display = 'none';
        document.body.style.overflow = 'auto';

        // Formu temizle
        const forms = modal.querySelectorAll('form');
        forms.forEach(form => form.reset());
      }
    });
  }
});

// Global export
window.openModal = openModal;
window.closeModal = closeModal;

console.log('✅ Modals.js yüklendi');
