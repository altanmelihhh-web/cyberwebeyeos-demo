// ============================================================================
// DOKUMAN YONETIMI - Professional Document Management System
// ============================================================================

const DocMgmt = {
    allDocuments: [],
    currentFolder: null,
    searchQuery: '',
    trashMode: false,
    // Yeni özellik state
    favorites: new Set(),       // document_id listesi
    recentViews: [],            // [{document_id, viewed_at}]
    allTags: [],                // [{id, name, color}]
    docTags: {},                // {docId: [{id,name,color}]}
    selectedIds: new Set(),     // toplu işlem seçimleri
    contentSearchMode: false,   // false=dosya adı, true=içerik arama

    // ============================================================================
    // INITIALIZATION
    // ============================================================================
    init() {
        this.loadDocuments();
        this.setupSearch();
        this.setupUpload();
        this.loadFavorites();
        this.loadRecentViews();
        this.loadAllTags();
    },

    // Merkezi CRUD-sonrasi yenileme. InlinePages.js'deki global refreshDocumentsUI
    // varsa onu kullan (hem DocMgmt hem eski inline UI'yi yeniler), yoksa sadece
    // yerel loadDocuments'i cagir.
    refreshAll() {
        if (typeof window.refreshDocumentsUI === 'function') {
            window.refreshDocumentsUI();
        } else {
            this.loadDocuments();
        }
    },

    // ============================================================================
    // LOAD DOCUMENTS (Tree mode)
    // ============================================================================
    loadDocuments() {
        fetch('get-documents.php?mode=tree')
            .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
            .then(data => {
                if (data.error) throw new Error(data.error);
                this.allDocuments = data.documents || [];
                this.renderFolderTree(this.allDocuments);
                this.trashMode = false;
                if (this.currentFolder) {
                    // Re-select current folder
                    const folder = this._findFolderByName(this.allDocuments, this.currentFolder.name);
                    if (folder) {
                        this.currentFolder = folder;
                        this.displayFolderFiles(folder);
                    } else {
                        this.currentFolder = null;
                        this.displayAllFiles();
                    }
                } else {
                    this.displayAllFiles();
                }
            })
            .catch(err => {
                console.error('Dokuman yukleme hatasi:', err);
                const tree = document.getElementById('folder-tree');
                if (tree) tree.innerHTML = '<div style="text-align:center;padding:20px;color:#e74c3c;"><i class="fas fa-exclamation-triangle" style="font-size:2em;margin-bottom:10px;"></i><p>Hata: ' + this.esc(err.message) + '</p></div>';
            });
    },

    _findFolderByName(items, name) {
        for (const item of items) {
            if (item.isDirectory && item.name === name) return item;
            if (item.isDirectory && item.children) {
                const found = this._findFolderByName(item.children, name);
                if (found) return found;
            }
        }
        return null;
    },

    // ============================================================================
    // RENDER FOLDER TREE
    // ============================================================================
    renderFolderTree(items, level) {
        const container = document.getElementById('folder-tree');
        if (!container) return;

        if (level === undefined) {
            level = 0;
            container.innerHTML = '';

            // "Tum Dokumanlar" button
            const allBtn = document.createElement('div');
            allBtn.className = 'folder-item' + (!this.currentFolder && !this.trashMode ? ' selected' : '');
            allBtn.setAttribute('data-folder', '__all__');
            allBtn.innerHTML = '<i class="fas fa-th-large" style="margin-right:8px;color:#3498db;"></i><span>Tum Dokumanlar</span>';
            allBtn.onclick = (e) => { e.stopPropagation(); this.trashMode = false; this.selectFolder(null); };
            container.appendChild(allBtn);
        }

        items.forEach(item => {
            if (!item.isDirectory) return;

            const el = document.createElement('div');
            el.className = 'folder-item' + (this.currentFolder && this.currentFolder.name === item.name ? ' selected' : '');
            el.setAttribute('data-folder', item.name);
            el.style.paddingLeft = (10 + level * 15) + 'px';

            const fileCount = item.children ? item.children.filter(c => !c.isDirectory).length : 0;
            el.innerHTML = '<i class="fas fa-folder" style="color:#f39c12;margin-right:8px;"></i><span>' + this.esc(item.name) + '</span><span class="folder-count">' + fileCount + '</span>';
            el.onclick = (e) => { e.stopPropagation(); this.trashMode = false; this.selectFolder(item); };
            container.appendChild(el);

            if (item.children && item.children.some(c => c.isDirectory)) {
                this.renderFolderTree(item.children.filter(c => c.isDirectory), level + 1);
            }
        });

        if (level === 0) {
            // Separator
            const sep = document.createElement('div');
            sep.style.cssText = 'border-top:1px solid var(--border-color,#e0e0e0);margin:10px 0;';
            container.appendChild(sep);

            // Favoriler
            const favBtn = document.createElement('div');
            favBtn.className = 'folder-item' + (this._specialView === 'favorites' ? ' selected' : '');
            favBtn.setAttribute('data-folder', '__favorites__');
            favBtn.innerHTML = '<i class="fas fa-star" style="color:#f39c12;margin-right:8px;"></i><span>Favorilerim</span><span class="folder-count">' + this.favorites.size + '</span>';
            favBtn.onclick = (e) => { e.stopPropagation(); this.showFavorites(); };
            container.appendChild(favBtn);

            // Son Görüntülenenler
            const recentBtn = document.createElement('div');
            recentBtn.className = 'folder-item' + (this._specialView === 'recent' ? ' selected' : '');
            recentBtn.setAttribute('data-folder', '__recent__');
            recentBtn.innerHTML = '<i class="fas fa-clock" style="color:#3498db;margin-right:8px;"></i><span>Son Görüntülenenler</span>';
            recentBtn.onclick = (e) => { e.stopPropagation(); this.showRecentViews(); };
            container.appendChild(recentBtn);

            // Separator 2
            const sep2 = document.createElement('div');
            sep2.style.cssText = 'border-top:1px solid var(--border-color,#e0e0e0);margin:10px 0;';
            container.appendChild(sep2);

            // Etiket filtresi bölümü
            if (this.allTags.length > 0) {
                const tagHeader = document.createElement('div');
                tagHeader.style.cssText = 'padding:4px 10px;font-size:11px;font-weight:600;color:var(--text-secondary,#7f8c8d);text-transform:uppercase;letter-spacing:0.5px;';
                tagHeader.textContent = 'Etiketler';
                container.appendChild(tagHeader);

                this.allTags.forEach(tag => {
                    const tagBtn = document.createElement('div');
                    tagBtn.className = 'folder-item' + (this._tagFilter === tag.id ? ' selected' : '');
                    tagBtn.setAttribute('data-folder', '__tag__' + tag.id);
                    tagBtn.innerHTML = '<i class="fas fa-tag" style="color:' + this.esc(tag.color) + ';margin-right:8px;"></i><span>' + this.esc(tag.name) + '</span>';
                    tagBtn.onclick = (e) => { e.stopPropagation(); this.filterByTag(tag); };
                    container.appendChild(tagBtn);
                });

                const sep3 = document.createElement('div');
                sep3.style.cssText = 'border-top:1px solid var(--border-color,#e0e0e0);margin:10px 0;';
                container.appendChild(sep3);
            }

            // Trash button
            const trashBtn = document.createElement('div');
            trashBtn.className = 'folder-item' + (this.trashMode ? ' selected' : '');
            trashBtn.setAttribute('data-folder', '__trash__');
            trashBtn.innerHTML = '<i class="fas fa-trash-alt" style="color:#e74c3c;margin-right:8px;"></i><span>Silinenler</span>';
            trashBtn.onclick = (e) => { e.stopPropagation(); this.showTrash(); };
            container.appendChild(trashBtn);
        }
    },

    // ============================================================================
    // SELECT FOLDER
    // ============================================================================
    selectFolder(folder) {
        this.currentFolder = folder;
        this.trashMode = false;
        this._specialView = null;
        this._tagFilter = null;

        // Highlight
        document.querySelectorAll('#folder-tree .folder-item').forEach(el => el.classList.remove('selected'));
        if (folder === null) {
            const allEl = document.querySelector('#folder-tree [data-folder="__all__"]');
            if (allEl) allEl.classList.add('selected');
            this.displayAllFiles();
        } else {
            const folderEl = document.querySelector('#folder-tree [data-folder="' + CSS.escape(folder.name) + '"]');
            if (folderEl) folderEl.classList.add('selected');
            // Enable edit/delete buttons
            const editBtn = document.getElementById('edit-folder-btn');
            const delBtn = document.getElementById('delete-folder-btn');
            if (editBtn) editBtn.disabled = false;
            if (delBtn) delBtn.disabled = false;
            // Set for inline folder management (InlinePages.js::confirmDeleteFolder okuyor).
            // NOT: InlinePages.js'deki `let currentSelectedFolder` window'a bind olmaz,
            // bu yuzden typeof kontrolu her zaman 'undefined' doner ve atama yapilmazdi.
            // Nested (ic ice) klasorler icin relativePath kullan ("Bilgiler/TestVideolar"),
            // backend bu formati anliyor.
            window.currentSelectedFolder = folder.relativePath || folder.name;
            this.displayFolderFiles(folder);
        }
    },

    // ============================================================================
    // DISPLAY ALL FILES
    // ============================================================================
    displayAllFiles() {
        this._specialView = null;
        this._tagFilter = null;
        const allFiles = this.getAllFilesFromTree(this.allDocuments);
        const header = document.getElementById('files-header');
        if (header) header.innerHTML = '<h4 style="margin:0;color:var(--text-color,#2c3e50);font-size:16px;font-weight:600;"><i class="fas fa-th-large" style="color:#3498db;"></i> Tum Dokumanlar</h4><p style="margin:5px 0 0;color:var(--text-secondary,#7f8c8d);font-size:13px;">' + allFiles.length + ' dosya</p>';
        this.renderFilesGrid(allFiles);
        // Disable edit/delete folder buttons
        const editBtn = document.getElementById('edit-folder-btn');
        const delBtn = document.getElementById('delete-folder-btn');
        if (editBtn) editBtn.disabled = true;
        if (delBtn) delBtn.disabled = true;
        // Inline UI ile tutarlilik icin secimi temizle
        window.currentSelectedFolder = null;
    },

    // ============================================================================
    // DISPLAY FOLDER FILES
    // ============================================================================
    displayFolderFiles(folder) {
        const files = (folder.children || []).filter(item => !item.isDirectory);
        const header = document.getElementById('files-header');
        if (header) header.innerHTML = '<h4 style="margin:0;color:var(--text-color,#2c3e50);font-size:16px;font-weight:600;"><i class="fas fa-folder-open" style="color:#f39c12;"></i> ' + this.esc(folder.name) + '</h4><p style="margin:5px 0 0;color:var(--text-secondary,#7f8c8d);font-size:13px;">' + files.length + ' dosya</p>';
        this.renderFilesGrid(files);
    },

    // ============================================================================
    // RENDER FILES GRID
    // ============================================================================
    renderFilesGrid(files) {
        const grid = document.getElementById('files-grid');
        if (!grid) return;

        if (!files || files.length === 0) {
            grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-secondary,#7f8c8d);"><i class="fas fa-inbox" style="font-size:3em;margin-bottom:15px;color:#bdc3c7;"></i><p style="margin:0;font-size:15px;">Bu klasorde dosya yok</p></div>';
            return;
        }

        grid.innerHTML = '';
        files.forEach(file => grid.appendChild(this.createFileCard(file)));
    },

    // ============================================================================
    // CREATE FILE CARD
    // ============================================================================
    createFileCard(file) {
        const card = document.createElement('div');
        card.className = 'document-card';
        card.dataset.docId = file.id;
        const icon = this.getFileIcon(file.type);
        const color = this.getFileColor(file.type);
        const relPath = file.relativePath || '';
        const isFav = this.favorites.has(file.id);
        const tags = this.docTags[file.id] || [];
        const tagHtml = tags.map(t =>
            `<span class="doc-tag-badge" style="background:${this.esc(t.color)}22;color:${this.esc(t.color)};border-color:${this.esc(t.color)}55;">${this.esc(t.name)}</span>`
        ).join('');

        card.innerHTML = `
            <div class="doc-card-checkbox"><input type="checkbox" class="doc-select-cb" title="Seç" onclick="event.stopPropagation()"></div>
            <div class="document-icon">
                <i class="fas ${icon}" style="color:${color};"></i>
            </div>
            <div class="document-info">
                <div class="document-name" title="${this.esc(file.name)}">${this.esc(file.name)}</div>
                <div class="document-meta"><span>${this.esc(file.size || '-')}</span><span>${this.esc(file.date || '-')}</span></div>
                ${tagHtml ? `<div class="doc-tags-row">${tagHtml}</div>` : ''}
            </div>
            <div class="document-actions">
                <button class="action-btn fav-btn${isFav ? ' is-fav' : ''}" title="${isFav ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}"><i class="fas fa-star"></i></button>
                <button class="action-btn view-btn" title="Önizle"><i class="fas fa-eye"></i></button>
                <button class="action-btn download-btn" title="İndir"><i class="fas fa-download"></i></button>
                <button class="action-btn move-btn admin-only" title="Taşı"><i class="fas fa-arrows-alt"></i></button>
                <button class="action-btn rename-btn admin-only" title="Yeniden Adlandır"><i class="fas fa-pen"></i></button>
                <button class="action-btn delete-btn admin-only" title="Sil"><i class="fas fa-trash"></i></button>
            </div>`;

        const cb = card.querySelector('.doc-select-cb');
        cb.checked = this.selectedIds.has(file.id);
        cb.onchange = () => this.toggleSelect(file.id, cb.checked);

        card.querySelector('.fav-btn').onclick = (e) => { e.stopPropagation(); this.toggleFavorite(file.id, card.querySelector('.fav-btn')); };
        card.querySelector('.view-btn').onclick = (e) => { e.stopPropagation(); this.previewDocument(file.id); };
        card.querySelector('.download-btn').onclick = (e) => { e.stopPropagation(); this.downloadDocument(file.id); };
        card.querySelector('.delete-btn').onclick = (e) => { e.stopPropagation(); this.deleteDocument(file.id); };
        card.querySelector('.move-btn').onclick = (e) => { e.stopPropagation(); this.openMoveModal(relPath, file.name); };
        card.querySelector('.rename-btn').onclick = (e) => { e.stopPropagation(); this.renameDocument(file.id, file.name); };

        card.onclick = () => this.previewDocument(file.id);

        return card;
    },

    // ============================================================================
    // PREVIEW DOCUMENT
    // ============================================================================
    previewDocument(docId) {
        const doc = this.findDocumentById(docId);
        if (!doc) { alert('Dokuman bulunamadi!'); return; }

        this.recordView(docId);

        // Ensure modal exists
        this._ensurePreviewModal();

        const modal = document.getElementById('doc-preview-modal');
        const titleEl = document.getElementById('preview-title');
        const bodyEl = document.getElementById('preview-body');

        modal.style.display = 'block';
        titleEl.textContent = doc.name;
        bodyEl.innerHTML = '<div style="text-align:center;padding:60px;color:#3498db;"><i class="fas fa-spinner fa-spin" style="font-size:3em;"></i><p style="margin-top:20px;">Önizleme yükleniyor...</p></div>';

        // Sekmeleri sıfırla — her açılışta önizleme sekmesiyle başla
        this._switchPreviewTab('preview');
        this._currentPreviewDocId = doc.id;

        // Yorum ve etiket panellerini lazy yükle (sekmeye geçince)
        const tagsBtn = document.getElementById('preview-tab-tags');
        const cmtBtn  = document.getElementById('preview-tab-comments');
        if (tagsBtn) tagsBtn.onclick = () => { this._switchPreviewTab('tags'); this._loadTagsPanel(doc.id); };
        if (cmtBtn)  cmtBtn.onclick  = () => { this._switchPreviewTab('comments'); this._loadCommentsPanel(doc.id); };

        // Load preview libraries first, then render
        const doPreview = () => {
            const ft = (doc.type || '').toLowerCase();
            this._renderPreview(ft, docId, bodyEl, doc);
        };

        if (typeof window.loadPreviewLibraries === 'function' && !window.previewLibsLoaded) {
            window.loadPreviewLibraries().then(doPreview).catch(doPreview);
        } else {
            doPreview();
        }
    },

    _renderPreview(ft, docId, bodyEl, doc) {

        if (ft === 'pdf') {
            this._previewPDF(docId, bodyEl);
        } else if (['doc', 'docx'].includes(ft)) {
            this._previewWord(docId, bodyEl);
        } else if (['xls', 'xlsx', 'csv'].includes(ft)) {
            this._previewExcel(docId, bodyEl);
        } else if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'bmp', 'webp', 'ico', 'tiff', 'tif'].includes(ft)) {
            this._previewImage(docId, bodyEl);
        } else if (['txt', 'html', 'css', 'js', 'json', 'xml', 'log', 'cfg', 'conf', 'ini', 'sh', 'bat', 'py',
                    'yaml', 'yml', 'toml', 'sql', 'php', 'go', 'rb', 'rs', 'tf', 'c', 'cpp', 'h',
                    'java', 'ts', 'tsx', 'jsx', 'ps1', 'cmd', 'diff', 'patch'].includes(ft)) {
            this._previewText(docId, bodyEl);
        } else if (ft === 'eml') {
            this._previewEml(docId, bodyEl);
        } else if (ft === 'msg') {
            this._previewMsg(docId, bodyEl);
        } else if (ft === 'zip') {
            this._previewZip(docId, bodyEl);
        } else if (['rar', '7z', 'tar', 'gz', 'bz2', 'xz'].includes(ft)) {
            this._previewArchiveGeneric(docId, bodyEl, ft);
        } else if (ft === 'md') {
            this._previewMarkdown(docId, bodyEl);
        } else if (ft === 'rtf') {
            this._previewRtf(docId, bodyEl);
        } else if (['mp4', 'webm', 'ogv', 'ogg', 'mov', 'm4v'].includes(ft)) {
            this._previewVideo(docId, bodyEl, doc);
        } else if (['mp3', 'wav', 'm4a', 'aac', 'flac', 'oga'].includes(ft)) {
            this._previewAudio(docId, bodyEl, doc);
        } else if (ft === 'one') {
            // OneNote dosyalari sunucu tarafinda PDF'e cevrilip gosterilir
            this._previewPDF(docId, bodyEl);
        } else {
            bodyEl.innerHTML = `<div style="text-align:center;padding:60px;color:var(--text-secondary,#7f8c8d);">
                <i class="fas fa-file" style="font-size:3em;margin-bottom:15px;"></i>
                <p style="font-size:16px;">Bu dosya turu icin onizleme desteklenmiyor (.${this.esc(ft)})</p>
                <button onclick="DocMgmt.downloadDocument('${this.esc(docId)}')" style="margin-top:20px;padding:10px 20px;background:#3498db;color:white;border:none;border-radius:4px;cursor:pointer;">
                    <i class="fas fa-download"></i> Dosyayi Indir
                </button></div>`;
        }
    },

    _ensurePreviewModal() {
        if (document.getElementById('doc-preview-modal')) return;
        const modal = document.createElement('div');
        modal.id = 'doc-preview-modal';
        modal.className = 'modal';
        modal.style.cssText = 'display:none;position:fixed;z-index:10000;left:0;top:0;width:100%;height:100%;background:rgba(0,0,0,0.6);';
        modal.innerHTML = `
            <div class="modal-content" style="background:var(--card-bg,white);margin:2% auto;width:92%;max-width:1200px;max-height:92vh;border-radius:10px;overflow:hidden;display:flex;flex-direction:column;">
                <div class="modal-header" style="padding:12px 20px;border-bottom:1px solid var(--border-color,#e0e0e0);display:flex;justify-content:space-between;align-items:center;gap:12px;">
                    <h3 id="preview-title" style="margin:0;color:var(--text-color,#2c3e50);font-size:15px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">Önizleme</h3>
                    <div style="display:flex;gap:6px;align-items:center;flex-shrink:0;">
                        <button id="preview-tab-preview" onclick="DocMgmt._switchPreviewTab('preview')" style="padding:5px 12px;border:1px solid #3498db;border-radius:5px;background:#3498db;color:white;cursor:pointer;font-size:12px;"><i class="fas fa-eye"></i> Önizleme</button>
                        <button id="preview-tab-tags" onclick="DocMgmt._switchPreviewTab('tags')" style="padding:5px 12px;border:1px solid var(--border-color,#e0e0e0);border-radius:5px;background:transparent;color:var(--text-secondary,#7f8c8d);cursor:pointer;font-size:12px;"><i class="fas fa-tags"></i> Etiketler</button>
                        <button id="preview-tab-comments" onclick="DocMgmt._switchPreviewTab('comments')" style="padding:5px 12px;border:1px solid var(--border-color,#e0e0e0);border-radius:5px;background:transparent;color:var(--text-secondary,#7f8c8d);cursor:pointer;font-size:12px;"><i class="fas fa-comment"></i> Yorumlar</button>
                        <span onclick="DocMgmt.closePreview()" style="cursor:pointer;font-size:24px;color:var(--text-secondary,#7f8c8d);line-height:1;padding:0 4px;">&times;</span>
                    </div>
                </div>
                <div id="preview-body" style="flex:1;overflow:auto;padding:20px;background:var(--main-bg,#f8f9fa);"></div>
                <div id="preview-tags-panel" style="display:none;flex:1;overflow:auto;padding:20px;background:var(--main-bg,#f8f9fa);"></div>
                <div id="preview-comments-panel" style="display:none;flex:1;overflow:auto;padding:20px;background:var(--main-bg,#f8f9fa);"></div>
            </div>`;
        modal.onclick = (e) => { if (e.target === modal) this.closePreview(); };
        document.body.appendChild(modal);
    },

    _switchPreviewTab(tab) {
        const panels = { preview: 'preview-body', tags: 'preview-tags-panel', comments: 'preview-comments-panel' };
        const btns   = { preview: 'preview-tab-preview', tags: 'preview-tab-tags', comments: 'preview-tab-comments' };
        Object.entries(panels).forEach(([k, id]) => {
            const el = document.getElementById(id);
            if (el) el.style.display = k === tab ? '' : 'none';
        });
        Object.entries(btns).forEach(([k, id]) => {
            const el = document.getElementById(id);
            if (!el) return;
            if (k === tab) { el.style.background = '#3498db'; el.style.color = 'white'; el.style.borderColor = '#3498db'; }
            else { el.style.background = 'transparent'; el.style.color = 'var(--text-secondary,#7f8c8d)'; el.style.borderColor = 'var(--border-color,#e0e0e0)'; }
        });
    },

    _loadTagsPanel(docId) {
        const panel = document.getElementById('preview-tags-panel');
        if (!panel) return;
        panel.innerHTML = '<div style="text-align:center;padding:30px;color:#3498db;"><i class="fas fa-spinner fa-spin"></i></div>';
        Promise.all([
            fetch('api/doc-tags.php?doc_id=' + docId).then(r => r.json()),
            fetch('api/doc-tags.php').then(r => r.json())
        ]).then(([docTagsData, allTagsData]) => {
            const assigned = new Set((docTagsData.tags || []).map(t => t.id));
            const all = allTagsData.tags || [];
            if (!all.length) {
                panel.innerHTML = '<div style="text-align:center;padding:40px;color:#7f8c8d;"><i class="fas fa-tags" style="font-size:2em;margin-bottom:10px;"></i><p>Henüz etiket tanımlanmamış.</p><p style="font-size:12px;">Sistem Ayarları → Döküman Yönetimi bölümünden etiket oluşturabilirsiniz.</p></div>';
                return;
            }
            panel.innerHTML = '<div style="padding:4px 0 12px;font-size:13px;color:#7f8c8d;">Dosyaya atamak/kaldırmak için etiketlere tıklayın:</div>' +
                '<div style="display:flex;flex-wrap:wrap;gap:10px;">' +
                all.map(tag => {
                    const isOn = assigned.has(tag.id);
                    return `<span class="doc-tag-toggle${isOn ? ' active' : ''}" data-tag-id="${tag.id}" data-doc-id="${docId}"
                        style="cursor:pointer;padding:6px 14px;border-radius:20px;font-size:13px;font-weight:500;border:2px solid ${this.esc(tag.color)};
                               background:${isOn ? tag.color : 'transparent'};color:${isOn ? 'white' : tag.color};transition:all 0.2s;"
                        onclick="DocMgmt._toggleTagOnDoc('${docId}',${tag.id},'${this.esc(tag.color)}',this)">
                        <i class="fas fa-${isOn ? 'check' : 'plus'}"></i> ${this.esc(tag.name)}
                    </span>`;
                }).join('') + '</div>';
        }).catch(() => { panel.innerHTML = '<div style="text-align:center;padding:40px;color:#e74c3c;">Etiketler yüklenemedi.</div>'; });
    },

    _toggleTagOnDoc(docId, tagId, color, el) {
        const isOn = el.classList.contains('active');
        const action = isOn ? 'remove' : 'assign';
        fetch('api/doc-tags.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, doc_id: docId, tag_id: tagId })
        }).then(r => r.json()).then(data => {
            if (!data.success) return;
            if (action === 'assign') {
                el.classList.add('active');
                el.style.background = color; el.style.color = 'white';
                el.innerHTML = el.innerHTML.replace('fa-plus', 'fa-check');
            } else {
                el.classList.remove('active');
                el.style.background = 'transparent'; el.style.color = color;
                el.innerHTML = el.innerHTML.replace('fa-check', 'fa-plus');
            }
            // Refresh docTags cache
            this.loadAllTags();
        }).catch(() => {});
    },

    _loadCommentsPanel(docId) {
        const panel = document.getElementById('preview-comments-panel');
        if (!panel) return;
        panel.innerHTML = '<div style="text-align:center;padding:30px;color:#3498db;"><i class="fas fa-spinner fa-spin"></i></div>';
        fetch('api/doc-comments.php?doc_id=' + docId).then(r => r.json()).then(data => {
            const comments = data.comments || [];
            const listHtml = comments.length
                ? comments.map(c => `
                    <div class="doc-comment" data-id="${c.id}" style="background:var(--card-bg,white);border:1px solid var(--border-color,#e0e0e0);border-radius:8px;padding:14px;margin-bottom:12px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                            <span style="font-weight:600;color:var(--text-color,#2c3e50);font-size:13px;"><i class="fas fa-user-circle" style="color:#3498db;margin-right:5px;"></i>${this.esc(c.username || 'Bilinmeyen')}</span>
                            <div style="display:flex;align-items:center;gap:8px;">
                                <span style="font-size:11px;color:#7f8c8d;">${this.esc(c.created_at || '')}</span>
                                ${c.can_delete ? `<button onclick="DocMgmt._deleteComment(${c.id},'${docId}')" style="border:none;background:none;cursor:pointer;color:#e74c3c;font-size:12px;padding:2px 4px;" title="Sil"><i class="fas fa-trash"></i></button>` : ''}
                            </div>
                        </div>
                        <div style="color:var(--text-color,#2c3e50);font-size:14px;line-height:1.6;white-space:pre-wrap;">${this.esc(c.comment)}</div>
                    </div>`).join('')
                : '<div style="text-align:center;padding:30px;color:#7f8c8d;"><i class="fas fa-comment-slash" style="font-size:2em;margin-bottom:10px;"></i><p>Henüz yorum yapılmamış.</p></div>';

            panel.innerHTML = listHtml +
                `<div style="margin-top:16px;background:var(--card-bg,white);border:1px solid var(--border-color,#e0e0e0);border-radius:8px;padding:14px;">
                    <textarea id="comment-input-${docId}" placeholder="Yorumunuzu yazın..." style="width:100%;min-height:80px;border:1px solid var(--border-color,#e0e0e0);border-radius:6px;padding:10px;font-size:14px;resize:vertical;background:var(--main-bg,#f8f9fa);color:var(--text-color,#2c3e50);box-sizing:border-box;"></textarea>
                    <div style="text-align:right;margin-top:8px;">
                        <button onclick="DocMgmt._postComment('${docId}')" style="padding:7px 18px;background:#3498db;color:white;border:none;border-radius:6px;cursor:pointer;font-size:13px;"><i class="fas fa-paper-plane"></i> Gönder</button>
                    </div>
                </div>`;
        }).catch(() => { panel.innerHTML = '<div style="text-align:center;padding:40px;color:#e74c3c;">Yorumlar yüklenemedi.</div>'; });
    },

    _postComment(docId) {
        const ta = document.getElementById('comment-input-' + docId);
        if (!ta) return;
        const text = ta.value.trim();
        if (!text) return;
        fetch('api/doc-comments.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ doc_id: docId, comment: text })
        }).then(r => r.json()).then(data => {
            if (data.success) { ta.value = ''; this._loadCommentsPanel(docId); }
            else alert('Hata: ' + (data.error || 'Yorum gönderilemedi'));
        }).catch(() => {});
    },

    _deleteComment(commentId, docId) {
        if (!confirm('Yorum silinecek. Onaylıyor musunuz?')) return;
        fetch('api/doc-comments.php', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: commentId })
        }).then(r => r.json()).then(data => {
            if (data.success) this._loadCommentsPanel(docId);
        }).catch(() => {});
    },

    _previewPDF(docId, container) {
        container.innerHTML = '<iframe title="PDF önizleme" src="' + this.esc(this._documentUrl(docId)) + '" style="width:100%;height:75vh;border:none;border-radius:6px;"></iframe>';
    },

    _previewWord(docId, container) {
        fetch(this._documentUrl(docId))
            .then(r => r.arrayBuffer())
            .then(buf => {
                const bytes = new Uint8Array(buf);
                const isZip = bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04;

                if (!isZip) {
                    // Not a valid DOCX, show as text
                    const text = new TextDecoder('utf-8').decode(buf);
                    container.innerHTML = '<div style="background:var(--card-bg,white);padding:40px;border-radius:8px;max-width:900px;margin:0 auto;"><div style="background:#fff3cd;border-left:4px solid #ffc107;padding:12px;margin-bottom:20px;border-radius:4px;"><i class="fas fa-exclamation-triangle" style="color:#856404;"></i> <span style="color:#856404;">Bu dosya gecerli bir DOCX formatinda degil. Metin olarak gosteriliyor.</span></div><pre style="white-space:pre-wrap;line-height:1.6;color:var(--text-color,#2c3e50);">' + this.esc(text) + '</pre></div>';
                    return;
                }

                // Try Mammoth.js
                if (typeof mammoth !== 'undefined') {
                    mammoth.convertToHtml({arrayBuffer: buf})
                        .then(result => {
                            container.innerHTML = '<div style="background:var(--card-bg,white);padding:40px;border-radius:8px;max-width:900px;margin:0 auto;"><div class="docx-preview-content">' + result.value + '</div></div>';
                        })
                        .catch(() => this._previewWordFallback(docId, container, buf));
                } else if (typeof docx !== 'undefined') {
                    this._previewWordDocxLib(docId, container, buf);
                } else {
                    this._previewWordFallback(docId, container);
                }
            })
            .catch(err => {
                container.innerHTML = '<div style="text-align:center;padding:60px;color:#e74c3c;"><i class="fas fa-exclamation-triangle" style="font-size:3em;margin-bottom:15px;"></i><p>Dosya yuklenemedi: ' + this.esc(err.message) + '</p></div>';
            });
    },

    _previewWordDocxLib(docId, container, buf) {
        container.innerHTML = '<div style="background:var(--card-bg,white);padding:40px;border-radius:8px;max-width:900px;margin:0 auto;"><div id="word-preview-container"></div></div>';
        const pc = document.getElementById('word-preview-container');
        docx.renderAsync(buf, pc, null, { className: "docx-preview-content", inWrapper: true, ignoreWidth: false, breakPages: true })
            .catch(() => this._previewWordFallback(docId, container));
    },

    _previewWordFallback(docId, container) {
        container.innerHTML = `<div style="text-align:center;padding:60px;color:var(--text-secondary,#7f8c8d);">
            <i class="fas fa-file-word" style="font-size:4em;margin-bottom:20px;color:#2b579a;"></i>
            <p style="font-size:16px;">Bu Word dosyasi onizlenemiyor</p>
            <p style="font-size:13px;color:#999;">Dosya eski .doc formatinda veya bozuk olabilir</p>
            <button onclick="DocMgmt.downloadDocument('${this.esc(docId)}')" style="margin-top:20px;padding:12px 24px;background:#2b579a;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px;">
                <i class="fas fa-download"></i> Dosyayi Indir
            </button></div>`;
    },

    _previewExcel(docId, container) {
        if (typeof XLSX === 'undefined') {
            container.innerHTML = '<div style="text-align:center;padding:60px;color:#e74c3c;"><p>Excel onizleme kutuphanesi yuklu degil</p><button onclick="DocMgmt.downloadDocument(\'' + this.esc(docId) + '\')" style="margin-top:15px;padding:10px 20px;background:#27ae60;color:white;border:none;border-radius:6px;cursor:pointer;"><i class="fas fa-download"></i> Indir</button></div>';
            return;
        }
        fetch(this._documentUrl(docId))
            .then(r => r.arrayBuffer())
            .then(async (data) => {
                const wb = XLSX.read(data, { type: 'array' });
                const names = wb.SheetNames;

                // ZIP'ten sheet->resim haritasi cikart
                const sheetImages = await this._extractExcelImages(data, names);

                const renderSheet = (idx) => {
                    const sheet = wb.Sheets[names[idx]];
                    const html = XLSX.utils.sheet_to_html(sheet);
                    tableArea.innerHTML = html;
                    const table = tableArea.querySelector('table');
                    if (table) {
                        table.style.cssText = 'width:100%;border-collapse:collapse;';
                        table.querySelectorAll('td,th').forEach(c => { c.style.border = '1px solid #ddd'; c.style.padding = '8px'; c.style.textAlign = 'left'; });
                        table.querySelectorAll('th').forEach(c => { c.style.background = '#3498db'; c.style.color = 'white'; c.style.fontWeight = 'bold'; });
                    }
                    // Resimler
                    const imgs = sheetImages[idx] || [];
                    if (imgs.length > 0) {
                        const imgSection = document.createElement('div');
                        imgSection.style.cssText = 'margin-top:16px;padding-top:12px;border-top:1px solid #e0e0e0;';
                        imgSection.innerHTML = '<p style="font-size:12px;color:#888;margin:0 0 8px;"><i class="fas fa-image"></i> Sayfadaki Görseller (' + imgs.length + ')</p>';
                        const grid = document.createElement('div');
                        grid.style.cssText = 'display:flex;flex-wrap:wrap;gap:12px;';
                        imgs.forEach(src => {
                            const img = document.createElement('img');
                            img.src = src;
                            img.style.cssText = 'max-width:320px;max-height:240px;border-radius:4px;box-shadow:0 2px 8px rgba(0,0,0,.12);cursor:zoom-in;object-fit:contain;background:#f9f9f9;';
                            img.onclick = () => { window.open(src, '_blank'); };
                            grid.appendChild(img);
                        });
                        imgSection.appendChild(grid);
                        tableArea.appendChild(imgSection);
                    }
                    tabBar.querySelectorAll('.xl-tab').forEach((t, i) => {
                        const hasImg = (sheetImages[i] || []).length > 0;
                        t.style.background = i === idx ? '#3498db' : 'var(--card-bg,white)';
                        t.style.color = i === idx ? 'white' : 'var(--text-color,#333)';
                        t.style.borderBottom = i === idx ? '2px solid #3498db' : '2px solid transparent';
                        t.title = hasImg ? 'Bu sayfada ' + sheetImages[i].length + ' görsel var' : '';
                    });
                };

                const wrap = document.createElement('div');
                wrap.style.cssText = 'background:var(--card-bg,white);border-radius:8px;overflow:hidden;';

                const tabBar = document.createElement('div');
                tabBar.style.cssText = 'display:flex;flex-wrap:wrap;gap:2px;padding:8px 12px 0;border-bottom:1px solid #e0e0e0;background:var(--bg-color,#f5f5f5);';

                names.forEach((name, idx) => {
                    const tab = document.createElement('button');
                    tab.className = 'xl-tab';
                    const hasImg = (sheetImages[idx] || []).length > 0;
                    tab.innerHTML = this.esc(name) + (hasImg ? ' <i class="fas fa-image" style="font-size:10px;opacity:.7;"></i>' : '');
                    tab.style.cssText = 'padding:6px 16px;border:1px solid #ddd;border-bottom:none;border-radius:4px 4px 0 0;cursor:pointer;font-size:13px;transition:background .15s;';
                    tab.onclick = () => renderSheet(idx);
                    tabBar.appendChild(tab);
                });

                const tableArea = document.createElement('div');
                tableArea.style.cssText = 'padding:16px;overflow-x:auto;max-height:65vh;overflow-y:auto;';

                wrap.appendChild(tabBar);
                wrap.appendChild(tableArea);
                container.innerHTML = '';
                container.appendChild(wrap);

                renderSheet(0);
            })
            .catch(err => {
                container.innerHTML = '<div style="text-align:center;padding:60px;color:#e74c3c;"><p>Excel dosyasi yuklenemedi: ' + this.esc(err.message) + '</p></div>';
            });
    },

    async _extractExcelImages(arrayBuffer, sheetNames) {
        if (typeof JSZip === 'undefined') return {};
        try {
            const zip = await JSZip.loadAsync(arrayBuffer);
            const result = {}; // sheetIndex -> [dataURL, ...]

            // workbook.xml.rels: rId -> sheet dosya adi
            const wbRelsFile = zip.file('xl/_rels/workbook.xml.rels');
            if (!wbRelsFile) return {};
            const wbRelsXml = await wbRelsFile.async('text');

            // workbook.xml: sheet sirasina gore rId listesi
            const wbFile = zip.file('xl/workbook.xml');
            if (!wbFile) return {};
            const wbXml = await wbFile.async('text');

            // Sheet elemanlarini sira ile al — r:id veya r:Id (case-insensitive)
            const sheetEls = [...wbXml.matchAll(/<sheet[\s][^>]*r:id="([^"]+)"/gi)];

            for (let i = 0; i < sheetEls.length; i++) {
                const rId = sheetEls[i][1];
                // rId -> sheet dosya yolu
                const relMatch = new RegExp('Id="' + rId + '"[^>]*Target="([^"]+)"').exec(wbRelsXml);
                if (!relMatch) continue;
                const sheetPath = relMatch[1].replace(/^\/xl\//, ''); // 'worksheets/sheet1.xml'
                const sheetBaseName = sheetPath.split('/').pop();     // 'sheet1.xml'

                // Sheet _rels dosyasi
                const sheetRelsFile = zip.file('xl/worksheets/_rels/' + sheetBaseName + '.rels');
                if (!sheetRelsFile) continue;
                const sheetRelsXml = await sheetRelsFile.async('text');

                // Drawing referansi
                const drawMatch = /Target="\.\.\/drawings\/(drawing\d+\.xml)"/.exec(sheetRelsXml);
                if (!drawMatch) continue;
                const drawingName = drawMatch[1]; // 'drawing1.xml'

                // Drawing _rels
                const drawRelsFile = zip.file('xl/drawings/_rels/' + drawingName + '.rels');
                if (!drawRelsFile) continue;
                const drawRelsXml = await drawRelsFile.async('text');

                // Resim dosyalarini bul
                const imgMatches = [...drawRelsXml.matchAll(/Target="\.\.\/media\/([^"]+)"/g)];
                const imgs = [];
                for (const m of imgMatches) {
                    const imgFile = zip.file('xl/media/' + m[1]);
                    if (!imgFile) continue;
                    const ext = m[1].split('.').pop().toLowerCase();
                    const mimeMap = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', bmp: 'image/bmp' };
                    const mime = mimeMap[ext] || 'image/png';
                    if (!mimeMap[ext]) continue; // wmf/emf gibi formatlari atla
                    const b64 = await imgFile.async('base64');
                    imgs.push('data:' + mime + ';base64,' + b64);
                }
                if (imgs.length > 0) result[i] = imgs;
            }
            return result;
        } catch (e) {
            console.warn('Excel resim extraction hatasi:', e);
            return {};
        }
    },

    _previewImage(docId, container) {
        container.innerHTML = '<div style="text-align:center;background:var(--card-bg,white);padding:20px;border-radius:8px;"><img alt="Doküman önizleme" src="' + this.esc(this._documentUrl(docId)) + '" style="max-width:100%;max-height:70vh;border-radius:4px;box-shadow:0 2px 8px rgba(0,0,0,0.1);" onerror="this.parentElement.innerHTML=\'<p style=color:#e74c3c>Resim yuklenemedi</p>\'"></div>';
    },

    _mediaDirectUrl(doc, docId) {
        // Apache statik serve Range/seek'i dogru yapar; PHP ile pipe'lamak yerine
        // dosyanin dogrudan uploads yolunu kullan. Path yoksa eski view-document endpoint'ine dus.
        if (doc && doc.path) {
            const encoded = String(doc.path).split('/').map(encodeURIComponent).join('/');
            return 'uploads/' + encoded;
        }
        return 'view-document.php?id=' + this.esc(docId);
    },

    _previewVideo(docId, container, doc) {
        const src = this._mediaDirectUrl(doc, docId);
        container.innerHTML =
            '<div style="text-align:center;background:#000;padding:20px;border-radius:8px;max-width:1100px;margin:0 auto;">' +
            '<video controls preload="metadata" playsinline ' +
            'style="width:100%;max-height:75vh;border-radius:4px;background:#000;" ' +
            'onerror="this.parentElement.innerHTML=\'<p style=color:#e74c3c;padding:40px>Video oynatilamadi</p>\'">' +
            '<source src="' + src + '">' +
            'Tarayiciniz bu video turunu desteklemiyor.' +
            '</video></div>';
    },

    _previewAudio(docId, container, doc) {
        const src = this._mediaDirectUrl(doc, docId);
        container.innerHTML =
            '<div style="text-align:center;background:var(--card-bg,white);padding:40px;border-radius:8px;max-width:700px;margin:0 auto;">' +
            '<i class="fas fa-music" style="font-size:3em;color:#3498db;margin-bottom:20px;"></i>' +
            '<audio controls preload="metadata" style="width:100%;" ' +
            'onerror="this.parentElement.innerHTML=\'<p style=color:#e74c3c>Ses dosyasi oynatilamadi</p>\'">' +
            '<source src="' + src + '">' +
            '</audio></div>';
    },

    _previewText(docId, container) {
        fetch(this._documentUrl(docId))
            .then(r => r.text())
            .then(text => {
                container.innerHTML = '<div style="background:var(--card-bg,white);padding:20px;border-radius:8px;font-family:monospace;white-space:pre-wrap;line-height:1.5;">' + this.esc(text) + '</div>';
            })
            .catch(err => {
                container.innerHTML = '<div style="text-align:center;padding:60px;color:#e74c3c;"><p>Dosya okunamadi</p></div>';
            });
    },

    // ============================================================================
    // YARDIMCI — MIME baslik parse (folded line destegi, EML icin paylasilan)
    // ============================================================================
    _parseEmlHeaders(blockText) {
        const result = {};
        let lastKey = '';
        blockText.split(/\r?\n/).forEach(line => {
            if (/^[\t ]/.test(line) && lastKey) {
                result[lastKey] = (result[lastKey] || '') + ' ' + line.trim();
            } else {
                const m = line.match(/^([^:\s]+)\s*:\s*(.*)/);
                if (m) { lastKey = m[1].toLowerCase(); result[lastKey] = m[2]; }
            }
        });
        return result;
    },

    // ============================================================================
    // YARDIMCI — CDN script yukleyici (race condition korumal)
    // ============================================================================
    _loadScript(url, globalVar, onLoad, onError) {
        if (typeof window[globalVar] !== 'undefined') { onLoad(); return; }
        if (document.querySelector('script[data-lib="' + globalVar + '"]')) {
            let tries = 0;
            const poll = setInterval(() => {
                if (typeof window[globalVar] !== 'undefined') { clearInterval(poll); onLoad(); }
                else if (++tries > 60) { clearInterval(poll); onError(); }
            }, 100);
            return;
        }
        const s = document.createElement('script');
        s.setAttribute('data-lib', globalVar);
        s.src = url;
        s.onload = onLoad;
        s.onerror = onError;
        document.head.appendChild(s);
    },

    // ============================================================================
    // YARDIMCI — Onizlenemeyen dosyalar icin standart indir ekrani
    // ============================================================================
    _renderDownloadFallback(container, icon, color, title, desc, docId, btnLabel) {
        container.innerHTML = '<div style="text-align:center;padding:60px;color:var(--text-secondary,#7f8c8d);">' +
            '<i class="fas ' + icon + '" style="font-size:4em;margin-bottom:20px;color:' + color + ';display:block;"></i>' +
            '<p style="font-size:16px;font-weight:500;margin-bottom:8px;">' + this.esc(title) + '</p>' +
            '<p style="font-size:13px;max-width:420px;margin:0 auto 24px;">' + this.esc(desc) + '</p>' +
            '<button onclick="DocMgmt.downloadDocument(\'' + this.esc(docId) + '\')" style="padding:12px 24px;background:' + color + ';color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px;">' +
            '<i class="fas fa-download"></i> ' + this.esc(btnLabel) + '</button></div>';
    },

    // ============================================================================
    // EML (E-POSTA) ONIZLEME
    // ============================================================================
    _previewEml(docId, container) {
        const self = this;
        fetch(this._documentUrl(docId))
            .then(r => r.text())
            .then(raw => {
                const dbl = raw.indexOf('\r\n\r\n') >= 0 ? '\r\n\r\n' : '\n\n';
                const sepIdx = raw.indexOf(dbl);
                const headerBlock = sepIdx >= 0 ? raw.substring(0, sepIdx) : raw;
                const bodyRaw = sepIdx >= 0 ? raw.substring(sepIdx + dbl.length) : '';

                const headers = self._parseEmlHeaders(headerBlock);
                const ct = headers['content-type'] || 'text/plain';

                function decodeBody(text, enc) {
                    const e = (enc || '').toLowerCase().trim();
                    if (e === 'base64') {
                        try { return atob(text.replace(/[\r\n\s]/g, '')); } catch (_) { return text; }
                    } else if (e === 'quoted-printable') {
                        return text.replace(/=\r?\n/g, '').replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
                    }
                    return text;
                }

                function parseParts(body, contentType) {
                    const bm = contentType.match(/boundary\s*=\s*"?([^";\s]+)"?/i);
                    if (!bm) return null;
                    const boundary = '--' + bm[1];
                    const result = [];
                    body.split(new RegExp(boundary + '-{0,2}\\r?\\n?')).forEach(part => {
                        const p = part.replace(/^\r?\n/, '').replace(/\r?\n$/, '');
                        if (!p || p === '--') return;
                        const hasCrlf = p.indexOf('\r\n\r\n') >= 0;
                        const si = hasCrlf ? p.indexOf('\r\n\r\n') : p.indexOf('\n\n');
                        if (si < 0) return;
                        result.push({
                            headers: self._parseEmlHeaders(p.substring(0, si)),
                            body: p.substring(si + (hasCrlf ? 4 : 2))
                        });
                    });
                    return result;
                }

                let bodyHtml = '';
                const attachments = [];

                if (ct.includes('multipart/')) {
                    const parts = parseParts(bodyRaw, ct) || [];
                    let txtPart = '', htmPart = '';
                    parts.forEach(p => {
                        const pct = p.headers['content-type'] || '';
                        const pcd = p.headers['content-disposition'] || '';
                        const decoded = decodeBody(p.body, p.headers['content-transfer-encoding']);
                        if (pcd.includes('attachment')) {
                            const fnm = (pcd + ';' + pct).match(/(?:filename|name)\s*=\s*"?([^";\s]+)"?/i);
                            attachments.push(fnm ? fnm[1] : 'Ek');
                        } else if (pct.includes('text/html') && !htmPart) {
                            htmPart = decoded;
                        } else if (pct.includes('text/plain') && !txtPart) {
                            txtPart = decoded;
                        }
                    });
                    if (htmPart) {
                        bodyHtml = '<iframe srcdoc="' + self.esc(htmPart) + '" sandbox="allow-same-origin" style="width:100%;height:480px;border:1px solid var(--border-color,#e0e0e0);border-radius:4px;background:white;"></iframe>';
                    } else {
                        bodyHtml = '<pre style="white-space:pre-wrap;word-break:break-word;line-height:1.7;color:var(--text-color,#2c3e50);font-family:inherit;margin:0;">' + self.esc(txtPart || bodyRaw) + '</pre>';
                    }
                } else if (ct.includes('text/html')) {
                    bodyHtml = '<iframe srcdoc="' + self.esc(decodeBody(bodyRaw, headers['content-transfer-encoding'])) + '" sandbox="allow-same-origin" style="width:100%;height:480px;border:1px solid var(--border-color,#e0e0e0);border-radius:4px;background:white;"></iframe>';
                } else {
                    bodyHtml = '<pre style="white-space:pre-wrap;word-break:break-word;line-height:1.7;color:var(--text-color,#2c3e50);font-family:inherit;margin:0;">' + self.esc(decodeBody(bodyRaw, headers['content-transfer-encoding'])) + '</pre>';
                }

                const attHtml = attachments.length
                    ? '<div style="margin-top:16px;padding:12px 16px;background:var(--main-bg,#f8f9fa);border-radius:6px;border:1px solid var(--border-color,#e0e0e0);font-size:13px;">' +
                      '<strong style="color:var(--text-secondary,#6c757d);"><i class="fas fa-paperclip"></i> Ekler (' + attachments.length + ')</strong>' +
                      attachments.map(a => '<div style="padding:4px 0 0 20px;color:var(--text-color,#2c3e50);">' + self.esc(a) + '</div>').join('') + '</div>'
                    : '';

                container.innerHTML = '<div style="background:var(--card-bg,white);border-radius:8px;overflow:hidden;max-width:920px;margin:0 auto;">' +
                    '<div style="padding:20px 24px;border-bottom:1px solid var(--border-color,#e0e0e0);background:var(--main-bg,#f8f9fa);">' +
                    '<div style="font-size:17px;font-weight:600;color:var(--text-color,#2c3e50);margin-bottom:12px;">' + self.esc(headers['subject'] || '(Konu yok)') + '</div>' +
                    '<div style="display:grid;gap:5px;font-size:13px;color:var(--text-secondary,#6c757d);">' +
                    (headers['from'] ? '<div><span style="min-width:70px;display:inline-block;font-weight:500;">Kimden:</span>' + self.esc(headers['from']) + '</div>' : '') +
                    (headers['to'] ? '<div><span style="min-width:70px;display:inline-block;font-weight:500;">Kime:</span>' + self.esc(headers['to']) + '</div>' : '') +
                    (headers['cc'] ? '<div><span style="min-width:70px;display:inline-block;font-weight:500;">CC:</span>' + self.esc(headers['cc']) + '</div>' : '') +
                    (headers['date'] ? '<div><span style="min-width:70px;display:inline-block;font-weight:500;">Tarih:</span>' + self.esc(headers['date']) + '</div>' : '') +
                    '</div></div>' +
                    '<div style="padding:20px 24px;">' + bodyHtml + attHtml + '</div>' +
                    '</div>';
            })
            .catch(err => {
                container.innerHTML = '<div style="text-align:center;padding:60px;color:#e74c3c;"><i class="fas fa-exclamation-triangle" style="font-size:3em;margin-bottom:15px;"></i><p>E-posta dosyasi okunamadi: ' + this.esc(err.message) + '</p></div>';
            });
    },

    // ============================================================================
    // MSG (OUTLOOK) ONIZLEME
    // ============================================================================
    _previewMsg(docId, container) {
        this._renderDownloadFallback(
            container, 'fa-envelope', '#d35400',
            'Microsoft Outlook Mesaji (.msg)',
            '.msg formati ikili OLE2 dosyasidir; tarayici icinde onizlenemiyor. Dosyayi indirip Outlook veya uyumlu bir posta istemcisiyle acabilirsiniz.',
            docId, 'MSG Dosyasini Indir'
        );
    },

    // ============================================================================
    // ZIP ICERIGI ONIZLEME (JSZip)
    // ============================================================================
    _previewZip(docId, container) {
        const self = this;
        container.innerHTML = '<div style="text-align:center;padding:40px;color:#3498db;"><i class="fas fa-spinner fa-spin" style="font-size:2em;"></i><p style="margin-top:12px;">ZIP icerigi yukleniyor...</p></div>';

        const doLoad = () => {
            fetch(this._documentUrl(docId))
                .then(r => r.arrayBuffer())
                .then(buf => JSZip.loadAsync(buf))
                .then(zip => {
                    const entries = [];
                    zip.forEach((path, entry) => {
                        entries.push({ name: path, isDir: entry.dir, size: entry._data ? (entry._data.uncompressedSize || 0) : 0 });
                    });
                    entries.sort((a, b) => {
                        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
                        return a.name.localeCompare(b.name);
                    });
                    const fmtSize = n => {
                        if (!n) return '-';
                        if (n >= 1048576) return (n / 1048576).toFixed(1) + ' MB';
                        if (n >= 1024) return (n / 1024).toFixed(1) + ' KB';
                        return n + ' B';
                    };
                    const rows = entries.map(e => {
                        const icon = e.isDir ? 'fa-folder' : 'fa-file';
                        const color = e.isDir ? '#f39c12' : '#7f8c8d';
                        return '<tr><td style="padding:8px 14px;border-bottom:1px solid var(--border-color,#e0e0e0);"><i class="fas ' + icon + '" style="color:' + color + ';margin-right:8px;font-size:13px;"></i>' + self.esc(e.name) + '</td>' +
                               '<td style="padding:8px 14px;border-bottom:1px solid var(--border-color,#e0e0e0);text-align:right;color:var(--text-secondary,#7f8c8d);font-size:12px;">' + (e.isDir ? '<em>klasor</em>' : self.esc(fmtSize(e.size))) + '</td></tr>';
                    }).join('');
                    container.innerHTML = '<div style="background:var(--card-bg,white);border-radius:8px;overflow:hidden;">' +
                        '<div style="padding:14px 20px;border-bottom:1px solid var(--border-color,#e0e0e0);display:flex;justify-content:space-between;align-items:center;">' +
                        '<span style="font-weight:600;color:var(--text-color,#2c3e50);"><i class="fas fa-file-archive" style="color:#8e44ad;margin-right:8px;"></i>ZIP İçeriği &mdash; ' + entries.length + ' öğe</span>' +
                        '<button onclick="DocMgmt.downloadDocument(\'' + self.esc(docId) + '\')" style="padding:6px 14px;background:#8e44ad;color:white;border:none;border-radius:6px;cursor:pointer;font-size:13px;"><i class="fas fa-download"></i> Indir</button></div>' +
                        '<div style="overflow:auto;max-height:520px;"><table style="width:100%;border-collapse:collapse;">' +
                        '<thead><tr style="background:var(--main-bg,#f8f9fa);position:sticky;top:0;">' +
                        '<th style="padding:10px 14px;text-align:left;font-size:12px;font-weight:500;color:var(--text-secondary,#7f8c8d);">Dosya Adı</th>' +
                        '<th style="padding:10px 14px;text-align:right;font-size:12px;font-weight:500;color:var(--text-secondary,#7f8c8d);">Boyut</th></tr></thead>' +
                        '<tbody>' + rows + '</tbody></table></div></div>';
                })
                .catch(err => {
                    container.innerHTML = '<div style="text-align:center;padding:60px;color:#e74c3c;"><p>ZIP okunamadi: ' + self.esc(err.message) + '</p>' +
                        '<button onclick="DocMgmt.downloadDocument(\'' + self.esc(docId) + '\')" style="margin-top:15px;padding:10px 20px;background:#8e44ad;color:white;border:none;border-radius:6px;cursor:pointer;"><i class="fas fa-download"></i> Indir</button></div>';
                });
        };

        this._loadScript(
            'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
            'JSZip', doLoad,
            () => {
                container.innerHTML = '<div style="text-align:center;padding:60px;color:var(--text-secondary,#7f8c8d);"><p>ZIP onizleme kutuphanesi yuklenemedi.</p>' +
                    '<button onclick="DocMgmt.downloadDocument(\'' + self.esc(docId) + '\')" style="margin-top:15px;padding:10px 20px;background:#8e44ad;color:white;border:none;border-radius:6px;cursor:pointer;"><i class="fas fa-download"></i> Indir</button></div>';
            }
        );
    },

    // ============================================================================
    // DIGER ARSIV FORMATLARI (RAR, 7Z, TAR, GZ...)
    // ============================================================================
    _previewArchiveGeneric(docId, container, ft) {
        const labels = { 'rar': 'WinRAR Arsivi', '7z': '7-Zip Arsivi', 'tar': 'TAR Arsivi', 'gz': 'Gzip Arsivi', 'bz2': 'Bzip2 Arsivi', 'xz': 'XZ Arsivi' };
        this._renderDownloadFallback(
            container, 'fa-file-archive', '#8e44ad',
            labels[ft] || (ft.toUpperCase() + ' Arsivi'),
            'Bu arsiv formati tarayici icinde acilemiyor. Dosyayi indirip uygun bir arac ile acabilirsiniz.',
            docId, 'Arsivi Indir'
        );
    },

    // ============================================================================
    // MARKDOWN ONIZLEME (marked.js)
    // ============================================================================
    _previewMarkdown(docId, container) {
        const self = this;
        const doRender = (text) => {
            try {
                const html = marked.parse(text, { gfm: true, breaks: true });
                container.innerHTML = '<div style="background:var(--card-bg,white);padding:28px 32px;border-radius:8px;max-width:900px;margin:0 auto;line-height:1.8;color:var(--text-color,#2c3e50);" class="md-preview">' + html + '</div>';
                container.querySelectorAll('pre').forEach(pre => {
                    pre.style.cssText = 'background:var(--main-bg,#f8f9fa);padding:14px;border-radius:6px;overflow-x:auto;border:1px solid var(--border-color,#e0e0e0);';
                });
                container.querySelectorAll('code').forEach(code => {
                    if (code.parentElement.tagName !== 'PRE') code.style.cssText = 'background:var(--main-bg,#f8f9fa);padding:2px 6px;border-radius:3px;font-size:0.9em;';
                });
            } catch (e) {
                container.innerHTML = '<div style="background:var(--card-bg,white);padding:20px;border-radius:8px;font-family:monospace;white-space:pre-wrap;line-height:1.6;">' + self.esc(text) + '</div>';
            }
        };
        fetch(this._documentUrl(docId))
            .then(r => r.text())
            .then(text => {
                this._loadScript(
                    'https://cdnjs.cloudflare.com/ajax/libs/marked/9.1.6/marked.min.js',
                    'marked', () => doRender(text),
                    () => { container.innerHTML = '<div style="background:var(--card-bg,white);padding:20px;border-radius:8px;font-family:monospace;white-space:pre-wrap;line-height:1.6;">' + self.esc(text) + '</div>'; }
                );
            })
            .catch(() => {
                container.innerHTML = '<div style="text-align:center;padding:60px;color:#e74c3c;"><p>Dosya okunamadi</p></div>';
            });
    },

    // ============================================================================
    // RTF ONIZLEME (basit strip)
    // ============================================================================
    _previewRtf(docId, container) {
        const self = this;
        fetch(this._documentUrl(docId))
            .then(r => r.text())
            .then(raw => {
                const text = raw
                    .replace(/\{\\[^{}]*\}/g, ' ')
                    .replace(/\\(?:par|line|tab|page|sect|column)\b ?/gi, '\n')
                    .replace(/\\[a-z*-]+[-]?[0-9]* ?/gi, '')
                    .replace(/[{}\\]/g, '')
                    .replace(/[ \t]+/g, ' ')
                    .trim();
                container.innerHTML = '<div style="background:var(--card-bg,white);padding:20px;border-radius:8px;">' +
                    '<div style="background:#fff3cd;border-left:4px solid #ffc107;padding:10px 14px;margin-bottom:16px;border-radius:4px;font-size:13px;">' +
                    '<i class="fas fa-info-circle" style="color:#856404;margin-right:6px;"></i><span style="color:#856404;">RTF icerigi kismi donusturuldu. Tam bicimlendirilmis gorunum icin dosyayi indirin.</span></div>' +
                    '<pre style="white-space:pre-wrap;line-height:1.7;color:var(--text-color,#2c3e50);font-family:inherit;">' + self.esc(text) + '</pre></div>';
            })
            .catch(() => {
                this._renderDownloadFallback(
                    container, 'fa-file-word', '#2980b9',
                    'RTF Dosyasi', 'Dosya okunamadi.',
                    docId, 'RTF Dosyasini Indir'
                );
            });
    },

    closePreview() {
        const modal = document.getElementById('doc-preview-modal');
        if (!modal) return;
        // Calan video/ses varsa durdur ki modal kapandiktan sonra arka planda calmasin
        modal.querySelectorAll('video, audio').forEach(el => {
            try { el.pause(); el.removeAttribute('src'); el.load(); } catch (_) {}
        });
        modal.style.display = 'none';
    },

    // ============================================================================
    // DOWNLOAD
    // ============================================================================
    _documentUrl(docId) {
        const doc = this.findDocumentById(docId);
        return doc && doc.url ? doc.url : 'view-document.php?id=' + encodeURIComponent(docId);
    },

    downloadDocument(docId) {
        const doc = this.findDocumentById(docId);
        if (doc && doc.url) {
            window.demoFiles.download(doc.url, doc.name);
        } else {
            alert('Bu doküman demo dosya kütüphanesinde bulunamadı.');
        }
    },

    // ============================================================================
    // DELETE (Soft - move to trash)
    // ============================================================================
    deleteDocument(docId) {
        const doc = this.findDocumentById(docId);
        const docName = doc ? doc.name : docId;
        if (!confirm('"' + docName + '" dosyasini silmek istediginizden emin misiniz?\n\nDosya cop kutusuna tasinacak.')) return;

        fetch('delete-document.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: docId })
        })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    if (typeof showNotification === 'function') showNotification('Dosya cop kutusuna tasindi', 'success');
                    else alert('Dosya cop kutusuna tasindi');
                    this.refreshAll();
                } else {
                    alert('Hata: ' + (data.error || 'Silme basarisiz'));
                }
            })
            .catch(err => alert('Silme hatasi: ' + err.message));
    },

    // ============================================================================
    // MOVE DOCUMENT
    // ============================================================================
    openMoveModal(docPath, docName) {
        // Load folders and show move modal
        fetch('get-folders.php', { credentials: 'same-origin' })
            .then(r => r.json())
            .then(data => {
                if (!data.success) { alert('Klasorler yuklenemedi'); return; }

                const folders = data.folders || [];
                const select = document.getElementById('move-document-target-folder');
                if (select) {
                    select.innerHTML = '<option value="">Ana Dizin</option>';
                    folders.forEach(f => {
                        const opt = document.createElement('option');
                        opt.value = f;
                        opt.textContent = f;
                        select.appendChild(opt);
                    });
                }

                document.getElementById('move-document-id').value = docPath;
                const nameEl = document.getElementById('move-document-name');
                if (nameEl) nameEl.textContent = docName;

                if (typeof openModal === 'function') openModal('move-document-modal');
                else {
                    const m = document.getElementById('move-document-modal');
                    if (m) m.style.display = 'block';
                }
            })
            .catch(err => alert('Klasorler yuklenemedi: ' + err.message));
    },

    // ============================================================================
    // RENAME DOCUMENT
    // ============================================================================
    renameDocument(docId, currentName) {
        const baseName = currentName.replace(/\.[^.]+$/, '');
        const newName = prompt('Yeni dosya adi:', baseName);
        if (!newName || newName.trim() === '' || newName.trim() === baseName) return;

        fetch('rename-document.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: docId, new_name: newName.trim() })
        })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    if (typeof showNotification === 'function') showNotification('Dosya yeniden adlandirildi', 'success');
                    this.refreshAll();
                } else {
                    alert('Hata: ' + (data.error || 'Yeniden adlandirma basarisiz'));
                }
            })
            .catch(err => alert('Hata: ' + err.message));
    },

    // ============================================================================
    // TRASH VIEW
    // ============================================================================
    showTrash() {
        this.trashMode = true;
        this.currentFolder = null;

        // Highlight trash in folder tree
        document.querySelectorAll('#folder-tree .folder-item').forEach(el => el.classList.remove('selected'));
        const trashEl = document.querySelector('#folder-tree [data-folder="__trash__"]');
        if (trashEl) trashEl.classList.add('selected');

        const header = document.getElementById('files-header');
        if (header) header.innerHTML = '<h4 style="margin:0;color:var(--text-color,#2c3e50);font-size:16px;font-weight:600;"><i class="fas fa-trash-alt" style="color:#e74c3c;"></i> Silinenler</h4><p style="margin:5px 0 0;color:var(--text-secondary,#7f8c8d);font-size:13px;">30 gun sonra otomatik silinir</p>';

        const grid = document.getElementById('files-grid');
        if (grid) grid.innerHTML = '<div style="text-align:center;padding:40px;color:#3498db;"><i class="fas fa-spinner fa-spin" style="font-size:2em;"></i></div>';

        fetch('get-trash.php', { credentials: 'same-origin' })
            .then(r => r.json())
            .then(data => {
                if (!data.success || !data.items || data.items.length === 0) {
                    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-secondary,#7f8c8d);"><i class="fas fa-trash-alt" style="font-size:3em;margin-bottom:15px;color:#bdc3c7;"></i><p style="margin:0;font-size:15px;">Cop kutusu bos</p></div>';
                    return;
                }

                // Add empty trash button to header
                if (header) header.innerHTML += '<button onclick="DocMgmt.emptyAllTrash()" style="margin-top:8px;padding:6px 14px;background:#e74c3c;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;"><i class="fas fa-trash"></i> Cop Kutusunu Bosalt</button>';

                grid.innerHTML = '';
                data.items.forEach(item => {
                    const card = document.createElement('div');
                    card.className = 'document-card trash-card';

                    const icon = this.getFileIcon(item.type);
                    const color = this.getFileColor(item.type);

                    card.innerHTML = `
                        <div class="document-icon"><i class="fas ${icon}" style="color:${color};opacity:0.5;"></i></div>
                        <div class="document-info">
                            <div class="document-name" title="${this.esc(item.original_name)}">${this.esc(item.original_name)}</div>
                            <div class="document-meta">
                                <span>${this.esc(item.size || '-')}</span>
                                <span>Silindi: ${this.esc(item.deleted_at || '-')}</span>
                            </div>
                            <div class="document-meta"><span style="color:#e67e22;">Eski konum: ${this.esc(item.original_path || '-')}</span></div>
                        </div>
                        <div class="document-actions">
                            <button class="action-btn restore-btn" title="Geri Yukle" style="color:#27ae60;"><i class="fas fa-undo"></i></button>
                            <button class="action-btn perm-delete-btn" title="Kalici Sil" style="color:#e74c3c;"><i class="fas fa-times-circle"></i></button>
                        </div>`;

                    card.querySelector('.restore-btn').onclick = (e) => { e.stopPropagation(); this.restoreFromTrash(item.trash_name); };
                    card.querySelector('.perm-delete-btn').onclick = (e) => { e.stopPropagation(); this.permanentDelete(item.trash_name, item.original_name); };

                    grid.appendChild(card);
                });
            })
            .catch(err => {
                grid.innerHTML = '<div style="text-align:center;padding:60px;color:#e74c3c;"><p>Cop kutusu yuklenemedi</p></div>';
            });
    },

    restoreFromTrash(trashName) {
        fetch('restore-document.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ trash_name: trashName })
        })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    if (typeof showNotification === 'function') showNotification('Dosya geri yuklendi', 'success');
                    this.showTrash();
                    this.refreshAll();
                } else {
                    alert('Hata: ' + (data.error || 'Geri yukleme basarisiz'));
                }
            })
            .catch(err => alert('Hata: ' + err.message));
    },

    permanentDelete(trashName, fileName) {
        if (!confirm('"' + fileName + '" kalici olarak silinecek. Bu islem geri alinamaz!')) return;

        fetch('empty-trash.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ trash_name: trashName })
        })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    if (typeof showNotification === 'function') showNotification('Dosya kalici olarak silindi', 'success');
                    this.showTrash();
                    this.refreshAll();
                } else {
                    alert('Hata: ' + (data.error || 'Silme basarisiz'));
                }
            })
            .catch(err => alert('Hata: ' + err.message));
    },

    emptyAllTrash() {
        if (!confirm('Cop kutusundaki TUM dosyalar kalici olarak silinecek!\n\nBu islem geri alinamaz. Devam etmek istiyor musunuz?')) return;

        fetch('empty-trash.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    if (typeof showNotification === 'function') showNotification('Cop kutusu bosaltildi', 'success');
                    this.showTrash();
                    this.refreshAll();
                } else {
                    alert('Hata: ' + (data.error || 'Bosaltma basarisiz'));
                }
            })
            .catch(err => alert('Hata: ' + err.message));
    },

    // ============================================================================
    // SEARCH
    // ============================================================================
    setupSearch() {
        const searchInput = document.getElementById('document-search');
        if (!searchInput) return;

        // Content search toggle button
        const toggleBtn = document.getElementById('content-search-toggle');
        if (toggleBtn) {
            toggleBtn.onclick = () => {
                this.contentSearchMode = !this.contentSearchMode;
                toggleBtn.classList.toggle('active', this.contentSearchMode);
                toggleBtn.title = this.contentSearchMode ? 'Dosya adı aramasına geç' : 'İçerik aramasına geç';
                searchInput.placeholder = this.contentSearchMode ? 'Dosya içeriğinde ara...' : 'Dosya adında ara...';
                if (searchInput.value.trim()) searchInput.dispatchEvent(new Event('input'));
            };
        }

        let _searchTimer = null;
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            this.searchQuery = query.toLowerCase();

            if (this.trashMode) return;

            if (query === '') {
                if (this.currentFolder) this.displayFolderFiles(this.currentFolder);
                else this.displayAllFiles();
                return;
            }

            if (this.contentSearchMode) {
                clearTimeout(_searchTimer);
                _searchTimer = setTimeout(() => this.searchContent(query), 400);
            } else {
                const allFiles = this.getAllFilesFromTree(this.allDocuments);
                const results = allFiles.filter(f => f.name.toLowerCase().includes(this.searchQuery));
                const header = document.getElementById('files-header');
                if (header) header.innerHTML = '<h4 style="margin:0;color:var(--text-color,#2c3e50);font-size:16px;font-weight:600;"><i class="fas fa-search" style="color:#3498db;"></i> Arama Sonuçları</h4><p style="margin:5px 0 0;color:var(--text-secondary,#7f8c8d);font-size:13px;">"' + this.esc(query) + '" için ' + results.length + ' sonuç</p>';
                this.renderFilesGrid(results);
            }
        });

        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Escape') {
                searchInput.value = '';
                this.searchQuery = '';
                if (this.currentFolder) this.displayFolderFiles(this.currentFolder);
                else this.displayAllFiles();
            }
        });
    },

    // ============================================================================
    // UPLOAD
    // ============================================================================
    setupUpload() {
        const form = document.getElementById('add-document-form');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const folderSelect = document.getElementById('document-folder');
            const fileInput = document.getElementById('document-file');

            if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
                alert('Lutfen bir dosya secin');
                return;
            }

            const folder = folderSelect ? folderSelect.value : '';
            const file = fileInput.files[0];

            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', folder);

            // FormData'ya alindi, formu hemen sifirla (yukleme sirasinda dirty check tetiklenmesin)
            form.reset();

            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Yukleniyor...'; }

            fetch('upload-document.php', { method: 'POST', body: formData })
                .then(r => r.json())
                .then(data => {
                    if (data.success) {
                        if (typeof showNotification === 'function') showNotification('Dokuman basariyla yuklendi!', 'success');
                        else alert('Dokuman basariyla yuklendi!');
                        if (typeof closeModal === 'function') closeModal('add-document-modal', true);
                        this.refreshAll();
                    } else {
                        if (typeof showNotification === 'function') showNotification('Hata: ' + (data.error || 'Yukleme basarisiz'), 'error');
                        else alert('Hata: ' + (data.error || 'Yukleme basarisiz'));
                    }
                })
                .catch(err => {
                    if (typeof showNotification === 'function') showNotification('Yukleme hatasi: ' + err.message, 'error');
                    else alert('Yukleme hatasi: ' + err.message);
                })
                .finally(() => {
                    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Yukle'; }
                });
        });
    },

    // ============================================================================
    // UTILITY FUNCTIONS
    // ============================================================================
    getAllFilesFromTree(items) {
        let files = [];
        (items || []).forEach(item => {
            if (item.isDirectory && Array.isArray(item.children)) {
                files = files.concat(this.getAllFilesFromTree(item.children));
            } else if (!item.isDirectory) {
                files.push(item);
            }
        });
        return files;
    },

    findDocumentById(id, items) {
        if (!items) items = this.allDocuments;
        for (const item of items) {
            if (!item.isDirectory && item.id === id) return item;
            if (item.isDirectory && item.children) {
                const found = this.findDocumentById(id, item.children);
                if (found) return found;
            }
        }
        return null;
    },

    getFileIcon(type) {
        const icons = {
            'pdf': 'fa-file-pdf',
            'doc': 'fa-file-word', 'docx': 'fa-file-word', 'rtf': 'fa-file-word', 'odt': 'fa-file-word',
            'xls': 'fa-file-excel', 'xlsx': 'fa-file-excel', 'ods': 'fa-file-excel',
            'ppt': 'fa-file-powerpoint', 'pptx': 'fa-file-powerpoint', 'odp': 'fa-file-powerpoint',
            'txt': 'fa-file-alt', 'md': 'fa-file-alt', 'csv': 'fa-file-csv', 'one': 'fa-sticky-note',
            'jpg': 'fa-file-image', 'jpeg': 'fa-file-image', 'png': 'fa-file-image', 'gif': 'fa-file-image',
            'svg': 'fa-file-image', 'bmp': 'fa-file-image', 'webp': 'fa-file-image',
            'ico': 'fa-file-image', 'tiff': 'fa-file-image', 'tif': 'fa-file-image',
            'mp4': 'fa-file-video', 'avi': 'fa-file-video', 'mkv': 'fa-file-video',
            'mov': 'fa-file-video', 'webm': 'fa-file-video', 'm4v': 'fa-file-video',
            'mp3': 'fa-file-audio', 'wav': 'fa-file-audio', 'm4a': 'fa-file-audio',
            'aac': 'fa-file-audio', 'flac': 'fa-file-audio', 'ogg': 'fa-file-audio',
            'eml': 'fa-envelope', 'msg': 'fa-envelope',
            'zip': 'fa-file-archive', 'rar': 'fa-file-archive', '7z': 'fa-file-archive',
            'tar': 'fa-file-archive', 'gz': 'fa-file-archive', 'bz2': 'fa-file-archive', 'xz': 'fa-file-archive',
            'json': 'fa-file-code', 'xml': 'fa-file-code', 'html': 'fa-file-code', 'css': 'fa-file-code',
            'js': 'fa-file-code', 'ts': 'fa-file-code', 'tsx': 'fa-file-code', 'jsx': 'fa-file-code',
            'py': 'fa-file-code', 'php': 'fa-file-code', 'go': 'fa-file-code', 'java': 'fa-file-code',
            'yaml': 'fa-file-code', 'yml': 'fa-file-code', 'toml': 'fa-file-code',
            'sh': 'fa-terminal', 'bat': 'fa-terminal', 'ps1': 'fa-terminal', 'cmd': 'fa-terminal',
            'sql': 'fa-database',
        };
        return icons[type] || 'fa-file';
    },

    getFileColor(type) {
        const colors = {
            'pdf': '#e74c3c',
            'doc': '#2980b9', 'docx': '#2980b9', 'rtf': '#2980b9', 'odt': '#2980b9',
            'xls': '#27ae60', 'xlsx': '#27ae60', 'ods': '#27ae60',
            'ppt': '#e67e22', 'pptx': '#e67e22', 'odp': '#e67e22',
            'txt': '#95a5a6', 'md': '#2c3e50', 'csv': '#16a085', 'one': '#7b2d8e',
            'jpg': '#3498db', 'jpeg': '#3498db', 'png': '#3498db', 'gif': '#3498db',
            'svg': '#9b59b6', 'bmp': '#3498db', 'webp': '#3498db',
            'ico': '#3498db', 'tiff': '#3498db', 'tif': '#3498db',
            'mp4': '#c0392b', 'avi': '#c0392b', 'mkv': '#c0392b', 'mov': '#c0392b', 'webm': '#c0392b', 'm4v': '#c0392b',
            'mp3': '#1abc9c', 'wav': '#1abc9c', 'm4a': '#1abc9c', 'aac': '#1abc9c', 'flac': '#1abc9c', 'ogg': '#1abc9c',
            'eml': '#e67e22', 'msg': '#d35400',
            'zip': '#8e44ad', 'rar': '#8e44ad', '7z': '#8e44ad', 'tar': '#8e44ad', 'gz': '#8e44ad', 'bz2': '#8e44ad', 'xz': '#8e44ad',
            'json': '#f39c12', 'xml': '#e74c3c', 'html': '#e44d26', 'css': '#264de4',
            'js': '#f7df1e', 'ts': '#007acc', 'py': '#3572a5', 'php': '#777bb4',
            'go': '#00add8', 'java': '#b07219', 'sh': '#2c3e50', 'bat': '#2c3e50', 'ps1': '#012456',
            'yaml': '#16a085', 'yml': '#16a085', 'sql': '#c0392b',
        };
        return colors[type] || '#7f8c8d';
    },

    // ============================================================================
    // FAVORITES
    // ============================================================================
    loadFavorites() {
        fetch('api/doc-favorites.php', { credentials: 'same-origin' })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    // API [{document_id, added_at}] dizisi döndürüyor — sadece ID'leri al
                    this.favorites = new Set((data.favorites || []).map(f => f.document_id));
                    const el = document.querySelector('[data-folder="__favorites__"] .folder-count');
                    if (el) el.textContent = this.favorites.size;
                }
            })
            .catch(() => {});
    },

    toggleFavorite(docId, btn) {
        fetch('api/doc-favorites.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // API doc_id bekliyor (document_id değil)
            body: JSON.stringify({ doc_id: docId })
        })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    // API favorited döndürüyor (added değil)
                    if (data.favorited) {
                        this.favorites.add(docId);
                        btn.classList.add('is-fav');
                        btn.title = 'Favorilerden Çıkar';
                    } else {
                        this.favorites.delete(docId);
                        btn.classList.remove('is-fav');
                        btn.title = 'Favorilere Ekle';
                    }
                    const el = document.querySelector('[data-folder="__favorites__"] .folder-count');
                    if (el) el.textContent = this.favorites.size;
                }
            })
            .catch(() => {});
    },

    showFavorites() {
        this._specialView = 'favorites';
        this._tagFilter = null;
        this.currentFolder = null;
        this.trashMode = false;
        document.querySelectorAll('#folder-tree .folder-item').forEach(el => el.classList.remove('selected'));
        const el = document.querySelector('[data-folder="__favorites__"]');
        if (el) el.classList.add('selected');
        const allFiles = this.getAllFilesFromTree(this.allDocuments);
        const favFiles = allFiles.filter(f => this.favorites.has(f.id));
        const header = document.getElementById('files-header');
        if (header) header.innerHTML = '<h4 style="margin:0;color:var(--text-color,#2c3e50);font-size:16px;font-weight:600;"><i class="fas fa-star" style="color:#f39c12;"></i> Favorilerim</h4><p style="margin:5px 0 0;color:var(--text-secondary,#7f8c8d);font-size:13px;">' + favFiles.length + ' dosya</p>';
        this.renderFilesGrid(favFiles);
    },

    // ============================================================================
    // RECENT VIEWS
    // ============================================================================
    loadRecentViews() {
        fetch('api/doc-views.php', { credentials: 'same-origin' })
            .then(r => r.json())
            .then(data => {
                if (data.success) this.recentViews = data.views || [];
            })
            .catch(() => {});
    },

    recordView(docId) {
        fetch('api/doc-views.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ document_id: docId })
        }).catch(() => {});
    },

    showRecentViews() {
        this._specialView = 'recent';
        this._tagFilter = null;
        this.currentFolder = null;
        this.trashMode = false;
        document.querySelectorAll('#folder-tree .folder-item').forEach(el => el.classList.remove('selected'));
        const el = document.querySelector('[data-folder="__recent__"]');
        if (el) el.classList.add('selected');
        const allFiles = this.getAllFilesFromTree(this.allDocuments);

        fetch('api/doc-views.php', { credentials: 'same-origin' })
            .then(r => r.json())
            .then(data => {
                this.recentViews = data.views || [];
                const recentFiles = this.recentViews
                    .map(v => allFiles.find(f => f.id === v.document_id))
                    .filter(Boolean);
                const header = document.getElementById('files-header');
                if (header) header.innerHTML = '<h4 style="margin:0;color:var(--text-color,#2c3e50);font-size:16px;font-weight:600;"><i class="fas fa-clock" style="color:#3498db;"></i> Son Görüntülenenler</h4><p style="margin:5px 0 0;color:var(--text-secondary,#7f8c8d);font-size:13px;">' + recentFiles.length + ' dosya</p>';
                this.renderFilesGrid(recentFiles);
            })
            .catch(() => {
                const header = document.getElementById('files-header');
                if (header) header.innerHTML = '<h4 style="margin:0;color:var(--text-color,#2c3e50);font-size:16px;font-weight:600;"><i class="fas fa-clock" style="color:#3498db;"></i> Son Görüntülenenler</h4>';
            });
    },

    // ============================================================================
    // TAGS
    // ============================================================================
    loadAllTags() {
        fetch('api/doc-tags.php?include_map=1', { credentials: 'same-origin' })
            .then(r => r.json())
            .then(data => {
                if (!data.success) return;
                this.allTags = data.tags || [];
                this.docTags = data.doc_map || {};
                this.renderFolderTree(this.allDocuments);
            })
            .catch(() => {});
    },

    filterByTag(tag) {
        this._tagFilter = tag.id;
        this._specialView = null;
        this.currentFolder = null;
        this.trashMode = false;
        document.querySelectorAll('#folder-tree .folder-item').forEach(el => el.classList.remove('selected'));
        const el = document.querySelector('[data-folder="__tag__' + tag.id + '"]');
        if (el) el.classList.add('selected');
        const allFiles = this.getAllFilesFromTree(this.allDocuments);
        const taggedFiles = allFiles.filter(f => (this.docTags[f.id] || []).some(t => t.id === tag.id));
        const header = document.getElementById('files-header');
        if (header) header.innerHTML = '<h4 style="margin:0;color:var(--text-color,#2c3e50);font-size:16px;font-weight:600;"><i class="fas fa-tag" style="color:' + this.esc(tag.color) + ';"></i> ' + this.esc(tag.name) + '</h4><p style="margin:5px 0 0;color:var(--text-secondary,#7f8c8d);font-size:13px;">' + taggedFiles.length + ' dosya</p>';
        this.renderFilesGrid(taggedFiles);
    },

    // ============================================================================
    // BULK OPERATIONS
    // ============================================================================
    toggleSelect(docId, checked) {
        if (checked) this.selectedIds.add(docId);
        else this.selectedIds.delete(docId);
        this._updateBulkToolbar();
    },

    _updateBulkToolbar() {
        const count = this.selectedIds.size;
        const toolbar = document.getElementById('bulk-action-toolbar');
        if (!toolbar) return;
        toolbar.style.display = count > 0 ? 'flex' : 'none';
        const countEl = toolbar.querySelector('.bulk-selected-count');
        if (countEl) countEl.textContent = count + ' dosya seçildi';
    },

    bulkDelete() {
        if (this.selectedIds.size === 0) return;
        if (!confirm(this.selectedIds.size + ' dosya çöp kutusuna taşınacak. Devam edilsin mi?')) return;
        fetch('api/doc-bulk.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete', ids: [...this.selectedIds] })
        })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    if (typeof showNotification === 'function') showNotification(data.deleted + ' dosya silindi', 'success');
                    this.selectedIds.clear();
                    this._updateBulkToolbar();
                    this.refreshAll();
                } else {
                    alert('Hata: ' + (data.error || 'Toplu silme başarısız'));
                }
            })
            .catch(err => alert('Hata: ' + err.message));
    },

    bulkMove() {
        if (this.selectedIds.size === 0) return;
        fetch('get-folders.php', { credentials: 'same-origin' })
            .then(r => r.json())
            .then(data => {
                const folders = (data.folders || []);
                const target = prompt('Hedef klasör adı girin:\n\nMevcut klasörler:\n' + folders.join('\n') + '\n\n(Boş bırakın = Ana Dizin)');
                if (target === null) return;
                return fetch('api/doc-bulk.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'move', ids: [...this.selectedIds], value: target.trim() })
                });
            })
            .then(r => r && r.json())
            .then(data => {
                if (!data) return;
                if (data.success) {
                    if (typeof showNotification === 'function') showNotification(data.moved + ' dosya taşındı', 'success');
                    this.selectedIds.clear();
                    this._updateBulkToolbar();
                    this.refreshAll();
                } else {
                    alert('Hata: ' + (data.error || 'Toplu taşıma başarısız'));
                }
            })
            .catch(err => alert('Hata: ' + err.message));
    },

    bulkFavorite() {
        if (this.selectedIds.size === 0) return;
        fetch('api/doc-bulk.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'favorite', ids: [...this.selectedIds] })
        })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    [...this.selectedIds].forEach(id => this.favorites.add(id));
                    if (typeof showNotification === 'function') showNotification(this.selectedIds.size + ' dosya favorilere eklendi', 'success');
                    this.selectedIds.clear();
                    this._updateBulkToolbar();
                    this.refreshAll();
                }
            })
            .catch(() => {});
    },

    bulkTag() {
        if (this.selectedIds.size === 0) return;
        if (!this.allTags.length) { alert('Henüz etiket tanımlanmamış. Sistem Ayarları → Döküman Yönetimi bölümünden etiket oluşturun.'); return; }
        const tagList = this.allTags.map((t, i) => (i + 1) + '. ' + t.name).join('\n');
        const choice = prompt('Hangi etiketi atamak istiyorsunuz?\n\n' + tagList + '\n\nNumara girin:');
        if (!choice) return;
        const idx = parseInt(choice) - 1;
        if (isNaN(idx) || idx < 0 || idx >= this.allTags.length) { alert('Geçersiz seçim'); return; }
        const tag = this.allTags[idx];
        fetch('api/doc-bulk.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'tag', ids: [...this.selectedIds], value: tag.id })
        })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    if (typeof showNotification === 'function') showNotification(this.selectedIds.size + ' dosyaya "' + tag.name + '" etiketi atandı', 'success');
                    this.selectedIds.clear();
                    this._updateBulkToolbar();
                    this.loadAllTags();
                    this.refreshAll();
                } else {
                    alert('Hata: ' + (data.error || 'Etiketleme başarısız'));
                }
            })
            .catch(err => alert('Hata: ' + err.message));
    },

    bulkSelectAll() {
        document.querySelectorAll('#files-grid .document-card').forEach(card => {
            const docId = card.dataset.docId;
            const cb = card.querySelector('.doc-select-cb');
            if (docId && cb) { cb.checked = true; this.selectedIds.add(docId); }
        });
        this._updateBulkToolbar();
    },

    bulkClearSelection() {
        this.selectedIds.clear();
        document.querySelectorAll('.doc-select-cb').forEach(cb => { cb.checked = false; });
        this._updateBulkToolbar();
    },

    // ============================================================================
    // CONTENT SEARCH
    // ============================================================================
    searchContent(query) {
        if (query.length < 2) return;
        const header = document.getElementById('files-header');
        const grid = document.getElementById('files-grid');
        if (grid) grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#3498db;"><i class="fas fa-spinner fa-spin" style="font-size:2em;"></i><p style="margin-top:12px;">İçerik aranıyor...</p></div>';

        fetch('api/doc-search.php?q=' + encodeURIComponent(query), { credentials: 'same-origin' })
            .then(r => r.json())
            .then(data => {
                if (!data.success) { if (grid) grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#e74c3c;"><p>' + this.esc(data.error || 'Arama başarısız') + '</p></div>'; return; }
                if (header) header.innerHTML = '<h4 style="margin:0;color:var(--text-color,#2c3e50);font-size:16px;font-weight:600;"><i class="fas fa-search" style="color:#3498db;"></i> İçerik Arama: ' + this.esc(query) + '</h4><p style="margin:5px 0 0;color:var(--text-secondary,#7f8c8d);font-size:13px;">' + data.count + ' sonuç</p>';
                if (!data.results || data.results.length === 0) {
                    if (grid) grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-secondary,#7f8c8d);"><i class="fas fa-search" style="font-size:3em;margin-bottom:15px;color:#bdc3c7;"></i><p style="margin:0;font-size:15px;">Sonuç bulunamadı</p></div>';
                    return;
                }
                if (grid) {
                    grid.innerHTML = '';
                    data.results.forEach(r => {
                        const allFiles = this.getAllFilesFromTree(this.allDocuments);
                        const file = allFiles.find(f => f.id === r.document_id);
                        if (file) {
                            const card = this.createFileCard(file);
                            if (r.snippet) {
                                const info = card.querySelector('.document-info');
                                if (info) {
                                    const snip = document.createElement('div');
                                    snip.className = 'search-snippet';
                                    snip.innerHTML = r.snippet;
                                    info.appendChild(snip);
                                }
                            }
                            grid.appendChild(card);
                        } else {
                            const div = document.createElement('div');
                            div.className = 'document-card';
                            div.innerHTML = '<div class="document-icon"><i class="fas fa-file" style="color:#7f8c8d;"></i></div><div class="document-info"><div class="document-name">' + this.esc(r.file_path) + '</div>' + (r.snippet ? '<div class="search-snippet">' + r.snippet + '</div>' : '') + '</div>';
                            grid.appendChild(div);
                        }
                    });
                }
            })
            .catch(err => { if (grid) grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#e74c3c;"><p>Arama hatası: ' + this.esc(err.message) + '</p></div>'; });
    },

    esc(text) {
        if (!text && text !== 0) return '';
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
        return String(text).replace(/[&<>"']/g, ch => map[ch]);
    }
};

// ============================================================================
// AUTO-INITIALIZE
// ============================================================================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(() => DocMgmt.init(), 200));
} else {
    setTimeout(() => DocMgmt.init(), 200);
}

window.DocMgmt = DocMgmt;

// ============================================================================
// ETİKET YÖNETİM PANELİ (Admin — Ayarlar sayfası)
// ============================================================================
const DocTagMgr = {
    load() {
        const container = document.getElementById('tag-list-container');
        if (!container) return;
        container.innerHTML = '<div style="text-align:center;padding:20px;color:#3498db;"><i class="fas fa-spinner fa-spin"></i></div>';
        fetch('api/doc-tags.php').then(r => r.json()).then(data => {
            const tags = data.tags || [];
            if (!tags.length) {
                container.innerHTML = '<p style="color:#7f8c8d;font-size:13px;padding:12px 0;">Henüz etiket tanımlanmamış.</p>';
                return;
            }
            container.innerHTML = '<div style="display:flex;flex-wrap:wrap;gap:10px;">' +
                tags.map(t => `
                    <div style="display:flex;align-items:center;gap:8px;padding:8px 14px;border:2px solid ${DocMgmt.esc(t.color)};border-radius:20px;background:${DocMgmt.esc(t.color)}15;">
                        <span style="width:12px;height:12px;border-radius:50%;background:${DocMgmt.esc(t.color)};flex-shrink:0;"></span>
                        <span style="font-size:13px;font-weight:500;color:var(--text-color,#2c3e50);">${DocMgmt.esc(t.name)}</span>
                        <span style="font-size:11px;color:#7f8c8d;">${t.usage_count || 0} dosya</span>
                        <button onclick="DocTagMgr.deleteTag(${t.id},'${DocMgmt.esc(t.name)}')" style="border:none;background:none;cursor:pointer;color:#e74c3c;font-size:12px;padding:0 2px;" title="Sil"><i class="fas fa-times"></i></button>
                    </div>`).join('') + '</div>';
        }).catch(() => { container.innerHTML = '<p style="color:#e74c3c;">Etiketler yüklenemedi.</p>'; });
    },

    openCreateModal() {
        document.getElementById('tag-edit-id').value = '';
        document.getElementById('tag-name-input').value = '';
        document.getElementById('tag-color-input').value = '#3498db';
        document.getElementById('tag-modal-title').textContent = 'Yeni Etiket';
        openModal('tag-create-modal');
    },

    saveTag() {
        const name  = document.getElementById('tag-name-input').value.trim();
        const color = document.getElementById('tag-color-input').value;
        if (!name) { alert('Etiket adı boş olamaz'); return; }
        fetch('api/doc-tags.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'create', name, color })
        }).then(r => r.json()).then(data => {
            if (data.success) {
                closeModal('tag-create-modal');
                this.load();
                DocMgmt.loadAllTags();
                if (typeof showNotification === 'function') showNotification('Etiket oluşturuldu', 'success');
            } else {
                alert('Hata: ' + (data.error || 'Kayıt başarısız'));
            }
        }).catch(err => alert('Hata: ' + err.message));
    },

    deleteTag(tagId, tagName) {
        if (!confirm('"' + tagName + '" etiketi ve tüm atamalar silinecek. Devam?')) return;
        fetch('api/doc-tags.php', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tag_id: tagId })
        }).then(r => r.json()).then(data => {
            if (data.success) { this.load(); DocMgmt.loadAllTags(); if (typeof showNotification === 'function') showNotification('Etiket silindi', 'success'); }
            else alert('Hata: ' + (data.error || 'Silme başarısız'));
        }).catch(err => alert('Hata: ' + err.message));
    }
};
window.DocTagMgr = DocTagMgr;

