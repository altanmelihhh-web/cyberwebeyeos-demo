// ===========================
// HELP MODAL FUNCTIONS
// ===========================

function closeHelpModal() {
  document.getElementById('security-help-modal').style.display = 'none';
}

function showHelpModal(title, content) {
  document.getElementById('help-modal-title').innerHTML = '<i class="fas fa-info-circle"></i> ' + title;
  document.getElementById('help-modal-content').innerHTML = content;
  document.getElementById('security-help-modal').style.display = 'flex';
}

function showLocalCaptchaHelp() {
  const content = `
    <h4 style="color: #3498db; margin-top: 0;">🤖 Lokal CAPTCHA Nedir?</h4>
    <p>CAPTCHA (Completely Automated Public Turing test to tell Computers and Humans Apart), botları engellemek için kullanılan bir güvenlik önlemidir.</p>
    <p><strong>Lokal CAPTCHA</strong>, tamamen kendi sunucunuzda çalışır, Google veya harici servislere bağımlı değildir.</p>

    <h4 style="color: #3498db;">✅ Avantajları:</h4>
    <ul>
      <li><strong>Tamamen Self-Hosted:</strong> İnternet bağlantısı gerektirmez</li>
      <li><strong>Gizlilik:</strong> Kullanıcı verileri Google'a gitmez</li>
      <li><strong>Kurulum Yok:</strong> Key almaya gerek yok, hemen kullanılabilir</li>
      <li><strong>Erişilebilirlik:</strong> Ses CAPTCHA desteği var (KVKK uyumlu)</li>
      <li><strong>Özelleştirilebilir:</strong> Zorluk ve karakter sayısı ayarlanabilir</li>
    </ul>

    <h4 style="color: #3498db;">⚙️ Ayarlar:</h4>
    <ul>
      <li><strong>Karakter Sayısı:</strong> 4-8 arası. Önerilen: 5</li>
      <li><strong>Zorluk:</strong>
        <ul>
          <li>Kolay: Okunması daha kolay, botlar için de kolay</li>
          <li>Orta: Dengeli (önerilen)</li>
          <li>Zor: Botlar için zor, insanlar için de zor olabilir</li>
        </ul>
      </li>
      <li><strong>Tetikleme:</strong> 3 başarısız denemeden sonra (önerilen)</li>
    </ul>

    <h4 style="color: #3498db;">🔊 Ses CAPTCHA:</h4>
    <p>Görme engelli kullanıcılar için ses ile CAPTCHA okunabilir. Login sayfasında "Sesli Dinle" butonu otomatik görünür.</p>

    <h4 style="color: #3498db;">🛡️ Güvenlik:</h4>
    <p>Lokal CAPTCHA, production ortamında test edilmiştir ve botların %95+'ını engeller. Honeypot ve Rate Limiting ile birlikte kullanıldığında %99+ koruma sağlar.</p>

    <div style="background: #e8f5e9; padding: 15px; border-radius: 6px; margin-top: 15px; border-left: 4px solid #4caf50;">
      <strong style="color: #2e7d32;">💡 Önerilen Kurulum:</strong>
      <p style="margin: 5px 0 0 0; color: #2e7d32;">CAPTCHA: Etkin | Tetikleme: 3 deneme | Karakter: 5 | Zorluk: Orta</p>
    </div>
  `;
  showHelpModal('Lokal CAPTCHA Yardım', content);
}

function showRateLimitHelp() {
  const content = `
    <h4 style="color: #e67e22; margin-top: 0;">⚡ Rate Limiting Nedir?</h4>
    <p>Rate Limiting (Hız Sınırlama), belirli bir zaman diliminde yapılabilecek istek sayısını sınırlayarak brute force saldırılarını ve API istismarını önler.</p>

    <h4 style="color: #e67e22;">🎯 Nasıl Çalışır?</h4>
    <p>Sistem, her IP adresi veya kullanıcı için yapılan istekleri sayar. Belirlediğiniz limite ulaşıldığında, bir süre için o IP/kullanıcı engellenir.</p>

    <h4 style="color: #e67e22;">📋 Rate Limit Tipleri:</h4>
    <ul>
      <li><strong>IP Bazlı:</strong> Aynı IP adresinden gelen istekleri sınırlar. Paylaşımlı IP'lerde sorun yaratabilir.</li>
      <li><strong>Kullanıcı Bazlı:</strong> Aynı kullanıcı hesabına yapılan istekleri sınırlar. Distributed saldırılara karşı daha az etkilidir.</li>
      <li><strong>Her İkisi:</strong> Hem IP hem kullanıcı bazlı sınırlama yapar (önerilen).</li>
    </ul>

    <h4 style="color: #e67e22;">⚙️ Endpoint Ayarları:</h4>
    <ul>
      <li><strong>Login Endpoint:</strong> Giriş denemelerini sınırlar. Örn: 60 saniyede 5 deneme</li>
      <li><strong>API Endpoints:</strong> API isteklerini sınırlar. Örn: 60 saniyede 100 istek</li>
    </ul>

    <h4 style="color: #e67e22;">💡 Önerilen Ayarlar:</h4>
    <ul>
      <li><strong>Login:</strong> 60 saniyede 5 istek (çok sıkı ama güvenli)</li>
      <li><strong>API:</strong> 60 saniyede 100 istek (normal kullanım için yeterli)</li>
      <li><strong>Tip:</strong> Her İkisi (IP + Kullanıcı)</li>
    </ul>

    <div style="background: #ecf0f1; padding: 15px; border-radius: 6px; margin-top: 15px;">
      <strong>⚠️ Uyarı:</strong> Çok düşük limitler normal kullanıcıları da etkileyebilir. Ayarları production'a almadan önce test edin.
    </div>
  `;
  showHelpModal('Rate Limiting Yardım', content);
}

function showSecurityHeadersHelp() {
  const content = `
    <h4 style="color: #27ae60; margin-top: 0;">🛡️ Security Headers Nedir?</h4>
    <p>HTTP Security Headers, tarayıcıya güvenlik politikaları hakkında talimat veren HTTP başlıklarıdır. XSS, clickjacking ve diğer saldırılara karşı koruma sağlar.</p>

    <h4 style="color: #27ae60;">📋 Header Türleri:</h4>

    <div style="margin-bottom: 15px;">
      <h5 style="color: #2c3e50; margin-bottom: 5px;">🔒 Content-Security-Policy (CSP)</h5>
      <p>Hangi kaynakların (script, style, image) yüklenebileceğini belirler. XSS ve data injection saldırılarını önler.</p>
      <strong>Örnek:</strong> <code style="background: #ecf0f1; padding: 2px 6px; border-radius: 3px;">default-src 'self'; script-src 'self' 'unsafe-inline';</code>
    </div>

    <div style="margin-bottom: 15px;">
      <h5 style="color: #2c3e50; margin-bottom: 5px;">🔐 HTTP Strict Transport Security (HSTS)</h5>
      <p>Tarayıcıyı sadece HTTPS kullanmaya zorlar. Man-in-the-middle saldırılarını önler.</p>
      <strong>Önerilen:</strong> 1 yıl (31,536,000 saniye)
    </div>

    <div style="margin-bottom: 15px;">
      <h5 style="color: #2c3e50; margin-bottom: 5px;">🖼️ X-Frame-Options</h5>
      <p>Sitenizin iframe içinde gösterilmesini engeller. Clickjacking saldırılarını önler.</p>
      <strong>Önerilen:</strong> DENY (hiç frame'e izin verme)
    </div>

    <div style="margin-bottom: 15px;">
      <h5 style="color: #2c3e50; margin-bottom: 5px;">📄 X-Content-Type-Options</h5>
      <p>MIME type sniffing'i engeller. Tarayıcının dosya tipini yanlış yorumlamasını önler.</p>
      <strong>Değer:</strong> nosniff (sabit)
    </div>

    <div style="margin-bottom: 15px;">
      <h5 style="color: #2c3e50; margin-bottom: 5px;">🔗 Referrer-Policy</h5>
      <p>Hangi referer bilgisinin gönderileceğini kontrol eder. Gizlilik için önemli.</p>
      <strong>Önerilen:</strong> strict-origin-when-cross-origin
    </div>

    <div style="background: #ecf0f1; padding: 15px; border-radius: 6px; margin-top: 15px;">
      <strong>💡 İpucu:</strong> Security Headers'ı test etmek için <a href="https://securityheaders.com" target="_blank">securityheaders.com</a> kullanabilirsiniz.
    </div>

    <div style="background: #fff3cd; padding: 15px; border-radius: 6px; margin-top: 15px; border-left: 4px solid #ffc107;">
      <strong>⚠️ Dikkat:</strong> CSP çok sıkı ayarlanırsa siteniz düzgün çalışmayabilir. Önce test edin!
    </div>
  `;
  showHelpModal('Security Headers Yardım', content);
}

function showAdvancedSessionHelp() {
  const content = `
    <h4 style="color: #9b59b6; margin-top: 0;">👤 Gelişmiş Oturum Güvenliği Nedir?</h4>
    <p>Oturum sırasında kullanıcının cihaz, IP veya tarayıcı bilgilerinde değişiklik olduğunda güvenlik önlemleri alır. Session hijacking saldırılarını önler.</p>

    <h4 style="color: #9b59b6;">🔍 Özellikler:</h4>

    <div style="margin-bottom: 15px;">
      <h5 style="color: #2c3e50; margin-bottom: 5px;">📱 Device Fingerprinting (Cihaz Parmak İzi)</h5>
      <p>Her kullanıcının cihazını tanır ve benzersiz bir parmak izi oluşturur. Yeni bir cihazdan giriş yapıldığında uyarı verir.</p>
      <strong>Nasıl çalışır:</strong> Tarayıcı, işletim sistemi, dil ayarları gibi bilgilerden bir hash oluşturur.
    </div>

    <div style="margin-bottom: 15px;">
      <h5 style="color: #2c3e50; margin-bottom: 5px;">🌍 IP Adresi Değişimi</h5>
      <p>Kullanıcının oturum sırasında IP adresi değişirse ne yapılacağını belirler.</p>
      <ul>
        <li><strong>İzin ver:</strong> Hiçbir şey yapma (mobil kullanıcılar için)</li>
        <li><strong>Uyar:</strong> Güvenlik olayı kaydet, kullanıcı devam edebilir</li>
        <li><strong>Oturumu sonlandır:</strong> Yeniden giriş iste (en güvenli)</li>
      </ul>
    </div>

    <div style="margin-bottom: 15px;">
      <h5 style="color: #2c3e50; margin-bottom: 5px;">🌐 User-Agent Değişimi</h5>
      <p>Kullanıcının oturum sırasında tarayıcısı değişirse ne yapılacağını belirler.</p>
      <strong>Önerilen:</strong> Uyar (User-Agent değişimi nadirdir ve şüpheli olabilir)
    </div>

    <div style="margin-bottom: 15px;">
      <h5 style="color: #2c3e50; margin-bottom: 5px;">💻 Cihaz Değişimi</h5>
      <p>Device fingerprint değişirse ne yapılacağını belirler.</p>
      <strong>Önerilen:</strong> Uyar veya Oturumu sonlandır
    </div>

    <h4 style="color: #9b59b6;">⚙️ Önerilen Ayarlar:</h4>
    <ul>
      <li><strong>Device Tracking:</strong> Etkin</li>
      <li><strong>IP Değişimi:</strong> Uyar (mobil kullanıcılar için)</li>
      <li><strong>User-Agent Değişimi:</strong> Uyar</li>
      <li><strong>Cihaz Değişimi:</strong> Oturumu sonlandır</li>
    </ul>

    <div style="background: #ecf0f1; padding: 15px; border-radius: 6px; margin-top: 15px;">
      <strong>💡 İpucu:</strong> Bu özellikler özellikle banking ve e-commerce gibi hassas uygulamalar için önemlidir.
    </div>
  `;
  showHelpModal('Gelişmiş Oturum Güvenliği Yardım', content);
}

// ===========================
// SAVE SETTINGS FUNCTIONS
// ===========================

function saveCaptchaSettings() {
  const settings = {
    captcha_enabled: document.querySelector('input[name="captcha-enabled"]:checked').value,
    captcha_version: document.getElementById('captcha-version').value,
    captcha_site_key: document.getElementById('captcha-site-key').value,
    captcha_secret_key: document.getElementById('captcha-secret-key').value,
    captcha_trigger_failed_attempts: document.getElementById('captcha-trigger-attempts').value,
    captcha_v3_threshold: document.getElementById('captcha-v3-threshold').value
  };

  fetch('save-settings.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      showNotification('CAPTCHA ayarları kaydedildi', 'success');
    } else {
      showNotification('Hata: ' + data.message, 'error');
    }
  })
  .catch(error => {
    showNotification('Kaydetme hatası: ' + error, 'error');
  });
}

function saveLocalCaptchaSettings() {
  const settings = {
    captcha_enabled: document.querySelector('input[name="captcha-enabled"]:checked').value,
    captcha_trigger_failed_attempts: document.getElementById('captcha-trigger-attempts').value,
    captcha_length: document.getElementById('captcha-length').value,
    captcha_difficulty: document.getElementById('captcha-difficulty').value
  };

  fetch('save-settings.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      showNotification('Lokal CAPTCHA ayarları kaydedildi', 'success');
    } else {
      showNotification('Hata: ' + data.message, 'error');
    }
  })
  .catch(error => {
    showNotification('Kaydetme hatası: ' + error, 'error');
  });
}

function saveRateLimitSettings() {
  const settings = {
    rate_limit_enabled: document.querySelector('input[name="rate-limit-enabled"]:checked').value,
    rate_limit_type: document.querySelector('input[name="rate-limit-type"]:checked').value,
    rate_limit_login_requests: document.getElementById('rate-limit-login-requests').value,
    rate_limit_login_window: document.getElementById('rate-limit-login-window').value,
    rate_limit_api_requests: document.getElementById('rate-limit-api-requests').value,
    rate_limit_api_window: document.getElementById('rate-limit-api-window').value
  };

  fetch('save-settings.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      showNotification('Rate Limiting ayarları kaydedildi', 'success');
    } else {
      showNotification('Hata: ' + data.message, 'error');
    }
  })
  .catch(error => {
    showNotification('Kaydetme hatası: ' + error, 'error');
  });
}

function saveSecurityHeadersSettings() {
  const settings = {
    security_headers_enabled: document.getElementById('security-headers-enabled').checked ? 'true' : 'false',
    csp_enabled: document.getElementById('csp-enabled').checked ? 'true' : 'false',
    csp_policy: document.getElementById('csp-policy').value,
    hsts_enabled: document.getElementById('hsts-enabled').checked ? 'true' : 'false',
    hsts_max_age: document.getElementById('hsts-max-age').value,
    x_frame_options: document.getElementById('x-frame-options').value,
    x_content_type_options: document.getElementById('x-content-type-options-enabled').checked ? 'nosniff' : '',
    referrer_policy: document.getElementById('referrer-policy').value
  };

  fetch('save-settings.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      showNotification('Security Headers ayarları kaydedildi', 'success');
    } else {
      showNotification('Hata: ' + data.message, 'error');
    }
  })
  .catch(error => {
    showNotification('Kaydetme hatası: ' + error, 'error');
  });
}

function saveAdvancedSessionSettings() {
  const settings = {
    session_device_tracking: document.getElementById('session-device-tracking').checked ? 'true' : 'false',
    session_ip_change_action: document.getElementById('session-ip-change-action').value,
    session_user_agent_change_action: document.getElementById('session-user-agent-change-action').value,
    session_device_change_action: document.getElementById('session-device-change-action').value
  };

  fetch('save-settings.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      showNotification('Gelişmiş Oturum Güvenliği ayarları kaydedildi', 'success');
    } else {
      showNotification('Hata: ' + data.message, 'error');
    }
  })
  .catch(error => {
    showNotification('Kaydetme hatası: ' + error, 'error');
  });
}

// ===========================
// UI HELPERS
// ===========================

// Show/hide CAPTCHA v3 threshold based on version selection
document.addEventListener('DOMContentLoaded', function() {
  const captchaVersion = document.getElementById('captcha-version');
  const v3ThresholdGroup = document.getElementById('captcha-v3-threshold-group');

  if (captchaVersion && v3ThresholdGroup) {
    captchaVersion.addEventListener('change', function() {
      if (this.value === 'v3') {
        v3ThresholdGroup.style.display = 'block';
      } else {
        v3ThresholdGroup.style.display = 'none';
      }
    });
  }
});

