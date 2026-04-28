const axios = require('axios');
require('dotenv').config();

const WA_API = 'https://graph.facebook.com/v19.0';

function getConfig() {
    return {
        phoneNumberId: process.env.WA_PHONE_NUMBER_ID,
        accessToken: process.env.WA_ACCESS_TOKEN
    };
}

function formatPhone(phone) {
    // Ensure phone starts with country code, no + or spaces
    if (!phone) return null;
    return phone.replace(/[\s\-\(\)]/g, '').replace(/^\+/, '');
}

const whatsappService = {
    // Send order confirmation when order is created
    async sendOrderConfirmation(order) {
        const { phoneNumberId, accessToken } = getConfig();
        if (!phoneNumberId || !accessToken) {
            console.warn('[WA] WhatsApp not configured, skipping notification');
            return { skipped: true };
        }

        const phone = formatPhone(order.customerPhone);
        if (!phone) return { skipped: true, reason: 'No phone number' };

        const payload = {
            messaging_product: 'whatsapp',
            to: phone,
            type: 'template',
            template: {
                name: 'order_confirmation',
                language: { code: 'en' },
                components: [{
                    type: 'body',
                    parameters: [
                        { type: 'text', text: order.customerName },
                        { type: 'text', text: order.id },
                        { type: 'text', text: `Rs. ${parseFloat(order.total || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}` }
                    ]
                }]
            }
        };

        const response = await axios.post(
            `${WA_API}/${phoneNumberId}/messages`,
            payload,
            { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
        );
        return { success: true, messageId: response.data.messages?.[0]?.id };
    },

    // Send shipping notification when order status → shipped
    async sendShippingNotification(order) {
        const { phoneNumberId, accessToken } = getConfig();
        if (!phoneNumberId || !accessToken) {
            console.warn('[WA] WhatsApp not configured, skipping notification');
            return { skipped: true };
        }

        const phone = formatPhone(order.customerPhone);
        if (!phone) return { skipped: true, reason: 'No phone number' };

        const payload = {
            messaging_product: 'whatsapp',
            to: phone,
            type: 'template',
            template: {
                name: 'order_shipped',
                language: { code: 'en' },
                components: [{
                    type: 'body',
                    parameters: [
                        { type: 'text', text: order.customerName },
                        { type: 'text', text: order.id },
                        { type: 'text', text: order.shippingCarrier || 'Our courier' },
                        { type: 'text', text: order.trackingNumber || 'N/A' },
                        { type: 'text', text: 'Within 3-5 business days' }
                    ]
                }]
            }
        };

        const response = await axios.post(
            `${WA_API}/${phoneNumberId}/messages`,
            payload,
            { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
        );
        return { success: true, messageId: response.data.messages?.[0]?.id };
    },

    // Send delivery confirmation when order status → delivered
    async sendDeliveryConfirmation(order) {
        const { phoneNumberId, accessToken } = getConfig();
        if (!phoneNumberId || !accessToken) {
            console.warn('[WA] WhatsApp not configured, skipping notification');
            return { skipped: true };
        }

        const phone = formatPhone(order.customerPhone);
        if (!phone) return { skipped: true, reason: 'No phone number' };

        const payload = {
            messaging_product: 'whatsapp',
            to: phone,
            type: 'template',
            template: {
                name: 'order_delivered',
                language: { code: 'en' },
                components: [{
                    type: 'body',
                    parameters: [
                        { type: 'text', text: order.customerName },
                        { type: 'text', text: order.id }
                    ]
                }]
            }
        };

        const response = await axios.post(
            `${WA_API}/${phoneNumberId}/messages`,
            payload,
            { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
        );
        return { success: true, messageId: response.data.messages?.[0]?.id };
    }
};

module.exports = whatsappService;
