// ========================================
// 2. ISLER Y�NETIMI (Tasks Management)
// ========================================

// Isler sayfasinin y�klenmesi i�in fonksiyon
function loadTasksPage() {
  console.log("=== loadTasksPage CALLED ===");

  // Tab'lar i�in olay dinleyicileri ekle
  const tabs = document.querySelectorAll('#tasks-page .tabs .tab');
  console.log('Tabs bulunan miktar:', tabs.length);

  tabs.forEach(tab => {
    tab.addEventListener('click', function() {
      const tabId = this.getAttribute('data-tab');
      console.log('Tab tiklandi:', tabId);
      
      // Aktif tab'i vurgula
      tabs.forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      
      // Ilgili i�erigi g�ster
      const tabContents = document.querySelectorAll('#tasks-page .tab-content');
      tabContents.forEach(content => {
        content.style.display = 'none';
      });
      
      document.getElementById(tabId).style.display = 'block';
      
      // Ilgili i�erigi y�kle
      if (tabId === 'periodic-tasks') {
        loadPeriodicTasks();
      } else if (tabId === 'cab-tasks') {
        loadCabTasks();
      } else if (tabId === 'roadmap-tasks') {
        loadRoadmapTasks();
      }

      // Takvimi her tab degisiminde yeniden yukle
      if (typeof initCalendar === 'function') {
        initCalendar();
      }
    });
  });
  
  // Varsayilan olarak Periyodik Isleri y�kle
  loadPeriodicTasks();
  initCalendar();
}

// Dashboard i�in isleri y�kle
function loadDashboardTasks() {
  console.log("Dashboard isleri y�kleniyor...");
  
  // Dashboard tab'lari i�in olay dinleyicileri
  const dashboardTabs = document.querySelectorAll('.work-tabs .tab');
  dashboardTabs.forEach(tab => {
    tab.addEventListener('click', function() {
      const tabId = this.getAttribute('data-tab');
      
      // Aktif tab'i vurgula
      dashboardTabs.forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      
      // Ilgili i�erigi g�ster
      const tabContents = document.querySelectorAll('.work-summary .tab-content');
      tabContents.forEach(content => {
        content.style.display = 'none';
      });
      
      document.getElementById(tabId).style.display = 'block';
      
      // Ilgili i�erigi y�kle
      if (tabId === 'periodic-dashboard') {
        loadDashboardPeriodicTasks();
      } else if (tabId === 'cab-dashboard') {
        loadDashboardCabTasks();
      } else if (tabId === 'roadmap-dashboard') {
        loadDashboardRoadmapTasks();
      }
    });
  });
  
  // Varsayilan olarak Dashboard Periyodik Isleri y�kle
  loadDashboardPeriodicTasks();
}

// Isleri y�kleyen fonksiyonlara ekstra kontroller ekle
function loadPeriodicTasks() {
  const tasksContainer = document.getElementById('periodic-tasks-body');
  
  // Y�kleme g�stergesi g�ster
  tasksContainer.innerHTML = `
    <tr>
      <td colspan="8" class="text-center">
        <i class="fas fa-sync fa-spin"></i> Isler y�kleniyor...
      </td>
    </tr>
  `;
  
  // Isleri al (AJAX)
  fetch('get-tasks.php?type=periodic')
    .then(response => {
      if (!response.ok) {
        throw new Error('Ag yaniti basarisiz');
      }
      return response.json();
    })
    .then(tasks => {
      tasksContainer.innerHTML = '';
      
      if (tasks.error) {
        tasksContainer.innerHTML = `
          <tr>
            <td colspan="8" class="text-center">
              Hata: ${tasks.error}
            </td>
          </tr>
        `;
        return;
      }
      
      if (!tasks.length) {
        tasksContainer.innerHTML = `
          <tr>
            <td colspan="8" class="text-center">
              Periyodik is bulunamadi
            </td>
          </tr>
        `;
        return;
      }
      
      // Isleri tabloya ekle
      tasks.forEach(task => {
        // Task tipi 'periodic' veya belirtilmemis olanlari g�ster
        if (!task.type || task.type === 'periodic') {
          tasksContainer.innerHTML += createTaskRow(task);
        }
      });

      // Setup search listeners after tasks are loaded
      setupTaskSearchListeners();
    })
    .catch(error => {
      console.error('Isler y�klenirken hata:', error);
      tasksContainer.innerHTML = `
        <tr>
          <td colspan="8" class="text-center">
            Isler y�klenirken hata olustu: ${error.message}
          </td>
        </tr>
      `;
    });
}

