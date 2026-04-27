const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = 'gemini-1.5-flash'; // Start with a known stable model

async function testGemini() {
    const model = 'gemini-2.5-flash';
    try {
        console.log(`Testing model: ${model}`);
        const payload = {
            contents: [{
                parts: [{ text: 'Enhance this image' }] // Without image for now just to see
            }]
        };
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`,
            payload,
            { headers: { 'Content-Type': 'application/json' } }
        );
        console.log(`Response:`, JSON.stringify(response.data.candidates[0].content.parts, null, 2));
    } catch (error) {
        console.error(`Error with ${model}:`, error.response ? error.response.data : error.message);
    }
}

testGemini();
