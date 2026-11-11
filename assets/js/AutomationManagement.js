// Tab Switching
function switchAutomationTab(tabName) {
  // Hide all tabs
  const allTabs = ['api-info', 'api-manager', 'jira-automation', 'webhooks', 'tokens', 'webhook-logs'];
  allTabs.forEach(tab => {
    const el = document.getElementById('tab-' + tab);
    if (el) el.style.display = 'none';
  });

  // Remove active from all buttons
  document.querySelectorAll('.automation-tab').forEach(btn => {
    btn.style.color = '#7f8c8d';
    btn.style.borderBottomColor = 'transparent';
  });

  // Show selected tab
  const selectedTab = document.getElementById('tab-' + tabName);
  if (selectedTab) {
    selectedTab.style.display = 'block';
  }

  // Activate button
  if (event && event.target) {
    const btn = event.target.closest('.automation-tab');
    if (btn) {
      btn.style.color = '#667eea';
      btn.style.borderBottomColor = '#667eea';
    }
  }

  // Load API list if needed
  if (tabName === 'api-manager') {
    setTimeout(() => loadApiList(), 100);
  }

  // Load automation rules if needed
  if (tabName === 'jira-automation') {
    setTimeout(() => loadAutomationRules(), 100);
  }

  // Load tokens list if needed
  if (tabName === 'tokens') {
    setTimeout(() => loadTokensList(), 100);
  }

  // Load webhook logs if needed
  if (tabName === 'webhook-logs') {
    setTimeout(() => refreshWebhookLogs(), 100);
  }
}

// Copy Functions
function copyJiraInfo() {
  const info = `Jira API Bilgileri:
Base URL: https://jira.example.com/rest/api/2
Bearer Token: YOUR_JIRA_BEARER_TOKEN

Örnek POST Request (cURL):
curl -X POST "https://jira.example.com/rest/api/2/issue/DYF-1234/comment" \\
  -H "Authorization: Bearer YOUR_JIRA_BEARER_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"body": "Test comment"}'`;

  navigator.clipboard.writeText(info);
  showNotification('success', 'Jira API bilgileri kopyalandı!');
}

function copyWebhookInfo() {
  const info = `Webhook Endpoint Bilgileri:
URL: https://192.0.2.20/portal/api/v1/jira-webhook.php
Header: X-API-Key: YOUR_WEBHOOK_API_KEY

Desteklenen Events:
- jira:issue_created
- jira:issue_updated
- jira:issue_assigned`;

  navigator.clipboard.writeText(info);
  showNotification('success', 'Webhook bilgileri kopyalandı!');
}

function copyToken(type) {
  const tokens = {
    'jira': 'YOUR_JIRA_BEARER_TOKEN_HERE',
    'netbox': 'your_netbox_token_here',
    'portal': 'mySecretKey123'
  };

  navigator.clipboard.writeText(tokens[type]);
  showNotification('success', 'Token kopyalandı!');
}

function showToken(type) {
  // Show token in modal or alert
  const tokens = {
    'jira': 'YOUR_JIRA_BEARER_TOKEN_HERE',
    'netbox': 'your_netbox_token_here',
    'portal': 'mySecretKey123'
  };

  alert('Token: ' + tokens[type]);
}

function configureNetBox() {
  showNotification('info', 'NetBox yapılandırma modal\'ı açılacak...');
  // Open configuration modal
}

function addNewToken() {
  openModal('add-token-modal');
  document.getElementById('add-token-form').reset();
  document.getElementById('token-password-group').style.display = 'none';
}

function regenerateToken(type) {
  if (confirm('Token\'ı yenilemek istediğinize emin misiniz? Eski token geçersiz olacak.')) {
    showNotification('success', 'Token yenilendi!');
    // Implement token regeneration
  }
}

function copyToken(type) {
  const tokens = {
    'jira': 'YOUR_JIRA_BEARER_TOKEN_HERE',
    'netbox': 'your_netbox_token_here',
    'portal': 'mySecretKey123'
  };

  if (tokens[type]) {
    navigator.clipboard.writeText(tokens[type]).then(() => {
      showNotification('success', 'Token kopyalandı!');
    }).catch(() => {
      showNotification('error', 'Token kopyalanamadı!');
    });
  }
}

