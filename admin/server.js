require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { exec } = require('child_process');

const app = express();
const PORT = 3000;

// Path to products.json
const productsFilePath = path.join(__dirname, '../js/products.json');

app.use(cors());
app.use(express.json());
// Serve static admin files
app.use(express.static(path.join(__dirname, 'public')));
// Serve main project images so admin panel can preview them
app.use('/images', express.static(path.join(__dirname, '../images')));

// Authentication middleware
const authenticate = (req, res, next) => {
    const password = req.headers['authorization'];
    if (password === process.env.ADMIN_PASSWORD) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized. Incorrect password.' });
    }
};

// Configure Multer for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../images/products');
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        // Create a unique filename
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext).replace(/[^a-z0-9]/gi, '_').toLowerCase();
        cb(null, `${name}_${Date.now()}${ext}`);
    }
});
const upload = multer({ storage: storage });

// API: Verify login
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === process.env.ADMIN_PASSWORD) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, error: 'Incorrect password' });
    }
});

// API: Get products
app.get('/api/products', authenticate, (req, res) => {
    try {
        if (!fs.existsSync(productsFilePath)) {
            return res.json([]);
        }
        const data = fs.readFileSync(productsFilePath, 'utf8');
        res.json(JSON.parse(data));
    } catch (err) {
        res.status(500).json({ error: 'Error reading products' });
    }
});

// API: Save products
app.post('/api/products', authenticate, (req, res) => {
    try {
        const products = req.body;
        fs.writeFileSync(productsFilePath, JSON.stringify(products, null, 2));
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error saving products' });
    }
});

// API: Upload image
app.post('/api/upload', authenticate, upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No image uploaded' });
    }
    // Return the relative path to be stored in products.json
    res.json({ imageUrl: `images/products/${req.file.filename}` });
});

// API: Publish to GitHub
app.post('/api/publish', authenticate, (req, res) => {
    const cwd = path.join(__dirname, '..');
    exec('git add . && git commit -m "Admin: Update products" && git push', { cwd }, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            // Sometimes git commit fails if there are no changes, treat it as okay
            if (stdout.includes('nothing to commit')) {
                return res.json({ success: true, message: 'Nothing new to commit.' });
            }
            return res.status(500).json({ error: 'Publish failed. Check console.' });
        }
        res.json({ success: true, message: 'Successfully published to GitHub!' });
    });
});

app.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`🚀 Admin panel running at http://localhost:${PORT}`);
    console.log(`========================================\n`);
});
