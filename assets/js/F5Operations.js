(function() {
    var F5 = {
        env: 'test',
        nodes: [],
        pools: {},
        members: [],
        currentPool: '',
        drainTimers: {},
        drainTargets: [],
        drainPool: '',
    };

    window.f5SetEnv = function(env, btn) {
    if (env !== 'test' && env !== F5.env) {
        if (!confirm(env.toUpperCase() + ' ortamina geciyorsunuz. Bu ortamda yapilan islemler gercek sunuculari etkiler. Emin misiniz?')) return;
    }

    F5.env = env;
    document.querySelectorAll('#f5-operations-page .f5-env-btn').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    f5LoadNodes();
    f5LoadPools();

    var page = document.getElementById('f5-operations-page');
    page.classList.remove('f5-env-test', 'f5-env-prod', 'f5-env-drc');
    page.classList.add('f5-env-' + env);
    };


    function api(params, cb) {
        params.env = F5.env;
        var qs = Object.keys(params).map(function(k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); }).join('&');
        fetch('f5-api.php?' + qs)
            .then(function(r) { return r.json(); })
            .then(cb)
            .catch(function() { cb({success: false, error: 'Baglanti hatasi'}); });
    }

    function apiPost(data, cb) {
        data.env = F5.env;
        fetch('f5-api.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: Object.keys(data).map(function(k) { return encodeURIComponent(k) + '=' + encodeURIComponent(data[k]); }).join('&')
        })
        .then(function(r) { return r.json(); })
        .then(cb)
        .catch(function() { cb({success: false, error: 'Baglanti hatasi'}); });
    }

    function renderF5Diagnosis(d) {
        var icon = function(ok) { return ok ? '<i class="fas fa-check-circle" style="color:#22c55e"></i>' : '<i class="fas fa-times-circle" style="color:#ef4444"></i>'; };
        var html = '<div style="margin-top:16px;padding:16px;background:var(--card-bg,#fff);border:1px solid #e2e8f0;border-radius:10px;max-width:520px;margin-left:auto;margin-right:auto;text-align:left;">';
        html += '<div style="font-weight:700;font-size:0.95rem;margin-bottom:12px;"><i class="fas fa-stethoscope" style="color:#3b82f6;margin-right:6px;"></i>F5 ' + (d.env || '') + ' Diagnostik</div>';
        html += '<table style="width:100%;font-size:0.88rem;border-collapse:collapse;">';
        html += '<tr><td style="padding:5px 8px;">' + icon(d.reachable) + ' Ag Erisimi</td><td style="padding:5px 0;">' + (d.reachable ? 'Basarili' : 'Erisilemedi') + '</td></tr>';
        html += '<tr><td style="padding:5px 8px;">' + icon(d.ssl_ok) + ' SSL/TLS</td><td style="padding:5px 0;">' + (d.ssl_ok ? 'Basarili' : 'Hata') + '</td></tr>';
        html += '<tr><td style="padding:5px 8px;">' + icon(d.auth_ok) + ' Kimlik Dogrulama</td><td style="padding:5px 0;">' + (d.auth_ok ? 'Basarili' : 'Basarisiz (HTTP ' + d.http_code + ')') + '</td></tr>';
        if (d.password_expired) html += '<tr><td style="padding:5px 8px;"><i class="fas fa-exclamation-triangle" style="color:#f59e0b"></i> Sifre</td><td style="padding:5px 0;color:#ef4444;font-weight:600;">EXPIRED</td></tr>';
        if (d.account_locked) html += '<tr><td style="padding:5px 8px;"><i class="fas fa-lock" style="color:#ef4444"></i> Hesap</td><td style="padding:5px 0;color:#ef4444;font-weight:600;">KILITLI</td></tr>';
        html += '</table>';
        if (d.error_detail) html += '<div style="margin-top:10px;padding:8px 10px;background:rgba(239,68,68,0.08);border-radius:6px;font-size:0.84rem;color:#dc2626;"><i class="fas fa-info-circle" style="margin-right:4px;"></i>' + d.error_detail + '</div>';
        if (d.suggestion) html += '<div style="margin-top:6px;padding:8px 10px;background:rgba(59,130,246,0.08);border-radius:6px;font-size:0.84rem;color:#2563eb;"><i class="fas fa-lightbulb" style="margin-right:4px;"></i>' + d.suggestion + '</div>';
        html += '</div>';
        return html;
    }

    function showMsg(text, type) {
        var el = document.getElementById('f5-msg-global');
        el.textContent = text;
        el.className = 'f5-msg ' + type;
        el.style.display = 'block';
        setTimeout(function() { el.style.display = 'none'; }, 4000);
    }

    function badge(session, state) {
        var s = (session || '').indexOf('disabled') >= 0 ? 'disabled' : 'enabled';
        var t = (state || '').indexOf('down') >= 0 ? 'down' : 'up';
        return '<span class="f5-badge ' + s + '">' + (session||'-') + '</span> <span class="f5-badge ' + t + '">' + (state||'-') + '</span>';
    }

    window.f5LoadNodes = function() {
        document.getElementById('f5-node-list').innerHTML = '<div class="f5-loading"><i class="fas fa-spinner fa-spin"></i> Yukleniyor...</div>';
        api({action: 'get_nodes'}, function(res) {
            if (!res.success) {
                var html = '<div class="f5-loading" style="color:#e74c3c">Hata: ' + (res.error || 'Bilinmeyen hata') + '</div>';
                if (res.diagnosis) html += renderF5Diagnosis(res.diagnosis);
                document.getElementById('f5-node-list').innerHTML = html;
                return;
            }
            F5.nodes = res.nodes;
            f5RenderNodes();
        });
    };

    window.f5RenderNodes = function() {
    var q = (document.getElementById('f5-node-search').value || '').toLowerCase();
    var filtered = F5.nodes.filter(function(n) {
    return n.name.toLowerCase().indexOf(q) >= 0 ||
           (n.address||'').toLowerCase().indexOf(q) >= 0 ||
           (n.description||'').toLowerCase().indexOf(q) >= 0;
});
    if (!filtered.length) { document.getElementById('f5-node-list').innerHTML = '<div class="f5-loading">Sonuc bulunamadi.</div>'; return; }

    var subnetGroups = {
    'Web':      function(ip) { return ip.startsWith('10.64.1.') || ip.startsWith('10.64.2.') || ip.startsWith('10.64.3.') || ip.startsWith('10.64.4.') || ip.startsWith('10.64.5.') || ip.startsWith('10.64.6.'); },
    'Core':     function(ip) { return ip.startsWith('10.64.7.') || ip.startsWith('10.64.8.') || ip.startsWith('10.64.9.') || ip.startsWith('10.64.10.') || ip.startsWith('10.64.11.') || ip.startsWith('10.64.12.'); },
    'Kimlik':    function(ip) { return ip.startsWith('10.64.13.') || ip.startsWith('10.64.14.') || ip.startsWith('10.64.15.'); },
    'Backend':  function(ip) { return ip.startsWith('10.64.16.') || ip.startsWith('10.64.17.') || ip.startsWith('10.64.18.') || ip.startsWith('10.64.19.') || ip.startsWith('10.64.20.'); },
    'Portal': function(ip) { return ip.startsWith('10.64.21.') || ip.startsWith('10.64.22.') || ip.startsWith('10.64.23.'); },
    'Konteyner-A':function(ip) { return ip.startsWith('10.64.24.')  || ip.startsWith('10.64.25.') || ip.startsWith('10.64.26.'); },
    'Konteyner-B':function(ip) { return ip.startsWith('10.64.27.') || ip.startsWith('10.64.28.'); },
    'Depolama': function(ip) { return ip.startsWith('10.64.29.') || ip.startsWith('10.64.30.') || ip.startsWith('10.64.31.') || ip.startsWith('10.64.32.'); },
    'OpenShift': function(ip) { return ip.startsWith('10.64.33.'); },
    'Örnek Müşteri A': function(ip) { return ip.startsWith('10.128.34.') || ip.startsWith('10.64.35.') || ip.startsWith('10.64.36.') || ip.startsWith('10.64.37.') || ip.startsWith('10.64.38.'); },
    'Internal Tools': function(ip) { return ip.startsWith('10.64.39.') || ip.startsWith('10.64.40.') || ip.startsWith('10.64.41.'); },
    'Windows/ESXi/ARGE': function(ip) { return ip.startsWith('10.64.42.') || ip.startsWith('10.64.43.') || ip.startsWith('10.64.44.'); },
    'Monitoring/Admin': function(ip) { return ip.startsWith('10.64.45.') || ip.startsWith('10.64.46.') || ip.startsWith('10.64.47.'); },
    'Diger':    function(ip) { return true; },
};

    var grouped = {};
    Object.keys(subnetGroups).forEach(function(g) { grouped[g] = []; });

    filtered.forEach(function(n) {
        var assigned = false;
        var keys = Object.keys(subnetGroups);
        for (var i = 0; i < keys.length - 1; i++) {
            if (subnetGroups[keys[i]](n.address || n.name)) {
                grouped[keys[i]].push(n);
                assigned = true;
                break;
            }
        }
        if (!assigned) grouped['Diger'].push(n);
    });

    var html = '';
    Object.keys(grouped).forEach(function(group) {
        if (!grouped[group].length) return;
        html += '<div class="f5-subnet-group-label">' + group + ' <span>(' + grouped[group].length + ')</span></div>';
        html += '<table class="f5-table" style="margin-bottom:8px"><tbody>';
        grouped[group].forEach(function(n) {
            html += '<tr><td style="width:32px"><input type="checkbox" class="f5-node-cb" value="' + n.name + '" onchange="f5UpdateNodeCount()"></td><td>' + n.name + '</td><td>' + (n.address||'-') + '</td><td>' + (n.description||'-') + '</td><td>' + badge(n.session,'') + '</td><td>' + badge('',n.state) + '</td></tr>';
        });
        html += '</tbody></table>';
    });

    document.getElementById('f5-node-list').innerHTML = html;
    f5UpdateNodeCount();
}

    window.f5FilterNodes = function() { f5RenderNodes(); };

    window.f5UpdateNodeCount = function() {
        var count = document.querySelectorAll('.f5-node-cb:checked').length;
        document.getElementById('f5-node-sel-count').textContent = count ? count + ' node secili' : '';
    };

    window.f5NodeAction = function(action) {
        var selected = Array.from(document.querySelectorAll('.f5-node-cb:checked')).map(function(cb) { return cb.value; });
        if (!selected.length) { showMsg('En az bir node secin.', 'error'); return; }
        if (!confirm(selected.length + ' node icin ' + action.toUpperCase() + ' yapilacak. Onayliyor musunuz?')) return;
        var done = 0, errors = [];
        selected.forEach(function(node) {
            apiPost({action: 'node_action', node: node, node_action: action}, function(res) {
                done++;
                if (!res.success) errors.push(node + ': ' + (res.error || 'hata'));
                if (done === selected.length) {
                    if (errors.length) showMsg('Hata: ' + errors.join(', '), 'error');
                    else showMsg(selected.length + ' node ' + action + ' edildi.', 'success');
                    f5LoadNodes();
                    if (action !== 'enable') f5StartNodeDrain(selected);
                }
            });
        });
    };

    function f5StartNodeDrain(nodes) {
        F5.drainTargets = nodes;
        clearInterval(F5.drainTimers.node);
        var panel = document.getElementById('f5-node-drain');
        panel.classList.add('active');
        document.getElementById('f5-node-drain-done').style.display = 'none';
        f5PollNodeDrain();
        F5.drainTimers.node = setInterval(f5PollNodeDrain, 5000);
    }

    function f5PollNodeDrain() {
        var rows = document.getElementById('f5-node-drain-rows');
        var allZero = true;
        var pending = F5.drainTargets.length;
        var results = {};
        F5.drainTargets.forEach(function(node) {
            api({action: 'get_node_stats', node: node}, function(res) {
                results[node] = res.curConns;
                if (res.curConns !== 0) allZero = false;
                pending--;
                if (pending === 0) {
                    var html = '';
                    F5.drainTargets.forEach(function(n) {
                        var c = results[n];
                        var cls = c === 0 ? 'zero' : 'nonzero';
                        var ts = new Date().toLocaleTimeString('tr-TR');
                        html += '<div class="f5-drain-row"><span>' + n + '</span><div style="display:flex;align-items:center;gap:12px"><span style="font-size:11px;color:var(--text-tertiary)">' + ts + '</span><span class="f5-conn-value ' + cls + '">' + c + '</span></div></div>';
                    });
                    rows.innerHTML = html;
                    if (allZero) {
                        clearInterval(F5.drainTimers.node);
                        document.getElementById('f5-node-drain-done').style.display = 'flex';
                    }
                }
            });
        });
    }

    window.f5LoadPools = function() {
    api({action: 'get_pools'}, function(res) {
        if (!res.success) return;
        F5.pools = res.pools;
        var sel = document.getElementById('f5-app-select');
        sel.innerHTML = '<option value="">Uygulama secin...</option>';
        Object.keys(res.pools).forEach(function(app) {
            sel.innerHTML += '<option value="' + app + '">' + app + ' (' + res.pools[app].length + ' pool)</option>';
        });
    });
};

    window.f5LoadPoolsByApp = function() {
    var app = document.getElementById('f5-app-select').value;
    var psel = document.getElementById('f5-pool-select');
    document.getElementById('f5-member-list').style.display = 'none';
    clearInterval(F5.drainTimers.memberStats);
    if (!app) { psel.style.display = 'none'; return; }
    var pools = F5.pools[app] || [];
    psel.innerHTML = '<option value="">Pool secin...</option>';
    pools.forEach(function(p) {
        var name  = p.name  || p;
        var label = p.label || p;
        psel.innerHTML += '<option value="' + name + '">' + label + '</option>';
    });
    psel.style.display = '';
};
     

    window.f5LoadMembers = function() {
    var pool = document.getElementById('f5-pool-select').value;
    if (!pool) return;
    F5.currentPool = pool;
    document.getElementById('f5-member-list').style.display = 'none';
    document.getElementById('f5-pool-loading').style.display = 'block';

    clearInterval(F5.drainTimers.memberStats);

    api({action: 'get_members', pool: pool}, function(res) {
        document.getElementById('f5-pool-loading').style.display = 'none';
        if (!res.success) { showMsg('Member listesi alinamadi.', 'error'); return; }
        F5.members = res.members;
        f5RenderMembers();
        document.getElementById('f5-member-list').style.display = '';
        f5PollMemberStats();
        F5.drainTimers.memberStats = setInterval(f5PollMemberStats, 5000);
    });
    };

    function f5RenderMembers() {
    var q = (document.getElementById('f5-member-search').value || '').toLowerCase();
    var filtered = F5.members.filter(function(m) { return m.name.toLowerCase().indexOf(q) >= 0; });
    if (!filtered.length) { document.getElementById('f5-member-table').innerHTML = '<div class="f5-loading">Sonuc bulunamadi.</div>'; return; }
    var html = '<table class="f5-table" style="margin-bottom:8px"><thead><tr><th></th><th>Node</th><th>Address</th><th>Description</th><th>Monitor</th><th>State</th><th>Connections</th></tr></thead><tbody>';
    filtered.forEach(function(m) {
        html += '<tr><td><input type="checkbox" class="f5-member-cb" value="' + m.name + '" onchange="f5UpdateMemberCount()"></td><td>' + m.name + '</td><td>' + (m.address||'-') + '</td><td>' + (m.description||'-') + '</td><td>' + badge(m.session,'') + '</td><td>' + badge('',m.state) + '</td><td><span id="curconns-' + m.name.replace(/[^a-zA-Z0-9]/g,'_') + '" class="f5-conn-value loading">...</span></td></tr>';
    });
    html += '</tbody></table>';
    document.getElementById('f5-member-table').innerHTML = html;
    f5UpdateMemberCount();
}

    window.f5FilterMembers = function() { f5RenderMembers(); };

    window.f5UpdateMemberCount = function() {
        var count = document.querySelectorAll('.f5-member-cb:checked').length;
        document.getElementById('f5-member-sel-count').textContent = count ? count + ' member secili' : '';
    };

    window.f5MemberAction = function(action) {
        var selected = Array.from(document.querySelectorAll('.f5-member-cb:checked')).map(function(cb) { return cb.value; });
        if (!selected.length) { showMsg('En az bir member secin.', 'error'); return; }
        var pool = F5.currentPool;
        if (!confirm(pool + ' altinda ' + selected.length + ' member icin ' + action.toUpperCase() + ' yapilacak. Onayliyor musunuz?')) return;
        var done = 0, errors = [];
        selected.forEach(function(member) {
            apiPost({action: 'member_action', pool: pool, member: member, node_action: action}, function(res) {
                done++;
                if (!res.success) errors.push(member + ': ' + (res.error || 'hata'));
                if (done === selected.length) {
                    if (errors.length) showMsg('Hata: ' + errors.join(', '), 'error');
                    else showMsg(selected.length + ' member ' + action + ' edildi.', 'success');
                    f5LoadMembers();
                    if (action !== 'enable') f5StartMemberDrain(selected, pool);
                }
            });
        });
    };
    
    function f5PollMemberStats() {
    if (!F5.currentPool || !F5.members.length) return;
    F5.members.forEach(function(m) {
        api({action: 'get_member_stats', pool: F5.currentPool, member: m.name}, function(res) {
            var elId = 'curconns-' + m.name.replace(/[^a-zA-Z0-9]/g, '_');
            var el = document.getElementById(elId);
            if (!el) return;
            var c = res.curConns !== undefined ? res.curConns : -1;
            el.textContent = c >= 0 ? c : '?';
            el.className = 'f5-conn-value ' + (c === 0 ? 'zero' : (c > 0 ? 'nonzero' : 'loading'));
        });
    });
}
   
    function f5StartMemberDrain(members, pool) {
        F5.drainTargets = members;
        F5.drainPool = pool;
        clearInterval(F5.drainTimers.member);
        var panel = document.getElementById('f5-member-drain');
        panel.classList.add('active');
        document.getElementById('f5-member-drain-done').style.display = 'none';
        f5PollMemberDrain();
        F5.drainTimers.member = setInterval(f5PollMemberDrain, 5000);
    }

    function f5PollMemberDrain() {
        var rows = document.getElementById('f5-member-drain-rows');
        var allZero = true;
        var pending = F5.drainTargets.length;
        var results = {};
        F5.drainTargets.forEach(function(member) {
            api({action: 'get_member_stats', pool: F5.drainPool, member: member}, function(res) {
                results[member] = res.curConns;
                if (res.curConns !== 0) allZero = false;
                pending--;
                if (pending === 0) {
                    var html = '';
                    F5.drainTargets.forEach(function(m) {
                        var c = results[m];
                        var cls = c === 0 ? 'zero' : 'nonzero';
                        var ts = new Date().toLocaleTimeString('tr-TR');
                        html += '<div class="f5-drain-row"><span>' + m + '</span><div style="display:flex;align-items:center;gap:12px"><span style="font-size:11px;color:var(--text-tertiary)">' + ts + '</span><span class="f5-conn-value ' + cls + '">' + c + '</span></div></div>';
                    });
                    rows.innerHTML = html;
                    if (allZero) {
                        clearInterval(F5.drainTimers.member);
                        document.getElementById('f5-member-drain-done').style.display = 'flex';
                    }
                }
            });
        });
    }

    window.f5LoadAudit = function() {
        document.getElementById('f5-audit-content').innerHTML = '<div class="f5-loading"><i class="fas fa-spinner fa-spin"></i> Yukleniyor...</div>';
        api({action: 'get_audit_log'}, function(res) {
            if (!res.success || !res.logs || !res.logs.length) { document.getElementById('f5-audit-content').innerHTML = '<div class="f5-loading">Kayit bulunamadi.</div>'; return; }
            var actionColors = {disable: '#e67e22', 'force-offline': '#e74c3c', enable: '#2ecc71'};
            var html = '<table class="f5-audit-table"><thead><tr><th>Zaman</th><th>Kullanici</th><th>Ortam</th><th>Islem</th><th>Hedef</th><th>Pool</th></tr></thead><tbody>';
            res.logs.forEach(function(l) {
                var color = actionColors[l.action] || '#fff';
                html += '<tr><td>' + l.created_at + '</td><td>' + l.username + '</td><td>' + l.environment.toUpperCase() + '</td><td><span style="color:' + color + ';font-weight:600">' + l.action + '</span></td><td>' + l.target + '</td><td>' + (l.pool || '-') + '</td></tr>';
            });
            html += '</tbody></table>';
            document.getElementById('f5-audit-content').innerHTML = html;
        });
    };

    window.addEventListener('hashchange', function() {
        if (window.location.hash === '#f5-operations') {
            f5LoadNodes();
            f5LoadPools();
        }
    });

    if (window.location.hash === '#f5-operations') {
        f5LoadNodes();
        f5LoadPools();
    }
    window.f5LoadRatioMembers = function() {
    var pool = document.getElementById('f5-ratio-pool-select').value;
    if (!pool) return;
    document.getElementById('f5-ratio-members').style.display = 'none';
    document.getElementById('f5-ratio-loading').style.display = 'block';
    api({action: 'get_ratio', pool: pool}, function(res) {
        document.getElementById('f5-ratio-loading').style.display = 'none';
        if (!res.success) { showMsg('Member listesi alinamadi.', 'error'); return; }
        F5.ratioMembers = res.members;
        var html = '<table class="f5-table"><thead><tr><th>Member</th><th>Ratio</th><th>Session</th><th>State</th></tr></thead><tbody>';
        res.members.forEach(function(m) {
            html += '<tr><td>' + m.name + '</td><td><strong>' + m.ratio + '</strong></td><td>' + badge(m.session, '') + '</td><td>' + badge('', m.state) + '</td></tr>';
        });
        html += '</tbody></table>';
        document.getElementById('f5-ratio-table').innerHTML = html;
        document.getElementById('f5-ratio-members').style.display = '';
    });
};

