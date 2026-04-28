const sqlite = require('../utils/sqlite');
const logger = require('../utils/logger');

const customerController = {
    async getAll(req, res) {
        try {
            const customers = await sqlite.getAllCustomers();
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
            const existing = await sqlite.getCustomerById(data.id);
            await sqlite.upsertCustomer(data);
            if (existing) {
                await logger.log('edit customer', { id: data.id, name: data.name });
            } else {
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
            const existing = await sqlite.getCustomerById(id);
            if (!existing) {
                return res.status(404).json({ error: 'Customer not found' });
            }
            await sqlite.deleteCustomer(id);
            await logger.log('delete customer', { id });
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = customerController;