function showToken(type) {
  showNotification('info', 'Token gösterilecek...');
}

// Automation Functions
async function saveAutomation(type) {
  const configs = {
    'gl10_user_check': {
      trigger_pattern: document.querySelector('#tab-jira-automation .card:nth-child(1) input[type="text"]')?.value,
      servers: document.querySelector('#tab-jira-automation .card:nth-child(1) textarea')?.value
    },
    'backup_check': {
      trigger_pattern: document.querySelector('#tab-jira-automation .card:nth-child(2) input[type="text"]')?.value,
      backup_servers: document.querySelector('#tab-jira-automation .card:nth-child(2) textarea')?.value
    }
  };

  const config = configs[type];
  if (!config) {
    showNotification('error', 'Otomasyon tipi bulunamadı!');
    return;
  }

  try {
    const response = await fetch('api/v1/automation-config.php', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        action: 'save',
        type: type,
        config: config,
        trigger_pattern: config.trigger_pattern || ''
      })
    });

    const data = await response.json();
    if (data.success) {
      showNotification('success', 'Otomasyon kaydedildi!');
    } else {
      showNotification('error', 'Kaydedilemedi: ' + (data.error?.message || 'Bilinmeyen hata'));
    }
  } catch (error) {
    console.error('Otomasyon kaydetme hatası:', error);
    showNotification('error', 'Bir hata oluştu!');
  }
}

async function testAutomation(type) {
  showNotification('info', 'Otomasyon test ediliyor...');

  try {
    const response = await fetch('api/v1/automation-config.php', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({action: 'test', type: type})
    });

    const data = await response.json();
    if (data.success) {
      showNotification('success', 'Test başarılı! Sonuç: ' + JSON.stringify(data.data?.result || {}));
    } else {
      showNotification('error', 'Test başarısız!');
    }
  } catch (error) {
    console.error('Test hatası:', error);
    showNotification('error', 'Test sırasında hata oluştu!');
  }
}

async function toggleAutomation(type, enabled) {
  try {
    const response = await fetch('api/v1/automation-config.php', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({action: 'toggle', type: type, enabled: enabled})
    });

    const data = await response.json();
    if (data.success) {
      showNotification('success', enabled ? 'Otomasyon aktifleştirildi!' : 'Otomasyon devre dışı bırakıldı!');
    } else {
      showNotification('error', 'Durum değiştirilemedi!');
    }
  } catch (error) {
    console.error('Toggle hatası:', error);
    showNotification('error', 'Bir hata oluştu!');
  }
}

function sendTestWebhook() {
  const issueKey = document.getElementById('test-issue-key').value;
  const summary = document.getElementById('test-summary').value;
  const eventType = document.getElementById('test-event-type').value;

  if (!issueKey || !summary) {
    showNotification('error', 'Lütfen tüm alanları doldurun!');
    return;
  }

  const payload = {
    webhookEvent: eventType,
    issue: {
      key: issueKey,
      fields: {
        summary: summary
      }
    }
  };

  showNotification('info', 'Webhook gönderiliyor...');

  fetch('api/v1/jira-webhook.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'mySecretKey123'
    },
    body: JSON.stringify(payload)
  })
  .then(response => response.json())
  .then(data => {
    document.getElementById('webhook-response').textContent = JSON.stringify(data, null, 2);
    showNotification('success', 'Webhook gönderildi!');
  })
  .catch(error => {
    document.getElementById('webhook-response').textContent = 'Error: ' + error.message;
    showNotification('error', 'Webhook gönderilemedi!');
  });
}

