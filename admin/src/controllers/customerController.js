const sqlite = require('../utils/sqlite');
const logger = require('../utils/logger');

const customerController = {
    async getAll(req, res) {
        try {
            const customers = sqlite.getAllCustomers();
            res.json(customers);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async save(req, res) {
        try {
            const data = req.body;

            if (!data.id || !data.name) {
                return res.status(400).json({ error: 'Customer ID and Name are required' });
            }

            const existing = sqlite.getCustomerById(data.id);
            if (existing) {
                sqlite.upsertCustomer({ ...data, updatedAt: new Date().toISOString() });
                await logger.log('edit customer', { id: data.id, name: data.name });
            } else {
                sqlite.upsertCustomer({ ...data, createdAt: new Date().toISOString() });
                await logger.log('add customer', { id: data.id, name: data.name });
            }

            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async remove(req, res) {
        try {
            const { id } = req.params;
            const deleted = sqlite.deleteCustomer(id);
            if (!deleted) {
                return res.status(404).json({ error: 'Customer not found' });
            }
            await logger.log('delete customer', { id });
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = customerController;