window.f5ApplyRatio = function() {
    var pool   = document.getElementById('f5-ratio-pool-select').value;
    var preset = document.getElementById('f5-ratio-preset-select').value;
    if (!pool)   { showMsg('Pool secin.', 'error'); return; }
    if (!preset) { showMsg('Preset secin.', 'error'); return; }
    if (!F5.ratioMembers || !F5.ratioMembers.length) { showMsg('Once pool yukleyin.', 'error'); return; }
    if (!confirm(pool + ' icin preset #' + preset + ' uygulanacak. Onayliyor musunuz?')) return;

    document.getElementById('f5-ratio-status').textContent = 'Uygulaniyor...';

    apiPost({
        action: 'set_ratio',
        pool: pool,
        preset: preset,
        members: JSON.stringify(F5.ratioMembers)
    }, function(res) {
        if (!res.success) {
            showMsg('Hata: ' + (res.errors || []).join(', '), 'error');
            document.getElementById('f5-ratio-status').textContent = '';
            return;
        }
        showMsg('Ratio basariyla uygulandi.', 'success');
        document.getElementById('f5-ratio-status').textContent = res.results.length + ' member guncellendi.';
        f5LoadRatioMembers();
    });
};
var F5Favorites = { items: [], editId: null };

window.f5ShowTab = function(tab, btn) {
    // Ayarlar sekmesi sadece admin icin uretilir (index.php'de is_admin() geciti).
    // Panel yoksa sekmeye gecilmez — konsoldan cagrilsa bile.
    if (tab === 'settings' && !document.getElementById('f5-tab-settings')) return;

    ['nodes','pools','audit','ratio','favorites','ltmlogs','settings'].forEach(function(t) {
        var el = document.getElementById('f5-tab-' + t);
        if (el) el.style.display = t === tab ? '' : 'none';
    });
    btn = btn || document.querySelector('#f5-operations-page .f5-tab[onclick*="\'' + tab + '\'"]');
    document.querySelectorAll('#f5-operations-page .f5-tab').forEach(function(b) { b.classList.remove('active'); });
    if (btn) btn.classList.add('active');
    if (tab === 'audit') f5LoadAudit();
    if (tab === 'favorites') f5LoadFavorites();
    if (tab === 'settings') f5LoadCredentialSettings();
};