// Token form handlers
document.addEventListener('DOMContentLoaded', function() {
  // Token type değişince password alanını göster/gizle
  const tokenType = document.getElementById('token-type');
  const passwordGroup = document.getElementById('token-password-group');

  if (tokenType) {
    tokenType.addEventListener('change', function() {
      if (this.value === 'basic') {
        passwordGroup.style.display = 'block';
      } else {
        passwordGroup.style.display = 'none';
      }
    });
  }

  // Token form submit
  const tokenForm = document.getElementById('add-token-form');
  if (tokenForm) {
    tokenForm.addEventListener('submit', async function(e) {
      e.preventDefault();

      const formData = {
        name: document.getElementById('token-name').value,
        type: document.getElementById('token-type').value,
        value: document.getElementById('token-value').value,
        password: document.getElementById('token-password').value || '',
        usage: document.getElementById('token-usage').value,
        base_url: document.getElementById('token-base-url').value,
        notes: document.getElementById('token-notes').value
      };

      try {
        const response = await fetch('save-token.php', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (data.success) {
          showNotification('success', 'Token başarıyla eklendi!');
          closeModal('add-token-modal');
          loadTokensList();
        } else {
          showNotification('error', 'Hata: ' + data.message);
        }
      } catch (error) {
        console.error('Token ekleme hatası:', error);
        showNotification('error', 'Token eklenirken bir hata oluştu');
      }
    });
  }
});

// Load tokens list
async function loadTokensList() {
  try {
    const response = await fetch('get-tokens.php', {
      credentials: 'same-origin'
    });
    const data = await response.json();

    if (data.success) {
      const tbody = document.getElementById('tokens-table-body');
      if (!tbody) return;

      tbody.innerHTML = data.tokens.map(token => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #f0f0f0;">${escapeHtml(token.name)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #f0f0f0;">
            <span class="badge badge-${getTokenTypeBadge(token.type)}">${getTokenTypeLabel(token.type)}</span>
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #f0f0f0; font-family: 'Courier New', monospace; font-size: 11px;">
            ${token.masked_value}
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #f0f0f0;">${escapeHtml(token.usage)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #f0f0f0;">
            <button onclick="copyTokenById(${token.id})" style="padding: 6px 12px; background: #10b981; color: white; border: none; border-radius: 4px; font-size: 12px; cursor: pointer; margin-right: 5px;">
              <i class="fas fa-copy"></i>
            </button>
            <button onclick="showTokenById(${token.id})" style="padding: 6px 12px; background: #3b82f6; color: white; border: none; border-radius: 4px; font-size: 12px; cursor: pointer; margin-right: 5px;">
              <i class="fas fa-eye"></i>
            </button>
            <button onclick="deleteTokenById(${token.id})" style="padding: 6px 12px; background: #ef4444; color: white; border: none; border-radius: 4px; font-size: 12px; cursor: pointer;">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>
      `).join('');
    }
  } catch (error) {
    console.error('Token listesi yükleme hatası:', error);
  }
}

function getTokenTypeBadge(type) {
  const badges = {
    'bearer': 'info',
    'token': 'info',
    'apikey': 'warning',
    'basic': 'success'
  };
  return badges[type] || 'info';
}

function getTokenTypeLabel(type) {
  const labels = {
    'bearer': 'Bearer Token',
    'token': 'Token',
    'apikey': 'API Key',
    'basic': 'Basic Auth'
  };
  return labels[type] || type;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function copyTokenById(id) {
  try {
    const response = await fetch('get-token-value.php?id=' + id, {
      credentials: 'same-origin'
    });
    const data = await response.json();

    if (data.success) {
      await navigator.clipboard.writeText(data.value);
      showNotification('success', 'Token kopyalandı!');
    } else {
      showNotification('error', 'Token alınamadı');
    }
  } catch (error) {
    console.error('Token kopyalama hatası:', error);
    showNotification('error', 'Token kopyalanamadı');
  }
}

async function showTokenById(id) {
  try {
    const response = await fetch('get-token-value.php?id=' + id, {
      credentials: 'same-origin'
    });
    const data = await response.json();

    if (data.success) {
      alert('Token:\n\n' + data.value + (data.password ? '\n\nPassword:\n' + data.password : ''));
    } else {
      showNotification('error', 'Token alınamadı');
    }
  } catch (error) {
    console.error('Token görüntüleme hatası:', error);
    showNotification('error', 'Token görüntülenemedi');
  }
}

async function deleteTokenById(id) {
  if (!confirm('Bu token\'ı silmek istediğinize emin misiniz?')) return;

  try {
    const response = await fetch('delete-token.php', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });

    const data = await response.json();

    if (data.success) {
      showNotification('success', 'Token silindi!');
      loadTokensList();
    } else {
      showNotification('error', 'Token silinemedi');
    }
  } catch (error) {
    console.error('Token silme hatası:', error);
    showNotification('error', 'Token silinirken hata oluştu');
  }
}

// API Info Export Functions
function openExportApiInfoModal() {
  openModal('export-api-info-modal');
  document.getElementById('export-jira-api').checked = true;
  document.getElementById('export-webhook').checked = true;
  document.getElementById('export-menu').checked = false;
  document.getElementById('export-recipient').value = '';
}

function updateExportPreview() {
  // Bu fonksiyon checkbox'lar değiştiğinde çağrılır
  // Gelecekte preview eklemek için kullanılabilir
}

function generateApiInfoText() {
  const includeJira = document.getElementById('export-jira-api').checked;
  const includeWebhook = document.getElementById('export-webhook').checked;
  const includeMenu = document.getElementById('export-menu').checked;
  const recipient = document.getElementById('export-recipient').value;

  let text = '═══════════════════════════════════════════════════════\n';
  text += '     NETWORK SECURITY PORTAL - API ENTEGRASYON BİLGİLERİ\n';
  text += '═══════════════════════════════════════════════════════\n\n';

  if (recipient) {
    text += 'Alıcı: ' + recipient + '\n';
    text += 'Tarih: ' + new Date().toLocaleDateString('tr-TR') + '\n\n';
  }

  if (includeJira) {
    text += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    text += '📌 JIRA API BİLGİLERİ\n';
    text += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
    text += 'Base URL:\n';
    text += '  https://jira.example.com/rest/api/2\n\n';
    text += 'Authorization:\n';
    text += '  Type: Bearer Token\n';
    text += '  Token: YOUR_JIRA_BEARER_TOKEN_HERE\n\n';
    text += 'Örnek cURL İsteği:\n';
    text += '─────────────────────────────────────────────────────\n';
    text += 'curl -X POST "https://jira.example.com/rest/api/2/issue/DYF-1234/comment" \\\n';
    text += '  -H "Authorization: Bearer YOUR_JIRA_BEARER_TOKEN_HERE" \\\n';
    text += '  -H "Content-Type: application/json" \\\n';
    text += '  -d \'{"body": "Test comment"}\'\n\n';
    text += 'Örnek Python İsteği:\n';
    text += '─────────────────────────────────────────────────────\n';
    text += 'import requests\n\n';
    text += 'url = "https://jira.example.com/rest/api/2/issue/DYF-1234/comment"\n';
    text += 'headers = {\n';
    text += '    "Authorization": "Bearer YOUR_JIRA_BEARER_TOKEN_HERE",\n';
    text += '    "Content-Type": "application/json"\n';
    text += '}\n';
    text += 'data = {"body": "Test comment"}\n';
    text += 'response = requests.post(url, headers=headers, json=data)\n\n';
  }

  if (includeWebhook) {
    text += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    text += '📌 WEBHOOK ENDPOINT BİLGİLERİ\n';
    text += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
    text += 'Webhook URL:\n';
    text += '  https://198.51.100.50/portal/api/v1/jira-webhook.php\n\n';
    text += 'Authentication:\n';
    text += '  Header: X-API-Key\n';
    text += '  Value: mySecretKey123\n\n';
    text += 'Desteklenen Event\'ler:\n';
    text += '  • jira:issue_created\n';
    text += '  • jira:issue_updated\n';
    text += '  • jira:issue_assigned\n\n';
    text += 'Jira Webhook Kurulum Adımları:\n';
    text += '─────────────────────────────────────────────────────\n';
    text += '1. Jira > Settings > System > WebHooks\n';
    text += '2. "Create a WebHook" tıklayın\n';
    text += '3. URL\'yi yapıştırın: https://198.51.100.50/portal/api/v1/jira-webhook.php\n';
    text += '4. Events seçin: Issue Created, Updated, Assigned\n';
    text += '5. Custom headers ekleyin:\n';
    text += '   - Header: X-API-Key\n';
    text += '   - Value: mySecretKey123\n';
    text += '6. Kaydedin ve test edin\n\n';
  }

  if (includeMenu) {
    text += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    text += '📌 PORTAL ERİŞİM VE KULLANIM\n';
    text += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
    text += 'Portal URL:\n';
    text += '  https://198.51.100.50/portal/\n\n';
    text += 'Ana Menü Özellikleri:\n';
    text += '  • Dashboard - Sistem durumu ve widget\'lar\n';
    text += '  • Blacklist Yönetimi - IP blacklist kontrolü\n';
    text += '  • Dökümanlar - Dosya yönetimi\n';
    text += '  • Sertifikalar - SSL sertifika takibi\n';
    text += '  • Backup Monitoring - Yedek durumu\n';
    text += '  • Cihazlar - Network cihazları\n';
    text += '  • İşler - Task yönetimi\n';
    text += '  • Alerts - Uyarı bildirimleri\n';
    text += '  • Müşteri Sorunları - Ticket sistemi\n';
    text += '  • Araçlar > API & Otomasyon - Bu bilgilerin bulunduğu sayfa\n\n';
  }

  text += '═══════════════════════════════════════════════════════\n';
  text += 'Sorularınız için: Network Security Ekibi\n';
  text += '═══════════════════════════════════════════════════════\n';

  return text;
}

async function copyApiInfoToClipboard() {
  const text = generateApiInfoText();

  try {
    await navigator.clipboard.writeText(text);
    showNotification('success', 'API bilgileri panoya kopyalandı!');
  } catch (error) {
    console.error('Kopyalama hatası:', error);
    showNotification('error', 'Kopyalama başarısız oldu');
  }
}

function printApiInfo() {
  const text = generateApiInfoText();

  // Yazdırma için HTML formatında hazırla
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>API Entegrasyon Bilgileri</title>
      <style>
        body {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          line-height: 1.6;
          padding: 20px;
          max-width: 900px;
          margin: 0 auto;
        }
        pre {
          white-space: pre-wrap;
          word-wrap: break-word;
          background: #f5f5f5;
          padding: 15px;
          border-radius: 5px;
          border-left: 4px solid #667eea;
        }
        @media print {
          body { font-size: 10px; }
        }
      </style>
    </head>
    <body>
      <pre>${escapeHtml(text)}</pre>
    </body>
    </html>
  `);
  printWindow.document.close();
  setTimeout(() => {
    printWindow.print();
  }, 250);
}

// Webhook Logs Functions
let webhookLogsData = [];

async function refreshWebhookLogs() {
  const limit = document.getElementById('log-filter-limit').value;

  try {
    const response = await fetch(`get-webhook-logs.php?limit=${limit}`, {
      credentials: 'same-origin'
    });
    const data = await response.json();

    if (data.success) {
      webhookLogsData = data.logs;
      renderWebhookLogs(webhookLogsData);
    } else {
      console.error('Failed to load logs:', data.message);
      document.getElementById('webhook-logs-tbody').innerHTML = `
        <tr>
          <td colspan="6" style="padding: 40px; text-align: center; color: #e74c3c;">
            <i class="fas fa-exclamation-triangle" style="font-size: 2em; margin-bottom: 10px;"></i>
            <p>Loglar yüklenemedi: ${data.message}</p>
          </td>
        </tr>
      `;
    }
  } catch (error) {
    console.error('Error loading logs:', error);
    document.getElementById('webhook-logs-tbody').innerHTML = `
      <tr>
        <td colspan="6" style="padding: 40px; text-align: center; color: #e74c3c;">
          <i class="fas fa-exclamation-triangle" style="font-size: 2em; margin-bottom: 10px;"></i>
          <p>Bağlantı hatası</p>
        </td>
      </tr>
    `;
  }
}

function filterWebhookLogs() {
  const eventFilter = document.getElementById('log-filter-event').value.toLowerCase();
  const searchFilter = document.getElementById('log-filter-search').value.toLowerCase();

  const filtered = webhookLogsData.filter(log => {
    const matchesEvent = !eventFilter || log.event_type.toLowerCase().includes(eventFilter);
    const matchesSearch = !searchFilter ||
      log.issue_key.toLowerCase().includes(searchFilter) ||
      (log.summary && log.summary.toLowerCase().includes(searchFilter));

    return matchesEvent && matchesSearch;
  });

  renderWebhookLogs(filtered);
}

function renderWebhookLogs(logs) {
  const tbody = document.getElementById('webhook-logs-tbody');

  if (logs.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="padding: 40px; text-align: center; color: #7f8c8d;">
          <i class="fas fa-inbox" style="font-size: 2em; margin-bottom: 10px;"></i>
          <p>Henüz webhook kaydı yok</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = logs.map(log => {
    const date = new Date(log.created_at);
    const formattedDate = date.toLocaleDateString('tr-TR') + ' ' + date.toLocaleTimeString('tr-TR');

    const eventBadge = getEventBadge(log.event_type);
    const summary = log.summary ? (log.summary.length > 50 ? log.summary.substring(0, 50) + '...' : log.summary) : '-';

    return `
      <tr style="border-bottom: 1px solid #f0f0f0;">
        <td style="padding: 12px; white-space: nowrap; font-size: 12px;">${formattedDate}</td>
        <td style="padding: 12px;">${eventBadge}</td>
        <td style="padding: 12px; font-family: 'Courier New', monospace; font-weight: 600;">${log.issue_key}</td>
        <td style="padding: 12px;">${summary}</td>
        <td style="padding: 12px; font-size: 12px;">${log.ip_address || '-'}</td>
        <td style="padding: 12px; text-align: center;">
          <button onclick='viewWebhookLog(${JSON.stringify(log).replace(/'/g, "&apos;")})' style="padding: 6px 12px; background: #3b82f6; color: white; border: none; border-radius: 4px; font-size: 12px; cursor: pointer;">
            <i class="fas fa-eye"></i> Detay
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function getEventBadge(eventType) {
  const badges = {
    'jira:issue_created': '<span style="padding: 4px 10px; background: #d4edda; color: #155724; border-radius: 12px; font-size: 11px; font-weight: 600;">Created</span>',
    'jira:issue_updated': '<span style="padding: 4px 10px; background: #fff3cd; color: #856404; border-radius: 12px; font-size: 11px; font-weight: 600;">Updated</span>',
    'jira:issue_assigned': '<span style="padding: 4px 10px; background: #cfe2ff; color: #084298; border-radius: 12px; font-size: 11px; font-weight: 600;">Assigned</span>'
  };

  return badges[eventType] || `<span style="padding: 4px 10px; background: #e2e3e5; color: #383d41; border-radius: 12px; font-size: 11px; font-weight: 600;">${eventType}</span>`;
}

function viewWebhookLog(log) {
  const modal = document.getElementById('webhook-log-detail-modal');
  if (!modal) {
    console.error('Modal not found');
    return;
  }

  // Populate modal with log details
  document.getElementById('log-detail-event').textContent = log.event_type;
  document.getElementById('log-detail-issue').textContent = log.issue_key;
  document.getElementById('log-detail-summary').textContent = log.summary || 'N/A';
  document.getElementById('log-detail-time').textContent = new Date(log.created_at).toLocaleString('tr-TR');
  document.getElementById('log-detail-ip').textContent = log.ip_address || 'N/A';

  // Format payload JSON
  try {
    const payload = typeof log.payload === 'string' ? JSON.parse(log.payload) : log.payload;
    document.getElementById('log-detail-payload').textContent = JSON.stringify(payload, null, 2);
  } catch (e) {
    document.getElementById('log-detail-payload').textContent = log.payload;
  }

  openModal('webhook-log-detail-modal');
}

// Close modal on outside click
document.addEventListener('click', function(e) {
  const modal = document.getElementById('security-help-modal');
  if (e.target === modal) {
    closeHelpModal();
  }
});

// ===========================
// BACKUPS PAGE
// ===========================

let currentBackupDirectory = '';
let currentBackupPath = '';
let backupSearchTimer = null;
let backupDirectories = [];
let currentPreviewFileId = null;

// Backuplar sayfası yüklendiğinde
document.addEventListener('DOMContentLoaded', function() {
    // Sayfa değiştiğinde backuplar sayfasıysa yükle
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.target.id === 'backups-page' &&
                mutation.target.style.display !== 'none') {
                loadBackupDirectoryTree();
                loadBackupDirectory('');
            }
        });
    });

    const backupsPage = document.getElementById('backups-page');
    if (backupsPage) {
        observer.observe(backupsPage, { attributes: true, attributeFilter: ['style'] });
    }
});

// Dizin ağacını yükle
function loadBackupDirectoryTree() {
    const treeContainer = document.getElementById('backup-folder-tree');

    treeContainer.innerHTML = `
        <div style="text-align: center; padding: 20px; color: #7f8c8d;">
            <i class="fas fa-sync fa-spin" style="font-size: 2em; margin-bottom: 10px;"></i>
            <p style="margin: 0; font-size: 13px;">Dizinler yükleniyor...</p>
        </div>
    `;

    fetch('get-backup-directories.php', {
        credentials: 'same-origin'
    })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                backupDirectories = data.directories;
                renderBackupDirectoryTree(data.directories);
            } else {
                treeContainer.innerHTML = `
                    <div style="text-align: center; padding: 20px; color: #e74c3c;">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p style="margin: 5px 0 0 0; font-size: 13px;">Hata oluştu</p>
                    </div>
                `;
            }
        })
        .catch(error => {
            console.error('Dizin ağacı yükleme hatası:', error);
            treeContainer.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #e74c3c;">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p style="margin: 5px 0 0 0; font-size: 13px;">Bağlantı hatası</p>
                </div>
            `;
        });
}

// Dizin ağacını render et
function renderBackupDirectoryTree(directories) {
    const treeContainer = document.getElementById('backup-folder-tree');

    const categoryColors = {
        'AnsibleProd': '#9b59b6',
        'CyberwebeyeosDRC': '#2980b9',
        'TestSite1': '#f39c12',
        'Örnek Müşteri A': '#e74c3c',
        'TestSite2': '#27ae60',
        'Production': '#9b59b6',
        'Ansible': '#9b59b6'
    };

    const categoryLabels = {
        'AnsibleProd': 'Cyberwebeyeos Prod',
        'CyberwebeyeosDRC': 'Cyberwebeyeos DRC',
        'TestSite1': 'Cyberwebeyeos Test',
        'TestSite2': 'TestSite2',
        'Örnek Müşteri A': 'Örnek Müşteri A'
    };

    let html = `
        <div class="folder-item" onclick="loadBackupDirectory('')"
             style="padding: 10px; cursor: pointer; border-radius: 5px; margin-bottom: 10px; transition: all 0.3s; ${currentBackupDirectory === '' ? 'background: #3498db; color: white;' : 'border: 2px dashed #ddd;'}"
             onmouseover="if (!this.style.color) this.style.borderColor='#3498db'"
             onmouseout="if (!this.style.color) this.style.borderColor='#ddd'">
            <i class="fas fa-th-large" style="margin-right: 8px;"></i> <strong>Tüm Backuplar</strong>
        </div>
        <div style="border-bottom: 2px solid #e0e0e0; margin-bottom: 10px;"></div>
    `;

    directories.forEach(category => {
        const color = categoryColors[category.name] || '#95a5a6';
        const isExpanded = currentBackupDirectory.startsWith(category.path);
        const isCurrentCategory = currentBackupDirectory === category.path;

        html += `
            <div style="margin-bottom: 8px;">
                <div class="folder-item" onclick="toggleBackupCategory('${category.path}')"
                     style="padding: 8px 10px; cursor: pointer; border-radius: 5px; display: flex; justify-content: space-between; align-items: center; ${isCurrentCategory ? 'background: #e8f4f8;' : ''} transition: all 0.3s;"
                     onmouseover="if (!this.style.background || this.style.background === '') this.style.background='#f8f9fa'"
                     onmouseout="if (this.style.background === 'rgb(248, 249, 250)') this.style.background=''">
                    <span>
                        <i class="fas fa-chevron-right" id="chevron-${category.name}" style="font-size: 0.7em; margin-right: 8px; transition: transform 0.3s; ${isExpanded ? 'transform: rotate(90deg);' : ''}"></i>
                        <i class="fas fa-folder" style="color: ${color};"></i> <strong>${categoryLabels[category.name] || category.name}</strong>
                    </span>
                    <span style="font-size: 0.85em; color: #95a5a6; font-weight: 600;">${category.file_count}</span>
                </div>
                <div id="devices-${category.name}" style="margin-left: 15px; display: ${isExpanded ? 'block' : 'none'};">
        `;

        category.devices.forEach(device => {
            const isSelected = currentBackupDirectory === device.path;
            const hasSubdirectories = device.subdirectories && device.subdirectories.length > 0;
            const isDeviceExpanded = currentBackupDirectory.startsWith(device.path + '/');
            const deviceId = device.path.replace(/[\/\s]/g, '_');

            if (hasSubdirectories) {
                // Alt dizinli cihazlar için
                html += `
                    <div style="margin-bottom: 3px;">
                        <div class="folder-item" onclick="toggleBackupDevice('${device.path}')"
                             style="padding: 6px 10px; cursor: pointer; border-radius: 5px; font-size: 0.9em; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s; ${isSelected ? 'background: #e8f4f8;' : ''}"
                             onmouseover="if (!this.style.color && this.style.background !== 'rgb(232, 244, 248)') { this.style.background='#f8f9fa'; this.style.paddingLeft='12px'; }"
                             onmouseout="if (this.style.background === 'rgb(248, 249, 250)') { this.style.background=''; this.style.paddingLeft='10px'; }">
                            <span>
                                <i class="fas fa-chevron-right" id="chevron-${deviceId}" style="font-size: 0.6em; margin-right: 6px; transition: transform 0.3s; ${isDeviceExpanded ? 'transform: rotate(90deg);' : ''}"></i>
                                <i class="fas fa-folder" style="font-size: 0.85em; margin-right: 6px; color: #f39c12;"></i> ${device.name}
                            </span>
                            <span style="font-size: 0.85em; opacity: 0.8;">${device.file_count}</span>
                        </div>
                        <div id="subdirs-${deviceId}" style="margin-left: 20px; display: ${isDeviceExpanded ? 'block' : 'none'};">
                `;

                // Alt dizinleri render et
                device.subdirectories.forEach(subdir => {
                    const isSubdirSelected = currentBackupDirectory === subdir.path;
                    html += `
                        <div class="folder-item" onclick="loadBackupDirectory('${subdir.path}')"
                             style="padding: 5px 10px; margin-bottom: 2px; cursor: pointer; border-radius: 5px; font-size: 0.85em; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s; ${isSubdirSelected ? 'background: #3498db; color: white;' : ''}"
                             onmouseover="if (!this.style.color) { this.style.background='#e8f4f8'; this.style.paddingLeft='12px'; }"
                             onmouseout="if (this.style.background === 'rgb(232, 244, 248)') { this.style.background=''; this.style.paddingLeft='10px'; }">
                            <span><i class="fas fa-hdd" style="font-size: 0.85em; margin-right: 6px;"></i> ${subdir.name}</span>
                            <span style="font-size: 0.85em; opacity: 0.8;">${subdir.file_count}</span>
                        </div>
                    `;
                });

                html += `
                        </div>
                    </div>
                `;
            } else {
                // Alt dizinsiz cihazlar için (eski düz yapı)
                html += `
                    <div class="folder-item" onclick="loadBackupDirectory('${device.path}')"
                         style="padding: 6px 10px; margin-bottom: 3px; cursor: pointer; border-radius: 5px; font-size: 0.9em; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s; ${isSelected ? 'background: #3498db; color: white;' : ''}"
                         onmouseover="if (!this.style.color) { this.style.background='#e8f4f8'; this.style.paddingLeft='12px'; }"
                         onmouseout="if (this.style.background === 'rgb(232, 244, 248)') { this.style.background=''; this.style.paddingLeft='10px'; }">
                        <span><i class="fas fa-hdd" style="font-size: 0.85em; margin-right: 6px;"></i> ${device.name}</span>
                        <span style="font-size: 0.85em; opacity: 0.8;">${device.file_count}</span>
                    </div>
                `;
            }
        });

        html += `
                </div>
            </div>
        `;
    });

    treeContainer.innerHTML = html;
}

// Kategoriyi aç/kapat
function toggleBackupCategory(categoryPath) {
    const categoryName = categoryPath.split('/')[0];
    const devicesDiv = document.getElementById('devices-' + categoryName);
    const chevron = document.getElementById('chevron-' + categoryName);

    if (devicesDiv) {
        const isHidden = devicesDiv.style.display === 'none';
        devicesDiv.style.display = isHidden ? 'block' : 'none';

        // Chevron ikonunu döndür
        if (chevron) {
            if (isHidden) {
                chevron.style.transform = 'rotate(90deg)';
            } else {
                chevron.style.transform = 'rotate(0deg)';
            }
        }

        // Eğer açıyorsak, kategoriyi yükle
        if (isHidden) {
            loadBackupDirectory(categoryPath);
        }
    }
}

// Cihaz alt dizinlerini aç/kapat
function toggleBackupDevice(devicePath) {
    const deviceId = devicePath.replace(/[\/\s]/g, '_');
    const subdirsDiv = document.getElementById('subdirs-' + deviceId);
    const chevron = document.getElementById('chevron-' + deviceId);

    if (subdirsDiv) {
        const isHidden = subdirsDiv.style.display === 'none';
        subdirsDiv.style.display = isHidden ? 'block' : 'none';

        // Chevron ikonunu döndür
        if (chevron) {
            if (isHidden) {
                chevron.style.transform = 'rotate(90deg)';
            } else {
                chevron.style.transform = 'rotate(0deg)';
            }
        }
    }
}

// Dizindeki dosyaları yükle
function loadBackupDirectory(directory, filter = '') {
    currentBackupDirectory = directory;
    currentBackupPath = directory;
    window.currentBackupFilter = filter; // Filtreyi sakla

    const searchInput = document.getElementById('backup-search-input');
    const sortSelect = document.getElementById('backup-sort-select');
    const grid = document.getElementById('backups-grid');

    // Loading göster
    grid.innerHTML = `
        <div style="text-align: center; padding: 60px 20px; color: #7f8c8d;">
            <i class="fas fa-sync fa-spin" style="font-size: 3em; margin-bottom: 15px; color: #cbd5e0;"></i>
            <p style="margin: 0; font-size: 15px;">Yükleniyor...</p>
        </div>
    `;

    // Breadcrumb güncelle
    updateBackupBreadcrumb(directory);

    // API'den dosyaları çek
    const params = new URLSearchParams({
        directory: directory,
        search: searchInput ? searchInput.value : '',
        sort: sortSelect ? sortSelect.value : 'date_desc'
    });

    // Filtre varsa ekle (empty = sadece boş dosyalar)
    if (filter) {
        params.append('filter', filter);
    }

    fetch(`get-backups.php?${params}`, {
        credentials: 'same-origin'
    })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                displayBackups(data.files);
                document.getElementById('backup-file-count').textContent = data.total;

                // İstatistikleri güncelle
                if (data.overall_stats) {
                    const stats = data.overall_stats;
                    document.getElementById('backup-stat-total').textContent = stats.total_files;
                    document.getElementById('backup-stat-success').textContent = stats.successful_files;
                    document.getElementById('backup-stat-empty').textContent = stats.empty_files;
                    document.getElementById('backup-stat-size').textContent = stats.total_size_formatted;
                    document.getElementById('backup-stat-1h').textContent = stats.last_1h_count;

                    // Yüzde hesapla
                    const successPercent = stats.total_files > 0 ? ((stats.successful_files / stats.total_files) * 100).toFixed(1) : 0;
                    const emptyPercent = stats.total_files > 0 ? ((stats.empty_files / stats.total_files) * 100).toFixed(1) : 0;
                    document.getElementById('backup-stat-success-percent').textContent = `${successPercent}% başarı oranı`;
                    document.getElementById('backup-stat-empty-percent').textContent = `${emptyPercent}% başarısız`;
                }
            } else {
                grid.innerHTML = `
                    <div style="text-align: center; padding: 60px 20px; color: #e74c3c;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 3em; margin-bottom: 15px;"></i>
                        <p style="margin: 0; font-size: 15px;">${data.message || 'Hata oluştu'}</p>
                    </div>
                `;
            }

            // Dizin ağacını yeniden render et (seçili dizini vurgulamak için)
            if (backupDirectories.length > 0) {
                renderBackupDirectoryTree(backupDirectories);
            }
        })
        .catch(error => {
            console.error('Backup yükleme hatası:', error);
            grid.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: #e74c3c;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3em; margin-bottom: 15px;"></i>
                    <p style="margin: 0; font-size: 15px;">Bağlantı hatası</p>
                </div>
            `;
        });
}

// Breadcrumb güncelle
function updateBackupBreadcrumb(directory) {
    const breadcrumb = document.getElementById('backup-breadcrumb');
    const currentPathTitle = document.getElementById('backup-current-path');

    if (!directory || directory === '') {
        breadcrumb.innerHTML = `
            <i class="fas fa-folder-open"></i>
            <span style="color: #3498db; font-weight: 600;">Tümü</span>
        `;
        currentPathTitle.textContent = 'Tüm Backuplar';
        return;
    }

    const breadcrumbCategoryLabels = {
        'AnsibleProd': 'Cyberwebeyeos Prod',
        'CyberwebeyeosDRC': 'Cyberwebeyeos DRC',
        'TestSite1': 'Cyberwebeyeos Test',
        'TestSite2': 'TestSite2',
        'Örnek Müşteri A': 'Örnek Müşteri A'
    };

    const parts = directory.split('/');
    let html = `<i class="fas fa-folder-open"></i>`;
    html += ` <span onclick="loadBackupDirectory('')" style="cursor: pointer; color: #3498db; text-decoration: underline;">Tümü</span>`;

    let path = '';
    parts.forEach((part, index) => {
        path += (index > 0 ? '/' : '') + part;
        const isLast = index === parts.length - 1;
        const label = index === 0 ? (breadcrumbCategoryLabels[part] || part) : part;

        html += ` <i class="fas fa-chevron-right" style="font-size: 0.7em; margin: 0 5px; opacity: 0.5;"></i> `;

        if (isLast) {
            html += `<span style="color: #3498db; font-weight: 600;">${label}</span>`;
        } else {
            const currentPath = path;
            html += `<span onclick="loadBackupDirectory('${currentPath}')" style="cursor: pointer; color: #3498db; text-decoration: underline;">${label}</span>`;
        }
    });

    breadcrumb.innerHTML = html;
    currentPathTitle.textContent = parts[parts.length - 1];
}

// Backup dosyalarını görüntüle
function displayBackups(files) {
    const grid = document.getElementById('backups-grid');

    if (!files || files.length === 0) {
        grid.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: #7f8c8d;">
                <i class="fas fa-folder-open" style="font-size: 3em; margin-bottom: 15px; color: #cbd5e0;"></i>
                <p style="margin: 0; font-size: 15px;">Backup dosyası bulunamadı</p>
            </div>
        `;
        return;
    }

    let html = '';

    files.forEach(file => {
        const categoryColors = {
            'AnsibleProd': '#9b59b6',
            'CyberwebeyeosDRC': '#2980b9',
            'TestSite1': '#f39c12',
            'Örnek Müşteri A': '#e74c3c',
            'TestSite2': '#27ae60',
            'Production': '#9b59b6',
            'Ansible': '#9b59b6'
        };
        const categoryColor = categoryColors[file.category] || '#95a5a6';

        // Check if file is empty (0 bytes) - mark as failed
        const isEmpty = file.size === 0;
        const borderStyle = isEmpty ? 'border: 2px solid #e74c3c;' : 'border: 1px solid #e0e0e0;';
        const backgroundStyle = isEmpty ? 'background: linear-gradient(135deg, #fff5f5 0%, #ffe5e5 100%);' : 'background: white;';

        // Build tags HTML - use file.tags from database or extract from path
        let tagsHTML = '';
        let tagsToShow = [];

        // Önce database'den gelen tag'leri ekle
        if (file.tags && Array.isArray(file.tags) && file.tags.length > 0) {
            tagsToShow = file.tags.filter(tag => tag && tag !== 'production'); // 'production' tag'ini gizle
        } else {
            // Eğer tag yoksa path'den çıkar
            if (file.path) {
                const parts = file.path.split('/');
                if (parts.length >= 2) {
                    tagsToShow.push(parts[1]); // Get device/directory name
                }
            }
        }

        // Tag'leri görsel olarak oluştur
        if (tagsToShow.length > 0) {
            const tagElements = tagsToShow.map(tag => `
                <span style="display: inline-block; background: linear-gradient(135deg, ${categoryColor}22, ${categoryColor}44); color: ${categoryColor}; padding: 3px 8px; border-radius: 4px; font-size: 0.75em; font-weight: 600; margin-right: 4px; margin-bottom: 4px;">
                    <i class="fas fa-tag" style="font-size: 0.85em; margin-right: 3px;"></i>${tag}
                </span>
            `).join('');

            tagsHTML = `
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #f0f0f0; display: none; flex-wrap: wrap; gap: 4px;">
                    ${tagElements}
                </div>
            `;
        }

        // Empty file warning badge
        const emptyBadge = isEmpty ? `
            <div style="position: absolute; top: 8px; right: 8px; background: #e74c3c; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.7em; font-weight: 700; box-shadow: 0 2px 4px rgba(231,76,60,0.3);">
                <i class="fas fa-exclamation-triangle"></i> 0 BYTE
            </div>
        ` : '';

        html += `
            <div class="backup-file-card" onclick="openBackupPreview('${file.file_id}')" style="${borderStyle} ${backgroundStyle} border-radius: 8px; padding: 12px; transition: all 0.3s; cursor: pointer; position: relative;"
                 onmouseover="this.style.boxShadow='0 6px 16px rgba(0,0,0,0.12)'; this.style.transform='translateY(-3px)'; this.style.borderColor='${isEmpty ? '#e74c3c' : categoryColor}';"
                 onmouseout="this.style.boxShadow=''; this.style.transform='translateY(0)'; this.style.borderColor='${isEmpty ? '#e74c3c' : '#e0e0e0'}';">
                ${emptyBadge}
                <div style="text-align: center; margin-bottom: 10px;">
                    <div style="display: inline-block; background: linear-gradient(135deg, ${categoryColor}22, ${categoryColor}44); padding: 15px; border-radius: 8px;">
                        <i class="fas ${file.icon}" style="font-size: 2.5em; color: ${categoryColor};"></i>
                    </div>
                </div>
                <div style="font-weight: 600; color: #2c3e50; margin-bottom: 8px; word-break: break-word; font-size: 0.85em; line-height: 1.3; text-align: center;" title="${file.name}">
                    ${file.name.length > 30 ? file.name.substring(0, 30) + '...' : file.name}
                </div>
                <div style="font-size: 0.75em; color: ${isEmpty ? '#e74c3c' : '#7f8c8d'}; text-align: center; margin-bottom: 8px; font-weight: ${isEmpty ? '700' : 'normal'};">
                    <div style="margin-bottom: 3px;"><i class="fas fa-hdd" style="width: 14px;"></i> ${file.size_formatted}</div>
                    <div><i class="fas fa-calendar" style="width: 14px;"></i> ${file.modified_formatted}</div>
                </div>
                ${tagsHTML}
                <div style="display: flex; gap: 5px; margin-top: 10px; padding-top: 10px; border-top: 1px solid #f0f0f0;">
                    <button onclick="event.stopPropagation(); openBackupPreview('${file.file_id}')"
                            class="btn-small"
                            style="flex: 1; padding: 6px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 0.8em; font-weight: 500; transition: all 0.2s;"
                            onmouseover="this.style.transform='scale(1.02)'; this.style.boxShadow='0 2px 8px rgba(102,126,234,0.4)';"
                            onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='';"
                            title="Önizle">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="event.stopPropagation(); downloadBackupFile('${file.file_id}', '${file.name}')"
                            class="btn-small"
                            style="padding: 6px 10px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 0.8em; transition: all 0.2s;"
                            onmouseover="this.style.background='#2980b9'; this.style.transform='scale(1.02)';"
                            onmouseout="this.style.background='#3498db'; this.style.transform='scale(1)';"
                            title="İndir">
                        <i class="fas fa-download"></i>
                    </button>
                </div>
            </div>
        `;
    });

    grid.innerHTML = html;
}

// Önizleme modalını aç
function openBackupPreview(fileId) {
    currentPreviewFileId = fileId;
    const modal = document.getElementById('backup-preview-modal');
    const contentDiv = document.getElementById('backup-preview-content');

    // Modal'ı göster
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';

    // Loading göster
    contentDiv.innerHTML = `
        <div style="text-align: center; padding: 60px 20px; color: #95a5a6;">
            <i class="fas fa-sync fa-spin" style="font-size: 3em; margin-bottom: 15px;"></i>
            <p style="margin: 0; font-size: 1.1em;">Önizleme yükleniyor...</p>
        </div>
    `;

    // Önizlemeyi yükle
    fetch(`get-backup-preview.php?id=${fileId}`, {
        credentials: 'same-origin'
    })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                const file = data.file;
                const preview = data.preview;

                // Başlık ve bilgileri güncelle
                document.getElementById('backup-preview-title').innerHTML = `
                    <i class="fas fa-file-code"></i>
                    <span>${file.name}</span>
                `;
                document.getElementById('bp-category').textContent = file.category;
                document.getElementById('bp-size').textContent = file.size_formatted;
                document.getElementById('bp-date').textContent = file.modified_formatted;

                // İçeriği göster
                if (preview.type === 'text') {
                    contentDiv.innerHTML = `
                        <pre style="background: #f8f9fa; padding: 20px; border-radius: 6px; overflow-x: auto; margin: 0; font-family: 'Courier New', Consolas, monospace; font-size: 13px; line-height: 1.6; color: #2c3e50; white-space: pre-wrap; word-wrap: break-word; max-height: 80vh;">${escapeHtml(preview.content)}</pre>
                    `;
                } else if (preview.type === 'image') {
                    contentDiv.innerHTML = `
                        <div style="text-align: center;">
                            <img src="${preview.content}" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" alt="${file.name}">
                        </div>
                    `;
                } else if (preview.type === 'not_available') {
                    contentDiv.innerHTML = `
                        <div style="text-align: center; padding: 60px 20px;">
                            <i class="fas fa-cloud-download-alt" style="font-size: 4em; color: #f39c12; margin-bottom: 20px;"></i>
                            <pre style="font-size: 1.05em; color: #7f8c8d; margin: 0 auto; max-width: 600px; text-align: left; background: #fff8e1; padding: 20px; border-radius: 8px; border-left: 4px solid #f39c12; font-family: inherit; white-space: pre-wrap;">${preview.content}</pre>
                            <button onclick="downloadBackupFromPreview()" style="margin-top: 25px; padding: 14px 28px; background: linear-gradient(135deg, #3498db, #2980b9); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 1.05em; font-weight: 600; transition: all 0.3s; box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3);" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(52, 152, 219, 0.4)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(52, 152, 219, 0.3)';">
                                <i class="fas fa-download"></i> Dosya İndirme Talebi Oluştur
                            </button>
                        </div>
                    `;
                } else if (preview.type === 'binary' || preview.type === 'archive' || preview.type === 'pdf') {
                    contentDiv.innerHTML = `
                        <div style="text-align: center; padding: 60px 20px;">
                            <i class="fas fa-file-archive" style="font-size: 4em; color: #95a5a6; margin-bottom: 20px;"></i>
                            <p style="font-size: 1.1em; color: #7f8c8d; margin: 0;">${preview.content}</p>
                            <button onclick="downloadBackupFromPreview()" style="margin-top: 20px; padding: 12px 24px; background: #3498db; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 1em;">
                                <i class="fas fa-download"></i> Dosyayı İndir
                            </button>
                        </div>
                    `;
                }
            } else {
                contentDiv.innerHTML = `
                    <div style="text-align: center; padding: 60px 20px; color: #e74c3c;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 3em; margin-bottom: 15px;"></i>
                        <p style="margin: 0; font-size: 1.1em;">${data.message || 'Önizleme yüklenemedi'}</p>
                    </div>
                `;
            }
        })
        .catch(error => {
            console.error('Önizleme yükleme hatası:', error);
            contentDiv.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: #e74c3c;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3em; margin-bottom: 15px;"></i>
                    <p style="margin: 0; font-size: 1.1em;">Bağlantı hatası</p>
                </div>
            `;
        });
}

// Önizleme modalını kapat
function closeBackupPreview() {
    const modal = document.getElementById('backup-preview-modal');
    modal.style.display = 'none';
    document.body.style.overflow = '';
    currentPreviewFileId = null;
    // Clear search
    clearBackupSearch();
}

// Backup preview search variables
let backupSearchMatches = [];
let backupSearchCurrentIndex = -1;
let backupOriginalContent = '';

// Search in backup preview
function searchInBackupPreview() {
    const searchInput = document.getElementById('backup-search-input-preview');
    const searchTerm = searchInput.value.trim();
    const contentDiv = document.getElementById('backup-preview-content');
    const countSpan = document.getElementById('backup-search-count');
    const prevBtn = document.getElementById('backup-search-prev');
    const nextBtn = document.getElementById('backup-search-next');

    // If no search term, restore original content
    if (searchTerm.length === 0) {
        if (backupOriginalContent) {
            contentDiv.innerHTML = backupOriginalContent;
        }
        countSpan.textContent = '-';
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        backupSearchMatches = [];
        backupSearchCurrentIndex = -1;
        return;
    }

    // Save original content if not saved yet
    if (!backupOriginalContent) {
        backupOriginalContent = contentDiv.innerHTML;
    }

    // Get text content
    const preElement = contentDiv.querySelector('pre');
    if (!preElement) {
        countSpan.textContent = '0 sonuç';
        return;
    }

    const text = preElement.textContent;

    // Find all matches (case insensitive)
    backupSearchMatches = [];
    const searchRegex = new RegExp(escapeRegExp(searchTerm), 'gi');
    let match;
    while ((match = searchRegex.exec(text)) !== null) {
        backupSearchMatches.push({
            index: match.index,
            length: searchTerm.length
        });
    }

    if (backupSearchMatches.length === 0) {
        countSpan.textContent = '0 sonuç';
        contentDiv.innerHTML = backupOriginalContent;
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        backupSearchCurrentIndex = -1;
        return;
    }

    // Highlight all matches
    let highlightedText = '';
    let lastIndex = 0;

    backupSearchMatches.forEach((m, idx) => {
        // Add text before match
        highlightedText += escapeHtml(text.substring(lastIndex, m.index));

        // Add highlighted match
        const matchText = text.substring(m.index, m.index + m.length);
        highlightedText += `<mark id="search-match-${idx}" style="background: yellow; padding: 2px 0; border-radius: 2px;">${escapeHtml(matchText)}</mark>`;

        lastIndex = m.index + m.length;
    });

    // Add remaining text
    highlightedText += escapeHtml(text.substring(lastIndex));

    // Update content
    preElement.innerHTML = highlightedText;

    // Update counter
    countSpan.textContent = `${backupSearchMatches.length} sonuç`;

    // Enable navigation buttons
    prevBtn.disabled = false;
    nextBtn.disabled = false;

    // Navigate to first match
    backupSearchCurrentIndex = 0;
    scrollToSearchMatch();
}

// Navigate between search results
function navigateBackupSearch(direction) {
    if (backupSearchMatches.length === 0) return;

    if (direction === 'next') {
        backupSearchCurrentIndex = (backupSearchCurrentIndex + 1) % backupSearchMatches.length;
    } else {
        backupSearchCurrentIndex = (backupSearchCurrentIndex - 1 + backupSearchMatches.length) % backupSearchMatches.length;
    }

    scrollToSearchMatch();
}

// Scroll to current search match
function scrollToSearchMatch() {
    const contentDiv = document.getElementById('backup-preview-content');
    const countSpan = document.getElementById('backup-search-count');

    // Update counter with current position
    countSpan.textContent = `${backupSearchCurrentIndex + 1} / ${backupSearchMatches.length}`;

    // Remove previous current highlight
    const prevCurrent = contentDiv.querySelector('.search-current');
    if (prevCurrent) {
        prevCurrent.classList.remove('search-current');
        prevCurrent.style.background = 'yellow';
    }

    // Highlight current match
    const currentMatch = document.getElementById(`search-match-${backupSearchCurrentIndex}`);
    if (currentMatch) {
        currentMatch.classList.add('search-current');
        currentMatch.style.background = 'orange';
        currentMatch.style.fontWeight = 'bold';

        // Scroll to match
        currentMatch.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    }
}

// Clear backup search
function clearBackupSearch() {
    const searchInput = document.getElementById('backup-search-input-preview');
    const contentDiv = document.getElementById('backup-preview-content');
    const countSpan = document.getElementById('backup-search-count');
    const prevBtn = document.getElementById('backup-search-prev');
    const nextBtn = document.getElementById('backup-search-next');

    searchInput.value = '';
    countSpan.textContent = '-';
    prevBtn.disabled = true;
    nextBtn.disabled = true;

    if (backupOriginalContent) {
        contentDiv.innerHTML = backupOriginalContent;
        backupOriginalContent = '';
    }

    backupSearchMatches = [];
    backupSearchCurrentIndex = -1;
}

// Escape special regex characters
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Önizlemedeki dosyayı indir
function downloadBackupFromPreview() {
    if (currentPreviewFileId) {
        downloadBackupFile(currentPreviewFileId, '');
    }
}

// Backup dosyasını indir
function downloadBackupFile(fileId, fileName) {
    window.demoFiles.downloadBackup(fileId);
}

// HTML escape
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Backup listesini yükle (mevcut dizindeki dosyaları yeniden yükler)
function loadBackups() {
    loadBackupDirectory(currentBackupDirectory || '');
}

// Backup arama
function searchBackups() {
    if (backupSearchTimer) {
        clearTimeout(backupSearchTimer);
    }
    backupSearchTimer = setTimeout(() => {
        loadBackupDirectory(currentBackupDirectory);
    }, 300);
}

// ============================================================================
// BAŞARISIZ BACKUPLARI GÖSTER - Bugünkü başarısızlar
// ============================================================================
window.filterFailedBackups = async function() {
    // Önce mevcut modal varsa kaldır
    let oldModal = document.getElementById('failed-backup-popup');
    if (oldModal) oldModal.remove();

    // Modal HTML oluştur
    const modal = document.createElement('div');
    modal.id = 'failed-backup-popup';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:999999;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = '<div style="background:white;border-radius:12px;width:90%;max-width:800px;max-height:80vh;overflow:hidden;box-shadow:0 10px 50px rgba(0,0,0,0.3);"><div style="background:linear-gradient(135deg,#e74c3c,#c0392b);color:white;padding:20px;display:flex;justify-content:space-between;align-items:center;"><div><h2 style="margin:0;font-size:1.4em;"><i class="fas fa-exclamation-triangle"></i> Bugünkü Başarısız Backuplar</h2><small id="fbp-count">Yükleniyor...</small></div><button onclick="document.getElementById(\'failed-backup-popup\').remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:35px;height:35px;border-radius:5px;cursor:pointer;font-size:1.2em;">&times;</button></div><div id="fbp-content" style="padding:20px;overflow-y:auto;max-height:calc(80vh - 80px);"><div style="text-align:center;padding:40px;"><i class="fas fa-spinner fa-spin" style="font-size:2em;color:#7f8c8d;"></i></div></div></div>';
    document.body.appendChild(modal);

    // Dışarı tıklayınca kapat
    modal.onclick = function(e) { if (e.target === modal) modal.remove(); };

    // Verileri çek - BUGÜNKÜ boş dosyalar
    try {
        const response = await fetch('get-backups.php?filter=empty_today&limit=500');
        const data = await response.json();
        const content = document.getElementById('fbp-content');
        const countEl = document.getElementById('fbp-count');

        if (data.status !== 'success' || !data.files || data.files.length === 0) {
            countEl.textContent = '0 dosya';
            content.innerHTML = '<div style="text-align:center;padding:40px;color:#27ae60;"><i class="fas fa-check-circle" style="font-size:3em;"></i><p style="margin-top:15px;font-size:1.1em;">Bugün tüm backuplar başarılı!</p></div>';
            return;
        }

        countEl.textContent = data.files.length + ' başarısız backup';

        // Kategoriye göre grupla
        const grouped = {};
        data.files.forEach(f => {
            const cat = f.category || 'Diğer';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(f);
        });

        let html = '';
        Object.keys(grouped).sort().forEach(cat => {
            html += '<div style="margin-bottom:25px;">';
            html += '<div style="background:linear-gradient(135deg,#2c3e50,#34495e);color:white;padding:12px 15px;border-radius:8px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;">';
            html += '<span style="font-weight:600;font-size:1.1em;"><i class="fas fa-server" style="margin-right:10px;"></i>' + cat + '</span>';
            html += '<span style="background:#e74c3c;padding:4px 12px;border-radius:15px;font-size:0.9em;">' + grouped[cat].length + ' başarısız</span></div>';

            grouped[cat].forEach(f => {
                // Path'den cihaz adını çıkar (format: Production/Ansible/DEVICE_NAME)
                const pathParts = f.path ? f.path.split('/') : [];
                const deviceName = pathParts.length > 2 ? pathParts[2] : (pathParts[pathParts.length - 1] || '-');

                html += '<div style="background:#fff5f5;border-left:4px solid #e74c3c;padding:12px 15px;margin-bottom:8px;border-radius:0 8px 8px 0;">';
                html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">';
                html += '<span style="font-weight:600;color:#2c3e50;font-size:1.05em;"><i class="fas fa-hdd" style="color:#e74c3c;margin-right:8px;"></i>' + deviceName + '</span>';
                html += '<span style="color:#7f8c8d;font-size:0.85em;"><i class="fas fa-clock"></i> ' + f.modified_formatted + '</span></div>';
                html += '<div style="color:#7f8c8d;font-size:0.9em;padding-left:24px;"><i class="fas fa-file-alt" style="margin-right:6px;"></i>' + f.name + '</div>';
                html += '</div>';
            });

            html += '</div>';
        });

        content.innerHTML = html;
    } catch (e) {
        document.getElementById('fbp-content').innerHTML = '<div style="text-align:center;padding:40px;color:#e74c3c;"><i class="fas fa-exclamation-circle" style="font-size:3em;"></i><p>Hata: ' + e.message + '</p></div>';
    }
};

// Certificate search + filter
// Hem #all-certificates hem #expiring-soon tablolarını aynı anda filtreler.
// Ayrıca Servis ve Durum filtrelerini (varsa) uygular.
function searchCertificates() {
    const searchInput = document.getElementById('certificate-search-input');
    const filter = searchInput ? searchInput.value.toLowerCase() : '';

    // Filtre selector'larından servis/durum okuma (boş string → herşeyi geçir)
    const filterSelects = document.querySelectorAll('#certificates-page .filter-select');
    let serviceFilter = '';
    let statusFilter  = '';
    filterSelects.forEach((sel, idx) => {
        if (idx === 0) serviceFilter = (sel.value || '').toLowerCase();
        if (idx === 1) statusFilter  = (sel.value || '').toLowerCase();
    });

    const matches = (row) => {
        const text = (row.textContent || '').toLowerCase();
        if (filter && !text.includes(filter)) return false;
        if (serviceFilter && !text.includes(serviceFilter)) return false;
        if (statusFilter) {
            // "active/expiring/expired" → status sütunundaki metne bak
            const statusCell = row.querySelector('.status');
            if (statusCell) {
                const cls = statusCell.className.toLowerCase();
                if (statusFilter === 'active'   && !cls.includes('status-active'))   return false;
                if (statusFilter === 'expiring' && !(cls.includes('status-warning') || cls.includes('status-danger'))) return false;
                if (statusFilter === 'expired'  && !cls.includes('status-expired'))  return false;
            }
        }
        return true;
    };

    ['#all-certificates table', '#expiring-soon table'].forEach(sel => {
        const table = document.querySelector(sel);
        if (!table) return;
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
            row.style.display = matches(row) ? '' : 'none';
        });
    });
}

// Servis/Durum filtre değişikliklerini de bağla
document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('#certificates-page .filter-select').forEach(sel => {
        sel.addEventListener('change', searchCertificates);
    });
});

// Backup senkronizasyonu
function syncBackups() {
    const btn = document.getElementById('sync-backups-btn');
    const originalHTML = btn.innerHTML;

    btn.innerHTML = '<i class="fas fa-sync fa-spin"></i> Senkronize Ediliyor...';
    btn.disabled = true;

    fetch('sync-backups.php?action=sync')
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                btn.innerHTML = '<i class="fas fa-check"></i> Tamamlandı!';
                btn.style.background = '#27ae60';

                // Bildirim göster
                const message = `${data.files_synced} dosya senkronize edildi.`;
                alert(message);

                // Listeyi yenile
                setTimeout(() => {
                    loadBackups();
                    btn.innerHTML = originalHTML;
                    btn.disabled = false;
                    btn.style.background = '';
                }, 2000);
            } else {
                btn.innerHTML = '<i class="fas fa-times"></i> Hata!';
                btn.style.background = '#e74c3c';
                alert('Senkronizasyon hatası: ' + (data.message || 'Bilinmeyen hata'));

                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                    btn.disabled = false;
                    btn.style.background = '';
                }, 2000);
            }
        })
        .catch(error => {
            console.error('Senkronizasyon hatası:', error);
            btn.innerHTML = '<i class="fas fa-times"></i> Hata!';
            btn.style.background = '#e74c3c';
            alert('Bağlantı hatası: ' + error.message);

            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.disabled = false;
                btn.style.background = '';
            }, 2000);
        });
}

// Production Ansible backup senkronizasyonu
function syncProductionBackups() {
    const btn = document.getElementById('sync-prod-btn');
    const originalHTML = btn.innerHTML;

    btn.innerHTML = '<i class="fas fa-sync fa-spin"></i> Senkronize Ediliyor...';
    btn.disabled = true;

    fetch('sync-backups-prod.php?action=sync')
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                btn.innerHTML = '<i class="fas fa-check"></i> Tamamlandı!';
                btn.style.background = '#27ae60';

                // Bildirim göster
                const message = `Production: ${data.files_synced} dosya senkronize edildi.`;
                alert(message);

                // Dizin ağacını ve listeyi yenile
                setTimeout(() => {
                    loadBackupDirectoryTree();
                    loadBackups();
                    btn.innerHTML = originalHTML;
                    btn.disabled = false;
                    btn.style.background = '#9b59b6';
                }, 2000);
            } else {
                btn.innerHTML = '<i class="fas fa-times"></i> Hata!';
                btn.style.background = '#e74c3c';
                alert('Senkronizasyon hatası: ' + (data.message || 'Bilinmeyen hata'));

                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                    btn.disabled = false;
                    btn.style.background = '#9b59b6';
                }, 2000);
            }
        })
        .catch(error => {
            console.error('Production senkronizasyon hatası:', error);
            btn.innerHTML = '<i class="fas fa-times"></i> Hata!';
            btn.style.background = '#e74c3c';
            alert('Bağlantı hatası: ' + error.message);

            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.disabled = false;
                btn.style.background = '#9b59b6';
            }, 2000);
        });
}

// Senkronizasyon loglarını göster
function showSyncLogs() {
    alert('Senkronizasyon logları sayfası yakında eklenecek.');
}

// ==================== LIBRENMS INSTANCES ====================

let librenmsInstances = [];
let currentDevicesInstance = 1; // Default: Test LibreNMS
let currentMapsInstance = 1; // Default: Test LibreNMS
let currentAlertsInstance = 1; // Default: Test LibreNMS

// Load LibreNMS instances
function loadLibreNMSInstances() {
    console.log('🔄 Loading LibreNMS instances...');
    fetch('get-librenms-instances.php')
        .then(response => {
            console.log('📥 Response status:', response.status, response.statusText);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('📦 Parsed data:', data);
            if (data.success) {
                librenmsInstances = data.instances;
                console.log('✅ Loaded', data.count, 'LibreNMS instances');

                // Set default instance
                if (data.default_instance) {
                    window.currentDevicesInstance = data.default_instance.id;
                    window.currentMapsInstance = data.default_instance.id;
                    window.currentAlertsInstance = data.default_instance.id;
                    console.log('🎯 Default instance set:', window.currentAlertsInstance);
                }

                // Populate selectors
                populateInstanceSelectors();
            } else {
                console.error('❌ Failed to load LibreNMS instances:', data.error);
                alert('LibreNMS instances yüklenemedi: ' + data.error);
            }
        })
        .catch(error => {
            console.error('❌ Error loading LibreNMS instances:', error);
            console.error('❌ Error stack:', error.stack);
            // Don't show alert for fetch errors - they're often due to page navigation
            console.warn('⚠️ LibreNMS instances could not be loaded. This may be normal if navigating away from the page.');
        });
}

// Populate instance selectors
function populateInstanceSelectors() {
    const devicesSelector = document.getElementById('devices-instance-selector');
    const mapsSelector = document.getElementById('maps-instance-selector');
    const alertsSelector = document.getElementById('alerts-instance-selector');

    // Clear existing options
    [devicesSelector, mapsSelector, alertsSelector].forEach(selector => {
        if (selector) {
            selector.innerHTML = '';
        }
    });

    // Add options
    librenmsInstances.forEach(instance => {
        const label = `${instance.name} (${instance.environment})`;

        if (devicesSelector) {
            const option = new Option(label, instance.id);
            if (instance.id === window.currentDevicesInstance) option.selected = true;
            devicesSelector.add(option);
        }

        if (mapsSelector) {
            const option = new Option(label, instance.id);
            if (instance.id === window.currentMapsInstance) option.selected = true;
            mapsSelector.add(option);
        }

        if (alertsSelector) {
            const option = new Option(label, instance.id);
            if (instance.id === window.currentAlertsInstance) option.selected = true;
            alertsSelector.add(option);
        }
    });

    console.log('✅ Instance selectors populated');
}

// Change devices instance
function changeDevicesInstance() {
    const selector = document.getElementById('devices-instance-selector');
    window.currentDevicesInstance = parseInt(selector.value);
    console.log('🔄 Switched to devices instance:', window.currentDevicesInstance);
    loadDevices();
}

// Change maps instance
function changeMapsInstance() {
    const selector = document.getElementById('maps-instance-selector');
    window.currentMapsInstance = parseInt(selector.value);
    console.log('🔄 Switched to maps instance:', window.currentMapsInstance);
    loadMaps();
}

// Change alerts instance
function changeAlertsInstance() {
    const selector = document.getElementById('alerts-instance-selector');
    window.currentAlertsInstance = parseInt(selector.value);
    console.log('🔄 Switched to alerts instance:', window.currentAlertsInstance);
    loadAlerts();
}

// Load instances on page load
document.addEventListener('DOMContentLoaded', function() {
    loadLibreNMSInstances();
});

// ==================== CIHAZLAR (LibreNMS Devices) ====================

let allDevices = [];
let filteredDevices = [];

// Cihazları yükle
function loadDevices() {
    console.log('🔄 loadDevices() çağrıldı');
    const instanceId = window.currentDevicesInstance || 1;
    console.log('📡 API isteği gönderiliyor: get-librenms-devices.php?instance_id=' + instanceId);

    fetch('get-librenms-devices.php?instance_id=' + instanceId)
        .then(response => {
            console.log('📥 API yanıtı alındı, status:', response.status);
            return response.json();
        })
        .then(data => {
            console.log('📦 JSON verisi:', data);

            if (data.success) {
                console.log('✅ Başarılı! Cihaz sayısı:', data.count);
                allDevices = data.devices;
                filteredDevices = [...allDevices];

                // İstatistikleri güncelle
                updateDeviceStats();

                // Filtreleri doldur
                populateDeviceFilters();

                // Tabloyu göster
                renderDevicesTable();

                // Son güncelleme zamanını göster
                const now = new Date();
                document.getElementById('devices-last-update').textContent =
                    'Son güncelleme: ' + now.toLocaleString('tr-TR');

                console.log('✅ Cihazlar başarıyla yüklendi ve tabloya eklendi');
            } else {
                console.error('❌ API hatası:', data.error);
                showDeviceError(data.error || 'Cihazlar yüklenemedi');
            }
        })
        .catch(error => {
            console.error('❌ Cihaz yükleme hatası:', error);
            showDeviceError('Bağlantı hatası: ' + error.message);
        });
}

// İstatistikleri güncelle
function updateDeviceStats() {
    const total = allDevices.length;
    const online = allDevices.filter(d => d.status === 1).length;
    const offline = allDevices.filter(d => d.status === 0).length;

    // Benzersiz OS'leri ve tipleri say
    const uniqueOS = [...new Set(allDevices.map(d => d.os))].length;

    document.getElementById('total-devices-count').textContent = total;
    document.getElementById('online-devices-count').textContent = online;
    document.getElementById('offline-devices-count').textContent = offline;
    document.getElementById('device-types-count').textContent = uniqueOS;
    document.getElementById('devices-count').innerHTML = `Toplam Cihaz: <strong>${total}</strong>`;

    renderOfflineDevicesList();
}

// Pasif/down cihazları ayrı bir listede göster
function renderOfflineDevicesList() {
    const card = document.getElementById('offline-devices-card');
    const tbody = document.getElementById('offline-devices-tbody');
    const countEl = document.getElementById('offline-devices-inline-count');
    if (!card || !tbody) return;

    const offlineDevices = allDevices.filter(d => d.status === 0);
    countEl.textContent = offlineDevices.length;

    if (offlineDevices.length === 0) {
        card.style.display = 'none';
        tbody.innerHTML = '';
        return;
    }

    card.style.display = 'block';
    tbody.innerHTML = offlineDevices.map(d => `
        <tr>
            <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9;">${d.display || d.hostname || '-'}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9;">${d.ip || '-'}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9;">${d.os || '-'}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9;">${d.location || '-'}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9;">${d.last_polled || '-'}</td>
        </tr>
    `).join('');
}

// Filtreleri doldur
function populateDeviceFilters() {
    // OS filtresi
    const osSet = new Set(allDevices.map(d => d.os));
    const osFilter = document.getElementById('device-os-filter');
    osFilter.innerHTML = '<option value="">Tüm İşletim Sistemleri</option>';
    [...osSet].sort().forEach(os => {
        osFilter.innerHTML += `<option value="${os}">${os.toUpperCase()}</option>`;
    });

    // Type filtresi
    const typeSet = new Set(allDevices.map(d => d.type || 'network'));
    const typeFilter = document.getElementById('device-type-filter');
    typeFilter.innerHTML = '<option value="">Tüm Tipler</option>';
    [...typeSet].sort().forEach(type => {
        const displayType = type === '' ? 'Belirtilmemiş' : type;
        typeFilter.innerHTML += `<option value="${type}">${displayType}</option>`;
    });
}

// Cihazları tablo olarak göster
function renderDevicesTable() {
    const tbody = document.getElementById('devices-tbody');

    if (filteredDevices.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="padding: 40px; text-align: center; color: #7f8c8d;">
                    <i class="fas fa-search" style="font-size: 2rem;"></i>
                    <div style="margin-top: 10px;">Cihaz bulunamadı</div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = '';
    filteredDevices.forEach(device => {
        const statusBadge = device.status === 1
            ? '<span style="background: #27ae60; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem;"><i class="fas fa-check-circle"></i> Aktif</span>'
            : '<span style="background: #e74c3c; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem;"><i class="fas fa-times-circle"></i> Pasif</span>';

        const uptime = formatUptime(device.uptime);

        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid #ecf0f1';
        row.innerHTML = `
            <td style="padding: 12px;">${statusBadge}</td>
            <td style="padding: 12px; font-weight: 600;">${escapeHtml(device.display)}</td>
            <td style="padding: 12px; font-family: monospace;">${escapeHtml(device.ip)}</td>
            <td style="padding: 12px;">
                <span style="background: #3498db; color: white; padding: 3px 8px; border-radius: 3px; font-size: 0.85rem;">
                    ${escapeHtml(device.os.toUpperCase())}
                </span>
            </td>
            <td style="padding: 12px;">${escapeHtml(device.hardware)}</td>
            <td style="padding: 12px; font-size: 0.9rem;">${escapeHtml(device.version)}</td>
            <td style="padding: 12px;">${escapeHtml(device.location)}</td>
            <td style="padding: 12px; font-size: 0.9rem;">${uptime}</td>
            <td style="padding: 12px;">
                <button onclick="showDeviceDetails(${device.id})" class="btn" style="background: #3498db; color: white; padding: 6px 12px; border-radius: 4px; font-size: 0.85rem; margin-right: 5px;">
                    <i class="fas fa-info-circle"></i> Detay
                </button>
                <button onclick="showDeviceHealth(${device.id})" class="btn" style="background: #27ae60; color: white; padding: 6px 12px; border-radius: 4px; font-size: 0.85rem;">
                    <i class="fas fa-heartbeat"></i> Health
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Uptime formatla
function formatUptime(seconds) {
    if (!seconds || seconds === 0) return 'N/A';

    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
        return `${days}g ${hours}s`;
    } else if (hours > 0) {
        return `${hours}s ${minutes}d`;
    } else {
        return `${minutes}d`;
    }
}

// Filtreleme
function applyDeviceFilters() {
    const searchTerm = document.getElementById('device-search').value.toLowerCase();
    const osFilter = document.getElementById('device-os-filter').value;
    const statusFilter = document.getElementById('device-status-filter').value;
    const typeFilter = document.getElementById('device-type-filter').value;

    filteredDevices = allDevices.filter(device => {
        const matchesSearch = searchTerm === '' ||
            device.display.toLowerCase().includes(searchTerm) ||
            device.hostname.toLowerCase().includes(searchTerm) ||
            device.ip.includes(searchTerm) ||
            device.hardware.toLowerCase().includes(searchTerm);

        const matchesOS = osFilter === '' || device.os === osFilter;
        const matchesStatus = statusFilter === '' || device.status === parseInt(statusFilter);
        const matchesType = typeFilter === '' || device.type === typeFilter;

        return matchesSearch && matchesOS && matchesStatus && matchesType;
    });

    renderDevicesTable();
}

// Filtreleri temizle
function clearDeviceFilters() {
    document.getElementById('device-search').value = '';
    document.getElementById('device-os-filter').value = '';
    document.getElementById('device-status-filter').value = '';
    document.getElementById('device-type-filter').value = '';

    filteredDevices = [...allDevices];
    renderDevicesTable();
}

// Cihaz detaylarını göster
function showDeviceDetails(deviceId) {
    const device = allDevices.find(d => d.id === deviceId);
    if (!device) return;

    const modal = document.getElementById('device-details-modal');
    const content = document.getElementById('device-details-content');

    const statusText = device.status === 1 ? 'Aktif' : 'Pasif';
    const statusColor = device.status === 1 ? '#27ae60' : '#e74c3c';

    content.innerHTML = `
        <div style="padding: 20px;">
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
                <div>
                    <h3 style="color: #2c3e50; margin-bottom: 15px;">Genel Bilgiler</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr style="border-bottom: 1px solid #ecf0f1;">
                            <td style="padding: 10px; font-weight: 600;">Cihaz Adı:</td>
                            <td style="padding: 10px;">${escapeHtml(device.display)}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #ecf0f1;">
                            <td style="padding: 10px; font-weight: 600;">Hostname:</td>
                            <td style="padding: 10px; font-family: monospace;">${escapeHtml(device.hostname)}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #ecf0f1;">
                            <td style="padding: 10px; font-weight: 600;">IP Adresi:</td>
                            <td style="padding: 10px; font-family: monospace;">${escapeHtml(device.ip)}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #ecf0f1;">
                            <td style="padding: 10px; font-weight: 600;">Durum:</td>
                            <td style="padding: 10px;">
                                <span style="background: ${statusColor}; color: white; padding: 4px 10px; border-radius: 4px;">
                                    ${statusText}
                                </span>
                            </td>
                        </tr>
                        <tr style="border-bottom: 1px solid #ecf0f1;">
                            <td style="padding: 10px; font-weight: 600;">Tip:</td>
                            <td style="padding: 10px;">${escapeHtml(device.type || 'network')}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #ecf0f1;">
                            <td style="padding: 10px; font-weight: 600;">Lokasyon:</td>
                            <td style="padding: 10px;">${escapeHtml(device.location)}</td>
                        </tr>
                    </table>
                </div>

                <div>
                    <h3 style="color: #2c3e50; margin-bottom: 15px;">Teknik Bilgiler</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr style="border-bottom: 1px solid #ecf0f1;">
                            <td style="padding: 10px; font-weight: 600;">İşletim Sistemi:</td>
                            <td style="padding: 10px;">${escapeHtml(device.os.toUpperCase())}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #ecf0f1;">
                            <td style="padding: 10px; font-weight: 600;">Donanım:</td>
                            <td style="padding: 10px;">${escapeHtml(device.hardware)}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #ecf0f1;">
                            <td style="padding: 10px; font-weight: 600;">Versiyon:</td>
                            <td style="padding: 10px; font-family: monospace; font-size: 0.9rem;">${escapeHtml(device.version)}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #ecf0f1;">
                            <td style="padding: 10px; font-weight: 600;">Seri No:</td>
                            <td style="padding: 10px; font-family: monospace;">${escapeHtml(device.serial)}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #ecf0f1;">
                            <td style="padding: 10px; font-weight: 600;">Uptime:</td>
                            <td style="padding: 10px;">${formatUptime(device.uptime)}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #ecf0f1;">
                            <td style="padding: 10px; font-weight: 600;">Son Poll:</td>
                            <td style="padding: 10px; font-size: 0.9rem;">${escapeHtml(device.last_polled)}</td>
                        </tr>
                    </table>
                </div>
            </div>

            <div style="margin-top: 20px;">
                <h3 style="color: #2c3e50; margin-bottom: 10px;">Sistem Açıklaması</h3>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #3498db; font-family: monospace; font-size: 0.85rem; white-space: pre-wrap; max-height: 200px; overflow-y: auto;">
${escapeHtml(device.sysDescr)}
                </div>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
}

// Modal'ı kapat
function closeDeviceModal() {
    document.getElementById('device-details-modal').style.display = 'none';
}

// Health modal'ını kapat
function closeHealthModal() {
    document.getElementById('device-health-modal').style.display = 'none';
}

// Cihaz health bilgilerini göster
function showDeviceHealth(deviceId) {
    const device = allDevices.find(d => d.id === deviceId);
    if (!device) return;

    const modal = document.getElementById('device-health-modal');
    const content = document.getElementById('device-health-content');

    const instanceId = window.currentDevicesInstance || 1;

    // Loading göster
    content.innerHTML = `
        <div style="padding: 40px; text-align: center;">
            <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: #3498db;"></i>
            <div style="margin-top: 10px; color: #7f8c8d;">Health bilgileri yükleniyor...</div>
        </div>
    `;

    modal.style.display = 'block';

    // Health verilerini çek
    fetch('get-librenms-health.php?instance_id=' + instanceId + '&device_id=' + deviceId)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayHealthData(device, data.health);
            } else {
                content.innerHTML = `
                    <div style="padding: 40px; text-align: center;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 2rem; color: #e74c3c;"></i>
                        <div style="margin-top: 10px; color: #e74c3c;">
                            ${data.error || 'Health bilgileri yüklenemedi'}
                        </div>
                    </div>
                `;
            }
        })
        .catch(error => {
            console.error('Health yükleme hatası:', error);
            content.innerHTML = `
                <div style="padding: 40px; text-align: center;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2rem; color: #e74c3c;"></i>
                    <div style="margin-top: 10px; color: #e74c3c;">
                        Bağlantı hatası: ${error.message}
                    </div>
                </div>
            `;
        });
}

// Health verilerini görüntüle
function displayHealthData(device, healthData) {
    const content = document.getElementById('device-health-content');

    let html = `
        <div style="padding: 20px;">
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #27ae60;">
                <h3 style="color: #2c3e50; margin-bottom: 5px;">${escapeHtml(device.display)}</h3>
                <p style="color: #7f8c8d; font-size: 0.9rem; margin: 0;">${escapeHtml(device.ip)} - ${escapeHtml(device.os.toUpperCase())}</p>
            </div>
    `;

    // Overview Section
    if (healthData.overview && Object.keys(healthData.overview).length > 0) {
        const overview = healthData.overview;
        const uptime = overview.uptime || 0;
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const uptimeStr = `${days}d ${hours}h ${minutes}m`;
        const statusColor = overview.status === 1 ? '#27ae60' : '#e74c3c';
        const statusText = overview.status === 1 ? 'Online' : 'Offline';

        html += `
            <div style="margin-bottom: 25px;">
                <h3 style="color: #2c3e50; margin-bottom: 15px; display: flex; align-items: center;">
                    <i class="fas fa-info-circle" style="margin-right: 10px; color: #3498db;"></i> Overview
                </h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                        <div style="color: #7f8c8d; font-size: 0.85rem; margin-bottom: 5px;">Status</div>
                        <div style="font-weight: 600; color: ${statusColor}; font-size: 1.1rem;">
                            <i class="fas fa-circle" style="font-size: 0.6rem;"></i> ${statusText}
                        </div>
                    </div>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                        <div style="color: #7f8c8d; font-size: 0.85rem; margin-bottom: 5px;">Uptime</div>
                        <div style="font-weight: 600; color: #2c3e50; font-size: 1.1rem;">${uptimeStr}</div>
                    </div>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                        <div style="color: #7f8c8d; font-size: 0.85rem; margin-bottom: 5px;">Hardware</div>
                        <div style="font-weight: 600; color: #2c3e50; font-size: 1.1rem;">${escapeHtml(overview.hardware || 'N/A')}</div>
                    </div>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                        <div style="color: #7f8c8d; font-size: 0.85rem; margin-bottom: 5px;">OS Version</div>
                        <div style="font-weight: 600; color: #2c3e50; font-size: 1.1rem;">${escapeHtml(overview.version || 'N/A')}</div>
                    </div>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                        <div style="color: #7f8c8d; font-size: 0.85rem; margin-bottom: 5px;">Location</div>
                        <div style="font-weight: 600; color: #2c3e50; font-size: 1.1rem;">${escapeHtml(overview.location || 'N/A')}</div>
                    </div>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                        <div style="color: #7f8c8d; font-size: 0.85rem; margin-bottom: 5px;">Last Polled</div>
                        <div style="font-weight: 600; color: #2c3e50; font-size: 0.9rem;">${escapeHtml(overview.last_polled || 'N/A')}</div>
                    </div>
                </div>
            </div>
        `;
    }

    // Processor
    if (healthData.processor && healthData.processor.length > 0) {
        html += `
            <div style="margin-bottom: 25px;">
                <h3 style="color: #2c3e50; margin-bottom: 15px; display: flex; align-items: center;">
                    <i class="fas fa-microchip" style="margin-right: 10px; color: #3498db;"></i> Processor
                </h3>
        `;
        healthData.processor.forEach(proc => {
            const usage = proc.sensor_current || 0;
            const statusClass = usage > 80 ? 'danger' : usage > 60 ? 'warning' : 'success';
            const statusColor = usage > 80 ? '#e74c3c' : usage > 60 ? '#f39c12' : '#27ae60';
            const statusIcon = usage > 80 ? 'fa-exclamation-circle' : usage > 60 ? 'fa-exclamation-triangle' : 'fa-check-circle';
            const statusText = usage > 80 ? 'Yüksek' : usage > 60 ? 'Orta' : 'Normal';
            html += `
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="font-weight: 500; color: #2c3e50;">${escapeHtml(proc.sensor_descr || 'N/A')}</span>
                        <span style="font-weight: 600; color: ${statusColor};">${usage}%</span>
                    </div>
                    <div style="background: #ecf0f1; border-radius: 10px; height: 20px; overflow: hidden; position: relative;">
                        <div style="background: ${statusColor}; height: 100%; width: ${usage}%; transition: width 0.3s ease;"></div>
                    </div>
                    <div style="margin-top: 5px; text-align: right;">
                        <span class="status status-${statusClass}" style="font-size: 0.85rem;">
                            <i class="fas ${statusIcon}"></i> ${statusText}
                        </span>
                    </div>
                </div>
            `;
        });
        html += `
            </div>
        `;
    }

    // Memory
    if (healthData.memory && healthData.memory.length > 0) {
        html += `
            <div style="margin-bottom: 25px;">
                <h3 style="color: #2c3e50; margin-bottom: 15px; display: flex; align-items: center;">
                    <i class="fas fa-memory" style="margin-right: 10px; color: #9b59b6;"></i> Memory
                </h3>
        `;
        healthData.memory.forEach(mem => {
            const usage = mem.sensor_current || 0;
            const statusClass = usage > 90 ? 'danger' : usage > 75 ? 'warning' : 'success';
            const statusColor = usage > 90 ? '#e74c3c' : usage > 75 ? '#f39c12' : '#27ae60';
            const statusIcon = usage > 90 ? 'fa-exclamation-circle' : usage > 75 ? 'fa-exclamation-triangle' : 'fa-check-circle';
            const statusText = usage > 90 ? 'Kritik' : usage > 75 ? 'Yüksek' : 'Normal';
            html += `
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="font-weight: 500; color: #2c3e50;">${escapeHtml(mem.sensor_descr || 'N/A')}</span>
                        <span style="font-weight: 600; color: ${statusColor};">${usage}%</span>
                    </div>
                    <div style="background: #ecf0f1; border-radius: 10px; height: 20px; overflow: hidden; position: relative;">
                        <div style="background: ${statusColor}; height: 100%; width: ${usage}%; transition: width 0.3s ease;"></div>
                    </div>
                    <div style="margin-top: 5px; text-align: right;">
                        <span class="status status-${statusClass}" style="font-size: 0.85rem;">
                            <i class="fas ${statusIcon}"></i> ${statusText}
                        </span>
                    </div>
                </div>
            `;
        });
        html += `
            </div>
        `;
    }

    // Storage (Disk Usage)
    if (healthData.storage && healthData.storage.length > 0) {
        html += `
            <div style="margin-bottom: 25px;">
                <h3 style="color: #2c3e50; margin-bottom: 15px; display: flex; align-items: center;">
                    <i class="fas fa-hdd" style="margin-right: 10px; color: #e67e22;"></i> Disk Usage
                </h3>
        `;
        healthData.storage.forEach(disk => {
            const usage = disk.storage_perc || 0;
            const statusClass = usage > 90 ? 'danger' : usage > 75 ? 'warning' : 'success';
            const statusColor = usage > 90 ? '#e74c3c' : usage > 75 ? '#f39c12' : '#27ae60';
            const statusIcon = usage > 90 ? 'fa-exclamation-circle' : usage > 75 ? 'fa-exclamation-triangle' : 'fa-check-circle';
            const statusText = usage > 90 ? 'Kritik' : usage > 75 ? 'Yüksek' : 'Normal';
            const size = disk.storage_size ? (disk.storage_size / 1073741824).toFixed(2) + ' GB' : 'N/A';
            html += `
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="font-weight: 500; color: #2c3e50;">${escapeHtml(disk.storage_descr || 'N/A')}</span>
                        <span style="font-weight: 600; color: ${statusColor};">${usage}% (${size})</span>
                    </div>
                    <div style="background: #ecf0f1; border-radius: 10px; height: 20px; overflow: hidden; position: relative;">
                        <div style="background: ${statusColor}; height: 100%; width: ${usage}%; transition: width 0.3s ease;"></div>
                    </div>
                    <div style="margin-top: 5px; text-align: right;">
                        <span class="status status-${statusClass}" style="font-size: 0.85rem;">
                            <i class="fas ${statusIcon}"></i> ${statusText}
                        </span>
                    </div>
                </div>
            `;
        });
        html += `
            </div>
        `;
    }

    // Temperature
    if (healthData.temperature && healthData.temperature.length > 0) {
        html += `
            <div style="margin-bottom: 25px;">
                <h3 style="color: #2c3e50; margin-bottom: 15px; display: flex; align-items: center;">
                    <i class="fas fa-thermometer-half" style="margin-right: 10px; color: #e74c3c;"></i> Temperature
                </h3>
        `;
        healthData.temperature.forEach(temp => {
            const current = temp.sensor_current || 0;
            const limit = temp.sensor_limit || 100;
            const percentage = limit > 0 ? Math.min((current / limit) * 100, 100) : 0;
            const statusClass = current > 70 ? 'danger' : current > 60 ? 'warning' : 'success';
            const statusColor = current > 70 ? '#e74c3c' : current > 60 ? '#f39c12' : '#27ae60';
            const statusIcon = current > 70 ? 'fa-exclamation-circle' : current > 60 ? 'fa-exclamation-triangle' : 'fa-check-circle';
            const statusText = current > 70 ? 'Yüksek' : current > 60 ? 'Orta' : 'Normal';
            html += `
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="font-weight: 500; color: #2c3e50;">${escapeHtml(temp.sensor_descr || 'N/A')}</span>
                        <span style="font-weight: 600; color: ${statusColor};">${current}°C / ${limit}°C</span>
                    </div>
                    <div style="background: #ecf0f1; border-radius: 10px; height: 20px; overflow: hidden; position: relative;">
                        <div style="background: ${statusColor}; height: 100%; width: ${percentage}%; transition: width 0.3s ease;"></div>
                    </div>
                    <div style="margin-top: 5px; text-align: right;">
                        <span class="status status-${statusClass}" style="font-size: 0.85rem;">
                            <i class="fas ${statusIcon}"></i> ${statusText}
                        </span>
                    </div>
                </div>
            `;
        });
        html += `
            </div>
        `;
    }

    // State
    if (healthData.state && healthData.state.length > 0) {
        html += `
            <div style="margin-bottom: 25px;">
                <h3 style="color: #2c3e50; margin-bottom: 15px; display: flex; align-items: center;">
                    <i class="fas fa-info-circle" style="margin-right: 10px; color: #16a085;"></i> State
                </h3>
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f8f9fa;">
                                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ecf0f1;">Açıklama</th>
                                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ecf0f1;">Değer</th>
                                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ecf0f1;">Durum</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        healthData.state.forEach(state => {
            const value = state.sensor_current || 'N/A';
            html += `
                <tr style="border-bottom: 1px solid #ecf0f1;">
                    <td style="padding: 10px;">${escapeHtml(state.sensor_descr || 'N/A')}</td>
                    <td style="padding: 10px; font-weight: 600;">${escapeHtml(state.state_name || value)}</td>
                    <td style="padding: 10px;">
                        <span class="status status-success">
                            <i class="fas fa-check-circle"></i> OK
                        </span>
                    </td>
                </tr>
            `;
        });
        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // Voltage
    if (healthData.voltage && healthData.voltage.length > 0) {
        html += `
            <div style="margin-bottom: 25px;">
                <h3 style="color: #2c3e50; margin-bottom: 15px; display: flex; align-items: center;">
                    <i class="fas fa-bolt" style="margin-right: 10px; color: #f39c12;"></i> Voltage
                </h3>
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f8f9fa;">
                                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ecf0f1;">Açıklama</th>
                                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ecf0f1;">Voltaj</th>
                                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ecf0f1;">Durum</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        healthData.voltage.forEach(volt => {
            const current = volt.sensor_current || 'N/A';
            html += `
                <tr style="border-bottom: 1px solid #ecf0f1;">
                    <td style="padding: 10px;">${escapeHtml(volt.sensor_descr || 'N/A')}</td>
                    <td style="padding: 10px; font-weight: 600;">${current}V</td>
                    <td style="padding: 10px;">
                        <span class="status status-success">
                            <i class="fas fa-check-circle"></i> Normal
                        </span>
                    </td>
                </tr>
            `;
        });
        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // Current
    if (healthData.current && healthData.current.length > 0) {
        html += `
            <div style="margin-bottom: 25px;">
                <h3 style="color: #2c3e50; margin-bottom: 15px; display: flex; align-items: center;">
                    <i class="fas fa-plug" style="margin-right: 10px; color: #2ecc71;"></i> Current
                </h3>
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f8f9fa;">
                                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ecf0f1;">Açıklama</th>
                                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ecf0f1;">Akım</th>
                                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ecf0f1;">Durum</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        healthData.current.forEach(curr => {
            const current = curr.sensor_current || 'N/A';
            html += `
                <tr style="border-bottom: 1px solid #ecf0f1;">
                    <td style="padding: 10px;">${escapeHtml(curr.sensor_descr || 'N/A')}</td>
                    <td style="padding: 10px; font-weight: 600;">${current}A</td>
                    <td style="padding: 10px;">
                        <span class="status status-success">
                            <i class="fas fa-check-circle"></i> Normal
                        </span>
                    </td>
                </tr>
            `;
        });
        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // Fanspeed
    if (healthData.fanspeed && healthData.fanspeed.length > 0) {
        html += `
            <div style="margin-bottom: 25px;">
                <h3 style="color: #2c3e50; margin-bottom: 15px; display: flex; align-items: center;">
                    <i class="fas fa-fan" style="margin-right: 10px; color: #3498db;"></i> Fan Speed
                </h3>
        `;
        healthData.fanspeed.forEach(fan => {
            const current = fan.sensor_current || 0;
            const limit = fan.sensor_limit || current * 2;
            const percentage = limit > 0 ? Math.min((current / limit) * 100, 100) : 0;
            const statusClass = current < fan.sensor_limit_low ? 'danger' : 'success';
            const statusColor = current < fan.sensor_limit_low ? '#e74c3c' : '#27ae60';
            const statusIcon = current < fan.sensor_limit_low ? 'fa-exclamation-circle' : 'fa-check-circle';
            const statusText = current < fan.sensor_limit_low ? 'Düşük' : 'Normal';
            html += `
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="font-weight: 500; color: #2c3e50;">${escapeHtml(fan.sensor_descr || 'N/A')}</span>
                        <span style="font-weight: 600; color: ${statusColor};">${current} RPM</span>
                    </div>
                    <div style="background: #ecf0f1; border-radius: 10px; height: 20px; overflow: hidden; position: relative;">
                        <div style="background: ${statusColor}; height: 100%; width: ${percentage}%; transition: width 0.3s ease;"></div>
                    </div>
                    <div style="margin-top: 5px; text-align: right;">
                        <span class="status status-${statusClass}" style="font-size: 0.85rem;">
                            <i class="fas ${statusIcon}"></i> ${statusText}
                        </span>
                    </div>
                </div>
            `;
        });
        html += `
            </div>
        `;
    }

    // Percent Sensors (generic percentage sensors)
    if (healthData.percent && healthData.percent.length > 0) {
        html += `
            <div style="margin-bottom: 25px;">
                <h3 style="color: #2c3e50; margin-bottom: 15px; display: flex; align-items: center;">
                    <i class="fas fa-percentage" style="margin-right: 10px; color: #9b59b6;"></i> Other Metrics
                </h3>
        `;
        healthData.percent.forEach(metric => {
            const value = metric.sensor_current || 0;
            const statusClass = value > 80 ? 'danger' : value > 60 ? 'warning' : 'success';
            const statusColor = value > 80 ? '#e74c3c' : value > 60 ? '#f39c12' : '#27ae60';
            const statusIcon = value > 80 ? 'fa-exclamation-circle' : value > 60 ? 'fa-exclamation-triangle' : 'fa-check-circle';
            const statusText = value > 80 ? 'Yüksek' : value > 60 ? 'Orta' : 'Normal';
            html += `
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="font-weight: 500; color: #2c3e50;">${escapeHtml(metric.sensor_descr || 'N/A')}</span>
                        <span style="font-weight: 600; color: ${statusColor};">${value}%</span>
                    </div>
                    <div style="background: #ecf0f1; border-radius: 10px; height: 20px; overflow: hidden; position: relative;">
                        <div style="background: ${statusColor}; height: 100%; width: ${value}%; transition: width 0.3s ease;"></div>
                    </div>
                    <div style="margin-top: 5px; text-align: right;">
                        <span class="status status-${statusClass}" style="font-size: 0.85rem;">
                            <i class="fas ${statusIcon}"></i> ${statusText}
                        </span>
                    </div>
                </div>
            `;
        });
        html += `
            </div>
        `;
    }

    // dBm
    if (healthData.dbm && healthData.dbm.length > 0) {
        html += `
            <div style="margin-bottom: 25px;">
                <h3 style="color: #2c3e50; margin-bottom: 15px; display: flex; align-items: center;">
                    <i class="fas fa-signal" style="margin-right: 10px; color: #3498db;"></i> Signal Strength (dBm)
                </h3>
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f8f9fa;">
                                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ecf0f1;">Açıklama</th>
                                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ecf0f1;">Sinyal Gücü</th>
                                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ecf0f1;">Durum</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        healthData.dbm.forEach(signal => {
            const dbm = signal.sensor_current || 'N/A';
            const statusClass = dbm < -70 ? 'danger' : dbm < -60 ? 'warning' : 'success';
            const statusIcon = dbm < -70 ? 'fa-exclamation-circle' : dbm < -60 ? 'fa-exclamation-triangle' : 'fa-check-circle';
            html += `
                <tr style="border-bottom: 1px solid #ecf0f1;">
                    <td style="padding: 10px;">${escapeHtml(signal.sensor_descr || 'N/A')}</td>
                    <td style="padding: 10px; font-weight: 600;">${dbm} dBm</td>
                    <td style="padding: 10px;">
                        <span class="status status-${statusClass}">
                            <i class="fas ${statusIcon}"></i> ${dbm < -70 ? 'Zayıf' : dbm < -60 ? 'Orta' : 'İyi'}
                        </span>
                    </td>
                </tr>
            `;
        });
        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // Eğer hiç health verisi yoksa
    const hasData = (healthData.overview && Object.keys(healthData.overview).length > 0) ||
                    (healthData.processor && healthData.processor.length > 0) ||
                    (healthData.memory && healthData.memory.length > 0) ||
                    (healthData.storage && healthData.storage.length > 0) ||
                    (healthData.temperature && healthData.temperature.length > 0) ||
                    (healthData.state && healthData.state.length > 0) ||
                    (healthData.voltage && healthData.voltage.length > 0) ||
                    (healthData.current && healthData.current.length > 0) ||
                    (healthData.dbm && healthData.dbm.length > 0) ||
                    (healthData.fanspeed && healthData.fanspeed.length > 0) ||
                    (healthData.percent && healthData.percent.length > 0);

    if (!hasData) {
        html += `
            <div style="padding: 40px; text-align: center;">
                <i class="fas fa-info-circle" style="font-size: 2rem; color: #95a5a6;"></i>
                <div style="margin-top: 10px; color: #7f8c8d;">
                    Bu cihaz için health verisi bulunamadı.
                </div>
            </div>
        `;
    }

    html += `</div>`;

    content.innerHTML = html;
}

// Cihazları yenile
function refreshDevices() {
    document.getElementById('devices-tbody').innerHTML = `
        <tr>
            <td colspan="9" style="padding: 40px; text-align: center; color: #7f8c8d;">
                <i class="fas fa-spinner fa-spin" style="font-size: 2rem;"></i>
                <div style="margin-top: 10px;">Cihazlar yenileniyor...</div>
            </td>
        </tr>
    `;
    loadDevices();
}

// Hata göster
function showDeviceError(message) {
    document.getElementById('devices-tbody').innerHTML = `
        <tr>
            <td colspan="9" style="padding: 40px; text-align: center; color: #e74c3c;">
                <i class="fas fa-exclamation-triangle" style="font-size: 2rem;"></i>
                <div style="margin-top: 10px;">${escapeHtml(message)}</div>
            </td>
        </tr>
    `;
}

// Filtre event listener'ları
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('device-search');
    const osFilter = document.getElementById('device-os-filter');
    const statusFilter = document.getElementById('device-status-filter');
    const typeFilter = document.getElementById('device-type-filter');

    if (searchInput) {
        searchInput.addEventListener('input', applyDeviceFilters);
    }

    if (osFilter) {
        osFilter.addEventListener('change', applyDeviceFilters);
    }

    if (statusFilter) {
        statusFilter.addEventListener('change', applyDeviceFilters);
    }

    if (typeFilter) {
        typeFilter.addEventListener('change', applyDeviceFilters);
    }
});

// ==================== HARITALAR (LibreNMS Maps) ====================

let allMaps = [];
let currentMapId = null;

// Haritaları yükle
function loadMaps() {
    console.log('🗺️ loadMaps() çağrıldı');
    const instanceId = window.currentMapsInstance || 1;
    console.log('📡 API isteği gönderiliyor: get-librenms-maps.php?instance_id=' + instanceId);

    fetch('get-librenms-maps.php?instance_id=' + instanceId)
        .then(response => {
            console.log('📥 API yanıtı alındı, status:', response.status);
            return response.json();
        })
        .then(data => {
            console.log('📦 JSON verisi:', data);

            if (data.success) {
                console.log('✅ Başarılı! Harita sayısı:', data.count);
                allMaps = data.maps;

                // Harita kartlarını göster
                renderMapCards();

                // Son güncelleme zamanını göster
                const now = new Date();
                document.getElementById('maps-last-update').textContent =
                    'Son güncelleme: ' + now.toLocaleString('tr-TR');

                document.getElementById('maps-count').innerHTML =
                    `Toplam Harita: <strong>${data.count}</strong>`;

                console.log('✅ Haritalar başarıyla yüklendi');
            } else {
                console.error('❌ API hatası:', data.error);
                showMapsError(data.error || 'Haritalar yüklenemedi');
            }
        })
        .catch(error => {
            console.error('❌ Harita yükleme hatası:', error);
            showMapsError('Bağlantı hatası: ' + error.message);
        });
}

// Harita kartlarını render et
function renderMapCards() {
    const container = document.getElementById('maps-cards-container');

    if (allMaps.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #7f8c8d;">
                <i class="fas fa-map" style="font-size: 3rem; opacity: 0.3;"></i>
                <div style="margin-top: 15px; font-size: 1.1rem;">Harita bulunamadı</div>
            </div>
        `;
        return;
    }

    // Grid layout ile kartları oluştur
    container.style.display = 'grid';
    container.style.gridTemplateColumns = 'repeat(auto-fit, minmax(300px, 1fr))';
    container.style.gap = '20px';
    container.innerHTML = '';

    allMaps.forEach((map, index) => {
        const colors = [
            'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
        ];

        const color = colors[index % colors.length];

        const card = document.createElement('div');
        card.className = 'card';
        card.style.background = color;
        card.style.color = 'white';
        card.style.cursor = 'pointer';
        card.style.transition = 'all 0.3s ease';
        card.style.position = 'relative';
        card.style.overflow = 'hidden';

        card.innerHTML = `
            <div style="padding: 30px; position: relative; z-index: 1;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
                    <div style="font-size: 3rem; opacity: 0.3;">
                        <i class="fas fa-map-marked-alt"></i>
                    </div>
                    <div style="background: rgba(255,255,255,0.2); padding: 8px 15px; border-radius: 20px; font-size: 0.85rem;">
                        <i class="fas fa-layer-group"></i> Harita
                    </div>
                </div>

                <h3 style="margin: 0 0 10px 0; font-size: 1.5rem; font-weight: 600;">
                    ${escapeHtml(map.name)}
                </h3>

                <p style="margin: 0; opacity: 0.9; font-size: 0.95rem;">
                    ${escapeHtml(map.description || 'Network Haritası')}
                </p>

                <div style="margin-top: 20px; display: flex; gap: 10px;">
                    <button
                        onclick="viewMap(${map.id}); event.stopPropagation();"
                        class="btn"
                        style="flex: 1; background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3); padding: 10px; border-radius: 6px; font-weight: 500;">
                        <i class="fas fa-eye"></i> Görüntüle
                    </button>
                    <button
                        onclick="viewMapFullscreen(${map.id}); event.stopPropagation();"
                        class="btn"
                        style="background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3); padding: 10px; border-radius: 6px;">
                        <i class="fas fa-expand"></i>
                    </button>
                    <button
                        onclick="openMapInNewTab(${map.id}); event.stopPropagation();"
                        class="btn"
                        style="background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3); padding: 10px; border-radius: 6px;">
                        <i class="fas fa-external-link-alt"></i>
                    </button>
                </div>
            </div>

            <div style="position: absolute; top: -50px; right: -50px; width: 200px; height: 200px; background: rgba(255,255,255,0.1); border-radius: 50%; z-index: 0;"></div>
        `;

        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
            this.style.boxShadow = '0 12px 24px rgba(0,0,0,0.2)';
        });

        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        });

        card.addEventListener('click', function() {
            viewMap(map.id);
        });

        container.appendChild(card);
    });
}