// CAB planli islerini y�kle
function loadCabTasks() {
  const tasksContainer = document.getElementById('cab-tasks-body');

  if (!tasksContainer) {
    console.error('cab-tasks-body elementi bulunamadi');
    return;
  }

  console.log('=== loadCabTasks CALLED ===');

  // Y�kleme g�stergesi g�ster
  tasksContainer.innerHTML = `
    <tr>
      <td colspan="7" class="text-center">
        <i class="fas fa-sync fa-spin"></i> CAB isleri yukleniyor...
      </td>
    </tr>
  `;

  console.log('Fetch baslatiliyor: get-tasks.php?type=cab');
  
  // Isleri al (AJAX)
  fetch('get-tasks.php?type=cab')
    .then(response => {
      console.log('Response alindi:', response.status);
      if (!response.ok) {
        throw new Error('Ag yaniti basarisiz: ' + response.status);
      }
      return response.json();
    })
    .then(tasks => {
      console.log('Tasks JSON parsed:', tasks);
      console.log('Tasks length:', tasks ? tasks.length : 'null');

      tasksContainer.innerHTML = '';

      if (tasks.error) {
        console.error('Tasks error:', tasks.error);
        tasksContainer.innerHTML = `
          <tr>
            <td colspan="7" class="text-center">
              Hata: ${tasks.error}
            </td>
          </tr>
        `;
        return;
      }

      // Sadece CAB tipindeki isleri filtrele
      const cabTasks = Array.isArray(tasks) ? tasks.filter(task => task.type === 'cab') : [];

      console.log('CAB tasks filtered:', cabTasks);
      console.log('CAB tasks count:', cabTasks.length);

      if (cabTasks.length === 0) {
        console.log('CAB tasks bos - empty state gosteriliyor');
        tasksContainer.innerHTML = `
          <tr>
            <td colspan="7" style="text-align: center; padding: 40px; color: #7f8c8d;">
              <i class="fas fa-inbox" style="font-size: 3rem; display: block; margin-bottom: 15px; color: #cbd5e0;"></i>
              CAB onay gerektiren is bulunamadi
            </td>
          </tr>
        `;
        return;
      }

      console.log('CAB tasks tabloya ekleniyor...');
      // Isleri tabloya ekle
      cabTasks.forEach((task, index) => {
        console.log('Adding task', index, ':', task.device);
        try {
          tasksContainer.innerHTML += createCabTaskRow(task);
        } catch (err) {
          console.error('Error creating row for task', index, ':', err);
        }
      });
      console.log('=== CAB tasks yukleme tamamlandi ===');

      // Setup search listeners after tasks are loaded
      setupCabTaskSearchListeners();
    })
    .catch(error => {
      console.error('=== CAB tasks CATCH ERROR ===', error);
      tasksContainer.innerHTML = `
        <tr>
          <td colspan="7" class="text-center" style="color: red; padding: 20px;">
            CAB isleri yuklenirken hata: ${error.message}
          </td>
        </tr>
      `;
    });
}

// Road map islerini y�kle
function loadRoadmapTasks() {
  const tasksContainer = document.getElementById('roadmap-tasks-body');
  
  // Y�kleme g�stergesi g�ster
  tasksContainer.innerHTML = `
    <tr>
      <td colspan="8" class="text-center">
        <i class="fas fa-sync fa-spin"></i> Road map y�kleniyor...
      </td>
    </tr>
  `;
  
  // Isleri al (AJAX)
  fetch('get-tasks.php?type=roadmap')
    .then(response => {
      if (!response.ok) {
        throw new Error('Ag yaniti basarisiz');
      }
      return response.json();
    })
    .then(tasks => {
      tasksContainer.innerHTML = '';
      
      if (tasks.error) {
        tasksContainer.innerHTML = `
          <tr>
            <td colspan="8" class="text-center">
              Hata: ${tasks.error}
            </td>
          </tr>
        `;
        return;
      }
      
      // Sadece roadmap tipindeki isleri filtrele
      const roadmapTasks = Array.isArray(tasks) ? tasks.filter(task => task.type === 'roadmap') : [];
      
      if (!roadmapTasks.length) {
        tasksContainer.innerHTML = `
          <tr>
            <td colspan="8" class="text-center">
              Road map bulunamadi
            </td>
          </tr>
        `;
        return;
      }
      
      // Isleri tabloya ekle
      roadmapTasks.forEach(task => {
        tasksContainer.innerHTML += createRoadmapRow(task);
      });

      // Setup search listeners after tasks are loaded
      setupRoadmapTaskSearchListeners();
    })
    .catch(error => {
      console.error('Road map y�klenirken hata:', error);
      tasksContainer.innerHTML = `
        <tr>
          <td colspan="8" class="text-center">
            Road map y�klenirken hata olustu: ${error.message}
          </td>
        </tr>
      `;
    });
}

// Dashboard i�in periyodik isleri y�kle
function loadDashboardPeriodicTasks() {
  const tasksContainer = document.getElementById('dashboard-periodic-tasks');
  // Null-guard: widget DYF'ye gecti, bu element artik yok — sessizce cik
  if (!tasksContainer) return;

  // Y�kleme g�stergesi g�ster
  tasksContainer.innerHTML = `
    <tr>
      <td colspan="8" class="text-center">
        <i class="fas fa-sync fa-spin"></i> Isler y�kleniyor...
      </td>
    </tr>
  `;
  
  // Isleri al (AJAX) - Yaklasan 10 isi g�ster
  fetch('get-tasks.php?type=periodic&limit=10')
    .then(response => {
      if (!response.ok) {
        throw new Error('Ag yaniti basarisiz');
      }
      return response.json();
    })
    .then(tasks => {
      tasksContainer.innerHTML = '';
      
      if (tasks.error) {
        tasksContainer.innerHTML = `
          <tr>
            <td colspan="8" class="text-center">
              Hata: ${tasks.error}
            </td>
          </tr>
        `;
        return;
      }
      
      if (!tasks.length) {
        tasksContainer.innerHTML = `
          <tr>
            <td colspan="8" class="text-center">
              Periyodik is bulunamadi
            </td>
          </tr>
        `;
        return;
      }
      
      // En yakin 10 periyodik is
      const periodicTasks = Array.isArray(tasks) ? 
        tasks.filter(task => !task.type || task.type === 'periodic').slice(0, 10) : [];
      
      if (!periodicTasks.length) {
        tasksContainer.innerHTML = `
          <tr>
            <td colspan="8" class="text-center">
              Periyodik is bulunamadi
            </td>
          </tr>
        `;
        return;
      }
      
      // Isleri tabloya ekle
      periodicTasks.forEach(task => {
        tasksContainer.innerHTML += createTaskRow(task);
      });
    })
    .catch(error => {
      console.error('Dashboard isleri y�klenirken hata:', error);
      tasksContainer.innerHTML = `
        <tr>
          <td colspan="8" class="text-center">
            Isler y�klenirken hata olustu: ${error.message}
          </td>
        </tr>
      `;
    });
}