window.f5LoadFavorites = function() {
    document.getElementById('f5-favorites-list').innerHTML = '<div class="f5-loading"><i class="fas fa-spinner fa-spin"></i> Yukleniyor...</div>';
    api({action: 'get_favorites'}, function(res) {
        if (!res.success) { document.getElementById('f5-favorites-list').innerHTML = '<div class="f5-loading" style="color:#e74c3c">Hata</div>'; return; }
        if (!res.favorites.length) {
            document.getElementById('f5-favorites-list').innerHTML = '<div class="f5-loading">Henuz favori grup yok. "Yeni Grup" ile olusturun.</div>';
            return;
        }
        var html = '';
        res.favorites.forEach(function(fav) {
            var nodes   = (fav.items || []).filter(function(i) { return i.type === 'node'; });
            var members = (fav.items || []).filter(function(i) { return i.type === 'member'; });
            html += '<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:16px;margin-bottom:12px">';
            html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">';
            html += '<span style="font-weight:600;font-size:15px"><i class="fas fa-star" style="color:#f1c40f;margin-right:8px"></i>' + fav.group_name + '</span>';
            html += '<div style="display:flex;gap:8px">';
            html += '<button class="f5-btn f5-btn-reload" onclick="f5EditFavorite(' + fav.id + ')"><i class="fas fa-edit"></i></button>';
            html += '<button class="f5-btn f5-btn-force" onclick="f5DeleteFavorite(' + fav.id + ')"><i class="fas fa-trash"></i></button>';
            html += '</div></div>';
            if (nodes.length) {
    html += '<div style="margin-bottom:10px"><span style="font-size:11px;opacity:0.5;text-transform:uppercase;letter-spacing:0.8px">Nodes (' + nodes.length + ')</span>';
    html += '<div style="margin-top:6px">';
    nodes.forEach(function(n, idx) {
        var cbId = 'fav-node-' + fav.id + '-' + idx;
        html += '<label style="display:flex;align-items:center;gap:8px;padding:4px 0;cursor:pointer;font-size:13px">';
        html += '<input type="checkbox" id="' + cbId + '" class="fav-item-cb" data-favid="' + fav.id + '" data-type="node" data-value="' + n.value + '" data-pool="">';
        html += '<span style="background:rgba(52,152,219,0.15);border:1px solid rgba(52,152,219,0.3);border-radius:4px;padding:2px 8px;font-size:12px">' + n.value + '</span>';
        html += '</label>';
    });
    html += '</div></div>';
}

if (members.length) {
    html += '<div style="margin-bottom:12px"><span style="font-size:11px;opacity:0.5;text-transform:uppercase;letter-spacing:0.8px">Members (' + members.length + ')</span>';
    html += '<div style="margin-top:6px">';
    members.forEach(function(m, idx) {
        var cbId = 'fav-member-' + fav.id + '-' + idx;
        html += '<label style="display:flex;align-items:center;gap:8px;padding:4px 0;cursor:pointer;font-size:13px">';
        html += '<input type="checkbox" id="' + cbId + '" class="fav-item-cb" data-favid="' + fav.id + '" data-type="member" data-value="' + m.value + '" data-pool="' + m.pool + '">';
        html += '<span style="background:rgba(46,204,113,0.15);border:1px solid rgba(46,204,113,0.3);border-radius:4px;padding:2px 8px;font-size:12px">' + m.value + '<span style="opacity:0.5;margin-left:4px">(' + m.pool + ')</span></span>';
        html += '</label>';
    });
    html += '</div></div>';
}
            if (nodes.length || members.length) {
                html += '<div style="display:flex;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.07)">';
                html += '<button class="f5-btn f5-btn-disable" onclick="f5FavAction(\'' + fav.id + '\',\'disable\')"><i class="fas fa-pause-circle"></i> Disable</button>';
                html += '<button class="f5-btn f5-btn-force" onclick="f5FavAction(\'' + fav.id + '\',\'force-offline\')"><i class="fas fa-stop-circle"></i> Force Offline</button>';
                html += '<button class="f5-btn f5-btn-enable" onclick="f5FavAction(\'' + fav.id + '\',\'enable\')"><i class="fas fa-play-circle"></i> Enable</button>';
                html += '</div>';
            }
            html += '</div>';
        });
        document.getElementById('f5-favorites-list').innerHTML = html;
        window._f5FavoritesData = res.favorites;
    });
};