// Haritayı iframe'de görüntüle
function viewMap(mapId) {
    const map = allMaps.find(m => m.id === mapId);
    if (!map) {
        console.error('Harita bulunamadı:', mapId);
        return;
    }

    console.log('🗺️ Harita görüntüleniyor:', map.name);
    currentMapId = mapId;

    // Başlığı güncelle
    document.getElementById('current-map-title').textContent = map.name;

    // Viewer'ı göster
    document.getElementById('map-viewer-container').style.display = 'block';

    // Loading göster
    const iframe = document.getElementById('map-iframe');
    const loading = document.getElementById('map-viewer-loading');

    iframe.style.display = 'none';
    loading.style.display = 'block';

    // Proxy URL'sini kullan - HTTPS üzerinden çalışır, mixed content yok!
    const instanceId = window.currentMapsInstance || 1;
    const proxyUrl = `_api/librenms-map.html?map=${map.map_id}&instance_id=${instanceId}`;
    console.log('🌐 Proxy URL:', proxyUrl, '(instance:', instanceId, ')');

    // Iframe'e haritayı yükle
    iframe.onload = function() {
        loading.style.display = 'none';
        iframe.style.display = 'block';
        console.log('✅ Harita yüklendi (Proxy üzerinden)');
    };

    iframe.onerror = function() {
        loading.style.display = 'none';
        iframe.innerHTML = '<div style="padding: 40px; text-align: center; color: #e74c3c;">Harita yüklenemedi</div>';
        console.error('❌ Harita yükleme hatası');
    };

    iframe.src = proxyUrl;

    // Harita viewer'a scroll
    setTimeout(() => {
        document.getElementById('map-viewer-container').scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }, 100);
}

