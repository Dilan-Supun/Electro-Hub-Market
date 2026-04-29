document.addEventListener('DOMContentLoaded', () => {
    // --- State & Constants ---
    let currentProducts = [];
    let currentLogs = [];
    let currentSettings = {};
    let currentCustomers = [];
    let currentOrders = [];
    let editingId = null;
    let editingCustomerId = null;
    let editingOrderStatusId = null;
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
            loadStats(),
            loadCustomers(),
            loadOrders()
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
            'section-settings': 'Global Configuration',
            'section-customers': 'Customer Accounts & Contacts',
            'section-orders': 'Orders & Fulfillment',
            'section-documents': 'Invoices & Packing Labels'
        };
        sectionSubtitle.textContent = subtitles[target] || '';
    }

    function refreshSectionData(target) {
        if (target === 'section-products') loadProducts();
        if (target === 'section-logs') loadLogs();
        if (target === 'section-dashboard') loadStats();
        if (target === 'section-settings') loadSettings();
        if (target === 'section-customers') loadCustomers();
        if (target === 'section-orders') loadOrders();
        if (target === 'section-documents') { loadOrders(); }
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
                'set-watermark-opacity': 'watermarkOpacity',
                'set-shop-name': 'shopName',
                'set-shop-address': 'shopAddress',
                'set-shop-phone': 'shopPhone',
                'set-shop-phone2': 'shopPhone2',
                'set-shop-email': 'shopEmail',
                'set-shop-website': 'shopWebsite',
                'set-shop-motto': 'shopMotto',
                'set-shop-slogan': 'shopSlogan',
                'set-fb-page-id': 'fbPageId',
                'set-fb-catalog-id': 'fbCatalogId',
                'set-wa-phone-id': 'waPhoneNumberId'
            };
            for (const [id, key] of Object.entries(fields)) {
                const el = document.getElementById(id);
                if (el) {
                    // Fallback for legacy shopUrl to shopWebsite
                    let val = data[key] || '';
                    if (key === 'shopWebsite' && !val && data.shopUrl) val = data.shopUrl;
                    el.value = val;
                }
            }
            // Don't pre-fill token fields for security — just show placeholder if set
            const fbTokenEl = document.getElementById('set-fb-access-token');
            if (fbTokenEl && data.fbAccessToken) fbTokenEl.placeholder = '(saved)';
            const waTokenEl = document.getElementById('set-wa-access-token');
            if (waTokenEl && data.waAccessToken) waTokenEl.placeholder = '(saved)';

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

            // Show shop logo preview if set
            if (data.shopLogoPath) {
                const shopLogoPreview = document.getElementById('shop-logo-preview');
                const shopLogoPrompt = document.getElementById('shop-logo-prompt');
                const shopLogoStatus = document.getElementById('shop-logo-status');
                if (shopLogoPreview) { shopLogoPreview.src = '/' + data.shopLogoPath; shopLogoPreview.style.display = 'block'; }
                if (shopLogoPrompt) shopLogoPrompt.style.display = 'none';
                if (shopLogoStatus) { shopLogoStatus.textContent = `Active: ${data.shopLogoPath.split('/').pop()}`; shopLogoStatus.style.display = 'block'; }
            }

            // Update API status badges
            const fbBadge = document.getElementById('fb-status-badge');
            const waBadge = document.getElementById('wa-status-badge');
            if (fbBadge) {
                if (data.fbPageId && data.fbAccessToken) {
                    fbBadge.textContent = 'Configured';
                    fbBadge.className = 'status-badge ok';
                } else {
                    fbBadge.textContent = 'Not Configured';
                    fbBadge.className = 'status-badge';
                }
            }
            if (waBadge) {
                if (data.waPhoneNumberId && data.waAccessToken) {
                    waBadge.textContent = 'Configured';
                    waBadge.className = 'status-badge ok';
                } else {
                    waBadge.textContent = 'Not Configured';
                    waBadge.className = 'status-badge';
                }
            }
        }
    }

    async function loadCustomers() {
        const data = await apiFetch('/api/customers');
        if (data) {
            currentCustomers = data;
            renderCustomers();
            populateCustomerSelects();
        }
    }

    async function loadOrders() {
        const data = await apiFetch('/api/orders');
        if (data) {
            currentOrders = data;
            renderOrders();
            populateOrderSelects();
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
    const watermarkOnlyBtn = document.getElementById('btn-watermark-only');

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
        document.getElementById('p-id').readOnly = true;
        document.getElementById('p-title').value = p.title;
        document.getElementById('p-price').value = p.price;
        document.getElementById('p-stock').value = p.stock || 0;
        document.getElementById('p-category').value = p.category;
        document.getElementById('p-description').value = p.description || '';
        document.getElementById('p-tags').value = (p.tags || []).join('; ');
        document.getElementById('p-condition').value = p.condition || '';
        document.getElementById('p-features').value = (p.features || []).join('; ');
        document.getElementById('p-buying').value = (p.buyingDelivery || []).join('; ');
        document.getElementById('p-image-path').value = p.image || '';
        
        const preview = document.getElementById('p-image-preview');
        const prompt = document.getElementById('p-image-prompt');
        if (p.image) {
            preview.src = '/' + p.image;
            preview.style.display = 'block';
            prompt.style.display = 'none';
        } else {
            preview.style.display = 'none';
            prompt.style.display = 'block';
        }
        
        modal.classList.add('active');
        modal.style.display = 'flex';
    }

    document.getElementById('btn-add-product').onclick = () => {
        editingId = null;
        productForm.reset();
        document.getElementById('p-id').readOnly = false;
        document.getElementById('p-image-preview').style.display = 'none';
        document.getElementById('p-image-prompt').style.display = 'block';
        document.getElementById('p-image-path').value = '';
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
            tags: document.getElementById('p-tags').value.split(';').map(s => s.trim()).filter(s => s),
            condition: document.getElementById('p-condition').value,
            features: document.getElementById('p-features').value.split(';').map(s => s.trim()).filter(s => s),
            buyingDelivery: document.getElementById('p-buying').value.split(';').map(s => s.trim()).filter(s => s),
            image: document.getElementById('p-image-path').value
        };

        const res = await apiFetch('/api/products', {
            method: 'POST',
            body: JSON.stringify(formData)
        });

        if (res && res.success) {
            modal.style.display = 'none';
            loadProducts();
            loadStats();
        } else {
            alert('Error saving product: ' + (res ? res.error : 'Unknown error'));
        }
    };

    // --- AI Product Generation Buttons ---
    const btnGenDesc = document.getElementById('btn-gen-description');
    if (btnGenDesc) {
        btnGenDesc.onclick = async () => {
            const title = document.getElementById('p-title').value;
            const category = document.getElementById('p-category').value;
            if (!title) return alert('Please enter a title first');

            btnGenDesc.disabled = true;
            btnGenDesc.textContent = '⏳...';

            const res = await apiFetch('/api/ai/generate-text', {
                method: 'POST',
                body: JSON.stringify({ 
                    type: 'description', 
                    productId: editingId, // May be null for new products
                    customPrompt: `Write a 2-3 sentence engaging description for ${title} in category ${category}.`
                })
            });

            btnGenDesc.disabled = false;
            btnGenDesc.textContent = '✨ AI';

            if (res && res.success) {
                document.getElementById('p-description').value = res.result;
            }
        };
    }

    const btnGenTags = document.getElementById('btn-gen-tags');
    if (btnGenTags) {
        btnGenTags.onclick = async () => {
            const title = document.getElementById('p-title').value;
            if (!title) return alert('Please enter a title first');

            btnGenTags.disabled = true;
            btnGenTags.textContent = '⏳...';

            const res = await apiFetch('/api/ai/generate-text', {
                method: 'POST',
                body: JSON.stringify({ 
                    type: 'hashtags', 
                    productId: editingId,
                    customPrompt: `Generate 5-8 comma-separated tags for an electronics product: ${title}`
                })
            });

            btnGenTags.disabled = false;
            btnGenTags.textContent = '✨ AI Tags';

            if (res && res.success) {
                // If it returns an array of strings, join them with semicolon
                const tags = Array.isArray(res.result) ? res.result.join('; ') : res.result.replace(/,/g, ';');
                document.getElementById('p-tags').value = tags;
            }
        };
    }

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

    // --- Shop Image Upload ---
    const shopImageInput = document.getElementById('shop-logo-input');
    const shopImageUploadZone = document.getElementById('shop-logo-upload-zone');
    const shopImagePreview = document.getElementById('shop-logo-preview');
    const shopImagePrompt = document.getElementById('shop-logo-prompt');
    const shopImageStatus = document.getElementById('shop-logo-status');

    if (shopImageUploadZone) {
        shopImageUploadZone.addEventListener('click', () => shopImageInput && shopImageInput.click());
    }

    if (shopImageInput) {
        shopImageInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Instant local preview
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (shopImagePreview) { shopImagePreview.src = ev.target.result; shopImagePreview.style.display = 'block'; }
                if (shopImagePrompt) shopImagePrompt.style.display = 'none';
            };
            reader.readAsDataURL(file);

            // Upload to server
            if (shopImageStatus) { shopImageStatus.textContent = 'Uploading…'; shopImageStatus.style.display = 'block'; }
            const formData = new FormData();
            formData.append('shopImage', file);
            try {
                const res = await fetch('/api/settings/upload-shop-image', { method: 'POST', body: formData });
                const data = await res.json();
                if (data.success) {
                    currentSettings.shopLogoPath = data.shopLogoPath;
                    if (shopImageStatus) shopImageStatus.textContent = `✅ Image saved: ${file.name}`;
                } else {
                    if (shopImageStatus) shopImageStatus.textContent = '❌ Upload failed: ' + (data.error || 'Unknown error');
                }
            } catch (err) {
                if (shopImageStatus) shopImageStatus.textContent = '❌ Upload error';
            }
        };
    }

    // --- Shop Info Form ---
    const shopForm = document.getElementById('shop-form');
    if (shopForm) {
        shopForm.onsubmit = async (e) => {
            e.preventDefault();
            const payload = {
                ...currentSettings,
                shopName: document.getElementById('set-shop-name').value,
                shopAddress: document.getElementById('set-shop-address').value,
                shopPhone: document.getElementById('set-shop-phone').value,
                shopPhone2: document.getElementById('set-shop-phone2').value,
                shopEmail: document.getElementById('set-shop-email').value,
                shopWebsite: document.getElementById('set-shop-website').value,
                shopMotto: document.getElementById('set-shop-motto').value,
                shopSlogan: document.getElementById('set-shop-slogan').value,
                shopUrl: document.getElementById('set-shop-website').value // Sync both for compatibility
            };
            const res = await apiFetch('/api/settings', { method: 'POST', body: JSON.stringify(payload) });
            if (res && res.success) {
                alert('✅ Shop info saved!');
                currentSettings = payload;
            } else {
                alert('❌ Failed to save shop info.');
            }
        };
    }

    // --- Watermark Only (AI Studio) ---
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

    // ══════════════════════════════════════════════════════════════
    //  CUSTOMERS
    // ══════════════════════════════════════════════════════════════

    function renderCustomers() {
        const tbody = document.getElementById('customers-tbody');
        if (!tbody) return;
        const search = (document.getElementById('search-customers').value || '').toLowerCase();
        let list = currentCustomers.filter(c =>
            c.name.toLowerCase().includes(search) ||
            (c.email || '').toLowerCase().includes(search) ||
            (c.phone || '').includes(search) ||
            (c.phone2 || '').includes(search) ||
            (c.city || '').toLowerCase().includes(search) ||
            (c.district || '').toLowerCase().includes(search) ||
            (c.notes || '').toLowerCase().includes(search)
        );
        const total = document.getElementById('cust-total');
        if (total) total.textContent = currentCustomers.length;
        tbody.innerHTML = '';
        if (list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-muted);">No customers found.</td></tr>`;
            return;
        }
        list.forEach(c => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-family:monospace;font-size:0.8rem;">${c.id}</td>
                <td style="font-weight:600;">${c.name}</td>
                <td>${c.email || '<span style="color:var(--text-muted)">—</span>'}</td>
                <td>
                    <div style="font-size:0.85rem;">${c.phone || '—'}</div>
                    ${c.phone2 ? `<div style="font-size:0.75rem; color:var(--text-muted);">Secondary: ${c.phone2}</div>` : ''}
                </td>
                <td>
                    <div>${c.city || '—'}</div>
                    ${c.district ? `<div style="font-size:0.7rem; color:var(--text-muted);">${c.district}</div>` : ''}
                </td>
                <td style="font-size:0.8rem;color:var(--text-muted);">${c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}</td>
                <td>
                    ${c.notes ? `<span title="${c.notes.replace(/"/g, '&quot;')}" style="cursor:help; font-size:1.2rem;">📝</span>` : '<span style="color:var(--text-muted)">—</span>'}
                </td>
                <td>
                    <div style="display:flex;gap:0.4rem;">
                        <button class="btn-edit-action" data-cid="${c.id}">Edit</button>
                        <button class="btn-delete-action" data-cid="${c.id}">Delete</button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
        tbody.querySelectorAll('.btn-edit-action').forEach(btn =>
            btn.onclick = () => openCustomerModal(btn.dataset.cid)
        );
        tbody.querySelectorAll('.btn-delete-action').forEach(btn =>
            btn.onclick = () => deleteCustomer(btn.dataset.cid)
        );
    }

    function openCustomerModal(id) {
        editingCustomerId = id || null;
        const form = document.getElementById('customer-form');
        form.reset();
        if (id) {
            const c = currentCustomers.find(x => x.id === id);
            if (!c) return;
            document.getElementById('customer-modal-title').textContent = 'Edit Customer';
            document.getElementById('c-id').value = c.id;
            document.getElementById('c-id').readOnly = true;
            document.getElementById('c-name').value = c.name;
            document.getElementById('c-email').value = c.email || '';
            document.getElementById('c-phone').value = c.phone || '';
            document.getElementById('c-phone2').value = c.phone2 || '';
            document.getElementById('c-address').value = c.address || '';
            document.getElementById('c-city').value = c.city || '';
            document.getElementById('c-district').value = c.district || '';
            document.getElementById('c-postal').value = c.postalCode || '';
            document.getElementById('c-notes').value = c.notes || '';
        } else {
            document.getElementById('customer-modal-title').textContent = 'Add Customer';
            document.getElementById('c-id').readOnly = false;
            // Generate a random ID for new customers
            document.getElementById('c-id').value = 'CUST-' + Math.floor(1000 + Math.random() * 9000);
        }
        document.getElementById('c-smart-paste').value = '';
        document.getElementById('customer-modal').style.display = 'flex';
    }

    function parseCustomerText(text) {
        if (!text) return {};
        // Clean up whitespace and handle multiple spaces
        const rawLines = text.split('\n').map(l => l.trim()).filter(l => l);
        if (rawLines.length === 0) return {};

        const data = {
            phone1: '',
            phone2: '',
            name: '',
            address: '',
            city: '',
            district: ''
        };

        // 1. Extract all phone numbers line by line to prevent cross-line matching
        const cleanNumbers = [];
        const phoneRegex = /(?:\+94|0)?7[0-9\s-]{8,12}/g;
        
        for (const line of rawLines) {
            const matches = line.match(phoneRegex);
            if (matches) {
                matches.forEach(m => {
                    // Extract only digits and leading plus
                    let clean = m.replace(/[^\d+]/g, '');
                    
                    // Normalize Sri Lankan mobile numbers
                    if (clean.startsWith('7') && clean.length === 9) {
                        clean = '0' + clean;
                    } else if (clean.startsWith('94') && clean.length === 11) {
                        clean = '+' + clean;
                    }

                    if (clean.length >= 10 && clean.length <= 13) {
                        if (!cleanNumbers.includes(clean)) cleanNumbers.push(clean);
                    }
                });
            }
        }
        
        if (cleanNumbers.length > 0) data.phone1 = cleanNumbers[0];
        if (cleanNumbers.length > 1) data.phone2 = cleanNumbers[1];

        // 2. Try Template detection (lines with colons)
        const findValue = (keys) => {
            for (const line of rawLines) {
                for (const key of keys) {
                    if (line.toLowerCase().includes(key.toLowerCase())) {
                        const parts = line.split(/[:：]/);
                        if (parts.length > 1) return parts.slice(1).join(':').trim();
                    }
                }
            }
            return null;
        };

        data.name = findValue(['Contact Name', 'නම']);
        data.address = findValue(['Address', 'ලිපිනය']);
        data.district = findValue(['District', 'දිස්ත්රික්කය']);
        data.city = findValue(['Nearest City', 'නගරය']);
        
        // If template detection found name/address, we're likely done with parsing
        if (data.name && data.address) return data;

        // 3. Raw Text Heuristics (no labels)
        // Filter out lines that are just phone numbers
        const contentLines = rawLines.filter(line => {
            const clean = line.replace(/[\s-]/g, '');
            return !clean.match(/^[0-9+]{9,12}$/);
        });

        if (contentLines.length > 0) {
            // First line is almost always the name
            if (!data.name) data.name = contentLines[0];

            if (contentLines.length > 1) {
                // If we have at least 2 lines left, try to identify city/district
                // Often the last 1-2 lines are City and District
                const lastIdx = contentLines.length - 1;
                
                if (contentLines.length >= 3) {
                    if (!data.district) data.district = contentLines[lastIdx];
                    if (!data.city) data.city = contentLines[lastIdx - 1];
                    if (!data.address) data.address = contentLines.slice(1, lastIdx - 1).join(', ');
                } else {
                    // Only 2 lines: Name and City/Address
                    if (!data.city) data.city = contentLines[1];
                    if (!data.address) data.address = contentLines[1];
                }
            }
        }

        return data;
    }

    const btnDetect = document.getElementById('btn-c-detect');
    if (btnDetect) {
        btnDetect.onclick = () => {
            const text = document.getElementById('c-smart-paste').value;
            const detected = parseCustomerText(text);
            
            if (detected.name) document.getElementById('c-name').value = detected.name;
            if (detected.address) document.getElementById('c-address').value = detected.address;
            if (detected.district) document.getElementById('c-district').value = detected.district;
            if (detected.city) document.getElementById('c-city').value = detected.city;
            if (detected.phone1) document.getElementById('c-phone').value = detected.phone1;
            if (detected.phone2) document.getElementById('c-phone2').value = detected.phone2;

            if (Object.keys(detected).some(k => detected[k])) {
                btnDetect.textContent = '✅ Detected!';
                setTimeout(() => btnDetect.textContent = '🔍 Detect & Auto-Fill', 2000);
            } else {
                alert('Could not detect details. Please check the format.');
            }
        };
    }

    async function deleteCustomer(id) {
        if (!confirm(`Delete customer ${id}? This cannot be undone.`)) return;
        const res = await apiFetch(`/api/customers/${id}`, { method: 'DELETE' });
        if (res && res.success) loadCustomers();
    }

    document.getElementById('btn-add-customer') && document.getElementById('btn-add-customer').addEventListener('click', () => openCustomerModal(null));
    document.getElementById('search-customers') && document.getElementById('search-customers').addEventListener('input', renderCustomers);

    const customerForm = document.getElementById('customer-form');
    if (customerForm) {
        customerForm.onsubmit = async (e) => {
            e.preventDefault();
            const payload = {
                id: document.getElementById('c-id').value.trim(),
                name: document.getElementById('c-name').value.trim(),
                email: document.getElementById('c-email').value.trim(),
                phone: document.getElementById('c-phone').value.trim(),
                phone2: document.getElementById('c-phone2').value.trim(),
                address: document.getElementById('c-address').value.trim(),
                city: document.getElementById('c-city').value.trim(),
                district: document.getElementById('c-district').value.trim(),
                postalCode: document.getElementById('c-postal').value.trim(),
                notes: document.getElementById('c-notes').value.trim()
            };
            const res = await apiFetch('/api/customers', { method: 'POST', body: JSON.stringify(payload) });
            if (res && res.success) {
                closeModal('customer-modal');
                loadCustomers();
            } else {
                alert('❌ ' + (res && res.error ? res.error : 'Failed to save customer'));
            }
        };
    }

    function populateCustomerSelects() {
        const sel = document.getElementById('o-customer');
        if (!sel) return;
        const cur = sel.value;
        sel.innerHTML = '<option value="">-- Select Customer --</option>';
        currentCustomers.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = `${c.name} (${c.id})`;
            sel.appendChild(opt);
        });
        if (cur) sel.value = cur;
    }

    // ══════════════════════════════════════════════════════════════
    //  ORDERS
    // ══════════════════════════════════════════════════════════════

    const STATUS_CSS = {
        pending: 'status-pending',
        processing: 'status-processing',
        shipped: 'status-shipped',
        delivered: 'status-delivered',
        cancelled: 'status-cancelled'
    };

    function fmtMoney(n) {
        return `Rs. ${parseFloat(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    function renderOrders() {
        const tbody = document.getElementById('orders-tbody');
        if (!tbody) return;
        const search = (document.getElementById('search-orders') ? document.getElementById('search-orders').value : '').toLowerCase();
        const statusFilter = document.getElementById('filter-order-status') ? document.getElementById('filter-order-status').value : 'all';

        let list = currentOrders.filter(o => {
            const matchSearch = o.id.toLowerCase().includes(search) || o.customerName.toLowerCase().includes(search);
            const matchStatus = statusFilter === 'all' || o.status === statusFilter;
            return matchSearch && matchStatus;
        });

        // Stats
        const totalEl = document.getElementById('ord-total');
        const revEl = document.getElementById('ord-revenue');
        const pendEl = document.getElementById('ord-pending');
        if (totalEl) totalEl.textContent = currentOrders.length;
        if (revEl) revEl.textContent = fmtMoney(currentOrders.reduce((s, o) => s + (o.total || 0), 0));
        if (pendEl) pendEl.textContent = currentOrders.filter(o => o.status === 'pending').length;

        tbody.innerHTML = '';
        if (list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-muted);">No orders found.</td></tr>`;
            return;
        }

        list.forEach(o => {
            const itemCount = o.items ? o.items.reduce((s, i) => s + i.qty, 0) : 0;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-family:monospace;font-size:0.8rem;font-weight:600;">${o.id}</td>
                <td>
                    <div style="font-weight:600;">${o.customerName}</div>
                    <div style="font-size:0.75rem;color:var(--text-muted);">${o.customerId}</div>
                </td>
                <td>${itemCount} item${itemCount !== 1 ? 's' : ''}</td>
                <td><strong>${fmtMoney(o.total)}</strong></td>
                <td><span class="order-status ${STATUS_CSS[o.status] || ''}">${o.status}</span></td>
                <td style="font-size:0.8rem;color:var(--text-muted);">${new Date(o.createdAt).toLocaleDateString()}</td>
                <td>
                    <div style="display:flex;gap:0.4rem;flex-wrap:wrap;">
                        <button class="btn-sm info" data-oid="${o.id}" data-action="status">Status</button>
                        <button class="btn-sm success" data-oid="${o.id}" data-action="invoice">🧾</button>
                        <button class="btn-sm warn" data-oid="${o.id}" data-action="label">📦</button>
                        <button class="btn-sm danger" data-oid="${o.id}" data-action="del">✕</button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        tbody.querySelectorAll('[data-action]').forEach(btn => {
            btn.onclick = () => {
                const oid = btn.dataset.oid;
                const action = btn.dataset.action;
                if (action === 'invoice') window.open(`/api/documents/invoice/${oid}`, '_blank');
                else if (action === 'label') window.open(`/api/documents/label/${oid}`, '_blank');
                else if (action === 'status') openOrderStatusModal(oid);
                else if (action === 'del') deleteOrder(oid);
            };
        });
    }

    async function deleteOrder(id) {
        if (!confirm(`Delete order ${id}? This cannot be undone.`)) return;
        const res = await apiFetch(`/api/orders/${id}`, { method: 'DELETE' });
        if (res && res.success) loadOrders();
    }

    function openOrderStatusModal(orderId) {
        editingOrderStatusId = orderId;
        const order = currentOrders.find(o => o.id === orderId);
        if (!order) return;
        document.getElementById('osm-order-id').textContent = orderId;
        document.getElementById('osm-status').value = order.status;
        document.getElementById('order-status-modal').style.display = 'flex';
    }

    document.getElementById('btn-osm-save') && document.getElementById('btn-osm-save').addEventListener('click', async () => {
        if (!editingOrderStatusId) return;
        const status = document.getElementById('osm-status').value;
        const res = await apiFetch(`/api/orders/${editingOrderStatusId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
        if (res && res.success) {
            closeModal('order-status-modal');
            loadOrders();
        } else {
            alert('❌ ' + (res && res.error ? res.error : 'Failed to update status'));
        }
    });

    document.getElementById('search-orders') && document.getElementById('search-orders').addEventListener('input', renderOrders);
    document.getElementById('filter-order-status') && document.getElementById('filter-order-status').addEventListener('change', renderOrders);

    // ── Order creation form ──────────────────────────────────────

    document.getElementById('btn-add-order') && document.getElementById('btn-add-order').addEventListener('click', () => {
        document.getElementById('order-form').reset();
        document.getElementById('order-items-list').innerHTML = '';
        document.getElementById('o-total-display').textContent = 'Rs. 0.00';
        populateCustomerSelects();
        addOrderLineItem(); // start with one empty row
        document.getElementById('order-modal').style.display = 'flex';
    });

    document.getElementById('btn-add-line-item') && document.getElementById('btn-add-line-item').addEventListener('click', addOrderLineItem);

    function addOrderLineItem() {
        const list = document.getElementById('order-items-list');
        if (!list) return;
        const row = document.createElement('div');
        row.className = 'order-item-row';

        const productOpts = currentProducts.map(p =>
            `<option value="${p.id}" data-price="${parseFloat(p.price) || 0}">${p.title}</option>`
        ).join('');

        row.innerHTML = `
            <select class="li-product"><option value="">-- Select Product --</option>${productOpts}</select>
            <input type="number" class="li-qty" value="1" min="1" placeholder="Qty">
            <input type="number" class="li-price" placeholder="Unit Price" min="0" step="0.01">
            <button type="button" class="btn-remove-item" title="Remove">✕</button>
        `;

        row.querySelector('.li-product').addEventListener('change', function () {
            const opt = this.options[this.selectedIndex];
            const price = parseFloat(opt.dataset.price) || 0;
            row.querySelector('.li-price').value = price.toFixed(2);
            recalcOrderTotal();
        });
        row.querySelector('.li-qty').addEventListener('input', recalcOrderTotal);
        row.querySelector('.li-price').addEventListener('input', recalcOrderTotal);
        row.querySelector('.btn-remove-item').addEventListener('click', () => { row.remove(); recalcOrderTotal(); });

        list.appendChild(row);
    }

    function recalcOrderTotal() {
        const rows = document.querySelectorAll('.order-item-row');
        let sub = 0;
        rows.forEach(r => {
            const qty = parseFloat(r.querySelector('.li-qty').value) || 0;
            const price = parseFloat(r.querySelector('.li-price').value) || 0;
            sub += qty * price;
        });
        const shipping = parseFloat(document.getElementById('o-shipping').value) || 0;
        const total = sub + shipping;
        const disp = document.getElementById('o-total-display');
        if (disp) disp.textContent = fmtMoney(total);
    }

    document.getElementById('o-shipping') && document.getElementById('o-shipping').addEventListener('input', recalcOrderTotal);

    const orderForm = document.getElementById('order-form');
    if (orderForm) {
        orderForm.onsubmit = async (e) => {
            e.preventDefault();
            const customerId = document.getElementById('o-customer').value;
            if (!customerId) return alert('Please select a customer.');

            const rows = document.querySelectorAll('.order-item-row');
            const items = [];
            for (const r of rows) {
                const productId = r.querySelector('.li-product').value;
                const qty = parseInt(r.querySelector('.li-qty').value);
                const unitPrice = parseFloat(r.querySelector('.li-price').value);
                if (!productId || !qty || qty < 1) { alert('Each line item needs a product and quantity ≥ 1.'); return; }
                items.push({ productId, qty, unitPrice: isNaN(unitPrice) ? 0 : unitPrice });
            }
            if (items.length === 0) return alert('Add at least one item.');

            const payload = {
                customerId,
                items,
                shippingFee: parseFloat(document.getElementById('o-shipping').value) || 0,
                notes: document.getElementById('o-notes').value,
                status: document.getElementById('o-status').value
            };

            const res = await apiFetch('/api/orders', { method: 'POST', body: JSON.stringify(payload) });
            if (res && res.success) {
                closeModal('order-modal');
                loadOrders();
            } else {
                alert('❌ ' + (res && res.error ? res.error : 'Failed to create order'));
            }
        };
    }

    // ══════════════════════════════════════════════════════════════
    //  DOCUMENTS
    // ══════════════════════════════════════════════════════════════

    function populateOrderSelects() {
        ['doc-order-inv', 'doc-order-lbl'].forEach(id => {
            const sel = document.getElementById(id);
            if (!sel) return;
            const cur = sel.value;
            sel.innerHTML = '<option value="">-- Select Order --</option>';
            currentOrders.forEach(o => {
                const opt = document.createElement('option');
                opt.value = o.id;
                opt.textContent = `${o.id} — ${o.customerName} (${fmtMoney(o.total)})`;
                sel.appendChild(opt);
            });
            if (cur) sel.value = cur;
        });
    }

    document.getElementById('btn-gen-invoice') && document.getElementById('btn-gen-invoice').addEventListener('click', () => {
        const id = document.getElementById('doc-order-inv').value;
        if (!id) return alert('Please select an order.');
        window.open(`/api/documents/invoice/${id}`, '_blank');
    });

    document.getElementById('btn-gen-label') && document.getElementById('btn-gen-label').addEventListener('click', () => {
        const id = document.getElementById('doc-order-lbl').value;
        if (!id) return alert('Please select an order.');
        window.open(`/api/documents/label/${id}`, '_blank');
    });

    // ══════════════════════════════════════════════════════════════
    //  SHARED MODAL CLOSE HELPERS
    // ══════════════════════════════════════════════════════════════

    function closeModal(id) {
        const m = document.getElementById(id);
        if (m) m.style.display = 'none';
    }

    document.querySelectorAll('.close-btn[data-modal], [data-modal]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const mid = btn.dataset.modal;
            if (mid) closeModal(mid);
        });
    });

    window.addEventListener('click', (e) => {
        ['customer-modal', 'order-modal', 'order-status-modal'].forEach(id => {
            const m = document.getElementById(id);
            if (m && e.target === m) closeModal(id);
        });
    });

    // --- Start ---
    initApp();
});
