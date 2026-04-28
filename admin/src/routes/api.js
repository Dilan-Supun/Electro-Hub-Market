const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');

const productController = require('../controllers/productController');
const mediaController = require('../controllers/mediaController');
const importController = require('../controllers/importController');
const customerController = require('../controllers/customerController');
const orderController = require('../controllers/orderController');
const shippingController = require('../controllers/shippingController');
const documentController = require('../controllers/documentController');
const communicationsController = require('../controllers/communicationsController');
const db = require('../utils/db');
const sqlite = require('../utils/sqlite');
const logger = require('../utils/logger');
const facebookService = require('../services/facebookService');
const whatsappService = require('../services/whatsappService');
const geminiService = require('../services/geminiService');

const REPO_ROOT = path.resolve(path.join(__dirname, '../../..'));

const upload = multer({ dest: 'uploads/' });
const studioUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            const dir = path.join(__dirname, '../../../images/studio/temp');
            fs.ensureDirSync(dir);
            cb(null, dir);
        },
        filename: (req, file, cb) => {
            cb(null, `studio_${Date.now()}${path.extname(file.originalname)}`);
        }
    })
});
const logoUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            const dir = path.join(__dirname, '../../../data/logo');
            fs.ensureDirSync(dir);
            cb(null, dir);
        },
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname).toLowerCase();
            const allowed = ['.png', '.jpg', '.jpeg', '.webp', '.svg'];
            if (!allowed.includes(ext)) return cb(new Error('Unsupported image format'));
            cb(null, `logo${ext}`);
        }
    }),
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) return cb(new Error('Only image files are allowed'));
        cb(null, true);
    }
});

// Multer for product images (saved to temp, then moved by the route)
const productImageUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            const dir = path.join(__dirname, '../../../uploads/product-images');
            fs.ensureDirSync(dir);
            cb(null, dir);
        },
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname).toLowerCase();
            cb(null, `product_${Date.now()}${ext}`);
        }
    }),
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) return cb(new Error('Only image files are allowed'));
        cb(null, true);
    }
});

// Multer for shop logo
const shopImageUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            const dir = path.join(__dirname, '../../../data/shop');
            fs.ensureDirSync(dir);
            cb(null, dir);
        },
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname).toLowerCase();
            const allowed = ['.png', '.jpg', '.jpeg', '.webp', '.svg'];
            if (!allowed.includes(ext)) return cb(new Error('Unsupported image format'));
            cb(null, `shop-logo${ext}`);
        }
    }),
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) return cb(new Error('Only image files are allowed'));
        cb(null, true);
    }
});

// Auth Middleware (Disabled as requested)
const authenticate = (req, res, next) => {
    next();
};

// Auth
router.post('/login', (req, res) => {
    if (req.body.password === process.env.ADMIN_PASSWORD) res.json({ success: true });
    else res.status(401).json({ success: false });
});

// Products
router.get('/products', authenticate, productController.getProducts);
router.post('/products', authenticate, productController.saveProduct);
router.delete('/products/:id', authenticate, productController.softDelete);
router.post('/products/:id/restore', authenticate, productController.restore);
router.get('/stats', authenticate, productController.getStats);

// Media & AI
router.get('/media', authenticate, mediaController.getMedia);
router.post('/media/upload-studio', authenticate, studioUpload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    res.json({ success: true, imagePath: `images/studio/temp/${req.file.filename}` });
});
router.post('/media/enhance', authenticate, mediaController.enhanceImage);
router.post('/media/finalize', authenticate, mediaController.finalizeImage);
router.post('/media/watermark', authenticate, mediaController.watermarkDirect);
router.post('/media/upload-logo', authenticate, logoUpload.single('logo'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No logo image uploaded' });
    const logoRelPath = `data/logo/${req.file.filename}`;
    // Persist the logo path in settings
    const settings = await db.getSettings();
    settings.watermarkLogoPath = logoRelPath;
    await db.write('settings', settings);
    await logger.log('upload watermark logo', { path: logoRelPath });
    res.json({ success: true, logoPath: logoRelPath });
});

