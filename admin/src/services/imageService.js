const Jimp = require('jimp');
const path = require('path');
const fs = require('fs-extra');
const db = require('../utils/db');

const PRODUCTS_DIR = path.join(__dirname, '../../../images/products');

const imageService = {
    async initProductFolders(productId) {
        const productDir = path.join(PRODUCTS_DIR, productId);
        const subdirs = ['original', 'imported', 'generated', 'final'];
        for (const sub of subdirs) {
            await fs.ensureDir(path.join(productDir, sub));
        }
        return productDir;
    },

    async saveImage(productId, type, buffer, filename) {
        await this.initProductFolders(productId);
        const filePath = path.join(PRODUCTS_DIR, productId, type, filename);
        await fs.writeFile(filePath, buffer);
        
        // Register in media metadata
        const media = await db.read('media');
        media.push({
            product_id: productId,
            file_type: path.extname(filename).slice(1),
            source_type: type === 'generated' ? 'ai_generated' : type,
            original_filename: filename,
            stored_filename: filename,
            image_url: `images/products/${productId}/${type}/${filename}`,
            created_at: new Date().toISOString()
        });
        await db.write('media', media);
        
        return `images/products/${productId}/${type}/${filename}`;
    },

    async applyWatermark(inputBuffer, config) {
        const { text, position, opacity, size } = config;
        
        const image = await Jimp.read(inputBuffer);
        const font = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE); // Built-in white font

        const watermark = new Jimp(image.getWidth(), image.getHeight());
        watermark.print(font, 0, 0, {
            text: text,
            alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
            alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
        }, image.getWidth(), image.getHeight());

        watermark.opacity(opacity);

        // Position logic
        let x = 0, y = 0;
        if (position === 'bottom-right') {
            x = image.getWidth() * 0.35;
            y = image.getHeight() * 0.4;
        } else if (position === 'bottom-center') {
            x = 0;
            y = image.getHeight() * 0.4;
        } else if (position === 'center') {
            x = 0;
            y = 0;
        }

        return image
            .composite(watermark, x, y)
            .getBufferAsync(Jimp.MIME_JPEG);
    }
};

module.exports = imageService;