// API Test Tool Functions
async function sendApiTestRequest() {
  const method = document.getElementById('api-test-method').value;
  const url = document.getElementById('api-test-url').value;
  const bodyText = document.getElementById('api-test-body').value;

  if (!url) {
    showNotification('error', 'Lütfen URL giriniz!');
    return;
  }

  // Collect headers
  const headers = {};
  const headerRows = document.querySelectorAll('#api-test-headers .header-row');
  headerRows.forEach(row => {
    const inputs = row.querySelectorAll('input');
    const name = inputs[0].value.trim();
    const value = inputs[1].value.trim();
    if (name) {
      headers[name] = value;
    }
  });

  // Prepare request options
  const options = {
    method: method,
    headers: headers
  };

  // Add body for non-GET requests
  if (method !== 'GET' && bodyText.trim()) {
    options.body = bodyText;
  }

  showNotification('info', 'İstek gönderiliyor...');

  const startTime = Date.now();

  try {
    const response = await fetch(url, options);
    const endTime = Date.now();
    const duration = endTime - startTime;

    // Get response text
    let responseText;
    try {
      const responseData = await response.json();
      responseText = JSON.stringify(responseData, null, 2);
    } catch {
      responseText = await response.text();
    }

    // Display response info
    document.getElementById('api-test-response-info').style.display = 'block';

    const statusElement = document.getElementById('api-test-status');
    statusElement.textContent = `${response.status} ${response.statusText}`;

    // Color code status
    if (response.status >= 200 && response.status < 300) {
      statusElement.style.color = '#10b981';
    } else if (response.status >= 400) {
      statusElement.style.color = '#ef4444';
    } else {
      statusElement.style.color = '#f59e0b';
    }

    document.getElementById('api-test-time').textContent = `${duration}ms`;
    document.getElementById('api-test-time').style.color = duration < 500 ? '#10b981' : (duration < 2000 ? '#f59e0b' : '#ef4444');

    // Display response body
    document.getElementById('api-test-response').textContent = responseText;

    if (response.ok) {
      showNotification('success', 'İstek başarılı!');
    } else {
      showNotification('warning', `İstek tamamlandı (${response.status})`);
    }

  } catch (error) {
    document.getElementById('api-test-response-info').style.display = 'block';
    document.getElementById('api-test-status').textContent = 'ERROR';
    document.getElementById('api-test-status').style.color = '#ef4444';
    document.getElementById('api-test-time').textContent = '-';
    document.getElementById('api-test-response').textContent = `Error: ${error.message}\n\nBu genellikle CORS veya ağ hatası nedeniyle olur. Sunucu tarafında CORS ayarlarını kontrol edin veya tarayıcı konsolunu inceleyin.`;
    showNotification('error', 'İstek başarısız: ' + error.message);
  }
}

function addApiTestHeader() {
  const headersContainer = document.getElementById('api-test-headers');
  const newRow = document.createElement('div');
  newRow.className = 'header-row';
  newRow.style.display = 'flex';
  newRow.style.gap = '8px';

  newRow.innerHTML = `
    <input type="text" placeholder="Header Name" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px;">
    <input type="text" placeholder="Header Value" style="flex: 2; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px;">
    <button onclick="this.parentElement.remove()" style="padding: 8px 12px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer;">
      <i class="fas fa-trash"></i>
    </button>
  `;

  headersContainer.appendChild(newRow);
  showNotification('success', 'Header eklendi');
}

function loadApiTestPreset() {
  // Set method
  document.getElementById('api-test-method').value = 'POST';

  // Set URL
  const protocol = window.location.protocol;
  const host = window.location.host;
  document.getElementById('api-test-url').value = `${protocol}//${host}/portal/api/v1/jira-webhook.php`;

  // Clear and set headers
  const headersContainer = document.getElementById('api-test-headers');
  headersContainer.innerHTML = `
    <div class="header-row" style="display: flex; gap: 8px;">
      <input type="text" value="X-API-Key" placeholder="Header Name" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px;">
      <input type="text" value="mySecretKey123" placeholder="Header Value" style="flex: 2; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px;">
      <button onclick="this.parentElement.remove()" style="padding: 8px 12px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer;">
        <i class="fas fa-trash"></i>
      </button>
    </div>
    <div class="header-row" style="display: flex; gap: 8px;">
      <input type="text" value="Content-Type" placeholder="Header Name" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px;">
      <input type="text" value="application/json" placeholder="Header Value" style="flex: 2; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px;">
      <button onclick="this.parentElement.remove()" style="padding: 8px 12px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer;">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `;

  // Set body
  document.getElementById('api-test-body').value = `{
  "webhookEvent": "jira:issue_created",
  "issue": {
    "key": "DEMO-999",
    "fields": {
      "summary": "Test from API tool"
    }
  }
}`;

  showNotification('success', 'Webhook preset yüklendi!');
}

