const csv = require('csv-parser');
const fs = require('fs-extra');
const db = require('../utils/db');
const logger = require('../utils/logger');

const importController = {
    async validateAndPreview(req, res) {
        if (!req.file) return res.status(400).json({ error: 'No CSV file uploaded' });

        const preview = [];
        const errors = [];
        const existing = await db.read('products');
        const existingIds = new Set(existing.map(p => p.id));
        const categories = ['drone', 'audio', 'modules', 'accessories'];
        const csvIds = new Set();
        
        let rowNum = 1; // Header is row 1

        fs.createReadStream(req.file.path)
            .pipe(csv())
            .on('data', (row) => {
                rowNum++;
                const item = { ...row };
                let isValid = true;
                let error = '';

                // Strict Validation logic
                if (!item.id || !item.title) {
                    isValid = false;
                    error = 'Missing required fields (ID or Title)';
                } else if (csvIds.has(item.id)) {
                    isValid = false;
                    error = 'Duplicate ID within CSV';
                } else if (isNaN(parseFloat(item.price)) || parseFloat(item.price) < 0) {
                    isValid = false;
                    error = 'Invalid or negative Price';
                } else if (isNaN(parseInt(item.stock)) || parseInt(item.stock) < 0) {
                    isValid = false;
                    error = 'Invalid or negative Stock';
                } else if (item.category && !categories.includes(item.category.toLowerCase())) {
                    isValid = false;
                    error = `Unauthorized Category: ${item.category}`;
                }

                if (isValid) {
                    csvIds.add(item.id);
                    item.isValid = true;
                    item.isUpdate = existingIds.has(item.id);
                } else {
                    item.isValid = false;
                    item.error = error;
                    errors.push({ row: rowNum, reason: error });
                }
                
                preview.push(item);
            })
            .on('end', async () => {
                const importId = `import_${Date.now()}`;
                const validItems = preview.filter(p => p.isValid);
                
                // Store temporarily for commitment
                await db.write(`temp_${importId}`, validItems);

                res.json({
                    success: true,
                    importId,
                    preview: preview.slice(0, 50), // Show first 50 rows
                    validCount: validItems.length,
                    errors,
                    summary: {
                        total: preview.length,
                        valid: validItems.length,
                        updates: validItems.filter(p => p.isUpdate).length,
                        new: validItems.filter(p => !p.isUpdate).length
                    }
                });
                fs.remove(req.file.path);
            });
    },

    async commitImport(req, res) {
        try {
            const { importId } = req.body;
            const items = await db.read(`temp_${importId}`);
            if (!items || items.length === 0) return res.status(400).json({ error: 'Import data expired or not found' });

            const products = await db.read('products');
            let inserted = 0;
            let updated = 0;

            items.forEach(item => {
                const idx = products.findIndex(p => p.id === item.id);
                const cleanItem = {
                    id: item.id,
                    title: item.title,
                    price: parseFloat(item.price),
                    stock: parseInt(item.stock),
                    category: item.category.toLowerCase(),
                    description: item.description || '',
                    updatedAt: new Date().toISOString()
                };

                if (idx !== -1) {
                    products[idx] = { ...products[idx], ...cleanItem };
                    updated++;
                } else {
                    cleanItem.isDeleted = false;
                    cleanItem.createdAt = new Date().toISOString();
                    products.push(cleanItem);
                    inserted++;
                }
            });

            await db.write('products', products);
            await logger.log('import products', { inserted, updated });
            
            // Cleanup temp file
            const tempPath = path.join(__dirname, `../../../data/temp_${importId}.json`);
            await fs.remove(tempPath);

            res.json({ success: true, summary: { inserted, updated } });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = importController;
