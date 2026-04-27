const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
require('dotenv').config();

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = 'gemini-2.5-flash-image'; 

const geminiService = {
    async enhanceImage(imagePath, prompt) {
        try {
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

            const response = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
                payload,
                { headers: { 'Content-Type': 'application/json' } }
            );

            // Assuming the model returns a base64 image string in the response parts
            // This structure depends on the specific Gemini model capabilities for image output
            const part = response.data.candidates[0].content.parts.find(p => p.inline_data);
            
            if (part && part.inline_data && part.inline_data.data) {
                return Buffer.from(part.inline_data.data, 'base64');
            }

            // Fallback: If it returns text, it might be a description or error
            console.error('Gemini response did not contain image data:', response.data);
            throw new Error('AI failed to generate an edited image. Check API response format.');
        } catch (error) {
            console.error('Gemini API Error:', error.response ? error.response.data : error.message);
            throw new Error(`Gemini Enhancement Failed: ${error.message}`);
        }
    }
};

module.exports = geminiService;
