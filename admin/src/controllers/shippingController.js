const sqlite = require('../utils/sqlite');
const logger = require('../utils/logger');

const shippingController = {
    async getAll(req, res) {
        try {
            const records = sqlite.getAllShipping();
            res.json(records);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async getByOrder(req, res) {
        try {
            const { orderId } = req.params;
            const record = sqlite.getShipping(orderId);
            if (!record) return res.status(404).json({ error: 'Shipping record not found' });
            res.json(record);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async upsert(req, res) {
        try {
            const { orderId } = req.params;
            const data = req.body;
            
            sqlite.upsertShipping(orderId, data);
            await logger.log('update shipping', { orderId, carrier: data.carrier });
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async remove(req, res) {
        try {
            const { orderId } = req.params;
            sqlite.deleteShipping(orderId);
            await logger.log('delete shipping', { orderId });
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = shippingController;
