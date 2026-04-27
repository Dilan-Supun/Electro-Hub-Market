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
    }
};

module.exports = geminiService;