function copyApiResponse() {
  const responseText = document.getElementById('api-test-response').textContent;

  if (!responseText || responseText.includes('İstek gönderdiğinizde')) {
    showNotification('warning', 'Kopyalanacak response bulunamadı!');
    return;
  }

  navigator.clipboard.writeText(responseText).then(() => {
    showNotification('success', 'Response kopyalandı!');
  }).catch(err => {
    showNotification('error', 'Kopyalama başarısız: ' + err.message);
  });
}

// Automation Rules Management
let currentEditingRuleId = null;

async function loadAutomationRules() {
  try {
    const response = await fetch('get-automation-rules.php', {
      credentials: 'same-origin'
    });
    const data = await response.json();

    if (!data.success) {
      showNotification('error', 'Rule\'lar yüklenemedi!');
      return;
    }

    const rules = data.rules;
    const listEl = document.getElementById('automation-rules-list');

    if (rules.length === 0) {
      listEl.innerHTML = '<div style="text-align: center; padding: 40px; color: #7f8c8d;">Henüz automation rule eklenmemiş. "Yeni Kural Ekle" butonuna tıklayarak başlayın!</div>';
      document.getElementById('stats-total-rules').textContent = '0';
      document.getElementById('stats-active-rules').textContent = '0';
      return;
    }

    // Update stats
    const activeRules = rules.filter(r => r.is_active).length;
    document.getElementById('stats-total-rules').textContent = rules.length;
    document.getElementById('stats-active-rules').textContent = activeRules;

    // Render rules
    listEl.innerHTML = rules.map(rule => `
      <div class="card" style="margin-bottom: 15px; border-left: 4px solid ${rule.is_active ? '#10b981' : '#6c757d'};">
        <div style="display: flex; justify-content: space-between; align-items: start;">
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
              <h4 style="margin: 0; color: #2c3e50;">${rule.name}</h4>
              <span style="padding: 3px 10px; background: ${rule.is_active ? '#d1fae5' : '#e5e7eb'}; color: ${rule.is_active ? '#065f46' : '#374151'}; border-radius: 12px; font-size: 11px; font-weight: 600;">
                ${rule.is_active ? 'ACTIVE' : 'INACTIVE'}
              </span>
              <span style="padding: 3px 10px; background: #dbeafe; color: #1e40af; border-radius: 12px; font-size: 11px; font-weight: 600;">
                ${getTriggerLabel(rule.trigger_type)}
              </span>
            </div>
            <p style="color: #7f8c8d; font-size: 13px; margin: 5px 0;">${rule.description || 'No description'}</p>

            <div style="display: flex; gap: 15px; margin-top: 10px; font-size: 12px;">
              <div>
                <i class="fas fa-filter" style="color: #3b82f6;"></i>
                <strong>${rule.conditions.length}</strong> Condition${rule.conditions.length !== 1 ? 's' : ''}
              </div>
              <div>
                <i class="fas fa-play" style="color: #10b981;"></i>
                <strong>${rule.actions.length}</strong> Action${rule.actions.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          <div style="display: flex; gap: 8px; align-items: center;">
            <label class="toggle-switch">
              <input type="checkbox" ${rule.is_active ? 'checked' : ''} onchange="toggleAutomationRule(${rule.id}, this.checked)">
              <span class="toggle-slider"></span>
            </label>
            <button onclick="editAutomationRule(${rule.id})" style="padding: 8px 12px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;" title="Düzenle">
              <i class="fas fa-edit"></i>
            </button>
            <button onclick="deleteAutomationRule(${rule.id})" style="padding: 8px 12px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer;" title="Sil">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    `).join('');

  } catch (error) {
    console.error('Load rules error:', error);
    showNotification('error', 'Rule\'lar yüklenirken hata oluştu!');
  }
}

