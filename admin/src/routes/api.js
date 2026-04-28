const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');

const productController = require('../controllers/productController');
const mediaController = require('../controllers/mediaController');
const importController = require('../controllers/importController');
const db = require('../utils/db');
const logger = require('../utils/logger');

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
            // Always overwrite as "logo.<ext>" so there is only one active logo
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

// Logs
router.get('/logs', authenticate, async (req, res) => {
    res.json(await db.read('logs'));
});

// Settings
router.get('/settings', authenticate, async (req, res) => {
    res.json(await db.getSettings());
});
router.post('/settings', authenticate, async (req, res) => {
    await db.write('settings', req.body);
    await logger.log('update settings');
    res.json({ success: true });
});

module.exports = router;