window.f5ShowAddFavoriteModal = function() {
    F5Favorites.items = [];
    F5Favorites.editId = null;
    document.getElementById('f5-fav-group-name').value = '';
    document.getElementById('f5-fav-node-input').value = '';
    document.getElementById('f5-fav-pool-input').value = '';
    document.getElementById('f5-fav-edit-id').value = '';
    document.getElementById('f5-fav-modal-title').textContent = 'Yeni Favori Grup';
    document.getElementById('f5-fav-node-suggestions').style.display = 'none';
    document.getElementById('f5-fav-member-list').style.display = 'none';
    f5RenderFavItems();
    document.getElementById('f5-favorite-modal').style.display = 'flex';
};

window.f5CloseFavoriteModal = function() {
    document.getElementById('f5-favorite-modal').style.display = 'none';
};

window.f5AddFavItem = function(type) {
    var inputId = type === 'node' ? 'f5-fav-node-input' : 'f5-fav-pool-input';
    var val = document.getElementById(inputId).value.trim();
    if (!val) return;
    F5Favorites.items.push({type: type, value: val});
    document.getElementById(inputId).value = '';
    f5RenderFavItems();
};

function f5RenderFavItems() {
    var el = document.getElementById('f5-fav-items-list');
    if (!F5Favorites.items.length) {
        el.innerHTML = '<div style="font-size:12px;opacity:0.4;text-align:center">Henuz item eklenmedi</div>';
        return;
    }
    var html = '';
    F5Favorites.items.forEach(function(item, idx) {
        var color = item.type === 'node' ? '#3498db' : '#2ecc71';
        var label = item.type === 'node' ? 'NODE' : 'MEMBER';
        var detail = item.type === 'member' ? ' <span style="opacity:0.5;font-size:11px">(' + item.pool + ')</span>' : '';
        html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05)">';
        html += '<span><span style="font-size:10px;color:' + color + ';font-weight:700;margin-right:8px">' + label + '</span>' + item.value + detail + '</span>';
        html += '<button onclick="f5RemoveFavItem(' + idx + ')" style="background:none;border:none;cursor:pointer;color:#e74c3c;font-size:14px">&times;</button>';
        html += '</div>';
    });
    el.innerHTML = html;
}

