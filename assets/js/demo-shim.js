/* Cyberwebeyeos static demo shim.
 * This page was rendered by the real application; there is no backend here.
 * GET requests to known captured endpoints are answered from files captured
 * at build time. Matching is done by base path, and — for multi-action
 * endpoints — by the "action" query parameter (ignoring other params like
 * pagination/filters, since those vary per real call but our capture is a
 * single fixed snapshot). Anything else returns a 404 JSON payload plus a
 * toast; writes return 403 except the small POST_OK list (simulated success);
 * confirm()/alert()/form submits show a toast.
 * Nothing fails silently.
 */
(function () {
  // basePath -> captured JSON (used when the request has no action= param,
  // or the endpoint doesn't branch by action)
  var CAPTURED_BARE = {
    'get-certificates.php': '_api/get-certificates.json',
    'get-tasks.php': '_api/get-tasks.json',
    'get-librenms-instances.php': '_api/get-librenms-instances.json',
    'get-librenms-devices.php': '_api/get-librenms-devices.json',
    'get-folders.php': '_api/get-folders.json',
    'get-links.php': '_api/get-links.json',
    'get-backups.php': '_api/get-backups.json',
    'get-jira-issues.php': '_api/get-jira-issues.json',
    'get-documents.php': '_api/get-documents.json',
    'get-cert-settings.php': '_api/get-cert-settings.json',
    'get-backup-directories.php': '_api/get-backup-directories.json',
    'get-librenms-maps.php': '_api/get-librenms-maps.json',
    'get-certificate-status.php': '_api/get-certificate-status.json',
    'dashboard-api-manager.php': '_api/dashboard-api-manager.json',
    'get-settings.php': '_api/get-settings.json',
    'get-security-stats.php': '_api/get-security-stats.json',
    'get-automation-rules.php': '_api/get-automation-rules.json',
    'get-lockout-status.php': '_api/get-lockout-status.json',
    'user-management.php': '_api/user-management.json',
    'api/cert-acme.php': '_api/cert-acme-providers.json',
    'alerts-api.php': '_api/alerts-api.json',
    'f5-api.php': '_api/f5-get_pools.json',
    'fireaudit-api.php': '_api/fa/fa-stats.json',
    'api/lifecycle-status.php': '_api/lifecycle-status.json',
    'api/reputation-status.php': '_api/reputation-summary.json',
    'portal-audit-api.php': '_api/portal-audit-get_logs.json',
    'firewall-audit-api.php': '_api/firewall-audit-get_logs.json',
    'zabbix-api.php': '_api/zabbix-get_problems.json',
    'dashboard-layout.php': '_api/dashboard-layout.json',
    'api-manager.php': '_api/api-manager.json',
    'get-customer-issues.php': '_api/get-customer-issues.json',
    'get-apis.php': '_api/get-apis.json',
    'get-backup-status.php': '_api/get-backup-status.json',
    'get-librenms-health.php': '_api/get-librenms-health.json',
    'librenms-proxy.php': '_api/librenms-clearcache.json',
    'api/doc-tags.php': '_api/doc-tags.json',
    'api/doc-comments.php': '_api/doc-comments.json',
    'api/doc-favorites.php': '_api/doc-favorites.json',
    'api/doc-views.php': '_api/doc-views.json',
    'api/doc-search.php': '_api/doc-search.json',
    'api/classification-rules.php': '_api/classification-rules.json',
    'get-trash.php': '_api/get-trash.json',
    'api/cert-history.php': '_api/cert-history.json',
    'api/cert-renewal-status.php': '_api/cert-renewal-status.json',
    'api/cert-chain-status.php': '_api/cert-chain-status.json',
    'api/cert-f5-discover.php': '_api/cert-f5-discover.json',
    'get-f5-credential-settings.php': '_api/get-f5-credential-settings.json',
    'get-tokens.php': '_api/get-tokens.json',
    'get-token-value.php': '_api/get-token-value.json',
    'get-webhook-logs.php': '_api/get-webhook-logs.json',
    'get-jira-settings.php': '_api/get-jira-settings.json',
    'get-task.php': '_api/get-task.json'
  };
  // "basePath::action" -> captured JSON (checked first, wins over bare match)
  var CAPTURED_BY_ACTION = {
    'f5-api.php::get_pools': '_api/f5-get_pools.json',
    'f5-api.php::get_nodes': '_api/f5-get_nodes.json',
    'f5-api.php::get_audit_log': '_api/f5-get_audit_log.json',
    'f5-api.php::get_favorites': '_api/f5-get_favorites.json',
    'fireaudit-api.php::stats': '_api/fa/fa-stats.json',
    'fireaudit-api.php::policies': '_api/fa/fa-policies.json',
    'fireaudit-api.php::findings': '_api/fa/fa-findings.json',
    'fireaudit-api.php::system_info': '_api/fa/fa-system_info.json',
    'fireaudit-api.php::cis': '_api/fa/fa-cis.json',
    'fireaudit-api.php::executive': '_api/fa/fa-executive.json',
    'fireaudit-api.php::firewalls': '_api/fireaudit-firewalls.json',
    'fireaudit-api.php::ack': '_api/fa/fa-ack.json',
    'fireaudit-api.php::ack_cleanup': '_api/fa/fa-ack_cleanup.json',
    'fireaudit-api.php::ack_history': '_api/fa/fa-ack_history.json',
    'fireaudit-api.php::ack_import': '_api/fa/fa-ack_import.json',
    'fireaudit-api.php::ack_list': '_api/fa/fa-ack_list.json',
    'fireaudit-api.php::admins': '_api/fa/fa-admins.json',
    'fireaudit-api.php::attack_paths': '_api/fa/fa-attack_paths.json',
    'fireaudit-api.php::blast_radius': '_api/fa/fa-blast_radius.json',
    'fireaudit-api.php::central_nat': '_api/fa/fa-central_nat.json',
    'fireaudit-api.php::cli_command': '_api/fa/fa-cli_command.json',
    'fireaudit-api.php::complexity': '_api/fa/fa-complexity.json',
    'fireaudit-api.php::complexity_mergeable': '_api/fa/fa-complexity_mergeable.json',
    'fireaudit-api.php::complexity_trend': '_api/fa/fa-complexity_trend.json',
    'fireaudit-api.php::compliance_report': '_api/fa/fa-compliance_report.json',
    'fireaudit-api.php::config_diff': '_api/fa/fa-config_diff.json',
    'fireaudit-api.php::config_snapshots': '_api/fa/fa-config_snapshots.json',
    'fireaudit-api.php::cross_fw': '_api/fa/fa-cross_fw.json',
    'fireaudit-api.php::cross_fw_dr_gap': '_api/fa/fa-cross_fw_dr_gap.json',
    'fireaudit-api.php::cross_fw_dr_pairs': '_api/fa/fa-cross_fw_dr_pairs.json',
    'fireaudit-api.php::dashboard_summary': '_api/fa/fa-dashboard_summary.json',
    'fireaudit-api.php::device_test': '_api/fa/fa-device_test.json',
    'fireaudit-api.php::diff': '_api/fa/fa-diff.json',
    'fireaudit-api.php::duplicate_objects': '_api/fa/fa-duplicate_objects.json',
    'fireaudit-api.php::duplicates': '_api/fa/fa-duplicates.json',
    'fireaudit-api.php::global_attack_paths': '_api/fa/fa-global_attack_paths.json',
    'fireaudit-api.php::global_blast_radius': '_api/fa/fa-global_blast_radius.json',
    'fireaudit-api.php::global_topology': '_api/fa/fa-global_topology.json',
    'fireaudit-api.php::hitcount': '_api/fa/fa-hitcount.json',
    'fireaudit-api.php::implicit_trust': '_api/fa/fa-implicit_trust.json',
    'fireaudit-api.php::implicit_trust_dry_run': '_api/fa/fa-implicit_trust_dry_run.json',
    'fireaudit-api.php::implicit_trust_patterns': '_api/fa/fa-implicit_trust_patterns.json',
    'fireaudit-api.php::implicit_trust_yaml': '_api/fa/fa-implicit_trust_yaml.json',
    'fireaudit-api.php::intelligence': '_api/fa/fa-intelligence.json',
    'fireaudit-api.php::interfaces': '_api/fa/fa-interfaces.json',
    'fireaudit-api.php::lateral_movement': '_api/fa/fa-lateral_movement.json',
    'fireaudit-api.php::local_users': '_api/fa/fa-local_users.json',
    'fireaudit-api.php::nat_shadows': '_api/fa/fa-nat_shadows.json',
    'fireaudit-api.php::network_aaa_users': '_api/fa/fa-network_aaa_users.json',
    'fireaudit-api.php::network_config_backup': '_api/fa/fa-network_config_backup.json',
    'fireaudit-api.php::network_cron_runs': '_api/fa/fa-network_cron_runs.json',
    'fireaudit-api.php::network_device_log': '_api/fa/fa-network_device_log.json',
    'fireaudit-api.php::network_findings': '_api/fa/fa-network_findings.json',
    'fireaudit-api.php::network_iface_audit': '_api/fa/fa-network_iface_audit.json',
    'fireaudit-api.php::network_logging': '_api/fa/fa-network_logging.json',
    'fireaudit-api.php::network_management': '_api/fa/fa-network_management.json',
    'fireaudit-api.php::network_port_security': '_api/fa/fa-network_port_security.json',
    'fireaudit-api.php::network_routing_sec': '_api/fa/fa-network_routing_sec.json',
    'fireaudit-api.php::network_stp': '_api/fa/fa-network_stp.json',
    'fireaudit-api.php::network_sync_history': '_api/fa/fa-network_sync_history.json',
    'fireaudit-api.php::network_vlans': '_api/fa/fa-network_vlans.json',
    'fireaudit-api.php::ordering_anomalies': '_api/fa/fa-ordering_anomalies.json',
    'fireaudit-api.php::query': '_api/fa/fa-query.json',
    'fireaudit-api.php::raw_config': '_api/fa/fa-raw_config.json',
    'fireaudit-api.php::remediation': '_api/fa/fa-remediation.json',
    'fireaudit-api.php::report': '_api/fa/fa-report.json',
    'fireaudit-api.php::routes': '_api/fa/fa-routes.json',
    'fireaudit-api.php::routing_protocols': '_api/fa/fa-routing_protocols.json',
    'fireaudit-api.php::rule': '_api/fa/fa-rule.json',
    'fireaudit-api.php::rule_audit': '_api/fa/fa-rule_audit.json',
    'fireaudit-api.php::saved_views': '_api/fa/fa-saved_views.json',
    'fireaudit-api.php::scoring_breakdown': '_api/fa/fa-scoring_breakdown.json',
    'fireaudit-api.php::scoring_zone_trust': '_api/fa/fa-scoring_zone_trust.json',
    'fireaudit-api.php::segmentation': '_api/fa/fa-segmentation.json',
    'fireaudit-api.php::settings_cron': '_api/fa/fa-settings_cron.json',
    'fireaudit-api.php::settings_notify': '_api/fa/fa-settings_notify.json',
    'fireaudit-api.php::shaping': '_api/fa/fa-shaping.json',
    'fireaudit-api.php::snapshots': '_api/fa/fa-snapshots.json',
    'fireaudit-api.php::stale_objects': '_api/fa/fa-stale_objects.json',
    'fireaudit-api.php::syslog': '_api/fa/fa-syslog.json',
    'fireaudit-api.php::system_settings': '_api/fa/fa-system_settings.json',
    'fireaudit-api.php::target': '_api/fa/fa-target.json',
    'fireaudit-api.php::topology': '_api/fa/fa-topology.json',
    'fireaudit-api.php::trend': '_api/fa/fa-trend.json',
    'fireaudit-api.php::vip_dnat': '_api/fa/fa-vip_dnat.json',
    'fireaudit-api.php::virtual_servers': '_api/fa/fa-virtual_servers.json',
    'fireaudit-api.php::vpn_all_rules': '_api/fa/fa-vpn_all_rules.json',
    'fireaudit-api.php::vpn_policy_map': '_api/fa/fa-vpn_policy_map.json',
    'fireaudit-api.php::vpns': '_api/fa/fa-vpns.json',
    'fireaudit-api.php::zone_matrix': '_api/fa/fa-zone_matrix.json',
    'fireaudit-api.php::zones': '_api/fa/fa-zones.json',
    'api/lifecycle-status.php::devices': '_api/lifecycle-devices.json',
    'api/lifecycle-status.php::summary': '_api/lifecycle-status.json',
    'dashboard-manager.php::get_layout': '_api/dashboard-manager.json',
    'scan-api.php::get_statistics': '_api/scan-get_statistics.json',
    'scan-api.php::get_findings': '_api/scan-get_findings.json',
    'api/waf-ip-whitelist.php::get_policies': '_api/waf-get_policies.json',
    'api/waf-ip-whitelist.php::get_whitelist_ips': '_api/waf-get_whitelist_ips.json',
    'backup_receiver_prod.php::current': '_api/backup-receiver-prod-current.json',
    'backup_receiver_test.php::current': '_api/backup-receiver-test-current.json',
    'api/reputation-status.php::details': '_api/reputation-details.json',
    'api/reputation-status.php::consensus': '_api/reputation-consensus.json',
    'api/reputation-status.php::runs': '_api/reputation-runs.json',
    'api/reputation-status.php::summary': '_api/reputation-summary.json',
    'api/reputation-status.php::providers': '_api/reputation-providers.json',
    'api/reputation-status.php::active': '_api/reputation-active.json',
    'api/reputation-status.php::assets_list': '_api/reputation-assets_list.json',
    'api/reputation-status.php::references': '_api/reputation-references.json',
    'api/reputation-status.php::exposure': '_api/reputation-exposure.json',
    'api/reputation-status.php::radar_links': '_api/reputation-radar_links.json',
    'api/reputation-status.php::notifications': '_api/reputation-notifications.json',
    'api/reputation-status.php::log_tail': '_api/reputation-log_tail.json',
    'portal-audit-api.php::get_logs': '_api/portal-audit-get_logs.json',
    'portal-audit-api.php::get_stats': '_api/portal-audit-get_stats.json',
    'firewall-audit-api.php::get_logs': '_api/firewall-audit-get_logs.json',
    'firewall-audit-api.php::get_firewalls': '_api/firewall-audit-get_firewalls.json',
    'firewall-audit-api.php::get_users': '_api/firewall-audit-get_users.json',
    'firewall-audit-api.php::get_stats': '_api/firewall-audit-get_stats.json',
    'firewall-audit-api.php::trigger_fetch': '_api/firewall-audit-trigger_fetch.json',
    'zabbix-api.php::get_servers': '_api/zabbix-get_servers.json',
    'zabbix-api.php::get_groups': '_api/zabbix-get_groups.json',
    'zabbix-api.php::get_hosts': '_api/zabbix-get_hosts.json',
    'zabbix-api.php::get_problems': '_api/zabbix-get_problems.json',
    'zabbix-api.php::get_alert_history': '_api/zabbix-get_alert_history.json',
    'zabbix-api.php::get_graphs': '_api/zabbix-get_graphs.json',
    'zabbix-api.php::get_graph_data': '_api/zabbix-get_graph_data.json',
    'zabbix-api.php::test_server': '_api/zabbix-ok.json',
    'dashboard-manager.php::list': '_api/dashboard-manager.json',
    'api-manager.php::list': '_api/api-manager.json',
    'dashboard-layout.php::list': '_api/dashboard-layout.json',
    'ipam-tracking-api.php::get_all': '_api/ipam-tracking-get_all.json',
    'ipam-tracking-api.php::get_by_ip': '_api/ipam-tracking-get_by_ip.json',
    'ipam-tracking-api.php::ping_check': '_api/ipam-tracking-ping_check.json',
    'netbox-api.php::ping': '_api/netbox-ping.json',
    'netbox-api.php::ping_with_mac': '_api/netbox-ping.json',
    'backup_receiver_prod.php::historical': '_api/backup-receiver-prod-historical.json',
    'backup_receiver_test.php::historical': '_api/backup-receiver-test-historical.json',
    'backup_receiver.php::list_logs': '_api/backup-receiver-list_logs.json',
    'backup_receiver.php::read_log': '_api/backup-receiver-read_log.json',
    'backup-compare.php::devices': '_api/backup-compare-devices.json',
    'backup-compare.php::files': '_api/backup-compare-files.json',
    'backup-compare.php::content': '_api/backup-compare-content.json',
    'api/waf-ip-whitelist.php::get_ip_history': '_api/waf-get_ip_history.json',
    'api/waf-ip-whitelist.php::get_shared_ips': '_api/waf-get_shared_ips.json',
    'api/waf-ip-whitelist.php::get_notify_settings': '_api/waf-get_notify_settings.json',
    'api/waf-ip-whitelist.php::list_devices': '_api/waf-list_devices.json',
    'api/waf-ip-whitelist.php::get_report': '_api/waf-get_report.json',
    'f5-api.php::get_members': '_api/f5-get_members.json',
    'f5-api.php::get_ratio': '_api/f5-get_ratio.json',
    'f5-api.php::get_node_stats': '_api/f5-get_node_stats.json',
    'f5-api.php::get_member_stats': '_api/f5-get_member_stats.json',
    'api/v1/automation-config.php::list_apis': '_api/automation-list_apis.json',
    'api/v1/automation-config.php::list_automations': '_api/automation-list_automations.json',
    'user-management.php::get_user': '_api/user-management-get_user.json',
    'fireaudit-api.php::devices': '_api/fireaudit-devices.json'
  };
  // FireScope cihaz profilleri: seçilen cihaza göre farklı veri seti sun
  // (firewall = varsayılan fa/, switch = fa/sw/, router = fa/rtr/)
  var FW_PROFILE = {
    'edge-fw': '', 'core-sw': 'sw/', 'access-sw': 'sw/', 'dell-sw': 'sw/', 'wan-rtr': 'rtr/'
  };
  // Statik demoda "başarılı" simüle edilen POST'lar: base -> { action|'*' -> yakalanmış JSON | null }
  var POST_OK = {
    'refresh-certificate.php': { '*': null },
    'api/cert-discovery-action.php': { '*': null },
    'network-monitor.php': { save_config: null, run_test: null },
    'fireaudit-api.php': { cli_command: '_api/fa/fa-cli_command.json' },
    'f5-api.php': { ltm_logs: '_api/f5-get_ltm_logs.json' }
  };
  // netbox-api.php?action=fetch: endpoint parametresine göre eşleme (ilk eşleşen kazanır)
  var NETBOX_BY_ENDPOINT = [
    ['available-ips', '_api/netbox-available-ips.json'],
    ['ip-addresses/?parent', '_api/netbox-used-ips.json'],
    ['ip-addresses', '_api/netbox-ip-addresses.json'],
    ['prefixes', '_api/netbox-prefixes.json'],
    ['vlans', '_api/netbox-vlans.json']
  ];
  var norm = function (s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); };
  var realFetch = window.fetch ? window.fetch.bind(window) : null;

  function jsonResponse(data, status) {
    return new Response(JSON.stringify(data), {
      status: status || 200, headers: { 'Content-Type': 'application/json' }
    });
  }
  // Files are real static assets, shared by previews and downloads.
  var manifests = {};
  function files(kind) {
    if (!manifests[kind]) {
      manifests[kind] = realFetch('_api/get-' + kind + '.json').then(function (r) {
        if (!r.ok) throw new Error('Dosya listesi yüklenemedi');
        return r.json();
      }).then(function (data) { return data.documents || data.files || []; });
    }
    return manifests[kind];
  }
  function findFile(kind, id) {
    return files(kind).then(function (items) {
      var file = items.find(function (f) {
        return String(f.id) === String(id) || f.file_id === id || f.relativePath === id;
      });
      if (!file || !file.url) throw new Error('Bu dosya demo kütüphanesinde bulunamadı.');
      return file;
    });
  }
  window.demoFiles = {
    download: function (url, name) {
      var link = document.createElement('a');
      link.href = url;
      link.download = name || '';
      document.body.appendChild(link);
      link.click();
      link.remove();
    },
    downloadBackup: function (id) {
      return findFile('backups', id).then(function (file) {
        window.demoFiles.download(file.url, file.name);
      }).catch(function (err) { toast(err.message); });
    }
  };

  function parse(url) {
    var full;
    try { full = new URL(url, window.location.href); }
    catch (e) { full = null; }
    if (!full) return { base: String(url).replace(/^\.?\//, '').split('?')[0], action: null };
    var base = full.pathname.replace(window.location.pathname.replace(/[^/]*$/, ''), '').replace(/^\/+/, '');
    base = base.replace(/^portal\//, '');
    return {
      base: base,
      action: full.searchParams.get('action'),
      fwSlug: full.searchParams.get('fw_slug')
    };
  }

  window.fetch = function (input, init) {
    var raw = typeof input === 'string' ? input : (input && input.url) || '';
    var p = parse(raw);
    var method = ((init && init.method) || 'GET').toUpperCase();

    // Let the browser load actual assets (including binary DOCX/PDF/JPEG files).
    if (!/\.php$/i.test(p.base)) return realFetch(input, init);

    if ((method === 'GET' || method === 'HEAD') &&
        /^(view-document|download-document|get-backup-preview)\.php$/.test(p.base)) {
      var id = new URL(raw, window.location.href).searchParams.get('id');
      var isBackup = p.base === 'get-backup-preview.php';
      return findFile(isBackup ? 'backups' : 'documents', id).then(function (file) {
        return realFetch(file.url).then(function (r) {
          if (!r.ok) throw new Error('Dosya yüklenemedi');
          if (!isBackup) return r;
          return r.text().then(function (content) {
            return jsonResponse({ status: 'success', file: file, preview: { type: 'text', content: content } });
          });
        });
      }).catch(function (err) { return jsonResponse({ error: err.message }, 404); });
    }

    if (method !== 'GET' && method !== 'HEAD') {
      var act = p.action, b = init && init.body;
      if (!act && typeof b === 'string') {
        try { act = JSON.parse(b).action; } catch (e) { act = new URLSearchParams(b).get('action'); }
      }
      var ok = POST_OK[p.base];
      if (ok && (act in ok || '*' in ok)) {
        var f = ok[act] !== undefined ? ok[act] : ok['*'];
        toast('Statik demo — işlem simüle edildi');
        return f && realFetch ? realFetch(f) : Promise.resolve(new Response(
          JSON.stringify({ success: true, message: 'Statik demo — işlem simüle edildi' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }
      return Promise.resolve(new Response(JSON.stringify({
        ok: false, error: 'static_demo',
        detail: 'Bu statik bir demo — yazma işlemleri devre dışı. Gerçek işlevi görmek için uygulamayı yerel olarak çalıştırın.'
      }), { status: 403, headers: { 'Content-Type': 'application/json' } }));
    }
    // FireScope: seçilen cihazın profiline göre (switch/router/firewall) veri seti seç
    if (p.base === 'fireaudit-api.php' && p.action && realFetch) {
      var prof = FW_PROFILE[p.fwSlug || 'edge-fw'];
      if (prof) {
        var profUrl = '_api/fa/' + prof + 'fa-' + p.action + '.json';
        return realFetch(profUrl).then(function (r) {
          if (r.ok) return r;
          // bu cihaz profilinde yoksa genel sete düş
          var fb = CAPTURED_BY_ACTION[p.base + '::' + p.action];
          if (fb) return realFetch(fb);
          return new Response(JSON.stringify({
            success: true, data: [], items: [], results: [], count: 0,
            note: 'Bu alt-özellik bu cihaz için statik demoda yer almıyor.'
          }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        });
      }
    }
    if (p.base === 'netbox-api.php' && p.action === 'fetch' && realFetch) {
      var ep = new URL(raw, window.location.href).searchParams.get('endpoint') || '';
      for (var i = 0; i < NETBOX_BY_ENDPOINT.length; i++)
        if (ep.indexOf(NETBOX_BY_ENDPOINT[i][0]) > -1) return realFetch(NETBOX_BY_ENDPOINT[i][1]);
    }
    // get-jira-issues.php?company=X: sabit yakalamayı şirkete göre süz
    if (p.base === 'get-jira-issues.php' && realFetch) {
      var co = new URL(raw, window.location.href).searchParams.get('company');
      return realFetch(CAPTURED_BARE[p.base]).then(function (r) { return r.json(); }).then(function (d) {
        if (co) ['issues', 'data'].forEach(function (k) {
          if (Array.isArray(d[k])) { d[k] = d[k].filter(function (i) { return norm(i.company) === norm(co); }); d.total = d[k].length; }
        });
        return new Response(JSON.stringify(d), { status: 200, headers: { 'Content-Type': 'application/json' } });
      });
    }
    var key = p.base + '::' + p.action;
    if (p.action && CAPTURED_BY_ACTION[key] && realFetch) {
      return realFetch(CAPTURED_BY_ACTION[key]);
    }
    if (CAPTURED_BARE[p.base] && realFetch) {
      return realFetch(CAPTURED_BARE[p.base]);
    }
    // FireScope'un yakalanmamış onlarca alt-action'ı var (ordering, shadow,
    // routes, syslog, vb.) — hata/404 yerine geçerli ama boş bir cevap dön,
    // sayfa "veri yok" gösterir, kırılmaz.
    if (p.base === 'fireaudit-api.php' && p.action) {
      return Promise.resolve(new Response(JSON.stringify({
        success: true, data: [], items: [], results: [], policies: [], findings: [],
        rules: [], objects: [], count: 0, total: 0,
        note: 'Bu alt-özellik statik demoda henüz doldurulmadı.'
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    }
    toast('Statik demo — bu özellik demo kapsamında değil');
    return Promise.resolve(new Response(JSON.stringify({
      ok: false, error: 'not_captured',
      detail: 'Bu özellik statik demo kapsamında değil.'
    }), { status: 404, headers: { 'Content-Type': 'application/json' } }));
  };

  function toast(msg) {
    if (!document.body) return;
    var el = document.getElementById('cwe-static-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'cwe-static-toast';
      el.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);' +
        'z-index:2147483647;background:#0b2e5b;color:#fff;padding:11px 18px;border-radius:8px;' +
        'font:500 13px/1.45 system-ui,-apple-system,Segoe UI,sans-serif;max-width:min(90vw,32rem);' +
        'box-shadow:0 4px 16px rgba(0,0,0,.3);opacity:0;transition:opacity .18s';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = '1';
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.style.opacity = '0'; }, 4000);
  }

  document.addEventListener('submit', function (e) {
    e.preventDefault();
    toast('Statik demo — formlar devre dışı. Gerçek işlevi görmek için uygulamayı yerel olarak çalıştırın.');
  }, true);

  // Server-only account actions and reports must not navigate to missing PHP pages.
  document.addEventListener('click', function (e) {
    var link = e.target.closest && e.target.closest('a[href]');
    if (!link) return;
    var url = new URL(link.href, window.location.href);
    if (url.origin === window.location.origin && /\.php$/i.test(url.pathname)) {
      e.preventDefault();
      toast('Statik demo — bu işlem canlı uygulamada kullanılabilir.');
    }
  }, true);
  var realOpen = window.open.bind(window);
  window.open = function (url) {
    if (url) {
      var target = new URL(url, window.location.href);
      if (target.origin === window.location.origin && /\.php$/i.test(target.pathname)) {
        toast('Statik demo — bu rapor veya işlem canlı uygulamada kullanılabilir.');
        return null;
      }
    }
    return realOpen.apply(window, arguments);
  };

  // Dashboard "Tümünü Gör" düğmeleri switchToTab() çağırır ama kaynakta tanımlı değil; Görevler sekmesini aç
  window.switchToTab = function (id) {
    var t = document.querySelector('.tab[data-tab="' + (id === 'cab-planned-tasks' ? 'cab-tasks' : id) + '"]');
    if (t) t.click();
  };
  window.confirm = function () { toast('Statik demo — bu işlem devre dışı'); return false; };
  window.alert = function (m) { toast(String(m)); };
})();
