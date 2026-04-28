const geminiService = require('../services/geminiService');
const imageService = require('../services/imageService');
const db = require('../utils/db');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs-extra');

// Root of the repository (three levels up from this file)
const REPO_ROOT = path.resolve(path.join(__dirname, '../../..'));
// Only logos stored inside data/logo/ are allowed
const LOGO_DIR = path.join(REPO_ROOT, 'data', 'logo');
// Images must stay within the images/ subtree
const IMAGES_DIR = path.join(REPO_ROOT, 'images');

/**
 * Resolve and validate a stored logo path so it cannot escape the logo directory.
 * Returns the absolute path when valid, or null otherwise.
 */
async function resolveLogoPath(relPath) {
    if (!relPath) return null;
    const resolved = path.resolve(path.join(REPO_ROOT, relPath));
    const logoDir = LOGO_DIR + path.sep;
    if (!resolved.startsWith(logoDir) && resolved !== LOGO_DIR) return null;
    return (await fs.pathExists(resolved)) ? resolved : null;
}

/**
 * Resolve a user-supplied image path and validate it stays within images/.
 * Returns the absolute path when valid, or null otherwise.
 */
function resolveImagePath(relPath) {
    if (!relPath || typeof relPath !== 'string') return null;
    const resolved = path.resolve(path.join(REPO_ROOT, relPath));
    const imagesDir = IMAGES_DIR + path.sep;
    if (!resolved.startsWith(imagesDir) && resolved !== IMAGES_DIR) return null;
    return resolved;
}

const mediaController = {
    async enhanceImage(req, res) {
        try {
            const { productId, imagePath, customPrompt } = req.body;
            const settings = await db.getSettings();

            const fullPath = resolveImagePath(imagePath);
            if (!fullPath || !(await fs.pathExists(fullPath))) {
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

            const fullPath = resolveImagePath(imagePath);
            if (!fullPath || !(await fs.pathExists(fullPath))) {
                return res.status(404).json({ error: 'Source image not found' });
            }
            const buffer = await fs.readFile(fullPath);

            // Resolve logo path if configured
            const logoPath = await resolveLogoPath(settings.watermarkLogoPath);

            const finalBuffer = await imageService.applyWatermark(buffer, {
                text: settings.watermarkText,
                position: settings.watermarkPosition,
                opacity: settings.watermarkOpacity,
                size: settings.watermarkSize,
                logoPath
            });

            const filename = `final_${Date.now()}.jpg`;
            const savedUrl = await imageService.saveImage(productId, 'final', finalBuffer, filename);
            
            await logger.log('save final AI image', { productId, watermarked: true });
            res.json({ success: true, imageUrl: savedUrl });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async watermarkDirect(req, res) {
        try {
            const { productId, imagePath } = req.body;
            if (!imagePath) return res.status(400).json({ error: 'imagePath is required' });

            const settings = await db.getSettings();
            const fullPath = resolveImagePath(imagePath);
            if (!fullPath || !(await fs.pathExists(fullPath))) {
                return res.status(404).json({ error: 'Source image not found' });
            }

            const buffer = await fs.readFile(fullPath);

            // Resolve logo path if configured
            const logoPath = await resolveLogoPath(settings.watermarkLogoPath);

            const finalBuffer = await imageService.applyWatermark(buffer, {
                text: settings.watermarkText || 'Electro Hub',
                position: settings.watermarkPosition || 'bottom-right',
                opacity: settings.watermarkOpacity !== undefined ? settings.watermarkOpacity : 0.5,
                size: settings.watermarkSize,
                logoPath
            });

            const filename = `watermarked_${Date.now()}.jpg`;
            const savedUrl = await imageService.saveImage(productId || 'studio', 'final', finalBuffer, filename);

            await logger.log('apply watermark', { productId, source: imagePath });
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
