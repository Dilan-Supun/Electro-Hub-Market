const axios = require('axios');
const fs = require('fs-extra');
require('dotenv').config();

const API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyBakn6N88UpfOEne2Il5OwN9uHsr9PQuts';
const MODEL = 'nano-banana-pro-preview'; 

const geminiService = {
    async enhanceImage(imagePath, prompt) {
        try {
            console.log(`[AI] Attempting Gemini API processing for prompt: "${prompt}" using model: ${MODEL}`);
            
            const imageData = await fs.readFile(imagePath);
            const base64Image = imageData.toString('base64');

            const payload = {
                contents: [{
                    parts: [
                        { text: prompt },
                        {
                            inline_data: {
                                mime_type: 'image/jpeg',
                                data: base64Image
                            }
                        }
                    ]
                }]
            };

            // Call the Gemini API natively
            const response = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
                payload,
                { headers: { 'Content-Type': 'application/json' } }
            );

            // Parse response - assuming the model returns an edited inline_data image
            const part = response.data.candidates?.[0]?.content?.parts?.find(p => p.inline_data);
            if (part && part.inline_data && part.inline_data.data) {
                console.log('[AI] Successfully generated image via Gemini API');
                return Buffer.from(part.inline_data.data, 'base64');
            }
            
            console.error('Gemini API response did not contain inline_data image:', JSON.stringify(response.data, null, 2));
            throw new Error('No image data returned from Gemini API. Check console logs for response format.');

        } catch (error) {
            const apiErrorMsg = error.response?.data?.error?.message || error.message;
            console.error('[AI] Gemini API failed:', apiErrorMsg);
            throw new Error(`Gemini API Error: ${apiErrorMsg}`);
        }
    },

    async generateProductDescription(product) {
        const API_KEY = process.env.GEMINI_API_KEY;
        const MODEL = 'gemini-1.5-flash';

        const prompt = `You are a professional e-commerce copywriter for an electronics shop called "Electro Hub" in Sri Lanka.
Write an attractive, compelling product description for:
Product Name: ${product.title}
Category: ${product.category || 'Electronics'}
Price: Rs. ${product.price || 'N/A'}
${product.specs ? `Specs: ${product.specs}` : ''}

Requirements:
- 3-5 sentences
- Highlight key benefits and features
- Use persuasive but honest language
- End with a call to action
- Do NOT include price in description
- Return ONLY the description text, no extra formatting`;

        const payload = { contents: [{ parts: [{ text: prompt }] }] };
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
            payload,
            { headers: { 'Content-Type': 'application/json' } }
        );
        const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return text.trim();
    },

    async generateFacebookCaption(product) {
        const API_KEY = process.env.GEMINI_API_KEY;
        const MODEL = 'gemini-1.5-flash';

        const prompt = `You are a social media manager for "Electro Hub", an electronics shop in Sri Lanka.
Write an engaging Facebook post caption for this product:
Product: ${product.title}
Price: Rs. ${product.price}
Description: ${product.description || ''}

Requirements:
- Start with an attention-grabbing emoji
- 3-5 sentences maximum
- Include a call to action (e.g. "Order now!", "DM us!", "Visit our shop!")
- Add 8-12 relevant hashtags at the end
- Use emojis naturally throughout
- Mention "Electro Hub" once
- Return ONLY the caption text with hashtags, no extra explanation`;

        const payload = { contents: [{ parts: [{ text: prompt }] }] };
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
            payload,
            { headers: { 'Content-Type': 'application/json' } }
        );
        const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return text.trim();
    },

    async generateTags(product) {
        const API_KEY = process.env.GEMINI_API_KEY;
        const MODEL = 'gemini-1.5-flash';

        const prompt = `Generate product tags/keywords for an e-commerce electronics product.
Product: ${product.title}
Category: ${product.category || 'Electronics'}
Description: ${product.description || ''}

Requirements:
- Return 10-15 short tags
- Lowercase only
- No spaces within tags (use hyphens if needed)
- Mix of: product-specific, category, brand (if known), use-case tags
- Return ONLY a JSON array of strings like: ["tag1","tag2","tag3"]
- No explanation, no markdown, just the JSON array`;

        const payload = { contents: [{ parts: [{ text: prompt }] }] };
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
            payload,
            { headers: { 'Content-Type': 'application/json' } }
        );
        let text = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
        // Clean markdown code fences if present
        text = text.replace(/```(?:json)?\s*/gi, '').trim();
        try {
            return JSON.parse(text);
        } catch {
            return text.split(',').map(t => t.replace(/["\[\]\s]/g, '').trim()).filter(Boolean);
        }
    }
};

module.exports = geminiService;
