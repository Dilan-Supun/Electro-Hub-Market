const axios = require('axios');
require('dotenv').config();

const WA_API = 'https://graph.facebook.com/v19.0';

function getConfig(settings = {}) {
    return {
        phoneNumberId: settings.waPhoneNumberId || process.env.WA_PHONE_NUMBER_ID,
        accessToken: settings.waAccessToken || process.env.WA_ACCESS_TOKEN
    };
}

function formatPhone(phone) {
    if (!phone) return null;
    // Strip all non-digit characters
    const digits = phone.replace(/\D/g, '');
    // If starts with 0, replace with country code 94 (Sri Lanka default)
    if (digits.startsWith('0')) return `94${digits.slice(1)}`;
    // If already has a valid country code prefix (e.g. 94, 1, 44), return as-is
    return digits;
}

async function sendMessage(phoneNumberId, accessToken, to, payload) {
    const url = `${WA_API}/${phoneNumberId}/messages`;
    const response = await axios.post(
        url,
        { messaging_product: 'whatsapp', to, ...payload },
        { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
    );
    return response.data;
}

const whatsappService = {
    // Send a plain text message
    async sendText(phone, text, settings = {}) {
        const { phoneNumberId, accessToken } = getConfig(settings);
        if (!phoneNumberId || !accessToken) throw new Error('WhatsApp credentials not configured');
        const to = formatPhone(phone);
        if (!to) throw new Error('Invalid phone number');
        return sendMessage(phoneNumberId, accessToken, to, {
            type: 'text',
            text: { body: text }
        });
    },

    // Send order confirmation to a customer
    async sendOrderConfirmation(order, customer, settings = {}) {
        const { phoneNumberId, accessToken } = getConfig(settings);
        if (!phoneNumberId || !accessToken) throw new Error('WhatsApp credentials not configured');

        const to = formatPhone(customer.phone);
        if (!to) throw new Error(`No valid phone number for customer ${customer.id}`);

        const itemLines = (order.items || [])
            .map(i => `  • ${i.productTitle || i.productId} × ${i.qty} — Rs. ${parseFloat(i.unitPrice || 0).toLocaleString()}`)
            .join('\n');

        const text = [
            `🛒 *Order Confirmed!* Thank you, ${customer.name}!`,
            ``,
            `📋 *Order ID:* ${order.id}`,
            `📅 *Date:* ${new Date(order.createdAt).toLocaleDateString()}`,
            ``,
            `*Items:*`,
            itemLines,
            ``,
            `📦 *Shipping:* Rs. ${parseFloat(order.shippingFee || 0).toLocaleString()}`,
            `💰 *Total:* Rs. ${parseFloat(order.total || 0).toLocaleString()}`,
            ``,
            `We will notify you once your order is shipped. 🚀`,
            `— Electro Hub`
        ].join('\n');

        return sendMessage(phoneNumberId, accessToken, to, {
            type: 'text',
            text: { body: text }
        });
    },

    // Send shipping/dispatch notification
    async sendShippingNotification(order, customer, trackingInfo = {}, settings = {}) {
        const { phoneNumberId, accessToken } = getConfig(settings);
        if (!phoneNumberId || !accessToken) throw new Error('WhatsApp credentials not configured');

        const to = formatPhone(customer.phone);
        if (!to) throw new Error(`No valid phone number for customer ${customer.id}`);

        const lines = [
            `📦 *Your Order Has Been Shipped!*`,
            ``,
            `Hi ${customer.name}, your order *${order.id}* is on its way! 🚚`,
        ];

        if (trackingInfo.carrier) lines.push(`🚛 *Carrier:* ${trackingInfo.carrier}`);
        if (trackingInfo.trackingNumber) lines.push(`🔖 *Tracking No:* ${trackingInfo.trackingNumber}`);
        if (trackingInfo.estimatedDelivery) lines.push(`📅 *Est. Delivery:* ${trackingInfo.estimatedDelivery}`);
        if (trackingInfo.trackingUrl) lines.push(`🔗 *Track:* ${trackingInfo.trackingUrl}`);

        lines.push('', 'Thank you for shopping with Electro Hub! ⚡', '— Electro Hub');

        const text = lines.join('\n');

        return sendMessage(phoneNumberId, accessToken, to, {
            type: 'text',
            text: { body: text }
        });
    },

    // Send a delivery confirmation
    async sendDeliveryConfirmation(order, customer, settings = {}) {
        const { phoneNumberId, accessToken } = getConfig(settings);
        if (!phoneNumberId || !accessToken) throw new Error('WhatsApp credentials not configured');

        const to = formatPhone(customer.phone);
        if (!to) throw new Error(`No valid phone number for customer ${customer.id}`);

        const text = [
            `✅ *Order Delivered!*`,
            ``,
            `Hi ${customer.name}, your order *${order.id}* has been delivered! 🎉`,
            ``,
            `We hope you love your new purchase. If you have any questions or concerns, feel free to reach out.`,
            ``,
            `Thank you for choosing Electro Hub! ⚡`,
            `— Electro Hub`
        ].join('\n');

        return sendMessage(phoneNumberId, accessToken, to, {
            type: 'text',
            text: { body: text }
        });
    }
};

module.exports = whatsappService;
