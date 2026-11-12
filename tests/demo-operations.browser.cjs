// CWE_PUPPETEER=/path/to/puppeteer-core node tests/demo-operations.browser.cjs [base-url]
const assert = require('node:assert/strict');
const puppeteer = require(process.env.CWE_PUPPETEER || 'puppeteer-core');
const base = process.argv[2] || 'http://127.0.0.1:8766/';
(async () => {
  const browser = await puppeteer.launch({ executablePath: process.env.CWE_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    const errors = [], missing = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', r => { if (r.status() === 404) missing.push(r.url()); });
    await page.setViewport({ width: 1440, height: 1000 });
    await page.goto(base + '#f5-operations', { waitUntil: 'networkidle2', timeout: 60000 });
    await page.click('.sidebar-menu a[href="#f5-operations"]');
    await page.waitForSelector('#f5-operations-page', { visible: true });
    await page.evaluate(() => { window.__confirms = 0; const confirm = window.confirm; window.confirm = (...args) => { window.__confirms++; return confirm(...args); }; });
    for (const env of ['prod', 'drc', 'test']) {
      await page.click(`.f5-env-btn[onclick*="'${env}'"]`);
      await page.waitForFunction(env => document.querySelector('#f5-operations-page').classList.contains('f5-env-' + env) && document.querySelectorAll('#f5-node-list .f5-node-cb').length === 5 && [...document.querySelectorAll('#f5-node-list .f5-node-cb')].every(el => el.value.endsWith('-' + env)), {}, env);
      await page.evaluate(() => f5ShowTab('pools'));
      await page.waitForFunction(() => document.querySelector('#f5-app-select').options.length > 1);
      const app = await page.$eval('#f5-app-select', el => el.options[1].value);
      await page.select('#f5-app-select', app);
      const pool = await page.$eval('#f5-pool-select', el => el.options[1].value);
      assert(pool.includes('_' + env));
      await page.select('#f5-pool-select', pool);
      await page.waitForFunction(env => document.querySelector('#f5-member-list').style.display !== 'none' && [...document.querySelectorAll('.f5-member-cb')].every(el => el.value.includes('-' + env + ':')), {}, env);
      await page.evaluate(() => f5ShowTab('audit'));
      await page.waitForFunction(env => document.querySelectorAll('#f5-audit-content tbody tr').length > 0 && [...document.querySelectorAll('#f5-audit-content tbody tr')].every(row => row.cells[2].innerText === env.toUpperCase()), {}, env);
      await page.evaluate(() => f5ShowTab('favorites'));
      await page.waitForFunction(env => document.querySelector('#f5-favorites-list').innerText.includes('node-web-01-' + env), {}, env);
      await page.evaluate(() => f5ShowTab('nodes'));
      console.log('F5 environment, pools, members, favorites and audit OK:', env);
    }
    assert.equal(await page.evaluate(() => window.__confirms), 0, 'Demo environment switching does not request confirmation');
    // A slow old response must not overwrite the currently selected environment.
    await page.evaluate(() => {
      const fetch = window.fetch;
      window.fetch = (...args) => fetch(...args).then(async response => {
        if (String(args[0]).includes('f5-api.php') && String(args[0]).includes('env=prod')) await new Promise(r => setTimeout(r, 350));
        return response;
      });
      f5SetEnv('prod', document.querySelector('.f5-env-btn[onclick*="prod"]'));
      f5SetEnv('drc', document.querySelector('.f5-env-btn[onclick*="drc"]'));
    });
    await new Promise(r => setTimeout(r, 650));
    assert(await page.$eval('#f5-node-list', el => el.innerText.includes('node-web-01-drc') && !el.innerText.includes('node-web-01-prod')));

    await page.evaluate(() => showPage('fw-audit-log'));
    await page.waitForFunction(() => document.querySelector('#fw-audit-user').options.length > 1 && document.querySelectorAll('#fw-audit-tbody tr[onclick]').length > 0);
    const fixtures = await page.evaluate(async () => (await (await fetch('_api/firewall-audit-get_logs.json')).json()).logs);
    const session = log => ['login', 'logout'].includes(log.action);
    async function apply(values, expected) {
      await page.evaluate(values => {
        for (const id of ['search', 'user', 'action', 'cfgpath', 'date-from', 'date-to', 'firewall']) document.getElementById('fw-audit-' + id).value = values[id] || '';
      }, values);
      await page.click('#fw-audit-log-page .audit-btn-search');
      await page.waitForFunction(wanted => {
        const rows = [...document.querySelectorAll('#fw-audit-tbody tr[onclick]')];
        return !document.querySelector('#fw-audit-tbody').innerText.includes('Yukleniyor') && rows.length === wanted.length && rows.every(row => wanted.some(log => row.cells[3].innerText === log.action && row.cells[2].innerText.includes(log.user) && row.cells[5].innerText === log.cfgobj && row.cells[1].innerText.includes(log.date)));
      }, {}, expected);
      if (!expected.length) assert((await page.$eval('#fw-audit-tbody', el => el.innerText)).includes('Kayit bulunamadi'));
      else assert((await page.$eval('#fw-audit-pagination-info', el => el.innerText)).includes('Toplam ' + expected.length + ' kayit'));
    }
    const visible = fixtures.filter(log => !session(log));
    await apply({ user: 'ayse.demir' }, visible.filter(l => l.user === 'ayse.demir'));
    await apply({ action: 'Delete' }, visible.filter(l => l.action === 'Delete'));
    await apply({ firewall: 'dmz-fw' }, visible.filter(l => l.fw_slug === 'dmz-fw'));
    await apply({ cfgpath: 'firewall.policy' }, visible.filter(l => l.cfgpath.includes('firewall.policy')));
    await apply({ search: '198.51.100.201' }, visible.filter(l => Object.values(l).some(v => String(v).includes('198.51.100.201'))));
    const date = fixtures[0].date;
    await apply({ 'date-from': date, 'date-to': date }, visible.filter(l => l.date === date));
    const combined = visible.filter(l => l.user === 'admin.fw' && l.action === 'Edit' && l.cfgpath.includes('firewall.policy') && l.fw_slug === 'edge-fw');
    await apply({ user: 'admin.fw', action: 'Edit', cfgpath: 'firewall.policy', firewall: 'edge-fw' }, combined);
    const exported = await page.evaluate(async () => {
      const response = await fetch('/portal/firewall-audit-api.php?action=export_xlsx&user=admin.fw&action_filter=Edit&cfgpath=firewall.policy&fw_slug=edge-fw&hide_sessions=1');
      return { count: Number(response.headers.get('X-Total-Rows')), type: response.headers.get('Content-Type'), text: await response.text() };
    });
    assert.equal(exported.count, combined.length);
    assert(exported.type.includes('ms-excel') && exported.text.includes('<table>'));
    await apply({ search: 'no-such-audit-record' }, []);
    await apply({ action: 'login' }, []);
    await page.click('#fw-audit-session-toggle');
    await page.waitForFunction(count => document.querySelectorAll('#fw-audit-tbody tr[onclick]').length === count, {}, fixtures.filter(l => l.action === 'login').length);
    await page.click('#fw-audit-log-page .audit-btn-clear');
    await page.waitForFunction(count => document.querySelectorAll('#fw-audit-tbody tr[onclick]').length === count, {}, fixtures.length);
    const pagination = await page.evaluate(async () => {
      const response = await fetch('/portal/firewall-audit-api.php?action=get_logs&per_page=2&page=2&hide_sessions=1&action_filter=Edit');
      return response.json();
    });
    assert.equal(pagination.page, 2);
    assert.equal(pagination.logs.length, 2);
    assert(pagination.logs.every(l => l.action === 'Edit'));
    assert.equal(pagination.total, visible.filter(l => l.action === 'Edit').length);
    assert.deepEqual(errors, []);
    assert.deepEqual(missing, []);
    console.log('PASS: F5 switching, stale responses, all firewall filters, reset, sessions, export and pagination');
  } finally { await browser.close(); }
})().catch(err => { console.error(err); process.exitCode = 1; });