window.f5RemoveFavItem = function(idx) {
    F5Favorites.items.splice(idx, 1);
    f5RenderFavItems();
};

window.f5FavFetchMembers = function() {
    var q = document.getElementById('f5-fav-pool-input').value.trim().toLowerCase();
    if (!q) { showMsg('Pool adi girin.', 'error'); return; }

    var allPools = [];
    Object.keys(F5.pools || {}).forEach(function(app) {
        (F5.pools[app] || []).forEach(function(p) {
            var name = p.name || p;
            if (name.toLowerCase().indexOf(q) >= 0) allPools.push(name);
        });
    });

    if (!allPools.length) { showMsg('Eslesen pool bulunamadi.', 'error'); return; }

    if (allPools.length === 1) {
        f5FavLoadMembers(allPools[0]);
        return;
    }

    var memberList = document.getElementById('f5-fav-member-list');
    var html = '<div style="font-size:12px;opacity:0.6;margin-bottom:8px">Birden fazla pool bulundu, secin:</div>';
    allPools.forEach(function(p) {
        html += '<div onclick="f5FavLoadMembers(\'' + p + '\')" style="padding:6px 10px;cursor:pointer;font-size:13px;border-radius:4px;margin-bottom:4px;background:rgba(255,255,255,0.05)" onmouseover="this.style.background=\'rgba(255,255,255,0.1)\'" onmouseout="this.style.background=\'rgba(255,255,255,0.05)\'">' + p + '</div>';
    });
    memberList.innerHTML = html;
    memberList.style.display = 'block';
};

window.f5FavLoadMembers = function(pool) {
    var memberList = document.getElementById('f5-fav-member-list');
    memberList.innerHTML = '<div style="font-size:12px;opacity:0.5"><i class="fas fa-spinner fa-spin"></i> Yukleniyor...</div>';
    memberList.style.display = 'block';
    document.getElementById('f5-fav-pool-input').value = pool;
    api({action: 'get_members', pool: pool}, function(res) {
        if (!res.success || !res.members.length) {
            memberList.innerHTML = '<div style="font-size:12px;color:#e74c3c">Member bulunamadi.</div>';
            return;
        }
        var html = '<div style="font-size:11px;opacity:0.5;margin-bottom:6px">' + pool + '</div>';
        res.members.forEach(function(m) {
            var id = 'fav-m-' + m.name.replace(/[^a-zA-Z0-9]/g,'_');
            html += '<label style="display:flex;align-items:center;gap:8px;padding:4px 0;cursor:pointer;font-size:13px">';
            html += '<input type="checkbox" id="' + id + '" value="' + m.name + '" data-pool="' + pool + '">';
            html += '<span>' + m.name + '</span>';
            html += '<span style="font-size:11px;opacity:0.5">' + (m.session||'') + ' / ' + (m.state||'') + '</span>';
            html += '</label>';
        });
        html += '<div style="margin-top:8px"><button class="f5-btn f5-btn-reload" style="width:100%" onclick="f5AddFavMembers()"><i class="fas fa-plus"></i> Secilenleri Ekle</button></div>';
        memberList.innerHTML = html;
    });
};

window.f5AddFavMembers = function() {
    var checkboxes = document.querySelectorAll('#f5-fav-member-list input[type=checkbox]:checked');
    if (!checkboxes.length) { showMsg('En az bir member secin.', 'error'); return; }
    checkboxes.forEach(function(cb) {
        var already = F5Favorites.items.some(function(i) { return i.type === 'member' && i.value === cb.value && i.pool === cb.dataset.pool; });
        if (!already) {
            F5Favorites.items.push({type: 'member', value: cb.value, pool: cb.dataset.pool});
        }
    });
    document.getElementById('f5-fav-member-list').style.display = 'none';
    document.getElementById('f5-fav-pool-input').value = '';
    f5RenderFavItems();
};

window.f5SaveFavoriteGroup = function() {
    var groupName = document.getElementById('f5-fav-group-name').value.trim();
    var editId    = document.getElementById('f5-fav-edit-id').value;
    if (!groupName) { showMsg('Grup adi gerekli.', 'error'); return; }
    if (!F5Favorites.items.length) { showMsg('En az bir item ekleyin.', 'error'); return; }
    var data = {
        action     : editId ? 'update_favorite_group' : 'save_favorite_group',
        group_name : groupName,
        items      : JSON.stringify(F5Favorites.items),
    };
    if (editId) data.id = editId;
    apiPost(data, function(res) {
        if (!res.success) { showMsg('Hata: ' + (res.error || ''), 'error'); return; }
        showMsg('Grup kaydedildi.', 'success');
        f5CloseFavoriteModal();
        f5LoadFavorites();
    });
};

