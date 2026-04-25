const CART_STORAGE_KEY = 'electro_hub_cart';

const Cart = {
    get() {
        try {
            const data = localStorage.getItem(CART_STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Error reading cart', e);
            return [];
        }
    },

    save(cart) {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
        window.dispatchEvent(new CustomEvent('cartUpdated', { detail: cart }));
    },

    add(product, quantity = 1) {
        const cart = this.get();
        const existing = cart.find(item => item.id === product.id);
        const currentQty = existing ? existing.quantity : 0;
        const maxAvailable = parseInt(product.stock) || 0;

        if (currentQty + quantity > maxAvailable) {
            alert(`Sorry, only ${maxAvailable} units are available in stock.`);
            return cart;
        }
        
        if (existing) {
            existing.quantity += quantity;
        } else {
            cart.push({
                id: product.id,
                title: product.title,
                price: product.price,
                image: product.image,
                stock: product.stock, // Store stock to check during updates
                quantity: quantity
            });
        }
        
        this.save(cart);
        return cart;
    },

    remove(id) {
        const cart = this.get().filter(item => item.id !== id);
        this.save(cart);
        return cart;
    },

    updateQuantity(id, quantity) {
        const cart = this.get();
        const item = cart.find(item => item.id === id);
        if (item) {
            const maxAvailable = parseInt(item.stock) || 999; // fallback if stock missing
            if (quantity > maxAvailable) {
                alert(`Only ${maxAvailable} units available.`);
                item.quantity = maxAvailable;
            } else {
                item.quantity = Math.max(1, quantity);
            }
            this.save(cart);
        }
        return cart;
    },

    clear() {
        this.save([]);
    },

    getCount() {
        return this.get().reduce((sum, item) => sum + item.quantity, 0);
    }
};

// Auto-update cart badges on page load
document.addEventListener('DOMContentLoaded', () => {
    updateCartBadges();
});

window.addEventListener('cartUpdated', () => {
    updateCartBadges();
});

function updateCartBadges() {
    const count = Cart.getCount();
    const badges = document.querySelectorAll('.cart-count');
    badges.forEach(badge => {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
    });
}

// Initial call
updateCartBadges();
