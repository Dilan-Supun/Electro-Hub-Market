const whatsappService = require('../services/whatsappService');
const db = require('../utils/db');
const logger = require('../utils/logger');

const whatsappController = {
    // POST /api/whatsapp/test — send a test message to WA_TEST_RECIPIENT
    async sendTest(req, res) {
        try {
            const { phone } = req.body;
            const testOrder = {
                id: 'TEST-ORDER-001',
                customerName: 'Test Customer',
                customerPhone: phone || process.env.WA_TEST_RECIPIENT,
                total: 1500,
                shippingCarrier: 'DHL',
                trackingNumber: 'TEST123456'
            };
            const result = await whatsappService.sendOrderConfirmation(testOrder);
            res.json({ success: true, result });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // POST /api/whatsapp/notify/:orderId — manually trigger notification for an order
    async notifyOrder(req, res) {
        try {
            const { orderId } = req.params;
            const { type } = req.body; // 'confirmation' | 'shipped' | 'delivered'
            const orders = await db.read('orders');
            const order = orders.find(o => o.id === orderId);
            if (!order) return res.status(404).json({ error: 'Order not found' });

            let result;
            if (type === 'shipped') {
                result = await whatsappService.sendShippingNotification(order);
            } else if (type === 'delivered') {
                result = await whatsappService.sendDeliveryConfirmation(order);
            } else {
                result = await whatsappService.sendOrderConfirmation(order);
            }

            await logger.log('whatsapp notify', { orderId, type });
            res.json({ success: true, result });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = whatsappController;