// Harita viewer'ı kapat
function closeMapViewer() {
    document.getElementById('map-viewer-container').style.display = 'none';
    document.getElementById('map-iframe').src = '';
    currentMapId = null;
}

// Tam ekranda harita göster
function viewMapFullscreen(mapId) {
    const map = allMaps.find(m => m.id === mapId);
    if (!map) return;

    console.log('🖥️ Tam ekran harita:', map.name);
    currentMapId = mapId;

    // Başlığı güncelle
    document.getElementById('fullscreen-map-title').textContent = map.name;

    // Modal'ı göster
    const modal = document.getElementById('map-fullscreen-modal');
    modal.style.display = 'flex';

    // Proxy URL'sini kullan
    const instanceId = window.currentMapsInstance || 1;
    const proxyUrl = `_api/librenms-map.html?map=${map.map_id}&instance_id=${instanceId}`;
    console.log('🖥️ Fullscreen Proxy URL:', proxyUrl, '(instance:', instanceId, ')');

    // Iframe'e yükle
    const iframe = document.getElementById('map-fullscreen-iframe');
    iframe.src = proxyUrl;

    iframe.onload = function() {
        console.log('✅ Tam ekran harita yüklendi');
    };

    // Body scroll'u engelle
    document.body.style.overflow = 'hidden';
}