// Dashboard i�in CAB islerini y�kle
function loadDashboardCabTasks() {
  const tasksContainer = document.getElementById('dashboard-cab-tasks');
  // Null-guard: widget DYF'ye gecti, bu element artik yok — sessizce cik
  if (!tasksContainer) return;

  // Y�kleme g�stergesi g�ster
  tasksContainer.innerHTML = `
    <tr>
      <td colspan="7" class="text-center">
        <i class="fas fa-sync fa-spin"></i> Planli �alismalar y�kleniyor...
      </td>
    </tr>
  `;
  
  // Isleri al (AJAX) - Yaklasan 5 planli �alismayi g�ster
  fetch('get-tasks.php?type=cab&limit=5')
    .then(response => {
      if (!response.ok) {
        throw new Error('Ag yaniti basarisiz');
      }
      return response.json();
    })
    .then(tasks => {
      tasksContainer.innerHTML = '';
      
      if (tasks.error) {
        tasksContainer.innerHTML = `
          <tr>
            <td colspan="7" class="text-center">
              Hata: ${tasks.error}
            </td>
          </tr>
        `;
        return;
      }
      
      // Sadece CAB tipindeki isleri filtrele
      const cabTasks = Array.isArray(tasks) ? 
        tasks.filter(task => task.type === 'cab').slice(0, 5) : [];
      
      if (!cabTasks.length) {
        tasksContainer.innerHTML = `
          <tr>
            <td colspan="7" class="text-center">
              CAB planli �alisma bulunamadi
            </td>
          </tr>
        `;
        return;
      }
      
      // Isleri tabloya ekle
      cabTasks.forEach(task => {
        // Etki alanini formatlama - dizi veya string olabilir
        let scopeText;
        if (Array.isArray(task.scope)) {
          scopeText = task.scope.join(", ");
        } else {
          scopeText = task.scope;
        }
        
        // Islem s�tununu �ikartilmis sade s�tunlu sira olustur
        const row = document.createElement('tr');
        
        row.innerHTML = `
          <td>${escapeHtml(task.device)}</td>
          <td>
            <div class="detail-summary" onclick="toggleDetail(this)">
              ${escapeHtml(task.reason)} <i class="fas fa-chevron-down"></i>
            </div>
            <div class="detail-content" style="display: none;">
              <p><strong>Tip:</strong> ${escapeHtml(task.reason)}</p>
              <p><strong>A�iklama:</strong> ${escapeHtml(task.description || '-')}</p>
            </div>
          </td>
          <td>${escapeHtml(task.maker)}</td>
          <td>${escapeHtml(task.checker)}</td>
          <td>${escapeHtml(scopeText)}</td>
          <td><a href="#" class="link-btn">${escapeHtml(task.record)}</a></td>
          <td>${escapeHtml(task.dateFormatted || task.date)}</td>
        `;
        
        tasksContainer.appendChild(row);
      });
    })
    .catch(error => {
      console.error('Planli �alismalar y�klenirken hata:', error);
      tasksContainer.innerHTML = `
        <tr>
          <td colspan="7" class="text-center">
            Planli �alismalar y�klenirken hata olustu: ${error.message}
          </td>
        </tr>
      `;
    });
}

// Dashboard i�in Road Map islerini y�kle
function loadDashboardRoadmapTasks() {
  const tasksContainer = document.getElementById('dashboard-roadmap-tasks');
  // Null-guard: widget DYF'ye gecti, bu element artik yok — sessizce cik
  if (!tasksContainer) return;

  // Y�kleme g�stergesi g�ster
  tasksContainer.innerHTML = `
    <tr>
      <td colspan="7" class="text-center">
        <i class="fas fa-sync fa-spin"></i> Road map y�kleniyor...
      </td>
    </tr>
  `;
  
  // Isleri al (AJAX) - En �nemli 5 road map g�ster
  fetch('get-tasks.php?type=roadmap&limit=5')
    .then(response => {
      if (!response.ok) {
        throw new Error('Ag yaniti basarisiz');
      }
      return response.json();
    })
    .then(tasks => {
      tasksContainer.innerHTML = '';
      
      if (tasks.error) {
        tasksContainer.innerHTML = `
          <tr>
            <td colspan="7" class="text-center">
              Hata: ${tasks.error}
            </td>
          </tr>
        `;
        return;
      }
      
      // Sadece roadmap tipindeki isleri filtrele
      const roadmapTasks = Array.isArray(tasks) ? 
        tasks.filter(task => task.type === 'roadmap').slice(0, 5) : [];
      
      if (!roadmapTasks.length) {
        tasksContainer.innerHTML = `
          <tr>
            <td colspan="7" class="text-center">
              Road map bulunamadi
            </td>
          </tr>
        `;
        return;
      }
      
      // Isleri tabloya ekle
      roadmapTasks.forEach(task => {
        // Islem s�tunu olmayan sade bir roadmap satiri olustur
        const row = document.createElement('tr');
        
        // Durum sinifi ve metni
        let statusClass = 'status-active';
        let statusText = 'Aktif';
        
        if (task.status === 'warning') {
          statusClass = 'status-warning';
          statusText = 'Uyari';
        } else if (task.status === 'critical') {
          statusClass = 'status-danger';
          statusText = 'Kritik';
        } else if (task.status === 'completed') {
          statusClass = 'status-success';
          statusText = 'Tamamlandi';
        }
        
        row.innerHTML = `
          <td>${escapeHtml(task.project || task.device)}</td>
          <td>
            <div class="detail-summary" onclick="toggleDetail(this)">
              ${escapeHtml(task.reason)} <i class="fas fa-chevron-down"></i>
            </div>
            <div class="detail-content" style="display: none;">
              <p><strong>Tip:</strong> ${escapeHtml(task.reason)}</p>
              <p><strong>A�iklama:</strong> ${escapeHtml(task.description || '-')}</p>
            </div>
          </td>
          <td>${escapeHtml(task.responsible || task.maker)}</td>
          <td>${escapeHtml(task.scope)}</td>
          <td>${escapeHtml(task.startDate || task.date)}</td>
          <td>${escapeHtml(task.endDate || '-')}</td>
          <td><span class="status ${statusClass}">${statusText}</span></td>
        `;
        
        tasksContainer.appendChild(row);
      });
    })
    .catch(error => {
      console.error('Road map y�klenirken hata:', error);
      tasksContainer.innerHTML = `
        <tr>
          <td colspan="7" class="text-center">
            Road map y�klenirken hata olustu: ${error.message}
          </td>
        </tr>
      `;
    });
}