function getTriggerLabel(trigger) {
  const labels = {
    'issue_created': 'Issue Created',
    'issue_updated': 'Issue Updated',
    'all': 'All Events'
  };
  return labels[trigger] || trigger;
}

function openAutomationRuleModal(ruleId = null) {
  currentEditingRuleId = ruleId;
  document.getElementById('rule-id').value = ruleId || '';
  document.getElementById('automation-rule-modal-title').textContent = ruleId ? 'Automation Rule Düzenle' : 'Yeni Automation Rule';

  // Reset form
  document.getElementById('automation-rule-form').reset();
  document.getElementById('rule-conditions').innerHTML = '<div style="color: #7f8c8d; font-size: 13px;">Henüz condition eklenmemiş</div>';
  document.getElementById('rule-actions').innerHTML = '<div style="color: #7f8c8d; font-size: 13px;">Henüz action eklenmemiş</div>';

  openModal('automation-rule-modal');
}

async function editAutomationRule(ruleId) {
  try {
    const response = await fetch('get-automation-rules.php', {
      credentials: 'same-origin'
    });
    const data = await response.json();

    const rule = data.rules.find(r => r.id == ruleId);
    if (!rule) {
      showNotification('error', 'Rule bulunamadı!');
      return;
    }

    // Open modal and fill form
    currentEditingRuleId = ruleId;
    document.getElementById('rule-id').value = ruleId;
    document.getElementById('automation-rule-modal-title').textContent = 'Automation Rule Düzenle';
    document.getElementById('rule-name').value = rule.name;
    document.getElementById('rule-description').value = rule.description || '';
    document.getElementById('rule-trigger').value = rule.trigger_type;
    document.getElementById('rule-is-active').checked = rule.is_active;

    // Load conditions
    const conditionsContainer = document.getElementById('rule-conditions');
    conditionsContainer.innerHTML = '';
    rule.conditions.forEach(condition => {
      addRuleCondition(condition);
    });
    if (rule.conditions.length === 0) {
      conditionsContainer.innerHTML = '<div style="color: #7f8c8d; font-size: 13px;">Henüz condition eklenmemiş</div>';
    }

    // Load actions
    const actionsContainer = document.getElementById('rule-actions');
    actionsContainer.innerHTML = '';
    rule.actions.forEach(action => {
      addRuleAction(action);
    });
    if (rule.actions.length === 0) {
      actionsContainer.innerHTML = '<div style="color: #7f8c8d; font-size: 13px;">Henüz action eklenmemiş</div>';
    }

    openModal('automation-rule-modal');
  } catch (error) {
    console.error('Edit rule error:', error);
    showNotification('error', 'Rule düzenlenemedi!');
  }
}

function addRuleCondition(condition = null) {
  const container = document.getElementById('rule-conditions');

  // Remove placeholder if exists
  if (container.querySelector('div[style*="color: #7f8c8d"]')) {
    container.innerHTML = '';
  }

  const conditionDiv = document.createElement('div');
  conditionDiv.style.cssText = 'background: white; padding: 12px; border-radius: 6px; margin-bottom: 10px; border: 1px solid #ddd;';

  conditionDiv.innerHTML = `
    <div style="display: grid; grid-template-columns: 150px 1fr auto; gap: 10px; align-items: center;">
      <select class="condition-type" style="padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px;">
        <option value="summary_contains">Summary Contains</option>
        <option value="description_contains">Description Contains</option>
        <option value="issue_type">Issue Type</option>
        <option value="status">Status</option>
        <option value="project">Project</option>
      </select>
      <input type="text" class="condition-value" placeholder="Value" style="padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px;">
      <button onclick="this.parentElement.parentElement.remove()" style="padding: 8px 12px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer;">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `;

  // Fill with existing data if editing
  if (condition) {
    conditionDiv.querySelector('.condition-type').value = condition.type;
    conditionDiv.querySelector('.condition-value').value = condition.value;
  }

  container.appendChild(conditionDiv);
}