// Tam ekran modal'ı kapat
function closeFullscreenMap() {
    const modal = document.getElementById('map-fullscreen-modal');
    modal.style.display = 'none';
    document.getElementById('map-fullscreen-iframe').src = '';
    document.body.style.overflow = '';
    currentMapId = null;
}

// Haritayı yeni sekmede aç (direkt LibreNMS)
function openMapInNewTab(mapId) {
    const map = allMaps.find(m => m.id === mapId);
    if (!map) {
        console.error('Harita bulunamadı:', mapId);
        return;
    }

    console.log('🗺️ Harita yeni sekmede açılıyor:', map.name, '→', map.url);

    // Direkt LibreNMS URL'ini yeni sekmede aç
    const newWindow = window.open(map.url, '_blank', 'noopener,noreferrer');

    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        // Pop-up engellendi
        alert('Pop-up engelleyici haritayı açmayı engelledi. Lütfen pop-up engelleyiciyi devre dışı bırakın veya bu siteye izin verin.');
    } else {
        console.log('✅ Harita yeni sekmede açıldı');
    }
}

// Modal dışına tıklandığında kapat
window.addEventListener('click', function(event) {
    const modal = document.getElementById('map-fullscreen-modal');
    if (event.target === modal) {
        closeFullscreenMap();
    }
});

// Haritaları yenile
function refreshMaps() {
    document.getElementById('maps-cards-container').innerHTML = `
        <div style="text-align: center; padding: 40px; color: #7f8c8d;">
            <i class="fas fa-spinner fa-spin" style="font-size: 2rem;"></i>
            <div style="margin-top: 10px;">Haritalar yenileniyor...</div>
        </div>
    `;
    loadMaps();
}

// Harita cache'ini temizle
function clearMapCache() {
    if (!confirm('Tüm harita önbelleğini temizlemek istediğinize emin misiniz?\n\nBu işlem sonrasında haritalar ilk açılışta biraz daha yavaş yüklenecektir.')) {
        return;
    }

    console.log('🗑️ Clearing map cache...');

    fetch('librenms-proxy.php?clearcache=1')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert(`✅ Cache başarıyla temizlendi!\n\n${data.deleted_files} dosya silindi.`);
                console.log('✅ Cache cleared:', data);
            } else {
                alert('❌ Cache temizlenirken hata oluştu: ' + data.message);
                console.error('❌ Cache clear error:', data);
            }
        })
        .catch(error => {
            alert('❌ Cache temizlenirken hata oluştu: ' + error.message);
            console.error('❌ Cache clear error:', error);
        });
}

// Mevcut haritayı yeniden yükle (cache bypass)
function refreshCurrentMap() {
    if (!currentMapId) {
        console.error('❌ No map currently loaded');
        return;
    }

    const map = allMaps.find(m => m.id === currentMapId);
    if (!map) {
        console.error('❌ Map not found:', currentMapId);
        return;
    }

    console.log('🔄 Refreshing current map (cache bypass):', map.name);

    // Loading göster
    const iframe = document.getElementById('map-iframe');
    const loading = document.getElementById('map-viewer-loading');

    iframe.style.display = 'none';
    loading.style.display = 'block';

    // Proxy URL'sine nocache parametresi ekle
    const instanceId = window.currentMapsInstance || 1;
    const proxyUrl = `_api/librenms-map.html?map=${map.map_id}&instance_id=${instanceId}&nocache=1&t=${Date.now()}`;
    console.log('🌐 Refreshing with URL:', proxyUrl);

    // Iframe'i yeniden yükle
    iframe.onload = function() {
        loading.style.display = 'none';
        iframe.style.display = 'block';
        console.log('✅ Map refreshed successfully');
    };

    iframe.onerror = function() {
        loading.style.display = 'none';
        iframe.innerHTML = '<div style="padding: 40px; text-align: center; color: #e74c3c;">Harita yüklenemedi</div>';
        console.error('❌ Map refresh error');
    };

    iframe.src = proxyUrl;
}

// Hata göster
function showMapsError(message) {
    document.getElementById('maps-cards-container').innerHTML = `
        <div style="text-align: center; padding: 40px; color: #e74c3c;">
            <i class="fas fa-exclamation-triangle" style="font-size: 2rem;"></i>
            <div style="margin-top: 10px;">${escapeHtml(message)}</div>
        </div>
    `;
}

// ============================================================================
// MÜŞTER İ SORUNLARI - KALDIRILDI (2026-04-03)
// ============================================================================


// ============================================================================
// FOLDER MANAGEMENT FUNCTIONS
// ============================================================================

let currentSelectedFolder = null;
let allFolders = [];

// Open add folder modal
function openAddFolderModal() {
    document.getElementById('folder-name').value = '';
    document.getElementById('folder-icon').value = 'fa-folder';
    openModal('add-folder-modal');
}

// Yeni DocumentManagement.js UI'si window.currentSelectedFolder'i atiyor;
// eski inline UI ise module-level let currentSelectedFolder kullaniyor.
// let scope'u window'a baglanmadigi icin iki degisken ayri; her iki kaynagi da okuyalim.
function getSelectedFolderName() {
    return (typeof window !== 'undefined' && window.currentSelectedFolder)
        || currentSelectedFolder
        || null;
}

// Merkezi UI yenileme: dokuman/klasor islemleri (upload, delete, move, rename,
// klasor ekle/duzenle/sil, trash) sonrasi bu fonksiyon cagrilmali. Hem yeni DocMgmt
// UI'sini hem eski inline UI klasor agacini yeniler.
function refreshDocumentsUI() {
    try {
        // DocMgmt UI (dokuman listesi + klasor agaci tek kaynaktan yenilenir)
        if (typeof window !== 'undefined' && window.DocMgmt && typeof window.DocMgmt.loadDocuments === 'function') {
            window.DocMgmt.loadDocuments();
        }
        // Eski inline UI klasor agaci (varsa)
        if (typeof loadFolderTree === 'function') {
            loadFolderTree();
        }
    } catch (e) {
        console.error('refreshDocumentsUI hata:', e);
    }
}
window.refreshDocumentsUI = refreshDocumentsUI;

// Open edit folder modal
function openEditFolderModal() {
    const selected = getSelectedFolderName();
    if (!selected) {
        showNotification('Lütfen önce bir klasör seçin', 'error');
        return;
    }

    document.getElementById('edit-folder-old-name').value = selected;
    document.getElementById('edit-folder-name').value = selected;
    document.getElementById('edit-folder-icon').value = 'fa-folder';
    openModal('edit-folder-modal');
}

// Confirm delete folder
function confirmDeleteFolder() {
    const selected = getSelectedFolderName();
    if (!selected) {
        showNotification('Lütfen önce bir klasör seçin', 'error');
        return;
    }

    // Check if folder has documents
    if (confirm(`"${selected}" klasörünü silmek istediğinizden emin misiniz?\n\nİçindeki dökümanlar "Diger" klasörüne taşınacak.`)) {
        deleteFolder(selected);
    }
}

// Delete folder
async function deleteFolder(folderName) {
    try {
        console.log('[deleteFolder] POST delete-folder.php', { folder_name: folderName, move_to: 'Diger' });
        const response = await fetch('delete-folder.php', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                folder_name: folderName,
                move_to: 'Diger' // Move files to "Diger" folder
            })
        });

        const rawText = await response.text();
        console.log('[deleteFolder] status=', response.status, 'body=', rawText);
        let result;
        try {
            result = JSON.parse(rawText);
        } catch (parseErr) {
            showNotification('Sunucudan gecersiz yanit (HTTP ' + response.status + '): ' + rawText.slice(0, 300), 'error');
            return;
        }

        if (result.success) {
            showNotification(result.message, 'success');
            currentSelectedFolder = null;
            if (typeof window !== 'undefined') window.currentSelectedFolder = null;
            updateFolderButtons();
            refreshDocumentsUI();
        } else {
            showNotification(result.error || 'Klasör silinemedi', 'error');
        }
    } catch (error) {
        console.error('Error deleting folder:', error);
        showNotification('Klasör silinirken hata oluştu', 'error');
    }
}

// Open move document modal
function openMoveDocumentModal(documentPath, documentName, currentFolder) {
    document.getElementById('move-document-id').value = documentPath;
    document.getElementById('move-document-name').textContent = documentName;

    // Load folders into select
    loadFoldersIntoSelect('move-document-target-folder', currentFolder);

    openModal('move-document-modal');
}

// Load folders into a select element
async function loadFoldersIntoSelect(selectId, excludeFolder = null) {
    try {
        const response = await fetch('get-folders.php', {
            credentials: 'same-origin'
        });
        const data = await response.json();

        if (data.success) {
            const select = document.getElementById(selectId);
            select.innerHTML = '';

            data.folders.forEach(folder => {
                if (folder !== excludeFolder) {
                    const option = document.createElement('option');
                    option.value = folder;
                    option.textContent = folder;
                    select.appendChild(option);
                }
            });

            allFolders = data.folders;
        }
    } catch (error) {
        console.error('Error loading folders:', error);
    }
}

// Update folder action buttons state
function updateFolderButtons() {
    const editBtn = document.getElementById('edit-folder-btn');
    const deleteBtn = document.getElementById('delete-folder-btn');

    if (currentSelectedFolder) {
        editBtn.disabled = false;
        deleteBtn.disabled = false;
    } else {
        editBtn.disabled = true;
        deleteBtn.disabled = true;
    }
}

// Handle folder selection
function selectFolder(folderName) {
    currentSelectedFolder = folderName;
    updateFolderButtons();

    // Update UI to show selection - only in #folder-tree container
    const folderTree = document.getElementById('folder-tree');
    if (folderTree) {
        folderTree.querySelectorAll('.folder-item').forEach(item => {
            item.classList.remove('selected');
        });

        const selectedItem = folderTree.querySelector(`[data-folder="${folderName}"]`);
        if (selectedItem) {
            selectedItem.classList.add('selected');
        }
    }
}

// Form handlers
document.addEventListener('DOMContentLoaded', function() {
    // Add folder form
    const addFolderForm = document.getElementById('add-folder-form');
    if (addFolderForm) {
        addFolderForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const folderName = document.getElementById('folder-name').value.trim();
            if (!folderName) return;

            // Veri degiskene alindi, formu hemen sifirla (fetch sirasinda dirty check tetiklenmesin)
            addFolderForm.reset();

            const submitBtn = addFolderForm.querySelector('button[type="submit"]');
            if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Oluşturuluyor...'; }

            try {
                const response = await fetch('add-folder.php', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: folderName })
                });

                const result = await response.json();

                if (result.success) {
                    showNotification('Klasör başarıyla oluşturuldu', 'success');
                    closeModal('add-folder-modal', true);
                    refreshDocumentsUI();
                } else {
                    showNotification(result.error || 'Klasör oluşturulamadı', 'error');
                    // Hata durumunda klasor adini geri yaz
                    const nameInput = document.getElementById('folder-name');
                    if (nameInput) nameInput.value = folderName;
                }
            } catch (error) {
                console.error('Error adding folder:', error);
                showNotification('Klasör oluşturulurken hata oluştu', 'error');
                const nameInput = document.getElementById('folder-name');
                if (nameInput) nameInput.value = folderName;
            } finally {
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Oluştur'; }
            }
        });
    }

    // Edit folder form
    const editFolderForm = document.getElementById('edit-folder-form');
    if (editFolderForm) {
        editFolderForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const oldName = document.getElementById('edit-folder-old-name').value;
            const newName = document.getElementById('edit-folder-name').value.trim();

            try {
                const response = await fetch('edit-folder.php', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        old_name: oldName,
                        new_name: newName
                    })
                });

                const result = await response.json();

                if (result.success) {
                    showNotification('Klasör adı güncellendi', 'success');
                    editFolderForm.reset();
                    closeModal('edit-folder-modal', true);
                    currentSelectedFolder = newName;
                    if (typeof window !== 'undefined') window.currentSelectedFolder = newName;
                    refreshDocumentsUI();
                } else {
                    showNotification(result.error || 'Klasör güncellenemedi', 'error');
                }
            } catch (error) {
                console.error('Error editing folder:', error);
                showNotification('Klasör düzenlenirken hata oluştu', 'error');
            }
        });
    }

    // Move document form
    const moveDocForm = document.getElementById('move-document-form');
    if (moveDocForm) {
        moveDocForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const documentPath = document.getElementById('move-document-id').value;
            const targetFolder = document.getElementById('move-document-target-folder').value;

            try {
                const response = await fetch('move-document-physical.php', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        document_path: documentPath,
                        target_folder: targetFolder
                    })
                });

                const result = await response.json();

                if (result.success) {
                    showNotification('Döküman başarıyla taşındı', 'success');
                    closeModal('move-document-modal', true);
                    refreshDocumentsUI();
                } else {
                    showNotification(result.error || 'Döküman taşınamadı', 'error');
                }
            } catch (error) {
                console.error('Error moving document:', error);
                showNotification('Döküman taşınırken hata oluştu', 'error');
            }
        });
    }

    // Load folders into document upload modal when opened
    const addDocModal = document.getElementById('add-document-modal');
    if (addDocModal) {
        // Listen for modal open (you may need to adjust this based on your openModal implementation)
        const originalOpenModal = window.openModal;
        window.openModal = function(modalId) {
            if (modalId === 'add-document-modal') {
                loadFoldersIntoSelect('document-folder');
            }
            if (originalOpenModal) {
                originalOpenModal(modalId);
            } else {
                document.getElementById(modalId).style.display = 'block';
            }
        };
    }
});

// Helper function to add move button to document cards
function addMoveButtonToDocumentCard(cardElement, documentId, documentName, currentFolder) {
    const actionsDiv = cardElement.querySelector('.document-actions') || cardElement.querySelector('.card-actions');

    if (actionsDiv) {
        const moveBtn = document.createElement('button');
        moveBtn.className = 'doc-move-btn admin-only';
        moveBtn.innerHTML = '<i class="fas fa-arrows-alt"></i> Taşı';
        moveBtn.onclick = function(e) {
            e.stopPropagation();
            openMoveDocumentModal(documentId, documentName, currentFolder);
        };

        actionsDiv.appendChild(moveBtn);
    }
}

// ============================================================================
// DOCUMENT FOLDER TREE - DocMgmt'ye yonlendirildi
// ============================================================================