// Is satiri HTML'i olusturma fonksiyonunu g�ncelle - �oklu scope i�in
// Periyodik is satiri HTML'i olustur (6 sutun: Cihaz, Sebep, Aciklama, Tarih, Durum, Islemler)
function createTaskRow(task) {
  const statusClass = task.status === 'completed' ? 'status-completed' :
                      task.status === 'warning' ? 'status-warning' :
                      task.status === 'critical' ? 'status-critical' : 'status-active';
  const statusText = task.status === 'completed' ? 'Tamamlandi' :
                     task.status === 'warning' ? 'Uyari' :
                     task.status === 'critical' ? 'Kritik' : 'Aktif';

  return `
    <tr>
      <td>${escapeHtml(task.device)}</td>
      <td>${escapeHtml(task.reason)}</td>
      <td>${escapeHtml(task.description || '-')}</td>
      <td>${escapeHtml(task.dateFormatted || task.date)}</td>
      <td><span class="status-badge ${statusClass}">${statusText}</span></td>
      <td>
        <button class="action-btn view-btn" onclick="viewTask('${task.id}')" title="Goruntule">
          <i class="fas fa-eye"></i>
        </button>
        <button class="action-btn edit-btn" onclick="editTask('${task.id}')" title="Duzenle">
          <i class="fas fa-edit"></i>
        </button>
        <button class="action-btn delete-btn" onclick="deleteTask('${task.id}')" title="Sil">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    </tr>
  `;
}

// CAB is satiri HTML'i olustur (7 sutun: Cihaz, Sebep, Aciklama, CAB Tarihi, Tarih, Durum, Islemler)
function createCabTaskRow(task) {
  const statusClass = task.status === 'completed' ? 'status-completed' :
                      task.status === 'warning' ? 'status-warning' :
                      task.status === 'critical' ? 'status-critical' : 'status-active';
  const statusText = task.status === 'completed' ? 'Tamamlandi' :
                     task.status === 'warning' ? 'Uyari' :
                     task.status === 'critical' ? 'Kritik' : 'Aktif';

  return `
    <tr>
      <td>${escapeHtml(task.device)}</td>
      <td>${escapeHtml(task.reason)}</td>
      <td>${escapeHtml(task.description || '-')}</td>
      <td>${escapeHtml(task.cabMeetingDate || '-')}</td>
      <td>${escapeHtml(task.dateFormatted || task.date)}</td>
      <td><span class="status-badge ${statusClass}">${statusText}</span></td>
      <td>
        <button class="action-btn view-btn" onclick="viewTask('${task.id}')" title="Goruntule">
          <i class="fas fa-eye"></i>
        </button>
        <button class="action-btn edit-btn" onclick="editTask('${task.id}')" title="Duzenle">
          <i class="fas fa-edit"></i>
        </button>
        <button class="action-btn delete-btn" onclick="deleteTask('${task.id}')" title="Sil">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    </tr>
  `;
}

// Roadmap is satiri HTML'i olustur (7 sutun: Proje, Aciklama, Sorumlu, Baslangic, Bitis, Durum, Islemler)
function createRoadmapRow(task) {
  const statusClass = task.status === 'completed' ? 'status-completed' :
                      task.status === 'warning' ? 'status-warning' :
                      task.status === 'critical' ? 'status-critical' : 'status-active';
  const statusText = task.status === 'completed' ? 'Tamamlandi' :
                     task.status === 'warning' ? 'Uyari' :
                     task.status === 'critical' ? 'Kritik' : 'Aktif';

  return `
    <tr>
      <td>${escapeHtml(task.device)}</td>
      <td>${escapeHtml(task.description || '-')}</td>
      <td>${escapeHtml(task.maker)}</td>
      <td>${escapeHtml(task.date)}</td>
      <td>${escapeHtml(task.endDate || '-')}</td>
      <td><span class="status-badge ${statusClass}">${statusText}</span></td>
      <td>
        <button class="action-btn view-btn" onclick="viewTask('${task.id}')" title="Goruntule">
          <i class="fas fa-eye"></i>
        </button>
        <button class="action-btn edit-btn" onclick="editTask('${task.id}')" title="Duzenle">
          <i class="fas fa-edit"></i>
        </button>
        <button class="action-btn delete-btn" onclick="deleteTask('${task.id}')" title="Sil">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    </tr>
  `;
}

// Is g�r�nt�leme fonksiyonu
function viewTask(id) {
  window.open(`view-task.php?id=${id}`, '_blank', 'width=800,height=600');
}

