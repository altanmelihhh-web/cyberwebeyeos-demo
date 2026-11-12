// CWE_PUPPETEER=/path/to/puppeteer-core node tests/demo-files.browser.cjs [base-url]
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const puppeteer = require(process.env.CWE_PUPPETEER || 'puppeteer-core');
const base = process.argv[2] || 'http://127.0.0.1:8766/';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: process.env.CWE_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true, args: ['--no-sandbox']
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1000 });
    const failures = [], errors = [];
    page.on('response', r => { if (r.status() === 404) failures.push(r.url()); });
    page.on('pageerror', e => errors.push(e.message));
    const downloads = fs.mkdtempSync(path.join(os.tmpdir(), 'cwe-downloads-'));
    const cdp = await page.createCDPSession();
    await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads });
    await page.goto(base, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.evaluate(() => showPage('dokumanlar'));
    await page.waitForFunction(() => document.querySelectorAll('#files-grid .document-card').length >= 6);
    const docs = await page.evaluate(() => DocMgmt.allDocuments);
    assert(docs.some(d => d.type === 'jpeg'), 'JPEG topology is listed');
    assert(docs.some(d => d.type === 'docx'), 'Word document is listed');
    assert(docs.some(d => d.type === 'csv'), 'CSV inventory is listed');
    for (const doc of docs) {
      await page.click(`#files-grid [data-doc-id="${doc.id}"] .view-btn`);
      if (doc.type === 'jpeg') {
        await page.waitForFunction(() => document.querySelector('#preview-body img')?.naturalWidth > 0);
      } else if (doc.type === 'docx') {
        await page.waitForFunction(() => document.querySelector('#preview-body')?.innerText.includes('Amaç ve kapsam'));
      } else if (doc.type === 'csv') {
        await page.waitForFunction(() => document.querySelector('#preview-body td') && document.querySelector('#preview-body').innerText.includes('core-sw-01'));
      } else if (doc.type === 'pdf') {
        const iframe = await page.$('#preview-body iframe');
        assert(iframe, 'PDF preview uses a real file');
        assert((await iframe.evaluate(el => el.src)).endsWith('.pdf'));
      } else {
        await page.waitForFunction(() => document.querySelector('#preview-body')?.innerText.length > 200);
      }
      await page.evaluate(() => DocMgmt.closePreview());
      await page.click(`#files-grid [data-doc-id="${doc.id}"] .download-btn`);
      for (let tries = 0; tries < 100 && !fs.existsSync(path.join(downloads, doc.name)); tries++) await pause(100);
      const bytes = fs.readFileSync(path.join(downloads, doc.name));
      assert(bytes.length > 100, `${doc.name} contains real content`);
      if (doc.type === 'docx') assert.equal(bytes.subarray(0, 2).toString(), 'PK');
      if (doc.type === 'pdf') assert.equal(bytes.subarray(0, 4).toString(), '%PDF');
      if (doc.type === 'jpeg') assert.equal(bytes.readUInt16BE(0), 0xffd8);
      console.log('Preview and download OK:', doc.name);
    }
    await page.evaluate(() => showPage('backuplar'));
    await page.waitForSelector('#backups-grid .backup-file-card');
    const backups = await page.evaluate(async () => (await (await fetch('get-backups.php')).json()).files);
    for (const file of backups) {
      await page.click(`#backups-grid .backup-file-card[onclick*="${file.file_id}"]`);
      await page.waitForFunction(name => document.querySelector('#backup-preview-title')?.innerText.includes(name), {}, file.name);
      await page.waitForFunction(() => document.querySelector('#backup-preview-content pre')?.innerText.length > 100);
      const content = await page.$eval('#backup-preview-content pre', el => el.innerText);
      assert(content.includes(file.name.startsWith('core') ? 'hostname core-sw-01' : 'set hostname "edge-fw-01"'));
      await page.click('#backup-preview-modal button[onclick="downloadBackupFromPreview()"]');
      for (let tries = 0; tries < 100 && !fs.existsSync(path.join(downloads, file.name)); tries++) await pause(100);
      assert.equal(fs.readFileSync(path.join(downloads, file.name), 'utf8'), content);
      await page.evaluate(() => closeBackupPreview());
      console.log('Backup preview and download OK:', file.name);
    }
    await page.evaluate(() => showPage('useful-links'));
    await page.waitForFunction(() => typeof UsefulLinks !== 'undefined' && UsefulLinks.allLinks.length >= 9);
    const links = await page.evaluate(() => UsefulLinks.allLinks);
    assert(links.every(l => /^https:\/\//.test(l.url) && !l.url.includes('example.com')));
    console.log('Official useful links:', links.length);
    for (const width of [1920, 1440, 820, 390]) {
      await page.setViewport({ width, height: 1000 });
      for (const route of ['dokumanlar', 'backuplar']) {
        await page.evaluate(r => showPage(r), route);
        await pause(150);
        const size = await page.evaluate(() => {
          const main = document.querySelector('.main-content');
          const layout = [...document.querySelectorAll('.content-page')].find(el => getComputedStyle(el).display !== 'none').querySelector('.documents-layout');
          return { main: main.clientWidth, layout: layout.getBoundingClientRect().width, height: layout.getBoundingClientRect().height, page: document.documentElement.scrollWidth, viewport: innerWidth };
        });
        assert(size.layout >= size.main - 24, `${route} uses available width at ${width}px`);
        assert(size.page <= size.viewport + 1, `${route} has no page overflow at ${width}px`);
        if (width > 768) assert(size.height >= 900, `${route} fills available page height`);
      }
    }
    assert.deepEqual(failures, [], 'No 404 responses');
    assert.deepEqual(errors, [], 'No uncaught page errors');
    for (const query of ['id=b10f94f86e390abeb8f47854dbe921ef', 'jira=DEMO-1001']) {
      await page.goto(new URL('_api/preview-task.html?' + query, base).href, { waitUntil: 'networkidle2' });
      await page.waitForSelector('#details dd');
      assert((await page.$eval('#details', el => el.innerText)).length > 100);
    }
    assert.deepEqual(failures, [], 'Task details have no 404 responses');
    console.log('PASS: previews, downloads, official links and responsive full-page layouts');
  } finally { await browser.close(); }
})().catch(err => { console.error(err); process.exitCode = 1; });
