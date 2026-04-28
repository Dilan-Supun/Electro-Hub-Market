const db = require('../utils/db');
const logger = require('../utils/logger');

const customerController = {
    async getAll(req, res) {
        try {
            const customers = await db.read('customers');
            res.json(Array.isArray(customers) ? customers : []);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async save(req, res) {
        try {
            const customers = await db.read('customers');
            const data = req.body;

            if (!data.id || !data.name) {
                return res.status(400).json({ error: 'Customer ID and Name are required' });
            }

            const idx = customers.findIndex(c => c.id === data.id);
            if (idx !== -1) {
                customers[idx] = { ...customers[idx], ...data, updatedAt: new Date().toISOString() };
                await logger.log('edit customer', { id: data.id, name: data.name });
            } else {
                customers.push({ ...data, createdAt: new Date().toISOString() });
                await logger.log('add customer', { id: data.id, name: data.name });
            }

            await db.write('customers', customers);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async remove(req, res) {
        try {
            const { id } = req.params;
            const customers = await db.read('customers');
            const filtered = customers.filter(c => c.id !== id);
            if (filtered.length === customers.length) {
                return res.status(404).json({ error: 'Customer not found' });
            }
            await db.write('customers', filtered);
            await logger.log('delete customer', { id });
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = customerController;