// Silme islemini de d�zenle
function deleteTask(id) {
  if (confirm('Bu isi silmek istediginizden emin misiniz?')) {
    fetch(`delete-task.php?id=${id}`, {
      method: 'POST'
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Ag yaniti basarisiz');
      }
      return response.json();
    })
    .then(data => {
      if (data.success) {
        alert('Is basariyla silindi.');
        
        // Sayfalari yeniden y�kle
        if (document.getElementById('tasks-page').style.display !== 'none') {
          // Aktif sekmeyi bul ve ilgili i�erigi y�kle
          const activeTab = document.querySelector('#tasks-page .tab.active');
          if (activeTab) {
            const tabId = activeTab.getAttribute('data-tab');
            if (tabId === 'periodic-tasks') {
              loadPeriodicTasks();
            } else if (tabId === 'cab-planned-tasks') {
              loadCabTasks();
            } else if (tabId === 'roadmap-tasks') {
              loadRoadmapTasks();
            }
          }
        }
        
        // Dashboard verilerini g�ncelle
        if (document.getElementById('dashboard-page').style.display !== 'none') {
          loadDashboardTasks();
        }
        
        // Takvimi yenile
        initCalendar();
      } else {
        alert('Hata: ' + (data.error || 'Bilinmeyen bir hata olustu'));
      }
    })
    .catch(error => {
      console.error('Is silinirken hata:', error);
      alert('Is silinirken hata olustu: ' + error.message);
    });
  }
}

// D�zenleme fonksiyonunu g�ncelle - �oklu se�im i�in
// D�zenleme fonksiyonunu g�ncelle - periyodik alanlar i�in
function editTask(id) {
  // Ilgili isin verilerini al
  fetch(`get-tasks.php?id=${id}`)
    .then(response => {
      if (!response.ok) {
        throw new Error('Ag yaniti basarisiz');
      }
      return response.json();
    })
    .then(tasks => {
      if (tasks.error) {
        alert('Hata: ' + tasks.error);
        return;
      }
      
      // Isi bul
      const task = Array.isArray(tasks) ? tasks[0] : null; // ID'ye g�re filtreledik, ilk �geyi al
      
      if (!task) {
        alert('Is bulunamadi.');
        return;
      }
      
      // Form alanlarini doldur
      document.getElementById('task-device').value = task.device;
      document.getElementById('task-reason').value = task.reason;
      
      const taskDescription = document.getElementById('task-description');
      if (taskDescription) {
        taskDescription.value = task.description || '';
      }
      
      document.getElementById('task-maker').value = task.maker;
      document.getElementById('task-checker').value = task.checker;
      
      // Etki alani �oklu se�im - scope artik bir dizi veya string olabilir
      const scopeSelect = document.getElementById('task-scope');
      const scopes = Array.isArray(task.scope) ? task.scope : [task.scope];
      
      // �nceki se�imleri temizle
      Array.from(scopeSelect.options).forEach(option => option.selected = false);
      
      // Mevcut etki alanlarini se�
      scopes.forEach(scope => {
        Array.from(scopeSelect.options).forEach(option => {
          if (option.value === scope) {
            option.selected = true;
          }
        });
      });
      
      document.getElementById('task-record').value = task.record;
      
      // Is tipini ayarla
      const taskType = document.getElementById('task-type');
      if (taskType) {
        taskType.value = task.type || 'periodic'; // Varsayilan olarak periodic
        
        // Tip degisikligi olayini tetikle
        toggleTaskFields();
      }
      
      // Tarih formatini d�zelt (YYYY-MM-DD)
      const taskDate = document.getElementById('task-date');
      const date = new Date(task.date);
      const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD formatina d�n�st�r
      taskDate.value = formattedDate;
      
      // Periyodik alanlari doldur
      if (task.type === 'periodic' && task.isRecurring) {
        const isRecurringCheckbox = document.getElementById('is-recurring');
        if (isRecurringCheckbox) {
          isRecurringCheckbox.checked = true;
          toggleRecurringOptions(); // Periyodik alanlari g�ster
          
          // Interval ve birim
          document.getElementById('recurring-interval').value = task.recurringInterval || 30;
          document.getElementById('recurring-unit').value = task.recurringUnit || 'day';
          
          // Bildirim g�nleri
          document.getElementById('notification-days').value = task.notificationDays || 7;
          
          // Mail bildirimi
          document.getElementById('email-notification').checked = task.emailNotification !== false;
          document.getElementById('notification-email').value = task.notificationEmail || 'security-demo@example.com';
        }
      }
      
      // Roadmap alanlarini doldur
      if (task.type === 'roadmap') {
        const projectField = document.getElementById('task-project');
        if (projectField) {
          projectField.value = task.project || '';
        }
        
        const responsibleField = document.getElementById('task-responsible');
        if (responsibleField) {
          responsibleField.value = task.responsible || '';
        }
        
        const endDateField = document.getElementById('task-end-date');
        if (endDateField && task.endDate) {
          const endDate = new Date(task.endDate);
          endDateField.value = endDate.toISOString().split('T')[0];
        }
      }
      
      // CAB alanlarini doldur
      if (task.type === 'cab') {
        const cabMeetingDateField = document.getElementById('task-cab-meeting-date');
        if (cabMeetingDateField && task.cabMeetingDate) {
          const cabMeetingDate = new Date(task.cabMeetingDate);
          cabMeetingDateField.value = cabMeetingDate.toISOString().split('T')[0];
        }
        
        const cabApprovalField = document.getElementById('task-cab-approval');
        if (cabApprovalField) {
          cabApprovalField.value = task.cabApproval ? 'true' : 'false';
        }
      }
      
      // Form basligini ve butonunu g�ncelle
      document.querySelector('#add-task-modal .modal-title').textContent = 'Is D�zenle';
      document.querySelector('#add-task-form .submit-btn').textContent = 'Degisiklikleri Kaydet';
      
      // Form veri �zniteligi ekle
      const form = document.getElementById('add-task-form');
      form.setAttribute('data-edit-id', id);
      form.setAttribute('data-edit-mode', 'true');
      
      // Modali g�ster
      openModal('add-task-modal');
    })
    .catch(error => {
      console.error('Is bilgileri alinirken hata:', error);
      alert('Is bilgileri alinirken hata olustu: ' + error.message);
    });
}

