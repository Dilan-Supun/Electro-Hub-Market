const geminiService = require('../services/geminiService');
const logger = require('../utils/logger');

const aiController = {
    // POST /api/ai/description — generate product description
    async generateDescription(req, res) {
        try {
            const { title, category, price, specs, description } = req.body;
            if (!title) return res.status(400).json({ error: 'Product title is required' });
            const text = await geminiService.generateProductDescription({ title, category, price, specs, description });
            await logger.log('ai generate description', { title });
            res.json({ success: true, description: text });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // POST /api/ai/caption — generate Facebook post caption
    async generateCaption(req, res) {
        try {
            const { title, price, description, category } = req.body;
            if (!title) return res.status(400).json({ error: 'Product title is required' });
            const caption = await geminiService.generateFacebookCaption({ title, price, description, category });
            await logger.log('ai generate caption', { title });
            res.json({ success: true, caption });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // POST /api/ai/tags — generate product tags/hashtags
    async generateTags(req, res) {
        try {
            const { title, category, description } = req.body;
            if (!title) return res.status(400).json({ error: 'Product title is required' });
            const tags = await geminiService.generateTags({ title, category, description });
            await logger.log('ai generate tags', { title });
            res.json({ success: true, tags });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = aiController;
