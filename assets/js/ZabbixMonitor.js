(function () {
    var zbxServerId  = '';
    var zbxGroupId   = '';
    var zbxSeverity  = '';
    var zbxSearch    = '';
    var zbxAlertDays = 14;
    var zbxAlertPage = 1;
    var zbxAlertPerPage = 100;

    var zbxActiveTab    = 'alerts';
    var zbxRefreshTimer = null;
    var zbxInitialized  = false;

    // History state
    var zbxHistPage    = 1;
    var zbxHistPerPage = 50;
    var zbxHistTotal   = 0;

    // Graph state
    var zbxCurrentPeriod  = 10800; // 3 saat default
    var zbxCurrentGraphId = '';
    var zbxCurrentGraphName = '';
    var currentGraphHostId  = '';
    var zbxAllGraphs        = [];   // tüm grafik listesi (search için)

    var SEVERITY_LABELS = ['Sınıflandırılmamış','Bilgi','Uyarı','Ortalama','Yüksek','Felaket'];
    var SEVERITY_COLORS = ['#9e9e9e','#42a5f5','#ffa726','#ef6c00','#e53935','#7b1fa2'];
    var SEVERITY_BG     = ['#f5f5f5','#e3f2fd','#fff8e1','#fff3e0','#ffebee','#f3e5f5'];

    var PERIOD_OPTIONS = [
        {label:'5 dk',   val:300},
        {label:'30 dk',  val:1800},
        {label:'1 saat', val:3600},
        {label:'6 saat', val:21600},
        {label:'12 saat',val:43200},
        {label:'1 gün',  val:86400},
        {label:'1 hafta',val:604800},
        {label:'1 ay',   val:2592000},
        {label:'1 yıl',  val:31536000},
    ];

    // ── Helpers ──────────────────────────────────────────────────────────────

    function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
    function escAttr(s) { return String(s||'').replace(/'/g,'&#39;').replace(/"/g,'&quot;'); }

    function severityBadge(sev) {
        var l=SEVERITY_LABELS[sev]||'?', c=SEVERITY_COLORS[sev]||'#999', b=SEVERITY_BG[sev]||'#f5f5f5';
        return '<span class="zbx-sev-badge" style="background:'+b+';color:'+c+';border:1px solid '+c+'">'+l+'</span>';
    }
    function timeAgo(ts) {
        if (!ts) return '-';
        var d=Math.floor(Date.now()/1000)-ts;
        if (d<60)    return d+'sn';
        if (d<3600)  return Math.floor(d/60)+'dk';
        if (d<86400) return Math.floor(d/3600)+'sa '+Math.floor((d%3600)/60)+'dk';
        return Math.floor(d/86400)+'g '+Math.floor((d%86400)/3600)+'sa';
    }
    function fmtDateTime(ts) {
        if (!ts) return '-';
        var d=new Date(ts*1000);
        return d.getDate().toString().padStart(2,'0')+'.'+
               (d.getMonth()+1).toString().padStart(2,'0')+'.'+
               d.getFullYear()+' '+
               d.getHours().toString().padStart(2,'0')+':'+
               d.getMinutes().toString().padStart(2,'0');
    }

    // ── API ──────────────────────────────────────────────────────────────────

    function api(params, cb) {
        if (!zbxServerId) { cb({success:false,error:'Sunucu seçilmedi'}); return; }
        params.server_id = zbxServerId;
        var qs = Object.keys(params).map(function(k){
            return encodeURIComponent(k)+'='+encodeURIComponent(params[k]);
        }).join('&');
        fetch('/portal/zabbix-api.php?'+qs)
            .then(function(r){return r.json();})
            .then(cb)
            .catch(function(){cb({success:false,error:'Bağlantı hatası'});});
    }

    // ── Tab ──────────────────────────────────────────────────────────────────

    window.zbxSwitchTab = function(tab) {
        zbxActiveTab = tab;
        ['alerts','history','hosts','settings'].forEach(function(t) {
            var btn=document.getElementById('zbx-tab-'+t);
            var pane=document.getElementById('zbx-pane-'+t);
            if (btn)  btn.classList.toggle('zbx-tab-active', t===tab);
            if (pane) pane.style.display = t===tab ? 'block' : 'none';
        });
        if (tab==='history'  && zbxHistTotal===0 && zbxServerId) { zbxHistPage=1; loadHistory(1); }
        if (tab==='hosts'    && zbxServerId) loadHosts();
        if (tab==='settings') loadZabbixServerList();
    };

    // ── Groups (shared dropdown) ──────────────────────────────────────────────

    function loadGroups() {
        api({action:'get_groups'}, function(res) {
            if (!res.success) return;
            var html='<option value="">Tüm Gruplar</option>';
            (res.groups||[]).forEach(function(g){
                html+='<option value="'+g.groupid+'">'+escHtml(g.name)+'</option>';
            });
            document.querySelectorAll('.zbx-group-filter').forEach(function(el){ el.innerHTML=html; });
        });
    }

    // ── Pagination renderer ───────────────────────────────────────────────────

    function renderPagination(containerId, infoId, totalPages, currentPage, total, onPageFn) {
        var info = document.getElementById(infoId);
        if (info) info.textContent = 'Toplam: '+total+' kayıt';
        var pg = document.getElementById(containerId);
        if (!pg) return;
        if (totalPages<=1) { pg.innerHTML=''; return; }
        var start=Math.max(1,currentPage-3), end=Math.min(totalPages,currentPage+3);
        var html='';
        if (currentPage>1) html+='<button class="zbx-pg-btn" onclick="'+onPageFn+'('+(currentPage-1)+')"><i class="fas fa-chevron-left"></i></button>';
        if (start>1) html+='<button class="zbx-pg-btn" onclick="'+onPageFn+'(1)">1</button>'+(start>2?'<span style="padding:0 4px;color:#94a3b8">…</span>':'');
        for (var i=start;i<=end;i++) {
            html+='<button class="zbx-pg-btn'+(i===currentPage?' zbx-pg-active':'')+'" onclick="'+onPageFn+'('+i+')">'+i+'</button>';
        }
        if (end<totalPages) html+=(end<totalPages-1?'<span style="padding:0 4px;color:#94a3b8">…</span>':'')+'<button class="zbx-pg-btn" onclick="'+onPageFn+'('+totalPages+')">'+totalPages+'</button>';
        if (currentPage<totalPages) html+='<button class="zbx-pg-btn" onclick="'+onPageFn+'('+(currentPage+1)+')"><i class="fas fa-chevron-right"></i></button>';
        pg.innerHTML=html;
    }

    // ── Active Alerts ─────────────────────────────────────────────────────────

    function loadAlerts(page) {
        zbxAlertPage = page || zbxAlertPage;
        var tbody=document.getElementById('zbx-problems-tbody');
        if (tbody) tbody.innerHTML='<tr><td colspan="4" class="zbx-empty"><i class="fas fa-spinner fa-spin"></i> Yükleniyor...</td></tr>';

        var daysSel=document.getElementById('zbx-alert-days');
        if (daysSel) zbxAlertDays=parseInt(daysSel.value)||14;

        var params={action:'get_problems', page:zbxAlertPage, per_page:zbxAlertPerPage, days:zbxAlertDays};
        if (zbxGroupId)  params.group_id=zbxGroupId;
        if (zbxSeverity) params.severity=zbxSeverity;
        if (zbxSearch)   params.search=zbxSearch;

        api(params, function(res) {
            var list=res.success?(res.problems||[]):[];
            renderAlerts(list);
            var total=res.total||list.length;
            var b=document.getElementById('zbx-stat-problems');
            if (b) b.textContent=total;
            var t=document.getElementById('zbx-tab-alerts');
            if (t) t.innerHTML='<i class="fas fa-exclamation-triangle"></i> Aktif Alertler ('+total+')';
            renderPagination('zbx-alert-pagination','zbx-alert-info',res.total_pages||1,res.page||1,total,'zbxAlertPage');
        });
    }

    window.zbxAlertPage = function(p) { loadAlerts(p); };

    function renderAlerts(list) {
        var tbody=document.getElementById('zbx-problems-tbody');
        if (!tbody) return;
        if (!list.length) {
            tbody.innerHTML='<tr><td colspan="4" class="zbx-empty"><i class="fas fa-check-circle" style="color:#22c55e"></i> Aktif problem yok</td></tr>';
            return;
        }
        var html='';
        list.forEach(function(p) {
            html+='<tr class="zbx-problem-row" onclick="zbxShowHostDetail(\''+escAttr(p.hostid)+'\',\''+escAttr(p.host_name)+'\')">'+
                '<td><strong>'+escHtml(p.host_name)+'</strong></td>'+
                '<td>'+escHtml(p.name)+'</td>'+
                '<td>'+severityBadge(p.severity)+'</td>'+
                '<td style="white-space:nowrap">'+timeAgo(p.since)+'</td>'+
                '</tr>';
        });
        tbody.innerHTML=html;
    }

    // ── Alert History ─────────────────────────────────────────────────────────

    function loadHistory(page) {
        zbxHistPage = page || zbxHistPage || 1;
        var tbody=document.getElementById('zbx-history-tbody');
        if (tbody) tbody.innerHTML='<tr><td colspan="5" class="zbx-empty"><i class="fas fa-spinner fa-spin"></i> Yükleniyor...</td></tr>';

        var grpSel=document.getElementById('zbx-hist-group');
        var sevSel=document.getElementById('zbx-hist-severity');
        var valSel=document.getElementById('zbx-hist-value');
        var srch=document.getElementById('zbx-hist-search');
        var dfrom=document.getElementById('zbx-hist-date-from');
        var dto=document.getElementById('zbx-hist-date-to');

        var params={action:'get_alert_history', page:zbxHistPage, per_page:zbxHistPerPage};
        if (grpSel&&grpSel.value) params.group_id=grpSel.value;
        if (sevSel&&sevSel.value) params.severity=sevSel.value;
        if (valSel&&valSel.value!=='') params.value=valSel.value;
        if (srch&&srch.value.trim()) params.search=srch.value.trim();
        if (dfrom&&dfrom.value) params.date_from=dfrom.value;
        if (dto&&dto.value)     params.date_to=dto.value;

        api(params, function(res) {
            if (!res.success) {
                if (tbody) tbody.innerHTML='<tr><td colspan="5" class="zbx-empty" style="color:#e53935"><i class="fas fa-exclamation-triangle"></i> '+escHtml(res.error)+'</td></tr>';
                return;
            }
            zbxHistTotal = res.total||0;
            renderHistory(res.events||[]);
            renderPagination('zbx-hist-pagination','zbx-hist-info',res.total_pages||1,res.page||1,res.total||0,'zbxHistPage');
        });
    }

    window.zbxHistPage   = function(p) { loadHistory(p); };
    window.zbxLoadHistory = function() { zbxHistPage=1; loadHistory(1); };

    function renderHistory(events) {
        var tbody=document.getElementById('zbx-history-tbody');
        if (!tbody) return;
        if (!events.length) {
            tbody.innerHTML='<tr><td colspan="5" class="zbx-empty"><i class="fas fa-info-circle"></i> Kayıt bulunamadı</td></tr>';
            return;
        }
        var html='';
        events.forEach(function(e) {
            var badge=e.value===1
                ?'<span class="zbx-hist-badge zbx-hist-problem">PROBLEM</span>'
                :'<span class="zbx-hist-badge zbx-hist-resolved">ÇÖZÜLDÜ</span>';
            html+='<tr class="zbx-hist-row" onclick="zbxShowHostDetail(\''+escAttr(e.hostid)+'\',\''+escAttr(e.host_name)+'\')">'+
                '<td><strong>'+escHtml(e.host_name)+'</strong></td>'+
                '<td>'+escHtml(e.name)+'</td>'+
                '<td>'+severityBadge(e.severity)+'</td>'+
                '<td>'+badge+'</td>'+
                '<td style="white-space:nowrap;font-size:0.82rem">'+fmtDateTime(e.clock)+'</td>'+
                '</tr>';
        });
        tbody.innerHTML=html;
    }

    // ── Hosts ─────────────────────────────────────────────────────────────────

    function loadHosts() {
        var tbody=document.getElementById('zbx-hosts-tbody');
        if (tbody) tbody.innerHTML='<tr><td colspan="5" class="zbx-empty"><i class="fas fa-spinner fa-spin"></i> Yükleniyor...</td></tr>';
        var params={action:'get_hosts'};
        if (zbxGroupId) params.group_id=zbxGroupId;
        if (zbxSearch)  params.search=zbxSearch;
        api(params, function(res) {
            var list=res.success?(res.hosts||[]):[];
            renderHosts(list);
            var b=document.getElementById('zbx-stat-hosts');
            if (b) b.textContent=list.length;
            var t=document.getElementById('zbx-tab-hosts');
            if (t) t.innerHTML='<i class="fas fa-server"></i> Cihazlar ('+list.length+')';
        });
    }

    function renderHosts(list) {
        var tbody=document.getElementById('zbx-hosts-tbody');
        if (!tbody) return;
        if (!list.length) {
            tbody.innerHTML='<tr><td colspan="5" class="zbx-empty"><i class="fas fa-info-circle"></i> Cihaz bulunamadı</td></tr>';
            return;
        }
        var html='';
        list.forEach(function(h) {
            var st=h.status==='0'
                ?'<span class="zbx-status-up"><i class="fas fa-circle"></i> Aktif</span>'
                :'<span class="zbx-status-down"><i class="fas fa-circle"></i> Pasif</span>';
            html+='<tr class="zbx-host-row" onclick="zbxShowHostDetail(\''+escAttr(h.hostid)+'\',\''+escAttr(h.name)+'\')">'+
                '<td><strong>'+escHtml(h.name)+'</strong></td>'+
                '<td><code style="font-size:0.85rem">'+escHtml(h.main_ip||'-')+'</code></td>'+
                '<td>'+st+'</td>'+
                '<td style="font-size:0.82rem;color:#64748b">'+escHtml((h.group_names||[]).join(', ')||'-')+'</td>'+
                '<td><button class="zbx-detail-btn" onclick="event.stopPropagation();zbxShowHostDetail(\''+escAttr(h.hostid)+'\',\''+escAttr(h.name)+'\')"><i class="fas fa-chart-line"></i> Grafikler</button></td>'+
                '</tr>';
        });
        tbody.innerHTML=html;
    }

    // ── Refresh / Filter ──────────────────────────────────────────────────────

    function loadAll() {
        setRefreshStatus('loading');
        loadAlerts(zbxAlertPage);
        setRefreshStatus('done');
    }

    function setRefreshStatus(state) {
        var el=document.getElementById('zbx-last-update');
        if (!el) return;
        if (state==='loading') el.innerHTML='<i class="fas fa-spinner fa-spin"></i> Yükleniyor...';
        else { var n=new Date(); el.textContent='Son: '+n.getHours().toString().padStart(2,'0')+':'+n.getMinutes().toString().padStart(2,'0')+':'+n.getSeconds().toString().padStart(2,'0'); }
    }

    function startAutoRefresh() {
        stopAutoRefresh();
        zbxRefreshTimer=setInterval(function() {
            var pg=document.getElementById('zabbix-monitor-page');
            if (pg&&pg.style.display!=='none'&&zbxActiveTab==='alerts') loadAlerts(zbxAlertPage);
        }, 60000);
    }
    function stopAutoRefresh() { if (zbxRefreshTimer){clearInterval(zbxRefreshTimer);zbxRefreshTimer=null;} }

    window.zbxApplyFilter = function() {
        var grp=document.getElementById('zbx-group-filter');
        var sev=document.getElementById('zbx-severity-filter');
        var srch=document.getElementById('zbx-search-input');
        zbxGroupId  = grp  ? grp.value  : '';
        zbxSeverity = sev  ? sev.value  : '';
        zbxSearch   = srch ? srch.value.trim() : '';
        zbxAlertPage = 1;
        loadAlerts(1);
        if (zbxActiveTab==='hosts') loadHosts();
    };

    window.zbxRefresh = function() { loadAll(); };

    window.zbxChangeServer = function() {
        var sel=document.getElementById('zbx-server-select');
        if (!sel) return;
        zbxServerId=sel.value;
        zbxGroupId=zbxSeverity=zbxSearch='';
        zbxAlertPage=zbxHistPage=1; zbxHistTotal=0;
        document.querySelectorAll('.zbx-group-filter').forEach(function(el){el.innerHTML='<option value="">Tüm Gruplar</option>';});
        if (zbxServerId){loadGroups();loadAll();}
    };

    // ── Init ──────────────────────────────────────────────────────────────────

    window.initZabbixMonitorPage = function() {
        if (!zbxInitialized) {
            zbxInitialized=true;
            zbxSwitchTab('alerts');
            loadServerDropdown(function(){ if(zbxServerId){loadGroups();loadAlerts(1);} });
            startAutoRefresh();
        } else {
            if (zbxServerId) loadAlerts(zbxAlertPage);
        }
    };

    function loadServerDropdown(cb) {
        fetch('/portal/zabbix-api.php?action=get_servers')
            .then(function(r){return r.json();})
            .then(function(res){
                var sel=document.getElementById('zbx-server-select');
                if (!sel){if(cb)cb();return;}
                var servers=(res.servers||[]).filter(function(s){return s.enabled;});
                if (!servers.length){sel.innerHTML='<option value="">-- Sunucu yok --</option>';if(cb)cb();return;}
                sel.innerHTML=servers.map(function(s){return '<option value="'+escAttr(s.id)+'">'+escHtml(s.name)+'</option>';}).join('');
                zbxServerId=servers[0].id; sel.value=zbxServerId;
                if(cb)cb();
            })
            .catch(function(){if(cb)cb();});
    }

    // ── Graph Modal ───────────────────────────────────────────────────────────

    window.zbxShowHostDetail = function(hostid, hostname) {
        if (!hostid) return;
        currentGraphHostId=hostid;
        zbxCurrentPeriod=10800;
        zbxCurrentGraphId=''; zbxCurrentGraphName=''; zbxAllGraphs=[];

        var modal=document.getElementById('zbx-host-modal');
        var title=document.getElementById('zbx-modal-title');
        var body=document.getElementById('zbx-modal-body');
        if (!modal) return;
        title.innerHTML='<i class="fas fa-server"></i> '+escHtml(hostname||hostid);
        body.innerHTML='<div class="zbx-modal-loading"><i class="fas fa-spinner fa-spin"></i> Grafik listesi yükleniyor...</div>';
        modal.style.display='flex';

        api({action:'get_graphs',host_id:hostid}, function(res) {
            if (!res.success){body.innerHTML='<div class="zbx-modal-error"><i class="fas fa-exclamation-triangle"></i> '+escHtml(res.error)+'</div>';return;}
            zbxAllGraphs=res.graphs||[];
            renderGraphList(body, zbxAllGraphs, '');
        });
    };

    function renderGraphList(container, graphs, filter) {
        container.innerHTML=
            '<div class="zbx-graph-search-wrap">'+
            '<input type="text" class="zbx-input" id="zbx-graph-search" placeholder="Grafik adı ara..." oninput="zbxFilterGraphs(this.value)" style="width:100%">'+
            '</div>'+
            '<div id="zbx-graph-list-container"></div>';
        var inp=document.getElementById('zbx-graph-search');
        if (inp) { inp.focus(); inp.value=filter||''; }
        renderFilteredGraphs(graphs, filter||'');
    }

    function renderFilteredGraphs(graphs, filter) {
        var lc=document.getElementById('zbx-graph-list-container');
        if (!lc) return;
        var filtered=filter
            ? graphs.filter(function(g){return g.name.toLowerCase().indexOf(filter.toLowerCase())>=0;})
            : graphs;
        if (!filtered.length) {
            lc.innerHTML='<p style="text-align:center;color:#64748b;padding:20px">Grafik bulunamadı.</p>';
            return;
        }
        var html='<div class="zbx-graph-list">';
        filtered.forEach(function(g){
            html+='<div class="zbx-graph-item" onclick="zbxLoadGraph(\''+escAttr(g.graphid)+'\',\''+escAttr(g.name)+'\')">'+
                '<i class="fas fa-chart-area"></i> '+escHtml(g.name)+
                '</div>';
        });
        lc.innerHTML=html+'</div>';
    }

    window.zbxFilterGraphs = function(val) {
        renderFilteredGraphs(zbxAllGraphs, val);
    };

    window.zbxLoadGraph = function(graphid, graphname) {
        zbxCurrentGraphId   = graphid;
        zbxCurrentGraphName = graphname;
        renderGraphView();
    };

    function renderGraphView() {
        var body=document.getElementById('zbx-modal-body');
        if (!body) return;

        // Period selector HTML
        var periodOpts=PERIOD_OPTIONS.map(function(p){
            return '<option value="'+p.val+'"'+(p.val===zbxCurrentPeriod?' selected':'')+'>'+p.label+'</option>';
        }).join('');

        body.innerHTML=
            '<div class="zbx-graph-toolbar">'+
            '<button class="zbx-btn zbx-btn-cancel" style="padding:5px 12px;font-size:0.82rem" onclick="zbxShowHostDetail(\''+escAttr(currentGraphHostId)+'\',\'\')">'+
            '<i class="fas fa-arrow-left"></i> Geri</button>'+
            '<span class="zbx-graph-title">'+escHtml(zbxCurrentGraphName)+'</span>'+
            '<div style="display:flex;align-items:center;gap:6px;margin-left:auto">'+
            '<label style="font-size:0.82rem;color:#64748b;white-space:nowrap"><i class="fas fa-clock"></i> Zaman:</label>'+
            '<select class="zbx-select" id="zbx-period-select" onchange="zbxChangePeriod(this.value)" style="font-size:0.82rem">'+periodOpts+'</select>'+
            '</div>'+
            '</div>'+
            '<div id="zbx-graph-canvas-wrap" class="zbx-graph-canvas-wrap"><div class="zbx-modal-loading"><i class="fas fa-spinner fa-spin"></i> Grafik yükleniyor...</div></div>';

        fetchAndRenderGraph();
    }

    window.zbxChangePeriod = function(val) {
        zbxCurrentPeriod=parseInt(val)||10800;
        var wrap=document.getElementById('zbx-graph-canvas-wrap');
        if (wrap) wrap.innerHTML='<div class="zbx-modal-loading"><i class="fas fa-spinner fa-spin"></i> Grafik yükleniyor...</div>';
        fetchAndRenderGraph();
    };

    function fetchAndRenderGraph() {
        api({action:'get_graph_data', graph_id:zbxCurrentGraphId, period:zbxCurrentPeriod}, function(res) {
            var wrap=document.getElementById('zbx-graph-canvas-wrap');
            if (!wrap) return;
            if (!res.success){wrap.innerHTML='<div class="zbx-modal-error"><i class="fas fa-exclamation-triangle"></i> '+escHtml(res.error)+'</div>';return;}
            renderSvgGraph(wrap, res.series||[], res.from, res.till);
        });
    }

    // ── SVG Chart ─────────────────────────────────────────────────────────────

    function renderSvgGraph(container, series, fromTs, tillTs) {
        var active=series.filter(function(s){return s.points&&s.points.length>0;});
        active.sort(function(a,b){return (a.sortorder||0)-(b.sortorder||0);});

        if (!active.length) {
            container.innerHTML='<p style="text-align:center;color:#64748b;padding:32px">Bu dönem için veri bulunamadı.</p>';
            return;
        }

        var W=900, H=320;
        var padL=70, padR=24, padT=24, padB=active.length>1?56:40;
        var plotW=W-padL-padR, plotH=H-padT-padB;

        var allVals=[];
        active.forEach(function(s){s.points.forEach(function(p){allVals.push(p[1]);});});
        var vMin=Math.min.apply(null,allVals), vMax=Math.max.apply(null,allVals);
        if (vMin===vMax){vMin=0;vMax=vMax||1;}
        var vPad=(vMax-vMin)*0.08;
        vMin=Math.max(0,vMin-vPad); vMax=vMax+vPad;

        function tx(ts){return padL+((ts-fromTs)/(tillTs-fromTs))*plotW;}
        function ty(v) {return padT+plotH-((v-vMin)/(vMax-vMin))*plotH;}

        function fmtVal(v) {
            var u=active[0].units||'';
            if(u==='%') return v.toFixed(1)+'%';
            if(u==='B'){if(v>=1073741824)return (v/1073741824).toFixed(1)+'G';if(v>=1048576)return (v/1048576).toFixed(1)+'M';if(v>=1024)return (v/1024).toFixed(1)+'K';return v.toFixed(0);}
            if(u==='bps'||u==='Bps'){if(v>=1000000)return (v/1000000).toFixed(1)+'M';if(v>=1000)return (v/1000).toFixed(1)+'K';return v.toFixed(0);}
            if(v>=1000000000)return (v/1000000000).toFixed(1)+'G';
            if(v>=1000000)return (v/1000000).toFixed(1)+'M';
            if(v>=1000)return (v/1000).toFixed(1)+'K';
            return v.toFixed(v%1?2:0)+(u?' '+u:'');
        }
        function fmtTime(ts){
            var d=new Date(ts*1000);
            var period=tillTs-fromTs;
            if(period>=86400) return (d.getMonth()+1)+'/'+d.getDate()+' '+d.getHours().toString().padStart(2,'0')+':00';
            return d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0');
        }

        var svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+W+' '+H+'" style="width:100%;height:auto;display:block">';

        // Grid bg
        svg+='<rect x="'+padL+'" y="'+padT+'" width="'+plotW+'" height="'+plotH+'" fill="#fafbfc" rx="2"/>';

        // Horizontal grid
        svg+='<g stroke="#e8ecf0" stroke-width="1">';
        for(var i=0;i<=5;i++){var gy=padT+(plotH/5)*i;svg+='<line x1="'+padL+'" y1="'+gy.toFixed(1)+'" x2="'+(padL+plotW)+'" y2="'+gy.toFixed(1)+'">';}
        svg+='</g>';

        // Vertical grid (lighter)
        svg+='<g stroke="#f0f2f5" stroke-width="1">';
        for(var i=1;i<6;i++){var gx=padL+(plotW/6)*i;svg+='<line x1="'+gx.toFixed(1)+'" y1="'+padT+'" x2="'+gx.toFixed(1)+'" y2="'+(padT+plotH)+'">';}
        svg+='</g>';

        // Y labels
        svg+='<g font-size="11" fill="#7f8c8d" text-anchor="end" font-family="monospace">';
        for(var i=0;i<=5;i++){var v=vMin+(vMax-vMin)*(1-i/5);var gy=padT+(plotH/5)*i;svg+='<text x="'+(padL-8)+'" y="'+(gy+4).toFixed(1)+'">'+fmtVal(v)+'</text>';}
        svg+='</g>';

        // X labels
        svg+='<g font-size="11" fill="#7f8c8d" text-anchor="middle" font-family="sans-serif">';
        for(var i=0;i<=6;i++){var ts=fromTs+(tillTs-fromTs)*(i/6);var gx=padL+(plotW/6)*i;svg+='<text x="'+gx.toFixed(1)+'" y="'+(padT+plotH+18)+'">'+fmtTime(ts)+'</text>';}
        svg+='</g>';

        // Series
        active.forEach(function(s) {
            if (!s.points.length) return;
            var pts=s.points.map(function(p){return tx(p[0]).toFixed(1)+','+ty(p[1]).toFixed(1);}).join(' ');
            var c=s.color||'#4f46e5';
            if(s.points.length>1){
                var fp=s.points[0],lp=s.points[s.points.length-1];
                svg+='<polygon points="'+tx(fp[0]).toFixed(1)+','+(padT+plotH)+' '+pts+' '+tx(lp[0]).toFixed(1)+','+(padT+plotH)+'" fill="'+c+'" fill-opacity="0.08" stroke="none"/>';
            }
            svg+='<polyline points="'+pts+'" fill="none" stroke="'+c+'" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
        });

        // Border
        svg+='<rect x="'+padL+'" y="'+padT+'" width="'+plotW+'" height="'+plotH+'" fill="none" stroke="#d1d9e0" stroke-width="1" rx="2"/>';

        // Legend
        if(active.length>1){
            var lx=padL, ly=padT+plotH+32, cols=0;
            active.slice(0,10).forEach(function(s){
                var label=s.name.length>35?s.name.substring(0,35)+'…':s.name;
                var w=Math.min(200,label.length*6.5+28);
                if(lx+w>W-padR&&cols>0){lx=padL;ly+=14;cols=0;}
                svg+='<rect x="'+lx+'" y="'+(ly-4)+'" width="14" height="4" rx="2" fill="'+(s.color||'#4f46e5')+'"/>';
                svg+='<text x="'+(lx+18)+'" y="'+ly+'" font-size="10" fill="#475569" font-family="sans-serif">'+escHtml(label)+'</text>';
                lx+=w; cols++;
            });
        }

        svg+='</svg>';
        container.innerHTML=svg;
    }

    window.closeZabbixHostModal = function() {
        var m=document.getElementById('zbx-host-modal'); if(m) m.style.display='none';
        currentGraphHostId=''; zbxAllGraphs=[];
    };

    // ── Settings ──────────────────────────────────────────────────────────────

    window.initZabbixSettings = function() { loadZabbixServerList(); };

    function loadZabbixServerList() {
        var containers = [
            document.getElementById('zbx-monitor-settings-list'),
            document.getElementById('zbx-settings-list'),
        ].filter(Boolean);
        if (!containers.length) return;
        containers.forEach(function(c){ c.innerHTML='<div style="padding:10px;color:#64748b"><i class="fas fa-spinner fa-spin"></i> Yükleniyor...</div>'; });
        fetch('/portal/zabbix-api.php?action=get_servers')
            .then(function(r){return r.json();})
            .then(function(res){
                containers.forEach(function(c){
                    if(!res.success){c.innerHTML='<div style="padding:10px;color:#e53935">'+escHtml(res.error)+'</div>';return;}
                    renderServerList(c,res.servers||[]);
                });
            });
    }

    function renderServerList(container, servers) {
        if (!servers.length){container.innerHTML='<p style="padding:10px;color:#64748b">Henüz sunucu eklenmemiş.</p>';return;}
        var html='<table class="zbx-settings-table"><thead><tr><th>Ad</th><th>URL</th><th>Gruplar</th><th>Durum</th><th>İşlem</th></tr></thead><tbody>';
        servers.forEach(function(s){
            html+='<tr>'+
                '<td><strong>'+escHtml(s.name)+'</strong><br><code style="font-size:0.78rem;color:#64748b">'+escHtml(s.id)+'</code></td>'+
                '<td style="font-size:0.85rem">'+escHtml(s.url)+'</td>'+
                '<td style="font-size:0.78rem;color:#475569">'+escHtml((s.groups||[]).join(', ')||'-')+'</td>'+
                '<td>'+(s.enabled?'<span style="color:#16a34a;font-weight:600">Aktif</span>':'<span style="color:#dc2626;font-weight:600">Pasif</span>')+'</td>'+
                '<td style="white-space:nowrap">'+
                '<button class="zbx-settings-btn zbx-btn-test" onclick="zbxTestServer(\''+escAttr(s.id)+'\')"><i class="fas fa-plug"></i> Test</button> '+
                '<button class="zbx-settings-btn zbx-btn-edit" onclick="zbxEditServer(\''+escAttr(s.id)+'\')"><i class="fas fa-edit"></i> Düzenle</button> '+
                '<button class="zbx-settings-btn zbx-btn-del" onclick="zbxDeleteServer(\''+escAttr(s.id)+'\',\''+escAttr(s.name)+'\')"><i class="fas fa-trash"></i></button>'+
                '</td></tr>';
        });
        container.innerHTML=html+'</tbody></table>';
    }

    window.zbxTestServer = function(id) {
        var btn=event.target.closest('button');
        if(btn){btn.disabled=true;btn.innerHTML='<i class="fas fa-spinner fa-spin"></i>';}
        fetch('/portal/zabbix-api.php?action=test_server&id='+encodeURIComponent(id))
            .then(function(r){return r.json();})
            .then(function(res){
                if(btn){btn.disabled=false;btn.innerHTML='<i class="fas fa-plug"></i> Test';}
                alert(res.success?'Bağlantı başarılı! Versiyon: '+res.version:'Hata: '+res.error);
            });
    };
    window.zbxDeleteServer = function(id,name) {
        if(!confirm('"'+name+'" sunucusunu silmek istediğinizden emin misiniz?')) return;
        fetch('/portal/zabbix-api.php?action=delete_server&id='+encodeURIComponent(id))
            .then(function(r){return r.json();})
            .then(function(res){if(res.success)loadZabbixServerList();else alert('Hata: '+res.error);});
    };
    window.zbxEditServer = function(id) {
        fetch('/portal/zabbix-api.php?action=get_servers')
            .then(function(r){return r.json();})
            .then(function(res){var s=(res.servers||[]).find(function(x){return x.id===id;});if(!s){alert('Sunucu bulunamadı');return;}zbxOpenServerModal(s);});
    };
    window.zbxNewServer  = function() { zbxOpenServerModal(null); };
    window.zbxSaveServer = function() {
        var id=document.getElementById('zbx-form-id').value.trim().toLowerCase();
        var name=document.getElementById('zbx-form-name').value.trim();
        var url=document.getElementById('zbx-form-url').value.trim();
        var username=document.getElementById('zbx-form-username').value.trim();
        var token=document.getElementById('zbx-form-token').value.trim();
        var groups=document.getElementById('zbx-form-groups').value.split('\n').map(function(g){return g.trim();}).filter(Boolean);
        var enabled=document.getElementById('zbx-form-enabled').checked;
        if(!id||!name||!url){alert('ID, Ad ve URL zorunludur');return;}
        fetch('/portal/zabbix-api.php?action=save_server',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,name,url,username,token,groups,enabled})})
            .then(function(r){return r.json();})
            .then(function(res){if(res.success){closeZabbixServerModal();loadZabbixServerList();}else alert('Hata: '+res.error);});
    };
    function zbxOpenServerModal(s) {
        var m=document.getElementById('zbx-server-edit-modal');if(!m)return;
        document.getElementById('zbx-form-id').value=s?s.id:'';
        document.getElementById('zbx-form-name').value=s?s.name:'';
        document.getElementById('zbx-form-url').value=s?s.url:'';
        document.getElementById('zbx-form-username').value=s?(s.username||''):'';
        document.getElementById('zbx-form-token').value='';
        document.getElementById('zbx-form-token').placeholder=s?'(değiştirmek için yaz)':'Token veya şifre';
        document.getElementById('zbx-form-groups').value=s?(s.groups||[]).join('\n'):'';
        document.getElementById('zbx-form-enabled').checked=s?!!s.enabled:true;
        document.getElementById('zbx-form-id').readOnly=!!s;
        m.style.display='flex';
    }
    window.closeZabbixServerModal = function() { var m=document.getElementById('zbx-server-edit-modal');if(m)m.style.display='none'; };

    document.addEventListener('keydown',function(e){if(e.key==='Escape'){closeZabbixHostModal();closeZabbixServerModal();}});
    window.zbxLoadAll = function(){loadAll();};

})();