// ============================================================================
// SINIFLANDIRMA KURALLARI PANELİ (Admin — Ayarlar sayfası)
// ============================================================================
const ClassRuleMgr = {
    load() {
        const container = document.getElementById('class-rules-container');
        if (!container) return;
        container.innerHTML = '<div style="text-align:center;padding:20px;color:#3498db;"><i class="fas fa-spinner fa-spin"></i></div>';
        fetch('api/classification-rules.php').then(r => r.json()).then(data => {
            const rules = data.rules || [];
            if (!rules.length) {
                container.innerHTML = '<p style="color:#7f8c8d;font-size:13px;padding:12px 0;">Henüz kural tanımlanmamış.</p>';
                return;
            }
            const matchLabels = { extension: 'Uzantı', name_contains: 'İsim içerir', size_gt: 'Boyut >', size_lt: 'Boyut <' };
            const actionLabels = { move_folder: '→ Klasör', add_tag: '🏷 Etiket' };
            container.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:13px;">' +
                '<thead><tr style="background:var(--main-bg,#f8f9fa);"><th style="padding:10px 12px;text-align:left;border-bottom:1px solid var(--border-color,#e0e0e0);">Ad</th><th style="padding:10px 12px;text-align:left;border-bottom:1px solid var(--border-color,#e0e0e0);">Koşul</th><th style="padding:10px 12px;text-align:left;border-bottom:1px solid var(--border-color,#e0e0e0);">Eylem</th><th style="padding:10px 12px;text-align:center;border-bottom:1px solid var(--border-color,#e0e0e0);">Öncelik</th><th style="padding:10px 12px;text-align:center;border-bottom:1px solid var(--border-color,#e0e0e0);">Aktif</th><th style="padding:10px 12px;border-bottom:1px solid var(--border-color,#e0e0e0);"></th></tr></thead>' +
                '<tbody>' + rules.map(r => `
                    <tr style="border-bottom:1px solid var(--border-color,#e0e0e0);">
                        <td style="padding:10px 12px;font-weight:500;">${DocMgmt.esc(r.name)}</td>
                        <td style="padding:10px 12px;color:#7f8c8d;">${matchLabels[r.match_type] || r.match_type}: <strong>${DocMgmt.esc(r.match_value)}</strong></td>
                        <td style="padding:10px 12px;color:#9b59b6;">${actionLabels[r.action_type] || r.action_type}: <strong>${DocMgmt.esc(r.action_value)}</strong></td>
                        <td style="padding:10px 12px;text-align:center;">${r.priority}</td>
                        <td style="padding:10px 12px;text-align:center;">
                            <label style="position:relative;display:inline-block;width:36px;height:20px;">
                                <input type="checkbox" ${r.is_active ? 'checked' : ''} onchange="ClassRuleMgr.toggleActive(${r.id},this.checked)" style="opacity:0;width:0;height:0;">
                                <span style="position:absolute;inset:0;background:${r.is_active ? '#2ecc71' : '#ccc'};border-radius:20px;cursor:pointer;transition:0.2s;"></span>
                            </label>
                        </td>
                        <td style="padding:10px 12px;text-align:right;">
                            <button onclick="ClassRuleMgr.deleteRule(${r.id},'${DocMgmt.esc(r.name)}')" style="border:none;background:none;cursor:pointer;color:#e74c3c;font-size:13px;" title="Sil"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>`).join('') + '</tbody></table>';
        }).catch(() => { container.innerHTML = '<p style="color:#e74c3c;">Kurallar yüklenemedi.</p>'; });
    },

    updateMatchHint() {
        const type = document.getElementById('rule-match-type').value;
        const hints = { extension: 'ör: pdf, docx', name_contains: 'ör: fatura, rapor', size_gt: 'bayt cinsinden ör: 10485760 (10MB)', size_lt: 'bayt cinsinden ör: 1048576 (1MB)' };
        const el = document.getElementById('rule-match-hint');
        if (el) el.textContent = hints[type] || '';
    },

    openCreateModal() {
        ['rule-edit-id','rule-name','rule-match-value','rule-action-value'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
        document.getElementById('rule-priority').value = '0';
        document.getElementById('rule-match-type').value = 'extension';
        document.getElementById('rule-action-type').value = 'move_folder';
        document.getElementById('class-rule-modal-title').textContent = 'Yeni Sınıflandırma Kuralı';
        this.updateMatchHint();
        openModal('class-rule-modal');
    },

    saveRule() {
        const id          = document.getElementById('rule-edit-id').value;
        const name        = document.getElementById('rule-name').value.trim();
        const matchType   = document.getElementById('rule-match-type').value;
        const matchValue  = document.getElementById('rule-match-value').value.trim();
        const actionType  = document.getElementById('rule-action-type').value;
        const actionValue = document.getElementById('rule-action-value').value.trim();
        const priority    = parseInt(document.getElementById('rule-priority').value) || 0;
        if (!name || !matchValue || !actionValue) { alert('Ad, koşul değeri ve eylem değeri zorunludur'); return; }
        const method = id ? 'PUT' : 'POST';
        const body = { name, match_type: matchType, match_value: matchValue, action_type: actionType, action_value: actionValue, priority };
        if (id) body.id = parseInt(id);
        fetch('api/classification-rules.php', {
            method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
        }).then(r => r.json()).then(data => {
            if (data.success) { closeModal('class-rule-modal'); this.load(); if (typeof showNotification === 'function') showNotification('Kural kaydedildi', 'success'); }
            else alert('Hata: ' + (data.error || 'Kayıt başarısız'));
        }).catch(err => alert('Hata: ' + err.message));
    },

    toggleActive(ruleId, isActive) {
        fetch('api/classification-rules.php', {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: ruleId, is_active: isActive })
        }).then(r => r.json()).then(data => {
            if (!data.success) { alert('Güncelleme başarısız'); this.load(); }
            else this.load();
        }).catch(() => {});
    },

    deleteRule(ruleId, ruleName) {
        if (!confirm('"' + ruleName + '" kuralı silinecek. Devam?')) return;
        fetch('api/classification-rules.php', {
            method: 'DELETE', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: ruleId })
        }).then(r => r.json()).then(data => {
            if (data.success) { this.load(); if (typeof showNotification === 'function') showNotification('Kural silindi', 'success'); }
            else alert('Hata: ' + (data.error || 'Silme başarısız'));
        }).catch(err => alert('Hata: ' + err.message));
    }
};
window.ClassRuleMgr = ClassRuleMgr;
