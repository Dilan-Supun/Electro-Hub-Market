const facebookService = require('../services/facebookService');
const db = require('../utils/db');
const logger = require('../utils/logger');

function getProductImageUrl(product) {
    const settings_shopUrl = process.env.SHOP_URL || 'http://localhost:3000';
    if (product.images && product.images.length > 0) {
        const img = product.images[0];
        return `${settings_shopUrl}/${img}`;
    }
    return null;
}

const facebookController = {
    // POST /api/facebook/post/:productId — Post single product to FB Page
    async postProduct(req, res) {
        try {
            const { productId } = req.params;
            const products = await db.read('products');
            const product = products.find(p => p.id === productId);
            if (!product) return res.status(404).json({ error: 'Product not found' });

            const imageUrl = getProductImageUrl(product);
            const result = await facebookService.postProductWithPhoto(product, null, imageUrl);
            await logger.log('facebook post product', { productId, postId: result.postId });
            res.json({ success: true, postId: result.postId });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // POST /api/facebook/catalog/:productId — Sync single product to FB Catalog
    async syncProduct(req, res) {
        try {
            const { productId } = req.params;
            const products = await db.read('products');
            const product = products.find(p => p.id === productId);
            if (!product) return res.status(404).json({ error: 'Product not found' });

            const imageUrl = getProductImageUrl(product);
            const result = await facebookService.syncProductToCatalog(product, imageUrl);
            await logger.log('facebook catalog sync', { productId });
            res.json({ success: true, ...result });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // POST /api/facebook/catalog/bulk — Sync all active products to FB Catalog
    async bulkSync(req, res) {
        try {
            const products = await db.read('products');
            const active = products.filter(p => !p.deleted);
            const results = await facebookService.bulkSyncToCatalog(active, getProductImageUrl);
            await logger.log('facebook catalog bulk sync', { count: active.length });
            res.json({ success: true, results });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = facebookController;
