require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const { exec } = require('child_process');
const apiRoutes = require('./src/routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve Static Files
app.use('/admin', express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, '../images')));
app.use('/', express.static(path.join(__dirname, '..')));

// API Routes
app.use('/api', apiRoutes);

// Special Route: Publish to GitHub (Kept for simplicity)
app.post('/api/publish', (req, res) => {
    const cwd = path.join(__dirname, '..');
    exec('git add . && git commit -m "Admin: Update products" && git push', { cwd }, (error, stdout, stderr) => {
        if (error && !stdout.includes('nothing to commit')) {
            return res.status(500).json({ error: 'Publish failed' });
        }
        res.json({ success: true, message: 'Published to GitHub' });
    });
});

app.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`🚀 Modular Admin Server running at http://localhost:${PORT}`);
    console.log(`========================================\n`);
});
