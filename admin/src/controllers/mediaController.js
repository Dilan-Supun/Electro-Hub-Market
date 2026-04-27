const geminiService = require('../services/geminiService');
const imageService = require('../services/imageService');
const db = require('../utils/db');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs-extra');

const mediaController = {
    async enhanceImage(req, res) {
        try {
            const { productId, imagePath, customPrompt } = req.body;
            const settings = await db.getSettings();
            
            const fullPath = path.join(__dirname, '../../../', imagePath);
            if (!(await fs.pathExists(fullPath))) {
                return res.status(404).json({ error: 'Source image not found' });
            }

            // Use custom prompt if provided, otherwise fallback to business default
            const prompt = customPrompt || settings.geminiPrompt;
            const enhancedBuffer = await geminiService.enhanceImage(fullPath, prompt);
            
            const filename = `enhanced_${Date.now()}.jpg`;
            const savedUrl = await imageService.saveImage(productId, 'generated', enhancedBuffer, filename);
            
            await logger.log('generate ai image', { productId, source: imagePath, custom: !!customPrompt });
            res.json({ success: true, imageUrl: savedUrl });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async finalizeImage(req, res) {
        try {
            const { productId, imagePath } = req.body;
            const settings = await db.getSettings();
            
            const fullPath = path.join(__dirname, '../../../', imagePath);
            const buffer = await fs.readFile(fullPath);
            
            const finalBuffer = await imageService.applyWatermark(buffer, {
                text: settings.watermarkText,
                position: settings.watermarkPosition,
                opacity: settings.watermarkOpacity,
                size: settings.watermarkSize
            });

            const filename = `final_${Date.now()}.jpg`;
            const savedUrl = await imageService.saveImage(productId, 'final', finalBuffer, filename);
            
            await logger.log('save final AI image', { productId, watermarked: true });
            res.json({ success: true, imageUrl: savedUrl });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async getMedia(req, res) {
        try {
            const { productId } = req.query;
            const media = await db.read('media');
            const filtered = productId ? media.filter(m => m.product_id === productId) : media;
            res.json(filtered);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = mediaController;