// DocMgmt aktifse folder tree rendering oradan yapilir
async function loadFolderTree() {
    if (window.DocMgmt) { DocMgmt.loadDocuments(); return; }
    // Fallback - eski kod
    try {
        const response = await fetch('get-folders.php', {
            credentials: 'same-origin'
        });
        const data = await response.json();

        if (data.success && data.folders) {
            renderFolderTree(data.folders);
        } else {
            console.error('Failed to load folders:', data.error);
            document.getElementById('folder-tree').innerHTML = `
                <div style="padding: 20px; text-align: center; color: #e74c3c;">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p style="margin-top: 10px;">Klasörler yüklenemedi</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading folder tree:', error);
        document.getElementById('folder-tree').innerHTML = `
            <div style="padding: 20px; text-align: center; color: #e74c3c;">
                <i class="fas fa-exclamation-triangle"></i>
                <p style="margin-top: 10px;">Klasörler yüklenirken hata oluştu</p>
            </div>
        `;
    }
}

// Render folder tree
function renderFolderTree(folders) {
    const treeContainer = document.getElementById('folder-tree');

    if (!folders || folders.length === 0) {
        treeContainer.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #7f8c8d;">
                <i class="fas fa-folder-open"></i>
                <p style="margin-top: 10px;">Henüz klasör yok</p>
            </div>
        `;
        return;
    }

    treeContainer.innerHTML = folders.map(folder => `
        <div class="folder-item" data-folder="${escapeHtml(folder)}" onclick="handleFolderClick('${escapeHtml(folder)}')">
            <i class="fas fa-folder" style="color: #f39c12; margin-right: 8px;"></i>
            <span>${escapeHtml(folder)}</span>
        </div>
    `).join('');

    // Select first folder by default
    if (folders.length > 0 && !currentSelectedFolder) {
        handleFolderClick(folders[0]);
    } else if (currentSelectedFolder) {
        handleFolderClick(currentSelectedFolder);
    }
}

// Handle folder click
function handleFolderClick(folderName) {
    selectFolder(folderName);
    loadDocumentsByFolder(folderName);
}

// Load documents by folder
async function loadDocumentsByFolder(folderName) {
    try {
        // Handle special root folder name
        const folderPath = folderName === '📁 Ana Dizin' ? '' : folderName;

        // Load from physical folder using get-documents.php
        const response = await fetch(`get-documents.php?mode=flat&path=${encodeURIComponent(folderPath)}`, {
            credentials: 'same-origin'
        });
        const data = await response.json();

        // Extract documents from response and filter out directories
        const allItems = data.documents || [];
        const documents = allItems.filter(item => !item.isDirectory);

        renderDocuments(documents, folderName);
    } catch (error) {
        console.error('Error loading documents:', error);
        const filesGrid = document.getElementById('files-grid');
        if (filesGrid) {
            filesGrid.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: #e74c3c;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3em; margin-bottom: 15px;"></i>
                    <p>Dökümanlar yüklenirken hata oluştu</p>
                </div>
            `;
        }
    }
}

// Render documents
function renderDocuments(documents, folderName) {
    const filesGrid = document.getElementById('files-grid');
    const filesHeader = document.getElementById('files-header');

    // Update header
    if (filesHeader) {
        filesHeader.innerHTML = `
            <h4 style="margin: 0; color: #2c3e50;">
                <i class="fas fa-folder-open" style="color: #f39c12;"></i> ${escapeHtml(folderName)}
                <span style="color: #95a5a6; font-size: 14px; margin-left: 10px;">(${documents.length} döküman)</span>
            </h4>
        `;
    }

    if (!documents || documents.length === 0) {
        filesGrid.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: #7f8c8d;">
                <i class="fas fa-folder-open" style="font-size: 3em; margin-bottom: 15px; color: #cbd5e0;"></i>
                <p style="font-size: 15px;">Bu klasörde henüz döküman yok</p>
                <button class="submit-btn admin-only" onclick="openModal('add-document-modal')" style="margin-top: 15px;">
                    <i class="fas fa-plus"></i> İlk Dökümanı Ekle
                </button>
            </div>
        `;
        return;
    }

    // Render document cards
    filesGrid.innerHTML = documents.map(doc => {
        const icon = getFileIcon(doc.type);
        const size = formatFileSize(doc.size);
        const docPath = doc.relativePath || doc.path || doc.name;

        return `
            <div class="document-card" data-doc-id="${doc.id}" data-doc-path="${escapeHtml(docPath)}">
                <div class="document-icon">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="document-info">
                    <div class="document-name" title="${escapeHtml(doc.name)}">${escapeHtml(doc.name)}</div>
                    <div class="document-meta">
                        <span>${size}</span>
                        <span>${doc.date || 'N/A'}</span>
                    </div>
                </div>
                <div class="document-actions">
                    <button class="action-btn view-btn" onclick="viewDocument('${escapeHtml(docPath)}')" title="Görüntüle">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn download-btn" onclick="downloadDocument('${escapeHtml(docPath)}')" title="İndir">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="doc-move-btn admin-only" onclick="event.stopPropagation(); openMoveDocumentModal('${escapeHtml(docPath)}', '${escapeHtml(doc.name)}', '${escapeHtml(folderName)}')" title="Taşı">
                        <i class="fas fa-arrows-alt"></i>
                    </button>
                    <button class="action-btn delete-btn admin-only" onclick="deleteDocument('${escapeHtml(docPath)}')" title="Sil">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Get file icon based on type
function getFileIcon(type) {
    const icons = {
        'pdf': 'fa-file-pdf',
        'doc': 'fa-file-word',
        'docx': 'fa-file-word',
        'xls': 'fa-file-excel',
        'xlsx': 'fa-file-excel',
        'ppt': 'fa-file-powerpoint',
        'pptx': 'fa-file-powerpoint',
        'txt': 'fa-file-alt',
        'csv': 'fa-file-csv',
        'one': 'fa-file'
    };
    return icons[type] || 'fa-file';
}

// Format file size
function formatFileSize(bytes) {
    // If already formatted (string), return as-is
    if (typeof bytes === 'string') return bytes;
    if (!bytes) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
}

// Document fonksiyonlari DocumentManagement.js'e tasindi
// Asagidaki override'lar DocMgmt yoksa fallback olarak kalir

// ============================================================================
// NETWORK BACKUP & WHITELIST MONITORING REFRESH FUNCTION
// ============================================================================

async function refreshBackupDetails() {
    try {
        console.log('🔄 Refreshing backup status...');

        // Fetch fresh data from backup_receiver_prod.php
        const response = await fetch('backup_receiver_prod.php?action=current&t=' + Date.now());

        if (!response.ok) {
            throw new Error('HTTP ' + response.status);
        }

        const data = await response.json();

        // Update header info
        const lastUpdate = document.getElementById('header-last-update');
        const dataAge = document.getElementById('header-data-age');
        const serverInfo = document.getElementById('header-server-info');

        if (lastUpdate) {
            lastUpdate.textContent = 'Son güncelleme: ' + (data.timestamp || '-');
        }

        if (dataAge && data.received_at) {
            const receivedTime = new Date(data.received_at);
            const now = new Date();
            const diffMinutes = Math.floor((now - receivedTime) / 60000);
            dataAge.textContent = diffMinutes + ' dakika önce güncellendi';
        }

        if (serverInfo) {
            serverInfo.textContent = 'Sunucu: ' + (data.source_server || 'Unknown');
        }

        // Update overall stats
        const summary = data.backup_summary || {};
        const totalDirs = document.getElementById('detail-total-dirs');
        const successful = document.getElementById('detail-successful');
        const failed = document.getElementById('detail-failed');

        if (totalDirs) totalDirs.textContent = summary.total_dirs || '0';
        if (successful) successful.textContent = summary.successful || '0';
        if (failed) failed.textContent = summary.failed || '0';

        console.log('✅ Backup status refreshed successfully');
        showNotification('Backup durumu güncellendi', 'success');

    } catch (error) {
        console.error('❌ Error refreshing backup status:', error);
        showNotification('Veri yenilenirken hata oluştu: ' + error.message, 'error');
    }
}

// ============================================================================
// DASHBOARD BACKUP STATUS WIDGET REFRESH
// ============================================================================

async function refreshBackupStatus() {
    try {
        console.log('🔄 Refreshing dashboard backup status...');

        // Fetch fresh data from backup_receiver_prod.php
        const response = await fetch('backup_receiver_prod.php?action=current&t=' + Date.now());

        if (!response.ok) {
            throw new Error('HTTP ' + response.status);
        }

        const data = await response.json();

        // Update overall stats in the widget
        const summary = data.backup_summary || {};
        document.getElementById('total-dirs').textContent = summary.total_dirs || '-';
        document.getElementById('successful-backups').textContent = summary.successful || '-';
        document.getElementById('failed-backups').textContent = summary.failed || '-';
        document.getElementById('total-problems').textContent = data.problems_count || '-';

        // Update last update time
        if (data.received_at) {
            document.getElementById('last-update-time').textContent = data.received_at;
        }

        // Update server info
        if (data.source_server) {
            const serverInfo = document.getElementById('server-info');
            if (serverInfo) {
                serverInfo.textContent = 'Sunucu: ' + data.source_server;
            }
        }

        // Update failed backups list
        updateFailedBackupsList(data.failed_directories || []);

        // Update backup status badge
        const badge = document.getElementById('backup-status-badge');
        if (badge) {
            const failedCount = summary.failed || 0;
            if (failedCount === 0) {
                badge.className = 'status-badge status-success';
                badge.innerHTML = '<i class="fas fa-check-circle"></i> Tümü Başarılı';
            } else if (failedCount <= 2) {
                badge.className = 'status-badge status-warning';
                badge.innerHTML = '<i class="fas fa-exclamation-triangle"></i> ' + failedCount + ' Sorun';
            } else {
                badge.className = 'status-badge status-error';
                badge.innerHTML = '<i class="fas fa-times-circle"></i> ' + failedCount + ' Hata';
            }
        }

        console.log('✅ Dashboard backup status refreshed');
        showNotification('Backup durumu güncellendi', 'success');

    } catch (error) {
        console.error('❌ Error refreshing dashboard backup status:', error);
        showNotification('Veri yenilenirken hata oluştu: ' + error.message, 'error');

        // Set error badge
        const badge = document.getElementById('backup-status-badge');
        if (badge) {
            badge.className = 'status-badge status-error';
            badge.innerHTML = '<i class="fas fa-times-circle"></i> Hata';
        }
    }
}

// Toggle failed backups list visibility
function toggleFailedBackupsList() {
    const section = document.getElementById('failed-backups-section');
    const icon = document.getElementById('failed-toggle-icon');

    if (section.style.display === 'none' || section.style.display === '') {
        section.style.display = 'block';
        if (icon) icon.className = 'fas fa-chevron-up';
    } else {
        section.style.display = 'none';
        if (icon) icon.className = 'fas fa-chevron-down';
    }
}

// Update the failed backups list display
function updateFailedBackupsList(failedDirectories) {
    const section = document.getElementById('failed-backups-section');
    const list = document.getElementById('failed-backups-list');
    const icon = document.getElementById('failed-toggle-icon');

    if (!failedDirectories || failedDirectories.length === 0) {
        // Hide the section if no failed backups
        section.style.display = 'none';
        return;
    }

    // Auto-show if there are failed backups - user can close it if needed
    section.style.display = 'block';
    if (icon) icon.className = 'fas fa-chevron-up';

    // Build the list HTML
    let html = '';
    failedDirectories.forEach(dir => {
        html += `
            <div style="background: white; border-left: 3px solid #e74c3c; padding: 8px; margin-bottom: 6px; border-radius: 3px;">
                <div style="font-size: 0.75rem; font-weight: 600; color: #2c3e50; margin-bottom: 2px;">
                    <i class="fas fa-folder" style="color: #e74c3c; margin-right: 4px;"></i>
                    ${dir.name || 'Unknown'}
                </div>
                <div style="font-size: 0.7rem; color: #7f8c8d;">
                    <span style="background: #ecf0f1; padding: 2px 6px; border-radius: 3px; margin-right: 6px;">
                        ${dir.server || 'Unknown Server'}
                    </span>
                    <span style="color: #95a5a6;">${dir.details || 'No details'}</span>
                </div>
            </div>
        `;
    });

    list.innerHTML = html;
}

// Auto-refresh backup status on page load
document.addEventListener('DOMContentLoaded', function() {
    // Refresh backup status when dashboard is visible
    if (document.getElementById('dashboard-page')) {
        refreshBackupStatus();

        // Auto-refresh every 5 minutes
        setInterval(refreshBackupStatus, 5 * 60 * 1000);
    }
});

// ============================================================================
// USER PERMISSIONS MANAGEMENT
// ============================================================================

// Helper: return the permission keys (pages/tabs/actions) from the registry.
// Falls back to scanning the DOM if the registry global isn't available yet.
function getPermissionKeys(kind) {
    if (window.permissionRegistry && window.permissionRegistry[kind]) {
        return Object.keys(window.permissionRegistry[kind]);
    }
    // Fallback: scan checkboxes in the form
    const prefix = 'perm_' + (kind === 'pages' ? 'page' : kind === 'tabs' ? 'tab' : 'action') + '_';
    return Array.from(document.querySelectorAll('input[id^="' + prefix + '"]'))
        .map(el => el.id.substring(prefix.length));
}

// Update permissions checkboxes based on selected role
function updatePermissionsBasedOnRole() {
    const role = document.getElementById('user-role').value;
    const isAdmin = (role === 'admin');

    // Readonly defaults: only a curated set of pages is viewable by default
    const readonlyPages = new Set([
        'dashboard', 'ipam', 'tasks', 'devices', 'backups',
        'documents', 'certificates', 'haritalar', 'useful_links', 'hakkinda'
    ]);

    getPermissionKeys('pages').forEach(page => {
        const checkbox = document.getElementById('perm_page_' + page);
        if (checkbox) checkbox.checked = isAdmin ? true : readonlyPages.has(page);
    });

    getPermissionKeys('tabs').forEach(tab => {
        const checkbox = document.getElementById('perm_tab_' + tab);
        if (checkbox) checkbox.checked = isAdmin;
    });

    getPermissionKeys('actions').forEach(action => {
        const checkbox = document.getElementById('perm_action_' + action);
        if (checkbox) checkbox.checked = isAdmin ? true : (action === 'download');
    });
}

// Get permissions from checkboxes (reads registry for the list of keys)
window.getPermissionsFromForm = function() {
    const permissions = { pages: {}, tabs: {}, actions: {} };

    getPermissionKeys('pages').forEach(page => {
        const checkbox = document.getElementById('perm_page_' + page);
        if (checkbox) permissions.pages[page] = checkbox.checked;
    });

    getPermissionKeys('tabs').forEach(tab => {
        const checkbox = document.getElementById('perm_tab_' + tab);
        if (checkbox) permissions.tabs[tab] = checkbox.checked;
    });

    getPermissionKeys('actions').forEach(action => {
        const checkbox = document.getElementById('perm_action_' + action);
        if (checkbox) permissions.actions[action] = checkbox.checked;
    });

    return permissions;
};

// Set permissions to checkboxes
function setPermissionsToForm(permissions) {
    if (!permissions) return;

    // Set page permissions
    if (permissions.pages) {
        Object.keys(permissions.pages).forEach(page => {
            const checkbox = document.getElementById('perm_page_' + page);
            if (checkbox) checkbox.checked = permissions.pages[page];
        });
    }

    // Set tab permissions
    if (permissions.tabs) {
        Object.keys(permissions.tabs).forEach(tab => {
            const checkbox = document.getElementById('perm_tab_' + tab);
            if (checkbox) checkbox.checked = permissions.tabs[tab];
        });
    }

    // Set action permissions
    if (permissions.actions) {
        Object.keys(permissions.actions).forEach(action => {
            const checkbox = document.getElementById('perm_action_' + action);
            if (checkbox) checkbox.checked = permissions.actions[action];
        });
    }
}

// Initialize user form with permission handling
document.addEventListener('DOMContentLoaded', function() {
    const addUserForm = document.getElementById('add-user-form');
    if (addUserForm) {
        // Set default permissions when form loads
        updatePermissionsBasedOnRole();

        // NOTE: Form submission is handled by UserManagement.js
        // Do NOT add another submit event listener here to avoid duplicate submissions
    }
});

// ============================================================================
// USER MANAGEMENT - LIST, EDIT, DELETE
// ============================================================================

// Load and display users list
async function loadUsersList() {
    try {
        const response = await fetch('user-management.php?json=true', {
            credentials: 'same-origin'
        });
        const users = await response.json();

        const tbody = document.getElementById('users-table-body');
        if (!tbody) return;

        if (Object.keys(users).length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">Kullanıcı bulunamadı</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        Object.values(users).forEach(user => {
            const row = document.createElement('tr');

            const roleBadge = user.role === 'admin'
                ? '<span style="background: #3498db; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">Admin</span>'
                : '<span style="background: #95a5a6; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">Sadece Okuma</span>';

            const passwordStatus = user.password_changed
                ? '<span style="color: #27ae60;"><i class="fas fa-check-circle"></i> Değiştirildi</span>'
                : '<span style="color: #e74c3c;"><i class="fas fa-exclamation-circle"></i> İlk Giriş</span>';

            row.innerHTML = `
                <td>${user.username}</td>
                <td>${user.name}</td>
                <td>${user.email || 'Belirtilmemiş'}</td>
                <td>${roleBadge}</td>
                <td>${passwordStatus}</td>
                <td>
                    <button class="action-btn edit-btn" data-permission-action="edit" onclick="editUser('${user.username}')" title="Düzenle">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" data-permission-action="delete" onclick="deleteUser('${user.username}')" title="Sil">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="action-btn" onclick="resetUserPassword('${user.username}')" title="Şifreyi Sıfırla">
                        <i class="fas fa-key"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });

        // Apply permissions to action buttons
        if (typeof applyMenuPermissions === 'function') {
            applyMenuPermissions();
        } else {
            // Manually apply permissions if function not available
            document.querySelectorAll('[data-permission-action]').forEach(btn => {
                const action = btn.getAttribute('data-permission-action');
                if (typeof hasActionPermission === 'function' && !hasActionPermission(action)) {
                    btn.style.display = 'none';
                }
            });
        }

    } catch (error) {
        console.error('Error loading users:', error);
        showNotification('error', 'Kullanıcılar yüklenirken hata oluştu');
    }
}

// Edit user - open modal with user data
async function editUser(username) {
    try {
        const response = await fetch(`user-management.php?action=get_user&username=${username}`, {
            credentials: 'same-origin'
        });
        const data = await response.json();

        if (!data.success) {
            showNotification('error', data.message || 'Kullanıcı bilgileri alınamadı');
            return;
        }

        const user = data.user;

        // Update modal title and form
        const modal = document.getElementById('add-user-modal');
        const modalTitle = modal.querySelector('.modal-title');
        const form = document.getElementById('add-user-form');
        const submitBtn = form.querySelector('.submit-btn');

        modalTitle.textContent = 'Kullanıcı Düzenle';
        submitBtn.textContent = 'Güncelle';

        // Fill form with user data
        const usernameField = document.getElementById('user-username');

        // Disconnect the MutationObserver temporarily for editing
        if (usernameField._readonlyObserver) {
            usernameField._readonlyObserver.disconnect();
            console.log('🔓 Disconnected MutationObserver for edit mode');
        }

        usernameField.value = user.username;

        // Make username field readonly but style it to show it's not editable
        usernameField.setAttribute('readonly', 'readonly');
        usernameField.style.backgroundColor = '#f5f5f5';
        usernameField.style.cursor = 'not-allowed';

        document.getElementById('user-fullname').value = user.name;
        document.getElementById('user-email').value = user.email || '';
        document.getElementById('user-role').value = user.role;

        // Hide password field for editing
        const passwordField = document.getElementById('user-password').parentElement;
        passwordField.style.display = 'none';
        document.getElementById('user-password').removeAttribute('required');

        // Set permissions if available
        if (user.permissions) {
            setPermissionsToForm(user.permissions);
        } else {
            updatePermissionsBasedOnRole();
        }

        // Change form action to update
        form.setAttribute('data-action', 'update');
        form.setAttribute('data-username', username);

        // UserManagement.js will handle the submit event
        console.log('✅ Form configured for UPDATE mode');

        openModal('add-user-modal');

    } catch (error) {
        console.error('Error:', error);
        showNotification('error', 'Kullanıcı bilgileri alınırken hata oluştu');
    }
}

// Reset user form to add mode
window.resetUserForm = function() {
    const modal = document.getElementById('add-user-modal');
    const modalTitle = modal.querySelector('.modal-title');
    const form = document.getElementById('add-user-form');
    const submitBtn = form.querySelector('.submit-btn');

    modalTitle.textContent = 'Yeni Kullanici Ekle';
    submitBtn.textContent = 'Kullanici Ekle';

    // Reset form first
    form.reset();

    // Then enable username field
    const usernameField = document.getElementById('user-username');
    usernameField.removeAttribute('readonly');
    usernameField.removeAttribute('disabled');
    usernameField.removeAttribute('autocomplete');
    usernameField.readOnly = false;
    usernameField.disabled = false;
    usernameField.value = '';

    // Reset ALL inline styles completely
    usernameField.style.cssText = '';
    usernameField.style.backgroundColor = '';
    usernameField.style.cursor = 'text';
    usernameField.style.pointerEvents = '';

    // Show password field
    const passwordField = document.getElementById('user-password').parentElement;
    passwordField.style.display = 'block';
    document.getElementById('user-password').setAttribute('required', 'required');

    // Clear form attributes
    form.removeAttribute('data-action');
    form.removeAttribute('data-username');

    // Update permissions based on default role
    updatePermissionsBasedOnRole();

    console.log('✅ Form reset for ADD mode, username field readonly:', usernameField.hasAttribute('readonly'));
};

// Open user modal (for add new user)
function openUserModal() {
    console.log('🔓 Opening add user modal for NEW user...');

    // Get the username field
    const usernameField = document.getElementById('user-username');
    if (!usernameField) return;

    // ULTRA AGGRESSIVE CLEANUP - Force enable username field
    function forceEnableUsernameField() {
        console.log('🔧 Forcing username field to be editable...');

        // Remove ALL blocking attributes
        usernameField.removeAttribute('readonly');
        usernameField.removeAttribute('disabled');
        usernameField.removeAttribute('autocomplete');
        usernameField.disabled = false;
        usernameField.readOnly = false;
        usernameField.value = '';

        // Clear ALL blocking styles - EXPLICITLY SET TO EDITABLE VALUES
        usernameField.style.cssText = '';  // Clear all inline styles first
        usernameField.style.backgroundColor = 'white';
        usernameField.style.cursor = 'text';
        usernameField.style.pointerEvents = 'auto';
        usernameField.style.opacity = '1';
        usernameField.style.filter = 'none';

        // Force the tabindex to make it focusable
        usernameField.setAttribute('tabindex', '0');

        console.log('🔧 Username field state after force:', {
            readonly_attr: usernameField.hasAttribute('readonly'),
            readonly_prop: usernameField.readOnly,
            disabled: usernameField.disabled,
            value: usernameField.value,
            backgroundColor: usernameField.style.backgroundColor
        });
    }

    // Install a permanent MutationObserver to prevent readonly from being set
    if (!usernameField._readonlyObserver) {
        usernameField._readonlyObserver = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes') {
                    const attrName = mutation.attributeName;
                    if (attrName === 'readonly' || attrName === 'disabled') {
                        console.warn('🚨 Detected attempt to set ' + attrName + ', removing it!');
                        usernameField.removeAttribute(attrName);
                        usernameField.readOnly = false;
                        usernameField.disabled = false;
                    }
                }
            });
        });

        usernameField._readonlyObserver.observe(usernameField, {
            attributes: true,
            attributeFilter: ['readonly', 'disabled']
        });

        console.log('🔒 Installed MutationObserver to prevent readonly');
    }

    // Step 1: Clear it NOW
    forceEnableUsernameField();

    // Step 2: Reset the form
    resetUserForm();

    // Step 3: Open the modal AFTER a tiny delay to ensure form reset completes
    setTimeout(() => {
        openModal('add-user-modal');

        // Step 4: Force enable AGAIN after modal opens
        setTimeout(() => {
            forceEnableUsernameField();

            // Step 5: Try to focus the field
            setTimeout(() => {
                usernameField.focus();
                console.log('✅ Username field focused and ready for input');
                debugUsernameField();
            }, 100);
        }, 100);
    }, 50);
}

// Delete user
async function deleteUser(username) {
    if (!confirm(`"${username}" kullanıcısını silmek istediğinizden emin misiniz?`)) {
        return;
    }

    try {
        const response = await fetch(`user-management.php?delete=${username}&redirect=portal`, {
            credentials: 'same-origin'
        });

        if (response.ok) {
            showNotification('success', 'Kullanıcı başarıyla silindi');
            loadUsersList();
        } else {
            showNotification('error', 'Kullanıcı silinirken hata oluştu');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('error', 'Bir hata oluştu: ' + error.message);
    }
}

// Reset user password
async function resetUserPassword(username) {
    const newPassword = prompt(`${username} için yeni şifre:`);
    if (!newPassword || newPassword.length < 6) {
        showNotification('error', 'Şifre en az 6 karakter olmalıdır');
        return;
    }

    try {
        const params = new URLSearchParams();
        params.append('action', 'reset_password');
        params.append('username', username);
        params.append('new_password', newPassword);

        const response = await fetch('user-management.php', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: params.toString()
        });

        const result = await response.text();

        if (result.includes('basariyla') || result.includes('başarıyla') || result.includes('success')) {
            showNotification('success', 'Şifre başarıyla sıfırlandı');
        } else {
            showNotification('error', result);
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('error', 'Bir hata oluştu: ' + error.message);
    }
}

// Modal helper functions
if (typeof window.openModal === 'undefined') {
    window.openModal = function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
        }
    };
}

if (typeof window.closeModal === 'undefined') {
    window.closeModal = function(modalId, force = false) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';

            // Reset user form if closing user modal
            if (modalId === 'add-user-modal' && typeof resetUserForm === 'function') {
                resetUserForm();
            }
        }
    };
}

// Check if user form has unsaved changes
window.isUserFormDirty = function() {
    const form = document.getElementById('add-user-form');
    if (!form) return false;

    const username = document.getElementById('user-username')?.value?.trim() || '';
    const fullname = document.getElementById('user-fullname')?.value?.trim() || '';
    const email = document.getElementById('user-email')?.value?.trim() || '';
    const password = document.getElementById('user-password')?.value || '';

    // If any field has value, form is dirty
    return username !== '' || fullname !== '' || email !== '' || password !== '';
};

// Handle backdrop click for user modal
window.handleUserModalBackdropClick = function(event) {
    // Only trigger if clicking on the modal backdrop (not the content)
    if (event.target.id === 'add-user-modal') {
        confirmCloseUserModal();
    }
};

// Confirm close user modal with unsaved changes
window.confirmCloseUserModal = function() {
    if (isUserFormDirty()) {
        if (confirm('Formdaki değişiklikler kaydedilmedi. Kapatmak istediğinize emin misiniz?')) {
            closeModal('add-user-modal', true);
        }
    } else {
        closeModal('add-user-modal', true);
    }
};

// Backward compatibility alias - must be defined after editUser
window.openEditUserModal = function(username) {
    console.log('⚠️ openEditUserModal called (legacy), redirecting to editUser()');
    return editUser(username);
};

// Debug input field - EXTENDED VERSION
function debugUsernameField() {
    const field = document.getElementById('user-username');
    if (field) {
        const computed = window.getComputedStyle(field);
        console.log('🔍 Username field FULL debug:', {
            // Attributes
            value: field.value,
            readonly: field.hasAttribute('readonly'),
            disabled: field.hasAttribute('disabled'),
            readOnly: field.readOnly,
            disabled: field.disabled,
            type: field.type,

            // Inline Styles
            style_cursor: field.style.cursor,
            style_pointerEvents: field.style.pointerEvents,
            style_backgroundColor: field.style.backgroundColor,
            style_opacity: field.style.opacity,

            // Computed Styles
            computed_display: computed.display,
            computed_visibility: computed.visibility,
            computed_pointerEvents: computed.pointerEvents,
            computed_cursor: computed.cursor,
            computed_backgroundColor: computed.backgroundColor,
            computed_color: computed.color,
            computed_opacity: computed.opacity
        });

        // Check if something is overlaying the field
        const rect = field.getBoundingClientRect();
        const elementAtPoint = document.elementFromPoint(
            rect.left + rect.width / 2,
            rect.top + rect.height / 2
        );

        console.log('🎯 Element at field center:', {
            isTheField: elementAtPoint === field,
            actualElement: elementAtPoint?.tagName + (elementAtPoint?.id ? '#' + elementAtPoint.id : '') + (elementAtPoint?.className ? '.' + elementAtPoint.className.split(' ')[0] : '')
        });

        if (elementAtPoint !== field) {
            console.error('❌ PROBLEM: Another element is covering the username field!');
        }
    }
}

// Make it globally accessible
window.debugUsernameField = debugUsernameField;

// CRITICAL FIX: Auto-enable username field whenever modal opens in ADD mode
document.addEventListener('DOMContentLoaded', function() {
    const usernameField = document.getElementById('user-username');
    const userModal = document.getElementById('add-user-modal');
    const form = document.getElementById('add-user-form');

    if (usernameField && userModal) {
        // Function to force enable username field
        function forceEnableUsername() {
            const isEditMode = form && form.hasAttribute('data-action') && form.getAttribute('data-action') === 'update';

            if (!isEditMode) {
                console.log('🔓 AUTO-ENABLE: Modal opened in ADD mode, forcing username field enabled');
                usernameField.removeAttribute('readonly');
                usernameField.removeAttribute('disabled');
                usernameField.readOnly = false;
                usernameField.disabled = false;
                usernameField.style.cssText = '';
                usernameField.style.backgroundColor = '';
                usernameField.style.cursor = 'text';
                usernameField.style.pointerEvents = '';
                console.log('✅ Username field auto-enabled, readonly:', usernameField.readOnly);
            }
        }

        // Watch for modal opening
        const modalObserver = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.attributeName === 'style' && userModal.style.display === 'block') {
                    console.log('🔔 Modal opened, checking username field...');
                    setTimeout(forceEnableUsername, 0);
                    setTimeout(forceEnableUsername, 50);
                    setTimeout(forceEnableUsername, 100);
                }
            });
        });

        modalObserver.observe(userModal, {
            attributes: true,
            attributeFilter: ['style']
        });

        // Also enable on click if in add mode
        usernameField.addEventListener('click', function() {
            console.log('👆 Username field clicked');
            const isEditMode = form && form.hasAttribute('data-action') && form.getAttribute('data-action') === 'update';
            if (!isEditMode) {
                console.log('🔓 Click detected in ADD mode, forcing enable');
                forceEnableUsername();
            }
            debugUsernameField();
        });

    }
});

// Load users when users page is shown
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ User management functions loaded');
    console.log('✅ editUser function available:', typeof editUser);
    console.log('✅ openEditUserModal alias available:', typeof window.openEditUserModal);

    // Check if we're on users page
    const hash = window.location.hash;
    if (hash === '#kullanicilar') {
        console.log('🔄 Loading users list on page load...');
        loadUsersList();
    }

    // Listen for hash changes to load users
    window.addEventListener('hashchange', function() {
        if (window.location.hash === '#kullanicilar') {
            console.log('🔄 Loading users list after hash change...');
            loadUsersList();
        }
    });
});

// ============================================
// IPAM Management Functions
// ============================================

// NetBox API Configuration
const NETBOX_CONFIG = {
    baseUrl: 'http://198.51.100.10',
    username: 'portal',
    apiKey: 'YOUR_NETBOX_API_KEY',
    endpoints: {
        ipAddresses: '/api/ipam/ip-addresses/?limit=1000',
        prefixes: '/api/ipam/prefixes/?limit=1000',
        vlans: '/api/ipam/vlans/?limit=1000'
    }
};

// Store IPAM data
let ipamData = {
    ipAddresses: [],
    prefixes: [],
    vlans: []
};

// Pagination state
let ipamPagination = {
    ipAddresses: { currentPage: 1, perPage: 50, filtered: [] },
    prefixes: { currentPage: 1, perPage: 50, filtered: [] },
    vlans: { currentPage: 1, perPage: 50, filtered: [] }
};

// Cache configuration
const IPAM_CACHE_KEY = 'ipam_data_cache';
const IPAM_CACHE_DURATION = 15 * 60 * 1000; // 15 dakika
let ipamAutoRefreshInterval = null;

// Fetch data from NetBox API via proxy with pagination support
async function fetchNetBoxData(endpoint) {
    try {
        let allResults = [];
        let nextUrl = endpoint;
        let pageCount = 0;

        // Fetch all pages
        while (nextUrl) {
            pageCount++;
            const url = `netbox-api.php?action=fetch&endpoint=${encodeURIComponent(nextUrl)}`;
            console.log(`📄 Fetching page ${pageCount} from NetBox:`, nextUrl);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Add results to array
            if (data.results && Array.isArray(data.results)) {
                allResults = allResults.concat(data.results);
                console.log(`✅ Page ${pageCount}: ${data.results.length} kayıt, Toplam: ${allResults.length}/${data.count || '?'}`);
            } else if (Array.isArray(data)) {
                allResults = allResults.concat(data);
            }

            // Check for next page
            if (data.next) {
                // Extract just the path and query from the full URL
                const nextUrlObj = new URL(data.next);
                nextUrl = nextUrlObj.pathname + nextUrlObj.search;
            } else {
                nextUrl = null;
                console.log(`🎉 Tüm veriler yüklendi: ${allResults.length} kayıt`);
            }
        }

        return allResults;
    } catch (error) {
        console.error('❌ NetBox veri çekme hatası:', error);
        console.error('Hata detayları:', {
            message: error.message,
            stack: error.stack,
            endpoint: endpoint
        });
        showNotification('NetBox API bağlantı hatası: ' + error.message, 'error');
        return [];
    }
}

// ============================================
// CACHE MANAGEMENT FUNCTIONS
// ============================================

// Save IPAM data to localStorage
function saveIpamCache(data) {
    try {
        const cacheData = {
            timestamp: Date.now(),
            data: data
        };
        localStorage.setItem(IPAM_CACHE_KEY, JSON.stringify(cacheData));
        console.log('💾 IPAM cache kaydedildi:', {
            ipAddresses: data.ipAddresses?.length || 0,
            prefixes: data.prefixes?.length || 0,
            vlans: data.vlans?.length || 0
        });
    } catch (error) {
        console.error('❌ Cache kaydetme hatası:', error);
    }
}

// Load IPAM data from localStorage
function loadIpamCache() {
    try {
        const cached = localStorage.getItem(IPAM_CACHE_KEY);
        if (!cached) return null;

        const cacheData = JSON.parse(cached);
        const age = Date.now() - cacheData.timestamp;
        const ageMinutes = Math.floor(age / 60000);

        console.log(`📂 IPAM cache bulundu (${ageMinutes} dakika önce)`);
        return cacheData;
    } catch (error) {
        console.error('❌ Cache yükleme hatası:', error);
        return null;
    }
}

// Check if cache is valid
function isCacheValid(cacheData) {
    if (!cacheData || !cacheData.timestamp) return false;
    const age = Date.now() - cacheData.timestamp;
    return age < IPAM_CACHE_DURATION;
}

// Fetch all IPAM data and cache it
async function fetchAllIpamData() {
    console.log('🔄 Tüm IPAM verileri çekiliyor (arka plan)...');

    try {
        // Fetch all data in parallel
        const [ipAddresses, prefixes, vlans] = await Promise.all([
            fetchNetBoxData(NETBOX_CONFIG.endpoints.ipAddresses),
            fetchNetBoxData(NETBOX_CONFIG.endpoints.prefixes),
            fetchNetBoxData(NETBOX_CONFIG.endpoints.vlans)
        ]);

        console.log('📥 Çekilen veriler:', {
            ipAddresses: ipAddresses?.length || 0,
            prefixes: prefixes?.length || 0,
            vlans: vlans?.length || 0
        });

        // Update global data
        ipamData.ipAddresses = ipAddresses;
        ipamData.prefixes = prefixes;
        ipamData.vlans = vlans;

        // Save to cache
        saveIpamCache(ipamData);

        console.log('✅ IPAM verileri güncellendi ve cache\'e kaydedildi');
        return ipamData;
    } catch (error) {
        console.error('❌ IPAM verileri çekme hatası:', error);
        return null;
    }
}

// Start auto-refresh interval
function startIpamAutoRefresh() {
    // Clear existing interval
    if (ipamAutoRefreshInterval) {
        clearInterval(ipamAutoRefreshInterval);
    }

    // Refresh every 15 minutes
    ipamAutoRefreshInterval = setInterval(() => {
        console.log('⏰ 15 dakika doldu, IPAM verileri güncelleniyor...');
        fetchAllIpamData();
    }, IPAM_CACHE_DURATION);

    console.log('⏰ IPAM otomatik güncelleme başlatıldı (15 dakikada bir)');
}

