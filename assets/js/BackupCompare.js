/**
 * BackupCompare.js
 * Backup dosyalarını yan yana karşılaştırma aracı.
 * - Cihaz ve dosya seçicileri
 * - LCS tabanlı satır-bazlı diff
 * - Unified / Side-by-side txt indirme
 */

(function () {
    'use strict';

    const state = {
        devicesLoaded: false,
        left:  { device: '', fileId: '', meta: null, lines: [] },
        right: { device: '', fileId: '', meta: null, lines: [] },
        diff:  [],
    };

    // ---------- Modal açma / kapatma ----------

    window.openBackupCompare = function () {
        const modal = document.getElementById('backup-compare-modal');
        if (!modal) return;
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';

        if (!state.devicesLoaded) loadBackupCompareDevices();
    };

    window.closeBackupCompare = function () {
        const modal = document.getElementById('backup-compare-modal');
        if (!modal) return;
        modal.style.display = 'none';
        document.body.style.overflow = '';
    };

    document.addEventListener('click', function (e) {
        const modal = document.getElementById('backup-compare-modal');
        if (modal && e.target === modal) closeBackupCompare();
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            const modal = document.getElementById('backup-compare-modal');
            if (modal && modal.style.display === 'block') closeBackupCompare();
        }
    });

    // ---------- Veri yükleme ----------

    function loadBackupCompareDevices() {
        const leftSel  = document.getElementById('bc-left-device');
        const rightSel = document.getElementById('bc-right-device');
        leftSel.innerHTML  = '<option value="">Yükleniyor...</option>';
        rightSel.innerHTML = '<option value="">Yükleniyor...</option>';

        fetch('backup-compare.php?action=devices', { credentials: 'same-origin' })
            .then(r => r.json())
            .then(data => {
                if (data.status !== 'success') throw new Error(data.message || 'Cihaz listesi alınamadı');

                const html = ['<option value="">Cihaz seçin...</option>'];
                Object.keys(data.groups).sort().forEach(cat => {
                    html.push(`<optgroup label="${escapeHtmlLocal(cat)}">`);
                    data.groups[cat].forEach(d => {
                        const label = `${escapeHtmlLocal(d.device)} (${d.file_count})`;
                        html.push(`<option value="${escapeHtmlLocal(d.value)}">${label}</option>`);
                    });
                    html.push('</optgroup>');
                });

                leftSel.innerHTML  = html.join('');
                rightSel.innerHTML = html.join('');
                state.devicesLoaded = true;
            })
            .catch(err => {
                leftSel.innerHTML  = '<option value="">Hata</option>';
                rightSel.innerHTML = '<option value="">Hata</option>';
                alert('Cihaz listesi alınamadı: ' + err.message);
            });
    }

    window.onBackupCompareDeviceChange = function (side) {
        const deviceSel = document.getElementById(`bc-${side}-device`);
        const fileSel   = document.getElementById(`bc-${side}-file`);
        const device    = deviceSel.value;

        state[side].device = device;
        state[side].fileId = '';
        state[side].meta   = null;
        state[side].lines  = [];

        if (!device) {
            fileSel.innerHTML = '<option value="">Önce cihaz seçin...</option>';
            fileSel.disabled = true;
            return;
        }

        fileSel.innerHTML = '<option value="">Yükleniyor...</option>';
        fileSel.disabled = true;

        fetch('backup-compare.php?action=files&device=' + encodeURIComponent(device), { credentials: 'same-origin' })
            .then(r => r.json())
            .then(data => {
                if (data.status !== 'success') throw new Error(data.message || 'Dosya listesi alınamadı');

                if (!data.files.length) {
                    fileSel.innerHTML = '<option value="">Dosya bulunamadı</option>';
                    return;
                }

                const html = ['<option value="">Tarih seçin...</option>'];
                data.files.forEach(f => {
                    const label = `${f.modified_formatted} — ${f.name} (${f.size_formatted})`;
                    html.push(`<option value="${escapeHtmlLocal(f.file_id)}">${escapeHtmlLocal(label)}</option>`);
                });
                fileSel.innerHTML = html.join('');
                fileSel.disabled = false;

                fileSel.onchange = () => { state[side].fileId = fileSel.value; };
            })
            .catch(err => {
                fileSel.innerHTML = '<option value="">Hata</option>';
                alert('Dosya listesi alınamadı: ' + err.message);
            });
    };

    // ---------- Karşılaştırma ----------

    window.runBackupCompare = function () {
        const leftId  = document.getElementById('bc-left-file').value;
        const rightId = document.getElementById('bc-right-file').value;

        if (!leftId || !rightId) {
            alert('Lütfen hem sol hem de sağ için bir backup dosyası seçin.');
            return;
        }

        const output = document.getElementById('bc-output');
        output.innerHTML = `
            <div style="text-align:center; padding:80px 20px; color:#7f8c8d;">
                <i class="fas fa-sync fa-spin" style="font-size:3em; margin-bottom:15px;"></i>
                <p style="margin:0;">Dosyalar yükleniyor...</p>
            </div>`;

        const url = `backup-compare.php?action=content&left=${encodeURIComponent(leftId)}&right=${encodeURIComponent(rightId)}`;
        fetch(url, { credentials: 'same-origin' })
            .then(r => r.json())
            .then(data => {
                if (data.status !== 'success') throw new Error(data.message || 'İçerik alınamadı');

                if (!data.left.available || !data.right.available) {
                    const missing = [];
                    if (!data.left.available)  missing.push('Sol dosya portal sunucusunda yok');
                    if (!data.right.available) missing.push('Sağ dosya portal sunucusunda yok');
                    output.innerHTML = `
                        <div style="text-align:center; padding:60px 20px; color:#e67e22;">
                            <i class="fas fa-exclamation-triangle" style="font-size:3em; margin-bottom:15px;"></i>
                            <p style="margin:0; font-size:1.05em;">${missing.join('<br>')}</p>
                            <p style="margin-top:10px; color:#7f8c8d; font-size:0.9em;">Backup listesinden "Önizle" ile dosya indirme talebi oluşturabilirsiniz.</p>
                        </div>`;
                    return;
                }

                state.left.meta   = data.left;
                state.right.meta  = data.right;
                state.left.lines  = splitLines(data.left.content);
                state.right.lines = splitLines(data.right.content);

                renderBackupDiff();
            })
            .catch(err => {
                output.innerHTML = `
                    <div style="text-align:center; padding:60px 20px; color:#e74c3c;">
                        <i class="fas fa-times-circle" style="font-size:3em; margin-bottom:15px;"></i>
                        <p style="margin:0;">${escapeHtmlLocal(err.message)}</p>
                    </div>`;
            });
    };

    window.renderBackupDiff = function () {
        if (!state.left.meta || !state.right.meta) return;

        const ignoreWs = document.getElementById('bc-ignore-ws').checked;
        const onlyDiff = document.getElementById('bc-only-diff').checked;

        const norm = s => ignoreWs ? s.replace(/\s+/g, ' ').trim() : s;
        const a = state.left.lines;
        const b = state.right.lines;

        state.diff = diffLines(a, b, norm);

        // Özet
        let added = 0, removed = 0, changed = 0, equal = 0;
        state.diff.forEach(op => {
            if (op.type === 'equal')    equal++;
            if (op.type === 'add')      added++;
            if (op.type === 'remove')   removed++;
            if (op.type === 'replace')  changed++;
        });

        const summary = document.getElementById('bc-summary');
        summary.style.display = 'block';
        summary.innerHTML = `
            <strong>${escapeHtmlLocal(state.left.meta.name)}</strong> (${state.left.meta.modified_formatted})
            <i class="fas fa-arrow-right" style="margin:0 8px; color:#95a5a6;"></i>
            <strong>${escapeHtmlLocal(state.right.meta.name)}</strong> (${state.right.meta.modified_formatted})
            &nbsp;&nbsp;|&nbsp;&nbsp;
            <span style="color:#27ae60;">+${added} eklendi</span>&nbsp;
            <span style="color:#e74c3c;">-${removed} silindi</span>&nbsp;
            <span style="color:#e67e22;">~${changed} değişti</span>&nbsp;
            <span style="color:#7f8c8d;">=${equal} aynı</span>
            ${state.left.meta.truncated || state.right.meta.truncated ? '<span style="color:#c0392b; margin-left:10px;"><i class="fas fa-cut"></i> Dosyalar kısaltıldı (>2MB)</span>' : ''}
        `;

        document.getElementById('bc-download-unified').disabled = false;
        document.getElementById('bc-download-sbs').disabled = false;

        renderSideBySide(onlyDiff);
    };

    function renderSideBySide(onlyDiff) {
        const output = document.getElementById('bc-output');

        const rows = [];
        let ln = 0, rn = 0;

        state.diff.forEach(op => {
            if (op.type === 'equal') {
                for (let i = 0; i < op.left.length; i++) {
                    ln++; rn++;
                    if (!onlyDiff) rows.push(row('equal', ln, op.left[i], rn, op.right[i]));
                }
            } else if (op.type === 'remove') {
                for (let i = 0; i < op.left.length; i++) {
                    ln++;
                    rows.push(row('remove', ln, op.left[i], '', null));
                }
            } else if (op.type === 'add') {
                for (let i = 0; i < op.right.length; i++) {
                    rn++;
                    rows.push(row('add', '', null, rn, op.right[i]));
                }
            } else if (op.type === 'replace') {
                const len = Math.max(op.left.length, op.right.length);
                for (let i = 0; i < len; i++) {
                    const lLine = i < op.left.length  ? op.left[i]  : null;
                    const rLine = i < op.right.length ? op.right[i] : null;
                    const lNum = lLine !== null ? (++ln) : '';
                    const rNum = rLine !== null ? (++rn) : '';
                    rows.push(row('replace', lNum, lLine, rNum, rLine));
                }
            }
        });

        if (!rows.length) {
            output.innerHTML = `
                <div style="text-align:center; padding:60px 20px; color:#27ae60;">
                    <i class="fas fa-check-circle" style="font-size:3em; margin-bottom:15px;"></i>
                    <p style="margin:0; font-size:1.1em;">İki dosya ${onlyDiff ? 'farklı satır içermiyor' : 'tamamen aynı'}.</p>
                </div>`;
            return;
        }

        output.innerHTML = `
            <table style="width:100%; border-collapse:collapse; font-family:'Courier New', Consolas, monospace; font-size:12.5px;">
                <thead>
                    <tr style="background:#ecf0f1; position:sticky; top:0; z-index:2;">
                        <th style="width:50px; padding:6px; border-bottom:2px solid #bdc3c7; color:#7f8c8d;">#</th>
                        <th style="padding:6px 10px; border-bottom:2px solid #bdc3c7; text-align:left; color:#2c3e50;">
                            ${escapeHtmlLocal(state.left.meta.name)} <span style="color:#7f8c8d; font-weight:normal;">(${state.left.meta.modified_formatted})</span>
                        </th>
                        <th style="width:50px; padding:6px; border-bottom:2px solid #bdc3c7; color:#7f8c8d;">#</th>
                        <th style="padding:6px 10px; border-bottom:2px solid #bdc3c7; text-align:left; color:#2c3e50;">
                            ${escapeHtmlLocal(state.right.meta.name)} <span style="color:#7f8c8d; font-weight:normal;">(${state.right.meta.modified_formatted})</span>
                        </th>
                    </tr>
                </thead>
                <tbody>${rows.join('')}</tbody>
            </table>`;
    }

    function row(type, lNum, lText, rNum, rText) {
        const colors = {
            equal:   { lBg: '#fff',    rBg: '#fff',    lFg: '#2c3e50', rFg: '#2c3e50' },
            remove:  { lBg: '#ffebee', rBg: '#fafafa', lFg: '#c62828', rFg: '#bdbdbd' },
            add:     { lBg: '#fafafa', rBg: '#e8f5e9', lFg: '#bdbdbd', rFg: '#2e7d32' },
            replace: { lBg: '#fff8e1', rBg: '#fff8e1', lFg: '#bf360c', rFg: '#1b5e20' },
        };
        const c = colors[type];

        // Replace satırlarında satır-içi karakter farkı vurgula (ComparePlus tarzı)
        let lHtml, rHtml;
        if (type === 'replace' && lText != null && rText != null) {
            const d = intralineDiff(lText, rText);
            lHtml = escapeHtmlLocal(d.lPre)
                  + `<span style="background:#ff9a8b; color:#7f0000; border-radius:2px; padding:0 1px;">${escapeHtmlLocal(d.lMid)}</span>`
                  + escapeHtmlLocal(d.lSuf);
            rHtml = escapeHtmlLocal(d.rPre)
                  + `<span style="background:#9be7a0; color:#1b5e20; border-radius:2px; padding:0 1px;">${escapeHtmlLocal(d.rMid)}</span>`
                  + escapeHtmlLocal(d.rSuf);
        } else {
            lHtml = lText == null ? '' : escapeHtmlLocal(lText);
            rHtml = rText == null ? '' : escapeHtmlLocal(rText);
        }

        const cell = (bg, fg, num, html) => `
            <td style="background:${bg}; border-bottom:1px solid #f0f0f0; padding:3px 6px; text-align:right; color:#95a5a6; width:50px; user-select:none;">${num}</td>
            <td style="background:${bg}; border-bottom:1px solid #f0f0f0; padding:3px 10px; color:${fg}; white-space:pre-wrap; word-break:break-all;">${html}</td>`;

        return `<tr>${cell(c.lBg, c.lFg, lNum, lHtml)}${cell(c.rBg, c.rFg, rNum, rHtml)}</tr>`;
    }

    // ---------- Diff algoritması (LCS tabanlı) ----------

    function splitLines(text) {
        if (text == null || text === '') return [];
        let s = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        // Dosya sonundaki tek newline'ı at (aksi halde yapay bir '' satır oluşur)
        if (s.endsWith('\n')) s = s.slice(0, -1);
        if (s === '') return [];
        return s.split('\n');
    }

    /**
     * LCS tabanlı satır diff.
     * a, b: satır dizileri
     * norm: karşılaştırma için satır normalize fonksiyonu (gösterim ham kalır)
     * returns: [{type: 'equal'|'add'|'remove'|'replace', left:[], right:[]}]
     */
    function diffLines(a, b, norm) {
        const n = a.length, m = b.length;
        const na = a.map(norm);
        const nb = b.map(norm);

        // Çok büyük dosyalarda (hücre sayısı > MAX_CELLS) LCS tablosu belleği
        // aşar. Bu durumda tek bir "replace" op'u döndürerek sol ve sağ
        // satırların yan yana hizalanmasını garanti ediyoruz — aksi halde
        // remove bloğu sonra add bloğu olarak ayrı ayrı render edilir ve
        // "sol boş → sağ boş" şeklinde kaydırılmış görünür.
        const MAX_CELLS = 20_000_000;
        if (n * m > MAX_CELLS) {
            if (n && m) return [{ type: 'replace', left: a.slice(), right: b.slice() }];
            if (n)      return [{ type: 'remove',  left: a.slice(), right: [] }];
            if (m)      return [{ type: 'add',     left: [],        right: b.slice() }];
            return [];
        }

        const dp = new Array(n + 1);
        for (let i = 0; i <= n; i++) {
            dp[i] = new Int32Array(m + 1);
        }
        for (let i = n - 1; i >= 0; i--) {
            for (let j = m - 1; j >= 0; j--) {
                if (na[i] === nb[j]) dp[i][j] = dp[i + 1][j + 1] + 1;
                else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
            }
        }

        const raw = [];
        let i = 0, j = 0;
        while (i < n && j < m) {
            if (na[i] === nb[j]) {
                raw.push({ type: 'equal', l: a[i], r: b[j] });
                i++; j++;
            } else if (dp[i + 1][j] >= dp[i][j + 1]) {
                raw.push({ type: 'remove', l: a[i] });
                i++;
            } else {
                raw.push({ type: 'add', r: b[j] });
                j++;
            }
        }
        while (i < n) { raw.push({ type: 'remove', l: a[i++] }); }
        while (j < m) { raw.push({ type: 'add',    r: b[j++] }); }

        // Bitişik tüm non-equal opları (sıradan bağımsız) tek bir bloğa topla.
        // Eğer blokta hem remove hem add varsa → replace (yan yana hizalı).
        const ops = [];
        let k = 0;
        while (k < raw.length) {
            if (raw[k].type === 'equal') {
                ops.push({ type: 'equal', left: [raw[k].l], right: [raw[k].r] });
                k++;
                continue;
            }
            const lefts  = [];
            const rights = [];
            while (k < raw.length && raw[k].type !== 'equal') {
                if (raw[k].type === 'remove') lefts.push(raw[k].l);
                else                          rights.push(raw[k].r);
                k++;
            }
            if (lefts.length && rights.length) {
                ops.push({ type: 'replace', left: lefts, right: rights });
            } else if (lefts.length) {
                ops.push({ type: 'remove', left: lefts, right: [] });
            } else {
                ops.push({ type: 'add', left: [], right: rights });
            }
        }

        return mergeAdjacent(ops);
    }

    /**
     * Bir replace satırı için satır-içi karakter farkı vurgulaması.
     * Ortak önek ve ortak sonek dışındaki kısmı "diff" aralığı olarak döner.
     */
    function intralineDiff(left, right) {
        const l = left  == null ? '' : String(left);
        const r = right == null ? '' : String(right);
        const minLen = Math.min(l.length, r.length);

        let pre = 0;
        while (pre < minLen && l.charCodeAt(pre) === r.charCodeAt(pre)) pre++;

        let lEnd = l.length, rEnd = r.length;
        while (lEnd > pre && rEnd > pre && l.charCodeAt(lEnd - 1) === r.charCodeAt(rEnd - 1)) {
            lEnd--; rEnd--;
        }

        return {
            lPre: l.substring(0, pre),
            lMid: l.substring(pre, lEnd),
            lSuf: l.substring(lEnd),
            rPre: r.substring(0, pre),
            rMid: r.substring(pre, rEnd),
            rSuf: r.substring(rEnd),
        };
    }

    function mergeAdjacent(ops) {
        const merged = [];
        ops.forEach(op => {
            const prev = merged[merged.length - 1];
            if (prev && prev.type === op.type) {
                prev.left  = prev.left.concat(op.left);
                prev.right = prev.right.concat(op.right);
            } else {
                merged.push({ type: op.type, left: op.left.slice(), right: op.right.slice() });
            }
        });
        return merged;
    }

    // ---------- TXT indirme ----------

    window.downloadBackupDiff = function (mode) {
        if (!state.left.meta || !state.right.meta) return;

        let text;
        if (mode === 'unified') text = buildUnifiedDiff();
        else                    text = buildSideBySideDiff();

        const leftName  = state.left.meta.name.replace(/[^\w.-]/g, '_');
        const rightName = state.right.meta.name.replace(/[^\w.-]/g, '_');
        const fname = `diff_${leftName}__VS__${rightName}_${mode}.txt`;

        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = fname;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    function buildUnifiedDiff() {
        const lines = [];
        lines.push(`--- ${state.left.meta.path}\t${state.left.meta.modified_formatted}`);
        lines.push(`+++ ${state.right.meta.path}\t${state.right.meta.modified_formatted}`);

        let ln = 0, rn = 0;
        state.diff.forEach(op => {
            if (op.type === 'equal') {
                op.left.forEach((l, i) => {
                    ln++; rn++;
                    lines.push(' ' + l);
                });
            } else if (op.type === 'remove') {
                op.left.forEach(l => { ln++; lines.push('-' + l); });
            } else if (op.type === 'add') {
                op.right.forEach(r => { rn++; lines.push('+' + r); });
            } else if (op.type === 'replace') {
                op.left.forEach(l  => { ln++; lines.push('-' + l); });
                op.right.forEach(r => { rn++; lines.push('+' + r); });
            }
        });

        return lines.join('\n');
    }

    function buildSideBySideDiff() {
        const left  = state.left.lines;
        const right = state.right.lines;
        const maxLen = Math.max(
            ...left.map(l => l.length),
            80
        );
        const colWidth = Math.min(Math.max(maxLen, 40), 100);

        const pad = (s, w) => {
            s = (s == null) ? '' : s;
            if (s.length > w) s = s.substring(0, w - 1) + '…';
            return s + ' '.repeat(Math.max(0, w - s.length));
        };

        const lines = [];
        lines.push(`# LEFT : ${state.left.meta.path}  (${state.left.meta.modified_formatted})`);
        lines.push(`# RIGHT: ${state.right.meta.path}  (${state.right.meta.modified_formatted})`);
        lines.push(`# Semboller:  = eşit   - sadece solda   + sadece sağda   ~ değişti`);
        lines.push('#' + '-'.repeat(colWidth * 2 + 10));
        lines.push(pad('LEFT', colWidth) + ' | S | ' + pad('RIGHT', colWidth));
        lines.push('-'.repeat(colWidth) + '-+---+-' + '-'.repeat(colWidth));

        let ln = 0, rn = 0;
        state.diff.forEach(op => {
            if (op.type === 'equal') {
                op.left.forEach((l, i) => {
                    ln++; rn++;
                    lines.push(pad(l, colWidth) + ' | = | ' + pad(op.right[i], colWidth));
                });
            } else if (op.type === 'remove') {
                op.left.forEach(l => {
                    ln++;
                    lines.push(pad(l, colWidth) + ' | - | ' + pad('', colWidth));
                });
            } else if (op.type === 'add') {
                op.right.forEach(r => {
                    rn++;
                    lines.push(pad('', colWidth) + ' | + | ' + pad(r, colWidth));
                });
            } else if (op.type === 'replace') {
                const len = Math.max(op.left.length, op.right.length);
                for (let i = 0; i < len; i++) {
                    const l = i < op.left.length  ? op.left[i]  : '';
                    const r = i < op.right.length ? op.right[i] : '';
                    if (i < op.left.length)  ln++;
                    if (i < op.right.length) rn++;
                    lines.push(pad(l, colWidth) + ' | ~ | ' + pad(r, colWidth));
                }
            }
        });

        return lines.join('\n');
    }

    // ---------- Yardımcı ----------

    function escapeHtmlLocal(s) {
        if (s == null) return '';
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // Backup karşılaştırma modalinin dışından da (örn. FireScope switch/router
    // config diff) kullanılabilsin diye LCS diff motoru dışa açılıyor.
    // Bu modülün kendi davranışı (backup-compare-modal) değişmiyor.
    window.FireScopeDiffEngine = { diffLines: diffLines, intralineDiff: intralineDiff };
})();
