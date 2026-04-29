const db = require('../utils/db');
const sqlite = require('../utils/sqlite');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs-extra');

const productController = {
    async getProducts(req, res) {
        try {
            // Check for migration from JSON on first hit
            const jsonProducts = await db.read('products');
            if (jsonProducts && jsonProducts.length > 0) {
                const result = await sqlite.migrateFromJson(jsonProducts);
                // Only clear if we successfully migrated something and had no errors
                if (result && result.migrated > 0 && result.errors === 0) {
                    await db.write('products', []); 
                }
            }

            const products = await sqlite.getAllProducts();
            const showDeleted = req.query.deleted === 'true';
            
            // Note: sqlite.getAllProducts already filters isDeleted=0, 
            // so we might need a separate method for deleted ones if needed.
            // For now, let's just return what getAllProducts gives (active ones).
            res.json(products);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async saveProduct(req, res) {
        try {
            const productData = req.body;
            if (!productData.id) {
                return res.status(400).json({ error: 'Product ID is required' });
            }

            const existing = await sqlite.getProductById(productData.id);
            if (existing) {
                await sqlite.upsertProduct(productData);
                await logger.log('edit product', { id: productData.id, title: productData.title });
            } else {
                productData.isDeleted = false;
                await sqlite.upsertProduct(productData);
                await logger.log('add product', { id: productData.id, title: productData.title });
            }
            
            const allProducts = await sqlite.getAllProducts();
            await productController.syncToLive(allProducts);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async softDelete(req, res) {
        try {
            const { id } = req.params;
            const p = await sqlite.getProductById(id);
            if (p) {
                await sqlite.deleteProduct(id);
                const allProducts = await sqlite.getAllProducts();
                await productController.syncToLive(allProducts);
                await logger.log('delete product', { id });
                res.json({ success: true });
            } else {
                res.status(404).json({ error: 'Product not found' });
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async restore(req, res) {
        try {
            const { id } = req.params;
            const db = await sqlite.getDb(); // Direct access for restore if needed, or add method to sqlite.js
            db.run('UPDATE products SET isDeleted = 0 WHERE id = ?', [id]);
            await sqlite.saveDb();

            const allProducts = await sqlite.getAllProducts();
            await productController.syncToLive(allProducts);
            await logger.log('restore product', { id });
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async syncToLive(products) {
        const liveProducts = products.filter(p => !p.isDeleted);
        const jsFilePath = path.join(__dirname, '../../../js/products-data.js');
        const jsContent = `const productsData = ${JSON.stringify(liveProducts, null, 2)};\n`;
        await fs.writeFile(jsFilePath, jsContent);
        
        // Also update the products.json in js folder for legacy support
        const legacyJsonPath = path.join(__dirname, '../../../js/products.json');
        await fs.writeJson(legacyJsonPath, liveProducts, { spaces: 2 });
    },

    async getStats(req, res) {
        try {
            const products = await sqlite.getAllProducts();
            
            const totalProducts = products.length;
            const totalStock = products.reduce((sum, p) => sum + (parseInt(p.stock) || 0), 0);
            
            // BI Calculations
            const lowStock = products.filter(p => {
                const s = parseInt(p.stock);
                return isNaN(s) || s < 5;
            });
            
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const deadStock = products.filter(p => {
                const s = parseInt(p.stock) || 0;
                const isOld = !p.updatedAt || new Date(p.updatedAt) < thirtyDaysAgo;
                return s > 10 && isOld;
            });

            res.json({
                totalProducts,
                totalStock,
                lowStockCount: lowStock.length,
                deadStockCount: deadStock.length,
                lowStockItems: lowStock.map(p => ({ id: p.id, title: p.title, stock: p.stock })),
                deadStockItems: deadStock.map(p => ({ id: p.id, title: p.title, stock: p.stock }))
            });
        } catch (error) {
            console.error('Stats Error:', error);
            res.status(500).json({ error: error.message });
        }
    },

    async generatePublicStats() {
        try {
            const products = await sqlite.getAllProducts();
            const stats = {
                totalProducts: products.length,
                categories: [...new Set(products.map(p => p.category))].length,
                lastUpdated: new Date().toISOString()
            };
            const filePath = path.join(__dirname, '../../../js/stats-data.js');
            const content = `const statsData = ${JSON.stringify(stats, null, 2)};\n`;
            await fs.writeFile(filePath, content);
        } catch (error) {
        }
    },

    async syncSettingsToLive() {
        try {
            const settings = await db.getSettings();
            const liveSettings = {
                shopName: settings.shopName || 'Electro Hub Market',
                shopMotto: settings.shopMotto || 'Sri Lanka · Fast delivery available',
                shopSlogan: settings.shopSlogan || 'Quality electronics, great prices.',
                shopPhone: settings.shopPhone || '076 441 3256',
                shopPhone2: settings.shopPhone2 || '071 396 7483',
                shopEmail: settings.shopEmail || 'electrohub@example.com',
                shopAddress: settings.shopAddress || 'No. 95A/1, Hallambage Watta, Palatuwa, Matara',
                shopWebsite: settings.shopWebsite || 'www.electrohub.lk',
                shopLogoPath: settings.shopLogoPath || null
            };
            const filePath = path.join(__dirname, '../../../js/settings-data.js');
            const content = `const shopSettings = ${JSON.stringify(liveSettings, null, 2)};\n`;
            await fs.writeFile(filePath, content);
        } catch (error) {
            console.error('Error syncing settings to live:', error);
        }
    }
};

module.exports = productController;