// Bir sonraki tarih hesaplama fonksiyonu
function calculateNextDate(dateStr, interval, unit) {
  const date = new Date(dateStr);
  
  switch(unit) {
    case 'day':
      date.setDate(date.getDate() + interval);
      break;
    case 'week':
      date.setDate(date.getDate() + (interval * 7));
      break;
    case 'month':
      date.setMonth(date.getMonth() + interval);
      break;
    default:
      date.setDate(date.getDate() + interval);
  }
  
  return date.toISOString().split('T')[0]; // YYYY-MM-DD formatina d�n�st�r
}

// Periyodik g�revleri kontrol eden ve bildirimleri g�steren fonksiyon
function checkPeriodicTasks() {
  console.log("Periyodik g�revler kontrol ediliyor...");
  
  fetch('check-periodic-tasks.php')
    .then(response => {
      if (!response.ok) {
        throw new Error('Ag yaniti basarisiz');
      }
      return response.json();
    })
    .then(data => {
      // Bildirimleri dashboard'a ekle
      const warningsContainer = document.querySelector('.expiry-warning');
      if (!warningsContainer || !data.notifications) return;
      
      // Basligi koru
      const warningTitle = warningsContainer.querySelector('h4');
      
      // Bildirimler i�in yer temizle
      const existingNotifications = warningsContainer.querySelectorAll('.warning-item.task-notification');
      existingNotifications.forEach(notification => notification.remove());
      
      // Bildirimleri ekle
      data.notifications.forEach(notification => {
        const warningItem = document.createElement('div');
        warningItem.className = `warning-item warning-${notification.priority} task-notification`;
        
        warningItem.innerHTML = `
          <div class="warning-icon"><i class="fas fa-calendar-check"></i></div>
          <div class="warning-content">
            <div class="warning-title">${notification.title}</div>
            <div class="warning-text">${notification.message}</div>
          </div>
          <div class="warning-action">
            <button class="action-btn view-btn" onclick="viewTask('${notification.taskId}')">G�r�nt�le</button>
            <button class="action-btn view-btn" onclick="markTaskCompleted('${notification.taskId}')">Tamamlandi</button>
          </div>
        `;
        
        // Basliktan sonra ekle
        if (warningTitle) {
          warningTitle.after(warningItem);
        } else {
          warningsContainer.appendChild(warningItem);
        }
      });
      
      console.log(`${data.notifications.length} periyodik g�rev bildirimi g�sterildi.`);
    })
    .catch(error => {
      console.error('Periyodik g�rev kontrol hatasi:', error);
    });
}

// Is istatistikleri i�in g�rsellestirme
function showTaskStatistics() {
  // Istatistikleri hesapla
  fetch('get-tasks.php')
    .then(response => response.json())
    .then(tasks => {
      if (!Array.isArray(tasks)) return;
      
      // Periyodik isleri filtrele
      const periodicTasks = tasks.filter(task => task.isRecurring);
      
      // Is t�r�ne g�re grupla
      const tasksByType = {};
      
      periodicTasks.forEach(task => {
        const type = task.reason || 'Diger';
        if (!tasksByType[type]) {
          tasksByType[type] = [];
        }
        tasksByType[type].push(task);
      });
      
      // Istatistikleri g�ster
      renderTaskStatistics(tasksByType, periodicTasks.length);
    })
    .catch(error => {
      console.error('Is istatistikleri alinirken hata:', error);
    });
}

// Istatistik grafigini olustur
function renderTaskStatistics(tasksByType, totalCount) {
  const statsContainer = document.getElementById('task-statistics');
  if (!statsContainer) return;
  
  let html = '<div class="statistics-header">Periyodik Is Dagilimi</div>';
  html += '<div class="statistics-content">';
  
  // Her is t�r� i�in �ubuk olustur
  for (const [type, tasks] of Object.entries(tasksByType)) {
    const percentage = Math.round((tasks.length / totalCount) * 100);
    
    html += `
      <div class="stat-item">
        <div class="stat-label">${type}</div>
        <div class="stat-bar-container">
          <div class="stat-bar" style="width: ${percentage}%"></div>
          <div class="stat-value">${tasks.length} is (${percentage}%)</div>
        </div>
      </div>
    `;
  }
  
  html += '</div>';
  statsContainer.innerHTML = html;
}

// Takvim modunda periyodik islerle �alismak i�in
function initCalendarWithPeriodicTasks() {
  console.log("Periyodik isli takvim baslatiliyor...");
  
  // Takvim i�erigini y�kle
  const calendarDates = document.getElementById('calendar-dates');
  const calendarTitle = document.getElementById('calendar-title');
  
  if (!calendarDates || !calendarTitle) {
    console.error("Takvim elementleri bulunamadi");
    return;
  }
  
  // Takvim i�in varsayilan ayarlar
  let currentDate = new Date();
  let selectedDate = null;
  let allTasks = [];
  
  // T�m isleri y�kle (gelecek tekrarlar dahil)
  loadAllTasksWithFuture();
  
  // Ay degistirme butonlari
  document.getElementById('prev-month').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
  });
  
  document.getElementById('next-month').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
  });
  
  // Gelecek tekrarlar da dahil t�m isleri y�kle
  function loadAllTasksWithFuture() {
    fetch('get-tasks.php?future=true')
      .then(response => response.json())
      .then(tasks => {
        allTasks = Array.isArray(tasks) ? tasks : [];
        renderCalendar();
      })
      .catch(error => {
        console.error('Takvim isleri y�klenirken hata:', error);
      });
  }
  
  // Takvimi g�rsellestir
  function renderCalendar() {
    // Mevcut takvim g�rsellestirme kodunuz...
    // (Periyodik ve gelecek isleri renkli g�sterecek sekilde g�ncellendi)
  }
}

// Periyodik is formu
function setupPeriodicTaskForm() {
  const form = document.getElementById('add-task-form');
  if (!form) return;
  
  // Is tipi degistiginde periyodik alanlari g�ster/gizle
  const taskType = document.getElementById('task-type');
  if (taskType) {
    taskType.addEventListener('change', toggleTaskFields);
  }
  
  // Periyodik se�enek degistiginde detaylari g�ster/gizle
  const isRecurring = document.getElementById('is-recurring');
  if (isRecurring) {
    isRecurring.addEventListener('change', toggleRecurringOptions);
  }
}