window.f5EditFavorite = function(id) {
    var fav = (window._f5FavoritesData || []).find(function(f) { return f.id === id; });
    if (!fav) return;
    F5Favorites.items = JSON.parse(JSON.stringify(fav.items || []));
    F5Favorites.editId = id;
    document.getElementById('f5-fav-group-name').value = fav.group_name;
    document.getElementById('f5-fav-edit-id').value = id;
    document.getElementById('f5-fav-modal-title').textContent = 'Grubu Duzenle';
    f5RenderFavItems();
    document.getElementById('f5-favorite-modal').style.display = 'flex';
};

window.f5DeleteFavorite = function(id) {
    if (!confirm('Bu favori grubu silmek istiyor musunuz?')) return;
    apiPost({action: 'delete_favorite_group', id: id}, function(res) {
        if (!res.success) { showMsg('Silme hatasi.', 'error'); return; }
        showMsg('Grup silindi.', 'success');
        f5LoadFavorites();
    });
};
window.f5FavAction = function(favId, action) {
    var checkboxes = document.querySelectorAll('.fav-item-cb[data-favid="' + favId + '"]:checked');
    if (!checkboxes.length) { showMsg('En az bir item secin.', 'error'); return; }
    if (!confirm(checkboxes.length + ' item icin ' + action.toUpperCase() + ' yapilacak. Onayliyor musunuz?')) return;

    var done   = 0;
    var total  = checkboxes.length;
    var errors = [];

    checkboxes.forEach(function(cb) {
        if (cb.dataset.type === 'node') {
            apiPost({action: 'node_action', node: cb.dataset.value, node_action: action}, function(res) {
                done++;
                if (!res.success) errors.push(cb.dataset.value + ': ' + (res.error || 'hata'));
                if (done === total) f5FavActionDone(errors, action);
            });
        } else {
            apiPost({action: 'member_action', pool: cb.dataset.pool, member: cb.dataset.value, node_action: action}, function(res) {
                done++;
                if (!res.success) errors.push(cb.dataset.value + ': ' + (res.error || 'hata'));
                if (done === total) f5FavActionDone(errors, action);
            });
        }
    });
};

function f5FavActionDone(errors, action) {
    if (errors.length) {
        showMsg('Bazi hatalar: ' + errors.join(', '), 'error');
    } else {
        showMsg('Tum itemlar ' + action + ' edildi.', 'success');
    }
}
window.f5SearchLtmLogs = function() {
    var search = document.getElementById('f5-ltm-search').value.trim();
    var limit  = document.getElementById('f5-ltm-limit').value;
    if (!search) { showMsg('Arama terimi girin.', 'error'); return; }

    document.getElementById('f5-ltm-content').innerHTML = '<div class="f5-loading"><i class="fas fa-spinner fa-spin"></i> Sorgu yapiliyor...</div>';

    apiPost({action: 'ltm_logs', search: search, limit: limit}, function(res) {
        if (!res.success) {
            document.getElementById('f5-ltm-content').innerHTML = '<div class="f5-loading" style="color:#e74c3c">Hata: ' + (res.error || '') + '</div>';
            return;
        }
        if (!res.logs || !res.logs.length) {
            document.getElementById('f5-ltm-content').innerHTML = '<div class="f5-loading">Sonuc bulunamadi.</div>';
            return;
        }

        var levelColors = {
            'notice'  : '#3498db',
            'warning' : '#e67e22',
            'err'     : '#e74c3c',
            'error'   : '#e74c3c',
            'info'    : '#2ecc71',
            'debug'   : '#95a5a6',
        };

        var html = '<div style="font-size:12px;opacity:0.5;margin-bottom:10px">' + res.count + ' sonuc bulundu</div>';
        html += '<table class="f5-table"><thead><tr><th style="width:110px">Tarih</th><th style="width:70px">Seviye</th><th>Mesaj</th></tr></thead><tbody>';
res.logs.forEach(function(l) {
    var color = levelColors[l.level] || '#fff';
    html += '<tr>';
    html += '<td style="white-space:nowrap;font-size:12px;opacity:0.7;width:110px">' + (l.date || '-') + '</td>';
    html += '<td style="white-space:nowrap;width:70px"><span style="color:' + color + ';font-weight:600;font-size:12px">' + (l.level || '-') + '</span></td>';
    html += '<td style="font-size:12px;word-break:break-word;max-width:0">' + (l.message || '-') + '</td>';
    html += '</tr>';
        });
        html += '</tbody></table>';
        document.getElementById('f5-ltm-content').innerHTML = html;
    });
};
window.f5FavNodeSearch = function() {
    var q = document.getElementById('f5-fav-node-input').value.trim().toLowerCase();
    var sug = document.getElementById('f5-fav-node-suggestions');
    if (!q || q.length < 2) { sug.style.display = 'none'; return; }
    if (!F5.nodes || !F5.nodes.length) { sug.style.display = 'none'; return; }
    var filtered = F5.nodes.filter(function(n) {
        return n.name.toLowerCase().indexOf(q) >= 0 ||
               (n.address || '').toLowerCase().indexOf(q) >= 0 ||
               (n.description || '').toLowerCase().indexOf(q) >= 0;
    }).slice(0, 10);
    if (!filtered.length) { sug.style.display = 'none'; return; }
    var html = '';
    filtered.forEach(function(n) {
        html += '<div onclick="f5FavSelectNode(\'' + n.name + '\')" style="padding:8px 12px;cursor:pointer;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.05)" onmouseover="this.style.background=\'rgba(255,255,255,0.07)\'" onmouseout="this.style.background=\'\'">';
        html += '<span style="color:#3498db;margin-right:8px">' + n.name + '</span>';
        if (n.description) html += '<span style="opacity:0.5;font-size:11px">' + n.description + '</span>';
        html += '</div>';
    });
    sug.innerHTML = html;
    sug.style.display = 'block';
};

window.f5FavSelectNode = function(name) {
    document.getElementById('f5-fav-node-input').value = '';
    document.getElementById('f5-fav-node-suggestions').style.display = 'none';
    var already = F5Favorites.items.some(function(i) { return i.type === 'node' && i.value === name; });
    if (!already) {
        F5Favorites.items.push({type: 'node', value: name});
        f5RenderFavItems();
    }
};
window.f5RatioModeChange = function() {
    var mode = document.getElementById('f5-ratio-mode-select').value;
    document.getElementById('f5-ratio-pspk').style.display  = mode === 'pspk'  ? '' : 'none';
    document.getElementById('f5-ratio-custom').style.display = mode === 'custom' ? '' : 'none';
    if (mode === 'custom') f5RatioCustomInitApps();
};

window.f5RatioCustomInitApps = function() {
    var sel = document.getElementById('f5-ratio-custom-app-select');
    sel.innerHTML = '<option value="">Uygulama secin...</option>';
    Object.keys(F5.pools || {}).forEach(function(app) {
        sel.innerHTML += '<option value="' + app + '">' + app + '</option>';
    });
};

window.f5RatioCustomAppChange = function() {
    var app  = document.getElementById('f5-ratio-custom-app-select').value;
    var psel = document.getElementById('f5-ratio-custom-pool-select');
    document.getElementById('f5-ratio-custom-members').style.display = 'none';
    if (!app) { psel.style.display = 'none'; return; }
    var pools = F5.pools[app] || [];
    psel.innerHTML = '<option value="">Pool secin...</option>';
    pools.forEach(function(p) {
        var name  = p.name  || p;
        var label = p.label || p;
        psel.innerHTML += '<option value="' + name + '">' + label + '</option>';
    });
    psel.style.display = '';
};

