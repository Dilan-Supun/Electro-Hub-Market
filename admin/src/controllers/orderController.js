const db = require('../utils/db');
const sqlite = require('../utils/sqlite');
const logger = require('../utils/logger');

const STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

function generateOrderId() {
    const d = new Date();
    const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    return `ORD-${date}-${Date.now().toString().slice(-5)}`;
}

const orderController = {
    async getAll(req, res) {
        try {
            const orders = await sqlite.getAllOrders();
            res.json(orders);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async create(req, res) {
        try {
            const { customerId, items, shippingFee, notes, status } = req.body;

            if (!customerId || !Array.isArray(items) || items.length === 0) {
                return res.status(400).json({ error: 'Customer and at least one item are required' });
            }

            const customer = await sqlite.getCustomerById(customerId);
            if (!customer) return res.status(404).json({ error: 'Customer not found' });

            const products = await sqlite.getAllProducts();
            const lineItems = [];
            for (const item of items) {
                if (!item.productId || !item.qty || item.qty < 1) {
                    return res.status(400).json({ error: 'Each item needs a productId and qty >= 1' });
                }
                const product = await sqlite.getProductById(item.productId);
                const unitPrice = item.unitPrice !== undefined
                    ? parseFloat(item.unitPrice)
                    : parseFloat(product ? product.price : 0) || 0;
                lineItems.push({
                    productId: item.productId,
                    title: product ? product.title : item.productId,
                    qty: parseInt(item.qty),
                    unitPrice,
                    fragile: product ? product.fragile === true : false
                });
            }

            const subtotal = lineItems.reduce((s, i) => s + i.qty * i.unitPrice, 0);
            const shipping = parseFloat(shippingFee) || 0;
            const total = subtotal + shipping;

            const order = {
                id: generateOrderId(),
                customerId,
                customerName: customer.name,
                customerAddress: [customer.address, customer.city, customer.postalCode].filter(Boolean).join(', '),
                customerPhone: customer.phone || '',
                customerEmail: customer.email || '',
                items: lineItems,
                subtotal,
                shippingFee: shipping,
                total,
                status: STATUSES.includes(status) ? status : 'pending',
                notes: notes || '',
                createdAt: new Date().toISOString()
            };

            await sqlite.createOrder(order);
            await logger.log('create order', { id: order.id, customer: customer.name, total });
            res.json({ success: true, order });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async updateStatus(req, res) {
        try {
            const { id } = req.params;
            const { status, trackingNumber, shippingCarrier } = req.body;
            
            if (!STATUSES.includes(status)) {
                return res.status(400).json({ error: 'Invalid status' });
            }

            const order = await sqlite.getOrderById(id);
            if (!order) return res.status(404).json({ error: 'Order not found' });

            const extraFields = {};
            if (trackingNumber) extraFields.trackingNumber = trackingNumber;
            if (shippingCarrier) extraFields.shippingCarrier = shippingCarrier;

            if (status === 'shipped') {
                extraFields.shippedAt = new Date().toISOString();
                await sqlite.upsertShipping(id, {
                    carrier: shippingCarrier || '',
                    trackingNumber: trackingNumber || '',
                    status: 'shipped'
                });
            } else if (status === 'delivered') {
                extraFields.deliveredAt = new Date().toISOString();
                await sqlite.upsertShipping(id, { status: 'delivered', actualDelivery: extraFields.deliveredAt });
            }

            await sqlite.updateOrderStatus(id, status, extraFields);
            await logger.log('update order status', { id, status });
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async remove(req, res) {
        try {
            const { id } = req.params;
            const order = await sqlite.getOrderById(id);
            if (!order) return res.status(404).json({ error: 'Order not found' });
            
            await sqlite.deleteOrder(id);
            await logger.log('delete order', { id });
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = orderController;
