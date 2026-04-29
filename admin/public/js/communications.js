document.addEventListener('DOMContentLoaded', () => {
    let products = [];
    let orders = [];

    // --- Selectors ---
    const fbStatus = document.getElementById('fb-status');
    const waStatus = document.getElementById('wa-status');
    const fbProductSelect = document.getElementById('fb-product-select');
    const waOrderSelect = document.getElementById('wa-order-select');
    const fbCaption = document.getElementById('fb-caption');
    const btnGenCaption = document.getElementById('btn-gen-caption');
    const btnFbPost = document.getElementById('btn-fb-post');
    const btnFbSync = document.getElementById('btn-fb-sync');
    const fbSyncLog = document.getElementById('fb-sync-log');
    const waTestPhone = document.getElementById('wa-test-phone');
    const btnWaTest = document.getElementById('btn-wa-test');
    const waMsgType = document.getElementById('wa-msg-type');
    const btnWaNotify = document.getElementById('btn-wa-notify');

    // --- Initialization ---
    async function init() {
        await checkStatus();
        await loadData();
    }

    async function apiFetch(url, options = {}) {
        try {
            const res = await fetch(url, {
                ...options,
                headers: { 'Content-Type': 'application/json', ...options.headers }
            });
            return res.json();
        } catch (err) {
            console.error('API Error:', err);
            return null;
        }
    }

    async function checkStatus() {
        const status = await apiFetch('/api/communications/status');
        if (status) {
            updateStatusUI(fbStatus, status.facebook);
            updateStatusUI(waStatus, status.whatsapp);
            if (status.whatsappTestRecipient) {
                waTestPhone.value = status.whatsappTestRecipient;
            }
        }
    }

    function updateStatusUI(el, isOnline) {
        const dot = el.querySelector('.status-dot');
        const text = el.querySelector('span');
        if (isOnline) {
            dot.className = 'status-dot online';
            text.textContent = 'Connected';
        } else {
            dot.className = 'status-dot offline';
            text.textContent = 'Missing .env config';
        }
    }

    async function loadData() {
        const [prodData, orderData] = await Promise.all([
            apiFetch('/api/products'),
            apiFetch('/api/orders')
        ]);

        if (prodData) {
            products = prodData.filter(p => !p.isDeleted);
            fbProductSelect.innerHTML = products.map(p => `<option value="${p.id}">${p.title} (${p.id})</option>`).join('');
        }

        if (orderData) {
            orders = orderData;
            waOrderSelect.innerHTML = orders.slice(0, 20).map(o => `<option value="${o.id}">Order #${o.id} - ${o.customerName || 'Customer'}</option>`).join('');
        }
        
        await loadMessages();
    }

    async function loadMessages() {
        const tbody = document.getElementById('msg-tbody');
        if (!tbody) return;

        const messages = await apiFetch('/api/communications');
        if (messages && messages.length > 0) {
            tbody.innerHTML = messages.reverse().map(m => `
                <tr style="border-bottom: 1px solid var(--border);">
                    <td style="padding: 1rem; font-weight: 700;">${m.from}</td>
                    <td style="padding: 1rem;">${m.text}</td>
                    <td style="padding: 1rem; font-size: 0.8rem; color: var(--text-muted);">${new Date(m.timestamp).toLocaleString()}</td>
                    <td style="padding: 1rem;">
                        <a href="https://wa.me/${m.from}" target="_blank" class="btn-outline btn-sm">💬 Reply</a>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-muted);">No messages yet.</td></tr>';
        }
    }

    const btnRefreshMsgs = document.getElementById('btn-refresh-msgs');
    if (btnRefreshMsgs) btnRefreshMsgs.onclick = loadMessages;

    // --- Facebook Actions ---
    btnGenCaption.onclick = async () => {
        const productId = fbProductSelect.value;
        if (!productId) return;

        btnGenCaption.disabled = true;
        btnGenCaption.textContent = '⏳ Generating...';

        const res = await apiFetch('/api/ai/generate-text', {
            method: 'POST',
            body: JSON.stringify({ type: 'fb-caption', productId })
        });

        btnGenCaption.disabled = false;
        btnGenCaption.textContent = '✨ Generate AI Caption';

        if (res && res.success) {
            fbCaption.value = res.result;
        } else {
            alert('AI Generation failed');
        }
    };

    btnFbPost.onclick = async () => {
        const productId = fbProductSelect.value;
        const caption = fbCaption.value;
        if (!productId || !caption) return alert('Select product and enter caption');

        btnFbPost.disabled = true;
        btnFbPost.textContent = '⏳ Posting...';

        const res = await apiFetch(`/api/facebook/post-product/${productId}`, {
            method: 'POST',
            body: JSON.stringify({ message: caption, usePhoto: true })
        });

        btnFbPost.disabled = false;
        btnFbPost.textContent = 'Post to Facebook Page';

        if (res && res.success) {
            alert('🚀 Successfully posted to Facebook!');
        } else {
            alert('❌ Post failed: ' + (res ? res.error : 'Unknown error'));
        }
    };

    btnFbSync.onclick = async () => {
        if (!confirm('This will sync all products to your Facebook Catalog. Continue?')) return;

        btnFbSync.disabled = true;
        btnFbSync.textContent = '⏳ Syncing...';
        fbSyncLog.style.display = 'block';
        fbSyncLog.textContent = '> Starting bulk sync...';

        const res = await apiFetch('/api/facebook/bulk-sync', { method: 'POST' });

        btnFbSync.disabled = false;
        btnFbSync.textContent = 'Bulk Sync All Products to FB Shop';

        if (res && res.success) {
            fbSyncLog.textContent += '\n> Sync Complete!';
            fbSyncLog.textContent += `\n> Results: ${res.results.length} items processed.`;
            alert('✅ Catalog sync complete!');
        } else {
            fbSyncLog.textContent += '\n> Error: ' + (res ? res.error : 'Sync failed');
            alert('❌ Catalog sync failed');
        }
    };

    // --- WhatsApp Actions ---
    btnWaTest.onclick = async () => {
        const phone = waTestPhone.value;
        if (!phone) return alert('Enter a phone number');

        btnWaTest.disabled = true;
        btnWaTest.textContent = '⏳ Sending...';

        const res = await apiFetch('/api/whatsapp/test', {
            method: 'POST',
            body: JSON.stringify({ phone })
        });
        
        btnWaTest.disabled = false;
        btnWaTest.textContent = 'Send Test Message';

        if (res && res.success) {
            alert('✅ Test message sent!');
        } else {
            alert('❌ Test failed: ' + (res ? res.error : 'Unknown error'));
        }
    };

    btnWaNotify.onclick = async () => {
        const orderId = waOrderSelect.value;
        const type = waMsgType.value;
        if (!orderId) return;

        btnWaNotify.disabled = true;
        btnWaNotify.textContent = '⏳ Sending...';

        const res = await apiFetch(`/api/whatsapp/notify/${orderId}`, {
            method: 'POST',
            body: JSON.stringify({ type })
        });

        btnWaNotify.disabled = false;
        btnWaNotify.textContent = 'Send Notification';

        if (res && res.success) {
            alert('✅ Notification sent via WhatsApp!');
        } else {
            alert('❌ Failed to send: ' + (res ? res.error : 'Unknown error'));
        }
    };

    init();
});
