const axios = require('axios');
require('dotenv').config({ path: '../.env' });

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = 'gemini-1.5-flash'; // Start with a known stable model

async function testGemini() {
    try {
        console.log('Testing Gemini API with key:', API_KEY.slice(0, 5) + '...');
        const payload = {
            contents: [{
                parts: [{ text: 'Hello, are you working?' }]
            }]
        };

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
            payload,
            { headers: { 'Content-Type': 'application/json' } }
        );

        console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}

testGemini();
