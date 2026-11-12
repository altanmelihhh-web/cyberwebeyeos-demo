(function() {
    var fwAuditPage = 1;
    var fwAuditTotalPages = 1;
    var fwAuditPerPage = 50;
    // Oturum olayları (login/logout): varsayılan gizli (true)
    var fwAuditHideSessions = true;

    // Firewall slug -> display name map (initFirewallAuditPage tarafından doldurulur)
    var fwNameMap = {};

    // Mevcut sayfadaki log kayitlari — detay modalindan erisim icin
    var fwAuditCurrentLogs = [];
    var fwAuditRequest = 0;

    window.loadFirewallAuditLogs = function(page) {
        var request = ++fwAuditRequest;
        if (page) fwAuditPage = page;

        var search = document.getElementById('fw-audit-search').value.trim();
        var userFilter = document.getElementById('fw-audit-user').value;
        var actionFilter = document.getElementById('fw-audit-action').value;
        var cfgpathFilter = document.getElementById('fw-audit-cfgpath').value.trim();
        var dateFrom = document.getElementById('fw-audit-date-from').value;
        var dateTo = document.getElementById('fw-audit-date-to').value;
        var fwFilter = document.getElementById('fw-audit-firewall') ? document.getElementById('fw-audit-firewall').value : '';

        var params = 'action=get_logs&page=' + fwAuditPage + '&per_page=' + fwAuditPerPage;
        if (search) params += '&search=' + encodeURIComponent(search);
        if (userFilter) params += '&user=' + encodeURIComponent(userFilter);
        if (actionFilter) params += '&action_filter=' + encodeURIComponent(actionFilter);
        if (cfgpathFilter) params += '&cfgpath=' + encodeURIComponent(cfgpathFilter);
        if (dateFrom) params += '&date_from=' + encodeURIComponent(dateFrom);
        if (dateTo) params += '&date_to=' + encodeURIComponent(dateTo);
        if (fwFilter) params += '&fw_slug=' + encodeURIComponent(fwFilter);
        params += '&hide_sessions=' + (fwAuditHideSessions ? '1' : '0');

        var tbody = document.getElementById('fw-audit-tbody');
        tbody.innerHTML = '<tr><td colspan="8" class="audit-empty"><i class="fas fa-spinner fa-spin"></i> Yukleniyor...</td></tr>';

        fetch('/portal/firewall-audit-api.php?' + params)
            .then(function(r) { return r.json(); })
            .then(function(res) {
                if (request !== fwAuditRequest) return;
                if (!res.success) {
                    tbody.innerHTML = '<tr><td colspan="8" class="audit-empty"><i class="fas fa-exclamation-triangle"></i> ' + (res.error || 'Hata olustu') + '</td></tr>';
                    return;
                }

                fwAuditTotalPages = res.total_pages || 1;
                fwAuditPage = res.page || 1;
                fwAuditCurrentLogs = res.logs || [];

                if (!res.logs || res.logs.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="8" class="audit-empty"><i class="fas fa-info-circle"></i> Kayit bulunamadi</td></tr>';
                    renderFwAuditPagination(0);
                    return;
                }

                var html = '';
                for (var i = 0; i < res.logs.length; i++) {
                    var log = res.logs[i];
                    var fwName = fwNameMap[log.fw_slug] || log.fw_slug || '-';
                    html += '<tr onclick="showFwAuditDetail(' + i + ')" title="Detayli gormek icin tiklayin">';
                    html += '<td><span class="fw-audit-user-badge" title="' + escapeHtml(log.fw_slug || '') + '"><i class="fas fa-fire-alt"></i> ' + escapeHtml(fwName) + '</span></td>';
                    html += '<td class="fw-audit-date"><i class="fas fa-clock"></i> ' + escapeHtml(log.date || '') + ' ' + escapeHtml(log.time || '') + '</td>';
                    html += '<td><span class="fw-audit-user-badge"><i class="fas fa-user"></i> ' + escapeHtml(log.user || '-') + '</span>';
                    if (log.src_ip) html += '<br><small class="fw-audit-ip">' + escapeHtml(log.src_ip) + '</small>';
                    html += '</td>';
                    html += '<td>' + renderActionBadge(log.action) + '</td>';
                    html += '<td class="fw-audit-cfgpath">' + escapeHtml(log.cfgpath || '-') + '</td>';
                    html += '<td><strong>' + escapeHtml(log.cfgobj || '-') + '</strong></td>';
                    html += '<td class="fw-audit-cfgattr">' + renderCfgAttr(log.cfgattr || '') + '</td>';
                    html += '<td class="fw-audit-msg">' + escapeHtml(log.msg || '-') + '</td>';
                    html += '</tr>';
                }
                tbody.innerHTML = html;
                renderFwAuditPagination(res.total);
            })
            .catch(function(err) {
                if (request !== fwAuditRequest) return;
                tbody.innerHTML = '<tr><td colspan="8" class="audit-empty"><i class="fas fa-exclamation-triangle"></i> Baglanti hatasi: ' + escapeHtml(err.message) + '</td></tr>';
            });
    };

    function renderActionBadge(action) {
        var cls = 'fw-action-other';
        var icon = 'fas fa-cog';
        if (action === 'Edit') { cls = 'fw-action-edit'; icon = 'fas fa-edit'; }
        else if (action === 'Add') { cls = 'fw-action-add'; icon = 'fas fa-plus'; }
        else if (action === 'Delete') { cls = 'fw-action-delete'; icon = 'fas fa-trash'; }
        else if (action === 'Move') { cls = 'fw-action-edit'; icon = 'fas fa-arrows-alt'; }
        else if (action === 'login') { cls = 'fw-action-login'; icon = 'fas fa-sign-in-alt'; }
        else if (action === 'logout') { cls = 'fw-action-logout'; icon = 'fas fa-sign-out-alt'; }
        else if (action === 'Configuration changed') { cls = 'fw-action-config'; icon = 'fas fa-save'; }
        return '<span class="fw-action-badge ' + cls + '"><i class="' + icon + '"></i> ' + escapeHtml(action || '-') + '</span>';
    }

    function renderCfgAttr(attr) {
        if (!attr) return '-';
        // Parse cfgattr format: key[old->new] key2[old->new]
        var parts = attr.split(/\s+/);
        var html = '';
        for (var i = 0; i < parts.length; i++) {
            var match = parts[i].match(/^(.+?)\[(.+?)->(.+?)\]$/);
            if (match) {
                html += '<div class="fw-attr-change">';
                html += '<span class="fw-attr-key">' + escapeHtml(match[1]) + '</span> ';
                html += '<span class="fw-attr-old">' + escapeHtml(match[2]) + '</span>';
                html += ' <i class="fas fa-arrow-right"></i> ';
                html += '<span class="fw-attr-new">' + escapeHtml(match[3]) + '</span>';
                html += '</div>';
            } else if (parts[i]) {
                html += '<div class="fw-attr-change"><span class="fw-attr-key">' + escapeHtml(parts[i]) + '</span></div>';
            }
        }
        return html || '-';
    }

    function renderFwAuditPagination(total) {
        var info = document.getElementById('fw-audit-pagination-info');
        var buttons = document.getElementById('fw-audit-pagination-buttons');

        if (total === 0) {
            info.textContent = 'Kayit yok';
            buttons.innerHTML = '';
            return;
        }

        var start = (fwAuditPage - 1) * fwAuditPerPage + 1;
        var end = Math.min(fwAuditPage * fwAuditPerPage, total);
        info.textContent = 'Toplam ' + total + ' kayit (' + start + '-' + end + ')';

        var html = '';
        html += '<button ' + (fwAuditPage <= 1 ? 'disabled' : '') + ' onclick="loadFirewallAuditLogs(1)" title="Ilk Sayfa"><i class="fas fa-angle-double-left"></i></button>';
        html += '<button ' + (fwAuditPage <= 1 ? 'disabled' : '') + ' onclick="loadFirewallAuditLogs(' + (fwAuditPage - 1) + ')"><i class="fas fa-angle-left"></i></button>';

        var startPage = Math.max(1, fwAuditPage - 2);
        var endPage = Math.min(fwAuditTotalPages, fwAuditPage + 2);
        for (var p = startPage; p <= endPage; p++) {
            html += '<button class="' + (p === fwAuditPage ? 'active' : '') + '" onclick="loadFirewallAuditLogs(' + p + ')">' + p + '</button>';
        }

        html += '<button ' + (fwAuditPage >= fwAuditTotalPages ? 'disabled' : '') + ' onclick="loadFirewallAuditLogs(' + (fwAuditPage + 1) + ')"><i class="fas fa-angle-right"></i></button>';
        html += '<button ' + (fwAuditPage >= fwAuditTotalPages ? 'disabled' : '') + ' onclick="loadFirewallAuditLogs(' + fwAuditTotalPages + ')" title="Son Sayfa"><i class="fas fa-angle-double-right"></i></button>';
        buttons.innerHTML = html;
    }

    window.initFirewallAuditPage = function() {
        // Load firewall list for dropdown
        fetch('/portal/firewall-audit-api.php?action=get_firewalls')
            .then(function(r) { return r.json(); })
            .then(function(res) {
                if (res.success && res.firewalls) {
                    var sel = document.getElementById('fw-audit-firewall');
                    if (sel) {
                        sel.innerHTML = '<option value="">Tumu (' + res.firewalls.length + ' FW)</option>';
                        for (var i = 0; i < res.firewalls.length; i++) {
                            var fw = res.firewalls[i];
                            fwNameMap[fw.slug] = fw.name;
                            var label = fw.name;
                            if (!fw.is_active) label += ' [pasif]';
                            if (!fw.has_key) label += ' [key yok]';
                            sel.innerHTML += '<option value="' + escapeHtml(fw.slug) + '">' + escapeHtml(label) + '</option>';
                        }
                    }
                }
            })
            .catch(function() {});

        // Load user list for filter dropdown
        fetch('/portal/firewall-audit-api.php?action=get_users')
            .then(function(r) { return r.json(); })
            .then(function(res) {
                if (res.success && res.users) {
                    var sel = document.getElementById('fw-audit-user');
                    // Keep first option
                    sel.innerHTML = '<option value="">Tumu</option>';
                    for (var i = 0; i < res.users.length; i++) {
                        sel.innerHTML += '<option value="' + escapeHtml(res.users[i]) + '">' + escapeHtml(res.users[i]) + '</option>';
                    }
                }
            })
            .catch(function() {});

        // Load stats
        fetch('/portal/firewall-audit-api.php?action=get_stats')
            .then(function(r) { return r.json(); })
            .then(function(res) {
                if (res.success) {
                    document.getElementById('fw-audit-stat-today').textContent = res.today || 0;
                    document.getElementById('fw-audit-stat-total').textContent = res.total || 0;
                    var configEl = document.getElementById('fw-audit-stat-config');
                    var sessionEl = document.getElementById('fw-audit-stat-session');
                    if (configEl) configEl.textContent = res.config_count || 0;
                    if (sessionEl) sessionEl.textContent = res.session_count || 0;
                }
            })
            .catch(function() {});

        // Sutun genislik resize tutamaclarini kur (bir kez)
        initFwAuditColResize();

        // Load first page
        loadFirewallAuditLogs(1);
    };

    var FW_AUDIT_COL_STORAGE_KEY = 'fwAuditColWidths_v1';

    function initFwAuditColResize() {
        var table = document.querySelector('#fw-audit-log-page .fw-audit-table');
        if (!table || table.dataset.resizeInit === '1') return;
        table.dataset.resizeInit = '1';

        var ths = table.querySelectorAll('thead th');
        if (!ths.length) return;

        // colgroup olustur (yoksa) — col genislikleri table-layout:fixed ile uygulanir
        var colgroup = table.querySelector('colgroup');
        if (!colgroup) {
            colgroup = document.createElement('colgroup');
            for (var i = 0; i < ths.length; i++) {
                colgroup.appendChild(document.createElement('col'));
            }
            table.insertBefore(colgroup, table.firstChild);
        }
        var cols = colgroup.querySelectorAll('col');

        // Kayitli genislikleri yukle
        var saved = loadFwAuditColWidths();
        for (var i = 0; i < ths.length; i++) {
            var w = saved[i];
            if (!w) {
                // th inline style width'inden fallback
                var styleW = ths[i].style.width;
                if (styleW) w = parseInt(styleW, 10);
            }
            if (w && w > 0) cols[i].style.width = w + 'px';
        }

        // Son sutun disindaki her th'e tutamac ekle
        for (var j = 0; j < ths.length - 1; j++) {
            attachFwResizeHandle(ths[j], cols, j);
        }
    }

    function attachFwResizeHandle(th, cols, idx) {
        var handle = document.createElement('div');
        handle.className = 'fw-col-resize-handle';
        handle.title = 'Surukleyerek sutun genisligini ayarla (cift tikla = sifirla)';
        th.appendChild(handle);

        // Tiklamalarin tr onclick'ine yayilmasini engelle
        handle.addEventListener('click', function(e) { e.stopPropagation(); });

        handle.addEventListener('mousedown', function(e) {
            e.preventDefault();
            e.stopPropagation();
            handle.classList.add('active');
            document.body.classList.add('fw-col-resizing');

            var startX = e.clientX;
            var startWidth = cols[idx].offsetWidth || th.offsetWidth;

            function onMove(ev) {
                var newW = Math.max(40, startWidth + (ev.clientX - startX));
                cols[idx].style.width = newW + 'px';
            }
            function onUp() {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                handle.classList.remove('active');
                document.body.classList.remove('fw-col-resizing');
                saveFwAuditColWidths(cols);
            }
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });

        // Cift tiklama: bu sutunu varsayilana sifirla
        handle.addEventListener('dblclick', function(e) {
            e.preventDefault();
            e.stopPropagation();
            cols[idx].style.width = '';
            saveFwAuditColWidths(cols);
        });
    }

    function loadFwAuditColWidths() {
        try {
            var raw = localStorage.getItem(FW_AUDIT_COL_STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) { return []; }
    }

    function saveFwAuditColWidths(cols) {
        var arr = [];
        for (var i = 0; i < cols.length; i++) {
            // Inline style'dan al, set edilmemisse bos birak
            var w = cols[i].style.width ? parseInt(cols[i].style.width, 10) : 0;
            arr.push(w);
        }
        try { localStorage.setItem(FW_AUDIT_COL_STORAGE_KEY, JSON.stringify(arr)); } catch (e) {}
    }

    // Tum sutun genisliklerini sifirlamak icin yardimci (konsol veya future buton icin)
    window.resetFwAuditColWidths = function() {
        try { localStorage.removeItem(FW_AUDIT_COL_STORAGE_KEY); } catch (e) {}
        var table = document.querySelector('#fw-audit-log-page .fw-audit-table');
        if (!table) return;
        var cols = table.querySelectorAll('colgroup col');
        for (var i = 0; i < cols.length; i++) cols[i].style.width = '';
    };

    // Session olaylarını göster/gizle toggle
    window.toggleSessionEvents = function() {
        fwAuditHideSessions = !fwAuditHideSessions;
        var btn = document.getElementById('fw-audit-session-toggle');
        var icon = document.getElementById('fw-audit-session-icon');
        var text = document.getElementById('fw-audit-session-btn-text');
        if (!btn) return;

        if (fwAuditHideSessions) {
            // Gizli durumu — nötr gri
            btn.style.background = '#ecf0f1';
            btn.style.color = '#2c3e50';
            btn.style.borderColor = '#95a5a6';
            btn.style.boxShadow = '';
            if (icon) icon.className = 'fas fa-eye-slash';
            if (text) text.textContent = 'Oturum Olaylari Gizli';
        } else {
            // Görünür durumu — aktif mavi, vurgulu
            btn.style.background = '#3498db';
            btn.style.color = '#fff';
            btn.style.borderColor = '#2874a6';
            btn.style.boxShadow = '0 2px 8px rgba(52,152,219,.4)';
            if (icon) icon.className = 'fas fa-eye';
            if (text) text.textContent = 'Oturum Olaylari Gorunur';
        }
        loadFirewallAuditLogs(1);
    };

    window.clearFwAuditFilters = function() {
        document.getElementById('fw-audit-search').value = '';
        document.getElementById('fw-audit-user').value = '';
        document.getElementById('fw-audit-action').value = '';
        document.getElementById('fw-audit-cfgpath').value = '';
        document.getElementById('fw-audit-date-from').value = '';
        document.getElementById('fw-audit-date-to').value = '';
        var fwSel = document.getElementById('fw-audit-firewall');
        if (fwSel) fwSel.value = '';
        loadFirewallAuditLogs(1);
    };

    // Excel export — mevcut filtre seti ile aynı parametreler (HTML-table .xls format)
    window.exportFwAuditExcel = function() {
        return _doExport('export_xlsx');
    };

    // CSV export (eski isim, geri uyumluluk için)
    window.exportFwAuditCsv = function() {
        return _doExport('export_csv');
    };

    function _doExport(actionName) {
        var search = document.getElementById('fw-audit-search').value.trim();
        var userFilter = document.getElementById('fw-audit-user').value;
        var actionFilter = document.getElementById('fw-audit-action').value;
        var cfgpathFilter = document.getElementById('fw-audit-cfgpath').value.trim();
        var dateFrom = document.getElementById('fw-audit-date-from').value;
        var dateTo = document.getElementById('fw-audit-date-to').value;
        var fwFilter = document.getElementById('fw-audit-firewall') ? document.getElementById('fw-audit-firewall').value : '';

        var params = 'action=' + actionName;
        if (search) params += '&search=' + encodeURIComponent(search);
        if (userFilter) params += '&user=' + encodeURIComponent(userFilter);
        if (actionFilter) params += '&action_filter=' + encodeURIComponent(actionFilter);
        if (cfgpathFilter) params += '&cfgpath=' + encodeURIComponent(cfgpathFilter);
        if (dateFrom) params += '&date_from=' + encodeURIComponent(dateFrom);
        if (dateTo) params += '&date_to=' + encodeURIComponent(dateTo);
        if (fwFilter) params += '&fw_slug=' + encodeURIComponent(fwFilter);
        params += '&hide_sessions=' + (fwAuditHideSessions ? '1' : '0');

        // Yeni window'da indir — browser default filename'i alır
        var btn = document.getElementById('fw-audit-export-btn');
        var origText = btn.querySelector('span').textContent;
        btn.querySelector('span').textContent = 'Indiriliyor...';
        btn.disabled = true;

        var url = '/portal/firewall-audit-api.php?' + params;

        // fetch ile blob, download anchor
        fetch(url)
            .then(function(r) {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                var disp = r.headers.get('Content-Disposition') || '';
                var fnameMatch = disp.match(/filename="?([^"]+)"?/);
                var filename = fnameMatch ? fnameMatch[1] : ('firewall_audit_' + Date.now() + '.csv');
                var totalRows = r.headers.get('X-Total-Rows') || '?';
                return r.blob().then(function(b) { return { blob: b, filename: filename, rows: totalRows }; });
            })
            .then(function(res) {
                var a = document.createElement('a');
                var url = URL.createObjectURL(res.blob);
                a.href = url;
                a.download = res.filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                btn.querySelector('span').textContent = '✓ ' + res.rows + ' satir';
                setTimeout(function() {
                    btn.querySelector('span').textContent = origText;
                    btn.disabled = false;
                }, 2500);
            })
            .catch(function(err) {
                btn.querySelector('span').textContent = 'Hata!';
                setTimeout(function() {
                    btn.querySelector('span').textContent = origText;
                    btn.disabled = false;
                }, 2500);
                console.error('Export error:', err);
            });
    };

    window.triggerFwAuditFetch = function() {
        var badge = document.getElementById('fw-audit-fetch-btn');
        var icon = document.getElementById('fw-audit-fetch-icon');
        var text = document.getElementById('fw-audit-fetch-text');

        if (badge.classList.contains('fetching')) return;
        badge.classList.add('fetching');
        icon.className = 'fas fa-spinner fa-spin';
        text.textContent = 'Cekiliyor...';

        fetch('/portal/firewall-audit-api.php?action=trigger_fetch')
            .then(function(r) { return r.json(); })
            .then(function(res) {
                if (res.success) {
                    icon.className = 'fas fa-check';
                    text.textContent = (res.inserted || 0) + ' yeni kayit';
                    initFirewallAuditPage();
                } else {
                    icon.className = 'fas fa-exclamation-triangle';
                    text.textContent = 'Hata!';
                }
                setTimeout(function() {
                    icon.className = 'fas fa-sync-alt';
                    text.textContent = 'Loglari Guncelle';
                    badge.classList.remove('fetching');
                }, 3000);
            })
            .catch(function() {
                icon.className = 'fas fa-exclamation-triangle';
                text.textContent = 'Baglanti hatasi';
                setTimeout(function() {
                    icon.className = 'fas fa-sync-alt';
                    text.textContent = 'Loglari Guncelle';
                    badge.classList.remove('fetching');
                }, 3000);
            });
    };

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    window.showFwAuditDetail = function(index) {
        var log = fwAuditCurrentLogs[index];
        if (!log) return;

        var modal = document.getElementById('fw-audit-detail-modal');
        if (!modal) return;

        var fwName = fwNameMap[log.fw_slug] || log.fw_slug || '-';
        var dateTime = (log.date || '') + ' ' + (log.time || '');

        // Header
        document.getElementById('fw-audit-detail-title').innerHTML =
            '<i class="fas fa-fire"></i> ' + escapeHtml(fwName) +
            ' &mdash; ' + renderActionBadge(log.action);
        document.getElementById('fw-audit-detail-subtitle').textContent =
            dateTime + (log.user ? '  \u2022  ' + log.user : '') +
            (log.src_ip ? '  \u2022  ' + log.src_ip : '');

        // Meta grid
        var metaHtml = '';
        metaHtml += '<dt>Firewall</dt><dd>' + escapeHtml(fwName) + ' <small style="color:#94a3b8;">(' + escapeHtml(log.fw_slug || '') + ')</small></dd>';
        metaHtml += '<dt>Tarih / Saat</dt><dd>' + escapeHtml(dateTime) + '</dd>';
        metaHtml += '<dt>Admin Kullanici</dt><dd>' + escapeHtml(log.user || '-') + '</dd>';
        if (log.src_ip) metaHtml += '<dt>Kaynak IP</dt><dd>' + escapeHtml(log.src_ip) + '</dd>';
        if (log.ui) metaHtml += '<dt>UI</dt><dd>' + escapeHtml(log.ui) + '</dd>';
        metaHtml += '<dt>Islem</dt><dd>' + renderActionBadge(log.action) + '</dd>';
        metaHtml += '<dt>Config Path</dt><dd style="font-family:monospace;font-size:0.88em;">' + escapeHtml(log.cfgpath || '-') + '</dd>';
        metaHtml += '<dt>Obje</dt><dd><strong>' + escapeHtml(log.cfgobj || '-') + '</strong></dd>';
        document.getElementById('fw-audit-detail-meta').innerHTML = metaHtml;

        // Changes (cfgattr)
        var changesSection = document.getElementById('fw-audit-detail-changes-section');
        if (log.cfgattr) {
            document.getElementById('fw-audit-detail-changes').innerHTML = renderCfgAttr(log.cfgattr);
            changesSection.style.display = '';
        } else {
            changesSection.style.display = 'none';
        }

        // Message
        var msgSection = document.getElementById('fw-audit-detail-msg-section');
        if (log.msg) {
            document.getElementById('fw-audit-detail-msg').textContent = log.msg;
            msgSection.style.display = '';
        } else {
            msgSection.style.display = 'none';
        }

        // Raw cfgattr
        var rawSection = document.getElementById('fw-audit-detail-raw-section');
        if (log.cfgattr) {
            document.getElementById('fw-audit-detail-raw').textContent = log.cfgattr;
            rawSection.style.display = '';
        } else {
            rawSection.style.display = 'none';
        }

        modal.style.display = 'block';
    };

    window.closeFwAuditDetail = function() {
        var modal = document.getElementById('fw-audit-detail-modal');
        if (modal) modal.style.display = 'none';
    };

    // ESC tusu ile kapat
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            var modal = document.getElementById('fw-audit-detail-modal');
            if (modal && modal.style.display === 'block') closeFwAuditDetail();
        }
    });
})();