// Import
router.post('/import/preview', authenticate, upload.single('file'), importController.validateAndPreview);
router.post('/import/commit', authenticate, importController.commitImport);

// Customers
router.get('/customers', authenticate, customerController.getAll);
router.post('/customers', authenticate, customerController.save);
router.delete('/customers/:id', authenticate, customerController.remove);

// Orders
router.get('/orders', authenticate, orderController.getAll);
router.post('/orders', authenticate, orderController.create);
router.patch('/orders/:id/status', authenticate, orderController.updateStatus);
router.delete('/orders/:id', authenticate, orderController.remove);

// Shipping
router.get('/shipping', authenticate, shippingController.getAll);
router.get('/shipping/:orderId', authenticate, shippingController.getByOrder);
router.post('/shipping/:orderId', authenticate, shippingController.upsert);
router.delete('/shipping/:orderId', authenticate, shippingController.remove);

// Documents (printable HTML — no auth header required so they open directly in browser tabs)
router.get('/documents/invoice/:id', documentController.invoice);
router.get('/documents/label/:id', documentController.packingLabel);

// Logs
router.get('/logs', authenticate, async (req, res) => {
    res.json(await db.read('logs'));
});

// Communications
router.get('/communications/status', authenticate, communicationsController.getStatus);

// Settings
router.get('/settings', authenticate, async (req, res) => {
    res.json(await db.getSettings());
});
router.post('/settings', authenticate, async (req, res) => {
    await db.write('settings', req.body);
    await logger.log('update settings');
    res.json({ success: true });
});

// Product Image Upload
router.post('/products/:id/upload-image', authenticate, productImageUpload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    const productId = req.params.id;
    try {
        const ext = path.extname(req.file.filename);
        const destDir = path.join(REPO_ROOT, 'images', 'products', productId, 'original');
        await fs.ensureDir(destDir);
        const destFilename = `product_${Date.now()}${ext}`;
        const destPath = path.join(destDir, destFilename);
        await fs.move(req.file.path, destPath, { overwrite: true });
        const relPath = `images/products/${productId}/original/${destFilename}`;
        await logger.log('upload product image', { productId, path: relPath });
        res.json({ success: true, imagePath: relPath });
    } catch (err) {
        // Clean up temp file on error
        await fs.remove(req.file.path).catch(() => {});
        res.status(500).json({ error: err.message });
    }
});

// Shop Logo Upload
router.post('/settings/upload-shop-image', authenticate, shopImageUpload.single('shopImage'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    const relPath = `data/shop/${req.file.filename}`;
    const settings = await db.getSettings();
    settings.shopLogoPath = relPath;
    await db.write('settings', settings);
    await logger.log('upload shop logo', { path: relPath });
    res.json({ success: true, shopLogoPath: relPath });
});

// ── Facebook Integration ──────────────────────────────────────────