function addRuleAction(action = null) {
  const container = document.getElementById('rule-actions');

  // Remove placeholder if exists
  if (container.querySelector('div[style*="color: #7f8c8d"]')) {
    container.innerHTML = '';
  }

  const actionDiv = document.createElement('div');
  actionDiv.style.cssText = 'background: white; padding: 12px; border-radius: 6px; margin-bottom: 10px; border: 1px solid #ddd;';

  const actionType = action?.type || 'http_request';

  actionDiv.innerHTML = `
    <div style="margin-bottom: 10px;">
      <select class="action-type" onchange="updateActionFields(this)" style="padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; width: 100%;">
        <option value="http_request">HTTP Request</option>
        <option value="add_comment">Add Comment to Issue</option>
      </select>
    </div>
    <div class="action-fields"></div>
    <button onclick="this.parentElement.remove()" style="padding: 6px 12px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; margin-top: 8px;">
      <i class="fas fa-times"></i> Remove Action
    </button>
  `;

  container.appendChild(actionDiv);

  // Set type and update fields
  actionDiv.querySelector('.action-type').value = actionType;
  updateActionFields(actionDiv.querySelector('.action-type'), action);
}

function updateActionFields(selectEl, existingAction = null) {
  const actionDiv = selectEl.closest('div').parentElement;
  const fieldsContainer = actionDiv.querySelector('.action-fields');
  const actionType = selectEl.value;

  if (actionType === 'http_request') {
    fieldsContainer.innerHTML = `
      <input type="text" class="action-url" placeholder="URL" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; margin-bottom: 8px;" value="${existingAction?.url || ''}">
      <select class="action-method" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; margin-bottom: 8px;">
        <option value="GET">GET</option>
        <option value="POST" ${existingAction?.method === 'POST' ? 'selected' : ''}>POST</option>
        <option value="PUT">PUT</option>
      </select>
      <textarea class="action-body" placeholder="Request Body (JSON)" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; font-family: monospace; min-height: 60px;">${existingAction?.body || ''}</textarea>
    `;
  } else if (actionType === 'add_comment') {
    fieldsContainer.innerHTML = `
      <textarea class="action-template" placeholder="Comment Template\nUse: {http_response}, {http_code}, {issue_key}, {summary}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; min-height: 80px;">${existingAction?.template || ''}</textarea>
    `;
  }
}

async function saveAutomationRule() {
  const ruleId = document.getElementById('rule-id').value;
  const name = document.getElementById('rule-name').value;
  const description = document.getElementById('rule-description').value;
  const triggerType = document.getElementById('rule-trigger').value;
  const isActive = document.getElementById('rule-is-active').checked;

  if (!name) {
    showNotification('error', 'Kural ismi gerekli!');
    return;
  }

  // Collect conditions
  const conditions = [];
  document.querySelectorAll('#rule-conditions > div').forEach(div => {
    const type = div.querySelector('.condition-type')?.value;
    const value = div.querySelector('.condition-value')?.value;
    if (type && value) {
      conditions.push({ type, value, case_sensitive: false });
    }
  });

  // Collect actions
  const actions = [];
  document.querySelectorAll('#rule-actions > div').forEach(div => {
    const type = div.querySelector('.action-type')?.value;

    if (type === 'http_request') {
      const url = div.querySelector('.action-url')?.value;
      const method = div.querySelector('.action-method')?.value;
      const body = div.querySelector('.action-body')?.value;

      if (url) {
        actions.push({
          type: 'http_request',
          method: method || 'POST',
          url: url,
          headers: { 'X-API-Key': 'mySecretKey123', 'Content-Type': 'application/json' },
          body: body || '',
          timeout: 30
        });
      }
    } else if (type === 'add_comment') {
      const template = div.querySelector('.action-template')?.value;
      if (template) {
        actions.push({
          type: 'add_comment',
          template: template
        });
      }
    }
  });

  if (actions.length === 0) {
    showNotification('error', 'En az bir action eklemelisiniz!');
    return;
  }

  try {
    const response = await fetch('save-automation-rule.php', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: ruleId || null,
        name,
        description,
        trigger_type: triggerType,
        conditions,
        actions,
        is_active: isActive,
        execution_order: 0
      })
    });

    const data = await response.json();

    if (data.success) {
      showNotification('success', ruleId ? 'Rule güncellendi!' : 'Rule oluşturuldu!');
      closeModal('automation-rule-modal');
      loadAutomationRules();
    } else {
      showNotification('error', 'Rule kaydedilemedi: ' + data.message);
    }
  } catch (error) {
    console.error('Save rule error:', error);
    showNotification('error', 'Rule kaydedilemedi!');
  }
}

