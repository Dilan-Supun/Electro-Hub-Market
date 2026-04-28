const axios = require('axios');
require('dotenv').config();

const FB_GRAPH = 'https://graph.facebook.com/v19.0';

function getConfig() {
    return {
        pageId: process.env.FB_PAGE_ID,
        accessToken: process.env.FB_ACCESS_TOKEN,
        catalogId: process.env.FB_CATALOG_ID || null
    };
}

const facebookService = {
    // Post a product to the Facebook Page feed
    async postProductToPage(product, imageUrl) {
        const { pageId, accessToken } = getConfig();
        if (!pageId || !accessToken) throw new Error('Facebook credentials not configured in .env');

        const message = [
            `🛒 ${product.title}`,
            product.description ? `\n${product.description}` : '',
            product.price ? `\n💰 Price: Rs. ${parseFloat(product.price).toLocaleString()}` : '',
            product.tags && product.tags.length ? `\n${product.tags.map(t => `#${t.replace(/\s+/g, '')}`).join(' ')}` : '',
            `\n\n#ElectroHub #Electronics #ShopNow`
        ].filter(Boolean).join('');

        const params = { message, access_token: accessToken };
        if (imageUrl) params.link = imageUrl;

        const response = await axios.post(`${FB_GRAPH}/${pageId}/feed`, params);
        return { postId: response.data.id, success: true };
    },

    // Post with photo (uses /photos endpoint for image post)
    async postProductWithPhoto(product, absoluteImagePath, imageUrl) {
        const { pageId, accessToken } = getConfig();
        if (!pageId || !accessToken) throw new Error('Facebook credentials not configured in .env');

        const caption = [
            `🛒 ${product.title}`,
            product.description || '',
            product.price ? `💰 Rs. ${parseFloat(product.price).toLocaleString()}` : '',
            product.tags && product.tags.length ? product.tags.map(t => `#${t.replace(/\s+/g, '')}`).join(' ') : '',
            '#ElectroHub #Electronics'
        ].filter(Boolean).join('\n');

        // Use url-based photo post
        const response = await axios.post(`${FB_GRAPH}/${pageId}/photos`, {
            url: imageUrl,
            caption,
            access_token: accessToken
        });
        return { postId: response.data.id, success: true };
    },

    // Sync product to FB Catalog (Product Catalog API)
    async syncProductToCatalog(product, imageUrl) {
        const { catalogId, accessToken } = getConfig();
        if (!catalogId || !accessToken) throw new Error('FB_CATALOG_ID not configured in .env');

        const payload = {
            requests: [{
                method: 'UPDATE',
                retailer_id: product.id,
                data: {
                    name: product.title,
                    description: product.description || product.title,
                    price: `${Math.round(parseFloat(product.price || 0) * 100)} LKR`,
                    currency: 'LKR',
                    availability: product.deleted ? 'out of stock' : 'in stock',
                    condition: 'new',
                    image_url: imageUrl || '',
                    url: `${process.env.SHOP_URL || 'https://example.com'}/product.html?id=${product.id}`
                }
            }]
        };

        const response = await axios.post(
            `${FB_GRAPH}/${catalogId}/items_batch?access_token=${accessToken}`,
            payload
        );
        return { success: true, handles: response.data.handles };
    },

    // Bulk sync multiple products to FB Catalog
    async bulkSyncToCatalog(products, getImageUrl) {
        const results = [];
        for (const product of products) {
            try {
                const imageUrl = getImageUrl(product);
                const result = await facebookService.syncProductToCatalog(product, imageUrl);
                results.push({ id: product.id, ...result });
            } catch (err) {
                results.push({ id: product.id, success: false, error: err.message });
            }
        }
        return results;
    }
};

module.exports = facebookService;
