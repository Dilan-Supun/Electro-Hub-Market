const db = require('../utils/db');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs-extra');

const productController = {
    async getProducts(req, res) {
        try {
            const products = await db.read('products');
            const showDeleted = req.query.deleted === 'true';
            
            const filtered = products.filter(p => showDeleted ? p.isDeleted : !p.isDeleted);
            res.json(filtered);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async saveProduct(req, res) {
        try {
            const products = await db.read('products');
            const newProduct = req.body;
            
            const idx = products.findIndex(p => p.id === newProduct.id);
            if (idx !== -1) {
                products[idx] = { ...products[idx], ...newProduct, updatedAt: new Date().toISOString() };
                await logger.log('edit product', { id: newProduct.id, title: newProduct.title });
            } else {
                newProduct.createdAt = new Date().toISOString();
                newProduct.isDeleted = false;
                products.push(newProduct);
                await logger.log('add product', { id: newProduct.id, title: newProduct.title });
            }
            
            await db.write('products', products);
            await this.syncToLive(products);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async softDelete(req, res) {
        try {
            const { id } = req.params;
            const products = await db.read('products');
            const p = products.find(p => p.id === id);
            if (p) {
                p.isDeleted = true;
                p.deletedAt = new Date().toISOString();
                await db.write('products', products);
                await this.syncToLive(products);
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
            const products = await db.read('products');
            const p = products.find(p => p.id === id);
            if (p) {
                p.isDeleted = false;
                delete p.deletedAt;
                await db.write('products', products);
                await this.syncToLive(products);
                await logger.log('restore product', { id });
                res.json({ success: true });
            } else {
                res.status(404).json({ error: 'Product not found' });
            }
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
            const allProducts = await db.read('products');
            const products = allProducts.filter(p => p.isDeleted !== true);
            
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
    }
};

module.exports = productController;
