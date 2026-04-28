document.addEventListener('DOMContentLoaded', () => {
    // --- State & Constants ---
    let currentProducts = [];
    let currentLogs = [];
    let currentSettings = {};
    let editingId = null;
    let studioOriginalPath = null;
    let studioGeneratedUrl = null;
    let stockChart = null;

    // --- Selectors ---
    const layout = document.getElementById('admin-layout');
    const loginView = document.getElementById('login-view');
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.content-section');
    const sectionTitle = document.getElementById('section-title');
    const sectionSubtitle = document.getElementById('section-subtitle');

    const modal = document.getElementById('product-modal');
    const productForm = document.getElementById('product-form');
    const categorySelects = [document.getElementById('p-category'), document.getElementById('filter-category')];

    // --- Initialization ---
    async function initApp() {
        if (loginView) loginView.style.display = 'none';
        if (layout) layout.classList.add('active');
        
        // Initial data load
        await Promise.all([
            loadSettings(),
            loadProducts(),
            loadStats()
        ]);
        populateCategoryFilters();
    }

    function getHeaders() {
        return { 
            'Content-Type': 'application/json' 
        };
    }

    async function apiFetch(url, options = {}) {
        const headers = getHeaders();
        try {
            const res = await fetch(url, { ...options, headers: { ...headers, ...options.headers } });
            if (res.status === 401) {
                console.error('Unauthorized access');
                return null;
            }
            return res.json();
        } catch (err) {
            console.error(`API Error (${url}):`, err);
            return null;
        }
    }

    // --- Navigation ---
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const target = item.getAttribute('data-target');
            navItems.forEach(ni => ni.classList.remove('active'));
            sections.forEach(sec => sec.classList.remove('active'));
            
            item.classList.add('active');
            document.getElementById(target).classList.add('active');
            
            const title = item.textContent.trim().split(' ').slice(1).join(' ');
            sectionTitle.textContent = title;
            updateSubtitle(target);
            
            refreshSectionData(target);
        });
    });

    function updateSubtitle(target) {
        const subtitles = {
            'section-dashboard': 'GitHub Sync & Business Insights',
            'section-products': 'Manage your product catalog',
            'section-ai-studio': 'AI-Powered Image Enhancement',
            'section-imports': 'Bulk Inventory Updates',
            'section-logs': 'System Activity Audit',
            'section-settings': 'Global Configuration'
        };
        sectionSubtitle.textContent = subtitles[target] || '';
    }

    function refreshSectionData(target) {
        if (target === 'section-products') loadProducts();
        if (target === 'section-logs') loadLogs();
        if (target === 'section-dashboard') loadStats();
        if (target === 'section-settings') loadSettings();
    }

    // --- Data Loaders ---
    async function loadProducts() {
        const data = await apiFetch('/api/products');
        if (data) {
            currentProducts = data;
            renderProducts();
            populateCategoryFilters();
        }
    }

    async function loadStats() {
        const stats = await apiFetch('/api/stats');
        if (stats) {
            document.getElementById('dash-total-products').textContent = stats.totalProducts;
            document.getElementById('dash-low-stock').textContent = stats.lowStockCount;
            document.getElementById('dash-dead-stock').textContent = stats.deadStockCount;
            
            const totalVal = currentProducts.reduce((sum, p) => {
                const price = parseFloat(p.price) || 0;
                const stock = parseInt(p.stock) || 0;
                return sum + (price * stock);
            }, 0);
            document.getElementById('dash-total-value').textContent = `Rs. ${totalVal.toLocaleString()}`;

            renderStockChart(stats);
            renderDashboardAlerts(stats);
        }
    }

    async function loadLogs() {
        const data = await apiFetch('/api/logs');
        if (data) {
            currentLogs = data;
            renderLogs();
        }
    }

    async function loadSettings() {
        const data = await apiFetch('/api/settings');
        if (data) {
            currentSettings = data;
            const fields = {
                'set-watermark-text': 'watermarkText',
                'set-watermark-pos': 'watermarkPosition',
                'set-watermark-opacity': 'watermarkOpacity'
            };
            for (const [id, key] of Object.entries(fields)) {
                const el = document.getElementById(id);
                if (el) el.value = data[key] || '';
            }

            // Reflect active watermark type
            if (data.watermarkLogoPath) {
                const logoRadio = document.getElementById('wm-type-logo');
                if (logoRadio) {
                    logoRadio.checked = true;
                    toggleWatermarkTypeUI('logo');
                }
                const logoStatus = document.getElementById('logo-status');
                if (logoStatus) {
                    logoStatus.textContent = `Active logo: ${data.watermarkLogoPath.split('/').pop()}`;
                    logoStatus.style.display = 'block';
                }
            }
        }
    }

    // --- Rendering ---
    function renderProducts() {
        const tbody = document.getElementById('products-tbody');
        tbody.innerHTML = '';
        
        const searchTerm = document.getElementById('search-products').value.toLowerCase();
        const catFilter = document.getElementById('filter-category').value;
        const stockFilter = document.getElementById('filter-stock').value;
        const sortBy = document.getElementById('sort-by').value;

        let filtered = currentProducts.filter(p => {
            const matchesSearch = p.title.toLowerCase().includes(searchTerm) || p.id.toLowerCase().includes(searchTerm);
            const matchesCat = catFilter === 'all' || p.category === catFilter;
            const stock = parseInt(p.stock) || 0;
            let matchesStock = true;
            if (stockFilter === 'low') matchesStock = stock > 0 && stock < 5;
            else if (stockFilter === 'out') matchesStock = stock === 0;
            else if (stockFilter === 'in') matchesStock = stock >= 5;
            
            return matchesSearch && matchesCat && matchesStock;
        });

        // Sorting
        filtered.sort((a, b) => {
            if (sortBy === 'price-low') return parseFloat(a.price) - parseFloat(b.price);
            if (sortBy === 'price-high') return parseFloat(b.price) - parseFloat(a.price);
            if (sortBy === 'stock-low') return (parseInt(a.stock) || 0) - (parseInt(b.stock) || 0);
            return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
        });

        filtered.forEach((p) => {
            const tr = document.createElement('tr');
            const stock = parseInt(p.stock) || 0;
            const statusClass = stock === 0 ? 'out' : (stock < 5 ? 'low' : 'ok');
            const statusLabel = stock === 0 ? 'Out of Stock' : (stock < 5 ? 'Low Stock' : 'In Stock');

            tr.innerHTML = `
                <td><img src="/${p.image || 'images/products/placeholder.jpg'}" width="50" height="50" style="object-fit:cover; border-radius:8px;" onerror="this.src='/images/products/placeholder.jpg'"></td>
                <td>
                    <div style="font-weight:700;">${p.title}</div>
                    <div style="font-size:0.75rem; color:var(--text-muted);">ID: ${p.id}</div>
                </td>
                <td><span class="badge ai">${p.category}</span></td>
                <td><strong>Rs. ${parseFloat(p.price).toLocaleString()}</strong></td>
                <td>
                    <div style="font-weight:600;">${stock} units</div>
                    <span class="badge ${statusClass}">${statusLabel}</span>
                </td>
                <td>
                    <div style="display:flex; gap:0.5rem;">
                        <button class="btn-edit-action" data-id="${p.id}">Edit</button>
                        <button class="btn-delete-action" data-id="${p.id}">Delete</button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Event Delegation
        tbody.querySelectorAll('.btn-edit-action').forEach(btn => {
            btn.onclick = () => openEditModal(btn.getAttribute('data-id'));
        });
        tbody.querySelectorAll('.btn-delete-action').forEach(btn => {
            btn.onclick = () => deleteProduct(btn.getAttribute('data-id'));
        });
    }

    function renderStockChart(stats) {
        const ctx = document.getElementById('stockChart').getContext('2d');
        if (stockChart) stockChart.destroy();

        // Group products by category for the chart
        const catData = {};
        currentProducts.forEach(p => {
            if (!p.isDeleted) {
                catData[p.category] = (catData[p.category] || 0) + 1;
            }
        });

        stockChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(catData),
                datasets: [{
                    data: Object.values(catData),
                    backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } }
                },
                cutout: '70%'
            }
        });
    }

    function renderDashboardAlerts(stats) {
        const lowList = document.getElementById('low-stock-items');
        const deadList = document.getElementById('dead-stock-items');
        
        lowList.innerHTML = stats.lowStockItems.slice(0, 5).map(item => `
            <li><span>${item.title}</span> <span class="badge out">${item.stock} left</span></li>
        `).join('');

        deadList.innerHTML = stats.deadStockItems.slice(0, 5).map(item => `
            <li><span>${item.title}</span> <span class="text-muted">${item.stock} units</span></li>
        `).join('');
    }

    function renderLogs() {
        const tbody = document.getElementById('logs-tbody');
        const typeFilter = document.getElementById('log-type-filter').value;
        const search = document.getElementById('log-search').value.toLowerCase();

        tbody.innerHTML = '';
        const filtered = currentLogs.filter(log => {
            const matchesType = typeFilter === 'all' || log.action === typeFilter;
            const matchesSearch = log.action.includes(search) || JSON.stringify(log.details).toLowerCase().includes(search);
            return matchesType && matchesSearch;
        });

        filtered.forEach(log => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="white-space:nowrap; color:var(--text-muted); font-size:0.8rem;">${new Date(log.timestamp).toLocaleString()}</td>
                <td><span style="font-weight:600;">${log.admin}</span></td>
                <td><span class="badge ai">${log.action}</span></td>
                <td><code style="font-size:0.75rem;">${JSON.stringify(log.details)}</code></td>
            `;
            tbody.appendChild(tr);
        });
    }

    // --- Publishing ---
    const publishBtn = document.getElementById('btn-publish');
    if (publishBtn) {
        publishBtn.addEventListener('click', async () => {
            const originalText = publishBtn.innerHTML;
            publishBtn.disabled = true;
            publishBtn.innerHTML = '⏳ Publishing...';

            try {
                const res = await fetch('/api/publish', {
                    method: 'POST',
                    headers: getHeaders()
                });
                const data = await res.json();

                if (data.success) {
                    alert('🚀 Success! Your changes have been pushed to GitHub and will be live shortly.');
                } else {
                    alert('❌ Publish failed: ' + (data.error || 'Unknown error'));
                }
            } catch (err) {
                console.error('Publish Error:', err);
                alert('❌ Error connecting to server');
            } finally {
                publishBtn.disabled = false;
                publishBtn.innerHTML = originalText;
            }
        });
    }

    // --- AI Studio Logic ---
    const aiInput = document.getElementById('ai-image-input');
    const aiDropZone = document.getElementById('drop-zone');
    const aiProcessBtn = document.getElementById('btn-ai-process');
    const aiSaveBtn = document.getElementById('btn-ai-save');
    const aiLoader = document.getElementById('ai-loader');

    aiDropZone.onclick = () => aiInput.click();
    
    aiInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Preview original
        const reader = new FileReader();
        reader.onload = (ev) => document.getElementById('ai-preview-original').src = ev.target.result;
        reader.readAsDataURL(file);

        // Upload to temp
        const formData = new FormData();
        formData.append('image', file);
        
        aiProcessBtn.disabled = true;
        aiProcessBtn.textContent = 'Uploading...';

        const res = await fetch('/api/media/upload-studio', {
            method: 'POST',
            headers: { 'authorization': localStorage.getItem('adminPassword') },
            body: formData
        });
        const data = await res.json();
        if (data.success) {
            studioOriginalPath = data.imagePath;
            aiProcessBtn.disabled = false;
            aiProcessBtn.textContent = '✨ Process with Gemini';
            if (watermarkOnlyBtn) watermarkOnlyBtn.disabled = false;
        }
    };

    aiProcessBtn.onclick = async () => {
        if (!studioOriginalPath) return alert('Please upload an image first.');
        
        aiLoader.style.display = 'flex';
        aiProcessBtn.disabled = true;
        
        const customPrompt = document.getElementById('ai-custom-prompt').value;

        const res = await apiFetch('/api/media/enhance', {
            method: 'POST',
            body: JSON.stringify({ 
                productId: 'studio', 
                imagePath: studioOriginalPath,
                customPrompt: customPrompt
            })
        });

        aiLoader.style.display = 'none';
        aiProcessBtn.disabled = false;

        if (res && res.success) {
            studioGeneratedUrl = res.imageUrl;
            document.getElementById('ai-preview-generated').src = '/' + res.imageUrl;
            aiSaveBtn.disabled = false;
        } else {
            alert('AI Processing failed. Please try again.');
        }
    };

    aiSaveBtn.onclick = async () => {
        if (!studioGeneratedUrl) return;
        aiSaveBtn.disabled = true;
        aiSaveBtn.textContent = 'Watermarking...';

        const res = await apiFetch('/api/media/finalize', {
            method: 'POST',
            body: JSON.stringify({ 
                productId: 'studio', 
                imagePath: studioGeneratedUrl 
            })
        });

        if (res && res.success) {
            alert('Success! Image watermarked and saved to Media Library.');
            aiSaveBtn.textContent = '✅ Saved';
        } else {
            aiSaveBtn.disabled = false;
            aiSaveBtn.textContent = '💾 Save Final Version';
        }
    };

    // --- CSV Import ---
    const csvInput = document.getElementById('csv-file-input');
    const csvDropZone = document.getElementById('csv-drop-zone');
    let pendingImportData = null;

    csvDropZone.onclick = () => csvInput.click();

    csvInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/import/preview', {
            method: 'POST',
            headers: { 'authorization': localStorage.getItem('adminPassword') },
            body: formData
        });
        const data = await res.json();

        if (data.success) {
            pendingImportData = data;
            showImportPreview(data);
        } else {
            alert(data.error || 'Import validation failed');
        }
    };

    function showImportPreview(data) {
        document.getElementById('csv-drop-zone').style.display = 'none';
        document.getElementById('import-preview-area').style.display = 'block';
        
        const stats = document.getElementById('import-stats');
        stats.innerHTML = `
            <span class="import-stat success">Valid: ${data.validCount}</span>
            <span class="import-stat danger">Errors: ${data.errors.length}</span>
        `;

        const table = document.getElementById('import-preview-table');
        table.innerHTML = `
            <thead><tr><th>ID</th><th>Title</th><th>Status</th></tr></thead>
            <tbody>
                ${data.preview.map(row => `
                    <tr class="${row.isValid ? '' : 'error-row'}">
                        <td>${row.id}</td>
                        <td>${row.title}</td>
                        <td>${row.isValid ? '✅ OK' : '❌ ' + row.error}</td>
                    </tr>
                `).join('')}
            </tbody>
        `;
    }

    document.getElementById('btn-import-commit').onclick = async () => {
        if (!pendingImportData) return;
        
        const res = await apiFetch('/api/import/commit', {
            method: 'POST',
            body: JSON.stringify({ importId: pendingImportData.importId })
        });

        if (res && res.success) {
            alert(`Import Successful!\nAdded: ${res.summary.inserted}\nUpdated: ${res.summary.updated}`);
            location.reload();
        }
    };

    // --- Modals & CRUD ---
    function openEditModal(id) {
        editingId = id;
        const p = currentProducts.find(prod => prod.id === id);
        if (!p) return;

        document.getElementById('p-id').value = p.id;
        document.getElementById('p-title').value = p.title;
        document.getElementById('p-price').value = p.price;
        document.getElementById('p-stock').value = p.stock || 0;
        document.getElementById('p-category').value = p.category;
        document.getElementById('p-description').value = p.description || '';
        document.getElementById('p-condition').value = p.condition || '';
        document.getElementById('p-features').value = (p.features || []).join('; ');
        document.getElementById('p-buying').value = (p.buyingDelivery || []).join('; ');
        
        modal.classList.add('active');
        modal.style.display = 'flex';
    }

    document.getElementById('btn-add-product').onclick = () => {
        editingId = null;
        productForm.reset();
        modal.style.display = 'flex';
    };

    document.querySelectorAll('.close-btn, .close-modal').forEach(btn => {
        btn.onclick = () => modal.style.display = 'none';
    });

    productForm.onsubmit = async (e) => {
        e.preventDefault();
        const formData = {
            id: document.getElementById('p-id').value,
            title: document.getElementById('p-title').value,
            price: document.getElementById('p-price').value,
            stock: document.getElementById('p-stock').value,
            category: document.getElementById('p-category').value,
            description: document.getElementById('p-description').value,
            condition: document.getElementById('p-condition').value,
            features: document.getElementById('p-features').value.split(';').map(s => s.trim()).filter(s => s),
            buyingDelivery: document.getElementById('p-buying').value.split(';').map(s => s.trim()).filter(s => s)
        };

        const res = await apiFetch('/api/products', {
            method: 'POST',
            body: JSON.stringify(formData)
        });

        if (res && res.success) {
            modal.style.display = 'none';
            loadProducts();
            loadStats();
        }
    };

    async function deleteProduct(id) {
        if (confirm(`Move product ${id} to trash?`)) {
            const res = await apiFetch(`/api/products/${id}`, { method: 'DELETE' });
            if (res && res.success) {
                loadProducts();
                loadStats();
            }
        }
    }

    // --- Utilities ---
    function populateCategoryFilters() {
        const cats = [...new Set(currentProducts.map(p => p.category))];
        categorySelects.forEach(sel => {
            if (!sel) return;
            const currentVal = sel.value;
            sel.innerHTML = sel.id.includes('filter') ? '<option value="all">All Categories</option>' : '';
            cats.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c;
                opt.textContent = c.charAt(0).toUpperCase() + c.slice(1);
                sel.appendChild(opt);
            });
            sel.value = currentVal;
        });
    }

    // --- Filters Listeners ---
    document.getElementById('search-products').oninput = renderProducts;
    document.getElementById('filter-category').onchange = renderProducts;
    document.getElementById('filter-stock').onchange = renderProducts;
    document.getElementById('sort-by').onchange = renderProducts;
    document.getElementById('log-search').oninput = renderLogs;
    document.getElementById('log-type-filter').onchange = renderLogs;

    // --- Settings Form ---
    function toggleWatermarkTypeUI(type) {
        const textFields = document.getElementById('wm-text-fields');
        const logoFields = document.getElementById('wm-logo-fields');
        if (textFields) textFields.style.display = type === 'text' ? '' : 'none';
        if (logoFields) logoFields.style.display = type === 'logo' ? '' : 'none';
    }

    document.querySelectorAll('input[name="wm-type"]').forEach(radio => {
        radio.addEventListener('change', () => toggleWatermarkTypeUI(radio.value));
    });

    const settingsForm = document.getElementById('settings-form');
    if (settingsForm) {
        settingsForm.onsubmit = async (e) => {
            e.preventDefault();
            const payload = {
                ...currentSettings,
                watermarkText: document.getElementById('set-watermark-text').value,
                watermarkPosition: document.getElementById('set-watermark-pos').value,
                watermarkOpacity: parseFloat(document.getElementById('set-watermark-opacity').value) || 0.5
            };
            const res = await apiFetch('/api/settings', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            if (res && res.success) {
                alert('✅ Settings saved!');
                currentSettings = payload;
            } else {
                alert('❌ Failed to save settings.');
            }
        };
    }

    // --- Logo Upload (Settings) ---
    const logoFileInput = document.getElementById('logo-file-input');
    const logoUploadZone = document.getElementById('logo-upload-zone');
    const logoPreview = document.getElementById('logo-preview');
    const logoUploadPrompt = document.getElementById('logo-upload-prompt');
    const logoStatus = document.getElementById('logo-status');

    if (logoUploadZone) {
        logoUploadZone.addEventListener('click', () => logoFileInput && logoFileInput.click());
    }

    if (logoFileInput) {
        logoFileInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Instant local preview
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (logoPreview) { logoPreview.src = ev.target.result; logoPreview.style.display = 'block'; }
                if (logoUploadPrompt) logoUploadPrompt.style.display = 'none';
            };
            reader.readAsDataURL(file);

            // Upload to server
            if (logoStatus) { logoStatus.textContent = 'Uploading…'; logoStatus.style.display = 'block'; }
            const formData = new FormData();
            formData.append('logo', file);
            try {
                const res = await fetch('/api/media/upload-logo', { method: 'POST', body: formData });
                const data = await res.json();
                if (data.success) {
                    currentSettings.watermarkLogoPath = data.logoPath;
                    if (logoStatus) logoStatus.textContent = `✅ Logo saved: ${file.name}`;
                } else {
                    if (logoStatus) logoStatus.textContent = '❌ Upload failed: ' + (data.error || 'Unknown error');
                }
            } catch (err) {
                if (logoStatus) logoStatus.textContent = '❌ Upload error';
            }
        };
    }

    // --- Watermark Only (AI Studio) ---
    const watermarkOnlyBtn = document.getElementById('btn-watermark-only');
    if (watermarkOnlyBtn) {
        watermarkOnlyBtn.addEventListener('click', async () => {
            if (!studioOriginalPath) return alert('Please upload an image first.');
            watermarkOnlyBtn.disabled = true;
            watermarkOnlyBtn.textContent = '⏳ Applying watermark…';

            const res = await apiFetch('/api/media/watermark', {
                method: 'POST',
                body: JSON.stringify({ productId: 'studio', imagePath: studioOriginalPath })
            });

            watermarkOnlyBtn.disabled = false;
            watermarkOnlyBtn.textContent = '🏷️ Watermark Only (Skip AI)';

            if (res && res.success) {
                studioGeneratedUrl = res.imageUrl;
                document.getElementById('ai-preview-generated').src = '/' + res.imageUrl;
                document.getElementById('btn-ai-save').disabled = false;
                alert('✅ Watermark applied! Review the result and click "Save Final Version" to keep it.');
            } else {
                alert('❌ Watermarking failed: ' + (res && res.error ? res.error : 'Unknown error'));
            }
        });
    }

    // --- Start ---
    initApp();
});