// Is tipi degistiginde ilgili alanlari g�ster/gizle
function toggleTaskFields() {
  const taskType = document.getElementById('task-type').value;
  
  // T�m �zel alanlari gizle
  document.getElementById('roadmap-fields').style.display = 'none';
  document.getElementById('cab-fields').style.display = 'none';
  document.getElementById('periodic-options').style.display = 'none';
  
  // Se�ilen tipe g�re ilgili alanlari g�ster
  if (taskType === 'roadmap') {
    document.getElementById('roadmap-fields').style.display = 'block';
  } else if (taskType === 'cab') {
    document.getElementById('cab-fields').style.display = 'block';
  } else if (taskType === 'periodic') {
    document.getElementById('periodic-options').style.display = 'block';
  }
}

// Is tamamlama fonksiyonu - periyodik isler i�in sonraki olusturulacak
function markTaskCompleted(id) {
  if (confirm('Bu isi tamamlandi olarak isaretlemek istiyor musunuz? Bir sonraki periyodik tarih otomatik olarak olusturulacaktir.')) {
    fetch('complete-task.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Ag yaniti basarisiz');
      }
      return response.json();
    })
    .then(data => {
      if (data.success) {
        alert('Is basariyla tamamlandi olarak isaretlendi. Bir sonraki periyodik g�rev olusturuldu.');
        
        // G�r�n�r sayfalari yenile
        if (document.getElementById('dashboard-page').style.display !== 'none') {
          loadDashboardTasks();
          checkPeriodicTasks();
        }
        
        if (document.getElementById('tasks-page').style.display !== 'none') {
          loadPeriodicTasks();
        }
        
        // Takvimi yenile
        initCalendar();
      } else {
        alert('Hata: ' + (data.error || 'Bilinmeyen bir hata olustu'));
      }
    })
    .catch(error => {
      console.error('Is tamamlanirken hata:', error);
      alert('Is tamamlanirken hata olustu: ' + error.message);
    });
  }
}

// Yakin zamanli isler i�in y�kleme fonksiyonu
function loadWorkItems() {
    console.log("Loading work items");
    
    // Is �gesi tablosunu se�
    const workItemsTable = document.querySelector('#work-items-table-body');
    if (!workItemsTable) {
        console.error("Work items table not found");
        return;
    }
    
    // �rnek veriler (ger�ek veri API'si olmadigi i�in)
    const workItems = [
        {
            device: "web01.cyberwebeyeos.com",
            type: "Software Problem",
            description: "Java g�ncelleme gerekiyor",
            maker: "Ahmet Yilmaz",
            checker: "Mehmet �z",
            scope: "Lisans Yenileme/PROJE-001",
            record: "DYF-2452",
            date: "14.03.2025"
        },
        {
            device: "db02['ornek-musteri-a'].com",
            type: "Zaafiyet",
            description: "SQL y�ksek CPU kullanimi sorunu",
            maker: "Ayse Demir",
            checker: "Can Yildiz",
            scope: "Örnek Müşteri A/PROJE-004",
            record: "TM-3242",
            date: "18.03.2025"
        },
        {
            device: "app01.cyberwebeyeos.com",
            type: "PCI",
            description: "PCI DSS uyumluluk g�ncellemesi",
            maker: "Ali Demir",
            checker: "Fatma Yilmaz",
            scope: "Cyberwebeyeos/PROJE-003",
            record: "DYF-2476",
            date: "25.03.2025"
        }
    ];
    
    // Tabloya verileri ekle
    workItemsTable.innerHTML = '';
    workItems.forEach(item => {
        workItemsTable.innerHTML += `
            <tr>
                <td>${item.device}</td>
                <td>
                    <div class="detail-summary" onclick="toggleDetail(this)">
                        ${item.type} <i class="fas fa-chevron-down"></i>
                    </div>
                    <div class="detail-content" style="display: none;">
                        <p><strong>Tip:</strong> ${item.type}</p>
                        <p><strong>A�iklama:</strong> ${item.description}</p>
                    </div>
                </td>
                <td>${item.maker}</td>
                <td>${item.checker}</td>
                <td>${item.scope}</td>
                <td><a href="#" class="link-btn">${item.record}</a></td>
                <td>${item.date}</td>
                <td>
                    <button class="action-btn view-btn"><i class="fas fa-eye"></i></button>
                    <button class="action-btn edit-btn"><i class="fas fa-edit"></i></button>
                </td>
            </tr>
        `;
    });
    
    // Filtreleme event listener'larini ekle
    const searchInput = document.querySelector('#recent-works-page .search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            searchWorkItems(this.value);
        });
    }
    
    const scopeFilter = document.querySelector('#recent-works-page #scope-filter');
    if (scopeFilter) {
        scopeFilter.addEventListener('change', function() {
            filterWorkItems(this.value);
        });
    }
}

// Arama fonksiyonları - tüm alanlarda arama yapar
function setupTaskSearchListeners() {
  const periodicTasksContainer = document.getElementById('periodic-tasks');
  if (!periodicTasksContainer) return;
  
  const searchInput = periodicTasksContainer.querySelector('.search-input');
  const scopeFilter = periodicTasksContainer.querySelector('.scope-filter');
  const statusFilter = periodicTasksContainer.querySelector('.status-filter');
  
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      filterTasksTable('periodic-tasks-body', searchInput.value, scopeFilter ? scopeFilter.value : '', statusFilter ? statusFilter.value : '');
    });
  }
  
  if (scopeFilter) {
    scopeFilter.addEventListener('change', function() {
      filterTasksTable('periodic-tasks-body', searchInput ? searchInput.value : '', scopeFilter.value, statusFilter ? statusFilter.value : '');
    });
  }
  
  if (statusFilter) {
    statusFilter.addEventListener('change', function() {
      filterTasksTable('periodic-tasks-body', searchInput ? searchInput.value : '', scopeFilter ? scopeFilter.value : '', statusFilter.value);
    });
  }
}

