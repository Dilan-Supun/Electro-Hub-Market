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
        const { text, position, opacity, logoPath, useText, useLogo } = config;

        let image = await Jimp.read(inputBuffer);
        const imgW = image.getWidth();
        const imgH = image.getHeight();
        const margin = Math.round(Math.min(imgW, imgH) * 0.03); // 3% margin
        const safeOpacity = Math.min(Math.max(opacity || 0.5, 0.1), 1);

        // --- Image / logo overlay ---
        if (useLogo && logoPath && (await fs.pathExists(logoPath))) {
            const logo = await Jimp.read(logoPath);
            const logoW = Math.round(imgW * 0.22); // 22% of image width
            logo.resize(logoW, Jimp.AUTO);
            logo.opacity(safeOpacity);

            let x = margin;
            let y = imgH - logo.getHeight() - margin;

            if (position === 'bottom-right') {
                x = imgW - logo.getWidth() - margin;
                y = imgH - logo.getHeight() - margin;
            } else if (position === 'bottom-center') {
                x = Math.round((imgW - logo.getWidth()) / 2);
                y = imgH - logo.getHeight() - margin;
            } else if (position === 'center') {
                x = Math.round((imgW - logo.getWidth()) / 2);
                y = Math.round((imgH - logo.getHeight()) / 2);
            }

            image = image.composite(logo, x, y, {
                mode: Jimp.BLEND_SOURCE_OVER,
                opacitySource: safeOpacity,
                opacityDest: 1
            });
        }

        // --- Text watermark ---
        if (useText !== false) {
            const font = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
            const overlay = new Jimp(imgW, imgH, 0x00000000);

            let alignX = Jimp.HORIZONTAL_ALIGN_CENTER;
            let alignY = Jimp.VERTICAL_ALIGN_BOTTOM;
            let printX = 0;
            let printY = 0;
            let printW = imgW;
            let printH = imgH - margin;

            if (position === 'bottom-right') {
                alignX = Jimp.HORIZONTAL_ALIGN_RIGHT;
                printX = -margin;
            } else if (position === 'bottom-center') {
                alignX = Jimp.HORIZONTAL_ALIGN_CENTER;
            } else if (position === 'center') {
                alignY = Jimp.VERTICAL_ALIGN_MIDDLE;
                printH = imgH;
            }

            overlay.print(font, printX, printY, {
                text: text || 'Electro Hub',
                alignmentX: alignX,
                alignmentY: alignY
            }, printW, printH);

            overlay.opacity(safeOpacity);
            image = image.composite(overlay, 0, 0);
        }

        return image.getBufferAsync(Jimp.MIME_JPEG);
    }
};

module.exports = imageService;
