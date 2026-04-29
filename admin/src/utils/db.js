const fs = require('fs-extra');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../../data');

const db = {
    async read(file) {
        const filePath = path.join(DATA_DIR, `${file}.json`);
        if (!(await fs.pathExists(filePath))) {
            return [];
        }
        const data = await fs.readJson(filePath);
        return data;
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
                watermarkUseText: true,
                watermarkUseLogo: false,
                shopName: 'Electro Hub Market',
                shopAddress: 'No. 95A/1, Hallambage Watta, Palatuwa, Matara',
                shopPhone: '076 441 3256',
                shopPhone2: '071 396 7483',
                shopEmail: 'electrohub@example.com',
                shopWebsite: 'www.electrohub.lk',
                shopMotto: 'Sri Lanka · Fast delivery available',
                shopSlogan: 'Quality electronics, great prices.',
                shopLogoPath: null,
                geminiPrompt: 'Remove the background, keep the product shape and branding accurate, improve lighting, reduce shadows, center the product, and place it on a clean white studio background for e-commerce use.'
            };
        }
        return settings;
    }
};

module.exports = db;
