document.addEventListener('DOMContentLoaded', () => {
    const loginView = document.getElementById('login-view');
    const dashboardView = document.getElementById('dashboard-view');
    const loginForm = document.getElementById('login-form');
    const passwordInput = document.getElementById('password');
    const loginError = document.getElementById('login-error');
    
    const tbody = document.getElementById('products-tbody');
    const btnLogout = document.getElementById('btn-logout');
    const btnPublish = document.getElementById('btn-publish');
    const btnAddProduct = document.getElementById('btn-add-product');
    
    const modal = document.getElementById('product-modal');
    const modalClose = document.getElementById('modal-close');
    const productForm = document.getElementById('product-form');

    let currentProducts = [];
    let editingIndex = -1;

    // Check if already logged in (password in localStorage)
    const savedPassword = localStorage.getItem('adminPassword');
    if (savedPassword) {
        checkLogin(savedPassword);
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pwd = passwordInput.value.trim();
        await checkLogin(pwd);
    });

    btnLogout.addEventListener('click', () => {
        localStorage.removeItem('adminPassword');
        dashboardView.classList.remove('active');
        loginView.classList.add('active');
        passwordInput.value = '';
    });

    async function checkLogin(pwd) {
        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: pwd })
            });
            const data = await res.json();
            if (data.success) {
                localStorage.setItem('adminPassword', pwd);
                loginError.textContent = '';
                loginView.classList.remove('active');
                dashboardView.classList.add('active');
                loadProducts();
            } else {
                loginError.textContent = 'Incorrect password.';
                localStorage.removeItem('adminPassword');
            }
        } catch (e) {
            loginError.textContent = 'Server error.';
        }
    }

    function getAuthHeaders() {
        return {
            'authorization': localStorage.getItem('adminPassword')
        };
    }

    async function loadProducts() {
        try {
            const res = await fetch('/api/products', { headers: getAuthHeaders() });
            if (res.status === 401) {
                btnLogout.click();
                return;
            }
            currentProducts = await res.json();
            renderProducts();
        } catch (e) {
            console.error('Failed to load products');
        }
    }

    function renderProducts() {
        tbody.innerHTML = '';
        currentProducts.forEach((p, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><img src="/${p.image}" alt="Product"></td>
                <td>${p.id}</td>
                <td>${p.title}</td>
                <td>${p.category}</td>
                <td>${p.price}</td>
                <td>${p.condition}</td>
                <td style="white-space: nowrap;">
                    <button class="btn-edit" data-index="${index}">Edit</button>
                    <button class="btn-delete" data-index="${index}">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Delete handlers
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if(confirm('Are you sure you want to delete this product?')) {
                    const idx = e.target.getAttribute('data-index');
                    currentProducts.splice(idx, 1);
                    saveProducts();
                }
            });
        });

        // Edit handlers
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = e.target.getAttribute('data-index');
                editingIndex = idx;
                const p = currentProducts[idx];
                
                document.getElementById('p-id').value = p.id || '';
                document.getElementById('p-title').value = p.title || '';
                document.getElementById('p-category').value = p.category || 'drone';
                document.getElementById('p-price').value = p.price || '';
                document.getElementById('p-condition').value = p.condition || 'New';
                document.getElementById('p-badge').value = p.badge || '';
                document.getElementById('p-specs').value = (p.features || []).join(', ');
                document.getElementById('p-description').value = p.description || '';
                document.getElementById('p-image-url').value = p.image || '';
                document.getElementById('p-image').value = ''; // Reset file input

                document.getElementById('modal-title').textContent = 'Edit Product';
                modal.classList.add('active');
            });
        });
    }

    async function saveProducts() {
        try {
            const res = await fetch('/api/products', {
                method: 'POST',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(currentProducts)
            });
            if (res.ok) {
                renderProducts();
            } else {
                alert('Failed to save products');
            }
        } catch (e) {
            alert('Error saving products');
        }
    }

    // Modal Handlers
    btnAddProduct.addEventListener('click', () => {
        editingIndex = -1;
        productForm.reset();
        document.getElementById('modal-title').textContent = 'Add Product';
        modal.classList.add('active');
    });

    modalClose.addEventListener('click', () => {
        modal.classList.remove('active');
    });

    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // 1. Upload image if selected
        const imageFile = document.getElementById('p-image').files[0];
        let imageUrl = document.getElementById('p-image-url').value; // In case of edit, though we only add for now

        if (imageFile) {
            const formData = new FormData();
            formData.append('image', imageFile);
            
            try {
                const res = await fetch('/api/upload', {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: formData
                });
                const data = await res.json();
                if (data.imageUrl) {
                    imageUrl = data.imageUrl;
                }
            } catch (e) {
                alert('Image upload failed');
                return;
            }
        }

        if (!imageUrl && editingIndex === -1) {
            alert('Please select an image for the new product.');
            return;
        }

        // Parse specs
        const specsRaw = document.getElementById('p-specs').value;
        let specs = [];
        if (specsRaw) {
            specs = specsRaw.split(',').map(s => s.trim()).filter(s => s);
        }

        const newProduct = {
            ...(editingIndex !== -1 ? currentProducts[editingIndex] : {}),
            id: document.getElementById('p-id').value,
            title: document.getElementById('p-title').value,
            price: document.getElementById('p-price').value,
            category: document.getElementById('p-category').value,
            condition: document.getElementById('p-condition').value,
            description: document.getElementById('p-description').value,
            image: imageUrl,
            features: specs,
        };

        const badge = document.getElementById('p-badge').value;
        if (badge) newProduct.badge = badge;

        if (editingIndex === -1) {
            currentProducts.push(newProduct);
        } else {
            currentProducts[editingIndex] = newProduct;
        }

        await saveProducts();
        modal.classList.remove('active');
    });

    // Publish logic
    btnPublish.addEventListener('click', async () => {
        btnPublish.textContent = 'Publishing...';
        btnPublish.disabled = true;
        try {
            const res = await fetch('/api/publish', {
                method: 'POST',
                headers: getAuthHeaders()
            });
            const data = await res.json();
            if (data.success) {
                alert(data.message);
            } else {
                alert('Error: ' + data.error);
            }
        } catch (e) {
            alert('Server error during publish.');
        }
        btnPublish.textContent = '🚀 Publish to Live Site';
        btnPublish.disabled = false;
    });
});