// Load IP Addresses (with cache support)
async function loadIpAddresses() {
    const tbody = document.getElementById('ip-addresses-tbody');
    if (!tbody) return;

    // Try to load from cache first
    const cached = loadIpamCache();

    if (cached && isCacheValid(cached)) {
        // Use cached data
        console.log('⚡ Cache\'den IP adresleri gösteriliyor');
        console.log('📊 Cache içeriği:', {
            hasData: !!cached.data,
            ipAddressesCount: cached.data?.ipAddresses?.length || 0,
            cacheKeys: Object.keys(cached.data || {})
        });
        ipamData.ipAddresses = cached.data.ipAddresses || [];

        if (ipamData.ipAddresses.length > 0) {
            ipamPagination.ipAddresses.currentPage = 1;
            ipamPagination.ipAddresses.filtered = [];

            // Fetch tracking data for all IPs
            await enrichIpAddressesWithTracking();

            // Update tags dropdown
            updateTagsDropdown();

            renderIpAddressesPage();
        } else {
            // Cache is valid but empty - clear it and fetch fresh data
            console.warn('⚠️ Cache geçerli ama boş, API\'den çekiliyor...');
            localStorage.removeItem(IPAM_CACHE_KEY);
            // Don't return, continue to fetch fresh data below
        }

        // If we found data in cache, return here
        if (ipamData.ipAddresses.length > 0) {
            return;
        }
    }

    // Cache invalid or missing, show loading
    tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 40px;"><i class="fas fa-spinner fa-spin"></i> Veriler yükleniyor...</td></tr>';

    // Fetch fresh data
    const data = await fetchNetBoxData(NETBOX_CONFIG.endpoints.ipAddresses);
    ipamData.ipAddresses = data;

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 40px;">Hiç IP adresi bulunamadı.</td></tr>';
        return;
    }

    // Update cache
    saveIpamCache(ipamData);
    ipamPagination.ipAddresses.currentPage = 1;
    ipamPagination.ipAddresses.filtered = [];

    // Fetch tracking data
    await enrichIpAddressesWithTracking();

    // Update tags dropdown
    updateTagsDropdown();

    renderIpAddressesPage();
}

// Render IP Addresses
function renderIpAddresses(data) {
    const tbody = document.getElementById('ip-addresses-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    data.forEach(ip => {
        const row = document.createElement('tr');

        // Tracking bilgileri
        const tracking = ip.tracking || {};
        const trackingStatus = tracking.status || ip.status || 'unknown';
        const statusBadge = getTrackingStatusBadge(trackingStatus);

        const lastSeen = tracking.last_seen
            ? new Date(tracking.last_seen).toLocaleString('tr-TR')
            : '<span style="color: #9ca3af;">Hiç görülmedi</span>';

        const daysOffline = tracking.days_offline || 0;
        const daysOfflineBadge = daysOffline === 0
            ? '<span style="color: #10B981;">Online</span>'
            : daysOffline >= 30
            ? `<span style="color: #EF4444; font-weight: 600;">💀 ${daysOffline} gün</span>`
            : daysOffline >= 7
            ? `<span style="color: #F59E0B; font-weight: 600;">${daysOffline} gün</span>`
            : `<span style="color: #6B7280;">${daysOffline} gün</span>`;

        const dnsName = ip.dns_name || '-';
        const owner = tracking.owner || '-';
        const description = ip.description || '-';
        const tenant = ip.tenant ? ip.tenant.name : '-';

        // Clean IP address (remove CIDR notation)
        const cleanIp = ip.address.split('/')[0];

        // Actions
        const actions = `
            <button class="action-btn view-btn" onclick="pingIpAddress('${cleanIp}')" title="Ping Check" style="font-size: 12px; padding: 4px 8px;">
                <i class="fas fa-satellite-dish"></i>
            </button>
            <button class="action-btn edit-btn" onclick="editIpTracking('${cleanIp}')" title="Edit Tracking" style="font-size: 12px; padding: 4px 8px;">
                <i class="fas fa-edit"></i>
            </button>
        `;

        // Tags bilgisi - Netbox'tan gelen tags array
        const tags = ip.tags || [];
        const tagsBadges = tags.length > 0
            ? tags.map(tag => {
                const tagName = typeof tag === 'object' ? (tag.name || tag.slug) : tag;
                const tagColor = typeof tag === 'object' && tag.color ? tag.color : '6B7280';
                return `<span class="tag-badge" style="background-color: #${tagColor}20; color: #${tagColor}; border: 1px solid #${tagColor}40; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-right: 4px; display: inline-block; margin-bottom: 2px;">${tagName}</span>`;
            }).join('')
            : '<span style="color: #9ca3af;">-</span>';

        row.innerHTML = `
            <td><strong>${ip.address}</strong></td>
            <td>${statusBadge}</td>
            <td>${lastSeen}</td>
            <td>${daysOfflineBadge}</td>
            <td>${dnsName}</td>
            <td>${owner}</td>
            <td>${description}</td>
            <td>${tenant}</td>
            <td style="max-width: 200px;">${tagsBadges}</td>
            <td style="white-space: nowrap;">${actions}</td>
        `;

        tbody.appendChild(row);
    });
}

// Update tags dropdown with all unique tags from current IP addresses
function updateTagsDropdown() {
    const dropdown = document.getElementById('ip-tags-filter');
    if (!dropdown) return;

    // Collect all unique tags
    const tagsSet = new Set();
    let tagCount = 0;
    let sampleIPs = [];
    ipamData.ipAddresses.forEach((ip, index) => {
        const tags = ip.tags || [];
        if (tags.length > 0 && sampleIPs.length < 3) {
            sampleIPs.push({ ip: ip.address, tags: tags });
        }
        tags.forEach(tag => {
            tagCount++;
            const tagName = typeof tag === 'object' ? (tag.name || tag.slug) : tag;
            if (tagName) {
                const normalizedTag = tagName.toString().toLowerCase().trim();
                tagsSet.add(normalizedTag);
            }
        });
    });

    // Convert to sorted array
    const sortedTags = Array.from(tagsSet).sort();
    console.log(`🏷️ Tag toplama: ${tagCount} tag, ${sortedTags.length} benzersiz tag:`, sortedTags);
    console.log('📝 Örnek IP tag\'leri:', sampleIPs);

    // Get current selection
    const currentValue = dropdown.value;

    // Clear and rebuild dropdown
    dropdown.innerHTML = '<option value="">Tüm Tags</option>';

    // Add emoji mapping for common tags
    const tagEmojis = {
        'network': '🌐',
        'linux': '🐧',
        'siber': '🔒',
        'windows': '🪟',
        'server': '🖥️',
        'production': '⚡',
        'test': '🧪',
        'staging': '🎭',
        'development': '🔧',
        'database': '🗄️',
        'web': '🌍',
        'api': '🔌',
        'backup': '💾',
        'monitoring': '📊'
    };

    sortedTags.forEach(tag => {
        const emoji = tagEmojis[tag.toLowerCase()] || '🏷️';
        const option = document.createElement('option');
        option.value = tag;
        option.textContent = `${emoji} ${tag.charAt(0).toUpperCase() + tag.slice(1)}`;
        dropdown.appendChild(option);
    });

    // Restore previous selection if it still exists
    if (currentValue && sortedTags.includes(currentValue.toLowerCase())) {
        dropdown.value = currentValue;
    }

    console.log(`🏷️ Tags dropdown güncellendi: ${sortedTags.length} benzersiz tag bulundu`);
}

// Load Prefixes
async function loadPrefixes() {
    const tbody = document.getElementById('prefixes-tbody');
    if (!tbody) return;

    // Try to load from cache first
    const cached = loadIpamCache();

    if (cached && isCacheValid(cached)) {
        console.log('⚡ Cache\'den prefixes gösteriliyor');
        ipamData.prefixes = cached.data.prefixes || [];

        if (ipamData.prefixes.length > 0) {
            ipamPagination.prefixes.currentPage = 1;
            ipamPagination.prefixes.filtered = [];
            renderPrefixesPage();
        } else {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px;">Hiç prefix bulunamadı.</td></tr>';
        }
        return;
    }

    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px;"><i class="fas fa-spinner fa-spin"></i> Veriler yükleniyor...</td></tr>';

    const data = await fetchNetBoxData(NETBOX_CONFIG.endpoints.prefixes);
    ipamData.prefixes = data;

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px;">Hiç prefix bulunamadı.</td></tr>';
        return;
    }

    saveIpamCache(ipamData);
    ipamPagination.prefixes.currentPage = 1;
    ipamPagination.prefixes.filtered = [];
    renderPrefixesPage();
}

// Render Prefixes
function renderPrefixes(data) {
    const tbody = document.getElementById('prefixes-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    data.forEach(prefix => {
        const row = document.createElement('tr');

        const statusBadge = getStatusBadge(prefix.status);
        const site = prefix.site ? prefix.site.name : '-';
        const tenant = prefix.tenant ? prefix.tenant.name : '-';
        const vlan = prefix.vlan ? prefix.vlan.name : '-';
        const description = prefix.description || '-';

        // Utilization will be calculated dynamically when needed
        const utilizationHtml = '<span style="color: #6b7280; font-size: 12px;">Click to view</span>';

        row.innerHTML = `
            <td><strong>${prefix.prefix}</strong></td>
            <td>${statusBadge}</td>
            <td>${utilizationHtml}</td>
            <td>${site}</td>
            <td>${tenant}</td>
            <td>${vlan}</td>
            <td>${description}</td>
            <td>
                <button class="action-btn view-btn" onclick="viewPrefixDetails(${prefix.id})" title="View Details">
                    <i class="fas fa-eye"></i> Details
                </button>
            </td>
        `;

        tbody.appendChild(row);
    });
}

// Load VLANs
async function loadVlans() {
    const tbody = document.getElementById('vlans-tbody');
    if (!tbody) return;

    // Try to load from cache first
    const cached = loadIpamCache();

    if (cached && isCacheValid(cached)) {
        console.log('⚡ Cache\'den VLANs gösteriliyor');
        ipamData.vlans = cached.data.vlans || [];

        if (ipamData.vlans.length > 0) {
            ipamPagination.vlans.currentPage = 1;
            ipamPagination.vlans.filtered = [];
            renderVlansPage();
        } else {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px;">Hiç VLAN bulunamadı.</td></tr>';
        }
        return;
    }

    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px;"><i class="fas fa-spinner fa-spin"></i> Veriler yükleniyor...</td></tr>';

    const data = await fetchNetBoxData(NETBOX_CONFIG.endpoints.vlans);
    ipamData.vlans = data;

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px;">Hiç VLAN bulunamadı.</td></tr>';
        return;
    }

    saveIpamCache(ipamData);
    ipamPagination.vlans.currentPage = 1;
    ipamPagination.vlans.filtered = [];
    renderVlansPage();
}

// Render VLANs
function renderVlans(data) {
    const tbody = document.getElementById('vlans-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    data.forEach(vlan => {
        const row = document.createElement('tr');

        const statusBadge = getStatusBadge(vlan.status);
        const site = vlan.site ? vlan.site.name : '-';
        const tenant = vlan.tenant ? vlan.tenant.name : '-';
        const role = vlan.role ? vlan.role.name : '-';
        const description = vlan.description || '-';

        row.innerHTML = `
            <td><strong>${vlan.vid}</strong></td>
            <td>${vlan.name}</td>
            <td>${statusBadge}</td>
            <td>${site}</td>
            <td>${tenant}</td>
            <td>${role}</td>
            <td>${description}</td>
        `;

        tbody.appendChild(row);
    });
}

// Get status badge HTML
function getStatusBadge(status) {
    if (!status) return '<span class="status-badge status-default">Unknown</span>';

    const statusMap = {
        'active': { label: 'Aktif', class: 'status-success' },
        'reserved': { label: 'Rezerve', class: 'status-warning' },
        'deprecated': { label: 'Deprecated', class: 'status-danger' },
        'dhcp': { label: 'DHCP', class: 'status-info' }
    };

    const statusValue = status.value || status.label || status;
    const statusLabel = status.label || statusValue;
    const statusInfo = statusMap[statusValue] || { label: statusLabel, class: 'status-default' };

    return `<span class="status-badge ${statusInfo.class}">${statusInfo.label}</span>`;
}

// ========================================
// PREFIX DETAILS FUNCTIONS
// ========================================

// Calculate IP count from CIDR notation
function calculateIpCount(prefix) {
    const parts = prefix.split('/');
    if (parts.length !== 2) return 0;

    const maskBits = parseInt(parts[1]);
    const ipFamily = parts[0].includes(':') ? 6 : 4;

    if (ipFamily === 4) {
        // IPv4: 2^(32 - maskBits) - 2 (network and broadcast)
        const totalIps = Math.pow(2, 32 - maskBits);
        return maskBits === 32 ? 1 : (maskBits === 31 ? 2 : totalIps - 2);
    } else {
        // IPv6: 2^(128 - maskBits)
        return Math.pow(2, 128 - maskBits);
    }
}

// View prefix details in modal
async function viewPrefixDetails(prefixId) {
    console.log('🔍 Prefix details loading for ID:', prefixId);

    // Find the prefix data
    const prefix = ipamData.prefixes.find(p => p.id === prefixId);
    if (!prefix) {
        showNotification('Prefix bulunamadı!', 'error');
        return;
    }

    // Open modal
    openModal('prefix-details-modal');

    // Fill basic info
    document.getElementById('prefix-detail-prefix').textContent = prefix.prefix;
    document.getElementById('prefix-detail-site').textContent = prefix.site ? prefix.site.name : '-';
    document.getElementById('prefix-detail-tenant').textContent = prefix.tenant ? prefix.tenant.name : '-';
    document.getElementById('prefix-detail-vlan').textContent = prefix.vlan ? `${prefix.vlan.name} (${prefix.vlan.vid})` : '-';
    document.getElementById('prefix-detail-description').textContent = prefix.description || '-';

    // Calculate total IPs
    const totalIps = calculateIpCount(prefix.prefix);
    document.getElementById('prefix-total-ips').textContent = totalIps.toLocaleString();

    // Show loading for dynamic data
    document.getElementById('prefix-used-ips').textContent = '...';
    document.getElementById('prefix-available-ips').textContent = '...';
    document.getElementById('prefix-utilization-bar').style.width = '0%';
    document.getElementById('prefix-utilization-text').textContent = 'Loading...';

    // Fetch used IPs count and list
    try {
        const usedIpsUrl = `netbox-api.php?action=fetch&endpoint=${encodeURIComponent('/api/ipam/ip-addresses/?parent=' + encodeURIComponent(prefix.prefix) + '&limit=1000')}`;
        const usedResponse = await fetch(usedIpsUrl);
        const usedData = await usedResponse.json();

        const usedCount = usedData.count || 0;
        const availableCount = totalIps - usedCount;
        const utilization = totalIps > 0 ? Math.round((usedCount / totalIps) * 100) : 0;

        // Update stats
        document.getElementById('prefix-used-ips').textContent = usedCount.toLocaleString();
        document.getElementById('prefix-available-ips').textContent = availableCount.toLocaleString();
        document.getElementById('prefix-utilization-bar').style.width = utilization + '%';
        document.getElementById('prefix-utilization-text').textContent = utilization + '%';

        // Render used IPs list
        renderUsedIpsList(usedData.results || []);

        // Fetch available IPs (limited to first 100)
        const availableIpsUrl = `netbox-api.php?action=fetch&endpoint=${encodeURIComponent('/api/ipam/prefixes/' + prefixId + '/available-ips/')}`;
        const availableResponse = await fetch(availableIpsUrl);
        const availableData = await availableResponse.json();

        // Store available IPs globally for scanner
        currentAvailableIps = availableData || [];
        currentScanPrefix = prefix;

        renderAvailableIpsList(availableData);

        console.log(`📊 Loaded ${currentAvailableIps.length} available IPs for scanning`);

    } catch (error) {
        console.error('❌ Error loading prefix details:', error);
        showNotification('Prefix detayları yüklenirken hata oluştu!', 'error');
    }
}

// Render used IPs list
function renderUsedIpsList(ips) {
    const tbody = document.getElementById('prefix-used-ips-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!ips || ips.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #6b7280;">Kullanılan IP adresi yok</td></tr>';
        return;
    }

    ips.forEach(ip => {
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid #e5e7eb';

        const statusBadge = getStatusBadge(ip.status);
        const dnsName = ip.dns_name || '-';
        const description = ip.description || '-';

        row.innerHTML = `
            <td style="padding: 10px;"><strong>${ip.address}</strong></td>
            <td style="padding: 10px;">${dnsName}</td>
            <td style="padding: 10px;">${description}</td>
            <td style="padding: 10px;">${statusBadge}</td>
        `;

        tbody.appendChild(row);
    });
}

// Render available IPs list
function renderAvailableIpsList(ips) {
    const tbody = document.getElementById('prefix-available-ips-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!ips || ips.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" style="text-align: center; padding: 20px; color: #6b7280;">Müsait IP adresi yok</td></tr>';
        return;
    }

    // Update table header to include status column
    const thead = tbody.parentElement.querySelector('thead');
    if (thead) {
        thead.innerHTML = `
            <tr style="background: #f9fafb; position: sticky; top: 0;">
                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e5e7eb;">Available IP Address</th>
                <th style="padding: 10px; text-align: center; border-bottom: 2px solid #e5e7eb; width: 250px;">Connectivity Test</th>
            </tr>
        `;
    }

    // Limit to first 100 IPs for display
    const displayIps = ips.slice(0, 100);

    displayIps.forEach(ip => {
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid #e5e7eb';
        const ipAddress = ip.address.split('/')[0]; // Remove CIDR notation

        row.innerHTML = `
            <td style="padding: 10px;">
                <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-weight: 600;">${ip.address}</code>
            </td>
            <td style="padding: 10px; text-align: center;">
                <button
                    class="action-btn"
                    onclick="testIpConnectivity('${ipAddress}', this)"
                    style="background: #3b82f6; color: white; padding: 6px 12px; border: none; border-radius: 6px; cursor: pointer; font-size: 13px;"
                    title="Ping test">
                    <i class="fas fa-network-wired"></i> Test
                </button>
                <span class="ping-result" style="margin-left: 10px; font-size: 12px;"></span>
            </td>
        `;

        tbody.appendChild(row);
    });

    if (ips.length > 100) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="2" style="text-align: center; padding: 15px; color: #6b7280; font-style: italic;">
                ... ve ${ips.length - 100} müsait IP daha (ilk 100 gösteriliyor)
            </td>
        `;
        tbody.appendChild(row);
    }
}

// Test IP connectivity with ping
async function testIpConnectivity(ip, buttonElement) {
    const resultSpan = buttonElement.parentElement.querySelector('.ping-result');

    // Show loading state
    buttonElement.disabled = true;
    buttonElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing...';
    resultSpan.innerHTML = '';

    try {
        const response = await fetch(`netbox-api.php?action=ping&ip=${encodeURIComponent(ip)}`);
        const data = await response.json();

        // Reset button
        buttonElement.disabled = false;
        buttonElement.innerHTML = '<i class="fas fa-network-wired"></i> Test';

        if (data.success) {
            const responseTime = data.response_time ? `${data.response_time.toFixed(1)}ms` : 'N/A';
            resultSpan.innerHTML = `
                <span style="color: #10B981; font-weight: 600;">
                    <i class="fas fa-check-circle"></i> Online (${responseTime})
                </span>
            `;
        } else {
            resultSpan.innerHTML = `
                <span style="color: #ef4444; font-weight: 600;">
                    <i class="fas fa-times-circle"></i> Offline
                </span>
            `;
        }

    } catch (error) {
        console.error('Ping test error:', error);
        buttonElement.disabled = false;
        buttonElement.innerHTML = '<i class="fas fa-network-wired"></i> Test';
        resultSpan.innerHTML = `
            <span style="color: #f59e0b; font-weight: 600;">
                <i class="fas fa-exclamation-circle"></i> Error
            </span>
        `;
    }
}

// Switch tabs in prefix details modal
function switchPrefixDetailTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('#prefix-details-modal .tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.getAttribute('data-tab') === tabName) {
            tab.classList.add('active');
        }
    });

    // Hide all tab contents
    document.getElementById('used-ips-tab').style.display = 'none';
    document.getElementById('available-ips-tab').style.display = 'none';
    document.getElementById('unregistered-ips-tab').style.display = 'none';

    // Show selected tab
    if (tabName === 'used-ips') {
        document.getElementById('used-ips-tab').style.display = 'block';
    } else if (tabName === 'available-ips') {
        document.getElementById('available-ips-tab').style.display = 'block';
    } else if (tabName === 'unregistered-ips') {
        document.getElementById('unregistered-ips-tab').style.display = 'block';
    }
}

// ========================================
// PREFIX SCANNER FUNCTIONS
// ========================================

// Global variable to store current prefix being scanned
let currentScanPrefix = null;
let currentAvailableIps = [];
let scanResults = [];

// Scan prefix for unregistered active IPs
async function scanPrefixForUnregistered() {
    const button = document.getElementById('scan-prefix-btn');
    const progressContainer = document.getElementById('scan-progress-container');
    const progressBar = document.getElementById('scan-progress-bar');
    const progressText = document.getElementById('scan-progress-text');
    const progressPercent = document.getElementById('scan-progress-percent');
    const tbody = document.getElementById('unregistered-ips-tbody');
    const resultsHeader = document.getElementById('unregistered-results-header');
    const badge = document.getElementById('unregistered-count-badge');

    // Get available IPs from the modal data
    if (!currentAvailableIps || currentAvailableIps.length === 0) {
        showNotification('Önce prefix detaylarını yükleyin!', 'warning');
        return;
    }

    // Disable button and show progress
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Scanning...';
    progressContainer.style.display = 'block';
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Scanning network...</td></tr>';
    resultsHeader.style.display = 'none';

    scanResults = [];
    const totalIps = Math.min(currentAvailableIps.length, 100); // Limit to first 100
    let scanned = 0;
    const scanStartTime = Date.now();
    let scanId = null;

    // Start scan in database
    try {
        const formData = new FormData();
        formData.append('action', 'start_scan');
        formData.append('prefix_id', currentScanPrefix?.id || '');
        formData.append('prefix_cidr', currentScanPrefix?.prefix || '');
        formData.append('scan_type', 'manual');

        const startResponse = await fetch('scan-api.php', {
            method: 'POST',
            body: formData
        });
        const startData = await startResponse.json();
        scanId = startData.scan_id;
        console.log('🚀 Scan started with ID:', scanId);
    } catch (error) {
        console.error('Error starting scan:', error);
    }

    try {
        // Scan in batches of 10 for performance
        const batchSize = 10;
        for (let i = 0; i < totalIps; i += batchSize) {
            const batch = currentAvailableIps.slice(i, Math.min(i + batchSize, totalIps));
            const batchPromises = batch.map(async (ip) => {
                const ipAddress = ip.address.split('/')[0];
                try {
                    const response = await fetch(`netbox-api.php?action=ping_with_mac&ip=${encodeURIComponent(ipAddress)}`);
                    const data = await response.json();

                    scanned++;
                    const percent = Math.round((scanned / totalIps) * 100);
                    progressBar.style.width = percent + '%';
                    progressPercent.textContent = percent + '%';
                    progressText.textContent = `Scanning ${scanned}/${totalIps} IPs...`;

                    if (data.success) {
                        return {
                            ip: ipAddress,
                            responseTime: data.response_time,
                            mac: data.mac_address || null,
                            timestamp: new Date().toISOString()
                        };
                    }
                } catch (error) {
                    console.error(`Error pinging ${ipAddress}:`, error);
                }
                return null;
            });

            const batchResults = await Promise.all(batchPromises);
            scanResults.push(...batchResults.filter(r => r !== null));

            // Update results in real-time
            renderUnregisteredIps(scanResults);
        }

        // Final update
        progressText.textContent = `Scan complete! Found ${scanResults.length} active unregistered IP(s)`;

        // Update badge
        if (scanResults.length > 0) {
            badge.textContent = scanResults.length;
            badge.style.display = 'inline';
        } else {
            badge.style.display = 'none';
        }

        // Update last scan time
        document.getElementById('last-scan-time').textContent = new Date().toLocaleString('tr-TR');
        document.getElementById('last-scan-info').style.display = 'block';

        // Save findings to database
        if (scanId) {
            try {
                const scanDuration = Math.round((Date.now() - scanStartTime) / 1000); // seconds
                const formData = new FormData();
                formData.append('action', 'save_findings');
                formData.append('scan_id', scanId);
                formData.append('total_scanned', totalIps);
                formData.append('duration', scanDuration);
                formData.append('findings', JSON.stringify(scanResults));

                await fetch('scan-api.php', {
                    method: 'POST',
                    body: formData
                });

                console.log('💾 Scan results saved to database');
            } catch (error) {
                console.error('Error saving findings:', error);
            }
        }

        // Show notification
        if (scanResults.length > 0) {
            showNotification(`⚠️ ${scanResults.length} kayıtsız aktif cihaz bulundu!`, 'warning');
        } else {
            showNotification('✅ Tüm aktif cihazlar kayıtlı!', 'success');
        }

    } catch (error) {
        console.error('Scan error:', error);
        showNotification('Tarama sırasında hata oluştu!', 'error');
    } finally {
        // Re-enable button
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-search"></i> Scan Again';

        setTimeout(() => {
            progressContainer.style.display = 'none';
        }, 3000);
    }
}

// Render unregistered IPs table
function renderUnregisteredIps(results) {
    const tbody = document.getElementById('unregistered-ips-tbody');
    const resultsHeader = document.getElementById('unregistered-results-header');
    const totalSpan = document.getElementById('unregistered-total');

    if (!results || results.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: #10B981;">
                    <i class="fas fa-check-circle" style="font-size: 48px; margin-bottom: 10px;"></i>
                    <p style="margin: 0; font-size: 16px; font-weight: 600;">All Clear!</p>
                    <p style="margin: 5px 0 0 0; font-size: 14px; color: #6b7280;">No unregistered active devices found</p>
                </td>
            </tr>
        `;
        resultsHeader.style.display = 'none';
        return;
    }

    // Show results header
    resultsHeader.style.display = 'block';
    totalSpan.textContent = results.length;

    // Clear and render results
    tbody.innerHTML = '';
    results.forEach(result => {
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid #e5e7eb';

        const detectedTime = new Date(result.timestamp).toLocaleString('tr-TR');
        const responseTime = result.responseTime ? `${result.responseTime.toFixed(1)}ms` : 'N/A';
        const macAddress = result.mac ? result.mac : '<span style="color: #9ca3af;">N/A</span>';

        row.innerHTML = `
            <td style="padding: 10px;">
                <code style="background: #fef3c7; padding: 4px 8px; border-radius: 4px; font-weight: 600; color: #92400e;">${result.ip}</code>
            </td>
            <td style="padding: 10px; text-align: center;">
                <code style="background: #e0e7ff; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; color: #4338ca; font-family: monospace;">
                    ${macAddress}
                </code>
            </td>
            <td style="padding: 10px; text-align: center;">
                <span style="color: #10B981; font-weight: 600;">
                    <i class="fas fa-check-circle"></i> Online
                </span>
            </td>
            <td style="padding: 10px; text-align: center;">
                <span style="background: #dbeafe; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">
                    ${responseTime}
                </span>
            </td>
            <td style="padding: 10px; text-align: center; font-size: 12px; color: #6b7280;">
                ${detectedTime}
            </td>
            <td style="padding: 10px; text-align: center;">
                <button
                    onclick="openNetBoxToRegisterIP('${result.ip}')"
                    class="action-btn"
                    style="background: #10B981; color: white; padding: 6px 12px; border: none; border-radius: 6px; cursor: pointer; font-size: 12px;"
                    title="Open NetBox to register this IP">
                    <i class="fas fa-plus-circle"></i> Register
                </button>
            </td>
        `;

        tbody.appendChild(row);
    });
}

// Open NetBox in new tab to register IP
function openNetBoxToRegisterIP(ip) {
    const netboxUrl = `http://198.51.100.10/ipam/ip-addresses/add/?address=${encodeURIComponent(ip)}`;
    window.open(netboxUrl, '_blank');
    showNotification(`NetBox açıldı: ${ip}`, 'info');
}

// ========================================
// SCANNER DASHBOARD WIDGET
// ========================================

