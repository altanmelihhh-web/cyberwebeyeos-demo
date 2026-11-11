// ============================================================================
// TASKS STANDALONE - Main.js'den TAMAMEN BAĞIMSIZ
// ============================================================================

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📋 TASKS STANDALONE BAŞLATILIYOR');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const TasksStandalone = {
    allTasks: [],
    currentMonth: new Date(),
    selectedDate: null,

    // ============================================================================
    // INIT
    // ============================================================================

    init() {
        console.log('🔧 TasksStandalone.init()');
        this.loadTasks(); // Periodic işleri yükle (tablo için)
        this.loadAllTasksForCalendar(); // TÜM işleri yükle (takvim için)
        this.setupCalendar();
        this.setupTabs();
    },

    // ============================================================================
    // LOAD TASKS
    // ============================================================================

    loadTasks() {
        console.log('📥 İşler yükleniyor...');

        const tbody = document.getElementById('periodic-tasks-body');
        if (!tbody) {
            console.error('❌ periodic-tasks-body bulunamadı');
            return;
        }

        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px;">
                    <i class="fas fa-spinner fa-spin" style="color: #3498db; font-size: 2em;"></i>
                    <p style="margin-top: 10px; color: #7f8c8d;">İşler yükleniyor...</p>
                </td>
            </tr>
        `;

        fetch('get-tasks.php?type=periodic')
            .then(response => {
                if (!response.ok) throw new Error('HTTP ' + response.status);
                return response.json();
            })
            .then(tasks => {
                console.log('✅ Periodic işler alındı:', tasks.length, tasks);
                this.renderTasks(Array.isArray(tasks) ? tasks : []);
                // NOT: Takvim loadAllTasksForCalendar() tarafından yükleniyor
            })
            .catch(error => {
                console.error('❌ Yükleme hatası:', error);
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align: center; padding: 40px;">
                            <i class="fas fa-exclamation-triangle" style="color: #e74c3c; font-size: 2em;"></i>
                            <p style="margin-top: 10px; color: #e74c3c;">Hata: ${this.esc(error.message)}</p>
                        </td>
                    </tr>
                `;
            });
    },

    // ============================================================================
    // RENDER TASKS TABLE
    // ============================================================================

    renderTasks(tasks) {
        const tbody = document.getElementById('periodic-tasks-body');
        if (!tbody) return;

        if (!tasks || tasks.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px;">
                        <i class="fas fa-inbox" style="color: #95a5a6; font-size: 2em;"></i>
                        <p style="margin-top: 10px; color: #7f8c8d;">Henüz iş bulunamadı</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = '';

        tasks.forEach(task => {
            const row = document.createElement('tr');

            const statusBadge = task.status === 'completed'
                ? '<span style="background: #27ae60; color: white; padding: 3px 10px; border-radius: 4px; font-size: 0.85em; font-weight: 500;">✓ Tamamlandı</span>'
                : '<span style="background: #3498db; color: white; padding: 3px 10px; border-radius: 4px; font-size: 0.85em; font-weight: 500;">● Aktif</span>';

            row.innerHTML = `
                <td><strong>${this.esc(task.device || '-')}</strong></td>
                <td>${this.esc(task.reason || '-')}</td>
                <td>
                    <div style="margin-bottom: 5px;">${this.esc(task.description || '-')}</div>
                    <small style="color: #7f8c8d;">
                        ${task.maker ? `👤 ${this.esc(task.maker)}` : ''}
                        ${task.checker ? ` | ✓ ${this.esc(task.checker)}` : ''}
                    </small>
                </td>
                <td>${this.esc(task.dateFormatted || task.date || '-')}</td>
                <td>${statusBadge}</td>
                <td style="white-space: nowrap;">
                    <button onclick="TasksStandalone.viewTask('${this.esc(task.id)}')" class="btn-icon" title="Görüntüle" style="background: #3498db; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; margin-right: 5px;">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="TasksStandalone.editTask('${this.esc(task.id)}')" class="btn-icon" title="Düzenle" style="background: #f39c12; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; margin-right: 5px;">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="TasksStandalone.deleteTask('${this.esc(task.id)}')" class="btn-icon" title="Sil" style="background: #e74c3c; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer;">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;

            tbody.appendChild(row);
        });

        console.log('✅ Tablo render edildi:', tasks.length, 'iş');
    },

    // ============================================================================
    // CALENDAR
    // ============================================================================

    setupCalendar() {
        const prevBtn = document.getElementById('prev-month');
        const nextBtn = document.getElementById('next-month');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
                this.renderCalendar();
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
                this.renderCalendar();
            });
        }
    },

    renderCalendar() {
        console.log('📅 renderCalendar çağrıldı, this.allTasks:', this.allTasks.length);

        const calendarDates = document.getElementById('calendar-dates');
        const calendarTitle = document.getElementById('calendar-title');

        if (!calendarDates) {
            console.warn('⚠️ calendar-dates bulunamadı');
            return;
        }

        // Yükleniyor göstergesi
        calendarDates.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                <i class="fas fa-spinner fa-spin" style="color: #3498db; font-size: 2em;"></i>
                <p style="margin-top: 10px; color: #7f8c8d;">Takvim güncelleniyor...</p>
            </div>
        `;

        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth();
        const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

        if (calendarTitle) {
            calendarTitle.textContent = `${monthNames[month]} ${year}`;
        }

        // İş tarihlerini topla ve kategorize et
        const tasksByDate = new Map();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        console.log('🔍 Takvim için işler taranıyor:', this.allTasks);

        this.allTasks.forEach(task => {
            if (task.date) {
                const parts = task.date.split('-');
                if (parts.length === 3) {
                    const taskYear = parseInt(parts[0]);
                    const taskMonth = parseInt(parts[1]);
                    const taskDay = parseInt(parts[2]);

                    if (taskYear === year && taskMonth === month + 1) {
                        if (!tasksByDate.has(taskDay)) {
                            tasksByDate.set(taskDay, []);
                        }
                        tasksByDate.get(taskDay).push(task);
                    }
                }
            }
        });

        console.log(`📌 ${monthNames[month]} ${year} için toplam ${tasksByDate.size} gün işli`);

        // Takvim hesaplamaları
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay(); // 0 = Pazar
        const blanks = startingDay === 0 ? 6 : startingDay - 1; // Pazartesi başlatmak için
        const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;
        const todayDate = today.getDate();

        // Kısa bir gecikme ile takvimi render et (loading göstergesi görünsün diye)
        setTimeout(() => {
            // Takvim grid'ini temizle
            calendarDates.innerHTML = '';
            this.renderCalendarCells(calendarDates, year, month, monthNames, tasksByDate, today, todayDate, isCurrentMonth, daysInMonth, blanks);
        }, 150);
    },

    renderCalendarCells(calendarDates, year, month, monthNames, tasksByDate, today, todayDate, isCurrentMonth, daysInMonth, blanks) {
        // Boş hücreler
        for (let i = 0; i < blanks; i++) {
            const cell = document.createElement('div');
            cell.style.cssText = 'padding: 15px;';
            calendarDates.appendChild(cell);
        }

        // Günler
        for (let day = 1; day <= daysInMonth; day++) {
            const cell = document.createElement('div');
            const tasks = tasksByDate.get(day) || [];
            const hasTask = tasks.length > 0;
            const isToday = isCurrentMonth && day === todayDate;

            // Tarih nesnesini oluştur
            const cellDate = new Date(year, month, day);
            cellDate.setHours(0, 0, 0, 0);

            // İş durumlarını analiz et
            let cellClass = '';
            let cellStyle = 'padding: 15px; text-align: center; border-radius: 8px; cursor: pointer; transition: all 0.3s; min-height: 60px; display: flex; flex-direction: column; justify-content: center; align-items: center;';

            if (isToday) {
                cellStyle += ' background: #3498db; color: white; font-weight: bold; box-shadow: 0 3px 10px rgba(52, 152, 219, 0.5);';
                cellClass = 'today';
            } else if (hasTask) {
                const hasCompleted = tasks.some(t => t.status === 'completed');
                const hasActive = tasks.some(t => t.status !== 'completed');

                // Gecikmiş iş kontrolü
                const isOverdue = tasks.some(t => {
                    if (t.status === 'completed') return false;
                    return cellDate < today;
                });

                // Yaklaşan iş kontrolü (7 gün içinde)
                const daysDiff = Math.ceil((cellDate - today) / (1000 * 60 * 60 * 24));
                const isUpcoming = daysDiff >= 0 && daysDiff <= 7 && hasActive;

                if (isOverdue) {
                    cellStyle += ' background: #fadbd8; color: #c0392b; font-weight: 600; border: 2px solid #e74c3c;';
                    cellClass = 'critical';
                } else if (isUpcoming) {
                    cellStyle += ' background: #fef5e7; color: #d68910; font-weight: 600; border: 2px solid #f39c12;';
                    cellClass = 'warning';
                } else if (hasCompleted && !hasActive) {
                    cellStyle += ' background: #d5f4e6; color: #186a3b; font-weight: 500; border: 2px solid #27ae60;';
                    cellClass = 'completed';
                } else {
                    cellStyle += ' background: #ebf5fb; color: #1f618d; font-weight: 500; border: 2px solid #3498db;';
                    cellClass = 'active';
                }
            } else {
                cellStyle += ' background: #f8f9fa; color: #95a5a6;';
                cellClass = 'empty';
            }

            cell.style.cssText = cellStyle;
            cell.dataset.date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            cell.dataset.day = day;
            cell.dataset.month = month + 1;
            cell.dataset.year = year;

            cell.innerHTML = `
                <div style="font-size: 1.2em; font-weight: ${isToday ? 'bold' : '600'};">${day}</div>
                ${hasTask ? `<div style="margin-top: 5px;"><span style="background: ${isToday ? 'rgba(255,255,255,0.9)' : '#3498db'}; color: ${isToday ? '#3498db' : 'white'}; font-size: 0.75em; padding: 3px 8px; border-radius: 12px; font-weight: 600;">${tasks.length} iş</span></div>` : ''}
            `;

            // Click event
            cell.addEventListener('click', () => this.showDayTasksDetailed(year, month + 1, day, tasks));

            // Hover effects
            cell.addEventListener('mouseover', function() {
                this.style.transform = 'scale(1.08)';
                this.style.boxShadow = '0 5px 15px rgba(0,0,0,0.2)';
                this.style.zIndex = '10';
            });
            cell.addEventListener('mouseout', function() {
                this.style.transform = 'scale(1)';
                this.style.boxShadow = isToday ? '0 3px 10px rgba(52, 152, 219, 0.5)' : 'none';
                this.style.zIndex = '1';
            });

            calendarDates.appendChild(cell);
        }

        console.log('✅ Takvim render edildi:', monthNames[month], year);
    },

    showDayTasksDetailed(year, month, day, tasks) {
        const dateStr = `${day}.${String(month).padStart(2, '0')}.${year}`;
        const selectedDateSpan = document.getElementById('selected-date');
        const dateTasksList = document.getElementById('date-tasks-list');
        const addTaskBtn = document.getElementById('add-task-selected-date');

        if (selectedDateSpan) {
            selectedDateSpan.textContent = dateStr;
        }

        if (!dateTasksList) return;

        if (!tasks || tasks.length === 0) {
            dateTasksList.innerHTML = `
                <div style="text-align: center; padding: 30px;">
                    <i class="fas fa-calendar-check" style="font-size: 3em; color: #bdc3c7; margin-bottom: 15px;"></i>
                    <p style="color: #7f8c8d; font-size: 1.1em;">Bu tarihte iş bulunmuyor</p>
                </div>
            `;
            if (addTaskBtn) addTaskBtn.style.display = 'inline-block';
            return;
        }

        // İşleri listele
        let html = '<div style="display: flex; flex-direction: column; gap: 15px;">';

        tasks.forEach(task => {
            const statusBadge = task.status === 'completed'
                ? '<span style="background: #27ae60; color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.85em; font-weight: 600;"><i class="fas fa-check"></i> Tamamlandı</span>'
                : '<span style="background: #3498db; color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.85em; font-weight: 600;"><i class="fas fa-circle"></i> Aktif</span>';

            html += `
                <div style="background: white; padding: 18px; border-radius: 8px; border-left: 4px solid ${task.status === 'completed' ? '#27ae60' : '#3498db'}; box-shadow: 0 2px 6px rgba(0,0,0,0.08);">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                        <div>
                            <h5 style="margin: 0 0 8px 0; font-size: 1.1em; color: #2c3e50;">
                                <i class="fas fa-laptop" style="color: #3498db;"></i> ${this.esc(task.device || 'İş')}
                            </h5>
                            <p style="margin: 0; color: #7f8c8d; font-size: 0.95em;">
                                <strong>Sebep:</strong> ${this.esc(task.reason || '-')}
                            </p>
                        </div>
                        <div>${statusBadge}</div>
                    </div>
                    <p style="margin: 0 0 12px 0; color: #34495e; line-height: 1.5;">
                        ${this.esc(task.description || 'Açıklama yok')}
                    </p>
                    <div style="display: flex; gap: 15px; font-size: 0.9em; color: #7f8c8d; margin-bottom: 12px;">
                        ${task.maker ? `<span><i class="fas fa-user"></i> <strong>Yapan:</strong> ${this.esc(task.maker)}</span>` : ''}
                        ${task.checker ? `<span><i class="fas fa-user-check"></i> <strong>Kontrol:</strong> ${this.esc(task.checker)}</span>` : ''}
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button onclick="TasksStandalone.viewTask('${this.esc(task.id)}')" style="background: #3498db; color: white; border: none; padding: 8px 14px; border-radius: 5px; cursor: pointer; font-size: 0.9em; transition: background 0.3s;">
                            <i class="fas fa-eye"></i> Görüntüle
                        </button>
                        <button onclick="TasksStandalone.editTask('${this.esc(task.id)}')" style="background: #f39c12; color: white; border: none; padding: 8px 14px; border-radius: 5px; cursor: pointer; font-size: 0.9em; transition: background 0.3s;">
                            <i class="fas fa-edit"></i> Düzenle
                        </button>
                        <button onclick="TasksStandalone.deleteTask('${this.esc(task.id)}')" style="background: #e74c3c; color: white; border: none; padding: 8px 14px; border-radius: 5px; cursor: pointer; font-size: 0.9em; transition: background 0.3s;">
                            <i class="fas fa-trash"></i> Sil
                        </button>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        dateTasksList.innerHTML = html;

        if (addTaskBtn) addTaskBtn.style.display = 'inline-block';

        // Smooth scroll to tasks list
        const tasksForDate = document.querySelector('.tasks-for-date');
        if (tasksForDate) {
            tasksForDate.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    },

    // ============================================================================
    // TABS
    // ============================================================================

    setupTabs() {
        const tabs = document.querySelectorAll('#tasks-page .tabs .tab');
        const contents = document.querySelectorAll('#tasks-page .tab-content');

        if (!tabs.length) return;

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.getAttribute('data-tab');

                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                contents.forEach(content => {
                    if (content.id === target) {
                        content.style.display = 'block';
                        content.classList.add('active');
                    } else {
                        content.style.display = 'none';
                        content.classList.remove('active');
                    }
                });

                // Tab'a göre işleri yükle
                if (target === 'periodic-tasks') {
                    this.loadTasks();
                } else if (target === 'cab-tasks') {
                    this.loadCabTasks();
                } else if (target === 'roadmap-tasks') {
                    this.loadRoadmapTasks();
                }
            });
        });
    },

    // ============================================================================
    // CAB TASKS
    // ============================================================================

    loadCabTasks() {
        console.log('📥 CAB işleri yükleniyor...');

        const tbody = document.getElementById('cab-tasks-body');
        if (!tbody) {
            console.error('❌ cab-tasks-body bulunamadı');
            return;
        }

        fetch('get-tasks.php?type=cab')
            .then(response => {
                if (!response.ok) throw new Error('HTTP ' + response.status);
                return response.json();
            })
            .then(tasks => {
                console.log('✅ CAB işleri alındı:', tasks.length);
                this.renderCabTasks(Array.isArray(tasks) ? tasks : []);
            })
            .catch(error => {
                console.error('❌ CAB yükleme hatası:', error);
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align: center; padding: 40px;">
                            <i class="fas fa-exclamation-triangle" style="color: #e74c3c; font-size: 2em;"></i>
                            <p style="margin-top: 10px; color: #e74c3c;">Hata: ${this.esc(error.message)}</p>
                        </td>
                    </tr>
                `;
            });
    },

    renderCabTasks(tasks) {
        const tbody = document.getElementById('cab-tasks-body');
        if (!tbody) return;

        if (!tasks || tasks.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px;">
                        <i class="fas fa-inbox" style="color: #95a5a6; font-size: 2em;"></i>
                        <p style="margin-top: 10px; color: #7f8c8d;">Henüz CAB işi bulunamadı</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = '';

        tasks.forEach(task => {
            const row = document.createElement('tr');
            const statusBadge = task.status === 'completed'
                ? '<span style="background: #27ae60; color: white; padding: 3px 10px; border-radius: 4px; font-size: 0.85em;">✓ Tamamlandı</span>'
                : '<span style="background: #3498db; color: white; padding: 3px 10px; border-radius: 4px; font-size: 0.85em;">● Aktif</span>';

            const cabApproval = task.cabApproval
                ? '<span style="background: #27ae60; color: white; padding: 3px 10px; border-radius: 4px; font-size: 0.85em;">✓ Onaylandı</span>'
                : '<span style="background: #f39c12; color: white; padding: 3px 10px; border-radius: 4px; font-size: 0.85em;">⏳ Bekliyor</span>';

            row.innerHTML = `
                <td><strong>${this.esc(task.device || '-')}</strong></td>
                <td>${this.esc(task.reason || '-')}</td>
                <td>
                    <div style="margin-bottom: 5px;">${this.esc(task.description || '-')}</div>
                    <small style="color: #7f8c8d;">${cabApproval}</small>
                </td>
                <td>${this.esc(task.cabMeetingDate || '-')}</td>
                <td>${this.esc(task.dateFormatted || task.date || '-')}</td>
                <td>${statusBadge}</td>
                <td style="white-space: nowrap;">
                    <button onclick="TasksStandalone.viewTask('${this.esc(task.id)}')" class="btn-icon" title="Görüntüle" style="background: #3498db; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; margin-right: 5px;">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="TasksStandalone.editTask('${this.esc(task.id)}')" class="btn-icon" title="Düzenle" style="background: #f39c12; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; margin-right: 5px;">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="TasksStandalone.deleteTask('${this.esc(task.id)}')" class="btn-icon" title="Sil" style="background: #e74c3c; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer;">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;

            tbody.appendChild(row);
        });

        console.log('✅ CAB tablosu render edildi:', tasks.length, 'iş');
    },

    // ============================================================================
    // ROADMAP TASKS
    // ============================================================================

    loadRoadmapTasks() {
        console.log('📥 Roadmap işleri yükleniyor...');

        const tbody = document.getElementById('roadmap-tasks-body');
        if (!tbody) {
            console.error('❌ roadmap-tasks-body bulunamadı');
            return;
        }

        fetch('get-tasks.php?type=roadmap')
            .then(response => {
                if (!response.ok) throw new Error('HTTP ' + response.status);
                return response.json();
            })
            .then(tasks => {
                console.log('✅ Roadmap işleri alındı:', tasks.length);
                this.renderRoadmapTasks(Array.isArray(tasks) ? tasks : []);
            })
            .catch(error => {
                console.error('❌ Roadmap yükleme hatası:', error);
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align: center; padding: 40px;">
                            <i class="fas fa-exclamation-triangle" style="color: #e74c3c; font-size: 2em;"></i>
                            <p style="margin-top: 10px; color: #e74c3c;">Hata: ${this.esc(error.message)}</p>
                        </td>
                    </tr>
                `;
            });
    },

    renderRoadmapTasks(tasks) {
        const tbody = document.getElementById('roadmap-tasks-body');
        if (!tbody) return;

        if (!tasks || tasks.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px;">
                        <i class="fas fa-inbox" style="color: #95a5a6; font-size: 2em;"></i>
                        <p style="margin-top: 10px; color: #7f8c8d;">Henüz Roadmap işi bulunamadı</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = '';

        tasks.forEach(task => {
            const row = document.createElement('tr');
            const statusBadge = task.status === 'completed'
                ? '<span style="background: #27ae60; color: white; padding: 3px 10px; border-radius: 4px; font-size: 0.85em;">✓ Tamamlandı</span>'
                : '<span style="background: #3498db; color: white; padding: 3px 10px; border-radius: 4px; font-size: 0.85em;">● Aktif</span>';

            row.innerHTML = `
                <td><strong>${this.esc(task.project || task.device || '-')}</strong></td>
                <td>${this.esc(task.description || '-')}</td>
                <td>${this.esc(task.responsible || task.maker || '-')}</td>
                <td>${this.esc(task.startDate || task.date || '-')}</td>
                <td>${this.esc(task.endDate || '-')}</td>
                <td>${statusBadge}</td>
                <td style="white-space: nowrap;">
                    <button onclick="TasksStandalone.viewTask('${this.esc(task.id)}')" class="btn-icon" title="Görüntüle" style="background: #3498db; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; margin-right: 5px;">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="TasksStandalone.editTask('${this.esc(task.id)}')" class="btn-icon" title="Düzenle" style="background: #f39c12; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; margin-right: 5px;">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="TasksStandalone.deleteTask('${this.esc(task.id)}')" class="btn-icon" title="Sil" style="background: #e74c3c; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer;">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;

            tbody.appendChild(row);
        });

        console.log('✅ Roadmap tablosu render edildi:', tasks.length, 'iş');
    },

    // ============================================================================
    // CRUD OPERATIONS
    // ============================================================================

    viewTask(taskId) {
        console.log('👁️ Görüntüleme:', taskId);
        window.open(`view-task.php?id=${taskId}`, '_blank');
    },

    editTask(taskId) {
        console.log('✏️ Düzenleme:', taskId);

        // Önce işi al
        fetch(`get-task.php?id=${taskId}`)
            .then(response => response.json())
            .then(task => {
                if (task.error) {
                    alert('❌ İş yüklenemedi: ' + task.error);
                    return;
                }

                // Modalı aç ve formu doldur
                this.openEditModal(task);
            })
            .catch(err => {
                console.error('İş yükleme hatası:', err);
                alert('❌ İş yüklenemedi: ' + err.message);
            });
    },

    openEditModal(task) {
        console.log('📝 Edit modalı açılıyor:', task);

        // Form elemanlarını bul
        const form = document.getElementById('add-task-form');
        if (!form) {
            alert('❌ Form bulunamadı');
            return;
        }

        // Modal başlığını değiştir
        const modalTitle = document.querySelector('#add-task-modal .modal-title');
        if (modalTitle) modalTitle.textContent = 'İş Düzenle';

        // Submit buton metnini değiştir
        const submitBtn = form.querySelector('.submit-btn');
        if (submitBtn) submitBtn.textContent = 'Değişiklikleri Kaydet';

        // Form alanlarını doldur
        document.getElementById('task-type').value = task.type || 'periodic';
        document.getElementById('task-device').value = task.device || '';
        document.getElementById('task-reason').value = task.reason || '';
        document.getElementById('task-description').value = task.description || '';
        document.getElementById('task-maker').value = task.maker || '';
        document.getElementById('task-checker').value = task.checker || '';
        document.getElementById('task-record').value = task.record || '';
        document.getElementById('task-date').value = task.date || '';

        // Scope (çoklu seçim)
        const scopeSelect = document.getElementById('task-scope');
        if (scopeSelect && task.scope) {
            Array.from(scopeSelect.options).forEach(option => {
                option.selected = Array.isArray(task.scope)
                    ? task.scope.includes(option.value)
                    : task.scope === option.value;
            });
        }

        // Periyodik alan kontrolü
        if (task.type === 'periodic' && task.isRecurring) {
            const isRecurring = document.getElementById('is-recurring');
            if (isRecurring) {
                isRecurring.checked = true;
                if (typeof toggleRecurringOptions === 'function') {
                    toggleRecurringOptions();
                }
            }

            if (task.recurringInterval) {
                document.getElementById('recurring-interval').value = task.recurringInterval;
            }
            if (task.recurringUnit) {
                document.getElementById('recurring-unit').value = task.recurringUnit;
            }
            if (task.notificationDays) {
                document.getElementById('notification-days').value = task.notificationDays;
            }
            if (task.emailNotification !== undefined) {
                document.getElementById('email-notification').checked = task.emailNotification;
            }
            if (task.notificationEmail) {
                document.getElementById('notification-email').value = task.notificationEmail;
            }
        }

        // Roadmap alanları
        if (task.type === 'roadmap') {
            if (task.project) document.getElementById('task-project').value = task.project;
            if (task.responsible) document.getElementById('task-responsible').value = task.responsible;
            if (task.endDate) document.getElementById('task-end-date').value = task.endDate;
        }

        // CAB alanları
        if (task.type === 'cab') {
            if (task.cabMeetingDate) document.getElementById('task-cab-meeting-date').value = task.cabMeetingDate;
            if (task.cabApproval !== undefined) document.getElementById('task-cab-approval').value = task.cabApproval ? 'true' : 'false';
        }

        // Tipi değiştir olayını tetikle
        if (typeof toggleTaskFields === 'function') {
            toggleTaskFields();
        }

        // Edit modunu işaretle
        form.setAttribute('data-edit-mode', 'true');
        form.setAttribute('data-edit-id', task.id);

        // Modalı aç
        if (typeof openModal === 'function') {
            openModal('add-task-modal');
        }
    },

    deleteTask(taskId) {
        if (!confirm('Bu işi silmek istediğinizden emin misiniz?')) {
            return;
        }

        console.log('🗑️ Silme:', taskId);

        fetch(`delete-task.php?id=${taskId}`, { method: 'POST' })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('✅ İş başarıyla silindi');
                    this.loadTasks();
                } else {
                    alert('❌ Hata: ' + (data.error || 'Silme başarısız'));
                }
            })
            .catch(err => {
                alert('❌ Silme hatası: ' + err.message);
            });
    },

    addTask(prefilledDate = null) {
        console.log('➕ Yeni iş ekleme', prefilledDate ? `(Tarih: ${prefilledDate})` : '');

        // Modalı aç
        if (typeof openModal === 'function') {
            openModal('add-task-modal');

            // Eğer tarih verilmişse, form açıldığında doldur
            if (prefilledDate) {
                setTimeout(() => {
                    const dateInput = document.getElementById('task-date');
                    if (dateInput) {
                        dateInput.value = prefilledDate;
                    }
                }, 100);
            }
        } else {
            alert('❌ Modal sistemi bulunamadı');
        }
    },

    addTaskToSelectedDate() {
        console.log('➕ Seçili tarihe iş ekleme');

        const selectedDateSpan = document.getElementById('selected-date');
        if (!selectedDateSpan || selectedDateSpan.textContent === 'Tarih seçin') {
            alert('⚠️ Lütfen önce takvimden bir tarih seçin');
            return;
        }

        // Tarihi YYYY-MM-DD formatına çevir
        const dateText = selectedDateSpan.textContent; // "17.10.2025" formatında
        const parts = dateText.split('.');
        if (parts.length === 3) {
            const formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`; // YYYY-MM-DD
            this.addTask(formattedDate);
        } else {
            this.addTask();
        }
    },

    // Form submit sonrası çağrılacak - ilgili tab'ı yenile
    onTaskAdded() {
        console.log('✅ İş eklendi, tab yenileniyor...');

        // Aktif tab'ı bul
        const activeTab = document.querySelector('#tasks-page .tab.active');
        if (activeTab) {
            const target = activeTab.getAttribute('data-tab');

            if (target === 'periodic-tasks') {
                this.loadTasks(); // Periodic + takvim
            } else if (target === 'cab-tasks') {
                this.loadCabTasks();
                this.loadAllTasksForCalendar(); // Takvim için TÜM işleri yükle
            } else if (target === 'roadmap-tasks') {
                this.loadRoadmapTasks();
                this.loadAllTasksForCalendar(); // Takvim için TÜM işleri yükle
            }
        } else {
            // Varsayılan olarak periodic tasks'ı yükle
            this.loadTasks();
        }
    },

    // Takvim için TÜM işleri yükle (type filtresi olmadan)
    loadAllTasksForCalendar() {
        console.log('📅 Takvim için TÜM işler yükleniyor...');

        fetch('get-tasks.php') // type parametresi yok - tüm işler
            .then(response => {
                if (!response.ok) throw new Error('HTTP ' + response.status);
                return response.json();
            })
            .then(tasks => {
                console.log('✅ Takvim için işler alındı:', tasks.length);
                this.allTasks = Array.isArray(tasks) ? tasks : [];
                this.renderCalendar();
            })
            .catch(error => {
                console.error('❌ Takvim yükleme hatası:', error);
            });
    },

    // ============================================================================
    // UTILS
    // ============================================================================

    esc(text) {
        if (!text && text !== 0) return '';
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
        return String(text).replace(/[&<>"']/g, ch => map[ch]);
    }
};

// ============================================================================
// AUTO INIT
// ============================================================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => TasksStandalone.init(), 100);
    });
} else {
    setTimeout(() => TasksStandalone.init(), 100);
}

// Global export
window.TasksStandalone = TasksStandalone;
window.showAddTaskModal = () => TasksStandalone.addTask();
window.addTaskToSelectedDate = () => TasksStandalone.addTaskToSelectedDate();

console.log('✅ TasksStandalone.js yüklendi');