// Post a single product to Facebook Page feed
router.post('/facebook/post-product/:id', authenticate, async (req, res) => {
    try {
        const product = await sqlite.getProductById(req.params.id);
        if (!product || product.isDeleted) return res.status(404).json({ error: 'Product not found' });

        const settings = await db.getSettings();
        const baseUrl = settings.shopUrl || process.env.SHOP_URL || '';
        const imageUrl = product.image ? `${baseUrl}/${product.image}` : '';
        const usePhoto = req.body.usePhoto && imageUrl;

        const result = usePhoto
            ? await facebookService.postProductWithPhoto(product, imageUrl, settings)
            : await facebookService.postProductToPage(product, imageUrl, settings);

        await logger.log('facebook post product', { productId: product.id, postId: result.postId });
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Sync a single product to FB Catalog
router.post('/facebook/sync-catalog/:id', authenticate, async (req, res) => {
    try {
        const product = await sqlite.getProductById(req.params.id);
        if (!product) return res.status(404).json({ error: 'Product not found' });

        const settings = await db.getSettings();
        const baseUrl = settings.shopUrl || process.env.SHOP_URL || '';
        const imageUrl = product.image ? `${baseUrl}/${product.image}` : '';

        const result = await facebookService.syncProductToCatalog(product, imageUrl, settings);
        await logger.log('facebook sync catalog', { productId: product.id });
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Bulk sync all products to FB Catalog
router.post('/facebook/bulk-sync', authenticate, async (req, res) => {
    try {
        const products = await sqlite.getAllProducts();
        const settings = await db.getSettings();
        const baseUrl = settings.shopUrl || process.env.SHOP_URL || '';
        const results = await facebookService.bulkSyncToCatalog(
            products,
            p => p.image ? `${baseUrl}/${p.image}` : '',
            settings
        );
        await logger.log('facebook bulk sync', { count: products.length });
        res.json({ success: true, results });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── WhatsApp Integration ──────────────────────────────────────────

// Send an order status notification to the customer via WhatsApp
router.post('/whatsapp/notify/:orderId', authenticate, async (req, res) => {
    try {
        const order = await sqlite.getOrderById(req.params.orderId);
        if (!order) return res.status(404).json({ error: 'Order not found' });

        const customer = await sqlite.getCustomerById(order.customerId);
        if (!customer) return res.status(404).json({ error: 'Customer not found' });
        if (!customer.phone) return res.status(400).json({ error: 'Customer has no phone number' });

        const settings = await db.getSettings();
        const { type, trackingInfo } = req.body;
        let result;

        if (type === 'shipped') {
            result = await whatsappService.sendShippingNotification(order, customer, trackingInfo || {}, settings);
        } else if (type === 'delivered') {
            result = await whatsappService.sendDeliveryConfirmation(order, customer, settings);
        } else {
            result = await whatsappService.sendOrderConfirmation(order, customer, settings);
        }

        await logger.log('whatsapp notify', { orderId: order.id, customerId: customer.id, type: type || 'confirmation' });
        res.json({ success: true, result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Send a test WhatsApp message
router.post('/whatsapp/test', authenticate, async (req, res) => {
    try {
        const { phone } = req.body;
        const testPhone = phone || process.env.WA_TEST_RECIPIENT;
        if (!testPhone) return res.status(400).json({ error: 'Test phone number not provided and WA_TEST_RECIPIENT not in .env' });

        const result = await whatsappService.sendText(testPhone, 'Hello from Electro Hub! This is a test message from your Admin Panel. ⚡');
        await logger.log('whatsapp test', { phone: testPhone });
        res.json({ success: true, result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Gemini AI Text Generation ─────────────────────────────────────

router.post('/ai/generate-text', authenticate, async (req, res) => {
    try {
        const { type, productId, customPrompt } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        let result;
        if (customPrompt) {
            // If a specific prompt is provided, use it directly
            result = await geminiService.generateText(customPrompt, apiKey);
        } else if (type === 'description' || type === 'fb-caption' || type === 'hashtags') {
            if (!productId) return res.status(400).json({ error: 'productId is required for product text generation' });
            
            const product = await sqlite.getProductById(productId);
            if (!product) return res.status(404).json({ error: 'Product not found' });

            if (type === 'description') {
                result = await geminiService.generateProductDescription(product, apiKey);
            } else if (type === 'fb-caption') {
                result = await geminiService.generateFBCaption(product, apiKey);
            } else {
                result = await geminiService.generateHashtags(product, apiKey);
            }
        } else {
            return res.status(400).json({ error: 'Provide type or customPrompt' });
        }

        await logger.log('ai generate text', { type, productId });
        res.json({ success: true, result });
    } catch (err) {
        console.error('AI Route Error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
