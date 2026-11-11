const ApiService = {
    prodUrl: 'backup_receiver.php',
    testUrl: 'backup_receiver_test.php',

    async get(endpoint) {
        try {
            if (endpoint.includes('?')) {
                const response = await fetch(endpoint);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return await response.json();
            }

            const prodData = await this.fetchFromEndpoint(this.prodUrl, endpoint);
            const testData = await this.fetchFromEndpoint(this.testUrl, endpoint);

            // Prod'da hata varsa test gösterme
            if (prodData && prodData.problems_count > 0) {
                return this.mergeData(prodData, null);
            }

            return this.mergeData(prodData, testData);
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    async fetchFromEndpoint(baseUrl, params) {
        try {
            const url = params ? `${baseUrl}?${params}` : baseUrl;
            const response = await fetch(url);
            if (!response.ok) {
                console.warn(`Failed to fetch from ${url}`);
                return null;
            }
            return await response.json();
        } catch (error) {
            console.warn(`Error fetching from ${baseUrl}:`, error);
            return null;
        }
    },

    mergeData(prodData, testData) {
        if (!prodData && !testData) {
            return this.getEmptyData();
        }

        if (!prodData) return testData;
        if (!testData) return prodData;

        const merged = {
            timestamp: new Date().toISOString(),
            overall_status: 'success',
            backup_summary: {
                total_dirs: 0,
                successful: 0,
                failed: 0
            },
            scope_breakdown: {},
            whitelist_status: prodData.whitelist_status || {},
            problems_count: 0,
            device_status: {
                f5: {
                    'ornek-kurumsal': ['F503', 'F504'],
                    'ornek-musteri-a': ['F502', 'F501']
                },
                a10: {
                    status: prodData.a10_status || 'unknown'
                }
            }
        };

        // Production verileri ekle
        if (prodData.backup_summary) {
            merged.backup_summary.total_dirs += prodData.backup_summary.total_dirs || 0;
            merged.backup_summary.successful += prodData.backup_summary.successful || 0;
            merged.backup_summary.failed += prodData.backup_summary.failed || 0;
            merged.problems_count += prodData.problems_count || 0;
        }

        if (prodData.scope_breakdown) {
            Object.assign(merged.scope_breakdown, prodData.scope_breakdown);
        }

        // Test verileri (eger gösterilecekse)
        if (testData && testData.backup_summary) {
            merged.backup_summary.total_dirs += testData.backup_summary.total_dirs || 0;
            merged.backup_summary.successful += testData.backup_summary.successful || 0;
            merged.backup_summary.failed += testData.backup_summary.failed || 0;
            merged.problems_count += testData.problems_count || 0;
        }

        if (testData && testData.scope_breakdown) {
            Object.assign(merged.scope_breakdown, testData.scope_breakdown);
        }

        // Overall Status
        if (merged.problems_count === 0) {
            merged.overall_status = 'success';
        } else if (merged.problems_count <= 2) {
            merged.overall_status = 'warning';
        } else {
            merged.overall_status = 'critical';
        }

        return merged;
    },

    getEmptyData() {
        return {
            timestamp: new Date().toISOString(),
            overall_status: 'no_data',
            backup_summary: {
                total_dirs: 0,
                successful: 0,
                failed: 0
            },
            scope_breakdown: {
                ornekKurumsal_prod: { success: 0, failed: 0 },
                ornekKurumsal_drc: { success: 0, failed: 0 },
                ornekMusteriA_prod: { success: 0, failed: 0 },
                ornekMusteriA_drc: { success: 0, failed: 0 },
                maslak: { success: 0, failed: 0 },
                spine: { success: 0, failed: 0 },
                ornekMusteriAtest: { success: 0, failed: 0 }
            },
            whitelist_status: { 'ornek-kurumsal': {}, 'ornek-musteri-a': {} },
            problems_count: 0,
            message: 'Veri bekleniyor...',
            device_status: {
                f5: {
                    'ornek-kurumsal': ['F503', 'F504'],
                    'ornek-musteri-a': ['F502', 'F501']
                },
                a10: {
                    status: 'unknown'
                }
            }
        };
    }
};
