/**
 * Advanced Search Module
 * Handles searching across all data types: Tasks and DYF issues
 * Uses in-memory data for fast client-side filtering
 */

let advSearchCurrentPage = 1;
let advSearchTotalPages = 1;
let advSearchResults = [];
let advSearchAllResults = [];

/**
 * Load all data sources for search
 */
async function loadAllSearchData(filters) {
    let allData = [];

    // Get selected data types
    const searchPeriodic = filters.searchPeriodic;
    const searchCab = filters.searchCab;
    const searchRoadmap = filters.searchRoadmap;
    const searchOrnekKurumsalDyf = filters.searchOrnekKurumsalDyf;
    const searchOrnekMusteriADyf = filters.searchOrnekMusteriADyf;

    // ========================================
    // LOAD TASKS (Periodic, CAB, Roadmap)
    // ========================================
    if (searchPeriodic || searchCab || searchRoadmap) {
        try {
            let taskTypes = [];
            if (searchPeriodic) taskTypes.push('periodic');
            if (searchCab) taskTypes.push('cab');
            if (searchRoadmap) taskTypes.push('roadmap');

            for (const taskType of taskTypes) {
                const response = await fetch(`${window.PORTAL_BASE_URL}/get-tasks.php?type=${taskType}`);
                if (response.ok) {
                    const tasks = await response.json();

                    // Format tasks
                    tasks.forEach(task => {
                        let typeLabel = '';
                        if (taskType === 'periodic') typeLabel = 'Periyodik İş';
                        else if (taskType === 'cab') typeLabel = 'CAB İşi';
                        else if (taskType === 'roadmap') typeLabel = 'Roadmap İşi';

                        allData.push({
                            data_type: 'task',
                            type: taskType,
                            type_label: typeLabel,
                            id: task.id,
                            key: 'TASK-' + task.id,
                            title: task.device,
                            description: task.reason,
                            status: task.status,
                            date: task.date,
                            person: task.maker + ' / ' + task.checker,
                            maker: task.maker,
                            checker: task.checker,
                            record: task.record
                        });
                    });
                }
            }
        } catch (error) {
            console.error('Error loading tasks:', error);
        }
    }

    // ========================================
    // LOAD DYF ISSUES (Cyberwebeyeos, Örnek Müşteri A)
    // ========================================
    if (searchOrnekKurumsalDyf || searchOrnekMusteriADyf) {
        try {
            let companies = [];
            if (searchOrnekKurumsalDyf) companies.push('cyberwebeyeos');
            if (searchOrnekMusteriADyf) companies.push('ornek-musteri-a');

            for (const company of companies) {
                const response = await fetch(`${window.PORTAL_BASE_URL}/get-jira-issues.php?company=${company}&calendar=true`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        data.issues.forEach(issue => {
                            const typeLabel = (company === 'cyberwebeyeos') ? 'Cyberwebeyeos DYF' : 'Örnek Müşteri A DYF';

                            // Determine status class
                            let statusClass = 'warning';
                            const statusLower = (issue.status || '').toLowerCase();
                            if (statusLower.includes('yapıld') || statusLower.includes('tamamlan') ||
                                statusLower.includes('başarı') || statusLower.includes('done')) {
                                statusClass = 'completed';
                            } else if (statusLower.includes('iptal') || statusLower.includes('cancel') ||
                                       statusLower.includes('reject')) {
                                statusClass = 'critical';
                            }

                            allData.push({
                                data_type: 'dyf',
                                type: company,
                                type_label: typeLabel,
                                id: issue.id,
                                key: issue.jira_key,
                                title: issue.summary,
                                description: issue.summary,
                                status: statusClass,
                                original_status: issue.status,
                                date: issue.date,
                                person: issue.assignee_display_name || 'Atanmamış',
                                jira_url: issue.jira_url,
                                cab_approval: issue.cab_approval || null
                            });
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Error loading DYF issues:', error);
        }
    }

    return allData;
}

/**
 * Perform advanced search (client-side filtering)
 */
async function performAdvancedSearch(page = 1) {
    // Get filter values
    const keyword = document.getElementById('adv-search-keyword').value.trim().toLowerCase();
    const dateFrom = document.getElementById('adv-search-date-from').value;
    const dateTo = document.getElementById('adv-search-date-to').value;
    const status = document.getElementById('adv-search-status').value;
    const person = document.getElementById('adv-search-person').value.trim().toLowerCase();

    // Get selected data types
    const searchPeriodic = document.getElementById('search-type-periodic').checked;
    const searchCab = document.getElementById('search-type-cab').checked;
    const searchRoadmap = document.getElementById('search-type-roadmap').checked;
    const searchOrnekKurumsalDyf = document.getElementById('search-type-cyberwebeyeos-dyf').checked;
    const searchOrnekMusteriADyf = document.getElementById('search-type-ornek-musteri-a-dyf').checked;

    // Validate: at least one data type must be selected
    if (!searchPeriodic && !searchCab && !searchRoadmap && !searchOrnekKurumsalDyf && !searchOrnekMusteriADyf) {
        showNotification('En az bir veri tipi seçmelisiniz', 'error');
        return;
    }

    try {
        // Show loading state
        showAdvSearchLoading();

        // Load all data
        const allData = await loadAllSearchData({
            searchPeriodic,
            searchCab,
            searchRoadmap,
            searchOrnekKurumsalDyf,
            searchOrnekMusteriADyf
        });

        // Filter data
        let filteredData = allData.filter(item => {
            // Keyword filter
            if (keyword) {
                const searchText = [
                    item.key,
                    item.title,
                    item.description,
                    item.person
                ].join(' ').toLowerCase();

                if (!searchText.includes(keyword)) {
                    return false;
                }
            }

            // Date range filter
            if (dateFrom && item.date < dateFrom) {
                return false;
            }
            if (dateTo && item.date > dateTo) {
                return false;
            }

            // Status filter
            if (status) {
                if (item.status !== status) {
                    return false;
                }
            }

            // Person filter
            if (person) {
                if (!item.person.toLowerCase().includes(person)) {
                    return false;
                }
            }

            return true;
        });

        // Sort by date (newest first)
        filteredData.sort((a, b) => {
            return new Date(b.date) - new Date(a.date);
        });

        // Store all results
        advSearchAllResults = filteredData;

        // Pagination
        const perPage = 20;
        const total = filteredData.length;
        const totalPages = Math.ceil(total / perPage);
        const offset = (page - 1) * perPage;
        const paginatedResults = filteredData.slice(offset, offset + perPage);

        advSearchResults = paginatedResults;
        advSearchCurrentPage = page;
        advSearchTotalPages = totalPages;

        // Render results
        renderAdvSearchResults(paginatedResults, total);
        renderAdvSearchPagination(total, page, totalPages);

        // Show results section
        document.getElementById('adv-search-empty-state').style.display = 'none';
        document.getElementById('advanced-search-results').style.display = 'block';

    } catch (error) {
        console.error('Advanced search error:', error);
        showAdvSearchError(error.message);
    }
}

/**
 * Render search results
 */
function renderAdvSearchResults(results, total) {
    const tbody = document.getElementById('adv-search-results-body');
    const countSpan = document.getElementById('adv-search-result-count');

    countSpan.textContent = total;

    if (!results || results.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px;">
                    <i class="fas fa-inbox" style="font-size: 48px; color: #bbb;"></i>
                    <p style="margin-top: 10px; color: #666;">Arama kriterlerinize uygun sonuç bulunamadı</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = results.map(result => {
        // Determine type badge
        let typeBadge = '';
        let typeColor = '';
        if (result.data_type === 'task') {
            if (result.type === 'periodic') typeColor = '#3498db';
            else if (result.type === 'cab') typeColor = '#9b59b6';
            else if (result.type === 'roadmap') typeColor = '#e67e22';
        } else if (result.data_type === 'dyf') {
            typeColor = result.type === 'cyberwebeyeos' ? '#3498db' : '#e67e22';
        }

        typeBadge = `<span style="background: ${typeColor}; color: white; padding: 4px 10px; border-radius: 4px; font-size: 0.8em; font-weight: 600; display: inline-block;">${escapeHtml(result.type_label)}</span>`;

        // Determine status badge
        let statusBadge = '';
        if (result.data_type === 'task') {
            const statusClass = result.status === 'completed' ? 'completed' :
                              result.status === 'critical' ? 'cancelled' :
                              result.status === 'warning' ? 'pending' : 'pending';
            const statusText = result.status === 'completed' ? 'Tamamlandı' :
                             result.status === 'critical' ? 'Kritik' :
                             result.status === 'warning' ? 'Uyarı' : 'Aktif';
            statusBadge = `<span class="status-badge status-${statusClass}">${escapeHtml(statusText)}</span>`;
        } else {
            const statusClass = result.status;
            const statusText = result.original_status || result.status;
            statusBadge = `<span class="status-badge status-${statusClass}">${escapeHtml(statusText)}</span>`;
        }

        // Determine actions
        let actions = '';
        if (result.data_type === 'task') {
            actions = `
                <button onclick="viewTask('${result.id}')" class="icon-btn" title="Görüntüle">
                    <i class="fas fa-eye"></i>
                </button>
                <button onclick="editTask('${result.id}')" class="icon-btn" title="Düzenle">
                    <i class="fas fa-edit"></i>
                </button>
            `;
        } else if (result.data_type === 'dyf') {
            actions = `
                <button onclick="window.open('${result.jira_url}', '_blank')" class="icon-btn" title="Jira'da Aç">
                    <i class="fas fa-external-link-alt"></i>
                </button>
            `;
        }

        // Format date
        const date = result.date ? new Date(result.date).toLocaleDateString('tr-TR') : '-';

        // CAB badge
        let cabBadge = '';
        if (result.data_type === 'dyf' && result.cab_approval) {
            const cabColor = result.cab_approval === 'Evet' ? '#27ae60' : '#95a5a6';
            cabBadge = `<span style="background: ${cabColor}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.75em; margin-left: 5px;">${escapeHtml(result.cab_approval)}</span>`;
        }

        return `
            <tr>
                <td>${typeBadge}</td>
                <td style="font-weight: 600; color: var(--primary-color);">${escapeHtml(result.key)}</td>
                <td title="${escapeHtml(result.description)}" style="max-width: 350px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    <strong>${escapeHtml(result.title)}</strong>${cabBadge}
                    ${result.description !== result.title ? `<br><small style="color: #666;">${escapeHtml(result.description.substring(0, 80))}${result.description.length > 80 ? '...' : ''}</small>` : ''}
                </td>
                <td>${statusBadge}</td>
                <td style="font-size: 0.9em;">${date}</td>
                <td style="font-size: 0.9em;">${escapeHtml(result.person)}</td>
                <td>
                    <div class="date-task-actions">
                        ${actions}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Render pagination
 */
function renderAdvSearchPagination(total, currentPage, totalPages) {
    const paginationDiv = document.getElementById('adv-search-pagination');

    if (totalPages <= 1) {
        paginationDiv.innerHTML = '';
        return;
    }

    let html = '<div style="display: flex; gap: 5px; justify-content: center; align-items: center;">';

    // Previous button
    html += `
        <button onclick="performAdvancedSearch(${currentPage - 1})"
                ${currentPage === 1 ? 'disabled' : ''}
                style="padding: 8px 12px; border: 1px solid #ddd; background: white; border-radius: 5px; cursor: pointer;">
            <i class="fas fa-chevron-left"></i>
        </button>
    `;

    // Page numbers
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
        html += `<button onclick="performAdvancedSearch(1)" style="padding: 8px 12px; border: 1px solid #ddd; background: white; border-radius: 5px; cursor: pointer;">1</button>`;
        if (startPage > 2) {
            html += '<span style="padding: 8px;">...</span>';
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        const active = i === currentPage ? 'background: var(--primary-color); color: white;' : 'background: white;';
        html += `
            <button onclick="performAdvancedSearch(${i})"
                    style="padding: 8px 12px; border: 1px solid #ddd; ${active} border-radius: 5px; cursor: pointer;">
                ${i}
            </button>
        `;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += '<span style="padding: 8px;">...</span>';
        }
        html += `<button onclick="performAdvancedSearch(${totalPages})" style="padding: 8px 12px; border: 1px solid #ddd; background: white; border-radius: 5px; cursor: pointer;">${totalPages}</button>`;
    }

    // Next button
    html += `
        <button onclick="performAdvancedSearch(${currentPage + 1})"
                ${currentPage === totalPages ? 'disabled' : ''}
                style="padding: 8px 12px; border: 1px solid #ddd; background: white; border-radius: 5px; cursor: pointer;">
            <i class="fas fa-chevron-right"></i>
        </button>
    `;

    html += '</div>';
    paginationDiv.innerHTML = html;
}

/**
 * Show loading state
 */
function showAdvSearchLoading() {
    const tbody = document.getElementById('adv-search-results-body');
    tbody.innerHTML = `
        <tr>
            <td colspan="7" style="text-align: center; padding: 40px;">
                <i class="fas fa-spinner fa-spin" style="font-size: 32px; color: var(--primary-color);"></i>
                <p style="margin-top: 10px; color: #666;">Arama yapılıyor...</p>
            </td>
        </tr>
    `;

    document.getElementById('adv-search-empty-state').style.display = 'none';
    document.getElementById('advanced-search-results').style.display = 'block';
}

/**
 * Show error state
 */
function showAdvSearchError(message) {
    const tbody = document.getElementById('adv-search-results-body');
    tbody.innerHTML = `
        <tr>
            <td colspan="7" style="text-align: center; padding: 40px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #e74c3c;"></i>
                <p style="margin-top: 10px; color: #e74c3c;">Hata: ${escapeHtml(message)}</p>
            </td>
        </tr>
    `;
}

/**
 * Clear all filters
 */
function clearAdvancedSearchFilters() {
    document.getElementById('adv-search-keyword').value = '';
    document.getElementById('adv-search-date-from').value = '';
    document.getElementById('adv-search-date-to').value = '';
    document.getElementById('adv-search-status').value = '';
    document.getElementById('adv-search-person').value = '';

    // Check all data types
    document.getElementById('search-type-periodic').checked = true;
    document.getElementById('search-type-cab').checked = true;
    document.getElementById('search-type-roadmap').checked = true;
    document.getElementById('search-type-cyberwebeyeos-dyf').checked = true;
    document.getElementById('search-type-ornek-musteri-a-dyf').checked = true;

    // Hide results
    document.getElementById('advanced-search-results').style.display = 'none';
    document.getElementById('adv-search-empty-state').style.display = 'block';

    showNotification('Filtreler temizlendi', 'info');
}

/**
 * Export search results to CSV
 */
function exportSearchResults() {
    if (!advSearchAllResults || advSearchAllResults.length === 0) {
        showNotification('Dışa aktarılacak sonuç bulunamadı', 'warning');
        return;
    }

    // Create CSV content
    const csvEscape = (val) => {
        if (!val) return '';
        const str = String(val);
        if (str.includes('"') || str.includes(',') || str.includes('\n')) {
            return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
    };

    let csv = 'Tip,Key/ID,Başlık,Açıklama,Durum,Tarih,Kişi,CAB Onayı\n';

    advSearchAllResults.forEach(result => {
        const row = [
            csvEscape(result.type_label),
            csvEscape(result.key),
            csvEscape(result.title),
            csvEscape(result.description),
            csvEscape(result.data_type === 'dyf' ? result.original_status : result.status),
            csvEscape(result.date),
            csvEscape(result.person),
            csvEscape(result.cab_approval || '')
        ];
        csv += row.join(',') + '\n';
    });

    // Create download link
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `arama-sonuclari-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showNotification('CSV dosyası indirildi', 'success');
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Export functions to global scope
window.performAdvancedSearch = performAdvancedSearch;
window.clearAdvancedSearchFilters = clearAdvancedSearchFilters;
window.exportSearchResults = exportSearchResults;

// Enter key support for keyword search
document.addEventListener('DOMContentLoaded', function() {
    const keywordInput = document.getElementById('adv-search-keyword');
    if (keywordInput) {
        keywordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performAdvancedSearch();
            }
        });
    }
});
