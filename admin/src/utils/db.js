const fs = require('fs-extra');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../../data');

const db = {
    async read(file) {
        const filePath = path.join(DATA_DIR, `${file}.json`);
        if (!(await fs.pathExists(filePath))) {
            return [];
        }
        return fs.readJson(filePath);
    },
    async write(file, data) {
        const filePath = path.join(DATA_DIR, `${file}.json`);
        await fs.ensureDir(DATA_DIR);
        return fs.writeJson(filePath, data, { spaces: 2 });
    },
    async getSettings() {
        const settings = await this.read('settings');
        if (Array.isArray(settings) && settings.length === 0) {
            return {
                watermarkText: 'Electro Hub',
                watermarkOpacity: 0.5,
                watermarkSize: 24,
                watermarkPosition: 'bottom-right',
                watermarkLogoPath: null,
                geminiPrompt: 'Remove the background, keep the product shape and branding accurate, improve lighting, reduce shadows, center the product, and place it on a clean white studio background for e-commerce use.'
            };
        }
        return settings;
    }
};

module.exports = db;