function setupDashboardTaskSearchListeners() {
  const dashboardContainer = document.getElementById('periodic-dashboard');
  if (!dashboardContainer) return;
  
  const searchInput = dashboardContainer.querySelector('.search-input');
  const scopeFilter = dashboardContainer.querySelector('.scope-filter');
  const statusFilter = dashboardContainer.querySelector('.status-filter');
  
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      filterTasksTable('dashboard-periodic-body', searchInput.value, scopeFilter ? scopeFilter.value : '', statusFilter ? statusFilter.value : '');
    });
  }
  
  if (scopeFilter) {
    scopeFilter.addEventListener('change', function() {
      filterTasksTable('dashboard-periodic-body', searchInput ? searchInput.value : '', scopeFilter.value, statusFilter ? statusFilter.value : '');
    });
  }
  
  if (statusFilter) {
    statusFilter.addEventListener('change', function() {
      filterTasksTable('dashboard-periodic-body', searchInput ? searchInput.value : '', scopeFilter ? scopeFilter.value : '', statusFilter.value);
    });
  }
}

// Tablo filtreleme fonksiyonu - TÜM ALANLARDA ARAMA YAPAR
function filterTasksTable(tableBodyId, searchTerm, scopeFilter, statusFilter) {
  const tableBody = document.getElementById(tableBodyId);
  if (!tableBody) return;
  
  const rows = tableBody.getElementsByTagName('tr');
  searchTerm = searchTerm.toLowerCase().trim();
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const cells = row.getElementsByTagName('td');
    
    if (cells.length === 0) continue; // Skip empty rows or loading rows
    
    let matchesSearch = false;
    let matchesScope = false;
    let matchesStatus = false;
    
    // Arama terimi kontrolü - TÜM hücrelerde ara
    if (!searchTerm) {
      matchesSearch = true;
    } else {
      // Tüm hücrelerdeki metni kontrol et
      for (let j = 0; j < cells.length; j++) {
        const cellText = cells[j].textContent.toLowerCase();
        if (cellText.includes(searchTerm)) {
          matchesSearch = true;
          break;
        }
      }
    }
    
    // Scope filtresi kontrolü (genellikle 5. sütun)
    if (!scopeFilter) {
      matchesScope = true;
    } else {
      const scopeCell = cells[4]; // Scope genellikle 5. sütundadır (index 4)
      if (scopeCell && scopeCell.textContent.toLowerCase().includes(scopeFilter.toLowerCase())) {
        matchesScope = true;
      }
    }
    
    // Durum filtresi kontrolü
    if (!statusFilter) {
      matchesStatus = true;
    } else {
      const statusCell = cells[cells.length - 2]; // Durum genellikle sondan 2. sütundadır
      if (statusCell) {
        const statusText = statusCell.textContent.toLowerCase();
        if (statusFilter === 'active' && (statusText.includes('aktif') || statusText.includes('active'))) {
          matchesStatus = true;
        } else if (statusFilter === 'completed' && (statusText.includes('tamamlan') || statusText.includes('completed'))) {
          matchesStatus = true;
        }
      }
    }
    
    // Tüm filtreler eşleşiyorsa satırı göster
    if (matchesSearch && matchesScope && matchesStatus) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  }
}

// CAB Tasks için arama listener'ları
function setupCabTaskSearchListeners() {
  const cabTasksContainer = document.getElementById('cab-tasks');
  if (!cabTasksContainer) return;
  
  const searchInput = cabTasksContainer.querySelector('.search-input');
  const scopeFilter = cabTasksContainer.querySelector('.scope-filter');
  const statusFilter = cabTasksContainer.querySelector('.status-filter');
  
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      filterTasksTable('cab-tasks-body', searchInput.value, scopeFilter ? scopeFilter.value : '', statusFilter ? statusFilter.value : '');
    });
  }
  
  if (scopeFilter) {
    scopeFilter.addEventListener('change', function() {
      filterTasksTable('cab-tasks-body', searchInput ? searchInput.value : '', scopeFilter.value, statusFilter ? statusFilter.value : '');
    });
  }
  
  if (statusFilter) {
    statusFilter.addEventListener('change', function() {
      filterTasksTable('cab-tasks-body', searchInput ? searchInput.value : '', scopeFilter ? scopeFilter.value : '', statusFilter.value);
    });
  }
}

// Roadmap Tasks için arama listener'ları
function setupRoadmapTaskSearchListeners() {
  const roadmapTasksContainer = document.getElementById('roadmap-tasks');
  if (!roadmapTasksContainer) return;
  
  const searchInput = roadmapTasksContainer.querySelector('.search-input');
  const scopeFilter = roadmapTasksContainer.querySelector('.scope-filter');
  const statusFilter = roadmapTasksContainer.querySelector('.status-filter');
  
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      filterTasksTable('roadmap-tasks-body', searchInput.value, scopeFilter ? scopeFilter.value : '', statusFilter ? statusFilter.value : '');
    });
  }
  
  if (scopeFilter) {
    scopeFilter.addEventListener('change', function() {
      filterTasksTable('roadmap-tasks-body', searchInput ? searchInput.value : '', scopeFilter.value, statusFilter ? statusFilter.value : '');
    });
  }
  
  if (statusFilter) {
    statusFilter.addEventListener('change', function() {
      filterTasksTable('roadmap-tasks-body', searchInput ? searchInput.value : '', scopeFilter ? scopeFilter.value : '', statusFilter.value);
    });
  }
}
