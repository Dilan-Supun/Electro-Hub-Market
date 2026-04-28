const axios = require('axios');
const fs = require('fs-extra');
require('dotenv').config();

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = 'nano-banana-pro-preview';
const TEXT_MODEL = 'gemini-1.5-flash'; 

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
    }
};

// Generic text generation using Gemini Flash
geminiService.generateText = async function(prompt, apiKey) {
    const key = apiKey || API_KEY;
    try {
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/${TEXT_MODEL}:generateContent?key=${key}`,
            { contents: [{ parts: [{ text: prompt }] }] },
            { headers: { 'Content-Type': 'application/json' } }
        );
        const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error('No text returned from Gemini API');
        return text.trim();
    } catch (error) {
        const msg = error.response?.data?.error?.message || error.message;
        throw new Error(`Gemini Text API Error: ${msg}`);
    }
};

// Generate a product description
geminiService.generateProductDescription = async function(product, apiKey) {
    const featuresText = (product.features || []).join(', ');
    const prompt = `Write a concise, engaging product description (2–3 sentences) for an electronics e-commerce store.\nProduct: ${product.title}\nCategory: ${product.category || 'Electronics'}\nFeatures: ${featuresText || 'N/A'}\nPrice: Rs. ${product.price || 'N/A'}\nDo not include pricing. Do not use markdown.`;
    return geminiService.generateText(prompt, apiKey);
};

// Generate a Facebook caption for a product post
geminiService.generateFBCaption = async function(product, apiKey) {
    const prompt = `Write an engaging Facebook post caption to promote this electronics product for sale.\nProduct: ${product.title}\nDescription: ${product.description || ''}\nPrice: Rs. ${product.price || 'N/A'}\nKeep it under 150 words. Include 3–5 relevant hashtags at the end. Use emojis. Do not use markdown.`;
    return geminiService.generateText(prompt, apiKey);
};

// Generate hashtags for a product
geminiService.generateHashtags = async function(product, apiKey) {
    const prompt = `Generate 10 relevant social media hashtags (no spaces, no #-prefix) for this electronics product:\nProduct: ${product.title}\nCategory: ${product.category || 'Electronics'}\nReturn only the hashtags as a comma-separated list, nothing else.`;
    const raw = await geminiService.generateText(prompt, apiKey);
    return raw.split(',').map(t => t.trim().replace(/^#+/, '')).filter(Boolean);
};

module.exports = geminiService;