// Load Scanner Widget Data
async function loadScannerWidget() {
    const statusBadge = document.getElementById('scanner-status-badge');
    const totalScansEl = document.getElementById('scanner-total-scans');
    const unresolvedEl = document.getElementById('scanner-unresolved-findings');
    const scansTodayEl = document.getElementById('scanner-scans-today');
    const activeSchedulesEl = document.getElementById('scanner-active-schedules');
    const findingsContainer = document.getElementById('scanner-recent-findings');
    const lastUpdateEl = document.getElementById('scanner-last-update');

    if (!statusBadge) return; // Widget not on page

    try {
        // Show loading state
        statusBadge.className = 'status-badge status-loading';
        statusBadge.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Yükleniyor...';

        // Fetch statistics
        const response = await fetch('scan-api.php?action=get_statistics');

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('📊 Scanner widget data:', data);

        if (data.success) {
            const stats = data.data;

            // Update statistics
            totalScansEl.textContent = stats.total_scans || 0;
            unresolvedEl.textContent = stats.unresolved_findings || 0;
            scansTodayEl.textContent = stats.scans_today || 0;
            activeSchedulesEl.textContent = stats.active_schedules || 0;

            // Set badge status
            if (stats.unresolved_findings > 0) {
                statusBadge.className = 'status-badge status-warning';
                statusBadge.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${stats.unresolved_findings} Uyarı`;
            } else {
                statusBadge.className = 'status-badge status-success';
                statusBadge.innerHTML = '<i class="fas fa-check-circle"></i> Temiz';
            }

            // Fetch recent findings
            const findingsResponse = await fetch('scan-api.php?action=get_findings&status=active&resolved=false&limit=10');
            const findingsData = await findingsResponse.json();

            if (findingsData.success && findingsData.data.length > 0) {
                renderScannerFindings(findingsData.data);
            } else {
                findingsContainer.innerHTML = `
                    <div style="text-align: center; padding: 30px 20px; color: #10B981;">
                        <i class="fas fa-check-circle" style="font-size: 2.5em; margin-bottom: 10px;"></i>
                        <p style="margin: 0; font-size: 14px; font-weight: 600;">Harika!</p>
                        <p style="margin: 5px 0 0 0; font-size: 12px; color: #95a5a6;">Kayıtsız aktif cihaz bulunamadı</p>
                    </div>
                `;
            }

            // Update last update time
            lastUpdateEl.textContent = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

            console.log('✅ Scanner widget loaded successfully');
        } else {
            throw new Error(data.error || 'Unknown error');
        }

    } catch (error) {
        console.error('❌ Error loading scanner widget:', error);
        statusBadge.className = 'status-badge status-danger';
        statusBadge.innerHTML = '<i class="fas fa-exclamation-circle"></i> Hata';

        const errorMessage = error.message || 'Bilinmeyen hata';
        findingsContainer.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #EF4444;">
                <i class="fas fa-exclamation-triangle"></i>
                <p style="margin-top: 5px; font-size: 0.75rem;">Veri yüklenirken hata oluştu</p>
                <p style="margin-top: 3px; font-size: 0.65rem; color: #9ca3af; font-family: monospace;">${errorMessage}</p>
            </div>
        `;
    }
}

// Render recent findings in widget
function renderScannerFindings(findings) {
    const container = document.getElementById('scanner-recent-findings');
    if (!container) return;

    container.innerHTML = '';

    findings.forEach(finding => {
        const lastSeen = new Date(finding.last_seen);
        const timeAgo = getTimeAgo(lastSeen);
        const responseTime = finding.response_time ? `${finding.response_time.toFixed(0)}ms` : 'N/A';

        const findingEl = document.createElement('div');
        findingEl.style.cssText = 'background: white; padding: 10px; margin-bottom: 8px; border-radius: 6px; border-left: 3px solid #F59E0B; display: flex; align-items: center; justify-content: space-between;';

        findingEl.innerHTML = `
            <div style="flex: 1;">
                <div style="font-size: 13px; font-weight: 600; color: #2c3e50; font-family: monospace;">
                    ${finding.ip_address}
                </div>
                <div style="font-size: 11px; color: #95a5a6; margin-top: 2px;">
                    <i class="fas fa-clock"></i> ${timeAgo} ·
                    <span style="color: #10B981;">${responseTime}</span>
                </div>
            </div>
            <div style="display: flex; gap: 4px;">
                <button
                    onclick="openNetBoxToRegisterIP('${finding.ip_address}')"
                    style="background: #10B981; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 10px;"
                    title="Register in NetBox">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
        `;

        container.appendChild(findingEl);
    });
}

// Helper function to get time ago
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);

    if (seconds < 60) return 'Az önce';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} dk önce`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} saat önce`;
    return `${Math.floor(seconds / 86400)} gün önce`;
}

// Initialize scanner widget on page load
document.addEventListener('DOMContentLoaded', function() {
    // Load scanner widget on dashboard
    if (document.getElementById('scanner-status-badge')) {
        loadScannerWidget();

        // Auto-refresh every 5 minutes
        setInterval(loadScannerWidget, 5 * 60 * 1000);
    }
});

// ========================================
// PAGINATION HELPER FUNCTIONS
// ========================================

// Generic pagination control creator
function createPaginationControls(totalItems, currentPage, perPage, containerId, onPageChange) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const totalPages = Math.ceil(totalItems / perPage);

    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '<div class="pagination-buttons">';

    // Previous button
    if (currentPage > 1) {
        html += `<button onclick="${onPageChange}(${currentPage - 1})" class="pagination-btn"><i class="fas fa-chevron-left"></i></button>`;
    }

    // Page numbers
    const maxButtons = 7;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);

    if (endPage - startPage < maxButtons - 1) {
        startPage = Math.max(1, endPage - maxButtons + 1);
    }

    if (startPage > 1) {
        html += `<button onclick="${onPageChange}(1)" class="pagination-btn">1</button>`;
        if (startPage > 2) {
            html += `<span class="pagination-ellipsis">...</span>`;
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        const activeClass = i === currentPage ? 'active' : '';
        html += `<button onclick="${onPageChange}(${i})" class="pagination-btn ${activeClass}">${i}</button>`;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<span class="pagination-ellipsis">...</span>`;
        }
        html += `<button onclick="${onPageChange}(${totalPages})" class="pagination-btn">${totalPages}</button>`;
    }

    // Next button
    if (currentPage < totalPages) {
        html += `<button onclick="${onPageChange}(${currentPage + 1})" class="pagination-btn"><i class="fas fa-chevron-right"></i></button>`;
    }

    html += '</div>';
    container.innerHTML = html;
}

// Update pagination info display
function updatePaginationInfo(totalItems, currentPage, perPage, infoId) {
    const infoElement = document.getElementById(infoId);
    if (!infoElement) return;

    const startItem = (currentPage - 1) * perPage + 1;
    const endItem = Math.min(currentPage * perPage, totalItems);

    infoElement.textContent = `Toplam ${totalItems} kayıt (${startItem}-${endItem} arası gösteriliyor)`;
}

// ========================================
// IP ADDRESSES PAGINATION
// ========================================

function changeIpPageSize() {
    const select = document.getElementById('ip-page-size');
    ipamPagination.ipAddresses.perPage = parseInt(select.value);
    ipamPagination.ipAddresses.currentPage = 1;

    // Re-apply current filters
    const searchTerm = document.getElementById('ip-search-input')?.value;
    const statusFilter = document.getElementById('ip-status-filter')?.value;

    if (searchTerm || statusFilter) {
        applyIpFilters();
    } else {
        renderIpAddressesPage();
    }
}

function goToIpPage(pageNum) {
    ipamPagination.ipAddresses.currentPage = pageNum;
    renderIpAddressesPage();
}

function renderIpAddressesPage() {
    const { currentPage, perPage, filtered } = ipamPagination.ipAddresses;
    const data = filtered.length > 0 ? filtered : ipamData.ipAddresses;

    console.log('🔍 renderIpAddressesPage - Total data:', data?.length, 'Filtered:', filtered.length, 'PerPage:', perPage, 'CurrentPage:', currentPage);

    if (!data || data.length === 0) {
        const tbody = document.getElementById('ip-addresses-tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 40px;">Hiç IP adresi bulunamadı.</td></tr>';
        }
        return;
    }

    // Calculate pagination
    const startIndex = (currentPage - 1) * perPage;
    const endIndex = startIndex + perPage;
    const pageData = data.slice(startIndex, endIndex);

    console.log('📊 Pagination: startIndex:', startIndex, 'endIndex:', endIndex, 'pageData:', pageData.length);

    // Render the data
    renderIpAddresses(pageData);

    // Update pagination controls
    createPaginationControls(data.length, currentPage, perPage, 'ip-pagination-controls', 'goToIpPage');
    updatePaginationInfo(data.length, currentPage, perPage, 'ip-pagination-info');
}

function applyIpFilters() {
    const searchTerm = document.getElementById('ip-search-input')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('ip-status-filter')?.value || '';
    const trackingFilter = document.getElementById('ip-tracking-filter')?.value || '';
    const tagsFilter = document.getElementById('ip-tags-filter')?.value || '';

    console.log('🔍 Filtreler uygulanıyor:', {
        searchTerm,
        statusFilter,
        trackingFilter,
        tagsFilter,
        totalIPs: ipamData.ipAddresses.length
    });

    let filtered = ipamData.ipAddresses;

    // Apply search filter (IP, DNS, description, tenant, tags)
    if (searchTerm) {
        filtered = filtered.filter(ip => {
            // Search in basic fields
            const basicMatch = ip.address.toLowerCase().includes(searchTerm) ||
                   (ip.dns_name && ip.dns_name.toLowerCase().includes(searchTerm)) ||
                   (ip.description && ip.description.toLowerCase().includes(searchTerm)) ||
                   (ip.tenant && ip.tenant.name && ip.tenant.name.toLowerCase().includes(searchTerm));

            // Search in tags
            const tags = ip.tags || [];
            const tagsMatch = tags.some(tag => {
                const tagName = typeof tag === 'object' ? (tag.name || tag.slug) : tag;
                return tagName.toLowerCase().includes(searchTerm);
            });

            return basicMatch || tagsMatch;
        });
    }

    // Apply status filter
    if (statusFilter) {
        filtered = filtered.filter(ip => {
            const status = ip.tracking?.status || ip.status?.value || ip.status?.label || ip.status;
            return status === statusFilter;
        });
    }

    // Apply tracking filter (zombie, offline-7, offline-30, never-seen)
    if (trackingFilter) {
        filtered = filtered.filter(ip => {
            const tracking = ip.tracking || {};

            if (trackingFilter === 'zombie') {
                return tracking.status === 'zombie' || tracking.days_offline >= 30;
            } else if (trackingFilter === 'offline-7') {
                return tracking.days_offline >= 7;
            } else if (trackingFilter === 'offline-30') {
                return tracking.days_offline >= 30;
            } else if (trackingFilter === 'never-seen') {
                return !tracking.last_seen;
            }

            return true;
        });
    }

    // Apply tags filter
    if (tagsFilter) {
        console.log('🏷️ Tag filter aktif:', tagsFilter);
        filtered = filtered.filter(ip => {
            const tags = ip.tags || [];
            const hasTag = tags.some(tag => {
                const tagName = typeof tag === 'object' ? (tag.name || tag.slug) : tag;
                if (!tagName) return false;
                const normalizedTagName = tagName.toString().toLowerCase().trim();
                const normalizedFilter = tagsFilter.toLowerCase().trim();
                const matches = normalizedTagName === normalizedFilter;
                return matches;
            });
            return hasTag;
        });
        console.log(`🏷️ Tag filtresi uygulandı: ${filtered.length} IP bulundu`);
    }

    console.log(`✅ Filtreleme tamamlandı: ${filtered.length} / ${ipamData.ipAddresses.length} IP gösteriliyor`);

    ipamPagination.ipAddresses.filtered = filtered;
    ipamPagination.ipAddresses.currentPage = 1;
    renderIpAddressesPage();
}

// ========================================
// PREFIXES PAGINATION
// ========================================

function changePrefixPageSize() {
    const select = document.getElementById('prefix-page-size');
    ipamPagination.prefixes.perPage = parseInt(select.value);
    ipamPagination.prefixes.currentPage = 1;

    // Re-apply current filters
    const searchTerm = document.getElementById('prefix-search-input')?.value;
    const statusFilter = document.getElementById('prefix-status-filter')?.value;

    if (searchTerm || statusFilter) {
        applyPrefixFilters();
    } else {
        renderPrefixesPage();
    }
}

function goToPrefixPage(pageNum) {
    ipamPagination.prefixes.currentPage = pageNum;
    renderPrefixesPage();
}

function renderPrefixesPage() {
    const { currentPage, perPage, filtered } = ipamPagination.prefixes;
    const data = filtered.length > 0 ? filtered : ipamData.prefixes;

    if (!data || data.length === 0) {
        const tbody = document.getElementById('prefixes-tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px;">Hiç prefix bulunamadı.</td></tr>';
        }
        return;
    }

    // Calculate pagination
    const startIndex = (currentPage - 1) * perPage;
    const endIndex = startIndex + perPage;
    const pageData = data.slice(startIndex, endIndex);

    // Render the data
    renderPrefixes(pageData);

    // Update pagination controls
    createPaginationControls(data.length, currentPage, perPage, 'prefix-pagination-controls', 'goToPrefixPage');
    updatePaginationInfo(data.length, currentPage, perPage, 'prefix-pagination-info');
}

function applyPrefixFilters() {
    const searchTerm = document.getElementById('prefix-search-input')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('prefix-status-filter')?.value || '';

    let filtered = ipamData.prefixes;

    // Apply search filter
    if (searchTerm) {
        filtered = filtered.filter(prefix => {
            return prefix.prefix.toLowerCase().includes(searchTerm) ||
                   (prefix.description && prefix.description.toLowerCase().includes(searchTerm));
        });
    }

    // Apply status filter
    if (statusFilter) {
        filtered = filtered.filter(prefix => {
            const status = prefix.status?.value || prefix.status?.label || prefix.status;
            return status === statusFilter;
        });
    }

    ipamPagination.prefixes.filtered = filtered;
    ipamPagination.prefixes.currentPage = 1;
    renderPrefixesPage();
}

// ========================================
// VLANS PAGINATION
// ========================================

function changeVlanPageSize() {
    const select = document.getElementById('vlan-page-size');
    ipamPagination.vlans.perPage = parseInt(select.value);
    ipamPagination.vlans.currentPage = 1;

    // Re-apply current filters
    const searchTerm = document.getElementById('vlan-search-input')?.value;
    const statusFilter = document.getElementById('vlan-status-filter')?.value;

    if (searchTerm || statusFilter) {
        applyVlanFilters();
    } else {
        renderVlansPage();
    }
}

function goToVlanPage(pageNum) {
    ipamPagination.vlans.currentPage = pageNum;
    renderVlansPage();
}

function renderVlansPage() {
    const { currentPage, perPage, filtered } = ipamPagination.vlans;
    const data = filtered.length > 0 ? filtered : ipamData.vlans;

    if (!data || data.length === 0) {
        const tbody = document.getElementById('vlans-tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px;">Hiç VLAN bulunamadı.</td></tr>';
        }
        return;
    }

    // Calculate pagination
    const startIndex = (currentPage - 1) * perPage;
    const endIndex = startIndex + perPage;
    const pageData = data.slice(startIndex, endIndex);

    // Render the data
    renderVlans(pageData);

    // Update pagination controls
    createPaginationControls(data.length, currentPage, perPage, 'vlan-pagination-controls', 'goToVlanPage');
    updatePaginationInfo(data.length, currentPage, perPage, 'vlan-pagination-info');
}

function applyVlanFilters() {
    const searchTerm = document.getElementById('vlan-search-input')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('vlan-status-filter')?.value || '';

    let filtered = ipamData.vlans;

    // Apply search filter
    if (searchTerm) {
        filtered = filtered.filter(vlan => {
            return vlan.name.toLowerCase().includes(searchTerm) ||
                   vlan.vid.toString().includes(searchTerm) ||
                   (vlan.description && vlan.description.toLowerCase().includes(searchTerm));
        });
    }

    // Apply status filter
    if (statusFilter) {
        filtered = filtered.filter(vlan => {
            const status = vlan.status?.value || vlan.status?.label || vlan.status;
            return status === statusFilter;
        });
    }

    ipamPagination.vlans.filtered = filtered;
    ipamPagination.vlans.currentPage = 1;
    renderVlansPage();
}

// Search IP Addresses (updated to use pagination)
function searchIpAddresses() {
    applyIpFilters();
}

// Filter IP Addresses (updated to use pagination)
function filterIpAddresses() {
    applyIpFilters();
}

// Search Prefixes (updated to use pagination)
function searchPrefixes() {
    applyPrefixFilters();
}

// Filter Prefixes (updated to use pagination)
function filterPrefixes() {
    applyPrefixFilters();
}

// Search VLANs (updated to use pagination)
function searchVlans() {
    applyVlanFilters();
}

// Filter VLANs (updated to use pagination)
function filterVlans() {
    applyVlanFilters();
}

// Clear IPAM cache and reload fresh data
function clearIpamCache() {
    console.log('🗑️ Cache temizleniyor...');
    localStorage.removeItem(IPAM_CACHE_KEY);

    // Reset pagination states
    ipamPagination.ipAddresses = { currentPage: 1, perPage: 50, filtered: [] };
    ipamPagination.prefixes = { currentPage: 1, perPage: 50, filtered: [] };
    ipamPagination.vlans = { currentPage: 1, perPage: 50, filtered: [] };

    // Clear in-memory data
    ipamData = { ipAddresses: [], prefixes: [], vlans: [] };

    showNotification('Cache temizlendi! Veriler yeniden yükleniyor...', 'success');

    // Stop auto-refresh temporarily
    if (ipamAutoRefreshInterval) {
        clearInterval(ipamAutoRefreshInterval);
        ipamAutoRefreshInterval = null;
    }

    // Fetch fresh data
    fetchAllIpamData().then(() => {
        console.log('✅ Taze veriler yüklendi');
        showNotification('Veriler başarıyla yüklendi!', 'success');

        // Restart auto-refresh
        startIpamAutoRefresh();

        // Reload current tab
        refreshIpamData();
    }).catch(err => {
        console.error('❌ Veri yükleme hatası:', err);
        showNotification('Veri yükleme hatası!', 'error');
    });
}

// Refresh all IPAM data
function refreshIpamData() {
    const activeTab = document.querySelector('#ipam-page .tab.active');
    if (!activeTab) return;

    const tabName = activeTab.getAttribute('data-tab');

    if (tabName === 'ip-addresses') {
        loadIpAddresses();
    } else if (tabName === 'prefixes') {
        loadPrefixes();
    } else if (tabName === 'vlans') {
        loadVlans();
    }

    showNotification('Veriler yenileniyor...', 'info');
}

// ============================================
// IPAM TRACKING FUNCTIONS
// ============================================

// Fetch tracking data and enrich IP addresses
async function enrichIpAddressesWithTracking() {
    try {
        console.log('🔍 Fetching tracking data for IPs...');
        const response = await fetch('ipam-tracking-api.php?action=get_all');
        const result = await response.json();

        if (!result.success) {
            console.warn('⚠️ Failed to fetch tracking data:', result.message);
            return;
        }

        const trackingData = result.data || [];
        console.log(`✅ Fetched tracking data for ${trackingData.length} IPs`);

        // Create a map for fast lookup
        const trackingMap = {};
        trackingData.forEach(t => {
            trackingMap[t.ip_address] = t;
        });

        // Enrich IP addresses with tracking data
        ipamData.ipAddresses.forEach(ip => {
            const ipAddr = ip.address.split('/')[0]; // Remove CIDR notation
            ip.tracking = trackingMap[ipAddr] || null;
        });

        console.log('✅ IP addresses enriched with tracking data');
    } catch (error) {
        console.error('❌ Error fetching tracking data:', error);
    }
}

// Get tracking status badge
function getTrackingStatusBadge(status) {
    const badges = {
        'active': '<span class="status-badge" style="background: #D1FAE5; color: #065F46;">🟢 Active</span>',
        'idle': '<span class="status-badge" style="background: #FEF3C7; color: #92400E;">🟡 Idle</span>',
        'zombie': '<span class="status-badge" style="background: #FEE2E2; color: #991B1B;">💀 Zombie</span>',
        'reserved': '<span class="status-badge" style="background: #DBEAFE; color: #1E40AF;">🔒 Reserved</span>',
        'deprecated': '<span class="status-badge" style="background: #FED7AA; color: #9A3412;">⚠️ Deprecated</span>',
        'conflict': '<span class="status-badge" style="background: #FECACA; color: #7F1D1D;">⛔ Conflict</span>',
        'unknown': '<span class="status-badge" style="background: #F3F4F6; color: #6B7280;">❓ Unknown</span>'
    };
    return badges[status] || badges['unknown'];
}

// Ping single IP
async function pingIpAddress(ip) {
    try {
        // Clean IP address (remove CIDR notation if present)
        const cleanIp = ip.split('/')[0].trim();

        // Validate IP format
        const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
        if (!ipPattern.test(cleanIp)) {
            showNotification('Geçersiz IP adresi formatı', 'error');
            return;
        }

        showNotification(`Pinging ${cleanIp}...`, 'info');

        const response = await fetch(`ipam-tracking-api.php?action=ping_check&ip=${encodeURIComponent(cleanIp)}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
            const status = result.alive ? '✅ Online' : '❌ Offline';
            showNotification(`${cleanIp}: ${status}`, result.alive ? 'success' : 'warning');

            // Refresh the table
            await enrichIpAddressesWithTracking();
            renderIpAddressesPage();
        } else {
            showNotification(`Error: ${result.message}`, 'error');
        }
    } catch (error) {
        console.error('❌ Ping error:', error);
        showNotification('Ping işlemi başarısız: ' + error.message, 'error');
    }
}

// Scan all IPs
async function scanAllIpsTracking() {
    try {
        if (!confirm('Tüm IP\'leri taramak uzun sürebilir. Devam etmek istiyor musunuz?')) {
            return;
        }

        showNotification('Toplu tarama başlatılıyor...', 'info');

        const response = await fetch('ipam-tracking-api.php?action=scan_all', {
            method: 'POST'
        });
        const result = await response.json();

        if (result.success) {
            showNotification(
                `Tarama başladı! ${result.count} IP taranacak. İşlem arka planda devam ediyor.`,
                'success'
            );

            // Refresh after 30 seconds
            setTimeout(async () => {
                await enrichIpAddressesWithTracking();
                renderIpAddressesPage();
                showNotification('Tarama tamamlandı! Veriler güncellendi.', 'success');
            }, 30000);
        } else {
            showNotification(`Error: ${result.message}`, 'error');
        }
    } catch (error) {
        console.error('❌ Scan error:', error);
        showNotification('Tarama başlatılamadı', 'error');
    }
}

// Edit IP tracking
async function editIpTracking(ip) {
    try {
        // Clean IP address
        const cleanIp = ip.split('/')[0].trim();

        // Fetch current tracking data
        const response = await fetch(`ipam-tracking-api.php?action=get_by_ip&ip=${encodeURIComponent(cleanIp)}`);
        const result = await response.json();

        if (!result.success) {
            showNotification('IP tracking bilgisi alınamadı', 'error');
            return;
        }

        const tracking = result.data || {};

        // Fill form
        document.getElementById('edit-ip-address').value = cleanIp;
        document.getElementById('edit-ip-display').value = cleanIp;
        document.getElementById('edit-ip-status').value = tracking.status || 'active';
        document.getElementById('edit-ip-owner').value = tracking.owner || '';
        document.getElementById('edit-ip-purpose').value = tracking.purpose || '';
        document.getElementById('edit-ip-description').value = tracking.description || '';

        // Open modal
        openModal('edit-ip-tracking-modal');
    } catch (error) {
        console.error('❌ Edit IP tracking error:', error);
        showNotification('Bir hata oluştu', 'error');
    }
}

// Save IP tracking
async function saveIpTracking(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);

    const data = {
        ip_address: formData.get('ip_address'),
        status: formData.get('status'),
        owner: formData.get('owner'),
        purpose: formData.get('purpose'),
        description: formData.get('description')
    };

    try {
        showNotification('Kaydediliyor...', 'info');

        const response = await fetch('ipam-tracking-api.php?action=update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            showNotification('IP tracking başarıyla güncellendi', 'success');
            closeModal('edit-ip-tracking-modal');

            // Refresh the table
            await enrichIpAddressesWithTracking();
            renderIpAddressesPage();
        } else {
            showNotification('Kayıt başarısız: ' + (result.message || 'Bilinmeyen hata'), 'error');
        }
    } catch (error) {
        console.error('❌ Save IP tracking error:', error);
        showNotification('Kayıt sırasında hata oluştu', 'error');
    }
}

// Show status info modal
function showStatusInfo() {
    openModal('status-info-modal');
}

// Handle IPAM tab switching
function switchIpamTab(tabName) {
    // Hide all tab contents (only direct children of ipam-page, not modal contents)
    document.querySelectorAll('#ipam-page > .tab-content').forEach(content => {
        content.classList.remove('active');
        content.style.display = 'none';
    });

    // Remove active class from all tabs (only ipam page tabs)
    document.querySelectorAll('#ipam-page > .tabs > .tab').forEach(tab => {
        tab.classList.remove('active');
    });

    // Show selected tab content
    const selectedContent = document.getElementById(tabName);
    if (selectedContent) {
        selectedContent.classList.add('active');
        selectedContent.style.display = 'block';
    }

    // Add active class to selected tab
    const selectedTab = document.querySelector(`#ipam-page > .tabs > .tab[data-tab="${tabName}"]`);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }

    // Load data for the selected tab
    if (tabName === 'ip-addresses') {
        loadIpAddresses();
    } else if (tabName === 'prefixes') {
        loadPrefixes();
    } else if (tabName === 'vlans') {
        loadVlans();
    }
}

// Listen for IPAM page navigation
document.addEventListener('DOMContentLoaded', function() {
    // Add click event listeners to IPAM tabs
    document.querySelectorAll('#ipam-page .tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switchIpamTab(tabName);
        });
    });

    // Load data when IPAM page is shown
    window.addEventListener('hashchange', function() {
        if (window.location.hash === '#ipam') {
            console.log('IPAM page loaded, fetching IP addresses...');
            loadIpAddresses();
        }
    });

    // If we're already on IPAM page
    if (window.location.hash === '#ipam') {
        console.log('IPAM page loaded on initial load, fetching IP addresses...');
        loadIpAddresses();
    }
});

// ============================================
// IPAM BACKGROUND INITIALIZATION
// ============================================

// Initialize IPAM data loading in background
(function initIpamBackgroundLoading() {
    console.log('🚀 IPAM arka plan yüklemesi başlatılıyor...');

    // Check if we have valid cache
    const cached = loadIpamCache();

    if (cached && isCacheValid(cached)) {
        // Check if cache actually has data
        const hasData = (cached.data.ipAddresses && cached.data.ipAddresses.length > 0) ||
                       (cached.data.prefixes && cached.data.prefixes.length > 0) ||
                       (cached.data.vlans && cached.data.vlans.length > 0);

        if (hasData) {
            console.log('✅ Geçerli IPAM cache bulundu, arka plan güncellemesi yapılmayacak');
            ipamData.ipAddresses = cached.data.ipAddresses || [];
            ipamData.prefixes = cached.data.prefixes || [];
            ipamData.vlans = cached.data.vlans || [];
        } else {
            console.log('⚠️ Cache geçerli ama boş, yeni veri çekiliyor...');
            // Clear invalid cache
            localStorage.removeItem(IPAM_CACHE_KEY);
            // Fetch fresh data
            fetchAllIpamData().then(() => {
                console.log('✅ İlk veri yüklemesi tamamlandı');
                startIpamAutoRefresh();
            });
            return;
        }

        // Start auto-refresh for next time
        startIpamAutoRefresh();
    } else {
        console.log('⏳ Cache bulunamadı veya eski, arka planda veriler çekiliyor...');

        // Fetch in background (don't block page load)
        setTimeout(() => {
            fetchAllIpamData().then(() => {
                console.log('✅ IPAM arka plan yüklemesi tamamlandı');
                // Start auto-refresh
                startIpamAutoRefresh();
            });
        }, 2000); // Wait 2 seconds after page load
    }
})();

// Make functions globally accessible
window.loadIpAddresses = loadIpAddresses;
window.loadPrefixes = loadPrefixes;
window.loadVlans = loadVlans;
window.searchIpAddresses = searchIpAddresses;
window.filterIpAddresses = filterIpAddresses;
window.searchPrefixes = searchPrefixes;
window.filterPrefixes = filterPrefixes;
window.searchVlans = searchVlans;
window.filterVlans = filterVlans;
window.refreshIpamData = refreshIpamData;
window.fetchAllIpamData = fetchAllIpamData; // For manual refresh