window.f5RatioCustomLoadMembers = function() {
    var pool = document.getElementById('f5-ratio-custom-pool-select').value;
    if (!pool) return;
    document.getElementById('f5-ratio-custom-members').style.display = 'none';
    document.getElementById('f5-ratio-custom-loading').style.display = 'block';
    api({action: 'get_ratio', pool: pool}, function(res) {
        document.getElementById('f5-ratio-custom-loading').style.display = 'none';
        if (!res.success) { showMsg('Member listesi alinamadi.', 'error'); return; }
        var html = '<table class="f5-table"><thead><tr><th>Member</th><th>Address</th><th>Session</th><th>State</th><th>Mevcut Ratio</th><th>Yeni Ratio</th></tr></thead><tbody>';
        res.members.forEach(function(m) {
            html += '<tr>';
            html += '<td>' + m.name + '</td>';
            html += '<td style="opacity:0.6;font-size:12px">' + (m.address || '-') + '</td>';
            html += '<td>' + badge(m.session, '') + '</td>';
            html += '<td>' + badge('', m.state) + '</td>';
            html += '<td style="font-weight:600;text-align:center">' + m.ratio + '</td>';
            html += '<td><input type="number" class="f5-ratio-input" data-member="' + m.name + '" data-monitor="' + (m.monitor || 'default') + '" value="' + m.ratio + '" min="1" max="100" style="width:70px;padding:4px 8px;border-radius:6px;border:1px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.07);color:inherit;text-align:center"></td>';
            html += '</tr>';
        });
        html += '</tbody></table>';
        document.getElementById('f5-ratio-custom-table').innerHTML = html;
        document.getElementById('f5-ratio-custom-members').style.display = '';
    });
};

window.f5ApplyCustomRatio = function() {
    var pool = document.getElementById('f5-ratio-custom-pool-select').value;
    if (!pool) { showMsg('Pool secin.', 'error'); return; }
    var inputs = document.querySelectorAll('.f5-ratio-input');
    if (!inputs.length) { showMsg('Member listesi bos.', 'error'); return; }

    var members = [];
    var valid = true;
    inputs.forEach(function(inp) {
        var ratio = parseInt(inp.value);
        if (isNaN(ratio) || ratio < 1 || ratio > 100) { valid = false; return; }
        members.push({name: inp.dataset.member, ratio: ratio, monitor: inp.dataset.monitor});
    });

    if (!valid) { showMsg('Ratio degerleri 1-100 arasinda olmali.', 'error'); return; }
    if (!confirm(pool + ' icin ratio guncelleme yapilacak. Onayliyor musunuz?')) return;

    document.getElementById('f5-ratio-custom-status').textContent = 'Uygulaniyor...';

    apiPost({
        action: 'set_custom_ratio',
        pool: pool,
        members: JSON.stringify(members)
    }, function(res) {
        if (!res.success) {
            showMsg('Hata: ' + (res.errors || []).join(', '), 'error');
            document.getElementById('f5-ratio-custom-status').textContent = '';
            return;
        }
        showMsg('Ratio basariyla guncellendi.', 'success');
        document.getElementById('f5-ratio-custom-status').textContent = res.results.length + ' member guncellendi.';
        f5RatioCustomLoadMembers();
    });
};

// =====================================================================
// AYARLAR — Servis hesabi kimlik bilgileri ve sifre suresi bildirimi
// =====================================================================
var F5_ENVS = ['test', 'prod', 'drc'];

function f5esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
        return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
}

function f5SetResult(id, text, type) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.className = 'f5-settings-result' + (type ? ' ' + type : '');
}

window.f5LoadCredentialSettings = function() {
    fetch('get-f5-credential-settings.php')
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (!data.success) {
                f5SetResult('f5-cred-save-result', data.error || 'Ayarlar yuklenemedi', 'error');
                return;
            }

            // Bildirim ayarlari
            var enabled = document.getElementById('f5-cred-enabled');
            if (enabled) enabled.checked = !!data.enabled;
            var rec = document.getElementById('f5-cred-recipients');
            if (rec) rec.value = data.notify_recipients || '';
            var exp = document.getElementById('f5-cred-expiry-days');
            if (exp) exp.value = data.expiry_days || 90;
            var before = document.getElementById('f5-cred-days-before');
            if (before) before.value = data.notify_days_before == null ? 3 : data.notify_days_before;

            // Ortam bazli kullanici adi / host
            F5_ENVS.forEach(function(env) {
                var info = (data.environments || {})[env] || {};
                var hostEl = document.getElementById('f5-cred-host-' + env);
                if (hostEl) hostEl.textContent = (info.host || '').replace(/^https?:\/\//, '');
                var userEl = document.getElementById('f5-cred-user-' + env);
                if (userEl) {
                    userEl.placeholder = info.username ? ('Mevcut: ' + info.username) : 'Degistirmek icin doldurun';
                    userEl.value = '';
                }
                var passEl = document.getElementById('f5-cred-pass-' + env);
                if (passEl) passEl.value = '';

                // Kimlik bilgisi config.enc'te eksikse ortami acikca isaretle
                var head = document.getElementById('f5-cred-host-' + env);
                if (head && info.configured === false) {
                    head.textContent = (info.host || 'adres tanimsiz').replace(/^https?:\/\//, '') + '  ⚠ eksik yapilandirma';
                }
            });

            // f5-config.php yazilabilir degilse kaydetme calismaz — onceden uyar
            var pending = document.getElementById('f5-cred-pending');
            if (pending) {
                if (data.config_writable === false) {
                    pending.style.display = 'block';
                    pending.className = 'f5-cred-status expired';
                    pending.innerHTML = '<strong>f5-config.php yazilabilir degil.</strong> Kaydetme calismaz. ' +
                                        'Sunucuda: chown www-data:www-data f5-config.php && chmod 640 f5-config.php';
                } else {
                    pending.style.display = 'none';
                }
            }

            f5RenderCredStatus(data);
        })
        .catch(function() {
            f5SetResult('f5-cred-save-result', 'Baglanti hatasi', 'error');
        });
};

function f5RenderCredStatus(data) {
    var el = document.getElementById('f5-cred-status');
    if (!el) return;

    var cls = data.status || 'unknown';
    var html;

    if (cls === 'unknown') {
        html = '<strong>Sifre degisim tarihi kayitli degil.</strong> Hatirlatma gonderilebilmesi icin asagidan tarihi kaydedin.';
    } else if (cls === 'expired') {
        html = '<strong>Sure doldu.</strong> Son degisim: ' + f5esc(data.password_changed_at || '-') +
               ' · Politikaya gore ' + Math.abs(data.days_left) + ' gun once dolmus olmali (' + data.expiry_days + ' gun).';
    } else {
        html = 'Son degisim: <strong>' + f5esc((data.password_changed_at || '-').substring(0, 10)) + '</strong>' +
               (data.changed_by ? ' (' + f5esc(data.changed_by) + ')' : '') +
               ' · Son gecerlilik: <strong>' + f5esc(data.expires_at || '-') + '</strong>' +
               ' · Kalan: <strong>' + data.days_left + ' gun</strong>';
    }

    if (data.username) {
        html += '<br>Servis hesabi: <strong>' + f5esc(data.username) + '</strong>';
    }

    el.className = 'f5-cred-status ' + cls;
    el.innerHTML = html;
    el.style.display = 'block';
}

