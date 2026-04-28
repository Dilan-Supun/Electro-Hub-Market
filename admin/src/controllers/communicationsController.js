const db = require('../utils/db');

const communicationsController = {
    async getStatus(req, res) {
        try {
            const status = {
                facebook: !!(process.env.FB_PAGE_ID && process.env.FB_ACCESS_TOKEN),
                whatsapp: !!(process.env.WA_PHONE_NUMBER_ID && process.env.WA_ACCESS_TOKEN && process.env.WA_TEST_RECIPIENT),
                whatsappTestRecipient: process.env.WA_TEST_RECIPIENT || '',
                gemini: !!process.env.GEMINI_API_KEY
            };
            res.json(status);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = communicationsController;
