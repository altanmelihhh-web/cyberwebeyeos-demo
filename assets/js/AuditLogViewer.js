(function() {
    var auditCurrentPage = 1;
    var auditTotalPages = 1;

    window.loadAuditLogs = function(page) {
        if (page) auditCurrentPage = page;
        var search = document.getElementById('audit-filter-search').value.trim();
        var category = document.getElementById('audit-filter-category').value;
        var actionType = document.getElementById('audit-filter-action-type') ? document.getElementById('audit-filter-action-type').value : '';
        var dateFrom = document.getElementById('audit-filter-date-from').value;
        var dateTo = document.getElementById('audit-filter-date-to').value;

        var params = 'action=get_logs&page=' + auditCurrentPage + '&per_page=50';
        if (search) params += '&filter_search=' + encodeURIComponent(search);
        if (category) params += '&filter_category=' + encodeURIComponent(category);
        if (actionType) params += '&filter_action_type=' + encodeURIComponent(actionType);
        if (dateFrom) params += '&filter_date_from=' + encodeURIComponent(dateFrom);
        if (dateTo) params += '&filter_date_to=' + encodeURIComponent(dateTo);

        var tbody = document.getElementById('audit-log-tbody');
        tbody.innerHTML = '<tr><td colspan="6" class="audit-empty"><i class="fas fa-spinner fa-spin"></i> Yukleniyor...</td></tr>';

        fetch('/portal/portal-audit-api.php?' + params)
            .then(function(r) { return r.json(); })
            .then(function(res) {
                if (!res.success) {
                    tbody.innerHTML = '<tr><td colspan="6" class="audit-empty"><i class="fas fa-exclamation-triangle"></i> ' + (res.error || 'Hata') + '</td></tr>';
                    return;
                }

                auditTotalPages = res.total_pages || 1;
                var logs = res.logs || [];

                if (logs.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="6" class="audit-empty"><i class="fas fa-clipboard-check"></i> Kayit bulunamadi</td></tr>';
                    document.getElementById('audit-pagination-info').textContent = 'Toplam: 0';
                    document.getElementById('audit-pagination-buttons').innerHTML = '';
                    return;
                }

                var html = '';
                for (var i = 0; i < logs.length; i++) {
                    var log = logs[i];
                    var dt = log.created_at ? new Date(log.created_at) : null;
                    var timeStr = dt ? dt.toLocaleDateString('tr-TR') + ' ' + dt.toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit', second:'2-digit'}) : '-';

                    var catClass = 'audit-cat-' + (log.category || 'system');
                    var catLabel = auditCategoryLabel(log.category);

                    var actionInfo = auditActionInfo(log.action);

                    html += '<tr>';
                    html += '<td class="audit-time">' + timeStr + '</td>';
                    html += '<td class="audit-username"><i class="fas fa-user-circle"></i> ' + escapeHtml(log.username || 'Sistem') + '</td>';
                    html += '<td><span class="audit-category-badge ' + catClass + '">' + catLabel + '</span></td>';
                    html += '<td><span class="audit-action-badge ' + actionInfo.cls + '"><i class="' + actionInfo.icon + '"></i> ' + escapeHtml(log.action || '') + '</span></td>';
                    html += '<td class="audit-detail-text" title="' + escapeHtml(log.details || '') + '">' + escapeHtml(log.details || '-') + '</td>';
                    html += '<td class="audit-ip">' + escapeHtml(log.ip_address || '-') + '</td>';
                    html += '</tr>';
                }
                tbody.innerHTML = html;

                // Pagination info
                var startItem = (auditCurrentPage - 1) * 50 + 1;
                var endItem = Math.min(auditCurrentPage * 50, res.total);
                document.getElementById('audit-pagination-info').textContent = startItem + '-' + endItem + ' / Toplam: ' + res.total;

                // Pagination buttons
                var btnHtml = '';
                btnHtml += '<button ' + (auditCurrentPage <= 1 ? 'disabled' : 'onclick="loadAuditLogs(' + (auditCurrentPage - 1) + ')"') + '><i class="fas fa-chevron-left"></i></button>';

                var startPage = Math.max(1, auditCurrentPage - 2);
                var endPage = Math.min(auditTotalPages, auditCurrentPage + 2);
                for (var p = startPage; p <= endPage; p++) {
                    btnHtml += '<button ' + (p === auditCurrentPage ? 'class="active"' : 'onclick="loadAuditLogs(' + p + ')"') + '>' + p + '</button>';
                }

                btnHtml += '<button ' + (auditCurrentPage >= auditTotalPages ? 'disabled' : 'onclick="loadAuditLogs(' + (auditCurrentPage + 1) + ')"') + '><i class="fas fa-chevron-right"></i></button>';
                document.getElementById('audit-pagination-buttons').innerHTML = btnHtml;
            })
            .catch(function(err) {
                tbody.innerHTML = '<tr><td colspan="6" class="audit-empty"><i class="fas fa-exclamation-triangle"></i> Baglanti hatasi</td></tr>';
                console.error('Audit log error:', err);
            });

        // Load stats
        fetch('/portal/portal-audit-api.php?action=get_stats')
            .then(function(r) { return r.json(); })
            .then(function(res) {
                if (res.success) {
                    document.getElementById('audit-stat-24h').textContent = res.last_24h || 0;
                    document.getElementById('audit-stat-7d').textContent = res.last_7d || 0;
                }
            })
            .catch(function() {});
    };

    window.clearAuditFilters = function() {
        document.getElementById('audit-filter-search').value = '';
        document.getElementById('audit-filter-category').value = '';
        if (document.getElementById('audit-filter-action-type')) document.getElementById('audit-filter-action-type').value = '';
        document.getElementById('audit-filter-date-from').value = '';
        document.getElementById('audit-filter-date-to').value = '';
        loadAuditLogs(1);
    };

    function auditCategoryLabel(cat) {
        var labels = {
            'auth': 'Giris/Cikis',
            'user': 'Kullanici',
            'document': 'Dokuman',
            'certificate': 'Sertifika',
            'blacklist': 'Blacklist',
            'ipam': 'IPAM',
            'task': 'Gorev',
            'settings': 'Ayarlar',
            'device': 'Cihaz',
            'backup': 'Backup',
            'f5': 'F5',
            'system': 'Sistem',
            'general': 'Genel'
        };
        return labels[cat] || cat || 'Sistem';
    }

    function auditActionInfo(action) {
        if (!action) return { cls: 'audit-action-default', icon: 'fas fa-info-circle' };
        var a = action.toLowerCase();
        if (a.indexOf('create') !== -1 || a.indexOf('add') !== -1 || a.indexOf('ekle') !== -1) {
            return { cls: 'audit-action-create', icon: 'fas fa-plus-circle' };
        }
        if (a.indexOf('update') !== -1 || a.indexOf('edit') !== -1 || a.indexOf('change') !== -1 || a.indexOf('güncelle') !== -1 || a.indexOf('password') !== -1) {
            return { cls: 'audit-action-update', icon: 'fas fa-edit' };
        }
        if (a.indexOf('delete') !== -1 || a.indexOf('remove') !== -1 || a.indexOf('sil') !== -1) {
            return { cls: 'audit-action-delete', icon: 'fas fa-trash-alt' };
        }
        if (a.indexOf('login') !== -1 || a === 'login_success') {
            return { cls: 'audit-action-login', icon: 'fas fa-sign-in-alt' };
        }
        if (a.indexOf('logout') !== -1) {
            return { cls: 'audit-action-logout', icon: 'fas fa-sign-out-alt' };
        }
        if (a.indexOf('lock') !== -1 || a.indexOf('fail') !== -1) {
            return { cls: 'audit-action-delete', icon: 'fas fa-lock' };
        }
        return { cls: 'audit-action-default', icon: 'fas fa-info-circle' };
    }

    function escapeHtml(str) {
        if (!str) return '';
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }
})();