async function toggleAutomationRule(ruleId, isActive) {
  try {
    const response = await fetch('toggle-automation-rule.php', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: ruleId, is_active: isActive })
    });

    const data = await response.json();

    if (data.success) {
      showNotification('success', isActive ? 'Rule aktif edildi!' : 'Rule pasif edildi!');
      loadAutomationRules();
    } else {
      showNotification('error', 'Durum değiştirilemedi!');
    }
  } catch (error) {
    console.error('Toggle rule error:', error);
    showNotification('error', 'Bir hata oluştu!');
  }
}

async function deleteAutomationRule(ruleId) {
  if (!confirm('Bu rule\'ı silmek istediğinizden emin misiniz?')) {
    return;
  }

  try {
    const response = await fetch('delete-automation-rule.php', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: ruleId })
    });

    const data = await response.json();

    if (data.success) {
      showNotification('success', 'Rule silindi!');
      loadAutomationRules();
    } else {
      showNotification('error', 'Rule silinemedi: ' + data.message);
    }
  } catch (error) {
    console.error('Delete rule error:', error);
    showNotification('error', 'Rule silinemedi!');
  }
}

// Notification Helper
function showNotification(type, message) {
  const notif = document.createElement('div');
  notif.style.cssText = 'position: fixed; top: 20px; right: 20px; padding: 15px 20px; background: ' +
    (type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6') +
    '; color: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 10000; font-weight: 600;';
  notif.innerHTML = '<i class="fas fa-' + (type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle') + '"></i> ' + message;
  document.body.appendChild(notif);

  setTimeout(() => {
    notif.style.opacity = '0';
    notif.style.transition = 'opacity 0.3s';
    setTimeout(() => notif.remove(), 300);
  }, 3000);
}

// API Management Functions
async function loadApiList() {
  try {
    const response = await fetch('api/v1/automation-config.php?action=list_apis');
    const data = await response.json();

    console.log('API Response:', data);
    const tbody = document.getElementById('api-list-tbody');

    // Handle nested data structure
    const apiList = data.data?.data || data.data || [];

    if (data.success && apiList && apiList.length > 0) {
      let html = '';
      apiList.forEach(api => {
        const statusBadge = api.enabled ?
          '<span class="badge badge-success">Aktif</span>' :
          '<span class="badge badge-danger">Pasif</span>';

        const lastTest = api.last_test ?
          new Date(api.last_test).toLocaleString('tr-TR') :
          'Henüz test edilmedi';

        const authType = api.auth_type === 'bearer' ? 'Bearer Token' :
                        api.auth_type === 'apikey' ? 'API Key' :
                        api.auth_type === 'basic' ? 'Basic Auth' : 'No Auth';

        html += `
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #f0f0f0;">
              <strong>${api.name}</strong>
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #f0f0f0; font-family: 'Courier New', monospace; font-size: 11px; max-width: 300px; overflow: hidden; text-overflow: ellipsis;">
              ${api.base_url}
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #f0f0f0;">
              ${authType}
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #f0f0f0;">
              ${statusBadge}
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #f0f0f0; font-size: 11px;">
              ${lastTest}
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #f0f0f0;">
              <button onclick="testApi(${api.id})" style="padding: 6px 12px; background: #10b981; color: white; border: none; border-radius: 4px; font-size: 12px; cursor: pointer; margin-right: 5px;" title="Test Et">
                <i class="fas fa-vial"></i>
              </button>
              <button onclick="editApi(${api.id})" style="padding: 6px 12px; background: #3b82f6; color: white; border: none; border-radius: 4px; font-size: 12px; cursor: pointer; margin-right: 5px;" title="Düzenle">
                <i class="fas fa-edit"></i>
              </button>
              <button onclick="deleteApi(${api.id}, '${api.name}')" style="padding: 6px 12px; background: #ef4444; color: white; border: none; border-radius: 4px; font-size: 12px; cursor: pointer;" title="Sil">
                <i class="fas fa-trash"></i>
              </button>
            </td>
          </tr>
        `;
      });
      tbody.innerHTML = html;
    } else {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="padding: 40px; text-align: center; color: #7f8c8d;">
            <i class="fas fa-database" style="font-size: 48px; margin-bottom: 15px; display: block; opacity: 0.3;"></i>
            <strong style="display: block; margin-bottom: 5px;">Henüz API eklenmemiş</strong>
            <p style="font-size: 13px; margin: 0;">Yukarıdaki "Yeni API Ekle" butonu veya örnek API'lerden birini kullanarak başlayın.</p>
          </td>
        </tr>
      `;
    }
  } catch (error) {
    console.error('API listesi yüklenirken hata:', error);
    showNotification('error', 'API listesi yüklenemedi!');
  }
}

function openAddApiModal() {
  showNotification('info', 'API ekleme modal\'ı açılacak...');
  // TODO: Implement modal
}

function editApi(id) {
  showNotification('info', 'API düzenleme modal\'ı açılacak...');
  // TODO: Implement edit modal
}

async function deleteApi(id, name) {
  if (!confirm(`"${name}" API'sini silmek istediğinize emin misiniz?`)) {
    return;
  }

  try {
    const response = await fetch('api/v1/automation-config.php', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({action: 'delete_api', id: id})
    });
    const data = await response.json();

    if (data.success) {
      showNotification('success', 'API silindi!');
      loadApiList();
    } else {
      showNotification('error', 'API silinemedi!');
    }
  } catch (error) {
    console.error('API silme hatası:', error);
    showNotification('error', 'Bir hata oluştu!');
  }
}

async function testApi(id) {
  showNotification('info', 'API test ediliyor...');
  // TODO: Implement API test
}

// Load automation states from database
async function loadAutomationStates() {
  try {
    const response = await fetch('api/v1/automation-config.php?action=list_automations');
    const data = await response.json();

    console.log('Automation states loaded:', data);

    if (data.success && data.data?.data) {
      const automations = data.data.data;

      // Map automation types to toggle IDs
      const typeToToggleMap = {
        'gl10_user_check': 'toggle-gl10',
        'backup_check': 'toggle-backup',
        'dyf_tracking': 'toggle-dyf',
        'netbox_ip': 'toggle-netbox'
      };

      // Update toggle switches
      automations.forEach(automation => {
        const toggleId = typeToToggleMap[automation.type];
        if (toggleId) {
          const toggle = document.getElementById(toggleId);
          if (toggle) {
            toggle.checked = automation.enabled;
            console.log(`Toggle ${toggleId} set to ${automation.enabled}`);
          }
        }
      });

      showNotification('success', 'Otomasyon durumları yüklendi');
    }
  } catch (error) {
    console.error('Otomasyon durumları yüklenirken hata:', error);
    showNotification('error', 'Otomasyon durumları yüklenemedi!');
  }
}

function addJiraApi() {
  showNotification('info', 'Jira API ekleme modal\'ı açılacak...');
  // Pre-fill with Jira data
}

function addNetBoxApi() {
  showNotification('info', 'NetBox API ekleme modal\'ı açılacak...');
  // Pre-fill with NetBox data
}


// Initialize tabs on page load
document.addEventListener('DOMContentLoaded', function() {
  console.log('Tools page tabs initializing...');

  // Hide all tabs first
  document.querySelectorAll('.automation-tab-content').forEach(content => {
    content.classList.remove('active');
    content.style.display = 'none';
  });

  // Show first tab by default
  const firstTab = document.getElementById('tab-api-info');
  if (firstTab) {
    firstTab.classList.add('active');
    firstTab.style.display = 'block';
    console.log('First tab (API Bilgileri) activated');
  } else {
    console.error('First tab not found!');
  }

  // Set first tab button as active
  const firstTabButton = document.querySelector('.automation-tab');
  if (firstTabButton) {
    firstTabButton.style.color = '#667eea';
    firstTabButton.style.borderBottomColor = '#667eea';
  }
});
