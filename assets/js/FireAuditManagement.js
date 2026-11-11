// Implemented by FireScope
// FireScope portal frontend — comprehensive firewall security posture platform
// Backend proxy: /portal/fireaudit-api.php → Flask :5055/api/fireaudit/*

(function() {
    'use strict';

    var FW_SLUG = (window.localStorage && localStorage.getItem('fa_fw_slug')) || 'drc-fw';
    var API_BASE = '/portal/fireaudit-api.php';
    var currentTab = 'dashboard';
    var firewallList = [];
    var policiesPage = 1;
    var policiesPerPage = 50;
    var policiesTotalPages = 1;
    var initialized = false;
    var ifaceCache = null;

    // ---------- Utilities ----------
    function faEscape(s) {
        if (s === null || s === undefined) return '';
        return String(s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
    var _esc = faEscape;

    function faSevBadge(sev) {
        var cls = 'fa-badge-low';
        if (sev === 'CRITICAL') cls = 'fa-badge-critical';
        else if (sev === 'HIGH') cls = 'fa-badge-high';
        else if (sev === 'MEDIUM') cls = 'fa-badge-medium';
        else if (sev === 'INFO') cls = 'fa-badge-info';
        return '<span class="fa-badge ' + cls + '">' + faEscape(sev || 'LOW') + '</span>';
    }

    function faActionBadge(action) {
        var cls = action === 'allow' ? 'fa-act-allow' : 'fa-act-deny';
        return '<span class="fa-act-badge ' + cls + '">' + faEscape(action) + '</span>';
    }

    function faListPreview(items, limit) {
        if (!items || items.length === 0) return '<em>-</em>';
        limit = limit || 3;
        if (items.length <= limit) return items.map(faEscape).join(', ');
        var shown = items.slice(0, limit).map(faEscape).join(', ');
        var rest = items.slice(limit).map(faEscape).join(', ');
        // <details> ile tıklanır expand
        return shown + ' <details style="display:inline" class="fa-list-more">' +
            '<summary style="display:inline;cursor:pointer;color:#3498db;font-size:.78rem;">+' +
            (items.length - limit) + ' daha</summary>' +
            '<span style="color:#5d6d7e">, ' + rest + '</span></details>';
    }

    // ---------- Professional Address/Service List Component ----------
    var listCounter = 0;

    // Item type detection — CIDR, single IP, FQDN, object name, port
    function faClassifyItem(s) {
        if (typeof s !== 'string') return { cls: 'object', icon: 'fa-cube', label: String(s) };
        if (/^\d{1,3}(\.\d{1,3}){3}\/32$/.test(s)) return { cls: 'host', icon: 'fa-server', label: s };
        if (/^\d{1,3}(\.\d{1,3}){3}\/\d{1,2}$/.test(s)) return { cls: 'subnet', icon: 'fa-network-wired', label: s };
        if (/^\d{1,3}(\.\d{1,3}){3}$/.test(s)) return { cls: 'host', icon: 'fa-server', label: s };
        if (/^(tcp|udp|icmp|sctp)\//i.test(s)) return { cls: 'svc', icon: 'fa-plug', label: s };
        if (/^fqdn:/.test(s) || /\.[a-z]/i.test(s)) return { cls: 'fqdn', icon: 'fa-globe', label: s.replace(/^fqdn:/, '') };
        if (s === 'any') return { cls: 'any', icon: 'fa-asterisk', label: 'ANY' };
        if (/^alias:/.test(s)) return { cls: 'alias', icon: 'fa-link', label: s.replace(/^alias:/, '') };
        return { cls: 'object', icon: 'fa-cube', label: s };
    }

    // Sade pill listesi — header/filter/copy YOK, sadece chip'ler
    // Modal/satır içeriği için ideal
    function faPillList(items) {
        if (!items || items.length === 0) return '<em style="color:#bdc3c7">—</em>';
        return '<div class="fa-pill-row">' + items.map(function(s) {
            var c = faClassifyItem(s);
            return '<span class="fa-pill-item fa-pill-' + c.cls + '" title="' + faEscape(s) + '">' +
                '<i class="fas ' + c.icon + '"></i> ' + faEscape(c.label) + '</span>';
        }).join('') + '</div>';
    }
    window.faPillList = faPillList;

    function faListFull(items, opts) {
        if (!items || items.length === 0) return '<em style="color:#bdc3c7">—</em>';
        opts = opts || {};
        var listId = 'fa-list-' + (++listCounter);

        function classify(s) {
            if (typeof s !== 'string') return { cls: 'object', icon: 'fa-cube', label: String(s) };
            if (/^\d{1,3}(\.\d{1,3}){3}\/32$/.test(s)) return { cls: 'host', icon: 'fa-server', label: s };
            if (/^\d{1,3}(\.\d{1,3}){3}\/\d{1,2}$/.test(s)) return { cls: 'subnet', icon: 'fa-network-wired', label: s };
            if (/^\d{1,3}(\.\d{1,3}){3}$/.test(s)) return { cls: 'host', icon: 'fa-server', label: s };
            if (/^(tcp|udp|icmp|sctp)\//i.test(s)) return { cls: 'svc', icon: 'fa-plug', label: s };
            if (/^fqdn:/.test(s) || /\.[a-z]/i.test(s)) return { cls: 'fqdn', icon: 'fa-globe', label: s.replace(/^fqdn:/, '') };
            if (s === 'any') return { cls: 'any', icon: 'fa-asterisk', label: 'ANY' };
            if (/^alias:/.test(s)) return { cls: 'alias', icon: 'fa-link', label: s.replace(/^alias:/, '') };
            return { cls: 'object', icon: 'fa-cube', label: s };
        }

        var pills = items.map(function(s) {
            var c = classify(s);
            var raw = String(s).replace(/"/g, '&quot;');
            return '<span class="fa-pill-item fa-pill-' + c.cls + '" title="' + faEscape(s) + '" data-search="' + faEscape(String(s).toLowerCase()) + '">' +
                '<i class="fas ' + c.icon + '"></i> ' + faEscape(c.label) + '</span>';
        }).join('');

        var raw_str = items.join('\n').replace(/'/g, "\\'");
        var copyBtn = '<button class="fa-list-icon-btn" onclick="navigator.clipboard.writeText(' +
            JSON.stringify(items.join('\n')).replace(/"/g, '&quot;') +
            '); this.innerHTML=\'<i class=\\\'fas fa-check\\\'></i>\'; setTimeout(()=>this.innerHTML=\'<i class=\\\'fas fa-copy\\\'></i>\',1500);" ' +
            'title="Tüm öğeleri panoya kopyala"><i class="fas fa-copy"></i></button>';

        var searchBox = items.length > 10
            ? '<input type="text" class="fa-list-search" placeholder="Filtre... (' + items.length + ' öğe arasında)" ' +
              'oninput="(function(el){var q=el.value.toLowerCase();var pills=el.parentElement.parentElement.querySelectorAll(\'.fa-pill-item\');for(var i=0;i<pills.length;i++){var d=pills[i].getAttribute(\'data-search\');pills[i].style.display=(!q||d.indexOf(q)>=0)?\'inline-flex\':\'none\';}})(this)">'
            : '';

        var counter = '<span class="fa-list-count">' + items.length + ' öğe</span>';

        var collapsed = items.length > 12 && !opts.alwaysExpanded;
        var maxHeight = opts.maxHeight || (items.length > 30 ? '180px' : 'none');

        return '<div class="fa-list-component" id="' + listId + '">' +
            '<div class="fa-list-header">' + counter + searchBox + copyBtn + '</div>' +
            '<div class="fa-list-pills' + (collapsed ? ' fa-list-collapsed' : '') + '"' +
            (maxHeight !== 'none' ? ' style="max-height:' + maxHeight + ';overflow-y:auto"' : '') +
            '>' + pills + '</div>' +
            (collapsed
                ? '<button class="fa-list-toggle" onclick="(function(b){var p=b.previousElementSibling;p.classList.toggle(\'fa-list-collapsed\');b.innerHTML=p.classList.contains(\'fa-list-collapsed\')?\'<i class=\\\'fas fa-chevron-down\\\'></i> Tümünü göster\':\'<i class=\\\'fas fa-chevron-up\\\'></i> Daralt\';})(this)"><i class="fas fa-chevron-down"></i> Tümünü göster</button>'
                : '') +
            '</div>';
    }
    window.faListFull = faListFull;

    // Rule ID formatter — slug-aware: hangi FW seçiliyse o görünür
    // "gbznet:1" → cp-gebzedc seçili iken: "gebzedc #1"
    // "gbznet:1" → cp-corludcfw seçili iken: "corludcfw #1"
    // "nat:gbznet:1" → "nat · gebzedc #1"
    function _faSlugDisplay() {
        // FW_SLUG "cp-gebzedc" → "gebzedc"
        return String(window.FW_SLUG || '').replace(/^cp-/, '').toLowerCase() || 'firewall';
    }
    var FA_RULE_KIND_COLORS = {
        access:  '#2980b9',
        nat:     '#16a085',
        threat:  '#c0392b',
        https:   '#d35400',
        appurl:  '#f39c12',
        other:   '#7f8c8d',
    };
    window.faFormatRuleId = function(rid) {
        if (!rid) return '<span class="fa-rule-badge" style="color:#95a5a6">-</span>';
        var parts = String(rid).split(':');
        var num = parts[parts.length - 1];
        // Kind: rule_id prefix'inden
        var kind = 'access', prefix = parts.length > 1 ? parts[0] : '';
        if (prefix === 'nat') kind = 'nat';
        else if (prefix === 'threat') kind = 'threat';
        else if (prefix === 'https') kind = 'https';
        else if (prefix === 'appurl') kind = 'appurl';
        var color = FA_RULE_KIND_COLORS[kind] || FA_RULE_KIND_COLORS.other;
        var slugName = _faSlugDisplay();
        var label = (kind === 'access') ? slugName : kind + ' · ' + slugName;
        return '<span class="fa-rule-badge" style="background:' + color + '20;color:' + color +
               ';padding:2px 6px;border-radius:3px;font-size:.75rem;font-weight:600;margin-right:4px;white-space:nowrap;">' +
               faEscape(label) + '</span><strong>#' + faEscape(num) + '</strong>';
    };
    window.faRuleKind = function(rid) {
        if (!rid) return 'other';
        var parts = String(rid).split(':');
        if (parts.length < 2) return 'access';
        var p = parts[0];
        if (p === 'nat') return 'nat';
        if (p === 'threat') return 'threat';
        if (p === 'https') return 'https';
        if (p === 'appurl') return 'appurl';
        return 'access';
    };

    // UTC → kullanıcı local zone (Türkiye için UTC+3). Browser Intl API ile otomatik.
    // DB'de UTC saklıyoruz (tek doğru kaynak), UI'da TR gösteriyoruz.
    window.faFormatTime = function(utc, opts) {
        if (!utc) return '-';
        opts = opts || {};
        // Kabul edilen formatlar: "2026-04-24 19:39:02" (UTC, SQL) veya "2026-04-24T19:39:02+0300" (ISO)
        var s = String(utc).trim();
        var d;
        if (s.indexOf('T') === -1 && s.indexOf(' ') > 0) {
            // "YYYY-MM-DD HH:MM:SS" → UTC kabul et
            d = new Date(s.replace(' ', 'T') + 'Z');
        } else {
            d = new Date(s);
        }
        if (isNaN(d.getTime())) return s;  // parse fail → ham göster
        var pad = function(n) { return n < 10 ? '0' + n : '' + n; };
        var str = d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()) +
                  ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
        if (opts.seconds) str += ':' + pad(d.getSeconds());
        if (opts.tzTag) {
            // TZ offset "+03"
            var off = -d.getTimezoneOffset() / 60;
            str += ' ' + (off >= 0 ? '+' : '') + pad(Math.abs(off));
        }
        return str;
    };
    // Kısa rölatif: "5 dk önce", "3 sa önce" — UTC kaynaktan local'e
    window.faRelativeTime = function(utc) {
        if (!utc) return '-';
        var s = String(utc).trim();
        var d = (s.indexOf('T') === -1 && s.indexOf(' ') > 0) ? new Date(s.replace(' ', 'T') + 'Z') : new Date(s);
        if (isNaN(d.getTime())) return s;
        var diff = (Date.now() - d.getTime()) / 1000;
        if (diff < 0) return 'gelecekte';
        if (diff < 60) return Math.floor(diff) + ' sn önce';
        if (diff < 3600) return Math.floor(diff/60) + ' dk önce';
        if (diff < 86400) return Math.floor(diff/3600) + ' sa önce';
        if (diff < 604800) return Math.floor(diff/86400) + ' gün önce';
        return faFormatTime(utc);
    };

    function faApi(action, params) {
        var qs = 'action=' + encodeURIComponent(action) + '&fw_slug=' + encodeURIComponent(FW_SLUG);
        if (params) {
            for (var k in params) {
                if (params[k] !== null && params[k] !== undefined && params[k] !== '') {
                    qs += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
                }
            }
        }
        return fetch(API_BASE + '?' + qs, { credentials: 'same-origin' })
            .then(function(r) { return r.json(); });
    }

    function faApiPost(action, params) {
        var qs = 'action=' + encodeURIComponent(action) + '&fw_slug=' + encodeURIComponent(FW_SLUG);
        if (params) {
            for (var k in params) qs += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
        }
        return fetch(API_BASE + '?' + qs, { method: 'POST', credentials: 'same-origin' })
            .then(function(r) { return r.json(); });
    }

    // ---------- Stats header ----------
    function faShowGlobalError(msg) {
        var box = document.getElementById('fa-last-sync');
        if (box) box.innerHTML = '<span style="color:#e74c3c;font-weight:600">⚠ ' + faEscape(msg) + '</span>';
        ['fa-stat-total','fa-stat-critical','fa-stat-high','fa-stat-any','fa-stat-shadow','fa-stat-cis']
            .forEach(function(id) { var el = document.getElementById(id); if (el) el.textContent = '!'; });
    }

    function loadFireAuditStats() {
        return faApi('stats').then(function(res) {
            if (!res.success) { faShowGlobalError(res.error || 'Hata'); return; }
            // Not 9: "Aktif / Toplam" gösterimi — enabled_rules + total_rules ayrı
            var enabled = res.enabled_rules;
            var total = res.total_rules || 0;
            if (enabled !== undefined && enabled !== null && enabled !== total) {
                document.getElementById('fa-stat-total').innerHTML =
                    '<strong>' + enabled + '</strong><span style="color:var(--text-muted);font-weight:400"> / ' + total + '</span>';
                document.getElementById('fa-stat-total').title = 'Aktif: ' + enabled + ' / Toplam: ' + total + ' (Devre dışı: ' + (res.disabled_rules || 0) + ')';
            } else {
                document.getElementById('fa-stat-total').textContent = total;
            }
            // Not 1e: vendor-aware sync tooltip + help panel'deki vendor label
            var VENDOR_DISPLAY = {
                'checkpoint': 'Check Point', 'fortigate': 'FortiGate', 'paloalto': 'Palo Alto',
                'cisco_asa': 'Cisco ASA', 'cisco_ios': 'Cisco IOS', 'cisco_ftd': 'Cisco FTD',
                'juniper': 'Juniper', 'huawei': 'Huawei', 'dell': 'Dell',
            };
            var vendorLabel = VENDOR_DISPLAY[res.fw_type] || (res.fw_type ? (res.fw_type.charAt(0).toUpperCase() + res.fw_type.slice(1)) : 'Firewall');
            var syncBtn = document.getElementById('fa-sync-btn');
            if (syncBtn) syncBtn.title = vendorLabel + "'den taze veri çek, tüm analizleri çalıştır";
            // Help panel vendor label span'leri
            document.querySelectorAll('#fa-vendor-label, .fa-vendor-label').forEach(function(el){ el.textContent = vendorLabel; });
            // Vendor-aware zone visibility (Not 11): CheckPoint'te native zone yok,
            // FortiGate/Palo Alto'da var. Zone-bazlı UI sadece native vendor'larda görünür.
            window.FW_HAS_ZONES = (res.fw_type === 'fortigate' || res.fw_type === 'paloalto');
            var zoneTabs = ['zone_matrix', 'implicit_trust'];
            zoneTabs.forEach(function(t) {
                var el = document.querySelector('.fa-tab[data-tab="' + t + '"]');
                if (el) el.style.display = window.FW_HAS_ZONES ? '' : 'none';
            });
            // Body class — CSS .fw-no-zones[data-fw-zones="0"] selector'ları için
            document.body.setAttribute('data-fw-zones', window.FW_HAS_ZONES ? '1' : '0');
            var sev = res.severity_breakdown || {};
            document.getElementById('fa-stat-critical').textContent = sev.CRITICAL || 0;
            document.getElementById('fa-stat-high').textContent = sev.HIGH || 0;
            document.getElementById('fa-stat-any').textContent = res.any_rules || 0;
            document.getElementById('fa-stat-shadow').textContent = res.shadow_rules || 0;
            document.getElementById('fa-last-sync').textContent = res.last_fetch ? faFormatTime(res.last_fetch, {seconds:true, tzTag:true}) : 'Henüz senkron yok';
            document.getElementById('fa-snapshot-count').textContent = res.snapshot_count || 0;
            return res;
        }).catch(function(err) { faShowGlobalError('Bağlantı: ' + err.message); });
    }

    // ---------- Trend sparkline ----------
    function loadTrendSparkline() {
        faApi('trend').then(function(res) {
            var box = document.getElementById('fa-exec-trend');
            if (!box || !res.success || !res.history || res.history.length < 2) {
                if (box) box.innerHTML = '<small style="color:#95a5a6">Trend için en az 2 kayıt gerekli (şu an ' + (res.history ? res.history.length : 0) + ')</small>';
                return;
            }
            var h = res.history;
            var scores = h.map(function(x) { return x.overall_score || 0; });
            var max = Math.max.apply(null, scores);
            var min = Math.min.apply(null, scores);
            var range = max - min || 1;
            var W = 220, H = 40;
            var step = h.length > 1 ? W / (h.length - 1) : 0;
            var pts = scores.map(function(s, i) {
                var x = i * step;
                var y = H - ((s - min) / range) * H;
                return x.toFixed(1) + ',' + y.toFixed(1);
            }).join(' ');
            var last = scores[scores.length - 1];
            var first = scores[0];
            var delta = last - first;
            var deltaCls = delta >= 0 ? 'fa-trend-up' : 'fa-trend-down';
            var deltaSym = delta >= 0 ? '▲' : '▼';
            box.innerHTML =
                '<svg width="' + W + '" height="' + H + '" style="margin-top:8px;display:block">' +
                '<polyline points="' + pts + '" fill="none" stroke="#ecf0f1" stroke-width="2"/>' +
                '</svg>' +
                '<div class="fa-trend-delta ' + deltaCls + '">' +
                deltaSym + ' ' + Math.abs(delta) + ' (son ' + h.length + ' sync)</div>';
        });
    }

    // ---------- Exceptions summary (KPI + tab badge) ----------
    function loadExceptionsSummary() {
        return faApi('ack_list').then(function(res) {
            if (!res.success) return;
            var s = res.summary || {};
            var kpi = document.getElementById('fa-kpi-exceptions');
            if (kpi) kpi.textContent = s.total || 0;
            var sub = document.getElementById('fa-kpi-exceptions-sub');
            if (sub) sub.textContent = (s.expiring_30d || 0) + ' tanesi 30 günde expire';
            var badge = document.getElementById('fa-tab-badge-exceptions');
            if (badge) {
                if (s.total > 0) {
                    badge.style.display = 'inline-block';
                    badge.textContent = s.total;
                    badge.title = (s.expiring_30d || 0) + ' tanesi 30 günde expire olacak';
                } else {
                    badge.style.display = 'none';
                }
            }
        });
    }

    // ---------- Dashboard (executive) ----------
    function loadFireAuditDashboard() {
        loadTrendSparkline();
        loadExceptionsSummary();
        load5FactorWidget();

        // Network cihaz icin KPI label'larini adapte et
        var currentFw = firewallList.find(function(f) { return f.slug === FW_SLUG; });
        var fwType = currentFw ? (currentFw.firewall_type || 'fortigate') : 'fortigate';
        var isNet = NETWORK_TYPES.indexOf(fwType) !== -1;

        // Label adaptasyonu
        var ruleLabel = document.querySelector('#fa-kpi-rules')?.parentElement?.querySelector('.fa-kpi-label');
        if (ruleLabel) ruleLabel.textContent = isNet ? 'ACL Rules' : 'Enabled / Total';
        var cisLabel = document.querySelector('#fa-kpi-cis')?.parentElement?.querySelector('.fa-kpi-label');
        if (cisLabel) cisLabel.textContent = isNet ? 'Hardening Score' : 'CIS Compliance';

        // Score card label
        var scoreLabel = document.querySelector('.fa-exec-score-label');
        if (scoreLabel) scoreLabel.textContent = isNet ? 'Hardening Grade' : 'Security Grade';

        faApi('executive').then(function(res) {
            if (!res.success) return;
            var s = res.summary || {};
            document.getElementById('fa-exec-score').textContent = s.overall_score || 0;
            var gradeEl = document.getElementById('fa-exec-grade');
            gradeEl.textContent = s.grade || '-';
            gradeEl.className = 'fa-exec-grade fa-grade-' + (s.grade || 'F').toLowerCase();

            // Score breakdown detayi (network vs firewall)
            var sd = s.score_detail || {};
            var nb = sd.net_breakdown || {};
            var trendBox = document.getElementById('fa-exec-trend');
            if (trendBox) {
                var bhtml = '';
                if (isNet && nb.mgmt_plane_penalty !== undefined) {
                    bhtml = '<div style="font-size:11px;color:var(--text-muted);margin-top:6px;">' +
                        '<i class="fas fa-chart-pie"></i> Mgmt:-' + nb.mgmt_plane_penalty + ' | Data:-' + nb.data_plane_penalty + ' | Ctrl:-' + nb.ctrl_plane_penalty + '</div>';
                } else if (nb.exposure_penalty !== undefined) {
                    bhtml = '<div style="font-size:11px;color:var(--text-muted);margin-top:6px;">' +
                        '<i class="fas fa-chart-pie"></i> Exposure:-' + nb.exposure_penalty + ' | Profile:-' + nb.profile_gap_penalty + ' | Hygiene:-' + nb.hygiene_penalty + '</div>';
                }
                if (bhtml) trendBox.insertAdjacentHTML('beforeend', bhtml);
            }
            if (trendBox && sd.delta !== undefined) {
                var deltaTxt = '';
                if (sd.delta > 0) {
                    deltaTxt = '<div style="margin-top:6px;font-size:.8rem;color:#27ae60;">' +
                        '<i class="fas fa-shield-alt"></i> Exception\'larla <strong>+' + sd.delta + ' puan</strong> kazanıldı (brüt: ' + sd.raw_score + ')</div>';
                } else if (sd.delta === 0 && (s.ack_summary && s.ack_summary.total_acked > 0)) {
                    deltaTxt = '<div style="margin-top:6px;font-size:.8rem;color:#7f8c8d;">' +
                        '<i class="fas fa-info"></i> ' + s.ack_summary.total_acked + ' ack aktif, skora etkisi yok (cap dolmuş)</div>';
                }
                if (deltaTxt) trendBox.insertAdjacentHTML('beforeend', deltaTxt);
            }

            var f = s.findings || {};
            document.getElementById('fa-kpi-critical').textContent = f.CRITICAL || 0;
            document.getElementById('fa-kpi-high').textContent = f.HIGH || 0;
            document.getElementById('fa-kpi-medium').textContent = f.MEDIUM || 0;
            document.getElementById('fa-kpi-low').textContent = f.LOW || 0;
            var c = s.compliance || {};
            document.getElementById('fa-kpi-cis').textContent = (c.percent || 0) + '%';
            document.getElementById('fa-stat-cis').textContent = c.percent || 0;
            var p = s.policies || {};
            document.getElementById('fa-kpi-rules').textContent = (p.enabled || 0) + ' / ' + (p.total || 0);

            // Categories breakdown
            var catBox = document.getElementById('fa-exec-categories');
            var byType = f.by_type || {};
            var html = '<table class="fa-table fa-table-sm"><thead><tr><th>Kategori</th><th>CRIT</th><th>HIGH</th><th>MED</th><th>LOW</th></tr></thead><tbody>';
            var labels = isNet
                ? { risk:'Risk', profile:'Hardening Gap', intelligence:'Policy Intel', topology:'Topology' }
                : { risk:'Risk Skoru', any:'ANY Kural', shadow:'Shadow', vpn:'VPN', profile:'UTM Gap', duplicate:'Duplicate', intelligence:'Policy Intel', topology:'Topology' };
            for (var t in byType) {
                var d = byType[t];
                html += '<tr><td>' + faEscape(labels[t] || t) + '</td>' +
                    '<td class="fa-cell-crit">' + (d.CRITICAL || 0) + '</td>' +
                    '<td class="fa-cell-high">' + (d.HIGH || 0) + '</td>' +
                    '<td class="fa-cell-med">' + (d.MEDIUM || 0) + '</td>' +
                    '<td>' + (d.LOW || 0) + '</td></tr>';
            }
            html += '</tbody></table>';
            catBox.innerHTML = html;

            // Top 10
            var top = s.top10_risky_rules || [];
            var box = document.getElementById('fa-top-risky');
            if (!top.length) { box.innerHTML = '<em>Henüz hesap yok.</em>'; return; }
            var th = '<table class="fa-table fa-table-sm"><thead><tr><th>#</th><th>ID</th><th>Adı</th><th>Action</th><th>Skor</th><th>Sev</th></tr></thead><tbody>';
            top.forEach(function(r, i) {
                th += '<tr><td>' + (i + 1) + '</td>' +
                    '<td><strong>' + faEscape(r.rule_id) + '</strong></td>' +
                    '<td>' + faEscape(r.name) + '</td>' +
                    '<td>' + faActionBadge(r.action) + '</td>' +
                    '<td><strong>' + r.score + '</strong></td>' +
                    '<td>' + faSevBadge(r.severity) + '</td></tr>';
            });
            th += '</tbody></table>';
            box.innerHTML = th;
        });
    }

    // ---------- Policies tab ----------
    // KPI kartlarini ve sub-tab count badge'lerini doldur (Not13 + Not14)
    // Tab acilisinda bir kez cagir; her sub-tab degisiminde tekrar cagirmaya gerek yok.
    window.loadPoliciesKpiAndCounts = function() {
        // 1) KPI kartlari — stats endpoint
        faApi('stats').then(function(res) {
            if (!res.success) return;
            var ab = res.action_breakdown || {};
            var total = res.total_rules || 0;
            var enabled = res.enabled_rules || 0;
            var setKpi = function(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; };
            setKpi('fa-pk-total', total.toLocaleString());
            setKpi('fa-pk-enabled', enabled.toLocaleString());
            setKpi('fa-pk-disabled', (total - enabled).toLocaleString());
            setKpi('fa-pk-allow', (ab.allow || 0).toLocaleString());
            setKpi('fa-pk-deny', (ab.deny || 0).toLocaleString());
            setKpi('fa-pk-any', (res.any_rules || 0).toLocaleString());
        });
        // 2) Sub-tab count badge'leri — 6 kind icin paralel sorgu (per_page=1, sadece total bilgisi)
        var kinds = ['access', 'nat', 'threat', 'threat-exception', 'https', 'appurl', ''];
        kinds.forEach(function(k) {
            faApi('policies', { rule_kind: k, per_page: 1, page: 1 }).then(function(res) {
                if (!res.success) return;
                var n = res.total || 0;
                document.querySelectorAll('#fa-rule-kind-tabs .fa-rk-cnt[data-cnt="' + k + '"]').forEach(function(el) {
                    el.textContent = n.toLocaleString();
                });
            });
        });
    };

    // Kural turu sub-tab handler — Security/NAT/Threat/HTTPS/AppURL/Tumu
    window.fireAuditPoliciesKind = function(kind) {
        var hidden = document.getElementById('fa-filter-kind');
        if (hidden) hidden.value = kind || '';
        var btns = document.querySelectorAll('#fa-rule-kind-tabs .fa-fw-btn');
        btns.forEach(function(b) {
            b.classList.toggle('active', (b.getAttribute('data-rule-kind') || '') === (kind || ''));
        });
        loadFireAuditPolicies(1);
    };

    // Zone lookup map — populated as policies load; used by risk/any/merge findings
    window._faZoneMap = window._faZoneMap || {};

    // Zone semantics: classify zone name list into a traffic tier
    function faZoneClassify(zones) {
        if (!zones || !zones.length) return 'unknown';
        var s = zones.join(',');
        if (/wan|internet|untrust|external|outside|public/i.test(s)) return 'external';
        if (/vpn|remote|ipsec|ssl\.root/i.test(s)) return 'vpn';
        if (/dmz|server|pp[_\-]?zone|pp_zone/i.test(s)) return 'dmz';
        if (/local|internal|lan|trust|inside|corporate/i.test(s)) return 'internal';
        if (/^any$/i.test(s.trim())) return 'any';
        return 'unknown';
    }

    // Zone context badge + tooltip for risk/any findings
    var _faZoneCtxMap = {
        'external:internal': { badge: 'Dış→İç',   color:'#c0392b', bg:'rgba(192,57,43,.09)',   tip:'İnternetten doğrudan iç ağa erişim — ANY burada özellikle kritik. Veri ihlali ve lateral movement riski çok yüksek.' },
        'external:dmz':      { badge: 'Dış→DMZ',  color:'#e67e22', bg:'rgba(230,126,34,.09)',  tip:'İnternetten DMZ\'e erişim — kapsam minimize edilmeli, port kısıtlaması zorunlu.' },
        'external:vpn':      { badge: 'Dış→VPN',  color:'#e67e22', bg:'rgba(230,126,34,.09)',  tip:'İnternetten VPN\'e — tünel uç noktası saldırı yüzeyi, ANY olmamalı.' },
        'external:any':      { badge: 'Dış→*',    color:'#c0392b', bg:'rgba(192,57,43,.09)',   tip:'İnternetten belirsiz hedefe — en riskli konfigürasyon, tam tanımsız.' },
        'vpn:internal':      { badge: 'VPN→İç',   color:'#8e44ad', bg:'rgba(142,68,173,.09)',  tip:'VPN tünelinden iç ağa — ANY kural tünel içindeki tüm trafiğe izin verir, minimum privilege uygulanmalı.' },
        'vpn:dmz':           { badge: 'VPN→DMZ',  color:'#8e44ad', bg:'rgba(142,68,173,.09)',  tip:'VPN\'den DMZ\'e — kapsam kısıtlanmalı.' },
        'dmz:internal':      { badge: '! DMZ→İç', color:'#c0392b', bg:'rgba(192,57,43,.09)',   tip:'DMZ\'den iç ağa — kritik pivot yönü! DMZ cihazı ele geçirilirse iç ağa doğrudan geçiş kapısı açılır.' },
        'internal:external': { badge: 'İç→Dış',   color:'#d35400', bg:'rgba(211,84,0,.09)',    tip:'İç ağdan internete — ANY servis ile veri sızdırma ve C2 iletişim riski; egress filtrelemesi uygulanmalı.' },
        'internal:dmz':      { badge: 'İç→DMZ',   color:'#16a085', bg:'rgba(22,160,133,.09)',  tip:'İç ağdan DMZ\'e — yönetim erişimi olabilir, kısıtlanabilir.' },
        'internal:vpn':      { badge: 'İç→VPN',   color:'#2980b9', bg:'rgba(41,128,185,.09)',  tip:'İç ağdan VPN tüneline — şifreli trafik, IDS görünürlüğü kısıtlı olabilir.' },
        'internal:internal': { badge: 'İç↔İç',    color:'#27ae60', bg:'rgba(39,174,96,.09)',   tip:'İç ağ laterali — ANY, micro-segmentasyon eksikliğini gösterir; east-west hareket riski.' },
        'vpn:vpn':           { badge: 'VPN↔VPN',  color:'#7f8c8d', bg:'rgba(127,140,141,.09)', tip:'VPN tüneller arası — split-tunnel veya hub-spoke trafik, kapsam kontrol edilmeli.' },
        'any:any':           { badge: 'ANY↔ANY',  color:'#c0392b', bg:'rgba(192,57,43,.09)',   tip:'Kaynak ve hedef tam belirsiz — her yönde tam erişim, mutlaka daraltılmalı.' },
    };

    function faZoneContextBadge(src_zones, dst_zones) {
        var src = faZoneClassify(src_zones);
        var dst = faZoneClassify(dst_zones);
        if (src === 'unknown' && dst === 'unknown') return '';
        var ctx = _faZoneCtxMap[src + ':' + dst] || null;
        if (!ctx) return '';
        return '<span title="' + faEscape(ctx.tip) + '" style="display:inline-block;margin-top:3px;padding:1px 7px;background:' + ctx.bg + ';color:' + ctx.color + ';border:1px solid ' + ctx.color + '33;border-radius:10px;font-size:.65rem;font-weight:700;letter-spacing:.2px;cursor:help;">' + faEscape(ctx.badge) + '</span>';
    }

    function faPrefetchZoneMap() {
        function _storePage(policies) {
            (policies || []).forEach(function(p) {
                if (p.src_zones || p.dst_zones) {
                    window._faZoneMap[String(p.rule_id)] = { src_zones: p.src_zones || [], dst_zones: p.dst_zones || [] };
                }
            });
        }
        faApi('policies', { per_page: 200, page: 1 }).then(function(res) {
            _storePage(res.policies);
            var totalPages = res.total_pages || 1;
            for (var pg = 2; pg <= totalPages; pg++) {
                (function(p) {
                    faApi('policies', { per_page: 200, page: p }).then(function(r) { _storePage(r.policies); });
                })(pg);
            }
        });
    }

    window.loadFireAuditPolicies = function(page) {
        if (page) policiesPage = page;
        var ipSearchEl = document.getElementById('fa-search-ip');
        var kindEl = document.getElementById('fa-filter-kind');
        var srcSearchEl = document.getElementById('fa-search-src');
        var dstSearchEl = document.getElementById('fa-search-dst');
        // NOT: 'action' URL paramı PHP proxy routing ile çakışır → 'action_filter' kullan
        var params = {
            page: policiesPage, per_page: policiesPerPage,
            severity: document.getElementById('fa-filter-severity').value,
            action_filter: document.getElementById('fa-filter-action').value,
            enabled: document.getElementById('fa-filter-enabled').value,
            search: document.getElementById('fa-search').value.trim(),
            search_ip: ipSearchEl ? ipSearchEl.value.trim() : '',
            search_src: srcSearchEl ? srcSearchEl.value.trim() : '',
            search_dst: dstSearchEl ? dstSearchEl.value.trim() : '',
            rule_kind: kindEl ? kindEl.value : '',
        };
        var tbody = document.getElementById('fa-policies-tbody');
        tbody.innerHTML = '<tr><td colspan="14"><i class="fas fa-spinner fa-spin"></i> Yükleniyor...</td></tr>';
        faApi('policies', params).then(function(res) {
            if (!res.success) { tbody.innerHTML = '<tr><td colspan="14">Hata: ' + faEscape(res.error || '') + '</td></tr>'; return; }
            policiesTotalPages = res.total_pages || 1;
            policiesPage = res.page || 1;
            // Populate zone map for use by risk/any/findings sections
            (res.policies || []).forEach(function(p) {
                if (p.src_zones || p.dst_zones) {
                    window._faZoneMap[String(p.rule_id)] = { src_zones: p.src_zones || [], dst_zones: p.dst_zones || [] };
                }
            });
            if (!res.policies || !res.policies.length) {
                var kindMsg = {
                    'access':  'Bu cihazda security access policy bulunamadı.',
                    'nat':     'Bu cihazda NAT kurali bulunamadi (CheckPoint NAT layer\'ini kontrol edin; bazi gateway\'lerde NAT ayri policy package\'da olabilir).',
                    'threat':  'Bu cihazda Threat / IPS kurali bulunamadi (CheckPoint IPS profilleri ayri katmanda olabilir).',
                    'threat-exception': 'Bu cihazda Threat Exception kurali bulunamadi (Trust-101 vb. — show-threat-rule-exception-rulebase ile cekilir).',
                    'https':   'Bu cihazda HTTPS Inspection kurali bulunamadi.',
                    'appurl':  'Bu cihazda App / URL Filtering kurali bulunamadi.',
                    '':        'Hicbir kural bulunamadi — sync calisti mi?',
                };
                var k = (kindEl ? kindEl.value : '') || '';
                tbody.innerHTML = '<tr><td colspan="14" style="text-align:center;padding:30px;"><em><i class="fas fa-info-circle"></i> ' + faEscape(kindMsg[k] || kindMsg['']) + '</em></td></tr>';
                renderPoliciesPagination(0);
                return;
            }
            var html = '';
            res.policies.forEach(function(p) {
                var rid = faEscape(p.rule_id);
                var ridFormatted = faFormatRuleId(p.rule_id);
                var hitCount = p.hit_count !== null && p.hit_count !== undefined ? p.hit_count.toLocaleString() : '-';
                var lastUsed = p.last_used ? faFormatTime(p.last_used) : '-';
                var commentText = p.comments ? faEscape(p.comments.substring(0,80)) : '';
                var dstZoneLabel = (p.dst_zones && p.dst_zones.length)
                    ? faPillList(p.dst_zones)
                    : '<span style="color:var(--text-muted);font-size:.75rem;">—</span>';
                var srcZoneCell = (p.src_zones && p.src_zones.length)
                    ? faPillList(p.src_zones)
                    : '<span style="color:var(--text-muted);font-size:.75rem;">—</span>';
                var zoneCtx = faZoneContextBadge(p.src_zones, p.dst_zones);
                html += '<tr class="fa-clickable-row ' + (p.enabled ? '' : 'fa-row-disabled') +
                    '" onclick="fireAuditOpenRule(\'' + rid + '\')" title="Detay için tıkla">' +
                    '<td>' + ridFormatted + '</td>' +
                    '<td>' + faEscape(p.name) + '</td>' +
                    '<td class="fa-cell-small">' + srcZoneCell + (zoneCtx ? '<br>' + zoneCtx : '') + '</td>' +
                    '<td class="fa-cell-small">' + dstZoneLabel + '</td>' +
                    '<td class="fa-cell-small">' + faListPreview(p.src_addresses) + '</td>' +
                    '<td class="fa-cell-small">' + faListPreview(p.dst_addresses) + '</td>' +
                    '<td class="fa-cell-small">' + faListPreview(p.services) + '</td>' +
                    '<td>' + faActionBadge(p.action) + '</td>' +
                    '<td>' + (p.enabled ? '<i class="fas fa-check" style="color:#27ae60"></i>' : '<i class="fas fa-times" style="color:#95a5a6"></i>') + '</td>' +
                    '<td>' + (p.logging ? '<i class="fas fa-check" style="color:#27ae60"></i>' : '<i class="fas fa-times" style="color:#e67e22"></i>') + '</td>' +
                    '<td style="text-align:right;font-variant-numeric:tabular-nums;">' + hitCount + '</td>' +
                    '<td class="fa-cell-small" style="font-size:.75rem;color:#5d6d7e;">' + lastUsed + '</td>' +
                    '<td class="fa-cell-small" title="' + faEscape(p.comments || '') + '">' + commentText + '</td>' +
                    '<td>' + faSevBadge(p.severity) + ' <small>' + (p.score || 0) + '</small></td></tr>';
            });
            tbody.innerHTML = html;
            renderPoliciesPagination(res.total);
        });
    };

    function renderPoliciesPagination(total) {
        var info = document.getElementById('fa-pagination-info');
        var buttons = document.getElementById('fa-pagination-buttons');
        if (total === 0) { info.textContent = 'Kayıt yok'; buttons.innerHTML = ''; return; }
        var start = (policiesPage - 1) * policiesPerPage + 1;
        var end = Math.min(policiesPage * policiesPerPage, total);
        info.textContent = 'Toplam ' + total + ' kural (' + start + '-' + end + ')';
        var html = '<button ' + (policiesPage <= 1 ? 'disabled' : '') + ' onclick="loadFireAuditPolicies(1)">«</button>';
        html += '<button ' + (policiesPage <= 1 ? 'disabled' : '') + ' onclick="loadFireAuditPolicies(' + (policiesPage - 1) + ')">‹</button>';
        var startP = Math.max(1, policiesPage - 2);
        var endP = Math.min(policiesTotalPages, policiesPage + 2);
        for (var p = startP; p <= endP; p++) {
            html += '<button class="' + (p === policiesPage ? 'active' : '') + '" onclick="loadFireAuditPolicies(' + p + ')">' + p + '</button>';
        }
        html += '<button ' + (policiesPage >= policiesTotalPages ? 'disabled' : '') + ' onclick="loadFireAuditPolicies(' + (policiesPage + 1) + ')">›</button>';
        html += '<button ' + (policiesPage >= policiesTotalPages ? 'disabled' : '') + ' onclick="loadFireAuditPolicies(' + policiesTotalPages + ')">»</button>';
        buttons.innerHTML = html;
    }

    window.fireAuditClearFilters = function() {
        ['fa-search','fa-search-ip','fa-search-src','fa-search-dst','fa-filter-severity','fa-filter-action','fa-filter-kind','fa-filter-enabled'].forEach(function(id) {
            var el = document.getElementById(id); if (el) el.value = '';
        });
        loadFireAuditPolicies(1);
    };

    // ---------- Kurallar sub-tab (Policy / Central NAT) ----------
    var _kuralSubActive = 'policy';

    window.fireAuditKuralSubTab = function(sub) {
        _kuralSubActive = sub;
        document.querySelectorAll('#fa-kural-sub-tabs .fa-sub-btn').forEach(function(b) {
            b.classList.toggle('active', b.getAttribute('data-kural-sub') === sub);
        });
        ['policy', 'central_nat'].forEach(function(s) {
            var el = document.getElementById('fa-kural-sub-' + s);
            if (el) el.style.display = (s === sub) ? '' : 'none';
        });
        if (sub === 'policy') {
            loadFireAuditPolicies(1);
        } else if (sub === 'central_nat') {
            loadCentralNat(1);
        }
    };

    // ---------- Central NAT ----------
    var _cnatPage = 1;
    var _cnatTotalPages = 1;
    var _cnatPerPage = 50;

    // Merkezi render helper — kurallar ve VPN sayfası için ortak
    window._renderCnatRows = function(rules, tbodyId) {
        var tbody = document.getElementById(tbodyId);
        if (!tbody) return;
        if (!rules.length) {
            tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:30px;"><em><i class="fas fa-info-circle"></i> Bu cihazda Central NAT kuralı bulunamadı. Sync çalıştırdınız mı?</em></td></tr>';
            return;
        }
        var html = '';
        rules.forEach(function(r, idx) {
            var mainId = tbodyId + '_row_' + idx;
            var detId  = tbodyId + '_det_' + idx;
            var statusIcon = r.status === 'enable'
                ? '<i class="fas fa-check" style="color:#27ae60"></i>'
                : '<i class="fas fa-times" style="color:#95a5a6"></i>';
            var poolHtml = r.nat_ippool && r.nat_ippool.length
                ? faListPreview(r.nat_ippool)
                : '<em style="color:#95a5a6">Arayüz IP</em>';
            var tunnels = r.related_tunnels || [];
            var tunnelBadges = tunnels.length
                ? tunnels.map(function(t) {
                    return '<span style="font-size:.68rem;padding:1px 6px;border-radius:3px;background:rgba(243,156,18,.15);color:#d68910;border:1px solid rgba(243,156,18,.3);margin:1px;display:inline-block"><i class="fas fa-lock"></i> ' + faEscape(t) + '</span>';
                  }).join(' ')
                : '<em style="color:#95a5a6;font-size:.75rem">—</em>';

            html += '<tr id="' + mainId + '" class="fa-clickable-row" onclick="window._toggleCnatDetail(\'' + mainId + '\',\'' + detId + '\')" style="cursor:pointer;">' +
                '<td><i class="fas fa-chevron-right fa-cnat-chev" style="font-size:.7rem;color:#95a5a6;margin-right:4px;transition:transform .15s"></i><strong>' + faEscape(r.rule_id) + '</strong></td>' +
                '<td>' + statusIcon + '</td>' +
                '<td class="fa-cell-small">' + faListPreview(r.src_intf) + '</td>' +
                '<td class="fa-cell-small">' + faListPreview(r.dst_intf) + '</td>' +
                '<td class="fa-cell-small">' + faListPreview(r.orig_addr) + '</td>' +
                '<td class="fa-cell-small">' + faListPreview(r.dst_addr) + '</td>' +
                '<td class="fa-cell-small">' + poolHtml + '</td>' +
                '<td>' + faEscape(r.protocol) + '</td>' +
                '<td>' + (r.nat_port ? faEscape(r.nat_port) : '<em style="color:#95a5a6">-</em>') + '</td>' +
                '<td class="fa-cell-small" style="font-size:.75rem;color:#5d6d7e;">' + faEscape((r.comments || '').substring(0, 60)) + '</td>' +
                '<td class="fa-cell-small">' + tunnelBadges + '</td>' +
                '</tr>';

            // Detail row
            var tunnelDetailHtml = tunnels.length
                ? tunnels.map(function(t) {
                    return '<div style="padding:2px 0;border-bottom:1px solid var(--border-color);font-size:.82rem;"><i class="fas fa-lock" style="color:#e67e22;margin-right:4px"></i>' + faEscape(t) + '</div>';
                  }).join('')
                : '<em style="color:#95a5a6">Bu NAT kuralına eşleşen IPsec tüneli bulunamadı</em>';

            var detHtml =
                '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;padding:12px 16px;">' +
                  _cnatDetailCard('Kural ID', r.rule_id) +
                  _cnatDetailCard('Durum', r.status === 'enable' ? '<span style="color:#27ae60">Aktif</span>' : '<span style="color:#e74c3c">Pasif</span>') +
                  _cnatDetailCard('Kaynak Arayüz', r.src_intf.join(', ') || 'any') +
                  _cnatDetailCard('Hedef Arayüz', r.dst_intf.join(', ') || 'any') +
                  _cnatDetailCard('Protokol', r.protocol) +
                  _cnatDetailCard('NAT Port', r.nat_port || 'any') +
                  _cnatDetailCardList('Kaynak Adres (orig-addr)', r.orig_addr) +
                  _cnatDetailCardList('Hedef Adres (dst-addr)', r.dst_addr) +
                  _cnatDetailCardList('NAT Havuzu (nat-ippool)', r.nat_ippool.length ? r.nat_ippool : ['— Arayüz IP kullanılıyor —']) +
                  (r.comments ? _cnatDetailCard('Yorum', r.comments) : '') +
                  '<div style="background:var(--card-bg);border:1px solid rgba(243,156,18,.4);border-radius:6px;padding:10px 12px;grid-column:1/-1">' +
                    '<div style="font-size:.72rem;color:#d68910;text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px;"><i class="fas fa-lock"></i> İlgili IPsec Tünelleri (' + tunnels.length + ')</div>' +
                    '<div style="max-height:120px;overflow:auto;">' + tunnelDetailHtml + '</div>' +
                  '</div>' +
                '</div>';

            html += '<tr id="' + detId + '" style="display:none;">' +
                '<td colspan="11" style="padding:0;background:var(--bg-secondary,#f8f9fa);border-bottom:2px solid var(--border-color);">' +
                detHtml + '</td></tr>';
        });
        tbody.innerHTML = html;
    };

    window._toggleCnatDetail = function(mainId, detId) {
        var det = document.getElementById(detId);
        var chev = document.querySelector('#' + mainId + ' .fa-cnat-chev');
        if (!det) return;
        var open = det.style.display !== 'none';
        det.style.display = open ? 'none' : '';
        if (chev) chev.style.transform = open ? '' : 'rotate(90deg)';
    };

    function _cnatDetailCard(label, value) {
        return '<div style="background:var(--card-bg);border:1px solid var(--border-color);border-radius:6px;padding:10px 12px;">' +
            '<div style="font-size:.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px;">' + faEscape(label) + '</div>' +
            '<div style="font-weight:600;">' + value + '</div>' +
            '</div>';
    }

    function _cnatDetailCardList(label, arr) {
        var items = (arr || []).map(function(x) {
            return '<div style="padding:2px 0;border-bottom:1px solid var(--border-color);font-size:.82rem;">' + faEscape(x) + '</div>';
        }).join('');
        return '<div style="background:var(--card-bg);border:1px solid var(--border-color);border-radius:6px;padding:10px 12px;">' +
            '<div style="font-size:.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px;">' + faEscape(label) + '</div>' +
            '<div style="max-height:150px;overflow:auto;">' + (items || '<em style="color:#95a5a6">-</em>') + '</div>' +
            '</div>';
    }

    window.loadCentralNat = function(page) {
        if (page) _cnatPage = page;
        var params = {
            page: _cnatPage,
            per_page: _cnatPerPage,
            search: (document.getElementById('fa-cnat-search') || {}).value || '',
            status: (document.getElementById('fa-cnat-status') || {}).value || '',
        };
        var tbody = document.getElementById('fa-cnat-tbody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="10"><i class="fas fa-spinner fa-spin"></i> Yükleniyor...</td></tr>';
        faApi('central_nat', params).then(function(res) {
            if (!res.success) {
                tbody.innerHTML = '<tr><td colspan="10">Hata: ' + faEscape(res.error || 'Bilinmiyor') + '</td></tr>';
                return;
            }
            _cnatTotalPages = res.total_pages || 1;
            _cnatPage = res.page || 1;
            _renderCnatRows(res.rules || [], 'fa-cnat-tbody');
            _renderCnatPagination(res.total);
        });
    };

    function _renderCnatPagination(total) {
        var info = document.getElementById('fa-cnat-pagination-info');
        var buttons = document.getElementById('fa-cnat-pagination-buttons');
        if (!info || !buttons) return;
        if (!total) { info.textContent = 'Kayıt yok'; buttons.innerHTML = ''; return; }
        var start = (_cnatPage - 1) * _cnatPerPage + 1;
        var end = Math.min(_cnatPage * _cnatPerPage, total);
        info.textContent = 'Toplam ' + total + ' kural (' + start + '-' + end + ')';
        var html = '<button ' + (_cnatPage <= 1 ? 'disabled' : '') + ' onclick="loadCentralNat(1)">«</button>';
        html += '<button ' + (_cnatPage <= 1 ? 'disabled' : '') + ' onclick="loadCentralNat(' + (_cnatPage - 1) + ')">‹</button>';
        var startP = Math.max(1, _cnatPage - 2), endP = Math.min(_cnatTotalPages, _cnatPage + 2);
        for (var p = startP; p <= endP; p++) {
            html += '<button class="' + (p === _cnatPage ? 'active' : '') + '" onclick="loadCentralNat(' + p + ')">' + p + '</button>';
        }
        html += '<button ' + (_cnatPage >= _cnatTotalPages ? 'disabled' : '') + ' onclick="loadCentralNat(' + (_cnatPage + 1) + ')">›</button>';
        html += '<button ' + (_cnatPage >= _cnatTotalPages ? 'disabled' : '') + ' onclick="loadCentralNat(' + _cnatTotalPages + ')">»</button>';
        buttons.innerHTML = html;
    }

    // ---------- App/URL Rules tab (CheckPoint Application Control layer) ----------
    function loadAppRules() {
        var tbody = document.getElementById('fa-app-rules-tbody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="10"><i class="fas fa-spinner fa-spin"></i> Yükleniyor...</td></tr>';
        faApi('policies', { rule_kind: 'appurl', per_page: 500, page: 1 }).then(function(res) {
            if (!res.success) { tbody.innerHTML = '<tr><td colspan="10">Hata: ' + faEscape(res.error || '') + '</td></tr>'; return; }
            var pols = res.policies || [];
            if (!pols.length) {
                tbody.innerHTML = '<tr><td colspan="10"><em>Bu firewall\'da Application/URL rule yok.</em></td></tr>';
                return;
            }
            var html = '';
            pols.forEach(function(p) {
                var rid = faEscape(p.rule_id);
                var hitCount = p.hit_count !== null && p.hit_count !== undefined ? p.hit_count.toLocaleString() : '-';
                var lastUsed = p.last_used ? faFormatTime(p.last_used) : '-';
                html += '<tr class="fa-clickable-row ' + (p.enabled ? '' : 'fa-row-disabled') +
                    '" onclick="fireAuditOpenRule(\'' + rid + '\')">' +
                    '<td>' + faFormatRuleId(p.rule_id) + '</td>' +
                    '<td>' + faEscape(p.name) + '</td>' +
                    '<td class="fa-cell-small">' + faListPreview(p.src_addresses) + '</td>' +
                    '<td class="fa-cell-small">' + faListPreview(p.dst_addresses) + '</td>' +
                    '<td class="fa-cell-small" title="' + faEscape((p.services||[]).join(', ')) + '">' + faListPreview(p.services) + '</td>' +
                    '<td>' + faActionBadge(p.action) + '</td>' +
                    '<td>' + (p.enabled ? '<i class="fas fa-check" style="color:#27ae60"></i>' : '<i class="fas fa-times" style="color:#95a5a6"></i>') + '</td>' +
                    '<td style="text-align:right;font-variant-numeric:tabular-nums;">' + hitCount + '</td>' +
                    '<td class="fa-cell-small" style="font-size:.72rem;">' + lastUsed + '</td>' +
                    '<td class="fa-cell-small" title="' + faEscape(p.comments || '') + '">' + faEscape((p.comments||'').substring(0,60)) + '</td>' +
                    '</tr>';
            });
            tbody.innerHTML = html;
        });
    }
    window.loadAppRules = loadAppRules;

    // ---- Unused in Rules — CheckPoint SmartConsole "Rules Cleanup" raporu ----
    var _faUnusedCache = null;
    var _faUnusedKind = 'all';
    window.loadUnusedInRules = function(kind) {
        if (kind) _faUnusedKind = kind;
        document.querySelectorAll('#fa-tab-unused_in_rules .fa-filters .fa-mode-btn').forEach(function(b){
            b.classList.toggle('active', b.getAttribute('data-kind') === _faUnusedKind);
        });
        var tbody = document.getElementById('fa-unused-in-rules-tbody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="20"><i class="fas fa-spinner fa-spin"></i> Yükleniyor...</td></tr>';
        var params = {};
        if (_faUnusedKind !== 'all') params.rule_kind = _faUnusedKind;
        faApi('unused_in_rules', params).then(function(res) {
            if (!res.success) {
                if (tbody) tbody.innerHTML = '<tr><td colspan="20" style="color:#e74c3c">Hata: ' + faEscape(res.error || '') + '</td></tr>';
                return;
            }
            _faUnusedCache = res;
            // Başlık banner slug ve analiz periyodu
            var titleEl = document.getElementById('fa-sc-title-slug');
            if (titleEl) titleEl.textContent = _faSlugDisplay().toUpperCase();
            // Policy adı — slug'dan CheckPoint paket adını türet
            var policyEl = document.getElementById('fa-sc-policy-name');
            if (policyEl) policyEl.textContent = _faSCPolicyName();
            var periodEl = document.getElementById('fa-sc-analysis-period');
            if (periodEl) {
                var ap = res.analysis_period || {};
                var fromStr = ap.from ? _faSCShortDate(ap.from) : '—';
                var toStr   = ap.to   ? _faSCShortDate(ap.to)   : '—';
                var daysLog = ap.days_with_logs || 0;
                // "logs from 19-Jan-2026 to 20-Apr-2026 (days without logs: 2 | days with logs: 89)"
                var spanDays = 0;
                if (ap.from && ap.to) {
                    var df = new Date(ap.from), dt = new Date(ap.to);
                    if (!isNaN(df) && !isNaN(dt)) spanDays = Math.max(0, Math.round((dt - df) / 86400000));
                }
                var daysWithout = Math.max(0, spanDays - daysLog);
                periodEl.innerHTML = 'The analysis is based on logs from <strong>' + fromStr +
                    '</strong> to <strong>' + toStr + '</strong> (days without logs: <strong>' + daysWithout +
                    ' days</strong> | days with logs: <strong>' + daysLog + ' days</strong>).';
            }
            var sum = document.getElementById('fa-unused-in-rules-summary');
            if (sum) {
                if (res.log_hits_available) {
                    sum.innerHTML = '<strong>' + res.total_used_rules + '</strong> kullanılan kural · <strong>' +
                        res.total_unused_objects + '</strong> obje hiç hit almadı · log analizi <strong style="color:#27ae60">aktif</strong>';
                } else {
                    sum.innerHTML = '<strong>' + res.total_used_rules + '</strong> kullanılan kural · ' +
                        '<span style="color:#e67e22"><i class="fas fa-exclamation-circle"></i> obje-seviye hit log analizi bekliyor (Sprint 3)</span>';
                }
            }
            // Pending uyarı banner — log feed yoksa görünür
            var warnEl = document.getElementById('fa-sc-warn-pending');
            if (warnEl) warnEl.style.display = res.log_hits_available ? 'none' : 'block';
            _faRenderUnusedInRules();
        });
    };

    function _faSCPolicyName() {
        // slug → CheckPoint paket adı mapping (SLUG_CONFIG analog)
        var slug = FW_SLUG || '';
        var map = {
            'cp-gebzedc':   'GebzeDcNew.W',
            'cp-corludcfw': 'GebzeDcNew.W',
            'cp-cpintfw':   'INTERNETFW.W',
            'cp-corluintfw':'INTERNETFW.W',
            'cp-cpapt01':   'CHECKAPT_Rule.W',
        };
        return map[slug] || slug.toUpperCase();
    }
    function _faSCShortDate(s) {
        // "2026-04-20 03:45:12" → "20-Apr-2026"
        if (!s) return '—';
        var d = (String(s).indexOf('T') === -1 && String(s).indexOf(' ') > 0)
              ? new Date(String(s).replace(' ','T')+'Z')
              : new Date(s);
        if (isNaN(d.getTime())) return s;
        var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        var dd = d.getDate(); if (dd < 10) dd = '0'+dd;
        return dd + '-' + months[d.getMonth()] + '-' + d.getFullYear();
    }

    function _faSCObjCell(detailedItems, logAvailable) {
        // SmartConsole "Cloudflare Services (0%)" stili — log feed varsa real %, yoksa placeholder
        if (!detailedItems || !detailedItems.length) return '<em style="color:#95a5a6">Any</em>';
        return '<div class="fa-sc-cell-objs">' + detailedItems.map(function(o) {
            var name = (typeof o === 'string') ? o : o.name;
            var pct  = (typeof o === 'object' && o.pct !== null && o.pct !== undefined) ? o.pct : null;
            var unused = (typeof o === 'object') ? o.unused : null;
            var hits = (typeof o === 'object') ? o.hits : null;
            var pctHtml;
            if (pct !== null) {
                var cls = unused ? 'fa-sc-pct' : 'fa-sc-pct-ok';
                pctHtml = '<span class="' + cls + '" title="' + (hits||0) + ' hit">(' + pct + '%)</span>';
            } else if (logAvailable === false) {
                pctHtml = '<span class="fa-sc-pct-pending" title="Connection log analizi bekleniyor (Sprint 3)">(—)</span>';
            } else {
                pctHtml = '<span class="fa-sc-pct-pending">(—)</span>';
            }
            var nameHtml = unused === true
                ? '<span class="fa-sc-obj-unused"><i class="fas fa-exclamation-triangle"></i> ' + faEscape(name) + '</span>'
                : faEscape(name);
            return '<span class="fa-sc-obj">' + nameHtml + ' ' + pctHtml + '</span>';
        }).join('') + '</div>';
    }

    function _faSCActionCell(a) {
        if (!a) return '<em>-</em>';
        var cls = 'fa-sc-action-' + String(a).toLowerCase();
        return '<span class="' + cls + '">' + faEscape(a) + '</span>';
    }

    function _faSCFilterRules(rules, needle) {
        if (!needle) return rules;
        var q = needle.toLowerCase();
        return rules.filter(function(r) {
            var hay = [r.rule_id, r.name, r.comments, r.last_modifier, r.creator].join(' ').toLowerCase();
            if (hay.indexOf(q) >= 0) return true;
            var all = (r.src||[]).concat(r.dst||[]).concat(r.services||[]);
            for (var i=0; i<all.length; i++) {
                if (String(all[i]).toLowerCase().indexOf(q) >= 0) return true;
            }
            return false;
        });
    }

    function _faRenderUnusedInRules() {
        if (!_faUnusedCache) return;
        var tbody = document.getElementById('fa-unused-in-rules-tbody');
        if (!tbody) return;
        var searchEl = document.getElementById('fa-unused-search');
        var q = searchEl ? searchEl.value.trim() : '';
        var rules = _faSCFilterRules(_faUnusedCache.by_rule || [], q);
        var logAvailable = !!_faUnusedCache.log_hits_available;
        if (!rules.length) {
            tbody.innerHTML = '<tr><td colspan="20" style="text-align:center;padding:20px;"><em>Eşleşen kullanılan (hit alan) kural yok — filtreyi değiştir.</em></td></tr>';
            return;
        }
        var html = '';
        rules.forEach(function(r) {
            var installOn = (r.install_on && r.install_on.length) ? r.install_on.join(', ') : 'Policy Targets';
            var comments  = r.comments || '';
            var commentsShort = comments.length > 60 ? comments.substring(0, 60) + '…' : comments;
            // Source/Dest/Service hücreleri için detailed listeyi tercih et (log feed yoksa fallback raw)
            var srcD = r.src_detailed || r.src || [];
            var dstD = r.dst_detailed || r.dst || [];
            var svcD = r.svc_detailed || r.services || [];
            // Rule total hit display + tooltip
            var ruleHit = r.hit_count || 0;
            var ruleHitCls = ruleHit === 0 ? 'fa-sc-count-zero' : '';
            // Rule-seviye yüzde (kural bütünü için, dağılım yok)
            var rulePct = logAvailable && ruleHit > 0 ? '100%' :
                          (ruleHit === 0 ? '0%' : '<span class="fa-sc-pct-pending">—</span>');
            // Eğer log feed varsa ve unused_count varsa rıdge highlight
            var rowClass = (r.unused_count > 0) ? 'fa-sc-row-has-unused' : '';
            html += '<tr class="fa-clickable-row ' + rowClass + '" onclick="fireAuditOpenRule(\'' + faEscape(r.rule_id) + '\')">' +
                '<td><strong>' + faEscape(r.rule_no || '') + '</strong></td>' +
                '<td>' + faEscape(r.name || '-') +
                    (r.unused_count > 0 ? ' <span class="fa-sc-unused-badge" title="' + r.unused_count +
                        ' obje %0 hit">+' + r.unused_count + ' unused</span>' : '') + '</td>' +
                '<td>' + faEscape(r.layer_type || '') + '</td>' +
                '<td>' + faEscape(r.layer_name || '') + '</td>' +
                '<td><em style="color:#95a5a6">Domain</em></td>' +
                '<td><span class="fa-sc-status-' + (r.status === 'Enabled' ? 'enabled' : 'disabled') + '">' + faEscape(r.status) + '</span></td>' +
                '<td>' + _faSCObjCell(srcD, logAvailable) + '</td>' +
                '<td>' + _faSCObjCell(dstD, logAvailable) + '</td>' +
                '<td><em style="color:#95a5a6">Any</em></td>' +
                '<td>' + _faSCObjCell(svcD, logAvailable) + '</td>' +
                '<td><em style="color:#95a5a6">Any</em></td>' +
                '<td>' + _faSCActionCell(r.action) + '</td>' +
                '<td>' + faEscape(r.track || 'None') + '</td>' +
                '<td><em style="color:#95a5a6">Any</em></td>' +
                '<td title="' + faEscape(installOn) + '">' + faEscape(installOn.length > 40 ? installOn.substring(0,40)+'…' : installOn) + '</td>' +
                '<td title="' + faEscape(comments) + '">' + faEscape(commentsShort) + '</td>' +
                '<td style="text-align:right;" class="' + ruleHitCls + '">' + ruleHit + '</td>' +
                '<td>' + (r.last_used ? faFormatTime(r.last_used) : '<em style="color:#95a5a6">—</em>') + '</td>' +
                '<td style="text-align:right;" class="fa-sc-percentage">' + rulePct + '</td>' +
                '<td><em style="color:#95a5a6">—</em></td>' +
                '</tr>';
        });
        tbody.innerHTML = html;
    }

    // CSV export — SmartConsole sütunlarıyla
    window.fireAuditUnusedCSV = function() {
        if (!_faUnusedCache || !_faUnusedCache.by_rule) {
            alert('Önce veriyi yükle (Unused in Rules tab).'); return;
        }
        var hdr = ['NO.','NAME','LAYER TYPE','LAYER NAME','GLOBAL','STATUS','SOURCE','DESTINATION','VPN',
                   'SERVICES & APPLICATIONS','CONTENT','ACTION','TRACK','TIME','INSTALL ON','COMMENTS',
                   'COUNT','LAST USE','PERCENTAGE','DOCUMENTATION'];
        var esc = function(v) {
            if (v === null || v === undefined) return '';
            var s = String(v);
            if (/[",\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
            return s;
        };
        var objStr = function(arr) {
            if (!arr || !arr.length) return 'Any';
            return arr.map(function(x){ return x + ' (0%)'; }).join('; ');
        };
        var lines = [hdr.join(',')];
        (_faUnusedCache.by_rule || []).forEach(function(r) {
            lines.push([
                r.rule_no || '',
                r.name || '',
                r.layer_type || '',
                r.layer_name || '',
                'Domain',
                r.status || '',
                objStr(r.src),
                objStr(r.dst),
                'Any',
                objStr(r.services),
                'Any',
                r.action || '',
                r.track || 'None',
                'Any',
                (r.install_on || []).join('; '),
                r.comments || '',
                r.hit_count || 0,
                r.last_used || '',
                '0%',
                ''
            ].map(esc).join(','));
        });
        var csv = '﻿' + lines.join('\n');  // BOM for Excel UTF-8
        var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'rules-cleanup-' + _faSlugDisplay() + '-' +
                     (new Date().toISOString().substring(0,10)) + '.csv';
        document.body.appendChild(a); a.click();
        setTimeout(function() { URL.revokeObjectURL(url); a.remove(); }, 500);
    };

    window.fireAuditUnusedPrint = function() {
        if (!_faUnusedCache) { alert('Önce veriyi yükle.'); return; }
        // Yeni pencerede temiz SmartConsole-style layout bas
        var w = window.open('', '_blank');
        if (!w) { alert('Popup engellendi — tarayıcı popup iznini aç.'); return; }
        var rules = _faUnusedCache.by_rule || [];
        var ap = _faUnusedCache.analysis_period || {};
        var fromStr = ap.from ? _faSCShortDate(ap.from) : '—';
        var toStr   = ap.to   ? _faSCShortDate(ap.to)   : '—';
        var slug = _faSlugDisplay().toUpperCase();
        var policy = _faSCPolicyName();
        var spanDays = 0;
        if (ap.from && ap.to) {
            var df = new Date(ap.from), dt = new Date(ap.to);
            if (!isNaN(df) && !isNaN(dt)) spanDays = Math.max(0, Math.round((dt-df)/86400000));
        }
        var daysLog = ap.days_with_logs || 0;
        var daysWithout = Math.max(0, spanDays - daysLog);
        var style = '<style>' +
            'body{font-family:Arial,sans-serif;font-size:10px;color:#333;margin:12px;}' +
            'h1{color:#2c3e50;font-size:18px;margin:0 0 6px;border-bottom:2px solid #2c3e50;padding-bottom:4px;}' +
            '.meta{color:#7f8c8d;font-size:11px;margin-bottom:10px;}' +
            'table{border-collapse:collapse;width:100%;}' +
            'th{background:#34495e;color:#fff;padding:5px 7px;font-size:9px;text-align:left;}' +
            'td{border:1px solid #dde;padding:4px 6px;vertical-align:top;font-size:9px;}' +
            'tr:nth-child(even) td{background:#fafbfc;}' +
            '.obj{display:block;} .pct{color:#c0392b;font-weight:600;}' +
            '.zero{color:#c0392b;font-weight:700;}' +
            '</style>';
        var headers = ['NO.','NAME','LAYER TYPE','LAYER NAME','GLOBAL','STATUS','SOURCE','DESTINATION','VPN',
                       'SERVICES & APPLICATIONS','CONTENT','ACTION','TRACK','TIME','INSTALL ON','COMMENTS',
                       'COUNT','LAST USE','PERCENTAGE','DOCUMENTATION'];
        var thHtml = headers.map(function(h){ return '<th>'+h+'</th>'; }).join('');
        var objCell = function(arr) {
            if (!arr || !arr.length) return '<em>Any</em>';
            return arr.map(function(x){
                return '<span class="obj">' + faEscape(x) + ' <span class="pct">(0%)</span></span>';
            }).join('');
        };
        var body = rules.map(function(r) {
            return '<tr>' +
                '<td><b>'+faEscape(r.rule_no||'')+'</b></td>' +
                '<td>'+faEscape(r.name||'')+'</td>' +
                '<td>'+faEscape(r.layer_type||'')+'</td>' +
                '<td>'+faEscape(r.layer_name||'')+'</td>' +
                '<td>Domain</td>' +
                '<td>'+faEscape(r.status||'')+'</td>' +
                '<td>'+objCell(r.src)+'</td>' +
                '<td>'+objCell(r.dst)+'</td>' +
                '<td>Any</td>' +
                '<td>'+objCell(r.services)+'</td>' +
                '<td>Any</td>' +
                '<td>'+faEscape(r.action||'')+'</td>' +
                '<td>'+faEscape(r.track||'None')+'</td>' +
                '<td>Any</td>' +
                '<td>'+faEscape((r.install_on||[]).join(', '))+'</td>' +
                '<td>'+faEscape(r.comments||'')+'</td>' +
                '<td class="zero">'+(r.hit_count||0)+'</td>' +
                '<td>'+faEscape(r.last_used||'')+'</td>' +
                '<td class="zero">0%</td>' +
                '<td>—</td>' +
                '</tr>';
        }).join('');
        w.document.write('<!DOCTYPE html><html><head><title>Rules Cleanup: '+slug+'</title>'+style+'</head><body>' +
            '<h1>Rules Cleanup: '+slug+'</h1>' +
            '<div style="font-style:italic;color:#555;margin:-2px 0 6px;">Unused objects within rules</div>' +
            '<div class="meta">The analysis is based on logs from <b>'+fromStr+'</b> to <b>'+toStr+'</b> ' +
            '(days without logs: <b>'+daysWithout+' days</b> | days with logs: <b>'+daysLog+' days</b>). ' +
            'Log analysis is configured to include logs starting at most 91 days before the report date.</div>' +
            '<div style="font-weight:600;margin:6px 0 10px;">Policy: '+faEscape(policy)+' · Dead rules: <b>'+rules.length+'</b> · Generated: '+(new Date().toISOString().substring(0,19).replace('T',' '))+'</div>' +
            '<table><thead><tr>'+thHtml+'</tr></thead><tbody>'+body+'</tbody></table>' +
            '<script>setTimeout(function(){window.print();},250);</script>' +
            '</body></html>');
        w.document.close();
    };

    // Async mail polling helper — Flask notify_status endpoint'ini sırayla 5,10,15,25,40,60 sn'de yokla
    function _faNotifyPoll(triggerTime, statusEl, attempt) {
        var delays = [5000, 5000, 5000, 10000, 15000, 20000];  // toplam ~60 sn
        if (attempt >= delays.length) {
            if (statusEl) statusEl.innerHTML = '<span style="color:#7f8c8d"><i class="fas fa-clock"></i> 60 sn boyunca log\'da güncelleme görmedim — log dosyasını kontrol et: /var/log/firescope/fireaudit-notify.log</span>';
            return;
        }
        setTimeout(function() {
            faApi('notify_status', { since: triggerTime }).then(function(r) {
                if (!r.success) {
                    if (statusEl) statusEl.innerHTML = '<span style="color:#e74c3c">Status hatası: ' + faEscape(r.error||'?') + '</span>';
                    return;
                }
                if (r.state === 'sent') {
                    var ll = r.last_line || '';
                    var match = ll.match(/(\d+)\s*kural\s*·\s*snapshot\s*#(\d+)→#(\d+)/);
                    var info = match ? ' <small>(' + match[1] + ' kural · #' + match[2] + ' → #' + match[3] + ')</small>' : '';
                    if (statusEl) statusEl.innerHTML = '<span style="color:#27ae60"><i class="fas fa-check-circle"></i> Mail gönderildi → notify-config.json alıcılarına' + info + '</span>';
                } else if (r.state === 'failed') {
                    if (statusEl) statusEl.innerHTML = '<span style="color:#e74c3c"><i class="fas fa-times-circle"></i> Mail GÖNDERİLEMEDİ</span><br><small style="color:#7f8c8d">' + faEscape(r.last_line || '') + '</small>';
                } else if (r.state === 'no_diff') {
                    if (statusEl) statusEl.innerHTML = '<span style="color:#f39c12"><i class="fas fa-info-circle"></i> Diff yok — mail atılmadı (snapshot karşılaştırmasında değişiklik bulunamadı)</span>';
                } else {
                    // pending — bir tur daha
                    if (statusEl) statusEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> İşleniyor (' + ((attempt+1)*5) + 's)... ' +
                        '<small style="color:#7f8c8d">Mail SMTP relay\'e iletiliyor</small>';
                    _faNotifyPoll(triggerTime, statusEl, attempt + 1);
                }
            }).catch(function(err) {
                if (statusEl) statusEl.innerHTML = '<span style="color:#e74c3c">Polling hatası: ' + faEscape(err.message) + '</span>';
            });
        }, delays[attempt]);
    }

    // Manuel mail notification — async + polling
    window.fireAuditNotifySend = function() {
        var status = document.getElementById('fa-snapshot-status');
        if (status) status.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mail tetikleniyor...';
        faApiPost('notify').then(function(res) {
            if (!res.success) {
                if (status) status.innerHTML = '<span style="color:#e74c3c"><i class="fas fa-times"></i> Mail fail: ' + faEscape(res.error || res.output || '') + '</span>';
                return;
            }
            // Tetikleme basarili — simdi gercek durumu polling ile cek
            var triggerTime = res.trigger_time || '';
            if (status) status.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mail kuyruga atildi · sonuc bekleniyor...';
            _faNotifyPoll(triggerTime, status, 0);
        }).catch(function(err) {
            if (status) status.innerHTML = '<span style="color:#e74c3c">Bağlantı hatası: ' + faEscape(err.message) + '</span>';
        });
    };
    window.fireAuditNotifyPreview = function() {
        // Yeni sekme aç — dry-run response göster
        var status = document.getElementById('fa-snapshot-status');
        if (status) status.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Önizleme hazırlanıyor...';
        faApiPost('notify', { dry_run: '1' }).then(function(res) {
            if (status) status.innerHTML = '<span style="color:#7f8c8d">Önizleme (dry-run) hazır — çıktı aşağıda</span>';
            var w = window.open('', '_blank');
            if (w) {
                var body = '<h2>Mail Önizleme (dry-run) — ' + faEscape(FW_SLUG) + '</h2>' +
                    '<pre style="white-space:pre-wrap;background:#f6f9fc;padding:12px;border:1px solid #ddd;">' +
                    faEscape(res.output || res.error || '') + '</pre>';
                w.document.write(body);
            }
        });
    };

    // Manuel snapshot — diff için referans noktası oluştur (sync pipeline'ına dokunmaz)
    window.fireAuditTakeSnapshot = function() {
        var status = document.getElementById('fa-snapshot-status');
        var btn = document.querySelector('button[onclick="fireAuditTakeSnapshot()"]');
        if (!status) return;
        status.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Snapshot alınıyor...';
        if (btn) btn.disabled = true;
        var note = 'Manual snapshot @ ' + new Date().toISOString().substring(0,19);
        faApiPost('snapshot', { note: note }).then(function(res) {
            if (btn) btn.disabled = false;
            if (!res.success) {
                status.innerHTML = '<span style="color:#e74c3c"><i class="fas fa-times"></i> Hata: ' + faEscape(res.error || '') + '</span>';
                return;
            }
            status.innerHTML = '<span style="color:#27ae60"><i class="fas fa-check"></i> <strong>Snapshot #' + res.snapshot_id + '</strong> kaydedildi — ' + res.rule_count + ' kural, toplam ' + res.total_snapshots + ' snapshot</span>';
            // Diff'i otomatik yenile
            if (document.getElementById('fa-diff-window')) {
                setTimeout(function() { loadFireAuditDiff(); }, 500);
            }
            // Stats badge güncelle (snapshot count)
            var snEl = document.getElementById('fa-snapshot-count');
            if (snEl) snEl.textContent = res.total_snapshots;
        }).catch(function(err) {
            if (btn) btn.disabled = false;
            status.innerHTML = '<span style="color:#e74c3c">Bağlantı hatası: ' + faEscape(err.message) + '</span>';
        });
    };

    // ---- Kind filter helper (NAT vs Policy ayrımı tüm finding tab'larında) ----
    // Her tab kendi cache'ini tutar, filter butonlarına `data-tab` + `data-kind` ile bağlanır.
    window.__faKindCache = window.__faKindCache || {};
    window.__faKindFilter = window.__faKindFilter || {};

    function _faKindToolbar(tabId, counts) {
        return '<div class="fa-filters fa-kind-toolbar" data-tab="' + tabId + '" style="margin-bottom:10px;">' +
            '<button class="fa-mode-btn active" data-kind="all" onclick="fireAuditKindFilter(\'' + tabId + '\',\'all\')">Tümü (' + (counts.total||0) + ')</button>' +
            '<button class="fa-mode-btn" data-kind="access" onclick="fireAuditKindFilter(\'' + tabId + '\',\'access\')">Policy (' + (counts.access||0) + ')</button>' +
            '<button class="fa-mode-btn" data-kind="nat" onclick="fireAuditKindFilter(\'' + tabId + '\',\'nat\')">NAT (' + (counts.nat||0) + ')</button>' +
            (counts.threat > 0 ? '<button class="fa-mode-btn" data-kind="threat" onclick="fireAuditKindFilter(\'' + tabId + '\',\'threat\')">Threat (' + counts.threat + ')</button>' : '') +
            (counts.https  > 0 ? '<button class="fa-mode-btn" data-kind="https"  onclick="fireAuditKindFilter(\'' + tabId + '\',\'https\')">HTTPS (' + counts.https + ')</button>' : '') +
            (counts.appurl > 0 ? '<button class="fa-mode-btn" data-kind="appurl" onclick="fireAuditKindFilter(\'' + tabId + '\',\'appurl\')">App/URL (' + counts.appurl + ')</button>' : '') +
            '</div>';
    }

    function _faCountKinds(findings) {
        var c = { total: findings.length, access: 0, nat: 0, threat: 0, https: 0, appurl: 0 };
        findings.forEach(function(f) { var k = faRuleKind(f.rule_id); c[k] = (c[k]||0) + 1; });
        return c;
    }

    window.fireAuditKindFilter = function(tabId, kind) {
        window.__faKindFilter[tabId] = kind;
        // Toolbar UI
        document.querySelectorAll('#fa-tab-' + tabId + ' .fa-kind-toolbar .fa-mode-btn').forEach(function(b){
            b.classList.toggle('active', b.getAttribute('data-kind') === kind);
        });
        // Render'ı yeniden çağır — tab-specific render
        var renderFn = window['__faRender_' + tabId];
        if (typeof renderFn === 'function') renderFn();
    };

    // ---------- Shadow / ANY / Risk / Profile / Duplicate findings ----------
    // Shadow pair modal — iki kuralı yan yana göster
    window.fireAuditOpenShadowPair = function(shadowedId, shadowingId, extraLabel) {
        var modal = document.getElementById('fa-rule-modal');
        if (!modal) return;
        var body  = document.getElementById('fa-modal-body');
        var title = document.getElementById('fa-modal-title');
        if (title) title.textContent = 'Shadow Çifti: #' + shadowedId + ' ← #' + shadowingId + (extraLabel ? ' (' + extraLabel + ')' : '');
        if (body)  body.innerHTML = '<div style="padding:40px;text-align:center;"><i class="fas fa-spinner fa-spin fa-2x"></i></div>';
        modal.style.display = 'flex';
        modal.onclick = function(e) { if (e.target === modal) modal.style.display = 'none'; };

        var pA = faApi('rule', { rule_id: shadowingId });
        var pB = faApi('rule', { rule_id: shadowedId });
        Promise.all([pA, pB]).then(function(results) {
            var rA = (results[0] && results[0].rule) || {};
            var rB = (results[1] && results[1].rule) || {};
            function ruleCard(r, label, borderColor) {
                var fields = [
                    ['Action',   faActionBadge(r.action)],
                    ['Src',      faPillList(r.src_addresses)],
                    ['Dst',      faPillList(r.dst_addresses)],
                    ['Services', faPillList(r.services)],
                    ['Comment',  faEscape(r.comments || '-')],
                    ['Hit Count', (r.raw && r.raw.hit_count !== undefined) ? r.raw.hit_count : '-'],
                ];
                var rows = fields.map(function(f) {
                    return '<tr><th style="white-space:nowrap;width:80px;">' + f[0] + '</th><td>' + f[1] + '</td></tr>';
                }).join('');
                return '<div style="flex:1;min-width:260px;border:2px solid ' + borderColor + ';border-radius:8px;padding:12px;">' +
                    '<div style="font-weight:600;margin-bottom:8px;color:' + borderColor + ';">' + label + ' — #' + faEscape(r.rule_id || '?') + ' <span style="color:var(--text-muted);font-weight:400;">' + faEscape(r.name || '') + '</span></div>' +
                    '<table class="fa-table fa-table-sm"><tbody>' + rows + '</tbody></table></div>';
            }
            var cardA = ruleCard(rA, 'Gölgeleyen (Broad)', '#e67e22');
            var cardB = ruleCard(rB, 'Gölgelenen (Shadowed)', '#e74c3c');
            if (body) body.innerHTML =
                '<div style="background:#fff3cd;border:1px solid #ffc107;border-radius:6px;padding:8px 12px;margin-bottom:12px;font-size:13px;">' +
                '<i class="fas fa-exclamation-triangle" style="color:#f39c12;"></i> ' +
                '<strong>#' + faEscape(shadowingId) + '</strong> (geniş, üstte) #<strong>' + faEscape(shadowedId) + '</strong> (dar, altta) kuralını etkisiz kılıyor olabilir.</div>' +
                '<div style="display:flex;gap:14px;flex-wrap:wrap;">' + cardA + cardB + '</div>';
        }).catch(function() {
            if (body) body.innerHTML = '<div style="color:#e74c3c;">Kural detayları yüklenemedi.</div>';
        });
    };

    function loadShadowFindings() {
        var tbody = document.getElementById('fa-shadow-tbody');
        var natTbody = document.getElementById('fa-nat-shadow-tbody');
        tbody.innerHTML = '<tr><td colspan="6"><i class="fas fa-spinner fa-spin"></i></td></tr>';
        if (natTbody) natTbody.innerHTML = '<tr><td colspan="5"><i class="fas fa-spinner fa-spin"></i></td></tr>';
        window.__faKindFilter.shadow = 'all';

        // Policy shadow + NAT shadow paralel yükle
        var pPolicy = faApi('findings', { type: 'shadow' });
        var pNat    = faApi('nat_shadows');
        Promise.all([pPolicy, pNat]).then(function(results) {
            var res    = results[0] || {};
            var natRes = results[1] || {};

            // Policy shadow
            var raw = (res.findings || []).filter(function(f) {
                var d = f.details || {};
                var shadowed  = faRuleKind(f.rule_id || '');
                var shadowingId = d.shadowing_rule_id || d.shadowed_by || '';
                if (!shadowingId) return true;
                return shadowed === faRuleKind(shadowingId);
            });
            window.__faKindCache.shadow = raw;
            _faRenderShadow();

            // NAT shadow
            if (natTbody) {
                var natShadows = natRes.shadows || [];
                if (!natShadows.length) {
                    natTbody.innerHTML = '<tr><td colspan="5"><em style="color:#27ae60;"><i class="fas fa-check-circle"></i> NAT shadow bulunamadı.</em></td></tr>';
                } else {
                    natTbody.innerHTML = natShadows.map(function(s) {
                        return '<tr class="fa-clickable-row" ' +
                            'onclick="fireAuditOpenShadowPair(\'' + faEscape(s.shadowed_id) + '\',\'' + faEscape(s.shadowing_id) + '\',\'NAT\')" ' +
                            'title="Her iki kuralı görmek için tıkla">' +
                            '<td>' + faFormatRuleId(s.shadowed_id) + '<br><small style="color:var(--text-muted);">' + faEscape(s.shadowed_comments) + '</small></td>' +
                            '<td>' + faFormatRuleId(s.shadowing_id) + '<br><small style="color:var(--text-muted);">' + faEscape(s.shadowing_comments) + '</small></td>' +
                            '<td class="fa-cell-small">' + faEscape(s.reason) + '</td>' +
                            '<td>' + faSevBadge(s.severity) + '</td>' +
                            '<td style="font-size:11px;color:var(--text-muted);">Central NAT</td></tr>';
                    }).join('');
                }
                // Badge güncelle
                var badge = document.getElementById('fa-nat-shadow-count');
                if (badge) badge.textContent = natShadows.length;
            }
        });
    }
    window.__faRender_shadow = function() {
        var tbody = document.getElementById('fa-shadow-tbody');
        var all = window.__faKindCache.shadow || [];
        var kind = window.__faKindFilter.shadow || 'all';
        var list = kind === 'all' ? all : all.filter(function(f) { return faRuleKind(f.rule_id) === kind; });
        var toolbar = _faKindToolbar('shadow', _faCountKinds(all));
        var wrap = tbody.closest('.fa-tab-content');
        var oldBar = wrap && wrap.querySelector('.fa-kind-toolbar');
        if (oldBar) oldBar.outerHTML = toolbar;
        else if (wrap) {
            var tw = wrap.querySelector('.fa-table-wrapper');
            if (tw) tw.insertAdjacentHTML('beforebegin', toolbar);
        }
        document.querySelectorAll('#fa-tab-shadow .fa-kind-toolbar .fa-mode-btn').forEach(function(b){
            b.classList.toggle('active', b.getAttribute('data-kind') === kind);
        });

        if (!list.length) { tbody.innerHTML = '<tr><td colspan="6"><em>Bu kategoride shadow yok.</em></td></tr>'; return; }
        var html = '';
        list.forEach(function(f) {
            var d = f.details || {};
            var cls = f.ack_state ? 'fa-row-acked ' : '';
            var ackBadge = f.ack_state ? '<span class="fa-ack-inline ack-' + f.ack_state + '">' + (ACK_LABELS[f.ack_state] ? ACK_LABELS[f.ack_state].label : f.ack_state) + '</span>' : '';
            var shadowingId = d.shadowing_rule_id || d.shadowed_by || '';
            var clickFn = shadowingId
                ? 'fireAuditOpenShadowPair(\'' + faEscape(f.rule_id) + '\',\'' + faEscape(shadowingId) + '\')'
                : 'fireAuditOpenRule(\'' + faEscape(f.rule_id) + '\')';
            html += '<tr class="' + cls + 'fa-clickable-row" onclick="' + clickFn + '" title="Her iki kuralı görmek için tıkla">' + faBulkCheckboxCell('shadow', f.rule_id) +
                '<td>' + faFormatRuleId(f.rule_id) + ackBadge + '</td>' +
                '<td title="' + faEscape(d.shadowed_name || f.rule_name || '') + '">' + faEscape(d.shadowed_name || f.rule_name || '-') + '</td>' +
                '<td>' + (shadowingId ? faFormatRuleId(shadowingId) : '-') + '</td>' +
                '<td title="' + faEscape(f.recommendation || '') + '">' + faEscape(f.recommendation || '-') + '</td>' +
                '<td>' + faSevBadge(f.severity) + '</td></tr>';
        });
        tbody.innerHTML = html;
    };
    function _faRenderShadow() { window.__faRender_shadow(); }

    var _faAnyCache = [];  // ham findings — kind-filter tekrarında reuse
    var _faAnyKindFilter = 'all';
    window.fireAuditAnyFilter = function(kind) {
        _faAnyKindFilter = kind;
        document.querySelectorAll('#fa-tab-any .fa-mode-btn').forEach(function(btn){
            btn.classList.toggle('active', btn.getAttribute('data-kind') === kind);
        });
        _renderAnyFindings();
    };
    function _renderAnyFindings() {
        var tbody = document.getElementById('fa-any-tbody');
        var counter = document.getElementById('fa-any-counter');
        var kind = window.__faKindFilter.any || _faAnyKindFilter || 'all';
        _faAnyKindFilter = kind;
        // Toolbar'ı tabloya enjekte et
        var toolbar = _faKindToolbar('any', _faCountKinds(_faAnyCache));
        var wrap = tbody.closest('.fa-tab-content');
        var oldBar = wrap && wrap.querySelector('.fa-kind-toolbar');
        if (oldBar) oldBar.outerHTML = toolbar;
        else if (wrap) {
            var tw = wrap.querySelector('.fa-table-wrapper');
            if (tw) tw.insertAdjacentHTML('beforebegin', toolbar);
        }
        document.querySelectorAll('#fa-tab-any .fa-kind-toolbar .fa-mode-btn').forEach(function(b){
            b.classList.toggle('active', b.getAttribute('data-kind') === kind);
        });
        var dimFilter = (document.getElementById('fa-any-dim-filter') || {}).value || 'all';
        var searchTerm = ((document.getElementById('fa-any-search') || {}).value || '').trim().toLowerCase();
        var list = _faAnyCache.filter(function(f){
            if (kind !== 'all' && faRuleKind(f.rule_id) !== kind) return false;
            var d = f.details || {};
            if (dimFilter === 'src_any' && !d.src_any) return false;
            if (dimFilter === 'dst_any' && !d.dst_any) return false;
            if (dimFilter === 'svc_any' && !d.svc_any) return false;
            if (dimFilter === 'src_dst_any' && !(d.src_any && d.dst_any)) return false;
            if (dimFilter === 'all_any' && !(d.src_any && d.dst_any && d.svc_any)) return false;
            if (searchTerm) {
                var hay = (String(f.rule_id || '') + ' ' + String(f.rule_name || d.rule_name || '')).toLowerCase();
                if (hay.indexOf(searchTerm) === -1) return false;
            }
            return true;
        });
        var searchCounter = document.getElementById('fa-any-search-counter');
        if (searchCounter) searchCounter.textContent = (dimFilter !== 'all' || searchTerm) ? list.length + ' / ' + _faAnyCache.length + ' eşleşiyor' : '';
        if (counter) counter.textContent = list.length + ' finding (' + kind + ')';
        if (!list.length) { tbody.innerHTML = '<tr><td colspan="9"><em>Bu filtreyle eşleşen ANY kuralı yok.</em></td></tr>'; return; }
        var html = '';
        list.forEach(function(f) {
            var d = f.details || {};
            var cls = f.ack_state ? 'fa-row-acked' : '';
            var ackBadge = f.ack_state ? '<span class="fa-ack-inline ack-' + f.ack_state + '">' + (ACK_LABELS[f.ack_state] ? ACK_LABELS[f.ack_state].label : f.ack_state) + '</span>' : '';
            var anyZoneHint = '';
            var _anyZones = (d.src_zones || d.dst_zones) ? d : ((window._faZoneMap && window._faZoneMap[String(f.rule_id)]) || {});
            if (_anyZones.src_zones || _anyZones.dst_zones) {
                var az_src = Array.isArray(_anyZones.src_zones) ? _anyZones.src_zones.join(', ') : (_anyZones.src_zones || '?');
                var az_dst = Array.isArray(_anyZones.dst_zones) ? _anyZones.dst_zones.join(', ') : (_anyZones.dst_zones || '?');
                var anyCtxBadge = faZoneContextBadge(_anyZones.src_zones, _anyZones.dst_zones);
                anyZoneHint = '<div style="font-size:.68rem;color:#64748b;margin-top:2px;"><i class="fas fa-layer-group" style="color:#94a3b8;"></i> ' + faEscape(az_src) + ' → ' + faEscape(az_dst) + ' ' + anyCtxBadge + '</div>';
            }
            html += '<tr class="' + cls + ' fa-clickable-row" onclick="fireAuditOpenRule(\'' + faEscape(f.rule_id) + '\')">' + faBulkCheckboxCell('any', f.rule_id) +
                '<td>' + faFormatRuleId(f.rule_id) + ackBadge + '</td>' +
                '<td>' + faEscape(f.rule_name || d.rule_name || '-') + anyZoneHint + '</td>' +
                '<td>' + (d.src_any ? '<i class="fas fa-check" style="color:#e74c3c"></i>' : '-') + '</td>' +
                '<td>' + (d.dst_any ? '<i class="fas fa-check" style="color:#e74c3c"></i>' : '-') + '</td>' +
                '<td>' + (d.svc_any ? '<i class="fas fa-check" style="color:#e74c3c"></i>' : '-') + '</td>' +
                '<td>' + faSevBadge(f.severity) + '</td>' +
                '<td><strong>' + (f.score || 0) + '</strong></td>' +
                '<td class="fa-cell-small">' + faEscape(f.recommendation || '-') + '</td></tr>';
        });
        tbody.innerHTML = html;
    }
    function loadAnyFindings() {
        var tbody = document.getElementById('fa-any-tbody');
        tbody.innerHTML = '<tr><td colspan="9"><i class="fas fa-spinner fa-spin"></i></td></tr>';
        window.__faKindFilter.any = 'all';
        faApi('findings', { type: 'any' }).then(function(res) {
            if (!res.success) { tbody.innerHTML = '<tr><td colspan="9">Hata</td></tr>'; return; }
            _faAnyCache = res.findings || [];
            window.__faKindCache.any = _faAnyCache;
            _renderAnyFindings();
        });
    }
    window.__faRender_any = function() { _faAnyKindFilter = window.__faKindFilter.any || 'all'; _renderAnyFindings(); };

    function loadRiskFindings() {
        var tbody = document.getElementById('fa-risk-tbody');
        tbody.innerHTML = '<tr><td colspan="8"><i class="fas fa-spinner fa-spin"></i></td></tr>';
        window.__faKindFilter.risk = 'all';
        faApi('findings', { type: 'risk' }).then(function(res) {
            if (!res.success) { tbody.innerHTML = '<tr><td colspan="8">Hata</td></tr>'; return; }
            window.__faKindCache.risk = res.findings || [];
            _faRenderRisk();
        });
    }
    window.__faRender_risk = function() {
        var tbody = document.getElementById('fa-risk-tbody');
        var all = window.__faKindCache.risk || [];
        var kind = window.__faKindFilter.risk || 'all';
        var list = kind === 'all' ? all : all.filter(function(f) { return faRuleKind(f.rule_id) === kind; });
        var toolbar = _faKindToolbar('risk', _faCountKinds(all));
        var wrap = tbody.closest('.fa-tab-content');
        var oldBar = wrap && wrap.querySelector('.fa-kind-toolbar');
        if (oldBar) oldBar.outerHTML = toolbar;
        else if (wrap) {
            var tw = wrap.querySelector('.fa-table-wrapper');
            if (tw) tw.insertAdjacentHTML('beforebegin', toolbar);
        }
        document.querySelectorAll('#fa-tab-risk .fa-kind-toolbar .fa-mode-btn').forEach(function(b){
            b.classList.toggle('active', b.getAttribute('data-kind') === kind);
        });
        if (!list.length) { tbody.innerHTML = '<tr><td colspan="8"><em>Bu kategoride risk yok.</em></td></tr>'; return; }
        var html = '';
        list.forEach(function(f, i) {
            var d = f.details || {};
            var cls = f.ack_state ? 'fa-row-acked' : '';
            var ackBadge = f.ack_state ? '<span class="fa-ack-inline ack-' + f.ack_state + '">' + (ACK_LABELS[f.ack_state] ? ACK_LABELS[f.ack_state].label : f.ack_state) + '</span>' : '';
            var riskZoneHint = '';
            var _riskZones = (d.src_zones || d.dst_zones) ? d : ((window._faZoneMap && window._faZoneMap[String(f.rule_id)]) || {});
            if (_riskZones.src_zones || _riskZones.dst_zones) {
                var rz_src = Array.isArray(_riskZones.src_zones) ? _riskZones.src_zones.join(', ') : (_riskZones.src_zones || '?');
                var rz_dst = Array.isArray(_riskZones.dst_zones) ? _riskZones.dst_zones.join(', ') : (_riskZones.dst_zones || '?');
                var riskCtxBadge = faZoneContextBadge(_riskZones.src_zones, _riskZones.dst_zones);
                riskZoneHint = '<div style="font-size:.68rem;color:#64748b;margin-top:2px;"><i class="fas fa-layer-group" style="color:#94a3b8;"></i> ' + faEscape(rz_src) + ' → ' + faEscape(rz_dst) + ' ' + riskCtxBadge + '</div>';
            }
            html += '<tr class="' + cls + ' fa-clickable-row" onclick="fireAuditOpenRule(\'' + faEscape(f.rule_id) + '\')">' + faBulkCheckboxCell('risk', f.rule_id) + '<td>' + (i + 1) + '</td>' +
                '<td>' + faFormatRuleId(f.rule_id) + ackBadge + '</td>' +
                '<td>' + faEscape(f.rule_name || d.rule_name || '-') + riskZoneHint + '</td>' +
                '<td>' + faActionBadge(d.action || f.rule_action || '-') + '</td>' +
                '<td><strong>' + (f.score || 0) + '</strong></td>' +
                '<td>' + faSevBadge(f.severity) + '</td>' +
                '<td class="fa-cell-small">' + faEscape(f.recommendation || '-') + '</td></tr>';
        });
        tbody.innerHTML = html;
    };
    function _faRenderRisk() { window.__faRender_risk(); }

    function loadProfileGaps() {
        var tbody = document.getElementById('fa-profile-tbody');
        tbody.innerHTML = '<tr><td colspan="7"><i class="fas fa-spinner fa-spin"></i></td></tr>';
        faApi('findings', { type: 'profile' }).then(function(res) {
            if (!res.success || !res.findings.length) { tbody.innerHTML = '<tr><td colspan="7"><em>UTM gap yok.</em></td></tr>'; return; }
            var html = '';
            res.findings.forEach(function(f) {
                var d = f.details || {};
                var cls = f.ack_state ? 'fa-row-acked' : '';
                var ackBadge = f.ack_state ? '<span class="fa-ack-inline ack-' + f.ack_state + '">' + (ACK_LABELS[f.ack_state] ? ACK_LABELS[f.ack_state].label : f.ack_state) + '</span>' : '';
                html += '<tr class="' + cls + '">' + faBulkCheckboxCell('profile', f.rule_id) +
                    '<td><a class="fa-rule-link" onclick="fireAuditOpenRule(\'' + faEscape(f.rule_id) + '\')">' + faEscape(f.rule_id) + '</a>' + ackBadge + '</td>' +
                    '<td>' + faEscape(f.rule_name || d.rule_name || '-') + '</td>' +
                    '<td class="fa-cell-small">' + faEscape((d.missing || []).join(', ')) + '</td>' +
                    '<td>' + faSevBadge(f.severity) + '</td>' +
                    '<td><strong>' + (f.score || 0) + '</strong></td>' +
                    '<td class="fa-cell-small">' + faEscape(f.recommendation || '-') + '</td></tr>';
            });
            tbody.innerHTML = html;
        });
    }

    function loadDuplicates() {
        var tbody = document.getElementById('fa-dup-tbody');
        tbody.innerHTML = '<tr><td colspan="9"><i class="fas fa-spinner fa-spin"></i></td></tr>';
        faApi('duplicates').then(function(res) {
            if (!res.success || !res.groups.length) { tbody.innerHTML = '<tr><td colspan="9"><em>Duplicate grup yok.</em></td></tr>'; return; }
            var html = '';
            res.groups.forEach(function(g, i) {
                var d = g.details || {};
                var sig = g.signature || g.id || ('grp_' + i);
                var sigSafe = String(sig).replace(/[^a-zA-Z0-9_-]/g, '_');
                var rowId = 'fa-dup-row-' + sigSafe;
                var detailId = 'fa-dup-detail-' + sigSafe;
                var rids = JSON.stringify(g.rule_ids || []).replace(/"/g, '&quot;');
                html += '<tr id="' + rowId + '" class="fa-clickable-row" style="cursor:pointer" ' +
                    'onclick="fireAuditDupToggle(\'' + sigSafe + '\', ' + rids + ')" ' +
                    'title="Tıkla — iki kuralı yan yana göstermek için detayı aç">' +
                    faBulkCheckboxCell('duplicate', sig) +
                    '<td>' + (i + 1) + ' <i class="fas fa-chevron-down" id="' + rowId + '-icon" style="font-size:.7em;color:#7f8c8d;"></i></td>' +
                    '<td>' + faActionBadge(d.action) + '</td>' +
                    '<td class="fa-cell-small">' + faListPreview(d.src) + '</td>' +
                    '<td class="fa-cell-small">' + faListPreview(d.dst) + '</td>' +
                    '<td class="fa-cell-small">' + faListPreview(d.svc) + '</td>' +
                    '<td><strong>' + g.rule_count + '</strong></td>' +
                    '<td class="fa-cell-small">' + faEscape((g.rule_ids || []).join(', ')) + '</td>' +
                    '<td onclick="event.stopPropagation()">' + faAckButton('duplicate', sig, g.ack_state) + '</td></tr>';
                // Detay placeholder (ilk tıklamada doldurulur)
                html += '<tr id="' + detailId + '" style="display:none;background:rgba(52,152,219,0.04);"><td colspan="9" style="padding:14px 18px;"></td></tr>';
            });
            tbody.innerHTML = html;
        });
    }

    // Duplicate group satirina tiklayinca alt satirda kurallarin yan yana onizlemesini ac/kapat.
    var _dupCache = {};
    window.fireAuditDupToggle = function(sigSafe, ruleIds) {
        var det = document.getElementById('fa-dup-detail-' + sigSafe);
        var icon = document.getElementById('fa-dup-row-' + sigSafe + '-icon');
        if (!det) return;
        if (det.style.display !== 'none') {
            det.style.display = 'none';
            if (icon) icon.className = 'fas fa-chevron-down';
            return;
        }
        det.style.display = '';
        if (icon) icon.className = 'fas fa-chevron-up';
        var cell = det.querySelector('td');
        cell.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Kural detaylari yukleniyor...';

        // Her rule_id icin fast rule lookup; cache'le
        var promises = (ruleIds || []).map(function(rid) {
            if (_dupCache[rid]) return Promise.resolve(_dupCache[rid]);
            return faApi('rule', { rule_id: rid }).then(function(r) {
                if (r.success && r.rule) _dupCache[rid] = r.rule;
                return r.rule || { rule_id: rid, name: '?', _err: r.error };
            });
        });

        Promise.all(promises).then(function(rules) {
            var h = '<div style="overflow-x:auto;"><table class="fa-table fa-table-sm" style="font-size:.78rem;min-width:100%;">' +
                '<thead><tr><th>Rule ID</th><th>Adı</th><th>Action</th><th>Src</th><th>Dst</th><th>Service</th>' +
                '<th>UTM</th><th>Log</th><th>Hit</th><th>Son Kullanım</th><th>Comment</th><th>Detay</th></tr></thead><tbody>';
            rules.forEach(function(r) {
                var utm = r.utm_profiles && Object.keys(r.utm_profiles).length ? '✓' : '<span style="color:#e67e22">×</span>';
                var hitc = (r.raw && r.raw.hit_count !== undefined) ? r.raw.hit_count : (r.hit_count !== undefined ? r.hit_count : '-');
                var lastu = (r.raw && r.raw.last_used) ? r.raw.last_used : (r.last_used || '-');
                h += '<tr>' +
                    '<td><strong>' + faEscape(r.rule_id || '?') + '</strong></td>' +
                    '<td>' + faEscape(r.name || '-') + '</td>' +
                    '<td>' + faActionBadge(r.action) + '</td>' +
                    '<td class="fa-cell-small">' + faListPreview(r.src_addresses) + '</td>' +
                    '<td class="fa-cell-small">' + faListPreview(r.dst_addresses) + '</td>' +
                    '<td class="fa-cell-small">' + faListPreview(r.services) + '</td>' +
                    '<td>' + utm + '</td>' +
                    '<td>' + (r.logging ? '✓' : '<span style="color:#e67e22">×</span>') + '</td>' +
                    '<td>' + faEscape(String(hitc)) + '</td>' +
                    '<td class="fa-cell-small" style="font-size:.72rem;color:#5d6d7e;">' + faEscape(String(lastu)) + '</td>' +
                    '<td class="fa-cell-small" title="' + faEscape(r.comments||'') + '">' + faEscape((r.comments||'-').substring(0,40)) + '</td>' +
                    '<td><button class="fa-mini-btn" onclick="fireAuditOpenRule(\'' + faEscape(r.rule_id||'') + '\')" title="Tam deep-dive modal ac"><i class="fas fa-search-plus"></i></button></td>' +
                    '</tr>';
            });
            h += '</tbody></table></div>';
            h += '<div style="margin-top:8px;font-size:.78rem;color:var(--text-muted);"><i class="fas fa-info-circle"></i> Iki veya daha cok kural ayni src/dst/svc/action kombinasyonuna sahip. Birinin tutulup digerlerinin silinmesi ya da kurallarin birlestirilmesi onerilir.</div>';
            cell.innerHTML = h;
        });
    };

    // ---------- Cihaz Özeti (AlgoSec-style overview) ----------
    function loadFireAuditOverview() {
        var hdr = document.getElementById('fa-ov-header');
        var grid = document.getElementById('fa-ov-grid');
        if (!hdr || !grid) return;
        hdr.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Yükleniyor...';
        grid.innerHTML = '';
        faApi('dashboard_summary').then(function(res) {
            if (!res.success) {
                hdr.innerHTML = '<span style="color:#e74c3c">Hata: ' + faEscape(res.error || '') + '</span>';
                return;
            }
            var h = res.header || {};
            hdr.innerHTML =
                '<div class="ov-h-item"><small>Cihaz</small><strong>' + faEscape(h.name || h.fw_slug) + '</strong></div>' +
                '<div class="ov-h-item"><small>Vendor</small><strong>' + faEscape(h.fw_type || '-') + '</strong></div>' +
                '<div class="ov-h-item"><small>Policy</small><strong>' + faEscape(h.policy_package || '-') + '</strong></div>' +
                '<div class="ov-h-item"><small>Versiyon</small><strong>' + faEscape(h.version || '-') + '</strong></div>' +
                '<div class="ov-h-item"><small>Host</small><strong>' + faEscape(h.host || '-') + '</strong></div>' +
                '<div class="ov-h-item"><small>Risk Profili</small><strong>' + faEscape(h.risk_profile || 'Standard') + '</strong></div>' +
                '<div class="ov-h-spacer"></div>' +
                '<button onclick="fireAuditOverviewExport()"><i class="fas fa-file-export"></i> Export PDF</button>';

            var sr = res.security_rating || {};
            var srCls = sr.score >= 85 ? 'fa-ov-rating-good' : sr.score >= 60 ? 'fa-ov-rating-medium' : 'fa-ov-rating-poor';
            var bl = res.baseline_compliance || {};
            var blCls = bl.percent >= 85 ? 'fa-ov-rating-good' : bl.percent >= 50 ? 'fa-ov-rating-medium' : 'fa-ov-rating-poor';
            var rg = res.regulatory_compliance || {};
            var rgCls = rg.percent >= 85 ? 'fa-ov-rating-good' : rg.percent >= 50 ? 'fa-ov-rating-medium' : 'fa-ov-rating-poor';
            var ch = res.changes_30d || {};
            var po = res.policy_optimization || { rules: {}, objects: {} };
            var conn = res.connectivity || {};

            var html = '';
            // Card: Security Rating
            html += '<div class="fa-ov-card"><h4>Security Rating</h4>' +
                '<div class="fa-ov-big ' + srCls + '">' + (sr.score || 0) + '<span class="unit">%</span></div>' +
                '<div class="fa-ov-tiles">' +
                  '<div class="fa-ov-tile" style="background:rgba(231,76,60,0.12)" onclick="fireAuditSwitchTab(\'risk\')"><div class="fa-ov-tile-val" style="color:#c0392b">' + (sr.breakdown.CRITICAL || 0) + '</div><div class="fa-ov-tile-lbl">Critical</div></div>' +
                  '<div class="fa-ov-tile" style="background:rgba(230,126,34,0.12)" onclick="fireAuditSwitchTab(\'risk\')"><div class="fa-ov-tile-val" style="color:#d35400">' + (sr.breakdown.HIGH || 0) + '</div><div class="fa-ov-tile-lbl">High</div></div>' +
                  '<div class="fa-ov-tile" style="background:rgba(243,156,18,0.12)" onclick="fireAuditSwitchTab(\'risk\')"><div class="fa-ov-tile-val" style="color:#e67e22">' + (sr.breakdown.MEDIUM || 0) + '</div><div class="fa-ov-tile-lbl">Medium</div></div>' +
                  '<div class="fa-ov-tile" style="background:rgba(52,152,219,0.10)" onclick="fireAuditSwitchTab(\'risk\')"><div class="fa-ov-tile-val" style="color:#2980b9">' + (sr.breakdown.LOW || 0) + '</div><div class="fa-ov-tile-lbl">Low</div></div>' +
                '</div></div>';

            // Card: Baseline Compliance
            html += '<div class="fa-ov-card"><h4>Baseline Compliance' +
                (bl.framework ? ' <small style="text-transform:none;color:#7f8c8d">(' + faEscape(bl.framework.replace(/_/g,' ')) + ')</small>' : '') + '</h4>' +
                '<div class="fa-ov-big ' + blCls + '">' + (bl.percent || 0) + '<span class="unit">%</span></div>' +
                '<div class="fa-ov-sub">' + (bl.passed || 0) + ' Passed · ' + (bl.failed || 0) + ' Failed</div>' +
                '<div style="margin-top:8px"><button class="fa-mini-btn" onclick="fireAuditSwitchTab(\'compliance\')">Detay</button></div></div>';

            // Card: Regulatory Compliance
            html += '<div class="fa-ov-card"><h4>Regulatory Compliance</h4>' +
                '<div class="fa-ov-big ' + rgCls + '">' + (rg.percent || 0) + '<span class="unit">%</span></div>' +
                '<div class="fa-ov-sub">' + (rg.frameworks || []).map(function(f) {
                    return faEscape(f.name.replace(/_/g,' ')) + ' (' + f.percent + '%)';
                }).join(' · ') + '</div></div>';

            // Card: Changes (30d)
            var byT = ch.by_type || {};
            html += '<div class="fa-ov-card"><h4>Changes (30 gün)</h4>' +
                '<div class="fa-ov-big">' + (ch.total || 0) + '</div>' +
                '<div class="fa-ov-tiles">' +
                  '<div class="fa-ov-tile" onclick="fireAuditSwitchTab(\'diff\')"><div class="fa-ov-tile-val">' + (byT.added || byT.created || 0) + '</div><div class="fa-ov-tile-lbl">Added</div></div>' +
                  '<div class="fa-ov-tile" onclick="fireAuditSwitchTab(\'diff\')"><div class="fa-ov-tile-val">' + (byT.modified || 0) + '</div><div class="fa-ov-tile-lbl">Modified</div></div>' +
                  '<div class="fa-ov-tile" onclick="fireAuditSwitchTab(\'diff\')"><div class="fa-ov-tile-val">' + (byT.removed || byT.deleted || 0) + '</div><div class="fa-ov-tile-lbl">Removed</div></div>' +
                  '<div class="fa-ov-tile" onclick="fireAuditSwitchTab(\'diff\')"><div class="fa-ov-tile-val">' + (conn.interfaces || 0) + '</div><div class="fa-ov-tile-lbl">Interfaces</div></div>' +
                '</div></div>';

            // Card: Policy Optimization (Rules)
            var pr = po.rules || {};
            html += '<div class="fa-ov-card"><h4>Policy Optimization — Rules</h4>' +
                '<div class="fa-ov-tiles" style="grid-template-columns:repeat(3,1fr)">' +
                  '<div class="fa-ov-tile" onclick="fireAuditSwitchTab(\'hitcount\');setTimeout(function(){fireAuditHcSubTab(\'dead\')},200)"><div class="fa-ov-tile-val">' + (pr.unused || 0) + '</div><div class="fa-ov-tile-lbl">Unused</div></div>' +
                  '<div class="fa-ov-tile" onclick="fireAuditSwitchTab(\'shadow\')"><div class="fa-ov-tile-val">' + (pr.covered || 0) + '</div><div class="fa-ov-tile-lbl">Covered (Shadow)</div></div>' +
                  '<div class="fa-ov-tile" onclick="fireAuditSwitchTab(\'kurallar\')"><div class="fa-ov-tile-val">' + (pr.disabled || 0) + '</div><div class="fa-ov-tile-lbl">Disabled</div></div>' +
                  '<div class="fa-ov-tile" onclick="fireAuditSwitchTab(\'hitcount\')"><div class="fa-ov-tile-val">' + (pr.time_inactive || 0) + '</div><div class="fa-ov-tile-lbl">Time-Inactive</div></div>' +
                  '<div class="fa-ov-tile" onclick="fireAuditSwitchTab(\'kurallar\')"><div class="fa-ov-tile-val">' + (pr.not_logged || 0) + '</div><div class="fa-ov-tile-lbl">Not Logged</div></div>' +
                  '<div class="fa-ov-tile" onclick="fireAuditSwitchTab(\'kurallar\')"><div class="fa-ov-tile-val">' + (pr.no_comments || 0) + '</div><div class="fa-ov-tile-lbl">No Comments</div></div>' +
                '</div></div>';

            // Card: Policy Optimization (Objects)
            var po2 = po.objects || {};
            html += '<div class="fa-ov-card"><h4>Policy Optimization — Objects</h4>' +
                '<div class="fa-ov-tiles" style="grid-template-columns:repeat(3,1fr)">' +
                  '<div class="fa-ov-tile" onclick="fireAuditSwitchTab(\'dup_obj\')"><div class="fa-ov-tile-val">' + (po2.duplicate || 0) + '</div><div class="fa-ov-tile-lbl">Duplicate</div></div>' +
                  '<div class="fa-ov-tile" onclick="fireAuditSwitchTab(\'stale_obj\')"><div class="fa-ov-tile-val">' + (po2.unattached || 0) + '</div><div class="fa-ov-tile-lbl">Unattached</div></div>' +
                  '<div class="fa-ov-tile" onclick="fireAuditSwitchTab(\'unused_in_rules\')"><div class="fa-ov-tile-val">' + (po2.unused_in_rules || 0) + '</div><div class="fa-ov-tile-lbl">Unused in Rules</div></div>' +
                '</div></div>';

            grid.innerHTML = html;
        }).catch(function(e) {
            hdr.innerHTML = '<span style="color:#e74c3c">Bağlantı hatası</span>';
        });
    }
    window.fireAuditOverviewExport = function() {
        // Yeni: filter modal'ini ac. Modal yoksa fallback olarak default rapor uret.
        var modal = document.getElementById('fa-export-modal');
        if (!modal) {
            var url = API_BASE + '?action=report&fw_slug=' + encodeURIComponent(FW_SLUG);
            var w = window.open(url, '_blank');
            if (!w) alert('Tarayıcı yeni sekme açmayı engelledi:\n' + url);
            return;
        }
        modal.style.display = 'flex';
    };

    window.fireAuditExportSubmit = function() {
        var modal = document.getElementById('fa-export-modal');
        if (!modal) return;
        var sev = Array.prototype.slice.call(modal.querySelectorAll('input[name="ex-sev"]:checked')).map(function(x){return x.value;});
        var kind = Array.prototype.slice.call(modal.querySelectorAll('input[name="ex-kind"]:checked')).map(function(x){return x.value;});
        var ackEl = modal.querySelector('input[name="ex-ack"]:checked');
        var appEl = modal.querySelector('input[name="ex-appendix"]:checked');
        var ack = ackEl ? ackEl.value : 'open';
        var appendix = appEl ? appEl.value : 'full';
        if (sev.length === 0) { alert('En az 1 severity seçmelisiniz.'); return; }
        if (kind.length === 0) { alert('En az 1 kategori seçmelisiniz.'); return; }
        var url = API_BASE
            + '?action=report&fw_slug=' + encodeURIComponent(FW_SLUG)
            + '&severity=' + encodeURIComponent(sev.join(','))
            + '&kind=' + encodeURIComponent(kind.join(','))
            + '&ack=' + encodeURIComponent(ack)
            + '&appendix=' + encodeURIComponent(appendix);
        var w = window.open(url, '_blank');
        if (!w) {
            alert('Tarayıcı yeni sekme açmayı engelledi. Pop-up izin ver veya doğrudan tıkla:\n' + url);
        }
        modal.style.display = 'none';
    };

    // ---------- Hit Count Dashboard ----------
    var faHcLimit = 0;  // 0 = tum aktif kurallar; 20 = top 20 (sub-tab seciminde set edilir)
    var faHcKind = 'all';

    window.fireAuditHcSetLimit = function(n) {
        faHcLimit = n;
        var btns = document.querySelectorAll('#fa-tab-hitcount [data-hc-limit]');
        for (var i = 0; i < btns.length; i++)
            btns[i].classList.toggle('active', String(btns[i].getAttribute('data-hc-limit')) === String(n));
        loadHitCount();
    };
    window.fireAuditHcSetKind = function(k) {
        faHcKind = k;
        var btns = document.querySelectorAll('#fa-tab-hitcount [data-hc-kind]');
        for (var i = 0; i < btns.length; i++)
            btns[i].classList.toggle('active', btns[i].getAttribute('data-hc-kind') === k);
        loadHitCount();
    };

    function loadHitCount() {
        var top = document.getElementById('fa-hc-top-tbody');
        var dead = document.getElementById('fa-hc-dead-tbody');
        var sum = document.getElementById('fa-hc-summary');
        top.innerHTML = '<tr><td colspan="6"><i class="fas fa-spinner fa-spin"></i></td></tr>';
        dead.innerHTML = '<tr><td colspan="7"><i class="fas fa-spinner fa-spin"></i></td></tr>';
        faApi('hitcount', { limit: faHcLimit, kind: faHcKind }).then(function(res) {
            if (!res.success) { sum.innerHTML = 'Hata'; return; }
            var s = res.summary || {};
            sum.innerHTML =
                '<div class="fa-hc-card fa-hc-clickable" onclick="fireAuditHcSubTab(\'top\')" title="Top Talker tabı"><div class="fa-hc-val">' + s.total + '</div><div class="fa-hc-lbl">Toplam Aktif Kural</div></div>' +
                '<div class="fa-hc-card fa-hc-active fa-hc-clickable" onclick="fireAuditHcSubTab(\'top\')" title="Top Talker tabı"><div class="fa-hc-val">' + s.active + '</div><div class="fa-hc-lbl">Active (hit &gt; 0)</div></div>' +
                '<div class="fa-hc-card fa-hc-dead fa-hc-clickable" onclick="fireAuditHcSubTab(\'dead\')" title="Dead Rules tabı"><div class="fa-hc-val">' + s.dead + '</div><div class="fa-hc-lbl">DEAD (hit = 0)</div></div>' +
                '<div class="fa-hc-card"><div class="fa-hc-val">' + s.unknown + '</div><div class="fa-hc-lbl">Unknown (null)</div></div>' +
                '<div class="fa-hc-card"><div class="fa-hc-val">' + Number(s.total_hits || 0).toLocaleString() + '</div><div class="fa-hc-lbl">Toplam Hit</div></div>';

            var tops = res.top_talkers || [];
            if (!tops.length) { top.innerHTML = '<tr><td colspan="6"><em>Yok.</em></td></tr>'; }
            else {
                var html = '';
                tops.forEach(function(r, i) {
                    html += '<tr><td>' + (i + 1) + '</td>' +
                        '<td><a class="fa-rule-link" onclick="fireAuditOpenRule(\'' + faEscape(r.rule_id) + '\')">' + faEscape(r.rule_id) + '</a></td>' +
                        '<td>' + faEscape(r.name) + '</td>' +
                        '<td>' + faActionBadge(r.action) + '</td>' +
                        '<td><strong>' + Number(r.hit_count || 0).toLocaleString() + '</strong></td>' +
                        '<td class="fa-cell-small">' + faEscape(r.last_used || '-') + '</td></tr>';
                });
                top.innerHTML = html;
            }

            var deads = res.dead_rules || [];
            if (!deads.length) { dead.innerHTML = '<tr><td colspan="7"><em>Dead rule yok 🎉</em></td></tr>'; }
            else {
                var dh = '';
                deads.forEach(function(r) {
                    dh += '<tr><td><a class="fa-rule-link" onclick="fireAuditOpenRule(\'' + faEscape(r.rule_id) + '\')">' + faEscape(r.rule_id) + '</a></td>' +
                        '<td>' + faEscape(r.name) + '</td>' +
                        '<td>' + faActionBadge(r.action) + '</td>' +
                        '<td class="fa-cell-small">' + faListPreview(r.src_addresses) + '</td>' +
                        '<td class="fa-cell-small">' + faListPreview(r.dst_addresses) + '</td>' +
                        '<td class="fa-cell-small">' + faListPreview(r.services) + '</td>' +
                        '<td class="fa-cell-small">' + faEscape(r.comments || '-') + '</td></tr>';
                });
                dead.innerHTML = dh;
            }
        });
    }

    // 3 sub-tab: 'all_active' (limit=0, hit>0 tum kurallar), 'top' (limit=20), 'dead' (hit=0 ayri liste)
    var _faHcCurrentSub = 'all_active';
    window.fireAuditHcSubTab = function(name) {
        var btns = document.querySelectorAll('#fa-tab-hitcount .fa-mode-btn');
        for (var i = 0; i < btns.length; i++) btns[i].classList.toggle('active', btns[i].getAttribute('data-hc-sub') === name);
        // Tum aktifler ve Top 20 ayni tabloyu kullanir (fa-hc-sub-top), sadece limit degisir
        var showTop = (name === 'top' || name === 'all_active');
        document.getElementById('fa-hc-sub-top').style.display = showTop ? '' : 'none';
        document.getElementById('fa-hc-sub-dead').style.display = name === 'dead' ? '' : 'none';
        // Limit ayari — sub-tab degismisse her zaman reload et
        var newLimit = (name === 'top') ? 20 : 0;
        var subChanged = (name !== _faHcCurrentSub);
        _faHcCurrentSub = name;
        faHcLimit = newLimit;
        if (subChanged) {
            loadHitCount();
        }
    };

    // ---------- Policy Query (AlgoSec Traffic Simulation) ----------
    var queryCurrentMode = 'basic';

    window.fireAuditQueryMode = function(mode) {
        queryCurrentMode = mode;
        var btns = document.querySelectorAll('#fa-tab-target .fa-mode-btn');
        for (var i = 0; i < btns.length; i++) btns[i].classList.toggle('active', btns[i].getAttribute('data-mode') === mode);
        document.getElementById('fa-query-basic').style.display = mode === 'basic' ? '' : 'none';
        document.getElementById('fa-query-advanced').style.display = mode === 'advanced' ? '' : 'none';
    };

    window.fireAuditQueryReset = function() {
        ['fa-query-src','fa-query-dst','fa-query-svc','fa-query-basic-input'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.value = '';
        });
        document.getElementById('fa-query-action').value = '';
        document.getElementById('fa-query-include-any').checked = false;
        document.getElementById('fa-query-basic-any').checked = false;
        document.getElementById('fa-query-match-mode').value = 'all';
        document.getElementById('fa-query-enabled-only').checked = true;
        document.getElementById('fa-target-tbody').innerHTML = '<tr><td colspan="7"><em>Filtre girin ve sorgula</em></td></tr>';
        document.getElementById('fa-target-summary').innerHTML = '';
    };

    window.fireAuditRunQuery = function(mode) {
        var sum = document.getElementById('fa-target-summary');
        var tbody = document.getElementById('fa-target-tbody');
        var params = {};

        if (mode === 'basic') {
            var v = document.getElementById('fa-query-basic-input').value.trim();
            if (!v) { alert('Lütfen aranacak değeri girin'); return; }
            // Basic mode: hem src hem dst'de ara → match_mode=any
            params.src = v;
            params.dst = v;
            params.match_mode = 'any';
            params.include_any = document.getElementById('fa-query-basic-any').checked ? '1' : '0';
        } else {
            // Tırnak/boşluk temizliği — kopyala-yapıştır kazalarını engelle
            var clean = function(s) {
                return (s || '').replace(/^["'`\u201c\u201d\u2018\u2019\s]+|["'`\u201c\u201d\u2018\u2019\s]+$/g, '');
            };
            params.src = clean(document.getElementById('fa-query-src').value);
            params.dst = clean(document.getElementById('fa-query-dst').value);
            params.svc = clean(document.getElementById('fa-query-svc').value);
            // NOT: backend 'action' yerine 'policy_action' bekliyor (PHP proxy çakışması)
            params.policy_action = document.getElementById('fa-query-action').value;
            params.include_any = document.getElementById('fa-query-include-any').checked ? '1' : '0';
            params.match_mode = document.getElementById('fa-query-match-mode').value;
            params.enabled = document.getElementById('fa-query-enabled-only').checked ? '1' : '0';
            if (!params.src && !params.dst && !params.svc && !params.policy_action) {
                alert('En az bir filtre girin');
                return;
            }
        }

        sum.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sorgulanıyor...';
        tbody.innerHTML = '<tr><td colspan="7">Yükleniyor...</td></tr>';
        console.log('[FireScope Query] mode=' + mode + ' fw=' + FW_SLUG + ' params=', params);
        faApi('query', params).then(function(res) {
            console.log('[FireScope Query] response:', res);
            if (!res.success) {
                sum.innerHTML = '<span style="color:#e74c3c">Hata: ' + faEscape(res.error || '') + '</span>';
                tbody.innerHTML = '<tr><td colspan="7">-</td></tr>'; return;
            }
            var skipNote = res.skipped_any_rules > 0
                ? ' &middot; <span style="color:#7f8c8d"><i class="fas fa-filter"></i> ' + res.skipped_any_rules + ' kural ANY filtresinden dolayı atlandı</span>'
                : '';
            var warnHtml = '';
            if (res.warnings && res.warnings.length) {
                warnHtml = '<div style="background:#fef9e7;border-left:3px solid #f39c12;padding:8px 12px;margin-bottom:8px;border-radius:4px;font-size:.85rem;">' +
                    '<strong><i class="fas fa-exclamation-triangle"></i> Uyarı:</strong><ul style="margin:4px 0 0 18px;">' +
                    res.warnings.map(function(w) { return '<li>' + faEscape(w) + '</li>'; }).join('') +
                    '</ul></div>';
            }
            sum.innerHTML = warnHtml +
                '<strong>' + res.matched + '</strong> kural eşleşti ' +
                '<span style="color:#27ae60">(allow: ' + (res.allow_count || 0) + ')</span> · ' +
                '<span style="color:#c0392b">(deny: ' + (res.deny_count || 0) + ')</span>' + skipNote;

            if (!res.rules || !res.rules.length) {
                tbody.innerHTML = '<tr><td colspan="7"><em>Eşleşme yok. ANY filtresini kapatmayı dene veya filtreleri gevşet.</em></td></tr>';
                return;
            }

            function matchCell(status, detail) {
                if (!status) return '<em style="color:#bdc3c7">—</em>';
                var cls = 'fa-match-' + status.replace(/-/g, '');
                var icon = status.startsWith('match') ? '✓' : '×';
                return '<span class="fa-match-tag ' + cls + '">' + icon + '</span> ' +
                    '<small>' + faEscape(detail || '') + '</small>';
            }

            var html = '';
            res.rules.forEach(function(r) {
                html += '<tr>' +
                    '<td><a class="fa-rule-link" onclick="fireAuditOpenRule(\'' + faEscape(r.rule_id) + '\')">' + faEscape(r.rule_id) + '</a></td>' +
                    '<td>' + faEscape(r.name) + '</td>' +
                    '<td>' + faActionBadge(r.action) + '</td>' +
                    '<td>' + matchCell(r.src_match_status, r.src_match) + '</td>' +
                    '<td>' + matchCell(r.dst_match_status, r.dst_match) + '</td>' +
                    '<td>' + matchCell(r.svc_match_status, r.svc_match) + '</td>' +
                    '<td>' + faSevBadge(r.severity || 'LOW') + ' <small>' + (r.score || 0) + '</small></td>' +
                    '</tr>';
            });
            tbody.innerHTML = html;
        });
    };

    // Backward-compat shim — eski tab içeriğindeki onclick için
    window.loadFireAuditTarget = function() {
        var oldInput = document.getElementById('fa-target-ip');
        if (oldInput && oldInput.value) {
            // Eski input varsa basic input'a kopyala
            var basicInput = document.getElementById('fa-query-basic-input');
            if (basicInput) basicInput.value = oldInput.value;
        }
        fireAuditRunQuery(queryCurrentMode);
    };

    // ---------- Zone Matrix (2D grid) ----------
    function loadZoneMatrix() {
        var wrap = document.getElementById('fa-zone-matrix-wrap');
        wrap.innerHTML = '<div><i class="fas fa-spinner fa-spin"></i> Matrix oluşturuluyor...</div>';
        faApi('zone_matrix').then(function(res) {
            if (!res.success || !res.cells.length) { wrap.innerHTML = '<em>Zone matrix yok.</em>'; return; }
            var zones = res.zones || [];
            var cellMap = {};
            res.cells.forEach(function(c) {
                cellMap[c.src_zone + '→' + c.dst_zone] = c;
            });

            var html = '<table class="fa-zone-matrix-table"><thead><tr><th class="corner">Src \\ Dst</th>';
            zones.forEach(function(dst) {
                html += '<th>' + faEscape(dst.replace(/^unzoned:/, '')) + '</th>';
            });
            html += '</tr></thead><tbody>';
            zones.forEach(function(src) {
                html += '<tr><th>' + faEscape(src.replace(/^unzoned:/, '')) + '</th>';
                zones.forEach(function(dst) {
                    var key = src + '→' + dst;
                    var cell = cellMap[key];
                    if (!cell) {
                        html += '<td class="fa-zm-empty">·</td>';
                        return;
                    }
                    var risk = cell.risk || 0;
                    var cls = 'fa-zm-cell';
                    if (risk >= 80) cls += ' fa-zm-crit';
                    else if (risk >= 60) cls += ' fa-zm-high';
                    else if (risk >= 40) cls += ' fa-zm-med';
                    else cls += ' fa-zm-ok';
                    if (cell.ack_state) cls += ' fa-zm-acked';
                    var tip = 'src=' + src + '\ndst=' + dst + '\nallow=' + cell.allow + ' deny=' + cell.deny + ' any=' + cell.any + ' risk=' + risk +
                        '\nTıkla → ack uygula veya görüntüle';
                    var zmId = src + '→' + dst;
                    html += '<td class="' + cls + '" title="' + faEscape(tip) + '" style="cursor:pointer" ' +
                        'onclick="fireAuditAckOpen({items:[{finding_type:\'zone_matrix\',rule_id:' + JSON.stringify(zmId).replace(/"/g,'&quot;') + '}],initialState:\'fp\'})">' +
                        '<div class="fa-zm-counts">' + (cell.allow || 0) + '<small>/' + (cell.deny || 0) + '</small></div>' +
                        '<div class="fa-zm-risk">' + risk + '</div>' +
                        (cell.ack_state ? '<div class="fa-zm-ack-mark"><i class="fas fa-shield-alt"></i></div>' : '') +
                        (cell.any > 0 ? '<div class="fa-zm-any">ANY</div>' : '') +
                        '</td>';
                });
                html += '</tr>';
            });
            html += '</tbody></table>';
            html += '<div class="fa-zm-legend">' +
                '<span class="fa-zm-cell fa-zm-crit">≥80 CRIT</span> ' +
                '<span class="fa-zm-cell fa-zm-high">60-79 HIGH</span> ' +
                '<span class="fa-zm-cell fa-zm-med">40-59 MED</span> ' +
                '<span class="fa-zm-cell fa-zm-ok">&lt;40 OK</span>' +
                '</div>';
            wrap.innerHTML = html;
        });
    }

    // ---------- VPNs tab ----------
    window.fireAuditVpnSubTab = function(name) {
        var btns = document.querySelectorAll('#fa-tab-vpns [data-vpn-sub]');
        for (var i = 0; i < btns.length; i++)
            btns[i].classList.toggle('active', btns[i].getAttribute('data-vpn-sub') === name);
        ['communities','rules','users','policy_map','vpn_central_nat'].forEach(function(s) {
            var el = document.getElementById('fa-vpn-sub-' + s);
            if (el) el.style.display = (s === name) ? '' : 'none';
        });
        if (name === 'users') loadVpnUsers();
        if (name === 'rules') loadVpnRules();
        if (name === 'policy_map') loadVpnAllRules();
        if (name === 'vpn_central_nat') loadVpnCentralNat(1);
    };

    // ---------- VPN sayfasındaki Central NAT ----------
    var _vpnCnatPage = 1;
    var _vpnCnatTotalPages = 1;
    var _vpnCnatPerPage = 50;

    window.loadVpnCentralNat = function(page) {
        if (page) _vpnCnatPage = page;
        var params = {
            page: _vpnCnatPage,
            per_page: _vpnCnatPerPage,
            search: (document.getElementById('fa-vpn-cnat-search') || {}).value || '',
            status: (document.getElementById('fa-vpn-cnat-status') || {}).value || '',
        };
        var tbody = document.getElementById('fa-vpn-cnat-tbody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="10"><i class="fas fa-spinner fa-spin"></i> Yükleniyor...</td></tr>';
        faApi('central_nat', params).then(function(res) {
            if (!res.success) {
                tbody.innerHTML = '<tr><td colspan="10">Hata: ' + faEscape(res.error || '') + '</td></tr>';
                return;
            }
            _vpnCnatTotalPages = res.total_pages || 1;
            _vpnCnatPage = res.page || 1;
            _renderCnatRows(res.rules || [], 'fa-vpn-cnat-tbody');
            _renderVpnCnatPagination(res.total);
        });
    };

    function _renderVpnCnatPagination(total) {
        var info = document.getElementById('fa-vpn-cnat-pagination-info');
        var buttons = document.getElementById('fa-vpn-cnat-pagination-buttons');
        if (!info || !buttons) return;
        if (!total) { info.textContent = 'Kayıt yok'; buttons.innerHTML = ''; return; }
        var start = (_vpnCnatPage - 1) * _vpnCnatPerPage + 1;
        var end = Math.min(_vpnCnatPage * _vpnCnatPerPage, total);
        info.textContent = 'Toplam ' + total + ' kural (' + start + '-' + end + ')';
        var html = '<button ' + (_vpnCnatPage <= 1 ? 'disabled' : '') + ' onclick="loadVpnCentralNat(1)">«</button>';
        html += '<button ' + (_vpnCnatPage <= 1 ? 'disabled' : '') + ' onclick="loadVpnCentralNat(' + (_vpnCnatPage - 1) + ')">‹</button>';
        var startP = Math.max(1, _vpnCnatPage - 2), endP = Math.min(_vpnCnatTotalPages, _vpnCnatPage + 2);
        for (var p = startP; p <= endP; p++) {
            html += '<button class="' + (p === _vpnCnatPage ? 'active' : '') + '" onclick="loadVpnCentralNat(' + p + ')">' + p + '</button>';
        }
        html += '<button ' + (_vpnCnatPage >= _vpnCnatTotalPages ? 'disabled' : '') + ' onclick="loadVpnCentralNat(' + (_vpnCnatPage + 1) + ')">›</button>';
        html += '<button ' + (_vpnCnatPage >= _vpnCnatTotalPages ? 'disabled' : '') + ' onclick="loadVpnCentralNat(' + _vpnCnatTotalPages + ')">»</button>';
        buttons.innerHTML = html;
    }

    // ---------- VPN strength analizi ----------
    // Encryption / integrity algoritmalarini "strong / acceptable / weak / critical" siniflandir.
    var _VPN_ENC_RANK = {
        'aes-gcm-256':4,'aes-gcm-128':4,'aes-256-gcm':4,'aes-128-gcm':4,'chacha20':4,
        'aes-256':4,'aes256':4,'aes-cbc-256':4,'aes-256-cbc':4,
        'aes-192':3,'aes192':3,
        'aes-128':3,'aes128':3,'aes-cbc-128':3,'aes-128-cbc':3,
        'cast':2,'cast-128':2,'blowfish':2,
        '3des':1,'des3':1,
        'des':0,'rc4':0,'null':0,
    };
    var _VPN_INT_RANK = {
        'sha512':4,'sha-512':4,'sha384':4,'sha-384':4,'sha2-512':4,'sha2-384':4,
        'sha256':4,'sha-256':4,'sha2-256':4,
        'sha2-128':3,
        'sha':2,'sha1':2,'sha-1':2,
        'md5':0,
    };
    function _algoRankFromMap(val, mp) {
        if (!val) return null;
        var key = String(val).trim().toLowerCase().replace(/_/g, '-');
        if (key in mp) return mp[key];
        // partial match: aes-256 / aes-128 vs.
        for (var k in mp) {
            if (key.indexOf(k) >= 0) return mp[k];
        }
        return null;
    }
    function _dhRank(dh) {
        if (!dh) return null;
        var n = parseInt(String(dh).match(/(\d+)/) ? String(dh).match(/(\d+)/)[1] : 0, 10);
        if (n >= 19) return 4;       // ECDH (19, 20, 21)
        if (n >= 14) return 3;       // 2048-bit MODP
        if (n >= 5) return 2;        // 1536-bit
        if (n >= 1) return 0;        // 768/1024-bit (kirilmis)
        return null;
    }
    function _rankColor(rank) {
        if (rank === null || rank === undefined) return '#95a5a6';
        if (rank >= 4) return '#27ae60';   // strong (yesil)
        if (rank >= 3) return '#16a085';   // acceptable (turkuaz)
        if (rank >= 2) return '#f39c12';   // weak (turuncu)
        return '#c0392b';                  // critical (kirmizi)
    }
    function _rankLabel(rank) {
        if (rank === null || rank === undefined) return '?';
        if (rank >= 4) return 'Strong';
        if (rank >= 3) return 'Acceptable';
        if (rank >= 2) return 'Weak';
        return 'Critical';
    }
    function _faVpnAlgoBadge(val, kind) {
        if (!val) return '<span style="color:#95a5a6">-</span>';
        var mp = (kind === 'int') ? _VPN_INT_RANK : _VPN_ENC_RANK;
        var rank = _algoRankFromMap(val, mp);
        var color = _rankColor(rank);
        var label = _rankLabel(rank);
        return '<span style="display:inline-block;padding:2px 8px;border-radius:10px;background:' + color + '22;color:' + color + ';font-size:.74rem;font-family:monospace;font-weight:600;" title="' + faEscape(label) + '">' +
               faEscape(String(val)) + '</span>';
    }
    function faAnalyzeVpnStrength(v) {
        // Tüm 4 parametreyi (ike_enc, ike_int, data_enc, data_int) + dhgrp + ike_version + auth değerlendir
        var ranks = [];
        var weak_reasons = [];
        var ike_enc_rank = _algoRankFromMap(v.ike_enc, _VPN_ENC_RANK);
        var ike_int_rank = _algoRankFromMap(v.ike_int, _VPN_INT_RANK);
        var data_enc_rank = _algoRankFromMap(v.data_enc, _VPN_ENC_RANK);
        var data_int_rank = _algoRankFromMap(v.data_int, _VPN_INT_RANK);
        var dh_rank = _dhRank(v.dhgrp);
        // Proposal field'inden parse fallback
        if ((ike_enc_rank === null || data_enc_rank === null) && v.proposal) {
            var pp = String(v.proposal).split('+').map(function(s){return s.trim().split('/');});
            if (pp[0]) {
                if (ike_enc_rank === null) ike_enc_rank = _algoRankFromMap(pp[0][0], _VPN_ENC_RANK);
                if (ike_int_rank === null) ike_int_rank = _algoRankFromMap(pp[0][1], _VPN_INT_RANK);
            }
            if (pp[1]) {
                if (data_enc_rank === null) data_enc_rank = _algoRankFromMap(pp[1][0], _VPN_ENC_RANK);
                if (data_int_rank === null) data_int_rank = _algoRankFromMap(pp[1][1], _VPN_INT_RANK);
            }
        }
        [ike_enc_rank, ike_int_rank, data_enc_rank, data_int_rank, dh_rank].forEach(function(r) {
            if (r !== null && r !== undefined) ranks.push(r);
        });
        if (ike_enc_rank !== null && ike_enc_rank < 3) weak_reasons.push('IKE Phase1 enc zayif (' + (v.ike_enc || '?') + ')');
        if (ike_int_rank !== null && ike_int_rank < 3) weak_reasons.push('IKE Phase1 int zayif (' + (v.ike_int || '?') + ')');
        if (data_enc_rank !== null && data_enc_rank < 3) weak_reasons.push('IPsec Phase2 enc zayif (' + (v.data_enc || '?') + ')');
        if (data_int_rank !== null && data_int_rank < 3) weak_reasons.push('IPsec Phase2 int zayif (' + (v.data_int || '?') + ')');
        // Phase1 DH (ike_dh) ve Phase2 DH (ipsec_dh) ayri ayri kontrol
        var p1_dh_rank = _dhRank(v.ike_dh || v.dhgrp);
        if (p1_dh_rank !== null && p1_dh_rank < 3) weak_reasons.push('Phase1 DH grubu zayif (' + (v.ike_dh || v.dhgrp || '?') + ')');
        if (p1_dh_rank !== null) ranks.push(p1_dh_rank);
        var p2_dh_rank = _dhRank(v.ipsec_dh);
        if (p2_dh_rank !== null && p2_dh_rank < 3) weak_reasons.push('Phase2 DH grubu zayif (' + (v.ipsec_dh || '?') + ')');
        // IKE version analizi (CheckPoint string'lerini kapsa)
        var ike_ver_str = String(v.encryption_method || v.ike_version || '').toLowerCase();
        if (ike_ver_str === 'ikev1 only' || ike_ver_str === 'ikev1-only' || ike_ver_str === '1' || ike_ver_str === 'ikev1') {
            weak_reasons.push('Sadece IKEv1 kullaniliyor (IKEv2 onerilir)');
            ranks.push(0);
        } else if (ike_ver_str.indexOf('prefer ikev1') >= 0 || ike_ver_str === 'prefer-ikev1') {
            weak_reasons.push('IKEv1 tercih ediliyor (IKEv2-only yapilmali)');
            ranks.push(2);
        } else if (ike_ver_str.indexOf('compatible') >= 0 || ike_ver_str.indexOf('prefer ikev2 but support ikev1') >= 0) {
            weak_reasons.push('IKEv1 fallback aktif (sadece IKEv2 yap)');
            ranks.push(3);
        } else if (ike_ver_str.indexOf('ikev2 only') >= 0 || ike_ver_str === 'ikev2-only') {
            ranks.push(4);
        }
        // PFS / PSK
        if (v.pfs === false) weak_reasons.push('Perfect Forward Secrecy kapali (Phase2 ayri DH yapmali)');
        if (v.pfs === true) ranks.push(4);
        if (v.has_psk === true || v.psksecret_set) {
            weak_reasons.push('PSK (Pre-Shared Key) kullaniliyor — Sertifika tabanli auth\'a gec');
            ranks.push(2);
        }
        var avg = ranks.length ? (ranks.reduce(function(a,b){return a+b;}, 0) / ranks.length) : null;
        var rank = avg === null ? null : Math.round(avg);
        return {
            rank: rank,
            label: _rankLabel(rank),
            color: _rankColor(rank),
            weak_reasons: weak_reasons,
            badge: '<span style="display:inline-block;padding:3px 10px;border-radius:12px;background:' + _rankColor(rank) + ';color:#fff;font-size:.74rem;font-weight:700;" title="' + faEscape(_rankLabel(rank)) + ' — ortalama crypto skoru">' +
                   '<i class="fas fa-' + (rank >= 3 ? 'shield-alt' : 'exclamation-triangle') + '"></i> ' + faEscape(_rankLabel(rank)) + '</span>',
        };
    }
    // VPN IKE version badge — CheckPoint string'lerini human-readable + renkli yapar
    function _faVpnIkeVerBadge(s) {
        if (!s) return '<span style="color:#95a5a6">?</span>';
        var k = String(s).toLowerCase().trim();
        var map = {
            'prefer ikev2 but support ikev1': {tag: 'IKEv2 (preferred)', color: '#27ae60', tip: 'IKEv2 tercih, IKEv1 fallback aktif'},
            'prefer-ikev2':                    {tag: 'IKEv2 (preferred)', color: '#27ae60', tip: 'IKEv2 tercih'},
            'ikev2 only':                      {tag: 'IKEv2 only',        color: '#27ae60', tip: 'Sadece IKEv2 — en guvenli'},
            'ikev2-only':                      {tag: 'IKEv2 only',        color: '#27ae60', tip: 'Sadece IKEv2'},
            'prefer ikev1 but support ikev2':  {tag: 'IKEv1 (preferred)', color: '#e67e22', tip: 'IKEv1 tercih — IKEv2 yapilmali'},
            'prefer-ikev1':                    {tag: 'IKEv1 (preferred)', color: '#e67e22', tip: 'IKEv1 tercih — guncellenmeli'},
            'ikev1 only':                      {tag: 'IKEv1 only',        color: '#c0392b', tip: 'Sadece IKEv1 — DEPRECATED, IKEv2 zorunlu'},
            'ikev1-only':                      {tag: 'IKEv1 only',        color: '#c0392b', tip: 'Sadece IKEv1 — DEPRECATED'},
            'compatible':                      {tag: 'IKEv1 + IKEv2',     color: '#f39c12', tip: 'Her iki versiyon kabul'},
            'ikev1 + ikev2':                   {tag: 'IKEv1 + IKEv2',     color: '#f39c12', tip: 'Her iki versiyon kabul'},
        };
        var m = map[k];
        if (!m) return '<span style="font-size:.74rem;color:#7f8c8d">' + faEscape(s) + '</span>';
        return '<span style="display:inline-block;padding:2px 8px;border-radius:10px;background:' + m.color + ';color:#fff;font-size:.72rem;font-weight:700;" title="' + faEscape(m.tip) + '">' + faEscape(m.tag) + '</span>';
    }
    // DH grup badge — group-1/2 kritik, 14+ guclu, 19+ ECDH cok guclu
    function _faVpnDhBadge(dh) {
        if (!dh) return '<span style="color:#95a5a6">-</span>';
        var rank = _dhRank(dh);
        var color = _rankColor(rank);
        return '<span style="display:inline-block;padding:2px 8px;border-radius:10px;background:' + color + '22;color:' + color + ';font-size:.72rem;font-family:monospace;font-weight:600;" title="' + faEscape(_rankLabel(rank)) + '">' + faEscape(String(dh)) + '</span>';
    }
    // Auth badge — PSK kirmizi, Certificate yesil
    function _faVpnAuthBadge(authmethod, has_psk, psksecret_set) {
        var isPsk = has_psk || psksecret_set || (authmethod && authmethod.toUpperCase() === 'PSK');
        var isCert = authmethod && /cert/i.test(authmethod);
        if (isPsk) {
            return '<span style="display:inline-block;padding:2px 8px;border-radius:10px;background:#e67e22;color:#fff;font-size:.72rem;font-weight:700;" title="Pre-Shared Key — sertifika tabanli auth\'a gec"><i class="fas fa-key"></i> PSK</span>';
        }
        if (isCert) {
            return '<span style="display:inline-block;padding:2px 8px;border-radius:10px;background:#27ae60;color:#fff;font-size:.72rem;font-weight:700;" title="Certificate-based auth — guclu"><i class="fas fa-certificate"></i> Cert</span>';
        }
        return '<span style="color:#95a5a6">' + faEscape(authmethod || '-') + '</span>';
    }

    // FortiGate peertype badge: static / dialup / dynamic
    function _faVpnPeerTypeBadge(peertype, remote_gw) {
        var ptColors = {
            'static':  { bg: '#eaf4fb', color: '#2874a6', icon: 'fa-map-pin',     label: 'Static' },
            'dialup':  { bg: '#fef9e7', color: '#b7950b', icon: 'fa-phone',       label: 'Dialup' },
            'dynamic': { bg: '#f9ebea', color: '#c0392b', icon: 'fa-random',      label: 'Dynamic' },
        };
        var pt = (peertype || 'static').toLowerCase();
        var c = ptColors[pt] || { bg: '#f2f3f4', color: '#7f8c8d', icon: 'fa-question', label: peertype || '?' };
        var badge = '<span style="display:inline-block;padding:1px 7px;border-radius:8px;background:' + c.bg + ';color:' + c.color + ';font-size:.7rem;font-weight:700;" title="peertype: ' + faEscape(peertype || '') + '"><i class="fas ' + c.icon + '"></i> ' + faEscape(c.label) + '</span>';
        var gw = remote_gw ? '<div style="font-size:.7rem;color:var(--text-muted);margin-top:2px;font-family:monospace;">' + faEscape(remote_gw) + '</div>' : '';
        return badge + gw;
    }

    // Lifetime saniye → "8h" / "24h" / "28800s" formatı
    function _faLifetimeStr(sec) {
        if (sec === null || sec === undefined || sec === '') return '-';
        var s = parseInt(sec, 10);
        if (isNaN(s)) return faEscape(String(sec));
        if (s >= 3600 && s % 3600 === 0) return (s / 3600) + 'h';
        if (s >= 60 && s % 60 === 0) return (s / 60) + 'm';
        return s + 's';
    }

    // P1/P2 lifetime çifti — "P1: 24h / P2: 1h"
    function _faLifetimePair(p1_sec, p2_sec) {
        var p1 = _faLifetimeStr(p1_sec);
        var p2 = _faLifetimeStr(p2_sec);
        if (p1 === '-' && p2 === '-') return '<span style="color:#bdc3c7">—</span>';
        var color = function(s) {
            var v = parseInt(s);
            if (isNaN(v)) return 'var(--text-color)';
            return v > 86400 ? '#e74c3c' : v < 3600 ? '#e67e22' : '#27ae60';
        };
        var html = '';
        if (p1 !== '-') html += '<span style="font-size:.7rem;color:' + color(p1_sec) + ';font-family:monospace;" title="Phase1 (IKE) keylife">P1: ' + faEscape(p1) + '</span>';
        if (p1 !== '-' && p2 !== '-') html += '<br>';
        if (p2 !== '-') html += '<span style="font-size:.7rem;color:' + color(p2_sec) + ';font-family:monospace;" title="Phase2 (IPsec) keylife">P2: ' + faEscape(p2) + '</span>';
        return html;
    }

    // VPN topology badge — star (hub-spoke) / meshed (full mesh) — CheckPoint spesifik
    function _faVpnTopoBadge(t) {
        if (!t) return '<span style="color:#95a5a6">?</span>';
        var s = String(t).toLowerCase();
        if (s === 'star' || s === 'hub-spoke' || s === 'spoke') {
            return '<span style="display:inline-block;padding:2px 10px;border-radius:10px;background:#3498db22;color:#2980b9;font-size:.74rem;font-weight:700;" title="Hub-and-spoke (yildiz topoloji)"><i class="fas fa-star"></i> Star</span>';
        }
        if (s === 'meshed' || s === 'mesh' || s === 'full-mesh' || s === 'remote-access') {
            return '<span style="display:inline-block;padding:2px 10px;border-radius:10px;background:#9b59b622;color:#8e44ad;font-size:.74rem;font-weight:700;" title="Mesh (full mesh / herkes herkesle)"><i class="fas fa-project-diagram"></i> Mesh</span>';
        }
        return '<span style="display:inline-block;padding:2px 10px;border-radius:10px;background:#95a5a622;color:#7f8c8d;font-size:.74rem;font-weight:600;" title="' + faEscape(t) + '">' + faEscape(t) + '</span>';
    }

    // Tunel detay paneli: SADECE dolu olan field'lari render et (bos olanlari gizle)
    function _faVpnDetailHtml(v, st) {
        // Yardimci: row ekle ama sadece deger varsa
        function _row(label, val, asCode) {
            if (val === null || val === undefined) return '';
            var s = (typeof val === 'string') ? val.trim() : val;
            if (s === '' || s === '-' || s === 0 || (Array.isArray(s) && !s.length)) return '';
            var content = (typeof s === 'object') ? JSON.stringify(s) : String(s);
            return '<tr><th>' + label + '</th><td>' + (asCode ? '<code style="font-size:.72rem">' + faEscape(content) + '</code>' : faEscape(content)) + '</td></tr>';
        }
        function _algoRow(label, val, kind) {
            if (!val) return '';
            return '<tr><th>' + label + '</th><td>' + _faVpnAlgoBadge(val, kind) + '</td></tr>';
        }
        var rows = '';
        rows += _row('Tunel Adı', v.name);
        var topoVal = v.vpn_type || v.peertype;
        if (topoVal) rows += '<tr><th>Topology</th><td>' + _faVpnTopoBadge(topoVal) + '</td></tr>';
        rows += _row('Interface', v.interface);
        var gwStr = v.remote_gw || (v.gateways||[]).map(function(g){return (g.name||'') + (g.ipv4_address?' ('+g.ipv4_address+')':'');}).filter(Boolean).join(', ');
        rows += _row('Remote GW / Peer(s)', gwStr);
        var ikeVerStr = v.encryption_method || v.ike_version;
        if (ikeVerStr) rows += '<tr><th>IKE Versiyon</th><td>' + _faVpnIkeVerBadge(ikeVerStr) + '</td></tr>';
        rows += _algoRow('Phase1 Encryption', v.ike_enc, 'enc');
        rows += _algoRow('Phase1 Integrity', v.ike_int, 'int');
        var p1dh = v.ike_dh || v.dhgrp;
        if (p1dh) rows += '<tr><th>Phase1 DH Group</th><td>' + _faVpnDhBadge(p1dh) + '</td></tr>';
        if (v.ike_lifetime_sec) rows += _row('Phase1 Lifetime (sn)', v.ike_lifetime_sec);
        rows += _algoRow('Phase2 Encryption', v.data_enc, 'enc');
        rows += _algoRow('Phase2 Integrity', v.data_int, 'int');
        if (v.ipsec_dh) rows += '<tr><th>Phase2 DH Group (PFS)</th><td>' + _faVpnDhBadge(v.ipsec_dh) + '</td></tr>';
        if (v.ipsec_lifetime_sec) rows += _row('Phase2 Lifetime (sn)', v.ipsec_lifetime_sec);
        // PFS aciklama
        if (v.pfs !== null && v.pfs !== undefined) {
            var pfsBadge = v.pfs
                ? '<span style="display:inline-block;padding:2px 8px;border-radius:10px;background:#27ae60;color:#fff;font-size:.72rem;font-weight:700;" title="Perfect Forward Secrecy aktif — Phase 2\'de ayri DH"><i class="fas fa-check"></i> Aktif</span>'
                : '<span style="display:inline-block;padding:2px 8px;border-radius:10px;background:#e67e22;color:#fff;font-size:.72rem;font-weight:700;" title="PFS kapali — Phase1 anahtari Phase2 icin de kullanilir, kompromis riski"><i class="fas fa-times"></i> Kapali</span>';
            rows += '<tr><th>Perfect Forward Secrecy</th><td>' + pfsBadge + '</td></tr>';
        }
        rows += '<tr><th>Auth Method</th><td>' + _faVpnAuthBadge(v.authmethod, v.has_psk, v.psksecret_set) + '</td></tr>';
        rows += _row('NAT Traversal', v.nattraversal);
        rows += _row('Mode Config', v.mode_cfg);
        rows += _row('Raw Proposal', v.proposal, true);
        rows += _row('Comments', v.comments);

        if (!rows) {
            // Hicbir field yoksa açıklama
            rows = '<tr><td colspan="2"><em style="color:#7f8c8d">Bu tunel icin ek parametre cekilemedi (' + faEscape(v.name) + ' uid var ama detay raw\'da yok). Sync sirasinda fetcher daha fazla alan cekemiyor olabilir.</em></td></tr>';
        }
        var h = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">';
        h += '<div><h5 style="margin:0 0 6px;color:var(--text-muted);"><i class="fas fa-key"></i> IKE / IPsec Parametreleri</h5>' +
            '<table class="fa-table fa-table-sm" style="font-size:.78rem;"><tbody>' + rows + '</tbody></table></div>';
        // Strength panel
        h += '<div><h5 style="margin:0 0 6px;color:var(--text-muted);"><i class="fas fa-chart-bar"></i> Crypto Güç Analizi</h5>' +
            '<div style="padding:10px;background:' + st.color + '11;border-left:3px solid ' + st.color + ';border-radius:4px;font-size:.85rem;">' +
            '<div style="font-weight:700;color:' + st.color + ';font-size:1.1rem;margin-bottom:6px;">' +
            '<i class="fas fa-' + (st.rank >= 3 ? 'check-circle' : 'exclamation-triangle') + '"></i> ' + faEscape(st.label) + '</div>';
        if (st.weak_reasons.length) {
            h += '<div style="font-size:.82rem;margin-top:6px;"><strong>Zayıf noktalar:</strong><ul style="margin:4px 0 0 20px;padding:0;">';
            st.weak_reasons.forEach(function(r) { h += '<li>' + faEscape(r) + '</li>'; });
            h += '</ul></div>';
            h += '<div style="margin-top:8px;font-size:.78rem;color:var(--text-muted);"><strong>Öneri:</strong> AES-256-GCM + SHA-384/512 + DH Group 14+ + IKEv2 + Sertifika auth (PSK yerine).</div>';
        } else if (st.rank >= 3) {
            h += '<div style="font-size:.82rem;color:#1e8449;">Tüm parametreler güçlü. Düzenli aralıklarla periodic re-keying ve PFS (Perfect Forward Secrecy) aktif olduğunu doğrula.</div>';
        }
        h += '</div></div>';
        h += '</div>';  // grid
        return h;
    }
    window.fireAuditVpnToggle = function(idx) {
        var det = document.getElementById('fa-vpn-det-' + idx);
        var icon = document.getElementById('fa-vpn-row-' + idx + '-icon');
        if (!det) return;
        var open = det.style.display !== 'none';
        det.style.display = open ? 'none' : '';
        if (icon) icon.className = 'fas fa-chevron-' + (open ? 'down' : 'up');
    };

    function loadVpnRules() {
        var tbody = document.getElementById('fa-vpn-rules-tbody');
        var sumBox = document.getElementById('fa-vpn-rules-summary');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="9"><i class="fas fa-spinner fa-spin"></i></td></tr>';
        // VPN tabi: SADECE user-tanimli VPN community'ye bagli kurallar.
        // CheckPoint her access rule'a default 'Any' VPN community atar — Any bir
        // kurali VPN-spesifik yapmaz; bu yuzden Any-only kurallar tamamen gizli
        // (kullanici tarafindan acilamaz). IPsec tunel yoksa empty state acikliyor.
        var params = { only_specific: '1' };
        faApi('vpn_rules', params).then(function(res) {
            if (!res.success) {
                tbody.innerHTML = '<tr><td colspan="9">Hata: ' + faEscape(res.error || '') + '</td></tr>';
                return;
            }
            var rules = res.rules || [];
            var anyCount = res.any_vpn_count || 0;
            var ipsecCount = res.ipsec_tunnel_count || 0;
            var cnt = document.getElementById('fa-vpn-rules-count');
            if (cnt) cnt.textContent = rules.length;
            var br = res.community_breakdown || {};
            var brHtml = Object.keys(br).map(function(c) {
                return '<span style="background:#3498db15;color:#2980b9;padding:3px 8px;border-radius:4px;margin-right:4px;display:inline-block;">' +
                    faEscape(c) + ': <strong>' + br[c] + '</strong></span>';
            }).join('');
            if (sumBox) sumBox.innerHTML =
                '<strong>' + rules.length + '</strong> VPN community-bağlı kural · ' +
                '<span style="color:var(--text-muted);">' + ipsecCount + ' IPsec tüneli kayıtlı</span>' +
                (brHtml ? '<br><small style="color:var(--text-muted);">Community dağılımı: </small>' + brHtml : '');
            if (!rules.length) {
                if (ipsecCount === 0) {
                    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:18px;color:var(--text-muted);"><em>Bu cihazda IPsec tüneli yok ve VPN community-bağlı kural bulunmuyor.</em></td></tr>';
                } else {
                    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:18px;color:var(--text-muted);"><em>Bu cihazda <strong>' + ipsecCount + '</strong> IPsec tüneli kayıtlı, ancak hiçbir access kuralı user-tanımlı VPN community kullanmıyor (tüm kurallar default "Any" community\'sinde — bu VPN-spesifik değildir).</em></td></tr>';
                }
                return;
            }
            var html = '';
            rules.forEach(function(r) {
                var commHtml = (r.communities || []).map(function(c) {
                    var isAny = r.is_any_only || c === 'Any (genel)' || c === 'Any';
                    var bg = isAny ? '#95a5a622' : '#9b59b622';
                    var color = isAny ? '#7f8c8d' : '#8e44ad';
                    return '<span style="background:' + bg + ';color:' + color + ';padding:2px 6px;border-radius:3px;font-size:.78rem;">' + faEscape(c) + '</span>';
                }).join(' ');
                var hit = r.hit_count === 0 ? '<span style="color:#c0392b;font-weight:700">0</span>' :
                          (r.hit_count != null ? Number(r.hit_count).toLocaleString() : '-');
                html += '<tr class="fa-clickable-row" onclick="fireAuditOpenRule(\'' + faEscape(r.rule_id) + '\')">' +
                    '<td>' + faFormatRuleId(r.rule_id) + '</td>' +
                    '<td>' + faEscape(r.name || '-') + '</td>' +
                    '<td>' + faActionBadge(r.action) + '</td>' +
                    '<td>' + commHtml + '</td>' +
                    '<td class="fa-cell-small">' + faListPreview(r.src_addresses) + '</td>' +
                    '<td class="fa-cell-small">' + faListPreview(r.dst_addresses) + '</td>' +
                    '<td class="fa-cell-small">' + faListPreview(r.services) + '</td>' +
                    '<td style="text-align:right;font-variant-numeric:tabular-nums;">' + hit + '</td>' +
                    '<td class="fa-cell-small">' + faEscape(r.last_modifier || '-') + '</td>' +
                    '</tr>';
            });
            tbody.innerHTML = html;
        }).catch(function() {
            tbody.innerHTML = '<tr><td colspan="9">Yüklenemedi</td></tr>';
        });
    }
    window.loadVpnRules = loadVpnRules;

    function loadVpnUsers() {
        var tbody = document.getElementById('fa-vpn-user-tbody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="6"><i class="fas fa-spinner fa-spin"></i></td></tr>';
        faApi('admins').then(function(res) {
            var users = (res && res.admins) || [];
            var cnt = document.getElementById('fa-vpn-user-count');
            if (cnt) cnt.textContent = users.length;
            if (!users.length) {
                tbody.innerHTML = '<tr><td colspan="6"><em>Admin/user yok — sync çalıştır.</em></td></tr>';
                return;
            }
            var html = '';
            users.forEach(function(u) {
                var auth = u.auth_method || u.authentication || '-';
                var weakAuth = /^(unix|undefined|md5)/i.test(auth) ? ' <span class="fa-tag fa-tag-warn" title="Weak auth">⚠</span>' : '';
                var exp = u.expiration_date || '-';
                var expSoon = '';
                if (exp && exp !== '-') {
                    try {
                        var d = new Date(exp);
                        var now = new Date();
                        var days = Math.floor((d - now) / 86400000);
                        if (days < 0) expSoon = ' <span style="color:#c0392b;font-size:.7rem">EXPIRED</span>';
                        else if (days < 90) expSoon = ' <span style="color:#e67e22;font-size:.7rem">' + days + 'g</span>';
                    } catch(e) {}
                }
                html += '<tr>' +
                    '<td><strong>' + faEscape(u.name || '-') + '</strong></td>' +
                    '<td>' + faEscape(auth) + weakAuth + '</td>' +
                    '<td>' + faEscape(u.accprofile || '-') + '</td>' +
                    '<td>' + faEscape(exp) + expSoon + '</td>' +
                    '<td>' + (u.two_factor === 'yes' ? '✓' : '<span style="color:#e67e22">×</span>') + '</td>' +
                    '<td class="fa-cell-small">' + faEscape(u.comments || '-') + '</td>' +
                    '</tr>';
            });
            tbody.innerHTML = html;
        }).catch(function() {
            tbody.innerHTML = '<tr><td colspan="6">Yüklenemedi</td></tr>';
        });
    }
    window.loadVpnUsers = loadVpnUsers;

    function loadVPNs() {
        // Switch/router (Cisco/Dell/Juniper/Huawei) icin 'VPN Kuralları' ve
        // 'Central NAT' alt-sekmeleri anlamsiz — bunlar firewall policy/NAT
        // kavramlari, router crypto-map/tunnel-protection VPN'lerinde karsiligi
        // yok. Sadece IPsec Tunelleri alt-sekmesi gosterilir.
        var isNetworkDev = NETWORK_TYPES.indexOf(faCurrentFwType()) !== -1;
        var policyMapBtn = document.querySelector('#fa-tab-vpns [data-vpn-sub="policy_map"]');
        var cnatBtn = document.querySelector('#fa-tab-vpns [data-vpn-sub="vpn_central_nat"]');
        if (policyMapBtn) policyMapBtn.style.display = isNetworkDev ? 'none' : '';
        if (cnatBtn) cnatBtn.style.display = isNetworkDev ? 'none' : '';
        if (isNetworkDev) {
            var active = document.querySelector('#fa-tab-vpns [data-vpn-sub].active');
            if (active && (active.getAttribute('data-vpn-sub') === 'policy_map' || active.getAttribute('data-vpn-sub') === 'vpn_central_nat')) {
                fireAuditVpnSubTab('communities');
            }
        }
        var tbody = document.getElementById('fa-vpn-ipsec-tbody');
        tbody.innerHTML = '<tr><td colspan="12"><i class="fas fa-spinner fa-spin"></i></td></tr>';
        faApi('vpns').then(function(res) {
            if (!res.success) { tbody.innerHTML = '<tr><td colspan="12">Hata</td></tr>'; return; }
            document.getElementById('fa-vpn-count').textContent = (res.ipsec || []).length;
            if (!res.ipsec || !res.ipsec.length) { tbody.innerHTML = '<tr><td colspan="12"><em>IPsec tünel yok.</em></td></tr>'; }
            else {
                var html = '';
                res.ipsec.forEach(function(v, idx) {
                    // Proposal'dan Phase1/2 algoritmalarini fallback parse et (CheckPoint icin raw alani da olabilir)
                    if ((!v.ike_enc || !v.data_enc) && v.proposal) {
                        var pp = String(v.proposal).split('+').map(function(s){return s.trim();});
                        if (pp.length >= 2) {
                            var pp0 = pp[0].split('/'); var pp1 = pp[1].split('/');
                            if (!v.ike_enc) v.ike_enc = pp0[0];
                            if (!v.ike_int) v.ike_int = pp0[1];
                            if (!v.data_enc) v.data_enc = pp1[0];
                            if (!v.data_int) v.data_int = pp1[1];
                        }
                    }
                    var st = faAnalyzeVpnStrength(v);
                    var rowId = 'fa-vpn-row-' + idx;
                    var detId = 'fa-vpn-det-' + idx;
                    // FortiGate için peertype+remote_gw göster; CheckPoint için topoloji
                    var typeGwCell = v.vpn_type
                        ? _faVpnTopoBadge(v.vpn_type)
                        : _faVpnPeerTypeBadge(v.peertype, v.remote_gw);
                    var ikeVerBadge = _faVpnIkeVerBadge(v.encryption_method || v.ike_version);
                    var dhBadge = _faVpnDhBadge(v.ike_dh || v.dhgrp);
                    var authBadge = _faVpnAuthBadge(v.authmethod, v.has_psk, v.psksecret_set);
                    var lifetimeCell = _faLifetimePair(v.ike_lifetime_sec, v.ipsec_lifetime_sec);
                    html += '<tr id="' + rowId + '" class="fa-clickable-row" style="cursor:pointer" onclick="fireAuditVpnToggle(' + idx + ')" title="Detay icin tikla">' +
                        '<td><strong>' + faEscape(v.name) + '</strong> <i class="fas fa-chevron-down" id="' + rowId + '-icon" style="font-size:.7em;color:#7f8c8d;"></i></td>' +
                        '<td>' + typeGwCell + '</td>' +
                        '<td>' + ikeVerBadge + '</td>' +
                        '<td>' + _faVpnAlgoBadge(v.ike_enc, 'enc') + '</td>' +
                        '<td>' + _faVpnAlgoBadge(v.ike_int, 'int') + '</td>' +
                        '<td>' + _faVpnAlgoBadge(v.data_enc, 'enc') + '</td>' +
                        '<td>' + _faVpnAlgoBadge(v.data_int, 'int') + '</td>' +
                        '<td>' + dhBadge + '</td>' +
                        '<td>' + authBadge + '</td>' +
                        '<td>' + lifetimeCell + '</td>' +
                        '<td>' + st.badge + '</td>' +
                        '<td>' + (v.severity ? faSevBadge(v.severity) : '<em>OK</em>') + '</td>' +
                        '<td onclick="event.stopPropagation()">' + (v.severity ? faAckButton('vpn', v.name, v.ack_state, v.severity) : '<em style="color:#bdc3c7;font-size:.75rem">OK</em>') + '</td></tr>';
                    // Detay placeholder
                    html += '<tr id="' + detId + '" style="display:none;background:rgba(52,152,219,.04);">' +
                        '<td colspan="13" style="padding:14px 18px;">' + _faVpnDetailHtml(v, st) + '</td></tr>';
                });
                tbody.innerHTML = html;
            }

            // SSL VPN UI'dan kaldirildi (Not: backend ssl_settings/ssl_portals dondurmeye devam eder
            // ama UI artik referans vermez). Eski element'ler index.php'de yok.

            // Kural Haritasi select'ini doldur
            var pmSel = document.getElementById('fa-vpn-pm-select');
            if (pmSel && res.ipsec) {
                var opts = '<option value="">— Tünel seçin —</option>';
                res.ipsec.forEach(function(v) {
                    opts += '<option value="' + faEscape(v.name) + '">'
                          + faEscape(v.name)
                          + (v.remote_gw ? ' (' + faEscape(v.remote_gw) + ')' : '')
                          + '</option>';
                });
                pmSel.innerHTML = opts;
            }
            // VPN Kuralları sub-tab'ı arka planda yükle (sub-tab açıldığında hazır olsun)
            if (!_vpnAllRulesCache) {
                loadVpnAllRules();
            }
        });
    }

    var _vpnAllRulesCache = null;

    function loadVpnAllRules(forceReload) {
        // Cache varsa ve force değilse yeniden çekme, sadece render et
        if (_vpnAllRulesCache && !forceReload) {
            _renderVpnAllRules(_vpnAllRulesCache.rules || []);
            return;
        }
        var tbody = document.getElementById('fa-vpn-allrules-tbody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="9"><i class="fas fa-spinner fa-spin"></i> Yükleniyor…</td></tr>';
        _vpnAllRulesCache = null;

        faApi('vpn_all_rules').then(function(d) {
            if (!d.success) {
                if (tbody) tbody.innerHTML = '<tr><td colspan="9" style="color:#e74c3c">Hata: ' + faEscape(d.error || '') + '</td></tr>';
                return;
            }
            _vpnAllRulesCache = d;
            _vpnAllRulesCache._tunnelInfo = d.tunnel_info || {};
            _vpnAllRulesCache._localNets  = d.local_nets   || [];

            // Tünel filtre select'ini doldur (VPN listesini de kullan)
            var pmSel = document.getElementById('fa-vpn-pm-select');
            if (pmSel) {
                var tunnelSet = {};
                (d.rules || []).forEach(function(r) {
                    (r.tunnels || []).forEach(function(t) { tunnelSet[t] = true; });
                });
                var opts = '<option value="">Tüm tüneller</option>';
                Object.keys(tunnelSet).sort().forEach(function(t) {
                    opts += '<option value="' + faEscape(t) + '">' + faEscape(t) + '</option>';
                });
                pmSel.innerHTML = opts;
            }

            var cntEl = document.getElementById('fa-vpn-all-rule-count');
            if (cntEl) cntEl.textContent = '(' + (d.total || 0) + ' kural, ' + d.tunnel_count + ' tünel)';

            _renderVpnAllRules(d.rules || []);
        });
    }
    window.loadVpnAllRules = loadVpnAllRules;

    window.filterVpnAllRules = function() {
        if (!_vpnAllRulesCache) return;
        var sel = (document.getElementById('fa-vpn-pm-select') || {}).value || '';
        var rules = _vpnAllRulesCache.rules || [];
        if (sel) rules = rules.filter(function(r) { return (r.tunnels || []).indexOf(sel) !== -1; });
        _renderVpnAllRules(rules);
    };

    function _renderVpnAllRules(rules) {
        var tbody = document.getElementById('fa-vpn-allrules-tbody');
        if (!tbody) return;
        if (!rules.length) {
            tbody.innerHTML = '<tr><td colspan="9" style="color:var(--text-muted)"><em>Eşleşen kural yok.</em></td></tr>';
            return;
        }
        var rows = [];
        rules.forEach(function(r, idx) {
            var isAllow = r.action === 'allow';
            var actionBadge = isAllow
                ? '<span style="padding:2px 8px;border-radius:10px;background:#27ae60;color:#fff;font-size:.72rem;font-weight:700"><i class="fas fa-check"></i> Allow</span>'
                : '<span style="padding:2px 8px;border-radius:10px;background:#e74c3c;color:#fff;font-size:.72rem;font-weight:700"><i class="fas fa-ban"></i> Deny</span>';
            var rowStyle = r.enabled ? '' : 'opacity:.5;';
            var hitVal = (r.hit_count !== null && r.hit_count !== undefined) ? r.hit_count : '-';
            var hitStyle = hitVal === 0 ? 'color:#e74c3c;font-weight:600' : (hitVal > 1000 ? 'color:#27ae60;font-weight:600' : '');
            var statusBadge = r.enabled
                ? '<span style="font-size:.72rem;color:#27ae60"><i class="fas fa-check-circle"></i></span>'
                : '<span style="font-size:.72rem;color:#e74c3c"><i class="fas fa-times-circle"></i> Pasif</span>';
            var tunnelBadges = (r.tunnels || []).map(function(t) {
                return '<span style="display:inline-block;margin:1px 2px;padding:1px 5px;border-radius:3px;font-size:.71rem;background:rgba(52,152,219,.12);color:#2980b9;border:1px solid rgba(52,152,219,.25)"><i class="fas fa-lock"></i> ' + faEscape(t) + '</span>';
            }).join('');
            var srcHtml = (r.src || []).map(function(s) { return '<div style="font-size:.77rem">' + faEscape(s) + '</div>'; }).join('');
            var dstHtml = (r.dst || []).map(function(s) { return '<div style="font-size:.77rem">' + faEscape(s) + '</div>'; }).join('');
            var svcHtml = (r.services || []).map(function(s) { return '<div style="font-size:.77rem">' + faEscape(s) + '</div>'; }).join('');
            var detId = 'fa-vpnr-det-' + idx;
            var mainId = 'fa-vpnr-row-' + idx;
            // Ana satır
            rows.push('<tr id="' + mainId + '" class="fa-clickable-row" style="cursor:pointer;' + rowStyle + '" '
                 + 'onclick="fireAuditVpnRuleDetail(\'' + mainId + '\',\'' + detId + '\',\'' + faEscape(r.rule_id) + '\')">'
                 + '<td style="font-weight:600;color:var(--text-muted)">' + faEscape(r.rule_id) + ' <i class="fas fa-chevron-down" id="' + mainId + '-ico" style="font-size:.65em;color:#bdc3c7"></i></td>'
                 + '<td><strong>' + faEscape(r.name) + '</strong>'
                 + (r.comments ? '<div style="font-size:.73rem;color:var(--text-muted)">' + faEscape(r.comments) + '</div>' : '')
                 + '</td>'
                 + '<td>' + (srcHtml || '<em style="color:var(--text-muted);font-size:.8rem">any</em>') + '</td>'
                 + '<td>' + (dstHtml || '<em style="color:var(--text-muted);font-size:.8rem">any</em>') + '</td>'
                 + '<td>' + (svcHtml || '<em style="color:var(--text-muted);font-size:.8rem">any</em>') + '</td>'
                 + '<td>' + actionBadge + '</td>'
                 + '<td style="' + hitStyle + '">' + hitVal + '</td>'
                 + '<td>' + tunnelBadges + '</td>'
                 + '<td>' + statusBadge + '</td>'
                 + '</tr>');
            // Detay satırı (başlangıçta gizli)
            rows.push('<tr id="' + detId + '" style="display:none;background:rgba(52,152,219,.04)">'
                 + '<td colspan="9" style="padding:14px 18px;" id="' + detId + '-cell"><i class="fas fa-spinner fa-spin"></i></td>'
                 + '</tr>');
        });
        tbody.innerHTML = rows.join('');
    }

    window.fireAuditVpnRuleDetail = function(mainRowId, detRowId, ruleId) {
        var mainRow = document.getElementById(mainRowId);
        var detRow  = document.getElementById(detRowId);
        var cell    = document.getElementById(detRowId + '-cell');
        var ico     = document.getElementById(mainRowId + '-ico');
        if (!detRow || !cell) return;

        // Toggle
        var isOpen = detRow.style.display !== 'none';
        if (isOpen) {
            detRow.style.display = 'none';
            if (mainRow) mainRow.classList.remove('fa-row-selected');
            if (ico) ico.style.transform = '';
            return;
        }

        if (mainRow) mainRow.classList.add('fa-row-selected');
        if (ico) ico.style.transform = 'rotate(180deg)';
        detRow.style.display = '';
        cell.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        // Cache'ten temel kural bilgisi
        var cached = null;
        if (_vpnAllRulesCache) {
            (_vpnAllRulesCache.rules || []).some(function(r) {
                if (r.rule_id === String(ruleId)) { cached = r; return true; }
            });
        }

        // IP → ilgili tünel adları eşlemesi (aynı tünelden olabilir)
        // Gerçek CIDR containment: bir IP, bir CIDR bloğunun içinde mi?
        function _ipInCidr(ipStr, cidrStr) {
            try {
                var ip = ipStr.split('/')[0].trim();
                var parts = cidrStr.split('/');
                var base = parts[0].trim();
                var prefix = parts.length > 1 ? parseInt(parts[1]) : 32;
                function toNum(a) {
                    var s = a.split('.').map(Number);
                    return ((s[0] << 24) | (s[1] << 16) | (s[2] << 8) | s[3]) >>> 0;
                }
                if (prefix === 0) return true;
                var mask = (0xFFFFFFFF << (32 - prefix)) >>> 0;
                return (toNum(ip) & mask) === (toNum(base) & mask);
            } catch(e) { return false; }
        }

        function _ipTunnelTags(ip) {
            if (!_vpnAllRulesCache || !_vpnAllRulesCache._tunnelInfo) return '';
            var ipClean = String(ip).trim().split('/')[0]; // host kısmı

            // Firewall'un kendi interface IP'si mi? → tag yapma
            var localNets = _vpnAllRulesCache._localNets || [];
            for (var li = 0; li < localNets.length; li++) {
                if (_ipInCidr(ipClean, localNets[li])) return '';
            }

            var matched = [];
            var ti = _vpnAllRulesCache._tunnelInfo;
            Object.keys(ti).forEach(function(tname) {
                var cidrs = ti[tname].cidrs || [];
                for (var ci = 0; ci < cidrs.length; ci++) {
                    var c = String(cidrs[ci]).trim();
                    if (_ipInCidr(ipClean, c)) {
                        matched.push(tname);
                        break;
                    }
                }
            });
            if (!matched.length) return '';
            return matched.map(function(t) {
                return ' <span title="' + faEscape(t) + '" style="font-size:.68rem;padding:0 5px;border-radius:3px;background:rgba(52,152,219,.18);color:#2471a3;border:1px solid rgba(52,152,219,.3)"><i class="fas fa-lock"></i> ' + faEscape(t) + '</span>';
            }).join('');
        }

        // rule endpoint'ten tam detay çek (findings + tam src/dst listesi)
        faApi('rule', { rule_id: ruleId }).then(function(rd) {
            var html = '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;">';

            // --- Sol: Kural Bilgileri ---
            var r = (rd && rd.rule) ? rd.rule : (cached || {});
            var name   = r.name || (cached && cached.name) || 'Kural #' + ruleId;
            var action = r.action || (cached && cached.action) || '-';
            var enabled = r.enabled !== undefined ? r.enabled : (cached && cached.enabled);
            var comments = r.comments || (cached && cached.comments) || '';

            var actionBadge = action === 'allow'
                ? '<span style="padding:2px 10px;border-radius:10px;background:#27ae60;color:#fff;font-size:.78rem;font-weight:700"><i class="fas fa-check"></i> Allow</span>'
                : action === 'deny'
                ? '<span style="padding:2px 10px;border-radius:10px;background:#e74c3c;color:#fff;font-size:.78rem;font-weight:700"><i class="fas fa-ban"></i> Deny</span>'
                : '<span style="padding:2px 10px;border-radius:10px;background:#95a5a6;color:#fff;font-size:.78rem">' + faEscape(action) + '</span>';

            html += '<div style="flex:1;min-width:260px">'
                  + '<div style="margin-bottom:8px"><strong style="font-size:1rem"><i class="fas fa-shield-alt" style="color:#3498db"></i> ' + faEscape(name) + '</strong>'
                  + ' <span style="color:var(--text-muted);font-size:.8rem">— #' + faEscape(ruleId) + '</span></div>';

            if (comments) html += '<div style="font-size:.8rem;color:var(--text-muted);margin-bottom:8px"><i class="fas fa-comment"></i> ' + faEscape(comments) + '</div>';

            html += '<table style="font-size:.82rem;border-collapse:collapse;width:100%">';

            function _detRow(label, val) {
                return '<tr><td style="padding:3px 10px 3px 0;color:var(--text-muted);white-space:nowrap;font-size:.78rem">' + label + '</td>'
                     + '<td style="padding:3px 0">' + val + '</td></tr>';
            }

            var srcList = (r.src_addresses || (cached && cached.src) || []);
            var dstList = (r.dst_addresses || (cached && cached.dst) || []);
            var svcList = (r.services     || (cached && cached.services) || []);

            html += _detRow('Action', actionBadge);
            html += _detRow('Durum', enabled
                ? '<span style="color:#27ae60"><i class="fas fa-check-circle"></i> Aktif</span>'
                : '<span style="color:#e74c3c"><i class="fas fa-times-circle"></i> Pasif</span>');

            if (r.hit_count !== undefined && r.hit_count !== null) {
                var hc = r.hit_count;
                var hStyle = hc === 0 ? 'color:#e74c3c;font-weight:600' : (hc > 1000 ? 'color:#27ae60;font-weight:600' : '');
                html += _detRow('Hit Count', '<span style="' + hStyle + '">' + hc + '</span>');
            } else if (cached && cached.hit_count !== undefined) {
                html += _detRow('Hit Count', String(cached.hit_count !== null ? cached.hit_count : '-'));
            }

            html += _detRow('Kaynak',
                srcList.length ? srcList.map(function(s) {
                    return '<div style="margin-bottom:2px"><code style="font-size:.76rem">' + faEscape(s) + '</code>' + _ipTunnelTags(s) + '</div>';
                }).join('') : '<em style="color:var(--text-muted)">any</em>');

            html += _detRow('Hedef',
                dstList.length ? dstList.map(function(s) {
                    return '<div style="margin-bottom:2px"><code style="font-size:.76rem">' + faEscape(s) + '</code>' + _ipTunnelTags(s) + '</div>';
                }).join('') : '<em style="color:var(--text-muted)">any</em>');

            html += _detRow('Servis',
                svcList.length ? svcList.map(function(s) {
                    return '<span style="display:inline-block;margin:1px 2px;padding:1px 6px;background:rgba(52,152,219,.12);border-radius:3px;font-size:.76rem">' + faEscape(s) + '</span>';
                }).join('') : '<em style="color:var(--text-muted)">any</em>');

            if (r.logging !== undefined) {
                html += _detRow('Log', r.logging
                    ? '<span style="color:#27ae60"><i class="fas fa-check"></i> Aktif</span>'
                    : '<span style="color:#e74c3c"><i class="fas fa-times"></i> Kapalı</span>');
            }

            html += '</table></div>';

            // --- Sağ: İlgili IPsec Tünelleri ---
            var tunnels = (cached && cached.tunnels) || [];
            if (tunnels.length) {
                html += '<div style="min-width:200px;max-width:300px">'
                      + '<div style="font-size:.82rem;font-weight:600;margin-bottom:8px;color:var(--text-muted)"><i class="fas fa-lock"></i> İlgili IPsec Tünelleri (' + tunnels.length + ')</div>';
                tunnels.forEach(function(t) {
                    // Cache'ten tünel remote_gw bilgisini bul
                    var gw = '';
                    if (_vpnAllRulesCache && _vpnAllRulesCache._tunnelInfo && _vpnAllRulesCache._tunnelInfo[t]) {
                        gw = _vpnAllRulesCache._tunnelInfo[t].remote_gw || '';
                    }
                    html += '<div style="margin-bottom:6px;padding:6px 10px;background:rgba(52,152,219,.08);border-left:3px solid #3498db;border-radius:0 4px 4px 0;font-size:.8rem">'
                          + '<strong>' + faEscape(t) + '</strong>'
                          + (gw ? '<div style="color:var(--text-muted);font-size:.75rem">GW: ' + faEscape(gw) + '</div>' : '')
                          + '</div>';
                });
                html += '</div>';
            }

            html += '</div>';

            // --- Alt: Findings (varsa) ---
            var findings = (rd && rd.findings) || [];
            if (findings.length) {
                html += '<div style="margin-top:14px;border-top:1px solid var(--border-color);padding-top:12px">'
                      + '<div style="font-size:.82rem;font-weight:600;margin-bottom:8px"><i class="fas fa-exclamation-triangle" style="color:#e67e22"></i> Güvenlik Bulguları (' + findings.length + ')</div>';
                findings.forEach(function(f) {
                    var sevColor = {CRITICAL:'#c0392b',HIGH:'#e67e22',MEDIUM:'#f39c12',LOW:'#27ae60'}[f.severity] || '#95a5a6';
                    html += '<div style="margin-bottom:6px;padding:7px 10px;background:rgba(230,126,34,.06);border-left:3px solid '
                          + sevColor + ';border-radius:0 4px 4px 0;font-size:.8rem">'
                          + '<span style="color:' + sevColor + ';font-weight:700;font-size:.75rem">' + faEscape(f.severity) + '</span>'
                          + ' — ' + faEscape(f.recommendation || f.type || '')
                          + '</div>';
                });
                html += '</div>';
            }

            cell.innerHTML = html;
        }).catch(function() {
            if (!cached) { cell.innerHTML = '<em style="color:var(--text-muted)">Detay yüklenemedi.</em>'; return; }
            var tunnels = cached.tunnels || [];
            cell.innerHTML = '<strong>#' + faEscape(ruleId) + ' ' + faEscape(cached.name || '') + '</strong>'
                + ' — Action: ' + faEscape(cached.action || '-')
                + (tunnels.length ? '<br><small>Tüneller: ' + tunnels.map(faEscape).join(', ') + '</small>' : '');
        });
    };

    window.loadVpnPolicyMap = loadVpnAllRules;

    // ---------- Vendor display helpers (Not 12 + UI vendor-aware) ----------
    var VENDOR_DISPLAY = {
        'fortigate':       'FortiGate',
        'paloalto':        'Palo Alto',
        'checkpoint':      'CheckPoint',
        'checkpoint_ssh':  'CheckPoint',
        'cisco_ios':       'Cisco IOS',
        'cisco_nxos':      'Cisco NX-OS',
        'juniper':         'Juniper',
        'huawei':          'Huawei',
        'dell':            'Dell',
    };
    function faCurrentFwType() {
        var fw = (typeof firewallList !== 'undefined' && firewallList) ? firewallList.find(function(f) { return f.slug === FW_SLUG; }) : null;
        return fw ? (fw.firewall_type || 'fortigate') : 'fortigate';
    }
    function faVendorName() {
        return VENDOR_DISPLAY[faCurrentFwType()] || 'Cihaz';
    }
    function faVendorRawLabel() {
        return 'Raw ' + faVendorName() + ' Config';
    }
    // Mergeable kural CLI uretici — cihaz vendor'una gore uygun komut seti.
    // CheckPoint icin mgmt_cli (Management API), FortiGate icin config firewall policy,
    // Palo Alto icin set rulebase, Cisco icin access-list, Juniper icin set security policies.
    function faMergeableCli(mp, oldRules) {
        var fwType = faCurrentFwType();
        var name = mp.name || 'merged';
        var src = (mp.src_addresses || []);
        var dst = (mp.dst_addresses || []);
        var svc = (mp.services || []);
        var srcZ = (mp.src_zones || []);
        var dstZ = (mp.dst_zones || []);
        var act = mp.action || 'allow';
        var cmt = mp.comments || '';
        var rules = oldRules || [];
        var s = '';

        if (fwType === 'checkpoint' || fwType === 'checkpoint_ssh') {
            // CheckPoint Management API (mgmt_cli) — typically run from SmartConsole CLI or Mgmt server
            s += '# CheckPoint Management API (mgmt_cli) — read-only portal, manuel uygulayin\n';
            s += '# 1. Login + session ac (interactive):\n';
            s += 'mgmt_cli login -r true > sid.txt\n\n';
            s += '# 2. Yeni birlesik access-rule ekle (' + faEscape(name) + '):\n';
            s += 'mgmt_cli add access-rule \\\n';
            s += '    layer "Network" \\\n';
            s += '    name "' + faEscape(name) + '" \\\n';
            s += '    position top \\\n';
            s += '    action "' + faEscape(act === 'allow' ? 'Accept' : 'Drop') + '" \\\n';
            if (src.length) s += '    source.1 "' + faEscape(src.join('","')) + '" \\\n';
            if (dst.length) s += '    destination.1 "' + faEscape(dst.join('","')) + '" \\\n';
            if (svc.length) s += '    service.1 "' + faEscape(svc.join('","')) + '" \\\n';
            s += '    track "Log" \\\n';
            s += '    comments "' + faEscape(cmt || 'Merged from ' + rules.length + ' rules') + '" \\\n';
            s += '    -s sid.txt\n\n';
            s += '# 3. Eski kurallari sil (test sonrasi!):\n';
            rules.forEach(function(r) {
                var rid = String(r.rule_id || '').replace(/^.*?:/, '');
                s += 'mgmt_cli delete access-rule rule-number ' + faEscape(rid) + ' layer "Network" -s sid.txt\n';
            });
            s += '\n# 4. Policy install + logout:\n';
            s += 'mgmt_cli install-policy policy-package "Standard" access true -s sid.txt\n';
            s += 'mgmt_cli publish -s sid.txt\n';
            s += 'mgmt_cli logout -s sid.txt\n';
            return s;
        }
        if (fwType === 'paloalto') {
            s += '# Palo Alto PAN-OS — set komutlari (Configure mode)\n';
            s += '# 1. Yeni birlesik kural:\n';
            s += 'set rulebase security rules "' + faEscape(name) + '" action ' + faEscape(act) + '\n';
            if (srcZ.length) s += 'set rulebase security rules "' + faEscape(name) + '" from [ ' + faEscape(srcZ.join(' ')) + ' ]\n';
            if (dstZ.length) s += 'set rulebase security rules "' + faEscape(name) + '" to [ ' + faEscape(dstZ.join(' ')) + ' ]\n';
            if (src.length) s += 'set rulebase security rules "' + faEscape(name) + '" source [ ' + faEscape(src.join(' ')) + ' ]\n';
            if (dst.length) s += 'set rulebase security rules "' + faEscape(name) + '" destination [ ' + faEscape(dst.join(' ')) + ' ]\n';
            if (svc.length) s += 'set rulebase security rules "' + faEscape(name) + '" service [ ' + faEscape(svc.join(' ')) + ' ]\n';
            s += 'set rulebase security rules "' + faEscape(name) + '" log-end yes description "' + faEscape(cmt) + '"\n\n';
            s += '# 2. Eski kurallari sil:\n';
            rules.forEach(function(r) {
                s += 'delete rulebase security rules "' + faEscape(r.name || r.rule_id) + '"\n';
            });
            s += '\n# 3. Commit:\ncommit description "Merge ' + rules.length + ' rules into ' + faEscape(name) + '"\n';
            return s;
        }
        if (fwType === 'cisco_ios' || fwType === 'cisco_nxos') {
            s += '# Cisco IOS / NX-OS — extended ACL\n';
            s += '# 1. Yeni birlesik permit/deny satirlari:\n';
            s += 'configure terminal\n';
            s += 'ip access-list extended ' + faEscape(name) + '\n';
            src.forEach(function(srcIp) {
                dst.forEach(function(dstIp) {
                    svc.forEach(function(sv) {
                        s += '  ' + faEscape(act === 'allow' ? 'permit' : 'deny') + ' ip ' + faEscape(srcIp) + ' ' + faEscape(dstIp) + ' eq ' + faEscape(sv) + '\n';
                    });
                });
            });
            s += 'end\n\n';
            s += '# 2. Eski ACL kurallarini elle remove et:\n';
            rules.forEach(function(r) {
                s += '! delete: ' + faEscape(r.rule_id) + ' (' + faEscape(r.name || '-') + ')\n';
            });
            s += '\n# 3. Save:\nwrite memory\n';
            return s;
        }
        if (fwType === 'juniper') {
            s += '# Juniper Junos — set komutlari (configure mode)\n';
            s += 'configure\n';
            s += 'edit security policies from-zone ' + faEscape(srcZ[0] || 'trust') + ' to-zone ' + faEscape(dstZ[0] || 'untrust') + '\n';
            s += 'set policy ' + faEscape(name) + ' match source-address [ ' + faEscape(src.join(' ')) + ' ]\n';
            s += 'set policy ' + faEscape(name) + ' match destination-address [ ' + faEscape(dst.join(' ')) + ' ]\n';
            s += 'set policy ' + faEscape(name) + ' match application [ ' + faEscape(svc.join(' ')) + ' ]\n';
            s += 'set policy ' + faEscape(name) + ' then ' + faEscape(act === 'allow' ? 'permit' : 'deny') + '\n';
            s += 'set policy ' + faEscape(name) + ' then log session-init session-close\n\n';
            rules.forEach(function(r) {
                s += 'delete policy ' + faEscape(r.name || r.rule_id) + '\n';
            });
            s += '\ncommit and-quit\n';
            return s;
        }
        // FortiGate (default)
        s += '# 1. Yeni birlesik kural olustur:\n';
        s += 'config firewall policy\n';
        s += '  edit 0\n';
        s += '    set name "' + faEscape(name) + '"\n';
        s += '    set srcintf ' + (srcZ.map(function(z){return '"'+faEscape(z)+'"';}).join(' ') || '"any"') + '\n';
        s += '    set dstintf ' + (dstZ.map(function(z){return '"'+faEscape(z)+'"';}).join(' ') || '"any"') + '\n';
        s += '    set srcaddr ' + (src.map(function(a){return '"'+faEscape(a)+'"';}).join(' ') || '"all"') + '\n';
        s += '    set dstaddr ' + (dst.map(function(a){return '"'+faEscape(a)+'"';}).join(' ') || '"all"') + '\n';
        s += '    set service ' + (svc.map(function(v){return '"'+faEscape(v)+'"';}).join(' ') || '"ALL"') + '\n';
        s += '    set action ' + faEscape(act) + '\n';
        s += '    set logtraffic all\n';
        s += '    set comments "' + faEscape(cmt) + '"\n';
        s += '  next\nend\n\n';
        s += '# 2. Eski kurallari sil (once trafigi test et!):\n';
        s += 'config firewall policy\n';
        rules.forEach(function(r) {
            s += '  delete ' + faEscape(r.rule_id) + '\n';
        });
        s += 'end\n';
        return s;
    }
    // Statik HTML icindeki .fa-vendor-name span'lerini cihaz vendor adiyla doldur.
    // index.php icinde "FortiGate" yerine <span class="fa-vendor-name">FortiGate</span>
    // kullanildigi yerler bu fonksiyonla CheckPoint/Palo Alto/... olur.
    function updateVendorLabels() {
        try {
            var name = faVendorName();
            document.querySelectorAll('.fa-vendor-name').forEach(function(el) {
                el.textContent = name;
            });
        } catch (e) {}
    }
    window.updateVendorLabels = updateVendorLabels;

    // ---------- Compliance tab (multi-framework) ----------
    var VENDOR_FRAMEWORK_MAP = {
        'fortigate': 'CIS_FortiGate_1.2',
        'paloalto': 'CIS_PaloAlto_9',
        'checkpoint': 'CIS_CheckPoint',
        'cisco_ios': 'CIS_Cisco_IOS_XE',
        'cisco_nxos': 'CIS_Cisco_IOS_XE',
        'juniper': 'CIS_Juniper_Junos',
        'huawei': 'TNS_Huawei_VRP',
    };
    var currentFramework = 'CIS_FortiGate_1.2';

    function _getDefaultFramework() {
        var currentFw = firewallList.find(function(f) { return f.slug === FW_SLUG; });
        var fwType = currentFw ? (currentFw.firewall_type || 'fortigate') : 'fortigate';
        return VENDOR_FRAMEWORK_MAP[fwType] || 'CIS_FortiGate_1.2';
    }

    // Vendor-aware framework etiketleri (Not 12)
    var FRAMEWORK_LABELS = {
        'CIS_FortiGate_1.2': 'CIS FortiGate 1.2',
        'CIS_PaloAlto_9':    'CIS Palo Alto 9',
        'CIS_CheckPoint':    'CIS Check Point',
        'CIS_Cisco_IOS_XE':  'CIS Cisco IOS-XE',
        'CIS_Juniper_Junos': 'CIS Juniper Junos',
        'TNS_Huawei_VRP':    'TNS Huawei VRP',
        'PCI_DSS_4.0':       'PCI-DSS 4.0',
        'ISO_27001_2022':    'ISO 27001:2022',
        'NIST_800-53':       'NIST 800-53',
        'GDPR':              'GDPR Art.32',
    };
    function _rebuildComplianceButtons() {
        var box = document.getElementById('fa-fw-tabs');
        if (!box) return;
        var vendorFw = _getDefaultFramework();
        // Vendor CIS + universal framework'ler
        var list = [vendorFw, 'PCI_DSS_4.0', 'ISO_27001_2022', 'NIST_800-53', 'GDPR'];
        var html = '';
        list.forEach(function(fw, i) {
            var label = FRAMEWORK_LABELS[fw] || fw;
            html += '<button class="fa-fw-btn' + (i===0?' active':'') + '" data-fw="' + fw +
                    '" onclick="loadComplianceFramework(\'' + fw + '\')">' + faEscape(label) + '</button>';
        });
        box.innerHTML = html;
    }
    function loadCompliance() {
        _rebuildComplianceButtons();
        currentFramework = _getDefaultFramework();
        loadComplianceFramework(currentFramework);
    }

    var complianceLastChecks = {};  // framework -> checks[] (deep-dive için cache)

    window.loadComplianceFramework = function(framework) {
        currentFramework = framework;
        var btns = document.querySelectorAll('#fa-fw-tabs .fa-fw-btn');
        btns.forEach(function(b) {
            b.classList.toggle('active', b.getAttribute('data-fw') === framework);
        });

        var tbody = document.getElementById('fa-cis-tbody');
        tbody.innerHTML = '<tr><td colspan="8"><i class="fas fa-spinner fa-spin"></i></td></tr>';
        faApi('cis', { framework: framework }).then(function(res) {
            if (!res.success) { tbody.innerHTML = '<tr><td colspan="8">Hata</td></tr>'; return; }
            complianceLastChecks[framework] = res.checks || [];

            // Tüm framework özet barı (brüt + net + exception count)
            var fwSum = document.getElementById('fa-fw-summary');
            var fwHtml = '';
            (res.all_frameworks || []).forEach(function(f) {
                var cls = f.percent >= 90 ? 'high' : f.percent >= 70 ? 'med' : 'low';
                var display = f.framework.replace(/_/g,' ').replace('FortiGate','FG').replace('DSS','DSS');
                var deltaTxt = (f.acked > 0)
                    ? '<div style="font-size:.65rem;color:#1e8449;margin-top:2px;">brüt ' + f.raw_percent + '% · +' + f.acked + ' exc</div>'
                    : '';
                fwHtml += '<div class="fa-fw-stat ' + cls + '" onclick="loadComplianceFramework(\'' + faEscape(f.framework) + '\')" style="cursor:pointer">' +
                    '<div class="fa-fw-stat-lbl">' + faEscape(display) + '</div>' +
                    '<div class="fa-fw-stat-val">' + f.percent + '%</div>' +
                    '<div class="fa-fw-stat-sub">' + f.passed + '/' + f.total + '</div>' +
                    deltaTxt +
                    '</div>';
            });
            fwSum.innerHTML = fwHtml;

            var sumBox = document.getElementById('fa-cis-summary');
            var frameworkLabel = framework.replace(/_/g,' ');
            var rawTxt = (res.acked > 0)
                ? '<div style="font-size:.85rem;margin-top:6px;color:#7f8c8d">' +
                  '<i class="fas fa-shield-alt" style="color:#3498db"></i> Brüt: ' + res.raw_percent + '% (' + res.raw_passed + '/' + res.total + ') &middot; ' +
                  '<strong style="color:#1e8449">+' + res.acked + ' exception</strong> &middot; ' +
                  'Net: <strong>' + res.percent + '%</strong></div>'
                : '';
            var reportBtn = '<button class="fa-mini-btn" style="margin-left:12px" onclick="fireAuditDownloadComplianceReport(\'' + faEscape(framework) + '\')">' +
                '<i class="fas fa-file-alt"></i> ' + faEscape(framework.replace(/_/g, ' ')) + ' Raporu</button>';
            sumBox.innerHTML =
                '<div class="fa-cis-pct">' + (res.percent || 0) + '%</div>' +
                '<div style="flex:1"><strong>' + faEscape(frameworkLabel) + '</strong>' + reportBtn + '<br>' +
                res.passed + ' passed / ' + res.failed + ' failed / ' + res.total + ' total' +
                rawTxt + '</div>';

            if (!res.checks.length) { tbody.innerHTML = '<tr><td colspan="8"><em>Veri yok — sync çalıştır.</em></td></tr>'; return; }
            var html = '';
            res.checks.forEach(function(c) {
                var ackTag = c.ack_state
                    ? '<span class="fa-ack-inline ack-' + c.ack_state + '">' + (ACK_LABELS[c.ack_state] ? ACK_LABELS[c.ack_state].label : c.ack_state) + '</span>'
                    : '';
                var statusHtml;
                if (c.passed) {
                    statusHtml = '<span class="fa-pass-badge"><i class="fas fa-check"></i> PASS</span>';
                } else if (c.ack_state) {
                    statusHtml = '<span class="fa-pass-badge" style="background:#d6eaf8;color:#1f618d"><i class="fas fa-shield-alt"></i> EXC</span>';
                } else {
                    statusHtml = '<span class="fa-fail-badge"><i class="fas fa-times"></i> FAIL</span>';
                }
                var rowCls = c.passed ? '' : (c.ack_state ? 'fa-row-acked' : 'fa-row-fail');
                var ackBtnLbl = c.ack_state ? 'Düzenle' : 'Exception';
                html += '<tr class="' + rowCls + '" style="cursor:pointer" onclick="fireAuditOpenComplianceDetail(\'' + faEscape(framework) + '\',\'' + faEscape(c.check_id) + '\')">' +
                    '<td><strong>' + faEscape(c.check_id) + '</strong>' + ackTag + '</td>' +
                    '<td>' + faEscape(c.category) + '</td>' +
                    '<td>' + faEscape(c.title) + '</td>' +
                    '<td class="fa-cell-small">' + faEscape(c.details) + '</td>' +
                    '<td class="fa-cell-small">' + faEscape(c.remediation) + '</td>' +
                    '<td>' + faSevBadge(c.severity) + '</td>' +
                    '<td>' + statusHtml + '</td>' +
                    '<td onclick="event.stopPropagation()">' +
                        (c.passed
                            ? '<em style="color:#bdc3c7;font-size:.75rem">PASS</em>'
                            : '<button class="fa-mini-btn" onclick="fireAuditOpenComplianceDetail(\'' + faEscape(framework) + '\',\'' + faEscape(c.check_id) + '\')"><i class="fas fa-shield-alt"></i> ' + ackBtnLbl + '</button>') +
                    '</td></tr>';
            });
            tbody.innerHTML = html;
        });
    };

    // ---------- Compliance check rationale (Neden Onemli?) ----------
    var CIS_RATIONALE = {
        // CheckPoint policy checks
        "CIS-CP-P1": "Stealth rule, management arabirimini saldirganlardan gizler. Yoksa attacker SmartConsole/Gaia portuna brute-force veya CVE exploit deneyebilir.",
        "CIS-CP-P2": "Implicit allow zafiyetlerini onler. En altta explicit Drop+Log olmazsa beklenmedik trafik sessizce gecebilir.",
        "CIS-CP-P3": "Logsuz kural: incident response sirasinda hangi trafigin gectigi bilinmez. PCI-DSS Req 10 ve KVKK icin de zorunludur.",
        "CIS-CP-P4": "src=ANY dst=ANY = full firewall bypass. Zero-trust prensibinin direkt ihlali. Lateral movement ve data exfiltration vektoru.",
        "CIS-CP-P5": "Implied rules (FireWall1 control connections, DHCP, RIP vb.) gereksiz acik birakirsa management plane saldiri yuzeyini buyutur.",
        "CIS-CP-P6": "Allow + IPS/AV/AppCtrl yoksa policy sadece port-level filter olur; payload icindeki malware/exploit yakalanmaz.",
        // CheckPoint system checks
        "CIS-CP-1": "Eski API versiyonu: bilinen CVE acik. Mgmt server saldirilari (CVE-2024-24919) yeni versiyonlarda fix.",
        "CIS-CP-2": "Hostname disipline edilmemis cihazlar envanter ve audit log korelasyonunda kayboluyor.",
        "CIS-CP-3": "Eski Gaia/R8x.xx surumleri end-of-support, security patch almaz.",
        "CIS-CP-4": "5+ admin hesabi: least privilege ihlali. Ayrilan personel hesabi sik yetim kalir.",
        "CIS-CP-5": "Tum adminler super-user = yatay yetki yukselmesi mumkun. RBAC ile read-only ve domain admin ayrilmali.",
        "CIS-CP-6": "Password policy yoksa zayif sifre + brute-force riski. Compliance ve KVKK gereksinimi.",
        "CIS-CP-7": "Anti-Spoofing yoksa internal IP taklit eden paketler firewall gecer.",
        "CIS-CP-8": "Mgmt portuna disaridan erisim = compromise riski. Out-of-band management kullanin.",
        "CIS-CP-9": "IPS blade kapali = exploit ve CVE imzalari calismaz.",
        "CIS-CP-10": "Application Control kapali = Tor/proxy/P2P kacaklarini goremezsiniz.",
        "CIS-CP-11": "URL Filtering kapali = malicious site/phishing korumasi yok.",
        "CIS-CP-12": "Log server baglantisi yoksa SIEM/SmartLog korelasyonu durur, forensic delili kayboluyor.",
        "CIS-CP-13": "Threat Emulation (sandbox) yoksa zero-day malware tespit edilmez.",
        "CIS-CP-14": "Anti-Bot kapali = enfekte makinelerin C2 trafigi engellenmez.",
        "CIS-CP-15": "IPS Detect modunda = sadece alert, engelleme yok. Prevent moduna alin.",
        "CIS-CP-16": "HTTPS Inspection yoksa sifrelenmis trafikteki tehditler firewall icin gorunmez.",
        "CIS-CP-17": "Finance/health bypass minimum: KVKK uyumlulugu.",
        "CIS-CP-18": "SmartEvent korelasyon yoksa multi-stage saldirilarin tespiti zor.",
        "CIS-CP-19": "Compliance gereksinimleri (GDPR/KVKK/PCI) belirli sure log saklamayi zorunlu kilar.",
        "CIS-CP-20": "High availability yoksa firewall arizasi tum trafigi durdurur.",
    };

    // Details string'i icindeki "rule_id (name)" listesini chip olarak render eder.
    // Format: "11 kural logging devre disi: gebzedc:16 (TRS-1787), gebzedc:21 (TRS-1742), ... + 3 daha"
    function faRenderComplianceDetails(details) {
        if (!details) return '<em>-</em>';
        var s = String(details);
        // Liste ":" sonrasinda baslar; once prefix'i ayir
        var colonIdx = s.indexOf(':');
        if (colonIdx === -1 || colonIdx > 80) {
            return faEscape(s).replace(/\n/g, '<br>');
        }
        var prefix = s.substring(0, colonIdx).trim();
        var rest = s.substring(colonIdx + 1).trim();
        // "+ N daha" suffix'ini ayir
        var extraMatch = rest.match(/\s*\+\s*(\d+)\s*daha\s*$/);
        var extraCount = 0;
        if (extraMatch) {
            extraCount = parseInt(extraMatch[1], 10);
            rest = rest.substring(0, extraMatch.index).trim().replace(/,\s*$/, '');
        }
        // "rule_id (name) [layer]" pattern'lerini ayir — virgulle bolme yetmez (name'de virgul olabilir)
        var items = rest.split(/,\s*(?=[^()]*(?:\(|$))/);
        if (items.length < 2) {
            return '<strong>' + faEscape(prefix) + ':</strong><br>' + faEscape(rest);
        }
        var html = '<div style="margin-bottom:8px"><strong>' + faEscape(prefix) + '</strong></div>';
        html += '<div style="display:flex;flex-wrap:wrap;gap:6px;">';
        items.forEach(function(it) {
            it = it.trim();
            if (!it) return;
            html += '<span style="display:inline-block;padding:3px 10px;background:#fff;border:1px solid #e74c3c;border-radius:12px;font-size:.78rem;font-family:monospace;color:#c0392b">' + faEscape(it) + '</span>';
        });
        html += '</div>';
        if (extraCount > 0) {
            html += '<div style="margin-top:8px;font-size:.82rem;color:#7f8c8d;font-style:italic;">+ ' + extraCount + ' kural daha (sayim limitlendi — DB raporunda tam liste var)</div>';
        }
        return html;
    }

    window.fireAuditOpenComplianceDetail = function(framework, checkId) {
        var checks = complianceLastChecks[framework] || [];
        var c = null;
        for (var i = 0; i < checks.length; i++) {
            if (checks[i].check_id === checkId) { c = checks[i]; break; }
        }
        if (!c) return;

        var modal = document.getElementById('fa-rule-modal');
        var body = document.getElementById('fa-modal-body');
        var title = document.getElementById('fa-modal-title');
        title.innerHTML = framework.replace(/_/g, ' ') + ' — ' + faEscape(checkId);

        var sevWeights = { CRITICAL: 2.5, HIGH: 0.8, MEDIUM: 0.3, LOW: 0.1, INFO: 0 };
        var w = sevWeights[c.severity] || 0;
        var passText = c.passed
            ? '<span class="fa-pass-badge"><i class="fas fa-check"></i> PASS</span> — bu check geçmiş, skor etkisi yok'
            : (c.ack_state
                ? '<span class="fa-pass-badge" style="background:#d6eaf8;color:#1f618d"><i class="fas fa-shield-alt"></i> EXCEPTION</span> — kabul edilmiş, etkisi neutralize'
                : '<span class="fa-fail-badge"><i class="fas fa-times"></i> FAIL</span> — skor üzerinde etkili');

        var html = '<div class="fa-modal-section"><h4><i class="fas fa-info-circle"></i> Check Bilgisi</h4>' +
            '<table class="fa-table fa-table-sm"><tbody>' +
            '<tr><th>Framework</th><td>' + faEscape(framework.replace(/_/g, ' ')) + '</td></tr>' +
            '<tr><th>Check ID</th><td><strong>' + faEscape(c.check_id) + '</strong></td></tr>' +
            '<tr><th>Title</th><td>' + faEscape(c.title) + '</td></tr>' +
            '<tr><th>Kategori</th><td>' + faEscape(c.category) + '</td></tr>' +
            '<tr><th>Severity</th><td>' + faSevBadge(c.severity) + '</td></tr>' +
            '<tr><th>Durum</th><td>' + passText + '</td></tr>' +
            '</tbody></table></div>';

        // Detay (Bulgu) — kural listesi varsa parse edip chip olarak goster
        var _detailsHtml = faRenderComplianceDetails(c.details);
        html += '<div class="fa-modal-section"><h4><i class="fas fa-search"></i> Detay (Bulgu)</h4>' +
            '<div class="fa-info-box" style="background:#fdf2f2;border-color:#e74c3c">' +
            _detailsHtml + '</div></div>';

        // Neden Onemli? (rationale) — check_id bazli aciklama
        var _why = CIS_RATIONALE[c.check_id];
        if (_why) {
            html += '<div class="fa-modal-section"><h4><i class="fas fa-lightbulb"></i> Neden Önemli?</h4>' +
                '<div class="fa-info-box" style="background:#fef9e7;border-color:#f1c40f;color:#7d6608">' +
                faEscape(_why) + '</div></div>';
        }

        html += '<div class="fa-modal-section"><h4><i class="fas fa-tools"></i> Remediation (Önerilen Komut)</h4>' +
            '<pre style="background:#1a1a2e;color:#7fdbca;padding:12px;border-radius:4px;font-size:12px;overflow:auto;white-space:pre-wrap;word-break:break-word">' +
            faEscape(c.remediation || '-') + '</pre></div>';

        if (!c.passed) {
            html += '<div class="fa-modal-section"><h4><i class="fas fa-calculator"></i> Skor Etkisi</h4>' +
                '<table class="fa-table fa-table-sm"><tbody>' +
                '<tr><th>Severity ağırlığı</th><td>-' + w + ' puan / finding</td></tr>' +
                '<tr><th>Compliance % cezası</th><td>(100 - CIS%) × 0.3 (max -20 puan)</td></tr>' +
                '<tr><th>Aksiyon önerisi</th><td>' +
                    (c.ack_state
                        ? '<span class="fa-ack-inline ack-' + c.ack_state + '">' + (ACK_LABELS[c.ack_state] ? ACK_LABELS[c.ack_state].label : c.ack_state) + '</span> &mdash; bu check ack\'lendi, ' +
                          'CIS yüzdesinde "passed" olarak sayılır.'
                        : 'Bu check\'i Exception olarak işaretlersen Compliance % yükselir, skor +' +
                          Math.round(0.3 * (100 / Math.max(1, complianceLastChecks[framework].length))) + ' puan civarı (kabaca).')
                + '</td></tr></tbody></table></div>';
        }

        if (c.ack_state) {
            html += '<div class="fa-modal-section"><h4><i class="fas fa-shield-alt"></i> Aktif Exception</h4>' +
                '<table class="fa-table fa-table-sm"><tbody>' +
                '<tr><th>State</th><td>' + renderAckBadge(c.ack_state) + '</td></tr>' +
                '<tr><th>Note</th><td>' + faEscape(c.ack_note || '-') + '</td></tr>' +
                '<tr><th>Jira</th><td>' + (c.ack_jira ? '<span class="fa-jira-tag">' + faEscape(c.ack_jira) + '</span>' : '-') + '</td></tr>' +
                '<tr><th>Justification</th><td>' + faEscape(c.ack_just || '-') + '</td></tr>' +
                '<tr><th>Expires</th><td>' + faEscape(c.ack_expires || '-') + '</td></tr>' +
                '<tr><th>User</th><td>' + faEscape(c.ack_user || '-') + '</td></tr>' +
                '</tbody></table></div>';
        }

        var actionBtns = '';
        if (!c.passed) {
            if (c.ack_state) {
                actionBtns = '<button class="fa-bulk-apply" onclick="fireAuditAckOpen({items:[{finding_type:\'compliance\',rule_id:\'' + faEscape(c.check_id) + '\'}],existing:{state:\'' + c.ack_state + '\',note:' + JSON.stringify(c.ack_note || '').replace(/"/g, '&quot;') + ',jira_ticket:' + JSON.stringify(c.ack_jira || '').replace(/"/g, '&quot;') + ',risk_justification:' + JSON.stringify(c.ack_just || '').replace(/"/g, '&quot;') + ',expires_at:' + JSON.stringify(c.ack_expires || '').replace(/"/g, '&quot;') + '},severity:\'' + faEscape(c.severity) + '\'})">' +
                    '<i class="fas fa-pen"></i> Exception Düzenle</button>';
            } else {
                actionBtns = '<button class="fa-bulk-apply" onclick="fireAuditAckOpen({items:[{finding_type:\'compliance\',rule_id:\'' + faEscape(c.check_id) + '\'}],initialState:\'fp\',severity:\'' + faEscape(c.severity) + '\'})">' +
                    '<i class="fas fa-shield-alt"></i> Exception Oluştur</button>';
            }
        }

        if (actionBtns) {
            html += '<div class="fa-modal-section">' + actionBtns + '</div>';
        }

        body.innerHTML = html;
        modal.style.display = 'flex';
    };

    window.fireAuditDownloadComplianceReport = function(framework) {
        var url = API_BASE + '?action=compliance_report&fw_slug=' + encodeURIComponent(FW_SLUG) + '&framework=' + encodeURIComponent(framework);
        window.open(url, '_blank');
    };

    // ---------- Stale Objects ----------
    var staleCache = null;
    var staleCurrentType = 'all';

    function loadStaleObjects() {
        var tbody = document.getElementById('fa-stale-tbody');
        var sum = document.getElementById('fa-stale-summary');
        tbody.innerHTML = '<tr><td colspan="3"><i class="fas fa-spinner fa-spin"></i></td></tr>';
        faApi('stale_objects').then(function(res) {
            if (!res.success) { tbody.innerHTML = '<tr><td colspan="3">Hata</td></tr>'; return; }
            staleCache = res;
            var counts = res.counts || {};
            sum.innerHTML =
                '<div class="fa-hc-card fa-hc-clickable" onclick="filterStaleType(\'address\')" title="Sadece address obje listesi"><div class="fa-hc-val">' + (counts.address || 0) + '</div><div class="fa-hc-lbl">Stale Address</div></div>' +
                '<div class="fa-hc-card fa-hc-clickable" onclick="filterStaleType(\'addrgrp\')" title="Sadece address group listesi"><div class="fa-hc-val">' + (counts.addrgrp || 0) + '</div><div class="fa-hc-lbl">Stale Addrgrp</div></div>' +
                '<div class="fa-hc-card fa-hc-clickable" onclick="filterStaleType(\'service\')" title="Sadece service obje listesi"><div class="fa-hc-val">' + (counts.service || 0) + '</div><div class="fa-hc-lbl">Stale Service</div></div>' +
                '<div class="fa-hc-card fa-hc-clickable" onclick="filterStaleType(\'svcgrp\')" title="Sadece service group listesi"><div class="fa-hc-val">' + (counts.svcgrp || 0) + '</div><div class="fa-hc-lbl">Stale Svcgrp</div></div>' +
                '<div class="fa-hc-card fa-hc-dead fa-hc-clickable" onclick="filterStaleType(\'all\')" title="Tüm objeleri göster"><div class="fa-hc-val">' + (res.total || 0) + '</div><div class="fa-hc-lbl">Toplam Ölü Obje</div></div>';
            renderStale();
        });
    }

    function renderStale() {
        if (!staleCache) return;
        var tbody = document.getElementById('fa-stale-tbody');
        var q = (document.getElementById('fa-stale-search').value || '').trim().toLowerCase();
        var byType = staleCache.by_type || {};
        var typeLabels = { address: 'Address', addrgrp: 'Address Group', service: 'Service', svcgrp: 'Service Group' };
        var items = [];
        Object.keys(byType).forEach(function(type) {
            if (staleCurrentType !== 'all' && staleCurrentType !== type) return;
            byType[type].forEach(function(o) {
                if (q && !(o.name.toLowerCase().indexOf(q) >= 0 || (o.reason || '').toLowerCase().indexOf(q) >= 0)) return;
                items.push({ type: type, name: o.name, reason: o.reason });
            });
        });
        if (!items.length) { tbody.innerHTML = '<tr><td colspan="4"><em>Bu kategoride stale obje yok.</em></td></tr>'; return; }
        var html = '';
        items.forEach(function(it) {
            var aid = it.type + ':' + it.name;
            html += '<tr><td><span class="fa-obj-type-' + it.type + '">' + faEscape(typeLabels[it.type] || it.type) + '</span></td>' +
                '<td><strong>' + faEscape(it.name) + '</strong></td>' +
                '<td class="fa-cell-small">' + faEscape(it.reason) + '</td>' +
                '<td>' + faAckButton('stale_obj', aid, it.ack_state) + '</td></tr>';
        });
        tbody.innerHTML = html;
    }

    window.filterStaleType = function(type) {
        staleCurrentType = type;
        var btns = document.querySelectorAll('#fa-tab-stale_obj .fa-sub-btn');
        btns.forEach(function(b) { b.classList.toggle('active', b.getAttribute('data-type') === type); });
        renderStale();
    };

    window.filterStaleText = function() { renderStale(); };

    // ---------- Duplicate Objects ----------
    var dupObjCache = null;
    var dupObjCurrentType = 'all';

    function loadDuplicateObjects() {
        var tbody = document.getElementById('fa-dupobj-tbody');
        var sum = document.getElementById('fa-dupobj-summary');
        tbody.innerHTML = '<tr><td colspan="4"><i class="fas fa-spinner fa-spin"></i></td></tr>';
        faApi('duplicate_objects').then(function(res) {
            if (!res.success) { tbody.innerHTML = '<tr><td colspan="4">Hata</td></tr>'; return; }
            dupObjCache = res;
            var counts = res.counts_by_type || {};
            sum.innerHTML =
                '<div class="fa-hc-card fa-hc-clickable" onclick="filterDupObjType(\'address\')"><div class="fa-hc-val">' + (counts.address || 0) + '</div><div class="fa-hc-lbl">Dup Address</div></div>' +
                '<div class="fa-hc-card fa-hc-clickable" onclick="filterDupObjType(\'addrgrp\')"><div class="fa-hc-val">' + (counts.addrgrp || 0) + '</div><div class="fa-hc-lbl">Dup Addrgrp</div></div>' +
                '<div class="fa-hc-card fa-hc-clickable" onclick="filterDupObjType(\'service\')"><div class="fa-hc-val">' + (counts.service || 0) + '</div><div class="fa-hc-lbl">Dup Service</div></div>' +
                '<div class="fa-hc-card fa-hc-clickable" onclick="filterDupObjType(\'svcgrp\')"><div class="fa-hc-val">' + (counts.svcgrp || 0) + '</div><div class="fa-hc-lbl">Dup Svcgrp</div></div>' +
                '<div class="fa-hc-card fa-hc-dead fa-hc-clickable" onclick="filterDupObjType(\'all\')"><div class="fa-hc-val">' + (res.total_groups || 0) + '</div><div class="fa-hc-lbl">Toplam Dup Grup</div></div>';
            renderDupObj();
        });
    }

    function renderDupObj() {
        if (!dupObjCache) return;
        var tbody = document.getElementById('fa-dupobj-tbody');
        var q = (document.getElementById('fa-dupobj-search').value || '').trim().toLowerCase();
        var typeLabels = { address: 'Address', addrgrp: 'Address Group', service: 'Service', svcgrp: 'Service Group' };
        var groups = (dupObjCache.groups || []).filter(function(g) {
            if (dupObjCurrentType !== 'all' && dupObjCurrentType !== g.object_type) return false;
            if (!q) return true;
            var nameStr = (g.names || []).join(' ').toLowerCase();
            var detailStr = JSON.stringify(g.details || {}).toLowerCase();
            return nameStr.indexOf(q) >= 0 || detailStr.indexOf(q) >= 0;
        });
        if (!groups.length) { tbody.innerHTML = '<tr><td colspan="5"><em>Bu kategoride duplicate obje yok.</em></td></tr>'; return; }
        var html = '';
        groups.forEach(function(g, gi) {
            var d = g.details || {};
            var detail = '';
            if (d.resolved) detail = d.resolved.slice(0, 5).join(', ') + (d.resolved.length > 5 ? ' +' + (d.resolved.length - 5) : '');
            if (d.protocol) detail = d.protocol + ': ' + detail;
            if (d.type) detail = d.type;
            var hashId = g.object_type + ':' + (g.signature || (g.names || []).join('|'));
            var namesList = g.names || [];
            // Not 15: Uzun isim listesi — ilk 3 göster + "tümünü göster" expand
            var namesPreview;
            if (namesList.length > 3) {
                namesPreview = faEscape(namesList.slice(0,3).join(', ')) +
                    ' <span style="color:#7f8c8d;font-size:.78rem">+' + (namesList.length-3) + ' obje daha</span>';
            } else {
                namesPreview = faEscape(namesList.join(', '));
            }
            var rowKey = 'dupobj-' + gi;
            // Data attribute'ı ile full veri stash et — click handler'da kullan
            window.__faDupObjCache = window.__faDupObjCache || {};
            window.__faDupObjCache[rowKey] = g;
            html += '<tr class="fa-clickable-row" onclick="fireAuditOpenDupObjDetail(\'' + rowKey + '\')" title="Üye listesi + kullanım için tıkla">' +
                '<td><span class="fa-obj-type-' + g.object_type + '">' + faEscape(typeLabels[g.object_type] || g.object_type) + '</span></td>' +
                '<td><strong>' + g.count + '</strong></td>' +
                '<td class="fa-cell-small"><code>' + faEscape(detail) + '</code></td>' +
                '<td class="fa-cell-small" style="max-width:340px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + faEscape(namesList.join(', ')) + '">' + namesPreview + '</td>' +
                '<td onclick="event.stopPropagation()">' + faAckButton('dup_obj', hashId, g.ack_state) + '</td></tr>';
        });
        tbody.innerHTML = html;
    }

    // Not 15 — Dup obj detay modal: grup üyeleri + her birinin rule usage'ı
    window.fireAuditOpenDupObjDetail = function(rowKey) {
        var g = (window.__faDupObjCache || {})[rowKey];
        if (!g) { alert('Detay bulunamadı'); return; }
        var modal = document.getElementById('fa-rule-modal');
        var body = document.getElementById('fa-modal-body');
        var title = document.getElementById('fa-modal-title');
        if (!modal || !body || !title) { alert('Modal HTML eksik'); return; }
        var typeLabels = { address: 'Address', addrgrp: 'Address Group', service: 'Service', svcgrp: 'Service Group' };
        var names = g.names || [];
        title.innerHTML = '<i class="fas fa-clone"></i> Duplicate ' + faEscape(typeLabels[g.object_type] || g.object_type) + ' Grubu — ' + names.length + ' obje';

        var d = g.details || {};
        var detailStr = '';
        if (d.resolved) detailStr = d.resolved.join(', ');
        else if (d.protocol) detailStr = d.protocol + ' ' + (d.port_range||'');
        else if (d.type) detailStr = d.type;

        var namesHtml = '<ul style="margin:0;padding-left:20px;max-height:300px;overflow:auto;">';
        names.forEach(function(n) {
            namesHtml += '<li><code>' + faEscape(n) + '</code> <a class="fa-rule-link" style="font-size:.75rem;margin-left:8px;" onclick="fireAuditLookupObjUsage(\'' + faEscape(n) + '\')">[Kullanımı ara]</a></li>';
        });
        namesHtml += '</ul>';

        body.innerHTML =
            '<div class="fa-modal-section"><h4><i class="fas fa-info-circle"></i> Grup Bilgisi</h4>' +
            '<table class="fa-table fa-table-sm"><tbody>' +
            '<tr><th>Tip</th><td>' + faEscape(typeLabels[g.object_type] || g.object_type) + '</td></tr>' +
            '<tr><th>Ortak Değer</th><td><code>' + faEscape(detailStr) + '</code></td></tr>' +
            '<tr><th>Obje Sayısı</th><td><strong>' + names.length + '</strong> aynı değere sahip</td></tr>' +
            '<tr><th>Öneri</th><td>Bu ' + names.length + ' obje aynı IP/port\'a sahip. Birini master seçin, diğerlerini kurallarda o isimle değiştirin, sonra silin.</td></tr>' +
            '</tbody></table></div>' +
            '<div class="fa-modal-section"><h4><i class="fas fa-list"></i> Obje Üyeleri (' + names.length + ')</h4>' +
            namesHtml + '</div>' +
            '<div id="fa-dupobj-compare" class="fa-modal-section"></div>' +
            '<div id="fa-dupobj-usage" class="fa-modal-section"></div>';
        modal.style.display = 'flex';
        modal.onclick = function(e) { if (e.target === modal) modal.style.display = 'none'; };

        // Address group ise side-by-side compare table yukle
        if (g.object_type === 'addrgrp' && names.length >= 2 && names.length <= 8) {
            _faDupObjLoadCompare(names);
        } else if (g.object_type === 'addrgrp' && names.length > 8) {
            document.getElementById('fa-dupobj-compare').innerHTML =
                '<h4><i class="fas fa-columns"></i> Compare</h4>' +
                '<em style="color:#7f8c8d">8+ grup compare için fazla — ilk 2-8 grup seçince matris görünür.</em>';
        }
    };

    function _faDupObjLoadCompare(names) {
        var box = document.getElementById('fa-dupobj-compare');
        if (!box) return;
        box.innerHTML = '<h4><i class="fas fa-columns"></i> Üye IP/Network Karşılaştırması</h4>' +
            '<div style="text-align:center;padding:18px;"><i class="fas fa-spinner fa-spin"></i> Grup üyeleri yükleniyor...</div>';
        faApi('addrgrp_compare', { names: names.join(',') }).then(function(r) {
            if (!r.success) {
                box.innerHTML = '<div style="color:#e74c3c">Hata: ' + faEscape(r.error || '?') + '</div>';
                return;
            }
            var groups = r.groups || [];
            if (!groups.length) {
                box.innerHTML = '<em>Grup detayları bulunamadı.</em>';
                return;
            }
            // Tüm CIDR/üye seti (union)
            var allMembers = {};  // member -> [bool per group]
            groups.forEach(function(grp, gi) {
                var memSet = {};
                (grp.members || []).forEach(function(m) { memSet[m] = true; });
                Object.keys(memSet).forEach(function(m) {
                    if (!allMembers[m]) allMembers[m] = [];
                    allMembers[m][gi] = true;
                });
            });
            var allResolved = {};
            groups.forEach(function(grp, gi) {
                (grp.resolved || []).forEach(function(c) {
                    if (!allResolved[c]) allResolved[c] = [];
                    allResolved[c][gi] = true;
                });
            });

            // Üye matris (group adları kolon, üye satır)
            var html = '<h4 style="margin-bottom:6px;"><i class="fas fa-columns"></i> Üye Karşılaştırması (' + groups.length + ' grup)</h4>';

            // Özet kart
            html += '<div style="display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap;">';
            html += '<div style="background:#dbeafe;color:#1e3a8a;padding:6px 14px;border-radius:6px;font-size:.82rem;font-weight:700;">' +
                '<i class="fas fa-equals"></i> Ortak CIDR: ' + r.common_count + '</div>';
            html += '<div style="background:#fef3c7;color:#92400e;padding:6px 14px;border-radius:6px;font-size:.82rem;font-weight:700;">' +
                '<i class="fas fa-not-equal"></i> Tüm Union: ' + Object.keys(allResolved).length + '</div>';
            if (r.all_identical) {
                html += '<div style="background:#d1fae5;color:#065f46;padding:6px 14px;border-radius:6px;font-size:.82rem;font-weight:700;">' +
                    '<i class="fas fa-check-circle"></i> Tamamen Aynı (Birleştirilebilir)</div>';
            } else {
                html += '<div style="background:#fee2e2;color:#991b1b;padding:6px 14px;border-radius:6px;font-size:.82rem;font-weight:700;">' +
                    '<i class="fas fa-exclamation-triangle"></i> Farklılıklar Var (Manuel İnceleme)</div>';
            }
            html += '</div>';

            // Resolved CIDR matrix (her satır CIDR, her kolon grup, ✓ = grupta var)
            html += '<div style="overflow-x:auto;max-height:500px;overflow-y:auto;">';
            html += '<table class="fa-table fa-table-sm" style="font-size:.78rem;min-width:100%;">';
            html += '<thead><tr><th style="text-align:left;">CIDR / IP</th>';
            groups.forEach(function(grp) {
                html += '<th style="text-align:center;font-family:monospace;font-size:.7rem;" title="' + faEscape(grp.name) + '">' + faEscape(grp.name.length > 20 ? grp.name.substring(0,18)+'…' : grp.name) + '<br><small style="color:#7f8c8d;font-weight:400;">(' + grp.resolved_count + ' CIDR)</small></th>';
            });
            html += '</tr></thead><tbody>';
            var sortedCidrs = Object.keys(allResolved).sort();
            sortedCidrs.forEach(function(cidr) {
                var presenceCount = allResolved[cidr].filter(Boolean).length;
                var rowBg = presenceCount === groups.length ? '#d1fae5' : (presenceCount === 1 ? '#fee2e2' : '#fef3c7');
                html += '<tr style="background:' + rowBg + ';">';
                html += '<td style="font-family:monospace;font-weight:600;color:#0f172a;">' + faEscape(cidr) + '</td>';
                groups.forEach(function(grp, gi) {
                    var present = allResolved[cidr][gi];
                    if (present) {
                        html += '<td style="text-align:center;color:#065f46;font-weight:700;font-size:1rem;" title="' + faEscape(grp.name) + ' bu CIDR\'i içeriyor">✓</td>';
                    } else {
                        html += '<td style="text-align:center;color:#94a3b8;">—</td>';
                    }
                });
                html += '</tr>';
            });
            html += '</tbody></table></div>';
            html += '<div style="font-size:.75rem;color:#7f8c8d;margin-top:8px;">' +
                '<span style="background:#d1fae5;padding:2px 8px;border-radius:3px;">Yeşil</span> = tüm gruplarda var · ' +
                '<span style="background:#fef3c7;padding:2px 8px;border-radius:3px;">Sarı</span> = bazı gruplarda var · ' +
                '<span style="background:#fee2e2;padding:2px 8px;border-radius:3px;">Kırmızı</span> = sadece tek grupta unique</div>';

            // Direkt member listesi de göster (UUID/isim, resolve edilmemiş)
            var memberKeys = Object.keys(allMembers).sort();
            if (memberKeys.length && memberKeys.length !== sortedCidrs.length) {
                html += '<details style="margin-top:14px;">';
                html += '<summary style="cursor:pointer;font-weight:700;font-size:.85rem;">Ham Üye Adları (' + memberKeys.length + ')</summary>';
                html += '<table class="fa-table fa-table-sm" style="font-size:.75rem;margin-top:6px;"><thead><tr><th>Member</th>';
                groups.forEach(function(grp) {
                    html += '<th style="text-align:center;">' + faEscape(grp.name.substring(0,15)) + '</th>';
                });
                html += '</tr></thead><tbody>';
                memberKeys.forEach(function(m) {
                    html += '<tr><td style="font-family:monospace;">' + faEscape(m) + '</td>';
                    groups.forEach(function(grp, gi) {
                        var p = allMembers[m][gi];
                        html += '<td style="text-align:center;color:' + (p ? '#065f46' : '#94a3b8') + ';">' + (p ? '✓' : '—') + '</td>';
                    });
                    html += '</tr>';
                });
                html += '</tbody></table></details>';
            }

            box.innerHTML = html;
        }).catch(function(err) {
            box.innerHTML = '<div style="color:#e74c3c">Bağlantı hatası: ' + faEscape(err.message) + '</div>';
        });
    }

    window.fireAuditLookupObjUsage = function(objName) {
        var box = document.getElementById('fa-dupobj-usage');
        if (!box) return;
        box.innerHTML = '<h4><i class="fas fa-search"></i> "' + faEscape(objName) + '" — Rule Kullanımı</h4>' +
            '<div style="padding:20px;text-align:center;"><i class="fas fa-spinner fa-spin"></i></div>';
        faApi('query', { src: objName, dst: objName, match_mode: 'any', include_any: '0' }).then(function(r) {
            if (!r.success) { box.innerHTML += '<div style="color:#e74c3c">Hata</div>'; return; }
            var rules = r.rules || [];
            var rulesHtml = '<h4><i class="fas fa-search"></i> "' + faEscape(objName) + '" — ' + rules.length + ' kural eşleşti</h4>';
            if (!rules.length) rulesHtml += '<em>Hiçbir aktif kuralda kullanılmıyor (stale adayı)</em>';
            else {
                rulesHtml += '<table class="fa-table fa-table-sm"><thead><tr><th>Rule</th><th>Adı</th><th>Action</th></tr></thead><tbody>';
                rules.slice(0, 20).forEach(function(ru) {
                    rulesHtml += '<tr><td>' + faFormatRuleId(ru.rule_id) + '</td>' +
                        '<td>' + faEscape(ru.name || '-') + '</td>' +
                        '<td>' + faActionBadge(ru.action) + '</td></tr>';
                });
                rulesHtml += '</tbody></table>';
                if (rules.length > 20) rulesHtml += '<small style="color:#7f8c8d;">+' + (rules.length-20) + ' daha (Target tab\'ında tam görüntü)</small>';
            }
            box.innerHTML = rulesHtml;
        });
    };

    window.filterDupObjType = function(type) {
        dupObjCurrentType = type;
        var btns = document.querySelectorAll('#fa-tab-dup_obj .fa-sub-btn');
        btns.forEach(function(b) { b.classList.toggle('active', b.getAttribute('data-type') === type); });
        renderDupObj();
    };

    window.filterDupObjText = function() { renderDupObj(); };

    // ---------- Routes tab ----------
    var _routesSearchTimer = null;
    var _routesLastAnalysis = null;

    window.fireAuditRoutesSearch = function() {
        clearTimeout(_routesSearchTimer);
        _routesSearchTimer = setTimeout(function() { loadRoutes(1); }, 400);
    };

    function _routesHideAllPanels() {
        ['fa-routes-dup-panel', 'fa-routes-merge-panel', 'fa-routes-red-panel'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
    }

    window.routesKpiClick = function(type) {
        var searchEl = document.getElementById('fa-routes-search');
        var ana = _routesLastAnalysis || {};

        if (type === 'total') {
            _routesHideAllPanels();
            if (searchEl) searchEl.value = '';
            var devSel = document.getElementById('fa-routes-device-filter');
            var stSel  = document.getElementById('fa-routes-status-filter');
            if (devSel) devSel.value = '';
            if (stSel)  stSel.value  = '';
            loadRoutes(1);
            return;
        }

        if (type === 'default') {
            _routesHideAllPanels();
            if (searchEl) searchEl.value = '0.0.0.0';
            loadRoutes(1);
            return;
        }

        if (type === 'iface') {
            var tabBtn = document.querySelector('#firescope-page .fa-tab[data-tab="interfaces"]');
            if (tabBtn) tabBtn.click();
            return;
        }

        // Panel toggle types
        var panelId = type === 'duplicate' ? 'fa-routes-dup-panel'
                    : type === 'merge'     ? 'fa-routes-merge-panel'
                    : type === 'redundant' ? 'fa-routes-red-panel'
                    : null;
        if (!panelId) return;
        var panel = document.getElementById(panelId);
        if (!panel) return;

        if (panel.style.display !== 'none') { panel.style.display = 'none'; return; }
        _routesHideAllPanels();

        if (type === 'duplicate') {
            var dups = ana.duplicate_dsts || [];
            if (!dups.length) return;
            panel.innerHTML = '<div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;">Aynı interface\'de aynı hedef. Filtrelemek için tıkla:</div>' +
                dups.map(function(d) {
                    var ip = d.dst.split('/')[0];
                    return '<span onclick="routesFilterByDst(\'' + _esc(ip) + '\')" ' +
                        'style="display:inline-flex;align-items:center;gap:4px;background:var(--card-bg);border:1px solid var(--border-color);' +
                        'border-radius:5px;padding:3px 8px;margin:2px;font-size:11px;cursor:pointer;">' +
                        '<code>' + _esc(d.dst) + '</code>' +
                        '<span style="color:var(--text-muted);font-size:10px;">@ ' + _esc(d.device) + '</span>' +
                        '<span style="background:#e67e22;color:#fff;border-radius:3px;padding:0 4px;font-size:10px;">×' + d.count + '</span></span>';
                }).join('');
        } else if (type === 'merge') {
            var merges = ana.merge_candidates || [];
            if (!merges.length) return;
            panel.innerHTML = '<div style="font-size:11px;color:var(--text-muted);margin-bottom:8px;">' +
                'Aynı interface + gateway\'de komşu subnetler. Birleştirme için IP\'ye tıkla:</div>' +
                merges.map(function(m) {
                    var routeLinks = m.routes.map(function(r) {
                        var ip = r.dst_cidr.split('/')[0];
                        return '<span onclick="routesFilterByDst(\'' + _esc(ip) + '\')" ' +
                            'style="cursor:pointer;text-decoration:underline dotted;"><code style="font-size:11px;">' + _esc(r.dst_cidr) + '</code></span>';
                    }).join(' + ');
                    return '<div style="background:var(--card-bg);border:1px solid var(--border-color);border-radius:5px;padding:6px 10px;margin:3px 0;font-size:12px;">' +
                        '<span style="color:var(--text-muted);font-size:10px;">' + _esc(m.device) + ' → ' + _esc(m.gateway) + '</span><br>' +
                        routeLinks +
                        ' <i class="fas fa-arrow-right" style="color:var(--text-muted);margin:0 4px;"></i> ' +
                        '<code style="font-size:12px;color:#27ae60;">' + _esc(m.merged_into) + '</code>' +
                        '<span style="color:#27ae60;font-size:10px;margin-left:6px;">−' + m.saves + ' route</span></div>';
                }).join('');
        } else if (type === 'redundant') {
            var reds = ana.redundant_routes || [];
            if (!reds.length) return;
            panel.innerHTML = '<div style="font-size:11px;color:var(--text-muted);margin-bottom:8px;">' +
                'Aynı interface + gateway\'de daha geniş route zaten kapsıyor. Filtrelemek için tıkla:</div>' +
                reds.map(function(r) {
                    var ip = r.redundant.dst_cidr.split('/')[0];
                    return '<div style="background:var(--card-bg);border:1px solid var(--border-color);border-radius:5px;padding:6px 10px;margin:3px 0;font-size:12px;">' +
                        '<span style="color:var(--text-muted);font-size:10px;">' + _esc(r.device) + ' → ' + _esc(r.gateway) + '</span><br>' +
                        '<span onclick="routesFilterByDst(\'' + _esc(ip) + '\')" style="cursor:pointer;">' +
                        '<code style="color:#e74c3c;text-decoration:line-through;">' + _esc(r.redundant.dst_cidr) + '</code></span>' +
                        ' <i class="fas fa-level-up-alt" style="color:var(--text-muted);font-size:10px;margin:0 4px;"></i> ' +
                        '<code style="font-size:11px;">' + _esc(r.covered_by.dst_cidr) + '</code>' +
                        ' <span style="color:var(--text-muted);font-size:10px;">kapsıyor</span></div>';
                }).join('');
        }

        panel.style.display = 'block';
    };

    window.routesFilterByDst = function(ip) {
        _routesHideAllPanels();
        var searchEl = document.getElementById('fa-routes-search');
        if (searchEl) searchEl.value = ip;
        loadRoutes(1);
    };

    window.loadRoutes = function(page) {
        page = page || 1;
        var tbody = document.getElementById('fa-routes-tbody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:24px;"><i class="fas fa-spinner fa-spin"></i></td></tr>';

        var params = { page: page, per_page: 50 };
        var search = (document.getElementById('fa-routes-search') || {}).value;
        if (search) params.search = search;
        var dev = (document.getElementById('fa-routes-device-filter') || {}).value;
        if (dev) params.device = dev;
        var st = (document.getElementById('fa-routes-status-filter') || {}).value;
        if (st) params.status = st;

        faApi('routes', params).then(function(d) {
            if (!d.success) { tbody.innerHTML = '<tr><td colspan="8">Hata</td></tr>'; return; }

            _renderRoutesAnalysis(d.analysis, d.devices);

            var countEl = document.getElementById('fa-routes-count');
            if (countEl) countEl.textContent = d.total + ' route';

            if (!d.routes || !d.routes.length) {
                tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:24px;">Route bulunamadı</td></tr>';
            } else {
                tbody.innerHTML = d.routes.map(function(r) {
                    var dstBadge = r.is_default
                        ? '<span style="background:#e74c3c;color:#fff;border-radius:3px;padding:1px 5px;font-size:10px;margin-left:4px;">DEFAULT</span>'
                        : '';
                    var statusBadge = r.status === 'enable'
                        ? '<span style="color:#27ae60;"><i class="fas fa-circle" style="font-size:8px;"></i></span>'
                        : '<span style="color:#95a5a6;"><i class="fas fa-circle" style="font-size:8px;"></i></span>';
                    return '<tr>' +
                        '<td style="color:var(--text-muted);font-size:11px;">' + _esc(r.seq) + '</td>' +
                        '<td><code style="font-size:12px;">' + _esc(r.dst_cidr) + '</code>' + dstBadge + '</td>' +
                        '<td><code style="font-size:12px;">' + _esc(r.gateway || '—') + '</code></td>' +
                        '<td><span class="fa-badge-iface">' + _esc(r.device || '—') + '</span></td>' +
                        '<td style="text-align:center;">' + _esc(String(r.distance)) + '</td>' +
                        '<td style="text-align:center;">' + _esc(String(r.priority)) + '</td>' +
                        '<td style="text-align:center;">' + statusBadge + '</td>' +
                        '<td style="font-size:11px;color:var(--text-muted);">' + _esc(r.comments || '') + '</td>' +
                    '</tr>';
                }).join('');
            }

            _renderRoutesPagination(d.page, d.total_pages);
        }).catch(function() {
            tbody.innerHTML = '<tr><td colspan="8">Bağlantı hatası</td></tr>';
        });
    };

    function _renderRoutesAnalysis(analysis, devices) {
        if (!analysis) return;
        var kpiEl = document.getElementById('fa-routes-kpi');
        var issEl = document.getElementById('fa-routes-issues');
        var analEl = document.getElementById('fa-routes-analysis');
        if (!kpiEl) return;
        analEl.style.display = '';
        _routesLastAnalysis = analysis;

        var defCount    = (analysis.default_routes   || []).length;
        var dupCount    = (analysis.duplicate_dsts   || []).length;
        var mergeCount  = (analysis.merge_candidates || []).length;
        var redCount    = (analysis.redundant_routes || []).length;
        var totalRoutes = analysis.total_routes || 0;
        var devCount    = Object.keys(analysis.device_counts || {}).length;

        var kpiDefs = [
            ['fas fa-route',          'Toplam Route',    totalRoutes, '',                                              'total'],
            ['fas fa-ethernet',       'Interface',       devCount,    '',                                              'iface'],
            ['fas fa-directions',     'Default Route',   defCount,    defCount > 1 ? 'color:#e74c3c;' : 'color:#27ae60;', 'default'],
            ['fas fa-copy',           'Duplicate Hedef', dupCount,    dupCount ? 'color:#e67e22;' : 'color:var(--text-muted);', 'duplicate'],
            ['fas fa-compress-arrows-alt', 'Merge Adayı', mergeCount, mergeCount ? 'color:#3498db;' : 'color:var(--text-muted);', 'merge'],
            ['fas fa-ban',            'Redundant',       redCount,    redCount ? 'color:#e74c3c;' : 'color:var(--text-muted);',  'redundant'],
        ];
        kpiEl.innerHTML = kpiDefs.map(function(k) {
            return '<div class="fa-kpi-card" onclick="routesKpiClick(\'' + k[4] + '\')" ' +
                'style="cursor:pointer;" title="' + k[1] + ' — tıkla">' +
                '<div style="font-size:22px;' + k[3] + '"><i class="' + k[0] + '"></i></div>' +
                '<div class="fa-ov-big" style="font-size:1.6rem;' + k[3] + '">' + k[2] + '</div>' +
                '<div class="fa-ov-tile-lbl">' + k[1] + '</div></div>';
        }).join('');

        // Panel container'larını inject et (yoksa oluştur)
        var panelParent = kpiEl.parentNode;
        [
            ['fa-routes-dup-panel',   'var(--sidebar-bg)'],
            ['fa-routes-merge-panel', 'var(--sidebar-bg)'],
            ['fa-routes-red-panel',   'var(--sidebar-bg)'],
        ].forEach(function(p) {
            if (!document.getElementById(p[0])) {
                var el = document.createElement('div');
                el.id = p[0];
                el.style.cssText = 'display:none;padding:8px 12px;background:' + p[1] + ';border:1px solid var(--border-color);border-radius:6px;margin-top:6px;max-height:260px;overflow-y:auto;';
                panelParent.insertBefore(el, kpiEl.nextSibling);
            }
        });

        var issues = analysis.issues || [];
        if (issues.length) {
            issEl.innerHTML = issues.map(function(iss) {
                var icon = iss.type === 'multiple_default' ? 'fa-exclamation-triangle' : 'fa-info-circle';
                var color = iss.type === 'multiple_default' ? '#e67e22' : '#3498db';
                return '<div style="display:inline-flex;align-items:center;gap:6px;background:var(--card-bg);border:1px solid var(--border-color);border-radius:6px;padding:5px 10px;margin:2px;font-size:12px;">' +
                    '<i class="fas ' + icon + '" style="color:' + color + ';"></i>' + _esc(iss.detail) + '</div>';
            }).join('');
        } else {
            issEl.innerHTML = '';
        }

        // Device filter dropdown'u doldur
        var devSel = document.getElementById('fa-routes-device-filter');
        if (devSel && devices) {
            var current = devSel.value;
            devSel.innerHTML = '<option value="">Tüm Interface\'ler</option>' +
                (devices || []).map(function(d) {
                    return '<option value="' + _esc(d) + '"' + (d === current ? ' selected' : '') + '>' + _esc(d) + '</option>';
                }).join('');
        }
    }

    function _renderRoutesPagination(page, totalPages) {
        var el = document.getElementById('fa-routes-pagination');
        if (!el) return;
        if (totalPages <= 1) { el.innerHTML = ''; return; }
        var html = '';
        if (page > 1) html += '<button class="fa-page-btn" onclick="loadRoutes(' + (page-1) + ')">‹</button>';
        var start = Math.max(1, page - 2), end = Math.min(totalPages, page + 2);
        for (var i = start; i <= end; i++) {
            html += '<button class="fa-page-btn' + (i === page ? ' active' : '') + '" onclick="loadRoutes(' + i + ')">' + i + '</button>';
        }
        if (page < totalPages) html += '<button class="fa-page-btn" onclick="loadRoutes(' + (page+1) + ')">›</button>';
        el.innerHTML = html;
    }

    // ---------- Interfaces tab ----------
    function loadInterfaces() {
        var tbody = document.getElementById('fa-iface-tbody');
        tbody.innerHTML = '<tr><td colspan="9"><i class="fas fa-spinner fa-spin"></i></td></tr>';
        faApi('interfaces').then(function(res) {
            if (!res.success) { tbody.innerHTML = '<tr><td colspan="9">Hata</td></tr>'; return; }
            // IPsec / tunnel interface'leri filtrele — VPN tab'ında zaten görünüyor
            var all = res.interfaces || [];
            ifaceCache = all.filter(function(i) {
                if ((i.type || '').toLowerCase() === 'tunnel') return false;
                if (/^(ipsec|vpn|ssl)/i.test(i.name || '')) return false;
                return true;
            });
            var filteredOut = all.length - ifaceCache.length;
            document.getElementById('fa-iface-count').textContent = ifaceCache.length +
                (filteredOut > 0 ? ' (' + filteredOut + ' tunnel gizli)' : '');
            renderInterfaces(ifaceCache);
        });
    }

    function renderInterfaces(list) {
        var tbody = document.getElementById('fa-iface-tbody');
        if (!list.length) { tbody.innerHTML = '<tr><td colspan="9"><em>Yok.</em></td></tr>'; return; }
        var html = '';
        list.forEach(function(i) {
            var riskyAccess = /http[^s]|telnet/i.test(i.allowaccess || '');
            html += '<tr><td><strong>' + faEscape(i.name) + '</strong></td>' +
                '<td>' + faEscape(i.alias || '-') + '</td>' +
                '<td>' + faEscape(i.type || '-') + '</td>' +
                '<td><code>' + faEscape(i.ip || '-') + '</code></td>' +
                '<td>' + faEscape(i.status || '-') + '</td>' +
                '<td>' + faEscape(i.role || '-') + '</td>' +
                '<td>' + faEscape(i.zone || '-') + '</td>' +
                '<td class="fa-cell-small ' + (riskyAccess ? 'fa-iface-risky' : '') + '">' + faEscape(i.allowaccess || '-') + '</td>' +
                '<td>' + (riskyAccess ? faAckButton('interface', i.name, i.ack_state, 'HIGH') : '<em style="color:#bdc3c7;font-size:.75rem">OK</em>') + '</td></tr>';
        });
        tbody.innerHTML = html;
    }

    window.filterFireAuditInterfaces = function() {
        var q = document.getElementById('fa-iface-search').value.trim().toLowerCase();
        if (!ifaceCache) return;
        if (!q) { renderInterfaces(ifaceCache); return; }
        var filtered = ifaceCache.filter(function(i) {
            return (i.name || '').toLowerCase().includes(q) ||
                   (i.alias || '').toLowerCase().includes(q) ||
                   (i.ip || '').toLowerCase().includes(q) ||
                   (i.zone || '').toLowerCase().includes(q) ||
                   (i.role || '').toLowerCase().includes(q);
        });
        renderInterfaces(filtered);
    };

    // ============================================================
    // Network Hardening Tabs (Switch/Router)
    // ============================================================

    function faSevColor(sev) {
        var s = (sev || '').toUpperCase();
        if (s === 'CRITICAL') return '#c0392b';
        if (s === 'HIGH')     return '#e67e22';
        if (s === 'MEDIUM')   return '#f39c12';
        return '#95a5a6';
    }

    function faBadge(txt, bg) {
        return '<span style="display:inline-block;padding:2px 8px;border-radius:10px;' +
               'background:' + bg + ';color:#fff;font-size:11px;font-weight:600;">' +
               faEscape(txt) + '</span>';
    }

    // Detayli kanit + CLI fix goruntusu — expandable
    var _issueIdCounter = 0;
    function faIssueList(issues) {
        if (!issues || !issues.length) {
            return '<div style="padding:10px;color:#27ae60;"><i class="fas fa-check-circle"></i> Bulgu yok — temiz</div>';
        }
        var html = '<div style="display:flex;flex-direction:column;gap:8px;">';
        issues.forEach(function(i) {
            var color = faSevColor(i.severity);
            var id = 'fa-issue-' + (++_issueIdCounter);
            var hasDetail = !!(i.current || i.recommended || i.evidence || i.cli_fix || i.rationale || i.ports_affected);

            html += '<div style="border-left:4px solid ' + color + ';background:var(--card-bg);padding:10px 12px;border-radius:4px;">';
            html += '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">';
            html += '<div style="flex:1;">';
            if (i.control) {
                html += '<div style="font-size:.72rem;text-transform:uppercase;color:var(--text-muted);letter-spacing:.05em;margin-bottom:2px;">' + faEscape(i.control) + '</div>';
            }
            html += '<strong>' + faEscape(i.message || '-') + '</strong>';
            html += '</div>';
            html += '<div style="display:flex;gap:6px;align-items:center;">';
            html += faBadge(i.severity || 'LOW', color);
            if (hasDetail) {
                html += '<button onclick="faToggleIssueDetail(\'' + id + '\')" style="border:1px solid var(--border-color);background:var(--card-bg);padding:4px 10px;border-radius:4px;cursor:pointer;font-size:.75rem;"><i class="fas fa-chevron-down" id="' + id + '-icon"></i> Detay</button>';
            }
            html += '</div></div>';

            // Kisa ozet oneri (detay kapali iken gorsun)
            var shortRec = i.recommendation || i.recommended || '';
            if (shortRec) {
                html += '<div style="margin-top:6px;font-size:.82rem;color:var(--text-muted);"><i class="fas fa-wrench"></i> ' + faEscape(shortRec) + '</div>';
            }
            // Etkilenen portlar (kisa liste)
            if (i.ports && i.ports.length) {
                html += '<div style="margin-top:6px;font-size:.78rem;"><code>' + faEscape(i.ports.join(', ')) + '</code></div>';
            }

            // Detay paneli (default gizli)
            if (hasDetail) {
                html += '<div id="' + id + '" style="display:none;margin-top:10px;padding-top:10px;border-top:1px dashed var(--border-color);">';

                if (i.current) {
                    html += '<div style="margin-bottom:8px;"><strong style="color:#e74c3c;"><i class="fas fa-search"></i> Mevcut durum:</strong>';
                    html += '<pre style="background:rgba(231,76,60,0.08);padding:8px;border-radius:4px;margin:4px 0;font-size:.78rem;white-space:pre-wrap;">' + faEscape(String(i.current)) + '</pre>';
                    html += '</div>';
                }

                if (i.recommended) {
                    html += '<div style="margin-bottom:8px;"><strong style="color:#27ae60;"><i class="fas fa-check-circle"></i> Olmasi gereken:</strong>';
                    html += '<div style="background:rgba(39,174,96,0.08);padding:8px;border-radius:4px;margin:4px 0;font-size:.85rem;">' + faEscape(String(i.recommended)) + '</div>';
                    html += '</div>';
                }

                if (i.evidence && i.evidence.length) {
                    html += '<div style="margin-bottom:8px;"><strong><i class="fas fa-file-code"></i> Kanit (running-config):</strong>';
                    html += '<pre style="background:#2c3e50;color:#ecf0f1;padding:8px;border-radius:4px;margin:4px 0;font-size:.75rem;overflow-x:auto;white-space:pre-wrap;">';
                    var ev = Array.isArray(i.evidence) ? i.evidence : [String(i.evidence)];
                    html += faEscape(ev.join('\n'));
                    html += '</pre></div>';
                }

                if (i.cli_fix && i.cli_fix.length) {
                    html += '<div style="margin-bottom:8px;"><strong style="color:#3498db;"><i class="fas fa-terminal"></i> CLI komutlari (salt okunur portal — siz uygulayin):</strong>';
                    html += '<pre style="background:#1e272e;color:#00ff88;padding:10px;border-radius:4px;margin:4px 0;font-size:.78rem;font-family:monospace;overflow-x:auto;white-space:pre-wrap;">';
                    var clis = Array.isArray(i.cli_fix) ? i.cli_fix : [String(i.cli_fix)];
                    html += faEscape(clis.join('\n'));
                    html += '</pre></div>';
                }

                if (i.rationale) {
                    html += '<div style="margin-bottom:8px;background:rgba(52,152,219,0.08);padding:10px;border-radius:4px;">';
                    html += '<strong style="color:#3498db;"><i class="fas fa-info-circle"></i> Neden onemli?</strong>';
                    html += '<div style="margin-top:4px;font-size:.82rem;">' + faEscape(i.rationale) + '</div>';
                    html += '</div>';
                }

                if (i.ports_affected && i.ports_affected.length) {
                    html += '<div style="margin-bottom:8px;"><strong>Etkilenen portlar (' + i.ports_affected.length + '):</strong>';
                    html += '<div style="margin-top:4px;font-family:monospace;font-size:.75rem;word-break:break-all;">' + faEscape(i.ports_affected.join(', ')) + '</div>';
                    html += '</div>';
                }

                html += '</div>';
            }

            html += '</div>';
        });
        html += '</div>';
        return html;
    }

    window.faToggleIssueDetail = function(id) {
        var el = document.getElementById(id);
        var ic = document.getElementById(id + '-icon');
        if (!el) return;
        var open = el.style.display === 'block';
        el.style.display = open ? 'none' : 'block';
        if (ic) ic.className = open ? 'fas fa-chevron-down' : 'fas fa-chevron-up';
    };

    // ---------- VLAN Analysis ----------
    function loadVlanAnalysis() {
        var vtbody = document.getElementById('fa-vlan-tbody');
        var ttbody = document.getElementById('fa-trunk-tbody');
        if (vtbody) vtbody.innerHTML = '<tr><td colspan="3"><i class="fas fa-spinner fa-spin"></i></td></tr>';
        if (ttbody) ttbody.innerHTML = '<tr><td colspan="4"><i class="fas fa-spinner fa-spin"></i></td></tr>';

        faApi('network_vlans').then(function(res) {
            if (!res.success) {
                if (vtbody) vtbody.innerHTML = '<tr><td colspan="3">Hata: ' + faEscape(res.error || '') + '</td></tr>';
                return;
            }
            document.getElementById('fa-vlan-count').textContent = res.vlan_count || 0;
            document.getElementById('fa-trunk-count').textContent = res.trunk_count || 0;
            var native1 = (res.trunks || []).filter(function(t) { return String(t.native_vlan) === '1'; }).length;
            document.getElementById('fa-vlan-native1').textContent = native1;
            document.getElementById('fa-vlan-default-used').textContent = res.default_vlan_used ? 'Evet' : 'Hayir';

            // VLAN table
            if (vtbody) {
                if (!(res.vlans || []).length) {
                    vtbody.innerHTML = '<tr><td colspan="3"><em>VLAN verisi yok.</em></td></tr>';
                } else {
                    var html = '';
                    res.vlans.forEach(function(v) {
                        var st = (v.status || '').toLowerCase();
                        var stColor = st === 'active' ? '#27ae60' : '#95a5a6';
                        var isDefault = v.id === 1;
                        html += '<tr' + (isDefault ? ' style="background:rgba(243,156,18,0.08);"' : '') + '>' +
                            '<td><strong>' + v.id + '</strong>' + (isDefault ? ' <span style="font-size:.7rem;color:#f39c12;">(default)</span>' : '') + '</td>' +
                            '<td>' + faEscape(v.name || '-') + '</td>' +
                            '<td><span style="color:' + stColor + ';">' + faEscape(v.status || '-') + '</span></td></tr>';
                    });
                    vtbody.innerHTML = html;
                }
            }

            // Trunk table
            if (ttbody) {
                if (!(res.trunks || []).length) {
                    ttbody.innerHTML = '<tr><td colspan="4"><em>Trunk port yok.</em></td></tr>';
                } else {
                    var html2 = '';
                    res.trunks.forEach(function(t) {
                        var nativeRisky = String(t.native_vlan || '1') === '1';
                        html2 += '<tr' + (nativeRisky ? ' style="background:rgba(231,76,60,0.08);"' : '') + '>' +
                            '<td><code>' + faEscape(t.port || '-') + '</code></td>' +
                            '<td>' + faEscape(t.mode || '-') + '</td>' +
                            '<td>' + faEscape(t.encapsulation || '-') + '</td>' +
                            '<td>' + faEscape(String(t.native_vlan || '-')) +
                            (nativeRisky ? ' <i class="fas fa-exclamation-triangle" style="color:#e74c3c;" title="VLAN hopping riski"></i>' : '') + '</td></tr>';
                    });
                    ttbody.innerHTML = html2;
                }
            }

            document.getElementById('fa-vlan-issues').innerHTML = faIssueList(res.issues || []);
        }).catch(function(e) {
            if (vtbody) vtbody.innerHTML = '<tr><td colspan="3">Baglanti hatasi</td></tr>';
        });
    }
    window.loadVlanAnalysis = loadVlanAnalysis;

    // ---------- Port Security (zengin: per-interface + violation + sticky + DHCP/DAI) ----------
    function loadPortSecurity() {
        var issuesBox = document.getElementById('fa-ps-issues');
        issuesBox.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        faApi('network_port_security').then(function(res) {
            if (!res.success) {
                issuesBox.innerHTML = '<div style="color:#e74c3c">Hata: ' + faEscape(res.error || '') + '</div>';
                return;
            }
            document.getElementById('fa-ps-access').textContent    = res.access_ports || 0;
            document.getElementById('fa-ps-configured').textContent = res.port_security_count || 0;
            var cov = res.coverage_pct || 0;
            var covColor = cov >= 90 ? '#27ae60' : cov >= 50 ? '#f39c12' : '#e74c3c';
            var covEl = document.getElementById('fa-ps-coverage');
            covEl.textContent = '%' + cov;
            covEl.style.color = covColor;
            document.getElementById('fa-ps-trunks').textContent = res.trunk_ports || 0;

            var dhcpEl = document.getElementById('fa-ps-dhcp');
            var daiEl = document.getElementById('fa-ps-dai');
            dhcpEl.innerHTML = res.dhcp_snooping
                ? '<span style="color:#27ae60"><i class="fas fa-check-circle"></i> Aktif (' + ((res.dhcp_snooping_vlans||[]).length) + ' VLAN)</span>'
                : '<span style="color:#e74c3c"><i class="fas fa-times-circle"></i> Pasif</span>';
            daiEl.innerHTML = res.dai
                ? '<span style="color:#27ae60"><i class="fas fa-check-circle"></i> Aktif</span>'
                : '<span style="color:#e74c3c"><i class="fas fa-times-circle"></i> Pasif</span>';

            // Detayli per-interface + violation mode dagilimi
            var detailHtml = '';
            var per = res.per_interface || [];
            if (per.length) {
                var vm = res.violation_modes || {};
                detailHtml += '<div class="fa-kpi" style="margin-bottom:10px;">';
                detailHtml += '<strong><i class="fas fa-shield-alt"></i> Violation Mode Dagilimi:</strong> ';
                Object.keys(vm).forEach(function(k) {
                    if (vm[k] > 0) {
                        var color = k === 'shutdown' ? '#27ae60' : k === 'restrict' ? '#3498db' : '#e67e22';
                        detailHtml += '<span style="margin:0 6px;"><span style="padding:2px 8px;background:' + color + '22;color:' + color + ';border-radius:3px;font-size:.78rem;">' + faEscape(k) + ': ' + vm[k] + '</span></span>';
                    }
                });
                detailHtml += '<br><strong style="margin-top:6px;display:inline-block;">Sticky MAC:</strong> ' + (res.sticky_count||0) + ' port';
                detailHtml += '</div>';

                // Per-interface tablo (ilk 50)
                detailHtml += '<details style="margin-bottom:10px;"><summary style="cursor:pointer;padding:8px;background:var(--card-bg);border-radius:4px;"><strong>Port-Security Detay (' + per.length + ' port)</strong></summary>';
                detailHtml += '<div class="fa-table-wrapper" style="margin-top:6px;">';
                detailHtml += '<table class="fa-table"><thead><tr><th>Interface</th><th>Mode</th><th>Max MAC</th><th>Sticky</th><th>Violation</th><th>Aging</th></tr></thead><tbody>';
                per.slice(0, 50).forEach(function(p) {
                    detailHtml += '<tr>' +
                        '<td><code>' + faEscape(p.interface) + '</code></td>' +
                        '<td>' + faEscape(p.mode||'-') + '</td>' +
                        '<td>' + (p.max_mac||1) + '</td>' +
                        '<td>' + (p.sticky ? '<i class="fas fa-check" style="color:#27ae60;"></i>' : '<i class="fas fa-times" style="color:#95a5a6;"></i>') + '</td>' +
                        '<td><code>' + faEscape(p.violation||'-') + '</code></td>' +
                        '<td>' + (p.aging_time ? (p.aging_time + ' min ' + (p.aging_type||'')) : '-') + '</td></tr>';
                });
                if (per.length > 50) {
                    detailHtml += '<tr><td colspan="6"><em>... +' + (per.length - 50) + ' port</em></td></tr>';
                }
                detailHtml += '</tbody></table></div></details>';
            }

            if ((res.config_evidence||[]).length) {
                detailHtml += '<details style="margin-bottom:10px;"><summary style="cursor:pointer;padding:8px;background:var(--card-bg);border-radius:4px;"><strong>Running-config kanitlari (' + res.config_evidence.length + ' satir)</strong></summary>';
                detailHtml += '<pre style="background:#2c3e50;color:#ecf0f1;padding:8px;border-radius:4px;margin:4px 0;font-size:.75rem;overflow-x:auto;white-space:pre-wrap;">';
                detailHtml += faEscape(res.config_evidence.join('\n'));
                detailHtml += '</pre></details>';
            }

            issuesBox.innerHTML = detailHtml + faIssueList(res.issues || []);
        }).catch(function(e) {
            issuesBox.innerHTML = '<div style="color:#e74c3c">Baglanti hatasi</div>';
        });
    }
    window.loadPortSecurity = loadPortSecurity;

    // ---------- STP Health (zengin: per-interface + evidence) ----------
    function loadStpHealth() {
        var issuesBox = document.getElementById('fa-stp-issues');
        issuesBox.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        faApi('network_stp').then(function(res) {
            if (!res.success) {
                issuesBox.innerHTML = '<div style="color:#e74c3c">Hata: ' + faEscape(res.error || '') + '</div>';
                return;
            }
            document.getElementById('fa-stp-score').textContent = res.score;
            document.getElementById('fa-stp-grade').textContent = res.grade || '-';

            // BPDU Guard — global + per-interface sayi
            var bpduEl = document.getElementById('fa-stp-bpdu');
            var bpduHtml;
            if (res.bpdu_global) {
                bpduHtml = '<span style="color:#27ae60"><i class="fas fa-check-circle"></i> Global</span>';
            } else if ((res.bpduguard_interfaces||[]).length) {
                bpduHtml = '<span style="color:#f39c12"><i class="fas fa-minus-circle"></i> ' + res.bpduguard_interfaces.length + ' port</span>';
            } else {
                bpduHtml = '<span style="color:#e74c3c"><i class="fas fa-times-circle"></i> Yok</span>';
            }
            bpduEl.innerHTML = bpduHtml;

            var rootEl = document.getElementById('fa-stp-root');
            rootEl.innerHTML = (res.rootguard_interfaces||[]).length
                ? '<span style="color:#27ae60"><i class="fas fa-check-circle"></i> ' + res.rootguard_interfaces.length + ' port</span>'
                : '<span style="color:#e74c3c"><i class="fas fa-times-circle"></i> Yok</span>';

            var loopEl = document.getElementById('fa-stp-loop');
            if (res.loop_global) {
                loopEl.innerHTML = '<span style="color:#27ae60"><i class="fas fa-check-circle"></i> Global</span>';
            } else if ((res.loopguard_interfaces||[]).length) {
                loopEl.innerHTML = '<span style="color:#f39c12"><i class="fas fa-minus-circle"></i> ' + res.loopguard_interfaces.length + ' port</span>';
            } else {
                loopEl.innerHTML = '<span style="color:#e74c3c"><i class="fas fa-times-circle"></i> Yok</span>';
            }

            // Per-interface panel (detay bolumu olarak)
            var detailHtml = '';
            detailHtml += '<div class="fa-kpi" style="margin-bottom:10px;">';
            detailHtml += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:.85rem;">';
            detailHtml += '<div><strong>BPDU Guard ports (' + (res.bpduguard_interfaces||[]).length + '):</strong><br>';
            detailHtml += (res.bpduguard_interfaces||[]).length
                ? '<code style="font-size:.75rem;">' + faEscape((res.bpduguard_interfaces||[]).slice(0, 30).join(', ')) + '</code>'
                : '<em>Yok</em>';
            detailHtml += '</div>';
            detailHtml += '<div><strong>Root Guard ports (' + (res.rootguard_interfaces||[]).length + '):</strong><br>';
            detailHtml += (res.rootguard_interfaces||[]).length
                ? '<code style="font-size:.75rem;">' + faEscape((res.rootguard_interfaces||[]).slice(0, 30).join(', ')) + '</code>'
                : '<em>Yok</em>';
            detailHtml += '</div>';
            detailHtml += '<div><strong>PortFast ports (' + (res.portfast_interfaces||[]).length + '):</strong><br>';
            detailHtml += (res.portfast_interfaces||[]).length
                ? '<code style="font-size:.75rem;">' + faEscape((res.portfast_interfaces||[]).slice(0, 30).join(', ')) + '</code>'
                : '<em>Yok</em>';
            detailHtml += '</div>';
            if ((res.portfast_unprotected||[]).length) {
                detailHtml += '<div><strong style="color:#e74c3c;"><i class="fas fa-exclamation-triangle"></i> PortFast + BPDU Guard YOK (' + res.portfast_unprotected.length + '):</strong><br>';
                detailHtml += '<code style="font-size:.75rem;color:#e74c3c;">' + faEscape(res.portfast_unprotected.slice(0, 30).join(', ')) + '</code></div>';
            }
            detailHtml += '</div></div>';

            // Config evidence
            if ((res.config_evidence||[]).length) {
                detailHtml += '<div class="fa-kpi" style="margin-bottom:10px;">';
                detailHtml += '<strong><i class="fas fa-file-code"></i> Running-config kanitlari:</strong>';
                detailHtml += '<pre style="background:#2c3e50;color:#ecf0f1;padding:8px;border-radius:4px;margin:4px 0;font-size:.75rem;overflow-x:auto;white-space:pre-wrap;">';
                detailHtml += faEscape(res.config_evidence.join('\n'));
                detailHtml += '</pre></div>';
            }

            issuesBox.innerHTML = detailHtml + faIssueList(res.issues || []);
        }).catch(function(e) {
            issuesBox.innerHTML = '<div style="color:#e74c3c">Baglanti hatasi</div>';
        });
    }
    window.loadStpHealth = loadStpHealth;

    // ---------- Hardening Findings (combined compliance + ACL) ----------
    var _hardeningCache = [];

    function loadHardeningFindings() {
        var tbody = document.getElementById('fa-hf-tbody');
        tbody.innerHTML = '<tr><td colspan="7"><i class="fas fa-spinner fa-spin"></i></td></tr>';

        var sev = document.getElementById('fa-hf-filter-severity').value;
        var cat = document.getElementById('fa-hf-filter-category').value;

        faApi('network_findings', { severity: sev, category: cat }).then(function(res) {
            if (!res.success) {
                tbody.innerHTML = '<tr><td colspan="7">Hata: ' + faEscape(res.error || '') + '</td></tr>';
                return;
            }
            var s = res.summary || {};
            document.getElementById('fa-hf-critical').textContent = s.CRITICAL || 0;
            document.getElementById('fa-hf-high').textContent     = s.HIGH || 0;
            document.getElementById('fa-hf-medium').textContent   = s.MEDIUM || 0;
            document.getElementById('fa-hf-low').textContent      = s.LOW || 0;

            _hardeningCache = res.findings || [];
            _renderHardeningFindings(_hardeningCache);
        }).catch(function(e) {
            tbody.innerHTML = '<tr><td colspan="7">Baglanti hatasi</td></tr>';
        });
    }

    function _renderHardeningFindings(list) {
        var tbody = document.getElementById('fa-hf-tbody');
        if (!list || !list.length) {
            tbody.innerHTML = '<tr><td colspan="7"><em>Bulgu yok — temiz.</em></td></tr>';
            return;
        }
        // Text search filter
        var q = (document.getElementById('fa-hf-search') || {}).value || '';
        q = q.trim().toLowerCase();
        if (q) {
            list = list.filter(function(f) {
                return (f.title || '').toLowerCase().includes(q) ||
                       (f.rule_id || '').toLowerCase().includes(q) ||
                       (f.recommendation || '').toLowerCase().includes(q) ||
                       (f.category || '').toLowerCase().includes(q);
            });
        }
        if (!list.length) {
            tbody.innerHTML = '<tr><td colspan="7"><em>Arama sonucu bos.</em></td></tr>';
            return;
        }
        // Framework color map
        var fwColor = {
            'CIS_Cisco_IOS_XE': '#3498db',
            'PCI_DSS_4.0':      '#e67e22',
            'ISO_27001_2022':   '#27ae60',
            'NIST_800-53':      '#9b59b6',
            'GDPR':             '#16a085',
            'ACL':              '#c0392b',
            'CIS':              '#3498db',
        };
        var html = '';
        list.forEach(function(f) {
            var color = faSevColor(f.severity);
            var fwBadge = faBadge(f.framework || 'CIS', fwColor[f.framework] || '#7f8c8d');
            var stateBadge = '';
            if (f.ack_state) {
                var ackColors = { accepted: '#8e44ad', fp: '#7f8c8d', fixing: '#16a085', known: '#2980b9' };
                stateBadge = faBadge(f.ack_state, ackColors[f.ack_state] || '#95a5a6');
            }
            // Detay: recommendation + kisa details preview
            var detail = faEscape(f.recommendation || '');
            if (f.details && typeof f.details === 'object') {
                var preview = '';
                if (f.details.reason) preview = f.details.reason;
                else if (f.details.message) preview = f.details.message;
                else if (f.details.raw) preview = f.details.raw;
                else if (typeof f.details === 'string') preview = f.details;
                if (preview && preview.length > 0) {
                    detail = '<div style="color:var(--text-muted);font-size:.78rem;margin-bottom:4px;">' +
                             faEscape(String(preview).substring(0, 160)) + '</div>' + detail;
                }
            }
            html += '<tr>' + faBulkCheckboxCell(f.finding_type || 'compliance', f.rule_id) +
                '<td>' + fwBadge + '</td>' +
                '<td>' + (f.rule_id ?
                    '<a class="fa-rule-link" onclick="event.stopPropagation();fireAuditOpenRule(\'' + faEscape(f.rule_id) + '\')" title="Rule detay aç">' + faEscape(f.rule_id) + '</a>'
                    : '-') + '</td>' +
                '<td><strong title="' + faEscape(f.title || '') + '">' + faEscape(f.title || '-') + '</strong></td>' +
                '<td class="fa-cell-small" style="max-width:150px;">' + faEscape(f.category || '-') + '</td>' +
                '<td>' + faBadge(f.severity || 'LOW', color) + '</td>' +
                '<td class="fa-cell-small" style="max-width:280px;">' + detail + '</td>' +
                '<td>' + (stateBadge || faAckButton(f.finding_type, f.rule_id, f.ack_state, f.severity)) + '</td>' +
                '</tr>';
        });
        tbody.innerHTML = html;
    }

    // Hardening findings icin select-all (karma tip: compliance + any/shadow/risk)
    window.fireAuditBulkSelectAllHardening = function(on) {
        var cbs = document.querySelectorAll('#fa-hf-tbody input.fa-bulk-cb');
        for (var i = 0; i < cbs.length; i++) {
            cbs[i].checked = !!on;
            var t = cbs[i].getAttribute('data-bulk-type');
            var rid = cbs[i].getAttribute('data-rule-id');
            if (!t || !rid) continue;
            if (!faBulkSel[t]) faBulkSel[t] = {};
            if (on) faBulkSel[t][rid] = true;
            else delete faBulkSel[t][rid];
        }
        fireAuditBulkBarRender();
    };

    // Search input — client-side filter (instant)
    document.addEventListener('input', function(ev) {
        if (ev.target && ev.target.id === 'fa-hf-search') {
            _renderHardeningFindings(_hardeningCache);
        }
    });

    window.loadHardeningFindings = loadHardeningFindings;

    // ============================================================
    // Management Plane (SSH, SNMP, HTTP, Telnet, CDP)
    // ============================================================
    function _boolPill(v, trueLabel, falseLabel, trueColor, falseColor) {
        trueLabel  = trueLabel  || 'Aktif';
        falseLabel = falseLabel || 'Pasif';
        trueColor  = trueColor  || '#27ae60';
        falseColor = falseColor || '#e74c3c';
        return v
            ? '<span style="color:' + trueColor + '"><i class="fas fa-check-circle"></i> ' + trueLabel + '</span>'
            : '<span style="color:' + falseColor + '"><i class="fas fa-times-circle"></i> ' + falseLabel + '</span>';
    }

    function loadManagementPlane() {
        var issuesBox = document.getElementById('fa-mgmt-issues');
        issuesBox.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        faApi('network_management').then(function(res) {
            if (!res.success) {
                issuesBox.innerHTML = '<div style="color:#e74c3c">Hata: ' + faEscape(res.error || '') + '</div>';
                return;
            }
            var ssh = res.ssh || {};
            document.getElementById('fa-mgmt-ssh-ver').innerHTML = ssh.version === 2
                ? '<span style="color:#27ae60">v2</span>'
                : '<span style="color:#e74c3c">v' + (ssh.version || '?') + '</span>';
            document.getElementById('fa-mgmt-ssh-to').textContent = (ssh.timeout || '-') + 's';
            document.getElementById('fa-mgmt-telnet').innerHTML = _boolPill(res.telnet_enabled, 'Acik (Risk)', 'Kapali', '#e74c3c', '#27ae60');
            document.getElementById('fa-mgmt-http').innerHTML = _boolPill(res.http_server, 'Acik', 'Kapali', '#e67e22', '#27ae60');

            // SSH Algorithm Analysis — renkli badge'ler + industry best-practice karsilastirma
            function _renderAlgoGroup(label, analysis, recommended) {
                if (!analysis || !analysis.length) return '';
                var h = '<div style="margin-bottom:14px;">';
                h += '<div style="font-weight:600;margin-bottom:6px;">' + label + ' <span style="font-size:.75rem;color:var(--text-muted);font-weight:400;">(' + analysis.length + ' configured)</span></div>';
                h += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px;">';
                analysis.forEach(function(a) {
                    var icon = a.status === 'strong' ? 'fa-check' : a.status === 'weak' ? 'fa-times' : 'fa-question';
                    h += '<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:4px;background:' + a.color + '22;color:' + a.color + ';border:1px solid ' + a.color + ';font-size:.78rem;font-family:monospace;">';
                    h += '<i class="fas ' + icon + '"></i> ' + faEscape(a.name) + '</span>';
                });
                h += '</div>';
                if (recommended && recommended.length) {
                    h += '<details style="font-size:.75rem;"><summary style="cursor:pointer;color:var(--text-muted);"><i class="fas fa-lightbulb"></i> Onerilen (NIST/CIS)</summary>';
                    h += '<div style="margin-top:4px;display:flex;flex-wrap:wrap;gap:4px;">';
                    recommended.forEach(function(r) {
                        h += '<code style="background:rgba(39,174,96,0.1);padding:2px 6px;border-radius:3px;">' + faEscape(r) + '</code>';
                    });
                    h += '</div></details>';
                }
                h += '</div>';
                return h;
            }

            var algoHtml = '';
            algoHtml += _renderAlgoGroup('<i class="fas fa-key"></i> Ciphers (sifrelemeler)',
                res.ssh_cipher_analysis || [], res.ssh_recommended_ciphers || []);
            algoHtml += _renderAlgoGroup('<i class="fas fa-fingerprint"></i> MAC Algoritmalar',
                res.ssh_mac_analysis || [], res.ssh_recommended_macs || []);
            algoHtml += _renderAlgoGroup('<i class="fas fa-handshake"></i> Key Exchange (KEX)',
                res.ssh_kex_analysis || [], res.ssh_recommended_kex || []);
            if (ssh.min_dh_bits) {
                var dhColor = ssh.min_dh_bits >= 2048 ? '#27ae60' : '#e74c3c';
                algoHtml += '<div style="font-size:.85rem;"><strong>Min DH bits:</strong> <span style="color:' + dhColor + ';font-weight:600;">' + ssh.min_dh_bits + '</span> ' + (ssh.min_dh_bits < 2048 ? '<em style="color:#e74c3c;">(≥2048 olmali)</em>' : '<em style="color:#27ae60;">(OK)</em>') + '</div>';
            }
            if (!algoHtml) algoHtml = '<em>SSH algoritma detayi cikti\'da bulunamadi (cihaz hesabinin <code>show ip ssh</code> yetkisi yeterli olmayabilir)</em>';
            document.getElementById('fa-mgmt-ssh-algos').innerHTML = algoHtml;

            // SNMP (zengin)
            var snmp = res.snmp || {};
            var snmpDet = res.snmp_detail || {};
            var snmpHtml = '';
            snmpHtml += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin-bottom:10px;">';
            snmpHtml += '<div><strong>SNMPv3 only:</strong> ' + _boolPill(snmp.v3_only) + '</div>';
            snmpHtml += '<div><strong>Default community (public/private):</strong> ' + _boolPill(!snmp.default_communities, 'Yok (OK)', 'VAR — Kritik Risk', '#27ae60', '#c0392b') + '</div>';
            snmpHtml += '</div>';

            var coms = snmpDet.communities || snmp.communities || [];
            if (coms.length) {
                snmpHtml += '<div><strong>Communities detay:</strong></div>';
                snmpHtml += '<table class="fa-table" style="margin-top:4px;"><thead><tr><th>Community</th><th>Access</th><th>ACL</th><th>Risk</th></tr></thead><tbody>';
                coms.forEach(function(c) {
                    var risk = '';
                    if (c.is_default) risk = faBadge('Default!', '#c0392b');
                    else if (!c.acl) risk = faBadge('ACL yok', '#e67e22');
                    else risk = faBadge('OK', '#27ae60');
                    snmpHtml += '<tr><td><code>' + faEscape(c.name) + '</code></td>' +
                        '<td><code>' + faEscape(c.access||'?') + '</code></td>' +
                        '<td>' + (c.acl ? '<code>' + faEscape(c.acl) + '</code>' : '<em>Yok</em>') + '</td>' +
                        '<td>' + risk + '</td></tr>';
                });
                snmpHtml += '</tbody></table>';
            }

            var v3users = snmpDet.v3_users || [];
            if (v3users.length) {
                snmpHtml += '<div style="margin-top:8px;"><strong>SNMPv3 Kullanicilari:</strong></div>';
                snmpHtml += '<table class="fa-table"><thead><tr><th>User</th><th>Group</th><th>Auth</th><th>Priv</th></tr></thead><tbody>';
                v3users.forEach(function(u) {
                    snmpHtml += '<tr><td><strong>' + faEscape(u.username) + '</strong></td>' +
                        '<td>' + faEscape(u.group||'-') + '</td>' +
                        '<td>' + faEscape(u.auth_algo||'-') + '</td>' +
                        '<td>' + faEscape(u.priv_algo||'-') + '</td></tr>';
                });
                snmpHtml += '</tbody></table>';
            }

            var traps = snmpDet.trap_hosts || [];
            if (traps.length) {
                snmpHtml += '<div style="margin-top:8px;"><strong>Trap Hosts:</strong> ';
                snmpHtml += traps.map(function(t) { return '<code>' + faEscape(t.host) + ' (' + faEscape(t.version) + ')</code>'; }).join(', ');
                snmpHtml += '</div>';
            }

            document.getElementById('fa-mgmt-snmp').innerHTML = snmpHtml;

            issuesBox.innerHTML = faIssueList(res.issues || []);
        });
    }
    window.loadManagementPlane = loadManagementPlane;

    // ============================================================
    // AAA & Users
    // ============================================================
    function loadAaaUsers() {
        var issuesBox = document.getElementById('fa-aaa-issues');
        var utbody = document.getElementById('fa-aaa-users-tbody');
        issuesBox.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        utbody.innerHTML = '<tr><td colspan="5"><i class="fas fa-spinner fa-spin"></i></td></tr>';

        faApi('network_aaa_users').then(function(res) {
            if (!res.success) {
                issuesBox.innerHTML = '<div style="color:#e74c3c">Hata: ' + faEscape(res.error || '') + '</div>';
                return;
            }
            document.getElementById('fa-aaa-enabled').innerHTML = _boolPill((res.aaa||{}).enabled);
            var sc = (res.tacacs_servers||[]).length + (res.radius_servers||[]).length;
            document.getElementById('fa-aaa-servers').textContent = sc;
            document.getElementById('fa-aaa-user-count').textContent = res.user_count || 0;
            document.getElementById('fa-aaa-priv15').textContent = res.privilege_15_count || 0;

            // Users
            var users = res.local_users || [];
            if (!users.length) {
                utbody.innerHTML = '<tr><td colspan="5"><em>Local user yok (iyi — tum auth merkezi AAA\'dan gelsin)</em></td></tr>';
            } else {
                var html = '';
                users.forEach(function(u) {
                    var riskPills = [];
                    if (u.privilege === 15) riskPills.push(faBadge('PRIV-15', '#e67e22'));
                    if (u.encryption_level === '0') riskPills.push(faBadge('PLAIN!', '#c0392b'));
                    if (u.encryption_level === '7') riskPills.push(faBadge('TYPE-7 (reversible)', '#e67e22'));
                    if (u.encryption_level === '5') riskPills.push(faBadge('MD5 (weak)', '#f39c12'));
                    if (u.encryption_level === '8') riskPills.push(faBadge('SHA-256', '#27ae60'));
                    if (u.encryption_level === '9') riskPills.push(faBadge('SCRYPT', '#27ae60'));
                    html += '<tr>' +
                        '<td><strong>' + faEscape(u.name) + '</strong></td>' +
                        '<td>' + u.privilege + '</td>' +
                        '<td>' + faEscape(u.password_type||'-') + '</td>' +
                        '<td><code>type ' + faEscape(u.encryption_level||'?') + '</code></td>' +
                        '<td>' + (riskPills.length ? riskPills.join(' ') : '<em>OK</em>') + '</td></tr>';
                });
                utbody.innerHTML = html;
            }

            // PW Policy
            var pw = res.password_policy || {};
            var pwHtml = '';
            pwHtml += '<div><strong>Enable secret:</strong> ' + _boolPill(pw.enable_secret) + '</div>';
            pwHtml += '<div><strong>service password-encryption:</strong> ' + _boolPill(res.password_encryption_service) + '</div>';
            pwHtml += '<div><strong>Min password length:</strong> ' + (pw.min_length || 'tanimsiz') + '</div>';
            pwHtml += '<div><strong>login block-for:</strong> ' + ((pw.login_block_for||0) ? (pw.login_block_for + ' sec, ' + pw.login_attempts + ' deneme sonrasi') : 'Tanimsiz') + '</div>';
            document.getElementById('fa-aaa-pwpolicy').innerHTML = pwHtml;

            issuesBox.innerHTML = faIssueList(res.issues || []);
        });
    }
    window.loadAaaUsers = loadAaaUsers;

    // ============================================================
    // Logging & NTP
    // ============================================================
    function loadLoggingNtp() {
        var issuesBox = document.getElementById('fa-log-issues');
        issuesBox.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        faApi('network_logging').then(function(res) {
            if (!res.success) {
                issuesBox.innerHTML = '<div style="color:#e74c3c">Hata: ' + faEscape(res.error || '') + '</div>';
                return;
            }
            document.getElementById('fa-log-syslog-count').textContent = (res.syslog_servers||[]).length;
            document.getElementById('fa-log-ts').innerHTML = _boolPill(res.logging_timestamps);
            document.getElementById('fa-log-ntp-count').textContent = (res.ntp_servers||[]).length;
            document.getElementById('fa-log-ntp-auth').innerHTML = _boolPill(res.ntp_authenticated);

            var html = '';
            html += '<div class="fa-kpi" style="margin-bottom:8px;"><strong>Syslog Sunuculari:</strong> ';
            if ((res.syslog_servers||[]).length) {
                html += (res.syslog_servers||[]).map(function(s){ return '<code>' + faEscape(String(s)) + '</code>'; }).join(', ');
            } else html += '<em style="color:#e67e22;">Yok</em>';
            html += '</div>';
            html += '<div class="fa-kpi" style="margin-bottom:8px;"><strong>NTP Sunuculari:</strong> ';
            if ((res.ntp_servers||[]).length) {
                html += (res.ntp_servers||[]).map(function(s){ return '<code>' + faEscape(String(s)) + '</code>'; }).join(', ');
            } else html += '<em style="color:#e67e22;">Yok</em>';
            html += '</div>';
            html += '<div class="fa-kpi"><strong>Banner:</strong> login=' + _boolPill(res.banner_login, 'var', 'yok') + ', MOTD=' + _boolPill(res.banner_motd, 'var', 'yok') + '</div>';
            document.getElementById('fa-log-details').innerHTML = html;

            issuesBox.innerHTML = faIssueList(res.issues || []);
        });
    }
    window.loadLoggingNtp = loadLoggingNtp;

    // ============================================================
    // Routing Security
    // ============================================================
    function loadRoutingSec() {
        var issuesBox = document.getElementById('fa-rt-issues');
        issuesBox.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        faApi('network_routing_sec').then(function(res) {
            if (!res.success) {
                issuesBox.innerHTML = '<div style="color:#e74c3c">Hata: ' + faEscape(res.error || '') + '</div>';
                return;
            }
            document.getElementById('fa-rt-ospf').innerHTML = _boolPill(res.ospf_auth, 'MD5 Aktif', 'Yok');
            document.getElementById('fa-rt-bgp').innerHTML = _boolPill(res.bgp_auth, 'Var', 'Yok');
            document.getElementById('fa-rt-eigrp').innerHTML = _boolPill(res.eigrp_auth, 'Aktif', 'Yok');
            document.getElementById('fa-rt-urpf').innerHTML = _boolPill(res.urpf, 'Aktif', 'Yok');

            issuesBox.innerHTML = faIssueList(res.issues || []);
        });
    }
    window.loadRoutingSec = loadRoutingSec;

    // ============================================================
    // BGP / EIGRP / MPLS / GRE / EEM / Prefix-List — her biri kendi
    // sayfasinda, tam detayli. Hepsi tek bir backend cagrisini (SQLite'tan
    // okuyan, ucuz) paylasir; ayri ayri render edilir.
    // ============================================================
    function _emptyState(msg) {
        return '<div style="color:var(--text-muted);padding:30px;text-align:center;">' + faEscape(msg) + '</div>';
    }

    function loadBgpDetail() {
        var box = document.getElementById('fa-bgp-content');
        if (!box) return;
        box.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        faApi('network_routing_sec').then(function(res) {
            if (!res.success) { box.innerHTML = '<div style="color:#e74c3c">Hata: ' + faEscape(res.error || '') + '</div>'; return; }
            document.getElementById('fa-bgp-as').textContent = res.bgp ? (res.bgp.local_as || '-') : '-';
            document.getElementById('fa-bgp-rid').textContent = res.bgp ? (res.bgp.router_id || '-') : '-';
            document.getElementById('fa-bgp-count').textContent = res.bgp ? res.bgp.neighbor_count : 0;
            if (!res.bgp || !res.bgp.neighbor_count) {
                box.innerHTML = _emptyState('Bu cihazda BGP yapilandirmasi bulunamadi.');
                return;
            }
            box.innerHTML = '<table class="fa-table"><thead><tr><th>Neighbor</th><th>Remote AS</th><th>Oturum Durumu</th>' +
                '<th>Up/Down</th><th>Aciklama</th><th>Password (MD5)</th></tr></thead><tbody>' +
                res.bgp.neighbors.map(function(n) {
                    var stateCell = n.session_state
                        ? (n.session_up
                            ? '<span style="color:#27ae60;font-weight:600;"><i class="fas fa-check-circle"></i> ' + faEscape(n.session_state) + '</span>'
                            : '<span style="color:#c0392b;font-weight:600;"><i class="fas fa-times-circle"></i> ' + faEscape(n.session_state) + '</span>')
                        : '<span style="color:var(--text-muted);">bilinmiyor (yalniz config)</span>';
                    return '<tr><td><code>' + faEscape(n.neighbor) + '</code></td><td>' + faEscape(n.remote_as) + '</td>' +
                        '<td>' + stateCell + '</td><td>' + faEscape(n.up_down || '-') + '</td>' +
                        '<td>' + faEscape(n.description || '-') + '</td><td>' + _boolPill(n.has_password, 'Var', 'Yok') + '</td></tr>';
                }).join('') + '</tbody></table>';
        });
    }
    window.loadBgpDetail = loadBgpDetail;

    function loadEigrpDetail() {
        var box = document.getElementById('fa-eigrp-content');
        if (!box) return;
        box.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        faApi('network_routing_sec').then(function(res) {
            if (!res.success) { box.innerHTML = '<div style="color:#e74c3c">Hata: ' + faEscape(res.error || '') + '</div>'; return; }
            var eigrp = res.eigrp || {};
            var procs = eigrp.processes || [];
            var nbrs = eigrp.live_neighbors || [];
            document.getElementById('fa-eigrp-proc-count').textContent = procs.length;
            document.getElementById('fa-eigrp-nbr-count').textContent = nbrs.length;
            if (!procs.length && !nbrs.length) {
                box.innerHTML = _emptyState('Bu cihazda EIGRP yapilandirmasi bulunamadi.');
                return;
            }
            var html = '';
            if (procs.length) {
                html += '<h4 style="margin:0 0 6px;">Process / Network Yapilandirmasi</h4><table class="fa-table" style="margin-bottom:16px;">' +
                    '<thead><tr><th>AS/Tag</th><th>Network Sayisi</th><th>Authentication</th></tr></thead><tbody>' +
                    procs.map(function(p) {
                        return '<tr><td>' + faEscape(p.tag_or_asn) + '</td><td>' + p.networks.length + '</td>' +
                            '<td>' + _boolPill(p.auth_enabled, 'Var', 'Yok') + '</td></tr>';
                    }).join('') + '</tbody></table>';
            }
            if (nbrs.length) {
                html += '<h4 style="margin:0 0 6px;">Canli Komsu Oturumlari</h4><table class="fa-table">' +
                    '<thead><tr><th>Komsu IP</th><th>AS</th><th>Interface</th><th>Uptime</th><th>Hold Timer</th></tr></thead><tbody>' +
                    nbrs.map(function(n) {
                        return '<tr><td><code>' + faEscape(n.ip) + '</code></td><td>' + faEscape(n.as) + '</td>' +
                            '<td>' + faEscape(n.interface) + '</td><td>' + faEscape(n.uptime) + '</td><td>' + faEscape(n.hold) + '</td></tr>';
                    }).join('') + '</tbody></table>';
            }
            box.innerHTML = html;
        });
    }
    window.loadEigrpDetail = loadEigrpDetail;

    function loadGreDetail() {
        var box = document.getElementById('fa-gre-content');
        if (!box) return;
        box.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        faApi('network_routing_sec').then(function(res) {
            if (!res.success) { box.innerHTML = '<div style="color:#e74c3c">Hata: ' + faEscape(res.error || '') + '</div>'; return; }
            var tunnels = res.gre_tunnels || [];
            document.getElementById('fa-gre-count').textContent = tunnels.length;
            if (!tunnels.length) { box.innerHTML = _emptyState('Bu cihazda GRE tunel bulunamadi.'); return; }
            box.innerHTML = '<table class="fa-table"><thead><tr><th>Isim</th><th>Source</th><th>Destination</th>' +
                '<th>Tunel Ic IP</th><th>IPsec Korumali</th></tr></thead><tbody>' +
                tunnels.map(function(t) {
                    return '<tr><td><code>' + faEscape(t.name) + '</code></td><td><code>' + faEscape(t.source || '-') + '</code></td>' +
                        '<td><code>' + faEscape(t.destination || '-') + '</code></td><td><code>' + faEscape(t.ip_address || '-') + '</code></td>' +
                        '<td>' + _boolPill(t.protected, 'Evet', 'Hayir') + '</td></tr>';
                }).join('') + '</tbody></table>';
        });
    }
    window.loadGreDetail = loadGreDetail;

    function loadEemDetail() {
        var box = document.getElementById('fa-eem-content');
        if (!box) return;
        box.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        faApi('network_routing_sec').then(function(res) {
            if (!res.success) { box.innerHTML = '<div style="color:#e74c3c">Hata: ' + faEscape(res.error || '') + '</div>'; return; }
            var applets = res.eem_applets || [];
            document.getElementById('fa-eem-count').textContent = applets.length;
            if (!applets.length) { box.innerHTML = _emptyState('Bu cihazda EEM event applet bulunamadi.'); return; }
            box.innerHTML = applets.map(function(a) {
                return '<div class="fa-kpi" style="border-color:#c0392b;margin-bottom:10px;">' +
                    '<strong style="color:#c0392b;"><i class="fas fa-exclamation-triangle"></i> ' + faEscape(a.name) + '</strong>' +
                    '<div style="margin-top:6px;font-size:.85rem;"><strong>Event (tetikleyici):</strong> <code>' + faEscape(a.event || '-') + '</code>' +
                    (a.track_detail ? ' <span style="color:#7f8c8d;">— izlenen: <code>' + faEscape(a.track_detail) + '</code></span>' : '') + '</div>' +
                    '<div style="margin-top:6px;font-size:.85rem;"><strong>Aksiyonlar (' + a.action_count + '):</strong>' +
                    '<ol style="margin:4px 0 0 20px;">' + (a.actions_sample || []).map(function(act) {
                        return '<li><code>' + faEscape(act) + '</code></li>';
                    }).join('') + '</ol></div></div>';
            }).join('');
        });
    }
    window.loadEemDetail = loadEemDetail;

    function loadPrefixListDetail() {
        var box = document.getElementById('fa-pfx-content');
        if (!box) return;
        box.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        faApi('network_routing_sec').then(function(res) {
            if (!res.success) { box.innerHTML = '<div style="color:#e74c3c">Hata: ' + faEscape(res.error || '') + '</div>'; return; }
            var lists = res.prefix_lists || [];
            document.getElementById('fa-pfx-count').textContent = lists.length;
            if (!lists.length) { box.innerHTML = _emptyState('Bu cihazda prefix-list bulunamadi.'); return; }
            box.innerHTML = lists.map(function(pl) {
                return '<h4 style="margin:14px 0 6px;"><code>' + faEscape(pl.name) + '</code></h4>' +
                    '<table class="fa-table"><thead><tr><th>Seq</th><th>Action</th><th>Network</th><th>Le</th><th>Ge</th></tr></thead><tbody>' +
                    pl.entries.map(function(e) {
                        return '<tr><td>' + faEscape(e.seq) + '</td><td>' + faEscape(e.action) + '</td>' +
                            '<td><code>' + faEscape(e.network) + '/' + faEscape(e.netmask) + '</code></td>' +
                            '<td>' + faEscape(e.le || '-') + '</td><td>' + faEscape(e.ge || '-') + '</td></tr>';
                    }).join('') + '</tbody></table>';
            }).join('');
        });
    }
    window.loadPrefixListDetail = loadPrefixListDetail;

    // ============================================================
    // Interface Audit
    // ============================================================
    function loadIfaceAudit() {
        var issuesBox = document.getElementById('fa-ia-issues');
        var detailsBox = document.getElementById('fa-ia-details');
        issuesBox.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        detailsBox.innerHTML = '';
        faApi('network_iface_audit').then(function(res) {
            if (!res.success) {
                issuesBox.innerHTML = '<div style="color:#e74c3c">Hata: ' + faEscape(res.error || '') + '</div>';
                return;
            }
            document.getElementById('fa-ia-total').textContent = res.total_physical_ifaces || 0;
            document.getElementById('fa-ia-shut').textContent = res.shutdown_count || 0;
            document.getElementById('fa-ia-nodesc').textContent = res.description_missing_count || 0;
            document.getElementById('fa-ia-noportsec').textContent = res.access_ports_no_portsec_count || 0;

            var html = '';
            if ((res.possibly_unused||[]).length) {
                html += '<div class="fa-kpi" style="margin-bottom:8px;"><strong><i class="fas fa-ghost" style="color:#e67e22;"></i> Potansiyel kullanilmayan portlar (' + res.possibly_unused.length + '):</strong><br><code style="font-size:.75rem;">' + faEscape(res.possibly_unused.join(', ')) + '</code></div>';
            }
            if ((res.access_ports_no_portsec||[]).length) {
                html += '<div class="fa-kpi" style="margin-bottom:8px;"><strong><i class="fas fa-unlock" style="color:#c0392b;"></i> Port-security eksik access port (' + res.access_ports_no_portsec.length + '):</strong><br><code style="font-size:.75rem;">' + faEscape(res.access_ports_no_portsec.slice(0, 50).join(', ')) + '</code></div>';
            }
            if ((res.description_missing||[]).length) {
                html += '<div class="fa-kpi"><strong><i class="fas fa-tags"></i> Description eksik (' + res.description_missing.length + '):</strong><br><code style="font-size:.75rem;">' + faEscape(res.description_missing.slice(0, 50).join(', ')) + '</code></div>';
            }
            detailsBox.innerHTML = html;

            issuesBox.innerHTML = faIssueList(res.issues || []);
        });
    }
    window.loadIfaceAudit = loadIfaceAudit;

    // ============================================================
    // Config & Version
    // ============================================================
    function loadConfigBackup() {
        var issuesBox = document.getElementById('fa-cb-issues');
        var detailsBox = document.getElementById('fa-cb-details');
        issuesBox.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        faApi('network_config_backup').then(function(res) {
            if (!res.success) {
                issuesBox.innerHTML = '<div style="color:#e74c3c">Hata: ' + faEscape(res.error || '') + '</div>';
                return;
            }
            document.getElementById('fa-cb-sync').innerHTML = (res.config_in_sync === null)
                ? '<span style="background:#ecf0f1;color:#7f8c8d;padding:2px 8px;border-radius:3px;font-size:.78rem;" title="Bu cihaz/OS icin running-vs-startup karsilastirmasi desteklenmiyor (orn. Dell PowerConnect/OS6)">Desteklenmiyor</span>'
                : _boolPill(res.config_in_sync, 'Sync', 'Sync Yok!', '#27ae60', '#c0392b');
            document.getElementById('fa-cb-diff').textContent = res.config_diff_lines || 0;
            document.getElementById('fa-cb-version').textContent = res.version || '-';
            document.getElementById('fa-cb-uptime').textContent = res.uptime || '-';

            var html = '';
            html += '<div class="fa-kpi" style="margin-bottom:8px;"><strong>Vendor:</strong> ' + faEscape(res.vendor||'-') + ' | <strong>Model:</strong> ' + faEscape(res.model||'-') + ' | <strong>Hostname:</strong> ' + faEscape(res.hostname||'-') + '</div>';
            if (res.last_save) {
                html += '<div class="fa-kpi"><strong>Son config change:</strong> ' + faEscape(res.last_save) + '</div>';
            }
            var arc = res.archive || {};
            html += '<div class="fa-kpi" style="margin-top:8px;"><strong><i class="fas fa-archive"></i> Config Archive:</strong> ' +
                _boolPill(arc.enabled, 'Aktif', 'Yok');
            if (arc.enabled) {
                html += ' — path: <code>' + faEscape(arc.path || '-') + '</code>' +
                    (arc.maximum ? ', maximum: ' + arc.maximum : '') +
                    ', log config: ' + _boolPill(arc.log_config_enabled, 'Acik', 'Kapali');
            }
            html += '</div>';
            detailsBox.innerHTML = html;

            issuesBox.innerHTML = faIssueList(res.issues || []);
        });
    }
    window.loadConfigBackup = loadConfigBackup;

    // ============================================================
    // Device Diagnostic Log — cihazla olan etkilesim kaydi
    // ============================================================
    // ---------- Device Log auto-refresh (sayfa goruntudeyse her 60s yenile) ----------
    var _deviceLogTimer = null;
    function _deviceLogTabVisible() {
        var tab = document.getElementById('fa-tab-device_log');
        return tab && tab.classList.contains('active') && !document.hidden;
    }
    function _startDeviceLogAutoRefresh() {
        _stopDeviceLogAutoRefresh();
        _deviceLogTimer = setInterval(function() {
            if (_deviceLogTabVisible()) {
                loadDeviceLog();
            } else {
                _stopDeviceLogAutoRefresh();
            }
        }, 60000);
    }
    function _stopDeviceLogAutoRefresh() {
        if (_deviceLogTimer) { clearInterval(_deviceLogTimer); _deviceLogTimer = null; }
    }

    // Goreceli zaman: '2 dakika once', '3 saat once', '5 gun once' vb.
    function faRelativeTime(isoStr) {
        if (!isoStr) return '-';
        var t = new Date(String(isoStr).replace(' ', 'T') + (String(isoStr).endsWith('Z') ? '' : '')).getTime();
        if (isNaN(t)) return '-';
        var diff = Math.floor((Date.now() - t) / 1000);
        if (diff < 0) return 'gelecekte';
        if (diff < 60) return diff + ' sn once';
        if (diff < 3600) return Math.floor(diff/60) + ' dk once';
        if (diff < 86400) return Math.floor(diff/3600) + ' saat once';
        if (diff < 86400*30) return Math.floor(diff/86400) + ' gun once';
        if (diff < 86400*365) return Math.floor(diff/86400/30) + ' ay once';
        return Math.floor(diff/86400/365) + ' yil once';
    }

    function loadDeviceLog() {
        var tbody = document.getElementById('fa-dl-tbody');
        var sumBox = document.getElementById('fa-dl-summary');
        tbody.innerHTML = '<tr><td colspan="5"><i class="fas fa-spinner fa-spin"></i></td></tr>';
        var sev = document.getElementById('fa-dl-filter-sev').value;

        faApi('network_device_log', { severity: sev, limit: 300 }).then(function(res) {
            if (!res.success) {
                tbody.innerHTML = '<tr><td colspan="5">Hata: ' + faEscape(res.error || '') + '</td></tr>';
                return;
            }
            var entries = res.entries || [];
            var summary = res.summary || [];

            // ---------- Resolved-detection (last_successful_sync ile) ----------
            // Backend `last_successful_sync` field'ini doner: en son `sync_ok` event'inin zamani.
            // Bu zamandan ONCEKI tum error/warning'ler "cozulmus" sayilir
            // (sonradan basarili bir sync olmus demektir).
            var lastOkRawForResolve = res.last_successful_sync || '';
            var lastOkTForResolve = lastOkRawForResolve
                ? new Date(String(lastOkRawForResolve).replace(' ', 'T')).getTime()
                : NaN;
            var resolvedMap = {};
            entries.forEach(function(e) {
                var s = (e.severity||'').toLowerCase();
                if (s !== 'error' && s !== 'warning') return;
                var t = new Date(String(e.logged_at||'').replace(' ', 'T')).getTime();
                if (!isNaN(t) && !isNaN(lastOkTForResolve) && t < lastOkTForResolve) {
                    resolvedMap[(e.logged_at||'') + '|' + (e.event||'')] = {
                        at: lastOkRawForResolve, by_event: 'sync_ok'
                    };
                }
            });

            // ---------- Gercek zamanli durum hesabi (entries listesinden) ----------
            var now = Date.now();
            var ts24 = now - 24*3600*1000;
            var ts7d = now - 7*86400*1000;
            var c24 = {info:0, warning:0, error:0};
            var c24unresolved = {warning:0, error:0};
            var cAll = {info:0, warning:0, error:0};
            var lastError = null;
            var lastSync = null;
            entries.forEach(function(e) {
                var t = new Date(String(e.logged_at||'').replace(' ', 'T')).getTime();
                if (isNaN(t)) return;
                var s = (e.severity||'').toLowerCase();
                if (cAll[s] !== undefined) cAll[s]++;
                if (t >= ts24 && c24[s] !== undefined) c24[s]++;
                if (t >= ts24 && (s === 'error' || s === 'warning')) {
                    var key = (e.logged_at||'') + '|' + (e.event||'');
                    if (!resolvedMap[key]) c24unresolved[s]++;
                }
                if (s === 'error' && (!lastError || t > lastError.t)) lastError = {t:t, e:e};
                if (s === 'info' && /sync|success|complete/i.test(e.event||'') && (!lastSync || t > lastSync.t)) {
                    lastSync = {t:t, e:e};
                }
            });

            // ---------- Status banner (HEALTHY / RECOVERED / DEGRADED / STALE / WARNING) ----------
            var lastOkRaw = res.last_successful_sync || '';
            var lastOkT = lastOkRaw ? new Date(String(lastOkRaw).replace(' ', 'T')).getTime() : NaN;
            var hoursSinceOk = isNaN(lastOkT) ? Infinity : (now - lastOkT) / 3600000;
            var status, statusColor, statusIcon, statusMsg;
            if (c24unresolved.error > 0) {
                status = 'DEGRADED';
                statusColor = '#e74c3c';
                statusIcon = 'fa-exclamation-triangle';
                statusMsg = 'Son 24 saatte ' + c24unresolved.error + ' COZULMEMIS hata var.';
                if (lastError) statusMsg += ' En son hata: ' + faRelativeTime(new Date(lastError.t).toISOString()) + ' ('+faEscape(lastError.e.event||'')+').';
            } else if (c24.error > 0) {
                // Son 24sa hatalar var ama hepsi sonradan basarili sync ile cozuldu
                status = 'RECOVERED';
                statusColor = '#27ae60';
                statusIcon = 'fa-check-double';
                statusMsg = 'Son 24 saatte ' + c24.error + ' hata olmus ama hepsi sonradan basarili sync ile cozuldu. Cihaz simdi saglikli.';
            } else if (hoursSinceOk > 24) {
                status = 'STALE';
                statusColor = '#f39c12';
                statusIcon = 'fa-clock';
                statusMsg = 'Son 24 saatte hata yok ama son basarili sync ' + (isFinite(hoursSinceOk) ? Math.floor(hoursSinceOk) + ' saat once' : 'hic yok') + '. Cron caliyor mu?';
            } else if (c24unresolved.warning > 0) {
                status = 'WARNING';
                statusColor = '#f39c12';
                statusIcon = 'fa-exclamation-circle';
                statusMsg = 'Son 24 saatte ' + c24unresolved.warning + ' cozulmemis uyari, hata yok. Sync surekli, izlenmeli.';
            } else {
                status = 'HEALTHY';
                statusColor = '#27ae60';
                statusIcon = 'fa-check-circle';
                statusMsg = 'Son 24 saatte cozulmemis sorun yok, sync calisiyor.';
            }
            var bannerHtml =
                '<div style="display:flex;align-items:center;gap:14px;padding:12px 16px;background:'+statusColor+'15;border-left:4px solid '+statusColor+';border-radius:6px;margin-bottom:14px;">' +
                '  <div style="font-size:1.6rem;color:'+statusColor+';"><i class="fas '+statusIcon+'"></i></div>' +
                '  <div style="flex:1;">' +
                '    <div style="font-size:.72rem;text-transform:uppercase;letter-spacing:.06em;color:'+statusColor+';font-weight:700;">Cihaz Durumu</div>' +
                '    <div style="font-size:1.05rem;font-weight:700;color:'+statusColor+';">'+status+'</div>' +
                '    <div style="font-size:.82rem;color:var(--text-muted);margin-top:2px;">'+statusMsg+'</div>' +
                '  </div>' +
                '  <div style="font-size:.78rem;color:var(--text-muted);text-align:right;line-height:1.6;">' +
                '    Son basarili sync:<br><strong>'+faEscape(lastOkRaw||'hic yok')+'</strong>' +
                (lastOkRaw ? ' <span style="color:var(--text-muted);">('+faRelativeTime(lastOkRaw)+')</span>' : '') +
                '  </div>' +
                '</div>';
            sumBox.insertAdjacentHTML('beforebegin', bannerHtml);
            // Eski banner varsa temizle (yeniden yuklemede ust uste binme)
            var oldBanners = sumBox.parentElement.querySelectorAll(':scope > div[data-fa-status-banner="1"]');
            oldBanners.forEach(function(b){ b.remove(); });
            // Yeni banner'i isaretle
            var addedBanner = sumBox.previousElementSibling;
            if (addedBanner) addedBanner.setAttribute('data-fa-status-banner', '1');

            // KPI: hem 24h hem all-time goster
            document.getElementById('fa-dl-last-ok').innerHTML = faEscape(lastOkRaw || 'hic yok') +
                (lastOkRaw ? '<br><small style="color:var(--text-muted);font-weight:400;">'+faRelativeTime(lastOkRaw)+'</small>' : '');
            document.getElementById('fa-dl-info').innerHTML = c24.info + '<small style="font-size:.55em;color:var(--text-muted);font-weight:400;"> /24h · '+cAll.info+' total</small>';
            document.getElementById('fa-dl-warn').innerHTML = c24.warning + '<small style="font-size:.55em;color:var(--text-muted);font-weight:400;"> /24h · '+cAll.warning+' total</small>';
            document.getElementById('fa-dl-err').innerHTML = c24.error + '<small style="font-size:.55em;color:var(--text-muted);font-weight:400;"> /24h · '+cAll.error+' total</small>';

            // Event summary
            if (summary.length) {
                var sumHtml = '<div style="display:flex;flex-wrap:wrap;gap:6px;">';
                summary.slice(0, 20).forEach(function(s) {
                    var color = s.severity === 'error' ? '#c0392b' : s.severity === 'warning' ? '#e67e22' : '#3498db';
                    sumHtml += '<span style="padding:4px 10px;background:' + color + '22;color:' + color + ';border-radius:4px;font-size:.78rem;font-family:monospace;">';
                    sumHtml += '[' + faEscape(s.severity) + '] ' + faEscape(s.event||'?') + ' × ' + s.c;
                    sumHtml += '</span>';
                });
                sumHtml += '</div>';
                sumBox.innerHTML = sumHtml;
            } else {
                sumBox.innerHTML = '<em>Henuz log kaydi yok.</em>';
            }

            // Entries table — relative time + resolved tagging + stale highlight
            if (!entries.length) {
                tbody.innerHTML = '<tr><td colspan="5"><em>Log kaydi yok.</em></td></tr>';
                return;
            }
            // resolvedMap zaten yukarida hesaplandi; tekrar hesaplama.

            // Filter: Sadece aktif sorunlar?
            var onlyActive = !!(document.getElementById('fa-dl-only-active') && document.getElementById('fa-dl-only-active').checked);
            var visibleEntries = entries.filter(function(e) {
                if (!onlyActive) return true;
                var s = (e.severity||'').toLowerCase();
                if (s !== 'error' && s !== 'warning') return false;
                var key = (e.logged_at||'') + '|' + (e.event||'');
                return !resolvedMap[key];  // sadece cozulmemis error/warning'ler
            });
            if (!visibleEntries.length) {
                tbody.innerHTML = '<tr><td colspan="5"><em>'+(onlyActive?'Aktif (cozulmemis) sorun yok — tum hatalar sonradan basarili sync ile cozuldu.':'Log kaydi yok.')+'</em></td></tr>';
                return;
            }
            var html = '';
            visibleEntries.forEach(function(e) {
                var sevColor = e.severity === 'error' ? '#c0392b' : e.severity === 'warning' ? '#e67e22' : '#3498db';
                var sevBadge = faBadge((e.severity||'?').toUpperCase(), sevColor);
                var rel = faRelativeTime(e.logged_at);
                var t = new Date(String(e.logged_at||'').replace(' ', 'T')).getTime();
                var stale = !isNaN(t) && t < ts7d;
                var key = (e.logged_at||'') + '|' + (e.event||'');
                var resolved = resolvedMap[key];
                var rowStyle = resolved ? 'opacity:.6;background:rgba(39,174,96,0.05);' : (stale ? 'opacity:.55;' : '');
                var resolvedTag = resolved
                    ? ' <span style="display:inline-block;margin-left:6px;padding:2px 8px;background:#27ae60;color:#fff;border-radius:10px;font-size:.65rem;font-weight:700;" title="Cozuldu: '+faEscape(resolved.at||'')+' ('+faEscape(resolved.by_event||'')+')"><i class="fas fa-check"></i> Cozuldu</span>'
                    : '';
                html += '<tr style="'+rowStyle+'">' +
                    '<td style="white-space:nowrap;font-size:.78rem;" title="'+faEscape(e.logged_at||'')+'">' +
                       faEscape(e.logged_at||'-') +
                       '<br><small style="color:var(--text-muted);">'+rel+(stale?' <em>(eski)</em>':'')+'</small>' +
                    '</td>' +
                    '<td>' + sevBadge + resolvedTag + '</td>' +
                    '<td><code style="font-size:.75rem;">' + faEscape(e.event||'-') + '</code></td>' +
                    '<td>' + (e.command ? '<code style="font-size:.75rem;">' + faEscape(e.command) + '</code>' : '<em style="color:#95a5a6;">-</em>') + '</td>' +
                    '<td style="font-size:.78rem;">' + faEscape(e.message||'-') + '</td>' +
                    '</tr>';
            });
            tbody.innerHTML = html;
        }).catch(function(e) {
            tbody.innerHTML = '<tr><td colspan="5">Baglanti hatasi</td></tr>';
        });
    }
    window.loadDeviceLog = loadDeviceLog;

    // ============================================================
    // Log Gecmisi — Yonetim > Log Gecmisi (30dk'lik network cron'un HER KOSUSU icin ozet)
    // ============================================================
    function loadCronRuns() {
        var tbody = document.getElementById('fa-cr-tbody');
        tbody.innerHTML = '<tr><td colspan="7"><i class="fas fa-spinner fa-spin"></i></td></tr>';

        var status = document.getElementById('fa-cr-filter-status').value;

        faApi('network_cron_runs', { status: status, limit: 200 }).then(function(res) {
            if (!res.success) {
                tbody.innerHTML = '<tr><td colspan="7">Hata: ' + faEscape(res.error || '') + '</td></tr>';
                return;
            }

            document.getElementById('fa-cr-last-run').textContent = res.last_run_at ? faRelativeTime(res.last_run_at) : '-';

            var runs = res.runs || [];
            var now = Date.now();
            var ts24 = now - 24*3600*1000;
            var total24 = 0, fail24 = 0;
            runs.forEach(function(r) {
                var t = new Date(String(r.logged_at||'').replace(' ', 'T')).getTime();
                if (!isNaN(t) && t >= ts24) {
                    total24++;
                    if (r.fail_count > 0) fail24++;
                }
            });
            document.getElementById('fa-cr-total-runs').textContent = total24;
            document.getElementById('fa-cr-fail-runs').textContent = fail24;

            if (!runs.length) {
                tbody.innerHTML = '<tr><td colspan="7">Kayit yok — cron henuz calismamis olabilir</td></tr>';
                return;
            }
            var html = '';
            runs.forEach(function(r) {
                var hasFail = r.fail_count > 0;
                var okCount = (r.total || 0) - (r.fail_count || 0);
                var startT = new Date(String(r.started_at||'').replace(' ', 'T')).getTime();
                var endT = new Date(String(r.finished_at||'').replace(' ', 'T')).getTime();
                var durationStr = '-';
                if (!isNaN(startT) && !isNaN(endT) && endT >= startT) {
                    var durSec = Math.round((endT - startT) / 1000);
                    durationStr = durSec < 60 ? (durSec + ' sn') : (Math.floor(durSec/60) + ' dk ' + (durSec%60) + ' sn');
                }
                var failSlugs = r.fail_slugs || [];
                var failHtml = failSlugs.length
                    ? failSlugs.map(function(s) {
                        return '<code class="fa-cr-fail-slug" style="font-size:.72rem;cursor:pointer;text-decoration:underline dotted;" ' +
                               'title="Neden basarisiz oldu - detay icin tikla" ' +
                               'onclick="fireAuditShowCronFailDetail(\'' + faEscape(s).replace(/'/g, "\\'") + '\')">' +
                               faEscape(s) + '</code>';
                      }).join(' ')
                    : '<span style="color:#95a5a6;">-</span>';
                html += '<tr style="' + (hasFail ? 'background:rgba(192,57,43,0.05);' : '') + '">' +
                    '<td style="white-space:nowrap;font-size:.78rem;">' + faEscape(r.started_at||'-') +
                       '<br><small style="color:var(--text-muted);">'+faRelativeTime(r.started_at)+'</small></td>' +
                    '<td style="font-size:.78rem;">' + durationStr + '</td>' +
                    '<td><code style="font-size:.75rem;">' + faEscape(r.mode||'-') + '</code></td>' +
                    '<td>' + (r.total || 0) + '</td>' +
                    '<td>' + faBadge(String(okCount), '#27ae60') + '</td>' +
                    '<td>' + (hasFail ? faBadge(String(r.fail_count), '#c0392b') : faBadge('0', '#95a5a6')) + '</td>' +
                    '<td>' + failHtml + '</td>' +
                    '</tr>';
            });
            tbody.innerHTML = html;
        }).catch(function() {
            tbody.innerHTML = '<tr><td colspan="7">Baglanti hatasi</td></tr>';
        });
    }
    window.loadCronRuns = loadCronRuns;

    // Log Gecmisi'nde "Hatali Cihazlar" sutunundaki bir slug'a tiklaninca acilir —
    // o cihazin son basarisiz sync kayitlarini (timeout / ssh / auth / diger hata
    // mesaji) fireaudit_device_log'dan cekip gosterir.
    window.fireAuditShowCronFailDetail = function(slug) {
        var modal = document.getElementById('fa-rule-modal');
        if (!modal) return;
        var body  = document.getElementById('fa-modal-body');
        var title = document.getElementById('fa-modal-title');
        if (title) title.textContent = 'Hata Detayi: ' + slug;
        if (body)  body.innerHTML = '<div style="padding:40px;text-align:center;"><i class="fas fa-spinner fa-spin fa-2x"></i></div>';
        modal.style.display = 'flex';
        modal.onclick = function(e) { if (e.target === modal) modal.style.display = 'none'; };

        faApi('network_sync_history', { fw_slug: slug, status: 'fail', limit: 15 }).then(function(res) {
            if (!body) return;
            if (!res.success) {
                body.innerHTML = '<div style="color:#c0392b;padding:20px;">Hata: ' + faEscape(res.error || 'bilinmiyor') + '</div>';
                return;
            }
            var entries = res.entries || [];
            if (!entries.length) {
                body.innerHTML = '<div class="fa-modal-section"><em>Bu cihaz icin kayitli hata detayi bulunamadi ' +
                    '(cron_runs sonucu basarisiz gorunuyor ama device_log bos — log rotasyonu ya da farkli bir asamada ' +
                    'kaybolmus olabilir).</em></div>';
                return;
            }
            // Tablo yerine dikey kart listesi — hata mesajlari uzun olabiliyor
            // (SSH/paramiko exception metni), dar bir tablo hucresine sikistirmak
            // yerine her kayda kendi tam genislikte satirini veriyoruz ki mesaj
            // hicbir sekilde kirpilmasin / yarim gorunmesin.
            var html = '<div class="fa-modal-section"><h4><i class="fas fa-exclamation-triangle"></i> Son Basarisiz Kayitlar (' + entries.length + ')</h4>';
            entries.forEach(function(e) {
                var sevColor = e.severity === 'error' ? '#c0392b' : e.severity === 'warning' ? '#e67e22' : '#95a5a6';
                html += '<div style="border:1px solid #eef1f5;border-left:3px solid ' + sevColor + ';border-radius:4px;padding:10px 12px;margin-bottom:8px;">';
                html += '<div style="display:flex;gap:10px;align-items:center;margin-bottom:6px;flex-wrap:wrap;">' +
                    '<span style="font-size:.75rem;color:var(--text-muted);white-space:nowrap;">' + faEscape(e.logged_at || '-') + '</span>' +
                    faBadge(e.severity || '-', sevColor) +
                    '<code style="font-size:.75rem;">' + faEscape(e.event || '-') + '</code>' +
                    '</div>';
                html += '<div style="font-size:.85rem;white-space:pre-wrap;word-break:break-word;line-height:1.5;">' +
                    faEscape(e.message || '-') + '</div>';
                html += '</div>';
            });
            html += '</div>';
            body.innerHTML = html;
        }).catch(function() {
            if (body) body.innerHTML = '<div style="color:#c0392b;padding:20px;">Baglanti hatasi</div>';
        });
    };

    // Sayfa gorunumu degistiginde auto-refresh'i baslatir/durdurur
    document.addEventListener('visibilitychange', function() {
        if (_deviceLogTabVisible()) _startDeviceLogAutoRefresh();
        else _stopDeviceLogAutoRefresh();
    });

    // ============================================================
    // Faz A: 5-Factor Risk Scoring Widget (Dashboard)
    // ============================================================
    function load5FactorWidget() {
        var box = document.getElementById('fa-5factor-widget');
        if (!box) return;
        box.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Yükleniyor...';

        faApi('scoring_breakdown').then(function(res) {
            if (!res.success) {
                box.innerHTML = '<div style="color:#e74c3c;">Hata: ' + faEscape(res.error || 'bilinmiyor') + '</div>';
                return;
            }
            if (!res.n_rules) {
                box.innerHTML = '<div style="color:var(--text-muted);"><i class="fas fa-info-circle"></i> Bu cihazda enabled kural yok veya henüz analyze çalıştırılmamış.</div>';
                return;
            }

            var avg = res.avg_factors || {};
            var max = res.max_factors || {};
            var weights = res.weights || {};
            var factorDefs = [
                {key: 'exposure',            label: 'Exposure',            icon: 'fa-globe',      desc: 'ANY-ANY, internet-facing, shadow'},
                {key: 'trust_delta',         label: 'Trust Delta',         icon: 'fa-exchange-alt', desc: 'untrust→trust'},
                {key: 'service_sensitivity', label: 'Service Sensitivity', icon: 'fa-shield-virus', desc: 'SSH/RDP/SMB=95, DB=90, HTTP=50'},
                {key: 'permission_breadth',  label: 'Permission Breadth',  icon: 'fa-expand-arrows-alt', desc: 'any_src + any_dst + any_svc + liste uzunluğu'},
                {key: 'profile_gap',         label: 'Profile Gap',         icon: 'fa-shield-alt',   desc: 'Eksik IPS/AV/WebFilter/AppCtrl/SSL-Insp'},
            ];

            var html = '';
            // Weighted average score — buyuk KPI
            var ws = res.weighted_avg_score || 0;
            var wsColor = ws >= 65 ? '#c0392b' : ws >= 40 ? '#e67e22' : ws >= 25 ? '#f39c12' : '#27ae60';
            html += '<div style="display:flex;gap:20px;align-items:center;margin-bottom:20px;padding:14px;background:var(--card-bg);border-radius:8px;border-left:4px solid ' + wsColor + ';">';
            html += '<div><div style="font-size:.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;">Weighted Average Risk</div>' +
                    '<div style="font-size:2.2rem;font-weight:700;color:' + wsColor + ';">' + ws.toFixed(1) + '<small style="font-size:.6em;color:var(--text-muted);font-weight:400;">/100</small></div></div>';
            html += '<div style="flex:1;font-size:.78rem;color:var(--text-muted);">' +
                    '<strong>' + res.n_rules + ' aktif kural</strong> 5 faktöre göre skorlandı.<br>' +
                    'Her faktör ağırlıklı — ortalamalar sayfada aşağıda, max değerler en kritik kuralları gösterir.' +
                    '</div></div>';

            // Per-factor bars
            html += '<div style="display:flex;flex-direction:column;gap:10px;">';
            factorDefs.forEach(function(d) {
                var avgV = avg[d.key] || 0;
                var maxV = max[d.key] || 0;
                var wt = (weights[d.key] || 0) * 100;
                var color = avgV >= 65 ? '#c0392b' : avgV >= 40 ? '#e67e22' : avgV >= 25 ? '#f39c12' : '#27ae60';

                html += '<div style="background:var(--card-bg);padding:12px;border-radius:6px;">';
                html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">';
                html += '<div><i class="fas ' + d.icon + '" style="color:' + color + ';margin-right:8px;"></i>';
                html += '<strong>' + faEscape(d.label) + '</strong>';
                html += '<span style="color:var(--text-muted);font-size:.75rem;margin-left:8px;">ağırlık %' + wt.toFixed(0) + '</span>';
                html += '</div>';
                html += '<div style="text-align:right;">';
                html += '<span style="font-size:1.3rem;font-weight:700;color:' + color + ';">' + avgV.toFixed(1) + '</span>';
                html += '<span style="color:var(--text-muted);font-size:.82rem;"> avg</span>';
                html += '<span style="margin-left:10px;color:var(--text-muted);font-size:.82rem;">max ' + maxV + '</span>';
                html += '</div></div>';
                // Progress bar
                html += '<div style="background:var(--border-color);height:8px;border-radius:4px;overflow:hidden;">';
                html += '<div style="height:100%;width:' + Math.min(100, avgV) + '%;background:' + color + ';transition:width 0.3s;"></div>';
                html += '</div>';
                // Reason + desc
                html += '<div style="font-size:.72rem;color:var(--text-muted);margin-top:4px;"><em>' + faEscape(d.desc) + '</em></div>';
                html += '</div>';
            });
            html += '</div>';

            // Top risky listesi
            if ((res.top_risky||[]).length) {
                html += '<h5 style="margin-top:20px;margin-bottom:8px;"><i class="fas fa-fire"></i> En Riskli 10 Kural (5-Faktör)</h5>';
                html += '<table class="fa-table" style="font-size:.82rem;"><thead><tr>' +
                        '<th>Rule ID</th><th>Ad</th><th>Skor</th><th>Sev</th>' +
                        '<th title="Exposure"><i class="fas fa-globe"></i></th>' +
                        '<th title="Trust Delta"><i class="fas fa-exchange-alt"></i></th>' +
                        '<th title="Service Sensitivity"><i class="fas fa-shield-virus"></i></th>' +
                        '<th title="Permission Breadth"><i class="fas fa-expand-arrows-alt"></i></th>' +
                        '<th title="Profile Gap"><i class="fas fa-shield-alt"></i></th>' +
                        '</tr></thead><tbody>';
                res.top_risky.forEach(function(t) {
                    var color = faSevColor(t.severity);
                    html += '<tr>';
                    html += '<td><a class="fa-rule-link" onclick="fireAuditOpenRule(\'' + faEscape(t.rule_id) + '\')">' + faEscape(t.rule_id) + '</a></td>';
                    html += '<td>' + faEscape((t.name||'').substring(0,35)) + '</td>';
                    html += '<td><strong style="color:' + color + ';">' + t.score + '</strong></td>';
                    html += '<td>' + faBadge(t.severity, color) + '</td>';
                    html += '<td>' + (t.factors.exposure.raw||0) + '</td>';
                    html += '<td>' + (t.factors.trust_delta.raw||0) + '</td>';
                    html += '<td>' + (t.factors.service_sensitivity.raw||0) + '</td>';
                    html += '<td>' + (t.factors.permission_breadth.raw||0) + '</td>';
                    html += '<td>' + (t.factors.profile_gap.raw||0) + '</td>';
                    html += '</tr>';
                });
                html += '</tbody></table>';
            }

            box.innerHTML = html;
        }).catch(function(e) {
            box.innerHTML = '<div style="color:#e74c3c;">Bağlantı hatası</div>';
        });
    }
    window.load5FactorWidget = load5FactorWidget;

    // ============================================================
    // Zone Trust Calibration (admin tab)
    // ============================================================
    function loadZoneTrustCalibration() {
        var tbody = document.getElementById('fa-ztc-tbody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="5"><i class="fas fa-spinner fa-spin"></i></td></tr>';

        faApi('scoring_zone_trust').then(function(res) {
            if (!res.success) {
                tbody.innerHTML = '<tr><td colspan="5" style="color:#e74c3c;">Hata: ' + faEscape(res.error || '') + '</td></tr>';
                return;
            }
            var zones = res.zones || [];
            if (!zones.length) {
                tbody.innerHTML = '<tr><td colspan="5"><em>Bu firewall\'da zone yok — önce fetch yapın.</em></td></tr>';
                return;
            }
            var html = '';
            zones.forEach(function(z) {
                var trustColor = z.trust_level <= 1 ? '#c0392b' :
                                 z.trust_level <= 3 ? '#e67e22' :
                                 z.trust_level <= 6 ? '#f39c12' :
                                 z.trust_level <= 8 ? '#3498db' : '#27ae60';
                html += '<tr>';
                html += '<td><code>' + faEscape(z.zone_name) + '</code></td>';
                html += '<td><span style="color:var(--text-muted);">' + z.heuristic_level + '</span></td>';
                html += '<td><strong style="color:' + trustColor + ';font-size:1.2rem;">' + z.trust_level + '</strong> <span style="font-size:.7rem;color:var(--text-muted);">/10</span></td>';
                html += '<td>' + (z.is_override
                    ? '<span style="color:#3498db;"><i class="fas fa-user-edit"></i> Manuel</span>'
                    : '<span style="color:var(--text-muted);"><i class="fas fa-magic"></i> Heuristic</span>') + '</td>';
                html += '<td>';
                html += '<input type="range" min="0" max="10" value="' + z.trust_level + '" ' +
                        'data-zone="' + faEscape(z.zone_name) + '" ' +
                        'oninput="this.nextElementSibling.textContent = this.value" ' +
                        'style="width:120px;vertical-align:middle;"> ';
                html += '<span style="display:inline-block;width:20px;text-align:center;font-weight:700;">' + z.trust_level + '</span> ';
                html += '<button class="fa-btn fa-btn-sm fa-btn-primary" onclick="fireAuditSaveZoneTrust(\'' + faEscape(z.zone_name) + '\', this)"><i class="fas fa-save"></i> Kaydet</button>';
                html += '</td>';
                html += '</tr>';
            });
            tbody.innerHTML = html;
        });
    }
    window.loadZoneTrustCalibration = loadZoneTrustCalibration;

    // ============================================================
    // Faz E: Complexity + Mergeable
    // ============================================================
    function loadComplexity() {
        var bdBox = document.getElementById('fa-cx-breakdown');
        if (!bdBox) return;
        bdBox.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Yükleniyor...';

        faApi('complexity').then(function(res) {
            if (!res.success) {
                bdBox.innerHTML = '<div style="color:#e74c3c;">Hata: ' + faEscape(res.error||'') + '</div>';
                return;
            }
            if (res.message) {
                bdBox.innerHTML = '<div style="color:var(--text-muted);"><i class="fas fa-info-circle"></i> ' + faEscape(res.message) + '</div>';
                return;
            }
            var sc = res.complexity_score || 0;
            var grade = res.grade || '?';
            var gradeColor = grade === 'A' ? '#27ae60' : grade === 'B' ? '#3498db' :
                             grade === 'C' ? '#f39c12' : grade === 'D' ? '#e67e22' : '#c0392b';
            document.getElementById('fa-cx-grade').textContent = grade;
            document.getElementById('fa-cx-grade').style.color = gradeColor;
            document.getElementById('fa-cx-score').textContent = sc;

            var c = res.counters || {};
            document.getElementById('fa-cx-rules').textContent = c.n_rules || 0;
            document.getElementById('fa-cx-zones').textContent = c.n_zones || 0;
            document.getElementById('fa-cx-dups').textContent = c.duplicate_rules || 0;
            document.getElementById('fa-cx-dead').textContent = c.dead_rules || 0;
            document.getElementById('fa-cx-merge').textContent = c.mergeable_rules || 0;

            // Breakdown bars
            var bd = res.breakdown || {};
            var labels = {
                rule_count:       {label: 'Toplam Kural Sayısı', icon: 'fa-list-ol', desc: '500 kural ≈ 100 puan, lineer-olmayan ölçek'},
                avg_breadth_src:  {label: 'Ortalama src genişliği', icon: 'fa-arrow-right', desc: 'src_addresses listelerinin uzunluk ortalaması (any=20 sayar)'},
                avg_breadth_dst:  {label: 'Ortalama dst genişliği', icon: 'fa-arrow-left', desc: 'dst_addresses listelerinin uzunluk ortalaması'},
                avg_breadth_svc:  {label: 'Ortalama servis genişliği', icon: 'fa-network-wired', desc: 'services listelerinin uzunluk ortalaması'},
                zone_diversity:   {label: 'Zone çeşitliliği', icon: 'fa-shapes', desc: 'unique zone sayısı x 3'},
                shadow_ratio:     {label: 'Shadow oranı', icon: 'fa-clone', desc: 'shadow finding olan kuralların oranı'},
                duplicate_ratio:  {label: 'Duplicate oranı', icon: 'fa-copy', desc: 'duplicate gruplardaki kural oranı'},
                dead_rule_ratio:  {label: 'Dead rule oranı', icon: 'fa-ghost', desc: 'hit_count=0 olan kural oranı'},
                mergeable_ratio:  {label: 'Mergeable oranı', icon: 'fa-compress-arrows-alt', desc: 'birleştirilebilir gruplardaki kural oranı'},
            };

            var html = '';
            Object.keys(labels).forEach(function(k) {
                var f = bd[k] || {raw:0, weight:0, weighted:0};
                var info = labels[k];
                var raw = f.raw || 0;
                var w = (f.weight || 0) * 100;
                var weighted = f.weighted || 0;
                var color = raw >= 70 ? '#c0392b' : raw >= 50 ? '#e67e22' : raw >= 30 ? '#f39c12' : '#27ae60';

                html += '<div style="margin-bottom:10px;background:var(--card-bg);padding:10px;border-radius:6px;">';
                html += '<div style="display:flex;justify-content:space-between;align-items:center;">';
                html += '<div><i class="fas ' + info.icon + '" style="color:' + color + ';margin-right:6px;"></i>';
                html += '<strong>' + faEscape(info.label) + '</strong>';
                html += ' <span style="color:var(--text-muted);font-size:.72rem;margin-left:6px;">ağırlık %' + w.toFixed(0) + '</span></div>';
                html += '<div><span style="color:' + color + ';font-weight:700;">' + raw.toFixed(1) + '</span>';
                html += ' <span style="color:var(--text-muted);font-size:.78rem;"> · ağırlıklı ' + weighted.toFixed(1) + '</span></div>';
                html += '</div>';
                html += '<div style="background:var(--border-color);height:6px;border-radius:3px;overflow:hidden;margin-top:6px;">';
                html += '<div style="width:' + Math.min(100, raw) + '%;background:' + color + ';height:100%;"></div>';
                html += '</div>';
                html += '<div style="font-size:.72rem;color:var(--text-muted);margin-top:3px;"><em>' + faEscape(info.desc) + '</em></div>';
                html += '</div>';
            });
            bdBox.innerHTML = html;
        });
    }
    window.loadComplexity = loadComplexity;

    function loadComplexityTrend() {
        var box = document.getElementById('fa-cx-trend');
        if (!box) return;
        faApi('complexity_trend', {days: 30}).then(function(res) {
            if (!res.success || !(res.history||[]).length) {
                box.innerHTML = '<em style="color:var(--text-muted);font-size:.85rem;">Henüz tarihçe yok — sync\'i birkaç gün çalıştırın</em>';
                return;
            }
            var hist = res.history;
            var w = box.clientWidth || 600, h = 60;
            var max = Math.max.apply(null, hist.map(function(pt){return pt.complexity_score||0;}));
            var min = Math.min.apply(null, hist.map(function(pt){return pt.complexity_score||0;}));
            var range = Math.max(1, max - min);
            var points = hist.map(function(pt, i) {
                var x = (i / Math.max(1, hist.length-1)) * (w - 20) + 10;
                var y = h - 10 - ((pt.complexity_score||0) - min) / range * (h - 30);
                return x + ',' + y;
            }).join(' ');
            var last = hist[hist.length-1];
            box.innerHTML = '<svg width="' + w + '" height="' + h + '" style="display:block;">' +
                '<polyline points="' + points + '" stroke="#3498db" stroke-width="2" fill="none"/>' +
                '<text x="10" y="14" font-size="10" fill="#95a5a6">' + min.toFixed(1) + '</text>' +
                '<text x="10" y="' + (h-2) + '" font-size="10" fill="#95a5a6">' + max.toFixed(1) + '</text>' +
                '<text x="' + (w-80) + '" y="14" font-size="11" font-weight="700" fill="#3498db">' +
                  (last.computed_at||'').substring(0,10) + ' = ' + (last.complexity_score||0) + ' (' + (last.grade||'') + ')</text>' +
                '</svg>';
        });
    }
    window.loadComplexityTrend = loadComplexityTrend;

    // Mergeable ack cache — backend henuz mergeable finding_type'i icin tam destek vermiyor olabilir,
    // bu yuzden client-side cache + backend ack endpoint'i birlikte kullaniliyor.
    window._mergeAckCache = window._mergeAckCache || {};
    try {
        var _stored = localStorage.getItem('fa_merge_ack_cache');
        if (_stored) window._mergeAckCache = JSON.parse(_stored) || {};
    } catch (e) {}
    function _persistMergeAckCache() {
        try { localStorage.setItem('fa_merge_ack_cache', JSON.stringify(window._mergeAckCache)); } catch (e) {}
    }

    window.fireAuditMergeAck = function(sig, state) {
        // Backend'e ack at + client-side cache'e isaretle
        var fd = new FormData();
        fd.append('action', 'ack');
        fd.append('fw_slug', FW_SLUG);
        fd.append('finding_type', 'mergeable');
        fd.append('rule_id', sig);
        fd.append('state', state);
        fd.append('note', 'Merge group ack via UI buton');
        fetch(API_BASE + '?action=ack&fw_slug=' + encodeURIComponent(FW_SLUG), { method: 'POST', credentials: 'same-origin', body: fd })
            .then(function(r) { return r.json(); })
            .then(function(res) {
                // Backend basariyla yazsa da yazmasa da UI tarafini guncelle
                window._mergeAckCache[sig] = state;
                _persistMergeAckCache();
                if (typeof loadMergeableGroups === 'function') loadMergeableGroups();
                if (res && !res.success) {
                    console.warn('Backend ack hatasi (UI cache uygulandi):', res.error);
                }
            })
            .catch(function() {
                window._mergeAckCache[sig] = state;
                _persistMergeAckCache();
                if (typeof loadMergeableGroups === 'function') loadMergeableGroups();
            });
    };
    window.fireAuditMergeAckClear = function(sig) {
        var fd = new FormData();
        fd.append('action', 'ack');
        fd.append('fw_slug', FW_SLUG);
        fd.append('finding_type', 'mergeable');
        fd.append('rule_id', sig);
        fd.append('state', 'clear');
        fetch(API_BASE + '?action=ack&fw_slug=' + encodeURIComponent(FW_SLUG), { method: 'POST', credentials: 'same-origin', body: fd })
            .then(function(r) { return r.json(); })
            .then(function() {
                delete window._mergeAckCache[sig];
                _persistMergeAckCache();
                if (typeof loadMergeableGroups === 'function') loadMergeableGroups();
            })
            .catch(function() {
                delete window._mergeAckCache[sig];
                _persistMergeAckCache();
                if (typeof loadMergeableGroups === 'function') loadMergeableGroups();
            });
    };

    // Complexity tab sub-tab toggle (Score / Mergeable)
    window.fireAuditCxSubTab = function(name) {
        var btns = document.querySelectorAll('#fa-tab-complexity .fa-mode-btn');
        for (var i = 0; i < btns.length; i++) btns[i].classList.toggle('active', btns[i].getAttribute('data-cx-sub') === name);
        var sScore = document.getElementById('fa-cx-sub-score');
        var sMerge = document.getElementById('fa-cx-sub-merge');
        if (sScore) sScore.style.display = name === 'score' ? '' : 'none';
        if (sMerge) sMerge.style.display = name === 'merge' ? '' : 'none';
        // Mergeable sub-tab ilk kez açılırsa lazy-load
        if (name === 'merge' && typeof loadMergeableGroups === 'function') {
            loadMergeableGroups();
        }
    };

    function loadMergeableGroups() {
        // Object type map'ini önce yükle (access-role vs group ayırımı için)
        return _loadObjectTypeMap().then(function() {
            return _loadMergeableGroupsInner();
        });
    }
    function _loadMergeableGroupsInner() {
        var box = document.getElementById('fa-cx-merge-list');
        if (!box) return;
        var pat = document.getElementById('fa-cx-merge-filter').value;
        box.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Yükleniyor...';

        faApi('complexity_mergeable', {pattern: pat}).then(function(res) {
            if (!res.success) {
                box.innerHTML = '<div style="color:#e74c3c;">Hata: ' + faEscape(res.error||'') + '</div>';
                return;
            }
            // Tasarruf KPI
            var savEl = document.getElementById('fa-cx-savings');
            if (savEl) savEl.textContent = res.total_potential_savings || 0;

            var groups = res.groups || [];
            if (!groups.length) {
                box.innerHTML = '<div style="padding:14px;color:#27ae60;background:rgba(39,174,96,0.08);border-radius:6px;">' +
                    '<i class="fas fa-check-circle"></i> Birleştirilebilir kural grubu bulunamadı — policy seti zaten kompakt.</div>';
                return;
            }

            // Pattern özeti
            var ps = res.pattern_summary || {};
            var psHtml = '<div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap;">';
            var patternLabels = {
                same_src_dst_action: {label: 'src+dst+action ortak (svc birleşir)', color: '#3498db', icon: 'fa-network-wired'},
                same_src_svc_action: {label: 'src+svc+action ortak (dst birleşir)', color: '#9b59b6', icon: 'fa-arrow-right'},
                same_dst_svc_action: {label: 'dst+svc+action ortak (src birleşir)', color: '#16a085', icon: 'fa-arrow-left'},
            };
            Object.keys(patternLabels).forEach(function(p) {
                if (!ps[p]) return;
                var pl = patternLabels[p];
                psHtml += '<div style="background:' + pl.color + '11;color:' + pl.color + ';padding:8px 14px;border-left:3px solid ' + pl.color + ';border-radius:4px;flex:1;min-width:200px;">';
                psHtml += '<i class="fas ' + pl.icon + '"></i> <strong>' + ps[p].count + '</strong> grup, <strong>' + ps[p].savings + '</strong> kural tasarrufu<br>';
                psHtml += '<small>' + faEscape(pl.label) + '</small></div>';
            });
            psHtml += '</div>';

            // Her grubu obje tipine gore homojen alt-gruplara bol (Network grup vs Access-role)
            // CheckPoint'te bu iki tur yapisal olarak birlestirilemez; heuristik isim
            // pattern'lariyla ayirip yalnizca >=2 ayni-tur kurallari onerelim.
            var refinedGroups = [];
            groups.forEach(function(g) {
                var partitions = _partitionMergeGroupByObjType(g);
                partitions.forEach(function(sub) {
                    if ((sub.full_rules || []).length >= 2) {
                        refinedGroups.push(sub);
                    }
                });
            });

            // Sub-tab buton badge guncelle
            var cntBadge = document.getElementById('fa-cx-merge-cnt-badge');
            if (cntBadge) cntBadge.textContent = refinedGroups.length;

            if (!refinedGroups.length) {
                box.innerHTML = '<div style="padding:14px;color:#27ae60;background:rgba(39,174,96,0.08);border-radius:6px;">' +
                    '<i class="fas fa-check-circle"></i> Birleştirilebilir homojen kural grubu bulunamadı (network ve access-role karışık gruplar dışlandı).</div>';
                return;
            }

            // Her grup için detay kartı
            var html = psHtml;
            refinedGroups.forEach(function(g, idx) {
                html += _renderMergeGroup(g, idx);
            });
            box.innerHTML = html;
        });
    }
    window.loadMergeableGroups = loadMergeableGroups;

    // CheckPoint object_type haritası — backend'den çekilir, fetcher show-access-roles ile doldurur.
    // Heuristik isim patternları YANILTICI olduğu için terk edildi.
    var _objectTypeMap = null;  // {name: 'access-role'|'group'|'host'|...}
    function _loadObjectTypeMap() {
        if (_objectTypeMap !== null) return Promise.resolve(_objectTypeMap);
        return faApi('object_types').then(function(r) {
            _objectTypeMap = (r.success && r.object_types) ? r.object_types : {};
            return _objectTypeMap;
        }).catch(function() {
            _objectTypeMap = {};
            return _objectTypeMap;
        });
    }
    // Cihaz değişiminde cache invalidate
    var _origSwitchFw = window.fireAuditSwitchFirewall;
    if (typeof _origSwitchFw === 'function') {
        window.fireAuditSwitchFirewall = function(slug) {
            _objectTypeMap = null;
            return _origSwitchFw.call(this, slug);
        };
    }

    function _classifyRuleObjType(rule) {
        // Gerçek object_type lookup — heuristik yok.
        // _objectTypeMap doldurulmadıysa fallback 'network' (false negative kabul edilir,
        // false positive'den daha güvenli; network olarak işlenip karışık merge önerisi
        // yapılmasındansa yapılmaması iyi).
        var map = _objectTypeMap || {};
        var srcs = (rule.src_addresses || []);
        var dsts = (rule.dst_addresses || []);
        function isAR(name) { return map[name] === 'access-role'; }
        var hasAccessRole = srcs.some(isAR) || dsts.some(isAR);
        return hasAccessRole ? 'access-role' : 'network';
    }
    // Bir merge group'unu obje tipine gore homojen alt-gruplara bol.
    // Donus: array of {merge_pattern, full_rules, rule_ids, rule_count, merged_preview, ...alanlar}
    function _partitionMergeGroupByObjType(g) {
        var rules = g.full_rules || [];
        if (rules.length < 2) return [];
        var byKind = { 'access-role': [], 'network': [] };
        rules.forEach(function(r) {
            var k = _classifyRuleObjType(r);
            (byKind[k] || byKind['network']).push(r);
        });
        var out = [];
        Object.keys(byKind).forEach(function(kind) {
            var sub = byKind[kind];
            if (sub.length < 2) return;
            // Eger butun kurallar zaten ayni tur ise orijinal grubu kullan (preview backend'den geldigi gibi)
            if (sub.length === rules.length) {
                out.push(g);
                return;
            }
            // Alt-grup icin yeni preview hesapla (basit union)
            var newG = Object.assign({}, g, {
                full_rules: sub,
                rule_ids: sub.map(function(r) { return r.rule_id; }),
                rule_count: sub.length,
                potential_savings: sub.length - 1,
                _objType: kind,
                merged_preview: _recomputeMergedPreview(sub, g.merge_pattern),
                _filteredFromTotal: rules.length,
            });
            out.push(newG);
        });
        return out;
    }
    function _recomputeMergedPreview(rules, pattern) {
        if (!rules.length) return {};
        var base = rules[0];
        var unionList = function(field) {
            var seen = {};
            var out = [];
            rules.forEach(function(r) {
                (r[field] || []).forEach(function(v) {
                    if (!seen[v]) { seen[v] = true; out.push(v); }
                });
            });
            return out;
        };
        var preview = {
            name: '(Merged) ' + (base.name || base.rule_id || ''),
            src_zones: base.src_zones || [],
            dst_zones: base.dst_zones || [],
            src_addresses: base.src_addresses || [],
            dst_addresses: base.dst_addresses || [],
            services: base.services || [],
            action: base.action,
            logging: base.logging,
            comments: 'Merged from rules: ' + rules.map(function(r) { return r.rule_id; }).join(', '),
        };
        if (pattern === 'same_src_dst_action') preview.services = unionList('services');
        else if (pattern === 'same_src_svc_action') preview.dst_addresses = unionList('dst_addresses');
        else if (pattern === 'same_dst_svc_action') preview.src_addresses = unionList('src_addresses');
        return preview;
    }

    function _renderMergeGroup(g, idx) {
        var pl = {
            same_src_dst_action: {label: 'src+dst+action ortak', diff: 'services', diffLabel: 'servisler', color: '#3498db', icon: 'fa-network-wired'},
            same_src_svc_action: {label: 'src+svc+action ortak', diff: 'dst_addresses', diffLabel: 'dst adresleri', color: '#9b59b6', icon: 'fa-arrow-right'},
            same_dst_svc_action: {label: 'dst+svc+action ortak', diff: 'src_addresses', diffLabel: 'src adresleri', color: '#16a085', icon: 'fa-arrow-left'},
        }[g.merge_pattern] || {label: g.merge_pattern, diff: '?', diffLabel: '?', color: '#95a5a6', icon: 'fa-question'};

        var conf = g.confidence || 0;
        var confColor = conf >= 80 ? '#27ae60' : conf >= 60 ? '#f39c12' : '#c0392b';
        var groupId = 'mg-' + idx;

        var html = '<div style="background:var(--card-bg);border:1px solid var(--border-color);border-left:4px solid ' + pl.color + ';border-radius:6px;padding:14px;margin-bottom:12px;">';

        // Header
        html += '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">';
        html += '<div>';
        html += '<i class="fas ' + pl.icon + '" style="color:' + pl.color + ';"></i> ';
        html += '<strong>Grup #' + (idx+1) + '</strong> — ' + pl.label;
        html += ' <span style="color:var(--text-muted);font-size:.78rem;">(' + g.rule_count + ' kural → 1 kural)</span>';
        html += '</div>';
        html += '<div style="display:flex;gap:6px;align-items:center;">';
        html += '<span style="background:' + confColor + '22;color:' + confColor + ';padding:3px 10px;border-radius:4px;font-size:.78rem;font-weight:600;">';
        html += '<i class="fas fa-chart-line"></i> Confidence ' + conf + '%</span>';
        html += '<span style="background:#27ae6022;color:#27ae60;padding:3px 10px;border-radius:4px;font-size:.78rem;font-weight:600;">';
        html += '<i class="fas fa-trash-alt"></i> ' + g.potential_savings + ' kural tasarrufu</span>';
        html += '<button class="fa-btn fa-btn-sm" onclick="document.getElementById(\'' + groupId + '\').style.display=document.getElementById(\'' + groupId + '\').style.display===\'none\'?\'block\':\'none\'"><i class="fas fa-eye"></i> Detay</button>';
        html += '</div></div>';

        // Risks
        if ((g.risks||[]).length) {
            html += '<div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap;">';
            g.risks.forEach(function(r) {
                var color = r.level === 'HIGH' ? '#c0392b' : r.level === 'MEDIUM' ? '#e67e22' : r.level === 'LOW' ? '#f39c12' : '#3498db';
                html += '<span style="background:' + color + '22;color:' + color + ';padding:3px 10px;border-radius:4px;font-size:.78rem;">';
                html += '<i class="fas fa-exclamation-triangle"></i> ' + faEscape(r.message) + '</span>';
            });
            html += '</div>';
        } else {
            html += '<div style="margin-top:10px;color:#27ae60;font-size:.82rem;"><i class="fas fa-check-circle"></i> Risk uyarısı yok — birleştirme güvenli</div>';
        }

        // WHY paneli — neden birleştirilebilir
        var common = (g.full_rules && g.full_rules[0]) ? g.full_rules[0] : {};
        html += '<div style="margin-top:12px;padding:10px;background:rgba(52,152,219,0.05);border-radius:4px;">';
        html += '<strong style="color:#3498db;font-size:.85rem;"><i class="fas fa-info-circle"></i> Neden birleştirilebilir?</strong><br>';
        html += '<div style="font-size:.82rem;margin-top:6px;">';
        // Zone bilgisi — FortiGate/PaloAlto'da gerçek zone adlarını göster
        if (common.src_zones && common.src_zones.length) {
            html += 'Bu ' + g.rule_count + ' kuralın <strong>action</strong>, zone: <code style="background:rgba(8,145,178,0.1);color:#0891b2;padding:1px 5px;border-radius:3px;font-size:.78rem;">' +
                faEscape(common.src_zones.join(', ')) + '</code> → <code style="background:rgba(8,145,178,0.1);color:#0891b2;padding:1px 5px;border-radius:3px;font-size:.78rem;">' +
                faEscape((common.dst_zones||[]).join(', ') || '?') + '</code>';
        } else {
            html += 'Bu ' + g.rule_count + ' kuralın <strong>action, src/dst zone</strong>';
        }
        if (g.merge_pattern === 'same_src_dst_action') html += ', <strong>src adresleri ve dst adresleri</strong>';
        else if (g.merge_pattern === 'same_src_svc_action') html += ', <strong>src adresleri ve servisleri</strong>';
        else if (g.merge_pattern === 'same_dst_svc_action') html += ', <strong>dst adresleri ve servisleri</strong>';
        html += ' tamamen aynı. Sadece <strong style="color:' + pl.color + ';">' + pl.diffLabel + '</strong> farklı.';
        html += ' <span class="fa-vendor-name">FortiGate</span> allow listesi olarak tek kuralda birden fazla değer kabul eder, dolayısıyla bu kurallar mantıksal olarak <strong>tek kurala indirgenebilir</strong>.';
        html += '</div></div>';

        // (CheckPoint Network grup / Access-role uyari banner'i kaldirildi — heuristik filter
        // grubu zaten otomatik bolup yalnizca homojen alt-gruplari oneriyor.)

        // Aksiyon butonlari (Bilgim Dahilinde / Aksiyon Alacagim)
        // Group signature: rule_ids birleskin imza
        var mergeGroupSig = 'merge:' + (g.group_key || (g.rule_ids||[]).join(',').substring(0,80) || 'grp');
        // Ack durumu (client-side cache veya backend g.ack_state)
        var ackState = g.ack_state || (window._mergeAckCache && window._mergeAckCache[mergeGroupSig]);
        if (ackState) {
            // Ack alinmis — duruma gore farkli ifade ve butonlar
            var stateConfig = {
                known:    { msg: 'Bu birlesme bilerek bu sekilde tutuluyor:', tag: 'Bilgim Dahilinde', icon: 'fa-check-circle', color: '#27ae60', bg: 'rgba(39,174,96,.08)', clearLbl: 'Geri Al', clearTitle: 'Bu kaydı kaldır, öneri tekrar aktif olsun' },
                fixing:   { msg: 'Bu birlesme uzerinde calisma yapilacak:',   tag: 'Aksiyon Alinacak', icon: 'fa-wrench',       color: '#16a085', bg: 'rgba(22,160,133,.08)', clearLbl: 'Vazgec',  clearTitle: 'Aksiyon planından vazgeç, öneri tekrar aktif olsun' },
                accepted: { msg: 'Risk kabul edildi:',                       tag: 'Kabul Edildi',    icon: 'fa-shield-alt',   color: '#8e44ad', bg: 'rgba(142,68,173,.08)', clearLbl: 'Kabuldan Vazgec', clearTitle: 'Kabulü iptal et' },
                fp:       { msg: 'False positive olarak isaretlendi:',       tag: 'False Positive',  icon: 'fa-ban',          color: '#7f8c8d', bg: 'rgba(127,140,141,.10)', clearLbl: "FP'den Vazgec",  clearTitle: 'FP işaretini kaldır' },
            };
            var sc2 = stateConfig[ackState] || { msg: 'Bu öneri işaretlendi:', tag: ackState, icon: 'fa-check', color: '#7f8c8d', bg: 'rgba(127,140,141,.08)', clearLbl: 'Geri Al', clearTitle: 'Kaldır' };
            html += '<div style="margin-top:10px;padding:8px 12px;background:' + sc2.bg + ';border-left:3px solid ' + sc2.color + ';border-radius:4px;font-size:.82rem;color:' + sc2.color + ';display:flex;align-items:center;gap:10px;flex-wrap:wrap;">' +
                '<span style="flex:1;"><i class="fas ' + sc2.icon + '"></i> ' + faEscape(sc2.msg) + ' <strong>' + faEscape(sc2.tag) + '</strong></span>' +
                '<button class="fa-btn fa-btn-sm" style="background:#fff;color:#c0392b;border:1px solid #e74c3c;" ' +
                'onclick="fireAuditMergeAckClear(\'' + faEscape(mergeGroupSig) + '\')" title="' + faEscape(sc2.clearTitle) + '">' +
                '<i class="fas fa-undo"></i> ' + faEscape(sc2.clearLbl) + '</button></div>';
        } else {
            html += '<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">' +
                '<button class="fa-btn fa-btn-sm" style="background:#d6eaf8;color:#1f618d;border:1px solid #3498db;" ' +
                'title="Bu birlesmeyi ben bilerek bu sekilde yaziyorum (Ack)" ' +
                'onclick="fireAuditMergeAck(\'' + faEscape(mergeGroupSig) + '\',\'known\')">' +
                '<i class="fas fa-check-circle"></i> Bilgim Dahilinde (Ack)</button>' +
                '<button class="fa-btn fa-btn-sm" style="background:#fef9e7;color:#7d6608;border:1px solid #f1c40f;" ' +
                'title="Bu birlesmeyi yapmayi planliyorum, takip et (Fixing)" ' +
                'onclick="fireAuditMergeAck(\'' + faEscape(mergeGroupSig) + '\',\'fixing\')">' +
                '<i class="fas fa-wrench"></i> Aksiyon Alacağım</button>' +
                '</div>';
        }

        // Detay paneli — collapse (overflow:auto sayfa sığsın)
        html += '<div id="' + groupId + '" class="fa-merge-detail" style="display:none;margin-top:12px;">';

        // BEFORE: tüm kurallar tablosu
        html += '<h5 style="margin-bottom:6px;color:var(--text-muted);"><i class="fas fa-times-circle" style="color:#c0392b;"></i> ÖNCE — ' + g.rule_count + ' ayrı kural</h5>';
        html += '<div class="fa-merge-table-wrap"><table class="fa-table fa-table-sm" style="font-size:.74rem;"><thead><tr>' +
                '<th>Rule ID</th><th>Adı</th><th>Action</th><th>src</th><th>dst</th><th>Servisler</th><th>UTM</th><th>Log</th><th>Hit</th><th>Son Kullanım</th><th>Comment</th>' +
                '</tr></thead><tbody>';
        (g.full_rules||[]).forEach(function(r) {
            var srcStr = (r.src_addresses||[]).join(', ').substring(0, 60);
            var dstStr = (r.dst_addresses||[]).join(', ').substring(0, 60);
            var svcStr = (r.services||[]).join(', ').substring(0, 50);
            var utm = r.utm_profiles && Object.keys(r.utm_profiles).length ? '✓' : '<span style="color:#e67e22">×</span>';
            var lastUsed = r.last_used ? faFormatTime(r.last_used) : '-';
            var hi = pl.diff;
            html += '<tr class="fa-clickable-row" onclick="fireAuditOpenRule(\'' + faEscape(r.rule_id) + '\')">';
            html += '<td>' + faFormatRuleId(r.rule_id) + '</td>';
            html += '<td>' + faEscape((r.name||'').substring(0,30)) + '</td>';
            html += '<td>' + faActionBadge(r.action) + '</td>';
            html += '<td' + (hi==='src_addresses'?' style="background:'+pl.color+'22;font-weight:600;"':'') + '>' + faEscape(srcStr) + '</td>';
            html += '<td' + (hi==='dst_addresses'?' style="background:'+pl.color+'22;font-weight:600;"':'') + '>' + faEscape(dstStr) + '</td>';
            html += '<td' + (hi==='services'?' style="background:'+pl.color+'22;font-weight:600;"':'') + '>' + faEscape(svcStr) + '</td>';
            html += '<td>' + utm + '</td>';
            html += '<td>' + (r.logging ? '✓' : '<span style="color:#e67e22">×</span>') + '</td>';
            html += '<td style="text-align:right;font-variant-numeric:tabular-nums;">' + (r.hit_count===0 ? '<span style="color:#c0392b;font-weight:700;" title="Dead rule">0</span>' : (r.hit_count!==null&&r.hit_count!==undefined?r.hit_count.toLocaleString():'-')) + '</td>';
            html += '<td style="font-size:.72rem;color:#5d6d7e;">' + lastUsed + '</td>';
            html += '<td title="' + faEscape(r.comments||'') + '">' + faEscape((r.comments||'-').substring(0,40)) + '</td>';
            html += '</tr>';
        });
        html += '</tbody></table></div>';

        // AFTER: birleşik kural önizleme
        var mp = g.merged_preview || {};
        html += '<h5 style="margin:14px 0 6px;color:var(--text-muted);"><i class="fas fa-check-circle" style="color:#27ae60;"></i> SONRA — tek birleşik kural</h5>';
        html += '<div class="fa-merge-table-wrap"><table class="fa-table fa-table-sm" style="font-size:.78rem;background:rgba(39,174,96,0.05);"><tbody>';
        html += '<tr><td><strong>Adı</strong></td><td>' + faEscape(mp.name || '-') + '</td></tr>';
        if (mp.src_zones && mp.src_zones.length) {
            html += '<tr><td><strong>src zones</strong></td><td><code>' + faEscape((mp.src_zones||[]).join(', ')) + '</code></td></tr>';
            html += '<tr><td><strong>dst zones</strong></td><td><code>' + faEscape((mp.dst_zones||[]).join(', ')) + '</code></td></tr>';
        }
        html += '<tr><td><strong>src adresleri</strong></td><td><code>' + faEscape((mp.src_addresses||[]).join(', ').substring(0,200)) + '</code></td></tr>';
        html += '<tr><td><strong>dst adresleri</strong></td><td><code>' + faEscape((mp.dst_addresses||[]).join(', ').substring(0,200)) + '</code></td></tr>';
        html += '<tr><td><strong>servisler</strong></td><td><code>' + faEscape((mp.services||[]).join(', ').substring(0,200)) + '</code></td></tr>';
        html += '<tr><td><strong>action</strong></td><td>' + faActionBadge(mp.action) + '</td></tr>';
        html += '<tr><td><strong>logging</strong></td><td>' + (mp.logging ? '✓' : '×') + '</td></tr>';
        html += '<tr><td><strong>comment</strong></td><td><em>' + faEscape(mp.comments||'') + '</em></td></tr>';
        html += '</tbody></table></div>';

        // CLI komut önerisi — vendor-aware (FortiGate / CheckPoint / Palo Alto / Cisco / Juniper)
        html += '<details style="margin-top:10px;">';
        html += '<summary style="cursor:pointer;color:#3498db;font-size:.82rem;"><i class="fas fa-terminal"></i> Önerilen CLI komutları (' + faVendorName() + ')</summary>';
        html += '<pre style="background:#1e272e;color:#00ff88;padding:10px;border-radius:4px;font-size:.75rem;margin-top:6px;overflow-x:auto;white-space:pre-wrap;">';
        html += faMergeableCli(mp, g.full_rules || []);
        html += '</pre></details>';

        html += '</div></div>';
        return html;
    }

    // ============================================================
    // Faz C: Policy Ordering Anomalies
    // ============================================================
    function loadOrdering() {
        var tbody = document.getElementById('fa-ord-tbody');
        tbody.innerHTML = '<tr><td colspan="8"><i class="fas fa-spinner fa-spin"></i></td></tr>';
        var type = document.getElementById('fa-ord-filter-type').value;
        var sev  = document.getElementById('fa-ord-filter-sev').value;
        window.__faKindFilter.ordering = window.__faKindFilter.ordering || 'all';

        faApi('ordering_anomalies', { type: type, severity: sev }).then(function(res) {
            if (!res.success) {
                tbody.innerHTML = '<tr><td colspan="8" style="color:#e74c3c;">Hata: ' + faEscape(res.error || '') + '</td></tr>';
                return;
            }
            var ts = res.type_summary || {};
            document.getElementById('fa-ord-corr').textContent = ts.correlation || 0;
            document.getElementById('fa-ord-gen').textContent  = ts.generalization || 0;
            document.getElementById('fa-ord-red').textContent  = ts.redundancy || 0;
            document.getElementById('fa-ord-total').textContent = res.total || 0;

            // Cross-kind ordering anomalilerini ele — sadece ayni kind icindeki kural ciftleri
            // (policy-policy, NAT-NAT, threat-threat) anlamlidir. Cross-kind anomaliler
            // mantiksal olarak gecersizdir (NAT katmani access katmaniyla ordering yapmaz).
            var rawAnomalies = res.anomalies || [];
            window.__faKindCache.ordering = rawAnomalies.filter(function(a) {
                var d = a.details || {};
                var ka = faRuleKind(d.rule_a_id || '');
                var kb = faRuleKind(a.rule_id || d.rule_b_id || '');
                if (!d.rule_a_id || !(a.rule_id || d.rule_b_id)) return true;
                return ka === kb;
            });
            _faRenderOrdering();
        }).catch(function(e) {
            tbody.innerHTML = '<tr><td colspan="8">Bağlantı hatası</td></tr>';
        });
    }
    window.__faRender_ordering = function() { _faRenderOrdering(); };
    function _faRenderOrdering() {
        var tbody = document.getElementById('fa-ord-tbody');
        if (!tbody) return;
        var all = window.__faKindCache.ordering || [];
        var kind = window.__faKindFilter.ordering || 'all';
        // Anomalide rule_id (geneellikle rule_b) + d.rule_a_id var; ikisinden herhangi
        // birinin kategorisi NAT ise NAT sayilir. Bu sekilde mixed gruplar her iki sub-tab'da gozukur.
        function _kindOfAnom(a) {
            var d = a.details || {};
            var ka = faRuleKind(d.rule_a_id || '');
            var kb = faRuleKind(a.rule_id || d.rule_b_id || '');
            // NAT ile karisirsa NAT bilgisi onceliklidir (kullanici NAT sub-tab'inda gormeli)
            if (ka === 'nat' || kb === 'nat') return 'nat';
            if (ka === 'threat' || kb === 'threat') return 'threat';
            if (ka === 'https' || kb === 'https') return 'https';
            if (ka === 'appurl' || kb === 'appurl') return 'appurl';
            return ka || kb || 'access';
        }
        // Kategori say
        var counts = { all: all.length, access: 0, nat: 0, threat: 0, https: 0, appurl: 0 };
        all.forEach(function(a) { var k = _kindOfAnom(a); if (counts[k] !== undefined) counts[k]++; });

        var list = kind === 'all' ? all : all.filter(function(a) { return _kindOfAnom(a) === kind; });

        // Toolbar render (tek seferlik DOM ekleme)
        var wrap = tbody.closest('.fa-tab-content');
        var toolbar = _faKindToolbar('ordering', counts);
        var oldBar = wrap && wrap.querySelector('.fa-kind-toolbar');
        if (oldBar) oldBar.outerHTML = toolbar;
        else if (wrap) {
            var tw = wrap.querySelector('.fa-table-wrapper');
            if (tw) tw.insertAdjacentHTML('beforebegin', toolbar);
        }
        document.querySelectorAll('#fa-tab-ordering .fa-kind-toolbar .fa-mode-btn').forEach(function(b){
            b.classList.toggle('active', b.getAttribute('data-kind') === kind);
        });

        if (!list.length) {
            tbody.innerHTML = '<tr><td colspan="8"><em style="color:#27ae60;"><i class="fas fa-check-circle"></i> Bu kategoride ordering anomali bulunamadi.</em></td></tr>';
            return;
        }

        var typeColors = {
            correlation:    { label: 'Correlation',    color: '#e67e22', icon: 'fa-project-diagram' },
            generalization: { label: 'Generalization', color: '#3498db', icon: 'fa-layer-group' },
            redundancy:     { label: 'Redundancy',     color: '#7f8c8d', icon: 'fa-copy' },
        };

        var html = '';
        list.forEach(function(a) {
                var tc = typeColors[a.anomaly_type] || { label: a.anomaly_type, color: '#95a5a6', icon: 'fa-question' };
                var color = faSevColor(a.severity);
                var d = a.details || {};
                var ruleAId = d.rule_a_id || '?';
                var ruleBId = d.rule_b_id || a.rule_id;
                var stateBadge = '';
                if (a.ack_state) {
                    var ackColors = { accepted: '#8e44ad', fp: '#7f8c8d', fixing: '#16a085', known: '#2980b9' };
                    stateBadge = faBadge(a.ack_state, ackColors[a.ack_state] || '#95a5a6');
                }

                var ordZoneA = '', ordZoneB = '';
                if (d.rule_a_src_zones || d.rule_a_dst_zones) {
                    ordZoneA = '<br><small style="color:#94a3b8;font-size:.66rem;"><i class="fas fa-layer-group"></i> ' +
                        faEscape((d.rule_a_src_zones||[]).join(',')||'?') + '→' +
                        faEscape((d.rule_a_dst_zones||[]).join(',')||'?') + '</small>';
                }
                if (d.rule_b_src_zones || d.rule_b_dst_zones) {
                    ordZoneB = '<br><small style="color:#94a3b8;font-size:.66rem;"><i class="fas fa-layer-group"></i> ' +
                        faEscape((d.rule_b_src_zones||[]).join(',')||'?') + '→' +
                        faEscape((d.rule_b_dst_zones||[]).join(',')||'?') + '</small>';
                }
                html += '<tr>' + faBulkCheckboxCell(a.finding_type, a.rule_id) +
                    '<td><span style="color:' + tc.color + ';"><i class="fas ' + tc.icon + '"></i> ' + faEscape(tc.label) + '</span></td>' +
                    '<td><a class="fa-rule-link" onclick="fireAuditOpenRule(\'' + faEscape(ruleAId) + '\')">' + faEscape(ruleAId) + '</a><br><small style="color:var(--text-muted);">' + faEscape((d.rule_a_name||'').substring(0,40)) + '</small>' + ordZoneA + '</td>' +
                    '<td><a class="fa-rule-link" onclick="fireAuditOpenRule(\'' + faEscape(ruleBId) + '\')">' + faEscape(ruleBId) + '</a><br><small style="color:var(--text-muted);">' + faEscape((d.rule_b_name||a.rule_name||'').substring(0,40)) + '</small>' + ordZoneB + '</td>' +
                    '<td>' + faBadge(a.severity, color) + '</td>' +
                    '<td class="fa-cell-small" style="max-width:280px;font-size:.78rem;">' + faEscape((d.flow_note || '').substring(0,150)) + '</td>' +
                    '<td class="fa-cell-small" style="max-width:280px;">' + faEscape(a.recommendation || '') + '</td>' +
                    '<td>' + (stateBadge || faAckButton(a.finding_type, a.rule_id, a.ack_state, a.severity)) + '</td>' +
                    '</tr>';
            });
        tbody.innerHTML = html;
    }
    window.loadOrdering = loadOrdering;

    window.fireAuditBulkSelectAllOrdering = function(on) {
        var cbs = document.querySelectorAll('#fa-ord-tbody input.fa-bulk-cb');
        for (var i = 0; i < cbs.length; i++) {
            cbs[i].checked = !!on;
            var t = cbs[i].getAttribute('data-bulk-type');
            var rid = cbs[i].getAttribute('data-rule-id');
            if (!t || !rid) continue;
            if (!faBulkSel[t]) faBulkSel[t] = {};
            if (on) faBulkSel[t][rid] = true;
            else delete faBulkSel[t][rid];
        }
        fireAuditBulkBarRender();
    };

    // ============================================================
    // Faz B: Implicit Trust Violations
    // ============================================================
    function loadImplicitTrust() {
        var tbody = document.getElementById('fa-it-tbody');
        tbody.innerHTML = '<tr><td colspan="8"><i class="fas fa-spinner fa-spin"></i></td></tr>';
        var sev = document.getElementById('fa-it-filter-severity').value;

        faApi('implicit_trust', { severity: sev }).then(function(res) {
            if (!res.success) {
                tbody.innerHTML = '<tr><td colspan="8" style="color:#e74c3c;">Hata: ' + faEscape(res.error || '') + '</td></tr>';
                return;
            }
            var s = res.summary || {};
            document.getElementById('fa-it-critical').textContent = s.CRITICAL || 0;
            document.getElementById('fa-it-high').textContent     = s.HIGH || 0;
            document.getElementById('fa-it-medium').textContent   = s.MEDIUM || 0;
            document.getElementById('fa-it-total').textContent    = res.total || 0;

            var violations = res.violations || [];
            if (!violations.length) {
                tbody.innerHTML = '<tr><td colspan="8"><em style="color:#27ae60;"><i class="fas fa-check-circle"></i> Yasak zone-pair paterni bulunamadı.</em></td></tr>';
                return;
            }

            var html = '';
            violations.forEach(function(v) {
                var color = faSevColor(v.severity);
                var d = v.details || {};
                var stateBadge = '';
                if (v.ack_state) {
                    var ackColors = { accepted: '#8e44ad', fp: '#7f8c8d', fixing: '#16a085', known: '#2980b9' };
                    stateBadge = faBadge(v.ack_state, ackColors[v.ack_state] || '#95a5a6');
                }

                var zoneDisplay = '';
                zoneDisplay += '<div style="font-size:.82rem;"><strong>' + faEscape(d.matched_src_zone || '?') + '</strong>';
                zoneDisplay += ' <span style="color:var(--text-muted);">(trust ' + (d.src_trust !== undefined ? d.src_trust : '?') + ')</span>';
                zoneDisplay += ' <i class="fas fa-arrow-right" style="color:' + color + ';"></i> ';
                zoneDisplay += '<strong>' + faEscape(d.matched_dst_zone || '?') + '</strong>';
                zoneDisplay += ' <span style="color:var(--text-muted);">(trust ' + (d.dst_trust !== undefined ? d.dst_trust : '?') + ')</span></div>';

                var patternList = '';
                var patterns = d.all_patterns || [];
                patternList += '<strong>' + faEscape(d.primary_pattern || '-') + '</strong>';
                if (patterns.length > 1) {
                    patternList += ' <span style="color:var(--text-muted);font-size:.75rem;">+' + (patterns.length - 1) + ' daha</span>';
                }
                patternList += '<div style="font-size:.72rem;color:var(--text-muted);margin-top:2px;">' + faEscape((d.reason || '').substring(0, 100)) + '</div>';

                html += '<tr>' + faBulkCheckboxCell('implicit_trust', v.rule_id) +
                    '<td><a class="fa-rule-link" onclick="fireAuditOpenRule(\'' + faEscape(v.rule_id) + '\')">' + faEscape(v.rule_id) + '</a></td>' +
                    '<td>' + faEscape(v.rule_name || '-') + '</td>' +
                    '<td>' + zoneDisplay + '</td>' +
                    '<td>' + patternList + '</td>' +
                    '<td>' + faBadge(v.severity, color) + '</td>' +
                    '<td class="fa-cell-small" style="max-width:280px;">' + faEscape(v.recommendation || '') + '</td>' +
                    '<td>' + (stateBadge || faAckButton('implicit_trust', v.rule_id, v.ack_state, v.severity)) + '</td>' +
                    '</tr>';
            });
            tbody.innerHTML = html;
        }).catch(function(e) {
            tbody.innerHTML = '<tr><td colspan="8">Bağlantı hatası</td></tr>';
        });
    }
    window.loadImplicitTrust = loadImplicitTrust;

    // Pattern management modal (Faz D: genisletilmis + YAML + dry-run)
    window.fireAuditShowImplicitTrustPatterns = function() {
        var existing = document.getElementById('fa-it-patterns-modal');
        if (existing) existing.remove();

        faApi('implicit_trust_patterns').then(function(res) {
            if (!res.success) { alert('Hata: ' + (res.error || '')); return; }
            var m = document.createElement('div');
            m.id = 'fa-it-patterns-modal';
            m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;z-index:9998;';

            var builtinHtml = '';
            (res.builtin || []).forEach(function(p) {
                builtinHtml += '<tr>' +
                    '<td><strong>' + faEscape(p.pattern_name) + '</strong><br><small style="color:var(--text-muted);">' + faEscape((p.reason||'').substring(0, 80)) + '</small></td>' +
                    '<td><code style="font-size:.75rem;">' + faEscape(p.src_regex) + '</code></td>' +
                    '<td><code style="font-size:.75rem;">' + faEscape(p.dst_regex) + '</code></td>' +
                    '<td>' + faBadge(p.severity, faSevColor(p.severity)) + '</td>' +
                    '<td><em style="color:var(--text-muted);">builtin</em></td>' +
                    '</tr>';
            });

            var customHtml = '';
            (res.custom || []).forEach(function(p) {
                var fields = [];
                if (p.service_regex) fields.push('svc~=<code>' + faEscape(p.service_regex) + '</code>');
                if (p.src_addr_regex) fields.push('src_addr~=<code>' + faEscape(p.src_addr_regex) + '</code>');
                if (p.dst_addr_regex) fields.push('dst_addr~=<code>' + faEscape(p.dst_addr_regex) + '</code>');
                if (p.except_src_regex) fields.push('!src~=<code>' + faEscape(p.except_src_regex) + '</code>');
                if (p.except_dst_regex) fields.push('!dst~=<code>' + faEscape(p.except_dst_regex) + '</code>');
                var extraFields = fields.length ? '<br><small style="color:var(--text-muted);font-size:.7rem;">' + fields.join(' · ') + '</small>' : '';

                customHtml += '<tr>' +
                    '<td><strong>' + faEscape(p.pattern_name) + '</strong>' +
                        (p.effect && p.effect !== 'forbid' ? ' <span style="background:#3498db22;color:#3498db;padding:1px 6px;border-radius:3px;font-size:.68rem;">' + faEscape(p.effect) + '</span>' : '') +
                        '<br><small style="color:var(--text-muted);">' + faEscape((p.reason||'').substring(0, 80)) + '</small>' + extraFields + '</td>' +
                    '<td><code style="font-size:.75rem;">' + faEscape(p.src_regex) + '</code></td>' +
                    '<td><code style="font-size:.75rem;">' + faEscape(p.dst_regex) + '</code></td>' +
                    '<td>' + faBadge(p.severity, faSevColor(p.severity)) + '</td>' +
                    '<td><button class="fa-btn fa-btn-sm" style="color:#c0392b;" onclick="fireAuditDeletePattern(\'' + faEscape(p.pattern_name) + '\')"><i class="fas fa-trash"></i></button></td>' +
                    '</tr>';
            });
            if (!customHtml) customHtml = '<tr><td colspan="5"><em style="color:var(--text-muted);">Henüz custom pattern yok.</em></td></tr>';

            m.innerHTML =
                '<div style="background:var(--card-bg,#fff);padding:20px 24px;border-radius:10px;max-width:1100px;width:95%;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.4);">' +
                '<h3 style="margin-top:0;display:flex;align-items:center;gap:10px;">' +
                  '<i class="fas fa-cog"></i> Implicit Trust Pattern Yönetimi' +
                  '<span style="flex:1"></span>' +
                  '<button class="fa-btn fa-btn-sm" onclick="fireAuditYamlExport()" title="YAML olarak indir"><i class="fas fa-file-export"></i> YAML Export</button>' +
                  '<button class="fa-btn fa-btn-sm" onclick="document.getElementById(\'fa-it-yaml-file\').click()" title="YAML dosyasından yükle"><i class="fas fa-file-import"></i> YAML Import</button>' +
                  '<input type="file" id="fa-it-yaml-file" accept=".yaml,.yml,text/yaml" style="display:none;" onchange="fireAuditYamlImport(this)">' +
                '</h3>' +
                '<p style="color:var(--text-muted);font-size:.85rem;">Builtin patternler silinemez. YAML ile GitOps-style pattern yönetimi yapabilirsiniz.</p>' +

                '<h4 style="margin-top:14px;">Builtin Patternler (' + (res.builtin||[]).length + ')</h4>' +
                '<div class="fa-table-wrapper" style="max-height:250px;overflow-y:auto;">' +
                '<table class="fa-table"><thead><tr><th>Ad / Açıklama</th><th>Src Regex</th><th>Dst Regex</th><th>Sev</th><th>Kaynak</th></tr></thead><tbody>' + builtinHtml + '</tbody></table></div>' +

                '<h4 style="margin-top:14px;">Custom Patternler (' + (res.custom||[]).length + ')</h4>' +
                '<div class="fa-table-wrapper">' +
                '<table class="fa-table"><thead><tr><th>Ad / Açıklama</th><th>Src Regex</th><th>Dst Regex</th><th>Sev</th><th>İşlem</th></tr></thead><tbody>' + customHtml + '</tbody></table></div>' +

                '<h4 style="margin-top:18px;">Yeni Pattern Ekle</h4>' +
                '<div style="background:var(--card-bg);padding:12px;border-radius:6px;border:1px solid var(--border-color);">' +

                // Temel alanlar
                '<div style="font-size:.8rem;color:var(--text-muted);margin-bottom:4px;">Temel (zorunlu)</div>' +
                '<div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:10px;margin-bottom:10px;">' +
                '<input id="fa-it-new-name" class="form-control" placeholder="Pattern adı (ör: Backup-Net→NAS-TCP445-only)">' +
                '<select id="fa-it-new-sev" class="form-select"><option value="CRITICAL">CRITICAL</option><option value="HIGH" selected>HIGH</option><option value="MEDIUM">MEDIUM</option><option value="LOW">LOW</option></select>' +
                '<select id="fa-it-new-effect" class="form-select" title="Effect"><option value="forbid" selected>Forbid (bulgu üret)</option><option value="warn">Warn (LOW)</option></select>' +
                '</div>' +
                '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">' +
                '<input id="fa-it-new-src" class="form-control" placeholder="Src zone regex (ör: ^dmz)">' +
                '<input id="fa-it-new-dst" class="form-control" placeholder="Dst zone regex (ör: ^(lan|prod))">' +
                '</div>' +

                // Opsiyonel filtreler
                '<details style="margin-bottom:10px;"><summary style="cursor:pointer;font-size:.85rem;color:var(--primary);"><i class="fas fa-plus-circle"></i> Gelişmiş filtreler (servis, address, exception)</summary>' +
                '<div style="margin-top:8px;padding:10px;background:var(--bg-color);border-radius:4px;">' +

                '<div style="font-size:.78rem;color:var(--text-muted);margin:6px 0 3px;">Service regex — yalnızca bu servislerde yasak (ör: <code>TCP/3389</code> sadece RDP için)</div>' +
                '<input id="fa-it-new-svc" class="form-control" placeholder="Service regex (örnek: ^TCP/(3389|445|22)$)">' +

                '<div style="font-size:.78rem;color:var(--text-muted);margin:10px 0 3px;">Source address regex (opsiyonel)</div>' +
                '<input id="fa-it-new-saddr" class="form-control" placeholder="Src address regex (ör: ^10\\.10\\.)">' +

                '<div style="font-size:.78rem;color:var(--text-muted);margin:10px 0 3px;">Destination address regex (opsiyonel)</div>' +
                '<input id="fa-it-new-daddr" class="form-control" placeholder="Dst address regex (ör: ^192\\.168\\.1\\.)">' +

                '<div style="font-size:.78rem;color:var(--text-muted);margin:10px 0 3px;">Exception — bu src <em>veya</em> dst eşleşirse pattern SKIP edilir (istisna, örn: <code>bastion</code> ise izin var)</div>' +
                '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">' +
                '<input id="fa-it-new-exsrc" class="form-control" placeholder="!src_addr (istisna)">' +
                '<input id="fa-it-new-exdst" class="form-control" placeholder="!dst_addr (istisna)">' +
                '</div>' +

                '</div></details>' +

                '<textarea id="fa-it-new-reason" class="form-control" placeholder="Neden yasak (açıklama, opsiyonel)" rows="2"></textarea>' +

                '<div style="display:flex;gap:8px;justify-content:space-between;align-items:center;margin-top:14px;">' +
                '<button class="fa-btn" onclick="fireAuditDryRunPattern()" title="Kaydetmeden mevcut kurallar üzerinde test et"><i class="fas fa-flask"></i> Dry-Run Test</button>' +
                '<div style="display:flex;gap:8px;">' +
                '<button class="fa-btn fa-btn-secondary" onclick="document.getElementById(\'fa-it-patterns-modal\').remove()">Kapat</button>' +
                '<button class="fa-btn fa-btn-primary" onclick="fireAuditSavePattern()"><i class="fas fa-save"></i> Pattern Ekle</button>' +
                '</div>' +
                '</div>' +

                '<div id="fa-it-dry-result" style="margin-top:12px;"></div>' +

                '</div>' +
                '</div>';
            document.body.appendChild(m);
        });
    };

    function _getPatternFields() {
        return {
            pattern_name: (document.getElementById('fa-it-new-name')||{}).value || '',
            severity:     (document.getElementById('fa-it-new-sev')||{}).value || 'HIGH',
            effect:       (document.getElementById('fa-it-new-effect')||{}).value || 'forbid',
            src_regex:    (document.getElementById('fa-it-new-src')||{}).value || '',
            dst_regex:    (document.getElementById('fa-it-new-dst')||{}).value || '',
            service_regex: (document.getElementById('fa-it-new-svc')||{}).value || '',
            src_addr_regex: (document.getElementById('fa-it-new-saddr')||{}).value || '',
            dst_addr_regex: (document.getElementById('fa-it-new-daddr')||{}).value || '',
            except_src_regex: (document.getElementById('fa-it-new-exsrc')||{}).value || '',
            except_dst_regex: (document.getElementById('fa-it-new-exdst')||{}).value || '',
            reason:       (document.getElementById('fa-it-new-reason')||{}).value || '',
        };
    }

    window.fireAuditDryRunPattern = function() {
        var box = document.getElementById('fa-it-dry-result');
        var f = _getPatternFields();
        if (!f.src_regex || !f.dst_regex) {
            box.innerHTML = '<div style="padding:8px;background:rgba(231,76,60,0.1);color:#c0392b;border-radius:4px;">src_regex ve dst_regex zorunlu.</div>';
            return;
        }
        box.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Test ediliyor...';
        var fd = new FormData();
        Object.keys(f).forEach(function(k) { fd.append(k, f[k]); });
        fd.append('fw_slug', FW_SLUG);
        fetch(API_BASE + '?action=implicit_trust_dry_run', {
            method: 'POST', credentials: 'same-origin', body: fd
        }).then(function(r){return r.json();}).then(function(res){
            if (!res.success) {
                box.innerHTML = '<div style="padding:8px;background:rgba(231,76,60,0.1);color:#c0392b;border-radius:4px;">Hata: ' + faEscape(res.error||'') + '</div>';
                return;
            }
            if (res.errors && res.errors.length) {
                box.innerHTML = '<div style="padding:8px;background:rgba(231,76,60,0.1);color:#c0392b;border-radius:4px;">Regex hataları:<br>' + res.errors.map(faEscape).join('<br>') + '</div>';
                return;
            }
            var html = '<div style="padding:12px;background:rgba(52,152,219,0.08);border-left:3px solid #3498db;border-radius:4px;">';
            html += '<strong>Dry-Run sonucu:</strong> ' + res.matched_count + ' / ' + res.total_rules + ' kural eşleşti.<br>';
            if (res.matched_count === 0) {
                html += '<em style="color:var(--text-muted);">Hiçbir mevcut kural bu pattern\'e uymuyor — pattern "temiz" kaydedilir.</em>';
            } else {
                html += '<details style="margin-top:8px;"><summary style="cursor:pointer;">Eşleşen kurallar (ilk ' + (res.matches||[]).length + ')</summary>';
                html += '<ul style="margin:6px 0 0 20px;font-size:.8rem;">';
                (res.matches || []).slice(0, 20).forEach(function(m) {
                    html += '<li><strong>' + faEscape(m.rule_id) + '</strong> ' + faEscape(m.rule_name||'') + ' — <code>' + faEscape(m.match_reason||'') + '</code></li>';
                });
                html += '</ul></details>';
            }
            html += '</div>';
            box.innerHTML = html;
        });
    };

    window.fireAuditYamlExport = function() {
        window.open(API_BASE + '?action=implicit_trust_yaml&fw_slug=' + encodeURIComponent(FW_SLUG), '_blank');
    };

    window.fireAuditYamlImport = function(input) {
        if (!input.files || !input.files[0]) return;
        if (!confirm('YAML dosyasi import edilecek. MEVCUT custom patternler saklansin mi, yoksa yerine koyulsun mu?\n\nOK = Ekle (mevcutler korunur, ayni isimliler güncellenir)\nIPTAL = Degistir (tum custom patternler silinir, yaml yuklenir)')) {
            var replace = '1';
            var msg = 'Mevcut tüm custom patternler silinip yenisi yüklenecek. Emin misin?';
            if (!confirm(msg)) return;
        } else {
            var replace = '0';
        }
        var fd = new FormData();
        fd.append('fw_slug', FW_SLUG);
        fd.append('yaml_file', input.files[0]);
        fd.append('replace', replace);
        fd.append('user', window.PORTAL_USER || 'yaml-import');
        fetch(API_BASE + '?action=implicit_trust_yaml', {
            method: 'POST', credentials: 'same-origin', body: fd
        }).then(function(r){return r.json();}).then(function(res){
            if (!res.success) {
                alert('Import hatası: ' + (res.error||''));
                return;
            }
            var msg = 'Import tamam: ' + res.imported + ' yüklendi';
            if (res.skipped) msg += ', ' + res.skipped + ' atlandı';
            if ((res.errors||[]).length) msg += '\n\nHatalar:\n' + res.errors.join('\n');
            alert(msg);
            fireAuditShowImplicitTrustPatterns();
        });
        input.value = '';
    };

    window.fireAuditSavePattern = function() {
        var f = _getPatternFields();
        f.pattern_name = f.pattern_name.trim();
        f.src_regex = f.src_regex.trim();
        f.dst_regex = f.dst_regex.trim();
        if (!f.pattern_name || !f.src_regex || !f.dst_regex) {
            alert('Pattern adı, src regex ve dst regex zorunlu.');
            return;
        }
        var fd = new FormData();
        fd.append('fw_slug', FW_SLUG);
        fd.append('user', window.PORTAL_USER || 'unknown');
        Object.keys(f).forEach(function(k){ fd.append(k, f[k]); });
        fetch(API_BASE + '?action=implicit_trust_patterns', {
            method: 'POST', credentials: 'same-origin', body: fd
        }).then(function(r){return r.json();}).then(function(res){
            if (res.success) {
                if (typeof faShowToast === 'function') faShowToast(res.message || 'Kaydedildi', 'success');
                fireAuditShowImplicitTrustPatterns();  // reload modal
            } else {
                alert('Hata: ' + (res.error || 'bilinmiyor'));
            }
        });
    };

    window.fireAuditDeletePattern = function(name) {
        if (!confirm('"' + name + '" paternini sil?')) return;
        fetch(API_BASE + '?action=implicit_trust_patterns&pattern_name=' + encodeURIComponent(name) +
              '&fw_slug=' + encodeURIComponent(FW_SLUG), {
            method: 'DELETE', credentials: 'same-origin'
        }).then(function(r){return r.json();}).then(function(res){
            if (res.success) fireAuditShowImplicitTrustPatterns();
            else alert('Hata: ' + (res.error || ''));
        });
    };

    window.fireAuditSaveZoneTrust = function(zoneName, btn) {
        var row = btn.closest('tr');
        var slider = row.querySelector('input[type="range"]');
        var trustLevel = parseInt(slider.value);
        var fd = new FormData();
        fd.append('fw_slug', FW_SLUG);
        fd.append('zone_name', zoneName);
        fd.append('trust_level', trustLevel);
        fd.append('user', window.PORTAL_USER || 'unknown');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        fetch(API_BASE + '?action=scoring_zone_trust', {
            method: 'POST', credentials: 'same-origin', body: fd
        }).then(function(r){return r.json();}).then(function(res){
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save"></i> Kaydet';
            if (res.success) {
                if (typeof faShowToast === 'function') faShowToast(res.message || 'Kaydedildi', 'success');
                loadZoneTrustCalibration();
            } else {
                alert('Hata: ' + (res.error || 'bilinmiyor'));
            }
        }).catch(function(err) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save"></i> Kaydet';
            alert('Bağlantı hatası: ' + err.message);
        });
    };

    // ---------- Admins tab ----------
    function loadAdmins() {
        var tbody = document.getElementById('fa-admin-tbody');
        tbody.innerHTML = '<tr><td colspan="6"><i class="fas fa-spinner fa-spin"></i></td></tr>';
        faApi('admins').then(function(res) {
            var note = document.getElementById('fa-admin-note');
            if (res.note) note.innerHTML = '<i class="fas fa-info-circle"></i> ' + faEscape(res.note);
            else note.innerHTML = '';
            if (!res.success || !res.admins.length) {
                tbody.innerHTML = '<tr><td colspan="6"><em>Admin listesi boş (API key profile izni yok olabilir).</em></td></tr>';
            } else {
                var html = '';
                res.admins.forEach(function(a) {
                    var mfa = a.two_factor && a.two_factor !== 'disable';
                    var th = a.trusthost || {};
                    var hosts = Object.keys(th).map(function(k){ return th[k]; }).filter(function(x){ return x && x !== '0.0.0.0 0.0.0.0'; });
                    html += '<tr><td><strong>' + faEscape(a.name) + '</strong></td>' +
                        '<td>' + faEscape(a.accprofile || '-') + '</td>' +
                        '<td>' + (mfa ? '<i class="fas fa-check-circle" style="color:#27ae60"></i> ' + faEscape(a.two_factor) : '<i class="fas fa-times-circle" style="color:#e74c3c"></i> Yok') + '</td>' +
                        '<td class="fa-cell-small">' + (hosts.length ? faEscape(hosts.join(', ')) : '<span style="color:#e67e22">tanımsız</span>') + '</td>' +
                        '<td class="fa-cell-small">' + faEscape((a.vdom || []).map(function(v){return typeof v==='object'?v.name:v;}).join(', ')) + '</td>' +
                        '<td class="fa-cell-small">' + faEscape(a.comments || '-') + '</td></tr>';
                });
                tbody.innerHTML = html;
            }
        });

        // Local users
        var lu = document.getElementById('fa-localuser-tbody');
        lu.innerHTML = '<tr><td colspan="5"><i class="fas fa-spinner fa-spin"></i></td></tr>';
        faApi('local_users').then(function(res) {
            if (!res.success || !res.users.length) { lu.innerHTML = '<tr><td colspan="5"><em>Local user yok.</em></td></tr>'; return; }
            var html = '';
            res.users.forEach(function(u) {
                var mfa = u.two_factor && u.two_factor !== 'disable';
                html += '<tr><td>' + faEscape(u.name) + '</td>' +
                    '<td>' + faEscape(u.status || '-') + '</td>' +
                    '<td>' + faEscape(u.type || '-') + '</td>' +
                    '<td>' + (mfa ? '<i class="fas fa-check" style="color:#27ae60"></i>' : '<i class="fas fa-times" style="color:#95a5a6"></i>') + '</td>' +
                    '<td>' + faEscape(u.email_to || '-') + '</td></tr>';
            });
            lu.innerHTML = html;
        });
    }

    // ---------- Diff tab (unchanged from v1) ----------
    function parseAuditCfgattr(s) {
        // FortiGate audit_log cfgattr formatı: "field[value]field2[value2]..."
        // veya field[old->new] (Edit'te değişim)
        // Veya "Add status[disable]uuid-idx[2410]srcintf[Local_Zone]..."
        if (!s) return {};
        var out = {};
        // Greedy regex — `]field[` arası boşluk veya hiç yok
        var re = /([\w-]+)\[([^\]]*)\]/g;
        var m;
        while ((m = re.exec(s)) !== null) {
            var key = m[1].toLowerCase();
            var val = m[2];
            // Edit syntax: "old->new" → sadece new'i al
            if (val.indexOf('->') >= 0) {
                val = val.split('->')[1].trim();
            }
            // Map FortiGate field name → bizim rule field name
            var keyMap = {
                'srcintf': 'src_zones',
                'dstintf': 'dst_zones',
                'srcaddr': 'src_addresses',
                'dstaddr': 'dst_addresses',
                'service': 'services',
                'action': 'action',
                'name': 'name',
                'status': 'status',
                'comments': 'comments',
                'logtraffic': 'logging',
                'schedule': 'schedule',
            };
            var mapped = keyMap[key] || key;
            // List type field'lar için space-split
            if (mapped === 'src_zones' || mapped === 'dst_zones' ||
                mapped === 'src_addresses' || mapped === 'dst_addresses' ||
                mapped === 'services') {
                out[mapped] = val.split(/\s+/).filter(function(x) { return x; });
            } else if (mapped === 'status') {
                out['enabled'] = val === 'enable';
            } else if (mapped === 'logging') {
                out['logging'] = val !== 'disable';
            } else {
                out[mapped] = val;
            }
        }
        return out;
    }
    window.parseAuditCfgattr = parseAuditCfgattr;

    function renderRuleSummary(rule) {
        // Silinen veya eklenen kuralın kompakt özeti — diff cell içinde
        if (!rule || typeof rule !== 'object') return '';
        var fields = [
            { key: 'name', label: 'Adı' },
            { key: 'action', label: 'Action' },
            { key: 'src_zones', label: 'Src Zone', list: true, requiresZones: true },
            { key: 'dst_zones', label: 'Dst Zone', list: true, requiresZones: true },
            { key: 'src_addresses', label: 'Source', list: true },
            { key: 'dst_addresses', label: 'Destination', list: true },
            { key: 'services', label: 'Service', list: true },
            { key: 'schedule', label: 'Zamanlama' },
            { key: 'comments', label: 'Yorum' },
        ];
        var html = '<table class="fa-rule-summary-table">';
        fields.forEach(function(f) {
            if (f.requiresZones && !window.FW_HAS_ZONES) return;
            var v = rule[f.key];
            if (v === undefined || v === null || v === '') return;
            if (Array.isArray(v) && v.length === 0) return;
            var display;
            if (f.list && Array.isArray(v)) {
                display = faListPreview(v, 5);
            } else if (f.key === 'action') {
                display = faActionBadge(String(v));
            } else {
                display = faEscape(String(v));
            }
            html += '<tr><th>' + f.label + '</th><td>' + display + '</td></tr>';
        });
        if (rule.enabled !== undefined) {
            html += '<tr><th>Enabled</th><td>' + (rule.enabled ? '✓' : '<span style="color:#95a5a6">disabled</span>') + '</td></tr>';
        }
        html += '</table>';
        return html;
    }

    function renderFieldDelta(field, oldVal, newVal) {
        // Liste karşılaştırması — eklenen + çıkarılan vurgula
        if (Array.isArray(oldVal) && Array.isArray(newVal)) {
            var oldSet = {}, newSet = {};
            oldVal.forEach(function(v) { oldSet[String(v)] = true; });
            newVal.forEach(function(v) { newSet[String(v)] = true; });
            var added = newVal.filter(function(v) { return !oldSet[String(v)]; });
            var removed = oldVal.filter(function(v) { return !newSet[String(v)]; });

            var html = '<div class="fa-delta-row"><strong>' + faEscape(field) + '</strong> ';
            html += '<small style="color:#7f8c8d">(' + oldVal.length + ' → ' + newVal.length + ' öğe)</small><br>';
            if (added.length) {
                html += '<span class="fa-delta-added">+ ' + added.map(faEscape).join(', ') + '</span>';
            }
            if (removed.length) {
                if (added.length) html += '<br>';
                html += '<span class="fa-delta-removed">− ' + removed.map(faEscape).join(', ') + '</span>';
            }
            if (!added.length && !removed.length) {
                html += '<small style="color:#95a5a6">Sadece sıralama değişti</small>';
            }
            // Tüm yeni listeyi de gizli detay olarak ekle
            html += '<details style="margin-top:4px;font-size:.75rem;color:#7f8c8d"><summary>tüm liste (' + newVal.length + ')</summary>' +
                faEscape(newVal.join(', ')) + '</details>';
            html += '</div>';
            return html;
        }

        // Dict karşılaştırması (utm_profiles vb.)
        if (oldVal && newVal && typeof oldVal === 'object' && typeof newVal === 'object'
            && !Array.isArray(oldVal) && !Array.isArray(newVal)) {
            var keys = {};
            Object.keys(oldVal).forEach(function(k) { keys[k] = true; });
            Object.keys(newVal).forEach(function(k) { keys[k] = true; });
            var html2 = '<div class="fa-delta-row"><strong>' + faEscape(field) + '</strong><br>';
            Object.keys(keys).forEach(function(k) {
                var ov = oldVal[k], nv = newVal[k];
                if (ov === nv) return;
                if (ov === undefined) html2 += '<span class="fa-delta-added">+ ' + faEscape(k) + ' = ' + faEscape(String(nv)) + '</span><br>';
                else if (nv === undefined) html2 += '<span class="fa-delta-removed">− ' + faEscape(k) + ' = ' + faEscape(String(ov)) + '</span><br>';
                else html2 += faEscape(k) + ': <s style="color:#c0392b">' + faEscape(String(ov)) + '</s> → <strong style="color:#27ae60">' + faEscape(String(nv)) + '</strong><br>';
            });
            return html2 + '</div>';
        }

        // Skaler (string/bool/int)
        return '<div class="fa-delta-row"><strong>' + faEscape(field) + ':</strong> ' +
            '<s class="fa-delta-removed-inline">' + faEscape(String(oldVal)) + '</s> → ' +
            '<strong class="fa-delta-added-inline">' + faEscape(String(newVal)) + '</strong></div>';
    }

    window.loadFireAuditDiff = function() {
        // Switch/router: ACL diff yerine ham config satır diff'i gösterilir (FireScope Faz 1a).
        // FortiGate/PaloAlto/CheckPoint için aşağıdaki mevcut ACL diff akışı hiç değişmeden çalışır.
        var isNetworkDevice = NETWORK_TYPES.indexOf(faCurrentFwType()) !== -1;
        var aclView = document.getElementById('fa-diff-acl-view');
        var configView = document.getElementById('fa-diff-config-view');
        if (aclView) aclView.style.display = isNetworkDevice ? 'none' : '';
        if (configView) configView.style.display = isNetworkDevice ? '' : 'none';
        if (isNetworkDevice) {
            // renderAuditActivity() (firewall ACL diff'ine özel) kendi kutusunu
            // #fa-diff-acl-view'in DIŞINA, doğrudan #fa-tab-diff'e ekliyor — bu
            // yüzden yukarıdaki display:none onu kapsamıyor. Önceki bir firewall
            // görüntülemesinden kalma içerik varsa (örn. başka bir cihazın audit
            // edit tarihçesi) burada açıkça temizlenir.
            var leakedAuditBox = document.getElementById('fa-audit-activity-box');
            if (leakedAuditBox) leakedAuditBox.innerHTML = '';
            loadFireAuditConfigDiff();
            return;
        }

        var tbody = document.getElementById('fa-diff-tbody');
        var totalsBox = document.getElementById('fa-diff-totals');
        var rangeBox = document.getElementById('fa-diff-range');
        var win = document.getElementById('fa-diff-window').value;
        tbody.innerHTML = '<tr><td colspan="4"><i class="fas fa-spinner fa-spin"></i></td></tr>';
        totalsBox.innerHTML = ''; rangeBox.textContent = '';
        faApi('diff', { window: win }).then(function(res) {
            if (!res.success) { tbody.innerHTML = '<tr><td colspan="6">Hata: ' + faEscape(res.error || '') + '</td></tr>'; return; }
            if (res.message) { tbody.innerHTML = '<tr><td colspan="6"><em>' + faEscape(res.message) + '</em></td></tr>'; return; }
            var t = res.totals || {};
            var transientPill = res.transient_count > 0
                ? ' <span class="fa-pill fa-pill-transient" title="Snapshot\'lar arasında oluşturulup silinen kurallar — snapshot bunları göremedi ama audit_log gördü">⟲ ' + res.transient_count + ' oluşturulup silindi</span>'
                : '';
            var ifaceTotals = (res.iface_changes || {}).totals || {};
            var zoneTotals  = (res.zone_changes  || {}).totals || {};
            var ifaceTotal  = (ifaceTotals.added||0) + (ifaceTotals.removed||0) + (ifaceTotals.modified||0);
            var zoneTotal   = (zoneTotals.added||0)  + (zoneTotals.removed||0)  + (zoneTotals.modified||0);
            totalsBox.innerHTML =
                '<span class="fa-pill fa-pill-added">+' + (t.added || 0) + ' eklendi</span> ' +
                '<span class="fa-pill fa-pill-removed">−' + (t.removed || 0) + ' silindi</span> ' +
                '<span class="fa-pill fa-pill-modified">~' + (t.modified || 0) + ' değişti</span>' +
                transientPill +
                (res.audit_log_matches ? ' <span class="fa-pill fa-pill-neutral">👤 ' + res.audit_log_matches + ' audit eşleşmesi</span>' : '') +
                (ifaceTotal ? ' <span class="fa-pill fa-pill-neutral" style="background:#6366f1;color:#fff"><i class="fas fa-ethernet"></i> ' + ifaceTotal + ' iface</span>' : '') +
                (zoneTotal  ? ' <span class="fa-pill fa-pill-neutral" style="background:#0891b2;color:#fff"><i class="fas fa-layer-group"></i> ' + zoneTotal + ' zone</span>' : '') +
                (res.iface_audit_count > 0 ? ' <span class="fa-pill fa-pill-neutral" style="background:#b45309;color:#fff" title="Snapshot net fark = 0 ama audit log bu interface/zone değişikliklerini yakaladı (geri alınmış olabilir)"><i class="fas fa-history"></i> ' + res.iface_audit_count + ' iface/zone audit</span>' : '');
            // Snapshot ne demek? — Her sync FortiGate kural setinin bir kopyasını saklar.
            // Diff = iki kopyanın farkı. Window seçimi kaç snapshot atlayacağımızı belirler.
            var humanRange = '';
            if (res.from_time && res.to_time) {
                var ms = (new Date(res.to_time.replace(' ', 'T') + 'Z') - new Date(res.from_time.replace(' ', 'T') + 'Z'));
                var hours = Math.round(ms / 3600000 * 10) / 10;
                var humanGap = hours < 1 ? Math.round(ms / 60000) + ' dk' :
                               hours < 24 ? hours + ' sa' :
                               Math.round(hours / 24 * 10) / 10 + ' gün';
                humanRange = ' &mdash; aralık: <strong>' + humanGap + '</strong>';
            }
            rangeBox.innerHTML = '<i class="fas fa-camera" title="Her sync ' + faVendorName() + ' kural setinin bir snapshot saklar. Burada snapshot #' + res.from_snapshot_id + ' ile #' + res.to_snapshot_id + ' karsilastiriliyor."></i> ' +
                'snapshot #' + (res.from_snapshot_id || '?') + ' → #' + (res.to_snapshot_id || '?') +
                (res.from_time ? ' &middot; <small>' + res.from_time + ' → ' + res.to_time + '</small>' : '') +
                humanRange;
            var rows = [];
            function addRow(type, item) {
                var d = item.details || {};
                var detail;
                if (type === 'modified' && d.delta) {
                    // FULL detay — tüm field delta'ları inline göster
                    detail = '';
                    for (var k in d.delta) {
                        detail += renderFieldDelta(k, d.delta[k].old, d.delta[k].new);
                    }
                    // Zone context — değişmemişse de mevcut zone bilgisini göster
                    if (!d.delta.src_zones && !d.delta.dst_zones) {
                        var mz_src = d.src_zones || (d.rule && d.rule.src_zones) || null;
                        var mz_dst = d.dst_zones || (d.rule && d.rule.dst_zones) || null;
                        if (mz_src || mz_dst) {
                            detail += '<div style="margin-top:5px;padding:3px 7px;background:rgba(8,145,178,0.08);border-left:3px solid #0891b2;border-radius:3px;font-size:.73rem;color:#0891b2;">' +
                                '<i class="fas fa-layer-group"></i> Zone (değişmedi): <strong>' +
                                faEscape((mz_src||[]).join(', ')||'?') + '</strong> → <strong>' +
                                faEscape((mz_dst||[]).join(', ')||'?') + '</strong></div>';
                        }
                    }
                } else if (type === 'added') {
                    detail = '<div class="fa-removed-summary">' +
                        '<strong style="color:#1e8449"><i class="fas fa-plus-circle"></i> Yeni kural oluşturuldu</strong>' +
                        renderRuleSummary(d) + '</div>';
                } else if (type === 'removed') {
                    detail = '<div class="fa-removed-summary">' +
                        '<strong style="color:#c0392b"><i class="fas fa-minus-circle"></i> Kural silindi — son hali:</strong>' +
                        renderRuleSummary(d) + '</div>';
                } else {
                    detail = '-';
                }
                // rule_kind — backend'den gelir, yoksa rule_id prefix'ten türet
                var rk = item.rule_kind;
                if (!rk) {
                    var rid = String(item.rule_id || '');
                    if (rid.indexOf('nat:') === 0) rk = 'nat';
                    else if (rid.indexOf('threat:') === 0) rk = 'threat';
                    else if (rid.indexOf('https:') === 0) rk = 'https';
                    else if (rid.indexOf('appurl:') === 0) rk = 'appurl';
                    else rk = 'access';
                }
                rows.push({
                    type: type,
                    rule_id: item.rule_id,
                    rule_kind: rk,
                    name: item.rule_name || d.name || '-',
                    detail: detail || '-',
                    changed_by: item.changed_by,
                    changed_at: item.changed_at,
                    change_action: item.change_action,
                    audit_history: item.audit_history || [],
                    audit_within_window: item.audit_within_window,
                    details: d,
                });
            }
            (res.added || []).forEach(function(a) { addRow('added', a); });
            (res.removed || []).forEach(function(r) { addRow('removed', r); });
            (res.modified || []).forEach(function(m) { addRow('modified', m); });
            // Transient (audit_log only) — snapshot diff göremez ama audit gördü
            (res.transient || []).forEach(function(tr) {
                var lastEv = tr.events && tr.events[tr.events.length - 1] || {};
                // Add event'inden silinen kuralın konfigürasyonunu parse et
                var addEv = tr.events.find(function(e) { return e.action === 'Add'; });
                var parsedRule = addEv ? parseAuditCfgattr(addEv.cfgattr || '') : {};
                var nameStr = parsedRule.name || tr.rule_id;
                rows.push({
                    type: 'transient',
                    rule_id: tr.rule_id,
                    name: faEscape(nameStr) + ' <em style="color:#7f8c8d;font-size:.7rem">' + faEscape(tr.label) + '</em>',
                    detail:
                        '<div class="fa-removed-summary" style="background:#f4f6f7;border-left:3px solid #7f8c8d;padding:8px;border-radius:4px;">' +
                        '<strong style="color:#566573"><i class="fas fa-history"></i> Lifecycle (' + tr.event_count + ' adım):</strong>' +
                        '<div style="margin:4px 0;font-size:.78rem">' +
                        tr.events.map(function(e) {
                            var icn = e.action === 'Add' ? 'fa-plus-circle' :
                                      e.action === 'Delete' ? 'fa-trash' :
                                      e.action === 'Move' ? 'fa-arrows-alt-v' : 'fa-pen';
                            var clr = e.action === 'Add' ? '#27ae60' :
                                      e.action === 'Delete' ? '#c0392b' :
                                      e.action === 'Edit' ? '#3498db' : '#7f8c8d';
                            return '<div><i class="fas ' + icn + '" style="color:' + clr + '"></i> <strong>' + faEscape(e.action) +
                                '</strong> @ ' + faEscape(e.log_datetime) +
                                ' <span style="color:#7f8c8d">by ' + faEscape(e.user || '?') + '</span></div>';
                        }).join('') + '</div>' +
                        (Object.keys(parsedRule).length > 1
                            ? '<details style="margin-top:6px"><summary style="cursor:pointer;color:#3498db;font-size:.78rem;"><i class="fas fa-search-plus"></i> Silinen kuralın son hali</summary>' +
                              renderRuleSummary(parsedRule) + '</details>'
                            : '') +
                        '</div>',
                    changed_by: (tr.users || []).join(', '),
                    changed_at: lastEv.log_datetime,
                    change_action: tr.lifecycle,
                    audit_history: tr.events,
                    audit_within_window: true,
                    details: Object.assign({ transient_lifecycle: tr.lifecycle, events: tr.events }, parsedRule),
                    transient_meta: tr,
                    parsed_rule: parsedRule,
                });
            });

            // Net değişen rule_id'leri Audit Activity render'ına iletmek için sakla
            lastDiffModifiedRules = {};
            (res.added || []).forEach(function(x) { lastDiffModifiedRules[x.rule_id] = true; });
            (res.removed || []).forEach(function(x) { lastDiffModifiedRules[x.rule_id] = true; });
            (res.modified || []).forEach(function(x) { lastDiffModifiedRules[x.rule_id] = true; });

            // Audit Activity paneli — snapshot diff'te net fark yoksa bile
            // bu pencerede yapılmış edit'leri burada göster
            renderAuditActivity(res.audit_activity || [], rows.length);
            renderIfaceZoneDiff(res.iface_changes, res.zone_changes, res.iface_audit_activity || []);

            if (!rows.length) {
                var emptyParts = [];
                if ((res.audit_activity || []).length > 0)
                    emptyParts.push(res.audit_activity.length + ' policy audit edit kaydı (geri alınmış olabilir)');
                if ((res.iface_audit_activity || []).length > 0)
                    emptyParts.push(res.iface_audit_activity.length + ' interface/zone audit edit kaydı');
                if (emptyParts.length) {
                    tbody.innerHTML = '<tr><td colspan="6"><em>Snapshot\'lar arasında <strong>net policy değişikliği yok</strong>. Ama bu pencerede ' +
                        emptyParts.join(' ve ') + ' var. Aşağıdaki panellerde detayları gör.</em></td></tr>';
                } else {
                    tbody.innerHTML = '<tr><td colspan="6"><em>Bu zaman aralığında değişiklik yok.</em></td></tr>';
                }
                return;
            }
            // Rule kind filter (All/Access/NAT/Threat/HTTPS/App) — header üstüne inject et
            var kindCounts = { access:0, nat:0, threat:0, https:0, appurl:0 };
            rows.forEach(function(r){ kindCounts[r.rule_kind] = (kindCounts[r.rule_kind]||0)+1; });
            var totalsBoxEl = document.getElementById('fa-diff-totals');
            if (totalsBoxEl && !document.getElementById('fa-diff-kind-filter')) {
                var kindBar = document.createElement('div');
                kindBar.id = 'fa-diff-kind-filter';
                kindBar.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap;margin-top:8px;';
                kindBar.innerHTML =
                    '<button class="fa-mode-btn active" data-kind="all" onclick="fireAuditDiffKindFilter(\'all\')">Tümü (<span id="fa-diff-cnt-all">0</span>)</button>' +
                    '<button class="fa-mode-btn" data-kind="access" onclick="fireAuditDiffKindFilter(\'access\')">Access (<span id="fa-diff-cnt-access">0</span>)</button>' +
                    '<button class="fa-mode-btn" data-kind="nat" onclick="fireAuditDiffKindFilter(\'nat\')">NAT (<span id="fa-diff-cnt-nat">0</span>)</button>' +
                    '<button class="fa-mode-btn" data-kind="threat" onclick="fireAuditDiffKindFilter(\'threat\')">Threat (<span id="fa-diff-cnt-threat">0</span>)</button>' +
                    '<button class="fa-mode-btn" data-kind="https" onclick="fireAuditDiffKindFilter(\'https\')">HTTPS (<span id="fa-diff-cnt-https">0</span>)</button>' +
                    '<button class="fa-mode-btn" data-kind="appurl" onclick="fireAuditDiffKindFilter(\'appurl\')">App/URL (<span id="fa-diff-cnt-appurl">0</span>)</button>';
                totalsBoxEl.appendChild(kindBar);
            }
            // Sayıları güncelle
            var totalC = rows.length;
            var setCnt = function(id, n){ var el=document.getElementById(id); if(el) el.textContent=n; };
            setCnt('fa-diff-cnt-all', totalC);
            Object.keys(kindCounts).forEach(function(k){ setCnt('fa-diff-cnt-'+k, kindCounts[k]); });

            var html = '';
            // Stash rows for click handler
            window.__faDiffRows = {};
            rows.forEach(function(r, idx) {
                var key = r.type + ':' + r.rule_id + ':' + idx;
                window.__faDiffRows[key] = r;
                var cls = 'fa-diff-' + r.type;
                var icon = r.type==='added'?'fa-plus':
                           r.type==='removed'?'fa-minus':
                           r.type==='transient'?'fa-history':'fa-pen';
                var lbl = r.type==='added'?'Eklendi':
                          r.type==='removed'?'Silindi':
                          r.type==='transient'?'Oluşturulup silindi':'Değişti';
                var outOfWindow = r.changed_by && r.audit_within_window === false;
                var userHtml;
                if (r.changed_by) {
                    userHtml = '<strong>' + faEscape(r.changed_by) + '</strong>' +
                        (r.change_action ? ' <small>(' + faEscape(r.change_action) + ')</small>' : '') +
                        (outOfWindow ? ' <span title="Bu kullanıcı kayıtlı son değişikliği yapmış ama snapshot zaman aralığının DIŞINDA. Audit log fetch frekansı snapshot ile senkron değil." style="color:#7f8c8d;font-size:.7rem;">⚠ window dışı</span>' : '');
                } else {
                    userHtml = '<em style="color:#95a5a6" title="Bu kural icin audit_log kaydi yok. Sebepler: (1) ' + faVendorName() + ' event log devre disi, (2) audit log fetch henuz calismadi, (3) kural degistirilmemis &mdash; snapshot diff baska nedenden tetiklenmis.">—</em>';
                }
                var whenHtml = r.changed_at ? '<small title="UTC: ' + faEscape(r.changed_at) + '">' + faFormatTime(r.changed_at, {seconds:true, tzTag:true}) + '</small>' : '<em style="color:#95a5a6">—</em>';
                // Rule link davranışı: transient/removed/added için diff detail modal aç
                // (kural artık DB'de yok veya yeni eklendi, OpenRule "Kural bulunamadı" verir)
                var ruleLinkAction = (r.type === 'transient' || r.type === 'removed')
                    ? 'fireAuditOpenDiffDetail(\'' + faEscape(r.rule_id) + '\', Object.assign({_type:\'' + r.type + '\'}, window.__faDiffRows[\'' + faEscape(key) + '\']))'
                    : 'fireAuditOpenRule(\'' + faEscape(r.rule_id) + '\')';
                html += '<tr class="' + cls + ' fa-diff-row fa-diff-kind-' + r.rule_kind + '" style="cursor:pointer" ' +
                    'onclick="fireAuditOpenDiffDetail(\'' + faEscape(r.rule_id) + '\', Object.assign({_type:\'' + r.type + '\'}, window.__faDiffRows[\'' + faEscape(key) + '\']))">' +
                    '<td><span class="fa-diff-badge ' + cls + '"><i class="fas ' + icon + '"></i> ' + lbl + '</span></td>' +
                    '<td>' + faFormatRuleId(r.rule_id) + '</td>' +
                    '<td>' + faEscape(r.name) + '</td>' +
                    '<td>' + userHtml + '</td>' +
                    '<td>' + whenHtml + '</td>' +
                    '<td>' + r.detail + '</td></tr>';
            });
            tbody.innerHTML = html;
        });
    };

    // Switch/router icin ham config satır diff'i (FireScope Faz 1a) — FortiGate ACL
    // diff'inden (yukarıdaki loadFireAuditDiff) tamamen bağımsız, ek bir görünüm.
    // fireaudit_config_diff.py::NOISE_PATTERNS ile aynı — vendor'a göre her
    // fetch'te değişen ama gerçek bir config değişikliği olmayan satırlar.
    var FA_CFGDIFF_NOISE_RE = [
        /^\s*!\s*Last configuration change at/i,
        /^\s*!\s*NVRAM config last updated/i,
        /^\s*Building configuration/i,
        /^\s*Current configuration\s*:\s*\d+\s*bytes/i,
        /^\s*##\s*Last (changed|commit)/i,
        /^\s*!\s*Time\s*:/i,
        /^\s*!\s*$/,
    ];
    function _faCfgDiffStripNoise(text) {
        return (text || '').split('\n').filter(function(line) {
            return !FA_CFGDIFF_NOISE_RE.some(function(re) { return re.test(line); });
        });
    }

    // git-diff tarzı hunk: uzun "equal" bloklarının sadece baş/son birkaç
    // satırı gösterilir, ortası tek bir özet satırına indirgenir.
    var FA_CFGDIFF_CONTEXT = 3;

    // Config diff render yardımcıları — hem "zaman içi" (loadFireAuditConfigDiff)
    // hem "cihazlar arası" (loadFireAuditConfigDiffDevices) modu tarafından
    // paylaşılır.
    function _faCfgDiffLineHtml(cls, prefix, text) {
        return '<div class="' + cls + '">' + faEscape(prefix + ' ' + text) + '</div>';
    }
    // side: 'l' (silinen/eski) veya 'r' (eklenen/yeni). faEscape her parçaya
    // ayrı uygulanır — birleşik HTML'i tekrar escape etmemek için.
    function _faCfgDiffIntralineHtml(d, side) {
        var pre = d[side + 'Pre'], mid = d[side + 'Mid'], suf = d[side + 'Suf'];
        var midClass = side === 'l' ? 'fa-cfgdiff-intraline-rem' : 'fa-cfgdiff-intraline-add';
        return faEscape(pre) + (mid ? '<span class="' + midClass + '">' + faEscape(mid) + '</span>' : '') + faEscape(suf);
    }

    function _faCfgDiffRenderOps(ops, onlyDiff) {
        var lineHtml = _faCfgDiffLineHtml, intralineHtml = _faCfgDiffIntralineHtml;
            var engine = window.FireScopeDiffEngine;
            var added = 0, removed = 0;
            var html = '';

            if (ops.length === 1 && ops[0].type === 'equal') {
                return { html: '', added: 0, removed: 0 };
            }

            ops.forEach(function(op, idx) {
                if (op.type === 'equal') {
                    if (onlyDiff) return;
                    var block = op.left;
                    var n = block.length;
                    var isFirst = (idx === 0), isLast = (idx === ops.length - 1);
                    var show;
                    if (isFirst && !isLast) {
                        show = n > FA_CFGDIFF_CONTEXT ? block.slice(-FA_CFGDIFF_CONTEXT) : block;
                        show.forEach(function(l) { html += lineHtml('fa-cfgdiff-context', ' ', l); });
                    } else if (isLast && !isFirst) {
                        show = n > FA_CFGDIFF_CONTEXT ? block.slice(0, FA_CFGDIFF_CONTEXT) : block;
                        show.forEach(function(l) { html += lineHtml('fa-cfgdiff-context', ' ', l); });
                    } else if (n <= 2 * FA_CFGDIFF_CONTEXT) {
                        block.forEach(function(l) { html += lineHtml('fa-cfgdiff-context', ' ', l); });
                    } else {
                        block.slice(0, FA_CFGDIFF_CONTEXT).forEach(function(l) { html += lineHtml('fa-cfgdiff-context', ' ', l); });
                        html += '<div class="fa-cfgdiff-gap">… ' + (n - 2 * FA_CFGDIFF_CONTEXT) + ' satır değişmedi …</div>';
                        block.slice(-FA_CFGDIFF_CONTEXT).forEach(function(l) { html += lineHtml('fa-cfgdiff-context', ' ', l); });
                    }
                } else if (op.type === 'remove') {
                    op.left.forEach(function(l) { html += lineHtml('fa-cfgdiff-remove', '-', l); removed++; });
                } else if (op.type === 'add') {
                    op.right.forEach(function(l) { html += lineHtml('fa-cfgdiff-add', '+', l); added++; });
                } else if (op.type === 'replace') {
                    var len = Math.max(op.left.length, op.right.length);
                    for (var i = 0; i < len; i++) {
                        var lLine = i < op.left.length ? op.left[i] : null;
                        var rLine = i < op.right.length ? op.right[i] : null;
                        if (lLine != null && rLine != null && engine) {
                            var d = engine.intralineDiff(lLine, rLine);
                            html += '<div class="fa-cfgdiff-remove">' + faEscape('- ') + intralineHtml(d, 'l') + '</div>';
                            html += '<div class="fa-cfgdiff-add">' + faEscape('+ ') + intralineHtml(d, 'r') + '</div>';
                            removed++; added++;
                        } else {
                            if (lLine != null) { html += lineHtml('fa-cfgdiff-remove', '-', lLine); removed++; }
                            if (rLine != null) { html += lineHtml('fa-cfgdiff-add', '+', rLine); added++; }
                        }
                    }
                }
            });

        return { html: html, added: added, removed: removed };
    }

    function loadFireAuditConfigDiff() {
        var linesBox = document.getElementById('fa-cfgdiff-lines');
        var totalsBox = document.getElementById('fa-cfgdiff-totals');
        var rangeBox = document.getElementById('fa-cfgdiff-range');
        var fromSel = document.getElementById('fa-cfgdiff-from');
        var toSel = document.getElementById('fa-cfgdiff-to');
        if (!linesBox) return;

        var currentFromId = null, currentToId = null;

        function renderDiff() {
            var f = fromSel ? fromSel.value : '';
            var t = toSel ? toSel.value : '';
            var fromId = f || currentFromId;
            var toId = t || currentToId;
            if (!fromId || !toId) {
                linesBox.innerHTML = '<em>Config diff için en az 2 raw config snapshot gerekli — sync bekleniyor.</em>';
                return;
            }
            linesBox.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            totalsBox.innerHTML = ''; rangeBox.textContent = '';

            Promise.all([
                faApi('raw_config', { snapshot_id: fromId }),
                faApi('raw_config', { snapshot_id: toId }),
            ]).then(function(results) {
                var fromRes = results[0], toRes = results[1];
                if (!fromRes.success || !toRes.success) {
                    linesBox.textContent = 'Hata: ' + (fromRes.error || toRes.error || 'raw config alınamadı');
                    return;
                }
                var engine = window.FireScopeDiffEngine;
                if (!engine) {
                    linesBox.textContent = 'Hata: diff motoru yüklenemedi (BackupCompare.js).';
                    return;
                }
                var ignoreWs = !!(document.getElementById('fa-cfgdiff-ignore-ws') || {}).checked;
                var onlyDiff = !!(document.getElementById('fa-cfgdiff-only-diff') || {}).checked;
                var norm = ignoreWs ? function(s) { return s.replace(/\s+/g, ' ').trim(); } : function(s) { return s; };

                var leftLines = _faCfgDiffStripNoise(fromRes.config_text);
                var rightLines = _faCfgDiffStripNoise(toRes.config_text);
                var ops = engine.diffLines(leftLines, rightLines, norm);
                var result = _faCfgDiffRenderOps(ops, onlyDiff);

                totalsBox.innerHTML =
                    '<span class="fa-pill fa-pill-added">+' + result.added + '</span> ' +
                    '<span class="fa-pill fa-pill-removed">−' + result.removed + '</span>';
                rangeBox.innerHTML = 'snapshot #' + fromId + ' → #' + toId +
                    ' &middot; <small>' + faEscape(faFormatTime(fromRes.snapshot_at, {seconds:true})) +
                    ' → ' + faEscape(faFormatTime(toRes.snapshot_at, {seconds:true})) + '</small>';
                linesBox.innerHTML = result.html || '<em>Fark yok (config değişmedi).</em>';
            }).catch(function(err) {
                linesBox.textContent = 'Bağlantı hatası: ' + err.message;
            });
        }

        faApi('config_snapshots', {}).then(function(res) {
            var snaps = (res && res.snapshots) || [];
            if (fromSel && toSel) {
                var opts = snaps.map(function(s) {
                    return '<option value="' + s.id + '">#' + s.id + ' — ' + faEscape(faFormatTime(s.snapshot_at, {seconds:true})) + '</option>';
                }).join('');
                fromSel.innerHTML = '<option value="">(otomatik: önceki)</option>' + opts;
                toSel.innerHTML = '<option value="">(otomatik: son)</option>' + opts;
            }
            if (snaps.length < 2) {
                linesBox.innerHTML = '<em>Config diff için en az 2 raw config snapshot gerekli — sync bekleniyor.</em>';
                return;
            }
            // snaps ORDER BY id DESC geliyor: [0]=son, [1]=önceki
            currentToId = snaps[0].id;
            currentFromId = snaps[1].id;
            renderDiff();
        });

        window.__faCfgDiffCompare = renderDiff;
    }

    // ---------- Cihazlar arası (HA/eş) config karşılaştırma ----------
    // NetOptVault'un "Compare & Match" özelliğine karşılık gelir — aynı
    // altyapıyı (raw config + LCS diff motoru) kullanır, sadece "aynı cihazın
    // iki zamanı" yerine "iki farklı cihazın en sonu" karşılaştırılır.
    var _faCfgDiffMode = 'time';

    window.__faCfgDiffSetMode = function(mode) {
        _faCfgDiffMode = mode;
        var panel = document.getElementById('fa-diff-config-view');
        if (panel) {
            panel.querySelectorAll('.fa-fw-picker-type-btn').forEach(function(b) {
                b.classList.toggle('active', b.getAttribute('data-mode') === mode);
            });
        }
        var timeC = document.getElementById('fa-cfgdiff-time-controls');
        var devC = document.getElementById('fa-cfgdiff-device-controls');
        if (timeC) timeC.style.display = mode === 'time' ? '' : 'none';
        if (devC) devC.style.display = mode === 'device' ? '' : 'none';
        if (mode === 'device') {
            _faPopulateCfgDiffDeviceSelects();
        } else {
            window.__faCfgDiffCompare && window.__faCfgDiffCompare();
        }
    };

    window.__faCfgDiffRerender = function() {
        if (_faCfgDiffMode === 'device') {
            window.__faCfgDiffCompareDevices && window.__faCfgDiffCompareDevices();
        } else {
            window.__faCfgDiffCompare && window.__faCfgDiffCompare();
        }
    };

    function _faPopulateCfgDiffDeviceSelects() {
        var selA = document.getElementById('fa-cfgdiff-device-a');
        var selB = document.getElementById('fa-cfgdiff-device-b');
        if (!selA || !selB) return;
        var netDevices = (firewallList || []).filter(function(fw) {
            return fw.is_active && NETWORK_TYPES.indexOf(fw.firewall_type || '') !== -1;
        });
        var opts = netDevices.map(function(fw) {
            return '<option value="' + faEscape(fw.slug) + '">' + faEscape(fw.name) + ' (' + faEscape(fw.environment || '') + ')</option>';
        }).join('');
        selA.innerHTML = opts;
        selB.innerHTML = opts;
        // Varsayılan: mevcut cihaz A, listede ondan sonraki cihaz B
        var curIdx = netDevices.findIndex(function(fw) { return fw.slug === FW_SLUG; });
        if (curIdx !== -1) selA.value = FW_SLUG;
        if (netDevices.length > 1) {
            var bIdx = curIdx !== -1 ? (curIdx + 1) % netDevices.length : 1 % netDevices.length;
            selB.value = netDevices[bIdx].slug;
        }
        window.__faCfgDiffCompareDevices();
    }

    function _faFetchLatestRawConfig(slug) {
        return fetch(API_BASE + '?action=config_snapshots&fw_slug=' + encodeURIComponent(slug), { credentials: 'same-origin' })
            .then(function(r) { return r.json(); })
            .then(function(res) {
                var snaps = (res && res.snapshots) || [];
                if (!snaps.length) return null;
                var latestId = snaps[0].id;
                return fetch(API_BASE + '?action=raw_config&fw_slug=' + encodeURIComponent(slug) + '&snapshot_id=' + latestId, { credentials: 'same-origin' })
                    .then(function(r) { return r.json(); })
                    .then(function(res2) { return res2.success ? res2 : null; });
            });
    }

    window.__faCfgDiffCompareDevices = function() {
        var linesBox = document.getElementById('fa-cfgdiff-lines');
        var totalsBox = document.getElementById('fa-cfgdiff-totals');
        var rangeBox = document.getElementById('fa-cfgdiff-device-range');
        var selA = document.getElementById('fa-cfgdiff-device-a');
        var selB = document.getElementById('fa-cfgdiff-device-b');
        if (!linesBox || !selA || !selB) return;
        var slugA = selA.value, slugB = selB.value;
        if (!slugA || !slugB) return;
        if (slugA === slugB) {
            linesBox.innerHTML = '<em>Farklı iki cihaz seçin.</em>';
            return;
        }

        linesBox.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        if (totalsBox) totalsBox.innerHTML = '';
        if (rangeBox) rangeBox.textContent = '';

        Promise.all([_faFetchLatestRawConfig(slugA), _faFetchLatestRawConfig(slugB)]).then(function(results) {
            var resA = results[0], resB = results[1];
            if (!resA || !resB) {
                linesBox.innerHTML = '<em>Bir veya iki cihazda henüz raw config snapshot yok — sync bekleniyor.</em>';
                return;
            }
            var engine = window.FireScopeDiffEngine;
            if (!engine) {
                linesBox.textContent = 'Hata: diff motoru yüklenemedi (BackupCompare.js).';
                return;
            }
            var ignoreWs = !!(document.getElementById('fa-cfgdiff-ignore-ws') || {}).checked;
            var onlyDiff = !!(document.getElementById('fa-cfgdiff-only-diff') || {}).checked;
            var norm = ignoreWs ? function(s) { return s.replace(/\s+/g, ' ').trim(); } : function(s) { return s; };

            var leftLines = _faCfgDiffStripNoise(resA.config_text);
            var rightLines = _faCfgDiffStripNoise(resB.config_text);
            var ops = engine.diffLines(leftLines, rightLines, norm);
            var result = _faCfgDiffRenderOps(ops, onlyDiff);

            if (totalsBox) {
                totalsBox.innerHTML =
                    '<span class="fa-pill fa-pill-added">+' + result.added + '</span> ' +
                    '<span class="fa-pill fa-pill-removed">−' + result.removed + '</span>';
            }
            if (rangeBox) {
                rangeBox.innerHTML = faEscape(slugA) + ' (#' + resA.snapshot_id + ') vs ' + faEscape(slugB) + ' (#' + resB.snapshot_id + ')' +
                    ' &middot; <small>' + faEscape(faFormatTime(resA.snapshot_at, {seconds:true})) +
                    ' / ' + faEscape(faFormatTime(resB.snapshot_at, {seconds:true})) + '</small>';
            }
            linesBox.innerHTML = result.html || '<em>Fark yok — iki cihazın config\'i (gürültü hariç) aynı.</em>';
        }).catch(function(err) {
            linesBox.textContent = 'Bağlantı hatası: ' + err.message;
        });
    };

    // rule_kind client-side filter
    window.fireAuditDiffKindFilter = function(kind) {
        document.querySelectorAll('#fa-diff-kind-filter .fa-mode-btn').forEach(function(b){
            b.classList.toggle('active', b.getAttribute('data-kind') === kind);
        });
        document.querySelectorAll('.fa-diff-row').forEach(function(tr){
            if (kind === 'all') { tr.style.display = ''; return; }
            tr.style.display = tr.classList.contains('fa-diff-kind-' + kind) ? '' : 'none';
        });
    };

    function renderIfaceZoneDiff(ifaceChanges, zoneChanges, ifaceAuditActivity) {
        var section = document.getElementById('fa-diff-iface-section');
        var content = document.getElementById('fa-diff-iface-content');
        if (!section || !content) return;
        var ic = ifaceChanges || { added:[], removed:[], modified:[], totals:{added:0,removed:0,modified:0} };
        var zc = zoneChanges  || { added:[], removed:[], modified:[], totals:{added:0,removed:0,modified:0} };
        var ia = ifaceAuditActivity || [];
        var hasIface = (ic.added.length + ic.removed.length + ic.modified.length) > 0;
        var hasZone  = (zc.added.length + zc.removed.length + zc.modified.length) > 0;
        var hasIfaceAudit = ia.length > 0;
        if (!hasIface && !hasZone && !hasIfaceAudit) { section.style.display = 'none'; return; }
        section.style.display = 'block';

        function statusBadge(val) {
            if (!val || val === 'null') return '<em style="color:#95a5a6">—</em>';
            var bg = val === 'up' ? '#27ae60' : val === 'down' ? '#c0392b' : '#6b7280';
            return '<span style="background:' + bg + ';color:#fff;padding:1px 7px;border-radius:3px;font-size:.75rem;font-weight:700">' + faEscape(val) + '</span>';
        }
        function fv(v) { return v != null ? String(v) : '—'; }
        function fieldCell(type, delta, obj, f) {
            if (type === 'modified' && delta[f]) {
                var o = fv(delta[f].old), n = fv(delta[f].new);
                if (f === 'status') return statusBadge(o) + ' → ' + statusBadge(n);
                return '<del style="color:#c0392b;font-size:.82em">' + faEscape(o) + '</del> → <strong style="color:#27ae60">' + faEscape(n) + '</strong>';
            }
            if (f === 'status') return statusBadge(fv(obj[f]));
            return faEscape(fv(obj[f]));
        }

        var html = '';

        if (hasIface) {
            html += '<div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">' +
                '<i class="fas fa-ethernet"></i> Interface &nbsp;' +
                '<span class="fa-pill fa-pill-added">+' + ic.totals.added + '</span> ' +
                '<span class="fa-pill fa-pill-removed">−' + ic.totals.removed + '</span> ' +
                '<span class="fa-pill fa-pill-modified">~' + ic.totals.modified + '</span></div>';
            html += '<div class="fa-table-wrapper"><table class="fa-table fa-table-sm"><thead><tr>' +
                '<th>Δ</th><th>İsim</th><th>Tip</th><th>IP Adresi</th><th>Durum</th><th>VLAN ID</th><th>Alias</th>' +
                '</tr></thead><tbody>';
            ['added','removed','modified'].forEach(function(type) {
                (ic[type]||[]).forEach(function(i) {
                    var delta = i.delta || {};
                    var marker = type==='added' ? '+' : type==='removed' ? '−' : 'Δ';
                    var cls = 'fa-diff-' + type;
                    html += '<tr class="' + cls + '">' +
                        '<td><span class="fa-diff-badge ' + cls + '">' + marker + '</span></td>' +
                        '<td><strong>' + faEscape(i.name||'') + '</strong></td>' +
                        '<td>' + fieldCell(type, delta, i, 'type') + '</td>' +
                        '<td style="font-family:monospace;font-size:.82em">' + fieldCell(type, delta, i, 'ip') + '</td>' +
                        '<td>' + fieldCell(type, delta, i, 'status') + '</td>' +
                        '<td>' + fieldCell(type, delta, i, 'vlanid') + '</td>' +
                        '<td style="color:var(--text-muted);font-size:.85em">' + fieldCell(type, delta, i, 'alias') + '</td>' +
                        '</tr>';
                });
            });
            html += '</tbody></table></div>';
        }

        if (hasZone) {
            html += '<div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin:' + (hasIface?'16px':'0') + ' 0 6px;">' +
                '<i class="fas fa-layer-group"></i> Zone &nbsp;' +
                '<span class="fa-pill fa-pill-added">+' + zc.totals.added + '</span> ' +
                '<span class="fa-pill fa-pill-removed">−' + zc.totals.removed + '</span> ' +
                '<span class="fa-pill fa-pill-modified">~' + zc.totals.modified + '</span></div>';
            html += '<div class="fa-table-wrapper"><table class="fa-table fa-table-sm"><thead><tr>' +
                '<th>Δ</th><th>Zone</th><th>Intrazone</th><th>Interface Üyeliği</th>' +
                '</tr></thead><tbody>';
            ['added','removed','modified'].forEach(function(type) {
                (zc[type]||[]).forEach(function(z) {
                    var delta = z.delta || {};
                    var marker = type==='added' ? '+' : type==='removed' ? '−' : 'Δ';
                    var cls = 'fa-diff-' + type;
                    var intraCell = fieldCell(type, delta, z, 'intrazone');
                    var ifCell;
                    if (type === 'modified' && delta.interfaces) {
                        var di = delta.interfaces;
                        var parts = [];
                        (di.added||[]).forEach(function(n) { parts.push('<span style="color:#27ae60"><i class="fas fa-plus-circle" style="font-size:.7em"></i> ' + faEscape(n) + '</span>'); });
                        (di.removed||[]).forEach(function(n) { parts.push('<span style="color:#c0392b"><i class="fas fa-minus-circle" style="font-size:.7em"></i> ' + faEscape(n) + '</span>'); });
                        ifCell = parts.join('<br>') || '<em style="color:#95a5a6">—</em>';
                    } else {
                        ifCell = (z.interfaces||[]).map(function(n) { return faEscape(n); }).join(', ') || '<em style="color:#95a5a6">—</em>';
                    }
                    html += '<tr class="' + cls + '">' +
                        '<td><span class="fa-diff-badge ' + cls + '">' + marker + '</span></td>' +
                        '<td><strong>' + faEscape(z.name||'') + '</strong></td>' +
                        '<td>' + intraCell + '</td>' +
                        '<td style="font-size:.85em;line-height:1.8">' + ifCell + '</td>' +
                        '</tr>';
                });
            });
            html += '</tbody></table></div>';
        }
        if (hasIfaceAudit) {
            var topMargin = (hasIface || hasZone) ? '16px' : '0';
            html += '<div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin:' + topMargin + ' 0 6px;">' +
                '<i class="fas fa-history"></i> Interface / Zone Audit Log &nbsp;' +
                '<span class="fa-pill" style="background:#6b7280;color:#fff">' + ia.length + ' kayıt</span>' +
                ' &nbsp;<span style="font-weight:400;font-size:10px;color:var(--text-muted);text-transform:none">— snapshot net fark göremedi, audit log yakaladı (geri alınan değişiklikler dahil)</span></div>';
            html += '<div class="fa-table-wrapper"><table class="fa-table fa-table-sm"><thead><tr>' +
                '<th>#</th><th>Zaman</th><th>Kullanıcı</th><th>Interface / Zone</th><th>İşlem</th><th>Detay</th>' +
                '</tr></thead><tbody>';
            ia.forEach(function(ev, idx) {
                var cfgattr = ev.cfgattr || '';
                // Parse "field[old->new]" format
                var detailHtml = cfgattr;
                var m = cfgattr.match(/^(\w+)\[(.+)->(.+)\]$/);
                if (m) {
                    var field = m[1], oldVal = m[2], newVal = m[3];
                    var renderVal = function(v) {
                        if (field === 'status') {
                            var bg = v === 'up' ? '#27ae60' : v === 'down' ? '#c0392b' : '#6b7280';
                            return '<span style="background:' + bg + ';color:#fff;padding:1px 7px;border-radius:3px;font-size:.75rem;font-weight:700">' + faEscape(v) + '</span>';
                        }
                        return '<code style="font-size:.8em">' + faEscape(v) + '</code>';
                    };
                    detailHtml = '<span style="color:var(--text-muted);font-size:.8em">' + faEscape(field) + '</span> ' +
                        renderVal(oldVal) + ' <i class="fas fa-arrow-right" style="font-size:.7em;color:var(--text-muted)"></i> ' + renderVal(newVal);
                } else if (cfgattr) {
                    detailHtml = '<code style="font-size:.8em">' + faEscape(cfgattr) + '</code>';
                } else {
                    detailHtml = '<em style="color:#95a5a6">—</em>';
                }
                var actionBg = ev.action === 'Edit' ? '#2980b9' : ev.action === 'Add' ? '#27ae60' : ev.action === 'Delete' ? '#c0392b' : '#6b7280';
                html += '<tr>' +
                    '<td style="color:var(--text-muted);font-size:.8em">' + (idx+1) + '</td>' +
                    '<td style="font-size:.8em;white-space:nowrap">' + faEscape(ev.log_datetime || '—') + '</td>' +
                    '<td><strong style="font-size:.85em">' + faEscape(ev.user || '—') + '</strong></td>' +
                    '<td><code style="font-size:.82em">' + faEscape(ev.iface_name || '—') + '</code></td>' +
                    '<td><span style="background:' + actionBg + ';color:#fff;padding:1px 7px;border-radius:3px;font-size:.75rem;font-weight:700">' + faEscape(ev.action || '—') + '</span></td>' +
                    '<td style="font-size:.85em">' + detailHtml + '</td>' +
                    '</tr>';
            });
            html += '</tbody></table></div>';
        }

        content.innerHTML = html;
    }

    var lastDiffModifiedRules = {};  // rule_id → true (net değişen kurallar)
    var auditViewMode = 'timeline';   // 'timeline' | 'grouped'

    window.fireAuditAuditViewMode = function(mode) {
        auditViewMode = mode;
        // Re-render with cached last data
        if (window.__faLastAudit) {
            renderAuditActivity(window.__faLastAudit.activity, window.__faLastAudit.diffCount);
        }
    };

    function renderAuditActivity(activity, diffRowCount) {
        window.__faLastAudit = { activity: activity, diffCount: diffRowCount };
        var box = document.getElementById('fa-audit-activity-box');
        if (!box) {
            var diffTab = document.getElementById('fa-tab-diff');
            if (!diffTab) return;
            box = document.createElement('div');
            box.id = 'fa-audit-activity-box';
            box.style.marginTop = '24px';
            diffTab.appendChild(box);
        }
        if (!activity.length) {
            box.innerHTML = '';
            return;
        }

        // Rule başına grupla (KPI özetleri ve grouped view için)
        var byRule = {};
        activity.forEach(function(a) {
            var rid = a.rule_id || '?';
            if (!byRule[rid]) byRule[rid] = [];
            byRule[rid].push(a);
        });
        var ruleCount = Object.keys(byRule).length;
        var revertedCount = 0;
        Object.keys(byRule).forEach(function(rid) {
            if (!lastDiffModifiedRules[rid]) revertedCount++;
        });

        var summary = '<div class="fa-audit-summary">' +
            '<div class="fa-audit-stat"><strong>' + activity.length + '</strong><span>toplam edit</span></div>' +
            '<div class="fa-audit-stat"><strong>' + ruleCount + '</strong><span>etkilenen kural</span></div>' +
            '<div class="fa-audit-stat fa-audit-stat-net"><strong>' + diffRowCount + '</strong><span>net değişen</span></div>' +
            '<div class="fa-audit-stat fa-audit-stat-rev"><strong>' + revertedCount + '</strong><span>net etkisi yok (geri alındı/track-dışı)</span></div>' +
            '</div>';

        var modeToggle =
            '<div class="fa-audit-modes">' +
            '<button class="fa-mode-btn ' + (auditViewMode === 'timeline' ? 'active' : '') + '" onclick="fireAuditAuditViewMode(\'timeline\')">' +
            '<i class="fas fa-stream"></i> Timeline (her edit ayrı)</button>' +
            '<button class="fa-mode-btn ' + (auditViewMode === 'grouped' ? 'active' : '') + '" onclick="fireAuditAuditViewMode(\'grouped\')">' +
            '<i class="fas fa-layer-group"></i> Kural başına grupla</button>' +
            '</div>';

        var html = '<h4 style="margin:0 0 10px 0;"><i class="fas fa-user-clock"></i> Detaylı Edit Tarihçesi ' +
            '<small style="color:#7f8c8d;font-weight:normal;">— bu zaman penceresinde yapılan TÜM edit\'ler. Aynı field 2 kez değiştirilse bile (örn. FTP eklendi sonra silindi) <strong>her ikisi de ayrı satır</strong> olarak görünür.</small></h4>' +
            summary + modeToggle;

        if (auditViewMode === 'timeline') {
            // FLAT KRONOLOJİK — her edit kendi satırı, en yeni üstte
            html += '<div class="fa-table-wrapper" style="max-height:500px;overflow:auto;"><table class="fa-table fa-table-sm"><thead><tr>' +
                '<th>#</th><th>Zaman</th><th>Kullanıcı</th><th>Rule</th><th>Aksiyon</th><th>Field / Detay</th><th>Net?</th></tr></thead><tbody>';
            // activity zaten log_datetime DESC sıralı geldi
            activity.forEach(function(a, idx) {
                var rid = a.rule_id || '?';
                var netBadge = lastDiffModifiedRules[rid]
                    ? '<span class="fa-mini-tag fa-mini-tag-net" title="Bu kural snapshot diff\'te net DEĞIŞTİ olarak görünüyor"><i class="fas fa-check"></i> NET</span>'
                    : '<span class="fa-mini-tag fa-mini-tag-rev" title="Bu kural net snapshot farkı oluşturmadı — tek başına bu edit etkisiz olabilir veya başka bir edit ile geri alındı"><i class="fas fa-undo"></i> ARA</span>';
                html += '<tr>' +
                    '<td><small style="color:#95a5a6">#' + (idx + 1) + '</small></td>' +
                    '<td><small>' + faEscape(a.log_datetime || '-') + '</small></td>' +
                    '<td><strong>' + faEscape(a.user || '?') + '</strong></td>' +
                    '<td><a class="fa-rule-link" onclick="fireAuditOpenRule(\'' + faEscape(rid) + '\')">' + faEscape(rid) + '</a></td>' +
                    '<td>' + faEscape(a.action || '-') + '</td>' +
                    '<td class="fa-audit-attr-cell">' + faEscape((a.cfgattr || a.msg || '-').substring(0, 220)) +
                    ((a.cfgattr || a.msg || '').length > 220 ? '…' : '') + '</td>' +
                    '<td>' + netBadge + '</td>' +
                    '</tr>';
            });
            html += '</tbody></table></div>';
        } else {
            // GROUPED — kural başına özet
            html += '<div class="fa-table-wrapper" style="max-height:500px;overflow:auto;"><table class="fa-table fa-table-sm"><thead><tr>' +
                '<th>Rule</th><th>Edit Sayısı</th><th>Net Diff?</th><th>Edit\'ler (en yeni → eski)</th></tr></thead><tbody>';
            Object.keys(byRule).sort().forEach(function(rid) {
                var edits = byRule[rid];
                var netChanged = !!lastDiffModifiedRules[rid];
                var statusBadge = netChanged
                    ? '<span class="fa-pill fa-pill-update"><i class="fas fa-check"></i> Net DEĞİŞTİ</span>'
                    : '<span class="fa-pill fa-pill-neutral"><i class="fas fa-undo"></i> Net etkisiz</span>';
                var editsHtml = edits.map(function(a) {
                    return '<div class="fa-audit-edit-line">' +
                        '<small>' + faEscape(a.log_datetime || '') + '</small> &middot; ' +
                        '<strong>' + faEscape(a.user || '?') + '</strong> &middot; ' +
                        faEscape(a.action || '') +
                        '<div class="fa-audit-edit-attr">' + faEscape((a.cfgattr || a.msg || '').substring(0, 250)) + '</div>' +
                        '</div>';
                }).join('');
                html += '<tr>' +
                    '<td><a class="fa-rule-link" onclick="fireAuditOpenRule(\'' + faEscape(rid) + '\')">' + faEscape(rid) + '</a></td>' +
                    '<td><strong>' + edits.length + '</strong></td>' +
                    '<td>' + statusBadge + '</td>' +
                    '<td>' + editsHtml + '</td></tr>';
            });
            html += '</tbody></table></div>';
        }

        box.innerHTML = html;
    }

    // ---------- Acknowledgment helpers ----------
    var ACK_LABELS = {
        accepted: { label: 'Accepted', cls: 'ack-accepted', icon: 'fa-check' },
        fp:       { label: 'False Positive', cls: 'ack-fp', icon: 'fa-ban' },
        fixing:   { label: 'Fixing', cls: 'ack-fixing', icon: 'fa-wrench' },
        known:    { label: 'Known', cls: 'ack-known', icon: 'fa-eye' },
    };

    function renderAckBadge(state) {
        if (!state || !ACK_LABELS[state]) return '<span class="fa-ack-badge ack-none">—</span>';
        var a = ACK_LABELS[state];
        return '<span class="fa-ack-badge ' + a.cls + '"><i class="fas ' + a.icon + '"></i> ' + a.label + '</span>';
    }

    function renderAckControls(ruleId, findingType, ack) {
        var current = ack && ack.state ? ack.state : '';
        var tooltip = ack ? ('User: ' + (ack.user || '-') + '\nNot: ' + (ack.note || '-') + '\nZaman: ' + (ack.at || '-')) : 'Henüz ack yok';
        var badge = renderAckBadge(current);
        var btns = '';
        var states = ['accepted', 'fp', 'fixing', 'known'];
        states.forEach(function(s) {
            var active = s === current ? ' active' : '';
            btns += '<button class="fa-ack-btn ' + ACK_LABELS[s].cls + active + '" ' +
                'title="' + faEscape(ACK_LABELS[s].label) + '" ' +
                'onclick="fireAuditSetAck(\'' + faEscape(ruleId) + '\',\'' + faEscape(findingType) + '\',\'' + s + '\')">' +
                '<i class="fas ' + ACK_LABELS[s].icon + '"></i></button>';
        });
        if (current) {
            btns += '<button class="fa-ack-btn ack-clear" title="Ack temizle" ' +
                'onclick="fireAuditSetAck(\'' + faEscape(ruleId) + '\',\'' + faEscape(findingType) + '\',\'clear\')">' +
                '<i class="fas fa-times"></i></button>';
        }
        return '<div class="fa-ack-wrap" title="' + faEscape(tooltip) + '">' +
               '<div class="fa-ack-state">' + badge + '</div>' +
               '<div class="fa-ack-btns">' + btns + '</div>' +
               '</div>';
    }

    window.fireAuditSetAck = function(ruleId, findingType, state) {
        // Backward-compat — quick action açılır modal'a yönlendirir, state önceden seçilmiş olur.
        // 'clear' için modal'a gerek yok, doğrudan sil.
        if (state === 'clear') {
            var fd = new FormData();
            fd.append('action', 'ack');
            fd.append('fw_slug', FW_SLUG);
            fd.append('rule_id', ruleId);
            fd.append('finding_type', findingType);
            fd.append('state', 'clear');
            fetch(API_BASE + '?action=ack&fw_slug=' + encodeURIComponent(FW_SLUG), { method: 'POST', credentials: 'same-origin', body: fd })
                .then(function(r) { return r.json(); })
                .then(function(res) {
                    if (!res.success) { alert('Sil hatası: ' + (res.error || '?')); return; }
                    // Sentetik rule_id'leri olan finding tipleri (compliance, mergeable, vs.)
                    if (document.getElementById('fa-rule-modal').style.display === 'flex') {
                        var _synth = ['compliance','mergeable','duplicate','zone_matrix','dup_obj','stale_obj','interface'];
                        if (_synth.indexOf(String(findingType||'').toLowerCase()) >= 0) {
                            document.getElementById('fa-rule-modal').style.display = 'none';
                        } else {
                            fireAuditOpenRule(ruleId);
                        }
                    }
                    loadFireAuditStats();
                    if (currentTab === 'exceptions') loadFireAuditExceptions();
                    else if (loader[currentTab]) loader[currentTab]();
                });
            return;
        }
        fireAuditAckOpen({
            items: [{ rule_id: ruleId, finding_type: findingType }],
            initialState: state,
        });
    };

    // ---------- Ack modal (P0-9) ----------
    var ackModalCtx = null;  // { items: [...], isBulk, returnTab }

    window.fireAuditAckOpen = function(opts) {
        opts = opts || {};
        var items = opts.items || [];
        if (!items.length) return;
        var modal = document.getElementById('fa-ack-modal');
        if (!modal) return;
        ackModalCtx = {
            items: items,
            isBulk: items.length > 1,
            existing: opts.existing || null,
        };

        document.getElementById('fa-ack-modal-title').textContent =
            ackModalCtx.isBulk ? 'Bulk Exception (' + items.length + ' finding)' : 'Exception';

        var ctx = items.length === 1
            ? ('Finding: <strong>' + faEscape(items[0].finding_type) + '</strong> &middot; Rule: <strong>' + faEscape(items[0].rule_id) + '</strong>'
                + (opts.severity ? ' &middot; Severity: ' + faSevBadge(opts.severity) : ''))
            : ('Toplu işlem — seçili ' + items.length + ' finding aynı state ile işaretlenecek.');
        document.getElementById('fa-ack-context').innerHTML = ctx;

        document.getElementById('fa-ack-state').value = opts.initialState || (opts.existing && opts.existing.state) || 'fp';
        document.getElementById('fa-ack-note').value = (opts.existing && opts.existing.note) || '';
        document.getElementById('fa-ack-jira').value = (opts.existing && opts.existing.jira_ticket) || '';
        document.getElementById('fa-ack-justification').value = (opts.existing && opts.existing.risk_justification) || '';
        document.getElementById('fa-ack-expires').value = (opts.existing && opts.existing.expires_at) ? opts.existing.expires_at.substring(0, 10) : '';
        document.getElementById('fa-ack-review').value = (opts.existing && opts.existing.review_at) ? opts.existing.review_at.substring(0, 10) : '';

        document.getElementById('fa-ack-clear-btn').style.display = (opts.existing && !ackModalCtx.isBulk) ? 'inline-block' : 'none';

        // History sadece tek finding için
        var histBlock = document.getElementById('fa-ack-history-block');
        if (!ackModalCtx.isBulk) {
            histBlock.style.display = 'block';
            fireAuditAckHistoryLoad(items[0].finding_type, items[0].rule_id);
        } else {
            histBlock.style.display = 'none';
        }

        fireAuditAckOnStateChange();
        modal.style.display = 'flex';
        // Note counter
        var noteEl = document.getElementById('fa-ack-note');
        var counter = document.getElementById('fa-ack-note-counter');
        var updateCounter = function() { counter.textContent = noteEl.value.length + ' karakter'; };
        noteEl.oninput = function() { updateCounter(); fireAuditAckOnStateChange(); };
        updateCounter();
    };

    window.fireAuditAckClose = function() {
        document.getElementById('fa-ack-modal').style.display = 'none';
        ackModalCtx = null;
    };

    window.fireAuditAckOnStateChange = function() {
        var state = document.getElementById('fa-ack-state').value;
        var note = document.getElementById('fa-ack-note').value;
        var jira = document.getElementById('fa-ack-jira').value;
        var just = document.getElementById('fa-ack-justification').value;
        var warn = document.getElementById('fa-ack-warning');
        var noteReq = document.getElementById('fa-ack-note-required');

        if (state === 'accepted') {
            noteReq.style.display = 'inline';
            var problems = [];
            if (note.trim().length < 20) problems.push('Note en az 20 karakter olmalı (CRITICAL/HIGH için backend bunu zorunlu kılar)');
            if (!jira.trim() && !just.trim()) problems.push('CRITICAL/HIGH için Jira BTSY veya Risk Justification şart');
            if (problems.length) {
                warn.style.display = 'block';
                warn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> <strong>Dikkat:</strong> ' + problems.map(faEscape).join(' · ');
            } else {
                warn.style.display = 'none';
            }
        } else {
            noteReq.style.display = 'none';
            warn.style.display = 'none';
        }
    };

    window.fireAuditAckSubmit = function() {
        if (!ackModalCtx) return;
        var fd = new FormData();
        fd.append('action', 'ack');
        fd.append('fw_slug', FW_SLUG);
        fd.append('state', document.getElementById('fa-ack-state').value);
        fd.append('note', document.getElementById('fa-ack-note').value);
        fd.append('jira_ticket', document.getElementById('fa-ack-jira').value);
        fd.append('risk_justification', document.getElementById('fa-ack-justification').value);
        fd.append('expires_at', document.getElementById('fa-ack-expires').value);
        fd.append('review_at', document.getElementById('fa-ack-review').value);

        if (ackModalCtx.items.length === 1) {
            fd.append('finding_type', ackModalCtx.items[0].finding_type);
            fd.append('rule_id', ackModalCtx.items[0].rule_id);
        } else {
            fd.append('items', JSON.stringify(ackModalCtx.items));
        }

        fetch(API_BASE + '?action=ack&fw_slug=' + encodeURIComponent(FW_SLUG), { method: 'POST', credentials: 'same-origin', body: fd })
            .then(function(r) { return r.json(); })
            .then(function(res) {
                if (!res.success) { alert('Hata: ' + (res.error || '?')); return; }
                if (res.failed > 0) {
                    var msg = res.applied + ' kaydedildi, ' + res.failed + ' başarısız:\n';
                    (res.errors || []).forEach(function(e) {
                        msg += ' - ' + (e.rule_id || '') + ': ' + (e.error || '') + '\n';
                    });
                    alert(msg);
                    if (res.applied === 0) return;
                }
                var ctx = ackModalCtx;
                fireAuditAckClose();
                loadFireAuditStats();
                fireAuditBulkClear();
                if (ctx.items.length === 1 && document.getElementById('fa-rule-modal').style.display === 'flex') {
                    var _it = ctx.items[0];
                    // Sentetik rule_id'leri olan finding tipleri (compliance check_id, mergeable
                    // group sig, zone_matrix, duplicate sig vb.) policy DB'sinde yok —
                    // fireAuditOpenRule cagirirsak "silinmis" / "Gecersiz rule_id" hatasi cikar.
                    var _syntheticTypes = ['compliance','mergeable','duplicate','zone_matrix','dup_obj','stale_obj','interface'];
                    if (_syntheticTypes.indexOf(String(_it.finding_type||'').toLowerCase()) >= 0) {
                        document.getElementById('fa-rule-modal').style.display = 'none';
                    } else {
                        fireAuditOpenRule(_it.rule_id);
                    }
                }
                if (currentTab === 'exceptions') loadFireAuditExceptions();
                else if (loader[currentTab]) loader[currentTab]();
            })
            .catch(function(err) { alert('Bağlantı hatası: ' + err.message); });
    };

    window.fireAuditAckClear = function() {
        if (!ackModalCtx || ackModalCtx.items.length !== 1) return;
        if (!confirm('Bu exception silinecek, finding tekrar aktif olacak. Onaylıyor musun?')) return;
        var it = ackModalCtx.items[0];
        var fd = new FormData();
        fd.append('action', 'ack');
        fd.append('fw_slug', FW_SLUG);
        fd.append('finding_type', it.finding_type);
        fd.append('rule_id', it.rule_id);
        fd.append('state', 'clear');
        fetch(API_BASE + '?action=ack&fw_slug=' + encodeURIComponent(FW_SLUG), { method: 'POST', credentials: 'same-origin', body: fd })
            .then(function(r) { return r.json(); })
            .then(function(res) {
                if (!res.success) { alert('Hata: ' + (res.error || '?')); return; }
                fireAuditAckClose();
                loadFireAuditStats();
                if (currentTab === 'exceptions') loadFireAuditExceptions();
                else if (loader[currentTab]) loader[currentTab]();
            });
    };

    window.fireAuditAckHistoryLoad = function(findingType, ruleId) {
        var box = document.getElementById('fa-ack-history-content');
        box.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        faApi('ack_history', { finding_type: findingType, rule_id: ruleId }).then(function(res) {
            if (!res.success || !res.history.length) {
                box.innerHTML = '<em style="color:#95a5a6">Bu finding için tarihçe yok.</em>';
                return;
            }
            var html = '<table class="fa-table fa-table-sm"><thead><tr><th>Zaman</th><th>İşlem</th><th>Eski → Yeni</th><th>Kullanıcı</th><th>Not</th></tr></thead><tbody>';
            res.history.forEach(function(h) {
                html += '<tr><td>' + faEscape(h.created_at) + '</td>' +
                    '<td><span class="fa-pill fa-pill-' + faEscape(h.action) + '">' + faEscape(h.action) + '</span></td>' +
                    '<td>' + faEscape(h.old_state || '—') + ' → ' + faEscape(h.new_state || '—') + '</td>' +
                    '<td>' + faEscape(h.user || '-') + '</td>' +
                    '<td class="fa-cell-small">' + faEscape((h.note || '').substring(0, 60)) + (h.jira_ticket ? ' <small style="color:#3498db">[' + faEscape(h.jira_ticket) + ']</small>' : '') + '</td></tr>';
            });
            html += '</tbody></table>';
            box.innerHTML = html;
        });
    };

    // ---------- Generic ack button (P0-9 9.x — her tab için) ----------
    // Kullanım: faAckButton('vpn', 'TunnelName', ackState=null)
    // ackState varsa "düzenle" rolü, yoksa "exception oluştur"
    window.faAckButton = function(findingType, identifier, ackState, severity) {
        var lbl = ackState ? 'Düzenle' : 'Exception';
        var iconCls = ackState ? 'fa-pen' : 'fa-shield-alt';
        var ackTag = ackState
            ? '<span class="fa-ack-inline ack-' + ackState + '" style="margin-right:4px">' + (ACK_LABELS[ackState] ? ACK_LABELS[ackState].label : ackState) + '</span>'
            : '';
        var sevAttr = severity ? ',severity:\'' + faEscape(severity) + '\'' : '';
        return ackTag + '<button class="fa-mini-btn" title="' + lbl +
            '" onclick="event.stopPropagation();fireAuditAckOpen({items:[{finding_type:\'' + faEscape(findingType) +
            '\',rule_id:' + JSON.stringify(String(identifier)).replace(/"/g, '&quot;') + '}],initialState:\'fp\'' + sevAttr + '})">' +
            '<i class="fas ' + iconCls + '"></i></button>';
    };

    // ---------- Bulk selection (P0-9 9.2) ----------
    var faBulkSel = {};  // { findingType: Set<rule_id> }

    function faBulkInit(type) {
        if (!faBulkSel[type]) faBulkSel[type] = {};
    }

    function faBulkCheckboxCell(type, ruleId) {
        faBulkInit(type);
        var checked = faBulkSel[type][ruleId] ? ' checked' : '';
        return '<td class="fa-bulk-cell"><input type="checkbox" class="fa-bulk-cb"' + checked +
            ' data-bulk-type="' + faEscape(type) + '"' +
            ' data-rule-id="' + faEscape(String(ruleId)) + '"' +
            ' onchange="fireAuditBulkToggle(\'' + faEscape(type) + '\',\'' + faEscape(String(ruleId)) + '\',this)"' +
            ' onclick="event.stopPropagation()"></td>';
    }

    window.fireAuditBulkToggle = function(type, ruleId, el) {
        faBulkInit(type);
        if (el.checked) faBulkSel[type][ruleId] = true;
        else delete faBulkSel[type][ruleId];
        fireAuditBulkBarRender();
    };

    window.fireAuditBulkSelectAll = function(type, tbodyId, on) {
        faBulkInit(type);
        if (!on) faBulkSel[type] = {};
        var cbs = document.querySelectorAll('#' + tbodyId + ' input.fa-bulk-cb');
        for (var i = 0; i < cbs.length; i++) {
            cbs[i].checked = !!on;
            var rid = cbs[i].getAttribute('data-rule-id');
            if (!rid) continue;
            if (on) faBulkSel[type][rid] = true;
            else delete faBulkSel[type][rid];
        }
        fireAuditBulkBarRender();
    };

    function fireAuditBulkClear() {
        faBulkSel = {};
        fireAuditBulkBarRender();
        var cbs = document.querySelectorAll('input.fa-bulk-cb');
        for (var i = 0; i < cbs.length; i++) cbs[i].checked = false;
    }
    window.fireAuditBulkClear = fireAuditBulkClear;

    function fireAuditBulkBarRender() {
        var bar = document.getElementById('fa-bulk-bar');
        var totalSel = 0;
        var typeBreakdown = {};
        Object.keys(faBulkSel).forEach(function(t) {
            var count = Object.keys(faBulkSel[t]).length;
            if (count > 0) {
                typeBreakdown[t] = count;
                totalSel += count;
            }
        });
        if (!bar) {
            bar = document.createElement('div');
            bar.id = 'fa-bulk-bar';
            bar.className = 'fa-bulk-bar';
            document.body.appendChild(bar);
        }
        if (totalSel === 0) {
            bar.style.display = 'none';
            return;
        }
        bar.style.display = 'flex';
        var TYPE_LABELS = {
            'profile': 'UTM Gap', 'risk': 'Risk', 'shadow': 'Shadow',
            'any': 'ANY', 'duplicate': 'Duplicate', 'compliance': 'Compliance',
            'vpn': 'VPN', 'zone_matrix': 'Zone Matrix',
            'stale_obj': 'Stale Obj', 'dup_obj': 'Dup Obj',
            'dead_rule': 'Dead Rule',
            'ordering_correlation': 'Ordering Corr',
            'ordering_generalization': 'Ordering Gen',
            'ordering_redundancy': 'Ordering Red',
        };
        var breakdownStr = Object.keys(typeBreakdown).map(function(t) {
            return (TYPE_LABELS[t] || t) + ':' + typeBreakdown[t];
        }).join(', ');
        bar.innerHTML =
            '<div class="fa-bulk-summary">' +
              '<i class="fas fa-check-square"></i> ' +
              '<strong>' + totalSel + '</strong> bulgu seçili' +
              '<small>(' + faEscape(breakdownStr) + ')</small>' +
            '</div>' +
            '<div class="fa-bulk-actions">' +
              '<span class="fa-bulk-group-label">Durum ata:</span>' +
              '<button onclick="fireAuditBulkApplyState(\'accepted\')" class="fa-bulk-btn fa-bulk-accepted" title="Yönetim onayıyla kabul edildi (gerekçe + dilerseniz Jira ile)">' +
                  '<i class="fas fa-handshake"></i> Kabul edildi</button>' +
              '<button onclick="fireAuditBulkApplyState(\'fp\')" class="fa-bulk-btn fa-bulk-fp" title="Yanlış pozitif — bulgu gerçek bir sorun değil">' +
                  '<i class="fas fa-times-circle"></i> Yanlış Pozitif</button>' +
              '<button onclick="fireAuditBulkApplyState(\'fixing\')" class="fa-bulk-btn fa-bulk-fixing" title="Düzeltme planlandı/devam ediyor">' +
                  '<i class="fas fa-wrench"></i> Düzeltiliyor</button>' +
              '<button onclick="fireAuditBulkApplyState(\'known\')" class="fa-bulk-btn fa-bulk-known" title="Biliniyor — bilinçli kabul, yok sayılabilir">' +
                  '<i class="fas fa-info-circle"></i> Biliniyor</button>' +
              '<span class="fa-bulk-divider"></span>' +
              '<button onclick="fireAuditBulkApplyState(\'clear\')" class="fa-bulk-btn fa-bulk-clear" title="Mevcut ack durumunu temizle (geri al)">' +
                  '<i class="fas fa-eraser"></i> Ack Temizle</button>' +
              '<button onclick="fireAuditBulkClear()" class="fa-bulk-btn fa-bulk-cancel" title="Tüm seçimi iptal et">' +
                  '<i class="fas fa-times"></i> Vazgeç</button>' +
            '</div>';
    }

    window.fireAuditBulkApply = function() { fireAuditBulkApplyState('fp'); };

    window.fireAuditBulkApplyState = function(state) {
        var items = [];
        Object.keys(faBulkSel).forEach(function(t) {
            Object.keys(faBulkSel[t]).forEach(function(rid) {
                items.push({ finding_type: t, rule_id: rid });
            });
        });
        if (!items.length) return;
        // clear → direct apply, confirm
        if (state === 'clear') {
            if (!confirm(items.length + ' finding\'den ack kaldırılacak. Emin misin?')) return;
            fireAuditAckBulkSubmit(items, 'clear', '', '', '', '', '');
            return;
        }
        fireAuditAckOpen({ items: items, initialState: state });
    };

    // Backend POST helper (ack.php proxy uzerinden)
    function fireAuditAckBulkSubmit(items, state, note, user, jira, justification, expires) {
        var fd = new FormData();
        fd.append('fw_slug', FW_SLUG);
        fd.append('state', state);
        fd.append('note', note || '');
        fd.append('user', user || (window.PORTAL_USER || 'unknown'));
        fd.append('jira_ticket', jira || '');
        fd.append('risk_justification', justification || '');
        if (expires) fd.append('expires_at', expires);
        fd.append('items', JSON.stringify(items));
        return fetch(API_BASE + '?action=ack&fw_slug=' + encodeURIComponent(FW_SLUG), {
            method: 'POST', credentials: 'same-origin', body: fd
        }).then(function(r){return r.json();}).then(function(res){
            if (res.success) {
                fireAuditBulkClear();
                // Refresh aktif tab
                if (currentTab && loader[currentTab]) loader[currentTab]();
                loadExceptionsSummary && loadExceptionsSummary();
                faShowToast && faShowToast('Toplu ack uygulandi: ' + (res.updated || items.length) + ' kayit', 'success');
            } else {
                alert('Toplu ack hatasi: ' + (res.error || 'bilinmiyor'));
            }
            return res;
        });
    }
    window.fireAuditAckBulkSubmit = fireAuditAckBulkSubmit;

    // ---------- Exception Management (P0-9 9.3) ----------
    // Exception sat	rina tiklayinca rule modal'inda inline detayi goster
    // (sentetik finding tipleri icin — compliance, mergeable, vs.)
    window.fireAuditExceptionShowDetail = function(it) {
        var modal = document.getElementById('fa-rule-modal');
        var body  = document.getElementById('fa-modal-body');
        var title = document.getElementById('fa-modal-title');
        if (!modal || !body || !title) return;

        var ftLabels = {
            'compliance':  'Compliance Check',
            'mergeable':   'Mergeable Rule Group',
            'duplicate':   'Duplicate Rule Group',
            'zone_matrix': 'Zone Matrix Risk',
            'dup_obj':     'Duplicate Object',
            'stale_obj':   'Stale Object',
            'interface':   'Interface',
            'vpn':         'VPN',
        };
        var ft = String(it.finding_type || '').toLowerCase();
        title.innerHTML = '<i class="fas fa-shield-alt"></i> ' + faEscape(ftLabels[ft] || it.finding_type) + ' &mdash; <small>' + faEscape(it.rule_id) + '</small>';

        var stateLabels = { accepted: 'Accepted', fp: 'False Positive', fixing: 'Fixing', known: 'Known' };
        var stateColors = { accepted: '#8e44ad', fp: '#7f8c8d', fixing: '#16a085', known: '#2980b9' };
        var stateBadge = it.state
            ? '<span style="background:' + (stateColors[it.state]||'#95a5a6') + ';color:#fff;padding:3px 10px;border-radius:10px;font-weight:700;font-size:.78rem;">' + faEscape(stateLabels[it.state] || it.state) + '</span>'
            : '<em>—</em>';

        var html = '<div class="fa-modal-section"><h4><i class="fas fa-info-circle"></i> Exception Bilgisi</h4>' +
            '<table class="fa-table fa-table-sm"><tbody>' +
            '<tr><th>Tip</th><td><strong>' + faEscape(it.finding_type || '-') + '</strong></td></tr>' +
            '<tr><th>Rule / Sig</th><td><code>' + faEscape(it.rule_id || '-') + '</code></td></tr>' +
            '<tr><th>Severity</th><td>' + (it.severity ? faSevBadge(it.severity) : '-') + '</td></tr>' +
            '<tr><th>State</th><td>' + stateBadge + '</td></tr>' +
            '<tr><th>Kullanıcı</th><td>' + faEscape(it.user || '-') + '</td></tr>' +
            '<tr><th>Oluşturulma</th><td>' + faEscape(it.created_at || '-') + '</td></tr>' +
            '<tr><th>Son Güncelleme</th><td>' + faEscape(it.updated_at || it.created_at || '-') + '</td></tr>' +
            '<tr><th>Expire</th><td>' + faEscape(it.expires_at || 'süresiz') + '</td></tr>' +
            '<tr><th>Review</th><td>' + faEscape(it.review_at || '-') + '</td></tr>' +
            '</tbody></table></div>';

        if (it.note) {
            html += '<div class="fa-modal-section"><h4><i class="fas fa-sticky-note"></i> Note</h4>' +
                '<div class="fa-info-box" style="background:#f8f9fa;border-color:#bdc3c7">' +
                faEscape(it.note).replace(/\n/g, '<br>') + '</div></div>';
        }
        if (it.jira_ticket) {
            html += '<div class="fa-modal-section"><h4><i class="fas fa-ticket-alt"></i> BTSY Ticket</h4>' +
                '<span class="fa-jira-tag" style="background:#3498db;color:#fff;padding:4px 12px;border-radius:4px;font-family:monospace;">' + faEscape(it.jira_ticket) + '</span></div>';
        }
        if (it.risk_justification) {
            html += '<div class="fa-modal-section"><h4><i class="fas fa-balance-scale"></i> Risk Justification</h4>' +
                '<div class="fa-info-box" style="background:#fef9e7;border-color:#f1c40f">' +
                faEscape(it.risk_justification).replace(/\n/g, '<br>') + '</div></div>';
        }

        // Aksiyonlar
        var tabMap = { 'compliance': 'compliance', 'mergeable': 'complexity', 'duplicate': 'duplicates',
                       'zone_matrix': 'zone_matrix', 'dup_obj': 'dup_obj', 'stale_obj': 'stale_obj',
                       'interface': 'interfaces', 'vpn': 'vpn' };
        var openTabBtn = tabMap[ft]
            ? '<button class="fa-btn" onclick="document.getElementById(\'fa-rule-modal\').style.display=\'none\';fireAuditSwitchTab(\'' + tabMap[ft] + '\')"><i class="fas fa-external-link-alt"></i> ' + faEscape(ftLabels[ft] || ft) + ' tabini ac</button>'
            : '';
        var itJsonAttr = JSON.stringify(it).replace(/"/g, '&quot;');
        html += '<div class="fa-modal-section" style="display:flex;gap:8px;flex-wrap:wrap;border-top:1px solid var(--border-color);padding-top:14px;">' +
            '<button class="fa-bulk-apply" onclick="document.getElementById(\'fa-rule-modal\').style.display=\'none\';fireAuditExceptionEdit(' + itJsonAttr + ')"><i class="fas fa-pen"></i> Exception Düzenle</button>' +
            '<button class="fa-btn fa-btn-sm" style="background:#fdf2f2;color:#c0392b;border:1px solid #e74c3c;" onclick="document.getElementById(\'fa-rule-modal\').style.display=\'none\';fireAuditExceptionDelete(\'' + faEscape(it.finding_type) + '\',\'' + faEscape(it.rule_id) + '\')"><i class="fas fa-trash"></i> Sil</button>' +
            openTabBtn +
            '</div>';

        body.innerHTML = html;
        modal.style.display = 'flex';
    };

    // Aktif sub-tab finding_type filtresi (boş = tümü, '__other' = bilinen tipler dışındakiler)
    var _excSubFilter = '';
    window.fireAuditExceptionsSubTab = function(t) {
        _excSubFilter = t || '';
        var btns = document.querySelectorAll('#fa-exc-subtabs .fa-fw-btn');
        btns.forEach(function(b) {
            b.classList.toggle('active', (b.getAttribute('data-exc-type') || '') === _excSubFilter);
        });
        loadFireAuditExceptions();
    };

    window.loadFireAuditExceptions = function() {
        var tbody = document.getElementById('fa-exc-tbody');
        var params = {
            state: document.getElementById('fa-exc-filter-state').value,
            user: document.getElementById('fa-exc-filter-user').value.trim(),
            expiring_days: document.getElementById('fa-exc-filter-expiring').value,
        };
        tbody.innerHTML = '<tr><td colspan="10"><i class="fas fa-spinner fa-spin"></i> Yükleniyor...</td></tr>';
        faApi('ack_list', params).then(function(res) {
            if (!res.success) { tbody.innerHTML = '<tr><td colspan="10">Hata: ' + faEscape(res.error || '') + '</td></tr>'; return; }
            var items = res.items || [];
            var s = res.summary || {};

            // KPI cards
            document.getElementById('fa-exc-total').textContent = s.total || 0;
            document.getElementById('fa-exc-expiring').textContent = s.expiring_30d || 0;
            document.getElementById('fa-exc-fp').textContent = (s.by_state && s.by_state.fp) || 0;
            document.getElementById('fa-exc-accepted').textContent = (s.by_state && s.by_state.accepted) || 0;

            // Tab badge
            var badge = document.getElementById('fa-tab-badge-exceptions');
            if (badge) {
                if (s.total > 0) {
                    badge.style.display = 'inline-block';
                    badge.textContent = s.total;
                    badge.title = (s.expiring_30d || 0) + ' tanesi 30 günde expire olacak';
                } else {
                    badge.style.display = 'none';
                }
            }

            // Sub-tab finding_type sayilari
            var KNOWN = ['compliance','profile','risk','shadow','any','vpn','zone_matrix','duplicate'];
            var typeCounts = { '': items.length, '__other': 0 };
            KNOWN.forEach(function(k) { typeCounts[k] = 0; });
            items.forEach(function(it) {
                var t = String(it.finding_type || '').toLowerCase();
                if (typeCounts[t] !== undefined) typeCounts[t]++;
                else typeCounts['__other']++;
            });
            document.querySelectorAll('#fa-exc-subtabs .fa-exc-cnt').forEach(function(el) {
                var k = el.getAttribute('data-cnt');
                el.textContent = typeCounts[k] || 0;
                el.style.cssText = 'display:inline-block;margin-left:6px;padding:1px 8px;border-radius:10px;background:rgba(0,0,0,0.08);font-size:.7rem;font-weight:700;';
            });

            // Sub-tab filtresi (client-side)
            if (_excSubFilter === '__other') {
                items = items.filter(function(it) { return KNOWN.indexOf(String(it.finding_type||'').toLowerCase()) === -1; });
            } else if (_excSubFilter) {
                items = items.filter(function(it) { return String(it.finding_type||'').toLowerCase() === _excSubFilter; });
            }

            if (!items.length) {
                var emptyMsg = _excSubFilter
                    ? 'Bu tipte exception yok.'
                    : 'Aktif exception yok.';
                tbody.innerHTML = '<tr><td colspan="10"><em>' + emptyMsg + '</em></td></tr>';
                return;
            }

            var nowStr = res.now || '';
            var html = '';
            items.forEach(function(it) {
                var expCell = '<em style="color:#95a5a6">süresiz</em>';
                if (it.expires_at) {
                    var days = faDaysBetween(nowStr, it.expires_at);
                    var expCls = 'fa-exp-far';
                    if (days < 0) expCls = 'fa-exp-overdue';
                    else if (days < 7) expCls = 'fa-exp-soon';
                    else if (days < 30) expCls = 'fa-exp-warn';
                    expCell = '<span class="fa-exp-tag ' + expCls + '" title="' + faEscape(it.expires_at) + '">' +
                        (days < 0 ? 'expired' : days + ' gün') + '</span>';
                }
                var stateBadge = renderAckBadge(it.state);
                // Sentetik finding tipleri icin inline detay modal'i ac; gercek rule_id ise rule modal
                var _ftLow = String(it.finding_type||'').toLowerCase();
                var _syntheticTypes = ['compliance','mergeable','duplicate','zone_matrix','dup_obj','stale_obj','interface','vpn'];
                var ruleLink;
                if (_syntheticTypes.indexOf(_ftLow) >= 0) {
                    // Tum it objesini JSON-encode edip global handler'a gonder
                    var _itJson = JSON.stringify(it).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                    ruleLink = '<a class="fa-rule-link" title="Detay icin tikla" onclick="fireAuditExceptionShowDetail(' + _itJson + ')">' + faEscape(it.rule_id) + ' <i class="fas fa-search-plus" style="font-size:.7em;color:#3498db"></i></a>';
                } else {
                    ruleLink = '<a class="fa-rule-link" onclick="fireAuditOpenRule(\'' + faEscape(it.rule_id) + '\')">' + faEscape(it.rule_id) + '</a>';
                }
                html += '<tr>' +
                    '<td><strong>' + faEscape(it.finding_type) + '</strong></td>' +
                    '<td>' + ruleLink + '</td>' +
                    '<td>' + (it.severity ? faSevBadge(it.severity) : '-') + '</td>' +
                    '<td>' + stateBadge + '</td>' +
                    '<td class="fa-cell-small" title="' + faEscape(it.note || '') + '">' + faEscape((it.note || '').substring(0, 50)) + ((it.note || '').length > 50 ? '…' : '') + '</td>' +
                    '<td>' + (it.jira_ticket ? '<span class="fa-jira-tag">' + faEscape(it.jira_ticket) + '</span>' : '-') + '</td>' +
                    '<td>' + expCell + '</td>' +
                    '<td>' + faEscape(it.user || '-') + '</td>' +
                    '<td><small>' + faEscape(it.updated_at || it.created_at) + '</small></td>' +
                    '<td>' +
                        '<button class="fa-mini-btn" title="Düzenle" onclick="fireAuditExceptionEdit(' + JSON.stringify(it).replace(/"/g, '&quot;') + ')"><i class="fas fa-pen"></i></button> ' +
                        '<button class="fa-mini-btn fa-mini-danger" title="Sil" onclick="fireAuditExceptionDelete(\'' + faEscape(it.finding_type) + '\',\'' + faEscape(it.rule_id) + '\')"><i class="fas fa-trash"></i></button>' +
                    '</td>' +
                    '</tr>';
            });
            tbody.innerHTML = html;
        });
    };

    function faDaysBetween(nowStr, futureStr) {
        if (!nowStr || !futureStr) return 0;
        var n = new Date(nowStr.replace(' ', 'T') + 'Z');
        var f = new Date(futureStr.replace(' ', 'T') + (futureStr.indexOf(':') > 0 ? 'Z' : 'T00:00:00Z'));
        return Math.round((f - n) / 86400000);
    }
    window.faDaysBetween = faDaysBetween;

    window.fireAuditExceptionEdit = function(item) {
        fireAuditAckOpen({
            items: [{ finding_type: item.finding_type, rule_id: item.rule_id }],
            existing: item,
            severity: item.severity,
        });
    };

    window.fireAuditExceptionDelete = function(findingType, ruleId) {
        if (!confirm('Bu exception silinsin mi? Finding tekrar aktif olacak.')) return;
        fireAuditSetAck(ruleId, findingType, 'clear');
    };

    window.fireAuditExceptionsClear = function() {
        document.getElementById('fa-exc-filter-state').value = '';
        document.getElementById('fa-exc-filter-user').value = '';
        document.getElementById('fa-exc-filter-expiring').value = '';
        loadFireAuditExceptions();
    };

    window.fireAuditExceptionsExport = function() {
        faApi('ack_list').then(function(res) {
            if (!res.success) { alert('Hata: ' + (res.error || '?')); return; }
            var blob = new Blob([JSON.stringify(res.items, null, 2)], { type: 'application/json' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'fireaudit-exceptions-' + FW_SLUG + '-' + new Date().toISOString().substring(0, 10) + '.json';
            a.click();
            URL.revokeObjectURL(url);
        });
    };

    window.fireAuditExceptionsImport = function(input) {
        if (!input.files || !input.files[0]) return;
        var file = input.files[0];
        var reader = new FileReader();
        reader.onload = function(e) {
            var content = e.target.result;
            try {
                var items = JSON.parse(content);
                if (!Array.isArray(items)) throw new Error('JSON liste değil');
            } catch (err) {
                alert('Geçersiz JSON: ' + err.message);
                input.value = '';
                return;
            }
            var mode = confirm('Mevcut ack\'leri ÜZERINE yazmak için OK, atlamak için Cancel.\n\n' + items.length + ' kayıt import edilecek.')
                ? 'overwrite' : 'skip';
            var fd = new FormData();
            fd.append('action', 'ack_import');
            fd.append('fw_slug', FW_SLUG);
            fd.append('mode', mode);
            fd.append('items', JSON.stringify(items));
            fetch(API_BASE + '?action=ack_import&fw_slug=' + encodeURIComponent(FW_SLUG), { method: 'POST', credentials: 'same-origin', body: fd })
                .then(function(r) { return r.json(); })
                .then(function(res) {
                    input.value = '';
                    if (!res.success) { alert('Hata: ' + (res.error || '?')); return; }
                    var msg = 'Imported: ' + res.imported + ', Overwritten: ' + res.overwritten +
                        ', Skipped: ' + res.skipped + ', Failed: ' + res.failed;
                    if (res.errors && res.errors.length) {
                        msg += '\n\nHatalar:\n' + res.errors.slice(0, 10).map(function(e) {
                            return ' - ' + (e.rule_id || '') + ': ' + (e.error || '');
                        }).join('\n');
                    }
                    alert(msg);
                    loadFireAuditExceptions();
                });
        };
        reader.readAsText(file);
    };

    window.fireAuditExceptionsCleanup = function() {
        if (!confirm('Süresi dolmuş tüm exception\'ları silmek istiyor musun?')) return;
        var fd = new FormData();
        fd.append('action', 'ack_cleanup');
        fetch(API_BASE + '?action=ack_cleanup', { method: 'POST', credentials: 'same-origin', body: fd })
            .then(function(r) { return r.json(); })
            .then(function(res) {
                if (!res.success) { alert('Hata: ' + (res.error || '?')); return; }
                alert(res.expired_count + ' exception expire edildi.');
                loadFireAuditExceptions();
            });
    };

    // ---------- Diff detail modal (kullanıcı isteği) ----------
    window.fireAuditOpenDiffDetail = function(ruleId, item) {
        var modal = document.getElementById('fa-rule-modal');
        if (!modal) {
            console.error('[FireScope] fa-rule-modal bulunamadı — HTML eksik, Ctrl+Shift+R');
            alert('Modal HTML\'de tanımlı değil. Ctrl+Shift+R ile sayfayı yenile.');
            return;
        }
        var body = document.getElementById('fa-modal-body');
        var title = document.getElementById('fa-modal-title');
        if (!body || !title) { alert('Modal body/title eksik'); return; }
        title.innerHTML = '<i class="fas fa-code-branch"></i> Diff Detay: ' + faFormatRuleId(ruleId);
        modal.style.display = 'flex';
        modal.onclick = function(e) { if (e.target === modal) modal.style.display = 'none'; };

        var d = item.details || {};
        var hist = item.audit_history || [];

        var typeLabel = { added: 'Eklendi (Yeni Kural)', removed: 'Silindi', modified: 'Değiştirildi', transient: 'Oluşturulup Silindi' }[item._type] || item._type;
        var typeColor = { added:'#1e8449', removed:'#c0392b', modified:'#f39c12', transient:'#7f8c8d' }[item._type] || '#34495e';
        var html = '<div class="fa-modal-section"><h4><i class="fas fa-info-circle"></i> Değişiklik Özeti</h4>' +
            '<table class="fa-table fa-table-sm"><tbody>' +
            '<tr><th>Rule ID</th><td>' + faFormatRuleId(ruleId) + '</td></tr>' +
            '<tr><th>Adı</th><td><strong>' + faEscape(d.name || item.rule_name || '-') + '</strong></td></tr>' +
            '<tr><th>Değişiklik Tipi</th><td><span style="background:' + typeColor + ';color:#fff;padding:2px 10px;border-radius:3px;font-weight:600;">' + faEscape(typeLabel) + '</span></td></tr>' +
            '<tr><th>Son Değiştiren</th><td>' + (item.changed_by ? '<strong style="font-size:1.05rem;color:#2c3e50;">👤 ' + faEscape(item.changed_by) + '</strong>' : '<em>—</em>') + '</td></tr>' +
            '<tr><th>Zaman</th><td>' + (item.changed_at ? '<strong>' + faFormatTime(item.changed_at, {seconds:true, tzTag:true}) + '</strong> <small style="color:#95a5a6">(' + faRelativeTime(item.changed_at) + ')</small><br><small style="color:#95a5a6">UTC: ' + faEscape(item.changed_at) + '</small>' : '-') + '</td></tr>' +
            '</tbody></table></div>';

        if (d.delta) {
            html += '<div class="fa-modal-section"><h4><i class="fas fa-exchange-alt"></i> Field Delta</h4>';
            for (var k in d.delta) {
                html += renderFieldDelta(k, d.delta[k].old, d.delta[k].new);
            }
            html += '</div>';
        }

        // Silinen veya eklenen kuralın TÜM config'i — modal içinde detaylı
        var ruleData = d.rule || (item._type === 'removed' || item._type === 'added' ? d : null);
        if (ruleData && (ruleData.action || ruleData.src_addresses)) {
            var sectionTitle = item._type === 'removed'
                ? '<i class="fas fa-trash" style="color:#c0392b"></i> Silinen Kuralın Son Hali'
                : item._type === 'added'
                ? '<i class="fas fa-plus-circle" style="color:#1e8449"></i> Yeni Eklenen Kural'
                : '<i class="fas fa-info-circle"></i> Kural Konfigürasyonu';
            html += '<div class="fa-modal-section"><h4>' + sectionTitle + '</h4>' +
                '<table class="fa-table fa-table-sm"><tbody>' +
                (ruleData.name ? '<tr><th>Adı</th><td><strong>' + faEscape(ruleData.name) + '</strong></td></tr>' : '') +
                (ruleData.action ? '<tr><th>Action</th><td>' + faActionBadge(ruleData.action) + '</td></tr>' : '') +
                (ruleData.enabled !== undefined ? '<tr><th>Durum</th><td>' + (ruleData.enabled ? '<span style="color:#27ae60">✓ Aktif</span>' : '<span style="color:#95a5a6">Pasif</span>') + '</td></tr>' : '') +
                (ruleData.src_zones ? '<tr><th>Source Zone</th><td>' + faPillList(ruleData.src_zones) + '</td></tr>' : '') +
                (ruleData.dst_zones ? '<tr><th>Destination Zone</th><td>' + faPillList(ruleData.dst_zones) + '</td></tr>' : '') +
                (ruleData.src_addresses ? '<tr><th>Source Adresleri</th><td>' + faPillList(ruleData.src_addresses) + '</td></tr>' : '') +
                (ruleData.dst_addresses ? '<tr><th>Destination Adresleri</th><td>' + faPillList(ruleData.dst_addresses) + '</td></tr>' : '') +
                (ruleData.services ? '<tr><th>Servisler</th><td>' + faPillList(ruleData.services) + '</td></tr>' : '') +
                (ruleData.schedule ? '<tr><th>Zamanlama</th><td>' + faEscape(ruleData.schedule) + '</td></tr>' : '') +
                (ruleData.comments ? '<tr><th>Yorum</th><td>' + faEscape(ruleData.comments) + '</td></tr>' : '') +
                '</tbody></table></div>';
        }

        // Modified için tam kural durumu — delta'da olmayan alanları da göster (zone, schedule, vb.)
        if (item._type === 'modified' && !ruleData) {
            // d'den veya d.rule_state'den zone bilgisini al
            var modSchedule = d.schedule || null;
            var modComments = (!d.delta || !d.delta.comments) ? (d.comments || null) : null;
            if (d.src_zones || d.dst_zones || modSchedule || modComments) {
                html += '<div class="fa-modal-section"><h4><i class="fas fa-info-circle"></i> Mevcut Kural Durumu (değişmeyen alanlar)</h4>' +
                    '<table class="fa-table fa-table-sm"><tbody>' +
                    (d.src_zones ? '<tr><th>Source Zone</th><td>' + faPillList(d.src_zones) + '</td></tr>' : '') +
                    (d.dst_zones ? '<tr><th>Destination Zone</th><td>' + faPillList(d.dst_zones) + '</td></tr>' : '') +
                    (modSchedule ? '<tr><th>Zamanlama</th><td>' + faEscape(modSchedule) + '</td></tr>' : '') +
                    (modComments ? '<tr><th>Yorum</th><td>' + faEscape(modComments) + '</td></tr>' : '') +
                    '</tbody></table></div>';
            }
        }

        if (hist.length) {
            var windowNote = item.audit_within_window === false
                ? '<div style="background:#fef9e7;border-left:3px solid #f39c12;padding:6px 10px;margin-bottom:8px;font-size:.85rem;">' +
                  '<i class="fas fa-exclamation-triangle"></i> Bu audit_log kayıtları snapshot zaman penceresinin <strong>dışında</strong>. ' +
                  'Yani diff, kuralın o pencere içinde değiştiğini söylüyor ama ilgili audit_log o aralıkta değil. ' +
                  'En olası sebep: <strong>audit_log fetch ile snapshot fetch zamanlarının senkron olmaması</strong>. ' +
                  'Bir sonraki sync\'te düzelmesi beklenir.</div>'
                : '';
            html += '<div class="fa-modal-section"><h4><i class="fas fa-history"></i> Audit Trail (' + hist.length + ' kayıt)</h4>' + windowNote +
                '<table class="fa-table fa-table-sm"><thead><tr><th>Zaman</th><th>Kullanıcı</th><th>Aksiyon</th><th>Field</th><th>Mesaj</th></tr></thead><tbody>';
            hist.forEach(function(h) {
                html += '<tr><td>' + faEscape(h.datetime || '-') + '</td>' +
                    '<td><strong>' + faEscape(h.user || '-') + '</strong></td>' +
                    '<td>' + faEscape(h.action || '-') + '</td>' +
                    '<td class="fa-cell-small">' + faEscape(h.cfgattr || '-') + '</td>' +
                    '<td class="fa-cell-small">' + faEscape((h.msg || '').substring(0, 200)) + '</td></tr>';
            });
            html += '</tbody></table></div>';
        } else {
            html += '<div class="fa-modal-section"><div class="fa-info-box" style="background:#fef3cd;border-color:#f39c12">' +
                '<i class="fas fa-exclamation-triangle"></i> Bu zaman aralığında <strong>audit_logs</strong> kaydı bulunamadı. ' +
                'Bu, cihaz tarafından bu kural için event log üretilmediği anlamına gelir veya kayıt henüz portala düşmemiştir. CheckPoint\'te <code>show-changes</code> mgmt-level değişiklikleri mesajlar; rule-level eşleme rule-name üzerinden yapılır.</div></div>';
        }

        html += '<div class="fa-modal-section"><h4><i class="fas fa-code"></i> Raw Delta JSON ' +
            '<button onclick="document.getElementById(\'fa-diff-raw\').style.display = document.getElementById(\'fa-diff-raw\').style.display === \'none\' ? \'block\' : \'none\'" class="fa-mini-btn">Göster/Gizle</button></h4>' +
            '<pre id="fa-diff-raw" style="display:none;max-height:300px;overflow:auto;background:#1a1a2e;color:#e0e0e0;padding:12px;border-radius:4px;font-size:11px">' +
            faEscape(JSON.stringify({ details: d, audit_history: hist }, null, 2)) +
            '</pre></div>';

        html += '<div class="fa-modal-section"><button class="fa-bulk-apply" onclick="fireAuditOpenRule(\'' + faEscape(ruleId) + '\')"><i class="fas fa-search-plus"></i> Tam Rule Deep-Dive</button></div>';

        body.innerHTML = html;
    };

    // ---------- Rule Deep-Dive Modal ----------
    window.fireAuditOpenRule = function(ruleId) {
        var modal = document.getElementById('fa-rule-modal');
        if (!modal) {
            console.error('[FireScope] fa-rule-modal element bulunamadı — HTML eksik');
            alert('Kural detay modal HTML\'de tanımlı değil (fa-rule-modal). Sayfayı Ctrl+Shift+R ile yenileyin.');
            return;
        }
        var body = document.getElementById('fa-modal-body');
        var title = document.getElementById('fa-modal-title');
        if (title) title.textContent = ruleId;
        if (body) body.innerHTML = '<div style="padding:40px;text-align:center;"><i class="fas fa-spinner fa-spin fa-2x"></i></div>';
        modal.style.display = 'flex';
        // Backdrop click ile kapat
        modal.onclick = function(e) {
            if (e.target === modal) modal.style.display = 'none';
        };

        faApi('rule', { rule_id: ruleId }).then(function(res) {
            if (!res.success) {
                // Kural artık DB'de yok (silinmiş) → audit_log tarihçesinden tam görünüm üret
                if ((res.error || '').toLowerCase().indexOf('bulunam') >= 0) {
                    return fireAuditRenderDeletedRule(ruleId, body, title);
                }
                body.innerHTML = '<div class="fa-info-box">Hata: ' + faEscape(res.error || '') + '</div>';
                return;
            }
            var r = res.rule || {};
            var findings = res.findings || [];

            var html = '';

            // 1. Metadata block
            html += '<div class="fa-modal-section"><h4><i class="fas fa-info-circle"></i> Kural Bilgisi</h4>' +
                '<table class="fa-table fa-table-sm"><tbody>' +
                '<tr><th>Rule ID</th><td><strong>' + faEscape(r.rule_id) + '</strong></td></tr>' +
                '<tr><th>Adı</th><td>' + faEscape(r.name) + '</td></tr>' +
                '<tr><th>Action</th><td>' + faActionBadge(r.action) + '</td></tr>' +
                '<tr><th>Durum</th><td>' + (r.enabled ? '<span style="color:#27ae60">Aktif</span>' : '<span style="color:#95a5a6">Pasif</span>') + '</td></tr>' +
                '<tr><th>Log</th><td>' + (r.logging ? '✓' : '✗') + '</td></tr>' +
                (r.src_zones ? '<tr><th>Source Zone</th><td>' + faPillList(r.src_zones) + '</td></tr>' : '') +
                (r.dst_zones ? '<tr><th>Destination Zone</th><td>' + faPillList(r.dst_zones) + '</td></tr>' : '') +
                '<tr><th>Source Adresleri</th><td>' + faPillList(r.src_addresses) + '</td></tr>' +
                '<tr><th>Destination Adresleri</th><td>' + faPillList(r.dst_addresses) + '</td></tr>' +
                '<tr><th>Servisler</th><td>' + faPillList(r.services) + '</td></tr>' +
                (r.schedule ? '<tr><th>Zamanlama</th><td>' + faEscape(r.schedule) + '</td></tr>' : '') +
                '<tr><th>Yorum</th><td>' + faEscape(r.comments || '-') + '</td></tr>' +
                '<tr><th>Son fetch</th><td>' + (r.fetched_at ? faFormatTime(r.fetched_at, {seconds:true, tzTag:true}) + ' <small style="color:#95a5a6">(' + faRelativeTime(r.fetched_at) + ')</small>' : '-') + '</td></tr>' +
                '</tbody></table></div>';

            // 2. Hit count & last_used (from raw)
            var raw = r.raw || {};
            if (raw.hit_count !== undefined || raw.last_used) {
                html += '<div class="fa-modal-section"><h4><i class="fas fa-chart-line"></i> Traffic Analytics</h4>' +
                    '<table class="fa-table fa-table-sm"><tbody>' +
                    '<tr><th>Hit Count</th><td>' + (raw.hit_count !== undefined ? raw.hit_count : '-') + '</td></tr>' +
                    '<tr><th>Last Used</th><td>' + faEscape(raw.last_used || '-') + '</td></tr>' +
                    '<tr><th>Bytes</th><td>' + (raw.bytes || '-') + '</td></tr>' +
                    '<tr><th>Packets</th><td>' + (raw.packets || '-') + '</td></tr>' +
                    '</tbody></table></div>';
            }

            // 3. UTM profiles
            var utm = r.utm_profiles || {};
            var utmKeys = Object.keys(utm);
            html += '<div class="fa-modal-section"><h4><i class="fas fa-shield-alt"></i> UTM Profiles</h4>';
            if (utmKeys.length === 0) {
                html += '<div class="fa-info-box" style="background:#fdf2f2;border-color:#e74c3c;color:#c0392b">⚠ Hiçbir UTM profili tanımlı değil</div>';
            } else {
                html += '<table class="fa-table fa-table-sm"><tbody>';
                utmKeys.forEach(function(k) {
                    html += '<tr><th>' + faEscape(k) + '</th><td>' + faEscape(utm[k]) + '</td></tr>';
                });
                html += '</tbody></table>';
            }
            html += '</div>';

            // 4. Findings for this rule
            html += '<div class="fa-modal-section"><h4><i class="fas fa-exclamation-triangle"></i> Bulgular (' + findings.length + ')</h4>';
            if (findings.length === 0) {
                html += '<em>Bu kural için kayıt edilmiş finding yok.</em>';
            } else {
                html += '<div class="fa-ack-help"><i class="fas fa-info-circle"></i> ' +
                    'Ack durumu: <strong>Accepted</strong> = bilerek kabul edildi, <strong>FP</strong> = false positive, ' +
                    '<strong>Fixing</strong> = üzerinde çalışılıyor, <strong>Known</strong> = bilinir durum. ' +
                    'Ack\'lenen finding\'ler istatistiklere dahil edilmez ve gri renkte gösterilir.</div>';
                html += '<table class="fa-table fa-table-sm fa-ack-table"><thead><tr>' +
                    '<th>Tip</th><th>Severity</th><th>Skor</th><th>MITRE</th><th>Açıklama</th><th>Durum</th>' +
                    '</tr></thead><tbody>';
                findings.forEach(function(f) {
                    var mitre = (f.details && f.details.mitre) || '';
                    var ack = f.ack || null;
                    var rowCls = ack ? 'fa-row-acked' : '';
                    var ackHtml = renderAckControls(r.rule_id, f.type, ack);
                    html += '<tr class="' + rowCls + '">' +
                        '<td><strong>' + faEscape(f.type) + '</strong></td>' +
                        '<td>' + faSevBadge(f.severity) + '</td>' +
                        '<td><strong>' + (f.score || 0) + '</strong></td>' +
                        '<td>' + (mitre ? '<span class="fa-mitre">' + faEscape(mitre) + '</span>' : '-') + '</td>' +
                        '<td class="fa-cell-small">' + faEscape(f.recommendation || '-') + '</td>' +
                        '<td>' + ackHtml + '</td>' +
                        '</tr>';
                });
                html += '</tbody></table>';
            }
            html += '</div>';

            // 5. Raw vendor config (collapsed by default) — vendor-aware label
            html += '<div class="fa-modal-section"><h4><i class="fas fa-code"></i> ' + faVendorRawLabel() + ' ' +
                '<button onclick="document.getElementById(\'fa-raw-wrap\').style.display = document.getElementById(\'fa-raw-wrap\').style.display === \'none\' ? \'block\' : \'none\'" style="font-size:.75rem;padding:2px 8px;border:1px solid #ccd1d9;background:#f8f9fa;border-radius:3px;cursor:pointer">Göster/Gizle</button></h4>' +
                '<pre id="fa-raw-wrap" style="display:none;max-height:400px;overflow:auto;background:#1a1a2e;color:#e0e0e0;padding:12px;border-radius:4px;font-size:11px">' +
                faEscape(JSON.stringify(raw, null, 2)) +
                '</pre></div>';

            body.innerHTML = html;
        }).catch(function(err) {
            body.innerHTML = '<div class="fa-info-box">Bağlantı hatası: ' + faEscape(err.message) + '</div>';
        });
    };

    // cfgattr'ı alan→{old,new} mapine çevirir (Edit için old/new korunur, Add için sadece new).
    // Düz parseAuditCfgattr yalnızca son değeri döner — delta görüntülemek için ham hali gerekiyor.
    function parseAuditCfgattrDelta(s) {
        if (!s) return {};
        var out = {};
        var re = /([\w-]+)\[([^\]]*)\]/g;
        var m;
        while ((m = re.exec(s)) !== null) {
            var key = m[1].toLowerCase();
            var val = m[2];
            if (val.indexOf('->') >= 0) {
                var parts = val.split('->');
                out[key] = { old: parts[0].trim(), new: parts[1].trim() };
            } else {
                out[key] = { new: val };  // Add event — sadece yeni değer
            }
        }
        return out;
    }
    window.parseAuditCfgattrDelta = parseAuditCfgattrDelta;

    // Verilen instance'ın her event'i sonrası kuralın cumulative state'ini döner.
    // Silinmeden önceki her andaki görünüm için Add'i baseline al, Edit'leri sırayla uygula.
    function faReconstructInstanceStates(instance) {
        var states = [];
        var currentState = {};
        var keyMap = {
            'srcintf': 'src_zones', 'dstintf': 'dst_zones',
            'srcaddr': 'src_addresses', 'dstaddr': 'dst_addresses',
            'service': 'services', 'action': 'action',
            'name': 'name', 'status': 'status', 'comments': 'comments',
            'logtraffic': 'logging', 'schedule': 'schedule'
        };
        var listKeys = { src_zones:1, dst_zones:1, src_addresses:1, dst_addresses:1, services:1 };
        function applyDeltaToState(delta, target) {
            Object.keys(delta).forEach(function(k) {
                var mapped = keyMap[k] || k;
                var nv = delta[k].new;
                if (nv === undefined) return;
                if (listKeys[mapped]) {
                    target[mapped] = String(nv).split(/\s+/).filter(function(x){ return x; });
                } else if (mapped === 'status') {
                    target.enabled = nv === 'enable';
                } else if (mapped === 'logging') {
                    target.logging = nv !== 'disable';
                } else {
                    target[mapped] = nv;
                }
            });
        }

        (instance.events || []).forEach(function(e, idx) {
            var step = { event_idx: idx, event: e, action: e.action, user: e.user, datetime: e.log_datetime };
            var delta = parseAuditCfgattrDelta(e.cfgattr || '');
            if (e.action === 'Add') {
                currentState = {};
                applyDeltaToState(delta, currentState);
                step.state = Object.assign({}, currentState);
                step.delta_raw = delta;
                step.delta_summary = 'Yeni kural oluşturuldu';
                step.delta_kind = 'create';
            } else if (e.action === 'Edit') {
                applyDeltaToState(delta, currentState);
                step.state = Object.assign({}, currentState);
                step.delta_raw = delta;
                step.delta_summary = faSummarizeEditDelta(delta);
                step.delta_kind = faClassifyEditDelta(delta);
            } else if (e.action === 'Move') {
                step.state = Object.assign({}, currentState);
                step.delta_raw = {};
                step.delta_summary = faExtractMoveSummary(e.msg || e.cfgattr || '');
                step.delta_kind = 'move';
            } else if (e.action === 'Delete') {
                step.state_before = Object.assign({}, currentState);
                step.state = null;
                step.delta_raw = {};
                step.delta_summary = 'Kural silindi';
                step.delta_kind = 'delete';
                currentState = {};
            } else {
                step.state = Object.assign({}, currentState);
                step.delta_raw = delta;
                step.delta_summary = '(bilinmeyen aksiyon)';
                step.delta_kind = 'neutral';
            }
            states.push(step);
        });
        return states;
    }

    // Edit delta'yı insan-okunur özete çevirir ("service: SSH → SSH HTTPS" gibi).
    // Listeler için eklenen/çıkarılan öğeleri açıkça söyler.
    function faSummarizeEditDelta(delta) {
        var listKeys = { srcintf:1, dstintf:1, srcaddr:1, dstaddr:1, service:1 };
        var labelMap = {
            srcintf: 'Src Zone', dstintf: 'Dst Zone',
            srcaddr: 'Source', dstaddr: 'Destination',
            service: 'Servis', status: 'Durum',
            action: 'Action', name: 'Adı',
            comments: 'Yorum', logtraffic: 'Log', schedule: 'Zaman'
        };
        var parts = [];
        Object.keys(delta).forEach(function(k) {
            if (k === 'uuid-idx') return;  // internal — göstermeye değmez
            var d = delta[k];
            var label = labelMap[k] || k;
            if (listKeys[k] && d.old !== undefined) {
                var oldItems = String(d.old).split(/\s+/).filter(Boolean);
                var newItems = String(d.new).split(/\s+/).filter(Boolean);
                var oldSet = {}, newSet = {};
                oldItems.forEach(function(v) { oldSet[v] = true; });
                newItems.forEach(function(v) { newSet[v] = true; });
                var added = newItems.filter(function(v) { return !oldSet[v]; });
                var removed = oldItems.filter(function(v) { return !newSet[v]; });
                if (added.length) parts.push(label + ' eklendi: ' + added.join(', '));
                if (removed.length) parts.push(label + ' çıkarıldı: ' + removed.join(', '));
                if (!added.length && !removed.length) parts.push(label + ' sıralaması değişti');
            } else if (d.old !== undefined) {
                if (k === 'status') {
                    parts.push(d.new === 'enable' ? 'Aktifleştirildi' : 'Pasifleştirildi');
                } else {
                    parts.push(label + ': ' + d.old + ' → ' + d.new);
                }
            } else {
                parts.push(label + ' ayarlandı: ' + d.new);
            }
        });
        return parts.length ? parts.join(' · ') : 'Ayrıntı yok';
    }

    // Edit delta'nın baskın niteliğini sınıflandır — renk/ikon seçimi için.
    // "service eklendi" ve "status enable" farklı görünümler alır.
    function faClassifyEditDelta(delta) {
        var keys = Object.keys(delta).filter(function(k) { return k !== 'uuid-idx'; });
        if (keys.length === 1) {
            var k = keys[0];
            if (k === 'status') return delta.status.new === 'enable' ? 'enable' : 'disable';
        }
        return 'edit';
    }

    function faExtractMoveSummary(msg) {
        // msg örnek: "Move firewall.policy 269 to 150"
        var m = String(msg || '').match(/to\s+(\d+)/i);
        if (m) return 'Kural #' + m[1] + ' pozisyonuna taşındı';
        return 'Kural sıralaması değişti';
    }

    // Event aksiyonuna göre ikon/renk meta'sı. Tutarlı 4-renk paleti burada.
    function faStepVisual(kind) {
        switch (kind) {
            case 'create':  return { cls: 'fa-step-create',  icon: 'fa-plus-circle',  label: 'Kural Oluşturuldu' };
            case 'delete':  return { cls: 'fa-step-delete',  icon: 'fa-trash',        label: 'Silindi' };
            case 'enable':  return { cls: 'fa-step-edit',    icon: 'fa-toggle-on',    label: 'Aktifleştirildi' };
            case 'disable': return { cls: 'fa-step-edit',    icon: 'fa-toggle-off',   label: 'Pasifleştirildi' };
            case 'edit':    return { cls: 'fa-step-edit',    icon: 'fa-pen',          label: 'Değiştirildi' };
            case 'move':    return { cls: 'fa-step-move',    icon: 'fa-arrows-alt-v', label: 'Taşındı' };
            default:        return { cls: 'fa-step-neutral', icon: 'fa-circle',       label: '' };
        }
    }

    function faRenderStateTable(state) {
        if (!state || !Object.keys(state).length) return '<em style="color:#95a5a6">Kural bu adımda silindi.</em>';
        var rows = '';
        if (state.name) rows += '<tr><th>Adı</th><td><strong>' + faEscape(state.name) + '</strong></td></tr>';
        if (state.action) rows += '<tr><th>Action</th><td>' + faActionBadge(state.action) + '</td></tr>';
        if (state.enabled !== undefined) rows += '<tr><th>Durum</th><td>' + (state.enabled ? '<span style="color:#27ae60">✓ Aktif</span>' : '<span style="color:#95a5a6">Pasif</span>') + '</td></tr>';
        if (state.src_zones) rows += '<tr><th>Src Zone</th><td>' + faPillList(state.src_zones) + '</td></tr>';
        if (state.dst_zones) rows += '<tr><th>Dst Zone</th><td>' + faPillList(state.dst_zones) + '</td></tr>';
        if (state.src_addresses) rows += '<tr><th>Source</th><td>' + faPillList(state.src_addresses) + '</td></tr>';
        if (state.dst_addresses) rows += '<tr><th>Destination</th><td>' + faPillList(state.dst_addresses) + '</td></tr>';
        if (state.services) rows += '<tr><th>Servis</th><td>' + faPillList(state.services) + '</td></tr>';
        if (state.schedule) rows += '<tr><th>Zaman</th><td>' + faEscape(state.schedule) + '</td></tr>';
        if (state.comments) rows += '<tr><th>Yorum</th><td>' + faEscape(state.comments) + '</td></tr>';
        return '<table class="fa-table fa-table-sm">' + rows + '</table>';
    }

    // Tek bir instance'ın tüm step kartlarını + özet state'i render eder.
    function faRenderInstanceContent(instance, ruleId) {
        var steps = faReconstructInstanceStates(instance);
        var html = '';

        // 1. Lifecycle özeti
        var stateLabel = {
            'deleted':              { txt: 'Silindi',  cls: 'fa-inst-deleted' },
            'deleted_no_create_log':{ txt: 'Silindi (oluşturma logu yok)', cls: 'fa-inst-deleted' },
            'active':               { txt: 'Hâlâ aktif', cls: 'fa-inst-active' },
            'orphan':               { txt: 'Önceden var olan kayıt', cls: 'fa-inst-neutral' }
        }[instance.state] || { txt: instance.state || '-', cls: 'fa-inst-neutral' };

        html += '<div class="fa-modal-section"><h4><i class="fas fa-info-circle"></i> Bu Instance\'ın Özeti</h4>' +
            '<table class="fa-table fa-table-sm"><tbody>' +
            '<tr><th>Rule ID</th><td><strong>' + faEscape(ruleId) + '</strong> <small style="color:#7f8c8d">— bu ID\'nin #' + instance.instance_no + '. kullanımı</small></td></tr>' +
            '<tr><th>Durum</th><td><span class="fa-pill ' + stateLabel.cls + '">' + stateLabel.txt + '</span></td></tr>' +
            '<tr><th>Oluşturan</th><td>' + (instance.add_user ? '<strong>' + faEscape(instance.add_user) + '</strong> @ ' + faEscape(instance.add_at || '-') : '<em style="color:#95a5a6">Log yok (audit retention öncesi)</em>') + '</td></tr>' +
            '<tr><th>Silen</th><td>' + (instance.delete_user ? '<strong>' + faEscape(instance.delete_user) + '</strong> @ ' + faEscape(instance.delete_at || '-') : '<em style="color:#95a5a6">—</em>') + '</td></tr>' +
            '<tr><th>Toplam Event</th><td><strong>' + instance.event_count + '</strong> (Edit: ' + instance.edit_count + ', Move: ' + instance.move_count + ')</td></tr>' +
            '<tr><th>Kullanıcılar</th><td>' + (instance.users || []).map(faEscape).join(', ') + '</td></tr>' +
            '</tbody></table></div>';

        // 2. Silinmeden önceki son hali (yalnızca silinenler için)
        var lastActiveStep = null;
        for (var i = steps.length - 1; i >= 0; i--) {
            if (steps[i].state) { lastActiveStep = steps[i]; break; }
            if (steps[i].state_before) { lastActiveStep = { state: steps[i].state_before }; break; }
        }
        if (lastActiveStep && lastActiveStep.state && Object.keys(lastActiveStep.state).length) {
            html += '<div class="fa-modal-section"><h4><i class="fas fa-cube"></i> Son Konfigürasyon</h4>' +
                '<small style="color:#7f8c8d">Bu instance\'ın silinmeden (veya son event\'ten) önceki hali.</small>' +
                '<div style="margin-top:8px">' + faRenderStateTable(lastActiveStep.state) + '</div></div>';
        }

        // 3. Step-by-Step timeline — her event ayrı kart, default kapalı
        html += '<div class="fa-modal-section"><h4><i class="fas fa-history"></i> Adım Adım Geçmiş (' + steps.length + ' event)</h4>' +
            '<small style="color:#7f8c8d">Her kart kuralın o anki tam halini ve ne değiştiğini gösterir. Tıklayınca açılır.</small>' +
            '<div class="fa-step-timeline">';

        steps.forEach(function(step, idx) {
            var v = faStepVisual(step.delta_kind);
            var bodyState = step.state || step.state_before;
            var bodyHtml = '';
            if (step.delta_kind === 'create') {
                bodyHtml = '<div class="fa-step-section"><div class="fa-step-heading">Oluşturulduğundaki hali</div>' +
                    faRenderStateTable(step.state) + '</div>';
            } else if (step.delta_kind === 'delete') {
                bodyHtml = '<div class="fa-step-section"><div class="fa-step-heading">Silinmeden hemen önceki hali</div>' +
                    faRenderStateTable(step.state_before) + '</div>';
            } else if (step.delta_kind === 'move') {
                bodyHtml = '<div class="fa-step-section"><em style="color:#7f8c8d">Sadece sıralama değişti — konfigürasyon aynı kaldı.</em></div>';
            } else {
                // Edit → delta detay + o anki tam state
                bodyHtml = '<div class="fa-step-section"><div class="fa-step-heading">Ne değişti</div>' +
                    faRenderDeltaDetail(step.delta_raw) + '</div>' +
                    '<div class="fa-step-section"><div class="fa-step-heading">Değişimden sonraki tam hali</div>' +
                    faRenderStateTable(step.state) + '</div>';
            }

            html += '<div class="fa-step-card ' + v.cls + '" data-step="' + idx + '">' +
                '<div class="fa-step-head" onclick="this.parentNode.classList.toggle(\'open\')">' +
                    '<div class="fa-step-num">#' + (idx + 1) + '</div>' +
                    '<div class="fa-step-icon"><i class="fas ' + v.icon + '"></i></div>' +
                    '<div class="fa-step-info">' +
                        '<div class="fa-step-title">' + faEscape(v.label || step.action) + '</div>' +
                        '<div class="fa-step-delta">' + faEscape(step.delta_summary) + '</div>' +
                    '</div>' +
                    '<div class="fa-step-meta">' +
                        '<div class="fa-step-user"><strong>' + faEscape(step.user || '?') + '</strong></div>' +
                        '<div class="fa-step-time"><small>' + faEscape(step.datetime) + '</small></div>' +
                    '</div>' +
                    '<div class="fa-step-chevron"><i class="fas fa-chevron-down"></i></div>' +
                '</div>' +
                '<div class="fa-step-body">' + bodyHtml +
                    '<details class="fa-step-raw"><summary><i class="fas fa-code"></i> Ham cfgattr</summary>' +
                    '<pre>' + faEscape(step.event.cfgattr || step.event.msg || '-') + '</pre></details>' +
                '</div>' +
                '</div>';
        });

        html += '</div></div>';
        return html;
    }

    // Tek bir Edit event'inin delta'sını detaylı renderla — liste eklemeleri,
    // scalar değişimleri ayırt ederek.
    function faRenderDeltaDetail(delta) {
        var keys = Object.keys(delta).filter(function(k) { return k !== 'uuid-idx'; });
        if (!keys.length) return '<em style="color:#95a5a6">Takip edilen field değişmedi.</em>';
        var listKeys = { srcintf:1, dstintf:1, srcaddr:1, dstaddr:1, service:1 };
        var labelMap = {
            srcintf: 'Src Zone', dstintf: 'Dst Zone',
            srcaddr: 'Source', dstaddr: 'Destination',
            service: 'Servis', status: 'Durum',
            action: 'Action', name: 'Adı',
            comments: 'Yorum', logtraffic: 'Log', schedule: 'Zaman'
        };
        var html = '';
        keys.forEach(function(k) {
            var d = delta[k];
            var label = labelMap[k] || k;
            if (listKeys[k] && d.old !== undefined) {
                var oldItems = String(d.old).split(/\s+/).filter(Boolean);
                var newItems = String(d.new).split(/\s+/).filter(Boolean);
                var oldSet = {}, newSet = {};
                oldItems.forEach(function(v) { oldSet[v] = true; });
                newItems.forEach(function(v) { newSet[v] = true; });
                var added = newItems.filter(function(v) { return !oldSet[v]; });
                var removed = oldItems.filter(function(v) { return !newSet[v]; });
                html += '<div class="fa-delta-row"><strong>' + faEscape(label) + '</strong>';
                html += ' <small style="color:#7f8c8d">(' + oldItems.length + ' → ' + newItems.length + ')</small><br>';
                if (added.length) html += '<span class="fa-delta-added">+ ' + added.map(faEscape).join(', ') + '</span>';
                if (removed.length) { if (added.length) html += '<br>'; html += '<span class="fa-delta-removed">− ' + removed.map(faEscape).join(', ') + '</span>'; }
                if (!added.length && !removed.length) html += '<em style="color:#95a5a6">Sadece sıralama değişti</em>';
                html += '</div>';
            } else if (d.old !== undefined) {
                html += '<div class="fa-delta-row"><strong>' + faEscape(label) + ':</strong> ' +
                    '<s class="fa-delta-removed-inline">' + faEscape(String(d.old)) + '</s> → ' +
                    '<strong class="fa-delta-added-inline">' + faEscape(String(d.new)) + '</strong></div>';
            } else {
                html += '<div class="fa-delta-row"><strong>' + faEscape(label) + '</strong> = ' +
                    '<span class="fa-delta-added-inline">' + faEscape(String(d.new)) + '</span></div>';
            }
        });
        return html;
    }

    // Instance tab arasında geçiş — ilgili içerik div'ini seçer.
    window.fireAuditSelectInstance = function(idx) {
        var tabs = document.querySelectorAll('#fa-inst-tabs .fa-inst-tab');
        for (var i = 0; i < tabs.length; i++) {
            tabs[i].classList.toggle('active', parseInt(tabs[i].getAttribute('data-idx'), 10) === idx);
        }
        var panes = document.querySelectorAll('#fa-modal-body .fa-inst-pane');
        for (var j = 0; j < panes.length; j++) {
            panes[j].style.display = parseInt(panes[j].getAttribute('data-idx'), 10) === idx ? 'block' : 'none';
        }
    };

    // Silinen veya henüz snapshot'a düşmemiş kural için fallback view —
    // audit_log'dan tam tarihçe + parse edilmiş son konfigürasyon.
    // rule_id aynı olsa bile Add..Delete sınırlarına göre birden fazla "instance"
    // gösterebilir (FortiGate ID'yi yeniden kullanabilir).
    window.fireAuditRenderDeletedRule = function(ruleId, body, title) {
        title.innerHTML = ruleId + ' <small style="color:#c0392b;font-size:.7em">(silinmiş / DB\'de yok)</small>';
        body.innerHTML = '<div style="padding:30px;text-align:center;"><i class="fas fa-spinner fa-spin fa-2x"></i><br><br><small>Audit tarihçesi okunuyor...</small></div>';

        return faApi('rule_audit', { rule_id: ruleId }).then(function(res) {
            if (!res.success) {
                body.innerHTML = '<div class="fa-info-box">Audit tarihçe hatası: ' + faEscape(res.error || '') + '</div>';
                return;
            }
            var events = res.events || [];
            if (!events.length) {
                body.innerHTML = '<div class="fa-info-box fa-info-warn">' +
                    '<i class="fas fa-exclamation-triangle"></i> Bu rule_id için ne policy DB\'sinde ne de audit_log\'da kayıt var. ' +
                    'Olası sebepler: (1) rule_id yanlış, (2) audit_log fetch henüz çalışmamış, (3) çok eski kayıt.</div>';
                return;
            }

            var instances = res.instances || [];
            if (!instances.length) {
                body.innerHTML = '<div class="fa-info-box">Instance segmentasyonu boş döndü (' + events.length + ' event olmasına rağmen). Backend sürümünü kontrol et.</div>';
                return;
            }

            var html = '';

            // Başlık — kaç instance var?
            if (instances.length > 1) {
                html += '<div class="fa-modal-section fa-inst-banner">' +
                    '<i class="fas fa-exclamation-circle"></i> <strong>Rule ID ' + faEscape(ruleId) + '</strong> bu zaman aralığında <strong>' + instances.length + ' kez</strong> kullanılmış. ' +
                    'Her biri ayrı bir kural — ID rastlantı sonucu aynı. Aşağıdaki sekmelerden istediğini seç.' +
                    '</div>';
                html += '<div id="fa-inst-tabs" class="fa-inst-tabs">';
                instances.forEach(function(inst, idx) {
                    var lbl = 'Instance #' + inst.instance_no;
                    var userLbl = inst.add_user || (inst.users && inst.users[0]) || '?';
                    var when = inst.add_at ? inst.add_at.substring(11, 16) : (inst.first_seen || '').substring(11, 16);
                    var endWhen = inst.delete_at ? inst.delete_at.substring(11, 16) : '';
                    var stateIcon = inst.state === 'deleted' || inst.state === 'deleted_no_create_log' ? '<i class="fas fa-trash"></i>' :
                                    inst.state === 'active' ? '<i class="fas fa-check-circle"></i>' :
                                    '<i class="fas fa-question-circle"></i>';
                    html += '<div class="fa-inst-tab ' + (idx === 0 ? 'active' : '') + '" data-idx="' + idx + '"' +
                        ' onclick="fireAuditSelectInstance(' + idx + ')">' +
                        stateIcon + ' <strong>' + lbl + '</strong>' +
                        '<div class="fa-inst-tab-sub">' + faEscape(userLbl) +
                        (when ? ' · ' + faEscape(when) + (endWhen ? '→' + faEscape(endWhen) : '') : '') + '</div>' +
                        '</div>';
                });
                html += '</div>';
            }

            // Her instance'ın kendi pane'i — default ilk aktif
            instances.forEach(function(inst, idx) {
                html += '<div class="fa-inst-pane" data-idx="' + idx + '" style="display:' + (idx === 0 ? 'block' : 'none') + '">' +
                    faRenderInstanceContent(inst, ruleId) +
                    '</div>';
            });

            body.innerHTML = html;
        });
    };

    window.fireAuditCloseRuleModal = function() {
        document.getElementById('fa-rule-modal').style.display = 'none';
    };

    // ESC ile kapat
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && document.getElementById('fa-rule-modal') && document.getElementById('fa-rule-modal').style.display === 'flex') {
            fireAuditCloseRuleModal();
        }
    });

    // Tablo hücresi tıklama → ellipsis genişlet/daralt (Not 15+16)
    // Sadece ellipsis-clipped olan td'lerde (scrollWidth > clientWidth).
    // fa-rule-link veya buton içeren td'lerde override etme.
    document.addEventListener('click', function(e) {
        var td = e.target.closest && e.target.closest('.fa-table tbody td');
        if (!td) return;
        // Tıklanabilir element içeriyorsa → bypass
        if (e.target.closest('a, button, input, select, .fa-rule-link, .fa-bulk-cb')) return;
        if (td.classList.contains('fa-expanded')) {
            td.classList.remove('fa-expanded');
        } else if (td.scrollWidth > td.clientWidth + 2 || (td.title && td.title.length > 40)) {
            td.classList.add('fa-expanded');
        }
    });

    // ---------- Report download (filtreli + HTML/PDF) ----------
    window.fireAuditDownloadReport = function(opts) {
        opts = opts || {};
        // Interaktif mod: modal ac
        if (!opts.silent) {
            return fireAuditShowReportModal();
        }
        var qs = 'action=report&fw_slug=' + encodeURIComponent(FW_SLUG);
        if (opts.severity && opts.severity.length) qs += '&severity=' + encodeURIComponent(opts.severity.join(','));
        if (opts.types && opts.types.length) qs += '&types=' + encodeURIComponent(opts.types.join(','));
        if (opts.exclude_acked) qs += '&exclude_acked=1';
        if (opts.format === 'pdf') qs += '&format=pdf';
        window.open(API_BASE + '?' + qs, '_blank');
    };

    function fireAuditShowReportModal() {
        var existing = document.getElementById('fa-report-modal');
        if (existing) existing.remove();
        var m = document.createElement('div');
        m.id = 'fa-report-modal';
        m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;z-index:9998;';
        m.innerHTML =
            '<div style="background:var(--card-bg,#fff);padding:24px 28px;border-radius:10px;max-width:560px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.4);">' +
            '<h3 style="margin-top:0;"><i class="fas fa-file-alt"></i> Rapor Filtreleri</h3>' +
            '<p style="color:var(--text-muted);font-size:.85rem;">Severity ve bulgu tipleri seçin. Boş bırakırsanız hepsi dahil edilir.</p>' +
            '<div style="margin-bottom:14px;">' +
              '<strong>Severity</strong><br>' +
              '<label style="margin-right:12px;"><input type="checkbox" class="fa-rep-sev" value="CRITICAL" checked> CRITICAL</label>' +
              '<label style="margin-right:12px;"><input type="checkbox" class="fa-rep-sev" value="HIGH" checked> HIGH</label>' +
              '<label style="margin-right:12px;"><input type="checkbox" class="fa-rep-sev" value="MEDIUM"> MEDIUM</label>' +
              '<label style="margin-right:12px;"><input type="checkbox" class="fa-rep-sev" value="LOW"> LOW</label>' +
            '</div>' +
            '<div style="margin-bottom:14px;">' +
              '<strong>Finding Tipleri</strong><br>' +
              '<label style="margin-right:12px;"><input type="checkbox" class="fa-rep-typ" value="shadow" checked> Shadow</label>' +
              '<label style="margin-right:12px;"><input type="checkbox" class="fa-rep-typ" value="any" checked> ANY</label>' +
              '<label style="margin-right:12px;"><input type="checkbox" class="fa-rep-typ" value="risk" checked> Risk</label>' +
              '<label style="margin-right:12px;"><input type="checkbox" class="fa-rep-typ" value="profile"> UTM Gaps</label>' +
              '<label style="margin-right:12px;"><input type="checkbox" class="fa-rep-typ" value="duplicate"> Duplicates</label><br>' +
              '<label style="margin-right:12px;"><input type="checkbox" class="fa-rep-typ" value="vpn"> VPN</label>' +
              '<label style="margin-right:12px;"><input type="checkbox" class="fa-rep-typ" value="zone"> Zone Matrix</label>' +
              '<label style="margin-right:12px;"><input type="checkbox" class="fa-rep-typ" value="interfaces"> Interfaces</label>' +
            '</div>' +
            '<div style="margin-bottom:14px;">' +
              '<label><input type="checkbox" id="fa-rep-exclude-acked"> Ack\'lenen findings\'leri haric tut</label>' +
            '</div>' +
            '<div style="margin-bottom:14px;">' +
              '<strong>Format</strong><br>' +
              '<label style="margin-right:12px;"><input type="radio" name="fa-rep-format" value="html" checked> HTML (browser\'da ac, print → PDF)</label>' +
              '<label><input type="radio" name="fa-rep-format" value="pdf"> PDF (server-side, weasyprint)</label>' +
            '</div>' +
            '<div style="display:flex;gap:8px;justify-content:flex-end;">' +
              '<button class="fa-btn fa-btn-secondary" onclick="document.getElementById(\'fa-report-modal\').remove()">Iptal</button>' +
              '<button class="fa-btn fa-btn-primary" onclick="fireAuditDoDownloadReport()"><i class="fas fa-download"></i> Indir</button>' +
            '</div>' +
            '</div>';
        document.body.appendChild(m);
    }
    window.fireAuditShowReportModal = fireAuditShowReportModal;

    window.fireAuditDoDownloadReport = function() {
        var sev = Array.from(document.querySelectorAll('.fa-rep-sev:checked')).map(function(c){return c.value;});
        var typ = Array.from(document.querySelectorAll('.fa-rep-typ:checked')).map(function(c){return c.value;});
        var exclude = document.getElementById('fa-rep-exclude-acked').checked;
        var fmtEl = document.querySelector('input[name="fa-rep-format"]:checked');
        var fmt = fmtEl ? fmtEl.value : 'html';
        document.getElementById('fa-report-modal').remove();
        fireAuditDownloadReport({
            silent: true,
            severity: sev.length === 4 ? [] : sev,  // hepsi secili ise filter koyma
            types: typ.length === 8 ? [] : typ,
            exclude_acked: exclude,
            format: fmt,
        });
    };

    // ---------- Sync ----------
    window.fireAuditSync = function() {
        var btn = document.getElementById('fa-sync-btn');
        var icon = document.getElementById('fa-sync-icon');
        var text = document.getElementById('fa-sync-text');
        if (btn.classList.contains('fa-syncing')) return;
        btn.classList.add('fa-syncing');
        icon.classList.add('fa-spin');
        text.textContent = 'Senkronize ediliyor...';
        faApiPost('sync').then(function(res) {
            btn.classList.remove('fa-syncing');
            icon.classList.remove('fa-spin');
            text.textContent = 'Senkronize Et';
            if (!res.success) {
                var msg = res.error || 'Hata';
                if (res.steps) {
                    msg += '\n\n';
                    res.steps.forEach(function(s) {
                        msg += '[' + s.step + '] ' + (s.ok?'OK':'FAIL') + (s.error?' — '+s.error:'') + '\n';
                    });
                }
                alert('Sync hatası:\n' + msg);
                return;
            }
            // Refresh everything
            loadFireAuditStats();
            loadFireAuditDashboard();
            updateFirewallStatus();   // "İlk sync gerekli" mesajini kaldir
            if (typeof loadFirewallList === 'function') loadFirewallList();  // dropdown'u tazele
            if (currentTab !== 'dashboard') fireAuditSwitchTab(currentTab);
        }).catch(function(err) {
            btn.classList.remove('fa-syncing');
            icon.classList.remove('fa-spin');
            text.textContent = 'Senkronize Et';
            alert('Bağlantı hatası: ' + err.message);
        });
    };

    // Hafif senkron — sadece fetch + diff (+ switch/router'da config_diff).
    // analyze/compliance/objects/advanced gibi ağır adımları atlar (crontab'daki
    // "iş saatleri 30 dakikada bir" job'ıyla aynı zincir) — sadece taze bir diff
    // görmek isteyen kullanıcı için ağır tam senkronu beklemesine gerek kalmaz.
    window.fireAuditSyncDiff = function(btnId, textId, iconId) {
        var btn = document.getElementById(btnId || 'fa-sync-diff-btn');
        var icon = document.getElementById(iconId || 'fa-sync-diff-icon');
        var text = document.getElementById(textId || 'fa-sync-diff-text');
        if (btn && btn.classList.contains('fa-syncing')) return;
        if (btn) btn.classList.add('fa-syncing');
        if (icon) icon.classList.add('fa-spin');
        if (text) text.textContent = 'Diff yenileniyor...';
        faApiPost('sync_diff').then(function(res) {
            if (btn) btn.classList.remove('fa-syncing');
            if (icon) icon.classList.remove('fa-spin');
            if (text) text.textContent = 'Sadece Diff Çek';
            if (!res.success) {
                alert('Sync hatası: ' + (res.error || 'bilinmiyor'));
                return;
            }
            updateFirewallStatus();
            if (currentTab === 'diff') fireAuditSwitchTab('diff');
        }).catch(function(err) {
            if (btn) btn.classList.remove('fa-syncing');
            if (icon) icon.classList.remove('fa-spin');
            if (text) text.textContent = 'Sadece Diff Çek';
            alert('Bağlantı hatası: ' + err.message);
        });
    };

    // ---------- CLI Snapshot ----------
    // Buton etiketleri sadece GORUNTU amaclidir — gercek yetki/whitelist HER ZAMAN
    // backend'de (firewall-audit/fireaudit_cli_command.py). Buradaki key'ler o
    // dosyadaki COMMAND_MAP'lerle birebir eslesmeli.
    var _CLI_SNAP_CISCO = [
        {key:'run_config',    label:'Running Config',    icon:'fa-file-code'},
        {key:'version',       label:'Version',           icon:'fa-info-circle'},
        {key:'if_brief',      label:'Interface Brief',   icon:'fa-ethernet'},
        {key:'if_status',     label:'Interface Status',  icon:'fa-plug'},
        {key:'route',         label:'IP Route',          icon:'fa-route'},
        {key:'bgp_summary',   label:'BGP Summary',       icon:'fa-project-diagram'},
        {key:'vlan',          label:'VLAN Brief',        icon:'fa-layer-group'},
        {key:'cdp_neighbors', label:'CDP Neighbors',     icon:'fa-network-wired'},
        {key:'stp',           label:'STP Summary',       icon:'fa-tree'}
    ];
    var _CLI_SNAP_DELL = [
        {key:'run_config',    label:'Running Config',    icon:'fa-file-code'},
        {key:'version',       label:'Version',           icon:'fa-info-circle'},
        {key:'if_brief',      label:'Interface Brief',   icon:'fa-ethernet'},
        {key:'if_status',     label:'Interface Status',  icon:'fa-plug'},
        {key:'vlan',          label:'VLAN',              icon:'fa-layer-group'},
        {key:'route',         label:'IP Route',          icon:'fa-route'},
        {key:'cdp_neighbors', label:'LLDP Neighbors',    icon:'fa-network-wired'},
        {key:'stp',           label:'STP Brief',         icon:'fa-tree'}
    ];
    var CLI_SNAPSHOT_COMMANDS = {
        cisco_ios: _CLI_SNAP_CISCO,
        cisco_nxos: _CLI_SNAP_CISCO,
        huawei: [
            {key:'run_config', label:'Current Config',  icon:'fa-file-code'},
            {key:'version',    label:'Version',         icon:'fa-info-circle'},
            {key:'if_brief',   label:'Interface Brief', icon:'fa-ethernet'},
            {key:'route',      label:'Routing Table',   icon:'fa-route'}
        ],
        dell_os10: _CLI_SNAP_DELL,
        dell_force10: _CLI_SNAP_DELL,
        dell_powerconnect: _CLI_SNAP_DELL
    };
    var _cliSnapSelectedKey = null;

    function loadCliSnapshot() {
        var currentFw = firewallList.find(function(f) { return f.slug === FW_SLUG; });
        var fwType = currentFw ? (currentFw.firewall_type || '') : '';
        var cmds = CLI_SNAPSHOT_COMMANDS[fwType] || [];
        var wrap = document.getElementById('cli-snap-buttons');
        if (!wrap) return;
        _cliSnapSelectedKey = null;
        var runBtn = document.getElementById('cli-snap-run-btn');
        if (runBtn) runBtn.disabled = true;

        if (!cmds.length) {
            wrap.innerHTML = '<div style="color:var(--text-secondary);font-size:13px;padding:8px 2px;">' +
                'Bu cihaz türü (' + _esc(fwType || 'bilinmiyor') + ') için CLI Snapshot komut seti henüz tanımlı değil.</div>';
            return;
        }
        wrap.innerHTML = cmds.map(function(c) {
            return '<button type="button" class="cli-snap-cmd-btn" data-cmd-key="' + _esc(c.key) + '" ' +
                   'onclick="fireAuditCliSnapshotSelect(\'' + c.key + '\')">' +
                   '<i class="fas ' + c.icon + '"></i><span>' + _esc(c.label) + '</span></button>';
        }).join('');
    }

    window.fireAuditCliSnapshotSelect = function(key) {
        _cliSnapSelectedKey = key;
        var wrap = document.getElementById('cli-snap-buttons');
        if (wrap) {
            var btns = wrap.querySelectorAll('.cli-snap-cmd-btn');
            for (var i = 0; i < btns.length; i++) {
                btns[i].classList.toggle('active', btns[i].getAttribute('data-cmd-key') === key);
            }
        }
        var runBtn = document.getElementById('cli-snap-run-btn');
        if (runBtn) runBtn.disabled = false;
    };

    window.fireAuditCliSnapshotRun = function() {
        if (!_cliSnapSelectedKey) return;
        var runBtn = document.getElementById('cli-snap-run-btn');
        var runIcon = document.getElementById('cli-snap-run-icon');
        var runText = document.getElementById('cli-snap-run-text');
        var out = document.getElementById('cli-snap-output');
        var meta = document.getElementById('cli-snap-meta');
        if (!runBtn || runBtn.classList.contains('fa-syncing')) return;

        runBtn.classList.add('fa-syncing');
        runBtn.disabled = true;
        if (runIcon) { runIcon.classList.remove('fa-play'); runIcon.classList.add('fa-spinner', 'fa-spin'); }
        if (runText) runText.textContent = 'Sorgulanıyor...';
        if (out) { out.textContent = 'Cihaza bağlanılıyor, komut çalıştırılıyor...'; out.className = 'cli-snap-output'; }
        if (meta) meta.textContent = '';

        faApiPost('cli_command', { cmd: _cliSnapSelectedKey }).then(function(res) {
            runBtn.classList.remove('fa-syncing');
            runBtn.disabled = false;
            if (runIcon) { runIcon.classList.remove('fa-spinner', 'fa-spin'); runIcon.classList.add('fa-play'); }
            if (runText) runText.textContent = 'Sorgula';

            if (!res.success) {
                if (out) {
                    out.textContent = res.busy
                        ? ('Bu cihazda zaten bir işlem çalışıyor. ' + (res.error || ''))
                        : ('Hata: ' + (res.error || 'bilinmiyor'));
                    out.className = 'cli-snap-output cli-snap-output-error';
                }
                return;
            }
            if (out) {
                out.textContent = res.output || '(boş çıktı)';
                out.className = 'cli-snap-output' + (res.output ? '' : ' cli-snap-output-empty');
            }
            if (meta) {
                var _now = new Date();
                var _pad = function(n) { return n < 10 ? '0' + n : '' + n; };
                meta.textContent = 'Son sorgu: ' + _pad(_now.getHours()) + ':' + _pad(_now.getMinutes()) + ':' + _pad(_now.getSeconds());
            }
        }).catch(function(err) {
            runBtn.classList.remove('fa-syncing');
            runBtn.disabled = false;
            if (runIcon) { runIcon.classList.remove('fa-spinner', 'fa-spin'); runIcon.classList.add('fa-play'); }
            if (runText) runText.textContent = 'Sorgula';
            if (out) { out.textContent = 'Bağlantı hatası: ' + err.message; out.className = 'cli-snap-output cli-snap-output-error'; }
        });
    };

    window.fireAuditCliSnapshotCopy = function() {
        var out = document.getElementById('cli-snap-output');
        if (!out || !out.textContent) return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(out.textContent).catch(function() {});
        }
    };

    // ---------- Tab switching ----------
    window.fireAuditSwitchTab = function(tab) {
        currentTab = tab;
        var tabs = document.querySelectorAll('#firescope-page .fa-tab');
        for (var i = 0; i < tabs.length; i++) tabs[i].classList.toggle('active', tabs[i].getAttribute('data-tab') === tab);
        var contents = document.querySelectorAll('#firescope-page .fa-tab-content');
        for (var j = 0; j < contents.length; j++) contents[j].classList.toggle('active', contents[j].id === 'fa-tab-' + tab);

        if (loader[tab]) loader[tab]();
    };

    var loader = {
        dashboard: function() { loadFireAuditDashboard(); },
        overview: function() { loadFireAuditOverview(); },
        kurallar: function() { fireAuditKuralSubTab(_kuralSubActive || 'policy'); loadPoliciesKpiAndCounts(); },
        shadow: function() { loadShadowFindings(); },
        any: function() { loadAnyFindings(); },
        risk: function() { loadRiskFindings(); },
        hitcount: function() { loadHitCount(); },
        target: function() { /* wait for user input */ },
        app_rules: function() { loadAppRules(); },
        zone_matrix: function() { loadZoneMatrix(); },
        vpns: function() { loadVPNs(); },
        compliance: function() { loadCompliance(); },
        interfaces: function() { loadInterfaces(); },
        profile_gaps: function() { loadProfileGaps(); },
        duplicates: function() { loadDuplicates(); },
        stale_obj: function() { loadStaleObjects(); },
        dup_obj: function() { loadDuplicateObjects(); },
        unused_in_rules: function() { loadUnusedInRules(); },
        routes: function() { loadRoutes(1); },
        cli_snapshot: function() { loadCliSnapshot(); },
        diff: function() { loadFireAuditDiff(); },
        exceptions: function() { loadFireAuditExceptions(); },
        global_topo: function() { faGlobalTopoLoad(); },
        topology: function() { faTopoLoad(); },
        intelligence: function() { faIntelLoad(); },
        device_mgmt: function() { faDeviceLoadList(); },
        fa_settings: function() { faSettingsLoad(); },
        vlan_analysis: function() { loadVlanAnalysis(); },
        port_security: function() { loadPortSecurity(); },
        stp_health: function() { loadStpHealth(); },
        hardening_findings: function() { loadHardeningFindings(); },
        management_plane: function() { loadManagementPlane(); },
        aaa_users: function() { loadAaaUsers(); },
        logging_ntp: function() { loadLoggingNtp(); },
        routing_sec: function() { loadRoutingSec(); },
        bgp_detail: function() { loadBgpDetail(); },
        eigrp_detail: function() { loadEigrpDetail(); },
        gre_detail: function() { loadGreDetail(); },
        eem_detail: function() { loadEemDetail(); },
        prefix_list_detail: function() { loadPrefixListDetail(); },
        iface_audit: function() { loadIfaceAudit(); },
        config_backup: function() { loadConfigBackup(); },
        device_log: function() { loadDeviceLog(); },
        sync_history: function() { loadCronRuns(); },
        zone_trust_calibration: function() { loadZoneTrustCalibration(); },
        implicit_trust: function() { loadImplicitTrust(); },
        ordering: function() { loadOrdering(); },
        complexity: function() { loadComplexity(); loadMergeableGroups(); loadComplexityTrend(); },
        cross_fw: function() { loadCrossFw(); },
        timeline: function() { loadTimeline(); },
        saved_views: function() { loadSavedViews(); },
        // Faz 13-16
        syslog: function() { loadSyslog(); },
        shaping: function() { loadShaping(); },
        virtual_servers: function() { loadVirtualServers(); },
        vip_dnat: function() { loadVipDnat(); },
        // Faz 1 — Sistem Ayarları
        system_settings: function() { loadSystemSettings(); },
    };

    // ---------- Multi-FW dropdown ----------
    function loadFirewallList() {
        return fetch(API_BASE + '?action=firewalls', { credentials: 'same-origin' })
            .then(function(r) { return r.json(); })
            .then(function(res) {
                if (!res.success) return;
                firewallList = res.firewalls || [];
                var sel = document.getElementById('fa-fw-select');
                if (!sel) return;
                var html = '';
                firewallList.forEach(function(fw) {
                    if (!fw.is_active) return;
                    var sel_attr = fw.slug === FW_SLUG ? ' selected' : '';
                    html += '<option value="' + faEscape(fw.slug) + '"' + sel_attr + '>' +
                        faEscape(fw.name) + ' (' + faEscape(fw.environment) + ')</option>';
                });
                sel.innerHTML = html;
                // İlk seçilen FW yoksa default'a dön
                var found = firewallList.some(function(f) { return f.slug === FW_SLUG && f.is_active; });
                if (!found && firewallList.length) {
                    FW_SLUG = firewallList[0].slug;
                    sel.value = FW_SLUG;
                }
                updateFirewallStatus();
                // Cihaz turune gore tab visibility guncelle
                _updateSidebarForDeviceType();
                _faInitPicker();
            });
    }

    var NETWORK_TYPES = ['cisco_ios', 'cisco_nxos', 'juniper', 'huawei',
                         'dell_os10', 'dell_force10', 'dell_powerconnect'];

    // ---------- Cihaz seçici (ortam / tip / arama) — açılır panel ----------
    // Liste büyüdükçe (çok sayıda switch/router eklendi) tek düz dropdown
    // kullanışsızlaşıyordu — ortam + tip + arama ile filtrelenebilen bu panel
    // fireAuditSwitchFirewall()'u DEĞİŞTİRMEDEN, gizli #fa-fw-select'i senkron
    // tutarak üstüne ek bir katman olarak çalışır (topology tıklaması gibi
    // #fa-fw-select'i doğrudan kullanan diğer kod yolları etkilenmez).
    var _faPicker = { env: 'all', type: 'all', initialized: false };

    function _faPickerDeviceType(fw) {
        return NETWORK_TYPES.indexOf(fw.firewall_type || '') !== -1 ? 'network' : 'firewall';
    }

    function _faInitPicker() {
        var envBox = document.getElementById('fa-fw-picker-envs');
        if (!envBox) return;
        var envs = [];
        firewallList.forEach(function(fw) {
            if (fw.is_active && fw.environment && envs.indexOf(fw.environment) === -1) envs.push(fw.environment);
        });
        envs.sort();
        var html = '<button class="fa-fw-picker-env-btn ' + (_faPicker.env === 'all' ? 'active' : '') + '" data-env="all" onclick="window.__faPickerSetEnv(\'all\')">Tümü</button>';
        envs.forEach(function(e) {
            html += '<button class="fa-fw-picker-env-btn ' + (_faPicker.env === e ? 'active' : '') + '" data-env="' + faEscape(e) + '" onclick="window.__faPickerSetEnv(\'' + faEscape(e).replace(/'/g, "\\'") + '\')">' + faEscape(e) + '</button>';
        });
        envBox.innerHTML = html;
        _faRenderPickerButton();
        if (!_faPicker.initialized) {
            _faPicker.initialized = true;
            document.addEventListener('click', function(e) {
                var panel = document.getElementById('fa-fw-picker-panel');
                var btn = document.getElementById('fa-fw-picker-btn');
                if (!panel || panel.style.display === 'none') return;
                if (panel.contains(e.target) || (btn && btn.contains(e.target))) return;
                panel.style.display = 'none';
            });
        }
        window.__faRenderPickerList();
    }

    function _faRenderPickerButton() {
        var label = document.getElementById('fa-fw-picker-label');
        if (!label) return;
        var fw = firewallList.find(function(f) { return f.slug === FW_SLUG; });
        label.textContent = fw ? (fw.name + ' (' + fw.environment + ')') : FW_SLUG;
    }

    window.__faTogglePicker = function() {
        var panel = document.getElementById('fa-fw-picker-panel');
        if (!panel) return;
        var opening = panel.style.display === 'none';
        panel.style.display = opening ? 'block' : 'none';
        if (opening) {
            var search = document.getElementById('fa-fw-picker-search');
            if (search) { search.value = ''; search.focus(); }
            window.__faRenderPickerList();
        }
    };

    window.__faPickerSetEnv = function(env) {
        _faPicker.env = env;
        document.querySelectorAll('.fa-fw-picker-env-btn').forEach(function(b) {
            b.classList.toggle('active', b.getAttribute('data-env') === env);
        });
        window.__faRenderPickerList();
    };

    window.__faPickerSetType = function(type) {
        _faPicker.type = type;
        document.querySelectorAll('.fa-fw-picker-type-btn').forEach(function(b) {
            b.classList.toggle('active', b.getAttribute('data-type') === type);
        });
        window.__faRenderPickerList();
    };

    window.__faRenderPickerList = function() {
        var list = document.getElementById('fa-fw-picker-list');
        if (!list) return;
        var term = ((document.getElementById('fa-fw-picker-search') || {}).value || '').trim().toLowerCase();

        var rows = firewallList.filter(function(fw) {
            if (!fw.is_active) return false;
            if (_faPicker.env !== 'all' && fw.environment !== _faPicker.env) return false;
            if (_faPicker.type !== 'all' && _faPickerDeviceType(fw) !== _faPicker.type) return false;
            if (term) {
                var hay = (fw.name + ' ' + fw.slug).toLowerCase();
                if (hay.indexOf(term) === -1) return false;
            }
            return true;
        });

        if (!rows.length) {
            list.innerHTML = '<div class="fa-fw-picker-empty">Bu filtreyle eşleşen cihaz yok.</div>';
            return;
        }

        list.innerHTML = rows.map(function(fw) {
            var isNet = _faPickerDeviceType(fw) === 'network';
            var icon = isNet ? 'fa-ethernet' : 'fa-fire';
            var active = fw.slug === FW_SLUG ? ' active' : '';
            return '<div class="fa-fw-picker-row' + active + '" onclick="window.__faPickerChoose(\'' + faEscape(fw.slug).replace(/'/g, "\\'") + '\')">' +
                '<span><i class="fas ' + icon + '" style="width:14px;opacity:.8;"></i> ' + faEscape(fw.name) + '</span>' +
                '<span class="fa-fw-picker-row-env">' + faEscape(fw.environment || '') + '</span>' +
                '</div>';
        }).join('');
    };

    window.__faPickerChoose = function(slug) {
        var sel = document.getElementById('fa-fw-select');
        if (sel) sel.value = slug;
        fireAuditSwitchFirewall(slug);
        _faRenderPickerButton();
        var panel = document.getElementById('fa-fw-picker-panel');
        if (panel) panel.style.display = 'none';
    };

    function _updateSidebarForDeviceType() {
        // Secili FW'nin turunu bul
        var currentFw = firewallList.find(function(f) { return f.slug === FW_SLUG; });
        var fwType = currentFw ? (currentFw.firewall_type || 'fortigate') : 'fortigate';
        var isNetwork = NETWORK_TYPES.indexOf(fwType) !== -1;
        var scope = isNetwork ? 'network' : 'firewall';

        // Sidebar tab ve gruplarini filtrele
        var sidebar = document.getElementById('fa-sidebar');
        if (!sidebar) return;

        var groups = sidebar.querySelectorAll('.fa-sidebar-group');
        for (var g = 0; g < groups.length; g++) {
            var groupScope = groups[g].getAttribute('data-scope');
            if (!groupScope) {
                // Scope yok = her zaman goster, ama icindeki tab'lari filtrele
                groups[g].style.display = '';
            } else if (groupScope === scope || groupScope === 'all') {
                groups[g].style.display = '';
            } else {
                groups[g].style.display = 'none';
            }
        }

        var tabs = sidebar.querySelectorAll('.fa-tab');
        for (var t = 0; t < tabs.length; t++) {
            var tabScope = tabs[t].getAttribute('data-scope');
            if (!tabScope || tabScope === 'all' || tabScope === scope) {
                tabs[t].style.display = '';
            } else {
                tabs[t].style.display = 'none';
            }
        }

        // Aktif tab gizlendiyse dashboard'a don
        if (currentTab) {
            var activeTab = sidebar.querySelector('.fa-tab[data-tab="' + currentTab + '"]');
            if (activeTab && activeTab.style.display === 'none') {
                fireAuditSwitchTab('dashboard');
            }
        }
    }

    window._updateSidebarForDeviceType = _updateSidebarForDeviceType;

    function updateFirewallStatus() {
        var box = document.getElementById('fa-fw-status');
        if (!box) return;
        // Bu fw için snapshot var mı kontrolü
        faApi('stats').then(function(res) {
            if (!res.success) {
                box.innerHTML = '<span style="color:#e74c3c">⚠ Veri yok</span>';
                return;
            }
            if (!res.last_fetch) {
                box.innerHTML = '<span style="color:#f39c12;cursor:pointer" onclick="fireAuditSync()">⚡ İlk sync gerekli — tıkla</span>';
            } else {
                box.innerHTML = '';
            }
        });
    }

    window.fireAuditSwitchFirewall = function(slug) {
        FW_SLUG = slug;
        try { localStorage.setItem('fa_fw_slug', slug); } catch (e) {}
        // Ust dropdown'i da senkronize et (Not11) — tablo/yer linkten cagirildiginda dropdown
        // eski cihazi gosteriyordu, kullanici hangisinde oldugunu kacirip "ilk sync gerekli"
        // mesajiyla karistiriyordu.
        var sel = document.getElementById('fa-fw-select');
        if (sel && sel.value !== slug) sel.value = slug;
        _faRenderPickerButton();
        // Tüm cache'i temizle
        initialized = false;
        ifaceCache = null;
        complianceLastChecks = {};
        window._faZoneMap = {};
        // Tab badge'lerini sıfırla
        var badge = document.getElementById('fa-tab-badge-exceptions');
        if (badge) badge.style.display = 'none';
        // Yeniden yükle
        loadFireAuditStats();
        loadExceptionsSummary();
        faPrefetchZoneMap();
        updateFirewallStatus();
        // Cihaz turune gore sidebar guncelle
        _updateSidebarForDeviceType();
        // Statik HTML icindeki vendor adi span'lerini guncelle (FortiGate -> CheckPoint vs.)
        updateVendorLabels();
        if (currentTab === 'dashboard') loadFireAuditDashboard();
        else if (loader[currentTab]) loader[currentTab]();
        initialized = true;
    };

    // ---------- Entry point ----------
    window.initFireAuditPage = function() {
        if (!document.getElementById('firescope-page')) return;
        loadFirewallList().then(function() {
            updateVendorLabels();
            loadFireAuditStats();
            loadExceptionsSummary();
            faPrefetchZoneMap();
            if (!initialized) {
                loadFireAuditDashboard();
                initialized = true;
            }
        });
    };

    window.loadFireAuditStats = loadFireAuditStats;
    window.loadFireAuditDashboard = loadFireAuditDashboard;
    window.loadExceptionsSummary = loadExceptionsSummary;

    // ============================================================
    // Device Management — Cihaz Yonetimi Tab
    // ============================================================

    var _deviceDeleteSlug = '';

    var VENDOR_LABELS = {
        fortigate:         { label: 'FortiGate', color: '#e74c3c', icon: 'fa-fire' },
        paloalto:          { label: 'Palo Alto', color: '#3498db', icon: 'fa-mountain' },
        checkpoint:        { label: 'Check Point', color: '#f39c12', icon: 'fa-shield-alt' },
        cisco_ios:         { label: 'Cisco IOS', color: '#1abc9c', icon: 'fa-network-wired' },
        cisco_nxos:        { label: 'Cisco NX-OS', color: '#16a085', icon: 'fa-network-wired' },
        juniper:           { label: 'Juniper', color: '#9b59b6', icon: 'fa-code-branch' },
        huawei:            { label: 'Huawei', color: '#e67e22', icon: 'fa-broadcast-tower' },
        dell_os10:         { label: 'Dell OS10', color: '#0076ce', icon: 'fa-server' },
        dell_force10:      { label: 'Dell Force10', color: '#005a9e', icon: 'fa-server' },
        dell_powerconnect: { label: 'Dell PowerConnect', color: '#004578', icon: 'fa-server' },
    };

    function _accessBadge(d) {
        // Cihazin erisim durumuna gore renkli rozet — tooltip son event detayi
        var status = d.access_status || (d.sync_status === 'pending' ? 'unknown' : 'ok');
        var msg = d.last_event_message || '';
        var event = d.last_event || '';
        var when = d.last_event_at || '';
        var tip = msg ? (event + ' — ' + msg + ' (' + when + ')') : 'Bilgi yok';
        var label, color, icon;
        if (event === 'device_type_mismatch') {
            // Baglanti ve okuma basarili — sadece cihaz eklerken secilen tur
            // (Cisco IOS/NX-OS vb.) gercek cihazla uyusmuyor. Erisim sorunu
            // degil, tek tikla duzeltilecek bir yapilandirma hatasi.
            label = 'TÜR HATASI'; color = '#8e44ad'; icon = 'fa-tags';
        } else if (status === 'error') {
            label = 'SORUNLU'; color = '#c0392b'; icon = 'fa-exclamation-triangle';
        } else if (status === 'warning') {
            label = 'UYARI'; color = '#e67e22'; icon = 'fa-exclamation-circle';
        } else if (status === 'ok') {
            label = 'OK'; color = '#27ae60'; icon = 'fa-check-circle';
        } else {
            label = 'SYNC YOK'; color = '#95a5a6'; icon = 'fa-question-circle';
        }
        // 7-gun hata sayilari
        var ec = d.error_count_7d || 0, wc = d.warning_count_7d || 0;
        var counter = '';
        if (ec > 0) counter += ' <span style="color:#c0392b;font-size:10px;">[' + ec + 'E]</span>';
        if (wc > 0) counter += ' <span style="color:#e67e22;font-size:10px;">[' + wc + 'W]</span>';

        return '<span title="' + faEscape(tip) + '" ' +
               'onclick="if(window._fwSlugForLog){fireAuditSwitchFirewall(\'' + faEscape(d.slug) + '\');setTimeout(function(){fireAuditSwitchTab(\'device_log\')},150)}" ' +
               'style="cursor:pointer;color:' + color + ';font-weight:600;display:inline-flex;align-items:center;gap:4px;">' +
               '<i class="fas ' + icon + '"></i> ' + label + counter + '</span>';
    }

    function _faDeviceFilterOptions(devices, selectId, field, labelFn) {
        var sel = document.getElementById(selectId);
        if (!sel) return;
        var current = sel.value;
        var seen = {};
        var values = [];
        devices.forEach(function(d) {
            var v = d[field];
            if (v && !seen[v]) { seen[v] = true; values.push(v); }
        });
        values.sort();
        var html = sel.options[0] ? sel.options[0].outerHTML : '<option value="">Tumu</option>';
        values.forEach(function(v) {
            html += '<option value="' + faEscape(v) + '">' + faEscape(labelFn ? labelFn(v) : v) + '</option>';
        });
        sel.innerHTML = html;
        if (values.indexOf(current) !== -1 || current === '') sel.value = current;
    }

    function faDeviceLoadList() {
        fetch(API_BASE + '?action=devices', { credentials: 'same-origin' })
            .then(function(r) { return r.json(); })
            .then(function(res) {
                var tbody = document.getElementById('fa-devices-tbody');
                var count = document.getElementById('fa-device-count');
                if (!res.success) {
                    tbody.innerHTML = '<tr><td colspan="10" style="color:#e74c3c;">' + faEscape(res.error || 'Hata') + '</td></tr>';
                    return;
                }
                var allDevices = res.devices || [];

                // Filtre secenekleri (ortam/vendor) — cihaz listesinden turetilir,
                // secili deger korunur (kullanici filtreledikce liste daralir)
                _faDeviceFilterOptions(allDevices, 'fa-device-filter-env', 'environment');
                _faDeviceFilterOptions(allDevices, 'fa-device-filter-vendor', 'firewall_type', function(v) {
                    return (VENDOR_LABELS[v] || {}).label || v;
                });

                var envFilter = (document.getElementById('fa-device-filter-env') || {}).value || '';
                var vendorFilter = (document.getElementById('fa-device-filter-vendor') || {}).value || '';
                var qFilter = ((document.getElementById('fa-device-filter-q') || {}).value || '').toLowerCase().trim();

                var devices = allDevices.filter(function(d) {
                    if (envFilter && d.environment !== envFilter) return false;
                    if (vendorFilter && d.firewall_type !== vendorFilter) return false;
                    if (qFilter) {
                        var hay = (d.slug + ' ' + d.name + ' ' + d.host).toLowerCase();
                        if (hay.indexOf(qFilter) === -1) return false;
                    }
                    return true;
                });

                if (count) count.textContent = devices.length + ' / ' + allDevices.length + ' cihaz';
                if (!allDevices.length) {
                    tbody.innerHTML = '<tr><td colspan="10" style="color:var(--text-muted);">Henuz cihaz eklenmedi.</td></tr>';
                    return;
                }
                if (!devices.length) {
                    tbody.innerHTML = '<tr><td colspan="10" style="color:var(--text-muted);">Filtreyle eslesen cihaz yok.</td></tr>';
                    return;
                }
                window._fwSlugForLog = true;  // _accessBadge tiklama icin
                var html = '';
                devices.forEach(function(d) {
                    var v = VENDOR_LABELS[d.firewall_type] || { label: d.firewall_type, color: '#95a5a6', icon: 'fa-server' };
                    html += '<tr>';
                    html += '<td><code>' + faEscape(d.slug) + '</code></td>';
                    html += '<td>' + faEscape(d.name) + '</td>';
                    html += '<td><span class="fa-vendor-badge" style="background:' + v.color + ';color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;"><i class="fas ' + v.icon + '"></i> ' + v.label + '</span></td>';
                    html += '<td>' + faEscape(d.environment || '-') + '</td>';
                    html += '<td><code>' + faEscape(d.host) + ':' + d.port + '</code></td>';
                    html += '<td><code style="color:var(--text-muted);">' + faEscape(d.api_key_masked || '****') + '</code></td>';
                    html += '<td>' + (d.is_active
                        ? '<span style="color:#27ae60;font-weight:600;"><i class="fas fa-check-circle"></i> Aktif</span>'
                        : '<span style="color:#95a5a6;"><i class="fas fa-pause-circle"></i> Pasif</span>') + '</td>';
                    // YENI: Erisim durumu
                    html += '<td>' + _accessBadge(d) + '</td>';
                    // YENI: Son sync zamani
                    html += '<td style="font-size:11px;color:var(--text-muted);">' + faEscape(d.last_successful_sync || (d.sync_status === 'pending' ? 'Hic yok' : '-')) + '</td>';
                    html += '<td style="white-space:nowrap;">';
                    html += '<button class="fa-btn fa-btn-sm fa-btn-icon" title="Baglanti Testi" onclick="faDeviceTest(\'' + faEscape(d.slug) + '\')"><i class="fas fa-plug"></i></button> ';
                    html += '<button class="fa-btn fa-btn-sm fa-btn-icon" title="Duzenle" onclick="faDeviceOpenEdit(\'' + faEscape(d.slug) + '\')"><i class="fas fa-edit"></i></button> ';
                    html += '<button class="fa-btn fa-btn-sm fa-btn-icon" title="Sil" style="color:#c0392b;" onclick="faDeviceOpenDelete(\'' + faEscape(d.slug) + '\', \'' + faEscape(d.name) + '\')"><i class="fas fa-trash"></i></button>';
                    html += '</td>';
                    html += '</tr>';
                });
                tbody.innerHTML = html;
            })
            .catch(function(e) {
                var tbody = document.getElementById('fa-devices-tbody');
                if (tbody) tbody.innerHTML = '<tr><td colspan="10" style="color:#e74c3c;">Yukleme hatasi</td></tr>';
            });
    }

    window.faDeviceLoadList = faDeviceLoadList;

    window.faDeviceOpenAdd = function() {
        document.getElementById('fa-device-mode').value = 'add';
        document.getElementById('fa-device-modal-title').textContent = 'Yeni Cihaz Ekle';
        document.getElementById('fa-device-form').reset();
        document.getElementById('fa-device-slug').readOnly = false;
        document.getElementById('fa-device-active').checked = true;
        document.getElementById('fa-device-key-hint').style.display = 'none';
        document.getElementById('fa-device-test-result').style.display = 'none';
        document.getElementById('fa-device-modal').style.display = 'flex';
    };

    window.faDeviceOpenEdit = function(slug) {
        // Cihaz bilgilerini yukle
        fetch(API_BASE + '?action=devices', { credentials: 'same-origin' })
            .then(function(r) { return r.json(); })
            .then(function(res) {
                if (!res.success) return;
                var dev = (res.devices || []).find(function(d) { return d.slug === slug; });
                if (!dev) return alert('Cihaz bulunamadi: ' + slug);
                document.getElementById('fa-device-mode').value = 'edit';
                document.getElementById('fa-device-modal-title').textContent = 'Cihaz Duzenle: ' + dev.name;
                document.getElementById('fa-device-slug').value = dev.slug;
                document.getElementById('fa-device-slug').readOnly = true;
                document.getElementById('fa-device-name').value = dev.name;
                document.getElementById('fa-device-type').value = dev.firewall_type || 'fortigate';
                document.getElementById('fa-device-env').value = dev.environment || 'production';
                document.getElementById('fa-device-host').value = dev.host;
                document.getElementById('fa-device-port').value = dev.port;
                document.getElementById('fa-device-user').value = dev.api_user || '';
                document.getElementById('fa-device-apikey').value = '';
                document.getElementById('fa-device-apikey').placeholder = dev.api_key_masked || '****';
                document.getElementById('fa-device-tls').checked = !!dev.verify_tls;
                document.getElementById('fa-device-active').checked = !!dev.is_active;
                document.getElementById('fa-device-key-hint').style.display = 'block';
                document.getElementById('fa-device-test-result').style.display = 'none';
                document.getElementById('fa-device-modal').style.display = 'flex';
                faDeviceOnTypeChange();
            });
    };

    window.faDeviceCloseModal = function() {
        document.getElementById('fa-device-modal').style.display = 'none';
    };

    window.faDeviceSave = function() {
        var mode = document.getElementById('fa-device-mode').value;
        var slug = document.getElementById('fa-device-slug').value.trim().toLowerCase();
        var payload = {
            slug: slug,
            name: document.getElementById('fa-device-name').value.trim(),
            firewall_type: document.getElementById('fa-device-type').value,
            environment: document.getElementById('fa-device-env').value,
            host: document.getElementById('fa-device-host').value.trim(),
            port: parseInt(document.getElementById('fa-device-port').value) || 443,
            api_user: document.getElementById('fa-device-user').value.trim(),
            api_key: document.getElementById('fa-device-apikey').value,
            verify_tls: document.getElementById('fa-device-tls').checked,
            is_active: document.getElementById('fa-device-active').checked,
        };

        var action, method;
        if (mode === 'edit') {
            action = 'device_update';
            method = 'PUT';
        } else {
            action = 'devices';
            method = 'POST';
        }

        var url = API_BASE + '?action=' + action;
        if (mode === 'edit') url += '&device_slug=' + encodeURIComponent(slug);

        fetch(url, {
            method: method,
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })
            .then(function(r) { return r.json(); })
            .then(function(res) {
                if (res.success) {
                    faDeviceCloseModal();
                    faDeviceLoadList();
                    faShowToast(res.message || 'Kaydedildi', 'success');
                    // FW dropdown'u guncelle
                    loadFirewallList();
                } else {
                    faShowToast(res.error || 'Hata olustu', 'error');
                }
            })
            .catch(function(e) { faShowToast('Baglanti hatasi', 'error'); });
    };

    window.faDeviceOpenDelete = function(slug, name) {
        _deviceDeleteSlug = slug;
        document.getElementById('fa-device-delete-name').textContent = name + ' (' + slug + ')';
        document.getElementById('fa-device-delete-modal').style.display = 'flex';
    };

    window.faDeviceCloseDelete = function() {
        document.getElementById('fa-device-delete-modal').style.display = 'none';
    };

    window.faDeviceConfirmDelete = function() {
        if (!_deviceDeleteSlug) return;
        fetch(API_BASE + '?action=device_delete&device_slug=' + encodeURIComponent(_deviceDeleteSlug), {
            method: 'DELETE',
            credentials: 'same-origin',
        })
            .then(function(r) { return r.json(); })
            .then(function(res) {
                faDeviceCloseDelete();
                if (res.success) {
                    faDeviceLoadList();
                    faShowToast(res.message || 'Silindi', 'success');
                    loadFirewallList();
                } else {
                    faShowToast(res.error || 'Silme hatasi', 'error');
                }
            })
            .catch(function(e) { faShowToast('Baglanti hatasi', 'error'); });
    };

    window.faDeviceTest = function(slug) {
        faShowToast('Baglanti test ediliyor...', 'info');
        fetch(API_BASE + '?action=device_test&device_slug=' + encodeURIComponent(slug), {
            method: 'POST',
            credentials: 'same-origin',
        })
            .then(function(r) { return r.json(); })
            .then(function(res) {
                if (res.success) {
                    var info = res.info || {};
                    faShowToast('Basarili: ' + (info.vendor || '') + ' ' + (info.hostname || '') + ' ' + (info.version || ''), 'success');
                } else {
                    faShowToast('Basarisiz: ' + (res.error || 'Bilinmeyen hata'), 'error');
                }
            })
            .catch(function(e) { faShowToast('Baglanti hatasi', 'error'); });
    };

    window.faDeviceTestFromModal = function() {
        var resultDiv = document.getElementById('fa-device-test-result');
        var btn = document.getElementById('fa-device-test-btn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Test ediliyor...';
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = '<span style="color:var(--text-muted);">Baglanti test ediliyor...</span>';

        // Modal'daki verileri kullanarak dogrudan Flask'a test yap
        // Ama once kayitli bir slug varsa onu kullan
        var mode = document.getElementById('fa-device-mode').value;
        var slug = document.getElementById('fa-device-slug').value.trim().toLowerCase();

        if (mode === 'edit' && slug) {
            fetch(API_BASE + '?action=device_test&device_slug=' + encodeURIComponent(slug), {
                method: 'POST',
                credentials: 'same-origin',
            })
                .then(function(r) { return r.json(); })
                .then(function(res) {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-plug"></i> Baglanti Testi';
                    if (res.success) {
                        var info = res.info || {};
                        resultDiv.innerHTML = '<div style="color:#27ae60;padding:8px;background:rgba(39,174,96,0.1);border-radius:6px;">' +
                            '<i class="fas fa-check-circle"></i> <strong>Basarili!</strong><br>' +
                            '<span style="font-size:13px;">' + faEscape(info.vendor || '') + ' | ' + faEscape(info.hostname || '') + ' | ' + faEscape(info.model || '') + ' | ' + faEscape(info.version || '') + '</span></div>';
                    } else {
                        resultDiv.innerHTML = '<div style="color:#c0392b;padding:8px;background:rgba(192,57,43,0.1);border-radius:6px;">' +
                            '<i class="fas fa-times-circle"></i> <strong>Basarisiz:</strong> ' + faEscape(res.error || '') + '</div>';
                    }
                })
                .catch(function() {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-plug"></i> Baglanti Testi';
                    resultDiv.innerHTML = '<div style="color:#c0392b;">Baglanti hatasi</div>';
                });
        } else {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-plug"></i> Baglanti Testi';
            resultDiv.innerHTML = '<div style="color:#f39c12;">Once cihazi kaydedin, sonra test edin.</div>';
        }
    };

    window.faDeviceOnTypeChange = function() {
        var type = document.getElementById('fa-device-type').value;
        var userLabel = document.getElementById('fa-device-user-label');
        var keyLabel = document.getElementById('fa-device-key-label');
        var portInput = document.getElementById('fa-device-port');
        var isNetwork = NETWORK_TYPES.indexOf(type) !== -1;

        if (type === 'checkpoint') {
            userLabel.textContent = 'API Kullanici *';
            keyLabel.textContent = 'Password *';
            document.getElementById('fa-device-user').placeholder = 'admin (zorunlu)';
            document.getElementById('fa-device-apikey').placeholder = 'Management password';
            if (portInput) portInput.value = 443;
        } else if (isNetwork) {
            userLabel.textContent = 'SSH Kullanici *';
            keyLabel.textContent = 'SSH Password *';
            document.getElementById('fa-device-user').placeholder = 'admin (zorunlu)';
            document.getElementById('fa-device-apikey').placeholder = 'SSH password';
            if (portInput) portInput.value = 22;
        } else {
            userLabel.textContent = 'API Kullanici';
            keyLabel.textContent = 'API Key *';
            document.getElementById('fa-device-user').placeholder = 'Opsiyonel';
            document.getElementById('fa-device-apikey').placeholder = 'API key';
            if (portInput) portInput.value = 443;
        }
    };

    window.faDeviceToggleKey = function() {
        var inp = document.getElementById('fa-device-apikey');
        var eye = document.getElementById('fa-device-key-eye');
        if (inp.type === 'password') {
            inp.type = 'text';
            eye.className = 'fas fa-eye-slash';
        } else {
            inp.type = 'password';
            eye.className = 'fas fa-eye';
        }
    };

    // ============================================================
    // Settings — Ayarlar Tab
    // ============================================================

    var _notifyConfig = null;

    function faSettingsLoad() {
        // Bildirim ayarlarini yukle
        fetch(API_BASE + '?action=settings_notify', { credentials: 'same-origin' })
            .then(function(r) { return r.json(); })
            .then(function(res) {
                if (!res.success) return;
                _notifyConfig = res.config || {};
                var enabledCb = document.getElementById('fa-notify-enabled');
                if (enabledCb) enabledCb.checked = _notifyConfig.enabled !== false;
                // Global alicilar
                _renderGlobalRecipients();
                // Per-FW ayarlar
                _renderPerFwSettings();
            });

        // Cron ayarlarini yukle
        fetch(API_BASE + '?action=settings_cron', { credentials: 'same-origin' })
            .then(function(r) { return r.json(); })
            .then(function(res) {
                var pre = document.getElementById('fa-cron-preview');
                if (!res.success) {
                    if (pre) pre.textContent = 'Cron bilgisi alinamadi: ' + (res.error || '');
                    return;
                }
                if (pre) pre.textContent = (res.cron_lines || []).join('\n') || 'FireScope cron entryleri bulunamadi.';
            });
    }

    function _renderGlobalRecipients() {
        var container = document.getElementById('fa-notify-global-list');
        if (!container || !_notifyConfig) return;
        var recipients = _notifyConfig.global_recipients || [];
        container.innerHTML = recipients.map(function(email) {
            return '<span class="fa-tag">' + faEscape(email) +
                ' <button type="button" onclick="faNotifyRemoveGlobal(\'' + faEscape(email) + '\')" style="background:none;border:none;cursor:pointer;color:#c0392b;font-weight:bold;margin-left:4px;">&times;</button></span>';
        }).join('');
    }

    function _renderPerFwSettings() {
        var container = document.getElementById('fa-notify-perfw-container');
        if (!container || !_notifyConfig) return;
        var perFw = _notifyConfig.per_fw || {};
        var html = '';
        Object.keys(perFw).forEach(function(slug) {
            var fw = perFw[slug];
            html += '<div class="fa-perfw-card" style="border:1px solid var(--border-color);border-radius:8px;padding:12px;margin-bottom:10px;">';
            html += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">';
            html += '<strong>' + faEscape(fw.display_name || slug) + '</strong>';
            html += '<span style="font-size:12px;color:var(--text-muted);">(' + faEscape(slug) + ')</span>';
            html += '<label style="margin-left:auto;"><input type="checkbox" class="fa-perfw-enabled" data-slug="' + faEscape(slug) + '"' + (fw.enabled !== false ? ' checked' : '') + '> Aktif</label>';
            html += '</div>';
            html += '<div style="font-size:13px;color:var(--text-muted);">Ek alicilar: ';
            var recs = fw.recipients || [];
            if (recs.length) {
                html += recs.map(function(e) { return '<code>' + faEscape(e) + '</code>'; }).join(', ');
            } else {
                html += '<em>Yok (sadece global alicilar)</em>';
            }
            html += '</div>';
            html += '</div>';
        });
        container.innerHTML = html || '<p style="color:var(--text-muted);">Henuz cihaz bazli ayar yok.</p>';
    }

    window.faNotifyAddGlobal = function() {
        var input = document.getElementById('fa-notify-global-input');
        var email = (input.value || '').trim();
        if (!email || !email.includes('@')) return;
        if (!_notifyConfig) _notifyConfig = { enabled: true, global_recipients: [], per_fw: {} };
        if (!_notifyConfig.global_recipients) _notifyConfig.global_recipients = [];
        if (_notifyConfig.global_recipients.indexOf(email) === -1) {
            _notifyConfig.global_recipients.push(email);
        }
        input.value = '';
        _renderGlobalRecipients();
    };

    window.faNotifyRemoveGlobal = function(email) {
        if (!_notifyConfig || !_notifyConfig.global_recipients) return;
        _notifyConfig.global_recipients = _notifyConfig.global_recipients.filter(function(e) { return e !== email; });
        _renderGlobalRecipients();
    };

    window.faNotifySave = function() {
        if (!_notifyConfig) return;
        _notifyConfig.enabled = document.getElementById('fa-notify-enabled').checked;
        // Per-fw enabled durumlarini guncelle
        var perFwCbs = document.querySelectorAll('.fa-perfw-enabled');
        for (var pi = 0; pi < perFwCbs.length; pi++) {
            var cb = perFwCbs[pi];
            var slug = cb.getAttribute('data-slug');
            if (_notifyConfig.per_fw && _notifyConfig.per_fw[slug]) {
                _notifyConfig.per_fw[slug].enabled = cb.checked;
            }
        }

        fetch(API_BASE + '?action=settings_notify', {
            method: 'PUT',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ config: _notifyConfig }),
        })
            .then(function(r) { return r.json(); })
            .then(function(res) {
                if (res.success) faShowToast('Bildirim ayarlari kaydedildi', 'success');
                else faShowToast(res.error || 'Hata', 'error');
            })
            .catch(function() { faShowToast('Baglanti hatasi', 'error'); });
    };

    window.faCronSave = function() {
        var payload = {
            full_sync_interval: parseInt(document.getElementById('fa-cron-full-interval').value) || 6,
            diff_sync_hours: document.getElementById('fa-cron-diff-hours').value.trim() || '0,4,8-18,20',
            stagger_minutes: parseInt(document.getElementById('fa-cron-stagger').value) || 15,
        };
        fetch(API_BASE + '?action=settings_cron', {
            method: 'PUT',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })
            .then(function(r) { return r.json(); })
            .then(function(res) {
                if (res.success) {
                    faShowToast(res.message || 'Cron guncellendi', 'success');
                    // Refresh preview
                    faSettingsLoad();
                } else {
                    faShowToast(res.error || 'Hata', 'error');
                }
            })
            .catch(function() { faShowToast('Baglanti hatasi', 'error'); });
    };

    // ============================================================
    // Global Topology
    // ============================================================

    function faGlobalTopoLoad() {
        var apiBase = API_BASE;
        Promise.all([
            fetch(apiBase + '?action=global_topology', { credentials: 'same-origin' }).then(function(r) { return r.json(); }),
            fetch(apiBase + '?action=global_blast_radius', { credentials: 'same-origin' }).then(function(r) { return r.json(); }),
            fetch(apiBase + '?action=global_attack_paths', { credentials: 'same-origin' }).then(function(r) { return r.json(); }),
        ]).then(function(results) {
            var topo = results[0], blast = results[1], paths = results[2];

            // KPI
            if (topo.success) {
                var el;
                el = document.getElementById('fa-gtopo-device-count'); if (el) el.textContent = topo.device_count || 0;
                el = document.getElementById('fa-gtopo-link-count'); if (el) el.textContent = topo.link_count || 0;
                el = document.getElementById('fa-gtopo-subnet-count'); if (el) el.textContent = topo.subnet_links || 0;
                el = document.getElementById('fa-gtopo-vpn-count'); if (el) el.textContent = topo.vpn_links || 0;
                _renderGlobalGraph(topo);
                _renderGlobalLinks(topo.links || []);
            }
            if (paths.success) {
                var el2 = document.getElementById('fa-gtopo-path-count'); if (el2) el2.textContent = paths.total || 0;
                _renderGlobalPaths(paths.paths || []);
            }
            if (blast.success) _renderGlobalBlast(blast.devices || []);
        });
    }

    function _renderGlobalGraph(topo) {
        var container = document.getElementById('fa-gtopo-graph');
        if (!container || !topo.nodes || typeof d3 === 'undefined') {
            // D3 yuklenmediyse statik fallback
            if (container) container.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted);">D3.js yukleniyor... Sayfayi yenileyin.</div>';
            return;
        }

        var width = container.clientWidth || 900;
        var height = container.clientHeight || 550;

        // Onceki SVG temizle
        d3.select('#fa-gtopo-graph').select('svg').remove();

        var svg = d3.select('#fa-gtopo-graph')
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .attr('id', 'fa-gtopo-svg');

        // Zoom + pan
        var zoomGroup = svg.append('g').attr('class', 'zoom-group');
        var zoom = d3.zoom()
            .scaleExtent([0.3, 4])
            .on('zoom', function(event) { zoomGroup.attr('transform', event.transform); });
        svg.call(zoom);

        var nodes = JSON.parse(JSON.stringify(topo.nodes || []));
        var links = JSON.parse(JSON.stringify(topo.links || []));

        // Kategori bazli baslangic — network cihazlari vendor'a gore grupla
        var nonFw = nodes.filter(function(n) { return n.category !== 'internet'; });
        // Vendor'a gore unique isim set'i (firewall + network birlikte)
        var vendors = Array.from(new Set(nonFw.map(function(n) { return n.vendor || 'Unknown'; })));
        var vendorIndex = {};
        vendors.forEach(function(v, i) { vendorIndex[v] = i; });

        // Her kategoriyi ayri "band"a yerlestir:
        //   Internet:      width * 0.06 (sol)
        //   Firewall:      width * 0.40
        //   Switch/Router: width * 0.75
        var categoryX = {
            internet: width * 0.06,
            firewall: width * 0.40,
            network:  width * 0.78,
        };
        var fwCount    = nonFw.filter(function(n) { return n.category === 'firewall'; }).length;
        var netCount   = nonFw.filter(function(n) { return n.category === 'network'; }).length;
        var fwIndex = 0, netIndex = 0;
        nodes.forEach(function(n) {
            if (n.category === 'internet') {
                n.fx = categoryX.internet; n.fy = height * 0.5;
                return;
            }
            n.x = categoryX[n.category] || width * 0.5;
            // Dikey olarak esit aralikla yay
            if (n.category === 'firewall') {
                n.y = (height / (fwCount + 1)) * (++fwIndex);
            } else {
                n.y = (height / (netCount + 1)) * (++netIndex);
            }
        });

        // Force simulation — kategoriler ayri x-band'larda
        var simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id(function(d) { return d.id; }).distance(function(l) {
                // Ayni vendor ve ayni kategori ise kisa; aksi halde uzun
                if (l.source.category === l.target.category && l.source.vendor === l.target.vendor) return 100;
                return 200;
            }).strength(0.3))
            .force('charge', d3.forceManyBody().strength(-700))  // daha fazla itme
            .force('collision', d3.forceCollide().radius(70))   // daha genis gap
            .force('x', d3.forceX(function(d) {
                return categoryX[d.category] || width * 0.5;
            }).strength(0.4))   // x-band stroke guclu — kategoriler ayrisir
            .force('y', d3.forceY(height / 2).strength(0.04))   // dikey yay
            // Vendor gruplama: ayni vendor node'lari kumelenme egilimi
            .force('vendor_cluster', function(alpha) {
                nodes.forEach(function(n) {
                    if (n.category === 'internet' || !n.vendor) return;
                    var vi = vendorIndex[n.vendor] || 0;
                    var vendorY = height * 0.15 + (vi * height * 0.70 / Math.max(1, vendors.length - 1));
                    n.vy = (n.vy || 0) + (vendorY - n.y) * alpha * 0.15;
                });
            });

        // Tooltip
        var tooltip = d3.select('#fa-gtopo-graph').append('div')
            .attr('class', 'fa-gtopo-tooltip')
            .style('position', 'absolute').style('display', 'none')
            .style('background', 'var(--card-bg, #fff)').style('border', '1px solid var(--border-color, #ddd)')
            .style('padding', '8px 12px').style('border-radius', '8px').style('font-size', '12px')
            .style('box-shadow', '0 4px 12px rgba(0,0,0,0.15)').style('pointer-events', 'none').style('z-index', '100');

        // Links
        var linkElements = zoomGroup.append('g').selectAll('line')
            .data(links).enter().append('line')
            .attr('stroke', function(d) { return d.type === 'vpn' ? '#e67e22' : d.type === 'wan' ? '#c0392b' : '#3498db'; })
            .attr('stroke-width', function(d) { return d.type === 'wan' ? 1 : 2; })
            .attr('stroke-dasharray', function(d) { return d.type === 'vpn' ? '6,3' : null; })
            .attr('opacity', 0.5);

        // Link labels
        var linkLabels = zoomGroup.append('g').selectAll('text')
            .data(links.filter(function(l) { return l.type !== 'wan' && l.label; }))
            .enter().append('text')
            .attr('text-anchor', 'middle').attr('font-size', 8).attr('fill', 'var(--text-muted, #7f8c8d)')
            .text(function(d) { var t = d.label || ''; return t.length > 18 ? t.substring(0, 16) + '..' : t; });

        // Nodes
        var nodeGroups = zoomGroup.append('g').selectAll('g')
            .data(nodes).enter().append('g')
            .style('cursor', 'pointer')
            .call(d3.drag()
                .on('start', function(event, d) {
                    if (!event.active) simulation.alphaTarget(0.3).restart();
                    d.fx = d.x; d.fy = d.y;
                })
                .on('drag', function(event, d) {
                    d.fx = event.x; d.fy = event.y;
                })
                .on('end', function(event, d) {
                    if (!event.active) simulation.alphaTarget(0);
                    // Kullanici node'u biraktigi yerde kalsin — fx/fy temizleme
                    // Double-click ile serbest birakma asagida eklendi.
                })
            );

        // Node shapes — sync_status'a gore stroke rengi + dash
        function _statusStroke(d) {
            if (d.id === 'Internet') return {color: '#fff', width: 2, dash: null};
            var s = d.sync_status || 'synced';
            if (s === 'pending')      return {color: '#95a5a6', width: 3, dash: '4,3'};  // gri dashed
            if (s === 'access_error') return {color: '#e74c3c', width: 3, dash: null};   // kirmizi
            if (s === 'orphan')       return {color: '#f39c12', width: 2, dash: '2,2'};  // turuncu dashed
            return {color: '#fff', width: 2, dash: null};   // synced OK
        }
        function _statusFill(d) {
            if (d.sync_status === 'pending') return '#bdc3c7';  // gri — henuz sync olmamis
            return d.color;
        }

        nodeGroups.each(function(d) {
            var g = d3.select(this);
            var size = d.id === 'Internet' ? 24 : 20;
            var st = _statusStroke(d);
            var commonAttrs = function(sel) {
                sel.attr('fill', _statusFill(d))
                   .attr('stroke', st.color)
                   .attr('stroke-width', st.width);
                if (st.dash) sel.attr('stroke-dasharray', st.dash);
            };
            if (d.shape === 'rect') {
                commonAttrs(g.append('rect').attr('width', size * 2).attr('height', size * 2)
                    .attr('x', -size).attr('y', -size).attr('rx', 5));
            } else if (d.shape === 'triangle') {
                commonAttrs(g.append('polygon')
                    .attr('points', '0,' + (-size) + ' ' + (-size) + ',' + size + ' ' + size + ',' + size));
            } else if (d.shape === 'diamond') {
                commonAttrs(g.append('polygon')
                    .attr('points', '0,' + (-size) + ' ' + size + ',0 0,' + size + ' ' + (-size) + ',0'));
            } else {
                commonAttrs(g.append('circle').attr('r', size));
            }
            // Erisim sorunu isareti — kirmizi/sari rozet
            var statusBadge = null;
            if (d.sync_status === 'pending') statusBadge = {char: '?', color: '#95a5a6', label: 'HIC SYNC YOK'};
            else if (d.sync_status === 'access_error') statusBadge = {char: '!', color: '#e74c3c', label: 'ERISIM HATASI'};
            else if (d.sync_status === 'orphan') statusBadge = {char: 'o', color: '#f39c12', label: 'ORPHAN'};
            if (statusBadge) {
                g.append('circle').attr('cx', size - 4).attr('cy', -size + 4).attr('r', 7)
                    .attr('fill', statusBadge.color).attr('stroke', '#fff').attr('stroke-width', 1.5);
                g.append('text').attr('x', size - 4).attr('y', -size + 8)
                    .attr('text-anchor', 'middle').attr('font-size', 11).attr('font-weight', 700)
                    .attr('fill', '#fff').text(statusBadge.char);
            }
        });

        // Grade label
        nodeGroups.filter(function(d) { return d.grade && d.grade !== '?'; })
            .append('text').attr('text-anchor', 'middle').attr('dy', 5)
            .attr('font-size', 13).attr('font-weight', 700).attr('fill', '#fff')
            .text(function(d) { return d.grade; });

        // Device name
        nodeGroups.append('text').attr('text-anchor', 'middle').attr('dy', 36)
            .attr('font-size', 11).attr('font-weight', 600).attr('fill', 'var(--text-color, #333)')
            .text(function(d) { return (d.name || d.id).substring(0, 18); });

        // Vendor label
        nodeGroups.append('text').attr('text-anchor', 'middle').attr('dy', 48)
            .attr('font-size', 9).attr('fill', 'var(--text-muted, #95a5a6)')
            .text(function(d) { return d.vendor || ''; });

        // Hover tooltip — sync status + erisim durumu dahil
        nodeGroups
            .on('mouseover', function(event, d) {
                if (d.id === 'Internet') return;
                var fixedHint = (d.fx !== null && d.fx !== undefined)
                    ? '<br><em style="color:#f39c12;font-size:10px;">(sabit — cift tikla serbest birak)</em>' : '';
                var statusLine = '';
                if (d.sync_status === 'pending') {
                    statusLine = '<br><span style="color:#95a5a6;background:#95a5a622;padding:2px 8px;border-radius:3px;"><i class="fas fa-clock"></i> HIC SYNC YOK</span> <em style="font-size:10px;">Senkronize Et butonuna basın</em>';
                } else if (d.sync_status === 'access_error') {
                    statusLine = '<br><span style="color:#e74c3c;background:#e74c3c22;padding:2px 8px;border-radius:3px;"><i class="fas fa-exclamation-triangle"></i> ERISIM HATASI</span>';
                    if (d.last_event_message) {
                        statusLine += '<br><span style="color:#e74c3c;font-size:11px;">' + faEscape(String(d.last_event_message).substring(0, 140)) + '</span>';
                    }
                } else if (d.sync_status === 'orphan') {
                    statusLine = '<br><span style="color:#f39c12;background:#f39c1222;padding:2px 8px;border-radius:3px;">ORPHAN (registry\'de yok)</span>';
                } else {
                    statusLine = '<br><span style="color:#27ae60;"><i class="fas fa-check-circle"></i> Sync OK</span>';
                    if (d.last_event_severity === 'warning') {
                        statusLine += ' <em style="color:#e67e22;font-size:10px;">(son sync\'te uyarilar var)</em>';
                    }
                }
                var html = '<strong>' + faEscape(d.name || d.id) + '</strong>';
                if (d.host) html += ' <span style="color:var(--text-muted);font-size:11px;">@' + faEscape(d.host) + '</span>';
                html += '<br><span style="color:var(--text-muted);">' + faEscape(d.vendor || '') + (d.model ? ' | ' + faEscape(d.model) : '') + '</span>';
                if (d.environment) html += ' <span style="background:var(--border-color);padding:1px 6px;border-radius:3px;font-size:10px;">' + faEscape(d.environment) + '</span>';
                html += statusLine;
                if (d.sync_status === 'synced' || d.sync_status === 'access_error') {
                    html += '<br>Score: <strong>' + (d.score || '-') + '</strong> | Grade: <strong>' + (d.grade || '-') + '</strong>';
                    html += '<br>Interfaces: ' + (d.interfaces || 0) + ' | Zones: ' + (d.zones || 0) + ' | Policies: ' + (d.policies || 0);
                }
                html += fixedHint;
                tooltip.html(html).style('display', 'block')
                    .style('left', (event.offsetX + 15) + 'px').style('top', (event.offsetY - 10) + 'px');
            })
            .on('mouseout', function() { tooltip.style('display', 'none'); })
            .on('click', function(event, d) {
                if (d.id !== 'Internet') {
                    var sel = document.getElementById('fa-fw-select');
                    if (sel) { sel.value = d.id; fireAuditSwitchFirewall(d.id); }
                    fireAuditSwitchTab('dashboard');
                }
            })
            .on('dblclick', function(event, d) {
                // Cift tikla: node'un pozisyonunu serbest birak (internet hariç)
                event.stopPropagation();
                if (d.category !== 'internet') {
                    d.fx = null; d.fy = null;
                    simulation.alphaTarget(0.3).restart();
                    setTimeout(function() { simulation.alphaTarget(0); }, 500);
                }
            });

        // Pin indicator (sabitlenmis node'lar icin kucuk nokta)
        nodeGroups.append('circle').attr('class', 'fa-gtopo-pin')
            .attr('cx', 16).attr('cy', -16).attr('r', 3)
            .attr('fill', '#f39c12').attr('stroke', '#fff').attr('stroke-width', 1)
            .style('display', 'none');

        // Tick (her frame)
        simulation.on('tick', function() {
            linkElements
                .attr('x1', function(d) { return d.source.x; }).attr('y1', function(d) { return d.source.y; })
                .attr('x2', function(d) { return d.target.x; }).attr('y2', function(d) { return d.target.y; });
            linkLabels
                .attr('x', function(d) { return (d.source.x + d.target.x) / 2; })
                .attr('y', function(d) { return (d.source.y + d.target.y) / 2 - 4; });
            nodeGroups.attr('transform', function(d) { return 'translate(' + d.x + ',' + d.y + ')'; });
            // Pin gostergesi guncelle
            nodeGroups.select('.fa-gtopo-pin').style('display', function(d) {
                return (d.fx !== null && d.fx !== undefined && d.category !== 'internet') ? null : 'none';
            });
        });

        // Legend
        var legend = svg.append('g').attr('transform', 'translate(12,12)');
        var legendItems = [
            { color: '#e74c3c', label: 'Firewall', shape: 'circle' },
            { color: '#1abc9c', label: 'Switch/Router', shape: 'rect' },
            { color: '#2c3e50', label: 'Internet', shape: 'triangle' },
            { color: '#3498db', label: 'Subnet link', line: true },
            { color: '#e67e22', label: 'VPN link', line: true, dash: true },
            { color: '#c0392b', label: 'WAN link', line: true },
        ];
        legendItems.forEach(function(item, i) {
            var y = i * 18;
            if (item.line) {
                legend.append('line').attr('x1', 0).attr('y1', y + 6).attr('x2', 16).attr('y2', y + 6)
                    .attr('stroke', item.color).attr('stroke-width', 2)
                    .attr('stroke-dasharray', item.dash ? '4,2' : null);
            } else {
                legend.append('rect').attr('x', 2).attr('y', y).attr('width', 12).attr('height', 12)
                    .attr('rx', item.shape === 'circle' ? 6 : 2).attr('fill', item.color);
            }
            legend.append('text').attr('x', 22).attr('y', y + 10).attr('font-size', 10)
                .attr('fill', 'var(--text-color, #333)').text(item.label);
        });

        // Zoom + Layout kontrolleri
        var ctrls = svg.append('g').attr('transform', 'translate(' + (width - 60) + ',12)');
        var controlDefs = [
            { label: '+',   title: 'Yaklastir',        action: function() { svg.transition().call(zoom.scaleBy, 1.3); } },
            { label: '-',   title: 'Uzaklastir',       action: function() { svg.transition().call(zoom.scaleBy, 0.7); } },
            { label: 'R',   title: 'Zoom sifirla',     action: function() { svg.transition().call(zoom.transform, d3.zoomIdentity); } },
            { label: '⚙',   title: 'Layout yeniden hesapla', action: function() {
                // Tum node'larin fx/fy sifirla, force'u yeniden baslat
                nodes.forEach(function(n) { if (n.category !== 'internet') { n.fx = null; n.fy = null; } });
                simulation.alpha(1).restart();
            }},
            { label: '⇔',   title: 'Yatay serpme (vendor gruplu)', action: function() {
                // Node'lari kategori + vendor'a gore grid'e yerlestir ve sabitle
                var byKey = {};
                nodes.forEach(function(n) {
                    if (n.category === 'internet') return;
                    var k = n.category + '|' + (n.vendor || 'Unknown');
                    (byKey[k] = byKey[k] || []).push(n);
                });
                var colKeys = Object.keys(byKey).sort();
                var colW = (width - 140) / Math.max(1, colKeys.length);
                colKeys.forEach(function(k, ci) {
                    var col = byKey[k];
                    var rowH = (height - 80) / (col.length + 1);
                    col.forEach(function(n, ri) {
                        n.fx = 120 + ci * colW + colW / 2;
                        n.fy = 40 + (ri + 1) * rowH;
                    });
                });
                simulation.alpha(0.5).restart();
            }},
        ];
        controlDefs.forEach(function(c, i) {
            var btn = ctrls.append('g').attr('transform', 'translate(0,' + (i * 26) + ')').style('cursor', 'pointer');
            btn.append('circle').attr('cx', 12).attr('cy', 10).attr('r', 11)
                .attr('fill', 'var(--card-bg, #fff)').attr('stroke', 'var(--text-muted, #95a5a6)').attr('stroke-width', 1);
            btn.append('text').attr('x', 12).attr('y', 14)
                .attr('text-anchor', 'middle').attr('font-size', 14).attr('font-weight', 700)
                .attr('fill', 'var(--text-color, #333)').text(c.label);
            btn.append('title').text(c.title);
            btn.on('click', c.action);
        });

        // Kullanici rehberi
        svg.append('text').attr('x', 12).attr('y', height - 8)
            .attr('font-size', 10).attr('fill', 'var(--text-muted, #95a5a6)')
            .text('Ipucu: Node\'u surukle → sabitlenir. Cift tikla → serbest birak. ⚙ = yeniden dagit, ⇔ = vendor bazli grid');
    }

    function _renderGlobalBlast(devices) {
        var tbody = document.getElementById('fa-gtopo-blast-tbody');
        if (!tbody) return;
        if (!devices.length) { tbody.innerHTML = '<tr><td colspan="6">Veri yok</td></tr>'; return; }
        tbody.innerHTML = devices.map(function(d) {
            return '<tr>' +
                '<td><strong>' + faEscape(d.name || d.device) + '</strong></td>' +
                '<td>' + faEscape(d.vendor) + '</td>' +
                '<td>' + faEscape(d.category) + '</td>' +
                '<td><strong style="color:' + _sevColor(d.severity) + '">' + d.blast_score + '</strong></td>' +
                '<td><span class="fa-sev-badge fa-sev-' + d.severity + '">' + d.severity + '</span></td>' +
                '<td style="font-size:12px;">' + (d.reachable_devices || []).join(', ') + '</td></tr>';
        }).join('');
    }

    function _renderGlobalPaths(paths) {
        var tbody = document.getElementById('fa-gtopo-paths-tbody');
        if (!tbody) return;
        if (!paths.length) { tbody.innerHTML = '<tr><td colspan="5">Saldiri yolu bulunamadi</td></tr>'; return; }
        tbody.innerHTML = paths.slice(0, 20).map(function(p) {
            return '<tr>' +
                '<td><strong style="color:' + _sevColor(p.severity) + '">' + p.risk_score + '</strong></td>' +
                '<td><span class="fa-sev-badge fa-sev-' + p.severity + '">' + p.severity + '</span></td>' +
                '<td>' + faEscape(p.target_name || p.target) + '</td>' +
                '<td>' + p.hops + '</td>' +
                '<td style="font-size:12px;">' + (p.path || []).join(' → ') + '</td></tr>';
        }).join('');
    }

    function _renderGlobalLinks(links) {
        var tbody = document.getElementById('fa-gtopo-links-tbody');
        if (!tbody) return;
        var deviceLinks = links.filter(function(l) { return l.type !== 'wan'; });
        if (!deviceLinks.length) { tbody.innerHTML = '<tr><td colspan="6">Baglanti bulunamadi</td></tr>'; return; }
        tbody.innerHTML = deviceLinks.map(function(l) {
            var typeColor = l.type === 'vpn' ? '#e67e22' : '#3498db';
            return '<tr>' +
                '<td><strong>' + faEscape(l.source) + '</strong></td>' +
                '<td><strong>' + faEscape(l.target) + '</strong></td>' +
                '<td><span style="color:' + typeColor + ';font-weight:600;">' + faEscape(l.type) + '</span></td>' +
                '<td style="font-size:12px;">' + faEscape(l.vpn_name || l.subnet || '-') + '</td>' +
                '<td>' + Math.round((l.confidence || 0) * 100) + '%</td>' +
                '<td style="font-size:11px;">' + faEscape(l.interface_a || '') + (l.interface_b ? ' ↔ ' + faEscape(l.interface_b) : '') + '</td></tr>';
        }).join('');
    }

    window.faGlobalTopoLoad = faGlobalTopoLoad;

    window.faGTopoShowSub = function(panel) {
        ['blast', 'paths', 'links'].forEach(function(p) {
            var el = document.getElementById('fa-gtopo-' + p + '-panel');
            var btn = document.getElementById('fa-gtopo-sub-' + p);
            if (el) el.style.display = p === panel ? '' : 'none';
            if (btn) btn.className = p === panel ? 'fa-btn fa-btn-primary' : 'fa-btn';
        });
    };

    // ============================================================
    // Policy Intelligence — Faz 5
    // ============================================================

    function faIntelLoad() {
        faApi('intelligence').then(function(d) {
            if (!d.success) return;

            // KPI cards
            var cx = d.complexity || {};
            var el;
            el = document.getElementById('fa-intel-complexity');
            if (el) el.textContent = cx.score || 0;
            el = document.getElementById('fa-intel-complexity-grade');
            if (el) { el.textContent = 'Grade ' + (cx.grade || '?'); el.style.color = _gradeColor(cx.grade); }

            var mergeSaving = (d.mergeables || []).reduce(function(s, m) { return s + m.potential_saving; }, 0);
            el = document.getElementById('fa-intel-merge');
            if (el) el.textContent = mergeSaving;

            el = document.getElementById('fa-intel-ordering');
            if (el) el.textContent = (d.ordering_anomalies || []).length;

            el = document.getElementById('fa-intel-trust');
            if (el) el.textContent = (d.trust_violations || []).length;

            el = document.getElementById('fa-intel-remediation');
            if (el) el.textContent = (d.remediations || []).length;

            // Tables
            _renderIntelTrust(d.trust_violations || []);
            _renderIntelOrdering(d.ordering_anomalies || []);
            _renderIntelMerge(d.mergeables || []);
            _renderIntelRemediation(d.remediations || []);
        });

        faApi('cross_fw').then(function(d) {
            if (!d.success) return;
            _renderIntelCrossFw(d.comparisons || []);
        });
    }

    // Yönlendirme helper — section header'a "Detaylı görünüm" butonu ekle
    function _intelDetailLink(targetTab, label) {
        return '<div style="margin-bottom:8px;padding:8px 12px;background:rgba(52,152,219,0.08);border-left:3px solid #3498db;border-radius:4px;font-size:.82rem;display:flex;justify-content:space-between;align-items:center;">' +
            '<span><i class="fas fa-info-circle" style="color:#3498db;"></i> Bu özet ' + label + '. Tam analiz için →</span>' +
            '<button class="fa-btn fa-btn-sm fa-btn-primary" onclick="fireAuditSwitchTab(\'' + targetTab + '\')"><i class="fas fa-external-link-alt"></i> Detaylı Tab\'a Git</button>' +
            '</div>';
    }

    function _renderIntelTrust(items) {
        var tbody = document.getElementById('fa-intel-trust-tbody');
        if (!tbody) return;
        // Header bar ekle (tbody'nin üstündeki container'a)
        var tbl = tbody.closest('table');
        var linkId = 'fa-intel-trust-link';
        if (tbl && !document.getElementById(linkId)) {
            var div = document.createElement('div');
            div.id = linkId;
            div.innerHTML = _intelDetailLink('implicit_trust', 'Implicit Trust violations ÖZETİ (en kritik 50 bulgu)');
            tbl.parentNode.insertBefore(div, tbl);
        }
        if (!items.length) { tbody.innerHTML = '<tr><td colspan="6" style="color:var(--text-muted);">Trust ihlali yok</td></tr>'; return; }
        tbody.innerHTML = items.map(function(t) {
            return '<tr style="cursor:pointer;" onclick="fireAuditJumpToImplicitTrust(\'' + faEscape(t.rule_id) + '\')" title="Detay için Implicit Trust tab\'ına git">' +
                '<td><a href="javascript:void(0)" onclick="event.stopPropagation();fireAuditOpenRule(\'' + t.rule_id + '\')" class="fa-rule-link">#' + faEscape(t.rule_id) + '</a> ' + faEscape(t.rule_name || '') + '</td>' +
                '<td><span class="fa-sev-badge fa-sev-' + t.severity + '">' + t.severity + '</span></td>' +
                '<td>' + faEscape(t.src_zone) + ' <span style="color:var(--text-muted);">(trust=' + t.src_trust + ')</span></td>' +
                '<td>' + faEscape(t.dst_zone) + ' <span style="color:var(--text-muted);">(trust=' + t.dst_trust + ')</span></td>' +
                '<td><strong style="color:#c0392b;">+' + t.trust_delta + '</strong></td>' +
                '<td style="font-size:12px;">' + (t.services || []).slice(0, 3).map(faEscape).join(', ') + ' <i class="fas fa-arrow-right" style="color:#3498db;float:right;opacity:.5;"></i></td>' +
            '</tr>';
        }).join('');
    }

    function _renderIntelOrdering(items) {
        var tbody = document.getElementById('fa-intel-ordering-tbody');
        if (!tbody) return;
        var tbl = tbody.closest('table');
        var linkId = 'fa-intel-ordering-link';
        if (tbl && !document.getElementById(linkId)) {
            var div = document.createElement('div');
            div.id = linkId;
            div.innerHTML = _intelDetailLink('ordering', 'Ordering anomalies ÖZETİ (3 tip: correlation / generalization / redundancy)');
            tbl.parentNode.insertBefore(div, tbl);
        }
        if (!items.length) { tbody.innerHTML = '<tr><td colspan="4" style="color:var(--text-muted);">Siralama hatasi yok</td></tr>'; return; }
        tbody.innerHTML = items.map(function(o) {
            return '<tr style="cursor:pointer;" onclick="fireAuditJumpToOrdering()" title="Detay için Ordering tab\'ına git">' +
                '<td>#' + faEscape(o.broad_rule.id) + ' ' + faEscape(o.broad_rule.name || '') + '</td>' +
                '<td>#' + faEscape(o.narrow_rule.id) + ' ' + faEscape(o.narrow_rule.name || '') + '</td>' +
                '<td>' + faEscape(o.issue) + '</td>' +
                '<td><span class="fa-sev-badge fa-sev-' + o.severity + '">' + o.severity + '</span> <i class="fas fa-arrow-right" style="color:#3498db;opacity:.5;"></i></td>' +
            '</tr>';
        }).join('');
    }

    function _renderIntelMerge(items) {
        var tbody = document.getElementById('fa-intel-merge-tbody');
        if (!tbody) return;
        var tbl = tbody.closest('table');
        var linkId = 'fa-intel-merge-link';
        if (tbl && !document.getElementById(linkId)) {
            var div = document.createElement('div');
            div.id = linkId;
            div.innerHTML = _intelDetailLink('complexity',
                'Mergeable rule ÖZETİ — risk analizi + BEFORE/AFTER preview + CLI komutlar detaylı tabda');
            tbl.parentNode.insertBefore(div, tbl);
        }
        if (!items.length) { tbody.innerHTML = '<tr><td colspan="5" style="color:var(--text-muted);">Birlestirme firsati yok</td></tr>'; return; }
        tbody.innerHTML = items.map(function(m) {
            var ruleLinks = m.rule_ids.map(function(id) {
                return '<a class="fa-rule-link" onclick="event.stopPropagation();fireAuditOpenRule(\''+faEscape(id)+'\')">#'+faEscape(id)+'</a>';
            }).join(', ');
            var fullSrc = (m.src || []).join(', ');
            var fullDst = (m.dst || []).join(', ');
            var fullSvc = (m.unique_services || []).join(', ');
            return '<tr onclick="fireAuditJumpToComplexity()" title="Detayli merge analizi icin Complexity / Merge tab\'ina git">' +
                '<td>' + ruleLinks + '</td>' +
                '<td style="font-size:12px;" title="' + faEscape(fullSrc) + '">' + faEscape((m.src || []).slice(0, 2).join(', ')) + (m.src && m.src.length > 2 ? ' +'+(m.src.length-2) : '') + '</td>' +
                '<td style="font-size:12px;" title="' + faEscape(fullDst) + '">' + faEscape((m.dst || []).slice(0, 2).join(', ')) + (m.dst && m.dst.length > 2 ? ' +'+(m.dst.length-2) : '') + '</td>' +
                '<td style="font-size:12px;" title="' + faEscape(fullSvc) + '">' + faEscape((m.unique_services || []).slice(0, 4).join(', ')) + (m.unique_services && m.unique_services.length > 4 ? ' +'+(m.unique_services.length-4) : '') + '</td>' +
                '<td><strong style="color:#27ae60;">-' + m.potential_saving + ' kural</strong> <i class="fas fa-arrow-right" style="color:#3498db;opacity:.5;"></i></td>' +
            '</tr>';
        }).join('');
    }

    // ============================================================
    // Faz F: Cross-FW Consistency
    // ============================================================
    function loadCrossFw() {
        var matrixBox = document.getElementById('fa-cf-matrix');
        var drBox = document.getElementById('fa-cf-dr-pairs');
        if (!matrixBox) return;
        matrixBox.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        drBox.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        // FW listesini load et (selectler için)
        if (firewallList && firewallList.length) {
            var sa = document.getElementById('fa-cf-pair-a');
            var sb = document.getElementById('fa-cf-pair-b');
            if (sa && sb) {
                var opts = '<option value="">-- seç --</option>' + firewallList.filter(function(f){return f.is_active;}).map(function(f){
                    return '<option value="'+faEscape(f.slug)+'">'+faEscape(f.name)+' ('+faEscape(f.slug)+')</option>';
                }).join('');
                sa.innerHTML = opts; sb.innerHTML = opts;
            }
        }

        // Matrix
        faApi('cross_fw_matrix').then(function(res) {
            if (!res.success) { matrixBox.innerHTML = '<div style="color:#e74c3c;">Hata: '+faEscape(res.error||'')+'</div>'; return; }
            document.getElementById('fa-cf-fw-count').textContent = res.fw_count || 0;
            document.getElementById('fa-cf-pair-count').textContent = (res.matrix||[]).length;

            if (!(res.matrix||[]).length) {
                matrixBox.innerHTML = '<em style="color:var(--text-muted);">En az 2 sync\'lenmiş FW gerekli</em>';
                return;
            }
            // Heatmap tablo — symmetric, FW listesi sıralı
            var fwSet = new Set();
            res.matrix.forEach(function(m){ fwSet.add(m.fw_a); fwSet.add(m.fw_b); });
            var fws = Array.from(fwSet).sort();
            var lookup = {};
            res.matrix.forEach(function(m){
                lookup[m.fw_a+'|'+m.fw_b] = m;
                lookup[m.fw_b+'|'+m.fw_a] = m; // symmetric
            });

            var html = '<table class="fa-table" style="font-size:.78rem;text-align:center;"><thead><tr><th></th>';
            fws.forEach(function(f){ html += '<th><strong>'+faEscape(f)+'</strong></th>'; });
            html += '</tr></thead><tbody>';
            fws.forEach(function(a) {
                html += '<tr><th>'+faEscape(a)+'</th>';
                fws.forEach(function(b) {
                    if (a === b) { html += '<td style="background:#34495e;color:#fff;">—</td>'; return; }
                    var m = lookup[a+'|'+b];
                    if (!m) { html += '<td>-</td>'; return; }
                    var c = m.consistency_pct;
                    var bg = c >= 70 ? 'rgba(39,174,96,'+(c/100*0.6)+')' :
                             c >= 40 ? 'rgba(243,156,18,'+(c/100*0.6)+')' :
                                       'rgba(231,76,60,'+((100-c)/100*0.6)+')';
                    html += '<td style="background:'+bg+';cursor:pointer;font-weight:600;" '+
                            'onclick="fireAuditCfQuickDiff(\''+faEscape(a)+'\',\''+faEscape(b)+'\')" '+
                            'title="common='+m.common_count+', only_a='+m.only_a_count+', only_b='+m.only_b_count+', mod='+m.modified_count+'">'+
                            '%'+c+'</td>';
                });
                html += '</tr>';
            });
            html += '</tbody></table>';
            matrixBox.innerHTML = html;
        });

        // DR Pairs
        faApi('cross_fw_dr_pairs').then(function(res) {
            if (!res.success) return;
            var saved = res.saved_pairs || [];
            var sugg = res.suggested_pairs || [];
            document.getElementById('fa-cf-dr-count').textContent = saved.length;
            var html = '';
            if (!saved.length && !sugg.length) {
                html = '<em style="color:var(--text-muted);">DR pair tanımlanmamış. <button class="fa-btn fa-btn-sm" onclick="fireAuditCfShowDrPairsModal()">DR Pair Tanımla</button></em>';
            } else {
                if (saved.length) {
                    html += '<h4 style="margin:6px 0;font-size:.9rem;">Tanımlı DR Pairs:</h4>';
                    saved.forEach(function(p) {
                        html += '<div style="display:flex;align-items:center;gap:8px;padding:8px;background:var(--card-bg);border-left:3px solid #3498db;border-radius:4px;margin-bottom:6px;">';
                        html += '<i class="fas fa-life-ring" style="color:#3498db;"></i>';
                        html += '<strong>'+faEscape(p.primary_fw)+'</strong> <i class="fas fa-arrow-right"></i> <strong>'+faEscape(p.secondary_fw)+'</strong>';
                        html += '<span style="font-size:.72rem;color:var(--text-muted);">['+faEscape(p.pair_role||'manual')+']</span>';
                        if (p.description) html += '<span style="font-size:.78rem;">'+faEscape(p.description)+'</span>';
                        html += '<span style="flex:1"></span>';
                        html += '<button class="fa-btn fa-btn-sm fa-btn-primary" onclick="fireAuditCfDrGap(\''+faEscape(p.primary_fw)+'\',\''+faEscape(p.secondary_fw)+'\')"><i class="fas fa-search"></i> DR Gap Analiz</button>';
                        html += '</div>';
                    });
                }
                if (sugg.length) {
                    html += '<h4 style="margin:10px 0 6px;font-size:.9rem;color:var(--text-muted);">Otomatik tespit edilen muhtemel pair\'lar:</h4>';
                    sugg.forEach(function(p) {
                        html += '<div style="display:flex;align-items:center;gap:8px;padding:8px;background:var(--card-bg);border-left:3px dashed #95a5a6;border-radius:4px;margin-bottom:6px;font-size:.85rem;">';
                        html += '<i class="fas fa-magic" style="color:#95a5a6;"></i>';
                        html += faEscape(p.primary_fw)+' <i class="fas fa-arrow-right"></i> '+faEscape(p.secondary_fw);
                        html += '<span style="font-size:.72rem;color:var(--text-muted);">'+faEscape(p.description||'')+'</span>';
                        html += '<span style="flex:1"></span>';
                        html += '<button class="fa-btn fa-btn-sm" onclick="fireAuditCfSaveDrPair(\''+faEscape(p.primary_fw)+'\',\''+faEscape(p.secondary_fw)+'\')"><i class="fas fa-plus"></i> Onayla</button>';
                        html += '</div>';
                    });
                }
            }
            drBox.innerHTML = html;
        });
    }
    window.loadCrossFw = loadCrossFw;

    window.fireAuditCfQuickDiff = function(a, b) {
        document.getElementById('fa-cf-pair-a').value = a;
        document.getElementById('fa-cf-pair-b').value = b;
        loadCrossFwPairDiff();
    };

    window.loadCrossFwPairDiff = function() {
        var a = document.getElementById('fa-cf-pair-a').value;
        var b = document.getElementById('fa-cf-pair-b').value;
        var box = document.getElementById('fa-cf-pair-diff');
        if (!a || !b || a === b) { box.innerHTML = '<em style="color:var(--text-muted);">İki farklı FW seçin.</em>'; return; }
        box.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        faApi('cross_fw_diff', {fw_a: a, fw_b: b}).then(function(res) {
            if (!res.success) { box.innerHTML = '<div style="color:#e74c3c;">Hata: '+faEscape(res.error||'')+'</div>'; return; }
            var html = '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;margin-bottom:14px;">';
            html += '<div class="fa-kpi"><div class="fa-kpi-label">Common</div><div class="fa-kpi-value" style="color:#27ae60;">'+res.common_count+'</div></div>';
            html += '<div class="fa-kpi fa-kpi-medium"><div class="fa-kpi-label">Only in '+faEscape(a)+'</div><div class="fa-kpi-value">'+res.only_a_count+'</div></div>';
            html += '<div class="fa-kpi fa-kpi-medium"><div class="fa-kpi-label">Only in '+faEscape(b)+'</div><div class="fa-kpi-value">'+res.only_b_count+'</div></div>';
            html += '<div class="fa-kpi fa-kpi-high"><div class="fa-kpi-label">Modified</div><div class="fa-kpi-value">'+res.modified_count+'</div></div>';
            html += '</div>';
            html += '<div style="background:rgba(52,152,219,0.05);padding:10px;border-radius:4px;margin-bottom:14px;"><strong>Consistency:</strong> %'+res.consistency_pct+'</div>';

            // Sections
            ['only_a', 'only_b', 'modified'].forEach(function(k) {
                var items = res[k] || [];
                if (!items.length) return;
                var label = k === 'only_a' ? ('Yalniz ' + a + ' icinde') :
                            k === 'only_b' ? ('Yalniz ' + b + ' icinde') : 'Modified (ayni isim, farkli icerik)';
                html += '<details open style="margin-bottom:10px;"><summary style="cursor:pointer;font-weight:600;padding:6px;background:var(--card-bg);">'+faEscape(label)+' ('+items.length+')</summary>';
                html += '<table class="fa-table" style="font-size:.78rem;"><thead><tr><th>Rule ID</th><th>Adı</th><th>Action</th><th>Detay</th></tr></thead><tbody>';
                items.forEach(function(r) {
                    if (k === 'modified') {
                        var df = r.differing_fields || {};
                        var detailsArr = Object.keys(df).map(function(k) {
                            return k + ': ' + JSON.stringify(df[k]).substring(0, 60);
                        });
                        html += '<tr>' +
                            '<td><a class="fa-rule-link" onclick="fireAuditOpenRule(\''+faEscape(r.a.rule_id)+'\')">'+faEscape(r.a.rule_id)+'</a> / <a class="fa-rule-link" onclick="fireAuditOpenRule(\''+faEscape(r.b.rule_id)+'\')">'+faEscape(r.b.rule_id)+'</a></td>'+
                            '<td title="'+faEscape(r.name||'')+'">'+faEscape(r.name||'')+'</td>'+
                            '<td>-</td>'+
                            '<td title="'+faEscape(detailsArr.join(' | '))+'"><code class="fa-cell-truncate-2">'+faEscape(Object.keys(df).join(', '))+'</code></td></tr>';
                    } else {
                        var src = (r.src_addresses||[]).join(',');
                        var dst = (r.dst_addresses||[]).join(',');
                        html += '<tr>' +
                            '<td><a class="fa-rule-link" onclick="fireAuditOpenRule(\''+faEscape(r.rule_id)+'\')">'+faEscape(r.rule_id)+'</a></td>'+
                            '<td title="'+faEscape(r.name||'')+'">'+faEscape(r.name||'')+'</td>'+
                            '<td>'+faActionBadge(r.action)+'</td>'+
                            '<td title="src: '+faEscape(src)+' → dst: '+faEscape(dst)+'"><span class="fa-cell-truncate-2">src: '+faEscape(src.substring(0,40))+' → dst: '+faEscape(dst.substring(0,40))+'</span></td></tr>';
                    }
                });
                html += '</tbody></table></details>';
            });
            box.innerHTML = html;
        });
    };

    window.fireAuditCfSaveDrPair = function(primary, secondary) {
        var fd = new FormData();
        fd.append('primary_fw', primary); fd.append('secondary_fw', secondary);
        fd.append('pair_role', 'auto-confirmed');
        fetch(API_BASE+'?action=cross_fw_dr_pairs', {method:'POST',credentials:'same-origin',body:fd})
            .then(function(r){return r.json();}).then(function(res){
                if (res.success) loadCrossFw();
                else alert('Hata: '+(res.error||''));
            });
    };

    window.fireAuditCfDrGap = function(primary, secondary) {
        faApi('cross_fw_dr_gap', {primary_fw: primary, secondary_fw: secondary}).then(function(res) {
            if (!res.success) { alert('Hata: '+(res.error||'')); return; }
            var s = res.summary || {};
            var totalCritHigh = (s.CRITICAL||0) + (s.HIGH||0);
            document.getElementById('fa-cf-gap-count').textContent = totalCritHigh;
            // Modal göster
            var existing = document.getElementById('fa-cf-gap-modal');
            if (existing) existing.remove();
            var m = document.createElement('div');
            m.id = 'fa-cf-gap-modal';
            m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;z-index:9998;';
            var html = '<div style="background:var(--card-bg);padding:20px;border-radius:10px;max-width:900px;width:95%;max-height:85vh;overflow-y:auto;">';
            html += '<h3><i class="fas fa-life-ring"></i> DR Gap: '+faEscape(primary)+' → '+faEscape(secondary)+'</h3>';
            html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;margin-bottom:14px;">';
            html += '<div class="fa-kpi fa-kpi-critical"><div class="fa-kpi-label">CRITICAL</div><div class="fa-kpi-value">'+(s.CRITICAL||0)+'</div></div>';
            html += '<div class="fa-kpi fa-kpi-high"><div class="fa-kpi-label">HIGH</div><div class="fa-kpi-value">'+(s.HIGH||0)+'</div></div>';
            html += '<div class="fa-kpi fa-kpi-medium"><div class="fa-kpi-label">MEDIUM</div><div class="fa-kpi-value">'+(s.MEDIUM||0)+'</div></div>';
            html += '<div class="fa-kpi"><div class="fa-kpi-label">LOW</div><div class="fa-kpi-value">'+(s.LOW||0)+'</div></div>';
            html += '</div>';
            ['CRITICAL','HIGH','MEDIUM','LOW'].forEach(function(sev) {
                var items = (res.gaps||{})[sev] || [];
                if (!items.length) return;
                var color = faSevColor(sev);
                html += '<details open style="margin-bottom:10px;"><summary style="cursor:pointer;color:'+color+';font-weight:700;">'+sev+' ('+items.length+')</summary>';
                items.slice(0, 30).forEach(function(g) {
                    html += '<div style="border-left:3px solid '+color+';background:var(--card-bg);padding:8px;border-radius:4px;margin:4px 0;font-size:.82rem;">';
                    html += '<strong>['+g.gap_type+']</strong> '+faEscape(g.rule_name||g.rule_id_primary||'?');
                    html += '<div style="font-size:.78rem;color:var(--text-muted);margin-top:4px;">'+faEscape(g.reason||'')+'</div>';
                    html += '</div>';
                });
                html += '</details>';
            });
            html += '<div style="text-align:right;"><button class="fa-btn fa-btn-secondary" onclick="document.getElementById(\'fa-cf-gap-modal\').remove()">Kapat</button></div>';
            html += '</div>';
            m.innerHTML = html;
            document.body.appendChild(m);
        });
    };

    window.fireAuditCfShowDrPairsModal = function() {
        var existing = document.getElementById('fa-cf-dr-modal');
        if (existing) existing.remove();
        var m = document.createElement('div');
        m.id = 'fa-cf-dr-modal';
        m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;z-index:9998;';
        var fwOpts = (firewallList||[]).filter(function(f){return f.is_active;}).map(function(f){return '<option value="'+faEscape(f.slug)+'">'+faEscape(f.name)+'</option>';}).join('');
        m.innerHTML = '<div style="background:var(--card-bg);padding:20px;border-radius:10px;max-width:600px;width:95%;">' +
            '<h3>DR Pair Tanımla</h3>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">' +
            '<div><label>Primary FW</label><select id="fa-cf-modal-primary" class="form-select">'+fwOpts+'</select></div>' +
            '<div><label>Secondary FW</label><select id="fa-cf-modal-secondary" class="form-select">'+fwOpts+'</select></div>' +
            '</div>' +
            '<div style="margin-bottom:10px;"><label>Pair Role</label><select id="fa-cf-modal-role" class="form-select">' +
            '<option value="dr-prod-drc">DR (prod ↔ drc)</option>' +
            '<option value="ha-active-passive">HA (active/passive)</option>' +
            '<option value="test-clone">Test Clone</option>' +
            '<option value="manual">Manuel</option></select></div>' +
            '<div style="margin-bottom:10px;"><label>Açıklama</label><input id="fa-cf-modal-desc" class="form-control" placeholder="opsiyonel"></div>' +
            '<div style="display:flex;gap:8px;justify-content:flex-end;">' +
            '<button class="fa-btn fa-btn-secondary" onclick="document.getElementById(\'fa-cf-dr-modal\').remove()">Iptal</button>' +
            '<button class="fa-btn fa-btn-primary" onclick="fireAuditCfSaveDrPairModal()">Kaydet</button>' +
            '</div></div>';
        document.body.appendChild(m);
    };

    window.fireAuditCfSaveDrPairModal = function() {
        var fd = new FormData();
        fd.append('primary_fw', document.getElementById('fa-cf-modal-primary').value);
        fd.append('secondary_fw', document.getElementById('fa-cf-modal-secondary').value);
        fd.append('pair_role', document.getElementById('fa-cf-modal-role').value);
        fd.append('description', document.getElementById('fa-cf-modal-desc').value);
        fetch(API_BASE+'?action=cross_fw_dr_pairs', {method:'POST',credentials:'same-origin',body:fd})
            .then(function(r){return r.json();}).then(function(res){
                if (res.success) { document.getElementById('fa-cf-dr-modal').remove(); loadCrossFw(); }
                else alert('Hata: '+(res.error||''));
            });
    };

    // ============================================================
    // Faz H: Timeline View
    // ============================================================
    window.loadTimeline = function() {
        var box = document.getElementById('fa-tl-content');
        if (!box) return;
        var days = document.getElementById('fa-tl-window').value;
        box.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        faApi('timeline', {days: days}).then(function(res) {
            if (!res.success) { box.innerHTML = '<div style="color:#e74c3c;">Hata: '+faEscape(res.error||'')+'</div>'; return; }
            var tl = res.timeline || [];
            if (!tl.length) {
                box.innerHTML = '<div style="padding:14px;color:var(--text-muted);"><i class="fas fa-info-circle"></i> Bu zaman aralığında değişiklik bulunamadı (sync diff verisi gerekli).</div>';
                return;
            }
            var html = '<div style="padding:8px;background:rgba(52,152,219,0.05);border-radius:4px;margin-bottom:14px;">' +
                       '<strong>Toplam '+res.total_changes+' değişiklik</strong> son '+res.days+' gün</div>';
            html += '<div style="display:flex;flex-direction:column;gap:8px;">';
            tl.forEach(function(t) {
                html += '<details style="background:var(--card-bg);padding:10px;border-radius:4px;border-left:4px solid '+(t.total>10?'#c0392b':t.total>3?'#e67e22':'#3498db')+';">';
                html += '<summary style="cursor:pointer;display:flex;align-items:center;gap:10px;">';
                html += '<strong style="font-size:1rem;">'+faEscape(t.date)+'</strong>';
                html += '<span style="color:#27ae60;">+'+t.added+'</span>';
                html += '<span style="color:#c0392b;">-'+t.removed+'</span>';
                html += '<span style="color:#3498db;">~'+t.modified+'</span>';
                html += '<span style="color:var(--text-muted);font-size:.78rem;">toplam '+t.total+'</span>';
                if ((t.users||[]).length) html += '<span style="color:var(--text-muted);font-size:.78rem;margin-left:auto;">users: '+t.users.map(faEscape).join(', ')+'</span>';
                html += '</summary>';
                html += '<div style="margin-top:8px;padding:8px;font-size:.82rem;">';
                (t.samples||[]).forEach(function(s) {
                    var actColor = s.action === 'Add' ? '#27ae60' : s.action === 'Delete' ? '#c0392b' : '#3498db';
                    html += '<div style="margin:4px 0;"><span style="color:'+actColor+';font-weight:600;">'+faEscape(s.action||'?')+'</span> rule #'+faEscape(s.rule_id||'?')+' by <em>'+faEscape(s.user||'?')+'</em> @ '+faEscape(s.audit_at||'-')+'</div>';
                });
                html += '</div></details>';
            });
            html += '</div>';
            box.innerHTML = html;
        });
    };

    // ============================================================
    // Faz I: Global Search (Cmd+K / Ctrl+K)
    // ============================================================
    window.fireAuditOpenSearch = function() {
        var existing = document.getElementById('fa-search-overlay');
        if (existing) { existing.remove(); return; }
        var m = document.createElement('div');
        m.id = 'fa-search-overlay';
        m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);display:flex;align-items:flex-start;justify-content:center;padding-top:80px;z-index:99999;';
        m.innerHTML =
            '<div style="background:var(--card-bg);width:90%;max-width:700px;border-radius:8px;box-shadow:0 20px 60px rgba(0,0,0,0.4);">' +
            '<div style="padding:14px;border-bottom:1px solid var(--border-color);display:flex;align-items:center;gap:10px;">' +
            '<i class="fas fa-search" style="color:var(--text-muted);"></i>' +
            '<input type="text" id="fa-search-input" placeholder="Ara: rule_id, name, IP, service, finding..." ' +
            'style="flex:1;border:none;background:transparent;outline:none;font-size:1rem;" autofocus>' +
            '<span style="color:var(--text-muted);font-size:.72rem;">ESC kapat · Cross-FW arama</span>' +
            '</div>' +
            '<div id="fa-search-results" style="max-height:60vh;overflow-y:auto;padding:8px;"></div>' +
            '</div>';
        m.addEventListener('click', function(e) { if (e.target === m) m.remove(); });
        document.body.appendChild(m);
        var inp = document.getElementById('fa-search-input');
        var dbg;
        inp.addEventListener('input', function(e) {
            clearTimeout(dbg);
            var q = e.target.value.trim();
            if (q.length < 2) { document.getElementById('fa-search-results').innerHTML = ''; return; }
            dbg = setTimeout(function() { _doGlobalSearch(q); }, 250);
        });
        inp.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') m.remove();
        });
    };
    function _doGlobalSearch(q) {
        var box = document.getElementById('fa-search-results');
        box.innerHTML = '<div style="padding:14px;color:var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> arıyor...</div>';
        faApi('search', {q: q, limit: 50}).then(function(res) {
            var items = res.results || [];
            if (!items.length) { box.innerHTML = '<div style="padding:14px;color:var(--text-muted);">Sonuç yok</div>'; return; }
            // Group by kind
            var byKind = {};
            items.forEach(function(i) { (byKind[i.kind] = byKind[i.kind] || []).push(i); });
            var html = '';
            var iconMap = {rule:'fa-list-ul', finding:'fa-exclamation-triangle', compliance:'fa-check-double', device:'fa-server'};
            Object.keys(byKind).forEach(function(k) {
                html += '<div style="padding:6px 12px;color:var(--text-muted);font-size:.72rem;text-transform:uppercase;">' + k + ' (' + byKind[k].length + ')</div>';
                byKind[k].forEach(function(r) {
                    html += '<div onclick="fireAuditSearchOpen(\''+faEscape(r.kind)+'\',\''+faEscape(r.fw_slug)+'\',\''+faEscape(r.id)+'\')" ' +
                            'style="padding:8px 14px;cursor:pointer;border-bottom:1px solid var(--border-color);display:flex;align-items:center;gap:10px;" ' +
                            'onmouseover="this.style.background=\'rgba(52,152,219,0.08)\'" onmouseout="this.style.background=\'\'">';
                    html += '<i class="fas '+(iconMap[r.kind]||'fa-circle')+'" style="color:var(--text-muted);"></i>';
                    html += '<div style="flex:1;"><strong>'+faEscape(r.title)+'</strong>';
                    if (r.snippet) html += '<div style="font-size:.78rem;color:var(--text-muted);">'+faEscape(r.snippet)+'</div>';
                    html += '</div>';
                    if (r.fw_slug) html += '<span style="font-size:.7rem;color:var(--text-muted);background:var(--border-color);padding:2px 6px;border-radius:3px;">'+faEscape(r.fw_slug)+'</span>';
                    if (r.badge) html += '<span class="fa-sev-badge fa-sev-'+r.badge+'" style="font-size:.7rem;">'+faEscape(r.badge)+'</span>';
                    html += '</div>';
                });
            });
            box.innerHTML = html;
        });
    }
    window.fireAuditSearchOpen = function(kind, fw_slug, id) {
        var ov = document.getElementById('fa-search-overlay');
        if (ov) ov.remove();
        if (fw_slug && fw_slug !== FW_SLUG) fireAuditSwitchFirewall(fw_slug);
        if (kind === 'rule') setTimeout(function(){ fireAuditOpenRule(id); }, 200);
        else if (kind === 'finding') setTimeout(function(){ fireAuditOpenRule(id); }, 200);
        else if (kind === 'compliance') fireAuditSwitchTab('compliance');
        else if (kind === 'device') fireAuditSwitchTab('dashboard');
    };

    // Cmd+K / Ctrl+K binding
    document.addEventListener('keydown', function(e) {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            fireAuditOpenSearch();
        }
    });

    // ============================================================
    // Faz J: Saved Filter Views
    // ============================================================
    window.loadSavedViews = function() {
        var box = document.getElementById('fa-sv-list');
        if (!box) return;
        box.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        var owner = window.PORTAL_USER || 'unknown';
        fetch(API_BASE+'?action=saved_views&owner='+encodeURIComponent(owner), {credentials:'same-origin'})
            .then(function(r){return r.json();}).then(function(res){
                if (!res.success) { box.innerHTML = '<div style="color:#e74c3c;">Hata: '+faEscape(res.error||'')+'</div>'; return; }
                var views = res.views || [];
                if (!views.length) { box.innerHTML = '<div style="padding:14px;color:var(--text-muted);">Henüz kayıtlı görünüm yok. <strong>Yeni Görünüm</strong> ile ekle.</div>'; return; }
                var html = '<div style="display:flex;flex-direction:column;gap:8px;">';
                views.forEach(function(v) {
                    html += '<div style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--card-bg);border-radius:6px;border-left:3px solid #3498db;">';
                    html += '<i class="fas fa-bookmark" style="color:#3498db;"></i>';
                    html += '<div style="flex:1;"><strong>'+faEscape(v.view_name)+'</strong>';
                    if (v.shared) html += ' <span style="font-size:.7rem;background:#27ae6022;color:#27ae60;padding:1px 6px;border-radius:3px;">shared</span>';
                    if (v.description) html += '<div style="font-size:.78rem;color:var(--text-muted);">'+faEscape(v.description)+'</div>';
                    html += '<div style="font-size:.72rem;color:var(--text-muted);">tab: '+faEscape(v.target_tab||'-')+' · kullanım: '+v.use_count+'</div>';
                    html += '</div>';
                    html += '<button class="fa-btn fa-btn-sm fa-btn-primary" onclick="fireAuditSavedViewApply('+v.id+',\''+faEscape(v.target_tab||'')+'\','+JSON.stringify(JSON.stringify(v.filter)).replace(/'/g,"&#39;")+')"><i class="fas fa-play"></i> Aç</button>';
                    if (v.owner === owner) {
                        html += '<button class="fa-btn fa-btn-sm" style="color:#c0392b;" onclick="fireAuditSavedViewDelete('+v.id+')"><i class="fas fa-trash"></i></button>';
                    }
                    html += '</div>';
                });
                html += '</div>';
                box.innerHTML = html;
            });
    };

    window.fireAuditSavedViewCreate = function() {
        var name = prompt('Görünüm adı:');
        if (!name) return;
        var tab = prompt('Hangi tab? (örn: risk, shadow, implicit_trust, ordering, complexity)', currentTab || 'dashboard');
        var filter = prompt('Filtre JSON (örn: {"severity":"CRITICAL","action":"allow"}):', '{}');
        try { JSON.parse(filter); } catch (e) { alert('Geçersiz JSON'); return; }
        var fd = new FormData();
        fd.append('view_name', name);
        fd.append('owner', window.PORTAL_USER || 'unknown');
        fd.append('target_tab', tab);
        fd.append('filter_json', filter);
        fd.append('description', '');
        fetch(API_BASE+'?action=saved_views', {method:'POST',credentials:'same-origin',body:fd})
            .then(function(r){return r.json();}).then(function(res){
                if (res.success) loadSavedViews();
                else alert('Hata: '+(res.error||''));
            });
    };

    window.fireAuditSavedViewApply = function(id, tab, filterJson) {
        if (tab) fireAuditSwitchTab(tab);
        // Filter alanlarini set et (tab loader'i kontrol edecek)
        try {
            var f = JSON.parse(filterJson);
            window._savedViewFilter = f;
            // Best-effort: yaygin filtre id'lerini doldur
            Object.keys(f).forEach(function(k) {
                var el = document.getElementById('fa-filter-' + k);
                if (el) el.value = f[k];
            });
        } catch (e) {}
    };

    window.fireAuditSavedViewDelete = function(id) {
        if (!confirm('Sil?')) return;
        var owner = window.PORTAL_USER || 'unknown';
        fetch(API_BASE+'?action=saved_views&view_id='+id+'&owner='+encodeURIComponent(owner),
              {method:'DELETE',credentials:'same-origin'})
            .then(function(r){return r.json();}).then(function(res){
                if (res.success) loadSavedViews();
            });
    };

    // Tab geçiş yardımcıları — rule_id ile birlikte doğrudan filtreyi set edip gidebiliriz
    window.fireAuditJumpToImplicitTrust = function(ruleId) {
        fireAuditSwitchTab('implicit_trust');
        // Rule detail modal'i da ac — kullanici hangi kural olduğunu hızlı görsün
        if (ruleId) setTimeout(function() { fireAuditOpenRule(ruleId); }, 200);
    };
    window.fireAuditJumpToOrdering = function() {
        fireAuditSwitchTab('ordering');
    };
    window.fireAuditJumpToComplexity = function() {
        fireAuditSwitchTab('complexity');
    };

    function _renderIntelCrossFw(items) {
        var tbody = document.getElementById('fa-intel-crossfw-tbody');
        if (!tbody) return;
        if (!items.length) { tbody.innerHTML = '<tr><td colspan="6" style="color:var(--text-muted);">Karsilastirma icin en az 2 FW gerekli</td></tr>'; return; }
        tbody.innerHTML = items.map(function(c) {
            var color = c.consistency_pct >= 70 ? '#27ae60' : c.consistency_pct >= 40 ? '#f39c12' : '#c0392b';
            return '<tr>' +
                '<td><strong>' + faEscape(c.fw_a) + '</strong></td>' +
                '<td><strong>' + faEscape(c.fw_b) + '</strong></td>' +
                '<td>' + c.common_rules + '</td>' +
                '<td>' + c.only_in_a + '</td>' +
                '<td>' + c.only_in_b + '</td>' +
                '<td><strong style="color:' + color + '">%' + c.consistency_pct + '</strong></td>' +
            '</tr>';
        }).join('');
    }

    function _renderIntelRemediation(items) {
        var container = document.getElementById('fa-intel-remediation-list');
        if (!container) return;
        if (!items.length) { container.innerHTML = '<p style="color:var(--text-muted);">Remediation onerisi yok</p>'; return; }
        container.innerHTML = items.map(function(r) {
            return '<div class="card" style="margin-bottom:10px;padding:12px;">' +
                '<div style="display:flex;justify-content:space-between;margin-bottom:8px;">' +
                '<span><span class="fa-sev-badge fa-sev-' + r.severity + '">' + r.severity + '</span> ' +
                '<strong>#' + faEscape(r.rule_id) + '</strong> (' + faEscape(r.finding_type) + ')</span>' +
                '<span class="fa-vendor-badge" style="background:#2c3e50;color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;">' + faEscape(r.vendor) + '</span>' +
                '</div>' +
                '<p style="font-size:13px;margin:0 0 8px;">' + faEscape(r.description).substring(0, 150) + '</p>' +
                '<pre style="background:var(--input-bg,#1e1e1e);color:#e0e0e0;padding:10px;border-radius:6px;font-size:12px;margin:0;overflow-x:auto;">' +
                r.cli_commands.map(faEscape).join('\n') + '</pre>' +
                '<div style="font-size:11px;color:#e67e22;margin-top:6px;"><i class="fas fa-exclamation-triangle"></i> ' + faEscape(r.warning) + '</div>' +
                '</div>';
        }).join('');
    }

    window.faIntelLoad = faIntelLoad;

    window.faIntelShowSub = function(panel) {
        var panels = ['trust', 'ordering', 'merge', 'crossfw', 'remediation'];
        panels.forEach(function(p) {
            var el = document.getElementById('fa-intel-' + p + '-panel');
            var btn = document.getElementById('fa-intel-sub-' + p);
            if (el) el.style.display = p === panel ? '' : 'none';
            if (btn) btn.className = p === panel ? 'fa-btn fa-btn-primary' : 'fa-btn';
        });
    };

    // ============================================================
    // Topology & Attack Path — Faz 4
    // ============================================================

    var _topoData = null;

    function faTopoLoad() {
        // Paralel yukle: segmentation + topology + attack paths + blast + lateral
        Promise.all([
            faApi('segmentation'),
            faApi('topology'),
            faApi('attack_paths'),
            faApi('blast_radius'),
            faApi('lateral_movement'),
        ]).then(function(results) {
            var seg = results[0], topo = results[1], paths = results[2], blast = results[3], lateral = results[4];

            // Segmentation card
            if (seg.success) {
                var scoreEl = document.getElementById('fa-topo-seg-score');
                var gradeEl = document.getElementById('fa-topo-seg-grade');
                var card = document.getElementById('fa-topo-seg-card');
                if (scoreEl) scoreEl.textContent = seg.score;
                if (gradeEl) gradeEl.textContent = 'Grade ' + seg.grade;
                if (card) card.style.borderLeft = '4px solid ' + _gradeColor(seg.grade);
                var violEl = document.getElementById('fa-topo-violations');
                if (violEl) violEl.textContent = seg.trust_violations || 0;
            }

            // Zone count
            if (topo.success) {
                var zcEl = document.getElementById('fa-topo-zone-count');
                if (zcEl) zcEl.textContent = topo.zone_count || 0;
                _topoData = topo;
                _renderTopoGraph(topo);
            }

            // Attack path count
            if (paths.success) {
                var pcEl = document.getElementById('fa-topo-path-count');
                if (pcEl) pcEl.textContent = paths.total || 0;
                _renderAttackPaths(paths.paths || []);
            }

            // Blast radius
            if (blast.success) _renderBlastRadius(blast.zones || []);

            // Lateral movement
            if (lateral.success) _renderLateralMovement(lateral.zones || []);
        });
    }

    function _gradeColor(grade) {
        return { A: '#27ae60', B: '#2ecc71', C: '#f39c12', D: '#e67e22', F: '#c0392b' }[grade] || '#95a5a6';
    }

    function _sevColor(sev) {
        return { CRITICAL: '#c0392b', HIGH: '#e74c3c', MEDIUM: '#f39c12', LOW: '#3498db' }[sev] || '#95a5a6';
    }

    function _trustColor(trust) {
        if (trust <= 10) return '#c0392b';
        if (trust <= 30) return '#e67e22';
        if (trust <= 50) return '#f39c12';
        if (trust <= 70) return '#2ecc71';
        return '#27ae60';
    }

    // D3.js Force-Directed Graph
    function _renderTopoGraph(topo) {
        var container = document.getElementById('fa-topo-graph');
        var svg = document.getElementById('fa-topo-svg');
        if (!container || !svg || !topo.nodes) return;

        var width = container.clientWidth || 800;
        var height = container.clientHeight || 500;
        svg.innerHTML = '';
        svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);

        var nodes = topo.nodes || [];
        var links = topo.links || [];

        // Basit force simulation (D3 olmadan — pure SVG)
        // Node pozisyonlarini trust level'a gore yerlesir
        var trustGroups = {};
        nodes.forEach(function(n) {
            var g = n.group || 'unknown';
            if (!trustGroups[g]) trustGroups[g] = [];
            trustGroups[g].push(n);
        });

        var groupOrder = ['untrusted', 'dmz', 'semi-trusted', 'trusted', 'highly-trusted'];
        var xStep = width / (groupOrder.length + 1);
        groupOrder.forEach(function(g, gi) {
            var nodesInGroup = trustGroups[g] || [];
            var yStep = height / (nodesInGroup.length + 1);
            nodesInGroup.forEach(function(n, ni) {
                n.x = xStep * (gi + 1) + (Math.random() - 0.5) * 30;
                n.y = yStep * (ni + 1) + (Math.random() - 0.5) * 20;
            });
        });

        var nodeMap = {};
        nodes.forEach(function(n) { nodeMap[n.id] = n; });

        // Links (edges)
        links.forEach(function(l) {
            var src = nodeMap[l.source];
            var dst = nodeMap[l.target];
            if (!src || !dst) return;
            var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', src.x);
            line.setAttribute('y1', src.y);
            line.setAttribute('x2', dst.x);
            line.setAttribute('y2', dst.y);
            var isAllow = l.allow > 0;
            line.setAttribute('stroke', isAllow ? 'rgba(231,76,60,0.4)' : 'rgba(149,165,166,0.3)');
            line.setAttribute('stroke-width', Math.min(4, Math.max(1, (l.allow || 0) * 0.3)));
            if (l.vpn_tunnel) line.setAttribute('stroke-dasharray', '5,5');
            svg.appendChild(line);

            // Arrow (basit)
            if (isAllow) {
                var midX = (src.x + dst.x) / 2;
                var midY = (src.y + dst.y) / 2;
                var circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle.setAttribute('cx', midX);
                circle.setAttribute('cy', midY);
                circle.setAttribute('r', 2);
                circle.setAttribute('fill', 'rgba(231,76,60,0.6)');
                svg.appendChild(circle);
            }
        });

        // Nodes
        nodes.forEach(function(n) {
            var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

            var circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', n.x);
            circle.setAttribute('cy', n.y);
            circle.setAttribute('r', n.id === 'Internet' ? 18 : 14);
            circle.setAttribute('fill', _trustColor(n.trust));
            circle.setAttribute('stroke', '#fff');
            circle.setAttribute('stroke-width', 2);
            circle.style.cursor = 'pointer';
            g.appendChild(circle);

            var text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', n.x);
            text.setAttribute('y', n.y + (n.id === 'Internet' ? 30 : 26));
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('font-size', '10');
            text.setAttribute('fill', 'var(--text-color, #333)');
            text.textContent = n.name.length > 15 ? n.name.substring(0, 13) + '..' : n.name;
            g.appendChild(text);

            var trustLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            trustLabel.setAttribute('x', n.x);
            trustLabel.setAttribute('y', n.y + 4);
            trustLabel.setAttribute('text-anchor', 'middle');
            trustLabel.setAttribute('font-size', '9');
            trustLabel.setAttribute('font-weight', 'bold');
            trustLabel.setAttribute('fill', '#fff');
            trustLabel.textContent = n.trust;
            g.appendChild(trustLabel);

            svg.appendChild(g);
        });

        // Legend
        var legend = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        var legendItems = [
            { color: '#c0392b', label: 'Untrusted (0-10)' },
            { color: '#e67e22', label: 'DMZ (11-30)' },
            { color: '#f39c12', label: 'Semi-trusted (31-50)' },
            { color: '#2ecc71', label: 'Trusted (51-70)' },
            { color: '#27ae60', label: 'Highly-trusted (71+)' },
        ];
        legendItems.forEach(function(item, i) {
            var rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', 10);
            rect.setAttribute('y', 10 + i * 18);
            rect.setAttribute('width', 12);
            rect.setAttribute('height', 12);
            rect.setAttribute('rx', 3);
            rect.setAttribute('fill', item.color);
            legend.appendChild(rect);
            var txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            txt.setAttribute('x', 26);
            txt.setAttribute('y', 20 + i * 18);
            txt.setAttribute('font-size', '10');
            txt.setAttribute('fill', 'var(--text-color, #333)');
            txt.textContent = item.label;
            legend.appendChild(txt);
        });
        svg.appendChild(legend);
    }

    function _renderAttackPaths(paths) {
        var tbody = document.getElementById('fa-topo-attack-tbody');
        if (!tbody) return;
        if (!paths.length) { tbody.innerHTML = '<tr><td colspan="6" style="color:var(--text-muted);">Saldiri yolu bulunamadi</td></tr>'; return; }
        tbody.innerHTML = paths.map(function(p) {
            return '<tr>' +
                '<td><strong style="color:' + _sevColor(p.severity) + '">' + p.risk_score + '</strong></td>' +
                '<td><span class="fa-sev-badge fa-sev-' + p.severity + '">' + p.severity + '</span></td>' +
                '<td>' + faEscape(p.target) + '</td>' +
                '<td>' + p.target_trust + '</td>' +
                '<td>' + p.hops + '</td>' +
                '<td style="font-size:12px;">' + p.path.map(function(z) {
                    return '<span style="color:' + _trustColor(p.details && p.details[p.path.indexOf(z)] ? p.details[p.path.indexOf(z)].from_trust || 50 : 50) + '">' + faEscape(z) + '</span>';
                }).join(' → ') + '</td>' +
            '</tr>';
        }).join('');
    }

    function _renderBlastRadius(zones) {
        var tbody = document.getElementById('fa-topo-blast-tbody');
        if (!tbody) return;
        if (!zones.length) { tbody.innerHTML = '<tr><td colspan="6">Veri yok</td></tr>'; return; }
        tbody.innerHTML = zones.map(function(z) {
            return '<tr>' +
                '<td><strong>' + faEscape(z.zone) + '</strong></td>' +
                '<td>' + z.trust + '</td>' +
                '<td><strong style="color:' + _sevColor(z.severity) + '">' + z.blast_score + '</strong></td>' +
                '<td><span class="fa-sev-badge fa-sev-' + z.severity + '">' + z.severity + '</span></td>' +
                '<td>' + z.reachable_count + ' zone</td>' +
                '<td style="font-size:12px;">' + (z.high_trust_reachable || []).slice(0, 3).map(function(r) { return faEscape(r); }).join(', ') + '</td>' +
            '</tr>';
        }).join('');
    }

    function _renderLateralMovement(zones) {
        var tbody = document.getElementById('fa-topo-lateral-tbody');
        if (!tbody) return;
        if (!zones.length) { tbody.innerHTML = '<tr><td colspan="6">Veri yok</td></tr>'; return; }
        tbody.innerHTML = zones.map(function(z) {
            return '<tr>' +
                '<td><strong>' + faEscape(z.zone) + '</strong></td>' +
                '<td>' + z.trust + '</td>' +
                '<td><strong style="color:' + _sevColor(z.severity) + '">' + z.lateral_score + '</strong></td>' +
                '<td><span class="fa-sev-badge fa-sev-' + z.severity + '">' + z.severity + '</span></td>' +
                '<td style="font-size:12px;">' + (z.lateral_targets || []).slice(0, 4).join(', ') + '</td>' +
                '<td>' + z.any_rule_paths + '</td>' +
            '</tr>';
        }).join('');
    }

    window.faTopoLoad = faTopoLoad;

    window.faTopoShowSub = function(panel) {
        ['attack', 'blast', 'lateral'].forEach(function(p) {
            var el = document.getElementById('fa-topo-' + p + '-panel');
            var btn = document.getElementById('fa-topo-sub-' + p);
            if (el) el.style.display = p === panel ? '' : 'none';
            if (btn) {
                btn.className = p === panel ? 'fa-btn fa-btn-primary' : 'fa-btn';
            }
        });
    };

    // ---------- Toast notification helper ----------
    function faShowToast(message, type) {
        var existing = document.getElementById('fa-toast');
        if (existing) existing.remove();
        var colors = { success: '#27ae60', error: '#c0392b', info: '#3498db', warning: '#f39c12' };
        var icons = { success: 'check-circle', error: 'times-circle', info: 'info-circle', warning: 'exclamation-triangle' };
        var toast = document.createElement('div');
        toast.id = 'fa-toast';
        toast.style.cssText = 'position:fixed;bottom:24px;right:24px;padding:12px 20px;border-radius:8px;color:#fff;font-size:14px;z-index:99999;' +
            'box-shadow:0 4px 12px rgba(0,0,0,0.3);display:flex;align-items:center;gap:8px;background:' + (colors[type] || colors.info);
        toast.innerHTML = '<i class="fas fa-' + (icons[type] || 'info-circle') + '"></i> ' + faEscape(message);
        document.body.appendChild(toast);
        setTimeout(function() { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; }, 3000);
        setTimeout(function() { toast.remove(); }, 3500);
    }
    window.faShowToast = faShowToast;

    // ═══════════════════════════════════════════════════════════════════
    // Faz 13 — Syslog Yapılandırma & Güvenlik Analizi
    // ═══════════════════════════════════════════════════════════════════
    var _syslogData = null;

    window.loadSyslog = function() {
        var kpiEl    = document.getElementById('fa-syslog-kpi');
        var issuesEl = document.getElementById('fa-syslog-issues');
        var srvEl    = document.getElementById('fa-syslog-servers-table');
        var filtEl   = document.getElementById('fa-syslog-filters-table');
        var diskEl   = document.getElementById('fa-syslog-disk-card');
        var fazEl    = document.getElementById('fa-syslog-faz-card');
        if (!kpiEl) return;
        [kpiEl, issuesEl, srvEl, filtEl, diskEl, fazEl].forEach(function(el) {
            if (el) el.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        });
        faApi('syslog').then(function(res) {
            if (!res.success) { srvEl.innerHTML = '<em style="color:#e74c3c">Hata: ' + faEscape(res.error || '?') + '</em>'; return; }
            _syslogData = res;

            // KPI
            var enc = res.servers.filter(function(s) { return s.status === 'enable' && (s.enc_algorithm !== 'disable' || s.mode === 'udp'); }).length;
            kpiEl.style.display = '';
            kpiEl.innerHTML =
                _faKpiCard('Aktif Sunucu', res.active_count, res.active_count > 0 ? '#27ae60' : '#e74c3c') +
                _faKpiCard('Şifreli Bağlantı', enc + '/' + res.active_count, enc === res.active_count ? '#27ae60' : '#f39c12') +
                _faKpiCard('Kritik Bulgu', res.issue_counts.CRITICAL, res.issue_counts.CRITICAL > 0 ? '#e74c3c' : '#27ae60') +
                _faKpiCard('Yüksek Bulgu', res.issue_counts.HIGH, res.issue_counts.HIGH > 0 ? '#f39c12' : '#27ae60');

            // Güvenlik bulguları
            issuesEl.innerHTML = _faIssueList(res.issues);

            // Badge
            var badge = document.getElementById('fa-tab-badge-syslog');
            if (badge) {
                var cnt = (res.issue_counts.CRITICAL || 0) + (res.issue_counts.HIGH || 0);
                badge.style.display = cnt > 0 ? '' : 'none';
                badge.textContent = cnt;
                badge.style.background = res.issue_counts.CRITICAL > 0 ? '#e74c3c' : '#f39c12';
            }

            // Sunucular tablosu
            if (!res.servers.length) { srvEl.innerHTML = '<em style="color:#95a5a6">Syslog sunucu tanımlı değil.</em>'; }
            else {
                var h = '<table class="fa-table"><thead><tr><th>#</th><th>Sunucu IP</th><th>Port</th><th>Mod</th>' +
                    '<th>Durum</th><th>TLS</th><th>Şifreleme</th><th>Facility</th><th>Format</th></tr></thead><tbody>';
                res.servers.forEach(function(s) {
                    var tls = s.reliable === 'enable' ? '<span class="fa-badge-ok">TLS</span>' : '<span class="fa-badge-warn">Düz</span>';
                    var enc = s.enc_algorithm !== 'disable' ? '<span class="fa-badge-ok">' + faEscape(s.enc_algorithm) + '</span>'
                                                             : '<span class="fa-badge-warn">disable</span>';
                    var st  = s.status === 'enable' ? '<span class="fa-badge-ok">Aktif</span>' : '<span class="fa-badge-muted">Pasif</span>';
                    h += '<tr><td>' + s.index + '</td><td><code>' + faEscape(s.server || '—') + '</code></td>' +
                         '<td>' + s.port + '</td><td><code>' + faEscape(s.mode) + '</code></td>' +
                         '<td>' + st + '</td><td>' + tls + '</td><td>' + enc + '</td>' +
                         '<td><code>' + faEscape(s.facility) + '</code></td><td><code>' + faEscape(s.format) + '</code></td></tr>';
                });
                srvEl.innerHTML = h + '</tbody></table>';
            }

            // Filtreler tablosu
            if (!res.filters.length) { filtEl.innerHTML = '<em style="color:#95a5a6">Filter bilgisi yok.</em>'; }
            else {
                var fh = '<table class="fa-table"><thead><tr><th>#</th><th>Severity</th><th>Forward Traffic</th>' +
                    '<th>Local Traffic</th><th>Anomaly</th><th>DNS</th><th>SSH</th><th>VoIP</th></tr></thead><tbody>';
                res.filters.forEach(function(f) {
                    function _fTag(v, good) { return v === 'enable'
                        ? '<span class="fa-badge-ok">enable</span>'
                        : '<span class="fa-badge-' + (good ? 'warn' : 'muted') + '">disable</span>'; }
                    var badSev = ['emergency','alert','critical'].indexOf(f.severity) >= 0;
                    fh += '<tr><td>' + f.index + '</td>' +
                          '<td>' + (badSev ? '<span class="fa-badge-warn">' : '<span class="fa-badge-ok">') + faEscape(f.severity) + '</span></td>' +
                          '<td>' + _fTag(f.forward_traffic, true) + '</td>' +
                          '<td>' + _fTag(f.local_traffic, false) + '</td>' +
                          '<td>' + _fTag(f.anomaly, true) + '</td>' +
                          '<td>' + _fTag(f.dns, false) + '</td>' +
                          '<td>' + _fTag(f.ssh, false) + '</td>' +
                          '<td>' + _fTag(f.voip, false) + '</td></tr>';
                });
                filtEl.innerHTML = fh + '</tbody></table>';
            }

            // Disk + FortiAnalyzer kartları
            var dk = res.disk || {};
            diskEl.innerHTML = '<div class="fa-info-card">' +
                '<div class="fa-info-card-title"><i class="fas fa-hdd"></i> Disk Logging</div>' +
                '<div class="fa-info-card-row"><span>Status</span><span>' +
                (dk.status === 'enable' ? '<span class="fa-badge-ok">Aktif</span>' : '<span class="fa-badge-muted">Pasif</span>') + '</span></div>' +
                '<div class="fa-info-card-row"><span>Severity</span><span><code>' + faEscape(dk.severity || '—') + '</code></span></div>' +
                '<div class="fa-info-card-row"><span>Max Log Size</span><span>' + (dk.max_log_file_size || 0) + ' MB</span></div>' +
                '</div>';
            var fz = res.fortianalyzer || {};
            fazEl.innerHTML = '<div class="fa-info-card">' +
                '<div class="fa-info-card-title"><i class="fas fa-cloud"></i> FortiAnalyzer</div>' +
                '<div class="fa-info-card-row"><span>Status</span><span>' +
                (fz.status === 'enable' ? '<span class="fa-badge-ok">Bağlı</span>' : '<span class="fa-badge-muted">Kapalı</span>') + '</span></div>' +
                '<div class="fa-info-card-row"><span>Sunucu</span><span><code>' + faEscape(fz.server || '—') + '</code></span></div>' +
                '<div class="fa-info-card-row"><span>Şifreleme</span><span><code>' + faEscape(fz.enc_algorithm || '—') + '</code></span></div>' +
                '</div>';
        }).catch(function(e) { srvEl.innerHTML = '<em style="color:#e74c3c">Bağlantı hatası: ' + faEscape(e.message) + '</em>'; });
    };

    // ═══════════════════════════════════════════════════════════════════
    // Faz 14 — Traffic Shaping
    // ═══════════════════════════════════════════════════════════════════
    var _shapingData = null;

    window.loadShaping = function() {
        var kpiEl   = document.getElementById('fa-shaping-kpi');
        var shrEl   = document.getElementById('fa-shaping-shapers-table');
        var pipEl   = document.getElementById('fa-shaping-perip-table');
        var polEl   = document.getElementById('fa-shaping-policies-table');
        if (!kpiEl) return;
        [kpiEl, shrEl, pipEl, polEl].forEach(function(el) { if (el) el.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; });
        faApi('shaping').then(function(res) {
            if (!res.success) { shrEl.innerHTML = '<em style="color:#e74c3c">Hata: ' + faEscape(res.error || '?') + '</em>'; return; }
            _shapingData = res;
            var s = res.summary || {};

            // KPI
            kpiEl.style.display = '';
            var bwFmt = function(kb) { return kb >= 1000 ? (kb/1000).toFixed(0) + ' Mbps' : kb + ' Kbps'; };
            kpiEl.innerHTML =
                _faKpiCard('Toplam Shaper', s.total_shapers, '#3498db') +
                _faKpiCard('Per-IP Shaper', s.total_per_ip_shapers, '#9b59b6') +
                _faKpiCard('Aktif Policy', s.active_policies + '/' + s.total_policies, '#27ae60') +
                _faKpiCard('Max Bandwidth', bwFmt(s.total_max_bandwidth_kbps || 0), '#e67e22') +
                _faKpiCard('Kullanılmayan', (s.unused_shapers || []).length, (s.unused_shapers || []).length > 0 ? '#f39c12' : '#27ae60');

            // Shapers tablosu
            if (!res.shapers.length) { shrEl.innerHTML = '<em style="color:#95a5a6">Traffic shaper tanımlı değil.</em>'; }
            else {
                var h = '<table class="fa-table"><thead><tr><th>Ad</th><th>Priority</th><th>Guaranteed (Kbps)</th>' +
                    '<th>Max (Kbps)</th><th>DSCP</th><th>Diffserv</th><th>Code</th></tr></thead><tbody>';
                var prCls = { high: 'fa-badge-ok', medium: 'fa-badge-warn', low: 'fa-badge-muted' };
                res.shapers.forEach(function(s) {
                    h += '<tr><td><strong>' + faEscape(s.name) + '</strong></td>' +
                         '<td><span class="' + (prCls[s.priority] || 'fa-badge-muted') + '">' + faEscape(s.priority) + '</span></td>' +
                         '<td>' + (s.guaranteed_bandwidth || 0) + '</td>' +
                         '<td>' + (s.max_bandwidth || 0) + '</td>' +
                         '<td><code>' + faEscape(s.dscp_marking_method || '—') + '</code></td>' +
                         '<td>' + (s.diffserv === 'enable' ? '<span class="fa-badge-ok">enable</span>' : '<span class="fa-badge-muted">disable</span>') + '</td>' +
                         '<td><code>' + faEscape(s.diffservcode || '—') + '</code></td></tr>';
                });
                shrEl.innerHTML = h + '</tbody></table>';
            }

            // Per-IP shapers
            if (!res.per_ip_shapers.length) { pipEl.innerHTML = '<em style="color:#95a5a6">Per-IP shaper tanımlı değil.</em>'; }
            else {
                var ph = '<table class="fa-table"><thead><tr><th>Ad</th><th>Max Bandwidth (Kbps)</th><th>Guaranteed (Kbps)</th></tr></thead><tbody>';
                res.per_ip_shapers.forEach(function(p) {
                    ph += '<tr><td><strong>' + faEscape(p.name) + '</strong></td><td>' + (p.max_bandwidth || 0) + '</td><td>' + (p.guaranteed_bandwidth || 0) + '</td></tr>';
                });
                pipEl.innerHTML = ph + '</tbody></table>';
            }

            // Policies
            window._shapingPolAll = res.policies;
            _renderShapingPolicies(res.policies);
        }).catch(function(e) { shrEl.innerHTML = '<em style="color:#e74c3c">Bağlantı hatası: ' + faEscape(e.message) + '</em>'; });
    };

    function _renderShapingPolicies(policies) {
        var polEl = document.getElementById('fa-shaping-policies-table');
        if (!polEl) return;
        var active = policies.filter(function(p) { return p.status !== 'disable'; });
        if (!active.length) { polEl.innerHTML = '<em style="color:#95a5a6">Shaping policy tanımlı değil.</em>'; return; }
        var h = '<table class="fa-table fa-table-sm"><thead><tr><th>#</th><th>Ad</th><th>Kaynak</th><th>Hedef</th>' +
            '<th>Servis</th><th>Shaper (Out)</th><th>Shaper (In)</th><th>Per-IP</th></tr></thead><tbody>';
        active.forEach(function(p) {
            var hasSh = p.traffic_shaper || p.traffic_shaper_reverse || p.per_ip_shaper;
            h += '<tr' + (hasSh ? '' : ' style="opacity:.55"') + '>' +
                 '<td style="color:#7f8c8d">' + faEscape(p.id) + '</td>' +
                 '<td>' + faEscape(p.name || '—') + '</td>' +
                 '<td><code>' + faEscape(p.srcaddr || 'any') + '</code></td>' +
                 '<td><code>' + faEscape(p.dstaddr || 'any') + '</code></td>' +
                 '<td><code>' + faEscape(p.service || 'ANY') + '</code></td>' +
                 '<td>' + (p.traffic_shaper ? '<span class="fa-badge-ok">' + faEscape(p.traffic_shaper) + '</span>' : '<span class="fa-badge-muted">—</span>') + '</td>' +
                 '<td>' + (p.traffic_shaper_reverse ? '<span class="fa-badge-ok">' + faEscape(p.traffic_shaper_reverse) + '</span>' : '<span class="fa-badge-muted">—</span>') + '</td>' +
                 '<td>' + (p.per_ip_shaper ? '<span class="fa-badge-ok">' + faEscape(p.per_ip_shaper) + '</span>' : '<span class="fa-badge-muted">—</span>') + '</td></tr>';
        });
        polEl.innerHTML = h + '</tbody></table>';
    }

    window.fireAuditShapingSearch = function() {
        var q = (document.getElementById('fa-shaping-pol-search') || {}).value || '';
        if (!window._shapingPolAll) return;
        var filtered = q ? window._shapingPolAll.filter(function(p) {
            var str = [p.name, p.srcaddr, p.dstaddr, p.traffic_shaper, p.per_ip_shaper].join(' ').toLowerCase();
            return str.indexOf(q.toLowerCase()) >= 0;
        }) : window._shapingPolAll;
        _renderShapingPolicies(filtered);
    };

    // ═══════════════════════════════════════════════════════════════════
    // Faz 15 — Virtual Servers
    // ═══════════════════════════════════════════════════════════════════
    window.loadVirtualServers = function() {
        var kpiEl  = document.getElementById('fa-vs-kpi');
        var issEl  = document.getElementById('fa-vs-issues');
        var vsEl   = document.getElementById('fa-vs-table');
        var rsEl   = document.getElementById('fa-vs-real-table');
        var monEl  = document.getElementById('fa-vs-monitors-table');
        if (!kpiEl) return;
        [kpiEl, issEl, monEl].forEach(function(el) { if (el) el.innerHTML = ''; });
        if (rsEl) rsEl.innerHTML = '';
        vsEl.innerHTML = '<div style="padding:20px;color:#94a3b8;text-align:center"><i class="fas fa-spinner fa-spin"></i> Yükleniyor…</div>';

        faApi('virtual_servers').then(function(res) {
            if (!res.success) {
                vsEl.innerHTML = '<div class="fa-error-box"><i class="fas fa-exclamation-triangle"></i> ' + faEscape(res.error || '?') + '</div>';
                return;
            }
            var s = res.summary || {};

            kpiEl.style.display = '';
            kpiEl.innerHTML =
                _faKpiCard('Toplam VS',   s.total_vs,           '#3498db') +
                _faKpiCard('Aktif',       s.active_vs,          s.active_vs > 0 ? '#27ae60' : '#95a5a6') +
                _faKpiCard('Real Server', s.total_real_servers, '#6366f1') +
                _faKpiCard('Monitor',     s.total_monitors,     s.total_monitors > 0 ? '#27ae60' : '#e67e22') +
                _faKpiCard('Bulgu',       s.issue_count,        s.issue_count > 0 ? '#e74c3c' : '#27ae60');

            var badge = document.getElementById('fa-tab-badge-virtual-servers');
            if (badge) { badge.style.display = s.issue_count > 0 ? '' : 'none'; badge.textContent = s.issue_count; }

            issEl.innerHTML = _faIssueList(res.issues);

            if (!res.virtual_servers.length) {
                vsEl.innerHTML = '<div class="fa-empty-state"><i class="fas fa-server" style="margin-right:6px"></i>Virtual Server tanımlı değil.</div>';
                monEl.innerHTML = '';
                return;
            }

            var protoMap = { tcp:'fa-type-tcp', http:'fa-type-http', https:'fa-type-https', udp:'fa-type-udp', ssl:'fa-type-ssl' };
            var h = '<table class="fa-table"><thead><tr>' +
                '<th style="width:32px;padding:8px 6px"></th>' +
                '<th>Virtual Server</th><th>Ext IP</th><th>Ext Port</th><th>Protokol</th>' +
                '<th>LDB Metod</th><th>SSL Mode</th><th>Monitor</th>' +
                '<th style="text-align:center">RS</th><th>Durum</th>' +
                '</tr></thead><tbody>';

            res.virtual_servers.forEach(function(v, idx) {
                var proto = (v.protocol || 'tcp').toLowerCase();
                var pc = protoMap[proto] || 'fa-type-other';
                var rs = v.realservers || [];
                var sslMode = v.ssl_mode || 'disable';
                var hasSSLWarn = (sslMode === 'half' || sslMode === 'full') && !v.ssl_certificate;
                var sslBadge = (sslMode !== 'disable' && sslMode !== '—') ?
                    '<span class="fa-badge-ok">' + faEscape(sslMode) + '</span>' +
                    (hasSSLWarn ? ' <i class="fas fa-exclamation-circle" style="color:#d97706;font-size:.7rem" title="Sertifika tanımlı değil"></i>' : '') :
                    '<span class="fa-badge-muted">' + faEscape(sslMode) + '</span>';
                var monBadge = v.monitor ?
                    '<span class="fa-badge-ok"><i class="fas fa-check" style="font-size:.6rem;margin-right:3px"></i>' + faEscape(v.monitor) + '</span>' :
                    '<span class="fa-badge-muted">—</span>';
                var rsBadge = rs.length > 0 ?
                    '<span style="display:inline-block;background:#e0e7ff;color:#3730a3;padding:2px 8px;border-radius:10px;font-size:.72rem;font-weight:700">' + rs.length + '</span>' :
                    '<span style="color:#e74c3c;font-weight:700">0</span>';

                h += '<tr>' +
                    '<td style="text-align:center;padding:6px">' +
                    '<button class="fa-expand-btn" id="fa-vs-btn-' + idx + '" onclick="fireAuditVsToggle(event,' + idx + ')" title="Detayları göster">' +
                    '<i class="fas fa-chevron-right" style="font-size:.65rem;pointer-events:none"></i></button></td>' +
                    '<td><strong>' + faEscape(v.name) + '</strong></td>' +
                    '<td><code>' + faEscape(v.extip || '—') + '</code></td>' +
                    '<td><code>' + faEscape(v.extport || 'all') + '</code></td>' +
                    '<td><span class="fa-type-badge ' + pc + '">' + faEscape(proto) + '</span></td>' +
                    '<td><code>' + faEscape(v.ldb_method || 'static') + '</code></td>' +
                    '<td>' + sslBadge + '</td>' +
                    '<td>' + monBadge + '</td>' +
                    '<td style="text-align:center">' + rsBadge + '</td>' +
                    '<td>' + (v.status === 'enable' ? '<span class="fa-badge-ok">Aktif</span>' : '<span class="fa-badge-muted">Pasif</span>') + '</td>' +
                    '</tr>';

                // Detail row — real servers + SSL/config info
                var rsRows = rs.map(function(r, ri) {
                    return '<tr>' +
                        '<td style="color:#94a3b8;font-size:.75rem;text-align:center">' + (ri + 1) + '</td>' +
                        '<td><code>' + faEscape(r.ip || '—') + '</code></td>' +
                        '<td><code>' + faEscape(String(r.port || '—')) + '</code></td>' +
                        '<td>' + (r.weight || 1) + '</td>' +
                        '<td>' + (r.max_connections ? r.max_connections : '<span style="color:#94a3b8">∞</span>') + '</td>' +
                        '<td><code style="font-size:.78rem">' + faEscape(r.healthcheck || 'vip') + '</code></td>' +
                        '<td>' + (r.status === 'active' ? '<span class="fa-badge-ok">active</span>' : '<span class="fa-badge-muted">' + faEscape(r.status || '?') + '</span>') + '</td>' +
                        '</tr>';
                }).join('');

                h += '<tr class="fa-detail-row" id="fa-vs-detail-' + idx + '" style="display:none">' +
                    '<td colspan="10" class="fa-detail-cell">' +
                    '<div class="fa-detail-2col">' +
                    '<div class="fa-info-card">' +
                    '<div class="fa-info-card-title"><i class="fas fa-server"></i> VS Konfigürasyonu</div>' +
                    '<div class="fa-info-card-row"><span>Interface</span><code>' + faEscape(v.extintf || '—') + '</code></div>' +
                    '<div class="fa-info-card-row"><span>Persistence</span><code>' + faEscape(v.persistence || 'none') + '</code></div>' +
                    '<div class="fa-info-card-row"><span>Server Type</span><code>' + faEscape(v.server_type || 'ip') + '</code></div>' +
                    '<div class="fa-info-card-row"><span>LDB Method</span><code>' + faEscape(v.ldb_method || 'static') + '</code></div>' +
                    (v.comment ? '<div class="fa-info-card-row"><span>Açıklama</span><span style="color:#5d6d7e;font-style:italic">' + faEscape(v.comment) + '</span></div>' : '') +
                    '</div>' +
                    '<div class="fa-info-card">' +
                    '<div class="fa-info-card-title"><i class="fas fa-lock"></i> SSL / TLS</div>' +
                    '<div class="fa-info-card-row"><span>SSL Mode</span><code>' + faEscape(v.ssl_mode || '—') + '</code></div>' +
                    '<div class="fa-info-card-row"><span>Sertifika</span>' +
                    (v.ssl_certificate ?
                        '<span class="fa-badge-ok"><i class="fas fa-certificate" style="font-size:.6rem;margin-right:3px"></i>' + faEscape(v.ssl_certificate) + '</span>' :
                        '<span style="color:#94a3b8">—</span>') +
                    '</div>' +
                    '<div class="fa-info-card-row"><span>Min TLS</span><code>' + faEscape(v.ssl_min_version || '—') + '</code></div>' +
                    '<div class="fa-info-card-row"><span>Max TLS</span><code>' + faEscape(v.ssl_max_version || '—') + '</code></div>' +
                    '<div class="fa-info-card-row"><span>Algorithm</span><code>' + faEscape(v.ssl_algorithm || '—') + '</code></div>' +
                    '</div></div>' +
                    '<div class="fa-section-sep"><i class="fas fa-hdd"></i> Real Server Pool (' + rs.length + ')</div>' +
                    (rs.length ?
                        '<table class="fa-rs-mini"><thead><tr>' +
                        '<th style="width:32px;text-align:center">#</th><th>IP</th><th>Port</th><th>Weight</th><th>Max Conn</th><th>Health Check</th><th>Durum</th>' +
                        '</tr></thead><tbody>' + rsRows + '</tbody></table>' :
                        '<div class="fa-empty-state">Real server tanımlı değil.</div>') +
                    '</td></tr>';
            });

            vsEl.innerHTML = h + '</tbody></table>';
            if (rsEl) rsEl.innerHTML = '';

            // Monitors — info kartları
            if (!res.monitors.length) {
                monEl.innerHTML = '<div class="fa-empty-state"><i class="fas fa-heartbeat" style="margin-right:5px"></i>Health monitor tanımlı değil.</div>';
            } else {
                var mh = '<div style="display:flex;gap:10px;flex-wrap:wrap;">';
                res.monitors.forEach(function(m) {
                    mh += '<div class="fa-info-card" style="min-width:170px;max-width:220px">' +
                        '<div class="fa-info-card-title"><i class="fas fa-heartbeat"></i> ' + faEscape(m.name) + '</div>' +
                        '<div class="fa-info-card-row"><span>Tip</span><span class="fa-badge-ok">' + faEscape(m.type) + '</span></div>' +
                        '<div class="fa-info-card-row"><span>Interval</span><span>' + (m.interval || 10) + 's</span></div>' +
                        '<div class="fa-info-card-row"><span>Timeout</span><span>' + (m.timeout || 2) + 's</span></div>' +
                        '<div class="fa-info-card-row"><span>Retry</span><span>' + (m.retry || 3) + '</span></div>' +
                        '</div>';
                });
                monEl.innerHTML = mh + '</div>';
            }
        }).catch(function(e) {
            vsEl.innerHTML = '<div class="fa-error-box"><i class="fas fa-exclamation-triangle" style="margin-right:6px"></i>Bağlantı hatası: ' + faEscape(e.message) + '</div>';
        });
    };

    window.fireAuditVsToggle = function(e, idx) {
        e.stopPropagation();
        var btn = document.getElementById('fa-vs-btn-' + idx);
        var det = document.getElementById('fa-vs-detail-' + idx);
        if (!det) return;
        var open = det.style.display !== 'none';
        det.style.display = open ? 'none' : '';
        if (btn) {
            btn.classList.toggle('fa-open', !open);
            var ic = btn.querySelector('i');
            if (ic) { ic.className = (open ? 'fas fa-chevron-right' : 'fas fa-chevron-down') + ' style-ptr'; ic.style.fontSize = '.65rem'; ic.style.pointerEvents = 'none'; }
        }
    };

    // ═══════════════════════════════════════════════════════════════════
    // Faz 16 — DNAT & Virtual IP
    // ═══════════════════════════════════════════════════════════════════
    var _vipAll = [];

    window.loadVipDnat = function() {
        var kpiEl   = document.getElementById('fa-vip-kpi');
        var issEl   = document.getElementById('fa-vip-issues');
        var tableEl = document.getElementById('fa-vip-table');
        var grpEl   = document.getElementById('fa-vip-groups-table');
        if (!kpiEl) return;
        [kpiEl, issEl, grpEl].forEach(function(el) { if (el) el.innerHTML = ''; });
        tableEl.innerHTML = '<div style="padding:20px;color:#94a3b8;text-align:center"><i class="fas fa-spinner fa-spin"></i> Yükleniyor…</div>';

        faApi('vip_dnat').then(function(res) {
            if (!res.success) { tableEl.innerHTML = '<div class="fa-error-box"><i class="fas fa-exclamation-triangle"></i> ' + faEscape(res.error || '?') + '</div>'; return; }
            var s = res.summary || {};
            _vipAll = res.vips || [];

            kpiEl.style.display = '';
            kpiEl.innerHTML =
                _faKpiCard('Toplam VIP',   s.total_vips,                        '#3498db') +
                _faKpiCard('Aktif VIP',    s.active_vips,                       '#27ae60') +
                _faKpiCard('Port Forward', s.portforward_count,                 '#6366f1') +
                _faKpiCard('VIP Grubu',    s.vip_groups_count,                  '#0891b2') +
                _faKpiCard('HIGH Bulgu',   (s.issue_counts || {}).HIGH || 0,    ((s.issue_counts || {}).HIGH || 0) > 0 ? '#e74c3c' : '#27ae60');

            var badge = document.getElementById('fa-tab-badge-vip-dnat');
            if (badge) {
                var cnt = ((s.issue_counts || {}).HIGH || 0) + ((s.issue_counts || {}).MEDIUM || 0);
                badge.style.display = cnt > 0 ? '' : 'none';
                badge.textContent = cnt;
                badge.style.background = ((s.issue_counts || {}).HIGH || 0) > 0 ? '#e74c3c' : '#f39c12';
            }

            issEl.innerHTML = '';
            _renderVipTable(_vipAll);

            if (!res.vip_groups || !res.vip_groups.length) {
                grpEl.innerHTML = '<div class="fa-empty-state"><i class="fas fa-layer-group" style="margin-right:5px"></i>VIP grubu tanımlı değil.</div>';
            } else {
                var gh = '<table class="fa-table fa-table-sm"><thead><tr><th>Grup Adı</th><th>Interface</th><th>Üye VIP\'ler</th></tr></thead><tbody>';
                res.vip_groups.forEach(function(g) {
                    gh += '<tr>' +
                        '<td><strong>' + faEscape(g.name) + '</strong></td>' +
                        '<td><code>' + faEscape(g.interface || 'any') + '</code></td>' +
                        '<td>' + (g.member || []).map(function(m) { return '<code style="margin-right:4px">' + faEscape(m) + '</code>'; }).join('') + '</td>' +
                        '</tr>';
                });
                grpEl.innerHTML = gh + '</tbody></table>';
            }
        }).catch(function(e) { tableEl.innerHTML = '<div class="fa-error-box"><i class="fas fa-exclamation-triangle"></i> Bağlantı hatası: ' + faEscape(e.message) + '</div>'; });
    };

    function _renderVipTable(vips) {
        var tableEl = document.getElementById('fa-vip-table');
        if (!tableEl) return;
        if (!vips.length) { tableEl.innerHTML = '<div class="fa-empty-state"><i class="fas fa-exchange-alt" style="margin-right:6px"></i>Sonuç yok.</div>'; return; }

        var SENS = { '22':'SSH', '23':'Telnet', '3389':'RDP', '5900':'VNC', '1433':'MSSQL', '3306':'MySQL', '5432':'PG', '445':'SMB', '111':'RPC' };
        var typeMap = { 'static-nat':'fa-vt-static-nat', 'load-balance':'fa-vt-load-balance', 'server-load-balance':'fa-vt-server-lb', 'fqdn':'fa-vt-fqdn' };

        var h = '<table class="fa-table"><thead><tr>' +
            '<th style="width:32px;padding:8px 6px"></th>' +
            '<th>VIP Adı</th><th>Tip</th><th>Ext IP</th><th>Ext Port</th>' +
            '<th>Kaynak Kısıtı</th><th>Interface</th><th>Mapped IP → Port</th><th>Port FW</th><th>Durum</th>' +
            '</tr></thead><tbody>';

        vips.forEach(function(v, idx) {
            var tc = typeMap[v.type] || 'fa-vt-other';
            var ep = String(v.extport || '');
            var isAll = !ep || ep === '0' || ep === '0-65535' || ep === '1-65535';
            var sens = SENS[ep];
            var portCell = isAll ?
                '<span class="fa-port-any" title="Tüm portlar">Tüm portlar</span>' :
                (sens ? '<span class="fa-port-sens" title="Hassas port">' + faEscape(ep) + ' <small>(' + sens + ')</small></span>' :
                 '<code>' + faEscape(ep) + '</code>');

            var srcF = v.src_filter || [];
            var srcCell = srcF.length > 0 ?
                '<span class="fa-src-limit" title="' + faEscape(srcF.join(', ')) + '"><i class="fas fa-lock" style="font-size:.58rem;margin-right:3px"></i>' + srcF.length + ' filtre</span>' :
                '<span class="fa-src-open">Tümü</span>';

            var intfCell = (v.extintf === 'any' || v.extintf === '') ?
                '<span class="fa-intf-any">any</span>' :
                '<code>' + faEscape(v.extintf) + '</code>';

            var mappedCell = v.mappedip ?
                '<code>' + faEscape(v.mappedip) + '</code>' +
                (v.mappedport ? '<span style="color:#94a3b8;margin:0 2px">→</span><code>' + faEscape(v.mappedport) + '</code>' : '') :
                '<span style="color:#94a3b8">—</span>';

            // İssue indicator — sadece varsa göster
            var rowIssues = v.issues || [];
            var topSev = rowIssues.length ? rowIssues[0].severity : null;
            var issueDot = topSev === 'HIGH' ?
                ' <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#e74c3c;vertical-align:middle;margin-left:4px" title="Güvenlik bulgusu var"></span>' :
                (topSev === 'MEDIUM' ?
                ' <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#f39c12;vertical-align:middle;margin-left:4px" title="Güvenlik bulgusu var"></span>' : '');

            h += '<tr>' +
                '<td style="text-align:center;padding:6px">' +
                '<button class="fa-expand-btn" id="fa-vip-btn-' + idx + '" onclick="fireAuditVipToggle(event,' + idx + ')" title="Detayları göster">' +
                '<i class="fas fa-chevron-right" style="font-size:.65rem;pointer-events:none"></i></button></td>' +
                '<td><strong>' + faEscape(v.name) + '</strong>' + issueDot +
                (v.comment ? '<br><small style="color:#94a3b8;font-weight:400">' + faEscape(v.comment.substring(0, 40)) + (v.comment.length > 40 ? '…' : '') + '</small>' : '') +
                '</td>' +
                '<td><span class="fa-type-badge ' + tc + '">' + faEscape(v.type || '—') + '</span></td>' +
                '<td><code>' + faEscape(v.extip || '—') + '</code></td>' +
                '<td>' + portCell + '</td>' +
                '<td>' + srcCell + '</td>' +
                '<td>' + intfCell + '</td>' +
                '<td>' + mappedCell + '</td>' +
                '<td>' + (v.portforward === 'enable' ? '<span class="fa-badge-ok">enable</span>' : '<span class="fa-badge-muted">disable</span>') + '</td>' +
                '<td>' + (v.status === 'enable' ? '<span class="fa-badge-ok">Aktif</span>' : '<span class="fa-badge-muted">Pasif</span>') + '</td>' +
                '</tr>';

            // Bulgular HTML (detay içinde)
            var issuesHtml = '';
            if (rowIssues.length) {
                var sevCls = { HIGH: 'fa-badge-high', MEDIUM: 'fa-badge-medium', LOW: 'fa-badge-low', INFO: 'fa-badge-info', CRITICAL: 'fa-badge-critical' };
                issuesHtml = '<div class="fa-section-sep"><i class="fas fa-exclamation-circle"></i> Güvenlik Bulguları (' + rowIssues.length + ')</div>';
                rowIssues.forEach(function(iss) {
                    issuesHtml += '<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:6px;font-size:.83rem;">' +
                        '<span class="fa-badge ' + (sevCls[iss.severity] || 'fa-badge-low') + '" style="flex-shrink:0;margin-top:1px">' + faEscape(iss.severity) + '</span>' +
                        '<div><div>' + faEscape(iss.message) + '</div>' +
                        (iss.recommendation ? '<div style="color:#64748b;margin-top:2px"><i class="fas fa-arrow-right" style="font-size:.65rem;margin-right:3px"></i>' + faEscape(iss.recommendation) + '</div>' : '') +
                        '</div></div>';
                });
            }

            var svcList = v.services && v.services.length ?
                v.services.map(function(s) { return '<code style="margin-right:3px">' + faEscape(s) + '</code>'; }).join('') :
                '<span style="color:#94a3b8">Servis kısıtı yok</span>';

            h += '<tr class="fa-detail-row" id="fa-vip-detail-' + idx + '" style="display:none">' +
                '<td colspan="10" class="fa-detail-cell">' +
                issuesHtml +
                '<div class="fa-detail-2col">' +
                '<div class="fa-info-card">' +
                '<div class="fa-info-card-title"><i class="fas fa-exchange-alt"></i> NAT / Yönlendirme</div>' +
                '<div class="fa-info-card-row"><span>Mapped IP</span><code>' + faEscape(v.mappedip || '—') + '</code></div>' +
                '<div class="fa-info-card-row"><span>Mapped Port</span><code>' + faEscape(v.mappedport || '—') + '</code></div>' +
                '<div class="fa-info-card-row"><span>Protocol</span><code>' + faEscape(v.protocol || 'tcp') + '</code></div>' +
                '<div class="fa-info-card-row"><span>ARP Reply</span><span class="' + (v.arp_reply === 'enable' ? 'fa-badge-ok' : 'fa-badge-muted') + '">' + faEscape(v.arp_reply || '—') + '</span></div>' +
                '<div class="fa-info-card-row"><span>NAT44</span><span class="' + (v.nat44 === 'enable' ? 'fa-badge-ok' : 'fa-badge-muted') + '">' + faEscape(v.nat44 || '—') + '</span></div>' +
                '<div class="fa-info-card-row"><span>NAT46</span><span class="' + (v.nat46 === 'enable' ? 'fa-badge-warn' : 'fa-badge-muted') + '">' + faEscape(v.nat46 || '—') + '</span></div>' +
                '</div>' +
                '<div class="fa-info-card">' +
                '<div class="fa-info-card-title"><i class="fas fa-shield-alt"></i> Erişim Kontrolü</div>' +
                '<div class="fa-info-card-row"><span>Ext Interface</span>' + intfCell + '</div>' +
                '<div class="fa-info-card-row"><span>Kaynak Filtreler</span>' +
                (srcF.length ?
                    srcF.map(function(f) { return '<code style="margin-right:4px">' + faEscape(f) + '</code>'; }).join('') :
                    '<span style="color:#94a3b8">Tanımlı değil</span>') + '</div>' +
                '<div class="fa-info-card-row"><span>Servis Kısıtı</span>' + svcList + '</div>' +
                '<div class="fa-info-card-row"><span>SSL Sertifika</span><code>' + faEscape(v.ssl_certificate || '—') + '</code></div>' +
                (v.comment ? '<div class="fa-info-card-row"><span>Açıklama</span><span style="color:#5d6d7e;font-style:italic">' + faEscape(v.comment) + '</span></div>' : '') +
                '</div>' +
                '</div>' +
                '</td></tr>';
        });

        tableEl.innerHTML = h + '</tbody></table>';
    }

    window.fireAuditVipToggle = function(e, idx) {
        e.stopPropagation();
        var btn = document.getElementById('fa-vip-btn-' + idx);
        var det = document.getElementById('fa-vip-detail-' + idx);
        if (!det) return;
        var open = det.style.display !== 'none';
        det.style.display = open ? 'none' : '';
        if (btn) {
            btn.classList.toggle('fa-open', !open);
            var ic = btn.querySelector('i');
            if (ic) { ic.className = open ? 'fas fa-chevron-right' : 'fas fa-chevron-down'; ic.style.fontSize = '.65rem'; ic.style.pointerEvents = 'none'; }
        }
    };

    window.fireAuditVipSearch = function() {
        var q    = (document.getElementById('fa-vip-search') || {}).value || '';
        var type = (document.getElementById('fa-vip-type-filter') || {}).value || '';
        var filtered = _vipAll.filter(function(v) {
            if (type && v.type !== type) return false;
            if (!q) return true;
            return [v.name, v.extip, v.mappedip, v.extport, v.comment].join(' ').toLowerCase().indexOf(q.toLowerCase()) >= 0;
        });
        _renderVipTable(filtered);
    };

    // ── Ortak yardımcı render fonksiyonları ──────────────────────────────────
    function _faKpiCard(label, value, color) {
        return '<div class="fa-kpi-card" style="border-left:4px solid ' + (color || '#3498db') + '">' +
               '<div class="fa-kpi-val" style="color:' + (color || '#3498db') + '">' + faEscape(String(value)) + '</div>' +
               '<div class="fa-kpi-lbl">' + faEscape(label) + '</div></div>';
    }

    function _faIssueList(issues) {
        if (!issues || !issues.length) return '<div class="fa-issue-empty"><i class="fas fa-check-circle"></i> Güvenlik bulgusu yok.</div>';
        var sevColors = { CRITICAL: { bg: '#fdf2f2', border: '#e74c3c', icon: 'fa-skull-crossbones', color: '#c0392b' },
                          HIGH:     { bg: '#fef6ee', border: '#f39c12', icon: 'fa-exclamation-triangle', color: '#e67e22' },
                          MEDIUM:   { bg: '#fefde7', border: '#f1c40f', icon: 'fa-exclamation-circle', color: '#b7950b' },
                          LOW:      { bg: '#eafaf1', border: '#27ae60', icon: 'fa-info-circle', color: '#1e8449' },
                          INFO:     { bg: '#eaf4fb', border: '#3498db', icon: 'fa-info-circle', color: '#2874a6' } };
        return issues.map(function(iss) {
            var c = sevColors[iss.severity] || sevColors.INFO;
            return '<div style="background:' + c.bg + ';border-left:4px solid ' + c.border + ';border-radius:5px;padding:10px 14px;margin-bottom:8px;">' +
                   '<div style="display:flex;align-items:flex-start;gap:8px;">' +
                   '<i class="fas ' + c.icon + '" style="color:' + c.color + ';margin-top:2px;flex-shrink:0;"></i>' +
                   '<div><span style="background:' + c.border + ';color:#fff;padding:1px 7px;border-radius:8px;font-size:.7rem;font-weight:700;margin-right:6px;">' + faEscape(iss.severity) + '</span>' +
                   '<strong>' + faEscape(iss.message || '') + '</strong>' +
                   (iss.recommendation ? '<div style="margin-top:4px;font-size:.83rem;color:#5d6d7e"><i class="fas fa-arrow-right" style="font-size:.7rem;margin-right:4px;"></i>' + faEscape(iss.recommendation) + '</div>' : '') +
                   '</div></div></div>';
        }).join('');
    }

    // ── Faz 1 — Sistem Ayarları ──────────────────────────────────────────────
    window.loadSystemSettings = function() {
        var fw = (typeof FW_SLUG !== 'undefined' ? FW_SLUG : '');
        var kpi  = document.getElementById('fa-sysset-kpi');
        var ports = document.getElementById('fa-sysset-ports');
        var iss  = document.getElementById('fa-sysset-issues');
        if (!kpi || !ports || !iss) return;
        kpi.style.display = 'none';
        kpi.innerHTML = '';
        ports.innerHTML = '<div class="fa-loading"><i class="fas fa-spinner fa-spin"></i> Sistem ayarları yükleniyor…</div>';
        iss.innerHTML = '';

        fetch(API_BASE + '?action=system_settings&fw_slug=' + encodeURIComponent(fw), { credentials: 'same-origin' })
            .then(function(r) { return r.json(); })
            .then(function(d) {
                if (!d.success) {
                    ports.innerHTML = '<div class="fa-error-box"><i class="fas fa-exclamation-triangle"></i> ' + faEscape(d.error || 'Veri alınamadı') + '</div>';
                    return;
                }

                var score = d.score || 0;
                var scoreColor = score >= 80 ? '#27ae60' : score >= 60 ? '#f39c12' : '#e74c3c';
                var sevC = d.severity_counts || {};
                kpi.innerHTML =
                    _faKpiCard('Güvenlik Skoru', score + ' / 100', scoreColor) +
                    _faKpiCard('CRITICAL', sevC.CRITICAL || 0, '#e74c3c') +
                    _faKpiCard('HIGH', sevC.HIGH || 0, '#f39c12') +
                    _faKpiCard('MEDIUM', sevC.MEDIUM || 0, '#f1c40f') +
                    _faKpiCard('LOW/INFO', (sevC.LOW || 0) + (sevC.INFO || 0), '#3498db');
                kpi.style.display = 'flex';

                // Port özet tablosu
                var portOk  = '#27ae60';
                var portWarn = '#e74c3c';
                function _portBadge(label, val, isDefault) {
                    var bg = isDefault ? '#fdf2f2' : '#eafaf1';
                    var border = isDefault ? '#e74c3c' : '#27ae60';
                    var badge = isDefault
                        ? '<span style="background:#e74c3c;color:#fff;padding:2px 8px;border-radius:8px;font-size:.7rem;font-weight:700;margin-left:6px;">VARSAYILAN</span>'
                        : '<span style="background:#27ae60;color:#fff;padding:2px 8px;border-radius:8px;font-size:.7rem;font-weight:700;margin-left:6px;">ÖZEL PORT</span>';
                    return '<div style="background:' + bg + ';border:1px solid ' + border + ';border-radius:7px;padding:10px 16px;flex:1;min-width:150px;">' +
                           '<div style="font-size:.7rem;font-weight:700;text-transform:uppercase;color:#7f8c8d;margin-bottom:4px;">' + label + '</div>' +
                           '<div style="font-size:1.35rem;font-weight:700;color:' + border + ';">' + faEscape(String(val)) + badge + '</div>' +
                           '</div>';
                }
                var telnetHtml = '';
                if (d.telnet_port) {
                    telnetHtml = '<div style="background:#fdf2f2;border:1px solid #e74c3c;border-radius:7px;padding:10px 16px;flex:1;min-width:150px;">' +
                                 '<div style="font-size:.7rem;font-weight:700;text-transform:uppercase;color:#7f8c8d;margin-bottom:4px;">Telnet Portu</div>' +
                                 '<div style="font-size:1.35rem;font-weight:700;color:#e74c3c;">' + faEscape(String(d.telnet_port)) +
                                 '<span style="background:#e74c3c;color:#fff;padding:2px 8px;border-radius:8px;font-size:.7rem;font-weight:700;margin-left:6px;">AKTİF — KRİTİK</span></div>' +
                                 '</div>';
                }
                var cryptoBadge = (d.strong_crypto || '').toLowerCase() === 'enable'
                    ? '<span style="background:#27ae60;color:#fff;padding:2px 8px;border-radius:8px;font-size:.7rem;font-weight:700;">AKTİF</span>'
                    : '<span style="background:#e74c3c;color:#fff;padding:2px 8px;border-radius:8px;font-size:.7rem;font-weight:700;">DEVRE DIŞI</span>';
                var tlsColors = {'TLSv1-3': '#27ae60', 'TLSv1-2': '#27ae60', 'TLSv1-1': '#e67e22', 'TLSv1': '#e74c3c', 'SSLv3': '#c0392b'};
                var tlsColor = tlsColors[d.ssl_min_proto] || '#7f8c8d';

                ports.innerHTML =
                    '<div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:14px;">' +
                    _portBadge('HTTP Admin', d.admin_port, d.admin_port == 80) +
                    _portBadge('HTTPS Admin', d.admin_sport, d.admin_sport == 443) +
                    _portBadge('SSH', d.ssh_port, d.ssh_port == 22) +
                    telnetHtml +
                    '</div>' +
                    '<div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:16px;">' +
                    '<div style="background:var(--card-bg);border:1px solid var(--border-color);border-radius:7px;padding:10px 16px;flex:1;min-width:150px;">' +
                      '<div style="font-size:.7rem;font-weight:700;text-transform:uppercase;color:#7f8c8d;margin-bottom:4px;">Strong Crypto</div>' +
                      '<div style="font-size:1.1rem;font-weight:700;">' + cryptoBadge + '</div>' +
                    '</div>' +
                    '<div style="background:var(--card-bg);border:1px solid var(--border-color);border-radius:7px;padding:10px 16px;flex:1;min-width:150px;">' +
                      '<div style="font-size:.7rem;font-weight:700;text-transform:uppercase;color:#7f8c8d;margin-bottom:4px;">SSL/TLS Min</div>' +
                      '<div style="font-size:1.1rem;font-weight:700;color:' + tlsColor + ';">' + faEscape(d.ssl_min_proto || '-') + '</div>' +
                    '</div>' +
                    '<div style="background:var(--card-bg);border:1px solid var(--border-color);border-radius:7px;padding:10px 16px;flex:1;min-width:150px;">' +
                      '<div style="font-size:.7rem;font-weight:700;text-transform:uppercase;color:#7f8c8d;margin-bottom:4px;">Oturum Timeout</div>' +
                      '<div style="font-size:1.1rem;font-weight:700;">' + faEscape(String(d.admintimeout)) + ' dk</div>' +
                    '</div>' +
                    '<div style="background:var(--card-bg);border:1px solid var(--border-color);border-radius:7px;padding:10px 16px;flex:1;min-width:150px;">' +
                      '<div style="font-size:.7rem;font-weight:700;text-transform:uppercase;color:#7f8c8d;margin-bottom:4px;">Lockout Eşik / Süre</div>' +
                      '<div style="font-size:1.1rem;font-weight:700;">' + faEscape(String(d.lockout_threshold)) + ' deneme / ' + faEscape(String(d.lockout_duration)) + 's</div>' +
                    '</div>' +
                    '</div>';

                iss.innerHTML = '<div style="font-size:.78rem;font-weight:700;text-transform:uppercase;color:#7f8c8d;margin-bottom:8px;letter-spacing:.5px;">' +
                                '<i class="fas fa-exclamation-circle"></i> Güvenlik Bulguları</div>' +
                                _faIssueList(d.issues);
            })
            .catch(function(e) {
                ports.innerHTML = '<div class="fa-error-box"><i class="fas fa-times-circle"></i> Bağlantı hatası: ' + faEscape(e.message) + '</div>';
            });
    };

    window.faShowToast = faShowToast;

})();
