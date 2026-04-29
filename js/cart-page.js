document.addEventListener('DOMContentLoaded', () => {
    renderCartPage();
});

window.addEventListener('cartUpdated', () => {
    renderCartPage();
});

function renderCartPage() {
    const container = document.getElementById('cart-container');
    const summary = document.getElementById('cart-summary');
    const emptyMsg = document.getElementById('empty-cart-msg');
    const cart = Cart.get();

    if (cart.length === 0) {
        container.innerHTML = '';
        summary.style.display = 'none';
        emptyMsg.style.display = 'block';
        return;
    }

    emptyMsg.style.display = 'none';
    summary.style.display = 'block';

    let html = '<div class="cart-grid">';
    let total = 0;

    cart.forEach(item => {
        // Try to parse price if it's a string like "Rs. 6,950"
        let displayPrice = item.price;
        if (displayPrice === null || displayPrice === undefined || displayPrice === 0) {
            displayPrice = "Contact for Price";
        } else if (typeof displayPrice === 'number') {
            displayPrice = `Rs. ${displayPrice.toLocaleString()}`;
        }

        const priceStr = String(item.price || "0");
        const numericPrice = parseInt(priceStr.replace(/[^0-9]/g, '')) || 0;
        total += numericPrice * item.quantity;

        html += `
            <div class="cart-item">
                <img src="${item.image}" alt="${item.title}">
                <div class="cart-item-info">
                    <h3>${item.title}</h3>
                    <div class="cart-item-price">${displayPrice}</div>
                    <button class="btn-text" onclick="Cart.remove('${item.id}')" style="color: var(--color-accent); font-size: 12px; margin-top: 4px; border: none; background: none; cursor: pointer; padding: 0;">Remove</button>
                </div>
                <div class="cart-qty">
                    <button class="qty-btn" onclick="Cart.updateQuantity('${item.id}', ${item.quantity - 1})">-</button>
                    <span>${item.quantity}</span>
                    <button class="qty-btn" onclick="Cart.updateQuantity('${item.id}', ${item.quantity + 1})">+</button>
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
    
    document.getElementById('cart-total-value').textContent = `Rs. ${total.toLocaleString()}`;

    // Setup checkout button
    const checkoutBtn = document.getElementById('whatsapp-checkout-btn');
    checkoutBtn.onclick = () => {
        sendWhatsAppOrder(cart, total);
    };
}

function sendWhatsAppOrder(cart, total) {
    const shopName = (typeof shopSettings !== 'undefined' && shopSettings.shopName) ? shopSettings.shopName : "Electro Hub";
    const shopPhone = (typeof shopSettings !== 'undefined' && shopSettings.shopPhone) ? shopSettings.shopPhone.replace(/\s/g, '') : "94764413256";
    
    let message = `Hello ${shopName}! I'd like to place an order:\n\n`;
    
    cart.forEach((item, index) => {
        message += `${index + 1}. ${item.title}\n`;
        message += `   Qty: ${item.quantity} | Price: ${item.price}\n\n`;
    });

    message += `Estimated Total: Rs. ${total.toLocaleString()}\n`;
    message += `---------------------------\n`;
    message += `Please confirm availability and delivery charges.`;

    const waLink = `https://wa.me/${shopPhone.startsWith('0') ? '94' + shopPhone.substring(1) : shopPhone}?text=${encodeURIComponent(message)}`;
    window.open(waLink, '_blank');
}