window.f5MarkPasswordChanged = function() {
    var dateEl = document.getElementById('f5-cred-changed-at');
    var changedAt = dateEl ? dateEl.value : '';

    if (!confirm('Sifre degisim tarihi guncellenecek ve hatirlatma sayaci sifirlanacak. Onayliyor musunuz?')) return;

    f5SetResult('f5-cred-mark-result', 'Kaydediliyor...', '');

    fetch('mark-f5-password-changed.php', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({changed_at: changedAt})
    })
        .then(function(r) { return r.json(); })
        .then(function(res) {
            if (!res.success) {
                f5SetResult('f5-cred-mark-result', res.error || 'Kaydedilemedi', 'error');
                return;
            }
            f5SetResult('f5-cred-mark-result', res.message, 'success');
            if (dateEl) dateEl.value = '';
            f5LoadCredentialSettings();
        })
        .catch(function() { f5SetResult('f5-cred-mark-result', 'Baglanti hatasi', 'error'); });
};

window.f5SaveCredentialSettings = function() {
    var payload = {
        enabled: document.getElementById('f5-cred-enabled').checked,
        notify_recipients: document.getElementById('f5-cred-recipients').value.trim(),
        expiry_days: parseInt(document.getElementById('f5-cred-expiry-days').value, 10) || 90,
        notify_days_before: parseInt(document.getElementById('f5-cred-days-before').value, 10)
    };
    if (isNaN(payload.notify_days_before)) payload.notify_days_before = 3;

    f5SetResult('f5-cred-save-result', 'Kaydediliyor...', '');

    fetch('save-f5-credential-settings.php', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
    })
        .then(function(r) { return r.json(); })
        .then(function(res) {
            if (!res.success) {
                f5SetResult('f5-cred-save-result', res.error || 'Kaydedilemedi', 'error');
                return;
            }
            f5SetResult('f5-cred-save-result', res.message, 'success');
            f5LoadCredentialSettings();
        })
        .catch(function() { f5SetResult('f5-cred-save-result', 'Baglanti hatasi', 'error'); });
};

window.f5SendTestCredentialMail = function() {
    var to = prompt('Test maili hangi adrese gonderilsin?', document.getElementById('f5-cred-recipients').value.split(',')[0].trim());
    if (!to) return;

    f5SetResult('f5-cred-save-result', 'Test maili gonderiliyor...', '');

    fetch('f5-credential-notify.php?test=' + encodeURIComponent(to))
        .then(function(r) { return r.json(); })
        .then(function(res) {
            if (res.success && res.sent) {
                f5SetResult('f5-cred-save-result', 'Test maili gonderildi: ' + to, 'success');
            } else {
                f5SetResult('f5-cred-save-result', res.error || ('Mail gonderilemedi (' + (res.reason || 'bilinmeyen') + ')'), 'error');
            }
        })
        .catch(function() { f5SetResult('f5-cred-save-result', 'Baglanti hatasi', 'error'); });
};

function f5SubmitCredential(credentials, force) {
    var resultId = 'f5-cred-credential-result';

    f5SetResult(resultId, force ? 'Dogrulama atlanarak kaydediliyor...' : 'F5 uzerinde dogrulaniyor...', '');

    fetch('save-f5-credential.php', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({credentials: credentials, force: !!force})
    })
        .then(function(r) { return r.json(); })
        .then(function(res) {
            if (!res.success) {
                f5SetResult(resultId, res.error || 'Kaydedilemedi', 'error');
                // Cihaza erisilemedi / TLS hatasi gibi durumlarda kullaniciya secenek sun.
                // Sifreyi F5'in acikca reddettigi durumda can_force gelmez.
                if (res.can_force && !force) {
                    if (confirm(res.error + '\n\nBilgiler cihazda dogrulanamadi. Yine de kaydedilsin mi?')) {
                        f5SubmitCredential(credentials, true);
                    }
                }
                return;
            }

            F5_ENVS.forEach(function(env) {
                document.getElementById('f5-cred-user-' + env).value = '';
                document.getElementById('f5-cred-pass-' + env).value = '';
            });

            f5SetResult(resultId, res.message, 'success');
            f5LoadCredentialSettings();
        })
        .catch(function() { f5SetResult(resultId, 'Baglanti hatasi', 'error'); });
}

window.f5SaveCredential = function() {
    var sameUser = document.getElementById('f5-cred-same-user').checked;
    var sharedUser = document.getElementById('f5-cred-user-test').value.trim();

    var credentials = {};
    var changed = [];

    F5_ENVS.forEach(function(env) {
        var u = document.getElementById('f5-cred-user-' + env).value.trim();
        var p = document.getElementById('f5-cred-pass-' + env).value;
        if (sameUser && sharedUser) u = sharedUser;
        if (!u && !p) return;
        credentials[env] = {username: u, password: p};
        changed.push(env.toUpperCase());
    });

    if (!changed.length) {
        f5SetResult('f5-cred-credential-result', 'Degistirilecek bir alan girilmedi.', 'error');
        return;
    }

    if (!confirm(changed.join(', ') + ' ortami icin F5 kimlik bilgileri guncellenecek.\n\n' +
                 'Bilgiler once cihazda denenir; F5 reddederse hicbir sey kaydedilmez. Onayliyor musunuz?')) return;

    f5SubmitCredential(credentials, false);
};

/**
 * Alanlar DOLU ise ekranda yazan kullanici/sifreyi dener, BOS ise kayitli olani.
 * (Eskiden her zaman kayitliyi denedigi icin yeni sifre yazip test edenler
 *  "sifre yanlis" hatasi aliyordu.)
 */
window.f5TestConnection = function(env) {
    var resultId = 'f5-cred-test-result-' + env;
    var userEl = document.getElementById('f5-cred-user-' + env);
    var passEl = document.getElementById('f5-cred-pass-' + env);
    var u = userEl ? userEl.value.trim() : '';
    var p = passEl ? passEl.value : '';

    f5SetResult(resultId, (u || p) ? 'Ekrandaki bilgilerle test ediliyor...' : 'Kayitli bilgilerle test ediliyor...', '');

    fetch('test-f5-credential.php', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({env: env, username: u, password: p})
    })
        .then(function(r) { return r.json(); })
        .then(function(res) {
            if (!res.success) {
                f5SetResult(resultId, res.error || 'Test edilemedi', 'error');
                return;
            }
            var kaynak = res.source === 'form' ? 'ekrandaki bilgiler' : 'kayitli bilgiler';
            if (res.ok) {
                f5SetResult(resultId, 'Basarili (' + kaynak + ', kullanici: ' + res.username + ').' +
                    (res.source === 'form' ? ' Kalici olmasi icin "Kimlik Bilgilerini Kaydet"e basin.' : ''), 'success');
            } else {
                f5SetResult(resultId, 'Basarisiz (' + kaynak + '): ' + res.error, 'error');
            }
        })
        .catch(function() { f5SetResult(resultId, 'Baglanti hatasi', 'error'); });
};
})();
